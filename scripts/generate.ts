import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { portfolioCategories, portfolioHref, servicePortfolioCategories, type PortfolioCategory } from '../src/portfolio-config';

type IconName = 'zap' | 'chart' | 'smile' | 'workflow' | 'cube' | 'grid' | 'clock' | 'user' | 'shield' | 'arrow' | 'mail' | 'phone' | 'pin' | 'menu' | 'close' | 'settings' | 'layout-template' | 'blocks' | 'ruler' | 'pencil-ruler' | 'square-pen' | 'rocket' | 'circle-play';
type Item = { icon: IconName; title: string; description: string };
type Service = Item & { slug: string };
type Site = { name: string; description: string; email: string; phone: string; location: string; linkedin: string; github: string };
type Home = {
  hero: { eyebrow: string; title: string; accent?: string; lead: string; note: string };
  services: { title: string; intro: string; items: Service[] };
  about: { title: string; paragraphs: string[]; principles: string[] };
  benefits: { title: string; intro: string; items: Item[] };
  contact: { title: string; intro: string };
};
type ServicePageContent = {
  lead: string;
  sections: { heading: string; text: string }[];
};
type Block = { heading: string; text: string };
type PrivacyContent = { title: string; description: string; updated: string; lead: string; sections: Block[] };
type PortfolioContent = {
  title: string;
  description: string;
  hero: { eyebrow: string; title: string; description: string; image: string; actionLabel: string; processLabel: string };
  projects: { eyebrow: string; title: string; description: string; emptyText: string; resetLabel: string };
  process: { eyebrow: string; title: string; steps: { icon: IconName; title: string; description: string }[] };
  contact: { eyebrow: string; title: string; description: string; actionLabel: string; href: string };
};
type Entry = {
  slug: string;
  published: boolean;
  order: number;
  category: string;
  title: string;
  summary: string;
  image: string;
  imagePresentation?: 'cover' | 'logo';
  blocks: Block[];
  result?: string;
  resultLabel?: string;
  externalUrl?: string;
  portfolioCategory?: PortfolioCategory;
  portfolioImage?: string;
  portfolioImageAlt?: string;
};

const root = resolve(process.env.LATARNIK_ROOT ?? '.');
const generated = join(root, '.generated');
const content = join(root, 'content');
const site = readJson<Site>(join(content, 'site.json'));
// Testowy klucz Cloudflare: widżet zawsze przechodzi. Produkcyjny klucz podaj w .env (TURNSTILE_SITE_KEY).
const turnstileTestSiteKey = '1x00000000000000000000AA';
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim() || turnstileTestSiteKey;
if (turnstileSiteKey === turnstileTestSiteKey) {
  console.warn('Uwaga: brak TURNSTILE_SITE_KEY — formularz używa testowego klucza Turnstile i nie zadziała z produkcyjnym sekretem.');
}
const home = readJson<Home>(join(content, 'home.json'));
const portfolio = readJson<PortfolioContent>(join(content, 'portfolio.json'));
const privacy = readJson<PrivacyContent>(join(content, 'privacy.json'));
const privacyHref = '/polityka-prywatnosci/';
const cases = readEntries('cases');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readEntries(folder: string): Entry[] {
  return readdirSync(join(content, folder))
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const item = readJson<Omit<Entry, 'slug'>>(join(content, folder, name));
      if (typeof item.title !== 'string' || typeof item.summary !== 'string' || !Array.isArray(item.blocks)) {
        throw new Error(`Nieprawidłowa treść: ${folder}/${name}`);
      }
      if (item.imagePresentation !== undefined && !['cover', 'logo'].includes(item.imagePresentation)) {
        throw new Error(`Nieprawidłowy sposób wyświetlania obrazu: ${folder}/${name}`);
      }
      const portfolioCategory = folder === 'cases' ? item.portfolioCategory ?? 'website' : undefined;
      if (portfolioCategory !== undefined && !portfolioCategories.some((category) => category.value !== 'all' && category.value === portfolioCategory)) {
        throw new Error(`Nieprawidłowa kategoria portfolio: ${folder}/${name}`);
      }
      return { ...item, portfolioCategory, slug: basename(name, '.json') };
    })
    .filter((item) => item.published)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function safeAsset(path: string): string {
  if (!/^\/assets\/[\w./-]+$/.test(path) || path.includes('..')) throw new Error(`Nieprawidłowa ścieżka obrazu: ${path}`);
  return esc(path);
}

function safeExternalUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`Nieprawidłowy adres zewnętrzny: ${value}`); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Nieprawidłowy adres zewnętrzny: ${value}`);
  return esc(url.toString());
}

function safeContactHref(value: string): string {
  if (/^\/(?!\/)[a-zA-Z0-9/_?#=&%-]*$/.test(value) || /^mailto:[^\s<>"']+@[^\s<>"']+$/.test(value)) return esc(value);
  return safeExternalUrl(value);
}

function renderBlockText(text: string): string {
  return text.split(/\n\s*\n/).filter(Boolean).map((paragraph) => {
    const lines = paragraph.split('\n');
    if (lines.every((line) => /^- /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${renderInlineText(line.slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(renderInlineText).join('<br>')}</p>`;
  }).join('');
}

function renderInlineText(text: string): string {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) return `<strong>${esc(part.slice(2, -2))}</strong>`;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
    return link?.[2] ? `<a href="${safeExternalUrl(link[2])}">${esc(link[1])}</a>` : esc(part);
  }).join('');
}

function icon(name: IconName, className = ''): string {
  const shapes: Record<IconName, string> = {
    zap: '<path d="m13 2-9 11h7l-1 9 10-12h-7l1-8Z"/>',
    chart: '<path d="M3 3v18h18"/><rect x="6" y="12" width="3" height="6" rx="1"/><rect x="11" y="8" width="3" height="10" rx="1"/><rect x="16" y="5" width="3" height="13" rx="1"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.3 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    workflow: '<circle cx="12" cy="4" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="M12 6v6M12 12l-8 5M12 12l8 5"/>',
    cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    shield: '<path d="m12 2 8 3v6c0 5-3 8.5-8 11-5-2.5-8-6-8-11V5l8-3Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M6 3h3l2 5-2 2c1.1 2.2 2.8 3.9 5 5l2-2 5 2v3c0 1.7-1.3 3-3 3C9.7 21 3 14.3 3 6c0-1.7 1.3-3 3-3Z"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 1.72l-.18 1.3a2 2 0 0 1-1.1 1.45l-1.1.55a2 2 0 0 1-1.83-.08l-1.1-.63a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l1.1.63a2 2 0 0 1 .92 1.58v1.28a2 2 0 0 1-.92 1.58l-1.1.63a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l1.1-.63a2 2 0 0 1 1.83-.08l1.1.55a2 2 0 0 1 1.1 1.45l.18 1.3a2 2 0 0 0 2 1.72h.44a2 2 0 0 0 2-1.72l.18-1.3a2 2 0 0 1 1.1-1.45l1.1-.55a2 2 0 0 1 1.83.08l1.1.63a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-1.1-.63a2 2 0 0 1-.92-1.58v-1.28a2 2 0 0 1 .92-1.58l1.1-.63a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-1.1.63a2 2 0 0 1-1.83.08l-1.1-.55a2 2 0 0 1-1.1-1.45l-.18-1.3a2 2 0 0 0-2-1.72z"/><circle cx="12" cy="12" r="3"/>',
    'layout-template': '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    blocks: '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2m-5-1 2-2m-5-1 2-2m7 11 2-2"/>',
    'pencil-ruler': '<path d="m14 4 6 6M3 21l4-1 14-14a2.1 2.1 0 0 0-3-3L4 17l-1 4Z"/><path d="m4 3 5 5-3 3-5-5 3-3Zm12 12 5 5-3 3-5-5m-7-13 2-2m10 15 2-2"/>',
    'square-pen': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 16 1-4 6-6 3 3-6 6-4 1Zm6-9 3 3M7 18h10"/>',
    rocket: '<path d="M12 16 8 12c2-6 6-9 13-9 0 7-3 11-9 13Z"/><circle cx="16" cy="8" r="1.5"/><path d="m8 12-4-1 4-5 4 1m0 9 1 4 5-4-1-4M7 16c-3 0-4 2-4 5 3 0 5-1 5-4"/>',
    'circle-play': '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',
  };
  return `<svg class="icon ${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
}

function logo(): string {
  const brandText = site.name.endsWith('.') ? site.name.slice(0, -1) : site.name;
  return `<a class="brand" href="/" aria-label="${esc(site.name)} — strona główna"><span>${esc(brandText)}<span class="brand-dot">.</span></span></a>`;
}

function nav(current: string): string {
  const links = [
    ['/#uslugi', 'Usługi', 'uslugi'],
    ['/#o-mnie', 'O mnie', 'o-mnie'],
    ['/#kontakt', 'Kontakt', 'kontakt'],
  ];
  return links.map(([href, label, id]) => `<a href="${href}"${current === id ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}

function header(current = ''): string {
  return `<a class="skip-link" href="#main">Przejdź do treści</a>
    <header class="site-header" data-header><div class="container header-inner">${logo()}
      <button class="menu-toggle" type="button" aria-label="Otwórz menu" aria-controls="site-nav" aria-expanded="false" data-menu-toggle>${icon('menu', 'menu-open-icon')}${icon('close', 'menu-close-icon')}</button>
      <nav class="site-nav" id="site-nav" aria-label="Menu główne" data-site-nav>${nav(current)}<a class="mobile-nav-cta" href="/#kontakt">Porozmawiajmy ${icon('arrow')}</a></nav>
      <a class="button button-primary header-cta" href="/#kontakt">Porozmawiajmy ${icon('arrow')}</a>
    </div></header>`;
}

function footer(): string {
  const socials = [
    ['linkedin', site.linkedin, 'LinkedIn'],
    ['github', site.github, 'GitHub'],
  ].filter(([, url]) => typeof url === 'string' && /^https:\/\//.test(url));
  return `<footer class="site-footer"><div class="container footer-main">${logo()}
    <nav aria-label="Menu w stopce"><a href="/#uslugi">Usługi</a><a href="/portfolio/">Portfolio</a><a href="/#kontakt">Kontakt</a></nav>
    <div class="footer-meta"><div class="social-links">${socials.map(([, url, label]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${label}</a>`).join('')}</div><small>© ${new Date().getFullYear()} ${esc(site.name)}</small></div>
  </div></footer>`;
}

function documentPage(title: string, description: string, body: string, current = '', portfolioPage = false): string {
  return `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#ffffff"><meta name="description" content="${esc(description)}"><title>${esc(portfolioPage ? title : `${title} — ${site.name}`)}</title><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/inter-latin-ext.woff2" as="font" type="font/woff2" crossorigin><script type="module" src="/src/main.ts"></script></head><body${portfolioPage ? ' class="portfolio-page"' : ''}>${header(current)}<main id="main" tabindex="-1">${body}</main>${footer()}</body></html>`;
}

