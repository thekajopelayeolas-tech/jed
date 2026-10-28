// The shared world's edit log. Every block a player changes is recorded here, in order, on the server. A new player
// receives the whole log, so they see the same terrain as everyone else. Pure logic with no DOM, so it runs in Node.
import { CHUNK_SIZE } from './constants.js';

// Edits are keyed by block position. The last edit to a position wins, so the log holds one entry per cell.
export class SharedWorld {
  constructor() {
    this.edits = new Map();
    this.version = 0;
  }

  key(x, y, z) {
    return `${x},${y},${z}`;
  }

  // Records a block change. Returns the edit so it can be sent to other players.
  setBlock(x, y, z, id) {
    this.version += 1;
    const edit = { v: this.version, x, y, z, id };
    this.edits.set(this.key(x, y, z), edit);
    return edit;
  }

  // The block id a player has set at this position, or undefined if the terrain was never changed here.
  blockAt(x, y, z) {
    return this.edits.get(this.key(x, y, z))?.id;
  }

  // Every edit, in the order they were made, so a joining player can replay them.
  snapshot() {
    return [...this.edits.values()].sort((a, b) => a.v - b.v);
  }

  // Replays a list of edits onto a world-like object with setBlock(x, y, z, id).
  static apply(world, edits) {
    for (const e of edits) world.setBlock(e.x, e.y, e.z, e.id);
  }

  // The chunk a block position falls in, for sending only nearby edits to a player.
  static chunkOf(x, z) {
    return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
  }
}
