<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

security_headers();
header('Cache-Control: no-store');

if (current_user() !== null) {
    redirect('admin/index.php');
}

$error = '';
$email = '';
if (is_post()) {
    csrf_check();
    $email = input_str('email', 190);
    $result = attempt_login($email, (string)($_POST['password'] ?? ''));
    if ($result['ok']) {
        redirect('admin/index.php');
    }
    $error = $result['error'];
}
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Ingresar · rentapart</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= e(base_url('admin/assets/admin.css')) ?>">
</head>
<body class="login-page">
  <form class="login-card" method="post" autocomplete="on" novalidate>
    <a class="brand" href="<?= e(base_url('index.php')) ?>">rentapart</a>
    <h1>Bienvenido a tu espacio.</h1>
    <p class="lead">Ingresá para gestionar tus propiedades y reservas.</p>
    <?php if ($error !== ''): ?><div class="flash error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <?= csrf_field() ?>
    <label class="field">Correo electrónico
      <input type="email" name="email" value="<?= e($email) ?>" autocomplete="username" required autofocus>
    </label>
    <label class="field">Contraseña
      <input type="password" name="password" autocomplete="current-password" required>
    </label>
    <button class="btn" type="submit">Ingresar</button>
  </form>
</body>
</html>
