import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

type IconName = 'zap' | 'chart' | 'smile' | 'workflow' | 'cube' | 'grid' | 'clock' | 'user' | 'shield' | 'arrow' | 'mail' | 'phone' | 'pin' | 'menu' | 'close';
type Item = { icon: IconName; title: string; description: string };
type Site = { name: string; description: string; email: string; phone: string; location: string; linkedin: string; github: string };
type Home = {
  hero: { eyebrow: string; title: string; accent: string; lead: string; note: string };
  usp: { icon: IconName; text: string }[];
  services: { title: string; intro: string; items: Item[] };
  applications: { title: string; intro: string };
  about: { title: string; paragraphs: string[]; principles: string[] };
  benefits: { title: string; intro: string; items: Item[] };
  knowledge: { title: string; intro: string };
  contact: { title: string; intro: string };
};
type Block = { heading: string; text: string };
type Entry = {
  slug: string;
  published: boolean;
  order: number;
  category: string;
  title: string;
  summary: string;
  image: string;
  blocks: Block[];
  date?: string;
  result?: string;
  resultLabel?: string;
};

const root = resolve(process.env.LATARNIK_ROOT ?? '.');
const generated = join(root, '.generated');
const content = join(root, 'content');
const site = readJson<Site>(join(content, 'site.json'));
const home = readJson<Home>(join(content, 'home.json'));
const applications = readEntries('applications');
const cases = readEntries('cases');
const articles = readEntries('articles');

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
      return { ...item, slug: basename(name, '.json') };
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
  };
  return `<svg class="icon ${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
}

function logo(): string {
  const brandText = site.name.endsWith('.') ? site.name.slice(0, -1) : site.name;
  return `<a class="brand" href="/" aria-label="${esc(site.name)} — strona główna"><span class="brand-mark" aria-hidden="true"><span></span></span><span>${esc(brandText)}<span class="brand-dot">.</span></span></a>`;
}

function nav(current: string): string {
  const links = [
    ['/#uslugi', 'Usługi', 'uslugi'],
    ['/zastosowania/', 'Zastosowania', 'zastosowania'],
    ['/#o-mnie', 'O mnie', 'o-mnie'],
    ['/wiedza/', 'Wiedza', 'wiedza'],
    ['/#kontakt', 'Kontakt', 'kontakt'],
  ];
  return links.map(([href, label, id]) => `<a href="${href}"${current === id ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}

function header(current = ''): string {
  return `<a class="skip-link" href="#main">Przejdź do treści</a>
    <header class="site-header" data-header><div class="container header-inner">${logo()}
      <button class="menu-toggle" type="button" aria-label="Otwórz menu" aria-controls="site-nav" aria-expanded="false" data-menu-toggle>${icon('menu', 'menu-open-icon')}${icon('close', 'menu-close-icon')}</button>
      <nav class="site-nav" id="site-nav" aria-label="Menu główne" data-site-nav>${nav(current)}<a class="mobile-nav-cta" href="/zastosowania/">Zobacz możliwości ${icon('arrow')}</a></nav>
      <a class="button button-primary header-cta" href="/zastosowania/">Zobacz możliwości ${icon('arrow')}</a>
    </div></header>`;
}

function footer(): string {
  const socials = [
    ['linkedin', site.linkedin, 'LinkedIn'],
    ['github', site.github, 'GitHub'],
  ].filter(([, url]) => typeof url === 'string' && /^https:\/\//.test(url));
  return `<footer class="site-footer"><div class="container footer-main">${logo()}
    <nav aria-label="Menu w stopce"><a href="/#uslugi">Usługi</a><a href="/zastosowania/">Zastosowania</a><a href="/realizacje/">Realizacje</a><a href="/wiedza/">Wiedza</a><a href="/#kontakt">Kontakt</a></nav>
    <div class="footer-meta"><div class="social-links">${socials.map(([, url, label]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${label}</a>`).join('')}</div><small>© ${new Date().getFullYear()} ${esc(site.name)}</small></div>
  </div></footer>`;
}

function documentPage(title: string, description: string, body: string, current = ''): string {
  return `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#ffffff"><meta name="description" content="${esc(description)}"><title>${esc(title)} — ${esc(site.name)}</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/inter-latin-ext.woff2" as="font" type="font/woff2" crossorigin><script type="module" src="/src/main.ts"></script></head><body>${header(current)}<main id="main" tabindex="-1">${body}</main>${footer()}</body></html>`;
}

