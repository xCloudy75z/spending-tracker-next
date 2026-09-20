import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifecycleController } from '../../site/app/src/main.js';

function lifecycleHarness(dates) {
  const listeners = new Map();
  let index = 0;
  let visibilityState = 'visible';
  const renders = [];
  const controller = createLifecycleController({
    clock: { todayISO: () => dates[Math.min(index++, dates.length - 1)] },
    eventTarget: {
      addEventListener(name, listener) { listeners.set(name, listener); },
      removeEventListener(name) { listeners.delete(name); },
    },
    visibilitySource: { get visibilityState() { return visibilityState; } },
    onRender(today) { renders.push(today); },
  });
  return {
    controller,
    renders,
    emit(name, value) {
      if (name === 'visibilitychange') visibilityState = value;
      listeners.get(name)?.({ type: name });
    },
  };
}

test('visibility resume after midnight recalculates the active day once', () => {
  const app = lifecycleHarness(['2026-09-20', '2026-09-21', '2026-09-21']);
  app.controller.start();
  app.emit('visibilitychange', 'visible');
  app.emit('focus');
  assert.deepEqual(app.renders, ['2026-09-20', '2026-09-21']);
  assert.equal(app.controller.todayISO, '2026-09-21');
});

test('hidden visibility events do not refresh and stop removes listeners', () => {
  const app = lifecycleHarness(['2026-09-20', '2026-09-21']);
  app.controller.start();
  app.emit('visibilitychange', 'hidden');
  assert.deepEqual(app.renders, ['2026-09-20']);
  app.controller.stop();
  app.emit('focus');
  assert.deepEqual(app.renders, ['2026-09-20']);
});
