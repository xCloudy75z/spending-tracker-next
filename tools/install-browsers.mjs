import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const browserPath = path.join(root, '.playwright-browsers');
const extraArguments = process.argv.slice(2);
const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [cli, 'install', ...extraArguments, 'chromium', 'webkit'], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserPath },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
