import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function request(post: Record<string, unknown>, server: Record<string, unknown> = {}, config: Record<string, unknown> = {}, storage = '') {
  const php = `require ${JSON.stringify(resolve('server/src/ContactForm.php'))};
    $_POST=json_decode($argv[1],true); $_SERVER=array_merge(['REQUEST_METHOD'=>'POST'],json_decode($argv[2],true));
    (new Latarnik\\ContactForm(json_decode($argv[3],true),$argv[4]))->handle();`;
  return JSON.parse(execFileSync('php', ['-r', php, JSON.stringify(post), JSON.stringify(server), JSON.stringify(config), storage], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
}

test('PHP zachowuje format odpowiedzi i wybiera język tylko z poprawnego kodu', () => {
  for (const language of [undefined, 'pl', 'xx', ['en']]) {
    const result = request({ language });
    expect(result).toEqual({ ok: false, error: 'Popraw zaznaczone pola.', fields: {
      name: 'To pole jest wymagane.', email: 'To pole jest wymagane.', message: 'To pole jest wymagane.', consent: 'Zaznacz zgodę, aby wysłać wiadomość.',
    } });
  }
  expect(request({ language: 'en', name: 'A', email: 'bad', message: 'short' })).toEqual({ ok: false, error: 'Please correct the highlighted fields.', fields: {
    name: 'Enter at least 2 characters.', email: 'Enter a valid email address.', message: 'Enter at least 10 characters.', consent: 'Please give your consent to send the message.',
  } });
  expect(request({ language: 'en', name: 'x'.repeat(101), email: 'a@b.com', message: 'x'.repeat(5001), consent: '1' }).fields).toEqual({ name: 'Enter no more than 100 characters.', message: 'Enter no more than 5000 characters.' });
  expect(request({ language: 'en', name: 'An\u0001na', email: 'a@b.com', message: 'Message has\u0001control', consent: '1' }).fields).toEqual({ name: 'The name contains invalid characters.', message: 'The message contains invalid characters.' });
});

test('PHP lokalizuje błędy metody, origin, rozmiaru, limitu i zabezpieczenia', () => {
  const post = { language: 'en', name: 'Anna', email: 'anna@example.com', message: 'A valid test message.', consent: '1' };
  expect(request(post, { REQUEST_METHOD: 'GET' }).error).toBe('This form only accepts POST requests.');
  expect(request(post, { HTTP_ORIGIN: 'https://bad.example' }, { allowed_origins: ['https://latarnik.dev'] }).error).toContain('unauthorised website');
  expect(request(post, { CONTENT_LENGTH: 32769 }).error).toBe('The message is too long.');
  expect(request({ language: 'en', website: 'bot' })).toEqual({ ok: true });
  const storage = mkdtempSync(join(tmpdir(), 'latarnik-rate-'));
  try {
    expect(request(post, {}, {}, storage).error).toContain('security check failed');
    // A zero maximum deterministically exercises the limiter without SMTP/Turnstile calls.
    expect(request(post, {}, { rate_limit: { max: 0 } }, storage).error).toContain('Too many messages');
  } finally { rmSync(storage, { recursive: true, force: true }); }
});

test('awaryjny bootstrap również odpowiada po angielsku', () => {
  const directory = mkdtempSync(join(tmpdir(), 'latarnik-bootstrap-'));
  try {
    copyFileSync(resolve('server/bootstrap.php'), join(directory, 'bootstrap.php'));
    writeFileSync(join(directory, 'request.php'), `<?php $_POST=['language'=>'en']; require __DIR__.'/bootstrap.php';`);
    const result = JSON.parse(execFileSync('php', [join(directory, 'request.php')], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
    expect(result).toEqual({ ok: false, error: 'The contact form is temporarily unavailable.' });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
