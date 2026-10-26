import { BLOCK, BLOCK_DEFS } from './blocks.js';
import { allRecipes, ingredientStatus, craftOnce } from './recipe-book.js';
import { iconCanvas } from './icons.js';

// Recipe book panel (press B). Every recipe is listed with its result and ingredients. Ingredients you
// hold enough of show in green, missing ones in red. Clicking a recipe crafts one, if you have the items.
export function createRecipeBookUI(inventory) {
  let open = false;
  const recipes = allRecipes();

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
    'background:rgba(0,0,0,0.6);pointer-events:auto;font-family:monospace;user-select:none;';
  document.body.appendChild(root);

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#c6c6c6;border:3px solid #000;padding:14px;display:flex;flex-direction:column;gap:10px;color:#222;max-height:90vh;width:640px;box-sizing:border-box;';
  root.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Recipe book';
  title.style.cssText = 'font-size:16px;font-weight:bold;';
  panel.appendChild(title);

  // Search box: type part of a name (for example "door") to show only matching recipes.
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'Search recipes, e.g. door';
  search.style.cssText = 'font-family:monospace;font-size:13px;padding:4px 6px;border:2px solid #555;';
  panel.appendChild(search);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow-y:auto;';
  panel.appendChild(list);

  const hint = document.createElement('div');
  hint.textContent = 'Click a recipe to craft one · Green = you have it · Red = missing · B or E: close';
  hint.style.cssText = 'font-size:12px;';
  panel.appendChild(hint);

  // One row per recipe, grouped under a heading per category. Rows are built once. Their colours, craft
  // handler, and visibility (from the search box) are refreshed in render().
  let lastCategory = null;
  const rows = recipes.map((r) => {
    if (r.category !== lastCategory) {
      lastCategory = r.category;
      const heading = document.createElement('div');
      heading.textContent = r.category;
      heading.dataset.heading = r.category;
      heading.style.cssText = 'font-size:14px;font-weight:bold;margin-top:6px;';
      list.appendChild(heading);
    }
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px;border:2px solid #555;background:#b0b0b0;cursor:pointer;';
    row.addEventListener('click', () => {
      if (craftOnce(r, inventory)) render();
    });
    list.appendChild(row);
    return { r, row };
  });
  search.addEventListener('input', () => render());

  // Draws one ingredient as a small icon with its count, coloured by whether you have enough.
  function ingredientNode(need) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;align-items:center;gap:4px;padding:2px 6px;border:2px solid ${need.ok ? '#2e7d32' : '#b71c1c'};background:${need.ok ? '#c8e6c9' : '#ffcdd2'};`;
    wrap.appendChild(iconCanvas(need.id, 24));
    const label = document.createElement('div');
    label.textContent = `${need.have}/${need.count}`;
    label.style.cssText = 'font-size:12px;';
    wrap.appendChild(label);
    return wrap;
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    for (const { r, row } of rows) {
      // Hide recipes that do not match the search. An empty search shows everything.
      const match = !query || r.resultName.toLowerCase().includes(query) || r.category.toLowerCase().includes(query);
      row.style.display = match ? 'flex' : 'none';
      if (!match) continue;
      row.innerHTML = '';
      const result = document.createElement('div');
      result.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:200px;';
      result.appendChild(iconCanvas(r.result, 32));
      const name = document.createElement('div');
      name.textContent = `${r.resultName}${r.count > 1 ? ` x${r.count}` : ''}`;
      name.style.cssText = 'font-size:13px;';
      result.appendChild(name);
      row.appendChild(result);

      const arrow = document.createElement('div');
      arrow.textContent = '←';
      row.appendChild(arrow);

      const needs = document.createElement('div');
      needs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
      for (const s of ingredientStatus(r, inventory)) needs.appendChild(ingredientNode(s));
      row.appendChild(needs);
    }
  }

  return {
    isOpen: () => open,
    toggle() {
      open = !open;
      root.style.display = open ? 'flex' : 'none';
      if (open) render();
      return open;
    },
    close() {
      open = false;
      root.style.display = 'none';
    },
    refresh() {
      if (open) render();
    },
  };
}
