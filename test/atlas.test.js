const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRequest, MODELS, unwrap, extractOutputs } = require('../lib/atlas');

test('uses cheap FLUX Schnell for MVP generation and Seedream for edits', () => {
  assert.equal(MODELS.generate, 'black-forest-labs/flux-schnell');
  assert.equal(MODELS.edit, 'bytedance/seedream-v5.0-pro/edit');
});

test('normalizes every Atlas output field used by image models', () => {
  assert.deepEqual(extractOutputs({ output: ['https://example.com/a.png'] }), ['https://example.com/a.png']);
  assert.deepEqual(extractOutputs({ outputs: ['https://example.com/b.png'] }), ['https://example.com/b.png']);
  assert.deepEqual(extractOutputs({ images: [{ url: 'https://example.com/c.png' }] }), ['https://example.com/c.png']);
});

test('validates a normal generation', () => {
  const value = validateRequest({ prompt: 'Advertising poster', mode: 'generate', count: 2, size: '1536*1536', format: 'png' });
  assert.equal(value.count, 2); assert.equal(value.format, 'png');
});

test('accepts model canvases for all advertising formats', () => {
  for (const size of ['1800*600', '1200*1000', '1024*2048', '2920*360', '1536*1536']) {
    assert.equal(validateRequest({ prompt: 'Ad creative', mode: 'generate', count: 1, size }).size, size);
  }
});

test('requires an image for edit', () => {
  assert.throws(() => validateRequest({ prompt: 'Change background', mode: 'edit', count: 1, size: '1536*1536' }), /загрузите/i);
});

test('blocks disallowed adult prompts', () => {
  assert.throws(() => validateRequest({ prompt: 'teen explicit image', mode: 'generate', count: 1, size: '1536*1536', adult: true, adultConfirmed: true }), /отклонён/i);
  assert.throws(() => validateRequest({ prompt: 'Use a real person for this portrait', mode: 'generate', count: 1, size: '1536*1536', adult: true, adultConfirmed: true }), /отклонён/i);
});

test('adult policy accepts explicit safety clauses in generated asset prompts', () => {
  const prompt='One fictional adult subject, non-explicit advertising-safe presentation, and not resemble a real person.';
  assert.equal(validateRequest({prompt,mode:'generate',count:1,size:'1024*1024',adult:true,adultConfirmed:true}).prompt,prompt);
});

test('unwraps Atlas response envelope', () => {
  assert.deepEqual(unwrap({ code: 200, data: { id: 'abc' } }), { id: 'abc' });
});
