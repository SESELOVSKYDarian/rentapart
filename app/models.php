<?php
declare(strict_types=1);

/* Acceso a datos. Todas las consultas usan sentencias preparadas. */

const RA_TYPES = ['Monoambiente', 'Departamento', 'Dúplex', 'Casa'];

/* ───────── Usuarios / agentes ───────── */
function user_find(int $id): ?array
{
    $r = q('SELECT id, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?', [$id])->fetch();
    return $r ?: null;
}

function agents_all(): array
{
    return q("SELECT u.id, u.name, u.email, u.role, u.active, u.last_login_at,
                     (SELECT COUNT(*) FROM properties p WHERE p.agent_id = u.id) AS properties
              FROM users u ORDER BY u.role = 'admin' DESC, u.name")->fetchAll();
}

function user_email_taken(string $email, int $exceptId = 0): bool
{
    return (int)q('SELECT COUNT(*) FROM users WHERE email = ? AND id <> ?', [mb_strtolower($email), $exceptId])->fetchColumn() > 0;
}

/* ───────── Propiedades ───────── */
/** Propiedad visible para el usuario: admin ve todas, agente solo las suyas. */
function property_for(array $user, int $id): ?array
{
    if (is_admin($user)) {
        $r = q('SELECT p.*, u.name AS agent_name FROM properties p JOIN users u ON u.id = p.agent_id WHERE p.id = ?', [$id])->fetch();
    } else {
        $r = q('SELECT p.*, u.name AS agent_name FROM properties p JOIN users u ON u.id = p.agent_id WHERE p.id = ? AND p.agent_id = ?', [$id, (int)$user['id']])->fetch();
    }
    return $r ?: null;
}

function properties_for(array $user): array
{
    $sql = 'SELECT p.*, u.name AS agent_name,
                   (SELECT path FROM property_photos ph WHERE ph.property_id = p.id ORDER BY ph.sort_order, ph.id LIMIT 1) AS cover
            FROM properties p JOIN users u ON u.id = p.agent_id';
    if (is_admin($user)) {
        return q($sql . ' ORDER BY p.created_at DESC')->fetchAll();
    }
    return q($sql . ' WHERE p.agent_id = ? ORDER BY p.created_at DESC', [(int)$user['id']])->fetchAll();
}

function photos_of(int $propertyId): array
{
    return q('SELECT id, path, sort_order FROM property_photos WHERE property_id = ? ORDER BY sort_order, id', [$propertyId])->fetchAll();
}

/** Valida y normaliza los datos de un formulario de propiedad. @return array{0:array,1:array} [datos, errores] */
function property_input(): array
{
    $d = [
        'name'         => input_str('name', 140),
        'district'     => input_str('district', 80),
        'city'         => input_str('city', 80) ?: 'Buenos Aires',
        'type'         => in_array($_POST['type'] ?? '', RA_TYPES, true) ? $_POST['type'] : 'Departamento',
        'description'  => input_str('description', 4000),
        'price_night'  => input_money('price_night', 1000000),
        'cleaning_fee' => input_money('cleaning_fee', 1000000),
        'max_guests'   => input_int('max_guests', 1, 30, 2),
        'bedrooms'     => input_int('bedrooms', 0, 20, 1),
        'bathrooms'    => input_int('bathrooms', 1, 20, 1),
        'amenities'    => input_str('amenities', 500),
        'tag'          => input_str('tag', 40),
        'published'    => !empty($_POST['published']) ? 1 : 0,
    ];
    $errors = [];
    if (mb_strlen($d['name']) < 3) {
        $errors[] = 'Ponele un nombre a la propiedad (mínimo 3 letras).';
    }
    if ($d['district'] === '') {
        $errors[] = 'Indicá el barrio o la zona.';
    }
    if ($d['price_night'] <= 0) {
        $errors[] = 'El precio por noche debe ser mayor a cero.';
    }
    return [$d, $errors];
}

function property_save(?int $id, int $agentId, array $d): int
{
    if ($id === null) {
        q('INSERT INTO properties (agent_id, name, district, city, type, description, price_night, cleaning_fee, max_guests, bedrooms, bathrooms, amenities, tag, published)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$agentId, $d['name'], $d['district'], $d['city'], $d['type'], $d['description'], $d['price_night'], $d['cleaning_fee'],
             $d['max_guests'], $d['bedrooms'], $d['bathrooms'], $d['amenities'], $d['tag'], $d['published']]);
        return (int)db()->lastInsertId();
    }
    q('UPDATE properties SET name=?, district=?, city=?, type=?, description=?, price_night=?, cleaning_fee=?, max_guests=?, bedrooms=?, bathrooms=?, amenities=?, tag=?, published=? WHERE id=?',
        [$d['name'], $d['district'], $d['city'], $d['type'], $d['description'], $d['price_night'], $d['cleaning_fee'],
         $d['max_guests'], $d['bedrooms'], $d['bathrooms'], $d['amenities'], $d['tag'], $d['published'], $id]);
    return $id;
}

