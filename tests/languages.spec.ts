import { expect, test, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pairs = [
  ['/', '/en/'], ['/portfolio/', '/en/portfolio/'],
  ['/polityka-prywatnosci/', '/en/privacy-policy/'],
  ['/uslugi/automatyzacja/', '/en/services/automation/'],
  ['/uslugi/aplikacje-na-miare/', '/en/services/custom-applications/'],
  ['/uslugi/ai/', '/en/services/ai-integrations/'],
  ...['musial-i-wspolnicy', 'prawnik-dla-rolnika', 'wiem-i-powiem'].map((slug) => [`/uslugi/strony-internetowe/${slug}/`, `/en/services/websites/${slug}/`]),
  ...['wiem-i-powiem-aplikacja', 'musial-i-wspolnicy-aplikacja', 'automatyzacja-wsparcia', 'baza-wiedzy-rag'].map((slug) => [`/portfolio/${slug}/`, `/en/portfolio/${slug}/`]),
];

async function storage(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
}

test.beforeEach(async ({ page }) => {
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
  await page.route('https://challenges.cloudflare.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.turnstile={render(){return 'widget';},reset(){},getResponse(){return 'test-token';}}` }));
});

test('wszystkie strony mają wzajemne odpowiedniki i działające linki wewnętrzne', async ({ page }) => {
  for (const [pl, en] of pairs) {
    for (const [language, path] of [['pl', pl], ['en', en]]) {
      await page.goto(path!);
      await expect(page.locator('html')).toHaveAttribute('lang', language!);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://latarnik.dev${path}`);
      await expect(page.locator('link[hreflang="pl"]')).toHaveAttribute('href', `https://latarnik.dev${pl}`);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', `https://latarnik.dev${en}`);
      await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `https://latarnik.dev${pl}`);
      if (language === 'en') {
        const links = await page.locator('a[href^="/"]:not([data-language-choice])').evaluateAll((elements) => elements.map((el) => el.getAttribute('href')));
        expect(links.every((href) => href?.startsWith('/en/'))).toBe(true);
      }
    }
  }
  for (const filename of readdirSync('dist', { recursive: true }).filter((name) => String(name).endsWith('.html'))) {
    const html = readFileSync(join('dist', String(filename)), 'utf8');
    for (const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
      const target = match[1]!;
      expect(existsSync(join('dist', target, target.endsWith('/') ? 'index.html' : '')), `${filename}: ${target}`).toBe(true);
    }
  }
});

for (const locale of ['en-US', 'de-DE']) test.describe(`przeglądarka ${locale}`, () => {
  test.use({ locale });
  test('podpowiedź niczego nie zapisuje, zamknięcie jest nietrwałe, wybór jest pamiętany', async ({ page, context }) => {
    await page.goto('/');
    const suggestion = page.locator('[data-language-suggestion]');
    await expect(suggestion).toBeVisible();
    expect(await storage(page)).toEqual({});
    await suggestion.getByRole('button', { name: 'Close language suggestion' }).click();
    await expect(suggestion).toBeHidden();
    expect(await storage(page)).toEqual({});
    await page.goto('/portfolio/');
    await expect(suggestion).toBeVisible();
    await suggestion.getByRole('link', { name: 'Polski' }).click();
    await expect(suggestion).toBeHidden();
    expect(await storage(page)).toEqual({ 'latarnik-language': 'pl' });
    await page.reload();
    await expect(suggestion).toBeHidden();
    await page.locator('[data-language-selector] summary').click();
    await expect(page.locator('.language-panel')).toContainText('kolejne wizyty');
    await page.locator('.language-panel').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/portfolio\/$/);
    expect(await storage(page)).toEqual({ 'latarnik-language': 'en' });
    const other = await context.newPage();
    await other.goto('/');
    await expect(other.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(other.locator('[data-language-suggestion]')).toBeHidden();
    expect(await context.cookies()).toEqual([]);
    await other.close();
  });
});

test('polska przeglądarka nie widzi podpowiedzi, wejście na EN nie zapisuje preferencji', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-language-suggestion]')).toBeHidden();
  expect(await storage(page)).toEqual({});
  await page.goto('/en/');
  expect(await storage(page)).toEqual({});
  await expect(page.getByRole('heading', { name: 'Big solutions for small businesses' })).toBeVisible();
});

