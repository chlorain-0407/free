import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { PROMPTS, CATEGORIES, filterPrompts } from '../src/data/prompts.js';
import { createServer } from '../server.mjs';

test('all prompts are complete, unique, categorized and ready to paste', () => {
  assert.equal(new Set(PROMPTS.map(item => item.id)).size, PROMPTS.length);
  for (const category of CATEGORIES) assert.ok(PROMPTS.some(item => item.category === category));
  for (const item of PROMPTS) {
    assert.ok(item.title && item.summary && item.body.length > 100);
    assert.match(item.body, /\[[^\]]+\]/);
    assert.ok(CATEGORIES.includes(item.category));
    assert.match(item.body, /【共同要求】/);
  }
});

test('search supports category intersection, whitespace, case and empty results', () => {
  assert.equal(filterPrompts().length, PROMPTS.length);
  assert.deepEqual(filterPrompts('  fB  ', '物件行銷').map(item => item.id), ['facebook']);
  assert.ok(filterPrompts('裝潢', '圖片視覺').some(item => item.id === 'staging'));
  assert.equal(filterPrompts('FB', '帶看跟進').length, 0);
  assert.equal(filterPrompts('不存在測試字串xyz').length, 0);
  assert.ok(filterPrompts('LINE 硬性').some(item => item.id === 'showing-followup'));
});

test('public server serves the application but has no generation or upload endpoints', async t => {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [route, mime] of [['/', 'text/html'], ['/src/index.css', 'text/css'], ['/src/main.js', 'text/javascript'], ['/src/data/prompts.js', 'text/javascript']]) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').startsWith(mime));
  }
  for (const route of ['/api/generate', '/api/vision', '/api/workspace', '/.env', '/server.ts', '/package.json']) {
    assert.equal((await fetch(base + route)).status, 404);
  }
  assert.equal((await fetch(base + '/api/vision', { method: 'POST', body: 'test' })).status, 405);
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('public app contains no upload input or remote generation request', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type=["']file["']/i);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|FileReader|\/api\//);
  assert.match(html, /lang="zh-Hant"/);
});
