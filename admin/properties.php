<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();

// Publicar / despublicar rápido desde el listado.
if (is_post()) {
    csrf_check();
    $id = input_int('id', 1, PHP_INT_MAX, 0);
    $p = $id ? property_for($user, $id) : null;
    if ($p === null) {
        flash('error', 'No encontramos esa propiedad.');
    } elseif (($_POST['action'] ?? '') === 'toggle') {
        q('UPDATE properties SET published = 1 - published WHERE id = ?', [$id]);
        flash('ok', $p['published'] ? 'La propiedad quedó como borrador.' : 'La propiedad ya está publicada.');
    }
    redirect('admin/properties.php');
}

$list = properties_for($user);
admin_head('Propiedades', 'propiedades', $user);
page_title('Propiedades', is_admin($user) ? 'Todas las propiedades de la plataforma.' : 'Solo vos podés administrar estos departamentos.',
    '<a class="btn" href="' . e(base_url('admin/property.php')) . '">Nueva propiedad</a>');
?>
<?php if (!$list): ?>
  <div class="card"><p class="empty">Todavía no cargaste propiedades. Creá la primera con el botón de arriba.</p></div>
<?php else: ?>
<div class="cards">
  <?php foreach ($list as $p): ?>
    <article class="prop">
      <?php if ($p['cover']): ?>
        <div class="cover" style="background-image:url('<?= e(base_url($p['cover'])) ?>')" role="img" aria-label="<?= e($p['name']) ?>"></div>
      <?php else: ?>
        <div class="cover">Sin fotos</div>
      <?php endif; ?>
      <div class="body">
        <span><?= $p['published'] ? '<span class="badge ok">Publicada</span>' : '<span class="badge off">Borrador</span>' ?></span>
        <h3><?= e($p['name']) ?></h3>
        <p class="meta"><?= e($p['district']) ?>, <?= e($p['city']) ?> · <?= e($p['type']) ?><?= is_admin($user) ? ' · ' . e($p['agent_name']) : '' ?></p>
        <div class="foot">
          <strong><?= e(money($p['price_night'])) ?> <small style="font-weight:400;color:var(--muted)">por noche</small></strong>
          <div class="actions">
            <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="action" value="toggle">
              <button class="btn line small" type="submit"><?= $p['published'] ? 'Despublicar' : 'Publicar' ?></button></form>
            <a class="btn small" href="<?= e(base_url('admin/property.php?id=' . (int)$p['id'])) ?>">Editar</a>
          </div>
        </div>
      </div>
    </article>
  <?php endforeach; ?>
</div>
<?php endif; ?>
<?php admin_foot();
