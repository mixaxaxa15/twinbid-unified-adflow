const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server } = require('../server');

test('archive upload stores a real local file and places it into the rendered background', async (t) => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const response = await fetch(`http://127.0.0.1:${address.port}/api/prelands/archive-upload-asset`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:'adult_blurred_18_gate',config:{},image,target:'assets.background'}),
  });
  const result = await response.json();
  assert.equal(response.status, 200, result.error);
  assert.match(result.source, /^\/uploads\/[a-f0-9-]+\.png$/);
  assert.equal(result.config.assets.background, result.source);
  const stored = path.join(__dirname,'..','public',result.source.replace(/^\//,''));
  assert.equal(fs.existsSync(stored), true);
  fs.unlinkSync(stored);
});

test('custom font upload validates and stores a real font file', async (t) => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address=server.address();
  const bytes=fs.readFileSync(path.join(__dirname,'..','public','fonts','inter-latin-400-normal.woff2'));
  const response=await fetch(`http://127.0.0.1:${address.port}/api/fonts/upload`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test Brand Font',fileName:'brand.woff2',data:`data:font/woff2;base64,${bytes.toString('base64')}`})});
  const result=await response.json();
  assert.equal(response.status,200,result.error);
  assert.equal(result.font.name,'Test Brand Font');
  assert.match(result.font.source,/^\/fonts\/custom\/[a-f0-9-]+\.woff2$/);
  const stored=path.join(__dirname,'..','public',result.font.source.replace(/^\//,''));
  assert.equal(fs.existsSync(stored),true);
  fs.unlinkSync(stored);
});
