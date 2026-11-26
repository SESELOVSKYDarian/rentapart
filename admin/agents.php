<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login('admin');

if (is_post()) {
    csrf_check();
    $id = input_int('id', 1, PHP_INT_MAX, 0);
    $target = $id ? user_find($id) : null;
    if ($target === null) {
        flash('error', 'No encontramos ese usuario.');
    } elseif ((int)$target['id'] === (int)$user['id']) {
        flash('error', 'No podés desactivar tu propia cuenta.');
    } else {
        $new = $target['active'] ? 0 : 1;
        q('UPDATE users SET active = ? WHERE id = ?', [$new, $id]);
        flash('ok', $new ? 'El agente quedó activo.' : 'El agente quedó desactivado y ya no puede ingresar.');
    }
    redirect('admin/agents.php');
}

$agents = agents_all();
admin_head('Agentes', 'agentes', $user);
page_title('Agentes', 'Creá y administrá quién puede cargar propiedades y gestionar reservas.',
    '<a class="btn" href="' . e(base_url('admin/agent.php')) . '">Nuevo agente</a>');
?>
<section class="card">
  <div class="table-wrap"><table>
    <thead><tr><th>Agente</th><th>Rol</th><th class="num">Propiedades</th><th>Último ingreso</th><th>Estado</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($agents as $a): ?>
      <tr>
        <td><?= e($a['name']) ?><small><?= e($a['email']) ?></small></td>
        <td><?= $a['role'] === 'admin' ? 'Administrador' : 'Agente' ?></td>
        <td class="num"><?= (int)$a['properties'] ?></td>
        <td><?= $a['last_login_at'] ? e(date_label(substr($a['last_login_at'], 0, 10))) : '<small style="margin:0">Nunca</small>' ?></td>
        <td><?= $a['active'] ? '<span class="badge ok">Activo</span>' : '<span class="badge off">Inactivo</span>' ?></td>
        <td class="num"><div class="actions" style="justify-content:flex-end">
          <a class="btn line small" href="<?= e(base_url('admin/agent.php?id=' . (int)$a['id'])) ?>">Editar</a>
          <?php if ((int)$a['id'] !== (int)$user['id']): ?>
            <form method="post" data-confirm="<?= $a['active'] ? '¿Desactivar a este agente? No podrá ingresar.' : '¿Activar a este agente?' ?>"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$a['id'] ?>"><button class="btn <?= $a['active'] ? 'danger' : '' ?> small" type="submit"><?= $a['active'] ? 'Desactivar' : 'Activar' ?></button></form>
          <?php endif; ?>
        </div></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
</section>
<?php admin_foot();
