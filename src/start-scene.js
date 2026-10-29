// The start scene: a title screen shown before the world loads. It covers the game with the title and a Play button.
// Play hides the scene and calls `onPlay`, which the game uses to grab the mouse. The scene is only shown once.
// Styled like the lobby panel (grey box, dark text), so it matches the rest of the menus.
import { listWorlds, createWorld, deleteWorld, MODES, MODE_NAMES } from './worlds.js';

// Builds a styled button. `primary` gives the main action its own look.
function makeButton(text, primary = false) {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = `font-family:monospace;font-size:18px;padding:8px 24px;cursor:pointer;color:#fff;background:${primary ? '#4caf50' : '#8b8b8b'};` +
    'border:3px solid #000;box-shadow:inset -3px -3px 0 #555,inset 3px 3px 0 #bbb;';
  return b;
}

// Opens a world by reloading the game with its id in the URL. The game reads that id on load.
function openWorld(id) {
  location.href = `${location.pathname}?world=${encodeURIComponent(id)}`;
}

// The fields of the create form: a name, a seed, a mode choice with a short explanation, and the two buttons.
// Returns the elements to put in the form. Generate World saves the choices as a new world and opens it.
function buildCreateFields(onBack) {
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'World name';
  const name = document.createElement('input');
  name.type = 'text';
  name.value = 'New World';
  name.style.cssText = 'font-family:monospace;font-size:16px;padding:6px;';
  nameLabel.appendChild(name);

  const seedLabel = document.createElement('label');
  seedLabel.textContent = 'Seed (leave empty for the default)';
  const seed = document.createElement('input');
  seed.type = 'text';
  seed.placeholder = 'any words or numbers';
  seed.style.cssText = 'font-family:monospace;font-size:16px;padding:6px;';
  seedLabel.appendChild(seed);

  let mode = 'normal';
  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';
  const modeButtons = {};
  const modeHelp = document.createElement('div');
  modeHelp.style.cssText = 'font-size:12px;text-align:center;';
  const helpText = {
    normal: 'Normal: the usual survival rules.',
    creative: 'Creative: no damage, no hunger, and no hostile mobs.',
    peaceful: 'Peaceful: no hostile mobs. The environment can still hurt you.',
    hardcore: 'Hardcore: a death deletes this world.',
  };
  const paintModes = () => {
    for (const m of MODES) modeButtons[m].style.background = m === mode ? '#4caf50' : '#8b8b8b';
    modeHelp.textContent = helpText[mode];
  };
  for (const m of MODES) {
    const b = makeButton(MODE_NAMES[m]);
    b.addEventListener('click', (e) => { e.stopPropagation(); mode = m; paintModes(); });
    modeButtons[m] = b;
    modeRow.appendChild(b);
  }
  paintModes();

  const generate = makeButton('Generate World', true);
  generate.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = createWorld({ name: name.value, mode, seed: seed.value });
    openWorld(w.id);
  });
  const backBtn = makeButton('Back');
  backBtn.addEventListener('click', (e) => { e.stopPropagation(); onBack?.(); });
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;justify-content:center;';
  row.append(generate, backBtn);

  return [nameLabel, seedLabel, modeRow, modeHelp, row];
}

