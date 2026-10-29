// The start scene: a title with a Play button on load. Play hides it once and calls onPlay. Exits non-zero on failure.
// The DOM is stubbed, since the test runs in Node.

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A minimal element: enough of the DOM for the scene to build, click, and read its style.
function fakeElement(tag) {
  const listeners = {};
  return {
    tag,
    style: { cssText: '', display: '' },
    children: [],
    textContent: '',
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { cs.forEach((c) => this.children.push(c)); },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { listeners.click?.({ stopPropagation() {} }); },
  };
}
const body = fakeElement('body');
globalThis.document = { body, createElement: fakeElement };

const { createStartScene } = await import('../src/start-scene.js');

let played = 0;
const scene = createStartScene(() => played++);
check('the scene is shown on load', scene.isShown() === true && scene.element.style.display !== 'none');
check('the scene is added to the page', body.children.includes(scene.element));
const button = scene.element.children[0].children[2];
check('the Play button is labelled Play', button.textContent === 'Play');

button.click();
check('Play hides the scene', scene.isShown() === false && scene.element.style.display === 'none');
check('Play calls onPlay once', played === 1);

button.click();
scene.hide();
check('a second Play or hide does not call onPlay again', played === 1);
check('hide after Play leaves the scene hidden', scene.isShown() === false);

const quiet = createStartScene(null);
quiet.element.children[0].children[2].click();
check('no onPlay handler is safe', quiet.isShown() === false);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
