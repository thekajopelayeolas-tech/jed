import { defineConfig } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Starts the lobby server with `npm run dev`, so multiplayer works without a second command.
// It only runs in the dev server, not in the built site. If the port is already in use, the server
// is left alone and the existing one is used.
function lobbyServer() {
  return {
    name: 'lobby-server',
    apply: 'serve',
    configureServer() {
      const child = spawn(process.execPath, [fileURLToPath(new URL('./server/lobby-server.mjs', import.meta.url))], {
        stdio: 'inherit',
      });
      child.on('exit', (code) => {
        if (code !== 0 && code !== null) console.log('Lobby server stopped (port 8787 may be in use).');
      });
      // Stop the lobby server when the dev server closes.
      const stop = () => child.kill();
      process.once('exit', stop);
      process.once('SIGINT', () => { stop(); process.exit(0); });
      process.once('SIGTERM', () => { stop(); process.exit(0); });
    },
  };
}

// Relative base so the built site works from a subpath such as GitHub Pages (/minecraft2/).
export default defineConfig({
  base: './',
  plugins: [lobbyServer()],
});
