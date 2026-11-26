# rentapart

Sitio de alquileres temporarios.

- **Frontend:** HTML, CSS y JavaScript (`index.html`, `app.html`, `home.*`, `navbar.*`, `app.*`).
- **Backend:** 100% PHP + MySQL/MariaDB, sin framework (carpetas `admin/`, `api/`, `app/`, `database/`, `scripts/`).

## Estructura del backend

```
admin/      Paneles privados (login, resumen, propiedades, reservas, calendario, agentes, personalización, cuenta)
api/        API pública en JSON (propiedades, reservas, personalización del sitio)
app/        Lógica compartida: sesión/CSRF, autenticación, modelos, subida de imágenes, plantilla de los paneles
config/     config.example.php (se copia a config.php, que no se sube a git)
database/   schema.sql
scripts/    install.php (instalador por línea de comandos)
uploads/    Fotos subidas (no se ejecuta código en esta carpeta)
storage/    Credenciales iniciales generadas (no se sube a git)
router.php  Router para el servidor de desarrollo de PHP
```

## Puesta en marcha (desarrollo)

1. Crear una base de datos vacía y un usuario con permisos sobre ella.
2. Copiar `config/config.example.php` a `config/config.php` y completar los datos de la base.
3. Instalar las tablas y el administrador:

   ```
   php scripts/install.php            # tablas + administrador
   php scripts/install.php --demo     # además un agente y 3 propiedades de ejemplo
   ```

   Las contraseñas generadas se guardan en `storage/credenciales.txt`. Cambialas desde **Mi cuenta**.
4. Levantar el servidor:

   ```
   php -S 127.0.0.1:8000 router.php
   ```

   - Sitio: http://127.0.0.1:8000/
   - Paneles: http://127.0.0.1:8000/admin/

Con Apache (XAMPP u hosting) alcanza con copiar la carpeta; los `.htaccess` protegen las carpetas internas.
Si el sitio queda en una subcarpeta, configurá `base_url` (ej. `/rentapart`). Con HTTPS, poné `https => true`.

## Roles

| Rol | Puede |
| --- | --- |
| **Agente** | Iniciar sesión, ver **solo sus** propiedades y reservas, crear/editar/publicar propiedades, subir fotos, cambiar precios, bloquear fechas, confirmar o cancelar solicitudes. |
| **Administrador** | Todo lo anterior sobre todas las propiedades, más crear/activar/desactivar agentes, personalizar el sitio (logo, colores, foto de inicio, textos, contacto) y ver métricas generales. |

## API pública

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/properties.php` | Listado. Filtros: `destination`, `type`, `guests`, `max_price`, `arrival` + `departure` (solo trae las libres). |
| GET | `/api/properties.php?id=N` | Detalle con fotos y fechas no disponibles. |
| POST | `/api/reservation.php` | Crea una reserva **pendiente** (JSON o formulario). |
| GET | `/api/site.php` | Personalización pública del sitio. |

**Reservas sin duplicados:** la disponibilidad se comprueba en el servidor dentro de una transacción con bloqueo de la fila de la propiedad. Si dos personas piden las mismas fechas al mismo tiempo, solo una queda registrada. Un día de salida puede ser el día de entrada de otra reserva.

## Seguridad

- Contraseñas con `password_hash`, sesiones con cookie `HttpOnly`/`SameSite` y regeneración del id al ingresar.
- Token CSRF en todos los formularios que modifican datos; consultas preparadas (PDO) en todo el acceso a la base.
- Límite de intentos de login y de pedidos de reserva por IP; campo trampa anti-bots.
- Subida de imágenes: se valida el tipo real del archivo, el tamaño y las dimensiones; se guardan con nombre aleatorio; no se ejecuta código dentro de `uploads/`.
- Cada consulta del agente está limitada a sus propias propiedades y reservas.
- Cabeceras `Content-Security-Policy`, `X-Frame-Options` y `nosniff` en los paneles.

## Conexión del sitio con el backend

Las páginas públicas consultan la API al cargar (`api/properties.php`, `api/site.php`) y envían las reservas a `api/reservation.php`:

- **Home:** las 3 tarjetas, la foto principal y los destinos salen de las propiedades publicadas; el título, la foto, los colores, el logo y los datos de contacto salen de **Personalización**.
- **Resultados y ficha:** datos, fotos, precio, limpieza, comodidades y disponibilidad reales. Una reserva pendiente o confirmada bloquea esas fechas para todos.
- **Reserva:** se registra como *pendiente* y el huésped recibe un código. El agente la confirma o cancela desde el panel.
- Los accesos de agente (`#acceso`, `#agente/...`) llevan a `admin/login.php`.
- **Sin backend** (por ejemplo, abriendo el sitio con un servidor estático), todo sigue funcionando con los datos de demostración.

## Pendiente

- Envío de correos de confirmación al huésped y al agente.
- Pagos online.
