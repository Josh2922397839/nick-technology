import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../site/assets/js/start.js', import.meta.url), 'utf8');
function startup(light) {
  const scripts = [], timers = new Set(), classes = new Set(['is-booting']);
  const root = { dataset: {}, classList: { add: value => classes.add(value), remove: value => classes.delete(value) } };
  const context = {
    window: { __NT_LITE: light },
    document: { documentElement: root, createElement: () => ({}), head: { append: script => scripts.push(script) } },
    setTimeout: callback => { timers.add(callback); return callback; },
    clearTimeout: callback => timers.delete(callback),
  };
  vm.runInNewContext(source, context);
  return { scripts, timers, classes, context };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('lightweight visits load core interactions without desktop libraries', () => {
  const app = startup(true);
  assert.deepEqual(app.scripts.map(script => script.src), ['/assets/js/main.js']);
});
test('desktop waits for ordered dependencies before loading core interactions', async () => {
  const app = startup(false);
  assert.equal(app.scripts.length, 4);
  assert.ok(app.scripts.every(script => script.async === false));
  for (const script of [...app.scripts]) script.onload();
  await flush();
  assert.equal(app.scripts.at(-1).src, '/assets/js/main.js');
  assert.equal(app.context.window.__NT_LITE, false);
});
test('a failed animation dependency still starts usable core interactions', async () => {
  const app = startup(false);
  app.scripts[0].onerror();
  for (const script of app.scripts.slice(1)) script.onload();
  await flush();
  assert.equal(app.context.window.__NT_LITE, true);
  assert.equal(app.context.document.documentElement.dataset.motion, 'light');
  assert.ok(app.classes.has('no-anim'));
  assert.ok(!app.classes.has('is-booting'));
  assert.equal(app.scripts.at(-1).src, '/assets/js/main.js');
});
test('stalled animation requests cannot indefinitely delay core interactions', async () => {
  const app = startup(false);
  for (const timeout of [...app.timers]) timeout();
  await flush();
  assert.equal(app.scripts.at(-1).src, '/assets/js/main.js');
  assert.equal(app.context.window.__NT_LITE, true);
});
