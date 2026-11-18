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
import { makeCustomerSession } from '../src/session-policy.ts';
test('enabled customers may start a separate limited session without administrative privileges', () => {
  const customer = { displayName: 'Cliente', role: 'CUSTOMER', enabled: true };
  assert.deepEqual(makeCustomerSession('token', 60, customer, 1000), { accessToken: 'token', expiresAt: 61000, name: 'Cliente' });
  for (const user of [null, {}, { ...customer, role: 'ADMIN' }, { ...customer, enabled: false }]) assert.throws(() => makeCustomerSession('token', 60, user, 1000));
  for (const lifetime of [0, -1, Infinity, NaN]) assert.throws(() => makeCustomerSession('token', lifetime, customer, 1000));
});

import { makeStaffSession } from '../src/session-policy.ts';
test('enabled staff get a limited non-administrative session', () => {
  const user = { displayName: 'Operador', role: 'OPERATOR', enabled: true };
  assert.equal(makeStaffSession('token', 60, user, 1000).role, 'OPERATOR');
  assert.equal(makeStaffSession('token', 60, { ...user, role: 'COURIER' }, 1000).role, 'COURIER');
  for (const invalid of [null, { ...user, role: 'ADMIN' }, { ...user, enabled: false }]) assert.throws(() => makeStaffSession('token', 60, invalid, 1000));
});
