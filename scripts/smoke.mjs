import assert from 'node:assert/strict';

const base = process.env.API_URL || 'http://localhost:3000';
async function json(path, init) {
  const response = await fetch(`${base}${path}`, init);
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response.json();
}
assert.equal((await json('/health/ready')).status, 'ready');
assert.ok((await fetch(`${base}/docs`)).ok, 'Swagger UI must be served');
assert.ok((await fetch(`${base}/docs/swagger-ui.css`)).ok, 'Swagger static assets must be served');
assert.ok(Array.isArray((await json('/v1/providers')).data));
assert.ok(Array.isArray((await json('/v1/stations/nearby?latitude=12.97&longitude=77.59')).data));
assert.equal((await fetch(`${base}/v1/stations/nearby?latitude=999&longitude=77`)).status, 400);
assert.equal((await fetch(`${base}/v1/payments/fastag/sessions/00000000-0000-4000-8000-000000000000`)).status, 401);
assert.equal((await json('/v1/sandbox/capabilities')).livePayments, false);
for (const scenario of ['active', 'low-balance', 'blacklisted']) {
  const result = await json('/v1/sandbox/fastag/demo', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'b8034f17-765d-40d0-b00b-ffec2b7e369d', scenario }),
  });
  assert.equal(result.sandbox, true);
  assert.equal(result.status, scenario === 'active' ? 'CAPTURED' : 'REJECTED');
}
console.log('Production image, PostGIS migrations, discovery, validation, payment guard and sandbox passed.');
