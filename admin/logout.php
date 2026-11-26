<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';

if (is_post()) {
    csrf_check();
    logout_user();
}
redirect('admin/login.php');
