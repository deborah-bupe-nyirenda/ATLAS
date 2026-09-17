import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from './rbac.js';

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
}

test('allows an admin and rejects a student for admin operations', () => {
  const middleware = requireRole({ verify: (token) => ({ role: token }) }, 'admin');
  const adminResponse = response();
  let called = false;
  middleware({ headers: { authorization: 'Bearer admin' } }, adminResponse, () => { called = true; });
  assert.equal(called, true);

  const studentResponse = response();
  middleware({ headers: { authorization: 'Bearer student' } }, studentResponse, () => {});
  assert.equal(studentResponse.statusCode, 403);
});

test('rejects requests without a bearer token', () => {
  const result = response();
  requireRole({ verify: () => ({ role: 'admin' }) }, 'admin')({ headers: {} }, result, () => {});
  assert.equal(result.statusCode, 401);
});