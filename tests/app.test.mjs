// Runs the built site script against minimal fake browsers, so a top-level crash
// (which would silently disable forms, the map, the gallery…) fails the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const buildDir = new URL('../site/assets/build/', import.meta.url);
const bundle = (await readdir(buildDir)).find((file) => /^app\.[0-9a-f]{10}\.js$/.test(file));
const source = await readFile(new URL(bundle, buildDir), 'utf8');

function element() {
  const el = {
    style: { setProperty() {}, removeProperty() {}, cssText: '' },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {}, hasAttribute: () => false,
    addEventListener() {}, append() {}, prepend() {}, insertBefore() {}, replaceChildren() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0, left: 0 }),
    focus() {}, children: [],
  };
  return el;
}

function run({ width = 390, pointerFine = false, reducedMotion = false } = {}) {
  const errors = [];
  const root = element();
  const document = {
    documentElement: root, body: element(), hidden: false,
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    createElement: element, addEventListener() {},
  };
  const queries = { '(prefers-reduced-motion: reduce)': reducedMotion };
  const window = {
    document, navigator: {}, location: { pathname: '/' }, innerWidth: width, innerHeight: 800,
    matchMedia: (query) => ({ matches: query in queries ? queries[query] : pointerFine && width >= 1100, addEventListener() {} }),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    performance: { now: () => 0 }, Intl, Image: class {}, URL, console,
  };
  window.window = window;
  try {
    vm.runInNewContext(source, window, { filename: bundle });
  } catch (error) { errors.push(error); }
  return { errors, window };
}

for (const [label, options] of [
  ['phone', { width: 390 }],
  ['desktop with a mouse', { width: 1440, pointerFine: true }],
  ['reduced motion', { width: 390, reducedMotion: true }],
]) {
  test(`site script starts without errors on a ${label}`, () => {
    const { errors, window } = run(options);
    assert.deepEqual(errors.map(String), []);
    assert.equal(window.__NT, true, 'script finished and marked itself ready');
  });
}
