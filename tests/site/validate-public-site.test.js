import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validatePublicSite } from '../../tools/validate-public-site.mjs';

test('validator rejects unsafe, inaccessible, unverifiable public pages', async () => {
  const result = await validatePublicSite(fileURLToPath(new URL('./fixtures/broken/', import.meta.url)));

  assert.equal(result.ok, false);
  const errors = result.errors.join('\n');
  for (const expected of [
    'missing title', 'meta description', 'viewport', 'canonical', 'local filesystem path',
    'external runtime asset', 'image is missing alt', 'target=_blank', 'secret-like token',
    'missing privacy page', 'machine-readable results', 'missing local target',
  ]) assert.match(errors, new RegExp(expected));
});

test('published site satisfies the complete report contract', async () => {
  const result = await validatePublicSite(fileURLToPath(new URL('../../site/', import.meta.url)));
  assert.equal(result.ok, true, result.errors.join('\n'));
});
