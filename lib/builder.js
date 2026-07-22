const { zipFiles } = require('./zip');

function cleanHtml(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<(?:iframe|object|embed)[\s\S]*?<\/(?:iframe|object|embed)>/gi, '').replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '');
}
function cleanCss(value) { return String(value || '').replace(/@import[^;]+;/gi, '').replace(/javascript:/gi, ''); }
function cleanId(value) { return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80); }

function sanitizeProject(input) {
  const scenes = (Array.isArray(input?.scenes) ? input.scenes : []).slice(0, 30).map((scene, index) => ({ id: cleanId(scene.id) || `scene-${index}`, name: String(scene.name || `Scene ${index + 1}`).slice(0, 100), html: cleanHtml(scene.html), css: cleanCss(scene.css) }));
  if (!scenes.length) throw new Error('В проекте нет сцен.');
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const interactions = (Array.isArray(input?.interactions) ? input.interactions : []).slice(0, 300).map((item) => ({
    id: cleanId(item.id), sceneId: cleanId(item.sceneId), sourceId: cleanId(item.sourceId),
    event: ['click','dblclick','timer'].includes(item.event) ? item.event : 'click',
    action: ['show','hide','toggle','nextScene','goScene','redirect'].includes(item.action) ? item.action : 'nextScene',
    targetId: cleanId(item.targetId), targetSceneId: sceneIds.has(item.targetSceneId) ? item.targetSceneId : '', delay: Math.max(0, Math.min(120000, Number(item.delay) || 1000)),
  })).filter((item) => sceneIds.has(item.sceneId));
  return { id: cleanId(input.id) || 'preland', name: String(input.name || 'TwinBid Preland').slice(0, 100), scenes, interactions, settings: { redirectUrl: /^https?:\/\//i.test(input?.settings?.redirectUrl || '') ? String(input.settings.redirectUrl).slice(0, 2000) : 'https://example.com/offer' } };
}

function runtimeJs(project) {
  const data = JSON.stringify({ scenes: project.scenes.map(({ id }) => id), interactions: project.interactions, redirectUrl: project.settings.redirectUrl }).replace(/</g, '\\u003c');
  return `(()=>{const P=${data};const track=(name,data={})=>{const event={name,data,click_id:new URLSearchParams(location.search).get('click_id')||'',at:Date.now()};window.__tbEvents=(window.__tbEvents||[]).concat(event);parent?.postMessage({type:'tb-event',event},'*')};let current=P.scenes[0];const showScene=id=>{if(!P.scenes.includes(id))return;document.querySelectorAll('[data-tb-scene]').forEach(el=>el.hidden=el.dataset.tbScene!==id);current=id;track('scene_view',{id})};const next=()=>{const index=P.scenes.indexOf(current);showScene(P.scenes[Math.min(index+1,P.scenes.length-1)])};const redirect=()=>{track('cta_click');const url=new URL(P.redirectUrl);const clickId=new URLSearchParams(location.search).get('click_id');if(clickId&&!url.searchParams.has('click_id'))url.searchParams.set('click_id',clickId);location.href=url.toString()};const act=i=>{const scope=document.querySelector('[data-tb-scene="'+i.sceneId+'"]');const target=scope?.querySelector('[data-tb-id="'+i.targetId+'"]');if(i.action==='show'&&target)target.hidden=false;else if(i.action==='hide'&&target)target.hidden=true;else if(i.action==='toggle'&&target)target.hidden=!target.hidden;else if(i.action==='nextScene')next();else if(i.action==='goScene')showScene(i.targetSceneId);else if(i.action==='redirect')redirect();track('interaction',{id:i.id,action:i.action})};for(const i of P.interactions){const scope=document.querySelector('[data-tb-scene="'+i.sceneId+'"]');const source=scope?.querySelector('[data-tb-id="'+i.sourceId+'"]');if(i.event==='timer')setTimeout(()=>act(i),i.delay||1000);else source?.addEventListener(i.event,()=>act(i))}document.querySelectorAll('[data-timer]').forEach(el=>{let total=Number(el.dataset.timer)||45;const timer=setInterval(()=>{total--;el.textContent='00:'+String(Math.max(0,total)).padStart(2,'0');if(total<=0)clearInterval(timer)},1000)});showScene(current);track('page_view')})();`;
}

function renderBuilder(input) {
  const project = sanitizeProject(input);
  const css = project.scenes.map((scene) => scene.css).join('\n');
  const body = project.scenes.map((scene, index) => `<section data-tb-scene="${scene.id}"${index ? ' hidden' : ''}>${scene.html}</section>`).join('\n');
  const runtime = runtimeJs(project);
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>${css}</style></head><body>${body}<script>${runtime}<\/script></body></html>`;
  const checks = { scenes: project.scenes.length > 0, tracking: runtime.includes("track('page_view')"), redirect: runtime.includes("track('cta_click')"), mobile: html.includes('viewport'), externalScripts: !/<script[^>]+src=/i.test(html) };
  return { project, html, files: { 'layout.html': `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="theme.css"></head><body>${body}<script src="tracking.js"></script><script src="core_logic.js"></script></body></html>`, 'theme.css': css, 'core_logic.js': runtime, 'tracking.js': `window.__tbEvents=[];`, 'config.json': JSON.stringify(project, null, 2) }, validation: { ok: Object.values(checks).every(Boolean), checks } };
}

function validateBuilderPlan(plan) {
  const types = new Set(['add_scene','add_block','update_component','add_interaction','generate_asset']);
  const blockTypes = new Set(['text','heading','button','image','container','reveal','wheel','scratch','progress','quiz','cta']);
  const operations = (Array.isArray(plan?.operations) ? plan.operations : []).filter((op) => types.has(op?.type)).slice(0, 80).map((op) => ({ ...op, type: op.type, blockType: blockTypes.has(op.blockType) ? op.blockType : op.blockType ? 'container' : undefined }));
  return { summary: String(plan?.summary || 'План построения').slice(0, 300), operations };
}

function exportBuilder(project) { const output = renderBuilder(project); return { ...output, archive: zipFiles(Object.fromEntries(Object.entries(output.files).map(([name, content]) => [`preland/${name}`, content]))) }; }

module.exports = { sanitizeProject, renderBuilder, validateBuilderPlan, exportBuilder };
