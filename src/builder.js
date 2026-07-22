import './builder.css';
import './builder-extra.css';

const $ = (selector) => document.querySelector(selector);
const STORE = 'twinbid-ai-preland-project-v2';
const VERSIONS = 'twinbid-ai-preland-versions-v2';
const CLIENT_STORE = 'twinbid-ai-preland-client-id-v1';
const ACTIVE_JOB_STORE = 'twinbid-ai-preland-active-job-v1';
const clone = (value) => JSON.parse(JSON.stringify(value));
const clientLog = [];
const CLIENT_ID = getClientId();
let project = JSON.parse(localStorage.getItem(STORE) || 'null') || emptyProject();
let versions = JSON.parse(localStorage.getItem(VERSIONS) || '[]');
let lastRenderedHtml = '';
let uploadedImage = '';
let archiveTemplates = new Map();

const isArchiveProject = (value = project) => value?.mode === 'archive' && Boolean(value.templateId && value.config);
function setPath(target,path,value){const parts=String(path).split('.');let cursor=target;for(let index=0;index<parts.length-1;index++){const key=/^\d+$/.test(parts[index])?Number(parts[index]):parts[index];if(cursor[key]==null)cursor[key]={};cursor=cursor[key]}const last=/^\d+$/.test(parts.at(-1))?Number(parts.at(-1)):parts.at(-1);cursor[last]=value;}
const IDENTICAL_PICK_ASSET_MECHANICS=new Set(['casino_lucky_card','sweep_mystery_box']);
function setArchiveAssetSource(path,source){
  setPath(project.config,path,source);
  if(IDENTICAL_PICK_ASSET_MECHANICS.has(project.templateId)&&/^items\.\d+\.image$/.test(path)){
    for(let index=0;index<(project.config.items||[]).length;index++)setPath(project.config,`items.${index}.image`,source);
  }
}
async function sourceToDataUrl(source){
  if(/^data:image\//i.test(source||''))return source;
  const response=await fetch(source);if(!response.ok)throw new Error('Не удалось загрузить кадр «до» для создания связанного кадра «после».');
  const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Не удалось подготовить кадр «до».'));reader.readAsDataURL(blob)});
}

function logClient(event, details = {}) {
  clientLog.push({ at:new Date().toISOString(), event, ...details });
  if (clientLog.length > 300) clientLog.shift();
  const root = $('#debugPreview'); if (root) root.textContent = clientLog.slice(-8).map(item=>`${item.at.slice(11,19)} ${item.event}${item.message ? ` · ${item.message}` : ''}`).join('\n');
}

function emptyProject() {
  return {
    name: 'Новый преленд', viewport: { width: 390, height: 844, background: '#090d18' }, offerUrl: 'https://example.com/offer', customFonts:[],
    blocks: [
      { id:'welcome',type:'text',x:30,y:250,width:330,height:100,content:'Опишите преленд слева',src:'',assetPrompt:'',style:{fontFamily:'Inter, Arial, sans-serif',fontSize:40,fontWeight:800,color:'#ffffff',background:'transparent',radius:0,align:'center',opacity:1,z:2} },
      { id:'hint',type:'text',x:50,y:370,width:290,height:60,content:'AI сам соберёт дизайн, картинки и механику.',src:'',assetPrompt:'',style:{fontFamily:'Inter, Arial, sans-serif',fontSize:16,fontWeight:500,color:'#bfc2ba',background:'transparent',radius:0,align:'center',opacity:1,z:2} },
    ],
  };
}

function getClientId() {
  try { const current=localStorage.getItem(CLIENT_STORE);if(current)return current;const created=crypto.randomUUID();localStorage.setItem(CLIENT_STORE,created);return created; }
  catch { return crypto.randomUUID(); }
}

async function renderDesign() {
  try {
    const result = isArchiveProject()
      ? await api('/api/prelands/archive-render',{id:project.templateId,config:project.config})
      : await api('/api/simple-builder/render', { project });
    lastRenderedHtml = isArchiveProject()?result.preview:result.html;
    if(isArchiveProject()&&result.config)project.config=result.config;
    const frame = $('#designFrame'); frame.srcdoc = ''; requestAnimationFrame(() => { frame.srcdoc = lastRenderedHtml; });
    $('#projectTitle').textContent = project.name || 'Преленд'; $('#offerUrl').value = project.offerUrl || ''; $('#saveState').textContent = 'Сохранено';
    document.querySelectorAll('[data-size]').forEach(item=>item.classList.toggle('active',item.dataset.size===`${project.viewport.width}x${project.viewport.height}`));
    fitDevice(); persist(); renderVersions(); logClient('render.ok',{blocks:project.blocks?.length||0,images:countPlacedAssets()});
    renderFontList();
    renderBlurControls();
  } catch (error) { logClient('render.failed',{message:error.message}); showStatus(error.message, true); }
}

function currentCustomFonts() { return isArchiveProject() ? (project.config.customFonts ||= []) : (project.customFonts ||= []); }
function renderFontList() {
  const root=$('#fontList');if(!root)return;const fonts=currentCustomFonts();
  root.innerHTML=fonts.length?fonts.map(font=>`<span style="font-family:'${escapeHtml(font.name)}',sans-serif">${escapeHtml(font.name)}</span>`).join(''):'<small>Свои шрифты пока не добавлены</small>';
}
function renderBlurControls(){
  const root=$('#blurControls');if(!root)return;const visible=isArchiveProject();root.classList.toggle('hidden',!visible);if(!visible)return;
  const design=project.config.design||{};const background=Math.max(0,Number(design.backgroundBlur)||0),media=Math.max(0,Number(design.mediaBlur)||0);
  $('#backgroundBlur').value=String(background);$('#backgroundBlurValue').textContent=`${background} px`;
  $('#mediaBlur').value=String(media);$('#mediaBlurValue').textContent=`${media} px`;
}
async function setBlur(field,value,label){
  if(!isArchiveProject())return;saveVersion(`До изменения: ${label}`);project.config.design=project.config.design||{};project.config.design[field]=Math.max(0,Number(value)||0);
  if(field==='backgroundBlur'&&project.config.design[field]===0)project.config.design.backgroundScale=1;
  await renderDesign();showStatus(`${label}: ${project.config.design[field]} px.`);
}
async function clearAllBlur(){
  if(!isArchiveProject())return;saveVersion('До отключения размытия');project.config.design=project.config.design||{};
  Object.assign(project.config.design,{backgroundBlur:0,backgroundScale:1,mediaBlur:0,cardBackdropBlur:0});
  await renderDesign();showStatus('Всё размытие отключено.');
}
async function uploadCustomFont() {
  const file=$('#fontFile').files[0];if(!file)return showStatus('Сначала выберите файл шрифта.',true);
  if(file.size>10*1024*1024)return showStatus('Файл шрифта больше 10 МБ.',true);
  setBusy(true,'Загружаем шрифт…');
  try {
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Не удалось прочитать файл шрифта.'));reader.readAsDataURL(file)});
    saveVersion('До загрузки шрифта');
    const result=await api('/api/fonts/upload',{data,fileName:file.name,name:$('#fontName').value.trim()});
    const fonts=currentCustomFonts();if(!fonts.some(font=>font.name.toLowerCase()===result.font.name.toLowerCase()))fonts.push(result.font);
    $('#fontFile').value='';$('#fontName').value='';await renderDesign();
    showStatus(`Шрифт «${result.font.name}» добавлен. Теперь напишите AI, например: «Заголовок шрифтом ${result.font.name}».`);
  } catch(error) { showStatus(error.message,true); }
  finally { setBusy(false); }
}

async function generateProject() {
  const prompt = $('#pagePrompt').value.trim(); if (!prompt) return showStatus('Сначала опишите преленд.', true);
  setBusy(true, 'AI создаёт структуру и дизайн…');
  try {
    saveVersion('До новой генерации');
    const preservedFonts=clone(currentCustomFonts());
    const mechanic=getSelectedMechanic();
    if(archiveTemplates.has(mechanic)){
      await generateArchiveProject(mechanic,prompt);
      return;
    }
    const started = await api('/api/simple-builder/generate', { prompt, mechanic, viewport: project.viewport, offerUrl: $('#offerUrl').value || project.offerUrl, customFonts:preservedFonts, clientId:CLIENT_ID });
    localStorage.setItem(ACTIVE_JOB_STORE,started.jobId);logClient('pipeline.started',{jobId:started.jobId});
    const result=await waitForPipeline(started.jobId);localStorage.removeItem(ACTIVE_JOB_STORE);
    project = result.project;project.customFonts=preservedFonts; showStatus(`Все секции собраны моделью ${result.model||'Atlas'}. Генерируем картинки…`);
    await renderDesign(); const assets=await generateMissingAssets(); await renderDesign(); showStatus(assets.failed ? `Преленд создан, но ${assets.failed} картинок не добавились. Скачайте журнал.` : `Готово: ${assets.placed} картинок добавлено в преленд. Откройте просмотр.`, Boolean(assets.failed));
  } catch (error) { localStorage.removeItem(ACTIVE_JOB_STORE);restoreLatestOnFailure(); showStatus(error.message, true); }
  finally { setBusy(false); }
}

async function generateArchiveProject(templateId,prompt){
  showStatus('Загружаем защищённую механику из архива…');
  const template=archiveTemplates.get(templateId);
  const loaded=await getApi(`/api/prelands/archive-config?id=${encodeURIComponent(templateId)}`);
  const config=loaded.config,offer=$('#offerUrl').value||project.offerUrl||'https://example.com/offer';
  config.customFonts=clone(currentCustomFonts());
  config.links=config.links||{};config.links.primary=offer;
  for(const item of Array.isArray(config.items)?config.items:[])if('url' in item)item.url=offer;
  showStatus('AI создаёт новый дизайн, не изменяя механику…');
  const planned=await api('/api/prelands/archive-plan',{id:templateId,prompt,config,intent:'create'});
  for(const change of planned.plan.changes||[])setPath(config,change.path,change.value);
  project={mode:'archive',templateId,name:template?.name||templateId,viewport:{...project.viewport},offerUrl:offer,config};
  await renderDesign();
  const assets=await generateArchiveAssets(planned.plan.assetPrompts||[]);
  await renderDesign();
  showStatus(assets.failed?`Механика сохранена, но не создались изображения: ${assets.failed}.`:`Готово: ${template?.name||templateId} · ${planned.model} · новых изображений ${assets.placed}.`,Boolean(assets.failed));
}

async function generateArchiveAssets(assetPrompts){
  let placed=0,failed=0;let jobs=(assetPrompts||[]).slice(0,12);
  if(project.templateId==='nutra_before_after_story'){
    const priority={'assets.background':0,'assets.beforeImage':1,'assets.afterImage':2};jobs=jobs.slice().sort((left,right)=>(priority[left.path]??9)-(priority[right.path]??9));
  }
  for(const [index,job] of jobs.entries()){
    showStatus(`Atlas создаёт изображение ${index+1} из ${jobs.length} для выбранной механики…`);
    try{
      const kind=job.kind||(/assets\.background$/i.test(job.path)?'background':/items\.\d+\.image/i.test(job.path)?'object':'photo');
      const rules={
        background:'Output only full-bleed background artwork. Keep the main content area readable.',
        object:'Output one complete isolated object on a genuine transparent alpha background with generous margins. No white, black, colored, gradient or checkered backdrop. No words, pseudo-words, letters, digits, percentages, labels or UI.',
        portrait:'Output one clean photographic portrait, not a profile card or app screenshot.',
        photo:'Output one clean photograph, not a framed card, collage or interface screenshot.',
        texture:'Output one seamless edge-to-edge material texture with no frame or other objects. No words, pseudo-words, letters, digits, percentages, labels, prizes or UI.',
      };
      const rule=rules[kind]||'Output one reusable visual asset only, never a complete poster or webpage.';
      const adult=project.templateId.startsWith('adult_');
      const pairedAfter=project.templateId==='nutra_before_after_story'&&job.path==='assets.afterImage';
      const beforeSource=project.config.assets?.beforeImage;
      if(pairedAfter&&!beforeSource)throw new Error('Сначала нужно создать кадр «до»: кадр «после» теперь всегда редактируется из него.');
      const generated=await api('/api/generate',{mode:pairedAfter?'edit':'generate',image:pairedAfter?await sourceToDataUrl(beforeSource):undefined,prompt:`${job.prompt} ${rule}${pairedAfter?' Preserve the exact source identity, pose, clothing, camera, crop, light and background. Do not create a second person or split image.':''}`,count:1,size:'1024*1024',format:['object','texture'].includes(kind)?'png':'jpeg',adult,adultConfirmed:adult});
      const image=generated.images?.[0],source=image?.proxyUrl||(image?.url?`/api/image?url=${encodeURIComponent(image.url)}`:'');
      if(!source)throw new Error('Atlas не вернул изображение.');
      setArchiveAssetSource(job.path,source);
      const verification=await api('/api/prelands/archive-render',{id:project.templateId,config:project.config});
      if(!verification.preview.includes(source))throw new Error('Картинка создана, но не попала в готовый преленд.');
      placed++;logClient('archive.asset.placed',{path:job.path,source,mode:pairedAfter?'edit':'generate',synchronized:IDENTICAL_PICK_ASSET_MECHANICS.has(project.templateId),requestId:generated.requestId});
    }catch(error){failed++;logClient('archive.asset.failed',{path:job.path,message:error.message});}
  }
  return{placed,failed,total:jobs.length};
}

async function waitForPipeline(jobId) {
  for(let attempt=0;attempt<450;attempt++){
    const job=await getApi(`/api/simple-builder/job?id=${encodeURIComponent(jobId)}&clientId=${encodeURIComponent(CLIENT_ID)}`);
    showStatus(`${job.progress||0}% · ${job.message||'AI собирает проект…'}`);logClient('pipeline.progress',{jobId,status:job.status,progress:job.progress,message:job.message});
    if(job.status==='completed'){for(const warning of job.warnings||[])logClient('pipeline.warning',{message:warning});return job;}
    if(job.status==='failed')throw new Error(`Не удалось собрать проект: ${job.error||job.message}`);
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw new Error('Проект продолжает собираться слишком долго. Его состояние сохранено в журнале.');
}

async function resumePipeline() {
  const jobId=localStorage.getItem(ACTIVE_JOB_STORE);if(!jobId)return;
  setBusy(true,'Возобновляем наблюдение за созданием проекта…');
  try{const result=await waitForPipeline(jobId);project=result.project;localStorage.removeItem(ACTIVE_JOB_STORE);await renderDesign();const assets=await generateMissingAssets();await renderDesign();showStatus(`Проект восстановлен: добавлено картинок ${assets.placed}.`);}
  catch(error){localStorage.removeItem(ACTIVE_JOB_STORE);showStatus(error.message,true);}finally{setBusy(false);}
}

async function refineProject() {
  const prompt = $('#refinePrompt').value.trim(); if (!prompt) return showStatus('Опишите, что изменить.', true);
  setBusy(true, 'AI полностью пересобирает страницу…');
  try {
    saveVersion('До AI-изменения');
    if(isArchiveProject()){
      const result=await api('/api/prelands/archive-plan',{id:project.templateId,prompt,config:project.config,intent:'refine'});
      for(const change of result.plan.changes||[])setPath(project.config,change.path,change.value);
      // The server has the mechanic contract and already validates every image
      // slot. Do not guess intent a second time here: phrases like "replace the
      // woman" may correctly target assets.background even without the word
      // "background" and used to be silently discarded by this client.
      const assetPrompts=result.plan.assetPrompts||[];
      logClient('archive.assets.accepted',{paths:assetPrompts.map(item=>item.path)});
      await generateArchiveAssets(assetPrompts);await renderDesign();
      showStatus(`${result.plan.summary} · ${result.model}`);$('#refinePrompt').value='';return;
    }
    const result = await api('/api/simple-builder/refine', { prompt, project, clientId:CLIENT_ID });
    project = result.project; await renderDesign(); const assets=await generateMissingAssets(); await renderDesign(); showStatus(assets.failed ? `Изменения применены, но ошибка у ${assets.failed} картинок. Скачайте журнал.` : `Изменения применены · ${result.model} · картинок добавлено: ${assets.placed}`,Boolean(assets.failed)); $('#refinePrompt').value = '';
  } catch (error) { restoreLatestOnFailure(); showStatus(error.message, true); }
  finally { setBusy(false); }
}

function filterRefineAssetPrompts(jobs,prompt){
  const value=String(prompt||'').toLowerCase();
  const generic=/картин|изображ|фото|визуал|перерис|image|picture|photo/.test(value);
  const subject=/девуш|женщин|мужчин|парн|персонаж|модел|человек|лиц[оа]|геро|subject|person|woman|man/.test(value);
  const all=/все\s+(?:картин|изображ|фото|анкеты|профили|карточки|коробки|сундуки|карты)|all\s+(?:images|pictures|photos|profiles|cards|boxes)/.test(value);
  const numberMatch=value.match(/(?:картин\w*|изображен\w*|фото|анкет\w*|профил\w*|карточк\w*|коробк\w*|сундук\w*|карт\w*|item)\s*#?([1-9])/);
  const wordIndex=[/перв\w+/,/втор\w+/,/трет\w+/,/четверт\w+/].findIndex(pattern=>pattern.test(value));
  const requestedIndex=numberMatch?Number(numberMatch[1])-1:wordIndex>=0?wordIndex:null;
  return(jobs||[]).filter(job=>{
    const path=String(job.path||'');
    if(/assets\.background$/i.test(path))return/фон|задн|background|backdrop/.test(value);
    if(/wheelSkin$/i.test(path))return/колес|wheel/.test(value);
    if(/slotFrame$/i.test(path))return/слот|автомат|slot/.test(value);
    if(/coverTexture$/i.test(path))return/скретч|scratch|покрыт|фольг/.test(value);
    if(/revealImage$/i.test(path))return generic||subject||/приз|награ|reveal|под\s+(?:скретч|покрыт)/.test(value);
    if(/previewImage$/i.test(path))return generic||subject||/превью|кадр|видео|обложк|preview|cover/.test(value);
    if(/productImage$/i.test(path))return generic||/товар|продукт|упаков|бан|флакон|product/.test(value);
    if(/beforeImage$/i.test(path))return subject||/\bдо\b|before|перв\w+\s+(?:фото|картин|изображ)/.test(value);
    if(/afterImage$/i.test(path))return subject||/после|after|втор\w+\s+(?:фото|картин|изображ)/.test(value);
    if(/items\.(\d+)\.image/i.test(path)){
      const index=Number(path.match(/items\.(\d+)\.image/i)[1]);
      if(requestedIndex!==null)return index===requestedIndex;
      if(all)return true;
      return(Boolean(job.primary)&&(generic||subject))||/короб|карт|анкет|профил|категор|вариант|эмблем|лого|приз|сундук/.test(value);
    }
    return generic;
  });
}

async function generateMissingAssets() {
  const jobs = [];
  for (const block of project.blocks || []) {
    if (block.assetPrompt && !block.src) jobs.push({ target:block, prompt:block.assetPrompt, role:block.assetRole || 'object' });
    for (const stage of block.mechanism?.stages || []) if (stage.assetPrompt && !stage.src) jobs.push({ target:stage, prompt:stage.assetPrompt, role:stage.assetRole || 'stage' });
  }
  let placed=0,failed=0;
  logClient('assets.queue',{count:jobs.length,roles:jobs.map(job=>job.role)});
  for (const [index, job] of jobs.slice(0, 6).entries()) {
    showStatus(`Atlas создаёт картинку ${index + 1} из ${Math.min(jobs.length, 6)}…`);
    try {
      const adult = isAdultProject();
      const prompt = buildAssetPrompt(job);
      const result = await api('/api/generate', { mode:'generate', prompt, count:1, size:'1024*1024', format:job.role==='object'?'png':'jpeg', adult, adultConfirmed:adult });
      const image=result.images?.[0];const source=image?.proxyUrl || (image?.url ? `/api/image?url=${encodeURIComponent(image.url)}` : '');
      if(!source)throw new Error('Сервер не вернул адрес готового изображения.');
      job.target.src=source;job.target.assetPrompt='';
      const verification=await api('/api/simple-builder/render',{project});
      if(!verification.html.includes(source))throw new Error('Картинка создана, но проверка вставки в HTML не пройдена.');
      placed++;logClient('asset.placed',{index:index+1,role:job.role,source,requestId:result.requestId});await renderDesign();
    } catch (error) { failed++;logClient('asset.failed',{index:index+1,role:job.role,message:error.message});showStatus(`Картинка ${index + 1} не создана: ${error.message}`, true); }
  }
  return {placed,failed,total:jobs.length};
}

function buildAssetPrompt(job) {
  const rules={
    background:'Full-bleed background artwork only. No text, no logo, no buttons, no UI, no frames. Keep the center visually calm for interface overlays.',
    object:'A single isolated object centered in a square product shot. One object only, front view, large margins, simple plain background, no text, no people, no UI, no extra objects.',
    character:'One main character or object, centered composition, no text, no logo, no buttons, no interface.',
    prize:'One prize centered and large, square composition, no text, no logo, no buttons, no interface.',
    stage:'A clean full-frame story image, consistent subject and composition, no text, no logo, no buttons, no interface.',
  };
  return `${job.prompt}. ${rules[job.role] || rules.object} This is a reusable visual asset, not a complete poster or webpage.`;
}

async function applyUploadedAsset() {
  const prompt=$('#assetPrompt').value.trim();if(!uploadedImage)return showStatus('Сначала выберите свою картинку.',true);if(!prompt)return showStatus('Напишите, куда поставить картинку: например «замени фон».',true);
  setBusy(true,'Добавляем вашу картинку…');
  try{saveVersion('До загрузки картинки');if(isArchiveProject()){const target=chooseArchiveAssetPath(prompt);if(!target)throw new Error('В этой механике нет подходящего места для изображения. Укажите «фон», «картинка 1», «до», «после» или «товар».');const result=await api('/api/prelands/archive-upload-asset',{id:project.templateId,config:project.config,image:uploadedImage,target});project.config=result.config;setArchiveAssetSource(result.target,result.source);await renderDesign();logClient('archive.upload.placed',{target:result.target,source:result.source,synchronized:IDENTICAL_PICK_ASSET_MECHANICS.has(project.templateId),requestId:result.requestId});showStatus(`Картинка сохранена и добавлена: ${result.target}.`);}else{const result=await api('/api/simple-builder/upload-asset',{project,image:uploadedImage,prompt});project=result.project;await renderDesign();logClient('upload.placed',{target:result.target,source:result.source,requestId:result.requestId});showStatus(`Картинка добавлена: ${result.target}.`);}$('#assetPrompt').value='';uploadedImage='';$('#assetFile').value='';$('#assetDrop').classList.remove('has-image');$('#assetPreview').removeAttribute('src');}
  catch(error){logClient('upload.failed',{message:error.message});showStatus(error.message,true);}finally{setBusy(false);}
}

function chooseArchiveAssetPath(instruction){
  const value=String(instruction||'').toLowerCase(),assets=project.config.assets||{};
  if(/замоч|ключ|икон|символ|эмблем|lock|icon|key/.test(value)&&'lockImage' in assets)return'assets.lockImage';
  if(/аватар|собесед|фото\s+профил|avatar|profile\s+photo/.test(value)&&'avatarImage' in assets)return'assets.avatarImage';
  if(/колес|wheel/.test(value)&&'wheelSkin' in assets)return'assets.wheelSkin';
  if(/скретч|scratch|покрыт/.test(value)&&'coverTexture' in assets)return'assets.coverTexture';
  const slotSymbol=value.match(/(?:картин|изображ|символ|барабан|item)[^0-9]{0,12}(10|[1-9])/);if(slotSymbol&&project.config.items?.[Number(slotSymbol[1])-1]?.hasOwnProperty('image'))return`items.${Number(slotSymbol[1])-1}.image`;
  if(/слот|автомат|корпус|slot\s*frame/.test(value)&&'slotFrame' in assets)return'assets.slotFrame';
  if(/фон|background|задн/.test(value)&&'background' in assets)return'assets.background';
  if(/после|after/.test(value)&&'afterImage' in assets)return'assets.afterImage';
  if(/до|before/.test(value)&&'beforeImage' in assets)return'assets.beforeImage';
  if(/товар|продукт|product/.test(value)&&'productImage' in assets)return'assets.productImage';
  if(/preview|превью/.test(value)&&'previewImage' in assets)return'assets.previewImage';
  if(/reveal|откры/.test(value)&&'revealImage' in assets)return'assets.revealImage';
  const match=value.match(/(?:картин|анкет|карточк|категор)[^0-9]{0,8}([1-9])/);if(match&&project.config.items?.[Number(match[1])-1])return`items.${Number(match[1])-1}.image`;
  const firstAsset=Object.keys(assets).find(key=>key!=='background');if(firstAsset)return`assets.${firstAsset}`;
  const firstItem=(Array.isArray(project.config.items)?project.config.items:[]).findIndex(item=>'image' in item);return firstItem>=0?`items.${firstItem}.image`:('background' in assets?'assets.background':'');
}

async function downloadDebugLog() {
  try{const response=await fetch('/api/debug/logs');const server=await response.json();const payload={createdAt:new Date().toISOString(),page:location.href,client:clientLog,server:server.logs||[],project:{name:project.name,blocks:project.blocks?.length||0,placedAssets:countPlacedAssets(),pendingAssets:countPendingAssets()}};const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));link.download=`twinbid-debug-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);showStatus('Журнал скачан — его можно прикрепить к сообщению.');}catch(error){showStatus(`Не удалось скачать журнал: ${error.message}`,true);}
}

const countPlacedAssets=()=>isArchiveProject()?Object.values(project.config.assets||{}).filter(Boolean).length+(Array.isArray(project.config.items)?project.config.items:[]).filter(item=>item.image).length:project.blocks?.reduce((sum,block)=>sum+(block.src?1:0)+(block.mechanism?.stages?.filter(stage=>stage.src).length||0),0)||0;
const countPendingAssets=()=>isArchiveProject()?0:project.blocks?.reduce((sum,block)=>sum+(block.assetPrompt&&!block.src?1:0)+(block.mechanism?.stages?.filter(stage=>stage.assetPrompt&&!stage.src).length||0),0)||0;

async function openPreview() {
  try {
    const result = isArchiveProject()?await api('/api/prelands/archive-render',{id:project.templateId,config:project.config}):await api('/api/simple-builder/render', { project });
    const host = $('#previewHost'); host.replaceChildren();
    const frame = document.createElement('iframe'); frame.setAttribute('sandbox', 'allow-scripts allow-forms'); host.append(frame);
    frame.style.width=`${project.viewport.width}px`;frame.style.height=`${project.viewport.height}px`;
    const dialog=$('#previewDialog');dialog.style.setProperty('--preview-width',`${project.viewport.width+28}px`);dialog.style.setProperty('--preview-height',`${project.viewport.height+54}px`);dialog.dataset.device=`${project.viewport.width}x${project.viewport.height}`;
    frame.srcdoc = isArchiveProject()?result.preview:result.html; dialog.showModal();
  } catch (error) { showStatus(error.message, true); }
}

function closePreview() {
  const dialog = $('#previewDialog'); if (dialog.open) dialog.close(); $('#previewHost').replaceChildren();
}

async function exportProject() {
  setBusy(true, 'Собираем автономный ZIP…');
  try {
    const response = await fetch(isArchiveProject()?'/api/prelands/archive-export':'/api/simple-builder/export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(isArchiveProject()?{id:project.templateId,config:project.config}:{ project }) });
    if (!response.ok) throw new Error((await response.json()).error || 'Ошибка экспорта');
    const link=document.createElement('a');link.href=URL.createObjectURL(await response.blob());link.download='twinbid-preland.zip';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);showStatus('ZIP готов.');
  } catch (error) { showStatus(error.message, true); }
  finally { setBusy(false); }
}

function saveVersion(label) {
  versions.push({ id:crypto.randomUUID(), label, at:Date.now(), project:clone(project) }); if (versions.length > 15) versions.shift(); localStorage.setItem(VERSIONS, JSON.stringify(versions));
}
function restoreVersion(id) { const version=versions.find(item=>item.id===id); if(!version)return;saveVersion('Перед восстановлением');project=clone(version.project);renderDesign();showStatus(`Открыта версия: ${version.label}`); }
function restorePrevious() { if (!versions.length) return showStatus('Предыдущих версий пока нет.', true); const version=versions.pop(); project=clone(version.project); localStorage.setItem(VERSIONS,JSON.stringify(versions)); renderDesign(); showStatus(`Возвращена версия: ${version.label}`); }
function restoreLatestOnFailure() { const latest=versions.at(-1); if(latest)project=clone(latest.project); renderDesign(); }
function renderVersions() { const root=$('#versions');root.replaceChildren(...versions.slice().reverse().map(version=>{const row=document.createElement('div');row.className='version';row.innerHTML=`<span>${escapeHtml(version.label)}<br><small>${new Date(version.at).toLocaleTimeString()}</small></span><button>Открыть</button>`;row.querySelector('button').onclick=()=>restoreVersion(version.id);return row;})); }

function setDevice(value, button) {
  const [width,height]=value.split('x').map(Number),oldWidth=project.viewport.width,oldHeight=project.viewport.height;
  if(width!==oldWidth||height!==oldHeight){
    if(!isArchiveProject()){
      const scaleX=width/oldWidth,scaleY=height/oldHeight,fontScale=Math.sqrt(scaleX*scaleY);
      for(const block of project.blocks||[]){
        block.x=Math.round(block.x*scaleX);block.y=Math.round(block.y*scaleY);block.width=Math.max(30,Math.round(block.width*scaleX));block.height=Math.max(24,Math.round(block.height*scaleY));
        if(block.style?.fontSize)block.style.fontSize=Math.max(8,Math.min(160,Math.round(block.style.fontSize*fontScale)));
      }
    }
    project.viewport.width=width;project.viewport.height=height;
  }
  document.querySelectorAll('[data-size]').forEach(item=>item.classList.toggle('active',item===button));renderDesign();
}
function getSelectedMechanic(){return document.querySelector('[data-mechanic].active')?.dataset.mechanic||'wheel';}
function selectMechanic(kind){document.querySelectorAll('[data-mechanic]').forEach(button=>{const active=button.dataset.mechanic===kind;button.classList.toggle('active',active);button.setAttribute('aria-checked',String(active));if(active&&button.closest('details'))button.closest('details').open=true;});logClient('mechanic.selected',{kind});}
function fitDevice() { const frame=$('#deviceFrame'), area=$('.frame-area'); frame.style.width=`${project.viewport.width+14}px`;frame.style.height=`${project.viewport.height+14}px`;const availableWidth=Math.max(320,area.clientWidth-70),availableHeight=Math.max(450,area.clientHeight-60);const scale=Math.min(1,availableWidth/(project.viewport.width+14),availableHeight/(project.viewport.height+14));frame.style.transform=`scale(${scale})`;frame.style.marginBottom=`-${(project.viewport.height+14)*(1-scale)}px`; }
function persist() { try{localStorage.setItem(STORE,JSON.stringify(project));}catch(error){logClient('storage.failed',{message:error.message});} }
function isAdultProject() { return project.templateId?.startsWith('adult_') || (project.blocks||[]).some(block=>block.mechanism?.kind==='progressive_reveal') || /adult|18\+|обнаж|раздень/i.test($('#pagePrompt').value); }
function setBusy(busy,message='') { $('#generateBtn').disabled=busy;$('#refineBtn').disabled=busy;$('#exportBtn').disabled=busy;$('#applyAssetBtn').disabled=busy;$('#uploadFontBtn').disabled=busy;if(message)showStatus(message); }
function showStatus(message,error=false) { $('#status').textContent=message;$('#status').style.color=error?'#ff8e88':''; }
async function api(url,body) { const started=performance.now();logClient('api.start',{url});const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();const requestId=response.headers.get('x-request-id')||'';logClient(response.ok?'api.ok':'api.error',{url,status:response.status,requestId,durationMs:Math.round(performance.now()-started),message:result.error||''});if(!response.ok)throw new Error(`${result.error||'Ошибка запроса'}${requestId?` · запрос ${requestId}`:''}`);return {...result,requestId}; }
async function getApi(url) { const started=performance.now();const response=await fetch(url,{headers:{'Accept':'application/json'}});const result=await response.json();const requestId=response.headers.get('x-request-id')||'';logClient(response.ok?'api.ok':'api.error',{url:url.split('?')[0],status:response.status,requestId,durationMs:Math.round(performance.now()-started),message:result.error||''});if(!response.ok)throw new Error(`${result.error||'Ошибка запроса'}${requestId?` · запрос ${requestId}`:''}`);return result; }
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

async function loadMechanicCatalog(){
  const result=await getApi('/api/prelands/archive-templates');archiveTemplates=new Map((result.templates||[]).map(item=>[item.id,item]));
  const grouped=new Map();for(const item of archiveTemplates.values()){if(!grouped.has(item.category))grouped.set(item.category,[]);grouped.get(item.category).push(item)}
  const root=$('#archiveMechanics');root.replaceChildren(...[...grouped].map(([category,items])=>{const details=document.createElement('details');details.innerHTML=`<summary>${escapeHtml(category)} · ${items.length}</summary><div class="mechanic-picker">${items.map(item=>`<button type="button" data-mechanic="${item.id}"><i>${escapeHtml(item.icon||'•')}</i><span>${escapeHtml(item.name)}</span></button>`).join('')}</div>`;return details;}));
  root.querySelectorAll('[data-mechanic]').forEach(button=>button.onclick=()=>selectMechanic(button.dataset.mechanic));
}

$('#generateBtn').onclick=generateProject;$('#refineBtn').onclick=refineProject;$('#previewBtn').onclick=openPreview;$('#closePreview').onclick=closePreview;$('#previewDialog').addEventListener('close',()=>$('#previewHost').replaceChildren());$('#exportBtn').onclick=exportProject;$('#undoVersion').onclick=restorePrevious;
$('#assetFile').onchange=event=>{const file=event.target.files[0];if(!file)return;if(file.size>30*1024*1024)return showStatus('Файл больше 30 МБ.',true);const reader=new FileReader();reader.onload=()=>{uploadedImage=reader.result;$('#assetPreview').src=uploadedImage;$('#assetDrop').classList.add('has-image');logClient('upload.selected',{name:file.name,size:file.size,type:file.type});};reader.onerror=()=>showStatus('Не удалось прочитать файл.',true);reader.readAsDataURL(file);};
$('#applyAssetBtn').onclick=applyUploadedAsset;$('#downloadLogBtn').onclick=downloadDebugLog;
$('#uploadFontBtn').onclick=uploadCustomFont;
$('#backgroundBlur').oninput=event=>$('#backgroundBlurValue').textContent=`${event.target.value} px`;
$('#backgroundBlur').onchange=event=>setBlur('backgroundBlur',event.target.value,'Размытие фона');
$('#mediaBlur').oninput=event=>$('#mediaBlurValue').textContent=`${event.target.value} px`;
$('#mediaBlur').onchange=event=>setBlur('mediaBlur',event.target.value,'Размытие картинки');
$('#clearBlurBtn').onclick=clearAllBlur;
$('#newProject').onclick=()=>{if(!confirm('Создать новый проект? Текущий останется в версиях.'))return;saveVersion('Предыдущий проект');project=emptyProject();$('#pagePrompt').value='';$('#refinePrompt').value='';selectMechanic('wheel');renderDesign();};
$('#offerUrl').onchange=event=>{project.offerUrl=event.target.value;if(isArchiveProject()){project.config.links=project.config.links||{};project.config.links.primary=event.target.value;for(const item of Array.isArray(project.config.items)?project.config.items:[])if('url' in item)item.url=event.target.value;}persist();};document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>setDevice(button.dataset.size,button));
document.querySelectorAll('[data-mechanic]').forEach(button=>button.onclick=()=>selectMechanic(button.dataset.mechanic));
document.querySelectorAll('[data-quick]').forEach(button=>button.onclick=()=>{const prompts={gift_boxes:'Создай мобильный преленд с тремя подарочными коробками. Механика строго gift_boxes: пользователь выбирает коробку, видит приз и CTA. Праздничный премиальный дизайн.',wheel:'Создай мобильный casino-преленд с большим колесом удачи, бонусным заголовком и CTA.',progressive_reveal:'Создай мобильный 18+ преленд с progressive reveal из трёх шагов. Только вымышленный однозначно взрослый персонаж.',quiz:'Создай мобильный преленд с коротким quiz из трёх вопросов и финальным CTA.',scratch:'Создай мобильный casino-преленд с механикой scratch: пользователь стирает покрытие, видит бонус и CTA.',age_gate:'Создай мобильный преленд с age gate 18+, затем основным сообщением и CTA.'};selectMechanic(button.dataset.quick);$('#pagePrompt').value=prompts[button.dataset.quick];generateProject();});
window.addEventListener('resize',fitDevice);

async function boot(){try{await loadMechanicCatalog();selectMechanic(project.templateId||project.blocks?.find(block=>block.type==='mechanism')?.mechanism?.kind||'wheel');await renderDesign();if(!isArchiveProject())await resumePipeline();}catch(error){showStatus(`Не удалось загрузить каталог механик: ${error.message}`,true)}}
boot();
