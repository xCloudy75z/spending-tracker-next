import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRoute, parseRoute } from '../../site/app/src/router.js';

test('unknown routes normalize to Today without a network navigation', () => {
  assert.equal(parseRoute('#/unknown'), 'today');
  assert.equal(parseRoute(''), 'today');
  assert.equal(formatRoute('card'), '#/card');
});

test('all four application routes round-trip', () => {
  for (const route of ['today', 'activity', 'plan', 'card']) {
    assert.equal(parseRoute(formatRoute(route)), route);
  }
  assert.throws(() => formatRoute('settings'), /unknown route/);
});
