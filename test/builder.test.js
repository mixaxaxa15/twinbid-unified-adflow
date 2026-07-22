const test = require('node:test');
const assert = require('node:assert/strict');
const { renderBuilder, validateBuilderPlan, sanitizeProject } = require('../lib/builder');

const project = {
  id: 'demo', name: 'Demo', settings: { redirectUrl: 'https://example.com/offer' },
  scenes: [
    { id: 'one', name: 'One', html: '<button data-tb-id="go">Go</button>', css: 'button{color:red}' },
    { id: 'two', name: 'Two', html: '<h1>Done</h1>', css: '' },
  ],
  interactions: [{ id: 'i1', sceneId: 'one', sourceId: 'go', event: 'click', action: 'goScene', targetSceneId: 'two' }],
};

test('builder compiles scenes, protected tracking and redirect', () => {
  const output = renderBuilder(project);
  assert.equal(output.validation.ok, true);
  assert.match(output.html, /data-tb-scene="one"/);
  assert.match(output.files['core_logic.js'], /cta_click/);
  assert.match(output.files['core_logic.js'], /click_id/);
});

test('builder strips executable scripts from canvas content', () => {
  const dirty = structuredClone(project); dirty.scenes[0].html += '<script>alert(1)</script><img onerror="alert(2)">';
  const clean = sanitizeProject(dirty);
  assert.doesNotMatch(clean.scenes[0].html, /script|onerror/i);
});

test('AI builder plan accepts only supported operations', () => {
  const plan = validateBuilderPlan({ operations: [{ type: 'add_scene', name: 'Two' }, { type: 'write_javascript', code: 'bad' }] });
  assert.equal(plan.operations.length, 1);
});
