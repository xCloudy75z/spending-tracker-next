import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('visual evidence captures all primary screens without horizontal clipping', async ({ page }, testInfo) => {
  await page.goto('/app/');
  const output = path.join(process.cwd(), 'evidence', 'screenshots');
  await mkdir(output, { recursive: true });
  for (const route of ['today', 'activity', 'plan', 'card']) {
    await page.locator(`[data-route="${route}"]`).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: path.join(output, `${testInfo.project.name}-${route}.png`), fullPage: true });
  }
});

