const $ = (selector) => document.querySelector(selector);
const clone = (value) => JSON.parse(JSON.stringify(value));
let templates = [];
let defaults = {};
let config = null;
let history = [];
let versions = [];
let selectedAssetSlot = '';
let renderTimer = null;
let archiveMode = null;
let archiveConfig = null;
let archiveHistory = [];
let archiveVersions = [];
let selectedArchiveAssetPath = '';

init().catch((error) => setStatus(error.message, true));

async function init() {
  const [response, archiveResponse] = await Promise.all([fetch('/api/prelands/templates'), fetch('/api/prelands/archive-templates')]);
  const data = await response.json(); const archiveData = await archiveResponse.json();
  templates = [...data.templates, ...archiveData.templates]; defaults = data.defaults;
  renderTemplates();
  const saved = JSON.parse(localStorage.getItem('twinbid-preland-project') || 'null');
  config = saved?.config || clone(defaults[templates[0].id]);
  history = saved?.history || [clone(config)]; versions = saved?.versions || [{ label: 'original', config: clone(config), at: Date.now() }];
  renderTemplates(); bindControls(); renderForm(); renderVersions(); await renderPreview();
  if (!data.llmConfigured) setStatus('Для AI добавьте OPENAI_API_KEY в .env');
}

function bindControls() {
  document.querySelectorAll('[data-path]').forEach((field) => field.addEventListener('input', () => {
    setPath(config, field.dataset.path, field.value); queueRender();
  }));
  document.querySelectorAll('[data-device]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-device]').forEach((item) => item.classList.toggle('active', item === button));
    $('#frameWrap').className = button.dataset.device;
  }));
  $('#saveBtn').addEventListener('click', () => saveVersion(`version ${versions.length}`));
  $('#copyBtn').addEventListener('click', () => saveVersion(`copy ${versions.length}`));
  $('#undoBtn').addEventListener('click', undo);
  $('#exportBtn').addEventListener('click', exportProject);
  $('#aiBtn').addEventListener('click', runAiPlan);
  $('#assetFile').addEventListener('change', uploadAsset);
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'preland-select') selectElement(event.data.kind, event.data.key);
    if (event.data?.type === 'preland-archive-select') {
      $('#archiveInspectorTitle').textContent = event.data.text || 'Выбранный элемент';
      $('.inspector').classList.add('open');
    }
  });
}

function renderTemplates() {
  $('#templates').replaceChildren(...templates.map((template) => {
    const active = template.source === 'archive' ? archiveMode?.id === template.id : !archiveMode && config?.templateId === template.id;
    const button = document.createElement('button'); button.className = `template ${active ? 'active' : ''}`;
    button.innerHTML = `<b>${template.name}</b><span>${template.vertical}</span><small>${template.description}</small>`;
    button.onclick = () => { const action = template.source === 'archive' ? switchArchive(template) : switchTemplate(template.id); Promise.resolve(action).catch((error) => setStatus(error.message, true)); }; return button;
  }));
}

function switchTemplate(id) {
  const wasArchive = Boolean(archiveMode);
  archiveMode = null; $('#standardInspector').classList.remove('hidden'); $('#archiveInspector').classList.add('hidden');
  if (config?.templateId === id && !wasArchive) return;
  if (config?.templateId === id && wasArchive) { renderTemplates(); renderForm(); renderVersions(); renderPreview(); return; }
  config = clone(defaults[id]); history = [clone(config)]; versions = [{ label: 'original', config: clone(config), at: Date.now() }];
  renderTemplates(); renderForm(); renderVersions(); renderPreview(); persist();
}

async function switchArchive(template) {
  archiveMode = template;
  $('#standardInspector').classList.add('hidden'); $('#archiveInspector').classList.remove('hidden');
  const saved = JSON.parse(localStorage.getItem(`twinbid-archive-${template.id}`) || 'null');
  if (saved) {
    archiveConfig = saved.config; archiveHistory = saved.history || [clone(archiveConfig)]; archiveVersions = saved.versions || [];
  } else {
    const response = await fetch(`/api/prelands/archive-config?id=${encodeURIComponent(template.id)}`); const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    archiveConfig = result.config; archiveHistory = [clone(archiveConfig)]; archiveVersions = [{ label: 'original', config: clone(archiveConfig), at: Date.now() }];
  }
  renderTemplates(); renderArchiveInspector(); await renderArchivePreview(); $('#versionLabel').textContent = archiveVersions.at(-1)?.label || 'archive';
  setStatus(`${template.vertical} · визуальный редактор активен`);
}

