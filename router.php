<?php
/**
 * Router para el servidor de desarrollo de PHP:
 *   php -S 127.0.0.1:8000 router.php
 * Impide servir carpetas internas y ejecutar PHP dentro de uploads/.
 * En producción (Apache) lo mismo lo hacen los archivos .htaccess.
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rawurldecode($path);

if (preg_match('#(^|/)\.#', $path) && !str_starts_with($path, '/.well-known/')) {
    http_response_code(404);
    exit;
}
if (preg_match('#^/(app|config|database|scripts|storage|backups)(/|$)#', $path)) {
    http_response_code(404);
    exit;
}
if (preg_match('#^/uploads/.*\.(php|phtml|phar)$#i', $path)) {
    http_response_code(404);
    exit;
}
return false; // sirve el archivo estático o ejecuta el .php pedido
