# Changelog

Cambios de ICM Notes por versión. Se sigue [versionado semántico](https://semver.org/lang/es/):
MAYOR cuando cambia la forma de trabajar o hay migraciones que no se pueden omitir, MENOR para
funciones nuevas compatibles y PARCHE para correcciones.

Desde 2.0.0 las versiones las calcula **release-please** con el prefijo de cada commit
(`fix:` parche, `feat:` menor, `feat!:` mayor) y agrega aquí sus entradas: no se editan a mano.
La versión vive en `package.json` y `config/app.php` la lee de ahí.

## [2.0.0] - 2026-10-01

Caja para cajeros con ticket impreso, roles y permisos, y rediseño completo.

### Nuevo
- **Roles y permisos:** super administrador, dueño y cajero. Los permisos del cajero se configuran
  uno por uno (cambiar precio, descuentos con tope en %, cancelar sus ventas, ver ventas de la
  sucursal, ver existencias) y cada cajero trabaja sólo en sus sucursales asignadas.
- **Administración de usuarios** (super administrador): alta, edición, desactivar y "entrar como".
- **Caja:** venta de mostrador con teclado (F2 buscar, F8 efectivo, F12 cobrar), descuentos por
  producto y a la venta, cobro en efectivo, tarjeta o transferencia con cálculo de cambio, y
  "Mis ventas" del día con reimpresión y cancelación. El servidor calcula y valida todos los importes.
- **Ticket de 80 mm** para Epson TM-T20IV con logo, datos por sucursal, importe con letra, QR con el
  código de la venta, bitácora de reimpresiones e impresión directa con Chrome en modo kiosco.
- **Sucursales y ticket:** datos que imprime cada sucursal y ticket de prueba.
- **Notas:** folio sugerido (el mayor de la sucursal + 1), descuento sobre el total, quién registró
  la nota y código único por nota. Imprimir el ticket de cualquier nota.
- **Nota de entrada** para registrar compras y sumar existencias.
- **Dashboard** como pantalla de inicio, con exportación, y accesos rápidos.
- **Existencias:** se muestran al buscar productos, aviso al vender más de lo disponible, importación
  de existencias desde Excel y distinción de productos "sin inventario" (nunca contados).
- **Extra global por sucursal** que reemplaza el extra de cada producto.
- **Recordatorio del pago mensual** del sistema y pantalla oculta para registrar pagos.
- Versión visible en el menú de usuario y en el inicio de sesión.

### Cambios
- Rediseño de todas las pantallas con el sistema de diseño (`DESIGN.md`, `tokens.json`).
- Las ventas de caja son notas normales: aparecen en Notas, el corte, el dashboard y los reportes.
- Cortes, PDF, Excel y dashboard usan el total ya con descuento (con descuento 0, nada cambia).

### Correcciones
- Las rutas `/api/...` y el cambio de sucursal funcionaban sin iniciar sesión.
- Error 500 al buscar productos en producción.
- El inventario se descontaba dos veces al editar notas; las notas canceladas ahora devuelven piezas.
- La importación de Excel duplicaba productos.
- Mensajes de éxito que se perdían al recargar y doble envío de formularios.
- Las ventas, el corte y la nota nueva de la noche tomaban la fecha del día siguiente (servidor en UTC).
- La búsqueda permitía deducir costos a quien no debe verlos.

### Para actualizar desde 1.x
1. `composer install` (nueva dependencia: `bacon/bacon-qr-code`) y `npm ci && npm run build`.
2. Revisar que `BILLING_ADMIN_EMAILS` tenga el correo del super administrador **antes** de migrar.
3. `php artisan migrate`. Migraciones nuevas, en orden:
   - `2026_09_30` pagos del servicio
   - `2026_10_01` extra global por sucursal
   - `2026_10_02` existencias contadas (`counted_at`)
   - `2026_10_03` roles, permisos y sucursales por usuario
   - `2026_10_04` descuentos, efectivo recibido, vendedor y código de nota
   - `2026_10_05` datos del ticket y bitácora de impresiones
4. Opcional: `BUSINESS_TIMEZONE` (por omisión `America/Mexico_City`).
5. Crear los cajeros desde **Usuarios** y configurar la impresora en la computadora de caja
   (guía en **Sucursales y ticket**).

## [1.x] - antes de 2026-10

Versión inicial sin número: notas de venta con N pagos, cortes diarios y semanales, productos e
inventario por sucursal, reportes en PDF y Excel.
