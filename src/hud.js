import { BLOCK_DEFS } from './blocks.js';
import { HOTBAR_SIZE } from './inventory.js';

const COLOR_CSS = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

// DOM overlay: crosshair, hotbar, health, debug info, and pause text.
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

  const health = document.createElement('div');
  health.style.cssText = 'position:absolute;left:50%;bottom:86px;transform:translateX(-50%);font-size:16px;';
  root.appendChild(health);

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
    update({ inventory, target, health: hp, maxHealth, timeOfDay, pos, chunks }) {
      info.textContent =
        `XYZ: ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}\n` +
        `Chunks: ${chunks}\n` +
        `Time: ${(timeOfDay * 100).toFixed(0)}%` +
        (target ? `\nLooking at: ${target}` : '');
      health.textContent = '♥'.repeat(Math.ceil((hp / maxHealth) * 10)) + ` ${hp}/${maxHealth}`;

      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const slot = inventory.slots[i];
        const id = slot.id;
        const def = BLOCK_DEFS[id];
        const selected = i === inventory.selected;
        slotEls[i].style.borderColor = selected ? '#fff' : '#555';
        slotEls[i].innerHTML = id && def
          ? `<div style="width:24px;height:24px;background:${COLOR_CSS(def.side)};border:1px solid #000"></div>` +
            `<div>${slot.count}</div>`
          : '';
      }
    },
  };
}
