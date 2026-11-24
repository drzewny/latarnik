<?php

declare(strict_types=1);

namespace Latarnik;

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

final class ContactForm
{
    private const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    private const TURNSTILE_ACTION = 'contact';
    private const MAX_BODY_BYTES = 32_768;
    private const MESSAGES_EN = [
        'Formularz przyjmuje tylko wysyłkę metodą POST.' => 'This form only accepts POST requests.',
        'Wiadomość wysłano z niedozwolonej strony.' => 'The message was sent from an unauthorised website.',
        'Wiadomość jest za długa.' => 'The message is too long.',
        'Popraw zaznaczone pola.' => 'Please correct the highlighted fields.',
        'Wysłano zbyt wiele wiadomości. Spróbuj ponownie za kilkanaście minut.' => 'Too many messages have been sent. Try again in about 15 minutes.',
        'Weryfikacja zabezpieczenia nie powiodła się. Zaznacz ją ponownie i wyślij formularz.' => 'The security check failed. Complete it again and resubmit the form.',
        'Nie udało się wysłać wiadomości.' => 'Your message could not be sent.',
        ' Napisz bezpośrednio na ' => ' Please email ',
        'To pole jest wymagane.' => 'This field is required.',
        'Wpisz co najmniej 2 znaki.' => 'Enter at least 2 characters.',
        'Wpisz maksymalnie 100 znaków.' => 'Enter no more than 100 characters.',
        'Podaj poprawny adres e-mail.' => 'Enter a valid email address.',
        'Wpisz co najmniej 10 znaków.' => 'Enter at least 10 characters.',
        'Wpisz maksymalnie 5000 znaków.' => 'Enter no more than 5000 characters.',
        'Zaznacz zgodę, aby wysłać wiadomość.' => 'Please give your consent to send the message.',
        'Imię zawiera niedozwolone znaki.' => 'The name contains invalid characters.',
        'Wiadomość zawiera niedozwolone znaki.' => 'The message contains invalid characters.',
    ];


    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly array $config,
        private readonly string $storageDir,
    ) {
    }

    public function handle(): never
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Allow: POST');
            $this->respond(405, ['ok' => false, 'error' => 'Formularz przyjmuje tylko wysyłkę metodą POST.']);
        }

        if (!$this->originAllowed()) {
            $this->respond(403, ['ok' => false, 'error' => 'Wiadomość wysłano z niedozwolonej strony.']);
        }

        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > self::MAX_BODY_BYTES) {
            $this->respond(413, ['ok' => false, 'error' => 'Wiadomość jest za długa.']);
        }

        // Honeypot: prawdziwi użytkownicy nie widzą tego pola. Bot dostaje „sukces”, ale nic nie wysyłamy.
        if (trim($this->input('website')) !== '') {
            $this->respond(200, ['ok' => true]);
        }

        $name = trim(preg_replace('/\s+/u', ' ', $this->input('name')) ?? '');
        $email = trim($this->input('email'));
        $message = trim(str_replace("\r\n", "\n", $this->input('message')));

        $consent = $this->input('consent') === '1';

        $errors = $this->validate($name, $email, $message, $consent);
        if ($errors !== []) {
            $this->respond(422, ['ok' => false, 'error' => 'Popraw zaznaczone pola.', 'fields' => $errors]);
        }

        $ip = $this->clientIp();

        if (!$this->withinRateLimit($ip)) {
            $this->respond(429, ['ok' => false, 'error' => 'Wysłano zbyt wiele wiadomości. Spróbuj ponownie za kilkanaście minut.']);
        }

        $token = $this->input('cf-turnstile-response');
        if (!$this->verifyTurnstile($token, $ip)) {
            $this->respond(403, ['ok' => false, 'error' => 'Weryfikacja zabezpieczenia nie powiodła się. Zaznacz ją ponownie i wyślij formularz.']);
        }

        if (!$this->send($name, $email, $message, $ip)) {
            $fallback = (string) ($this->config['mail_to'] ?? '');
            $this->respond(500, [
                'ok' => false,
                'error' => 'Nie udało się wysłać wiadomości.' . ($fallback !== '' ? " Napisz bezpośrednio na {$fallback}." : ''),
            ]);
        }

        $this->recordSubmission($ip);
        $this->respond(200, ['ok' => true]);
    }

    private function input(string $key): string
    {
        $value = $_POST[$key] ?? '';
        return is_string($value) ? $value : '';
    }

    /** @return array<string, string> */
    private function validate(string $name, string $email, string $message, bool $consent): array
    {
        $errors = [];

        $nameLength = mb_strlen($name);
        if ($nameLength === 0) {
            $errors['name'] = 'To pole jest wymagane.';
        } elseif ($nameLength < 2) {
            $errors['name'] = 'Wpisz co najmniej 2 znaki.';
        } elseif ($nameLength > 100) {
            $errors['name'] = 'Wpisz maksymalnie 100 znaków.';
        }

        if ($email === '') {
            $errors['email'] = 'To pole jest wymagane.';
        } elseif (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Podaj poprawny adres e-mail.';
        }

        $messageLength = mb_strlen($message);
        if ($messageLength === 0) {
            $errors['message'] = 'To pole jest wymagane.';
        } elseif ($messageLength < 10) {
            $errors['message'] = 'Wpisz co najmniej 10 znaków.';
        } elseif ($messageLength > 5000) {
            $errors['message'] = 'Wpisz maksymalnie 5000 znaków.';
        }

        if (!$consent) {
            $errors['consent'] = 'Zaznacz zgodę, aby wysłać wiadomość.';
        }

        // Odrzucamy niepoprawne UTF-8 i znaki sterujące (poza nową linią i tabulatorem w treści).
        if (!isset($errors['name']) && (!mb_check_encoding($name, 'UTF-8') || preg_match('/[\x00-\x1F\x7F]/', $name))) {
            $errors['name'] = 'Imię zawiera niedozwolone znaki.';
        }
        if (!isset($errors['message']) && (!mb_check_encoding($message, 'UTF-8') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $message))) {
            $errors['message'] = 'Wiadomość zawiera niedozwolone znaki.';
        }

        return $errors;
    }

    private function originAllowed(): bool
    {
        $allowed = $this->config['allowed_origins'] ?? [];
        if ($allowed === []) {
            return true;
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        return in_array($origin, $allowed, true);
    }

    private function clientIp(): string
    {
        // Gdy ruch przechodzi przez proxy Cloudflare, prawdziwy adres jest w CF-Connecting-IP.
        // Ufamy mu tylko, jeśli to poprawny adres IP; w innym wypadku używamy REMOTE_ADDR.
        $cfIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
        if ($cfIp !== '' && filter_var($cfIp, FILTER_VALIDATE_IP) !== false) {
            return $cfIp;
        }
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    private function verifyTurnstile(string $token, string $ip): bool
    {
        $secret = (string) ($this->config['turnstile_secret'] ?? '');
        if ($secret === '') {
            error_log('[kontakt] Brak turnstile_secret w config.php.');
            return false;
        }
        if ($token === '' || strlen($token) > 2048) {
            return false;
        }

        $curl = curl_init(self::TURNSTILE_VERIFY_URL);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $ip,
                'idempotency_key' => bin2hex(random_bytes(16)),
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
        ]);
        $raw = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);

        if ($raw === false || $status !== 200) {
            error_log("[kontakt] Turnstile siteverify niedostępny (HTTP {$status}): {$curlError}");
            return false;
        }

        $result = json_decode((string) $raw, true);
        if (!is_array($result) || ($result['success'] ?? false) !== true) {
            $codes = is_array($result) ? implode(',', (array) ($result['error-codes'] ?? [])) : 'invalid-json';
            error_log("[kontakt] Turnstile odrzucił token: {$codes}");
            return false;
        }

        // Klucze testowe Cloudflare nie zwracają akcji, więc sprawdzamy ją tylko, gdy jest obecna.
        $action = $result['action'] ?? '';
        if ($action !== '' && $action !== self::TURNSTILE_ACTION) {
            error_log("[kontakt] Turnstile: nieoczekiwana akcja '{$action}'.");
            return false;
        }

        $hostnames = $this->config['turnstile_hostnames'] ?? [];
        if ($hostnames !== [] && !in_array($result['hostname'] ?? '', $hostnames, true)) {
            error_log('[kontakt] Turnstile: nieoczekiwany hostname ' . ($result['hostname'] ?? '(brak)'));
            return false;
        }

        return true;
    }

    private function send(string $name, string $email, string $message, string $ip): bool
    {
        $smtp = $this->config['smtp'] ?? [];
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = (string) ($smtp['host'] ?? '');
            $mail->Port = (int) ($smtp['port'] ?? 465);
            $mail->Username = (string) ($smtp['username'] ?? '');
            $mail->Password = (string) ($smtp['password'] ?? '');
            $mail->SMTPAuth = $mail->Username !== '';
            $encryption = $smtp['encryption'] ?? 'ssl';
            if ($encryption === 'none') {
                // Tylko do testów lokalnych (np. Mailpit). Na produkcji używaj 'ssl' lub 'tls'.
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            } else {
                $mail->SMTPSecure = $encryption === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
            }
            $mail->Timeout = 15;
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;

            $mail->setFrom((string) $this->config['mail_from'], (string) ($this->config['mail_from_name'] ?? ''));
            $mail->addAddress((string) $this->config['mail_to']);
            $mail->addReplyTo($email, $name);

            $mail->isHTML(false);
            $mail->Subject = "Nowa wiadomość z latarnik.dev – {$name}";
            $mail->Body = implode("\n", [
                "Imię: {$name}",
                "E-mail: {$email}",
                'Data: ' . (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw')))->format('Y-m-d H:i:s'),
                "IP: {$ip}",
                'Zgoda na kontakt i polityka prywatności: zaakceptowane',
                '',
                $message,
                '',
                '-- ',
                'Wiadomość z formularza kontaktowego na latarnik.dev. Odpowiedz, aby napisać do nadawcy.',
            ]);

            $mail->send();
            return true;
        } catch (MailerException $exception) {
            error_log('[kontakt] Błąd wysyłki SMTP: ' . $mail->ErrorInfo . ' / ' . $exception->getMessage());
            return false;
        }
    }

    private function rateLimitFile(string $ip): string
    {
        return $this->storageDir . '/rate-' . hash('sha256', $ip) . '.json';
    }

    /** @return list<int> */
    private function recentSubmissions(string $ip): array
    {
        $file = $this->rateLimitFile($ip);
        if (!is_file($file)) {
            return [];
        }
        $window = (int) ($this->config['rate_limit']['window_seconds'] ?? 900);
        $timestamps = json_decode((string) file_get_contents($file), true);
        $threshold = time() - $window;
        return array_values(array_filter(
            is_array($timestamps) ? $timestamps : [],
            static fn (mixed $time): bool => is_int($time) && $time > $threshold,
        ));
    }

    private function withinRateLimit(string $ip): bool
    {
        $max = (int) ($this->config['rate_limit']['max'] ?? 5);
        return count($this->recentSubmissions($ip)) < $max;
    }

    private function recordSubmission(string $ip): void
    {
        if (!is_dir($this->storageDir) && !@mkdir($this->storageDir, 0750, true)) {
            error_log("[kontakt] Nie można utworzyć katalogu {$this->storageDir}.");
            return;
        }
        $handle = @fopen($this->rateLimitFile($ip), 'c+');
        if ($handle === false) {
            error_log("[kontakt] Brak zapisu do {$this->storageDir}.");
            return;
        }
        flock($handle, LOCK_EX);
        $timestamps = $this->recentSubmissions($ip);
        $timestamps[] = time();
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($timestamps));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    /** @param array<string, mixed> $body */
    private function respond(int $status, array $body): never
    {
        if ($this->input('language') === 'en') {
            if (isset($body['error'])) {
                $body['error'] = strtr($body['error'], self::MESSAGES_EN);
            }
            if (isset($body['fields'])) {
                $body['fields'] = array_map(static fn (string $text): string => strtr($text, self::MESSAGES_EN), $body['fields']);
            }
        }
        http_response_code($status);
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
