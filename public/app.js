const $ = (selector) => document.querySelector(selector);
const form = $('#generatorForm');
let imageData = '';
let sourceImage = null;
const cropState = { zoom: 1, x: 0, y: 0, dragging: false, pointerX: 0, pointerY: 0 };

const PLACEMENTS = {
  native: {
    note: 'Нативная реклама · квадрат 1:1 с пользовательским размером',
    sizes: [{ label: '1:1 · пользовательский', model: '1536*1536', width: 300, height: 300 }],
    prompt: 'Квадратный креатив для нативной рекламы, важные объекты по центру, композиция должна оставаться читаемой после уменьшения до 200×200 пикселей.',
  },
  banner: {
    note: 'Баннер · результат скачивается в точном выбранном размере',
    sizes: [
      { label: '300×100', model: '1800*600', width: 300, height: 100 },
      { label: '300×250', model: '1200*1000', width: 300, height: 250 },
      { label: '300×600', model: '1024*2048', width: 300, height: 600 },
      { label: '728×90', model: '2920*360', width: 728, height: 90 },
    ],
    prompt: 'Рекламный баннер. Учитывай очень компактный рекламный формат: один главный объект, крупные элементы, высокая контрастность, без мелких деталей и мелкого текста.',
  },
  push: {
    note: 'In-page push · 192×192 px',
    sizes: [{ label: '192×192 · 1:1', model: '1536*1536', width: 192, height: 192 }],
    prompt: 'Квадратная иконка для in-page push рекламы 192×192: один крупный центральный объект, простой фон, высокая контрастность, без текста и мелких деталей.',
  },
};

function setPlacement(name) {
  const config = PLACEMENTS[name];
  $('#placement').value = name;
  document.querySelectorAll('.placement-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.placement === name));
  $('#size').replaceChildren(...config.sizes.map((size) => {
    const option = new Option(size.label, size.model);
    option.dataset.width = size.width; option.dataset.height = size.height;
    return option;
  }));
  $('#formatNote').textContent = config.note;
  $('#nativeSizeField').classList.toggle('hidden', name !== 'native');
  if (sourceImage) resetCrop();
}

document.querySelectorAll('.placement-tab').forEach((tab) => tab.addEventListener('click', () => setPlacement(tab.dataset.placement)));
setPlacement('native');

$('#nativeSize').addEventListener('input', (event) => {
  const value = Math.max(200, Math.min(4096, Number(event.target.value) || 200));
  $('#nativeSizeOutput').textContent = `${value} px`;
});
$('#size').addEventListener('change', () => { if (sourceImage) resetCrop(); });

fetch('/api/health').then((r) => r.json()).then(({ configured }) => {
  $('#statusDot').className = `dot ${configured ? 'ok' : 'bad'}`;
  $('#apiStatus').textContent = configured ? 'Atlas API подключён' : 'Нужен API-ключ';
}).catch(() => { $('#apiStatus').textContent = 'Сервис недоступен'; $('#statusDot').className = 'dot bad'; });

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
  $('#mode').value = tab.dataset.mode;
  $('#uploadField').classList.toggle('hidden', tab.dataset.mode !== 'edit');
  $('#submitBtn span:first-child').textContent = tab.dataset.mode === 'edit' ? 'Изменить изображение' : 'Создать креативы';
}));

$('#prompt').addEventListener('input', (event) => { $('#charCount').textContent = `${event.target.value.length} / 5000`; });
$('#exampleBtn').addEventListener('click', () => {
  $('#prompt').value = 'Премиальный рекламный постер мобильного приложения, тёмно-графитовый фон, золотые акценты, динамичная композиция, выразительный центральный объект, свободная зона под заголовок и яркую CTA-кнопку, без случайного текста';
  $('#prompt').dispatchEvent(new Event('input'));
});
$('#adult').addEventListener('change', (event) => $('#adultConfirmRow').classList.toggle('hidden', !event.target.checked));

