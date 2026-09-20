import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  countSourceDeclarations,
  summarizeNativeReports,
  summarizePlaywrightReport,
} from '../../tools/count-tests.mjs';

test('source accounting deduplicates helper files without importing side effects', async () => {
  const fixture = name => fileURLToPath(new URL(`./fixtures/accounting/${name}`, import.meta.url));
  const result = await countSourceDeclarations([
    fixture('suite-a.fixture.js'),
    fixture('suite-b.fixture.js'),
    fixture('shared.fixture.js'),
    fixture('shared.fixture.js'),
  ]);

  assert.equal(result.declarationCount, 3);
  assert.deepEqual(result.declarations.map(item => item.title).sort(), ['shared helper case', 'suite A case', 'suite B case']);
  assert.equal(globalThis.__spendingTrackerAccountingFixtureImported, undefined);
});

test('native report accounting rejects duplicate file and title executions', () => {
  const report = [
    JSON.stringify({ type: 'test:pass', data: { file: '/tests/a.test.js', name: 'case A', nesting: 0 } }),
    JSON.stringify({ type: 'test:pass', data: { file: '/tests/b.test.js', name: 'case B', nesting: 0 } }),
  ].join('\n');

  assert.deepEqual(summarizeNativeReports([report]), { caseCount: 2, executionCount: 2 });
  assert.throws(() => summarizeNativeReports([`${report}\n${report.split('\n')[0]}`]), /duplicate native test execution/i);
});

test('Playwright accounting separates declarations from project executions', () => {
  const report = {
    suites: [{
      title: 'browser suite',
      specs: [{
        title: 'opens safely',
        file: 'tests/browser/example.spec.js',
        tests: [
          { projectName: 'desktop-chromium', results: [{ status: 'passed' }] },
          { projectName: 'iphone-webkit', results: [{ status: 'passed' }] },
          { projectName: 'iphone-landscape-webkit', results: [{ status: 'passed' }] },
        ],
      }],
    }],
  };

  assert.deepEqual(summarizePlaywrightReport(report), { declarationCount: 1, caseCount: 1, executionCount: 3 });
  report.suites[0].specs[0].tests.push({ projectName: 'desktop-chromium', results: [{ status: 'passed' }] });
  assert.throws(() => summarizePlaywrightReport(report), /duplicate Playwright test execution/i);
});
