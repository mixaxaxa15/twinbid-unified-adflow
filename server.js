const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateRequest, generateBatch } = require('./lib/atlas');
const { TEMPLATES, defaultConfig, render, validatePlan } = require('./lib/prelands');
const { zipFiles } = require('./lib/zip');
const { loadTemplates: loadArchiveTemplates, renderArchive, validateArchivePlan } = require('./lib/archive-prelands');
const { ARCHIVE_MECHANICS } = require('./lib/mechanic-catalog');
const { buildArchivePlanMessages, enrichArchiveAssetPrompts, selectRefineAssetPrompts } = require('./lib/archive-prompts');
const { renderBuilder, validateBuilderPlan, exportBuilder } = require('./lib/builder');
const { sanitizeProject: sanitizeSimpleProject, ensureAssetPlan: ensureSimpleAssetPlan, placeUploadedAsset: placeSimpleUploadedAsset, renderProject: renderSimpleProject, sanitizePatch: sanitizeSimplePatch, zipProject: zipSimpleProject } = require('./lib/simple-builder');
const { requestAtlasLlm } = require('./lib/atlas-llm');
const { JobLock } = require('./lib/job-lock');
const { normalizeBlueprint, assembleProject: assemblePipelineProject, blueprintMessages, sectionMessages } = require('./lib/preland-pipeline');
const { FONT_NAMES, sanitizeCustomFonts } = require('./lib/fonts');

loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const GENERATED_DIR = path.join(PUBLIC_DIR, 'generated');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const FONT_DIR = path.join(PUBLIC_DIR, 'fonts');
const CUSTOM_FONT_DIR = path.join(FONT_DIR, 'custom');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'twinbid-mvp.log');
const PRELAND_LIBRARY_DIR = path.join(PUBLIC_DIR, 'prelander-library');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf' };
for (const directory of [GENERATED_DIR, UPLOADS_DIR, CUSTOM_FONT_DIR, LOG_DIR]) fs.mkdirSync(directory, { recursive:true });
const debugLog = [];
const builderJobs = new JobLock(1200000);
const pipelineJobs = new Map();

function writeLog(level, event, details = {}) {
  const entry = { at:new Date().toISOString(), level, event, ...details };
  debugLog.push(entry); if (debugLog.length > 500) debugLog.shift();
  fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, () => {});
  return entry;
}

function applyDeterministicBlurIntent(plan,prompt='') {
  const text=String(prompt||'').toLowerCase();
  const disable=/(?:убери|убрать|отключи|отключить|без)\s+(?:всего\s+|вс[её]\s+)?размыт|не\s+(?:делай\s+)?размыт|сделай\s+(?:фон|картин|изображ|фото|превью)?\s*(?:ч[её]тк|резк)|(?:blur|blurring)\s*(?:off|none|0)/i.test(text);
  if(!disable)return plan;
  const upsert=(path,value)=>{const found=plan.changes.find(item=>item.path===path);if(found)found.value=value;else plan.changes.push({path,value});};
  upsert('design.backgroundBlur',0);upsert('design.backgroundScale',1);
  if(!/(?:только|лишь)\s+фон/i.test(text)){upsert('design.mediaBlur',0);upsert('design.cardBackdropBlur',0);}
  return plan;
}

function applyDeterministicIconIntent(plan,prompt='') {
  const text=String(prompt||'');
  if(/(?:картин|изображ|фото|ассет|сгенер|нарис|графическ|image|picture|asset|generate|draw)/iu.test(text))return plan;
  if(!/(?:замоч|эмодзи\s+зам|иконк\w*\s+(?:зам|поверх)|lock\s*(?:icon|emoji))/iu.test(text))return plan;
  const pictograms=[...text.matchAll(/\p{Extended_Pictographic}/gu)].map(match=>match[0]).filter(item=>!['🔒','🔐','🔓'].includes(item));
  const names=[[/серд|heart/iu,'❤️'],[/корон|crown/iu,'👑'],[/огон|огн|fire/iu,'🔥'],[/звезд|star/iu,'⭐'],[/глаз|eye/iu,'👁️'],[/ключ|key/iu,'🔑'],[/подар|gift/iu,'🎁'],[/алмаз|бриллиант|diamond/iu,'💎'],[/молни|lightning/iu,'⚡']];
  const icon=pictograms.at(-1)||names.find(([pattern])=>pattern.test(text))?.[1];if(!icon)return plan;
  const found=plan.changes.find(item=>item.path==='texts.lockIcon');if(found)found.value=icon;else plan.changes.push({path:'texts.lockIcon',value:icon});
  return plan;
}

