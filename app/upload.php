<?php
declare(strict_types=1);

/* Subida segura de imágenes: valida tipo real, tamaño, y guarda con nombre aleatorio. */

const RA_IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

function uploads_dir(): string
{
    return RA_ROOT . '/uploads';
}

/**
 * @param array  $file    entrada de $_FILES
 * @param string $subdir  carpeta dentro de uploads/ (ej. "properties/12")
 * @return array{ok:bool,path:string,error:string} path relativo a la raíz web
 */
function save_image(array $file, string $subdir, int $maxMb = 0): array
{
    $maxMb = $maxMb > 0 ? $maxMb : (int)cfg('app.max_upload_mb', 5);
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return ['ok' => false, 'path' => '', 'error' => ''];
    }
    if (($file['error'] ?? 0) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'path' => '', 'error' => 'No se pudo subir el archivo. Probá con otra imagen.'];
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        return ['ok' => false, 'path' => '', 'error' => 'Archivo inválido.'];
    }
    if ($file['size'] > $maxMb * 1024 * 1024) {
        return ['ok' => false, 'path' => '', 'error' => "La imagen supera los {$maxMb} MB."];
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($file['tmp_name']);
    if (!isset(RA_IMAGE_TYPES[$mime])) {
        return ['ok' => false, 'path' => '', 'error' => 'Solo se aceptan imágenes JPG, PNG o WebP.'];
    }
    $info = @getimagesize($file['tmp_name']);
    if ($info === false || $info[0] < 200 || $info[1] < 200 || $info[0] > 8000 || $info[1] > 8000) {
        return ['ok' => false, 'path' => '', 'error' => 'La imagen debe medir entre 200 y 8000 píxeles por lado.'];
    }

    if (!preg_match('#^[a-z0-9/_-]+$#', $subdir)) {
        return ['ok' => false, 'path' => '', 'error' => 'Destino inválido.'];
    }
    $dir = uploads_dir() . '/' . $subdir;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return ['ok' => false, 'path' => '', 'error' => 'No se pudo crear la carpeta de imágenes.'];
    }
    $name = bin2hex(random_bytes(12)) . '.' . RA_IMAGE_TYPES[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        return ['ok' => false, 'path' => '', 'error' => 'No se pudo guardar la imagen.'];
    }
    return ['ok' => true, 'path' => 'uploads/' . $subdir . '/' . $name, 'error' => ''];
}

/** Borra un archivo subido, solo si está dentro de uploads/. */
function delete_upload(string $relativePath): void
{
    if (!str_starts_with($relativePath, 'uploads/') || str_contains($relativePath, '..')) {
        return;
    }
    $full = RA_ROOT . '/' . $relativePath;
    $base = realpath(uploads_dir());
    $real = realpath($full);
    if ($base !== false && $real !== false && str_starts_with($real, $base . DIRECTORY_SEPARATOR) && is_file($real)) {
        @unlink($real);
    }
}

/** Reordena el arreglo de $_FILES múltiple a una lista de archivos individuales. */
function files_list(string $field): array
{
    if (empty($_FILES[$field]) || !is_array($_FILES[$field]['name'])) {
        return empty($_FILES[$field]) ? [] : [$_FILES[$field]];
    }
    $out = [];
    foreach ($_FILES[$field]['name'] as $i => $name) {
        $out[] = [
            'name'     => $name,
            'type'     => $_FILES[$field]['type'][$i],
            'tmp_name' => $_FILES[$field]['tmp_name'][$i],
            'error'    => $_FILES[$field]['error'][$i],
            'size'     => $_FILES[$field]['size'][$i],
        ];
    }
    return $out;
}
