<?php

declare(strict_types=1);

/*
 * Generuje server/config.php ze zmiennych środowiskowych (GitHub Secrets i Variables).
 * Używany przez workflow „Deploy backend to prod on demand”. Struktura odpowiada server/config.example.php.
 */

function env(string $name, string $default = ''): string
{
    $value = getenv($name);
    return $value === false || trim($value) === '' ? $default : trim($value);
}

/** @return list<string> */
function envList(string $name, string $default): array
{
    return array_values(array_filter(array_map('trim', explode(',', env($name, $default))), static fn (string $item): bool => $item !== ''));
}

$required = ['TURNSTILE_SECRET', 'SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'MAIL_TO'];
$missing = array_filter($required, static fn (string $name): bool => env($name) === '');
if ($missing !== []) {
    foreach ($missing as $name) {
        fwrite(STDERR, "::error::Brak {$name} w środowisku Production (Settings → Environments → Production).\n");
    }
    exit(1);
}

$encryption = env('SMTP_ENCRYPTION', 'ssl');
if (!in_array($encryption, ['ssl', 'tls'], true)) {
    fwrite(STDERR, "::error::SMTP_ENCRYPTION musi mieć wartość 'ssl' (port 465) lub 'tls' (port 587).\n");
    exit(1);
}

$port = env('SMTP_PORT', $encryption === 'tls' ? '587' : '465');
if (!ctype_digit($port)) {
    fwrite(STDERR, "::error::SMTP_PORT musi być liczbą.\n");
    exit(1);
}

$smtpUsername = env('SMTP_USERNAME');

$config = [
    'turnstile_secret' => env('TURNSTILE_SECRET'),
    'turnstile_hostnames' => envList('TURNSTILE_HOSTNAMES', 'latarnik.dev,www.latarnik.dev'),
    'allowed_origins' => envList('ALLOWED_ORIGINS', 'https://latarnik.dev,https://www.latarnik.dev'),
    'smtp' => [
        'host' => env('SMTP_HOST'),
        'port' => (int) $port,
        'encryption' => $encryption,
        'username' => $smtpUsername,
        'password' => env('SMTP_PASSWORD'),
    ],
    'mail_from' => env('MAIL_FROM', $smtpUsername),
    'mail_from_name' => env('MAIL_FROM_NAME', 'Formularz latarnik.dev'),
    'mail_to' => env('MAIL_TO'),
    'rate_limit' => ['max' => 5, 'window_seconds' => 900],
];

$path = env('CONFIG_PATH', dirname(__DIR__, 2) . '/server/config.php');
$contents = "<?php\n\ndeclare(strict_types=1);\n\n// Wygenerowano automatycznie przez GitHub Actions. Nie edytuj na serwerze – zmień Secrets/Variables i uruchom wdrożenie.\nreturn " . var_export($config, true) . ";\n";

if (file_put_contents($path, $contents) === false) {
    fwrite(STDERR, "::error::Nie udało się zapisać {$path}.\n");
    exit(1);
}
chmod($path, 0600);

echo "Zapisano {$path} (SMTP {$config['smtp']['host']}:{$config['smtp']['port']}/{$encryption}, odbiorca {$config['mail_to']}).\n";
