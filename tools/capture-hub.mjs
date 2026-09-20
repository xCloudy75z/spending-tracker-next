import path from 'node:path';
import { mkdir } from 'node:fs/promises';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(process.cwd(), '.playwright-browsers');
const { chromium, devices, webkit } = await import('@playwright/test');

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const outputDirectory = path.join(process.cwd(), 'evidence', 'screenshots', 'hub');
const pages = [
  ['home', '/'],
  ['features', '/features/'],
  ['privacy', '/privacy/'],
  ['evidence', '/evidence/'],
  ['migrate', '/migrate/'],
  ['releases', '/releases/'],
];

await mkdir(outputDirectory, { recursive: true });

async function capture(browserType, browserOptions, contextOptions, label) {
  const browser = await browserType.launch(browserOptions);
  const context = await browser.newContext({
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
    reducedMotion: 'reduce',
    ...contextOptions,
  });
  const page = await context.newPage();

  for (const [name, pathname] of pages) {
    await page.goto(new URL(pathname, baseUrl).href, { waitUntil: 'networkidle' });
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (hasHorizontalOverflow) throw new Error(`${label}/${name} has horizontal overflow`);
    await page.screenshot({ path: path.join(outputDirectory, `${name}-${label}.png`), fullPage: true });
  }

  await browser.close();
}

await capture(chromium, { channel: 'msedge' }, { viewport: { width: 1440, height: 1000 } }, 'desktop');
await capture(webkit, {}, devices['iPhone 13'], 'iphone');

console.log(`Captured ${pages.length * 2} hub screenshots in ${outputDirectory}.`);
