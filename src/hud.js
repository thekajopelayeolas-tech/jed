import { BLOCK_DEFS } from './blocks.js';
import { HOTBAR_SIZE } from './inventory.js';
import { iconCanvas } from './icons.js';
import { MAX_HUNGER } from './hunger.js';

// Colours for the meter icons. Full icons are filled, empty icons are dark outlines.
const HEART_FULL = '#e02020';
const HEART_EMPTY = '#3a0a0a';
const HUNGER_BUN = '#d9a04f';
const HUNGER_PATTY = '#6b3a1e';
const HUNGER_EMPTY = '#2e2516';

// A heart: two round lobes over a downward point, drawn with CSS so its colour is exact.
function heartIcon(full) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:14px;height:13px;';
  const color = full ? HEART_FULL : HEART_EMPTY;
  el.innerHTML =
    `<div style="position:absolute;left:0;top:0;width:8px;height:8px;border-radius:50%;background:${color};"></div>` +
    `<div style="position:absolute;left:6px;top:0;width:8px;height:8px;border-radius:50%;background:${color};"></div>` +
    `<div style="position:absolute;left:3px;top:4px;width:8px;height:8px;background:${color};transform:rotate(45deg);"></div>`;
  return el;
}

// A burger: a domed top bun, a patty, and a flat bottom bun. Empty points keep the same shapes in dark colours.
function hungerIcon(full) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:14px;height:14px;';
  const bun = full ? HUNGER_BUN : HUNGER_EMPTY;
  const patty = full ? HUNGER_PATTY : HUNGER_EMPTY;
  el.innerHTML =
    `<div style="position:absolute;left:1px;top:0px;width:12px;height:6px;border-radius:6px 6px 2px 2px;background:${bun};"></div>` +
    `<div style="position:absolute;left:0px;top:6px;width:14px;height:3px;border-radius:1px;background:${patty};"></div>` +
    `<div style="position:absolute;left:1px;top:9px;width:12px;height:4px;border-radius:2px 2px 4px 4px;background:${bun};"></div>`;
  return el;
}

// A row of nine icons for one meter. set(filled, total, kind) rebuilds only when the count changes.
function makeMeter(parent) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:2px;';
  parent.appendChild(row);
  let shown = -1;
  let shownTotal = -1;
  return {
    set(filled, total, kind) {
      if (filled === shown && total === shownTotal) return;
      shown = filled;
      shownTotal = total;
      row.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const isFull = i < filled;
        row.appendChild(kind === 'heart' ? heartIcon(isFull) : hungerIcon(isFull));
      }
    },
  };
}

// DOM overlay: crosshair, hotbar, hearts and hunger, debug info, and pause text.
export function createHud() {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;color:#fff;text-shadow:1px 1px 0 #000;';
  document.body.appendChild(root);

  const crosshair = document.createElement('div');
  crosshair.style.cssText = 'position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;' +
    'border:2px solid rgba(255,255,255,0.8);box-sizing:border-box;';
  root.appendChild(crosshair);

  const info = document.createElement('div');
  info.style.cssText = 'position:absolute;left:8px;top:8px;font-size:13px;line-height:1.4;white-space:pre;';
  root.appendChild(info);

  // Hearts and hunger sit above the hotbar: hearts on the left, hunger on the right, nine icons each.
  const stats = document.createElement('div');
  stats.style.cssText = 'position:absolute;left:50%;bottom:86px;transform:translateX(-50%);display:flex;gap:24px;';
  root.appendChild(stats);
  const heartBar = makeMeter(stats);
  const hungerBar = makeMeter(stats);

  const hotbar = document.createElement('div');
  hotbar.style.cssText = 'position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:4px;';
  root.appendChild(hotbar);
  const slotEls = [];
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const el = document.createElement('div');
    el.style.cssText = 'width:52px;height:52px;border:2px solid #555;background:rgba(0,0,0,0.5);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;box-sizing:border-box;';
    hotbar.appendChild(el);
    slotEls.push(el);
  }

  // Central status line for sleep and other messages.
  const status = document.createElement('div');
  status.style.cssText = 'position:absolute;left:50%;top:30%;transform:translateX(-50%);font-size:20px;text-align:center;display:none;';
  root.appendChild(status);

  const pause = document.createElement('div');
  pause.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.5);font-size:22px;pointer-events:auto;cursor:pointer;';
  pause.textContent = 'Click to play. WASD move, Space jump, E crafting, 1-9 select, LMB attack/break, RMB place/use, R respawn';
  root.appendChild(pause);

  return {
    setPaused(paused) {
      pause.style.display = paused ? 'flex' : 'none';
    },
    // `status` is text to show centre-screen, or an empty string to hide it.
    setStatus(text) {
      status.textContent = text;
      status.style.display = text ? 'block' : 'none';
    },
    update({ inventory, target, health: hp, maxHealth, hunger, timeOfDay, pos, chunks }) {
      info.textContent =
        `XYZ: ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}\n` +
        `Chunks: ${chunks}\n` +
        `Time: ${(timeOfDay * 100).toFixed(0)}%` +
        (target ? `\nLooking at: ${target}` : '');
      // Each heart is 2 health; each hunger icon is 1 point out of 9.
      heartBar.set(Math.ceil(hp / 2), Math.ceil(maxHealth / 2), 'heart');
      hungerBar.set(hunger, MAX_HUNGER, 'hunger');

      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const slot = inventory.slots[i];
        const id = slot.id;
        const def = BLOCK_DEFS[id];
        const selected = i === inventory.selected;
        slotEls[i].style.borderColor = selected ? '#fff' : '#555';
        slotEls[i].innerHTML = '';
        if (id && def) {
          slotEls[i].appendChild(iconCanvas(id, 32));
          const count = document.createElement('div');
          count.textContent = slot.count;
          slotEls[i].appendChild(count);
        }
      }
    },
  };
}
