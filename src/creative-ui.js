// The creative inventory: every block and item in the game, free to take. Shown only in creative worlds.
// Clicking a tile adds one full stack of that item to the player's inventory. Items that cannot be crafted are listed too.
import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { iconCanvas } from './icons.js';

const STACK = 64;

export function createCreativeUI(inventory) {
  let open = false;

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.6);pointer-events:auto;font-family:monospace;user-select:none;';
  document.body.appendChild(root);

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#c6c6c6;border:3px solid #000;padding:14px;display:flex;flex-direction:column;gap:10px;' +
    'color:#222;max-height:90vh;width:640px;box-sizing:border-box;';
  root.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Creative: click an item for a full stack (free)';
  title.style.cssText = 'font-size:16px;font-weight:bold;';
  panel.appendChild(title);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:4px;overflow:auto;';
  panel.appendChild(grid);

  // Every real entry, in id order. Air is not an item, so it is left out.
  const ids = Object.keys(BLOCK_DEFS).map(Number).filter((id) => id !== BLOCK.AIR && BLOCK_DEFS[id]?.name).sort((a, b) => a - b);

  for (const id of ids) {
    const tile = document.createElement('div');
    tile.title = BLOCK_DEFS[id].name;
    tile.style.cssText = 'width:64px;height:64px;border:2px solid #555;background:#8b8b8b;display:flex;align-items:center;' +
      'justify-content:center;box-sizing:border-box;cursor:pointer;';
    tile.appendChild(iconCanvas(id, 40));
    tile.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      // Adds a full stack for free. The inventory handles spilling into more slots if it is full.
      inventory.add(id, STACK);
    });
    grid.appendChild(tile);
  }

  const close = () => {
    open = false;
    root.style.display = 'none';
  };
  const show = () => {
    open = true;
    root.style.display = 'flex';
  };

  return {
    isOpen: () => open,
    toggle() {
      if (open) close();
      else show();
      return open;
    },
    close,
  };
}
