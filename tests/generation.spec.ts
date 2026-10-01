import { test, expect } from '@playwright/test';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('generator publikuje tylko zatwierdzone treści CMS', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'latarnik-cms-'));
  try {
    cpSync(resolve('content'), join(fixture, 'content'), { recursive: true });
    const entry = {
      published: true,
      order: 1,
      category: 'Test',
      title: 'Potwierdzony projekt',
      summary: 'Opis testowy projektu.',
      image: '/assets/case-app.webp',
      blocks: [{ heading: 'Zakres', text: 'Opis zakresu.' }],
    };
    writeFileSync(join(fixture, 'content/cases/potwierdzony-projekt.json'), JSON.stringify(entry));
    writeFileSync(join(fixture, 'content/articles/pierwszy-artykul.json'), JSON.stringify({ ...entry, title: 'Pierwszy artykuł', date: '2026-10-01' }));
    writeFileSync(join(fixture, 'content/articles/szkic.json'), JSON.stringify({ ...entry, title: 'Szkic', published: false }));

    execFileSync(process.execPath, ['--import', 'tsx', resolve('scripts/generate.ts')], {
      cwd: resolve('.'),
      env: { ...process.env, LATARNIK_ROOT: fixture },
    });

    const pages = join(fixture, '.generated');
    expect(existsSync(join(pages, 'realizacje/potwierdzony-projekt/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'wiedza/pierwszy-artykul/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'wiedza/szkic/index.html'))).toBe(false);
    const home = readFileSync(join(pages, 'index.html'), 'utf8');
    expect(home).toContain('Potwierdzony projekt');
    expect(home).toContain('Pierwszy artykuł');
    expect(home).not.toContain('>Szkic<');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

