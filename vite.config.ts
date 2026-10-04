import { execFile } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig, type Plugin } from 'vite';

const generatedRoot = resolve('.generated');
const contentRoot = resolve('content');
const execFileAsync = promisify(execFile);

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
              await execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/generate.ts']);
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
  plugins: [contentReload()],
  root: generatedRoot,
  publicDir: resolve('public'),
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    rollupOptions: { input: htmlEntries(generatedRoot) },
  },
  server: { fs: { allow: [resolve('.')] } },
});
