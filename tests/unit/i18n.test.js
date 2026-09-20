import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  formatMoney,
  messages,
  setDocumentLocale,
  t,
} from '../../site/app/src/i18n.js';

test('English and Arabic catalogs expose identical keys', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.ar).sort());
  assert.ok(Object.keys(messages.en).length >= 80);
});

test('translation replaces named values and falls back to English', () => {
  assert.equal(t('en', 'today.daysRemaining', { count: 11 }), '11 days remaining');
  assert.equal(t('ar', 'today.daysRemaining', { count: 11 }), 'متبقي 11 يومًا');
  assert.equal(t('unknown', 'nav.today'), 'Today');
  assert.equal(t('en', 'missing.key'), 'missing.key');
});

test('money and dates use locale-aware AED formatting', () => {
  assert.match(formatMoney('en', 1234.5), /1,234\.50/);
  assert.match(formatMoney('ar', 1234.5), /١|1/);
  assert.match(formatDate('en', '2026-09-20'), /20/);
  assert.match(formatDate('ar', '2026-09-20'), /٢٠|20/);
});

test('setDocumentLocale applies language and direction to a document root', () => {
  const attributes = {};
  const documentLike = {
    documentElement: {
      setAttribute(name, value) { attributes[name] = value; },
    },
  };
  setDocumentLocale(documentLike, 'ar');
  assert.deepEqual(attributes, { lang: 'ar', dir: 'rtl' });
});
