<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();
$errors = [];

if (is_post()) {
    csrf_check();
    $current = (string)($_POST['current'] ?? '');
    $new = (string)($_POST['new'] ?? '');
    $confirm = (string)($_POST['confirm'] ?? '');
    $hash = (string)q('SELECT password_hash FROM users WHERE id = ?', [$user['id']])->fetchColumn();

    if (!password_verify($current, $hash)) {
        $errors[] = 'La contraseña actual no es correcta.';
    }
    if ($new !== $confirm) {
        $errors[] = 'Las contraseñas nuevas no coinciden.';
    }
    if ($problem = password_problem($new)) {
        $errors[] = $problem;
    }
    if (!$errors) {
        q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), $user['id']]);
        session_regenerate_id(true);
        flash('ok', 'Contraseña actualizada.');
        redirect('admin/account.php');
    }
}

admin_head('Mi cuenta', 'cuenta', $user);
page_title('Mi cuenta', 'Tus datos de acceso.');
?>
<?php if ($errors): ?><ul class="errors"><?php foreach ($errors as $er): ?><li><?= e($er) ?></li><?php endforeach; ?></ul><?php endif; ?>
<div class="stack" style="max-width:640px">
  <section class="card">
    <h2>Datos</h2>
    <p><strong><?= e($user['name']) ?></strong></p>
    <p class="lead"><?= e($user['email']) ?> · <?= is_admin($user) ? 'Administrador' : 'Agente' ?></p>
  </section>
  <form class="card" method="post" autocomplete="off" novalidate>
    <?= csrf_field() ?>
    <h2>Cambiar contraseña</h2>
    <div class="stack">
      <label class="field">Contraseña actual<input type="password" name="current" autocomplete="current-password" required></label>
      <label class="field">Contraseña nueva <small>(mínimo 10 caracteres, con letras y números)</small><input type="password" name="new" autocomplete="new-password" required></label>
      <label class="field">Repetí la contraseña nueva<input type="password" name="confirm" autocomplete="new-password" required></label>
    </div>
    <div class="form-actions"><button class="btn" type="submit">Actualizar contraseña</button></div>
  </form>
</div>
<?php admin_foot();