test('zmiana języka zachowuje filtr, parametry i kotwicę również po zmianie filtra', async ({ page }) => {
  await page.goto('/portfolio/?category=website&source=test#projekty');
  await page.getByRole('button', { name: 'Automatyzacje', exact: true }).click();
  await page.locator('[data-language-selector] summary').click();
  await page.locator('.language-panel').getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/portfolio\/\?category=automation&source=test#projekty$/);
  await expect(page.getByRole('button', { name: 'Automation', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('Automation. Number of projects: 1.');
  await page.locator('[data-language-selector] summary').click();
  await page.locator('.language-panel').getByRole('link', { name: 'Polski' }).click();
  await expect(page).toHaveURL(/\/portfolio\/\?category=automation&source=test#projekty$/);
});

test('zablokowany localStorage nie blokuje przełącznika', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto('/');
  await page.locator('[data-language-selector] summary').click();
  await page.locator('.language-panel').getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/$/);
});

test.describe('bez JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('przełącznik i lokalizowane linki działają natywnie', async ({ page }) => {
    await page.goto('/uslugi/automatyzacja/');
    await page.locator('[data-language-selector] summary').click();
    await page.locator('.language-panel').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/services\/automation\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) test(`EN i wybór języka mieszczą się przy ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/en/');
  await expect(page.locator('.site-header [data-language-selector]')).toHaveCount(0);
  await expect(page.locator('.footer-nav [data-language-selector]')).toHaveCount(1);
  const summary = page.locator('.footer-nav [data-language-selector] summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  await expect(page.locator('.language-panel')).toBeVisible();
  const panel = await page.locator('.language-panel').boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(width + 1);
  expect(panel!.y).toBeGreaterThanOrEqual(0);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(900);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if ([320, 390, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`language-${width}.png`) });
  await summary.press('Escape');
  await expect(page.locator('[data-language-selector]')).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
  if ([390, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`english-home-${width}.png`), fullPage: true });
});

test.describe('podpowiedź na małym ekranie', () => {
  test.use({ locale: 'de-DE', viewport: { width: 320, height: 750 } });
  test('jest czytelna i mieści się w ekranie', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('[data-language-suggestion]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('suggestion-320.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});

test('angielski formularz waliduje, wysyła language i pokazuje lokalizowane odpowiedzi', async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.turnstile={render(el, options){window.__widgetLanguage=options.language;return 'widget';},reset(){},getResponse(){return 'test-token';}}` }));
  let payload = '';
  let result: 'success' | 'fields' | 'network' = 'success';
  await page.route('**/api/kontakt.php', (route) => {
    payload = route.request().postData() ?? '';
    if (result === 'network') return route.abort();
    return route.fulfill({ status: result === 'success' ? 200 : 422, contentType: 'application/json', body: JSON.stringify(result === 'success' ? { ok: true } : { ok: false, error: 'Please correct the highlighted fields.', fields: { email: 'Enter a valid email address.' } }) });
  });
  await page.goto('/en/');
  const form = page.locator('[data-contact-form]');
  const submit = form.getByRole('button', { name: 'Send message' });
  await submit.click();
  await expect(form.locator('#name-error')).toHaveText('This field is required.');
  async function fill() {
    await form.locator('#name').fill('Anna');
    await form.locator('#email').fill('anna@example.com');
    await form.locator('#message').fill('I would like to discuss a new application.');
    await form.locator('#consent').check();
  }
  await fill();
  await form.locator('#consent').uncheck();
  await submit.click();
  await expect(form.locator('#consent-error')).toHaveText('Please give your consent to send the message.');
  await form.locator('#consent').check();
  await submit.click();
  await expect(form.getByRole('status')).toContainText('Message sent.');
  expect(payload).toMatch(/name="language"\r\n\r\nen\r\n/);
  expect(await page.evaluate(() => (window as unknown as { __widgetLanguage: string }).__widgetLanguage)).toBe('en');
  expect(await storage(page)).toEqual({});
  result = 'fields';
  await fill();
  await submit.click();
  await expect(form.locator('#email-error')).toHaveText('Enter a valid email address.');
  await expect(form.getByRole('status')).toHaveText('Please correct the highlighted fields.');
  result = 'network';
  await form.locator('#email').fill('anna2@example.com');
  await submit.click();
  await expect(form.getByRole('status')).toContainText('Unable to connect to the server.');
  await expect(form.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/en/privacy-policy/');
});
