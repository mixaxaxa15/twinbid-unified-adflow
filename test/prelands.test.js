const test = require('node:test');
const assert = require('node:assert/strict');
const { TEMPLATES, defaultConfig, render, validatePlan } = require('../lib/prelands');
const { zipFiles } = require('../lib/zip');
const path = require('node:path');
const fs = require('node:fs');
const { loadTemplates, renderArchive, validateArchivePlan } = require('../lib/archive-prelands');
const { ARCHIVE_MECHANICS, ARCHIVE_IDS } = require('../lib/mechanic-catalog');
const archiveRoot = path.join(__dirname, '..', 'public', 'prelander-library');
const {applyDeterministicBlurIntent,applyDeterministicIconIntent,applyDeterministicSlotIntent,applyAutomaticContrast,applyDeterministicContrastIntent}=require('../server');

test('all preland mechanics render and preserve protected checks', () => {
  for (const template of TEMPLATES) {
    const output = render(defaultConfig(template.id));
    assert.equal(output.validation.ok, true, template.id);
    assert.match(output.files['core_logic.js'], /cta_click/);
    assert.match(output.files['tracking.js'], /page_view/);
  }
});

test('LLM plan drops protected and unknown changes', () => {
  const plan = validatePlan({ changes: [{ path: 'text.headline', value: 'New' }, { path: 'core_logic.js', value: 'hack' }, { path: 'settings.redirectUrl', value: 'bad' }] });
  assert.deepEqual(plan.changes, [{ path: 'text.headline', value: 'New' }]);
});

test('export builds a valid zip envelope', () => {
  const zip = zipFiles({ 'preland/layout.html': '<h1>ok</h1>', 'preland/config.json': '{}', 'preland/assets/test.png': Buffer.from([0, 1, 2, 255]) });
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
});

test('loads and renders all imported mechanics', () => {
  const templates = loadTemplates(archiveRoot);
  assert.equal(Object.keys(templates).length, 30);
  for(const [id,template] of Object.entries(templates)){
    const output = renderArchive(id, template, archiveRoot, true);
    assert.equal(output.validation.ok, true,id);
    assert.equal(output.config.type,template.type,id);
    assert.deepEqual(output.config.behavior,template.behavior,id);
    assert.doesNotThrow(()=>new Function(output.files['core_logic.js']),id);
  }
});

test('catalog exposes every archive mechanic in eight user categories',()=>{const templates=loadTemplates(archiveRoot);assert.equal(ARCHIVE_MECHANICS.length,30);assert.equal(new Set(ARCHIVE_MECHANICS.map(item=>item.category)).size,8);assert.deepEqual([...ARCHIVE_IDS].sort(),Object.keys(templates).sort())});

test('archive editor preserves behavior and rejects AI logic edits', () => {
  const templates = loadTemplates(archiveRoot);
  const edited = JSON.parse(JSON.stringify(templates.casino_spin_wheel_win));
  edited.behavior.rotation = 1;
  const output = renderArchive('casino_spin_wheel_win', edited, archiveRoot);
  assert.equal(output.config.behavior.rotation, templates.casino_spin_wheel_win.behavior.rotation);
  const plan = validateArchivePlan({ changes: [{ path: 'texts.title', value: 'New' }, { path: 'behavior.rotation', value: 1 }, { path: 'type', value: 'loading' }] });
  assert.deepEqual(plan.changes, [{ path: 'texts.title', value: 'New' }]);
});

test('archive render keeps locally generated and uploaded images', () => {
  const generated = renderArchive('adult_blurred_18_gate', { assets: { background: '/generated/age-gate.jpg' } }, archiveRoot, true);
  assert.equal(generated.config.assets.background, '/generated/age-gate.jpg');
  assert.match(generated.preview, /\/generated\/age-gate\.jpg/);

  const uploaded = renderArchive('adult_blurred_18_gate', { assets: { background: '/uploads/custom-background.png' } }, archiveRoot, true);
  assert.equal(uploaded.config.assets.background, '/uploads/custom-background.png');
  assert.match(uploaded.preview, /\/uploads\/custom-background\.png/);
});

