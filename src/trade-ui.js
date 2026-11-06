import { BLOCK_DEFS } from './blocks.js';
import { iconCanvas } from './icons.js';
import { VILLAGER_TRADES, canMakeTrade, executeTrade } from './trading.js';

export function createTradeUI(inventory) {
  let open = false;
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.62);pointer-events:auto;font-family:monospace;z-index:20;';
  document.body.appendChild(root);
  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(660px,92vw);max-height:82vh;overflow:auto;background:#c6c6c6;border:4px solid #222;padding:16px;color:#222;box-shadow:0 12px 40px #0008;';
  root.appendChild(panel);
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  const title = document.createElement('strong');
  title.style.cssText = 'font-size:20px;';
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = 'font:inherit;padding:6px 12px;cursor:pointer;';
  closeButton.addEventListener('click', () => close());
  header.append(title, closeButton);
  panel.appendChild(header);
  const hint = document.createElement('div');
  hint.textContent = 'Trade farm goods for emeralds, or spend emeralds on supplies and rare gear.';
  hint.style.cssText = 'font-size:12px;margin-bottom:12px;';
  panel.appendChild(hint);
  const rows = document.createElement('div');
  rows.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  panel.appendChild(rows);
  const status = document.createElement('div');
  status.style.cssText = 'min-height:20px;margin-top:10px;font-size:12px;';
  panel.appendChild(status);

  const offerRows = VILLAGER_TRADES.map((offer) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:52px minmax(0,1fr) 52px 120px;align-items:center;gap:10px;background:#a5a5a5;padding:6px;';
    row.appendChild(iconCanvas(offer.input.id, 40));
    const label = document.createElement('div');
    const inputName = BLOCK_DEFS[offer.input.id]?.name ?? 'Item';
    const outputName = BLOCK_DEFS[offer.output.id]?.name ?? 'Item';
    label.textContent = `${offer.input.count} ${inputName}  →  ${offer.output.count} ${outputName}`;
    label.style.cssText = 'font-size:13px;';
    row.appendChild(label);
    row.appendChild(iconCanvas(offer.output.id, 40));
    const button = document.createElement('button');
    button.textContent = 'Trade';
    button.style.cssText = 'font:inherit;padding:8px;cursor:pointer;';
    button.addEventListener('click', () => {
      if (executeTrade(inventory, offer)) status.textContent = 'Trade complete.';
      else status.textContent = inventory.countOf(offer.input.id) < offer.input.count ? 'Not enough payment.' : 'Make room in your inventory first.';
      refresh();
    });
    row.appendChild(button);
    rows.appendChild(row);
    return { offer, button, row };
  });

  function refresh() {
    for (const { offer, button } of offerRows) button.disabled = !canMakeTrade(inventory, offer);
  }
  function close() {
    open = false;
    root.style.display = 'none';
  }
  function show(villager) {
    open = true;
    title.textContent = `Trade with ${villager?.def?.name ?? 'Villager'} (${villager.job ?? 'unemployed'})`;
    status.textContent = '';
    root.style.display = 'flex';
    for (const { offer, row } of offerRows) {
      row.style.display = (!villager.job || offer.job === villager.job) ? 'grid' : 'none';
    }
    refresh();
  }
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  root.addEventListener('contextmenu', (event) => event.preventDefault());

  return { element: root, open: show, close, isOpen: () => open, refresh };
}