function applyDeterministicSlotIntent(plan,prompt='',current={},id='') {
  if(id!=='casino_slot_minigame'&&current?.type!=='slot')return plan;
  const text=String(prompt||'').toLowerCase();
  plan.changes=Array.isArray(plan.changes)?plan.changes:[];
  plan.assetPrompts=Array.isArray(plan.assetPrompts)?plan.assetPrompts:[];
  const set=(path,value)=>upsertPlanChange(plan,path,value);
  const mentionsReels=/(?:слот|барабан|окошк|цифр|чисел|символ|reel|slot|spin)/iu.test(text);
  if(!mentionsReels)return plan;

  const wantsImages=/(?:картин|изображ|фото|image|picture)/iu.test(text)&&/(?:вместо|rather than|на барабан|в окошк|символ|reel|slot)/iu.test(text);
  const wantsText=/(?:цифр|чисел|текст|эмодзи|digits?|numbers?|emoji)/iu.test(text);
  if(wantsImages)set('slotSettings.symbolMode','image');
  else if(wantsText)set('slotSettings.symbolMode','text');

  if(/(?:от\s*0\s*до\s*9|0\s*[-–—]\s*9|digits?\s*0\s*(?:to|-)\s*9)/iu.test(text)){
    for(let index=0;index<10;index++)set(`items.${index}.label`,String(index));
    set('slotSettings.symbolMode','text');
  }

  if(/(?:flip|переворач|переворот)/iu.test(text))set('slotSettings.animationStyle','flip');
  else if(/(?:blur|размыт|смазан)/iu.test(text))set('slotSettings.animationStyle','blur');
  else if(/(?:slide|прокрут|крут|скольз|вращ)/iu.test(text))set('slotSettings.animationStyle','slide');

  const direction=/\bup\b|вверх|снизу\s+вверх/iu.test(text)?'up':/\bdown\b|вниз|сверху\s+вниз/iu.test(text)?'down':null;
  if(direction)for(let reel=1;reel<=3;reel++)set(`slotSettings.reel${reel}Direction`,direction);

  const duration=text.match(/(?:длител|крут|вращ|всего)[^\d]{0,24}(\d+(?:[.,]\d+)?)\s*(?:сек(?:унд)?|seconds?|s\b)/iu);
  if(duration)set('slotSettings.spinDuration',Math.round(Number(duration[1].replace(',','.'))*1000));

  if(/(?:по\s+очереди|последовател|друг\w*\s+за\s+друг|one\s+after\s+another|stagger)/iu.test(text)){
    set('slotSettings.reel1ExtraDuration',0);set('slotSettings.reel2ExtraDuration',350);set('slotSettings.reel3ExtraDuration',700);
  }
  if(/(?:перв\w*[^.!?]{0,35}быстр[^.!?]{0,55}втор\w*[^.!?]{0,35}медл[^.!?]{0,55}трет\w*[^.!?]{0,35}медл|first[^.!?]{0,35}fast[^.!?]{0,55}second[^.!?]{0,35}slow[^.!?]{0,55}third[^.!?]{0,35}slow)/iu.test(text)){
    set('slotSettings.reel1TickInterval',45);set('slotSettings.reel2TickInterval',70);set('slotSettings.reel3TickInterval',95);
  }
  const reelWords=[null,'(?:перв|1(?:-й|ый)?)','(?:втор|2(?:-й|ой)?)','(?:трет|3(?:-й|ий)?)'];
  for(let reel=1;reel<=3;reel++){
    const match=text.match(new RegExp(`${reelWords[reel]}\\w*[^\\d]{0,28}(\\d{2,3})\\s*(?:мс|ms)`,`iu`));
    if(match)set(`slotSettings.reel${reel}TickInterval`,Number(match[1]));
  }

  const result=text.match(/(?:результат|итог|покаж|выпад|останов)[^\d]{0,28}([0-9])\s*[-–—, ]?\s*([0-9])\s*[-–—, ]?\s*([0-9])/iu);
  if(result){
    const labels=(current.items||[]).map(item=>String(item?.label??''));
    for(let reel=1;reel<=3;reel++){
      const label=result[reel],index=labels.indexOf(label);
      set(`slotSettings.reel${reel}ResultIndex`,index>=0?index:Number(label));
    }
  }
  return plan;
}

const TEXT_COLOR_TARGETS=new Set(['title','subtitle','smallText','badge','choiceTitle','choiceSubtitle','profileName','profileMeta','topName','topMeta','progressText','notice','input','countdown','rating','keyValue','modalTitle','modalText','scratchRevealText','scratchCoverLabel','carouselInfo','wheelCenter','slotCell','chatName','chatStatus','chatBubble','chatTime','chatComposer']);

function upsertPlanChange(plan,path,value) {
  const found=plan.changes.find(item=>item.path===path);
  if(found)found.value=value;else plan.changes.push({path,value});
}