export function createStartScene(onPlay) {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:linear-gradient(#5b8fd6,#2a4f8a);color:#fff;font-family:monospace;z-index:10;';

  const panel = document.createElement('div');
  panel.style.cssText = 'display:flex;flex-direction:column;gap:16px;align-items:center;background:#c6c6c6;color:#222;' +
    'padding:32px 48px;border:4px solid #000;box-shadow:inset -4px -4px 0 #555,inset 4px 4px 0 #fff;text-align:center;';

  const title = document.createElement('div');
  title.textContent = 'VoxelCraft';
  title.style.cssText = 'font-size:40px;font-weight:bold;letter-spacing:2px;';

  const tagline = document.createElement('div');
  tagline.textContent = 'Build, mine, and explore a blocky world.';
  tagline.style.cssText = 'font-size:14px;';

  const play = document.createElement('button');
  play.textContent = 'Play';
  play.style.cssText = 'font-family:monospace;font-size:20px;padding:10px 40px;cursor:pointer;background:#8b8b8b;color:#fff;' +
    'border:3px solid #000;box-shadow:inset -3px -3px 0 #555,inset 3px 3px 0 #bbb;';

  const myWorlds = makeButton('My Worlds');
  panel.append(title, tagline, play, myWorlds);
  root.appendChild(panel);
  document.body.appendChild(root);

  // The worlds screen: one row per saved world, a Create World button, and a Back button.
  const worldsPanel = document.createElement('div');
  worldsPanel.style.cssText = 'display:none;flex-direction:column;gap:12px;align-items:stretch;background:#c6c6c6;color:#222;' +
    'padding:24px 32px;border:4px solid #000;min-width:420px;max-height:80vh;overflow:auto;';
  root.appendChild(worldsPanel);

  // The create screen: a name, a mode choice, a seed, and Generate World.
  const createPanel = document.createElement('div');
  createPanel.style.cssText = 'display:none;flex-direction:column;gap:12px;align-items:stretch;background:#c6c6c6;color:#222;' +
    'padding:24px 32px;border:4px solid #000;min-width:420px;';
  root.appendChild(createPanel);

  let shown = true;
  const hide = () => {
    if (!shown) return;
    shown = false;
    root.style.display = 'none';
  };

  // Shows one of the three screens: the title, the worlds list, or the create form.
  const showOnly = (which) => {
    panel.style.display = which === 'title' ? 'flex' : 'none';
    worldsPanel.style.display = which === 'worlds' ? 'flex' : 'none';
    createPanel.style.display = which === 'create' ? 'flex' : 'none';
  };

  // Rebuilds the list of worlds from storage. Each world has a Play and a Delete button.
  const renderWorlds = () => {
    worldsPanel.textContent = '';
    const heading = document.createElement('div');
    heading.textContent = 'My Worlds';
    heading.style.cssText = 'font-size:22px;font-weight:bold;text-align:center;';
    worldsPanel.appendChild(heading);

    const worlds = listWorlds();
    if (worlds.length === 0) {
      const none = document.createElement('div');
      none.textContent = 'No worlds yet. Create one to start.';
      none.style.cssText = 'text-align:center;font-size:14px;';
      worldsPanel.appendChild(none);
    }
    for (const w of worlds) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;background:#dcdcdc;padding:8px;border:2px solid #555;';
      const info = document.createElement('div');
      info.textContent = `${w.name} (${MODE_NAMES[w.mode] ?? 'Normal'}, seed ${w.seed})`;
      info.style.cssText = 'font-size:14px;';
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;';
      const go = makeButton('Play', true);
      go.addEventListener('click', (e) => { e.stopPropagation(); openWorld(w.id); });
      const del = makeButton('Delete');
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${w.name}"? Its saved game is removed too.`)) return;
        deleteWorld(w.id);
        renderWorlds();
      });
      actions.append(go, del);
      row.append(info, actions);
      worldsPanel.appendChild(row);
    }

    const create = makeButton('Create World', true);
    create.addEventListener('click', (e) => { e.stopPropagation(); renderCreate(); showOnly('create'); });
    const backBtn = makeButton('Back');
    backBtn.addEventListener('click', (e) => { e.stopPropagation(); showOnly('title'); });
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:center;';
    row.append(create, backBtn);
    worldsPanel.appendChild(row);
  };

  // Rebuilds the create form. Its mode is chosen with buttons, and Generate World saves the choices as a new world.
  const renderCreate = () => {
    createPanel.textContent = '';
    const heading = document.createElement('div');
    heading.textContent = 'Create World';
    heading.style.cssText = 'font-size:22px;font-weight:bold;text-align:center;';
    createPanel.appendChild(heading);
    createPanel.append(...buildCreateFields(() => { renderWorlds(); showOnly('worlds'); }));
  };

  myWorlds.addEventListener('click', (e) => {
    e.stopPropagation();
    renderWorlds();
    showOnly('worlds');
  });

  play.addEventListener('click', (e) => {
    e.stopPropagation();
    // Only the first Play counts. Once the scene is hidden the button does nothing.
    if (!shown) return;
    hide();
    onPlay?.();
  });

  return {
    hide,
    isShown: () => shown,
    element: root,
  };
}
