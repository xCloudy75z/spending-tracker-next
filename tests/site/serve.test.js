import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

function startServer(root, port) {
  const child = spawn(
    process.execPath,
    ['tools/serve.mjs', '--root', root, '--port', String(port)],
    { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const ready = new Promise((resolve, reject) => {
    let errorText = '';
    const timeout = setTimeout(() => reject(new Error(`server did not start: ${errorText}`)), 5_000);
    child.stderr.on('data', chunk => { errorText += chunk; });
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Serving')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`server exited ${code}: ${errorText}`));
    });
  });

  return { child, ready };
}

test('development server resolves directories, sets MIME types, and blocks traversal', async t => {
  const root = await mkdtemp(join(tmpdir(), 'spending-serve-'));
  await writeFile(join(root, 'index.html'), '<h1>Home</h1>');
  await writeFile(join(root, 'manifest.webmanifest'), '{"name":"Test"}');
  const port = 43_000 + (process.pid % 1_000);
  const server = startServer(root, port);
  t.after(() => server.child.kill());
  await server.ready;

  const home = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /^text\/html/);
  assert.equal(home.headers.get('cache-control'), 'no-store');

  const manifest = await fetch(`http://127.0.0.1:${port}/manifest.webmanifest`);
  assert.match(manifest.headers.get('content-type'), /^application\/manifest\+json/);

  const traversal = await fetch(`http://127.0.0.1:${port}/..%2Foutside.txt`);
  assert.equal(traversal.status, 404);
});
