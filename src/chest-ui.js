import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { INV_SIZE, HOTBAR_SIZE } from './inventory.js';
import { placeStack, splitStack } from './stacks.js';
import { iconCanvas } from './icons.js';
import { CHEST_SIZE } from './chest.js';

const CHEST_COLS = 9;

function makeSlot(onClick) {
  const el = document.createElement('div');
  el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;' +
    'align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;position:relative;';
  if (onClick) el.addEventListener('mousedown', onClick);
  return el;
}

function countNode(count) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000';
  el.textContent = count > 1 ? count : '';
  return el;
}

function paint(el, stack) {
  const def = BLOCK_DEFS[stack.id];
  el.innerHTML = '';
  if (stack.id === BLOCK.AIR || !def) return;
  el.appendChild(iconCanvas(stack.id, 32));
  el.appendChild(countNode(stack.count));
}

// Chest panel: a 9x3 grid of the chest's 27 slots on top, and the player's inventory below.
// Clicks follow the inventory rules: left click picks up or places, right click splits. Shift click moves
// a stack across: from the chest to the inventory, or from the inventory into the chest.
export function createChestUI(inventory) {
  let open = false;
  let chest = null;
  const cursor = { id: BLOCK.AIR, count: 0 };

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.6);pointer-events:auto;font-family:monospace;user-select:none;';
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  document.body.appendChild(root);

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#c6c6c6;border:3px solid #000;padding:14px;display:flex;flex-direction:column;gap:12px;color:#222;';
  root.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Chest';
  title.style.cssText = 'font-size:16px;font-weight:bold;';
  panel.appendChild(title);

  const chestWrap = document.createElement('div');
  chestWrap.style.cssText = `display:grid;grid-template-columns:repeat(${CHEST_COLS},52px);gap:4px;`;
  panel.appendChild(chestWrap);

  const invTitle = document.createElement('div');
  invTitle.textContent = 'Inventory';
  invTitle.style.cssText = 'font-size:13px;';
  panel.appendChild(invTitle);

  const mainWrap = document.createElement('div');
  mainWrap.style.cssText = 'display:grid;grid-template-columns:repeat(9,52px);gap:4px;';
  panel.appendChild(mainWrap);

  const hint = document.createElement('div');
  hint.textContent = 'Click: pick up / place · Right click: split · Shift click: move across · E: close';
  hint.style.cssText = 'font-size:12px;';
  panel.appendChild(hint);

  // Floating stack that follows the mouse while held.
  const held = document.createElement('div');
  held.style.cssText = 'position:fixed;width:34px;height:34px;pointer-events:none;display:none;' +
    'align-items:center;justify-content:center;';
  root.appendChild(held);

  // Chest slots, built once. Each one clicks into the chest.
  const chestEls = [];
  for (let i = 0; i < CHEST_SIZE; i++) {
    const el = makeSlot((e) => clickChest(i, e));
    chestWrap.appendChild(el);
    chestEls.push(el);
  }

  // Player inventory: main grid first (9..35), then the hotbar (0..8) as the bottom row.
  const order = [...Array(INV_SIZE - HOTBAR_SIZE).keys()].map((k) => k + HOTBAR_SIZE)
    .concat([...Array(HOTBAR_SIZE).keys()]);
  const invEls = {};
  for (const i of order) {
    const el = makeSlot((e) => clickInv(i, e));
    mainWrap.appendChild(el);
    invEls[i] = el;

  // Shift click: a chest slot moves its stack into the inventory. Right click splits, and left click places.
  function clickChest(i, e) {
    e.preventDefault();
    if (!chest) return;
    const slot = chest.slots[i];
    if (e.button === 2) splitStack(slot, cursor);
    else if (e.shiftKey) moveStackTo(slot, inventory);
    else placeStack(slot, cursor);
    render();
  }

  // Shift click: an inventory slot moves its stack into the chest.
  function clickInv(i, e) {
    e.preventDefault();
    if (!chest) return;
    const slot = inventory.slots[i];
    if (e.button === 2) splitStack(slot, cursor);
    else if (e.shiftKey) moveStackTo(slot, chest);
    else placeStack(slot, cursor);
    render();
  }

  // Moves as much of a stack as fits into the target (an inventory or a chest). What does not fit stays put.
  function moveStackTo(slot, target) {
    if (slot.id === BLOCK.AIR || slot.count <= 0) return;
    if (target === inventory) {
      slot.count = inventory.add(slot.id, slot.count);
    } else {
      slot.count = target.add(slot.id, slot.count);
    }
    if (slot.count <= 0) { slot.id = BLOCK.AIR; slot.count = 0; }
  }

  function render() {
    if (!chest) return;
    chest.slots.forEach((s, i) => paint(chestEls[i], s));
    inventory.slots.forEach((s, i) => paint(invEls[i], s));
    if (cursor.id !== BLOCK.AIR) {
      held.style.display = 'flex';
      held.innerHTML = '';
      held.appendChild(iconCanvas(cursor.id, 30));
      held.appendChild(countNode(cursor.count));
    } else {
      held.style.display = 'none';
    }
  }

  // Move the held-stack swatch with the mouse.
  window.addEventListener('mousemove', (e) => {
    if (!open) return;
    held.style.left = `${e.clientX + 8}px`;
    held.style.top = `${e.clientY + 8}px`;
  });

  return {
    isOpen: () => open,
    // Opens the panel on a chest. The chest belongs to the world, so its contents are kept.
    open(c) {
      chest = c;
      open = true;
      root.style.display = 'flex';
      render();
    },
    // Closes the panel. The chest keeps its contents. Only the item held on the cursor is returned.
    close() {
      if (!open) return;
      open = false;
      root.style.display = 'none';
      if (cursor.id !== BLOCK.AIR) {
        cursor.count = inventory.add(cursor.id, cursor.count);
        if (cursor.count === 0) cursor.id = BLOCK.AIR;
      }
      chest = null;
    },
    // Redraws the panel while it is open.
    refresh() {
      if (open) render();
    },
  };
}

  }
