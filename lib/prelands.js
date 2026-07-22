const TEMPLATES = [
  { id: 'casino-wheel', name: 'Колесо удачи', vertical: 'Казино', description: 'Spin → результат → CTA' },
  { id: 'sweepstakes-boxes', name: 'Выбор подарка', vertical: 'Sweepstakes', description: 'Выбор коробки → подарок → CTA' },
  { id: 'dating-cards', name: 'Карточки знакомств', vertical: 'Dating', description: 'Просмотр анкеты → CTA' },
  { id: 'adult-reveal', name: 'Reveal 18+', vertical: 'Adult', description: 'Открытие изображения → CTA' },
];

const DEFAULTS = {
  'casino-wheel': { headline: 'Испытайте удачу', subtitle: 'Крутите колесо и получите бонус', cta: 'Забрать бонус' },
  'sweepstakes-boxes': { headline: 'Выберите свой подарок', subtitle: 'Одна из коробок приготовлена для вас', cta: 'Получить подарок' },
  'dating-cards': { headline: 'Знакомства рядом', subtitle: 'Посмотрите, кто хочет общаться прямо сейчас', cta: 'Смотреть анкеты' },
  'adult-reveal': { headline: 'Закрытый контент 18+', subtitle: 'Нажмите, чтобы открыть', cta: 'Продолжить 18+' },
};

const ALLOWED_PATCHES = new Set([
  'text.headline', 'text.subtitle', 'text.cta', 'theme.background', 'theme.surface',
  'theme.primary', 'theme.accent', 'theme.text', 'theme.font', 'settings.language',
  'settings.geo', 'assets.background_image', 'assets.hero_character', 'assets.logo',
]);

function defaultConfig(templateId = 'casino-wheel') {
  const text = DEFAULTS[templateId] || DEFAULTS['casino-wheel'];
  return {
    templateId,
    text: { ...text },
    theme: { background: '#090d18', surface: '#151c2d', primary: '#f5c84c', accent: '#69f0ae', text: '#ffffff', font: 'Inter, Arial, sans-serif' },
    assets: { background_image: '', hero_character: '', logo: '' },
    settings: { language: 'ru', geo: 'GLOBAL', redirectUrl: 'https://example.com/offer' },
  };
}

function sanitizeConfig(value) {
  const base = defaultConfig(value?.templateId);
  const templateId = TEMPLATES.some((item) => item.id === value?.templateId) ? value.templateId : base.templateId;
  const cleanText = (input, fallback, max = 160) => String(input || fallback).replace(/[<>]/g, '').slice(0, max);
  const color = (input, fallback) => /^#[0-9a-f]{6}$/i.test(input || '') ? input : fallback;
  const safeAsset = (input) => {
    const url = String(input || '');
    return /^(?:https:\/\/|\/api\/image\?url=|data:image\/|assets\/[a-z0-9_.-]+$)/i.test(url) ? url.slice(0, 15_000_000) : '';
  };
  return {
    templateId,
    text: {
      headline: cleanText(value?.text?.headline, DEFAULTS[templateId].headline),
      subtitle: cleanText(value?.text?.subtitle, DEFAULTS[templateId].subtitle, 240),
      cta: cleanText(value?.text?.cta, DEFAULTS[templateId].cta, 60),
    },
    theme: {
      background: color(value?.theme?.background, base.theme.background), surface: color(value?.theme?.surface, base.theme.surface),
      primary: color(value?.theme?.primary, base.theme.primary), accent: color(value?.theme?.accent, base.theme.accent),
      text: color(value?.theme?.text, base.theme.text), font: cleanText(value?.theme?.font, base.theme.font, 100),
    },
    assets: {
      background_image: safeAsset(value?.assets?.background_image), hero_character: safeAsset(value?.assets?.hero_character), logo: safeAsset(value?.assets?.logo),
    },
    settings: {
      language: cleanText(value?.settings?.language, 'ru', 12), geo: cleanText(value?.settings?.geo, 'GLOBAL', 30),
      redirectUrl: /^https?:\/\//i.test(value?.settings?.redirectUrl || '') ? String(value.settings.redirectUrl).slice(0, 2000) : base.settings.redirectUrl,
    },
  };
}