function eyebrow(text: string): string { return `<p class="eyebrow">${esc(text)}</p>`; }
function sectionHeading(label: string, title: string, intro = ''): string {
  return `<div class="section-heading">${eyebrow(label)}<h2>${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ''}</div>`;
}
function arrowLink(label: string, href: string, className = ''): string {
  return `<a class="text-link ${className}" href="${esc(href)}">${esc(label)} ${icon('arrow')}</a>`;
}
function entryHref(entry: Entry): string {
  return entry.portfolioCategory === 'website' ? `/uslugi/strony-internetowe/${encodeURIComponent(entry.slug)}/` : `/portfolio/${encodeURIComponent(entry.slug)}/`;
}

function renderPortfolio(): string {
  const lineBreaks = (text: string): string => esc(text).replace(/\n/g, '<br> ');
  const projectCards = cases.map((entry) => {
    const categoryLabels: Record<PortfolioCategory, string> = {
      website: 'Strona internetowa', automation: 'Automatyzacje', 'web-app': 'Aplikacja', integration: 'Integracje',
    };
    const category = entry.portfolioCategory ?? 'website';
    const isLogo = entry.imagePresentation === 'logo';
    return `<article class="pf-card" data-project-category="${category}"><a class="pf-card-link" href="${entryHref(entry)}" aria-label="Zobacz projekt: ${esc(entry.title)}">
      <div class="pf-card-media${isLogo ? ' pf-card-media--logo' : ''}"><img src="${safeAsset(entry.portfolioImage || entry.image)}" alt="${esc(entry.portfolioImageAlt || `Podgląd projektu ${entry.title}`)}" width="${isLogo ? 180 : 800}" height="${isLogo ? 180 : 560}" loading="lazy" decoding="async"></div>
      <div class="pf-card-body"><p class="pf-card-category">${categoryLabels[category]}</p><h3>${esc(entry.title)}</h3><p class="pf-card-description">${esc(entry.summary)}</p><span class="pf-card-arrow" aria-hidden="true">${icon('arrow')}</span></div>
    </a></article>`;
  }).join('');
  return `<header class="pf-hero"><div class="pf-container pf-hero-inner"><div class="pf-hero-copy">
    ${eyebrow(portfolio.hero.eyebrow)}<h1>${lineBreaks(portfolio.hero.title)}</h1><p class="pf-hero-description">${esc(portfolio.hero.description)}</p>
    <div class="pf-hero-actions"><a class="pf-button" href="#kontakt">${esc(portfolio.hero.actionLabel)}${icon('arrow')}</a><a class="pf-text-button" href="#proces">${esc(portfolio.hero.processLabel)}${icon('circle-play')}</a></div>
    </div></div><img class="pf-hero-image" src="${safeAsset(portfolio.hero.image)}" width="1600" height="1000" alt="" aria-hidden="true" fetchpriority="high" decoding="async"></header>
    <section class="pf-projects" id="projekty" aria-labelledby="pf-projects-title" data-portfolio>
      <div class="pf-container pf-projects-heading"><div>${eyebrow(portfolio.projects.eyebrow)}<h2 id="pf-projects-title">${lineBreaks(portfolio.projects.title)}</h2></div><p>${esc(portfolio.projects.description)}</p></div>
      <div class="pf-filter-container"><div class="pf-filters" role="group" aria-label="Filtruj projekty">${portfolioCategories.map(({ value, label }) => `<button class="pf-filter" type="button" data-portfolio-filter="${value}" aria-pressed="${value === 'all'}" aria-controls="pf-project-grid">${label}</button>`).join('')}</div></div>
      <p class="pf-sr-only" role="status" aria-live="polite" aria-atomic="true" data-portfolio-status></p>
      <div class="pf-project-grid" id="pf-project-grid">${projectCards}</div>
      <div class="pf-empty" data-portfolio-empty${cases.length ? ' hidden' : ''}><p>${esc(portfolio.projects.emptyText)}</p><button class="pf-text-button" type="button" data-portfolio-reset>${esc(portfolio.projects.resetLabel)}${icon('arrow')}</button></div>
    </section>
    <section class="pf-process pf-container" id="proces" aria-labelledby="pf-process-title">${eyebrow(portfolio.process.eyebrow)}<h2 id="pf-process-title">${lineBreaks(portfolio.process.title)}</h2>
      <ol class="pf-process-steps">${portfolio.process.steps.map((step) => `<li class="pf-process-step"><span class="pf-process-icon">${icon(step.icon)}</span><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p><span class="pf-process-connector" aria-hidden="true">${icon('arrow')}</span></li>`).join('')}</ol>
    </section>
    <section class="pf-contact" id="kontakt" aria-labelledby="pf-contact-title"><div class="pf-container pf-contact-inner"><div class="pf-contact-copy">${eyebrow(portfolio.contact.eyebrow)}<h2 id="pf-contact-title">${esc(portfolio.contact.title)}</h2><p>${lineBreaks(portfolio.contact.description)}</p><a class="pf-button" href="${safeContactHref(portfolio.contact.href)}">${esc(portfolio.contact.actionLabel)}${icon('arrow')}</a></div></div><div class="pf-mark" aria-hidden="true">l<span class="pf-mark-dot">.</span></div></section>`;
}

