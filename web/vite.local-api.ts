import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
  send: (body: unknown) => VercelResponse;
};

const attachVercelHelpers = (res: ServerResponse): VercelResponse => {
  const api = res as VercelResponse;
  api.status = (code: number) => {
    res.statusCode = code;
    return api;
  };
  api.json = (body: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(body));
    return api;
  };
  api.send = (body: unknown) => {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      return api.json(body);
    }
    res.end(body as string);
    return api;
  };
  return api;
};

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
};

// `npm run dev` (Vite alone) does not serve /api. This plugin runs the same
// serverless handlers so chat, analysis, and YouTube proxies work locally.
export const localVercelApi = (apiDir: string, env: Record<string, string>): Plugin => ({
  name: 'local-vercel-api',
  configureServer(server) {
    for (const [key, value] of Object.entries(env)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }

    server.middlewares.use(async (req, res, next) => {
      const url = req.url || '';
      if (!url.startsWith('/api/')) {
        next();
        return;
      }

      const parsed = new URL(url, 'http://localhost');
      const route = parsed.pathname.replace(/^\/api\//, '');
      if (!/^[a-z0-9-]+$/i.test(route)) {
        res.statusCode = 404;
        res.end();
        return;
      }

      const filePath = path.join(apiDir, `${route}.mjs`);
      if (!existsSync(filePath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: `API route /api/${route} was not found.` }));
        return;
      }

      try {
        let body: unknown = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          body = await readJsonBody(req);
        }

        const query: Record<string, string> = {};
        parsed.searchParams.forEach((value, key) => {
          query[key] = value;
        });

        const vercelReq = Object.assign(req, { body, query });
        const vercelRes = attachVercelHelpers(res);
        const mod = await import(pathToFileURL(filePath).href);
        if (typeof mod.default !== 'function') {
          throw new Error('Invalid API handler.');
        }
        await mod.default(vercelReq, vercelRes);
        if (!res.writableEnded) {
          res.end();
        }
      } catch (err) {
        if (res.headersSent) return;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Local API handler failed.',
          })
        );
      }
    });
  },
});
