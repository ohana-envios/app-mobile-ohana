import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAuthenticatedTransport } from '../src/authenticated-transport.ts';
import { createApiCustomersSource } from '../src/preview/api-sources.ts';

test('mobile transport sends authenticated customer edits and rejects server errors', async () => {
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer test-token');
    assert.equal(req.method, 'PATCH');
    assert.equal(req.headers['content-type'], 'application/json');
    let body = '';
    for await (const chunk of req) body += chunk;
    assert.equal(JSON.parse(body).displayName, 'Nombre');
    if (req.url === '/api/customers/denied') { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'ok' }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const request = createAuthenticatedTransport(`http://127.0.0.1:${server.address().port}`, { accessToken: 'test-token', expiresAt: Date.now() + 60000 });
    const source = createApiCustomersSource(request);
    const draft = { displayName: 'Nombre', legalName: '', email: '', phone: '' };
    const signal = new AbortController().signal;
    const original = { id: 'ok', displayName: 'Anterior', legalName: null, email: null, phone: null };
    assert.equal((await source.update('ok', draft, signal, original)).id, 'ok');
    await assert.rejects(source.update('denied', draft, signal, { ...original, id: 'denied' }));
    await assert.rejects(createAuthenticatedTransport('http://localhost', { accessToken: 'old', expiresAt: 0 })('/x', { signal }), /vencida/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
