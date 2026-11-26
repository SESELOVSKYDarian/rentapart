<?php
declare(strict_types=1);
require_once __DIR__ . '/_common.php';

/**
 * GET /api/properties.php
 *   ?id=12                       detalle de una propiedad (con fotos y fechas ocupadas)
 *   ?destination=&type=&guests=&arrival=&departure=&max_price=   listado filtrado
 */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['error' => 'Método no permitido.'], 405);
}

$norm = fn(string $s): string => mb_strtolower(trim($s));

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $p = q('SELECT * FROM properties WHERE id = ? AND published = 1', [$id])->fetch();
    if (!$p) {
        json_response(['error' => 'Propiedad no encontrada.'], 404);
    }
    $out = api_property_row($p, photos_of($id));
    $out['unavailable'] = api_unavailable_ranges([$id])[$id] ?? [];
    header('Cache-Control: no-store');
    json_response($out);
}

$sql = 'SELECT p.*, (SELECT path FROM property_photos ph WHERE ph.property_id = p.id ORDER BY ph.sort_order, ph.id LIMIT 1) AS cover
        FROM properties p WHERE p.published = 1';
$params = [];

$type = (string)($_GET['type'] ?? '');
if (in_array($type, RA_TYPES, true)) {
    $sql .= ' AND p.type = ?';
    $params[] = $type;
}
$guests = isset($_GET['guests']) ? (int)$_GET['guests'] : 0;
if ($guests > 0) {
    $sql .= ' AND p.max_guests >= ?';
    $params[] = $guests;
}
$maxPrice = isset($_GET['max_price']) ? (float)$_GET['max_price'] : 0;
if ($maxPrice > 0) {
    $sql .= ' AND p.price_night <= ?';
    $params[] = $maxPrice;
}
$dest = mb_substr($norm((string)($_GET['destination'] ?? '')), 0, 60);
if ($dest !== '') {
    $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $dest) . '%';
    $sql .= ' AND (LOWER(p.city) LIKE ? OR LOWER(p.district) LIKE ? OR LOWER(p.name) LIKE ?)';
    array_push($params, $like, $like, $like);
}
$sql .= ' ORDER BY p.created_at DESC LIMIT 100';

$rows = q($sql, $params)->fetchAll();

$arrival = (string)($_GET['arrival'] ?? '');
$departure = (string)($_GET['departure'] ?? '');
$filterDates = valid_date($arrival) && valid_date($departure) && $departure > $arrival;

$ranges = api_unavailable_ranges(array_column($rows, 'id'));
$photoMap = api_photos_of(array_column($rows, 'id'));
$out = [];
foreach ($rows as $p) {
    if ($filterDates && !range_is_free((int)$p['id'], $arrival, $departure)) {
        continue;
    }
    $row = api_property_row($p, $photoMap[(int)$p['id']] ?? []);
    $row['unavailable'] = $ranges[(int)$p['id']] ?? [];
    $out[] = $row;
}
header('Cache-Control: no-store');
json_response(['count' => count($out), 'properties' => $out]);
