<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

/**
 * POST /api/reservation.php   (JSON o formulario)
 * Crea una reserva PENDIENTE. La disponibilidad se verifica en el servidor, dentro de una
 * transacción, así que dos personas no pueden reservar las mismas fechas.
 *
 * Campos: property_id, check_in, check_out, guests, name, email, phone, website (trampa anti-bots, debe ir vacío)
 */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

// Solo se aceptan pedidos del propio sitio (protección básica contra CSRF en una API pública).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $host = parse_url($origin, PHP_URL_HOST);
    $port = parse_url($origin, PHP_URL_PORT);
    $expected = ($_SERVER['SERVER_NAME'] ?? '');
    if ($host !== $expected && ($host . ($port ? ':' . $port : '')) !== ($_SERVER['HTTP_HOST'] ?? '')) {
        json_response(['error' => 'Origen no permitido.'], 403);
    }
}

$raw = file_get_contents('php://input');
$body = [];
if (str_contains((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
    if (strlen((string)$raw) > 10000) {
        json_response(['error' => 'Pedido demasiado grande.'], 413);
    }
    $decoded = json_decode((string)$raw, true);
    if (!is_array($decoded)) {
        json_response(['ok' => false, 'error' => 'El pedido no es un JSON válido.'], 400);
    }
    $body = $decoded;
} else {
    $body = $_POST;
}
$str = fn(string $k, int $max): string => input_str($k, $max, $body);

if ($str('website', 100) !== '') {
    json_response(['ok' => true, 'code' => 'XXXXXXXXXX', 'total' => 0, 'nights' => 0]); // bot: se ignora en silencio
}

if (rate_limited('reservation', 6, 3600)) {
    json_response(['error' => 'Hiciste demasiados pedidos seguidos. Probá de nuevo en un rato.'], 429);
}
rate_hit('reservation');

try {
    $result = reservation_create(
        input_int('property_id', 1, PHP_INT_MAX, 0, $body),
        $str('check_in', 10),
        $str('check_out', 10),
        input_int('guests', 1, 99, 1, $body),
        $str('name', 120),
        $str('email', 190),
        $str('phone', 40)
    );
    json_response(['ok' => true] + $result, 201);
} catch (ReservationError $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 409);
} catch (Throwable $e) {
    error_log('reservation_create: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'No pudimos registrar la reserva. Probá de nuevo.'], 500);
}
