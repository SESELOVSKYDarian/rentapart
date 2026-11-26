<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

/* Utilidades de la API pública (solo lectura + creación de reservas). */

function api_property_row(array $p, array $photos = []): array
{
    return [
        'id'           => (int)$p['id'],
        'name'         => $p['name'],
        'district'     => $p['district'],
        'city'         => $p['city'],
        'type'         => $p['type'],
        'description'  => $p['description'],
        'price_night'  => (float)$p['price_night'],
        'cleaning_fee' => (float)$p['cleaning_fee'],
        'max_guests'   => (int)$p['max_guests'],
        'bedrooms'     => (int)$p['bedrooms'],
        'bathrooms'    => (int)$p['bathrooms'],
        'amenities'    => array_values(array_filter(array_map('trim', explode(',', (string)$p['amenities'])))),
        'tag'          => $p['tag'],
        'cover'        => $p['cover'] ?? ($photos[0]['path'] ?? null),
        'photos'       => array_map(fn($ph) => $ph['path'], $photos),
    ];
}

/**
 * Fechas no disponibles (reservas pendientes/confirmadas y bloqueos) de varias propiedades.
 * @param int[] $ids
 * @return array<int, array<int, array{start:string,end:string}>> id => rangos (end = día de salida)
 */
function api_unavailable_ranges(array $ids): array
{
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $map = array_fill_keys($ids, []);
    if (!$ids) {
        return $map;
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    foreach (q("SELECT property_id, check_in AS start, check_out AS end FROM reservations
                WHERE property_id IN ($in) AND status IN ('pending','confirmed') AND check_out >= CURDATE()", $ids)->fetchAll() as $r) {
        $map[(int)$r['property_id']][] = ['start' => $r['start'], 'end' => $r['end']];
    }
    foreach (q("SELECT property_id, start_date AS start, end_date AS end FROM availability_blocks
                WHERE property_id IN ($in) AND end_date >= CURDATE()", $ids)->fetchAll() as $r) {
        $map[(int)$r['property_id']][] = ['start' => $r['start'], 'end' => $r['end']];
    }
    return $map;
}

/** Fotos de varias propiedades, ordenadas (la primera es la portada). @return array<int, array<int, array{path:string}>> */
function api_photos_of(array $ids): array
{
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $map = array_fill_keys($ids, []);
    if (!$ids) {
        return $map;
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    foreach (q("SELECT property_id, path FROM property_photos WHERE property_id IN ($in) ORDER BY sort_order, id", $ids)->fetchAll() as $r) {
        $map[(int)$r['property_id']][] = ['path' => $r['path']];
    }
    return $map;
}
