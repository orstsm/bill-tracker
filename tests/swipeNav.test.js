import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the hook's event wiring without a browser or a signed-in account.
test('native paging commits only at rest and cleans up its listeners', async () => {
  const effects = [];
  const cleanups = [];
  const listeners = new Map();
  const selected = [];
  const scrolls = [];
  let resized;
  const indicator = { style: {} };
  const shell = { querySelector: () => indicator, classList: { add() {}, remove() {} } };
  const viewport = {
    clientWidth: 390, scrollLeft: 0, style: {},
    closest: () => shell,
    scrollTo(options) { scrolls.push(options); this.scrollLeft = options.left; },
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const originals = Object.fromEntries(
    ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]])
  );
  globalThis.window = { matchMedia: () => ({ matches: false }), setTimeout };
  globalThis.ResizeObserver = class {
    constructor(fn) { resized = fn; }
    observe() {}
    disconnect() {}
  };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const source = readFileSync(new URL('../src/hooks/useSwipeNav.js', import.meta.url), 'utf8')
      .replace(/^import .*;\n/, '')
      .replace('export default function useSwipeNav', 'function useSwipeNav');
    const hook = new Function('useCallback', 'useEffect', 'useRef', source + '\nreturn useSwipeNav;')(
      fn => fn, fn => effects.push(fn), value => ({ current: value })
    );
    const result = hook({ activeIndex: 0, count: 4, onIndexChange: index => selected.push(index) });
    result.viewportRef.current = viewport;
    effects.forEach(fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); });
    result.scrollToIndex(1);
    assert.deepEqual(scrolls.at(-1), { left: 390, behavior: 'smooth' });
    listeners.get('touchstart')();
    listeners.get('scroll')();
    listeners.get('scrollend')();
    assert.deepEqual(selected, [], 'no React commit while finger is down');
    listeners.get('touchend')();
    listeners.get('scrollend')();
    assert.deepEqual(selected, [1]);
    assert.equal(indicator.style.transform, 'translate3d(100%, 0, 0)');
    viewport.clientWidth = 844;
    resized();
    assert.equal(viewport.scrollLeft, 844, 'preserve selected page after rotation');
    result.scrollToIndex(99, true);
    assert.deepEqual(scrolls.at(-1), { left: 2532, behavior: 'instant' });
    listeners.get('scrollend')();
    assert.deepEqual(selected, [1, 3]);
    window.matchMedia = () => ({ matches: true });
    result.scrollToIndex(0);
    assert.equal(scrolls.at(-1).behavior, 'instant');
  } finally {
    cleanups.forEach(fn => fn());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
  assert.equal(listeners.size, 0);
});
