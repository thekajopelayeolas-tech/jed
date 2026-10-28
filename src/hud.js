import { BLOCK_DEFS } from './blocks.js';
import { HOTBAR_SIZE } from './inventory.js';
import { iconCanvas } from './icons.js';
import { MAX_HUNGER } from './hunger.js';
// The burger picture, bundled by Vite. Used for the hunger meter.
import burgerUrl from './assets/burger.png';

// Colours for the meter icons. Full icons are filled, empty icons are dark outlines.
const HEART_FULL = '#e02020';
const HEART_EMPTY = '#3a0a0a';
const HUNGER_BUN = '#d9a04f';
const HUNGER_PATTY = '#6b3a1e';
const HUNGER_EMPTY = '#2e2516';
// Ten shields cover up to 20 defence points, more than the full diamond set (12).
const MAX_ARMOUR_SHIELDS = 10;

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

// A burger, drawn from burger.png. An empty burger is the same picture, greyed out, so the empty points still show.
function hungerIcon(full) {
  const el = document.createElement('img');
  el.src = burgerUrl;
  el.alt = '';
  el.draggable = false;
  el.style.cssText = `width:14px;height:14px;image-rendering:pixelated;flex:none;${full ? '' : 'filter:grayscale(1) brightness(0.45);'}`;
  return el;
}