/* ───────── Disponibilidad ───────── */
/** Hay solapamiento si inicio < fin_existente Y fin > inicio_existente (la salida no ocupa el día). */
function range_is_free(int $propertyId, string $checkIn, string $checkOut, int $ignoreReservation = 0): bool
{
    $r = (int)q("SELECT COUNT(*) FROM reservations
                 WHERE property_id = ? AND status IN ('pending','confirmed') AND id <> ?
                   AND check_in < ? AND check_out > ?", [$propertyId, $ignoreReservation, $checkOut, $checkIn])->fetchColumn();
    if ($r > 0) {
        return false;
    }
    $b = (int)q('SELECT COUNT(*) FROM availability_blocks WHERE property_id = ? AND start_date < ? AND end_date > ?', [$propertyId, $checkOut, $checkIn])->fetchColumn();
    return $b === 0;
}

function blocks_of(int $propertyId): array
{
    return q('SELECT id, start_date, end_date, reason FROM availability_blocks WHERE property_id = ? AND end_date >= CURDATE() ORDER BY start_date', [$propertyId])->fetchAll();
}

/** Días ocupados (reservas activas + bloqueos) dentro de un mes, como mapa fecha => 'booked'|'blocked'. */
function month_occupancy(int $propertyId, string $firstDay, string $lastDayExclusive): array
{
    $map = [];
    $res = q("SELECT check_in, check_out, status FROM reservations
              WHERE property_id = ? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ?",
        [$propertyId, $lastDayExclusive, $firstDay])->fetchAll();
    foreach ($res as $r) {
        for ($t = strtotime($r['check_in']); $t < strtotime($r['check_out']); $t += 86400) {
            $map[date('Y-m-d', $t)] = $r['status'] === 'confirmed' ? 'confirmed' : 'pending';
        }
    }
    $bl = q('SELECT start_date, end_date FROM availability_blocks WHERE property_id = ? AND start_date < ? AND end_date > ?',
        [$propertyId, $lastDayExclusive, $firstDay])->fetchAll();
    foreach ($bl as $b) {
        for ($t = strtotime($b['start_date']); $t < strtotime($b['end_date']); $t += 86400) {
            $map[date('Y-m-d', $t)] = 'blocked';
        }
    }
    return $map;
}

/* ───────── Reservas ───────── */
class ReservationError extends RuntimeException {}

/**
 * Crea una reserva PENDIENTE verificando disponibilidad dentro de una transacción
 * con bloqueo de fila: evita reservas duplicadas aunque lleguen dos solicitudes a la vez.
 *
 * @return array{code:string,total:float,nights:int}
 */
function reservation_create(int $propertyId, string $checkIn, string $checkOut, int $guests, string $name, string $email, string $phone): array
{
    if (!valid_date($checkIn) || !valid_date($checkOut)) {
        throw new ReservationError('Las fechas no son válidas.');
    }
    if ($checkIn < today()) {
        throw new ReservationError('La entrada no puede ser anterior a hoy.');
    }
    if ($checkOut <= $checkIn) {
        throw new ReservationError('La salida debe ser posterior a la entrada.');
    }
    $nights = (int)((strtotime($checkOut) - strtotime($checkIn)) / 86400);
    if ($nights > 60) {
        throw new ReservationError('La estadía máxima es de 60 noches.');
    }
    if (mb_strlen($name) < 3 || mb_strlen($name) > 120) {
        throw new ReservationError('Escribí tu nombre completo.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
        throw new ReservationError('El correo electrónico no es válido.');
    }
    if (!preg_match('/^[0-9+()\-\s]{6,40}$/', $phone)) {
        throw new ReservationError('El teléfono no es válido.');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $p = q('SELECT id, price_night, cleaning_fee, max_guests FROM properties WHERE id = ? AND published = 1 FOR UPDATE', [$propertyId])->fetch();
        if (!$p) {
            throw new ReservationError('Esta propiedad no está disponible.');
        }
        if ($guests < 1 || $guests > (int)$p['max_guests']) {
            throw new ReservationError('Esta propiedad admite hasta ' . (int)$p['max_guests'] . ' huéspedes.');
        }
        if (!range_is_free($propertyId, $checkIn, $checkOut)) {
            throw new ReservationError('Esas fechas ya no están disponibles. Elegí otro rango.');
        }
        $total = round($nights * (float)$p['price_night'] + (float)$p['cleaning_fee'], 2);
        for ($i = 0; $i < 5; $i++) {
            $code = random_code(10);
            try {
                q('INSERT INTO reservations (code, property_id, guest_name, guest_email, guest_phone, guests, check_in, check_out, nights, total, status)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)', [$code, $propertyId, $name, mb_strtolower($email), $phone, $guests, $checkIn, $checkOut, $nights, $total, 'pending']);
                break;
            } catch (PDOException $e) {
                if ($i === 4 || ($e->errorInfo[1] ?? 0) !== 1062) {
                    throw $e;
                }
            }
        }
        $pdo->commit();
        return ['code' => $code, 'total' => $total, 'nights' => $nights];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/** Cambia el estado de una reserva dentro de una transacción. Devuelve null si ok o un mensaje de error. */
function reservation_set_status(int $id, string $status): ?string
{
    if (!in_array($status, ['confirmed', 'cancelled'], true)) {
        return 'Estado inválido.';
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $r = q('SELECT id, property_id, check_in, check_out, status FROM reservations WHERE id = ? FOR UPDATE', [$id])->fetch();
        if (!$r) {
            $pdo->rollBack();
            return 'La reserva no existe.';
        }
        if ($r['status'] === $status) {
            $pdo->rollBack();
            return null;
        }
        if ($status === 'confirmed') {
            if ($r['status'] === 'cancelled' && !range_is_free((int)$r['property_id'], $r['check_in'], $r['check_out'], (int)$r['id'])) {
                $pdo->rollBack();
                return 'No se puede reactivar: esas fechas ya fueron tomadas.';
            }
        }
        q('UPDATE reservations SET status = ? WHERE id = ?', [$status, $id]);
        $pdo->commit();
        return null;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function reservation_for(array $user, int $id): ?array
{
    $sql = 'SELECT r.*, p.name AS property_name, p.agent_id FROM reservations r JOIN properties p ON p.id = r.property_id WHERE r.id = ?';
    $params = [$id];
    if (!is_admin($user)) {
        $sql .= ' AND p.agent_id = ?';
        $params[] = (int)$user['id'];
    }
    $r = q($sql, $params)->fetch();
    return $r ?: null;
}

function reservations_for(array $user, string $status = '', int $propertyId = 0, int $limit = 200): array
{
    $sql = 'SELECT r.*, p.name AS property_name, u.name AS agent_name
            FROM reservations r JOIN properties p ON p.id = r.property_id JOIN users u ON u.id = p.agent_id WHERE 1=1';
    $params = [];
    if (!is_admin($user)) {
        $sql .= ' AND p.agent_id = ?';
        $params[] = (int)$user['id'];
    }
    if (in_array($status, ['pending', 'confirmed', 'cancelled'], true)) {
        $sql .= ' AND r.status = ?';
        $params[] = $status;
    }
    if ($propertyId > 0) {
        $sql .= ' AND r.property_id = ?';
        $params[] = $propertyId;
    }
    $sql .= ' ORDER BY r.created_at DESC LIMIT ' . (int)$limit;
    return q($sql, $params)->fetchAll();
}

/* ───────── Métricas ───────── */
function metrics_for(array $user): array
{
    $scope = is_admin($user) ? '' : ' AND p.agent_id = ' . (int)$user['id'];
    $m = [];
    $m['properties'] = (int)q('SELECT COUNT(*) FROM properties p WHERE 1=1' . $scope)->fetchColumn();
    $m['published']  = (int)q('SELECT COUNT(*) FROM properties p WHERE p.published = 1' . $scope)->fetchColumn();
    $m['pending']    = (int)q("SELECT COUNT(*) FROM reservations r JOIN properties p ON p.id = r.property_id WHERE r.status = 'pending'" . $scope)->fetchColumn();
    $m['upcoming']   = (int)q("SELECT COUNT(*) FROM reservations r JOIN properties p ON p.id = r.property_id WHERE r.status = 'confirmed' AND r.check_out >= CURDATE()" . $scope)->fetchColumn();
    $m['revenue']    = (float)q("SELECT COALESCE(SUM(r.total),0) FROM reservations r JOIN properties p ON p.id = r.property_id
                                 WHERE r.status = 'confirmed' AND r.check_in >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND r.check_in < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)" . $scope)->fetchColumn();
    $m['cancelled']  = (int)q("SELECT COUNT(*) FROM reservations r JOIN properties p ON p.id = r.property_id WHERE r.status = 'cancelled'" . $scope)->fetchColumn();
    if (is_admin($user)) {
        $m['agents'] = (int)q("SELECT COUNT(*) FROM users WHERE role = 'agent' AND active = 1")->fetchColumn();
    }
    return $m;
}

/* ───────── Ajustes del sitio (personalización) ───────── */
const RA_SETTING_KEYS = ['brand_ink', 'brand_paper', 'hero_title', 'hero_image', 'logo', 'contact_email', 'contact_phone', 'contact_whatsapp'];

function settings_all(): array
{
    $out = array_fill_keys(RA_SETTING_KEYS, '');
    foreach (q('SELECT `key`, `value` FROM settings')->fetchAll() as $row) {
        if (array_key_exists($row['key'], $out)) {
            $out[$row['key']] = $row['value'];
        }
    }
    return $out;
}

function setting_set(string $key, string $value): void
{
    if (!in_array($key, RA_SETTING_KEYS, true)) {
        return;
    }
    q('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [$key, $value]);
}