function readableTextFor(background) {
  const source=String(background||'');
  const colors=[];
  for(const match of source.matchAll(/#([0-9a-f]{3,8})\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)/gi)){
    if(match[1]){
      let hex=match[1];
      if(hex.length===3||hex.length===4)hex=[...hex].map(char=>char+char).join('');
      const alpha=hex.length===8?parseInt(hex.slice(6,8),16)/255:1;
      if(alpha<.75)return null;
      colors.push([parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]);
    }else{
      if(match[5]!==undefined&&Number(match[5])<.75)return null;
      colors.push([Number(match[2]),Number(match[3]),Number(match[4])]);
    }
  }
  if(!colors.length)return null;
  const channel=value=>{const part=Math.max(0,Math.min(255,value))/255;return part<=.04045?part/12.92:((part+.055)/1.055)**2.4;};
  const luminance=colors.reduce((sum,[r,g,b])=>sum+.2126*channel(r)+.7152*channel(g)+.0722*channel(b),0)/colors.length;
  return luminance>.42?'#111111':'#FFFFFF';
}

function applyAutomaticContrast(plan,current={}) {
  const proposed=new Map(plan.changes.map(item=>[item.path,item.value]));
  const value=path=>proposed.has(path)?proposed.get(path):path.split('.').reduce((result,key)=>result?.[key],current);
  const syncSurface=(backgroundPath,colorPath)=>{
    if(!proposed.has(backgroundPath))return;
    const color=readableTextFor(proposed.get(backgroundPath));if(color)upsertPlanChange(plan,colorPath,color);
  };
  for(const target of ['badge','primaryButton','secondaryButton','choiceCard','profileCard','topCard','notice','input','modalCard','scratchReveal','scratchCover','slotCell'])syncSurface(`visual.rules.${target}.background`,`visual.rules.${target}.color`);
  if(proposed.has('theme.surface')||proposed.has('visual.rules.card.background')||proposed.has('visual.rules.centralPanel.background')){
    const background=proposed.get('visual.rules.centralPanel.background')||proposed.get('visual.rules.card.background')||proposed.get('theme.surface');
    const color=readableTextFor(background);
    if(color){upsertPlanChange(plan,'theme.text',color);upsertPlanChange(plan,'theme.muted',color==='#111111'?'#374151':'#E5E7EB');}
  }
  if(proposed.has('theme.accent')||proposed.has('theme.accent2')){
    const color=readableTextFor(`linear-gradient(${value('theme.accent')||''},${value('theme.accent2')||''})`);
    if(color)upsertPlanChange(plan,'visual.rules.primaryButton.color',color);
  }
  return plan;
}

function applyDeterministicContrastIntent(plan,prompt='',current={}) {
  const text=String(prompt||'').toLowerCase();
  const isTextRequest=/(?:цвет[а-яёa-z0-9_]*\s+текст|текст[а-яёa-z0-9_]*\s+(?:цвет|сделай|поменяй|измени|перекрас)|не\s*(?:вид|чит)|слива[а-яёa-z0-9_]*\s+(?:с|на)\s+фон|контраст|бел[а-яёa-z0-9_]*\s+(?:текст[а-яёa-z0-9_]*\s+)?на\s+бел|т[её]мн[а-яёa-z0-9_]*\s+(?:текст[а-яёa-z0-9_]*\s+)?на\s+т[её]мн|white\s+on\s+white|text\s+colou?r)/iu.test(text);
  if(!isTextRequest)return plan;
  const named=[[/черн|black/iu,'#111111'],[/т[её]мн|dark/iu,'#111111'],[/бел|white/iu,'#FFFFFF'],[/красн|red/iu,'#DC2626'],[/ж[её]лт|yellow/iu,'#FACC15'],[/зел[её]н|green/iu,'#16A34A'],[/син|blue/iu,'#2563EB'],[/фиолет|purple/iu,'#7C3AED'],[/розов|pink/iu,'#DB2777']];
  let color;
  if(/бел[а-яёa-z0-9_]*\s+(?:текст[а-яёa-z0-9_]*\s+)?на\s+бел|white\s+on\s+white/iu.test(text))color='#111111';
  else if(/(?:черн|т[её]мн)[а-яёa-z0-9_]*\s+(?:текст[а-яёa-z0-9_]*\s+)?на\s+(?:черн|т[её]мн)|dark\s+on\s+dark/iu.test(text))color='#FFFFFF';
  else color=named.find(([pattern])=>pattern.test(text))?.[1];
  if(!color){
    const surface=current.visual?.rules?.centralPanel?.background||current.visual?.rules?.card?.background||current.theme?.surface||current.theme?.background;
    color=readableTextFor(surface)||'#111111';
  }
  const specific=[['заголов','title'],['подзаголов','subtitle'],['бейдж','badge'],['уведомлен','notice'],['таймер','countdown'],['поле','input'],['модаль','modalText']].find(([word])=>text.includes(word));
  if(/кноп|cta|button/iu.test(text))upsertPlanChange(plan,'visual.rules.primaryButton.color',color);
  else if(specific)upsertPlanChange(plan,`visual.rules.${specific[1]}.color`,color);
  else{
    upsertPlanChange(plan,'theme.text',color);
    upsertPlanChange(plan,'theme.muted',color==='#111111'?'#374151':color==='#FFFFFF'?'#E5E7EB':color);
    for(const [target,rules] of Object.entries(current.visual?.rules||{}))if(TEXT_COLOR_TARGETS.has(target)&&rules?.color)upsertPlanChange(plan,`visual.rules.${target}.color`,color);
  }
  return plan;
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(res.requestId ? {'X-Request-ID':res.requestId} : {}) });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 45_000_000) throw new Error('Запрос слишком большой.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, relative);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function exportAsset(source) {
  const dataMatch = String(source).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (dataMatch) return { bytes: Buffer.from(dataMatch[2], 'base64'), type: dataMatch[1] };
  const local = String(source).match(/^\/(uploads|generated)\/([a-zA-Z0-9._-]+)$/);
  if (local) {
    const file = path.join(PUBLIC_DIR, local[1], local[2]);
    if (!fs.existsSync(file)) throw new Error('Локальный файл изображения не найден.');
    return { bytes:fs.readFileSync(file), type:MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' };
  }
  let remote = String(source);
  if (remote.startsWith('/api/image?')) remote = new URL(remote, 'http://localhost').searchParams.get('url') || '';
  const target = new URL(remote);
  const allowed = target.protocol === 'https:' && (target.hostname === 'atlas-media.oss-us-west-1.aliyuncs.com' || target.hostname.endsWith('.atlascloud.ai'));
  if (!allowed) throw new Error('Экспорт разрешает только загруженные файлы и assets Atlas Cloud.');
  const response = await fetch(target, { headers: { Referer: 'https://www.atlascloud.ai/', Origin: 'https://www.atlascloud.ai', 'User-Agent': 'TwinBid-Preland-Export/0.1' } });
  if (!response.ok) throw new Error(`Не удалось добавить asset в ZIP: HTTP ${response.status}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || 'image/jpeg' };
}

function extensionFor(type) {
  return type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
}

async function cacheGeneratedAsset(source, predictionId, index) {
  const file = await exportAsset(source);
  const name = `${String(predictionId || 'image').replace(/[^a-zA-Z0-9_-]/g,'')}-${index}-${Date.now()}.${extensionFor(file.type)}`;
  fs.writeFileSync(path.join(GENERATED_DIR, name), file.bytes);
  return `/generated/${name}`;
}

function saveUploadedAsset(data) {
  const match = String(data || '').match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/i);
  if (!match) throw new Error('Загрузите PNG, JPEG, WEBP или GIF.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 30 * 1024 * 1024) throw new Error('Изображение пустое или больше 30 МБ.');
  const name = `${crypto.randomUUID()}.${extensionFor(match[1].toLowerCase())}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), bytes);
  return `/uploads/${name}`;
}

