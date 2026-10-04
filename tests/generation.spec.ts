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
      image: '/assets/case-musial.jpg',
      externalUrl: 'https://example.com/projekt/',
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
    expect(existsSync(join(pages, 'uslugi/automatyzacja/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/aplikacje-na-miare/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/ai/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/strony-internetowe/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/strony-internetowe/potwierdzony-projekt/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'przyklady/index.html'))).toBe(false);
    expect(existsSync(join(pages, 'zastosowania/index.html'))).toBe(false);
    expect(existsSync(join(pages, 'realizacje/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'wiedza/pierwszy-artykul/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'wiedza/szkic/index.html'))).toBe(false);
    const home = readFileSync(join(pages, 'index.html'), 'utf8');
    expect(home).toContain('Dowiedz się więcej');
    expect(home).not.toContain('Potwierdzony projekt');
    expect(home).not.toContain('Przykłady');
    expect(home).not.toContain('/przyklady/');
    expect(home).toContain('Pierwszy artykuł');
    expect(home).not.toContain('>Szkic<');
    const websiteService = readFileSync(join(pages, 'uslugi/strony-internetowe/index.html'), 'utf8');
    expect(websiteService).toContain('Rozmowa');
    expect(websiteService).toContain('Projekt');
    expect(websiteService).toContain('Wdrożenie');
    expect(websiteService).toContain('Potwierdzony projekt');
    const detail = readFileSync(join(pages, 'uslugi/strony-internetowe/potwierdzony-projekt/index.html'), 'utf8');
    expect(detail).toContain('href="https://example.com/projekt/"');
    expect(detail).toContain('Zobacz działającą stronę');
    const redirect = readFileSync(join(pages, 'realizacje/index.html'), 'utf8');
    expect(redirect).toContain("window.location.replace('/uslugi/strony-internetowe/#wdrozenia')");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
