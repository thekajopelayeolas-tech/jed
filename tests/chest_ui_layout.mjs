// The chest panel shows the whole inventory (main grid and hotbar) next to the chest's 27 slots.
// A tiny DOM stub records every element created, so the layout can be counted in Node.
const made = [];
class El {
  constructor() {
    this.children = [];
    this.style = { cssText: '' };
    this.listeners = {};
    this.textContent = '';
    this.innerHTML = '';
    made.push(this);
  }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
}
globalThis.document = { createElement: () => new El(), body: { appendChild: (c) => c }, exitPointerLock() {}, requestPointerLock() {} };
globalThis.window = { addEventListener() {} };
// Item pictures need a browser canvas, so the icon call is replaced with an empty element here.
const { iconCanvas } = await import('../src/icons.js').catch(() => ({ iconCanvas: () => new El() }));

const { createChestUI } = await import('../src/chest-ui.js');
const { Inventory, INV_SIZE } = await import('../src/inventory.js');
const { Chest, CHEST_SIZE } = await import('../src/chest.js');

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const inv = new Inventory();
const ui = createChestUI(inv);
ui.open(new Chest());

// Every chest slot and every inventory slot is a clickable 52px tile in the panel.
const tiles = made.filter((e) => e.style.cssText.includes('width:52px;height:52px'));
check(`the panel has ${CHEST_SIZE} chest slots and ${INV_SIZE} inventory slots (${tiles.length} tiles)`, tiles.length === CHEST_SIZE + INV_SIZE);
check('the chest grid is 9 columns wide', made.some((e) => e.style.cssText.includes('repeat(9,52px)')));

ui.close();
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