function saveUploadedFont(input = {}) {
  const fileName = String(input.fileName || 'font.woff2');
  const extension = path.extname(fileName).toLowerCase();
  if (!['.woff2','.woff','.ttf','.otf'].includes(extension)) throw new Error('Поддерживаются WOFF2, WOFF, TTF и OTF.');
  const match = String(input.data || '').match(/^data:[^;]+;base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error('Не удалось прочитать файл шрифта.');
  const bytes = Buffer.from(match[1], 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Шрифт пустой или больше 10 МБ.');
  const signature = bytes.subarray(0,4).toString('latin1');
  const valid = extension === '.woff2' ? signature === 'wOF2' : extension === '.woff' ? signature === 'wOFF' : extension === '.otf' ? signature === 'OTTO' : (bytes.readUInt32BE(0) === 0x00010000 || signature === 'true');
  if (!valid) throw new Error('Расширение не соответствует содержимому файла шрифта.');
  const requested = String(input.name || path.basename(fileName, extension)).replace(/[<>"'{};]/g,'').replace(/\s+/g,' ').trim().slice(0,60);
  if (!requested) throw new Error('Укажите название шрифта.');
  if (FONT_NAMES.some((name)=>name.toLowerCase()===requested.toLowerCase())) throw new Error('Шрифт с таким названием уже есть в каталоге.');
  const stored = `${crypto.randomUUID()}${extension}`;
  fs.writeFileSync(path.join(CUSTOM_FONT_DIR, stored), bytes);
  return sanitizeCustomFonts([{ name:requested, source:`/fonts/custom/${stored}` }])[0];
}

async function materializePrelandAssets(inputConfig) {
  const config = JSON.parse(JSON.stringify(inputConfig));
  const assets = {};
  for (const slot of ['background_image', 'hero_character', 'logo']) {
    if (!config.assets?.[slot]) continue;
    const file = await exportAsset(config.assets[slot]);
    const extension = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : file.type.includes('gif') ? 'gif' : 'jpg';
    const name = `assets/${slot}.${extension}`;
    assets[name] = file.bytes;
    config.assets[slot] = name;
  }
  return { config, assets };
}

function atlasLlmConfigured() { return Boolean(process.env.ATLASCLOUD_API_KEY); }

async function callAtlasLlm(messages, maxTokens = 2048, options = {}) {
  const apiKey = process.env.ATLASCLOUD_API_KEY;
  const model = process.env.ATLAS_LLM_MODEL || 'qwen/qwen3.5-flash';
  return requestAtlasLlm({
    apiKey, model, messages, maxTokens, log:writeLog,
    requestId:options.requestId || '', operation:options.operation || 'llm',
    retryMessages:options.retryMessages || messages,
    retryMaxTokens:options.retryMaxTokens || Math.min(maxTokens,2800),
    timeoutMs:Number(options.timeoutMs || process.env.ATLAS_LLM_TIMEOUT_MS || 90000),
    retryTimeoutMs:Number(options.retryTimeoutMs || process.env.ATLAS_LLM_RETRY_TIMEOUT_MS || 70000),
  });
}

function parseLlmJson(content) {
  const text = String(content || '{}').trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  return JSON.parse(start >= 0 && end >= start ? text.slice(start, end + 1) : text);
}

function setObjectPath(target,path,value){
  const parts=String(path).split('.');let cursor=target;
  for(let index=0;index<parts.length-1;index++){const key=/^\d+$/.test(parts[index])?Number(parts[index]):parts[index];if(cursor[key]==null)cursor[key]={};cursor=cursor[key];}
  const last=/^\d+$/.test(parts.at(-1))?Number(parts.at(-1)):parts.at(-1);cursor[last]=value;
}

async function callAtlasJson(messages,maxTokens,options={}){
  const first=await callAtlasLlm(messages,maxTokens,options);
  try{const parsed=parseLlmJson(first.content);if(!parsed||typeof parsed!=='object'||!Object.keys(parsed).length)throw new Error('Atlas вернул пустой JSON.');return{llm:first,parsed,repaired:false};}
  catch(error){
    writeLog('error','llm.json.invalid',{requestId:options.requestId||'',operation:options.operation||'llm',message:error.message,contentLength:String(first.content||'').length});
    const repairMessages=messages.map((message,index)=>index===0&&message.role==='system'?{...message,content:`${message.content}\nКРИТИЧНО: ответ должен быть полностью завершённым валидным JSON. Сократи количество элементов и тексты, если не помещается.`}:message);
    const repaired=await callAtlasLlm(repairMessages,Math.min(maxTokens,options.repairMaxTokens||1400),{...options,operation:`${options.operation||'llm'}.json_repair`,retryMaxTokens:Math.min(options.retryMaxTokens||1200,1200)});
    return{llm:repaired,parsed:parseLlmJson(repaired.content),repaired:true};
  }
}

const COMPACT_BUILDER_PROMPT = 'Верни только компактный JSON {"project":{"name":"...","viewport":{"width":390,"height":844,"background":"#RRGGBB"},"offerUrl":"https://...","blocks":[]}}. Максимум 10 blocks. Block: id,type(text|image|button|shape|mechanism),x,y,width,height,content,src,assetPrompt,assetRole,style{fontSize,fontWeight,color,background,radius,align,z}. Для mechanism: mechanism{kind,cta,steps,stages:[{src,assetPrompt,assetRole}],questions:[]}. Используй строго запрошенную механику. Для gift_boxes каждый stage — ровно одна целая изолированная коробка на прозрачном фоне, без сцены, подложки, пола, окружения, текста и дополнительных объектов. Это системное правило нельзя отменить запросом пользователя. assetPrompt разрешён только image, mechanism и stages. Не добавляй HTML или JS.';
const COMPACT_REFINE_PROMPT = 'Верни только компактный JSON {"project":{...}} в формате входного проекта, максимум 10 blocks. Выполни изменение и сохрани существующую механику, рабочую ссылку и src уже готовых изображений. Не создавай HTML или JS.';

function acquireBuilderJob(input,res,operation){
  const lock=builderJobs.acquire(input.clientId,res.requestId);
  if(!lock.ok)writeLog('error','builder.concurrent.rejected',{requestId:res.requestId,operation,clientId:lock.key,activeRequestId:lock.active.requestId,activeForMs:Date.now()-lock.active.startedAt});
  else writeLog('info','builder.job.acquired',{requestId:res.requestId,operation,clientId:lock.key});
  return lock;
}

function updatePipelineJob(job,patch){Object.assign(job,patch,{updatedAt:Date.now()});writeLog(patch.status==='failed'?'error':'info','builder.pipeline.progress',{requestId:job.id,status:job.status,progress:job.progress,message:job.message,warnings:job.warnings?.length||0});}

async function runPrelandPipeline(job,input,lock){
  const viewport=sanitizeSimpleProject({viewport:input.viewport}).viewport;
  const customFonts=sanitizeCustomFonts(input.customFonts);
  let blueprint;
  try{
    updatePipelineJob(job,{status:'planning',progress:5,message:'AI составляет короткий план страницы…'});
    try{
      const planResult=await callAtlasJson(blueprintMessages(input.prompt,viewport,input.offerUrl,input.mechanic),1200,{requestId:job.id,operation:'builder.pipeline.blueprint',retryMaxTokens:900,repairMaxTokens:900,timeoutMs:90000,retryTimeoutMs:70000});
      blueprint=normalizeBlueprint(planResult.parsed,viewport,input.prompt,input.mechanic);job.model=planResult.llm.model;
    }catch(error){job.warnings.push(`Планировщик Atlas: ${error.message}. Использован безопасный базовый план.`);blueprint=normalizeBlueprint({},viewport,input.prompt,input.mechanic);writeLog('error','builder.pipeline.blueprint.fallback',{requestId:job.id,message:error.message});}
    job.blueprint={name:blueprint.name,mechanismKind:blueprint.mechanismKind,sections:blueprint.sections.map(section=>({id:section.id,kind:section.kind,title:section.title}))};
    const sectionResults={};const total=blueprint.sections.length;let nextSection=0,completedSections=0;
    const buildSection=async()=>{
      while(true){
        const index=nextSection++;
        if(index>=total)return;
        const section=blueprint.sections[index];
        updatePipelineJob(job,{status:'building',progress:10+Math.round(completedSections/total*75),message:`AI собирает секции преленда: готово ${completedSections} из ${total}`});
        try{
          const sectionResult=await callAtlasJson(sectionMessages(input.prompt,viewport,blueprint,section,customFonts),1700,{requestId:job.id,operation:`builder.pipeline.section.${section.id}`,retryMaxTokens:1300,repairMaxTokens:1300,timeoutMs:90000,retryTimeoutMs:70000});
          sectionResults[section.id]=sectionResult.parsed;if(sectionResult.repaired)job.warnings.push(`Секция «${section.title}» была автоматически исправлена после неполного JSON.`);
        }catch(error){sectionResults[section.id]=null;job.warnings.push(`Секция «${section.title}»: ${error.message}. Добавлен резервный рабочий блок.`);writeLog('error','builder.pipeline.section.fallback',{requestId:job.id,sectionId:section.id,message:error.message});}
        completedSections++;
        updatePipelineJob(job,{status:'building',progress:10+Math.round(completedSections/total*75),message:`AI собирает секции преленда: готово ${completedSections} из ${total}`});
      }
    };
    await Promise.all(Array.from({length:Math.min(3,total)},()=>buildSection()));
    updatePipelineJob(job,{status:'assembling',progress:90,message:'Сервер собирает и проверяет целый преленд…'});
    const assembled=assemblePipelineProject({blueprint,sectionResults,viewport,offerUrl:input.offerUrl,customFonts});
    const project=ensureSimpleAssetPlan(assembled,`Механика строго ${blueprint.mechanismKind}. ${input.prompt}`);const rendered=renderSimpleProject(project);
    if(!rendered.validation.ok)throw new Error('Итоговая проверка проекта не пройдена.');
    updatePipelineJob(job,{status:'completed',progress:100,message:'Структура готова. Теперь создаются изображения.',project,completedAt:Date.now()});
    writeLog('info','builder.pipeline.complete',{requestId:job.id,blocks:project.blocks.length,sections:blueprint.sections.length,warnings:job.warnings.length});
  }catch(error){updatePipelineJob(job,{status:'failed',progress:100,message:error.message,error:String(error.message||error).slice(0,1000),completedAt:Date.now()});}
  finally{builderJobs.release(lock.key,lock.active.requestId);}
}

async function proxyAtlasImage(req, res) {
  const source = new URL(req.url, 'http://localhost').searchParams.get('url');
  if (!source) return json(res, 400, { error: 'Не указан URL изображения.' });
  let target;
  try { target = new URL(source); } catch { return json(res, 400, { error: 'Некорректный URL изображения.' }); }
  const allowed = target.protocol === 'https:' && (
    target.hostname === 'atlas-media.oss-us-west-1.aliyuncs.com' ||
    target.hostname.endsWith('.atlascloud.ai')
  );
  if (!allowed) return json(res, 403, { error: 'Разрешены только изображения Atlas Cloud.' });

  try {
    // Atlas OSS rejects localhost and empty referrers. Download as an
    // Atlas-originated request, then serve the image from our own origin.
    const upstream = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 TwinBid-Atlas-MVP/0.1',
        'Referer': 'https://www.atlascloud.ai/',
        'Origin': 'https://www.atlascloud.ai',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (!upstream.ok) return json(res, upstream.status, { error: `Хранилище Atlas вернуло HTTP ${upstream.status}.` });
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) return json(res, 502, { error: 'Atlas вернул не изображение.' });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
      'Referrer-Policy': 'no-referrer',
    });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.end(bytes);
  } catch (error) {
    return json(res, 502, { error: `Не удалось загрузить результат Atlas: ${error.message}` });
  }
}

const server = http.createServer(async (req, res) => {
  res.requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  if (req.url.startsWith('/api/')) {
    writeLog('info','http.start',{ requestId:res.requestId, method:req.method, path:new URL(req.url,'http://localhost').pathname });
    res.on('finish',()=>writeLog(res.statusCode >= 400 ? 'error' : 'info','http.finish',{ requestId:res.requestId, status:res.statusCode, durationMs:Date.now()-startedAt }));
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { ok: true, configured: Boolean(process.env.ATLASCLOUD_API_KEY), imageModel:require('./lib/atlas').MODELS.generate });
  }
  if (req.method === 'GET' && req.url === '/api/debug/logs') {
    return json(res,200,{logs:debugLog.slice(-300),file:LOG_FILE});
  }
  if (req.method === 'POST' && req.url === '/api/generate') {
    try {
      const apiKey = process.env.ATLASCLOUD_API_KEY;
      if (!apiKey) return json(res, 503, { error: 'Добавьте ATLASCLOUD_API_KEY в файл .env.' });
      const input = validateRequest(await readJson(req));
      writeLog('info','atlas.generate.start',{requestId:res.requestId,model:require('./lib/atlas').MODELS[input.mode],mode:input.mode,size:input.size,prompt:input.prompt.slice(0,300)});
      const jobs = await generateBatch(input, apiKey, { onEvent:(event)=>writeLog('info',`atlas.${event.phase}`,{requestId:res.requestId,...event}) });
      const remoteImages = jobs.flatMap((job) => job.outputs || []).map((url, index) => ({ url, index, predictionId:jobs.find((job)=>job.outputs?.includes(url))?.id }));
      const images = await Promise.all(remoteImages.map(async(image)=>{
        try { return {...image,proxyUrl:await cacheGeneratedAsset(image.url,image.predictionId,image.index)}; }
        catch(error) { writeLog('error','atlas.cache.failed',{requestId:res.requestId,message:error.message}); return {...image,proxyUrl:`/api/image?url=${encodeURIComponent(image.url)}`}; }
      }));
      if (!images.length) throw new Error('Atlas не вернул ни одного изображения.');
      writeLog('info','atlas.generate.complete',{requestId:res.requestId,count:images.length,files:images.map(image=>image.proxyUrl)});
      return json(res, 200, { images, jobs: jobs.map(({ id, status, metrics }) => ({ id, status, metrics })) });
    } catch (error) {
      writeLog('error','atlas.generate.failed',{requestId:res.requestId,message:error.message});
      return json(res, 400, { error: error.message || 'Не удалось выполнить запрос.' });
    }
  }
  if (req.method === 'GET' && req.url === '/api/prelands/templates') {
    return json(res, 200, { templates: TEMPLATES, defaults: Object.fromEntries(TEMPLATES.map((item) => [item.id, defaultConfig(item.id)])), llmConfigured: atlasLlmConfigured() });
  }
  if (req.method === 'GET' && req.url === '/api/prelands/archive-templates') {
    const root = path.join(PUBLIC_DIR, 'prelander-library');
    const templates = ARCHIVE_MECHANICS.filter(item=>fs.existsSync(path.join(root,item.id,'config.js'))).map(item=>({...item,source:'archive',vertical:item.category,description:'Рабочая механика из архива'}));
    return json(res, 200, { templates });
  }
  if (req.method === 'GET' && req.url === '/api/fonts') {
    return json(res, 200, { fonts:FONT_NAMES });
  }
  if (req.method === 'POST' && req.url === '/api/fonts/upload') {
    try {
      const font = saveUploadedFont(await readJson(req));
      writeLog('info','font.uploaded',{requestId:res.requestId,name:font.name,source:font.source});
      return json(res,200,{font,requestId:res.requestId});
    } catch (error) {
      writeLog('error','font.upload.failed',{requestId:res.requestId,message:error.message});
      return json(res,400,{error:error.message});
    }
  }
  if (req.method === 'GET' && req.url.startsWith('/api/prelands/archive-config?')) {
    try {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
      const config = loadArchiveTemplates(PRELAND_LIBRARY_DIR)[id];
      if (!config) throw new Error('Шаблон не найден.');
      return json(res, 200, { config: renderArchive(id, config, PRELAND_LIBRARY_DIR).config });
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/prelands/archive-upload-asset') {
    try {
      const input=await readJson(req),target=String(input.target||'');
      const current=renderArchive(input.id,input.config,PRELAND_LIBRARY_DIR).config;
      const assetMatch=target.match(/^assets\.([a-zA-Z0-9_]+)$/),itemMatch=target.match(/^items\.(\d+)\.image$/);
      const allowed=assetMatch?Object.prototype.hasOwnProperty.call(current.assets||{},assetMatch[1]):itemMatch?Boolean(current.items?.[Number(itemMatch[1])]):false;
      if(!allowed)throw new Error('Для этого элемента в механике не предусмотрено изображение.');
      const source=saveUploadedAsset(input.image);setObjectPath(current,target,source);
      const output=renderArchive(input.id,current,PRELAND_LIBRARY_DIR,true);
      if(!output.preview.includes(source))throw new Error('Файл сохранён, но не попал в итоговый преленд.');
      writeLog('info','archive.upload.placed',{requestId:res.requestId,id:input.id,target,source});
      return json(res,200,{config:output.config,target,source,requestId:res.requestId});
    }catch(error){writeLog('error','archive.upload.failed',{requestId:res.requestId,message:error.message});return json(res,400,{error:error.message});}
  }
  if (req.method === 'POST' && req.url === '/api/prelands/archive-render') {
    try {
      const input = await readJson(req);
      return json(res, 200, renderArchive(input.id, input.config, PRELAND_LIBRARY_DIR, true));
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/prelands/archive-plan') {
    try {
      const input = await readJson(req);
      const current = renderArchive(input.id, input.config, PRELAND_LIBRARY_DIR).config;
      const fontNames=[...FONT_NAMES,...(current.customFonts||[]).map(font=>font.name)];
      const messages=buildArchivePlanMessages({id:input.id,current,userPrompt:input.prompt,intent:input.intent,fontNames});
      const planned = await callAtlasJson(messages,3200,{requestId:res.requestId,operation:`archive.plan.${input.id}`,retryMaxTokens:2400,repairMaxTokens:2000,timeoutMs:90000,retryTimeoutMs:70000});
      const rawPlan=planned.parsed?.plan||planned.parsed;
      let plan=applyDeterministicIconIntent(applyDeterministicBlurIntent(validateArchivePlan(rawPlan,current),input.prompt),input.prompt);
      plan=applyDeterministicSlotIntent(plan,input.prompt,current,input.id);
      plan=applyDeterministicContrastIntent(applyAutomaticContrast(plan,current),input.prompt,current);
      const llmAssetPrompts=[...(plan.assetPrompts||[])];
      const provided=input.intent==='refine'?selectRefineAssetPrompts(input.id,current,input.prompt,llmAssetPrompts):llmAssetPrompts;
      plan.assetPrompts=enrichArchiveAssetPrompts({
        id:input.id,config:current,provided,userPrompt:input.prompt,
        fillMissing:input.intent!=='refine',
      });
      writeLog('info','archive.plan.complete',{requestId:res.requestId,id:input.id,intent:input.intent||'create',changes:plan.changes.length,changePaths:plan.changes.map(item=>item.path),assetPaths:plan.assetPrompts.map(item=>item.path),discardedAssetPaths:llmAssetPrompts.map(item=>item.path).filter(path=>!plan.assetPrompts.some(item=>item.path===path))});
      return json(res, 200, { plan, model: planned.llm.model });
    } catch (error) { return json(res, 400, { error: `LLM: ${error.message}` }); }
  }
  if (req.method === 'GET' && req.url.startsWith('/api/prelands/archive-export?')) {
    try {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
      if (!/^[a-z0-9_]+$/.test(id)) throw new Error('Некорректный шаблон.');
      const root = path.join(PUBLIC_DIR, 'prelander-library');
      const selected = path.join(root, id);
      if (!fs.existsSync(path.join(selected, 'config.js'))) throw new Error('Шаблон не найден.');
      const files = {};
      const addDirectory = (directory, archiveBase) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const absolute = path.join(directory, entry.name); const archiveName = `${archiveBase}/${entry.name}`;
          if (entry.isDirectory()) addDirectory(absolute, archiveName); else files[archiveName] = fs.readFileSync(absolute);
        }
      };
      addDirectory(path.join(root, 'shared'), 'prelanders/shared');
      addDirectory(selected, `prelanders/${id}`);
      const archive = zipFiles(files);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${id}.zip"`, 'Content-Length': archive.length });
      return res.end(archive);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/prelands/archive-export') {
    try {
      const input = await readJson(req); const id = String(input.id || '');
      if (!/^[a-z0-9_]+$/.test(id)) throw new Error('Некорректный шаблон.');
      const output = renderArchive(id, input.config, PRELAND_LIBRARY_DIR);
      const config = JSON.parse(JSON.stringify(output.config)); const assetFiles = {};
      const materialize = async (source, name) => {
        if (!source) return source;
        if (source.startsWith('./assets/')) {
          const sourceName = path.basename(source); const bytes = fs.readFileSync(path.join(PRELAND_LIBRARY_DIR, id, 'assets', sourceName));
          assetFiles[`preland/assets/${name}-${sourceName}`] = bytes; return `assets/${name}-${sourceName}`;
        }
        const file = await exportAsset(source); const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : file.type.includes('gif') ? 'gif' : file.type.includes('svg') ? 'svg' : 'jpg';
        assetFiles[`preland/assets/${name}.${ext}`] = file.bytes; return `assets/${name}.${ext}`;
      };
      for (const key of Object.keys(config.assets || {})) config.assets[key] = await materialize(config.assets[key], key);
      for (let index = 0; index < (config.items || []).length; index += 1) if (config.items[index].image) config.items[index].image = await materialize(config.items[index].image, `item-${index}`);
      const finalOutput = renderArchive(id, config, PRELAND_LIBRARY_DIR);
      const files = { ...assetFiles, ...Object.fromEntries(Object.entries(finalOutput.files).map(([name, content]) => [`preland/${name}`, content])) };
      for (const font of finalOutput.fontAssets || []) {
        const source = path.join(FONT_DIR, font.source);
        if (!fs.existsSync(source)) throw new Error(`Файл шрифта ${font.source} не найден.`);
        files[`preland/assets/fonts/${font.target}`] = fs.readFileSync(source);
      }
      const archive = zipFiles(files);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${id}-edited.zip"`, 'Content-Length': archive.length });
      return res.end(archive);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/builder/render') {
    try { const output = renderBuilder((await readJson(req)).project); return json(res, 200, { html: output.html, validation: output.validation }); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/builder/plan') {
    try {
      const input = await readJson(req);
      const llm = await callAtlasLlm([
        { role: 'system', content: 'Ты архитектор визуального конструктора прелендов. Верни JSON {"summary":"...","operations":[]}. Операции: add_scene{name}; add_block{sceneId,blockType,text,style}; update_component{sceneId,componentId,text,style}; add_interaction{sceneId,sourceId,event,action,targetId,targetSceneId}; generate_asset{sceneId,componentId,prompt}. blockType: text,heading,button,image,container,reveal,wheel,scratch,progress,quiz,cta. event: click,dblclick,timer. action: show,hide,toggle,nextScene,goScene,redirect. Создавай законченный мобильный сценарий. Не создавай JS, tracking или redirect-код. Для adult допускаются только вымышленные однозначно совершеннолетние персонажи; запрещены реальные люди, nudify, несовершеннолетние и принуждение.' },
        { role: 'user', content: `Текущий проект:\n${JSON.stringify(input.project)}\n\nЗапрос:\n${String(input.prompt || '').slice(0,5000)}` },
      ], 3000);
      return json(res, 200, { plan: validateBuilderPlan(parseLlmJson(llm.content)), model: llm.model });
    } catch (error) { return json(res, 400, { error: `LLM: ${error.message}` }); }
  }
  if (req.method === 'POST' && req.url === '/api/builder/export') {
    try {
      const input = await readJson(req); const project = JSON.parse(JSON.stringify(input.project));
      for (const scene of project.scenes || []) {
        for (const field of ['html', 'css']) {
          const matches = [...String(scene[field] || '').matchAll(/\/api\/image\?url=([^"' )<]+)/g)];
          for (const match of matches) {
            const remote = decodeURIComponent(match[1]); const file = await exportAsset(remote); const data = `data:${file.type};base64,${file.bytes.toString('base64')}`;
            scene[field] = scene[field].replace(match[0], data);
          }
        }
      }
      const output = exportBuilder(project); res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="twinbid-preland.zip"', 'Content-Length': output.archive.length }); return res.end(output.archive);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/generate') {
    try {
      const input = await readJson(req);
      const lock=acquireBuilderJob(input,res,'builder.generate');
      if(!lock.ok)return json(res,409,{error:'В другой вкладке уже выполняется AI-генерация. Дождитесь её завершения или попробуйте через несколько минут.',activeRequestId:lock.active.requestId});
      for(const[id,oldJob]of pipelineJobs)if(Date.now()-(oldJob.completedAt||oldJob.updatedAt)>3600000)pipelineJobs.delete(id);
      const job={id:crypto.randomUUID(),clientId:lock.key,status:'queued',progress:0,message:'Задача поставлена в очередь',warnings:[],createdAt:Date.now(),updatedAt:Date.now()};pipelineJobs.set(job.id,job);
      writeLog('info','builder.pipeline.created',{requestId:job.id,httpRequestId:res.requestId,clientId:lock.key});
      void runPrelandPipeline(job,{...input,offerUrl:input.offerUrl||'https://example.com/offer'},lock);
      return json(res,202,{jobId:job.id,status:job.status,progress:job.progress,message:job.message});
    } catch(error){writeLog('error','builder.generate.failed',{requestId:res.requestId,status:error.status||0,code:error.code||'',message:String(error.message||error).slice(0,1000)});return json(res,400,{error:error.message});}
  }
  if(req.method==='GET'&&req.url.startsWith('/api/simple-builder/job?')){
    const url=new URL(req.url,'http://localhost'),job=pipelineJobs.get(url.searchParams.get('id')||''),clientId=String(url.searchParams.get('clientId')||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
    if(!job||job.clientId!==clientId)return json(res,404,{error:'Задача не найдена. Возможно, сервер был перезапущен.'});
    return json(res,200,{jobId:job.id,status:job.status,progress:job.progress,message:job.message,warnings:job.warnings,blueprint:job.blueprint,model:job.model,project:job.status==='completed'?job.project:undefined,error:job.error});
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/edit') {
    try {
      const input=await readJson(req);
      const llm=await callAtlasLlm([{role:'system',content:'Верни только JSON {"patch":{}} для выбранного визуального блока. Можно менять x,y,width,height,content,assetPrompt,style{fontFamily,fontSize,fontWeight,color,background,radius,align,opacity,z}, mechanism{kind,cta,steps}. Нельзя добавлять JS или HTML. Координаты должны оставаться внутри viewport. Если пользователь просит новую картинку, заполни assetPrompt.'},{role:'user',content:`Viewport:${JSON.stringify(input.viewport)}\nБлок:${JSON.stringify(input.block)}\nЗапрос:${String(input.prompt||'').slice(0,2000)}`}],1800);
      const parsed=parseLlmJson(llm.content);const clean=sanitizeSimplePatch(parsed.patch||{},input.block||{});const patch={x:clean.x,y:clean.y,width:clean.width,height:clean.height,content:clean.content,assetPrompt:clean.assetPrompt,style:clean.style};if(clean.mechanism)patch.mechanism=clean.mechanism;return json(res,200,{patch,model:llm.model});
    }catch(error){return json(res,400,{error:`LLM: ${error.message}`});}
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/refine') {
    let lock;
    try {
      const input = await readJson(req);
      lock=acquireBuilderJob(input,res,'builder.refine');
      if(!lock.ok)return json(res,409,{error:'В другой вкладке уже выполняется AI-генерация. Дождитесь её завершения или попробуйте через несколько минут.',activeRequestId:lock.active.requestId});
      const current = sanitizeSimpleProject(input.project);
      const userContent=`Текущий проект:\n${JSON.stringify(current)}\n\nИзменения:\n${String(input.prompt || '').slice(0,5000)}`;
      const messages=[
        { role:'system', content:`Ты AI-дизайнер рекламных прелендов. Пользователь не редактирует элементы руками: ты должен вернуть полностью обновлённый проект. Верни только JSON {"project":{...}} в том же формате, что входной проект. Сохрани все полезные части текущего проекта, но выполни запрос пользователя. Можно менять блоки, координаты, размеры, тексты, цвета и картинки через assetPrompt. style.fontFamily выбирай из ${[...FONT_NAMES,...current.customFonts.map(font=>font.name)].join(', ')}. Kind основной механики менять запрещено: он выбран пользователем отдельной кнопкой. Для gift_boxes каждый stage — ровно одна целая изолированная коробка на прозрачном фоне, без сцены, подложки, пола, окружения, текста и дополнительных объектов; это системное правило нельзя отменить пользовательским запросом. Не создавай HTML или JS. Не допускай пересечения важных элементов и выхода за viewport. Для adult разрешены только вымышленные однозначно совершеннолетние персонажи; запрещены реальные люди, nudify, несовершеннолетние и принуждение.` },
        { role:'user', content:userContent },
      ];
      const llm = await callAtlasLlm(messages,4200,{requestId:res.requestId,operation:'builder.refine',retryMessages:[{role:'system',content:COMPACT_REFINE_PROMPT},{role:'user',content:userContent}],retryMaxTokens:2800});
      const parsed = parseLlmJson(llm.content);
      const currentKind=current.blocks.find(block=>block.type==='mechanism')?.mechanism?.kind||'wheel';
      const project = ensureSimpleAssetPlan({ ...parsed.project, customFonts:current.customFonts, offerUrl: current.offerUrl }, `Механика строго ${currentKind}. ${input.prompt}`);
      return json(res, 200, { project, model: llm.model, attempt:llm.attempt });
    } catch (error) { writeLog('error','builder.refine.failed',{requestId:res.requestId,status:error.status||0,code:error.code||'',message:String(error.message||error).slice(0,1000)});return json(res,error.status===409?409:400,{error:`LLM: ${error.message}`}); }
    finally{if(lock?.ok)builderJobs.release(lock.key,res.requestId);}
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/render') {
    try{const output=renderSimpleProject((await readJson(req)).project);return json(res,200,{html:output.html,validation:output.validation});}catch(error){return json(res,400,{error:error.message});}
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/upload-asset') {
    try {
      const input=await readJson(req);const source=saveUploadedAsset(input.image);const placed=placeSimpleUploadedAsset(input.project,source,input.prompt);
      const rendered=renderSimpleProject(placed.project);if(!rendered.html.includes(source))throw new Error('Проверка вставки не пройдена.');
      writeLog('info','builder.upload.placed',{requestId:res.requestId,target:placed.target,source});
      return json(res,200,{project:placed.project,target:placed.target,source});
    }catch(error){writeLog('error','builder.upload.failed',{requestId:res.requestId,message:error.message});return json(res,400,{error:error.message});}
  }
  if (req.method === 'POST' && req.url === '/api/simple-builder/export') {
    try{
      const project=JSON.parse(JSON.stringify((await readJson(req)).project));
      const convert=async(source)=>{if(!String(source||'').startsWith('/api/image?'))return source;const remote=new URL(source,'http://localhost').searchParams.get('url');const file=await exportAsset(remote);return`data:${file.type};base64,${file.bytes.toString('base64')}`};
      for(const block of project.blocks||[]){block.src=await convert(block.src);for(const stage of block.mechanism?.stages||[])stage.src=await convert(stage.src);}
      const output=zipSimpleProject(project);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="twinbid-preland.zip"','Content-Length':output.archive.length});return res.end(output.archive);
    }catch(error){return json(res,400,{error:error.message});}
  }
  if (req.method === 'POST' && req.url === '/api/prelands/render') {
    try { return json(res, 200, render((await readJson(req)).config, true)); }
    catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && req.url === '/api/prelands/plan') {
    try {
      const input = await readJson(req);
      const current = render(input.config).config;
      const llm = await callAtlasLlm([
          { role: 'system', content: 'Ты планировщик изменений рекламного преленда. Верни только JSON: {"summary":"...","changes":[{"path":"...","value":"..."}],"assetPrompts":[{"slot":"hero_character","prompt":"..."}]}. Разрешённые paths: text.headline,text.subtitle,text.cta,theme.background,theme.surface,theme.primary,theme.accent,theme.text,theme.font,settings.language,settings.geo,assets.background_image,assets.hero_character,assets.logo. Не изменяй механику, tracking, redirect, click_id, postback или core logic. Для замены изображения создай assetPrompts, не выдумывай URL.' },
          { role: 'user', content: `Текущая конфигурация:\n${JSON.stringify(current)}\n\nЗапрос пользователя:\n${String(input.prompt || '').slice(0, 5000)}` },
      ], 2048);
      return json(res, 200, { plan: validatePlan(parseLlmJson(llm.content)), model: llm.model });
    } catch (error) { return json(res, 400, { error: `LLM: ${error.message}` }); }
  }
  if (req.method === 'POST' && req.url === '/api/prelands/export') {
    try {
      const prepared = await materializePrelandAssets((await readJson(req)).config);
      const output = render(prepared.config);
      const files = Object.fromEntries(Object.entries(output.files).map(([name, content]) => [`preland/${name}`, content]));
      for (const [name, bytes] of Object.entries(prepared.assets)) files[`preland/${name}`] = bytes;
      if (!Object.keys(prepared.assets).length) files['preland/assets/README.txt'] = 'Generated and uploaded assets will be placed in this directory.';
      const archive = zipFiles(files);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="preland-${output.config.templateId}.zip"`, 'Content-Length': archive.length });
      return res.end(archive);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method === 'GET' && req.url.startsWith('/api/image?')) return proxyAtlasImage(req, res);
  if (req.method === 'GET' && serveStatic(req, res)) return;
  json(res, 404, { error: 'Не найдено.' });
});

if (require.main === module) server.listen(PORT, () => console.log(`TwinBid Atlas MVP: http://localhost:${PORT}`));
module.exports = { server, applyDeterministicBlurIntent, applyDeterministicIconIntent, applyDeterministicSlotIntent, applyAutomaticContrast, applyDeterministicContrastIntent };
