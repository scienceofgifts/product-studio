import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import app from './src/worker';

function workerDevPlugin(): Plugin {
  return {
    name: 'worker-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }
        try {
          const protocol = (req.socket as any)?.encrypted ? 'https' : 'http';
          const host = req.headers.host || 'localhost:3000';
          const url = new URL(req.url, `${protocol}://${host}`);

          let body: Uint8Array | null = null;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const buffers: Uint8Array[] = [];
            for await (const chunk of req) {
              buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(buffers);
          }

          const webReq = new Request(url.href, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: body && body.length > 0 ? (body as unknown as BodyInit) : undefined,
          });

          const env = {
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
          };

          const webRes = await app.fetch(webReq, env);

          res.statusCode = webRes.status;
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          if (webRes.body) {
            const arrayBuffer = await webRes.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } else {
            res.end();
          }
        } catch (err: any) {
          console.error('Dev server API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Internal Dev Server Error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), workerDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