function eyebrow(text: string): string { return `<p class="eyebrow">${esc(text)}</p>`; }
function sectionHeading(label: string, title: string, intro = ''): string {
  return `<div class="section-heading">${eyebrow(label)}<h2>${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ''}</div>`;
}
function arrowLink(label: string, href: string, className = ''): string {
  return `<a class="text-link ${className}" href="${esc(href)}">${esc(label)} ${icon('arrow')}</a>`;
}
function entryHref(kind: 'zastosowania' | 'realizacje' | 'wiedza', entry: Entry): string {
  return `/${kind}/${encodeURIComponent(entry.slug)}/`;
}
function card(entry: Entry, kind: 'zastosowania' | 'realizacje' | 'wiedza'): string {
  const date = kind === 'wiedza' && entry.date ? `<time datetime="${esc(entry.date)}">${esc(new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(new Date(entry.date)))}</time>` : '';
  const result = kind === 'realizacje' && entry.result ? `<span class="card-result">${esc(entry.result)}<small>${esc(entry.resultLabel)}</small></span>` : '';
  const typeLabel = kind === 'zastosowania' ? 'Przykładowy scenariusz' : kind === 'realizacje' ? 'Realizacja' : 'Artykuł';
  return `<article class="story-card"><a class="story-card-link" href="${entryHref(kind, entry)}">
    <div class="story-image"><img src="${safeAsset(entry.image)}" alt="" width="352" height="185" loading="lazy" decoding="async"></div>
    <div class="story-content"><span class="story-category">${esc(entry.category)}</span><h3>${esc(entry.title)}</h3><p>${esc(entry.summary)}</p><div class="story-bottom">${result || date || `<span class="story-type">${typeLabel}</span>`}<span class="circle-arrow">${icon('arrow')}</span></div></div>
  </a></article>`;
}
function emptyState(title: string, text: string): string {
  return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">L.</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
}

