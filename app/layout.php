<?php
declare(strict_types=1);

/* Plantilla común de los paneles (agente y administración). */

function admin_nav(array $user): array
{
    $items = [
        ['index.php',        'Resumen',        'resumen'],
        ['properties.php',   'Propiedades',    'propiedades'],
        ['reservations.php', 'Reservas',       'reservas'],
        ['calendar.php',     'Calendario',     'calendario'],
    ];
    if (is_admin($user)) {
        $items[] = ['agents.php',   'Agentes',         'agentes'];
        $items[] = ['settings.php', 'Personalización', 'personalizacion'];
    }
    $items[] = ['account.php', 'Mi cuenta', 'cuenta'];
    return $items;
}

function admin_head(string $title, string $active, array $user): void
{
    security_headers();
    header('Cache-Control: no-store');
    $nav = admin_nav($user);
    $roleLabel = is_admin($user) ? 'Administración' : 'Espacio de agentes';
    ?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title><?= e($title) ?> · rentapart</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= e(base_url('admin/assets/admin.css')) ?>">
<script defer src="<?= e(base_url('admin/assets/admin.js')) ?>"></script>
</head>
<body class="adm">
<header class="topbar">
  <a class="brand" href="<?= e(base_url('admin/index.php')) ?>">rentapart</a>
  <button type="button" class="burger" id="burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="side"><span></span><span></span><span></span></button>
</header>
<div class="shell">
  <aside class="side" id="side" aria-label="Navegación del panel">
    <a class="brand" href="<?= e(base_url('admin/index.php')) ?>">rentapart</a>
    <p class="role"><?= e($roleLabel) ?></p>
    <nav>
      <?php foreach ($nav as [$file, $label, $key]): ?>
        <a href="<?= e(base_url('admin/' . $file)) ?>"<?= $key === $active ? ' class="active" aria-current="page"' : '' ?>><?= e($label) ?></a>
      <?php endforeach; ?>
    </nav>
    <div class="account">
      <strong><?= e($user['name']) ?></strong>
      <small><?= e($user['email']) ?></small>
      <a href="<?= e(base_url('index.php')) ?>" class="mini">Ver el sitio</a>
      <form method="post" action="<?= e(base_url('admin/logout.php')) ?>"><?= csrf_field() ?><button type="submit" class="mini linklike">Cerrar sesión</button></form>
    </div>
  </aside>
  <div class="scrim" id="scrim" hidden></div>
  <main class="content">
    <?php foreach (flash() ?? [] as $f): ?>
      <div class="flash <?= e($f['type']) ?>" role="status"><?= e($f['message']) ?></div>
    <?php endforeach; ?>
<?php
}

function admin_foot(): void
{
    ?>
  </main>
</div>
</body>
</html>
<?php
}

function status_badge(string $status): string
{
    $map = ['pending' => ['Pendiente', 'warn'], 'confirmed' => ['Confirmada', 'ok'], 'cancelled' => ['Cancelada', 'off']];
    [$label, $cls] = $map[$status] ?? [$status, 'off'];
    return '<span class="badge ' . $cls . '">' . e($label) . '</span>';
}

function page_title(string $title, string $lead = '', string $actions = ''): void
{
    echo '<div class="page-head"><div><h1>' . e($title) . '</h1>' . ($lead !== '' ? '<p class="lead">' . e($lead) . '</p>' : '') . '</div>' . $actions . '</div>';
}
