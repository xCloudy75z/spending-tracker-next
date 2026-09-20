import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reports = path.join(root, 'evidence', 'reports');

function run(command, args, label, extraEnvironment = {}) {
  console.log(`\n[verify] ${label}`);
  const result = spawnSync(command, args, { cwd: root, env: { ...process.env, ...extraEnvironment }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNative(label, pattern) {
  run(process.execPath, [
    '--test',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=./tools/native-json-reporter.mjs',
    `--test-reporter-destination=evidence/reports/${label}.ndjson`,
    pattern,
  ], `${label} tests`);
}

await rm(reports, { recursive: true, force: true });
await mkdir(reports, { recursive: true });

run(process.execPath, ['tools/validate-public-site.mjs', 'site'], 'static site validation');
runNative('unit', 'tests/unit/**/*.test.js');
runNative('integration', 'tests/integration/**/*.test.js');
runNative('site', 'tests/site/**/*.test.js');
run(
  process.execPath,
  [path.join('node_modules', '@playwright', 'test', 'cli.js'), 'test'],
  'browser, accessibility, responsive, and offline tests',
  { CAPTURE_EVIDENCE: '0' },
);
run(process.execPath, ['tools/count-tests.mjs'], 'exact test accounting');
run(process.execPath, ['tools/validate-public-site.mjs', 'site'], 'generated evidence validation');

console.log('\n[verify] all release checks passed');
