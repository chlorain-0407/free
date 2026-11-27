import http from 'node:http';
import express from 'express';
import { createAcademy, AcademyError } from '@agentgo-tw/app-sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteUserData } from './server/user-data.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === 'production' || process.argv.includes('--preview');
const root = path.join(directory, production ? 'dist' : '.');
// Only public assets are served. Source config, env files and old API routes are never exposed.
const staticAssets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/src/index.css', ['src/index.css', 'text/css; charset=utf-8']],
  ['/src/main.js', ['src/main.js', 'text/javascript; charset=utf-8']],
  ['/src/platform.js', ['src/platform.js', 'text/javascript; charset=utf-8']],
  ['/src/data/prompts.js', ['src/data/prompts.js', 'text/javascript; charset=utf-8']],
]);

export function createApp({ academy = createAcademy(), deleteMemberData = deleteUserData } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.enable('case sensitive routing');
  app.enable('strict routing');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // The SDK verifies platform signatures and handles /__academy/selfcheck.
  // Configuration comes exclusively from the platform, never from request input.
  app.use(academy.express());
  app.use((req, _res, next) => {
    // The previous app has no login or accounts: null retains its anonymous flow.
    req.currentUser = req.academy?.user ?? null;
    next();
  });
  app.get('/api/me', (req, res) => {
    if (req.academyService) {
      return res.status(403).json({ code: 'SERVICE_NOT_SUPPORTED', message: '此應用程式未開放服務存取會員資料。' });
    }
    if (!req.academy) {
      return res.json({ mode: 'anonymous', user: null, entitlement: null, env: null });
    }
    const { user, entitlement, env } = req.academy;
    // Never send the context's identityToken or other platform credentials to JS.
    res.json({ mode: 'academy', user: { uuid: user.uuid, name: user.name, email: user.email }, entitlement, env });
  });
  app.delete('/api/me/data', async (req, res) => {
    if (req.academyService) {
      return res.status(403).json({ code: 'SERVICE_NOT_SUPPORTED', message: '此應用程式未開放服務存取會員資料。' });
    }
    if (!req.academy) {
      return res.status(401).json({ code: 'LOGIN_REQUIRED', message: '請從 AI 研究所開啟應用程式後再試。' });
    }
    // URL parameters, headers and request bodies never select the target member.
    const result = await deleteMemberData(req.academy.user.uuid);
    res.json(result);
  });
  app.use(async (req, res) => {
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
    const asset = staticAssets.get(pathname);
    if (!asset) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const content = await readFile(path.join(root, asset[0]));
      // Static assets and HTML contain only shared prompt content, no identity.
      res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      res.writeHead(404);
      res.end(production ? 'Build the site before starting production.' : 'Not found');
    }
  });
  app.use((error, _req, res, _next) => {
    if (error instanceof AcademyError) {
      // Only forward documented action URLs; never serialize request/context data.
      const body = { code: error.code, message: error.message };
      for (const key of ['login_url', 'subscribe_url', 'upgrade_url']) {
        if (typeof error.details?.[key] === 'string') body[key] = error.details[key];
      }
      const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 502;
      return res.status(status).json(body);
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', message: '服務暫時無法使用，請稍後再試。' });
  });
  return app;
}

export function createServer(options) {
  return http.createServer(createApp(options));
}

if (process.argv[1] && ['server.mjs', 'server.ts'].includes(path.basename(process.argv[1]))) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '0.0.0.0', () => console.log(`Prompt library running on port ${port}`));
}
