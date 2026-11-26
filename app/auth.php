<?php
declare(strict_types=1);

/* Autenticación y permisos. Roles: 'admin' y 'agent'. */

function current_user(): ?array
{
    static $cache = false;
    start_session();
    if (empty($_SESSION['uid'])) {
        return null;
    }
    if ($cache === false || ($cache['id'] ?? 0) !== (int)$_SESSION['uid']) {
        $st = q('SELECT id, name, email, role, active FROM users WHERE id = ?', [(int)$_SESSION['uid']]);
        $row = $st->fetch();
        $cache = $row ?: null;
    }
    if ($cache === null || !(int)$cache['active']) {
        $_SESSION = [];
        return null;
    }
    return $cache;
}

/** Exige sesión. Si $role es 'admin', solo administradores. */
function require_login(string $role = ''): array
{
    $user = current_user();
    if ($user === null) {
        redirect('admin/login.php');
    }
    if ($role === 'admin' && $user['role'] !== 'admin') {
        http_response_code(403);
        exit('No tenés permiso para ver esta página.');
    }
    return $user;
}

function is_admin(?array $user): bool
{
    return $user !== null && $user['role'] === 'admin';
}

/** @return array{ok:bool,error:string} */
function attempt_login(string $email, string $password): array
{
    $email = mb_strtolower(trim($email));
    $ip = client_ip();
    $since = date('Y-m-d H:i:s', time() - 900);
    $fails = (int)q('SELECT COUNT(*) FROM login_attempts WHERE (email = ? OR ip = ?) AND created_at >= ?', [$email, $ip, $since])->fetchColumn();
    if ($fails >= 8) {
        return ['ok' => false, 'error' => 'Demasiados intentos. Esperá unos minutos y volvé a probar.'];
    }

    $user = q('SELECT id, password_hash, active FROM users WHERE email = ?', [$email])->fetch();
    // Se verifica siempre un hash para que el tiempo de respuesta no revele si el correo existe.
    $hash = $user['password_hash'] ?? '$2y$10$usesomesillystringforsalt0000000000000000000000000000000';
    $valid = password_verify($password, $hash) && $user && (int)$user['active'] === 1;

    if (!$valid) {
        q('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', [$email, $ip]);
        return ['ok' => false, 'error' => 'Correo o contraseña incorrectos.'];
    }

    q('DELETE FROM login_attempts WHERE email = ?', [$email]);
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    }
    q('UPDATE users SET last_login_at = NOW() WHERE id = ?', [$user['id']]);
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$user['id'];
    unset($_SESSION['csrf']);
    return ['ok' => true, 'error' => ''];
}

function logout_user(): void
{
    start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'] ?? '', (bool)$p['secure'], true);
    }
    session_destroy();
}

function password_problem(string $password): ?string
{
    if (mb_strlen($password) < 10) {
        return 'La contraseña debe tener al menos 10 caracteres.';
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        return 'La contraseña debe combinar letras y números.';
    }
    return null;
}
