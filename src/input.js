import { HOTBAR_SIZE } from './inventory.js';

// Wires keyboard, mouse, pointer lock, and wheel input to the player and game actions.
// `actions` = { onBreak, onPlace, onRespawn, onPauseChange }
export function setupInput(canvas, player, inventory, actions) {
  let locked = false;

  // Listen on document so clicks on the pause overlay (which covers the canvas) also lock the pointer.
  document.addEventListener('click', () => {
    if (!locked && !actions.isUIOpen()) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    actions.onPauseChange(!locked);
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    player.yaw -= e.movementX * 0.002;
    player.pitch -= e.movementY * 0.002;
    const lim = Math.PI / 2 - 0.01;
    player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
  });

  document.addEventListener('keydown', (e) => {
    player.keys[e.code] = true;
    if (e.code === 'KeyR' && !e.repeat) actions.onRespawn();
    if (e.code === 'KeyE' && !e.repeat) actions.onToggleCrafting();
    if (e.code === 'KeyB' && !e.repeat && actions.onToggleRecipeBook) actions.onToggleRecipeBook();
    if (e.code === 'KeyF' && !e.repeat && actions.onTakeAll) actions.onTakeAll();
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5)) - 1;
      if (n >= 0 && n < HOTBAR_SIZE) inventory.selected = n;
    }
  });

  document.addEventListener('keyup', (e) => {
    player.keys[e.code] = false;
  });

  document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    if (e.button === 0) actions.onBreak();
    else if (e.button === 2) actions.onPlace();
  });

  // Releasing the left button stops hold-to-mine. Releasing the right button lowers a shield or lets go of a bow.
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0 && actions.onRelease) actions.onRelease();
    if (e.button === 2 && actions.onRightRelease) actions.onRightRelease();
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('wheel', (e) => {
    if (!locked) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    inventory.selected = (inventory.selected + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
  });

  return { isLocked: () => locked };
}
