<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();
$m = metrics_for($user);
$pending = reservations_for($user, 'pending', 0, 6);
$first = explode(' ', trim($user['name']))[0];

admin_head('Resumen', 'resumen', $user);
page_title('Hola, ' . $first . '.', is_admin($user)
    ? 'Una mirada general de toda la plataforma.'
    : 'Todo lo importante de tus propiedades, en un solo lugar.');
?>
<section class="stats" aria-label="Indicadores">
  <div class="stat"><span>Propiedades publicadas</span><strong><?= $m['published'] ?></strong><small>de <?= $m['properties'] ?> en total</small></div>
  <div class="stat"><span>Solicitudes pendientes</span><strong><?= $m['pending'] ?></strong><small><?= $m['pending'] === 1 ? 'Espera tu respuesta' : 'Esperan tu respuesta' ?></small></div>
  <div class="stat"><span>Próximas estadías</span><strong><?= $m['upcoming'] ?></strong><small>Reservas confirmadas</small></div>
  <div class="stat"><span>Ingresos del mes</span><strong><?= e(money($m['revenue'])) ?></strong><small>Reservas confirmadas</small></div>
  <?php if (is_admin($user)): ?>
    <div class="stat"><span>Agentes activos</span><strong><?= $m['agents'] ?></strong><small><?= $m['cancelled'] ?> reservas canceladas</small></div>
  <?php endif; ?>
</section>

<section class="card">
  <h2>Solicitudes por revisar</h2>
  <?php if (!$pending): ?>
    <p class="empty">No hay solicitudes pendientes.</p>
  <?php else: ?>
    <div class="table-wrap"><table>
      <thead><tr><th>Huésped</th><th>Propiedad</th><th>Fechas</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($pending as $r): ?>
        <tr>
          <td><?= e($r['guest_name']) ?><small><?= e($r['guest_email']) ?></small></td>
          <td><?= e($r['property_name']) ?></td>
          <td><?= e(date_label($r['check_in'])) ?> a <?= e(date_label($r['check_out'])) ?><small><?= (int)$r['nights'] ?> noches · <?= (int)$r['guests'] ?> huéspedes</small></td>
          <td class="num"><?= e(money($r['total'])) ?></td>
          <td class="num"><a class="btn line small" href="<?= e(base_url('admin/reservations.php?status=pending')) ?>">Gestionar</a></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
  <?php endif; ?>
</section>
<?php admin_foot();
