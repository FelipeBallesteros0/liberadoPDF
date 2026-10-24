import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('pdf.js vendored completo y sin PDF de muestra', () => {
  for (const f of ['vendor/pdfjs/build/pdf.mjs', 'vendor/pdfjs/build/pdf.worker.mjs', 'vendor/pdfjs/build/pdf.sandbox.mjs', 'vendor/pdfjs/web/viewer.html', 'vendor/pdfjs/web/viewer.mjs', 'vendor/pdfjs/web/locale/locale.json', 'vendor/pdfjs/LICENSE']) {
    assert.ok(existsSync(f), f);
  }
  assert.ok(!existsSync('vendor/pdfjs/web/compressed.tracemonkey-pldi-09.pdf'));
});

test('package.json fija versiones y módulos ES', () => {
  const p = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(p.type, 'module');
  assert.equal(p.main, 'src/main/main.js');
  assert.equal(p.devDependencies.electron, '45.0.0');
  assert.equal(p.dependencies['pdf-lib'], '1.17.1');
  assert.equal('pdfjs-dist' in (p.dependencies ?? {}), false);
  assert.ok(existsSync('node_modules/pdf-lib/dist/pdf-lib.esm.min.js'));
});
