<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login('admin');
$id = isset($_GET['id']) ? max(0, (int)$_GET['id']) : 0;
$agent = null;
if ($id > 0) {
    $agent = user_find($id);
    if ($agent === null) {
        http_response_code(404);
        exit('Agente no encontrado.');
    }
}

$errors = [];
$form = ['name' => $agent['name'] ?? '', 'email' => $agent['email'] ?? ''];

if (is_post()) {
    csrf_check();
    $form['name'] = input_str('name', 120);
    $form['email'] = mb_strtolower(input_str('email', 190));
    $password = (string)($_POST['password'] ?? '');

    if (mb_strlen($form['name']) < 3) {
        $errors[] = 'Escribí el nombre completo.';
    }
    if (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'El correo electrónico no es válido.';
    } elseif (user_email_taken($form['email'], $agent ? (int)$agent['id'] : 0)) {
        $errors[] = 'Ya existe un usuario con ese correo.';
    }
    if ($agent === null || $password !== '') {
        if ($problem = password_problem($password)) {
            $errors[] = $problem;
        }
    }

    if (!$errors) {
        if ($agent === null) {
            q("INSERT INTO users (name, email, password_hash, role, active) VALUES (?,?,?,'agent',1)", [$form['name'], $form['email'], password_hash($password, PASSWORD_DEFAULT)]);
            flash('ok', 'Agente creado. Compartile el correo y la contraseña de forma segura.');
        } else {
            q('UPDATE users SET name = ?, email = ? WHERE id = ?', [$form['name'], $form['email'], $agent['id']]);
            if ($password !== '') {
                q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $agent['id']]);
            }
            flash('ok', 'Cambios guardados.');
        }
        redirect('admin/agents.php');
    }
}

admin_head($agent ? 'Editar agente' : 'Nuevo agente', 'agentes', $user);
page_title($agent ? $agent['name'] : 'Nuevo agente', '', '<a class="btn line" href="' . e(base_url('admin/agents.php')) . '">Volver</a>');
?>
<?php if ($errors): ?><ul class="errors"><?php foreach ($errors as $er): ?><li><?= e($er) ?></li><?php endforeach; ?></ul><?php endif; ?>
<form class="card" method="post" style="max-width:640px" autocomplete="off" novalidate>
  <?= csrf_field() ?>
  <div class="form-grid">
    <label class="field wide">Nombre y apellido<input name="name" value="<?= e($form['name']) ?>" maxlength="120" required></label>
    <label class="field wide">Correo electrónico<input type="email" name="email" value="<?= e($form['email']) ?>" maxlength="190" required></label>
    <label class="field wide"><?= $agent ? 'Nueva contraseña <small>(dejá vacío para no cambiarla)</small>' : 'Contraseña <small>(mínimo 10 caracteres, con letras y números)</small>' ?>
      <input type="password" name="password" autocomplete="new-password"<?= $agent ? '' : ' required' ?>></label>
  </div>
  <div class="form-actions"><button class="btn" type="submit"><?= $agent ? 'Guardar cambios' : 'Crear agente' ?></button></div>
</form>
<?php admin_foot();
