<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

/** GET /api/site.php — personalización pública (logo, colores, textos, contacto). */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['error' => 'Método no permitido.'], 405);
}
$s = settings_all();
header('Cache-Control: public, max-age=60');
json_response([
    'ink'        => $s['brand_ink'] ?: null,
    'paper'      => $s['brand_paper'] ?: null,
    'hero_title' => $s['hero_title'] ?: null,
    'hero_image' => $s['hero_image'] ?: null,
    'logo'       => $s['logo'] ?: null,
    'email'      => $s['contact_email'] ?: null,
    'phone'      => $s['contact_phone'] ?: null,
    'whatsapp'   => $s['contact_whatsapp'] ?: null,
]);
