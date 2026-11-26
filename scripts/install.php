<?php
declare(strict_types=1);

/**
 * Instalador por línea de comandos.
 *   php scripts/install.php            crea las tablas y el administrador (si no existe)
 *   php scripts/install.php --demo     además carga un agente y 3 propiedades de ejemplo
 *
 * Requiere config/config.php y que la base de datos (vacía) ya exista.
 * Las contraseñas generadas se guardan en storage/credenciales.txt (no se sube a git).
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../app/bootstrap.php';

$demo = in_array('--demo', $argv ?? [], true);

// 1) Tablas
$sql = file_get_contents(RA_ROOT . '/database/schema.sql');
foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
    if ($statement === 'SET NAMES utf8mb4') {
        continue;
    }
    db()->exec($statement);
}
echo "Tablas listas.\n";

$credentials = [];
$strong = static function (): string {
    $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $out = '';
    for ($i = 0; $i < 16; $i++) {
        $out .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $out . random_int(10, 99);
};

// 2) Administrador
$hasAdmin = (int)q("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() > 0;
if (!$hasAdmin) {
    $pass = $strong();
    q("INSERT INTO users (name, email, password_hash, role, active) VALUES (?,?,?,'admin',1)", ['Administración', 'admin@rentapart.local', password_hash($pass, PASSWORD_DEFAULT)]);
    $credentials[] = "Administrador: admin@rentapart.local / $pass";
    echo "Administrador creado.\n";
} else {
    echo "Ya existe un administrador, no se crea otro.\n";
}

// 3) Datos de ejemplo
if ($demo && (int)q('SELECT COUNT(*) FROM properties')->fetchColumn() === 0) {
    $pass = $strong();
    q("INSERT INTO users (name, email, password_hash, role, active) VALUES (?,?,?,'agent',1)", ['Marina Costa', 'marina@rentapart.local', password_hash($pass, PASSWORD_DEFAULT)]);
    $agentId = (int)db()->lastInsertId();
    $credentials[] = "Agente de ejemplo: marina@rentapart.local / $pass";

    $samples = [
        ['Palermo botánico', 'Palermo',  85,  'Favorito', 'fdfa7.webp', 'Luz natural, balcón al jardín y a cinco cuadras del Botánico.'],
        ['Recoleta luz',     'Recoleta', 110, 'Nuevo',    '29605.webp', 'Departamento clásico con ventanales y mucha luz, en el corazón de Recoleta.'],
        ['Núñez calma',      'Núñez',    72,  'Disponible', '12205.webp', 'Un lugar tranquilo para descansar, cerca de parques y transporte.'],
    ];
    foreach ($samples as [$name, $district, $price, $tag, $photo, $desc]) {
        q('INSERT INTO properties (agent_id, name, district, city, type, description, price_night, cleaning_fee, max_guests, bedrooms, bathrooms, amenities, tag, published)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)', [$agentId, $name, $district, 'Buenos Aires', 'Departamento', $desc, $price, 20, 2, 1, 1, 'Wi-Fi, Cocina equipada, Aire acondicionado, Ropa de cama', $tag]);
        $pid = (int)db()->lastInsertId();
        $dir = RA_ROOT . '/uploads/properties/' . $pid;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $target = bin2hex(random_bytes(12)) . '.webp';
        if (is_file(RA_ROOT . '/assets/' . $photo) && copy(RA_ROOT . '/assets/' . $photo, $dir . '/' . $target)) {
            q('INSERT INTO property_photos (property_id, path, sort_order) VALUES (?,?,1)', [$pid, 'uploads/properties/' . $pid . '/' . $target]);
        }
    }
    echo "Datos de ejemplo cargados.\n";
}

if ($credentials) {
    $dir = RA_ROOT . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    $file = $dir . '/credenciales.txt';
    file_put_contents($file, implode("\n", $credentials) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($file, 0600);
    echo "Las contraseñas generadas quedaron en storage/credenciales.txt (cambialas desde 'Mi cuenta').\n";
}
