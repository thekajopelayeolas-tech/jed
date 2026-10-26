import { readFileSync } from 'node:fs';

let failed = 0;
const check = (name, cond) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name);
};

// A page served over HTTPS must never request a plain http:// or ws:// address, or the browser blocks it.
// The protocol is chosen from the page, so this checks the scheme logic in main.js.
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
check('the lobby picks https:// on a secure page', main.includes("const HTTP_SCHEME = SECURE_PAGE ? 'https' : 'http'"));
check('the lobby picks wss:// on a secure page', main.includes("const WS_SCHEME = SECURE_PAGE ? 'wss' : 'ws'"));
check('no hard-coded http:// lobby request remains', !main.includes('`http://${LOBBY_HOST}`'));
check('no hard-coded ws:// lobby socket remains', !main.includes('`ws://${LOBBY_HOST}`'));
check('the multiplayer socket is blocked when the lobby is unreachable', main.includes('{ blocked: !LOBBY_REACHABLE }'));

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
if (failed) process.exitCode = 1;
