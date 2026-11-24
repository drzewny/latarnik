import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let devServer: ViteDevServer;
let devURL: string;

test.beforeAll(async () => {
  devServer = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: false } });
  await devServer.listen();
  const address = devServer.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Brak adresu serwera developerskiego');
  devURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => { await devServer?.close(); });

test.beforeEach(async ({ page }) => {
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
});

for (const mode of ['dev', 'preview'] as const) {
  test(`${mode}: /en i /en/ otwierają angielską stronę, zachowując parametry i kotwicę`, async ({ page, baseURL }) => {
    const origin = mode === 'dev' ? devURL : baseURL!;
    for (const path of ['/en', '/en/']) {
      await page.goto(`${origin}${path}?source=test#uslugi`);
      await expect(page).toHaveURL(`${origin}/en/?source=test#uslugi`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.getByRole('heading', { name: 'Big solutions for small businesses' })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://latarnik.dev/en/');
    }
  });

  test(`${mode}: przekierowania obejmują podstrony PL i EN oraz żądania HEAD`, async ({ request, baseURL }) => {
    const origin = mode === 'dev' ? devURL : baseURL!;
    for (const path of ['/en', '/en/portfolio', '/en/privacy-policy', '/en/services/automation', '/en/services/websites/wiem-i-powiem', '/portfolio', '/uslugi/automatyzacja']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await request.fetch(`${origin}${path}?category=website&source=test`, { method, maxRedirects: 0 });
        expect(response.status()).toBe(308);
        expect(response.headers().location).toBe(`${path}/?category=website&source=test`);
      }
      const response = await request.get(`${origin}${path}/`);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(`<html lang="${path.startsWith('/en') ? 'en' : 'pl'}">`);
    }
  });

  test(`${mode}: pliki nie są przekierowywane, nieistniejące strony zwracają 404`, async ({ request, baseURL }) => {
    const origin = mode === 'dev' ? devURL : baseURL!;
    const icon = await request.get(`${origin}/favicon.svg`, { maxRedirects: 0 });
    expect(icon.status()).toBe(200);
    expect(icon.headers().location).toBeUndefined();
    for (const path of ['/en/not-a-page', '/en/not-a-page/']) {
      const response = await request.get(`${origin}${path}`, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    }
  });
}
