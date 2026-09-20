import { rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const generated = [
  'node_modules',
  '.playwright-browsers',
  'evidence/reports',
  'playwright-report',
  'test-results',
  'coverage',
];

for (const relative of generated) {
  const target = path.resolve(root, relative);
  if (target !== root && target.startsWith(`${root}${path.sep}`)) await rm(target, { recursive: true, force: true });
}

console.log(`Removed project-local generated dependencies and reports: ${generated.join(', ')}`);