$('#imageInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 30 * 1024 * 1024) return showError('Файл больше 30 МБ.');
  imageData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  sourceImage = await loadImage(imageData);
  $('#uploadPreview').src = imageData;
  $('.dropzone').classList.add('has-image');
  $('#cropEditor').classList.remove('hidden');
  resetCrop();
});

document.querySelectorAll('input[name="editFitMode"]').forEach((radio) => radio.addEventListener('change', () => {
  const reference = selectedFitMode() === 'reference';
  $('#cropStage').classList.toggle('reference', reference);
  $('#cropZoom').disabled = reference;
  $('#cropReset').disabled = reference;
  $('#cropHelp').textContent = reference ? 'В Atlas будет отправлен исходный файл целиком как референс.' : 'Перетаскивайте изображение внутри рамки.';
}));

$('#cropZoom').addEventListener('input', (event) => { cropState.zoom = Number(event.target.value); constrainCrop(); drawCrop(); });
$('#cropReset').addEventListener('click', resetCrop);
$('#cropStage').addEventListener('pointerdown', (event) => {
  if (!sourceImage || selectedFitMode() === 'reference') return;
  cropState.dragging = true; cropState.pointerX = event.clientX; cropState.pointerY = event.clientY;
  $('#cropStage').setPointerCapture(event.pointerId);
});
$('#cropStage').addEventListener('pointermove', (event) => {
  if (!cropState.dragging) return;
  const canvas = $('#cropCanvas');
  const bounds = canvas.getBoundingClientRect();
  cropState.x += (event.clientX - cropState.pointerX) * canvas.width / bounds.width;
  cropState.y += (event.clientY - cropState.pointerY) * canvas.height / bounds.height;
  cropState.pointerX = event.clientX; cropState.pointerY = event.clientY;
  constrainCrop(); drawCrop();
});
['pointerup', 'pointercancel'].forEach((name) => $('#cropStage').addEventListener(name, () => { cropState.dragging = false; }));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const mode = $('#mode').value;
  if (mode === 'edit' && !imageData) return showError('Загрузите исходное изображение.');
  setLoading(true);
  try {
    const placement = $('#placement').value;
    const selectedSize = $('#size').selectedOptions[0];
    const nativeSide = Number($('#nativeSize').value);
    if (placement === 'native' && (!Number.isInteger(nativeSide) || nativeSide < 200 || nativeSide > 4096)) {
      throw new Error('Для native укажите целую сторону от 200 до 4096 px.');
    }
    const targetWidth = placement === 'native' ? nativeSide : Number(selectedSize.dataset.width);
    const targetHeight = placement === 'native' ? nativeSide : Number(selectedSize.dataset.height);
    const target = { width: targetWidth, height: targetHeight, placement };
    const modelSize = placement === 'native' && nativeSide > 1536 ? '2048*2048' : $('#size').value;
    const finalPrompt = `${$('#prompt').value.trim()}\n\nТехническое требование: ${PLACEMENTS[placement].prompt} Целевой размер: ${target.width}×${target.height}px.`;
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      mode, prompt: finalPrompt, count: Number($('#count').value), size: modelSize,
      format: $('#format').value, adult: $('#adult').checked, adultConfirmed: $('#adultConfirmed').checked,
      image: mode === 'edit' ? getEditImage() : '',
    }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Ошибка генерации.');
    renderGallery(result.images, target);
  } catch (error) { showError(error.message); $('#emptyState').classList.remove('hidden'); }
  finally { setLoading(false); }
});

$('#clearBtn').addEventListener('click', () => { $('#gallery').replaceChildren(); $('#gallery').classList.add('hidden'); $('#emptyState').classList.remove('hidden'); });

