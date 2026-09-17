import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './authService.js';

test('authenticates a user and issues a role-bearing token', async () => {
  const service = createAuthService({ findUserByUsername: async () => ({ userId: 1, username: 'admin', passwordHash: await serviceHash('secret'), role: 'admin' }) }, 'test-secret');

  const result = await service.login('admin', 'secret');

  assert.equal(result.user.role, 'admin');
  assert.equal(typeof result.token, 'string');
  assert.equal(service.verify(result.token).role, 'admin');
});

test('rejects invalid credentials', async () => {
  const service = createAuthService({ findUserByUsername: async () => ({ userId: 1, username: 'student', passwordHash: await serviceHash('secret'), role: 'student' }) }, 'test-secret');

  await assert.rejects(() => service.login('student', 'wrong'), /Invalid credentials/);
});

async function serviceHash(value) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(value, 4);
}