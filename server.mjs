import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === 'production' || process.argv.includes('--preview');
const root = path.join(directory, production ? 'dist' : '.');
// Only public assets are served. Source config, env files and old API routes are never exposed.
const publicPaths = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/index.css', ['src/index.css', 'text/css; charset=utf-8']],
  ['/src/main.js', ['src/main.js', 'text/javascript; charset=utf-8']],
  ['/src/data/prompts.js', ['src/data/prompts.js', 'text/javascript; charset=utf-8']],
]);

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(req.method === 'HEAD' ? undefined : '{"status":"ok"}');
      return;
    }
    const asset = publicPaths.get(pathname);
    if (!asset) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const content = await readFile(path.join(root, asset[0]));
      res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      res.writeHead(404);
      res.end(production ? 'Build the site before starting production.' : 'Not found');
    }
  });
}

if (process.argv[1] && ['server.mjs', 'server.ts'].includes(path.basename(process.argv[1]))) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '0.0.0.0', () => console.log(`Prompt library running on port ${port}`));
}