function renderForm() {
  document.querySelectorAll('[data-path]').forEach((field) => { field.value = getPath(config, field.dataset.path) || ''; });
  renderAssets();
}

function renderAssets() {
  const labels = { background_image: 'Фон', hero_character: 'Персонаж / главный объект', logo: 'Логотип' };
  $('#assetSlots').replaceChildren(...Object.entries(labels).map(([slot, label]) => {
    const box = document.createElement('div'); box.className = 'asset';
    const src = config.assets[slot]; box.innerHTML = `<b>${label}</b>${src ? `<img src="${escapeHtml(src)}" alt="">` : '<div style="height:45px"></div>'}<div class="asset-actions"><button data-upload>Загрузить</button><button data-generate>AI генерация</button><button data-clear>Удалить</button></div>`;
    box.querySelector('[data-upload]').onclick = () => { selectedAssetSlot = slot; $('#assetFile').click(); };
    box.querySelector('[data-generate]').onclick = () => generateAsset(slot).catch((error) => setStatus(error.message, true));
    box.querySelector('[data-clear]').onclick = () => { pushHistory(); config.assets[slot] = ''; renderAssets(); renderPreview(); };
    return box;
  }));
}

async function renderPreview() {
  if (archiveMode) return;
  clearTimeout(renderTimer);
  const response = await fetch('/api/prelands/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  config = result.config; $('#preview').srcdoc = result.preview;
  const checks = Object.values(result.validation.checks); $('#validationBadge').textContent = result.validation.ok ? `✓ Проверено ${checks.length}/${checks.length}` : 'Ошибка проверки';
  $('#validationBadge').className = result.validation.ok ? 'ok' : 'bad'; persist();
}

async function renderArchivePreview() {
  if (!archiveMode) return;
  const response = await fetch('/api/prelands/archive-render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: archiveMode.id, config: archiveConfig }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  archiveConfig = result.config; $('#preview').removeAttribute('src'); $('#preview').srcdoc = result.preview;
  $('#validationBadge').textContent = result.validation.ok ? '✓ Механика и tracking защищены' : 'Ошибка проверки'; $('#validationBadge').className = result.validation.ok ? 'ok' : 'bad';
  persistArchive();
}

function renderArchiveInspector() {
  const root = $('#archiveInspector');
  root.innerHTML = `<p class="eyebrow">КОНСТРУКТОР МЕХАНИКИ</p><h2 id="archiveInspectorTitle">${escapeHtml(archiveMode.name)}</h2><div id="selectionHint">Редактируйте любой параметр. Тип и последовательность механики защищены.</div>`;
  root.append(sectionFromFields('Тексты', Object.entries(archiveConfig.texts || {}).map(([key, value]) => ({ label: humanize(key), path: `texts.${key}`, value, area: String(value).length > 55 }))));
  root.append(sectionFromFields('Цвета', ['accent', 'accent2'].map((key) => ({ label: humanize(key), path: `theme.${key}`, value: archiveConfig.theme?.[key] || (key === 'accent' ? '#7c3aed' : '#22c55e'), type: 'color' }))));
  root.append(sectionFromFields('Расположение', [
    { label: 'Ширина контента', path: 'design.contentWidth', value: archiveConfig.design.contentWidth, type: 'number' },
    { label: 'Внутренние отступы', path: 'design.cardPadding', value: archiveConfig.design.cardPadding, type: 'number' },
    { label: 'Расстояние блоков', path: 'design.blockGap', value: archiveConfig.design.blockGap, type: 'number' },
    { label: 'Скругление', path: 'design.borderRadius', value: archiveConfig.design.borderRadius, type: 'number' },
    { label: 'Текст', path: 'design.textAlign', value: archiveConfig.design.textAlign, options: ['left','center','right'] },
    { label: 'По вертикали', path: 'design.verticalAlign', value: archiveConfig.design.verticalAlign, options: ['start','center','end'] },
  ]));
  root.append(sectionFromFields('Ссылки', Object.entries(archiveConfig.links || {}).map(([key, value]) => ({ label: `${humanize(key)} · защищено от AI`, path: `links.${key}`, value }))));
  const assetsSection = document.createElement('section'); assetsSection.className = 'archive-section'; assetsSection.innerHTML = '<h3>Картинки</h3>';
  for (const [key, value] of Object.entries(archiveConfig.assets || {})) assetsSection.append(archiveAssetCard(humanize(key), `assets.${key}`, value));
  (archiveConfig.items || []).forEach((item, index) => { if (item.image) assetsSection.append(archiveAssetCard(`Карточка ${index + 1}`, `items.${index}.image`, item.image)); });
  root.append(assetsSection);
  (archiveConfig.items || []).forEach((item, index) => root.append(sectionFromFields(`Карточка ${index + 1}`, Object.entries(item).filter(([key]) => !['image','url'].includes(key)).map(([key, value]) => ({ label: humanize(key), path: `items.${index}.${key}`, value })) .concat(item.url ? [{ label: 'URL', path: `items.${index}.url`, value: item.url }] : []))));
  (archiveConfig.questions || []).forEach((question, qIndex) => root.append(sectionFromFields(`Вопрос ${qIndex + 1}`, [{ label: 'Текст вопроса', path: `questions.${qIndex}.title`, value: question.title }, ...question.options.map((option, oIndex) => ({ label: `Ответ ${oIndex + 1}`, path: `questions.${qIndex}.options.${oIndex}.label`, value: option.label }))])));
  const versionsSection = document.createElement('section'); versionsSection.className = 'archive-section'; versionsSection.innerHTML = '<h3>Версии</h3><div id="archiveVersions"></div>'; root.append(versionsSection);
  root.querySelectorAll('[data-archive-path]').forEach((field) => field.addEventListener('change', () => {
    pushArchiveHistory(); setPath(archiveConfig, field.dataset.archivePath, field.type === 'number' ? Number(field.value) : field.value); renderArchivePreview();
  }));
  renderArchiveVersions();
}

function sectionFromFields(title, fields) {
  const section = document.createElement('section'); section.className = 'archive-section'; section.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
  for (const field of fields) {
    const label = document.createElement('label'); label.className = 'archive-field'; label.textContent = field.label;
    let input;
    if (field.options) { input = document.createElement('select'); for (const option of field.options) input.add(new Option(option, option)); }
    else if (field.area) input = document.createElement('textarea');
    else { input = document.createElement('input'); input.type = field.type || 'text'; }
    input.value = field.value ?? ''; input.dataset.archivePath = field.path; label.append(input); section.append(label);
  }
  return section;
}

function archiveAssetCard(label, path, source) {
  const card = document.createElement('div'); card.className = 'archive-asset';
  const previewSource = source?.startsWith('./assets/') ? `/prelander-library/${archiveMode.id}/assets/${source.slice(9)}` : source;
  card.innerHTML = `<b>${escapeHtml(label)}</b>${previewSource ? `<img src="${escapeHtml(previewSource)}" alt="">` : ''}<div class="asset-actions"><button data-upload>Загрузить</button><button data-ai>AI генерация</button><button data-clear>Удалить</button></div>`;
  card.querySelector('[data-upload]').onclick = () => { selectedArchiveAssetPath = path; $('#assetFile').click(); };
  card.querySelector('[data-ai]').onclick = () => generateArchiveAsset(path).catch((error) => setStatus(error.message, true));
  card.querySelector('[data-clear]').onclick = () => { pushArchiveHistory(); setPath(archiveConfig, path, ''); saveVersion('asset removed'); renderArchiveInspector(); renderArchivePreview(); };
  return card;
}

function queueRender() { clearTimeout(renderTimer); renderTimer = setTimeout(() => { pushHistory(); renderPreview(); }, 350); }

function selectElement(kind, key) {
  const titles = { headline: 'Заголовок', subtitle: 'Подзаголовок', primary_cta: 'CTA-кнопка', hero_character: 'Персонаж', background_image: 'Фон', logo: 'Логотип', mechanic: 'Механика' };
  $('#selectionTitle').textContent = titles[key] || key;
  $('#selectionHint').textContent = kind === 'block' ? 'Логика этого блока защищена; доступно изменение темы и assets.' : 'Измените значение в панели ниже.';
  $('.inspector').classList.add('open');
  const path = key === 'primary_cta' ? 'text.cta' : kind === 'text' ? `text.${key}` : kind === 'asset' ? null : null;
  if (path) document.querySelector(`[data-path="${path}"]`)?.focus();
  if (kind === 'asset') document.querySelectorAll('.asset')[['background_image','hero_character','logo'].indexOf(key)]?.scrollIntoView({ behavior: 'smooth' });
}

async function runAiPlan() {
  const prompt = $('#aiPrompt').value.trim(); if (!prompt) return setStatus('Введите запрос для AI', true);
  if (archiveMode) return runArchiveAiPlan(prompt);
  toggleBusy(true); setStatus('LLM формирует безопасный план изменений…');
  try {
    const response = await fetch('/api/prelands/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, config }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    pushHistory();
    for (const change of result.plan.changes) setPath(config, change.path, change.value);
    for (const asset of result.plan.assetPrompts) await generateAsset(asset.slot, asset.prompt, false);
    saveVersion(`AI version ${versions.length}`, result.plan.summary); renderForm(); await renderPreview(); setStatus(`${result.plan.summary} · ${result.model}`);
  } catch (error) { setStatus(error.message, true); } finally { toggleBusy(false); }
}

async function runArchiveAiPlan(prompt) {
  toggleBusy(true); setStatus('LLM проектирует изменения всей механики…');
  try {
    const response = await fetch('/api/prelands/archive-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: archiveMode.id, prompt, config: archiveConfig }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    pushArchiveHistory();
    for (const change of result.plan.changes) setPath(archiveConfig, change.path, change.value);
    for (const asset of result.plan.assetPrompts) await generateArchiveAsset(asset.path, asset.prompt, false);
    saveVersion(`AI version ${archiveVersions.length}`, result.plan.summary); renderArchiveInspector(); await renderArchivePreview(); setStatus(`${result.plan.summary} · ${result.model}`);
  } catch (error) { setStatus(error.message, true); } finally { toggleBusy(false); }
}

async function generateArchiveAsset(path, providedPrompt = '', createVersion = true) {
  const prompt = providedPrompt || window.prompt(`Опишите новую картинку для «${path}»`); if (!prompt) return;
  setStatus(`Atlas генерирует ${path}…`);
  const background = /background/i.test(path);
  const transparent = /lockImage/i.test(path);
  const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    mode: 'generate', prompt: `${prompt}. Visual asset for ${archiveMode.vertical} advertising preland, no random text.${transparent?' Exactly one isolated object on a genuine transparent alpha background; no white, black, colored, gradient or checkered backdrop, no scene or frame.':''}`, count: 1, size: background ? '1152*2048' : '1536*1536', format: 'png', adult: archiveMode.vertical.startsWith('Adult'), adultConfirmed: archiveMode.vertical.startsWith('Adult'),
  }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  if (createVersion) pushArchiveHistory();
  setPath(archiveConfig, path, `/api/image?url=${encodeURIComponent(result.images[0].url)}`);
  if (createVersion) saveVersion(`asset ${path}`);
  renderArchiveInspector(); await renderArchivePreview();
}

async function generateAsset(slot, providedPrompt = '', createVersion = true) {
  const prompt = providedPrompt || window.prompt(`Опишите asset «${slot}»`); if (!prompt) return;
  setStatus(`Atlas генерирует ${slot}…`);
  const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    mode: 'generate', prompt: `${prompt}. Asset for advertising preland, no random text, clean composition.`, count: 1, size: slot === 'background_image' ? '1152*2048' : '1536*1536', format: 'png', adult: config.templateId === 'adult-reveal', adultConfirmed: config.templateId === 'adult-reveal',
  }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  if (createVersion) pushHistory();
  config.assets[slot] = `/api/image?url=${encodeURIComponent(result.images[0].url)}`;
  if (createVersion) saveVersion(`asset ${slot}`);
  renderAssets(); await renderPreview();
}

async function uploadAsset(event) {
  const file = event.target.files[0]; if (!file || (!selectedAssetSlot && !selectedArchiveAssetPath)) return;
  if (file.size > 10 * 1024 * 1024) return setStatus('Asset больше 10 МБ', true);
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  if (archiveMode && selectedArchiveAssetPath) {
    pushArchiveHistory(); setPath(archiveConfig, selectedArchiveAssetPath, data); saveVersion(`upload ${selectedArchiveAssetPath}`); renderArchiveInspector(); await renderArchivePreview(); event.target.value = ''; selectedArchiveAssetPath = ''; return;
  }
  pushHistory(); config.assets[selectedAssetSlot] = data; saveVersion(`upload ${selectedAssetSlot}`); renderAssets(); await renderPreview(); event.target.value = '';
}

function saveVersion(label, summary = '') {
  if (archiveMode) {
    archiveVersions.push({ label, summary, config: clone(archiveConfig), at: Date.now() });
    $('#versionLabel').textContent = label; renderArchiveVersions(); persistArchive(); return;
  }
  versions.push({ label, summary, config: clone(config), at: Date.now() });
  $('#versionLabel').textContent = label; renderVersions(); persist();
}

function renderVersions() {
  $('#versions').replaceChildren(...versions.map((version, index) => {
    const row = document.createElement('div'); row.className = 'version'; row.innerHTML = `<span><b>${version.label}</b><small>${new Date(version.at).toLocaleTimeString()}</small></span><button>Открыть</button>`;
    row.querySelector('button').onclick = () => { pushHistory(); config = clone(version.config); $('#versionLabel').textContent = version.label; renderForm(); renderPreview(); };
    return row;
  }));
}

function pushHistory() { if (!config) return; history.push(clone(config)); if (history.length > 30) history.shift(); persist(); }
function undo() {
  if (archiveMode) { if (!archiveHistory.length) return; archiveConfig = clone(archiveHistory.pop()); renderArchiveInspector(); renderArchivePreview(); persistArchive(); return; }
  if (history.length < 2) return; history.pop(); config = clone(history.at(-1)); renderForm(); renderPreview();
}

function pushArchiveHistory() { archiveHistory.push(clone(archiveConfig)); if (archiveHistory.length > 30) archiveHistory.shift(); persistArchive(); }
function persistArchive() { if (archiveMode && archiveConfig) localStorage.setItem(`twinbid-archive-${archiveMode.id}`, JSON.stringify({ config: archiveConfig, history: archiveHistory, versions: archiveVersions })); }
function renderArchiveVersions() {
  const root = $('#archiveVersions'); if (!root) return;
  root.replaceChildren(...archiveVersions.map((version) => {
    const row = document.createElement('div'); row.className = 'version'; row.innerHTML = `<span><b>${escapeHtml(version.label)}</b><small>${new Date(version.at).toLocaleTimeString()}</small></span><button>Открыть</button>`;
    row.querySelector('button').onclick = () => { pushArchiveHistory(); archiveConfig = clone(version.config); $('#versionLabel').textContent = version.label; renderArchiveInspector(); renderArchivePreview(); }; return row;
  }));
}

async function exportProject() {
  toggleBusy(true);
  try {
    const response = archiveMode
      ? await fetch('/api/prelands/archive-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: archiveMode.id, config: archiveConfig }) })
      : await fetch('/api/prelands/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
    if (!response.ok) throw new Error((await response.json()).error);
    const link = document.createElement('a'); link.href = URL.createObjectURL(await response.blob()); link.download = archiveMode ? `${archiveMode.id}.zip` : `preland-${config.templateId}.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) { setStatus(error.message, true); } finally { toggleBusy(false); }
}

function persist() { if (config) localStorage.setItem('twinbid-preland-project', JSON.stringify({ config, history, versions })); }
function setStatus(message, error = false) { $('#aiStatus').textContent = message; $('#aiStatus').style.color = error ? '#b83333' : ''; }
function toggleBusy(value) { $('#aiBtn').disabled = value; $('#exportBtn').disabled = value; }
function getPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) { const keys = path.split('.'); const leaf = keys.pop(); keys.reduce((item, key) => item[key], object)[leaf] = value; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function humanize(value) { return String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase()); }
