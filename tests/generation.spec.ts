import { test, expect } from '@playwright/test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
    writeFileSync(join(fixture, 'content/cases/integracja-testowa.json'), JSON.stringify({
      ...entry, title: 'Integracja testowa', order: 0, portfolioCategory: 'integration', externalUrl: undefined,
      image: '/assets/portfolio/integracja.webp', imagePresentation: 'logo',
      portfolioImage: '/assets/portfolio/integracja.webp', portfolioImageAlt: 'Integracja narzędzi firmy',
    }));
    for (const slug of ['potwierdzony-projekt', 'integracja-testowa']) {
      const source = readFileSync(join(fixture, `content/cases/${slug}.json`), 'utf8');
      writeFileSync(join(fixture, `content/en/cases/${slug}.json`), source);
    }
    writeFileSync(join(fixture, 'content/cases/ukryty-projekt.json'), JSON.stringify({ ...entry, title: 'Ukryty projekt', published: false }));
    writeFileSync(join(fixture, 'content/articles/pierwszy-artykul.json'), JSON.stringify({ ...entry, title: 'Pierwszy artykuł', date: '2026-10-01' }));
    writeFileSync(join(fixture, 'content/articles/szkic.json'), JSON.stringify({ ...entry, title: 'Szkic', published: false }));
    writeFileSync(join(fixture, 'content/articles/niegotowy.json'), '{');
    const oldArticle = join(fixture, '.generated/wiedza/pierwszy-artykul');
    mkdirSync(oldArticle, { recursive: true });
    writeFileSync(join(fixture, '.generated/wiedza/index.html'), '<h1>Wiedza</h1>');
    writeFileSync(join(oldArticle, 'index.html'), '<h1>Pierwszy artykuł</h1>');
    const oldWebsiteService = join(fixture, '.generated/uslugi/strony-internetowe');
    mkdirSync(oldWebsiteService, { recursive: true });
    writeFileSync(join(oldWebsiteService, 'index.html'), '<h1>Strony internetowe</h1>');

    execFileSync(process.execPath, ['--import', 'tsx', resolve('scripts/generate.ts')], {
      cwd: resolve('.'),
      env: { ...process.env, LATARNIK_ROOT: fixture },
    });

    const pages = join(fixture, '.generated');
    expect(existsSync(join(pages, 'uslugi/automatyzacja/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/aplikacje-na-miare/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/ai/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'uslugi/strony-internetowe/index.html'))).toBe(false);
    expect(existsSync(join(pages, 'uslugi/strony-internetowe/potwierdzony-projekt/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'przyklady/index.html'))).toBe(false);
    expect(existsSync(join(pages, 'zastosowania/index.html'))).toBe(false);
    expect(existsSync(join(pages, 'realizacje/index.html'))).toBe(true);
    expect(existsSync(join(pages, 'wiedza'))).toBe(false);
    for (const filename of readdirSync(pages, { recursive: true }).filter((name) => name.endsWith('.html'))) {
      const html = readFileSync(join(pages, filename), 'utf8');
      expect(html).not.toContain('/wiedza');
      expect(html).not.toContain('Pierwszy artykuł');
      expect(html).not.toMatch(/href="\/uslugi\/strony-internetowe\/(?:[?#][^"]*)?"/);
    }
    const home = readFileSync(join(pages, 'index.html'), 'utf8');
    expect(home).toContain('Dowiedz się więcej');
    for (const href of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/site.webmanifest']) {
      expect(home).toContain(`href="${href}"`);
      expect(existsSync(join('public', href))).toBe(true);
    }
    expect(home).not.toContain('Potwierdzony projekt');
    expect(home).not.toContain('Przykłady');
    expect(home).not.toContain('/przyklady/');
    expect(home).not.toContain('id="wiedza"');
    expect(home).not.toContain('Artykuły w przygotowaniu');
    expect(home).not.toContain('>Szkic<');
    const portfolio = readFileSync(join(pages, 'portfolio/index.html'), 'utf8');
    expect(portfolio).toContain('Potwierdzony projekt');
    expect(portfolio).not.toContain('Ukryty projekt');
    expect(portfolio).toContain('data-project-category="integration"');
    expect(portfolio).toContain('src="/assets/portfolio/integracja.webp"');
    expect(portfolio).toContain('alt="Integracja narzędzi firmy"');
    expect(portfolio).toContain('class="pf-card-media pf-card-media--logo"');
    expect(portfolio.indexOf('Integracja testowa')).toBeLessThan(portfolio.indexOf('Potwierdzony projekt'));
    expect(portfolio).toContain('class="site-header"');
    expect(portfolio).toContain('class="site-footer"');
    const integration = readFileSync(join(pages, 'portfolio/integracja-testowa/index.html'), 'utf8');
    expect(integration).toContain('class="detail-cover detail-cover--logo"');
    expect(integration).toContain('width="180" height="180" alt="Integracja narzędzi firmy"');
    expect(integration).toContain('href="/portfolio/?category=integration#projekty"');
    expect(existsSync(join(pages, 'uslugi/strony-internetowe/integracja-testowa/index.html'))).toBe(false);
    const detail = readFileSync(join(pages, 'uslugi/strony-internetowe/potwierdzony-projekt/index.html'), 'utf8');
    expect(detail).toContain('class="detail-cover"');
    expect(detail).not.toContain('detail-cover--logo');
    expect(detail).toContain('href="https://example.com/projekt/"');
    expect(detail).toContain('Zobacz działającą stronę');
    expect(detail).toContain('href="/portfolio/?category=website#projekty"');
    const redirect = readFileSync(join(pages, 'realizacje/index.html'), 'utf8');
    expect(redirect).toContain("window.location.replace('/portfolio/?category=website#projekty')");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('portfolio obsługuje pustą kolekcję i edycję treści CMS', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'latarnik-portfolio-'));
  try {
    cpSync(resolve('content'), join(fixture, 'content'), { recursive: true });
    for (const filename of readdirSync(join(fixture, 'content/cases')).filter((name) => name.endsWith('.json'))) {
      const path = join(fixture, 'content/cases', filename);
      const entry = JSON.parse(readFileSync(path, 'utf8'));
      writeFileSync(path, JSON.stringify({ ...entry, published: false }));
    }
    const portfolioPath = join(fixture, 'content/portfolio.json');
    const content = JSON.parse(readFileSync(portfolioPath, 'utf8'));
    content.hero.title = 'Nowy nagłówek z CMS';
    content.contact.href = 'https://example.com/kontakt';
    writeFileSync(portfolioPath, JSON.stringify(content));
    execFileSync(process.execPath, ['--import', 'tsx', resolve('scripts/generate.ts')], {
      cwd: resolve('.'), env: { ...process.env, LATARNIK_ROOT: fixture },
    });
    const html = readFileSync(join(fixture, '.generated/portfolio/index.html'), 'utf8');
    expect(html).toContain('Nowy nagłówek z CMS');
    expect(html).toContain('href="https://example.com/kontakt"');
    expect(html).not.toContain('data-project-category=');
    expect(html).toContain('data-portfolio-empty>');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('brak lub niekompletne tłumaczenie opublikowanej strony zatrzymuje generowanie', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'latarnik-translation-'));
  const generate = () => execFileSync(process.execPath, ['--import', 'tsx', resolve('scripts/generate.ts')], {
    cwd: resolve('.'), env: { ...process.env, LATARNIK_ROOT: fixture }, stdio: 'pipe',
  });
  try {
    cpSync(resolve('content'), join(fixture, 'content'), { recursive: true });
    const path = join(fixture, 'content/en/cases/musial-i-wspolnicy.json');
    const original = readFileSync(path, 'utf8');
    generate();
    const lastHome = readFileSync(join(fixture, '.generated/index.html'), 'utf8');
    rmSync(path);
    expect(generate).toThrow('Brak tłumaczenia EN: content/en/cases/musial-i-wspolnicy.json');
    const incomplete = JSON.parse(original);
    incomplete.summary = '';
    writeFileSync(path, JSON.stringify(incomplete));
    expect(generate).toThrow('Niekompletne tłumaczenie EN: content/en/cases/musial-i-wspolnicy.json');
    expect(readFileSync(join(fixture, '.generated/index.html'), 'utf8')).toBe(lastHome);
    const sourcePath = join(fixture, 'content/cases/musial-i-wspolnicy.json');
    const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
    writeFileSync(sourcePath, JSON.stringify({ ...source, published: false }));
    rmSync(path);
    expect(generate).not.toThrow();
    expect(existsSync(join(fixture, '.generated/en/services/websites/musial-i-wspolnicy/index.html'))).toBe(false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('EN korzysta ze wspólnych danych PL, a usługi łączy po stałym identyfikatorze', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'latarnik-shared-'));
  try {
    cpSync(resolve('content'), join(fixture, 'content'), { recursive: true });
    const projectPath = join(fixture, 'content/en/cases/musial-i-wspolnicy.json');
    const project = JSON.parse(readFileSync(projectPath, 'utf8'));
    writeFileSync(projectPath, JSON.stringify({ ...project, image: '/assets/nonexistent.jpg', externalUrl: 'https://wrong.example/', published: false }));
    const homePath = join(fixture, 'content/home.json');
    const home = JSON.parse(readFileSync(homePath, 'utf8'));
    home.services.items.reverse();
    writeFileSync(homePath, JSON.stringify(home));
    execFileSync(process.execPath, ['--import', 'tsx', resolve('scripts/generate.ts')], {
      cwd: resolve('.'), env: { ...process.env, LATARNIK_ROOT: fixture }, stdio: 'pipe',
    });
    const html = readFileSync(join(fixture, '.generated/en/services/websites/musial-i-wspolnicy/index.html'), 'utf8');
    expect(html).toContain('href="https://www.musial.pl/"');
    expect(html).toContain('src="/assets/case-musial.jpg"');
    expect(html).not.toContain('wrong.example');
    const englishHome = readFileSync(join(fixture, '.generated/en/index.html'), 'utf8');
    expect(englishHome.indexOf('<h3>AI integrations</h3>')).toBeLessThan(englishHome.indexOf('<h3>Websites</h3>'));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