test('archive visual editor changes the whole visible layer without changing mechanic behavior', () => {
  const templates = loadTemplates(archiveRoot);
  const input = JSON.parse(JSON.stringify(templates.casino_slot_minigame));
  input.assets.background = '/generated/night-club.jpg';
  input.assets.slotFrame = '/generated/slot-frame.png';
  input.visual = { rules: {
    card:{background:'linear-gradient(135deg,#19102f,#05060c)',borderRadius:38,padding:34,boxShadow:'0 30px 80px #000'},
    title:{fontSize:44,color:'#ffe071',letterSpacing:2,textTransform:'uppercase'},
    primaryButton:{background:'linear-gradient(90deg,#ff3d81,#ffcf4a)',borderRadius:24,fontSize:20},
    slotCell:{background:'#10051f',borderColor:'#ffd65a',borderWidth:3,borderRadius:12,fontSize:46},
  }};
  input.behavior.symbols = ['HACK','HACK','HACK'];
  const output = renderArchive('casino_slot_minigame', input, archiveRoot, true);
  assert.deepEqual(output.config.behavior, templates.casino_slot_minigame.behavior);
  assert.equal(output.config.assets.background, '/generated/night-club.jpg');
  assert.equal(output.config.assets.slotFrame, '/generated/slot-frame.png');
  assert.match(output.preview, /body \{ position: relative; isolation: isolate; \}/);
  assert.match(output.preview, /body::before[\s\S]*z-index: 0/);
  assert.match(output.preview, /\.card\{background:linear-gradient\(135deg,#19102f,#05060c\)!important/);
  assert.match(output.preview, /\.slot-cell\{background:#10051f!important/);
  assert.match(output.preview, /slot-frame\.png/);
});

test('slot reels accept safe timing, result, direction and image settings',()=>{
  const templates=loadTemplates(archiveRoot);
  const input=JSON.parse(JSON.stringify(templates.casino_slot_minigame));
  Object.assign(input.slotSettings,{symbolMode:'image',animationStyle:'flip',spinDuration:2600,reel1TickInterval:45,reel2TickInterval:80,reel3TickInterval:120,reel1ExtraDuration:0,reel2ExtraDuration:500,reel3ExtraDuration:900,reel1ResultIndex:2,reel2ResultIndex:4,reel3ResultIndex:6,reel1Direction:'up',reel2Direction:'down',reel3Direction:'up'});
  input.items[2].image='/uploads/cherry.png';input.items[4].image='/uploads/lemon.png';input.items[6].image='/uploads/seven.png';
  const output=renderArchive('casino_slot_minigame',input,archiveRoot,true);
  assert.equal(output.config.slotSettings.symbolMode,'image');
  assert.equal(output.config.slotSettings.animationStyle,'flip');
  assert.equal(output.config.slotSettings.reel3ExtraDuration,900);
  assert.deepEqual(output.config.behavior,templates.casino_slot_minigame.behavior);
  assert.match(output.files['core_logic.js'],/setInterval\(\(\)=>\{tick=\(tick\+1\)%pool\.length/);
  assert.match(output.files['core_logic.js'],/settings\[`reel\$\{index\+1\}TickInterval`\]/);
  assert.match(output.files['core_logic.js'],/className="slot-symbol-image"/);
  assert.match(output.files['core_logic.js'],/window\.TwinBidTracking\?\.track\('slot_spin'\)/);
  assert.match(output.preview,/slot-animation-flip/);
  const plan=validateArchivePlan({changes:[
    {path:'slotSettings.spinDuration',value:3200},{path:'slotSettings.reel2TickInterval',value:55},{path:'slotSettings.reel3Direction',value:'up'},{path:'slotSettings.symbolMode',value:'text'},{path:'items.0.label',value:'🍒'},{path:'behavior.symbols',value:'broken'},
  ]},output.config);
  assert.deepEqual(plan.changes.map(item=>item.path),['slotSettings.spinDuration','slotSettings.reel2TickInterval','slotSettings.reel3Direction','slotSettings.symbolMode','items.0.label']);
});

test('ordinary slot wording deterministically controls digits, timing and 777 result',()=>{
  const current=renderArchive('casino_slot_minigame',loadTemplates(archiveRoot).casino_slot_minigame,archiveRoot).config;
  const plan=applyDeterministicSlotIntent({changes:[],assetPrompts:[]},'Сделай цифры от 0 до 9. Первый барабан крутится быстро, второй медленнее, третий ещё медленнее. Останови по очереди, вниз, итог 777.',current,'casino_slot_minigame');
  const values=Object.fromEntries(plan.changes.map(item=>[item.path,item.value]));
  assert.equal(values['slotSettings.symbolMode'],'text');
  assert.equal(values['items.9.label'],'9');
  assert.equal(values['slotSettings.reel1TickInterval'],45);
  assert.equal(values['slotSettings.reel3TickInterval'],95);
  assert.equal(values['slotSettings.reel2ExtraDuration'],350);
  assert.equal(values['slotSettings.reel3ExtraDuration'],700);
  assert.equal(values['slotSettings.reel1Direction'],'down');
  assert.equal(values['slotSettings.animationStyle'],'slide');
  assert.deepEqual([values['slotSettings.reel1ResultIndex'],values['slotSettings.reel2ResultIndex'],values['slotSettings.reel3ResultIndex']],[7,7,7]);
});

test('ordinary slot wording can switch reels from text to generated pictures',()=>{
  const current=renderArchive('casino_slot_minigame',loadTemplates(archiveRoot).casino_slot_minigame,archiveRoot).config;
  const plan=applyDeterministicSlotIntent({changes:[],assetPrompts:[]},'Вместо цифр сделай на барабанах картинки и анимацию с переворотом.',current,'casino_slot_minigame');
  const values=Object.fromEntries(plan.changes.map(item=>[item.path,item.value]));
  assert.equal(values['slotSettings.symbolMode'],'image');
  assert.equal(values['slotSettings.animationStyle'],'flip');
});

test('builder synchronizes identical pick assets and derives after from before by image edit',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','src','builder.js'),'utf8');
  assert.match(source,/IDENTICAL_PICK_ASSET_MECHANICS=new Set\(\['casino_lucky_card','sweep_mystery_box'\]\)/);
  assert.match(source,/for\(let index=0;index<\(project\.config\.items\|\|\[\]\)\.length;index\+\+\)setPath\(project\.config,`items\.\$\{index\}\.image`,source\)/);
  assert.match(source,/pairedAfter\?'edit':'generate'/);
  assert.match(source,/image:pairedAfter\?await sourceToDataUrl\(beforeSource\):undefined/);
  assert.match(source,/Preserve the exact source identity, pose, clothing, camera, crop, light and background/);
});

test('old lucky-card and mystery-box configs are normalized to one shared transparent-ready asset',()=>{
  const templates=loadTemplates(archiveRoot);
  for(const id of ['casino_lucky_card','sweep_mystery_box']){
    const input=JSON.parse(JSON.stringify(templates[id]));
    input.items[0].image='/generated/shared.png';input.items[1].image='/generated/different-2.png';input.items[2].image='/generated/different-3.png';
    const output=renderArchive(id,input,archiveRoot,true);
    assert.deepEqual(output.config.items.map(item=>item.image),['/generated/shared.png','/generated/shared.png','/generated/shared.png']);
    assert.equal((output.preview.match(/\/generated\/shared\.png/g)||[]).length>=3,true);
  }
});

test('archive visual plan accepts safe style paths and rejects logic and executable CSS', () => {
  const plan = validateArchivePlan({ changes: [
    {path:'visual.rules.title.fontSize',value:42},
    {path:'visual.rules.card.background',value:'linear-gradient(135deg,#111,#333)'},
    {path:'visual.rules.wheel.transform',value:'rotate(0deg)'},
    {path:'behavior.rotation',value:1},
  ]});
  assert.deepEqual(plan.changes, [
    {path:'visual.rules.title.fontSize',value:42},
    {path:'visual.rules.card.background',value:'linear-gradient(135deg,#111,#333)'},
    {path:'visual.rules.wheel.transform',value:'rotate(0deg)'},
  ]);
});

test('archive editor exposes detailed layout controls but blocks element removal', () => {
  const templates=loadTemplates(archiveRoot);
  const current=renderArchive('casino_slot_minigame',templates.casino_slot_minigame,archiveRoot,true).config;
  const plan=validateArchivePlan({changes:[
    {path:'theme.background',value:'#130520'},
    {path:'design.backgroundBlur',value:0},
    {path:'design.cardBackdropBlur',value:4},
    {path:'visual.rules.container.width',value:'min(94vw,760px)'},
    {path:'visual.rules.centralPanel.width',value:'680px'},
    {path:'visual.rules.centralPanel.minHeight',value:'360px'},
    {path:'visual.rules.title.position',value:'relative'},
    {path:'visual.rules.title.left',value:'12px'},
    {path:'visual.rules.slotCell1.background',value:'#240a38'},
    {path:'visual.rules.slotCell2.transform',value:'translateY(-4px)'},
    {path:'visual.rules.primaryButton.display',value:'none'},
    {path:'visual.rules.primaryButton.background',value:'url(javascript:alert(1))'},
    {path:'behavior.symbols',value:'broken'},
  ]},current);
  assert.deepEqual(plan.changes.map(item=>item.path),[
    'theme.background','design.backgroundBlur','design.cardBackdropBlur','visual.rules.container.width','visual.rules.centralPanel.width','visual.rules.centralPanel.minHeight',
    'visual.rules.title.position','visual.rules.title.left','visual.rules.slotCell1.background','visual.rules.slotCell2.transform',
  ]);
  const edited=JSON.parse(JSON.stringify(current));
  for(const change of plan.changes){
    const parts=change.path.split('.');let target=edited;
    for(const part of parts.slice(0,-1))target=target[part]||(target[part]={});
    target[parts.at(-1)]=change.value;
  }
  const output=renderArchive('casino_slot_minigame',edited,archiveRoot,true);
  assert.deepEqual(output.config.behavior,templates.casino_slot_minigame.behavior);
  assert.equal(output.config.design.backgroundBlur,0);
  assert.match(output.preview,/body\.blur-bg::before,body::before\{filter:blur\(0px\)/);
  assert.match(output.preview,/\.container:not\(\.chat-container\)\{width:min\(100%,520px\)!important;max-width:520px!important/);
  assert.match(output.preview,/#s1\{background:#240a38!important\}/);
  assert.match(output.preview,/#s2\{transform:translateY\(-4px\)!important\}/);
  assert.match(output.preview,/\.card\{width:680px!important;min-height:360px!important\}/);
});

test('full-screen visual rules cannot cover the configured background image', () => {
  const output = renderArchive('adult_blurred_18_gate', {
    assets:{background:'/uploads/portrait.jpg'},
    visual:{rules:{page:{background:'#000000'},screen:{background:'#111111'},backgroundLayer:{background:'#222222',opacity:.8},overlay:{background:'linear-gradient(#0003,#0008)'}}},
  }, archiveRoot, true);
  assert.equal(output.config.assets.background, '/uploads/portrait.jpg');
  assert.equal(output.config.visual.rules.page, undefined);
  assert.equal(output.config.visual.rules.screen, undefined);
  assert.equal(output.config.visual.rules.backgroundLayer.background, undefined);
  assert.equal(output.config.visual.rules.backgroundLayer.opacity, .8);
  assert.equal(output.config.visual.rules.overlay.background, 'linear-gradient(#0003,#0008)');
  assert.match(output.preview, /\/uploads\/portrait\.jpg/);
});

test('main builder preview is allowed to execute protected mechanic scripts', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname,'..','public','builder.html'),'utf8');
  assert.match(html, /id="designFrame" sandbox="allow-scripts allow-forms"/);
  assert.match(html, /id="backgroundBlur"/);
  assert.match(html, /id="mediaBlur"/);
  assert.match(html, /id="clearBlurBtn"/);
});

test('pick-box archive mechanic can replace emojis with generated isolated objects', () => {
  const templates = loadTemplates(archiveRoot);
  const input = JSON.parse(JSON.stringify(templates.casino_pick_a_box));
  input.items[0].image = '/generated/gift-box.png';
  const output = renderArchive('casino_pick_a_box', input, archiveRoot, true);
  assert.match(output.preview, /pick-visual/);
  assert.match(output.preview, /gift-box\.png/);
  assert.deepEqual(output.config.behavior, templates.casino_pick_a_box.behavior);
});

test('countdown mechanic rejects hallucinated item edits and renders without an items list', () => {
  const templates=loadTemplates(archiveRoot);
  const current=renderArchive('betting_odds_countdown',templates.betting_odds_countdown,archiveRoot,true).config;
  assert.equal(current.items,undefined);
  const plan=validateArchivePlan({
    changes:[
      {path:'items.0.title',value:'Несуществующая карточка'},
      {path:'texts.title',value:'Новый коэффициент'},
      {path:'visual.rules.countdown.fontSize',value:48},
    ],
    assetPrompts:[
      {path:'items.0.image',prompt:'logo'},
      {path:'assets.background',prompt:'stadium'},
    ],
  },current);
  assert.deepEqual(plan.changes,[
    {path:'texts.title',value:'Новый коэффициент'},
    {path:'visual.rules.countdown.fontSize',value:48},
  ]);
  assert.deepEqual(plan.assetPrompts,[{path:'assets.background',prompt:'stadium'}]);
  const corrupted=renderArchive('betting_odds_countdown',{...current,items:{0:{title:'bad'}}},archiveRoot,true);
  assert.equal(corrupted.config.items,undefined);
  assert.match(corrupted.preview,/id="countdown"/);
});

test('archive AI can apply built-in and uploaded fonts without changing mechanic logic',()=>{
  const custom={name:'Brand Display',source:'/fonts/custom/11111111-1111-1111-1111-111111111111.woff2'};
  const output=renderArchive('casino_spin_wheel_win',{customFonts:[custom],visual:{rules:{title:{fontFamily:'Brand Display'},primaryButton:{fontFamily:'Montserrat'}}}},archiveRoot,true);
  assert.match(output.preview,/@font-face\{font-family:"Brand Display"/);
  assert.match(output.preview,/font-family:'Brand Display', Arial, sans-serif!important/);
  assert.match(output.files['theme.css'],/assets\/fonts\/custom-11111111-1111-1111-1111-111111111111\.woff2/);
  assert.match(output.files['theme.css'],/font-family:"Montserrat"/);
  assert.ok(output.fontAssets.some(item=>item.target==='montserrat-cyrillic-400-normal.woff2'));
  const plan=validateArchivePlan({changes:[{path:'visual.rules.title.fontFamily',value:'Oswald'}]},output.config);
  assert.equal(plan.changes.length,1);
});

test('explicit no-blur request deterministically overrides incomplete LLM plans',()=>{
  const plan=applyDeterministicBlurIntent({changes:[{path:'texts.title',value:'Чёткое изображение'}]},'Убери всё размытие, сделай фон и картинку чёткими');
  assert.deepEqual(Object.fromEntries(plan.changes.map(item=>[item.path,item.value])),{
    'texts.title':'Чёткое изображение','design.backgroundBlur':0,'design.backgroundScale':1,'design.mediaBlur':0,'design.cardBackdropBlur':0,
  });
});

test('premium lock icon is editable without changing unlock behavior',()=>{
  const templates=loadTemplates(archiveRoot);
  const input=JSON.parse(JSON.stringify(templates.adult_premium_unlock));
  input.texts.lockIcon='❤️';input.visual={rules:{lockIcon:{fontSize:76,transform:'rotate(-8deg)',background:'#0008',borderRadius:24,padding:10}}};
  const output=renderArchive('adult_premium_unlock',input,archiveRoot,true);
  assert.equal(output.config.texts.lockIcon,'❤️');
  assert.match(output.files['core_logic.js'],/class="lock-icon">\$\{config\.texts\.lockIcon \|\| "🔒"\}/);
  assert.match(output.preview,/\.lock-icon\{font-size:76px!important;transform:rotate\(-8deg\)!important/);
  assert.deepEqual(output.config.behavior,templates.adult_premium_unlock.behavior);
  const plan=validateArchivePlan({changes:[{path:'texts.lockIcon',value:'👑'},{path:'visual.rules.lockIcon.fontSize',value:64}]},output.config);
  assert.equal(plan.changes.length,2);
  const deterministic=applyDeterministicIconIntent({changes:[]},'Поменяй эмодзи замочка на сердечко');
  assert.deepEqual(deterministic.changes,[{path:'texts.lockIcon',value:'❤️'}]);
});

test('premium lock accepts a real overlay image and keeps the unlock behavior',()=>{
  const templates=loadTemplates(archiveRoot);
  const input=JSON.parse(JSON.stringify(templates.adult_premium_unlock));
  input.assets.lockImage='/uploads/generated-crown.png';
  input.visual={rules:{lockImage:{width:'110px',height:'110px',transform:'rotate(6deg)'}}};
  const output=renderArchive('adult_premium_unlock',input,archiveRoot,true);
  assert.equal(output.config.assets.lockImage,'/uploads/generated-crown.png');
  assert.match(output.files['core_logic.js'],/config\.assets\.lockImage \? `<img class="lock-image"/);
  assert.match(output.preview,/"lockImage":"\/uploads\/generated-crown\.png"/);
  assert.match(output.preview,/\.lock-image\{width:110px!important;height:110px!important;transform:rotate\(6deg\)!important/);
  assert.match(output.files['core_logic.js'],/id="unlock-btn"/);
  assert.deepEqual(output.config.behavior,templates.adult_premium_unlock.behavior);
});

test('chat preview renders a messenger layout and preserves the CTA redirect',()=>{
  const templates=loadTemplates(archiveRoot);
  const input=JSON.parse(JSON.stringify(templates.adult_dating_chat_preview));
  input.assets.avatarImage='/uploads/alice.png';
  const output=renderArchive('adult_dating_chat_preview',input,archiveRoot,true);
  assert.match(output.files['core_logic.js'],/class="chat-header"/);
  assert.match(output.files['core_logic.js'],/class="chat-bubble/);
  assert.match(output.files['core_logic.js'],/class="chat-bubble chat-incoming chat-typing"/);
  assert.match(output.files['core_logic.js'],/class="chat-composer" id="chat-open"/);
  assert.match(output.files['core_logic.js'],/qs\("#chat-open"\).*go\(config\.links\.primary\)/);
  assert.match(output.preview,/"avatarImage":"\/uploads\/alice\.png"/);
  assert.doesNotMatch(output.files['core_logic.js'],/function renderChatPreview\(config\).*class="notice"/);
});

test('scratch image and real copy occupy separate non-overlapping regions',()=>{
  const templates=loadTemplates(archiveRoot);
  const output=renderArchive('casino_scratch_bonus',templates.casino_scratch_bonus,archiveRoot,true);
  assert.match(output.preview,/\.scratch-visual \{[^}]*inset:0 0 56px;[^}]*height:calc\(100% - 56px\)/);
  assert.match(output.preview,/\.scratch-reveal-text \{[^}]*position:absolute;[^}]*bottom:0;[^}]*min-height:56px/);
  assert.match(output.preview,/\.scratch-cover-texture \{[^}]*inset:0 0 56px;[^}]*height:calc\(100% - 56px\)/);
  assert.match(output.preview,/\.scratch-cover-label \{[^}]*position:absolute;[^}]*bottom:0;[^}]*min-height:56px/);
});

test('text contrast request works even when the LLM returns no changes',()=>{
  const current={theme:{surface:'#FFFFFF',text:'#FFFFFF',muted:'#FFFFFF'},visual:{rules:{title:{color:'#FFFFFF'}}}};
  const plan=applyDeterministicContrastIntent({changes:[],assetPrompts:[]},'Текст белый на белом фоне, поменяй цвет текста',current);
  const changes=Object.fromEntries(plan.changes.map(item=>[item.path,item.value]));
  assert.equal(changes['theme.text'],'#111111');
  assert.equal(changes['theme.muted'],'#374151');
  assert.equal(changes['visual.rules.title.color'],'#111111');
});

test('changed light surfaces automatically receive readable text',()=>{
  const plan=applyAutomaticContrast({changes:[{path:'visual.rules.primaryButton.background',value:'#FFFFFF'},{path:'theme.surface',value:'#F8FAFC'}]},{});
  const changes=Object.fromEntries(plan.changes.map(item=>[item.path,item.value]));
  assert.equal(changes['visual.rules.primaryButton.color'],'#111111');
  assert.equal(changes['theme.text'],'#111111');
  assert.equal(changes['theme.muted'],'#374151');
});
