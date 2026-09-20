import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validatePublicSite } from '../../tools/validate-public-site.mjs';

test('validator rejects a broken internal link and a local Windows path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'spending-site-'));
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, 'index.html'),
    '<title>Spending Tracker Next</title><a href="./missing/">Open</a><p>C:\\Users\\owner</p>',
  );

  const result = await validatePublicSite(root);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /missing/);
  assert.match(result.errors.join('\n'), /local filesystem path/);
});
