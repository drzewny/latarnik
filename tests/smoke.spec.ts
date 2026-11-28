import { expect, test } from '@playwright/test';

const widths = [320, 375, 390, 430, 768, 1024, 1440];

for (const width of widths) {
  test(`strona główna nie przewija się poziomo przy ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Duże rozwiązania dla małych firm' })).toBeVisible();
    await expect(page.locator('a[href*="/wiedza"], a[href="#wiedza"]')).toHaveCount(0);
    await expect(page.locator('#wiedza, .knowledge-section')).toHaveCount(0);
    await expect(page.locator('.benefits-section + .contact-section')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(await page.locator('.hero-visual img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
      await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
      await page.locator('.about-section').screenshot({ path: testInfo.outputPath(`about-${width}.png`) });
    }
  });
}

test('kafelki usług, wdrożenia i dawne adresy prowadzą do właściwych stron', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.service-card')).toHaveCount(4);
  await expect(page.locator('.service-card .text-link')).toHaveCount(4);
  await expect(page.locator('.service-card .text-link')).toHaveText(['Strony internetowe', 'Aplikacje na miarę', 'Automatyzacja', 'Integracje AI'].map((title) => `Dowiedz się więcej: ${title}`));
  await expect(page.locator('.service-card .text-link').nth(0)).toHaveAttribute('href', '/portfolio/?category=website#projekty');
  await expect(page.locator('.service-card .text-link').nth(1)).toHaveAttribute('href', '/portfolio/?category=web-app#projekty');
  await expect(page.locator('.service-card .text-link').nth(2)).toHaveAttribute('href', '/portfolio/?category=automation#projekty');
  await expect(page.locator('.service-card .text-link').nth(3)).toHaveAttribute('href', '/portfolio/?category=integration#projekty');
  await expect(page.locator('.website-cases')).toHaveCount(0);
  await expect(page.getByText('Musiał i Wspólnicy', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href*="/przyklady/"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/zastosowania/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/uslugi/strony-internetowe/"]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu w stopce' }).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio/');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/portfolio/?category=website#projekty');
  await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card:visible h3')).toHaveText([
    'Musiał i Wspólnicy', 'Prawnik dla Rolnika', 'Wiem i Powiem',
  ]);
  await page.getByRole('link', { name: 'Zobacz projekt: Musiał i Wspólnicy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Musiał i Wspólnicy' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.musial.pl/');
  await expect(page.locator('.live-site-link')).toHaveAttribute('target', '_blank');
  await expect(page.locator('.back-link')).toHaveAttribute('href', '/portfolio/?category=website#projekty');
  await page.screenshot({ path: testInfo.outputPath('website-case-1440.png'), fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.site-nav')).toBeHidden();
  await expect(page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).resolves.toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('detail-390.png'), fullPage: true, animations: 'disabled' });

  await page.goto('/uslugi/strony-internetowe/prawnik-dla-rolnika/');
  await expect(page.getByRole('heading', { name: 'Prawnik dla Rolnika' })).toBeVisible();
  await expect(page.locator('.live-site-link')).toHaveAttribute('href', 'https://www.prawnikdlarolnika.pl/');

  for (const [slug, title] of [['automatyzacja', 'Automatyzacja'], ['aplikacje-na-miare', 'Aplikacje na miarę'], ['ai', 'Integracje AI']] as const) {
    await page.goto(`/uslugi/${slug}/`);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.locator('.service-copy section')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Omówmy potrzeby Twojej firmy' })).toHaveAttribute('href', '/#kontakt');
  }

  await page.goto('/realizacje/');
  await page.waitForURL('**/portfolio/?category=website#projekty');
  await expect(page.getByRole('button', { name: 'Strony internetowe', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pf-card:visible')).toHaveCount(3);
});

test('menu mobilne zamyka się Escape i przywraca przewijanie', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await expect(toggle).toHaveAccessibleName('Otwórz menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Usługi', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Pomysły', exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu główne' }).getByRole('link', { name: 'Wiedza', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('menu-390.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(toggle).toBeFocused();
});

// Zaślepka Turnstile: testy nie łączą się z Cloudflare, a widżet od razu zwraca token.
const turnstileStub = `window.turnstile = {
  render(container) { container.dataset.rendered = 'true'; return 'widget-1'; },
  reset() { window.__turnstileResets = (window.__turnstileResets || 0) + 1; },
  getResponse() { return 'test-token'; },
};`;

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: turnstileStub }));
});

async function fillContactForm(page: import('@playwright/test').Page) {
  const form = page.locator('[data-contact-form]');
  await form.locator('#name').fill('Anna');
  await form.locator('#email').fill('anna@example.com');
  await form.locator('#message').fill('Chcę omówić pomysł na aplikację.');
  await form.getByRole('checkbox', { name: /Wyrażam zgodę na kontakt/ }).check();
  return form;
}

test('formularz waliduje pola i wysyła wiadomość z tokenem Turnstile', async ({ page }) => {
  let payload = '';
  await page.route('**/api/kontakt.php', (route) => {
    payload = route.request().postData() ?? '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/');
  const form = page.locator('[data-contact-form]');
  await form.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await expect(form.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await fillContactForm(page);
  const consent = form.locator('#consent');
  await consent.uncheck();
  await form.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await expect(consent).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('#consent-error')).toHaveText('Zaznacz zgodę, aby wysłać wiadomość.');
  expect(payload).toBe('');
  await consent.check();
  await expect(consent).not.toHaveAttribute('aria-invalid');
  await form.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await expect(form.getByRole('status')).toContainText('Wiadomość wysłana');
  await expect(form.locator('[data-turnstile]')).toHaveAttribute('data-rendered', 'true');
  expect(payload).toContain('test-token');
  expect(payload).toContain('anna@example.com');
  expect(payload).toMatch(/name="consent"\r\n\r\n1\r\n/);
  await expect(form.locator('#name')).toHaveValue('');
  await expect(consent).not.toBeChecked();
  expect(await page.evaluate(() => (window as unknown as { __turnstileResets?: number }).__turnstileResets)).toBe(1);
});

test('formularz pokazuje błędy zwrócone przez serwer', async ({ page }) => {
  await page.route('**/api/kontakt.php', (route) => route.fulfill({
    status: 422,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'Popraw zaznaczone pola.', fields: { email: 'Podaj poprawny adres e-mail.' } }),
  }));
  await page.goto('/');
  const form = await fillContactForm(page);
  await form.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await expect(form.getByRole('status')).toContainText('Popraw zaznaczone pola.');
  await expect(form.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('#email-error')).toHaveText('Podaj poprawny adres e-mail.');
  await expect(form.locator('#name')).toHaveValue('Anna');
});

test('polityka prywatności jest dostępna z formularza, ale nie z menu ani stopki', async ({ page }, testInfo) => {
  await page.goto('/');
  const link = page.locator('[data-contact-form]').getByRole('link', { name: 'polityką prywatności' });
  await expect(link).toHaveAttribute('href', '/polityka-prywatnosci/');
  await expect(page.locator('header a[href*="polityka-prywatnosci"]:not([data-language-choice]), footer a[href*="polityka-prywatnosci"]:not([data-language-choice])')).toHaveCount(0);
  await link.click();
  await expect(page).toHaveURL(/\/polityka-prywatnosci\/$/);
  await expect(page.getByRole('heading', { name: 'Polityka Prywatności', level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Administrator danych osobowych', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'zasady prywatności Umami' })).toHaveAttribute('href', 'https://umami.is/privacy');
  await expect(page.locator('header a[href*="polityka-prywatnosci"]:not([data-language-choice]), footer a[href*="polityka-prywatnosci"]:not([data-language-choice])')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('privacy-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