function servicePortfolioHref(slug: string): string {
  const category = servicePortfolioCategories[slug];
  return category ? portfolioHref(category) : '/portfolio/#projekty';
}

function renderHome(): string {
  const contactItems = [
    site.email ? `<li>${icon('mail')}<a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : '',
    site.phone ? `<li>${icon('phone')}<a href="tel:${esc(site.phone.replace(/[^+\d]/g, ''))}">${esc(site.phone)}</a></li>` : '',
    site.location ? `<li>${icon('pin')}<span>${esc(site.location)}</span></li>` : '',
  ].filter(Boolean).join('');
  const accent = home.hero.accent ? ` <span>${esc(home.hero.accent)}</span>` : '';
  return `<section class="hero" id="start"><div class="container hero-grid"><div class="hero-copy">${eyebrow(home.hero.eyebrow)}<h1>${esc(home.hero.title)}${accent}</h1><p class="hero-lead">${esc(home.hero.lead)}</p><div class="hero-actions"><a class="button button-secondary" href="#uslugi"><span class="play-mark" aria-hidden="true">▶</span>Poznaj usługi</a><a class="button button-primary" href="/#kontakt">Porozmawiajmy ${icon('arrow')}</a></div></div><div class="hero-visual"><img src="/assets/hero-laptop.webp" srcset="/assets/hero-laptop-480.webp 480w, /assets/hero-laptop.webp 680w" sizes="(max-width: 900px) 100vw, 50vw" width="680" height="424" alt="Makieta aplikacji z panelem zadań i wykresami na ekranie laptopa" fetchpriority="high" decoding="async"><div class="hero-note" aria-hidden="true">${esc(home.hero.note)}<span>↙</span></div><span class="mockup-label">Makieta poglądowa</span></div></div></section>
  <section class="section-pad services-section" id="uslugi"><div class="container"><div class="section-top">${sectionHeading('Usługi', home.services.title)}<p class="section-intro">${esc(home.services.intro)}</p></div><div class="service-grid">${home.services.items.map((item) => `<article class="service-card"><span class="service-icon">${icon(item.icon)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${arrowLink('Dowiedz się więcej', servicePortfolioHref(item.slug))}</article>`).join('')}</div></div></section>
  <section class="section-pad about-section" id="o-mnie"><div class="container about-grid"><div class="about-copy">${sectionHeading('O mnie', home.about.title)}${home.about.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${arrowLink('Porozmawiajmy', '/#kontakt')}</div><div class="about-visual"><div class="about-image"><img src="/assets/jakub-portret.jpg" width="886" height="886" alt="Portret Jakuba" loading="lazy" decoding="async"></div><div class="principles">${home.about.principles.map((item) => `<span>${esc(item)}</span>`).join('')}</div></div></div></section>
  <section class="section-pad benefits-section"><div class="container"><div class="section-top">${sectionHeading('Dlaczego warto', home.benefits.title)}<p class="section-intro">${esc(home.benefits.intro)}</p></div><div class="benefits-grid">${home.benefits.items.map((item) => `<article><span class="benefit-icon">${icon(item.icon)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`).join('')}</div></div></section>
  <section class="section-pad contact-section" id="kontakt"><div class="container contact-grid"><div class="contact-copy">${sectionHeading('Kontakt', home.contact.title)}${contactItems ? `<ul class="contact-list">${contactItems}</ul>` : '<p class="contact-pending">Zweryfikowane dane kontaktowe pojawią się tutaj przed publikacją.</p>'}</div><div class="contact-form-column"><p>${esc(home.contact.intro)}</p><form class="contact-form" action="/api/kontakt.php" method="post" data-contact-form data-turnstile-sitekey="${esc(turnstileSiteKey)}"><div class="form-hp" aria-hidden="true"><label for="website">Strona WWW</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div><div class="form-row"><div class="field"><label for="name">Twoje imię</label><input id="name" name="name" autocomplete="name" required minlength="2"><span class="field-error" id="name-error" data-error-for="name"></span></div><div class="field"><label for="email">Adres e-mail</label><input id="email" name="email" type="email" autocomplete="email" required><span class="field-error" id="email-error" data-error-for="email"></span></div></div><div class="field"><label for="message">O czym chcesz porozmawiać?</label><textarea id="message" name="message" required minlength="10"></textarea><span class="field-error" id="message-error" data-error-for="message"></span></div><div class="form-turnstile" data-turnstile></div><div class="form-consent"><input id="consent" name="consent" type="checkbox" value="1" required><label for="consent">Wyrażam zgodę na kontakt w&nbsp;sprawie mojego zapytania i&nbsp;zapoznałem/am się z&nbsp;<a href="${privacyHref}">polityką prywatności</a>.</label><span class="field-error" id="consent-error" data-error-for="consent"></span></div><button class="button button-primary form-button" type="submit" data-form-submit><span data-submit-label>Wyślij wiadomość</span> ${icon('arrow')}</button><p class="form-disclaimer">Formularz jest chroniony przed automatycznymi zgłoszeniami.</p><p class="form-status" role="status" aria-live="polite" data-form-status></p></form></div></div></section>`;
}

function renderServicePage(service: Service, content: ServicePageContent): string {
  const sections = content.sections.map((section) => `<section><h2>${esc(section.heading)}</h2><p>${esc(section.text)}</p></section>`).join('');
  return `<section class="inner-hero service-hero"><div class="container">${eyebrow('Usługi')}<h1>${esc(service.title)}</h1><p>${esc(content.lead)}</p></div></section><section class="section-pad service-copy"><div class="container"><div class="detail-content">${sections}<a class="button button-primary" href="/#kontakt">Omówmy potrzeby Twojej firmy ${icon('arrow')}</a></div></div></section>`;
}

function renderPrivacyPage(): string {
  const sections = privacy.sections.map((section) => `<section><h2>${esc(section.heading)}</h2>${renderBlockText(section.text)}</section>`).join('');
  return `<section class="inner-hero privacy-hero"><div class="container"><h1>${esc(privacy.title)}</h1>${renderBlockText(privacy.lead)}</div></section><section class="section-pad privacy-copy"><div class="container"><div class="detail-content">${sections}<a class="text-link back-link" href="/#kontakt">← Wróć do formularza kontaktowego</a></div></div></section>`;
}

function renderDetail(entry: Entry): string {
  const isWebsite = entry.portfolioCategory === 'website';
  const isLogo = entry.imagePresentation === 'logo';
  const coverAlt = entry.image === entry.portfolioImage ? entry.portfolioImageAlt ?? '' : '';
  const parentLabel = isWebsite ? 'Strony internetowe' : 'Portfolio';
  const parentHref = portfolioHref(entry.portfolioCategory ?? 'website');
  const liveSite = entry.externalUrl ? `<a class="button button-primary live-site-link" href="${safeExternalUrl(entry.externalUrl)}" target="_blank" rel="noopener noreferrer">Zobacz działającą stronę ${icon('arrow')}</a>` : '';
  return `<article class="detail-page"><div class="container"><nav class="breadcrumbs" aria-label="Ścieżka strony"><a href="/">Strona główna</a><span aria-hidden="true">/</span><a href="${parentHref}">${parentLabel}</a></nav><header class="detail-header">${eyebrow(entry.category)}<h1>${esc(entry.title)}</h1><p>${esc(entry.summary)}</p></header><figure class="detail-cover${isLogo ? ' detail-cover--logo' : ''}"><img src="${safeAsset(entry.image)}" width="${isLogo ? 180 : 1440}" height="${isLogo ? 180 : 1008}" alt="${esc(coverAlt)}" fetchpriority="high"></figure><div class="detail-content">${entry.result ? `<div class="detail-result"><strong>${esc(entry.result)}</strong><span>${esc(entry.resultLabel)}</span></div>` : ''}${entry.blocks.map((block) => `<section>${block.heading ? `<h2>${esc(block.heading)}</h2>` : ''}${renderBlockText(block.text)}</section>`).join('')}${liveSite}<a class="text-link back-link" href="${parentHref}">← Wróć do: ${parentLabel}</a></div></div></article>`;
}

function redirectPage(target: string, destination: string): string {
  return `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(destination)} — ${esc(site.name)}</title><script>window.location.replace('${esc(target)}');</script></head><body><p>Ta strona jest teraz dostępna w dziale <a href="${esc(target)}">${esc(destination)}</a>.</p></body></html>`;
}

function writePage(route: string, html: string): void {
  const directory = join(generated, route);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.html'), html);
}

rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });
if (existsSync(join(root, 'src'))) symlinkSync(join(root, 'src'), join(generated, 'src'), 'dir');
const serviceSlugs = home.services.items.map((service) => service.slug);
if (serviceSlugs.some((slug) => !/^[a-z0-9-]+$/.test(slug)) || new Set(serviceSlugs).size !== serviceSlugs.length) {
  throw new Error('Każda usługa musi mieć unikalny adres z małych liter, cyfr i łączników.');
}
writePage('', documentPage('Technologia dla małych firm', site.description, renderHome()));
writePage('polityka-prywatnosci', documentPage(privacy.title, privacy.description, renderPrivacyPage()));
writePage('portfolio', documentPage(portfolio.title, portfolio.description, renderPortfolio(), 'portfolio', true));
const servicePages = home.services.items.filter((service) => service.slug !== 'strony-internetowe');
for (const service of servicePages) {
  const pageContentPath = join(content, `services/${service.slug}.json`);
  const body = renderServicePage(service, readJson<ServicePageContent>(pageContentPath));
  writePage(join('uslugi', service.slug), documentPage(service.title, service.description, body, service.slug));
}
for (const entry of cases) {
  const route = entry.portfolioCategory === 'website' ? join('uslugi', 'strony-internetowe', entry.slug) : join('portfolio', entry.slug);
  writePage(route, documentPage(entry.title, entry.summary, renderDetail(entry), 'portfolio'));
}
writePage('realizacje', redirectPage(portfolioHref('website'), 'Strony internetowe'));
console.log(`Wygenerowano ${2 + servicePages.length + cases.length + 1} stron.`);
