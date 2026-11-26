<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();
$props = properties_for($user);
$pid = isset($_GET['property']) ? (int)$_GET['property'] : (int)($props[0]['id'] ?? 0);
$prop = $pid > 0 ? property_for($user, $pid) : null;

if ($pid > 0 && $prop === null) {
    http_response_code(404);
    exit('Propiedad no encontrada.');
}

// Bloquear / desbloquear fechas.
if (is_post() && $prop !== null) {
    csrf_check();
    $action = $_POST['action'] ?? '';
    if ($action === 'block') {
        $start = input_str('start', 10);
        $end = input_str('end', 10);
        if (!valid_date($start) || !valid_date($end) || $end <= $start) {
            flash('error', 'Elegí una fecha de inicio y una de fin posterior.');
        } elseif ($end < today()) {
            flash('error', 'No se pueden bloquear fechas pasadas.');
        } else {
            $busy = (int)q("SELECT COUNT(*) FROM reservations WHERE property_id = ? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ?", [$prop['id'], $end, $start])->fetchColumn();
            if ($busy > 0) {
                flash('error', 'Hay reservas en ese rango. Cancelalas primero para poder bloquearlo.');
            } else {
                q('INSERT INTO availability_blocks (property_id, start_date, end_date, reason) VALUES (?,?,?,?)', [$prop['id'], $start, $end, input_str('reason', 160)]);
                flash('ok', 'Fechas bloqueadas.');
            }
        }
    } elseif ($action === 'unblock') {
        q('DELETE FROM availability_blocks WHERE id = ? AND property_id = ?', [input_int('block_id', 1, PHP_INT_MAX, 0), $prop['id']]);
        flash('ok', 'Bloqueo eliminado.');
    }
    redirect('admin/calendar.php?property=' . (int)$prop['id'] . '&month=' . urlencode(input_str('month', 7, $_POST)));
}

$monthParam = (string)($_GET['month'] ?? date('Y-m'));
if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $monthParam)) {
    $monthParam = date('Y-m');
}
$first = $monthParam . '-01';
$ts = strtotime($first);
$daysInMonth = (int)date('t', $ts);
$lead = ((int)date('N', $ts)) - 1; // lunes = 0
$next = date('Y-m-d', strtotime('+1 month', $ts));
$occ = $prop ? month_occupancy((int)$prop['id'], $first, $next) : [];
$blocks = $prop ? blocks_of((int)$prop['id']) : [];
$prevMonth = date('Y-m', strtotime('-1 month', $ts));
$nextMonth = date('Y-m', strtotime('+1 month', $ts));
$months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
$monthName = $months[(int)date('n', $ts) - 1] . ' ' . date('Y', $ts);
$labels = ['blocked' => 'Bloqueado', 'confirmed' => 'Reservado', 'pending' => 'Pendiente'];

admin_head('Calendario', 'calendario', $user);
page_title('Calendario', 'Reservas y fechas bloqueadas de cada propiedad.');
?>
<?php if (!$props): ?>
  <div class="card"><p class="empty">Primero cargá una propiedad para ver su calendario.</p></div>
<?php else: ?>
  <div class="filters" aria-label="Elegir propiedad">
    <?php foreach ($props as $p): ?>
      <a href="<?= e(base_url('admin/calendar.php?property=' . (int)$p['id'] . '&month=' . $monthParam)) ?>"<?= (int)$p['id'] === $pid ? ' class="on"' : '' ?>><?= e($p['name']) ?></a>
    <?php endforeach; ?>
  </div>

  <?php if ($prop): ?>
  <div class="split">
    <section class="card">
      <div class="cal-head">
        <a class="btn line small" href="?property=<?= $pid ?>&month=<?= e($prevMonth) ?>" aria-label="Mes anterior">←</a>
        <h2><?= e($monthName) ?></h2>
        <a class="btn line small" href="?property=<?= $pid ?>&month=<?= e($nextMonth) ?>" aria-label="Mes siguiente">→</a>
      </div>
      <div class="cal">
        <?php foreach (['L', 'M', 'M', 'J', 'V', 'S', 'D'] as $d): ?><span class="dow"><?= $d ?></span><?php endforeach; ?>
        <?php for ($i = 0; $i < $lead; $i++): ?><span class="day out"></span><?php endfor; ?>
        <?php for ($d = 1; $d <= $daysInMonth; $d++):
            $date = sprintf('%s-%02d', $monthParam, $d);
            $state = $occ[$date] ?? '';
            $cls = trim(($state ?: '') . ($date < today() ? ' past' : '')); ?>
          <span class="day <?= e($cls) ?>"><span><?= $d ?></span><?= $state ? '<small>' . e($labels[$state]) . '</small>' : '' ?></span>
        <?php endfor; ?>
      </div>
      <p class="legend">
        <span><i style="background:var(--ok-bg)"></i>Reservado</span>
        <span><i style="background:var(--warn-bg)"></i>Pendiente</span>
        <span><i style="background:#1d2224"></i>Bloqueado</span>
      </p>
    </section>

    <div class="stack">
      <form class="card" method="post">
        <?= csrf_field() ?><input type="hidden" name="action" value="block"><input type="hidden" name="month" value="<?= e($monthParam) ?>">
        <h2>Bloquear fechas</h2>
        <div class="stack">
          <label class="field">Desde<input type="date" name="start" min="<?= e(today()) ?>" required></label>
          <label class="field">Hasta <small>(día de salida)</small><input type="date" name="end" min="<?= e(today()) ?>" required></label>
          <label class="field">Motivo <small>(opcional)</small><input name="reason" maxlength="160" placeholder="Mantenimiento, uso propio…"></label>
        </div>
        <div class="form-actions"><button class="btn" type="submit">Bloquear</button></div>
      </form>

      <section class="card">
        <h2>Bloqueos activos</h2>
        <?php if (!$blocks): ?><p class="empty" style="padding:14px 0">No hay fechas bloqueadas.</p><?php endif; ?>
        <?php foreach ($blocks as $b): ?>
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--soft)">
            <div><?= e(date_label($b['start_date'])) ?> a <?= e(date_label($b['end_date'])) ?><?= $b['reason'] !== '' ? '<small style="display:block;color:var(--muted)">' . e($b['reason']) . '</small>' : '' ?></div>
            <form method="post" data-confirm="¿Quitar este bloqueo?"><?= csrf_field() ?><input type="hidden" name="action" value="unblock"><input type="hidden" name="block_id" value="<?= (int)$b['id'] ?>"><input type="hidden" name="month" value="<?= e($monthParam) ?>"><button class="btn line small" type="submit">Quitar</button></form>
          </div>
        <?php endforeach; ?>
      </section>
    </div>
  </div>
  <?php endif; ?>
<?php endif; ?>
<?php admin_foot();
