import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeAdminSession } from '../src/session-policy.ts';

test('only a valid enabled administrator with a finite token lifetime gets a session', () => {
  const admin = { displayName: 'Admin', role: 'ADMIN', enabled: true };
  assert.deepEqual(makeAdminSession('token', 60, admin, 1000), { accessToken: 'token', expiresAt: 61000, name: 'Admin' });
  for (const user of [null, {}, { ...admin, role: 'CUSTOMER' }, { ...admin, enabled: false }, { ...admin, displayName: '' }]) {
    assert.throws(() => makeAdminSession('token', 60, user, 1000));
  }
  for (const lifetime of [0, -1, Infinity, NaN]) assert.throws(() => makeAdminSession('token', lifetime, admin, 1000));
  assert.throws(() => makeAdminSession('', 60, admin, 1000));
});