function renderHome(): string {
  const contactItems = [
    site.email ? `<li>${icon('mail')}<a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : '',
    site.phone ? `<li>${icon('phone')}<a href="tel:${esc(site.phone.replace(/[^+\d]/g, ''))}">${esc(site.phone)}</a></li>` : '',
    site.location ? `<li>${icon('pin')}<span>${esc(site.location)}</span></li>` : '',
  ].filter(Boolean).join('');
  const casesSection = cases.length ? `<section class="section-pad case-section" id="realizacje"><div class="container"><div class="section-top">${sectionHeading('Realizacje', 'Wybrane projekty', 'Opisane projekty pojawiają się tutaj po potwierdzeniu treści i wyników.')} ${arrowLink('Wszystkie realizacje', '/realizacje/')}</div><div class="story-grid">${cases.slice(0, 3).map((item) => card(item, 'realizacje')).join('')}</div></div></section>` : '';
  const knowledgeContent = articles.length ? `<div class="story-grid">${articles.slice(0, 3).map((item) => card(item, 'wiedza')).join('')}</div>` : `<div class="knowledge-empty"><img src="/assets/knowledge-illustration.webp" width="258" height="145" alt="" loading="lazy"><div>${emptyState('Artykuły w przygotowaniu', 'Pierwsze poradniki opublikujemy po przygotowaniu i sprawdzeniu treści.')}${arrowLink('Otwórz dział wiedzy', '/wiedza/')}</div></div>`;
  return `<section class="hero" id="start"><div class="container hero-grid"><div class="hero-copy">${eyebrow(home.hero.eyebrow)}<h1>${esc(home.hero.title)} <span>${esc(home.hero.accent)}</span></h1><p class="hero-lead">${esc(home.hero.lead)}</p><div class="hero-actions"><a class="button button-primary" href="/zastosowania/">Zobacz zastosowania ${icon('arrow')}</a><a class="button button-secondary" href="#uslugi"><span class="play-mark" aria-hidden="true">▶</span>Poznaj usługi</a></div></div><div class="hero-visual"><img src="/assets/hero-laptop.webp" srcset="/assets/hero-laptop-480.webp 480w, /assets/hero-laptop.webp 680w" sizes="(max-width: 900px) 100vw, 50vw" width="680" height="424" alt="Makieta aplikacji z panelem zadań i wykresami na ekranie laptopa" fetchpriority="high" decoding="async"><div class="hero-note" aria-hidden="true">${esc(home.hero.note)}<span>↙</span></div><span class="mockup-label">Makieta poglądowa</span></div><div class="hero-usp">${home.usp.map((item) => `<div><span class="usp-icon">${icon(item.icon)}</span><span>${esc(item.text)}</span></div>`).join('')}</div></div></section>
  <section class="section-pad services-section" id="uslugi"><div class="container"><div class="section-top">${sectionHeading('Usługi', home.services.title)}<p class="section-intro">${esc(home.services.intro)}</p></div><div class="service-grid">${home.services.items.map((item) => `<article class="service-card"><span class="service-icon">${icon(item.icon)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${arrowLink('Zobacz zastosowania', '/zastosowania/')}</article>`).join('')}</div></div></section>
  <section class="section-pad application-section" id="zastosowania"><div class="container"><div class="section-top">${sectionHeading('Zastosowania', home.applications.title)}${arrowLink('Wszystkie zastosowania', '/zastosowania/')}</div><p class="section-intro application-intro">${esc(home.applications.intro)}</p><div class="story-grid">${applications.slice(0, 3).map((item) => card(item, 'zastosowania')).join('')}</div></div></section>
  ${casesSection}
  <section class="section-pad about-section" id="o-mnie"><div class="container about-grid"><div class="about-copy">${sectionHeading('O mnie', home.about.title)}${home.about.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${arrowLink('Poznaj zastosowania', '/zastosowania/')}</div><div class="about-visual"><div class="about-image"><img src="/assets/about-illustration.webp" width="345" height="145" alt="" loading="lazy" decoding="async"><span class="image-caption">Zdjęcie ilustracyjne</span></div><div class="principles">${home.about.principles.map((item) => `<span>${esc(item)}</span>`).join('')}</div></div></div></section>
  <section class="section-pad benefits-section"><div class="container"><div class="section-top">${sectionHeading('Dlaczego warto', home.benefits.title)}<p class="section-intro">${esc(home.benefits.intro)}</p></div><div class="benefits-grid">${home.benefits.items.map((item) => `<article><span class="benefit-icon">${icon(item.icon)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`).join('')}</div></div></section>
  <section class="section-pad knowledge-section" id="wiedza"><div class="container"><div class="section-top">${sectionHeading('Warto wiedzieć', home.knowledge.title)}<div class="section-side"><p>${esc(home.knowledge.intro)}</p>${arrowLink('Dział wiedzy', '/wiedza/')}</div></div>${knowledgeContent}</div></section>
  <section class="section-pad contact-section" id="kontakt"><div class="container contact-grid"><div class="contact-copy">${sectionHeading('Kontakt', home.contact.title)}${contactItems ? `<ul class="contact-list">${contactItems}</ul>` : '<p class="contact-pending">Zweryfikowane dane kontaktowe pojawią się tutaj przed publikacją.</p>'}</div><div class="contact-form-column"><p>${esc(home.contact.intro)}</p><form class="contact-form" data-contact-form><div class="form-row"><div class="field"><label for="name">Twoje imię</label><input id="name" name="name" autocomplete="name" required minlength="2"><span class="field-error" id="name-error" data-error-for="name"></span></div><div class="field"><label for="email">Adres e-mail</label><input id="email" name="email" type="email" autocomplete="email" required><span class="field-error" id="email-error" data-error-for="email"></span></div></div><div class="field"><label for="message">O czym chcesz porozmawiać?</label><textarea id="message" name="message" required minlength="10"></textarea><span class="field-error" id="message-error" data-error-for="message"></span></div><button class="button button-primary form-button" type="submit">Sprawdź formularz ${icon('arrow')}</button><p class="form-disclaimer">Podgląd formularza — wiadomości nie są wysyłane.</p><p class="form-status" role="status" aria-live="polite" data-form-status></p></form></div></div></section>`;
}

function renderList(kind: 'zastosowania' | 'realizacje' | 'wiedza', entries: Entry[]): string {
  const config = {
    zastosowania: ['Przykładowe zastosowania', 'Zobacz, jak mogą wyglądać proste rozwiązania dla codziennych zadań. Opisy są scenariuszami, a nie realizacjami klientów.', 'Nie ma jeszcze przykładów', 'Scenariusze pojawią się po dodaniu treści.'],
    realizacje: ['Realizacje', 'Miejsce na potwierdzone projekty i ich wyniki.', 'Realizacje w przygotowaniu', 'Opublikujemy je, gdy opisy i rezultaty zostaną potwierdzone.'],
    wiedza: ['Wiedza', 'Praktyczne artykuły dla małych firm.', 'Artykuły w przygotowaniu', 'Pierwsze poradniki pojawią się po przygotowaniu i sprawdzeniu treści.'],
  }[kind];
  return `<section class="inner-hero"><div class="container">${eyebrow(kind === 'zastosowania' ? 'Zastosowania' : kind === 'realizacje' ? 'Case studies' : 'Warto wiedzieć')}<h1>${config[0]}</h1><p>${config[1]}</p></div></section><section class="section-pad listing-section"><div class="container">${entries.length ? `<div class="story-grid">${entries.map((item) => card(item, kind)).join('')}</div>` : emptyState(config[2] ?? '', config[3] ?? '')}</div></section>`;
}

function renderDetail(entry: Entry, kind: 'zastosowania' | 'realizacje' | 'wiedza'): string {
  const parentLabel = kind === 'zastosowania' ? 'Zastosowania' : kind === 'realizacje' ? 'Realizacje' : 'Wiedza';
  return `<article class="detail-page"><div class="container"><nav class="breadcrumbs" aria-label="Ścieżka strony"><a href="/">Strona główna</a><span aria-hidden="true">/</span><a href="/${kind}/">${parentLabel}</a></nav><header class="detail-header">${eyebrow(entry.category)}<h1>${esc(entry.title)}</h1><p>${esc(entry.summary)}</p>${kind === 'zastosowania' ? '<span class="scenario-label">Przykładowy scenariusz · nie jest realizacją klienta</span>' : ''}${kind === 'wiedza' && entry.date ? `<time datetime="${esc(entry.date)}">${esc(new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(new Date(entry.date)))}</time>` : ''}</header><figure class="detail-cover"><img src="${safeAsset(entry.image)}" width="680" height="340" alt="" fetchpriority="high"></figure><div class="detail-content">${kind === 'realizacje' && entry.result ? `<div class="detail-result"><strong>${esc(entry.result)}</strong><span>${esc(entry.resultLabel)}</span></div>` : ''}${entry.blocks.map((block) => `<section><h2>${esc(block.heading)}</h2><p>${esc(block.text)}</p></section>`).join('')}<a class="text-link back-link" href="/${kind}/">← Wróć do: ${parentLabel}</a></div></div></article>`;
}

function writePage(route: string, html: string): void {
  const directory = join(generated, route);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.html'), html);
}

rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });
if (existsSync(join(root, 'src'))) symlinkSync(join(root, 'src'), join(generated, 'src'), 'dir');
writePage('', documentPage('Technologia dla małych firm', site.description, renderHome()));
for (const [kind, entries] of [
  ['zastosowania', applications], ['realizacje', cases], ['wiedza', articles],
] as const) {
  writePage(kind, documentPage(kind === 'zastosowania' ? 'Zastosowania' : kind === 'realizacje' ? 'Realizacje' : 'Wiedza', site.description, renderList(kind, entries), kind));
  for (const entry of entries) writePage(join(kind, entry.slug), documentPage(entry.title, entry.summary, renderDetail(entry, kind), kind));
}
console.log(`Wygenerowano ${1 + 3 + applications.length + cases.length + articles.length} stron.`);
