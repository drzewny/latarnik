<?php

declare(strict_types=1);

/*
 * Wywoływany przez public_html/api/kontakt.php. Wszystko poza tym plikiem leży poza katalogiem publicznym.
 */

$autoload = __DIR__ . '/vendor/autoload.php';
$configFile = __DIR__ . '/config.php';

if (!is_file($autoload) || !is_file($configFile)) {
    error_log('[kontakt] Brak server/vendor (uruchom composer install) lub server/config.php.');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Formularz jest chwilowo niedostępny.'], JSON_UNESCAPED_UNICODE);
    exit;
}

require $autoload;

(new Latarnik\ContactForm(require $configFile, __DIR__ . '/storage'))->handle();
