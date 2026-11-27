import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createAcademy, AcademyError } from '@agentgo-tw/app-sdk';
import { createServer } from '../server.mjs';
import { deleteUserData } from '../server/user-data.mjs';
import { requestJson, safeActionUrl } from '../src/platform.js';

// Test-only signing keys and JWKS: no credentials are issued by production code.
function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key' };
  const academy = createAcademy({ appUuid: 'fixture-app', appToken: 'test-only-not-a-real-token', env: 'test', devMode: false,
    fetch: async url => {
      assert.equal(String(url), 'https://agentgo.tw/.well-known/app-jwks.json');
      return Response.json({ keys: [jwk] });
    },
  });
  function token(claims = {}) {
    const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const data = `${encoded({ alg: 'ES256', kid: 'test-key' })}.${encoded({ aud: 'fixture-app', exp: Math.floor(Date.now() / 1000) + 120, env: 'test', ...claims })}`;
    return `${data}.${sign('sha256', Buffer.from(data), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
  }
  return { academy, token };
}

async function start(t, options) {
  const server = createServer(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('real SDK verifies identities; only verified user.uuid selects identity and deletion', async t => {
  const { academy, token } = fixture();
  const deleted = [];
  const base = await start(t, { academy, deleteMemberData: async uuid => { deleted.push(uuid); return { deletedRecords: 0 }; } });
  const userA = token({ sub: 'member-a', name: 'QA 模擬甲', email: 'qa-a@example.invalid', ent: { kind: 'FUTURE_KIND', tier: 'FREE' } });
  const userB = token({ sub: 'member-b', name: 'QA 模擬乙', email: 'qa-b@example.invalid' });
  const response = await fetch(`${base}/api/me?userUuid=member-b`, { headers: { 'x-academy-identity': userA, 'x-user-uuid': 'member-b' } });
  const a = await response.json();
  assert.equal(a.user.uuid, 'member-a');
  assert.equal(a.entitlement.kind, 'FUTURE_KIND');
  assert.equal(a.identityToken, undefined);
  assert.ok(!JSON.stringify(a).includes(userA));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const b = await (await fetch(`${base}/api/me`, { headers: { 'x-academy-identity': userB } })).json();
  assert.equal(b.user.uuid, 'member-b');
  const removal = await fetch(`${base}/api/me/data?userUuid=member-b`, { method: 'DELETE', headers: { 'x-academy-identity': userA, 'Content-Type': 'application/json' }, body: JSON.stringify({ userUuid: 'member-b' }) });
  assert.equal(removal.status, 200);
  assert.deepEqual(deleted, ['member-a']);
  assert.equal((await fetch(`${base}/api/users/member-b`, { method: 'DELETE', headers: { 'x-academy-identity': userA } })).status, 405);
});

test('missing, forged, expired and wrong-app identities retain anonymous flow but cannot delete', async t => {
  const { academy, token } = fixture();
  const base = await start(t, { academy });
  const valid = token({ sub: 'member-a' });
  const parts = valid.split('.');
  const forged = `${parts[0]}.${Buffer.from(JSON.stringify({ aud: 'fixture-app', sub: 'member-b', exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url')}.${parts[2]}`;
  for (const identity of ['', forged, token({ sub: 'member-a', exp: 1 }), token({ sub: 'member-a', aud: 'other-app' })]) {
    const headers = { 'x-academy-identity': identity, 'x-user-uuid': 'member-b' };
    const me = await (await fetch(`${base}/api/me?uuid=member-b`, { headers })).json();
    assert.deepEqual(me, { mode: 'anonymous', user: null, entitlement: null, env: null });
    const removal = await fetch(`${base}/api/me/data`, { method: 'DELETE', headers });
    assert.equal(removal.status, 401);
    assert.equal((await removal.json()).code, 'LOGIN_REQUIRED');
    assert.equal((await fetch(base, { headers })).status, 200);
  }
});

test('service identity cannot impersonate a member; public responses contain no member data', async t => {
  const { academy, token } = fixture();
  const base = await start(t, { academy });
  const headers = { 'x-academy-service': token({ typ: 'app_service', svc: 'fixture-service', tid: 'fixture-id' }) };
  for (const [route, method] of [['/api/me?userUuid=member-a', 'GET'], ['/api/me/data?userUuid=member-a', 'DELETE']]) {
    const res = await fetch(base + route, { method, headers });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'SERVICE_NOT_SUPPORTED');
  }
  const identity = token({ sub: 'private-member-uuid', email: 'private@example.invalid' });
  for (const route of ['/', '/index.html', '/health', '/src/main.js', '/src/platform.js', '/src/index.css', '/src/data/prompts.js']) {
    const res = await fetch(base + route, { headers: { 'x-academy-identity': identity } });
    assert.equal(res.status, 200);
    assert.doesNotMatch(await res.text(), /private-member-uuid|private@example\.invalid/);
  }
});

test('SDK selfcheck validates signed challenge; no identity/token is included', async t => {
  const { academy, token } = fixture();
  const base = await start(t, { academy });
  assert.equal((await fetch(`${base}/__academy/selfcheck`)).status, 403);
  assert.equal((await fetch(`${base}/__academy/selfcheck?challenge=${token({ purpose: 'selfcheck', aud: 'other-app' })}`)).status, 403);
  const challenge = token({ purpose: 'selfcheck' });
  const response = await fetch(`${base}/__academy/selfcheck?challenge=${challenge}`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.challenge, challenge);
  assert.equal(body.config_ok, true);
  assert.equal(body.user, undefined);
  assert.doesNotMatch(JSON.stringify(body), /test-only-not-a-real-token/);
});

test('deleteUserData is explicit and idempotent for this app with no stored member data', async () => {
  await assert.rejects(deleteUserData(''), TypeError);
  assert.deepEqual(await deleteUserData('member-a'), { deletedRecords: 0, anonymizedRecords: 0, storesPersonalData: false });
  assert.deepEqual(await deleteUserData('member-a'), await deleteUserData('member-b'));
});

test('frontend handles status AND code, redirects whole-page via its navigation hook, and exposes upgrade link', async () => {
  for (const [status, code, field] of [[401, 'LOGIN_REQUIRED', 'login_url'], [403, 'SUBSCRIPTION_REQUIRED', 'subscribe_url']]) {
    const navigations = [];
    const effects = { origin: 'https://app.example', navigate: url => navigations.push(url), fetch: async () => Response.json({ code, [field]: 'https://agentgo.tw/continue' }, { status }) };
    await assert.rejects(requestJson('/api/me', {}, effects), error => error.handled === true);
    assert.deepEqual(navigations, ['https://agentgo.tw/continue']);
  }
  const points = [];
  await assert.rejects(requestJson('/api/me', {}, { origin: 'https://app.example', fetch: async () => Response.json({ code: 'INSUFFICIENT_POINTS', upgrade_url: 'https://agentgo.tw/pricing' }, { status: 402 }), onPoints: value => points.push(value) }), error => error.handled);
  assert.deepEqual(points, [{ message: '點數不足', upgradeUrl: 'https://agentgo.tw/pricing' }]);
  for (const body of [{ code: 'APP_UNAVAILABLE', subscribe_url: 'https://agentgo.tw/subscribe' }, { code: 'SUBSCRIPTION_REQUIRED', subscribe_url: 'javascript:alert(1)' }]) {
    await assert.rejects(requestJson('/api/me', {}, { origin: 'https://app.example', navigate: () => assert.fail('must not navigate'), fetch: async () => Response.json(body, { status: 403 }) }), error => !error.handled);
  }
  assert.equal(safeActionUrl('data:text/html,hello', 'https://app.example'), null);
  assert.equal(safeActionUrl('https://user:pass@agentgo.tw/', 'https://app.example'), null);
});

test('SDK errors forward only documented action fields and redact unexpected failures', async t => {
  const { academy, token } = fixture();
  const base = await start(t, { academy, deleteMemberData: async () => { throw new AcademyError('INSUFFICIENT_POINTS', '點數不足', 402, { upgrade_url: 'https://agentgo.tw/pricing', secret: 'never-expose' }); } });
  const headers = { 'x-academy-identity': token({ sub: 'member-a' }) };
  const response = await fetch(`${base}/api/me/data`, { method: 'DELETE', headers });
  assert.equal(response.status, 402);
  assert.deepEqual(await response.json(), { code: 'INSUFFICIENT_POINTS', message: '點數不足', upgrade_url: 'https://agentgo.tw/pricing' });
});
