import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mobile = new URL('../', import.meta.url);
const web = new URL('../web-ohana/', mobile);
const files = [
  'api-sources.ts',
  'customers/types.ts', 'customers/customer-address.ts', 'customers/customer-edit.ts',
  'customers/preview-source.ts', 'users/types.ts', 'users/preview-source.ts',
];
for (const file of files) {
  assert.equal(readFileSync(new URL(`src/preview/${file}`, mobile), 'utf8').replaceAll('\r\n', '\n'),
    readFileSync(new URL(`src/${file}`, web), 'utf8').replaceAll('\r\n', '\n'), `Reglas o contrato distintos: ${file}`);
}
for (const file of ['api-sources', 'customer-addresses', 'customer-deactivation', 'customers-preview', 'users-preview']) {
  const normalize = (text) => text.replaceAll('\r\n', '\n').replaceAll('../src/preview/', '../src/');
  assert.equal(normalize(readFileSync(new URL(`test/${file}.test.mjs`, mobile), 'utf8')),
    normalize(readFileSync(new URL(`test/${file}.test.mjs`, web), 'utf8')), `Cobertura distinta: ${file}`);
}
console.log('Paridad verificada: 7 archivos de contratos/reglas y las 5 suites de datos coinciden con web-ohana.');
