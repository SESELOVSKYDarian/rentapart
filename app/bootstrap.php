<?php
declare(strict_types=1);

/**
 * Arranque común de todo el backend PHP (admin y api).
 * Carga configuración, base de datos, sesión segura y utilidades.
 */

define('RA_ROOT', dirname(__DIR__));

$__configFile = RA_ROOT . '/config/config.php';
if (!is_file($__configFile)) {
    http_response_code(503);
    exit('Falta config/config.php. Copiá config/config.example.php y completá los datos.');
}
$GLOBALS['RA_CONFIG'] = require $__configFile;
unset($__configFile);

date_default_timezone_set(cfg('app.timezone', 'UTC'));
mb_internal_encoding('UTF-8');

if (cfg('app.debug', false)) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
}

/* ───────── Configuración ───────── */
function cfg(string $path, $default = null)
{
    $node = $GLOBALS['RA_CONFIG'] ?? [];
    foreach (explode('.', $path) as $part) {
        if (!is_array($node) || !array_key_exists($part, $node)) {
            return $default;
        }
        $node = $node[$part];
    }
    return $node;
}

/* ───────── Base de datos ───────── */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = cfg('db');
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $c['host'], $c['port'], $c['name'], $c['charset'] ?? 'utf8mb4');
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("SET time_zone = '" . date('P') . "'");
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

/* ───────── Salida segura y utilidades ───────── */
function e($value): string
{
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function base_url(string $path = ''): string
{
    return rtrim((string)cfg('app.base_url', ''), '/') . '/' . ltrim($path, '/');
}

function redirect(string $path): never
{
    header('Location: ' . (preg_match('#^https?://#', $path) ? $path : base_url($path)));
    exit;
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function money($amount): string
{
    return 'USD ' . number_format((float)$amount, 0, ',', '.');
}

function valid_date(string $value): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $value);
    return $d !== false && $d->format('Y-m-d') === $value;
}

function today(): string
{
    return date('Y-m-d');
}

function date_label(string $value): string
{
    static $months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $t = strtotime($value);
    return $t ? (int)date('j', $t) . ' ' . $months[(int)date('n', $t) - 1] . ' ' . date('Y', $t) : $value;
}

function input_str(string $key, int $max = 255, ?array $source = null): string
{
    $source = $source ?? $_POST;
    $v = $source[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    return mb_substr(trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $v)), 0, $max);
}

function input_int(string $key, int $min, int $max, int $default = 0, ?array $source = null): int
{
    $source = $source ?? $_POST;
    $v = $source[$key] ?? null;
    if (!is_scalar($v) || !preg_match('/^-?\d+$/', trim((string)$v))) {
        return $default;
    }
    return max($min, min($max, (int)$v));
}

function input_money(string $key, float $max = 100000000.0, ?array $source = null): float
{
    $source = $source ?? $_POST;
    $v = str_replace(',', '.', trim((string)($source[$key] ?? '0')));
    if (!is_numeric($v)) {
        return 0.0;
    }
    return round(max(0.0, min($max, (float)$v)), 2);
}

function random_code(int $len = 10): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $out = '';
    for ($i = 0; $i < $len; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* ───────── Sesión, CSRF y mensajes ───────── */
function security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('rentapart_sid');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => (bool)cfg('app.https', false),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    start_session();
    $sent = (string)($_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    if ($sent === '' || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) {
        http_response_code(419);
        exit('La sesión venció. Volvé atrás, recargá la página y probá de nuevo.');
    }
}

function flash(?string $type = null, ?string $message = null): ?array
{
    start_session();
    if ($type !== null && $message !== null) {
        $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
        return null;
    }
    $all = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $all;
}

/* ───────── Límite de intentos (por IP y bucket) ───────── */
function rate_limited(string $bucket, int $max, int $windowSeconds): bool
{
    $since = date('Y-m-d H:i:s', time() - $windowSeconds);
    $n = (int)q('SELECT COUNT(*) FROM rate_limits WHERE bucket = ? AND ip = ? AND created_at >= ?', [$bucket, client_ip(), $since])->fetchColumn();
    return $n >= $max;
}

function rate_hit(string $bucket): void
{
    q('INSERT INTO rate_limits (bucket, ip) VALUES (?, ?)', [$bucket, client_ip()]);
    if (random_int(1, 50) === 1) {
        q('DELETE FROM rate_limits WHERE created_at < ?', [date('Y-m-d H:i:s', time() - 86400)]);
    }
}

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/models.php';
require_once __DIR__ . '/upload.php';
require_once __DIR__ . '/layout.php';
