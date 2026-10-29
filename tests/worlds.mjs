// The worlds list: create, list, find and delete worlds. Each world has a mode and its own save key. Exits non-zero on failure.
// localStorage is stubbed, since the test runs in Node.

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const W = await import('../src/worlds.js');

check('there are no worlds at the start', W.listWorlds().length === 0);
check('there are four modes', W.MODES.length === 4 && ['normal', 'creative', 'peaceful', 'hardcore'].every((m) => W.MODES.includes(m)));

const a = W.createWorld({ name: '  Sky  ', mode: 'creative', seed: '42' });
check('a world keeps its trimmed name', a.name === 'Sky');
check('a world keeps its mode', a.mode === 'creative');
check('a numeric seed is used as it is', a.seed === 42);

const b = W.createWorld({ name: '', mode: 'nonsense', seed: '' });
check('an empty name becomes New World', b.name === 'New World');
check('an unknown mode becomes normal', b.mode === 'normal');
check('an empty seed becomes the default seed', b.seed === 1337);
check('two worlds get different ids', a.id !== b.id);
check('both worlds are listed', W.listWorlds().length === 2);

check('a text seed gives the same number every time', W.seedFromText('hello') === W.seedFromText('hello'));
check('different text seeds give different numbers', W.seedFromText('hello') !== W.seedFromText('world'));
check('a negative numeric seed is kept', W.seedFromText('-7') === -7);

check('a world can be found by id', W.getWorld(a.id)?.name === 'Sky');
check('an unknown id gives null', W.getWorld('nope') === null);

check('each world has its own save key', W.saveKeyFor(a.id) !== W.saveKeyFor(b.id));
store.set(W.saveKeyFor(a.id), '{"x":1}');
W.deleteWorld(a.id);
check('deleting a world removes it from the list', W.getWorld(a.id) === null && W.listWorlds().length === 1);
check('deleting a world removes its save', !store.has(W.saveKeyFor(a.id)));
check('the other world is kept', W.getWorld(b.id) !== null);

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
