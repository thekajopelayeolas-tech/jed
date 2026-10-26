// Multiplayer client. Connects to the lobby server (see server/lobby-server.mjs) over WebSocket,
// sends this player's position, and keeps the list of other players. Browser WebSocket only, no packages.

// Turns a game position into the message the server expects.
export function moveMessage(player) {
  return JSON.stringify({
    type: 'move',
    x: player.pos.x,
    y: player.pos.y,
    z: player.pos.z,
    yaw: player.yaw,
    pitch: player.pitch,
  });
}

// Keeps the latest player list from the server, minus this player.
export function otherPlayers(list, myId) {
  return (list ?? []).filter((p) => p.id !== myId);
}

// Connects to a lobby server. `url` is ws:// or wss://. Callbacks receive server messages already parsed.
export function createMultiplayer(url, onMessage, onStatus) {
  const WebSocketCtor = globalThis.WebSocket;
  let socket = null;
  let myId = null;
  let lobbyId = null;
  let hostCheck = false;
  let players = [];

  // Messages sent before the socket opens are queued and flushed on open, so Host and Join are never lost.
  const queue = [];

  function send(obj) {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(obj));
    else queue.push(obj);
  }

  function flush() {
    while (queue.length && socket && socket.readyState === 1) socket.send(JSON.stringify(queue.shift()));
  }

  function handle(msg) {
    if (msg.type === 'joined') {
      myId = msg.id;
      lobbyId = msg.lobby;
      hostCheck = msg.host;
      onStatus?.(msg.host ? 'Hosting' : 'Joined');
    } else if (msg.type === 'players') {
      players = msg.players;
    } else if (msg.type === 'closed') {
      onStatus?.('The host closed the lobby');
      lobbyId = null;
    }
    onMessage?.(msg);
  }

  return {
    connect() {
      socket = new WebSocketCtor(url);
      socket.addEventListener('open', flush);
      socket.addEventListener('message', (e) => handle(JSON.parse(e.data)));
      socket.addEventListener('close', () => onStatus?.('Disconnected'));
      socket.addEventListener('error', () => onStatus?.('Could not reach the lobby server'));
    },
    // Hosting and joining open the connection first, so nothing is connected until the player asks.
    host(name, playerName) {
      this.ensureConnected();
      send({ type: 'host', name, player: playerName });
    },
    join(lobby, playerName) {
      this.ensureConnected();
      send({ type: 'join', lobby, player: playerName });
    },
    ensureConnected() {
      if (!socket || socket.readyState > 1) this.connect();
    },
    sendMove(player) {
      send(JSON.parse(moveMessage(player)));
    },
    leave() {
      send({ type: 'leave' });
      lobbyId = null;
      hostCheck = false;
      onStatus?.('Left the lobby');
    },
    others() {
      return otherPlayers(players, myId);
    },
    player(id) {
      return players.find((p) => p.id === id) ?? null;
    },
    get id() { return myId; },
    get lobby() { return lobbyId; },
    get isHost() { return hostCheck; },
    close() {
      socket?.close();
    },
  };
}
