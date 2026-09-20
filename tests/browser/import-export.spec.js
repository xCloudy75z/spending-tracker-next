import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const original = await readFile(new URL('../fixtures/original-v1.json', import.meta.url));
const malicious = await readFile(new URL('../fixtures/malicious-v1.json', import.meta.url));

function state() {
  return {
    schemaVersion: 1,
    settings: { currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep', locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
    categories: { food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 500, budgetPeriod: 'monthly' } },
    cycles: { sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 } },
    transactions: {
      formula: { id: 'formula', cycleId: 'sep', categoryId: 'food', date: '2026-09-20', amount: 10, note: '=SUM(A1:A2)', isRefund: false, isExcludedFromPace: false, isCredit: false, liabilitySettled: false, byWife: false, wifeSettled: false },
    },
    wifePayments: {},
  };
}

async function seed(page) {
  await page.addInitScript(value => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value)), state());
  await page.goto('/app/');
  await page.locator('[data-save-state]').click();
}

test('backup and CSV downloads use deterministic safe files', async ({ page }) => {
  await seed(page);
  const backupPromise = page.waitForEvent('download');
  await page.locator('[data-export-json]').click();
  const backup = await backupPromise;
  expect(backup.suggestedFilename()).toBe('spending-tracker-next-backup-2026-09-20.json');
  const csvPromise = page.waitForEvent('download');
  await page.locator('[data-export-csv]').click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe('spending-tracker-next-transactions-2026-09-20.csv');
  const stream = await csv.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString('utf8');
  expect(content).toContain("'=SUM(A1:A2)");
});

test('CSV export never marks a restorable backup as current', async ({ page }) => {
  await seed(page);
  const download = page.waitForEvent('download');
  await page.locator('[data-export-csv]').click();
  await download;
  const metadata = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:meta:v1') || '{}'));
  expect(metadata.lastBackupAt).toBeUndefined();
});

test('backup preview never mutates data and original V1 restore requires explicit replacement', async ({ page }) => {
  await seed(page);
  await page.locator('[data-backup-file]').setInputFiles({ name: 'original.json', mimeType: 'application/json', buffer: original });
  await expect(page.locator('.backup-preview')).toContainText('original-v1');
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')).transactions).length)).toBe(1);
  const preRestore = page.waitForEvent('download');
  await page.locator('[data-backup-replace]').click();
  await preRestore;
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')).transactions).length)).toBe(4);
});

test('corrupt, hostile, and oversized backups are refused without state mutation', async ({ page }) => {
  await seed(page);
  for (const file of [
    { name: 'truncated.json', buffer: Buffer.from('{"schemaVersion":') },
    { name: 'malicious.json', buffer: malicious },
    { name: 'huge.json', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32) },
  ]) {
    await page.locator('[data-backup-file]').setInputFiles({ ...file, mimeType: 'application/json' });
    await expect(page.locator('.backup-preview')).toContainText('could not be used');
    await expect(page.locator('[data-backup-replace]')).toBeDisabled();
  }
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')).transactions).length)).toBe(1);
});
