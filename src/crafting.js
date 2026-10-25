import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { INV_SIZE, matchRecipe } from './inventory.js';

const GRID_SIZE = 3;
const COLOR_CSS = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

// True if `count` items of `id` fit into the inventory's current stacks and empty slots.
function canFit(inventory, id, count) {
  let space = 0;
  for (const s of inventory.slots) {
    if (s.id === BLOCK.AIR) space += 64;
    else if (s.id === id) space += 64 - s.count;
  }
  return space >= count;
}

// Crafting panel (press E). Click inventory slots to move one item into the 3x3 grid,
// click a grid cell to return it, and click the output to craft.
export function createCrafting(inventory) {
  let open = false;
  const grid = new Array(GRID_SIZE * GRID_SIZE).fill(BLOCK.AIR);

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.6);pointer-events:auto;font-family:monospace;color:#fff;';
  document.body.appendChild(root);

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#c6c6c6;border:3px solid #000;padding:14px;display:flex;flex-direction:column;gap:12px;';
  root.appendChild(panel);

  const top = document.createElement('div');
  top.style.cssText = 'display:flex;align-items:center;gap:20px;';
  panel.appendChild(top);

  const gridWrap = document.createElement('div');
  gridWrap.style.cssText = `display:grid;grid-template-columns:repeat(${GRID_SIZE},56px);gap:4px;`;
  top.appendChild(gridWrap);

  const arrow = document.createElement('div');
  arrow.textContent = '→';
  arrow.style.cssText = 'font-size:28px;color:#222;';
  top.appendChild(arrow);

  const outEl = slotEl(() => craft());
  top.appendChild(outEl);

  const invWrap = document.createElement('div');
  invWrap.style.cssText = 'display:grid;grid-template-columns:repeat(9,52px);gap:4px;';
  panel.appendChild(invWrap);

  const gridEls = grid.map((_, i) => {
    const el = slotEl(() => returnToInventory(i));
    gridWrap.appendChild(el);
    return el;
  });

  const invEls = inventory.slots.map((_, i) => {
    const el = slotEl(() => moveToGrid(i));
    invWrap.appendChild(el);
    return el;
  });

  function slotEl(onClick) {
    const el = document.createElement('div');
    el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;font-size:11px;box-sizing:border-box;cursor:pointer;';
    el.addEventListener('click', onClick);
    return el;
  }

  function paint(el, id, count) {
    const def = BLOCK_DEFS[id];
    el.innerHTML = id && def
      ? `<div style="width:22px;height:22px;background:${COLOR_CSS(def.side)};border:1px solid #000"></div>` +
        (count != null ? `<div>${count}</div>` : '')
      : '';
  }

  function render() {
    grid.forEach((id, i) => paint(gridEls[i], id, null));
    inventory.slots.forEach((s, i) => paint(invEls[i], s.id, s.count));
    const out = matchRecipe(grid, GRID_SIZE);
    if (out) paint(outEl, out.result, out.count);
    else paint(outEl, BLOCK.AIR, null);
  }

  function moveToGrid(invIndex) {
    const s = inventory.slots[invIndex];
    if (s.id === BLOCK.AIR) return;
    const cell = grid.indexOf(BLOCK.AIR);
    if (cell < 0) return;
    grid[cell] = s.id;
    s.count -= 1;
    if (s.count === 0) s.id = BLOCK.AIR;
    render();
  }

  function returnToInventory(cell) {
    const id = grid[cell];
    if (id === BLOCK.AIR) return;
    if (inventory.add(id, 1) === 0) grid[cell] = BLOCK.AIR;
    render();
  }

  function craft() {
    const out = matchRecipe(grid, GRID_SIZE);
    if (!out || !canFit(inventory, out.result, out.count)) return;
    // Recipes use one item per filled cell, so each filled cell gives up one item.
    for (let i = 0; i < grid.length; i++) grid[i] = BLOCK.AIR;
    inventory.add(out.result, out.count);
    render();
  }

  return {
    isOpen: () => open,
    // Opens or closes the panel. Closing returns grid items to the inventory.
    toggle() {
      open = !open;
      root.style.display = open ? 'flex' : 'none';
      if (open) {
        render();
      } else {
        for (let i = 0; i < grid.length; i++) returnToInventory(i);
      }
      return open;
    },
  };
}
