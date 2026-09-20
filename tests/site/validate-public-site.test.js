import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
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

test('Pages deploys only the exact verified artifact from a trusted main push', async () => {
  const quality = await readFile(fileURLToPath(new URL('../../.github/workflows/quality.yml', import.meta.url)), 'utf8');
  const pages = await readFile(fileURLToPath(new URL('../../.github/workflows/pages.yml', import.meta.url)), 'utf8');
  assert.match(quality, /name: verified-site/);
  assert.match(quality, /path: site/);
  assert.match(pages, /workflow_run\.event == 'push'/);
  assert.match(pages, /head_repository\.full_name == github\.repository/);
  assert.match(pages, /github\.event\.repository\.default_branch/);
  assert.match(pages, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.doesNotMatch(pages, /actions\/checkout/);
});