// The crack pattern for one stage: more dark cracks appear as the stage grows. Drawn as SVG lines over a square.
function crackPattern(stage) {
  const lines = [
    [24, 24, 10, 8], [24, 24, 38, 10], [24, 24, 14, 40], [24, 24, 42, 36],
    [24, 24, 30, 46], [24, 24, 6, 26], [24, 24, 40, 22], [24, 24, 22, 4],
    [24, 24, 46, 46], [24, 24, 2, 46],
  ];
  const shown = lines.slice(0, stage + 1);
  const paths = shown.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="2" stroke-opacity="0.85"/>`).join('');
  return `<svg width="48" height="48" viewBox="0 0 48 48">${paths}</svg>`;
}

// A shield: a rounded top over a point, drawn with CSS. Full shields are steel grey, empty ones are dark.
const ARMOUR_FULL = '#b8c2cc';
const ARMOUR_EMPTY = '#2a2f36';
function armourIcon(full) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:12px;height:14px;';
  const color = full ? ARMOUR_FULL : ARMOUR_EMPTY;
  el.innerHTML =
    `<div style="position:absolute;left:0;top:0;width:12px;height:7px;border-radius:3px 3px 0 0;background:${color};"></div>` +
    `<div style="position:absolute;left:2px;top:5px;width:8px;height:9px;border-radius:0 0 6px 6px;background:${color};"></div>`;
  return el;
}

// A row of icons for one meter. set(filled, total, kind) rebuilds only when the count changes.
function makeMeter(parent) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:2px;';
  parent.appendChild(row);
  let shown = -1;
  let shownTotal = -1;
  let shownKind = '';
  return {
    set(filled, total, kind) {
      if (filled === shown && total === shownTotal && kind === shownKind) return;
      shown = filled;
      shownTotal = total;
      shownKind = kind;
      row.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const isFull = i < filled;
        const icon = kind === 'heart' ? heartIcon(isFull) : kind === 'armour' ? armourIcon(isFull) : hungerIcon(isFull);
        row.appendChild(icon);
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
  // Armour sits between hearts and hunger: each shield is 2 defence points, so the row shows the worn armour.
  const heartBar = makeMeter(stats);
  const armourBar = makeMeter(stats);
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

  // Crack overlay over the block being mined. It shows 10 stages, from none to almost broken.
  // `setCrack(fraction, hardness)` sets how far mining has got (0 to 1). The hardness label says how hard the block is.
  const crackEl = document.createElement('div');
  crackEl.style.cssText = 'position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;' +
    'pointer-events:none;display:none;';
  root.appendChild(crackEl);
  const crackLabel = document.createElement('div');
  crackLabel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,28px);font-size:11px;white-space:nowrap;';
  root.appendChild(crackLabel);
  let crackStage = -1;

  // The death screen: shown when health reaches zero. It says you lost and has a Respawn button.
  // The button calls the function given to setDeathHandler, and the screen is hidden again after respawning.
  const death = document.createElement('div');
  death.style.cssText = 'position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;' +
    'background:rgba(90,0,0,0.6);pointer-events:auto;font-family:sans-serif;color:#fff;';
  const deathTitle = document.createElement('div');
  deathTitle.textContent = 'You lost';
  deathTitle.style.cssText = 'font-size:56px;font-weight:bold;text-shadow:2px 2px 0 #000;margin-bottom:24px;';
  const respawnButton = document.createElement('button');
  respawnButton.textContent = 'Respawn';
  respawnButton.style.cssText = 'font-size:22px;padding:12px 32px;cursor:pointer;border:2px solid #fff;' +
    'background:#444;color:#fff;';
  const deathCount = document.createElement('div');
  deathCount.style.cssText = 'font-size:18px;margin-top:16px;text-shadow:1px 1px 0 #000;';
  death.appendChild(deathTitle);
  death.appendChild(deathCount);
  death.appendChild(respawnButton);
  root.appendChild(death);
  let onRespawnClick = () => {};
  respawnButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onRespawnClick();
  });

  // Central status line for sleep and other messages.
  const status = document.createElement('div');
  status.style.cssText = 'position:absolute;left:50%;top:30%;transform:translateX(-50%);font-size:20px;text-align:center;display:none;';
  root.appendChild(status);

  const pause = document.createElement('div');
  pause.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.5);font-size:22px;pointer-events:auto;cursor:pointer;';
  // The pause text sits above the lobby panel, which is added later with mountLobby().
  const pauseText = document.createElement('div');
  pauseText.textContent = 'Click to play. WASD move, Space jump, E crafting, B recipe book, 1-9 select, LMB attack/break, RMB place/use, R respawn';
  pause.appendChild(pauseText);
  root.appendChild(pause);

  return {
    setPaused(paused) {
      pause.style.display = paused ? 'flex' : 'none';
    },
    // Shows or hides the death screen. Showing it does not change the game state.
    setDead(dead) {
      death.style.display = dead ? 'flex' : 'none';
    },
    isDead() {
      return death.style.display === 'flex';
    },
    // Shows how many seconds are left before the automatic respawn.
    setDeathCountdown(seconds) {
      deathCount.textContent = `Respawning in ${seconds}...`;
    },
    // Sets what the Respawn button does.
    setDeathHandler(fn) {
      onRespawnClick = fn;
    },
    // Puts a panel (for example the lobby) on the pause screen, under the controls text.
    mountLobby(element) {
      element.style.marginTop = '16px';
      pause.appendChild(element);
    },
    // Shows the crack stage over the block being mined. `fraction` 0 hides it. `label` names the difficulty.
    setCrack(fraction, label) {
      if (fraction <= 0) {
        crackEl.style.display = 'none';
        crackLabel.textContent = '';
        crackStage = -1;
        return;
      }
      const stage = Math.min(9, Math.floor(fraction * 10));
      if (stage !== crackStage) {
        crackStage = stage;
        crackEl.innerHTML = crackPattern(stage);
      }
      crackEl.style.display = 'block';
      crackLabel.textContent = label;
    },
    // `status` is text to show centre-screen, or an empty string to hide it.
    setStatus(text) {
      status.textContent = text;
      status.style.display = text ? 'block' : 'none';
    },
    update({ inventory, target, health: hp, maxHealth, hunger, armour, timeOfDay, pos, chunks }) {
      info.textContent =
        `XYZ: ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}\n` +
        `Chunks: ${chunks}\n` +
        `Time: ${(timeOfDay * 100).toFixed(0)}%` +
        (target ? `\nLooking at: ${target}` : '');
      // Each heart is 2 health; each hunger icon is 1 point out of 9.
      heartBar.set(Math.ceil(hp / 2), Math.ceil(maxHealth / 2), 'heart');
      // Armour shows as shields, one per 2 defence points, up to 10 shields (a full diamond set is 12 points).
      const armourShields = Math.min(MAX_ARMOUR_SHIELDS, Math.ceil(armour / 2));
      armourBar.set(armourShields, MAX_ARMOUR_SHIELDS, 'armour');
      hungerBar.set(hunger, MAX_HUNGER, 'hunger');

      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const slot = inventory.slots[i];
        const id = slot.id;
        const def = BLOCK_DEFS[id];
        const selected = i === inventory.selected;
        slotEls[i].style.borderColor = selected ? '#fff' : '#555';
        slotEls[i].innerHTML = '';
        // Hovering a hotbar slot shows the item's name.
        slotEls[i].title = id && def ? def.name : '';
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