function setLoading(active) {
  $('#submitBtn').disabled = active;
  $('#errorBox').classList.add('hidden');
  $('#loader').classList.toggle('hidden', !active);
  $('#emptyState').classList.add('hidden');
  if (active) $('#gallery').classList.add('hidden');
}
function showError(message) { $('#errorBox').textContent = message; $('#errorBox').classList.remove('hidden'); }
function renderGallery(images, target) {
  const gallery = $('#gallery'); gallery.replaceChildren();
  for (const [index, image] of images.entries()) {
    const card = $('#cardTemplate').content.cloneNode(true);
    const proxyUrl = `/api/image?url=${encodeURIComponent(image.url)}`;
    const preview = card.querySelector('img');
    preview.src = proxyUrl;
    preview.referrerPolicy = 'no-referrer';
    preview.addEventListener('error', async () => {
      let message = 'Не удалось загрузить изображение Atlas.';
      try {
        const response = await fetch(proxyUrl);
        const result = await response.json();
        if (result.error) message = result.error;
      } catch {}
      const notice = document.createElement('div');
      notice.className = 'image-error';
      notice.style.cssText = 'aspect-ratio:1;display:grid;place-items:center;padding:20px;text-align:center;background:#fff0ee;color:#9b2c2c;font-size:12px;line-height:1.45';
      notice.textContent = message;
      preview.replaceWith(notice);
    }, { once: true });
    card.querySelector('.result-index').textContent = `Вариант ${index + 1}`;
    card.querySelector('a').href = proxyUrl;
    card.querySelector('.download-result').addEventListener('click', () => downloadExact(proxyUrl, target, index));
    gallery.append(card);
  }
  gallery.classList.remove('hidden');
}

async function downloadExact(source, target, index) {
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = target.width; canvas.height = target.height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const scale = Math.max(target.width / image.naturalWidth, target.height / image.naturalHeight);
    const sourceWidth = target.width / scale;
    const sourceHeight = target.height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, target.width, target.height);
    const mime = $('#format').value === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${target.placement}-${target.width}x${target.height}-${index + 1}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) { showError(`Не удалось подготовить файл: ${error.message}`); }
}

function selectedFitMode() { return document.querySelector('input[name="editFitMode"]:checked').value; }

function currentTargetRatio() {
  if ($('#placement').value === 'native') return 1;
  const option = $('#size').selectedOptions[0];
  return Number(option.dataset.width) / Number(option.dataset.height);
}

function configureCropCanvas() {
  const canvas = $('#cropCanvas');
  const ratio = currentTargetRatio();
  const longest = 800;
  if (ratio >= 1) { canvas.width = longest; canvas.height = Math.max(1, Math.round(longest / ratio)); }
  else { canvas.height = longest; canvas.width = Math.max(1, Math.round(longest * ratio)); }
}

function resetCrop() {
  if (!sourceImage) return;
  configureCropCanvas();
  cropState.zoom = 1; cropState.x = 0; cropState.y = 0;
  $('#cropZoom').value = '1';
  drawCrop();
}

function cropMetrics() {
  const canvas = $('#cropCanvas');
  const baseScale = Math.max(canvas.width / sourceImage.naturalWidth, canvas.height / sourceImage.naturalHeight);
  const scale = baseScale * cropState.zoom;
  return { canvas, width: sourceImage.naturalWidth * scale, height: sourceImage.naturalHeight * scale };
}

function constrainCrop() {
  if (!sourceImage) return;
  const { canvas, width, height } = cropMetrics();
  const limitX = Math.max(0, (width - canvas.width) / 2);
  const limitY = Math.max(0, (height - canvas.height) / 2);
  cropState.x = Math.max(-limitX, Math.min(limitX, cropState.x));
  cropState.y = Math.max(-limitY, Math.min(limitY, cropState.y));
}

function drawCrop() {
  if (!sourceImage) return;
  const { canvas, width, height } = cropMetrics();
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceImage, (canvas.width - width) / 2 + cropState.x, (canvas.height - height) / 2 + cropState.y, width, height);
}

function getEditImage() {
  if (selectedFitMode() === 'reference') return imageData;
  const preview = $('#cropCanvas');
  const ratio = preview.width / preview.height;
  const output = document.createElement('canvas');
  if (ratio >= 1) { output.width = 2048; output.height = Math.max(1, Math.round(2048 / ratio)); }
  else { output.height = 2048; output.width = Math.max(1, Math.round(2048 * ratio)); }
  output.getContext('2d').drawImage(preview, 0, 0, output.width, output.height);
  return output.toDataURL('image/jpeg', 0.94);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source;
  });
}
