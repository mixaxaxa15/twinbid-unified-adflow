const fs = require('node:fs');
const path = require('node:path');
const { sanitizeCustomFonts, sanitizeFontName, fontStack, fontFaceCss, fontAssets } = require('./fonts');

const clone = (value) => JSON.parse(JSON.stringify(value));

const VISUAL_SELECTORS = Object.freeze({
  body:'body',page:'#app',screen:'.screen',container:'.container',card:'.card',centralPanel:'.card',center:'.center',
  title:'.title',subtitle:'.subtitle',smallText:'.small',badge:'.badge',allButtons:'.btn',primaryButton:'.btn-primary',secondaryButton:'.btn-secondary',
  row:'.row',column:'.col',grid:'.grid-2,.grid-3',gridTwo:'.grid-2',gridThree:'.grid-3',
  images:'.preview-img,.lock-image,.chat-avatar img,.chat-mini-avatar img,.choice-card img,.profile-card img,.top-card img,.product-row img,.before-after img',previewBox:'.preview-box',previewImage:'.preview-img',imageOverlay:'.overlay-center',playButton:'.play-btn',lockIcon:'.lock-icon',lockImage:'.lock-image',
  choiceCard:'.choice-card',profileCard:'.profile-card',topCard:'.top-card',choiceTitle:'.choice-card-title',choiceSubtitle:'.choice-card-sub',profileName:'.profile-name',profileMeta:'.profile-meta',topName:'.top-name',topMeta:'.top-meta',
  progress:'.progress',progressBar:'.progress-bar',progressText:'#progress-text',notice:'.notice',input:'.input',countdown:'.countdown',rating:'.rating',keyValue:'.kv',
  modal:'.modal',modalCard:'.modal-card',modalTitle:'.modal-card .title',modalText:'.modal-card .subtitle',modalButton:'.modal-card .btn-primary',
  mechanic:'.wheel-wrap,.scratch-area,.slot,.carousel,.before-after,.product-row',wheelWrap:'.wheel-wrap',wheel:'.wheel',wheelCenter:'.wheel::after',wheelPointer:'.pointer',wheelSkin:'.archive-wheel-skin',
  scratch:'.scratch-area',scratchReveal:'.scratch-reveal',scratchRevealText:'.scratch-reveal-text',scratchCover:'.scratch-cover',scratchCoverLabel:'.scratch-cover-label',scratchImage:'.scratch-visual',scratchTexture:'.scratch-cover-texture',
  slot:'.slot',slotCell:'.slot-cell',slotFrame:'.slot-frame',slotWindow:'.slot-reel-window',slotSymbol:'.slot-symbol',slotSymbolText:'.slot-symbol span',slotSymbolImage:'.slot-symbol-image',slotSpinButton:'#slot-spin',carousel:'.carousel',carouselCard:'.carousel-card',carouselImage:'.carousel-card img',carouselInfo:'.carousel-info',
  tiles:'.tiles',tile:'.tile',productRow:'.product-row',productImage:'.product-row img',beforeAfter:'.before-after',beforeAfterItem:'.before-after .item',beforeAfterImage:'.before-after img',pickImage:'.pick-visual',
  chatContainer:'.chat-container',chatCard:'.chat-card',chatApp:'.chat-app',chatHeader:'.chat-header',chatAvatar:'.chat-avatar',chatAvatarImage:'.chat-avatar img,.chat-mini-avatar img',chatName:'.chat-name',chatStatus:'.chat-status',chatThread:'.chat-thread',chatBubble:'.chat-bubble',chatIncoming:'.chat-incoming',chatOutgoing:'.chat-outgoing',chatTime:'.chat-time',chatTyping:'.chat-typing',chatComposer:'.chat-composer',chatSend:'.chat-send',
  item1:'.choice-card:nth-child(1),.profile-card:nth-child(1),.top-card:nth-child(1)',item2:'.choice-card:nth-child(2),.profile-card:nth-child(2),.top-card:nth-child(2)',item3:'.choice-card:nth-child(3),.profile-card:nth-child(3),.top-card:nth-child(3)',item4:'.choice-card:nth-child(4),.profile-card:nth-child(4),.top-card:nth-child(4)',item5:'.choice-card:nth-child(5),.profile-card:nth-child(5),.top-card:nth-child(5)',item6:'.choice-card:nth-child(6),.profile-card:nth-child(6),.top-card:nth-child(6)',item7:'.choice-card:nth-child(7),.profile-card:nth-child(7),.top-card:nth-child(7)',item8:'.choice-card:nth-child(8),.profile-card:nth-child(8),.top-card:nth-child(8)',
  option1:'.col > .btn:nth-child(1)',option2:'.col > .btn:nth-child(2)',option3:'.col > .btn:nth-child(3)',option4:'.col > .btn:nth-child(4)',option5:'.col > .btn:nth-child(5)',option6:'.col > .btn:nth-child(6)',
  slotCell1:'#s1',slotCell2:'#s2',slotCell3:'#s3',beforeItem:'.before-after .item:nth-child(1)',afterItem:'.before-after .item:nth-child(2)',
  overlay:'body::after',backgroundLayer:'body::before',
});
const PIXEL_FIELDS = new Set(['borderWidth','borderRadius','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','rowGap','columnGap','fontSize','letterSpacing','outlineWidth']);
const NUMBER_FIELDS = new Set(['fontWeight','lineHeight','opacity','flexGrow','flexShrink','order','zIndex']);
const ENUM_FIELDS = Object.freeze({
  textAlign:new Set(['left','center','right']),objectFit:new Set(['cover','contain','fill','none']),
  flexDirection:new Set(['row','column','row-reverse','column-reverse']),alignItems:new Set(['start','center','end','stretch','flex-start','flex-end']),
  justifyContent:new Set(['start','center','end','space-between','space-around','space-evenly','flex-start','flex-end']),
  alignSelf:new Set(['auto','start','center','end','stretch','flex-start','flex-end']),justifySelf:new Set(['auto','start','center','end','stretch']),
  backgroundSize:new Set(['cover','contain','auto']),backgroundRepeat:new Set(['repeat','no-repeat','repeat-x','repeat-y']),textTransform:new Set(['none','uppercase','lowercase','capitalize']),
  position:new Set(['static','relative','absolute','fixed','sticky']),display:new Set(['block','inline','inline-block','flex','inline-flex','grid','inline-grid']),
  overflow:new Set(['visible','hidden','clip','auto','scroll']),overflowX:new Set(['visible','hidden','clip','auto','scroll']),overflowY:new Set(['visible','hidden','clip','auto','scroll']),
  whiteSpace:new Set(['normal','nowrap','pre-line','pre-wrap']),borderStyle:new Set(['none','solid','dashed','dotted','double']),boxSizing:new Set(['border-box','content-box']),
});
const CSS_FIELDS = new Set(['background','color','borderColor','boxShadow','textShadow','width','height','minWidth','maxWidth','minHeight','maxHeight','margin','marginTop','marginRight','marginBottom','marginLeft','top','right','bottom','left','inset','objectPosition','backgroundPosition','filter','backdropFilter','transform','transformOrigin','flexBasis','gridTemplateColumns','gridTemplateRows','gridColumn','gridRow','aspectRatio','border','outline','clipPath','transition']);
const CSS_NAMES = Object.freeze({borderColor:'border-color',borderWidth:'border-width',borderRadius:'border-radius',borderStyle:'border-style',fontFamily:'font-family',fontSize:'font-size',fontWeight:'font-weight',lineHeight:'line-height',letterSpacing:'letter-spacing',boxShadow:'box-shadow',textShadow:'text-shadow',textAlign:'text-align',objectFit:'object-fit',objectPosition:'object-position',flexDirection:'flex-direction',flexGrow:'flex-grow',flexShrink:'flex-shrink',flexBasis:'flex-basis',alignItems:'align-items',justifyContent:'justify-content',alignSelf:'align-self',justifySelf:'justify-self',maxWidth:'max-width',minWidth:'min-width',minHeight:'min-height',maxHeight:'max-height',backgroundSize:'background-size',backgroundPosition:'background-position',backgroundRepeat:'background-repeat',textTransform:'text-transform',whiteSpace:'white-space',overflowX:'overflow-x',overflowY:'overflow-y',backdropFilter:'backdrop-filter',transformOrigin:'transform-origin',gridTemplateColumns:'grid-template-columns',gridTemplateRows:'grid-template-rows',gridColumn:'grid-column',gridRow:'grid-row',aspectRatio:'aspect-ratio',zIndex:'z-index',rowGap:'row-gap',columnGap:'column-gap',paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left',outlineWidth:'outline-width',boxSizing:'box-sizing',clipPath:'clip-path'});
const MECHANIC_ASSETS = Object.freeze({wheel:['wheelSkin'],scratch:['revealImage','coverTexture'],slot:['slotFrame'],premium_unlock:['lockImage']});
const THEME_FIELDS = new Set(['accent','accent2','background','surface','text','muted','border','shadow']);
const CRITICAL_TARGETS = new Set(['allButtons','primaryButton','secondaryButton','modalButton','mechanic','wheel','scratch','scratchCover','slot']);
const TEXT_FIELDS = new Set(['badge','title','subtitle','primaryCta','secondaryCta','finalCta','resultTitle','resultText','loadingPrefix','loadingText','revealText','coverText','lockIcon','amountPlaceholder','monthsPlaceholder','kvAmount','kvMonths','kvPayment']);
const DESIGN_FIELDS = new Set(['contentWidth','cardPadding','blockGap','borderRadius','textAlign','verticalAlign','backgroundBlur','backgroundScale','cardBackdropBlur','mediaBlur']);
const SLOT_SETTING_FIELDS = new Set(['symbolMode','animationStyle','initialSymbol','spinDuration','reel1ExtraDuration','reel2ExtraDuration','reel3ExtraDuration','reel1TickInterval','reel2TickInterval','reel3TickInterval','reel1ResultIndex','reel2ResultIndex','reel3ResultIndex','reel1Direction','reel2Direction','reel3Direction','resultDelay']);
const SLOT_NUMERIC_RANGES = Object.freeze({spinDuration:[300,10000],reel1ExtraDuration:[0,5000],reel2ExtraDuration:[0,5000],reel3ExtraDuration:[0,5000],reel1TickInterval:[30,1000],reel2TickInterval:[30,1000],reel3TickInterval:[30,1000],reel1ResultIndex:[0,9],reel2ResultIndex:[0,9],reel3ResultIndex:[0,9],resultDelay:[0,5000]});

function loadTemplates(root) {
  const source = fs.readFileSync(path.join(root, 'shared', 'templates.js'), 'utf8');
  const start = source.indexOf('{');
  const end = source.lastIndexOf('};');
  if (start < 0 || end < 0) throw new Error('Не удалось прочитать библиотеку прелендов.');
  return JSON.parse(source.slice(start, end + 1));
}

function sanitizeText(value, fallback = '', max = 500) {
  return String(value ?? fallback).replace(/[<>]/g, '').slice(0, max);
}

function sanitizeUrl(value, fallback = '') {
  const input = String(value || '');
  return /^(?:https?:\/\/|\.\/assets\/|\/(?:api\/image\?url=|generated\/|uploads\/)|data:image\/|assets\/)/i.test(input) ? input.slice(0, 15_000_000) : fallback;
}

function safeCss(value) {
  const text = String(value ?? '').trim().slice(0, 300);
  return text && !/[{};<>]/.test(text) && !/(?:url|expression|javascript)\s*\(/i.test(text) ? text : '';
}

function sanitizeVisualRules(input, customFonts = []) {
  const output = {};
  for (const [target, selector] of Object.entries(VISUAL_SELECTORS)) {
    const source = input?.[target]; if (!source || typeof source !== 'object') continue;
    const rule = {};
    for (const [field, value] of Object.entries(source)) {
      if (field === 'background' && ['page','screen','backgroundLayer'].includes(target)) continue;
      if (field === 'fontFamily') { rule[field] = sanitizeFontName(value, customFonts); continue; }
      if (PIXEL_FIELDS.has(field)) rule[field] = Math.max(0, Math.min(field === 'fontSize' ? 180 : 600, Number(value) || 0));
      else if (field === 'fontWeight') rule[field] = Math.max(100, Math.min(900, Number(value) || 400));
      else if (field === 'lineHeight') rule[field] = Math.max(.5, Math.min(4, Number(value) || 1.2));
      else if (field === 'opacity') rule[field] = Math.max(CRITICAL_TARGETS.has(target) ? .15 : 0, Math.min(1, Number(value)));
      else if (field === 'flexGrow' || field === 'flexShrink') rule[field] = Math.max(0, Math.min(20, Number(value) || 0));
      else if (field === 'order') rule[field] = Math.max(-20, Math.min(20, Math.round(Number(value) || 0)));
      else if (field === 'zIndex') rule[field] = Math.max(-10, Math.min(1000, Math.round(Number(value) || 0)));
      else if (ENUM_FIELDS[field]?.has(String(value))) rule[field] = String(value);
      else if (CSS_FIELDS.has(field)) { const clean = safeCss(value); if (clean) rule[field] = clean; }
    }
    if (Object.keys(rule).length) output[target] = rule;
  }
  return output;
}

function sanitizeArchiveConfig(id, input, root) {
  const base = loadTemplates(root)[id];
  if (!base) throw new Error('Архивный шаблон не найден.');
  const output = clone(base);
  output.texts = { ...base.texts };
  for (const [key, value] of Object.entries(input?.texts || {})) if (TEXT_FIELDS.has(key)) output.texts[key] = sanitizeText(value, base.texts?.[key]);
  output.theme = { ...base.theme };
  for (const key of THEME_FIELDS) {
    const clean=safeCss(input?.theme?.[key]);
    if (clean) output.theme[key]=clean;
  }
  output.assets = { ...base.assets };
  for (const key of MECHANIC_ASSETS[base.type] || []) if (!(key in output.assets)) output.assets[key] = '';
  for (const [key, value] of Object.entries(input?.assets || {})) output.assets[key] = sanitizeUrl(value, base.assets?.[key]);
  output.links = { ...base.links };
  for (const [key, value] of Object.entries(input?.links || {})) if (/^https?:\/\//i.test(value || '')) output.links[key] = String(value).slice(0, 2000);
  if (Array.isArray(base.items)) output.items = base.items.map((baseItem, index) => {
    const item = input?.items?.[index] || {};
    const clean = { ...baseItem };
    for (const key of Object.keys(baseItem)) if (!['image','url'].includes(key) && ['string','number'].includes(typeof baseItem[key]) && key in item) clean[key] = sanitizeText(item[key], baseItem[key], 300);
    if ('image' in item || base.type === 'pick_box') clean.image = sanitizeUrl(item.image, baseItem.image || '');
    if ('url' in item && /^https?:\/\//i.test(item.url || '')) clean.url = String(item.url).slice(0, 2000);
    return clean;
  });
  if(['casino_lucky_card','sweep_mystery_box'].includes(id)&&Array.isArray(output.items)){
    const sharedImage=output.items.find(item=>item.image)?.image||'';
    if(sharedImage)for(const item of output.items)item.image=sharedImage;
  }
  if (Array.isArray(base.questions)) output.questions = base.questions.map((baseQuestion, qIndex) => ({
    ...baseQuestion,
    title: sanitizeText(input?.questions?.[qIndex]?.title, baseQuestion.title),
    options: baseQuestion.options.map((baseOption, oIndex) => ({ ...baseOption, label: sanitizeText(input?.questions?.[qIndex]?.options?.[oIndex]?.label, baseOption.label, 120) })),
  }));
  if(base.type==='slot'){
    output.slotSettings={...base.slotSettings};
    for(const key of SLOT_SETTING_FIELDS){
      const value=input?.slotSettings?.[key];if(value===undefined)continue;
      if(SLOT_NUMERIC_RANGES[key]){const [min,max]=SLOT_NUMERIC_RANGES[key];output.slotSettings[key]=Math.max(min,Math.min(max,Math.round(Number(value)||0)));}
      else if(key==='symbolMode'&&['text','image'].includes(value))output.slotSettings[key]=value;
      else if(key==='animationStyle'&&['slide','blur','flip'].includes(value))output.slotSettings[key]=value;
      else if(/Direction$/.test(key)&&['up','down'].includes(value))output.slotSettings[key]=value;
      else if(key==='initialSymbol')output.slotSettings[key]=sanitizeText(value,'?',12);
    }
  }
  output.design = {
    contentWidth: Math.max(280, Math.min(900, Number(input?.design?.contentWidth) || 520)),
    cardPadding: Math.max(12, Math.min(72, Number(input?.design?.cardPadding) || 24)),
    blockGap: Math.max(4, Math.min(48, Number(input?.design?.blockGap) || 14)),
    borderRadius: Math.max(0, Math.min(48, Number(input?.design?.borderRadius) || 22)),
    textAlign: ['left', 'center', 'right'].includes(input?.design?.textAlign) ? input.design.textAlign : 'center',
    verticalAlign: ['start', 'center', 'end'].includes(input?.design?.verticalAlign) ? input.design.verticalAlign : 'center',
    backgroundBlur: Math.max(0, Math.min(40, Number.isFinite(Number(input?.design?.backgroundBlur)) ? Number(input.design.backgroundBlur) : (base.behavior?.blurBackground ? 10 : 0))),
    backgroundScale: Math.max(1, Math.min(1.3, Number(input?.design?.backgroundScale) || (base.behavior?.blurBackground ? 1.06 : 1))),
    cardBackdropBlur: Math.max(0, Math.min(40, Number.isFinite(Number(input?.design?.cardBackdropBlur)) ? Number(input.design.cardBackdropBlur) : 12)),
    mediaBlur: Math.max(0, Math.min(50, Number.isFinite(Number(input?.design?.mediaBlur)) ? Number(input.design.mediaBlur) : 14)),
  };
  output.customFonts = sanitizeCustomFonts(input?.customFonts);
  output.visual = { rules:sanitizeVisualRules(input?.visual?.rules, output.customFonts) };
  return output;
}

function designCss(config) {
  const vertical = { start: 'flex-start', center: 'center', end: 'flex-end' }[config.design.verticalAlign];
  const theme=config.theme||{};
  const tokens=[theme.accent&&`--accent:${theme.accent}`,theme.accent2&&`--accent-2:${theme.accent2}`,theme.text&&`--text:${theme.text}`,theme.muted&&`--muted:${theme.muted}`,theme.surface&&`--card:${theme.surface}`,theme.border&&`--border:${theme.border}`,theme.shadow&&`--shadow:${theme.shadow}`].filter(Boolean).join(';');
  const rules = [`\n/* TwinBid visual layout overrides */`,tokens&&`:root{${tokens}}`,theme.background&&`body{background:${theme.background}!important}`,`.container:not(.chat-container){width:min(100%,${config.design.contentWidth}px)!important;max-width:${config.design.contentWidth}px!important}.container{align-items:${vertical}!important}`,`.card{border-radius:${config.design.borderRadius}px!important;backdrop-filter:blur(${config.design.cardBackdropBlur}px)!important}.card:not(.chat-card){padding:${config.design.cardPadding}px!important;text-align:${config.design.textAlign}!important}`,`.col{gap:${config.design.blockGap}px!important}`,`.center{text-align:${config.design.textAlign}!important}`,`body.blur-bg::before,body::before{filter:blur(${config.design.backgroundBlur}px) saturate(1.12)!important;transform:scale(${config.design.backgroundScale})!important}`,`.blurred{filter:blur(${config.design.mediaBlur}px)!important;transform:${config.design.mediaBlur ? 'scale(1.08)' : 'none'}!important}`].filter(Boolean);
  for (const [target, fields] of Object.entries(config.visual?.rules || {})) {
    const selector = VISUAL_SELECTORS[target]; if (!selector) continue;
    const declarations = Object.entries(fields).map(([field,value])=>`${CSS_NAMES[field] || field.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}:${field === 'fontFamily' ? fontStack(value, config.customFonts) : PIXEL_FIELDS.has(field)?`${value}px`:value}!important`).join(';');
    if (declarations) rules.push(`${selector}{${declarations}}`);
  }
  return rules.join('\n');
}

function resolvePreviewAssets(value, id) {
  if (Array.isArray(value)) return value.map((item) => resolvePreviewAssets(item, id));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolvePreviewAssets(item, id)]));
  if (typeof value === 'string' && value.startsWith('./assets/')) return `/prelander-library/${id}/assets/${value.slice(9)}`;
  return value;
}

function protectedEngine(root) {
  return fs.readFileSync(path.join(root, 'shared', 'engine.js'), 'utf8').replace(
    'function go(url) { if (url) window.location.href = url; }',
    "function go(url) { if (url) { window.TwinBidTracking?.track('cta_click',{url}); window.location.href = url; } }",
  );
}

function trackingJs() {
  return `window.TwinBidTracking={events:[],track(name,data={}){const event={name,data,click_id:new URLSearchParams(location.search).get('click_id')||'',at:Date.now()};this.events.push(event);window.parent?.postMessage({type:'tracking-event',event},'*')}};window.TwinBidTracking.track('page_view');`;
}

function renderArchive(id, input, root, preview = false) {
  const config = sanitizeArchiveConfig(id, input, root);
  const previewConfig = resolvePreviewAssets(config, id);
  const baseCss = fs.readFileSync(path.join(root, 'shared', 'styles.css'), 'utf8') + designCss(config);
  const previewCss = fontFaceCss(config.customFonts, 'preview') + baseCss;
  const exportCss = fontFaceCss(config.customFonts, 'export') + baseCss;
  const engine = protectedEngine(root);
  const tracking = trackingJs();
  const configScript = `window.__renderPrelander(${JSON.stringify(previewConfig)});`;
  const bridge = preview ? `<script>document.addEventListener('click',e=>{const el=e.target.closest('.screen,.container,.card,.title,.subtitle,.small,.badge,.btn,img,.lock-image,.choice-card,.profile-card,.top-card,.progress,.notice,.input,.countdown,.rating,.kv,.wheel-wrap,.wheel,.scratch-area,.slot,.slot-cell,.carousel,.product-row,.before-after,.modal-card,.chat-app,.chat-header,.chat-avatar,.chat-thread,.chat-bubble,.chat-composer');if(!el)return;parent.postMessage({type:'preland-archive-select',tag:el.tagName,className:el.className,text:el.textContent?.trim().slice(0,80)},'*')},true);<\/script>` : '';
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${previewCss}</style></head><body><div id="app"></div><script>${tracking}<\/script><script>${engine}<\/script><script>${configScript}<\/script>${bridge}</body></html>`;
  const files = {
    'layout.html': '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="theme.css"></head><body><div id="app"></div><script src="tracking.js"></script><script src="core_logic.js"></script><script src="config.js"></script></body></html>',
    'theme.css': exportCss, 'core_logic.js': engine, 'tracking.js': tracking,
    'config.js': `window.__renderPrelander(${JSON.stringify(config, null, 2)});`, 'config.json': JSON.stringify(config, null, 2),
  };
  return { config, preview: html, files, fontAssets:fontAssets(config.customFonts), validation: { ok: /cta_click/.test(engine) && /page_view/.test(tracking), checks: { coreLogic: true, tracking: true, redirect: true, mobile: true } } };
}

function validateArchivePlan(plan, config = null) {
  const targets=Object.keys(VISUAL_SELECTORS).join('|');
  const fields=[...PIXEL_FIELDS,...NUMBER_FIELDS,...Object.keys(ENUM_FIELDS),...CSS_FIELDS,'fontFamily'].join('|');
  const allowed = new RegExp(`^(?:texts\\.(?:${[...TEXT_FIELDS].join('|')})|theme\\.(?:${[...THEME_FIELDS].join('|')})|design\\.(?:${[...DESIGN_FIELDS].join('|')})|slotSettings\\.(?:${[...SLOT_SETTING_FIELDS].join('|')})|visual\\.rules\\.(?:${targets})\\.(?:${fields})|items\\.\\d+\\.[a-zA-Z0-9_]+|questions\\.\\d+\\.(?:title|options\\.\\d+\\.label))$`);
  const pathExists=(item)=>{
    if(!config)return true;
    const itemPath=String(item?.path||'').match(/^items\.(\d+)\.([a-zA-Z0-9_]+)$/);if(itemPath){const entry=Array.isArray(config.items)?config.items[Number(itemPath[1])]:null;return Boolean(entry&&Object.prototype.hasOwnProperty.call(entry,itemPath[2])&&!['image','url'].includes(itemPath[2]));}
    const questionPath=String(item?.path||'').match(/^questions\.(\d+)(?:\.options\.(\d+))?/);if(questionPath){const question=Array.isArray(config.questions)?config.questions[Number(questionPath[1])]:null;return Boolean(question&&(!questionPath[2]||question.options?.[Number(questionPath[2])]));}
    if(/^slotSettings\./.test(String(item?.path||'')))return config.type==='slot';
    return true;
  };
  const assetExists=(item)=>{
    if(!config)return true;const value=String(item?.path||'');
    const asset=value.match(/^assets\.([a-zA-Z0-9_]+)$/);if(asset)return Object.prototype.hasOwnProperty.call(config.assets||{},asset[1]);
    const image=value.match(/^items\.(\d+)\.image$/);return image?Array.isArray(config.items)&&Boolean(config.items[Number(image[1])]&&Object.prototype.hasOwnProperty.call(config.items[Number(image[1])],'image')):false;
  };
  const safeValue=(item)=>{
    const path=String(item?.path||'');
    const visual=path.match(/^visual\.rules\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
    if(visual){
      const field=visual[2],value=item.value;
      if(field==='fontFamily')return typeof value==='string'&&Boolean(value.trim());
      if(PIXEL_FIELDS.has(field)||NUMBER_FIELDS.has(field))return Number.isFinite(Number(value));
      if(ENUM_FIELDS[field])return ENUM_FIELDS[field].has(String(value));
      return CSS_FIELDS.has(field)&&Boolean(safeCss(value));
    }
    if(/^theme\./.test(path))return Boolean(safeCss(item.value));
    if(/^design\.(?:textAlign|verticalAlign)$/.test(path))return path.endsWith('textAlign')?['left','center','right'].includes(item.value):['start','center','end'].includes(item.value);
    if(/^design\./.test(path))return Number.isFinite(Number(item.value));
    const slot=path.match(/^slotSettings\.([a-zA-Z0-9_]+)$/);if(slot){const key=slot[1];if(SLOT_NUMERIC_RANGES[key])return Number.isFinite(Number(item.value));if(key==='symbolMode')return['text','image'].includes(item.value);if(key==='animationStyle')return['slide','blur','flip'].includes(item.value);if(/Direction$/.test(key))return['up','down'].includes(item.value);return key==='initialSymbol'&&typeof item.value==='string';}
    return true;
  };
  return {
    summary: sanitizeText(plan?.summary, 'План изменений', 300),
    changes: (Array.isArray(plan?.changes) ? plan.changes : []).filter((item) => allowed.test(item?.path || '') && ['string', 'number', 'boolean'].includes(typeof item.value) && pathExists(item) && safeValue(item)).slice(0, 120),
    assetPrompts: (Array.isArray(plan?.assetPrompts) ? plan.assetPrompts : []).filter((item) => typeof item?.path === 'string' && /^(?:assets\.[a-zA-Z0-9_]+|items\.\d+\.image)$/.test(item.path) && typeof item.prompt === 'string' && assetExists(item)).slice(0, 12),
  };
}

const ARCHIVE_VISUAL_TARGETS=Object.freeze(Object.keys(VISUAL_SELECTORS));
const ARCHIVE_VISUAL_FIELDS=Object.freeze([...new Set([...PIXEL_FIELDS,...NUMBER_FIELDS,...Object.keys(ENUM_FIELDS),...CSS_FIELDS,'fontFamily'])]);
const ARCHIVE_TEXT_FIELDS=Object.freeze([...TEXT_FIELDS]);
const ARCHIVE_THEME_FIELDS=Object.freeze([...THEME_FIELDS]);
const ARCHIVE_DESIGN_FIELDS=Object.freeze([...DESIGN_FIELDS]);
const ARCHIVE_SLOT_SETTING_FIELDS=Object.freeze([...SLOT_SETTING_FIELDS]);
module.exports = { loadTemplates, sanitizeArchiveConfig, renderArchive, validateArchivePlan, ARCHIVE_VISUAL_TARGETS, ARCHIVE_VISUAL_FIELDS, ARCHIVE_TEXT_FIELDS, ARCHIVE_THEME_FIELDS, ARCHIVE_DESIGN_FIELDS, ARCHIVE_SLOT_SETTING_FIELDS };
