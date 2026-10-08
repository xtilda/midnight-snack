import test from 'node:test';
import assert from 'node:assert/strict';

// A DOM/canvas harness checks the entry module's event wiring without browser dependencies.
// It does not replace visual checks in an actual browser.
test('start, keyboard movement, pause/resume, mute and restart are wired correctly', async () => {
  const gradient = {
    addColorStop() {}
  };
  const context = new Proxy({}, {
    get: (_, key) => key === 'createRadialGradient' ? () => gradient : () => {}
  });
  const nodes = new Map();

  function node(id) {
    if (!nodes.has(id)) {
      const classes = new Set(id === 'overlay' ? [] : []);
      nodes.set(id, {
        textContent: '',
        firstChild: {
          textContent: ''
        },
        style: {},
        hidden: false,
        listeners: {},
        attributes: {},
        dataset: {},
        width: 672,
        height: 576,
        classList: {
          add: c => classes.add(c),
          remove: c => classes.delete(c),
          toggle: (c, value) => value ? classes.add(c) : classes.delete(c),
          contains: c => classes.has(c)
        },
        addEventListener(name, callback) {
          this.listeners[name] = callback;
        },
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        getContext: () => context,
        focus() {},
        blur() {},
      });
    }
    return nodes.get(id);
  }
  const windowListeners = {},
    documentListeners = {};
  const buttons = ['up', 'down', 'left', 'right'].map(direction => {
    const button = node(direction);
    button.dataset.direction = direction;
    return button;
  });
  let now = 0,
    nextFrame = 0;
  const frames = new Map(),
    storage = new Map();
  globalThis.window = {
    matchMedia: () => ({
      matches: false
    }),
    addEventListener: (name, callback) => windowListeners[name] = callback,
  };
  globalThis.document = {
    hidden: false,
    getElementById: node,
    querySelector: node,
    querySelectorAll: () => buttons,
    addEventListener: (name, callback) => documentListeners[name] = callback,
  };
  globalThis.localStorage = {
    getItem: key => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  };
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      now: () => now
    }
  });
  globalThis.requestAnimationFrame = callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);

  function tick(count) {
    for (let i = 0; i < count; i++) {
      now += 25;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    }
  }

  function key(key, repeat = false) {
    windowListeners.keydown({
      key,
      repeat,
      preventDefault() {},
      target: {
        closest: () => null
      }
    });
  }
  await import('../src/main.js');
  assert.equal(node('score').textContent, '00000');
  node('play').listeners.click();
  assert.equal(node('overlay').classList.contains('hidden'), true);
  key('ArrowRight');
  tick(20);
  assert.equal(node('remaining').textContent, '1 / 5');
  assert.ok(Number(node('score').textContent) >= 100);
  key('p');
  const score = node('score').textContent;
  const elapsed = node('run-time').textContent;
  tick(80);
  assert.equal(node('run-time').textContent, elapsed);
  assert.equal(node('score').textContent, score);
  assert.equal(node('pause').textContent, 'RESUME');
  key('p', true);
  assert.equal(node('pause').textContent, 'RESUME');
  node('play').listeners.click();
  assert.equal(node('pause').textContent, 'PAUSE');
  node('sound').listeners.click();
  assert.equal(node('sound').attributes['aria-pressed'], 'true');
  node('restart').listeners.click();
  assert.equal(node('score').textContent, '00000');
  assert.equal(node('remaining').textContent, '0 / 5');
  assert.equal(node('best').textContent, score);
  assert.equal(frames.size, 1, 'restart must leave exactly one animation loop');
  document.hidden = true;
  documentListeners.visibilitychange();
  assert.equal(node('pause').textContent, 'RESUME');
});
