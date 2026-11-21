import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEmailInvitationsSource } from '../src/preview/email-invitations.ts';

test('email invitations check access and send only the requested identity fields', async () => {
  const calls = []; const signal = new AbortController().signal;
  const source = createEmailInvitationsSource(async (path, init) => { calls.push({ path, init }); return path.endsWith('/access') ? { canInvite: true } : { email: 'ana@example.invalid', invitation: 'sent' }; });
  assert.equal((await source.access(signal)).canInvite, true);
  assert.equal((await source.send({ firstName: 'Ana', lastName: 'P?rez', email: 'ana@example.invalid' }, signal)).invitation, 'sent');
  assert.equal(calls[0].path, '/api/users/invitations/access');
  assert.equal(calls[0].init.signal, signal);
  assert.equal(calls[1].path, '/api/users/invitations');
  assert.equal(calls[1].init.method, 'POST'); assert.equal(calls[1].init.signal, signal);
  assert.deepEqual(JSON.parse(calls[1].init.body), { firstName: 'Ana', lastName: 'P?rez', email: 'ana@example.invalid' });
});

test('invitation errors are propagated and never reported as sent', async () => {
  const failure = Object.assign(new Error('denied'), { status: 403 });
  const source = createEmailInvitationsSource(async () => { throw failure; });
  await assert.rejects(source.access(new AbortController().signal), error => error === failure);
  await assert.rejects(source.send({ firstName: 'A', lastName: 'B', email: 'a@b.invalid' }, new AbortController().signal), error => error === failure);
});
