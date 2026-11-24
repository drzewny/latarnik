import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig, type Plugin } from 'vite';

const generatedRoot = resolve('.generated');
const contentRoot = resolve('content');
const execFileAsync = promisify(execFile);

// Match directory URLs before Vite's HTML fallback, just like the static host.
function directoryRedirects(directory: string) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    const url = request.url ?? '/';
    const pathname = url.split('?', 1)[0]!;
    if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.endsWith('/')) return next();
    let decoded: string;
    try { decoded = decodeURIComponent(pathname); } catch { return next(); }
    const pageDirectory = resolve(directory, `.${decoded}`);
    if (!pageDirectory.startsWith(`${directory}${sep}`) || !existsSync(join(pageDirectory, 'index.html'))) return next();
    response.writeHead(308, { Location: `${pathname}/${url.slice(pathname.length)}` });
    response.end();
  };
}

function pageRoutes(): Plugin {
  return {
    name: 'page-routes',
    configureServer(server) {
      server.middlewares.use(directoryRedirects(server.config.root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(directoryRedirects(resolve(server.config.root, server.config.build.outDir)));
    },
  };
}

function contentReload(): Plugin {
  return {
    name: 'content-reload',
    configureServer(server) {
      server.watcher.add(contentRoot);

      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      let generation = Promise.resolve();

      server.watcher.on('all', (event, file) => {
        const absoluteFile = resolve(file);
        if (!['add', 'change', 'unlink'].includes(event) || !absoluteFile.endsWith('.json')) return;
        if (!absoluteFile.startsWith(`${contentRoot}/`)) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          generation = generation.then(async () => {
            try {
              await execFileAsync(process.execPath, ['--env-file-if-exists=.env', '--import', 'tsx', 'scripts/generate.ts']);
              server.ws.send({ type: 'full-reload' });
              server.config.logger.info('Treść przebudowana; odświeżono stronę.', { timestamp: true });
            } catch (error) {
              server.config.logger.error(`Nie udało się przebudować treści: ${String(error)}`);
            }
          });
        }, 150);
      });
    },
  };
}

function htmlEntries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlEntries(path) : entry.name === 'index.html' ? [path] : [];
  });
}

export default defineConfig({
  appType: 'mpa',
  plugins: [pageRoutes(), contentReload()],
  root: generatedRoot,
  publicDir: resolve('public'),
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    rollupOptions: { input: htmlEntries(generatedRoot) },
  },
  server: {
    fs: { allow: [resolve('.')] },
    // Endpoint PHP formularza: uruchom równolegle `npm run dev:php`.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
