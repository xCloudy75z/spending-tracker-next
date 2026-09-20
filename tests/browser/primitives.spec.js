import { test, expect } from '@playwright/test';

test('mixed-script notes render as isolated text, never HTML', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { text } = await import('/app/src/ui/dom.js');
    const node = text(document, '<img src=x onerror=alert(1)> مرحبا');
    document.body.append(node);
    return {
      textContent: node.textContent,
      imageCount: node.querySelectorAll('img').length,
      direction: node.dir,
    };
  });
  expect(result).toEqual({
    textContent: '<img src=x onerror=alert(1)> مرحبا',
    imageCount: 0,
    direction: 'auto',
  });
});

test('dialog traps dismissal while busy and restores opener focus', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { createDialog, el } = await import('/app/src/ui/dom.js');
    const opener = el(document, 'button', { text: 'Open', id: 'opener' });
    document.body.append(opener);
    opener.focus();
    const controls = el(document, 'button', { text: 'Save', id: 'save' });
    const dialog = createDialog(document, {
      title: 'Edit transaction',
      description: 'Change the amount.',
      content: controls,
    });
    dialog.open(opener);
    window.testDialog = dialog;
  });
  await expect(page.locator('dialog[open]')).toHaveAttribute('aria-labelledby', /.+/);
  await page.evaluate(() => window.testDialog.setBusy(true));
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.evaluate(() => window.testDialog.setBusy(false));
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#opener')).toBeFocused();
});

test('announcements expose priority and controls meet the touch target floor', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/app/assets/app.css';
    document.head.append(link);
    const { announce, el } = await import('/app/src/ui/dom.js');
    const button = el(document, 'button', { className: 'icon-button', text: 'Add' });
    document.body.append(button);
    announce(document, 'Saved', 'assertive');
  });
  await expect(page.locator('[data-live-region]')).toHaveAttribute('aria-live', 'assertive');
  await expect(page.locator('[data-live-region]')).toHaveText('Saved');
  const box = await page.locator('.icon-button').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
