// Other players are drawn with the blocky character model, standing at their reported position.
import { buildPlayerModel } from '../src/character-model.js';
import { otherPlayers } from '../src/multiplayer.js';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const model = buildPlayerModel();
check('a remote player is built from the character model', !!model.group && model.group.children.length > 0);
// The character is built from named parts: a head, a body and four limbs, each a group the animation can move.
check('the character has a head, body and four limbs', ['head', 'body', 'armLeft', 'armRight', 'legLeft', 'legRight'].every((k) => model.parts && model.parts[k] !== undefined));

// The model's feet are at y = 0, so placing it at a player's feet position puts it on the ground.
check('the model stands on its origin (feet at 0)', model.group.position.y === 0);

// The other-players list leaves out this player, so you do not draw yourself.
const list = [{ id: 'a', x: 1, y: 60, z: 2 }, { id: 'me', x: 0, y: 60, z: 0 }];
const others = otherPlayers(list, 'me');
check('other players exclude this player', others.length === 1 && others[0].id === 'a');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
