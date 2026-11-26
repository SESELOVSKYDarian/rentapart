<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

$user = require_login('admin');
$errors = [];
$s = settings_all();

if (is_post()) {
    csrf_check();
    $new = [
        'hero_title'       => input_str('hero_title', 120),
        'brand_ink'        => strtolower(input_str('brand_ink', 7)),
        'brand_paper'      => strtolower(input_str('brand_paper', 7)),
        'contact_email'    => mb_strtolower(input_str('contact_email', 190)),
        'contact_phone'    => input_str('contact_phone', 40),
        'contact_whatsapp' => preg_replace('/\D+/', '', input_str('contact_whatsapp', 20)),
    ];
    foreach (['brand_ink', 'brand_paper'] as $k) {
        if ($new[$k] !== '' && !preg_match('/^#[0-9a-f]{6}$/', $new[$k])) {
            $errors[] = 'Los colores deben tener formato #RRGGBB.';
            break;
        }
    }
    if ($new['contact_email'] !== '' && !filter_var($new['contact_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'El correo de contacto no es válido.';
    }
    if ($new['contact_whatsapp'] !== '' && !preg_match('/^\d{8,15}$/', $new['contact_whatsapp'])) {
        $errors[] = 'El WhatsApp debe tener entre 8 y 15 dígitos, con código de país (ej. 5491155550101).';
    }

    $uploads = [];
    foreach (['logo' => ['logo', 1], 'hero_image' => ['hero', 5]] as $key => [$field, $mb]) {
        if (!empty($_POST['remove_' . $field])) {
            $uploads[$key] = '';
            continue;
        }
        if (!empty($_FILES[$field]) && ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $r = save_image($_FILES[$field], 'site', $mb);
            if ($r['ok']) {
                $uploads[$key] = $r['path'];
            } else {
                $errors[] = ($field === 'logo' ? 'Logo: ' : 'Foto de inicio: ') . $r['error'];
            }
        }
    }

    if (!$errors) {
        foreach ($uploads as $key => $path) {
            if ($s[$key] !== '' && $s[$key] !== $path) {
                delete_upload($s[$key]);
            }
            $new[$key] = $path;
        }
        foreach ($new as $key => $value) {
            setting_set($key, (string)$value);
        }
        flash('ok', 'Personalización guardada. Ya se ve en el sitio.');
        redirect('admin/settings.php');
    }
    $s = array_merge($s, $new);
}

admin_head('Personalización', 'personalizacion', $user);
page_title('Personalización', 'Logo, colores, foto de inicio, textos y datos de contacto del sitio.');
?>
<?php if ($errors): ?><ul class="errors"><?php foreach ($errors as $er): ?><li><?= e($er) ?></li><?php endforeach; ?></ul><?php endif; ?>
<form class="card" method="post" enctype="multipart/form-data" style="max-width:860px" novalidate>
  <?= csrf_field() ?>
  <h2>Identidad</h2>
  <div class="form-grid" style="margin-bottom:30px">
    <label class="field wide">Título principal del inicio <small>(si lo dejás vacío se usa el texto original)</small>
      <input name="hero_title" value="<?= e($s['hero_title']) ?>" maxlength="120" placeholder="Alquileres temporarios en los mejores destinos."></label>
    <label class="field">Color de tinta <small>(#RRGGBB)</small>
      <input name="brand_ink" value="<?= e($s['brand_ink']) ?>" maxlength="7" placeholder="#171a1b"></label>
    <label class="field">Color de fondo <small>(#RRGGBB)</small>
      <input name="brand_paper" value="<?= e($s['brand_paper']) ?>" maxlength="7" placeholder="#f5f5f4"></label>
    <div class="field">Logo <small>PNG, JPG o WebP, hasta 1 MB. Si no subís logo se usa el texto "rentapart".</small>
      <?php if ($s['logo']): ?><img src="<?= e(base_url($s['logo'])) ?>" alt="Logo actual" style="height:44px;width:auto;margin:6px 0"><label class="check"><input type="checkbox" name="remove_logo" value="1"> Quitar logo</label><?php endif; ?>
      <input type="file" name="logo" accept="image/jpeg,image/png,image/webp"></div>
    <div class="field">Foto principal del inicio <small>Hasta 5 MB.</small>
      <?php if ($s['hero_image']): ?><img src="<?= e(base_url($s['hero_image'])) ?>" alt="Foto actual" style="height:90px;width:auto;border-radius:12px;margin:6px 0"><label class="check"><input type="checkbox" name="remove_hero" value="1"> Quitar foto</label><?php endif; ?>
      <input type="file" name="hero" accept="image/jpeg,image/png,image/webp"></div>
  </div>
  <h2>Contacto</h2>
  <div class="form-grid">
    <label class="field">Correo<input type="email" name="contact_email" value="<?= e($s['contact_email']) ?>" maxlength="190" placeholder="hola@rentapart.com"></label>
    <label class="field">Teléfono<input name="contact_phone" value="<?= e($s['contact_phone']) ?>" maxlength="40"></label>
    <label class="field wide">WhatsApp <small>solo números, con código de país</small><input name="contact_whatsapp" inputmode="numeric" value="<?= e($s['contact_whatsapp']) ?>" maxlength="20" placeholder="5491155550101"></label>
  </div>
  <div class="form-actions"><button class="btn" type="submit">Guardar personalización</button></div>
</form>
<?php admin_foot();
