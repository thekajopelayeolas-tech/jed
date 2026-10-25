import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { HOTBAR_SIZE, INV_SIZE, matchRecipe } from './inventory.js';
import { placeStack, splitStack, moveStack } from './stacks.js';

const GRID_SIZE = 3;
const STACK_MAX = 64;

// Solid background for an item icon, using the block's side colour.
function iconCSS(id) {
  const c = BLOCK_DEFS[id]?.side ?? [1, 1, 1];
  return `background:rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)});`;
}

function makeSlot(onClick) {
  const el = document.createElement('div');
  el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;' +
    'align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;position:relative;';
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

// Draws a stack into a slot element: an icon swatch and the count in the corner.
function paint(el, stack) {
  const def = BLOCK_DEFS[stack.id];
  el.innerHTML = stack.id !== BLOCK.AIR && def
    ? `<div style="width:26px;height:26px;${iconCSS(stack.id)}border:1px solid #000"></div>` +
      `<div style="position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000">` +
      `${stack.count > 1 ? stack.count : ''}</div>`
    : '';
}

// Mouse-driven inventory screen (press E). Left click picks up a stack or places it. Right click
// splits a stack or drops one item. Shift click moves a stack between the hotbar and the main grid.
// The 3x3 crafting grid and its output are shown next to the inventory.
export function createInventoryUI(inventory) {
  let open = false;
  const craftGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ id: BLOCK.AIR, count: 0 }));
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

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:center;gap:20px;';
  panel.appendChild(topRow);

  const gridWrap = document.createElement('div');
  gridWrap.style.cssText = `display:grid;grid-template-columns:repeat(${GRID_SIZE},52px);gap:4px;`;
  topRow.appendChild(gridWrap);

  const arrow = document.createElement('div');
  arrow.textContent = '→';
  arrow.style.cssText = 'font-size:28px;';
  topRow.appendChild(arrow);

  const outEl = makeSlot(() => takeOutput());
  topRow.appendChild(outEl);

  const mainWrap = document.createElement('div');
  mainWrap.style.cssText = 'display:grid;grid-template-columns:repeat(9,52px);gap:4px;';
  panel.appendChild(mainWrap);

  const hint = document.createElement('div');
  hint.textContent = 'Click: pick up / place · Right click: split · Shift click: move · E: close';
  hint.style.cssText = 'font-size:12px;';
  panel.appendChild(hint);

  // Floating stack that follows the mouse while held.
  const held = document.createElement('div');
  held.style.cssText = 'position:fixed;width:34px;height:34px;pointer-events:none;display:none;' +
    'align-items:center;justify-content:center;';
  root.appendChild(held);

  const gridEls = craftGrid.map((_, i) => {
    const el = makeSlot(() => clickCraft(i));
    gridWrap.appendChild(el);
    return el;
  });

  // Inventory slots are shown main grid first (9..35), then the hotbar (0..8) as the bottom row.
  const order = [...Array(INV_SIZE - HOTBAR_SIZE).keys()].map((k) => k + HOTBAR_SIZE)
    .concat([...Array(HOTBAR_SIZE).keys()]);
  const invEls = {};
  for (const i of order) {
    const el = makeSlot(null);
    el.addEventListener('mousedown', (e) => clickInv(i, e));
    mainWrap.appendChild(el);
    invEls[i] = el;
  }

  function render() {
    craftGrid.forEach((s, i) => paint(gridEls[i], s));
    inventory.slots.forEach((s, i) => paint(invEls[i], s));
    const out = matchRecipe(craftGrid.map((s) => s.id), GRID_SIZE);
    paint(outEl, out ? { id: out.result, count: out.count } : { id: BLOCK.AIR, count: 0 });
    if (cursor.id !== BLOCK.AIR) {
      held.style.display = 'flex';
      held.innerHTML = `<div style="width:30px;height:30px;${iconCSS(cursor.id)}border:1px solid #000"></div>` +
        `<div style="position:absolute;right:0;bottom:0;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000">` +
        `${cursor.count > 1 ? cursor.count : ''}</div>`;
    } else {
      held.style.display = 'none';
    }
  }



  // Shift click sends hotbar items to the main grid, and main grid items to the hotbar.
  function moveAcrossHotbar(i) {
    if (i < HOTBAR_SIZE) moveStack(inventory.slots, i, HOTBAR_SIZE, INV_SIZE);
    else moveStack(inventory.slots, i, 0, HOTBAR_SIZE);
  }

  function clickInv(i, e) {
    e.preventDefault();
    const slot = inventory.slots[i];
    if (e.button === 2) splitStack(slot, cursor);
    else if (e.shiftKey) moveAcrossHotbar(i);
    else placeStack(slot, cursor);
    render();
  }

  function clickCraft(i) {
    placeStack(craftGrid[i], cursor);
    render();
  }

  // Click the output: craft if the grid matches and the result can be held, consuming one item per filled cell.
  function takeOutput() {
    const out = matchRecipe(craftGrid.map((s) => s.id), GRID_SIZE);
    if (!out) return;
    if (cursor.id !== BLOCK.AIR && (cursor.id !== out.result || cursor.count + out.count > STACK_MAX)) return;
    for (const cell of craftGrid) {
      if (cell.id === BLOCK.AIR) continue;
      cell.count -= 1;
      if (cell.count <= 0) { cell.id = BLOCK.AIR; cell.count = 0; }
    }
    if (cursor.id === BLOCK.AIR) {
      cursor.id = out.result;
      cursor.count = out.count;
    } else {
      cursor.count += out.count;
    }
    render();
  }

  // Returns grid items and the held stack to the inventory when the screen closes.
  function returnAll() {
    for (const cell of craftGrid) {
      while (cell.count > 0 && inventory.add(cell.id, 1) === 0) cell.count -= 1;
      if (cell.count <= 0) { cell.id = BLOCK.AIR; cell.count = 0; }
    }
    if (cursor.id !== BLOCK.AIR) {
      const left = inventory.add(cursor.id, cursor.count);
      cursor.count = left;
      if (left === 0) cursor.id = BLOCK.AIR;
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
    toggle() {
      open = !open;
      root.style.display = open ? 'flex' : 'none';
      if (open) {
        render();
      } else {
        returnAll();
        render();
      }
      return open;
    },
  };
}
