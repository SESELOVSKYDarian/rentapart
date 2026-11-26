<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();

if (is_post()) {
    csrf_check();
    $rid = input_int('id', 1, PHP_INT_MAX, 0);
    $action = $_POST['action'] ?? '';
    $res = $rid ? reservation_for($user, $rid) : null; // un agente solo puede tocar reservas de sus propiedades
    if ($res === null) {
        flash('error', 'No encontramos esa reserva.');
    } elseif (!in_array($action, ['confirm', 'cancel'], true)) {
        flash('error', 'Acción inválida.');
    } else {
        $err = reservation_set_status($rid, $action === 'confirm' ? 'confirmed' : 'cancelled');
        if ($err) {
            flash('error', $err);
        } else {
            flash('ok', $action === 'confirm' ? 'Reserva confirmada.' : 'Reserva cancelada. Las fechas quedaron libres.');
        }
    }
    redirect('admin/reservations.php' . (!empty($_POST['back']) ? '?status=' . urlencode(input_str('back', 12)) : ''));
}

$status = (string)($_GET['status'] ?? '');
if (!in_array($status, ['pending', 'confirmed', 'cancelled'], true)) {
    $status = '';
}
$list = reservations_for($user, $status);
$tabs = ['' => 'Todas', 'pending' => 'Pendientes', 'confirmed' => 'Confirmadas', 'cancelled' => 'Canceladas'];

admin_head('Reservas', 'reservas', $user);
page_title('Reservas', 'Confirmá o cancelá las solicitudes de tus huéspedes.');
?>
<div class="filters">
  <?php foreach ($tabs as $key => $label): ?>
    <a href="<?= e(base_url('admin/reservations.php' . ($key ? '?status=' . $key : ''))) ?>"<?= $status === $key ? ' class="on"' : '' ?>><?= e($label) ?></a>
  <?php endforeach; ?>
</div>
<section class="card">
  <?php if (!$list): ?>
    <p class="empty">No hay reservas para mostrar.</p>
  <?php else: ?>
  <div class="table-wrap"><table>
    <thead><tr><th>Código</th><th>Huésped</th><th>Propiedad</th><th>Fechas</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($list as $r): ?>
      <tr>
        <td><strong><?= e($r['code']) ?></strong><small><?= e(date_label(substr($r['created_at'], 0, 10))) ?></small></td>
        <td><?= e($r['guest_name']) ?><small><?= e($r['guest_email']) ?><br><?= e($r['guest_phone']) ?></small></td>
        <td><?= e($r['property_name']) ?><?= is_admin($user) ? '<small>' . e($r['agent_name']) . '</small>' : '' ?></td>
        <td><?= e(date_label($r['check_in'])) ?> a <?= e(date_label($r['check_out'])) ?><small><?= (int)$r['nights'] ?> noches, <?= (int)$r['guests'] ?> huéspedes</small></td>
        <td class="num"><?= e(money($r['total'])) ?></td>
        <td><?= status_badge($r['status']) ?></td>
        <td class="num"><div class="actions" style="justify-content:flex-end">
          <?php if ($r['status'] !== 'confirmed'): ?>
            <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="confirm"><input type="hidden" name="back" value="<?= e($status) ?>"><button class="btn small" type="submit"><?= $r['status'] === 'cancelled' ? 'Reactivar' : 'Confirmar' ?></button></form>
          <?php endif; ?>
          <?php if ($r['status'] !== 'cancelled'): ?>
            <form method="post" data-confirm="¿Cancelar esta reserva? Las fechas quedarán libres."><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="cancel"><input type="hidden" name="back" value="<?= e($status) ?>"><button class="btn danger small" type="submit">Cancelar</button></form>
          <?php endif; ?>
        </div></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
  <?php endif; ?>
</section>
<?php admin_foot();
