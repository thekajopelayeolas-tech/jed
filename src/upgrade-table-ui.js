import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { iconCanvas } from './icons.js';
import { placeStack, splitStack } from './stacks.js';

const UPGRADES = {
  [BLOCK.WOODEN_PICKAXE]: { next: BLOCK.STONE_PICKAXE, cost: 5 },
  [BLOCK.STONE_PICKAXE]: { next: BLOCK.IRON_PICKAXE, cost: 10 },
  [BLOCK.IRON_PICKAXE]: { next: BLOCK.DIAMOND_PICKAXE, cost: 20 },
  [BLOCK.WOODEN_SWORD]: { next: BLOCK.STONE_SWORD, cost: 5 },
  [BLOCK.STONE_SWORD]: { next: BLOCK.IRON_SWORD, cost: 10 },
  [BLOCK.IRON_SWORD]: { next: BLOCK.DIAMOND_SWORD, cost: 20 },
  [BLOCK.DIAMOND_SWORD]: { next: BLOCK.DIAMOND_SWORD_SHARPNESS, cost: 30 },
  [BLOCK.DIAMOND_SWORD_SHARPNESS]: { next: BLOCK.DIAMOND_SWORD_FIRE_ASPECT, cost: 40 },
};

// Upgrade Table panel: interface for upgrading tools.
export function createUpgradeTableUI(inventory) {
  let open = false;
  
  // Slots
  const toolSlot = { id: BLOCK.AIR, count: 0 };
  const materialSlot = { id: BLOCK.AIR, count: 0 };
  // Held item
  const cursor = { id: BLOCK.AIR, count: 0 };
  const cursorEl = document.createElement('div');
  cursorEl.style.cssText = 'position:fixed;pointer-events:none;z-index:100;';
  document.body.appendChild(cursorEl);


  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.6);pointer-events:auto;font-family:monospace;user-select:none;';
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  document.body.appendChild(root);

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#c6c6c6;border:3px solid #000;padding:14px;display:flex;flex-direction:column;gap:12px;color:#222;width:fit-content;';
  root.appendChild(panel);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  const title = document.createElement('div');
  title.textContent = 'Upgrade Table';
  title.style.cssText = 'font-size:18px;font-weight:bold;margin-bottom:5px;border-bottom:2px solid #000;padding-bottom:5px;';
  panel.appendChild(title);

  const upgradeSection = document.createElement('div');
  upgradeSection.style.cssText = 'display:flex;align-items:center;gap:20px;justify-content:center;background:#9b9b9b;padding:10px;border:2px solid #555;';
  panel.appendChild(upgradeSection);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;gap:10px;';
  upgradeSection.appendChild(grid);

  const makeSlot = (slot, label) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    const el = document.createElement('div');
    el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;';
    el.addEventListener('click', (e) => {
        placeStack(slot, cursor);
        render();
    });
    wrapper.appendChild(el);
    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.style.fontSize = '12px';
    wrapper.appendChild(lbl);
    grid.appendChild(wrapper);
    return el;
  };

  const toolEl = makeSlot(toolSlot, 'Item');
  const materialEl = makeSlot(materialSlot, 'Emeralds');

  const upgradeBtn = document.createElement('button');
  upgradeBtn.textContent = 'Upgrade';
  upgradeBtn.style.cssText = 'padding:10px 20px;cursor:pointer;font-weight:bold;';
  upgradeBtn.addEventListener('click', () => {
    // Increment level on any item. Cost increases with level.
    if (toolSlot.id !== BLOCK.AIR && materialSlot.id === BLOCK.EMERALD) {
      const currentLevel = toolSlot.level || 0;
      const cost = currentLevel + 1;
      
      if (materialSlot.count >= cost) {
        toolSlot.level = currentLevel + 1;
        materialSlot.count -= cost;
        if (materialSlot.count === 0) materialSlot.id = BLOCK.AIR;
        
        messageEl.textContent = `Upgraded to Level ${toolSlot.level}!`;
        setTimeout(() => { messageEl.textContent = ''; }, 2000);
        
        render();
      }
    }
  });

  upgradeSection.appendChild(upgradeBtn);

  const invSection = document.createElement('div');
  invSection.style.cssText = 'margin-top:15px;padding-top:15px;border-top:2px solid #000;';
  panel.appendChild(invSection);

  const invGrid = document.createElement('div');
  invGrid.style.cssText = `display:grid;grid-template-columns:repeat(9,52px);gap:4px;`;
  invSection.appendChild(invGrid);

  const makeInventorySlot = (slot) => {
    const el = document.createElement('div');
    el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:#8b8b8b;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    el.addEventListener('click', (e) => {
        if (e.button === 2) splitStack(slot, cursor);
        else placeStack(slot, cursor);
        render();
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return el;
  };

  const messageEl = document.createElement('div');
  messageEl.style.cssText = 'height:20px;text-align:center;font-size:14px;color:#004a00;font-weight:bold;';
  panel.appendChild(messageEl);

  const invSlots = inventory.slots.map(slot => {
    const el = makeInventorySlot(slot);
    invGrid.appendChild(el);
    return el;
  });



  function render() {
    toolEl.innerHTML = '';
    if (toolSlot.id !== BLOCK.AIR) {
        toolEl.appendChild(iconCanvas(toolSlot.id, 32));
        if (toolSlot.level) {
            const lvl = document.createElement('div');
            lvl.textContent = `Lvl ${toolSlot.level}`;
            lvl.style.cssText = 'position:absolute;font-size:10px;color:#ff0;text-shadow:1px 1px 0 #000;';
            toolEl.appendChild(lvl);
        }
    }
    
    materialEl.innerHTML = '';
    if (materialSlot.id !== BLOCK.AIR) materialEl.appendChild(iconCanvas(materialSlot.id, 32));
    if (materialSlot.id !== BLOCK.AIR) {
      const cnt = document.createElement('div');
      cnt.textContent = `x${materialSlot.count}`;
      materialEl.appendChild(cnt);
    }

    invSlots.forEach((el, i) => {
        el.innerHTML = '';
        const slot = inventory.slots[i];
        if (slot.id !== BLOCK.AIR) {
            el.appendChild(iconCanvas(slot.id, 32));
            const cnt = document.createElement('div');
            cnt.textContent = `x${slot.count}`;
            el.appendChild(cnt);
        }
    });

    cursorEl.innerHTML = '';
    if (cursor.id !== BLOCK.AIR) {
        cursorEl.appendChild(iconCanvas(cursor.id, 32));
        const cnt = document.createElement('div');
        cnt.textContent = `x${cursor.count}`;
        cursorEl.appendChild(cnt);
    }
  }

  function close() {
    open = false;
    root.style.display = 'none';
    // Return items to inventory
    if (toolSlot.id !== BLOCK.AIR) inventory.add(toolSlot.id, toolSlot.count);
    toolSlot.id = BLOCK.AIR; toolSlot.count = 0;
    if (materialSlot.id !== BLOCK.AIR) inventory.add(materialSlot.id, materialSlot.count);
    materialSlot.id = BLOCK.AIR; materialSlot.count = 0;
    if (cursor.id !== BLOCK.AIR) {
        inventory.add(cursor.id, cursor.count);
        cursor.id = BLOCK.AIR; cursor.count = 0;
    }
    render();
  }

  // Move the held-stack swatch with the mouse.
  window.addEventListener('mousemove', (e) => {
    if (!open) return;
    cursorEl.style.left = `${e.clientX + 8}px`;
    cursorEl.style.top = `${e.clientY + 8}px`;
  });



  return {
    isOpen: () => open,
    open() {
      open = true;
      root.style.display = 'flex';
      render();
    },
    close,
  };
}