function mechanismMarkup(id) {
  if (id === 'casino-wheel') return '<div class="wheel-wrap" data-editable-block="mechanic"><div class="pointer">▼</div><div id="wheel" class="wheel"><b>100%</b><b>25%</b><b>500%</b><b>50%</b></div><button id="action" class="action">SPIN</button></div>';
  if (id === 'sweepstakes-boxes') return '<div class="boxes" data-editable-block="mechanic"><button class="box">🎁</button><button class="box">🎁</button><button class="box">🎁</button></div>';
  if (id === 'dating-cards') return '<div class="profile" data-editable-block="mechanic"><div class="avatar" data-asset-slot="hero_character">♥</div><b>Анна, 29</b><span>2 км от вас</span><button id="action" class="action">♥</button></div>';
  return '<div class="reveal" data-editable-block="mechanic"><div id="revealCover">18+<small>Нажмите, чтобы открыть</small></div><div class="reveal-image" data-asset-slot="hero_character">✦</div></div>';
}

function layoutHtml(config) {
  return `<!doctype html><html lang="${config.settings.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="theme.css"></head><body><main class="page"><img class="logo" data-asset-slot="logo" alt=""><section class="content"><p class="geo">${config.settings.geo}</p><h1 data-editable-text="headline">${config.text.headline}</h1><p data-editable-text="subtitle">${config.text.subtitle}</p>${mechanismMarkup(config.templateId)}<button id="cta" data-editable-button="primary_cta">${config.text.cta}</button></section></main><script src="tracking.js"></script><script src="core_logic.js"></script></body></html>`;
}

function themeCss(config) {
  const bg = config.assets.background_image ? `linear-gradient(#05081399,#050813dd),url('${config.assets.background_image}') center/cover` : config.theme.background;
  const hero = config.assets.hero_character ? `url('${config.assets.hero_character}') center/cover` : 'linear-gradient(135deg,var(--primary),var(--accent))';
  return `:root{--bg:${config.theme.background};--surface:${config.theme.surface};--primary:${config.theme.primary};--accent:${config.theme.accent};--text:${config.theme.text}}*{box-sizing:border-box}body{margin:0;background:${bg};color:var(--text);font-family:${config.theme.font};min-height:100vh}.page{min-height:100vh;display:grid;place-items:center;padding:24px;position:relative;overflow:hidden}.content{width:min(440px,100%);text-align:center;background:color-mix(in srgb,var(--surface) 88%,transparent);padding:28px;border:1px solid #ffffff22;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(14px)}h1{font-size:clamp(34px,8vw,58px);line-height:.95;margin:8px 0 14px}p{color:#ffffffb8;line-height:1.5}.geo{font-size:10px;letter-spacing:2px;font-weight:800}.logo{position:absolute;left:24px;top:22px;max-width:100px;max-height:42px}.logo:not([src]){display:none}button{font:inherit}.action,#cta{border:0;cursor:pointer;font-weight:900}.action{background:var(--primary);color:#111;padding:13px 24px;border-radius:999px;margin-top:16px}#cta{display:none;width:100%;background:var(--accent);color:#07120d;border-radius:13px;padding:17px;margin-top:20px}.wheel-wrap{display:grid;place-items:center}.wheel{width:220px;aspect-ratio:1;border-radius:50%;border:10px solid var(--primary);display:grid;grid-template-columns:1fr 1fr;overflow:hidden;transition:transform 2.2s cubic-bezier(.15,.8,.2,1);background:conic-gradient(var(--primary) 0 25%,#d94d67 0 50%,#4169e1 0 75%,var(--accent) 0)}.wheel b{display:grid;place-items:center;text-shadow:0 1px 4px #000}.pointer{color:var(--primary);font-size:25px;margin-bottom:-8px;z-index:1}.boxes{display:flex;gap:12px;justify-content:center;margin:25px 0}.box{font-size:55px;background:var(--surface);border:1px solid #ffffff22;border-radius:16px;padding:14px;cursor:pointer}.profile{display:grid;place-items:center;gap:6px}.avatar,.reveal-image{background:${hero}}.avatar{width:190px;aspect-ratio:1;border-radius:24px;display:grid;place-items:center;font-size:55px}.reveal{height:270px;position:relative;border-radius:22px;overflow:hidden}.reveal-image{position:absolute;inset:0;display:grid;place-items:center;font-size:60px}#revealCover{position:absolute;inset:0;z-index:1;background:#111d;display:grid;place-items:center;font-size:52px;font-weight:900;cursor:pointer;backdrop-filter:blur(18px)}#revealCover small{display:block;font-size:12px}@media(max-width:520px){.content{padding:20px}.wheel{width:190px}}`;
}

