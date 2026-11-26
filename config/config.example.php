<?php
/**
 * Copiá este archivo como config/config.php y completá los datos.
 * config/config.php NO se sube a git (contiene credenciales).
 */
return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'rentapart',
        'user'    => 'rentapart',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        // Si el sitio vive en una subcarpeta (ej. XAMPP: http://localhost/rentapart) poné '/rentapart'. En la raíz, dejá ''.
        'base_url'      => '',
        'timezone'      => 'America/Argentina/Buenos_Aires',
        'max_upload_mb' => 5,
        'debug'         => false,
        // Poné true cuando el sitio use HTTPS (cookies de sesión solo por HTTPS).
        'https'         => false,
    ],
];
