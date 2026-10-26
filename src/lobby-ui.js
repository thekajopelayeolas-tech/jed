// Lobby panel shown on the pause screen. Lets you host a world with a name, or join a listed lobby.
// Once in a lobby it lists the other players, and clicking one teleports you to them.
export function createLobbyUI({ serverUrl, httpUrl, playerName, onTeleport, onStatus, reachable = true }) {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:stretch;background:#c6c6c6;color:#222;' +
    'border:3px solid #000;padding:12px;width:300px;font-family:monospace;font-size:13px;pointer-events:auto;';
  root.addEventListener('click', (e) => e.stopPropagation());
  root.addEventListener('mousedown', (e) => e.stopPropagation());

  const title = document.createElement('div');
  title.textContent = 'Multiplayer';
  title.style.cssText = 'font-size:16px;font-weight:bold;';
  root.appendChild(title);

  const status = document.createElement('div');
  status.style.cssText = 'font-size:12px;';
  root.appendChild(status);

  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Lobby name';
  // Empty by default, so typing a name never runs into leftover text. Host falls back to "My world".
  nameInput.style.cssText = 'padding:4px;';
  root.appendChild(nameInput);

  const hostBtn = button('Host', () => mp?.host(nameInput.value || 'My world', playerName));
  root.appendChild(hostBtn);

  const lobbiesTitle = document.createElement('div');
  lobbiesTitle.textContent = 'Open lobbies';
  root.appendChild(lobbiesTitle);

  const lobbyList = document.createElement('div');
  lobbyList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
  root.appendChild(lobbyList);

  const playersTitle = document.createElement('div');
  playersTitle.textContent = 'Players in this lobby';
  playersTitle.style.display = 'none';
  root.appendChild(playersTitle);

  const playerList = document.createElement('div');
  playerList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
  root.appendChild(playerList);

  const leaveBtn = button('Leave lobby', () => mp?.leave());
  leaveBtn.style.display = 'none';
  root.appendChild(leaveBtn);

  function button(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:6px;background:#8b8b8b;border:2px solid #333;cursor:pointer;font-family:monospace;';
    b.addEventListener('click', onClick);
    return b;
  }

  let mp = null;
  let inLobby = false;

  function setStatus(text) {
    status.textContent = text;
    onStatus?.(text);
  }

  // Lists open lobbies from the server. Each one has a Join button.
  async function refreshLobbies() {
    if (inLobby) return;
    // On a secure page the local lobby cannot be reached (mixed content), so do not request it.
    if (!reachable) {
      lobbyList.textContent = 'Multiplayer needs a secure lobby server. Single player works everywhere.';
      return;
    }
    try {
      const res = await fetch(`${httpUrl}/lobbies`);
      const lobbies = await res.json();
      lobbyList.innerHTML = '';
      if (lobbies.length === 0) lobbyList.textContent = 'No lobbies yet.';
      for (const l of lobbies) {
        lobbyList.appendChild(button(`${l.name} (${l.players})`, () => mp?.join(l.id, playerName)));
      }
    } catch {
      // The server is off. Stay quiet: the lobby list just says so.
      lobbyList.textContent = 'Lobby server is off.';
    }
  }

  // Shows the other players in the lobby. Clicking one teleports to them.
  function renderPlayers() {
    playerList.innerHTML = '';
    const others = mp ? mp.others() : [];
    playersTitle.style.display = inLobby ? 'block' : 'none';
    for (const p of others) {
      playerList.appendChild(button(`Teleport to ${p.name}`, () => onTeleport(p.id)));
    }
    if (inLobby && others.length === 0) playerList.textContent = 'You are alone here.';
  }

  return {
    attach(multiplayer) {
      mp = multiplayer;
      setInterval(() => { refreshLobbies(); renderPlayers(); }, 1000);
    },
    setInLobby(value, name) {
      inLobby = value;
      hostBtn.style.display = value ? 'none' : 'block';
      nameInput.style.display = value ? 'none' : 'block';
      leaveBtn.style.display = value ? 'block' : 'none';
      if (value) setStatus(`In lobby: ${name}`);
    },
    setStatus,
    renderPlayers,
    element: root,
  };
}
