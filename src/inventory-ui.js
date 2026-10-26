import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { HOTBAR_SIZE, INV_SIZE, matchRecipe } from './inventory.js';
import { placeStack, splitStack, moveStack } from './stacks.js';
import { iconCanvas } from './icons.js';
import { PARTS, armourInfo } from './armour.js';
import { createCharacterPreview } from './character-ui.js';

const GRID_SIZE = 3;
const STACK_MAX = 64;

function makeSlot(onClick) {
  const el = document.createElement('div');
  el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;' +
    'align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;position:relative;';
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

// Stack size shown in the corner of a slot.
function countNode(count) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000';
  el.textContent = count > 1 ? count : '';
  return el;
}

// Draws a stack into a slot element: the block or item icon and the count in the corner.
function paint(el, stack) {
  const def = BLOCK_DEFS[stack.id];
  el.innerHTML = '';
  if (stack.id === BLOCK.AIR || !def) return;
  el.appendChild(iconCanvas(stack.id, 32));
  el.appendChild(countNode(stack.count));
}

// Mouse-driven inventory screen (press E). Left click picks up a stack or places it. Right click
// splits a stack or drops one item. Shift click moves a stack between the hotbar and the main grid.
// The 3x3 crafting grid and its output are shown next to the inventory. The four armour slots sit
// beside the crafting grid. `player` holds the worn armour, which reduces incoming damage.
export function createInventoryUI(inventory, player, atlasMaterial) {
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

  // Armour column: helmet, chest, legs, boots from top to bottom.
  const armourWrap = document.createElement('div');
  armourWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-left:12px;';
  topRow.appendChild(armourWrap);
  const armourEls = {};
  for (const part of PARTS) {
    const el = makeSlot(() => clickArmour(part));
    el.title = part;
    armourWrap.appendChild(el);
    armourEls[part] = el;
  }

  // The player's character preview sits beside the armour column, so the worn gear and held item show.
  const preview = createCharacterPreview(inventory, player, atlasMaterial);
  preview.element.style.marginLeft = '12px';
  topRow.appendChild(preview.element);

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
    for (const part of PARTS) {
      paint(armourEls[part], { id: player.armour[part], count: 1 });
    }
    const out = matchRecipe(craftGrid.map((s) => s.id), GRID_SIZE);
    paint(outEl, out ? { id: out.result, count: out.count } : { id: BLOCK.AIR, count: 0 });
    if (cursor.id !== BLOCK.AIR) {
      held.style.display = 'flex';
      held.innerHTML = '';
      held.appendChild(iconCanvas(cursor.id, 30));
      held.appendChild(countNode(cursor.count));
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

  // Armour slot click. With matching armour on the cursor, it is worn. With an empty cursor, the worn piece is taken off.
  function clickArmour(part) {
    const info = armourInfo(cursor.id);
    if (cursor.id === BLOCK.AIR) {
      const worn = player.armour[part];
      if (worn === BLOCK.AIR) return;
      player.armour[part] = BLOCK.AIR;
      cursor.id = worn;
      cursor.count = 1;
    } else if (info && info.part === part && player.armour[part] === BLOCK.AIR) {
      player.armour[part] = cursor.id;
      cursor.count -= 1;
      if (cursor.count === 0) cursor.id = BLOCK.AIR;
    } else {
      return;
    }
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
