const API_BASE = 'https://api.atlascloud.ai/api/v1/model';

const MODELS = Object.freeze({
  // Fast, inexpensive draft model for the MVP. Keep edit on Seedream because
  // FLUX Schnell is text-to-image only.
  generate: process.env.ATLAS_IMAGE_MODEL || 'black-forest-labs/flux-schnell',
  edit: 'bytedance/seedream-v5.0-pro/edit',
});

const ALLOWED_SIZES = new Set([
  '1024*1024', '1536*1536', '1776*1328', '1328*1776',
  '2048*1152', '1152*2048', '2048*2048', '2304*1728',
  '1728*2304', '2720*1530', '1530*2720', '2496*1664', '1664*2496',
  '1800*600', '1200*1000', '1024*2048', '2920*360',
]);

const FORBIDDEN_ADULT_PATTERNS = [
  /\b(?:minor|underage|child|kid|teen|teenage|schoolgirl|schoolboy|young-looking)\b/i,
  /\b(?:csam|rape|forced|coercion|non[- ]?consensual)\b/i,
  /\b(?:nudify|deepfake|celebrity|public figure|real person)\b/i,
  /\b(?:несовершеннолет|реб[её]нок|детск|подрост|школьниц|школьник)\b/i,
  /\b(?:изнасил|принужд|без согласия|дипфейк|знаменитост|реальн(?:ый|ого) человек)\b/i,
];

function adultPolicyText(prompt) {
  // Safety prompts frequently state prohibitions using the same terms that the
  // policy blocks. Remove only clear negated clauses so "not a real person"
  // is accepted while an affirmative request for a real person is still denied.
  return String(prompt)
    .replace(/\b(?:not|never)\s+(?:resemble|depict|use|show|include)\s+(?:an?\s+)?(?:specific\s+)?real person\b/gi, '')
    .replace(/\bno\s+(?:minors?|children|underage persons?|real persons?)\b/gi, '')
    .replace(/\bwithout\s+(?:minors?|children|underage persons?|real persons?)\b/gi, '');
}

function validateRequest(body) {
  const prompt = String(body.prompt || '').trim();
  const mode = body.mode === 'edit' ? 'edit' : 'generate';
  const count = Number(body.count);
  const size = String(body.size || '1536*1536');
  const format = body.format === 'png' ? 'png' : 'jpeg';
  const adult = body.adult === true;

  if (!prompt || prompt.length > 5000) throw new Error('Промпт обязателен и должен быть короче 5000 символов.');
  if (![1, 2, 4].includes(count)) throw new Error('Количество изображений: 1, 2 или 4.');
  if (!ALLOWED_SIZES.has(size)) throw new Error('Выбран неподдерживаемый размер.');
  if (adult && !body.adultConfirmed) throw new Error('Подтвердите, что все персонажи вымышленные и совершеннолетние.');
  if (adult && FORBIDDEN_ADULT_PATTERNS.some((pattern) => pattern.test(adultPolicyText(prompt)))) {
    throw new Error('Запрос отклонён политикой adult-контента TwinBid.');
  }
  if (mode === 'edit') {
    const image = String(body.image || '');
    if (!/^data:image\/(?:png|jpeg|webp|gif|bmp);base64,/i.test(image)) {
      throw new Error('Для редактирования загрузите PNG, JPEG, WEBP, GIF или BMP.');
    }
    if (image.length > 42_000_000) throw new Error('Изображение слишком большое (максимум около 30 МБ).');
  }

  return { prompt, mode, count, size, format, adult, image: body.image };
}

function unwrap(payload) {
  return payload && typeof payload === 'object' && payload.data ? payload.data : payload;
}

async function atlasFetch(path, apiKey, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code && payload.code >= 400)) {
    const message = payload.message || payload.error || unwrap(payload)?.error || `Atlas API: HTTP ${response.status}`;
    throw new Error(message);
  }
  return unwrap(payload);
}

function extractOutputs(result) {
  const candidates = [result?.outputs, result?.output, result?.images, result?.urls?.result];
  return candidates.flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .map((value) => typeof value === 'string' ? value : value?.url)
    .filter((value) => typeof value === 'string' && /^https:\/\//i.test(value));
}

async function waitForPrediction(id, apiKey, { timeoutMs = 180000, intervalMs = 1000, onEvent = () => {} } = {}) {
  const deadline = Date.now() + timeoutMs;
  let previousStatus = '';
  while (Date.now() < deadline) {
    const result = await atlasFetch(`/prediction/${encodeURIComponent(id)}`, apiKey);
    if (result.status !== previousStatus) {
      previousStatus = result.status;
      onEvent({ phase: 'status', id, status: result.status });
    }
    if (['completed', 'succeeded'].includes(result.status)) {
      const outputs = extractOutputs(result);
      if (!outputs.length) throw new Error('Atlas завершил задачу, но не вернул URL изображения.');
      return { ...result, outputs };
    }
    if (result.status === 'failed') throw new Error(result.error || 'Atlas не смог создать изображение.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Atlas не завершил запрос за 3 минуты. Задача могла продолжить выполняться на стороне сервиса.');
}

async function runOne(input, apiKey, options = {}) {
  const body = {
    model: MODELS[input.mode],
    prompt: input.prompt,
    size: input.size,
    output_format: input.format,
    enable_base64_output: false,
  };
  if (input.mode === 'edit') body.images = [input.image];
  const submitted = await atlasFetch('/generateImage', apiKey, { method: 'POST', body: JSON.stringify(body) });
  if (!submitted?.id) throw new Error('Atlas не вернул идентификатор задачи.');
  options.onEvent?.({ phase: 'submitted', id: submitted.id, model: body.model, size: body.size });
  return waitForPrediction(submitted.id, apiKey, options);
}

async function generateBatch(input, apiKey, options = {}) {
  return Promise.all(Array.from({ length: input.count }, () => runOne(input, apiKey, options)));
}

module.exports = { MODELS, ALLOWED_SIZES, validateRequest, unwrap, extractOutputs, generateBatch };
