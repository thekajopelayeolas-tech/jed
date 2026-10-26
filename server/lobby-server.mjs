// Small lobby server for multiplayer. Uses only Node's built-in modules, so there is nothing to install.
// Run it on the host's computer with: node server/lobby-server.mjs
// It serves the lobby list over HTTP and relays player positions over WebSocket.
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT) || 8787;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// lobbies: id -> { id, name, hostId, players: Map<clientId, {socket, x, y, z, yaw, pitch, name}> }
const lobbies = new Map();
let nextClientId = 1;

// Encodes a server-to-client text frame. Server frames are not masked.
function frame(text) {
  const data = Buffer.from(text, 'utf8');
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  return Buffer.concat([header, data]);
}

// Decodes client frames. Client frames are always masked. Yields text payloads.
function parseFrames(buffer, onText, onClose) {
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const opcode = buffer[offset] & 0x0f;
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    let len = buffer[offset + 1] & 0x7f;
    let pos = offset + 2;
    if (len === 126) {
      if (buffer.length - pos < 2) break;
      len = buffer.readUInt16BE(pos);
      pos += 2;
    } else if (len === 127) {
      if (buffer.length - pos < 8) break;
      len = Number(buffer.readBigUInt64BE(pos));
      pos += 8;
    }
    // Refuse oversized or unmasked frames.
    if (!masked || len > 65536) { onClose(); return; }
    if (buffer.length - pos < 4 + len) break;
    const mask = buffer.subarray(pos, pos + 4);
    pos += 4;
    const payload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) payload[i] = buffer[pos + i] ^ mask[i % 4];
    offset = pos + len;
    if (opcode === 0x8) { onClose(); return; }
    if (opcode === 0x1) onText(payload.toString('utf8'));
  }
  return offset;
}

function lobbyList() {
  return [...lobbies.values()].map((l) => ({ id: l.id, name: l.name, players: l.players.size }));
}

function broadcast(lobby, message, exceptId) {
  const out = frame(JSON.stringify(message));
  for (const [id, p] of lobby.players) {
    if (id !== exceptId) p.socket.write(out);
  }
}

// Sends the current player list to everyone in a lobby, so each game can show the others.
function sendPlayers(lobby) {
  const players = [...lobby.players].map(([id, p]) => ({ id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }));
  broadcast(lobby, { type: 'players', players }, null);
}

const server = http.createServer((req, res) => {
  // Lets the game page (on another port or address) read the lobby list.
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/lobbies') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(lobbyList()));
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  const clientId = String(nextClientId++);
  let lobby = null;
  let pending = Buffer.alloc(0);

  const leave = () => {
    if (!lobby) return;
    lobby.players.delete(clientId);
    // The lobby closes when its host leaves, so nobody is left in a dead room.
    if (lobby.hostId === clientId) {
      broadcast(lobby, { type: 'closed' }, clientId);
      lobbies.delete(lobby.id);
    } else {
      broadcast(lobby, { type: 'left', id: clientId }, clientId);
      sendPlayers(lobby);
    }
    lobby = null;
  };

  const handle = (text) => {
    let msg;
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.type === 'host' && !lobby) {
      const id = crypto.randomUUID().slice(0, 8);
      const name = String(msg.name || 'My world').slice(0, 32);
      lobby = { id, name, hostId: clientId, players: new Map() };
      lobbies.set(id, lobby);
      lobby.players.set(clientId, { socket, name: String(msg.player || 'Player').slice(0, 16), x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
      socket.write(frame(JSON.stringify({ type: 'joined', lobby: id, id: clientId, host: true })));
      sendPlayers(lobby);
    } else if (msg.type === 'join' && !lobby && lobbies.has(msg.lobby)) {
      lobby = lobbies.get(msg.lobby);
      lobby.players.set(clientId, { socket, name: String(msg.player || 'Player').slice(0, 16), x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
      socket.write(frame(JSON.stringify({ type: 'joined', lobby: lobby.id, id: clientId, host: false })));
      sendPlayers(lobby);
    } else if (msg.type === 'move' && lobby) {
      const p = lobby.players.get(clientId);
      if (!p) return;
      Object.assign(p, { x: +msg.x || 0, y: +msg.y || 0, z: +msg.z || 0, yaw: +msg.yaw || 0, pitch: +msg.pitch || 0 });
      sendPlayers(lobby);
    } else if (msg.type === 'leave') {
      leave();
    }
  };

  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    const used = parseFrames(pending, handle, () => socket.destroy());
    if (typeof used === 'number') pending = pending.subarray(used);
  });
  socket.on('close', leave);
  socket.on('error', leave);
});

server.listen(PORT, () => {
  console.log(`Lobby server on http://localhost:${PORT} (lobbies: /lobbies)`);
});
