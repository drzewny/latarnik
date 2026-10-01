import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';

const generatedRoot = resolve('.generated');

function htmlEntries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlEntries(path) : entry.name === 'index.html' ? [path] : [];
  });
}

export default defineConfig({
  root: generatedRoot,
  publicDir: resolve('public'),
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    rollupOptions: { input: htmlEntries(generatedRoot) },
  },
  server: { fs: { allow: [resolve('.')] } },
});