function coreLogicJs(config) {
  const common = `const cta=document.getElementById('cta');const show=()=>{cta.style.display='block';window.TwinBidTracking.track('mechanic_complete')};cta.addEventListener('click',()=>{window.TwinBidTracking.track('cta_click');location.href=${JSON.stringify(config.settings.redirectUrl)}});`;
  if (config.templateId === 'casino-wheel') return `${common}let used=false;document.getElementById('action').onclick=()=>{if(used)return;used=true;window.TwinBidTracking.track('spin');document.getElementById('wheel').style.transform='rotate(1640deg)';setTimeout(show,2200)};`;
  if (config.templateId === 'sweepstakes-boxes') return `${common}document.querySelectorAll('.box').forEach((b,i)=>b.onclick=()=>{window.TwinBidTracking.track('box_select',{index:i});b.textContent='🏆';document.querySelectorAll('.box').forEach(x=>x.disabled=true);setTimeout(show,500)});`;
  if (config.templateId === 'dating-cards') return `${common}document.getElementById('action').onclick=()=>{window.TwinBidTracking.track('profile_like');show()};`;
  return `${common}document.getElementById('revealCover').onclick=e=>{window.TwinBidTracking.track('reveal');e.currentTarget.style.display='none';setTimeout(show,350)};`;
}

function trackingJs() {
  return `window.TwinBidTracking={events:[],track(name,data={}){const event={name,data,click_id:new URLSearchParams(location.search).get('click_id')||'',at:Date.now()};this.events.push(event);window.parent?.postMessage({type:'tracking-event',event},'*')}};window.TwinBidTracking.track('page_view');`;
}

function editorBridge() {
  return `<script>document.addEventListener('click',e=>{const el=e.target.closest('[data-editable-text],[data-editable-button],[data-asset-slot],[data-editable-block]');if(!el)return;e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'preland-select',kind:el.dataset.editableText?'text':el.dataset.editableButton?'button':el.dataset.assetSlot?'asset':'block',key:el.dataset.editableText||el.dataset.editableButton||el.dataset.assetSlot||el.dataset.editableBlock},'*')},true);<\/script>`;
}

function render(configValue, preview = false) {
  const config = sanitizeConfig(configValue);
  const files = { 'layout.html': layoutHtml(config), 'theme.css': themeCss(config), 'core_logic.js': coreLogicJs(config), 'tracking.js': trackingJs(), 'config.json': JSON.stringify(config, null, 2) };
  let html = files['layout.html'].replace('<link rel="stylesheet" href="theme.css">', `<style>${files['theme.css']}</style>`).replace('<script src="tracking.js"></script>', `<script>${files['tracking.js']}<\/script>`).replace('<script src="core_logic.js"></script>', `<script>${files['core_logic.js']}<\/script>`);
  if (preview) html = html.replace('</body>', `${editorBridge()}</body>`);
  return { config, files, preview: html, validation: validateFiles(files) };
}

function validateFiles(files) {
  const checks = {
    layout: files['layout.html'].includes('data-editable-text="headline"'),
    coreLogic: /mechanic_complete/.test(files['core_logic.js']),
    tracking: /page_view/.test(files['tracking.js']) && /cta_click/.test(files['core_logic.js']),
    redirect: /location\.href/.test(files['core_logic.js']),
    mobile: /viewport/.test(files['layout.html']) && /@media/.test(files['theme.css']),
    externalScripts: !/<script[^>]+src=["']https?:/i.test(files['layout.html']),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

function validatePlan(plan) {
  const changes = Array.isArray(plan?.changes) ? plan.changes.filter((item) => ALLOWED_PATCHES.has(item?.path) && ['string', 'number', 'boolean'].includes(typeof item.value)).slice(0, 30) : [];
  const assetPrompts = Array.isArray(plan?.assetPrompts) ? plan.assetPrompts.filter((item) => ['background_image', 'hero_character', 'logo'].includes(item?.slot) && typeof item.prompt === 'string').slice(0, 3) : [];
  return { summary: String(plan?.summary || 'План изменений').slice(0, 300), changes, assetPrompts };
}

module.exports = { TEMPLATES, ALLOWED_PATCHES, defaultConfig, sanitizeConfig, render, validatePlan };
