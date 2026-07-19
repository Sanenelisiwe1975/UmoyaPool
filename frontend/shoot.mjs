// Screenshot the running UmoyaPool UI via the Chrome DevTools Protocol.
// Reuses the `ws` library Vite already installs. Chrome must be launched with
//   --headless=new --remote-debugging-port=9222 --remote-allow-origins=*
// and the app dev server must be running on :5173.

import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['landing', 'http://localhost:5173/'],
  ['portfolio', 'http://localhost:5173/app'],
  ['vaults', 'http://localhost:5173/app/vaults'],
  ['stokvel', 'http://localhost:5173/app/stokvel'],
  ['strategies', 'http://localhost:5173/app/strategies'],
  ['agents', 'http://localhost:5173/app/agents'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal CDP client over a single target websocket.
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl, { origin: 'http://localhost:9222' });
  let id = 0;
  const pending = new Map();
  const ready = new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { ready, send, close: () => ws.close() };
}

async function newTab(url) {
  const res = await fetch(`http://localhost:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return res.json();
}

async function closeTab(id) {
  await fetch(`http://localhost:9222/json/close/${id}`);
}

async function main() {
  for (const [name, url] of PAGES) {
    const tab = await newTab(url);
    const client = cdp(tab.webSocketDebuggerUrl);
    await client.ready;
    await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1024,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Give React time to mount and API calls to resolve.
    await sleep(3500);
    const { result } = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(result.data, 'base64'));
    console.log(`captured ${name}.png`);
    client.close();
    await closeTab(tab.id);
  }
  console.log('done');
}

main().catch((e) => {
  console.error('shoot failed:', e.message);
  process.exit(1);
});
