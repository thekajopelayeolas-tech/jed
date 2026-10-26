// Starts the lobby server and drives two clients over real WebSocket connections.
// Checks: host creates a lobby, a second player joins it, the lobby appears in /lobbies,
// and positions sent by one player reach the other.
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

const PORT = 8790;
const server = spawn(process.execPath, ['server/lobby-server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
const ready = new Promise((resolve) => server.stdout.once('data', resolve));
await ready;

// Masked client frame, as browsers send.
function clientFrame(text) {
  const data = Buffer.from(text, 'utf8');
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
  let header;
  if (data.length < 126) header = Buffer.from([0x81, 0x80 | data.length]);
  else { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(data.length, 2); }
  return Buffer.concat([header, mask, masked]);
}

// Reads server text frames from a socket and passes each parsed JSON message to onMsg.
function reader(socket, onMsg) {
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      let len = buf[1] & 0x7f;
      let pos = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); pos = 4; }
      if (buf.length < pos + len) break;
      const text = buf.subarray(pos, pos + len).toString('utf8');
      buf = buf.subarray(pos + len);
      onMsg(JSON.parse(text));
    }
  });
}

// Opens a WebSocket by hand, so the test needs no packages.
function connect() {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString('base64');
    const socket = net.connect(PORT, '127.0.0.1');
    let handshake = '';
    socket.once('error', reject);
    socket.on('connect', () => {
      socket.write(`GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    socket.once('data', (chunk) => {
      handshake = chunk.toString('utf8');
      resolve({ socket, handshake });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getLobbies = () => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${PORT}/lobbies`, (res) => {
    let body = '';
    res.on('data', (c) => { body += c; });
    res.on('end', () => resolve(JSON.parse(body)));
  }).on('error', reject);
});

try {
  // Host.
  const a = await connect();
  check('the server accepts a WebSocket upgrade (101)', a.handshake.startsWith('HTTP/1.1 101'));
  const aMsgs = [];
  reader(a.socket, (m) => aMsgs.push(m));
  a.socket.write(clientFrame(JSON.stringify({ type: 'host', name: 'Jed world', player: 'Jed' })));
  await sleep(150);
  const joinedA = aMsgs.find((m) => m.type === 'joined');
  check('the host gets a lobby id', !!joinedA?.lobby && joinedA.host === true);

  const lobbies = await getLobbies();
  check('the lobby is listed with its name', lobbies.some((l) => l.name === 'Jed world' && l.id === joinedA.lobby));

  // Guest joins.
  const b = await connect();
  const bMsgs = [];
  reader(b.socket, (m) => bMsgs.push(m));
  b.socket.write(clientFrame(JSON.stringify({ type: 'join', lobby: joinedA.lobby, player: 'Sam' })));
  await sleep(150);
  const joinedB = bMsgs.find((m) => m.type === 'joined');
  check('the guest joins the lobby', joinedB?.lobby === joinedA.lobby && joinedB.host === false);

  // Positions relay both ways.
  a.socket.write(clientFrame(JSON.stringify({ type: 'move', x: 10, y: 70, z: -4, yaw: 1.2, pitch: 0.1 })));
  await sleep(150);
  const seenByB = [...bMsgs].reverse().find((m) => m.type === 'players');
  const jed = seenByB?.players.find((p) => p.name === 'Jed');
  check('the guest sees the host position', jed?.x === 10 && jed?.z === -4);

  b.socket.write(clientFrame(JSON.stringify({ type: 'move', x: 3, y: 66, z: 9, yaw: 0, pitch: 0 })));
  await sleep(150);
  const seenByA = [...aMsgs].reverse().find((m) => m.type === 'players');
  const sam = seenByA?.players.find((p) => p.name === 'Sam');
  check('the host sees the guest position', sam?.x === 3 && sam?.z === 9);

  // Closing the host closes the lobby for everyone.
  // Ask the host to leave cleanly, then drop the socket. A clean leave does not depend on TCP close timing.
  a.socket.write(clientFrame(JSON.stringify({ type: 'leave' })));
  await sleep(300);
  a.socket.destroy();
  await sleep(300);
  const after = await getLobbies();
  check('the lobby closes when the host leaves', !after.some((l) => l.id === joinedA.lobby));
  b.socket.destroy();
} catch (err) {
  failed++;
  console.log('FAIL', err.message);
} finally {
  server.kill();
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
