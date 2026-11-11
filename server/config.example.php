<?php

declare(strict_types=1);

/*
 * Konfiguracja formularza kontaktowego.
 * Skopiuj ten plik jako config.php w tym samym katalogu i uzupełnij wartości.
 * config.php nie trafia do repozytorium i leży poza katalogiem publicznym.
 */
return [
    // Sekret Turnstile z panelu Cloudflare (Turnstile → widżet → Secret key).
    // Do testów lokalnych: '1x0000000000000000000000000000000AA' (zawsze przechodzi)
    // lub '2x0000000000000000000000000000000AA' (zawsze odrzuca).
    'turnstile_secret' => '',

    // Domeny, z których token Turnstile jest akceptowany. Pusta lista wyłącza sprawdzanie
    // (używaj tylko lokalnie z kluczami testowymi).
    'turnstile_hostnames' => ['latarnik.dev', 'www.latarnik.dev'],

    // Nagłówek Origin musi pasować do jednej z wartości. Pusta lista wyłącza sprawdzanie.
    'allowed_origins' => ['https://latarnik.dev', 'https://www.latarnik.dev'],

    'smtp' => [
        'host' => 'smtp.example.com',
        'port' => 465,
        // 'ssl' dla portu 465, 'tls' (STARTTLS) dla portu 587, 'none' tylko lokalnie (np. Mailpit na porcie 1025).
        'encryption' => 'ssl',
        'username' => 'kontakt@latarnik.dev',
        'password' => '',
    ],

    // Nadawca wiadomości. Powinien być adresem skrzynki SMTP, inaczej serwer może odrzucić wysyłkę.
    'mail_from' => 'kontakt@latarnik.dev',
    'mail_from_name' => 'Formularz latarnik.dev',

    // Adres, na który trafiają wiadomości z formularza.
    'mail_to' => 'kontakt@latarnik.dev',

    // Limit wysyłek z jednego adresu IP w oknie czasowym.
    'rate_limit' => ['max' => 5, 'window_seconds' => 900],
];
