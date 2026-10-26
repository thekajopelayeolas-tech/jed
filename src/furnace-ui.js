import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { INV_SIZE, HOTBAR_SIZE } from './inventory.js';
import { placeStack } from './stacks.js';
import { iconCanvas } from './icons.js';
import { SMELT_TIME } from './smelting.js';

const STACK_MAX = 64;

function makeSlot(onClick) {
  const el = document.createElement('div');
  el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;' +
    'align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;position:relative;';
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

function countNode(count) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000';
  el.textContent = count > 1 ? count : '';
  return el;
}

// Moves as much of a furnace slot's stack into the inventory as fits. Whatever does not fit stays in the slot.
export function moveSlotToInventory(inventory, slot) {
  if (slot.id === BLOCK.AIR || slot.count <= 0) return;
  slot.count = inventory.add(slot.id, slot.count);
  if (slot.count <= 0) { slot.id = BLOCK.AIR; slot.count = 0; }
}

function paint(el, stack) {
  const def = BLOCK_DEFS[stack.id];
  el.innerHTML = '';
  if (stack.id === BLOCK.AIR || !def) return;
  el.appendChild(iconCanvas(stack.id, 32));
  el.appendChild(countNode(stack.count));
}

// Furnace panel: input on the left, fuel below it, the smelted output on the right, with a progress
// bar and a flame gauge. The player's inventory is shown below so items can move in and out.
// Clicks use the same stack rules as the inventory: left click picks up or places, right click splits.
export function createFurnaceUI(inventory) {
  let open = false;
  let furnace = null;
  // The stack held by the mouse cursor.
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
  title.textContent = 'Furnace';
  title.style.cssText = 'font-size:16px;font-weight:bold;';
  panel.appendChild(title);

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:center;gap:20px;';
  panel.appendChild(topRow);

  const left = document.createElement('div');
  left.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  topRow.appendChild(left);

  const inputEl = makeSlot((e) => click('input', e));
  left.appendChild(inputEl);
  const fuelEl = makeSlot((e) => click('fuel', e));
  left.appendChild(fuelEl);

  // Flame and progress between the input and the output.
  const middle = document.createElement('div');
  middle.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;width:90px;';
  topRow.appendChild(middle);
  const flame = document.createElement('div');
  flame.style.cssText = 'width:24px;height:24px;background:#444;border:1px solid #000;';
  middle.appendChild(flame);
  const bar = document.createElement('div');
  bar.style.cssText = 'width:80px;height:10px;background:#555;border:1px solid #000;';
  middle.appendChild(bar);
  const barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;width:0%;background:#e6a23c;';
  bar.appendChild(barFill);
  const arrow = document.createElement('div');
  arrow.textContent = '→';
  arrow.style.cssText = 'font-size:28px;';
  middle.appendChild(arrow);

  const outputEl = makeSlot((e) => click('output', e));
  topRow.appendChild(outputEl);

  const mainWrap = document.createElement('div');
  mainWrap.style.cssText = 'display:grid;grid-template-columns:repeat(9,52px);gap:4px;';
  panel.appendChild(mainWrap);

  const hint = document.createElement('div');
  hint.textContent = 'Click: pick up / place · Shift click: take one slot · F: take everything · E: close';
  hint.style.cssText = 'font-size:12px;';
  panel.appendChild(hint);

  // Floating stack that follows the mouse while held.
  const held = document.createElement('div');
  held.style.cssText = 'position:fixed;width:34px;height:34px;pointer-events:none;display:none;' +
    'align-items:center;justify-content:center;';
  root.appendChild(held);

  // Player inventory: main grid first (9..35), then the hotbar (0..8) as the bottom row.
  const order = [...Array(INV_SIZE - HOTBAR_SIZE).keys()].map((k) => k + HOTBAR_SIZE)
    .concat([...Array(HOTBAR_SIZE).keys()]);
  const invEls = {};
  for (const i of order) {
    const el = makeSlot(null);
    el.addEventListener('mousedown', (e) => clickInv(i, e));
    mainWrap.appendChild(el);
    invEls[i] = el;
  }
  // Which furnace slot a click targets.
  function slotFor(name) {
    if (name === 'input') return furnace.input;
    if (name === 'fuel') return furnace.fuel;
    return furnace.output;
  }

  function click(name, e) {
    if (!furnace) return;
    // Shift click moves the whole stack from this furnace slot into the player's inventory.
    if (e && e.shiftKey) {
      moveSlotToInventory(inventory, slotFor(name));
      render();
      return;
    }
    if (name === 'output') {
      // The output can only be taken as whole items the cursor can hold.
      const slot = furnace.output;
      if (slot.id === BLOCK.AIR) return;
      if (cursor.id === BLOCK.AIR || (cursor.id === slot.id && cursor.count + slot.count <= STACK_MAX)) {
        placeStack(slot, cursor);
      }
    } else {
      placeStack(slotFor(name), cursor);
    }
    render();
  }

  function clickInv(i, e) {
    e.preventDefault();
    if (!furnace) return;
    const slot = inventory.slots[i];
    if (e.button === 2) splitStackInto(slot);
    else placeStack(slot, cursor);
    render();
  }

  // Right click on an inventory slot takes half, or puts one item down, like the inventory screen.
  function splitStackInto(slot) {
    if (cursor.id === BLOCK.AIR) {
      if (slot.id === BLOCK.AIR || slot.count < 2) return;
      const half = Math.ceil(slot.count / 2);
      cursor.id = slot.id;
      cursor.count = half;
      slot.count -= half;
      return;
    }
    if (slot.id === BLOCK.AIR) {
      slot.id = cursor.id;
      slot.count = 1;
    } else if (slot.id === cursor.id && slot.count < STACK_MAX) {
      slot.count += 1;
    } else {
      return;
    }
    cursor.count -= 1;
    if (cursor.count === 0) cursor.id = BLOCK.AIR;
  }

  function render() {
    if (!furnace) return;
    paint(inputEl, furnace.input);
    paint(fuelEl, furnace.fuel);
    paint(outputEl, furnace.output);
    inventory.slots.forEach((s, i) => paint(invEls[i], s));
    if (cursor.id !== BLOCK.AIR) {
      held.style.display = 'flex';
      held.innerHTML = '';
      held.appendChild(iconCanvas(cursor.id, 30));
      held.appendChild(countNode(cursor.count));
    } else {
      held.style.display = 'none';
    }
    // The flame is lit while fuel is burning. The bar fills as an item smelts.
    flame.style.background = furnace.burnLeft > 0 ? '#e0622a' : '#444';
    barFill.style.width = `${Math.min(100, (furnace.progress / SMELT_TIME) * 100)}%`;
  }

  // Move the held-stack swatch with the mouse.
  window.addEventListener('mousemove', (e) => {
    if (!open) return;
    held.style.left = `${e.clientX + 8}px`;
    held.style.top = `${e.clientY + 8}px`;
  });

  return {
    isOpen: () => open,
    // Opens the panel on a furnace. The furnace object belongs to the world, so its state is kept.
    open(f) {
      furnace = f;
      open = true;
      root.style.display = 'flex';
      render();
    },
    // Moves everything out of the open furnace (input, fuel and output) into the player's inventory.
    // Whatever does not fit stays in the furnace. Bound to F while the furnace panel is open.
    takeAll() {
      if (!open || !furnace) return;
      for (const slot of [furnace.input, furnace.fuel, furnace.output]) moveSlotToInventory(inventory, slot);
      render();
    },
    // Closes the panel. The furnace keeps its contents, and only the item held on the cursor is returned.
    close() {
      if (!open) return;
      open = false;
      root.style.display = 'none';
      // The furnace keeps its contents when closed. Only the item held on the cursor is returned.
      if (cursor.id !== BLOCK.AIR) {
        const left = inventory.add(cursor.id, cursor.count);
        cursor.count = left;
        if (left === 0) cursor.id = BLOCK.AIR;
      }
      furnace = null;
    },
    // Redraws the panel while it is open, for example as smelting progresses.
    refresh() {
      if (open) render();
    },
  };
}


