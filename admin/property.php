<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login();
$id = isset($_GET['id']) ? max(0, (int)$_GET['id']) : 0;
$prop = null;
if ($id > 0) {
    $prop = property_for($user, $id);
    if ($prop === null) {
        http_response_code(404);
        exit('Propiedad no encontrada.');
    }
}

$errors = [];
$data = $prop ?: ['name' => '', 'district' => '', 'city' => 'Buenos Aires', 'type' => 'Departamento', 'description' => '', 'price_night' => '', 'cleaning_fee' => '0',
                  'max_guests' => 2, 'bedrooms' => 1, 'bathrooms' => 1, 'amenities' => '', 'tag' => '', 'published' => 0];

if (is_post()) {
    csrf_check();
    $action = $_POST['action'] ?? 'save';

    if ($prop !== null && in_array($action, ['photo_add', 'photo_delete', 'photo_up'], true)) {
        if ($action === 'photo_add') {
            $added = 0;
            foreach (files_list('photos') as $file) {
                $r = save_image($file, 'properties/' . $prop['id']);
                if ($r['ok']) {
                    $next = (int)q('SELECT COALESCE(MAX(sort_order),0)+1 FROM property_photos WHERE property_id = ?', [$prop['id']])->fetchColumn();
                    q('INSERT INTO property_photos (property_id, path, sort_order) VALUES (?,?,?)', [$prop['id'], $r['path'], $next]);
                    $added++;
                } elseif ($r['error'] !== '') {
                    flash('error', $r['error']);
                }
            }
            if ($added) {
                flash('ok', $added === 1 ? 'Foto agregada.' : $added . ' fotos agregadas.');
            }
        } else {
            $photoId = input_int('photo_id', 1, PHP_INT_MAX, 0);
            $photo = q('SELECT id, path, sort_order FROM property_photos WHERE id = ? AND property_id = ?', [$photoId, $prop['id']])->fetch();
            if ($photo && $action === 'photo_delete') {
                q('DELETE FROM property_photos WHERE id = ?', [$photo['id']]);
                delete_upload($photo['path']);
                flash('ok', 'Foto eliminada.');
            } elseif ($photo && $action === 'photo_up') {
                // "Portada": la foto pasa a ser la primera.
                $first = (int)q('SELECT COALESCE(MIN(sort_order),0)-1 FROM property_photos WHERE property_id = ?', [$prop['id']])->fetchColumn();
                q('UPDATE property_photos SET sort_order = ? WHERE id = ?', [$first, $photo['id']]);
                flash('ok', 'Foto elegida como portada.');
            }
        }
        redirect('admin/property.php?id=' . (int)$prop['id']);
    }

    [$data, $errors] = property_input();
    if (!$errors) {
        $newId = property_save($prop ? (int)$prop['id'] : null, (int)($prop['agent_id'] ?? $user['id']), $data);
        flash('ok', $prop ? 'Cambios guardados.' : 'Propiedad creada. Ahora podés subir las fotos.');
        redirect('admin/property.php?id=' . $newId);
    }
}

$photos = $prop ? photos_of((int)$prop['id']) : [];
admin_head($prop ? 'Editar propiedad' : 'Nueva propiedad', 'propiedades', $user);
page_title($prop ? $prop['name'] : 'Nueva propiedad', $prop ? 'Editá los datos, el precio y las fotos.' : 'Completá los datos básicos; las fotos se suben después de guardar.',
    '<a class="btn line" href="' . e(base_url('admin/properties.php')) . '">Volver</a>');
?>
<?php if ($errors): ?>
  <ul class="errors"><?php foreach ($errors as $er): ?><li><?= e($er) ?></li><?php endforeach; ?></ul>
<?php endif; ?>

