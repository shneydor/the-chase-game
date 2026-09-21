import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One Render instance owns the active rooms. No public notification quota.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const rooms = new Map();
const TTL = 60000;
const types = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.m4a':'audio/mp4' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.match(/^\/relay\/(chase-[a-z0-9]{4})(\/sse)?$/);
  if (route) {
    if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}` && req.headers.origin !== `http://${req.headers.host}`) {
      res.writeHead(403); return res.end();
    }
    const [, topic, stream] = route;
    if (!rooms.has(topic)) rooms.set(topic, { clients:new Set(), peers:new Map() });
    const room = rooms.get(topic);
    if (stream && req.method === 'GET') {
      if (room.clients.size >= 16) { res.writeHead(429); return res.end(); }
      res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache, no-transform', 'X-Accel-Buffering':'no' });
      res.write(': connected\n\n');
      room.clients.add(res);
      for (const { frame, at } of room.peers.values()) if (Date.now() - at < TTL) res.write(frame);
      req.on('close', () => room.clients.delete(res));
      return;
    }
    if (!stream && req.method === 'POST') {
      const chunks = []; let bytes = 0;
      try {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 16384) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString('utf8');
        const message = JSON.parse(body);
        if (!message || typeof message.id !== 'string' || message.id.length > 64 || !['hi','p','bye'].includes(message.t)) throw new Error('Invalid message');
        if (!room.peers.has(message.id) && room.peers.size >= 16) { res.writeHead(429); return res.end(); }
        const frame = 'data: ' + JSON.stringify({ event:'message', message:body }) + '\n\n';
        if (message.t === 'bye') room.peers.delete(message.id);
        else room.peers.set(message.id, { frame, at:Date.now() });
        for (const client of room.clients) {
          // Drop slow readers; EventSource reconnects and receives current state.
          if (client.writableLength > 65536) client.destroy();
          else client.write(frame);
        }
        res.writeHead(200, { 'Content-Type':'application/json' }); return res.end('{}');
      } catch { res.writeHead(400); return res.end(); }
    }
    res.writeHead(405); return res.end();
  }
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  // Serve only the built site, never source files or server configuration.
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(404); return res.end(); }
  try {
    let data = await fs.promises.readFile(file);
    if (file.endsWith('.html')) data = Buffer.from(data.toString().replace('<head>', '<head>\n<meta name="chase-relay" content="/relay">'));
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end(); }
});

setInterval(() => {
  for (const [topic, room] of rooms) {
    for (const [id, peer] of room.peers) if (Date.now() - peer.at > TTL) room.peers.delete(id);
    for (const client of room.clients) client.write(': heartbeat\n\n');
    if (!room.clients.size && !room.peers.size) rooms.delete(topic);
  }
}, 15000).unref();

server.listen(Number(process.env.PORT || 8000), '0.0.0.0', () => console.log('Game and relay listening on port ' + server.address().port));
