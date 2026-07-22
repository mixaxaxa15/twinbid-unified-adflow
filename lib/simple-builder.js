const { zipFiles } = require('./zip');
const fs = require('node:fs');
const path = require('node:path');
const { sanitizeCustomFonts, sanitizeFontName, fontStack, fontFaceCss, fontAssets } = require('./fonts');

const TYPES = new Set(['text','image','button','shape','mechanism']);
const MECHANISMS = new Set(['wheel','progressive_reveal','scratch','quiz','age_gate','gift_boxes']);
const ASSET_ROLES = new Set(['background','object','character','prize','stage']);
const DEFAULT_WHEEL_COLORS=['#6d28d9','#d4af37','#312e81','#f59e0b','#7c3aed','#facc15','#4338ca','#eab308'];
const GIFT_BOX_VARIANTS=['gold','violet','blue'];
const color = (value, fallback) => /^(?:#[0-9a-f]{6}(?:[0-9a-f]{2})?|transparent)$/i.test(value || '') ? value : fallback;
const text = (value, fallback = '', max = 1000) => String(value ?? fallback).replace(/[<>]/g, '').slice(0, max);
const number = (value, fallback, min, max) => Math.max(min, Math.min(max, Number(value) || fallback));
const cleanId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
const asset = (value) => /^(?:https:\/\/|\/api\/image\?url=|\/(?:uploads|generated)\/|data:image\/)/i.test(value || '') ? String(value).slice(0, 20_000_000) : '';

function sanitizeBlock(input, viewport, index, customFonts = []) {
  const type = TYPES.has(input?.type) ? input.type : 'text';
  const width = number(input?.width, type === 'text' ? 300 : 260, 30, viewport.width);
  const height = number(input?.height, type === 'text' ? 60 : 180, 24, viewport.height);
  const style = input?.style || {};
  const block = {
    id: cleanId(input?.id) || `block-${index + 1}`, type,
    x: number(input?.x, 20, 0, Math.max(0, viewport.width - width)), y: number(input?.y, 20 + index * 25, 0, Math.max(0, viewport.height - height)), width, height,
    content: text(input?.content), src: asset(input?.src), assetPrompt: text(input?.assetPrompt, '', 800), assetRole:ASSET_ROLES.has(input?.assetRole)?input.assetRole:'object',
    style: { fontFamily: fontStack(sanitizeFontName(style.fontFamily, customFonts), customFonts), fontSize:number(style.fontSize,16,8,160), fontWeight:number(style.fontWeight,500,100,900), color:color(style.color,'#ffffff'), background:color(style.background,'transparent'), radius:number(style.radius,0,0,100), align:['left','center','right'].includes(style.align)?style.align:'left', opacity:number(style.opacity,1,.05,1), z:number(style.z,index+1,0,100) },
  };
  if (type === 'mechanism') {
    const mechanism = input?.mechanism || {};
    const wheelStyle=mechanism.wheelStyle||{};
    const sectorColors=(Array.isArray(wheelStyle.sectorColors)?wheelStyle.sectorColors:[]).slice(0,8).map((item,index)=>color(item,DEFAULT_WHEEL_COLORS[index]));
    block.mechanism = { kind:MECHANISMS.has(mechanism.kind)?mechanism.kind:'wheel', cta:text(mechanism.cta,'Продолжить',80), spinCta:text(mechanism.spinCta,'КРУТИТЬ',80), resultText:text(mechanism.resultText,'ВЫ ВЫИГРАЛИ',100), offerLines:(Array.isArray(mechanism.offerLines)?mechanism.offerLines:[]).slice(0,4).map(line=>text(line,'',140)), generatedWheelSkin:Boolean(mechanism.generatedWheelSkin), steps:number(mechanism.steps,3,1,8), stages:(Array.isArray(mechanism.stages)?mechanism.stages:[]).slice(0,8).map((stage)=>({src:asset(stage.src),assetPrompt:text(stage.assetPrompt,'',800),assetRole:ASSET_ROLES.has(stage.assetRole)?stage.assetRole:'stage'})), questions:(Array.isArray(mechanism.questions)?mechanism.questions:[]).slice(0,6).map(q=>({title:text(q.title,'Ваш выбор?',160),options:(Array.isArray(q.options)?q.options:[]).slice(0,5).map(o=>text(o,'Вариант',80))})), prizes:(Array.isArray(mechanism.prizes)?mechanism.prizes:[]).slice(0,8).map(prize=>text(prize,'БОНУС',30)), wheelStyle:{sectorColors:sectorColors.length===8?sectorColors:DEFAULT_WHEEL_COLORS,rimColor:color(wheelStyle.rimColor,'#f7c948'),hubColor:color(wheelStyle.hubColor,'#d4a72c'),labelColor:color(wheelStyle.labelColor,'#ffffff')} };
  }
  return block;
}

function sanitizeProject(input) {
  const viewport = { width:number(input?.viewport?.width,390,320,1440), height:number(input?.viewport?.height,844,500,1400), background:color(input?.viewport?.background,'#090d18') };
  const customFonts = sanitizeCustomFonts(input?.customFonts);
  const blocks = (Array.isArray(input?.blocks)?input.blocks:[]).slice(0,100).map((block,index)=>sanitizeBlock(block,viewport,index,customFonts));
  return { name:text(input?.name,'TwinBid Preland',100), viewport, offerUrl:/^https?:\/\//i.test(input?.offerUrl||'')?String(input.offerUrl).slice(0,2000):'https://example.com/offer', customFonts, blocks };
}

function inferRequestedMechanism(context = '') {
  const value=String(context||'').toLowerCase();
  const explicit=value.match(/(?:строго|механик[аи]|mechanic|kind)\s*[:=]?\s*`?(wheel|gift_boxes|progressive_reveal|scratch|quiz|age_gate)/i);
  if(explicit&&MECHANISMS.has(explicit[1]))return explicit[1];
  if(/колес|wheel/.test(value))return'wheel';
  if(/scratch|стир|сотр/.test(value))return'scratch';
  if(/reveal|раздень|откры.*шаг/.test(value))return'progressive_reveal';
  if(/опрос|quiz|вопрос/.test(value))return'quiz';
  if(/age.?gate|подтвержден.*возраст/.test(value))return'age_gate';
  if(/короб|подар|сундук|gift/.test(value))return'gift_boxes';
  return'';
}

function ensureAssetPlan(input, context = '') {
  const project = sanitizeProject(input);
  const visualContext = text(context, 'рекламный преленд', 700);
  const requestedKind = inferRequestedMechanism(visualContext);
  let mechanismBlock = project.blocks.find((block) => block.type === 'mechanism');
  if (requestedKind && !mechanismBlock) {
    mechanismBlock = sanitizeBlock({
      id:`mechanism-${requestedKind}`,type:'mechanism',x:35,y:Math.round(project.viewport.height*.28),width:project.viewport.width-70,height:Math.round(project.viewport.height*.43),assetRole:'background',
      style:{background:'#17142b',radius:24,z:5},mechanism:{kind:requestedKind,cta:'Открыть',steps:3,stages:[],questions:[],prizes:requestedKind==='wheel'?['50%','100%','150%','200%','250%','300%','400%','500%']:[]},
    },project.viewport,project.blocks.length);
    project.blocks.push(mechanismBlock);
  } else if (requestedKind && mechanismBlock && mechanismBlock.mechanism.kind !== requestedKind) {
    mechanismBlock.mechanism.kind=requestedKind;mechanismBlock.mechanism.stages=[];
  }
  const activeKind=requestedKind||mechanismBlock?.mechanism?.kind||'';
  if(activeKind==='wheel'||activeKind==='scratch'){
    const safeBackgroundPrompt=activeKind==='wheel'
      ?`Abstract premium casino atmosphere as full-bleed mobile background artwork for an interactive prize wheel prelander. User art direction: ${visualContext}. Cohesive cinematic depth, calm center for the real HTML wheel. No wheel, circles, roulette, sectors, pointer, text, numbers, logo, buttons, cards, interface, poster or complete webpage.`
      :`Abstract premium casino atmosphere as full-bleed mobile background artwork for an interactive scratch-card prelander. User art direction: ${visualContext}. Cohesive cinematic depth, calm center for the real scratch area; no scratch card, foil cover, tickets, prize, text, numbers, logo, buttons, interface, poster or complete webpage.`;
    let pageBackground=project.blocks.find(block=>block.type==='image'&&block.assetRole==='background'&&block.width>=project.viewport.width*.8&&block.height>=project.viewport.height*.8);
    if(!pageBackground){pageBackground=sanitizeBlock({id:'page-background',type:'image',x:0,y:0,width:project.viewport.width,height:project.viewport.height,assetRole:'background',assetPrompt:safeBackgroundPrompt,style:{z:0,opacity:1}},project.viewport,0);project.blocks.unshift(pageBackground);}
    else if(!pageBackground.src)pageBackground.assetPrompt=safeBackgroundPrompt;
  }
  const displayBlocks = [];
  for (const block of project.blocks) {
    if (!block.assetPrompt || ['image','mechanism'].includes(block.type)) continue;
    const role = /фон|background|bokeh|gradient|particles/i.test(block.assetPrompt) ? 'background' : 'object';
    const imageBlock = sanitizeBlock({
      id:`asset-${block.id}`,type:'image',x:role==='background'?0:block.x,y:role==='background'?0:block.y,width:role==='background'?project.viewport.width:block.width,height:role==='background'?project.viewport.height:block.height,
      assetPrompt:block.assetPrompt,assetRole:role,style:{...block.style,z:role==='background'?0:Math.max(1,block.style.z-1)},
    },project.viewport,project.blocks.length+displayBlocks.length);
    displayBlocks.push(imageBlock);block.assetPrompt='';
  }
  project.blocks.unshift(...displayBlocks.filter((block)=>block.assetRole==='background'));
  project.blocks.push(...displayBlocks.filter((block)=>block.assetRole!=='background'));
  for (const block of project.blocks) {
    if (block.type === 'image' && (block.width >= project.viewport.width * .8 && block.height >= project.viewport.height * .6 || /фон|background|bokeh|gradient|particles/i.test(block.assetPrompt))) block.assetRole = 'background';
    if (block.type !== 'mechanism') continue;
    const mechanic = block.mechanism;
    block.assetRole = 'background';
    if (mechanic.kind==='wheel'||mechanic.kind==='scratch'){block.assetPrompt='';block.style.background='transparent';}
    else if (!block.src && !block.assetPrompt) block.assetPrompt=`Full-bleed supporting artwork for the ${mechanic.kind} mechanic. User art direction: ${visualContext}. Keep the center calm for real interface elements. Do not draw text, logos, buttons, cards, questions, gift boxes, interface, poster or a complete webpage.`;
    if (mechanic.kind === 'wheel') {
      const wheelSkin=mechanic.stages[0]||{};
      mechanic.stages=mechanic.generatedWheelSkin?[{src:wheelSkin.src||'',assetRole:'object',assetPrompt:wheelSkin.assetPrompt||`One isolated circular prize wheel face matching this art direction: ${visualContext}, exactly 8 equal blank sectors, perfectly front-facing and centered, transparent outside the wheel, no pointer, no text, no letters, no numbers, no logos, no buttons, no interface and no scene.`}]:[];
      if(mechanic.prizes.length!==8)mechanic.prizes=['50%','100%','150%','200%','250%','300%','400%','500%'];
    } else if (mechanic.kind === 'gift_boxes') {
      const existing = mechanic.stages.slice(0, 3);
      mechanic.stages = Array.from({ length: 3 }, (_, index) => ({
        src: existing[index]?.src || '',
        assetRole: 'object',
        // This is a protected system prompt. Never allow the page prompt or
        // section LLM to turn a gift-box asset into a complete scene/banner.
        assetPrompt: existing[index]?.src?'':`Exactly one ${GIFT_BOX_VARIANTS[index]} premium closed gift box only, matching this art direction: ${visualContext}. Isolated product cutout, entire box fully visible and centered, consistent front three-quarter view, generous empty margins around the object, square 1:1 PNG, transparent background with alpha channel. No backdrop, no colored background, no white background, no floor, no surface, no room, no environment, no scene, no frame, no rectangular shadow, no text, no letters, no numbers, no logo, no buttons, no interface, no people, no hands, no prizes and no extra objects. The output must contain only the single gift box.`,
      }));
    } else if (mechanic.kind === 'scratch') {
      const first = mechanic.stages[0] || {};
      mechanic.stages = [{ src:first.src || '', assetRole:'prize', assetPrompt:first.src?'':`One premium golden casino prize object matching this art direction: ${visualContext}. Centered and large reusable square visual asset. No scratch coating, scratch card, foil, text, letters, numbers, logo, buttons, interface, people, hands, poster or complete webpage.` }];
    } else if (['quiz','age_gate'].includes(mechanic.kind)) {
      const first = mechanic.stages[0] || {};
      mechanic.stages = [{ src:first.src || '', assetRole:'character', assetPrompt:first.assetPrompt || `One main fictional adult character or thematic object for the ${mechanic.kind} mechanic. User art direction: ${visualContext}. Centered clean composition, no questions, age badge, text, buttons, cards, interface, poster or complete webpage.` }];
    } else if (mechanic.kind === 'progressive_reveal') {
      const existing = mechanic.stages.slice(0, mechanic.steps);
      mechanic.stages = Array.from({ length: mechanic.steps }, (_, index) => ({
        src:existing[index]?.src || '', assetRole:'stage',
        assetPrompt:existing[index]?.assetPrompt || `Frame ${index + 1} of ${mechanic.steps} for a progressive reveal. User art direction: ${visualContext}. Keep the exact same fictional adult subject 25+, identity, camera, pose, clothing, lighting and background across every frame; change only the intended reveal state. One full-frame image, no collage, text, buttons, interface, poster or complete webpage.`,
      }));
    }
  }
  return sanitizeProject(project);
}

function placeUploadedAsset(input, source, instruction = '') {
  const project = sanitizeProject(input);
  const prompt = String(instruction || '').toLowerCase();
  const mechanicBlock = project.blocks.find((block) => block.type === 'mechanism');
  let target = 'главная иллюстрация';
  const boxMatch = prompt.match(/(?:короб|подар|сундук)[^0-9]{0,8}([123])/i);
  if (boxMatch && mechanicBlock?.mechanism?.kind === 'gift_boxes') {
    const index = Number(boxMatch[1]) - 1;
    while (mechanicBlock.mechanism.stages.length < 3) mechanicBlock.mechanism.stages.push({src:'',assetPrompt:'',assetRole:'object'});
    mechanicBlock.mechanism.stages[index] = { ...mechanicBlock.mechanism.stages[index], src:source, assetPrompt:'', assetRole:'object' };
    target = `коробка ${index + 1}`;
  } else if (/колес|wheel|диск/i.test(prompt) && mechanicBlock?.mechanism?.kind === 'wheel') {
    mechanicBlock.mechanism.stages[0] = { ...(mechanicBlock.mechanism.stages[0] || {}), src:source, assetPrompt:'', assetRole:'object' }; target = 'дизайн колеса';
  } else if (/фон|background|задн/i.test(prompt)) {
    let background = project.blocks.find((block) => block.type === 'image' && block.assetRole === 'background');
    if (!background) {
      background = sanitizeBlock({ id:'uploaded-background',type:'image',x:0,y:0,width:project.viewport.width,height:project.viewport.height,src:source,assetRole:'background',style:{z:0,opacity:1} },project.viewport,0);
      project.blocks.unshift(background);
    } else { background.src = source; background.assetPrompt = ''; }
    target = 'фон страницы';
  } else if (/механик|блок|карточк/i.test(prompt) && mechanicBlock) {
    mechanicBlock.src = source; mechanicBlock.assetPrompt = ''; mechanicBlock.assetRole = 'background'; target = 'фон механики';
  } else if (/приз|scratch/i.test(prompt) && mechanicBlock) {
    mechanicBlock.mechanism.stages[0] = { ...(mechanicBlock.mechanism.stages[0] || {}), src:source, assetPrompt:'', assetRole:'prize' }; target = 'приз';
  } else if (mechanicBlock?.mechanism?.stages?.length) {
    mechanicBlock.mechanism.stages[0] = { ...mechanicBlock.mechanism.stages[0], src:source, assetPrompt:'', assetRole:'character' }; target = 'главная картинка механики';
  } else {
    let image = project.blocks.find((block) => block.type === 'image' && block.assetRole !== 'background');
    if (!image) {
      image = sanitizeBlock({ id:'uploaded-image',type:'image',x:45,y:180,width:project.viewport.width-90,height:Math.min(360,project.viewport.height*.45),src:source,assetRole:'character',style:{z:3,radius:20} },project.viewport,project.blocks.length);
      project.blocks.push(image);
    } else { image.src = source; image.assetPrompt = ''; }
  }
  return { project:sanitizeProject(project), target };
}

function blockStyle(block) {
  const s=block.style;return `position:absolute;left:${block.x}px;top:${block.y}px;width:${block.width}px;height:${block.height}px;z-index:${s.z};opacity:${s.opacity};font-family:${s.fontFamily};font-size:${s.fontSize}px;font-weight:${s.fontWeight};color:${s.color};background:${s.background};border-radius:${s.radius}px;text-align:${s.align};overflow:hidden;`;
}
function renderMechanism(block) {
  const m=block.mechanism;const stages=JSON.stringify(m.stages||[]).replace(/</g,'\\u003c');
  const background=block.src?`<img class="mech-bg" src="${block.src}" alt="">`:'';
  const firstStage=m.stages?.find(stage=>stage.src)?.src||'';
  if(m.kind==='wheel'){
    const prizes=(m.prizes?.length===8?m.prizes:['50%','100%','150%','200%','250%','300%','400%','500%']);
    const wheelStyle=m.wheelStyle||{},colors=wheelStyle.sectorColors?.length===8?wheelStyle.sectorColors:DEFAULT_WHEEL_COLORS;
    const gradient=colors.map((item,index)=>`${item} ${index*12.5}% ${(index+1)*12.5}%`).join(',');
    const labels=prizes.map((prize,index)=>{const angle=(index+.5)*Math.PI/4,left=(50+Math.sin(angle)*34).toFixed(2),top=(50-Math.cos(angle)*34).toFixed(2);return`<span class="wheel-label" style="left:${left}%;top:${top}%">${prize}</span>`}).join('');
    const offers=(m.offerLines?.length?m.offerLines:['Бонус до 500%','Доступно 3 попытки','Подарок активируется после вращения']).map((line,index)=>`<p${index===0?' class="offer-main"':''}>${line}</p>`).join('');
    const finalPrize=prizes.at(-1);
    return `<div class="mechanism wheel-mech" data-kind="wheel" data-prize="${finalPrize}" data-result="${m.resultText}">${background}<div class="wheel-layout"><div class="wheel-shell"><i class="wheel-pointer"></i><div class="wheel" style="--wheel-bg:conic-gradient(${gradient});--rim:${wheelStyle.rimColor};--hub:${wheelStyle.hubColor};--labels:${wheelStyle.labelColor}">${firstStage?`<img class="wheel-skin" src="${firstStage}" alt="">`:''}<div class="wheel-labels">${labels}</div><b>КРУТИ</b></div></div><aside class="wheel-offer">${offers}</aside></div><div class="wheel-result" hidden></div><button class="wheel-spin">${m.spinCta}</button><button class="mech-cta" hidden>${m.cta}</button></div>`;
  }
  if(m.kind==='progressive_reveal')return `<div class="mechanism reveal-mech" data-kind="progressive_reveal" data-steps="${m.steps}" data-stages='${stages}'><img class="stage-image"${m.stages?.[0]?.src?` src="${m.stages[0].src}"`:''}><div class="cover">18+ · ${m.cta}</div><button class="mech-cta" hidden>${m.cta}</button></div>`;
  if(m.kind==='scratch')return `<div class="mechanism scratch-mech" data-kind="scratch">${background}<div class="scratch-card"><div class="scratch-reward">${firstStage?`<img class="scratch-prize" src="${firstStage}" alt="Изображение приза">`:''}<div class="scratch-reward-copy"><small>ВАШ ПРИЗ</small><b>БОНУС 500%</b></div></div><canvas class="scratch-canvas" aria-label="Сотрите защитное покрытие мышью или пальцем"></canvas></div><div class="scratch-progress">Стерто 0%</div><div class="scratch-result" hidden>ПОЗДРАВЛЯЕМ! ВЫ ВЫИГРАЛИ БОНУС 500%</div><button class="mech-cta" hidden>${m.cta}</button></div>`;
  if(m.kind==='quiz'){const q=m.questions?.[0]||{title:'Ваш выбор?',options:['Да','Нет']};return `<div class="mechanism quiz-mech" data-kind="quiz">${background}${firstStage?`<img class="quiz-visual" src="${firstStage}" alt="">`:''}<div class="mech-content"><h3>${q.title}</h3>${q.options.map(o=>`<button class="quiz-option">${o}</button>`).join('')}</div><button class="mech-cta" hidden>${m.cta}</button></div>`;}
  if(m.kind==='age_gate')return `<div class="mechanism gate-mech" data-kind="age_gate">${background}${firstStage?`<img class="quiz-visual" src="${firstStage}" alt="">`:''}<div class="mech-content"><b>18+</b><p>Вам исполнилось 18 лет?</p><button class="gate-yes">Да</button><button>Нет</button></div><button class="mech-cta" hidden>${m.cta}</button></div>`;
  const gifts=Array.from({length:3},(_,index)=>{const src=m.stages?.[index]?.src;return `<button class="gift-box" data-index="${index}">${src?`<img src="${src}" alt="Подарочная коробка ${index+1}">`:'🎁'}</button>`}).join('');
  return `<div class="mechanism boxes-mech" data-kind="gift_boxes">${background}<div class="gift-row">${gifts}</div><button class="mech-cta" hidden>${m.cta}</button></div>`;
}

function renderProject(input) {
  const project=sanitizeProject(input);
  const blocks=project.blocks.sort((a,b)=>a.style.z-b.style.z).map(block=>{
    let body='';if(block.type==='image')body=block.src?`<img src="${block.src}" alt="">`:'';else if(block.type==='mechanism')body=renderMechanism(block);else body=block.content;
    const tag=block.type==='button'?'button':'div';return `<${tag} class="block block-${block.type}" data-block-id="${block.id}" style="${blockStyle(block)}">${body}</${tag}>`;
  }).join('');
  const runtime=`(()=>{const OFFER=${JSON.stringify(project.offerUrl)};const track=(name,data={})=>{const event={name,data,click_id:new URLSearchParams(location.search).get('click_id')||'',at:Date.now()};window.__tbEvents=(window.__tbEvents||[]).concat(event)};const redirect=()=>{track('cta_click');const u=new URL(OFFER),id=new URLSearchParams(location.search).get('click_id');if(id&&!u.searchParams.has('click_id'))u.searchParams.set('click_id',id);location.href=u};document.querySelectorAll('.block-button').forEach(b=>b.onclick=redirect);document.querySelectorAll('.mechanism').forEach(root=>{const kind=root.dataset.kind,cta=root.querySelector('.mech-cta');let completed=false;const done=()=>{if(completed)return;completed=true;if(cta)cta.hidden=false;track('mechanic_complete',{kind})};cta?.addEventListener('click',redirect);if(kind==='wheel'){const wheel=root.querySelector('.wheel'),spin=root.querySelector('.wheel-spin'),result=root.querySelector('.wheel-result');let spinning=false;const run=()=>{if(spinning)return;spinning=true;spin.disabled=true;wheel.style.transform='rotate(1575deg)';track('wheel_spin');setTimeout(()=>{root.classList.add('won');spin.hidden=true;result.textContent=(root.dataset.result||'ВЫ ВЫИГРАЛИ')+' '+(root.dataset.prize||'500%');result.hidden=false;done()},1800)};wheel.onclick=run;spin.onclick=run}else if(kind==='progressive_reveal'){let step=0;const cover=root.querySelector('.cover'),image=root.querySelector('.stage-image'),stages=JSON.parse(root.dataset.stages||'[]');cover.onclick=()=>{step++;if(stages[step]?.src)image.src=stages[step].src;cover.style.opacity=String(Math.max(0,1-step/(Number(root.dataset.steps)||3)));if(step>=(Number(root.dataset.steps)||3)){cover.hidden=true;done()}}}else if(kind==='scratch'){const canvas=root.querySelector('.scratch-canvas'),progress=root.querySelector('.scratch-progress'),result=root.querySelector('.scratch-result'),ctx=canvas.getContext('2d',{willReadFrequently:true});let drawing=false,moves=0,revealed=false;const paint=()=>{const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));canvas.width=w;canvas.height=h;ctx.globalCompositeOperation='source-over';const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#e5e7eb');gradient.addColorStop(.45,'#8f96a3');gradient.addColorStop(1,'#d7dbe2');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);ctx.fillStyle='#353943';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+Math.max(16,Math.min(30,w/11))+'px Arial';ctx.fillText('СТИРАЙТЕ ЗДЕСЬ',w/2,h/2)};const position=e=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height}};const reveal=()=>{if(revealed)return;revealed=true;drawing=false;canvas.style.opacity='0';canvas.style.pointerEvents='none';progress.textContent='Открыто!';result.hidden=false;root.classList.add('scratch-won');setTimeout(()=>canvas.hidden=true,320);done()};const measure=()=>{const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let clear=0,total=0;for(let y=0;y<canvas.height;y+=8)for(let x=0;x<canvas.width;x+=8){total++;if(data[(y*canvas.width+x)*4+3]<24)clear++}const percent=Math.round(clear/Math.max(1,total)*100);progress.textContent='Стерто '+percent+'%';if(percent>=52)reveal()};const scratch=e=>{if(revealed)return;const p=position(e);ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(20,canvas.width*.075),0,Math.PI*2);ctx.fill();moves++;if(moves%5===0)measure()};canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture?.(e.pointerId);scratch(e);track('scratch_start')});canvas.addEventListener('pointermove',e=>{if(drawing)scratch(e)});const stop=e=>{if(!drawing)return;drawing=false;canvas.releasePointerCapture?.(e.pointerId);measure()};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('pointerleave',e=>{if(e.buttons===0)stop(e)});paint()}else if(kind==='quiz'){root.querySelectorAll('.quiz-option').forEach(b=>b.onclick=done)}else if(kind==='age_gate'){root.querySelector('.gate-yes').onclick=done}else root.querySelectorAll('.gift-box').forEach(b=>b.onclick=()=>{b.innerHTML='🏆';done()})});track('page_view')})();`;
  const css=`*{box-sizing:border-box}body{margin:0;background:#222;display:grid;place-items:start center;min-height:100vh}.page{position:relative;width:${project.viewport.width}px;height:${project.viewport.height}px;background:${project.viewport.background};overflow:hidden}.block{line-height:1.08}.block-text{display:flex;align-items:center;padding:4px}.block-shape{display:grid;place-items:center;padding:10px}.block-button{border:0;display:grid;place-items:center;cursor:pointer}.block-image img,.stage-image{width:100%;height:100%;object-fit:cover;display:block}.mechanism{width:100%;height:100%;display:grid;place-items:center;position:relative;isolation:isolate}.mech-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.mechanism:has(.mech-bg):after{content:'';position:absolute;inset:0;background:#07080b55;z-index:-1}.wheel-mech{overflow:visible;background:#09071c99;border:1px solid #f7c94840;box-shadow:inset 0 0 60px #6d28d933}.wheel-layout{width:100%;height:100%;padding:14px 18px 62px;display:flex;align-items:center;justify-content:center;gap:clamp(18px,4vw,54px)}.wheel-shell{position:relative;width:min(42%,285px);aspect-ratio:1;flex:none}.wheel-pointer{position:absolute;z-index:5;left:50%;top:-7px;transform:translateX(-50%);width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:29px solid #fff2b7;filter:drop-shadow(0 3px 3px #0009)}.wheel{position:absolute;inset:0;border:8px solid var(--rim,#f7c948);border-radius:50%;overflow:hidden;background:var(--wheel-bg);display:grid;place-items:center;transition:transform 1.8s cubic-bezier(.16,.78,.16,1);cursor:pointer;box-shadow:0 0 0 4px #6e4b13,0 12px 38px #0008,0 0 34px #ffd76b66}.wheel-skin{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}.wheel>b{position:relative;z-index:2;width:32%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:var(--hub,#d4a72c);border:4px solid #fff2b7;color:#251300;font-size:clamp(11px,2vw,18px);box-shadow:0 4px 14px #0008}.wheel-labels{position:absolute;inset:0;z-index:1}.wheel-label{position:absolute;transform:translate(-50%,-50%);color:var(--labels,#fff);font-size:clamp(9px,1.5vw,14px);font-weight:900;text-shadow:0 2px 4px #000;white-space:nowrap}.wheel-offer{width:min(38%,320px);padding:20px;border:1px solid #f7c94855;border-radius:20px;background:linear-gradient(145deg,#21164cdd,#0b1025e8);box-shadow:0 16px 45px #0006;color:#fff;text-align:left}.wheel-offer p{margin:10px 0;padding-left:20px;position:relative;font-size:clamp(12px,1.5vw,17px);line-height:1.25}.wheel-offer p:before{content:'✓';position:absolute;left:0;color:#f7c948}.wheel-offer .offer-main{margin-top:0;padding:0;color:#ffd75f;font-size:clamp(18px,2.2vw,28px);font-weight:900}.wheel-offer .offer-main:before{display:none}.wheel-spin,.mech-cta{position:absolute;left:12%;right:12%;bottom:4%;min-height:46px;padding:12px 18px;border:0;border-radius:13px;background:linear-gradient(90deg,#f7c948,#ffed95);color:#251300;font-weight:900;font-size:clamp(13px,1.5vw,18px);cursor:pointer;z-index:8;box-shadow:0 8px 24px #0007}.wheel-spin:disabled{opacity:.65}.wheel-result{position:absolute;z-index:7;left:18%;right:18%;bottom:62px;padding:9px;border-radius:12px;background:#17112ef0;border:1px solid #f7c948;color:#ffe47d;text-align:center;font-size:clamp(14px,2vw,22px);font-weight:900;animation:result-in .4s ease-out}.wheel-mech.won:before,.wheel-mech.won:after{content:'✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦';position:absolute;z-index:6;top:8%;left:5%;right:5%;color:#ffd75f;font-size:24px;text-align:center;animation:confetti 1.2s ease-out infinite}.wheel-mech.won:after{top:auto;bottom:25%;animation-delay:.25s}.reveal-mech .cover{position:absolute;inset:0;display:grid;place-items:center;background:#111d;backdrop-filter:blur(16px);font-size:30px;font-weight:900;cursor:pointer;transition:.25s}.scratch-mech{background:#171225dd;padding:12px 12px 74px;align-content:center;gap:7px;overflow:visible}.scratch-card{position:relative;width:min(88%,520px);height:min(72%,300px);min-height:150px;border:5px solid #e6bc50;border-radius:20px;overflow:hidden;background:#130d27;box-shadow:0 16px 45px #0009,0 0 30px #f7c94855}.scratch-reward{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.scratch-prize{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.scratch-reward:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#130d2722,#130d27aa)}.scratch-reward-copy{position:relative;z-index:1;display:grid;text-align:center;color:#fff;text-shadow:0 3px 12px #000}.scratch-reward-copy small{font-size:12px;letter-spacing:2px}.scratch-reward-copy b{font-size:clamp(24px,5vw,48px);color:#ffe071}.scratch-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:3;touch-action:none;cursor:crosshair;transition:opacity .3s}.scratch-progress{color:#d8d3e6;font-size:13px;font-weight:700}.scratch-result{position:absolute;left:8%;right:8%;bottom:61px;padding:8px;border-radius:10px;background:#17112ef2;border:1px solid #f7c948;color:#ffe47d;text-align:center;font-size:clamp(12px,2vw,18px);font-weight:900;z-index:7;animation:result-in .4s ease-out}.scratch-mech.scratch-won:before{content:'✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦';position:absolute;z-index:6;top:4%;left:5%;right:5%;color:#ffd75f;font-size:22px;text-align:center;animation:confetti 1.2s ease-out infinite}.quiz-mech,.gate-mech{text-align:center;padding:16px}.quiz-visual{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;opacity:.55}.mech-content{position:relative;z-index:1}.quiz-mech button,.gate-mech button{margin:4px;padding:9px 13px;border-radius:9px;border:0;cursor:pointer}.gate-mech .mech-content>b{font-size:42px}.boxes-mech{font-size:38px}.gift-row{display:flex;gap:8px;width:100%;padding:10px;justify-content:center}.gift-box{width:30%;aspect-ratio:1;border:0;border-radius:14px;background:#ffffff18;font-size:38px;padding:4px;cursor:pointer;overflow:hidden}.gift-box img{width:100%;height:100%;object-fit:contain;display:block}.boxes-mech .mech-cta{font-size:13px}.mech-cta[hidden],.wheel-spin[hidden],.wheel-result[hidden],.scratch-result[hidden]{display:none}@keyframes result-in{from{opacity:0;transform:scale(.75)}to{opacity:1;transform:scale(1)}}@keyframes confetti{0%{transform:translateY(-8px);opacity:0}30%{opacity:1}100%{transform:translateY(24px);opacity:0}}@media(max-width:700px){.wheel-layout{padding:8px 8px 58px;flex-direction:column;gap:7px}.wheel-shell{width:min(62%,220px)}.wheel-offer{width:94%;padding:7px 10px;display:grid;grid-template-columns:repeat(2,1fr);gap:3px 8px}.wheel-offer p{margin:2px 0;font-size:10px}.wheel-offer .offer-main{grid-column:1/-1;font-size:15px}.wheel-spin,.mech-cta{left:7%;right:7%;min-height:42px}.wheel-result{left:8%;right:8%;bottom:57px;font-size:13px}.scratch-mech{padding:8px 8px 68px}.scratch-card{width:96%;height:min(70%,260px)}}`;
  const previewFontCss=fontFaceCss(project.customFonts,'preview'),exportFontCss=fontFaceCss(project.customFonts,'export');
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>${previewFontCss}${css}</style></head><body><main class="page">${blocks}</main><script>${runtime}<\/script></body></html>`;
  return {project,html,fontAssets:fontAssets(project.customFonts),files:{'layout.html':`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="theme.css"></head><body><main class="page">${blocks}</main><script src="tracking.js"></script><script src="core_logic.js"></script></body></html>`,'theme.css':exportFontCss+css,'core_logic.js':runtime,'tracking.js':'window.__tbEvents=[];','config.json':JSON.stringify(project,null,2)},validation:{ok:project.blocks.length>0,checks:{blocks:project.blocks.length>0,tracking:true,redirect:true,mobile:true}}};
}

function sanitizePatch(input, original) {
  const merged={...original,...input,style:{...original.style,...input?.style},mechanism:original.mechanism?{...original.mechanism,...input?.mechanism}:undefined};
  return sanitizeBlock(merged,{width:1440,height:1400},0);
}

function zipProject(project) {
  const output = renderProject(project);
  const files = Object.fromEntries(Object.entries(output.files).map(([name, value]) => [`preland/${name}`, value]));
  const fontRoot=path.join(__dirname,'..','public','fonts');
  for(const font of output.fontAssets||[]){const source=path.join(fontRoot,font.source);if(fs.existsSync(source))files[`preland/assets/fonts/${font.target}`]=fs.readFileSync(source)}
  return { ...output, archive: zipFiles(files) };
}

module.exports = { sanitizeProject, inferRequestedMechanism, ensureAssetPlan, placeUploadedAsset, renderProject, sanitizePatch, zipProject };