<div class="split">
  <form class="card" method="post" novalidate>
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save">
    <h2>Datos de la propiedad</h2>
    <div class="form-grid">
      <label class="field wide">Nombre
        <input name="name" value="<?= e($data['name']) ?>" maxlength="140" required></label>
      <label class="field">Barrio o zona
        <input name="district" value="<?= e($data['district']) ?>" maxlength="80" required></label>
      <label class="field">Ciudad
        <input name="city" value="<?= e($data['city']) ?>" maxlength="80"></label>
      <label class="field">Tipo
        <select name="type"><?php foreach (RA_TYPES as $t): ?><option<?= $data['type'] === $t ? ' selected' : '' ?>><?= e($t) ?></option><?php endforeach; ?></select></label>
      <label class="field">Etiqueta <small>(opcional, ej. "Favorito")</small>
        <input name="tag" value="<?= e($data['tag']) ?>" maxlength="40"></label>
      <label class="field">Precio por noche (USD)
        <input name="price_night" inputmode="decimal" value="<?= e($data['price_night']) ?>" required></label>
      <label class="field">Limpieza (USD)
        <input name="cleaning_fee" inputmode="decimal" value="<?= e($data['cleaning_fee']) ?>"></label>
      <label class="field">Huéspedes (máximo)
        <input name="max_guests" type="number" min="1" max="30" value="<?= (int)$data['max_guests'] ?>"></label>
      <label class="field">Dormitorios
        <input name="bedrooms" type="number" min="0" max="20" value="<?= (int)$data['bedrooms'] ?>"></label>
      <label class="field">Baños
        <input name="bathrooms" type="number" min="1" max="20" value="<?= (int)$data['bathrooms'] ?>"></label>
      <label class="field">Comodidades <small>(separadas por coma)</small>
        <input name="amenities" value="<?= e($data['amenities']) ?>" maxlength="500" placeholder="Wi-Fi, Cocina equipada, Aire acondicionado"></label>
      <label class="field wide">Descripción
        <textarea name="description" maxlength="4000"><?= e($data['description']) ?></textarea></label>
      <label class="check wide"><input type="checkbox" name="published" value="1"<?= !empty($data['published']) ? ' checked' : '' ?>> Publicada en el sitio</label>
    </div>
    <div class="form-actions"><button class="btn" type="submit">Guardar cambios</button></div>
  </form>

  <div class="stack">
    <?php if ($prop): ?>
      <section class="card">
        <h2>Fotos</h2>
        <?php if ($photos): ?>
          <div class="photos">
            <?php foreach ($photos as $i => $ph): ?>
              <div class="photo">
                <img src="<?= e(base_url($ph['path'])) ?>" alt="Foto <?= $i + 1 ?> de <?= e($prop['name']) ?>" loading="lazy">
                <?php if ($i === 0): ?><span class="tag">Portada</span><?php endif; ?>
                <div class="bar">
                  <?php if ($i > 0): ?>
                    <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="photo_up"><input type="hidden" name="photo_id" value="<?= (int)$ph['id'] ?>"><button type="submit">Portada</button></form>
                  <?php else: ?><span></span><?php endif; ?>
                  <form method="post" data-confirm="¿Eliminar esta foto?"><?= csrf_field() ?><input type="hidden" name="action" value="photo_delete"><input type="hidden" name="photo_id" value="<?= (int)$ph['id'] ?>"><button type="submit">Eliminar</button></form>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php else: ?>
          <p class="empty">Todavía no hay fotos.</p>
        <?php endif; ?>
        <form method="post" enctype="multipart/form-data" style="margin-top:20px">
          <?= csrf_field() ?><input type="hidden" name="action" value="photo_add">
          <label class="field">Subir fotos <small>JPG, PNG o WebP, hasta <?= (int)cfg('app.max_upload_mb', 5) ?> MB cada una</small>
            <input type="file" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple data-preview="#preview"></label>
          <div id="preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <div class="form-actions"><button class="btn line" type="submit">Subir</button></div>
        </form>
      </section>
      <section class="card">
        <h2>Disponibilidad</h2>
        <p class="lead" style="margin-bottom:16px">Bloqueá fechas y mirá las reservas en el calendario.</p>
        <a class="btn line" href="<?= e(base_url('admin/calendar.php?property=' . (int)$prop['id'])) ?>">Abrir calendario</a>
      </section>
    <?php endif; ?>
  </div>
</div>
<?php admin_foot();
