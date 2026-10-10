# Changelog

Cambios de ICM Notes por versión. Se sigue [versionado semántico](https://semver.org/lang/es/):
MAYOR cuando cambia la forma de trabajar o hay migraciones que no se pueden omitir, MENOR para
funciones nuevas compatibles y PARCHE para correcciones.

Desde 2.0.0 las versiones las calcula **release-please** con el prefijo de cada commit
(`fix:` parche, `feat:` menor, `feat!:` mayor) y agrega aquí sus entradas: no se editan a mano.
La versión vive en `package.json` y `config/app.php` la lee de ahí.

## [2.1.0](https://github.com/JovannyRch/icm_notes/compare/v2.0.0...v2.1.0) (2026-10-10)


### Nuevo

* add card total to weekly report export and update related calculations and tests ([a366962](https://github.com/JovannyRch/icm_notes/commit/a3669627b09ee0d7527f7533e6a9cb8dd21bfa01))
* add card type selection for payments and update related components ([a94e4a7](https://github.com/JovannyRch/icm_notes/commit/a94e4a72a933cc8debfc6615dd77b829585d1e03))
* add customer contact information to notes form and ticket ([19a6aa7](https://github.com/JovannyRch/icm_notes/commit/19a6aa7a92bdcfc68e25fc13b1f4065a2644d69c))
* add dashboard components and analytics helpers ([058b21f](https://github.com/JovannyRch/icm_notes/commit/058b21f2606b76cd736d8566d0ba81cd3036f459))
* add delivery options for register sales and update related logic and tests ([58cd0ef](https://github.com/JovannyRch/icm_notes/commit/58cd0ef1b923d1ab17afc2b3b1547752acee981b))
* add Docker configuration and setup scripts for ICM Notes ([0a41c58](https://github.com/JovannyRch/icm_notes/commit/0a41c583a7dde43e2e1e3aef9e36791f1c80f304))
* add E2E seeder and Playwright configuration for testing ([e2c1f53](https://github.com/JovannyRch/icm_notes/commit/e2c1f5311c1de790ea2e2eaf2253f453f0760380))
* add global extra percentage management for branches with UI and tests ([80fda5d](https://github.com/JovannyRch/icm_notes/commit/80fda5dce66d6a20d05d731b24fae4d683275fc3))
* add new filters ([719e022](https://github.com/JovannyRch/icm_notes/commit/719e022786dff964eb827d4f33f817385b81ad11))
* add optional comments field for sales and update ticket printing to include comments ([d22f946](https://github.com/JovannyRch/icm_notes/commit/d22f946f3b36ced1eeb3c8a468be8cc8f94e2e49))
* add PDF download functionality for tickets and update ticket rendering ([b9938cf](https://github.com/JovannyRch/icm_notes/commit/b9938cfb1c0a14eba22c5e1e36ea4d268249e6cd))
* add products crud ([74feaeb](https://github.com/JovannyRch/icm_notes/commit/74feaeb196c3114fcff258cbb6f7b0f0dd69598e))
* add second price for products and weekly profit split for branches ([eea8ad3](https://github.com/JovannyRch/icm_notes/commit/eea8ad378e395c3f700e9a15065a8a67ed404853))
* add service payment management and stock entry functionality ([761b229](https://github.com/JovannyRch/icm_notes/commit/761b229ae0ec9ef86beb6981efba966219069b44))
* add stock entry management with costs, IVA, and extra handling ([9247200](https://github.com/JovannyRch/icm_notes/commit/9247200ecf6b439d582abbed23f1cd2d78c2fa0c))
* add system usage tracking for super admin ([df1a603](https://github.com/JovannyRch/icm_notes/commit/df1a603f5b4a5debc94d87706fe1eea2f0afff8c))
* add test for downloadable template import with price2 validation ([0cb1230](https://github.com/JovannyRch/icm_notes/commit/0cb123017d0b1f70e64d9254434dbd3042028928))
* allow cashiers to manually enter line amounts for rounding and adjust pricing calculations ([93ece7f](https://github.com/JovannyRch/icm_notes/commit/93ece7ff24bb417a12ceb2b96f98a18eada4d8d7))
* display product name ([7a6a7f9](https://github.com/JovannyRch/icm_notes/commit/7a6a7f93e661e138918340c248da4754007ee0bb))
* el cajero hace el corte del día de su sucursal sin ver compras ([5366a48](https://github.com/JovannyRch/icm_notes/commit/5366a4822c7da1505b5e0165a4755ddb9f551a7e))
* enhance date filtering in notes list with custom range selection and improve UI components ([c51fe93](https://github.com/JovannyRch/icm_notes/commit/c51fe93e6eb808dbc200e3522b18dc14b90d4870))
* Enhance product import functionality and stock management ([b491d5b](https://github.com/JovannyRch/icm_notes/commit/b491d5b41e3ce8f93ff0aa494df3297ff7d0f9aa))
* **errors:** create custom error page component for better UX ([35f3957](https://github.com/JovannyRch/icm_notes/commit/35f39578c4009f7b82b961c4d25b1c3b07a7cd2f))
* hide canceled notes ([1aea418](https://github.com/JovannyRch/icm_notes/commit/1aea41843e777c6a2edae69c97b58b87b494617d))
* implement cancellation reason for sales and update UI to prompt for reason ([3fe4c4a](https://github.com/JovannyRch/icm_notes/commit/3fe4c4a00e819bce9c51d286ad79c7170d6139ee))
* implement pagination for product search results and add tests for search functionality ([d0f32c9](https://github.com/JovannyRch/icm_notes/commit/d0f32c9b2e8220983fe7d34c095067eb89f96371))
* implement product search functionality with keyboard navigation and selection ([4759577](https://github.com/JovannyRch/icm_notes/commit/4759577db654245e1c45392b0803c39e61eb19c8))
* implement QR code functionality for ticket verification and enhance note search by code ([fff8c13](https://github.com/JovannyRch/icm_notes/commit/fff8c1398fd42741f0bc6adb1719e9af475bc3f8))
* implement quick editing for product fields in the list view ([9a99484](https://github.com/JovannyRch/icm_notes/commit/9a994845f546e41a32c135ae73f377afab126c91))
* implement ticket printing functionality and related tests ([954e76c](https://github.com/JovannyRch/icm_notes/commit/954e76c5c02df180cab6d3b44383cbc6f9cbe0b6))
* make subtotal_sale input editable ([8aa579f](https://github.com/JovannyRch/icm_notes/commit/8aa579f3f185ba233a50c7d94718f25ac51ccc60))
* más opciones del ticket por sucursal (encabezado, vendedor genérico, qué se imprime y copias) ([b046669](https://github.com/JovannyRch/icm_notes/commit/b0466694084b4e92493cab0ba04567927545d11b))
* overhaul dashboard with new components and analytics features ([0c6cf2b](https://github.com/JovannyRch/icm_notes/commit/0c6cf2b5ffdb8f41e524c1892a94ed6370839ef5))
* **products:** implement bulk price adjustment dialog with validation ([35f3957](https://github.com/JovannyRch/icm_notes/commit/35f39578c4009f7b82b961c4d25b1c3b07a7cd2f))
* Refactor Cortes page to enhance functionality and UI ([c1e6df6](https://github.com/JovannyRch/icm_notes/commit/c1e6df686ecdcb3507af911fce5b8c9e1ad608eb))
* Refactor Dashboard and Product Forms with new PageHeader component ([49bad8b](https://github.com/JovannyRch/icm_notes/commit/49bad8b472ee5c6d69dd2090342458807850ba58))
* resumen de cada venta desplegable en ventas del día ([77bd27e](https://github.com/JovannyRch/icm_notes/commit/77bd27e0f044885b6d225f92499eeb9a442af570))
* **routes:** add bulk price adjustment route for products ([35f3957](https://github.com/JovannyRch/icm_notes/commit/35f39578c4009f7b82b961c4d25b1c3b07a7cd2f))
* **tickets:** add farewell message option and style adjustments ([35f3957](https://github.com/JovannyRch/icm_notes/commit/35f39578c4009f7b82b961c4d25b1c3b07a7cd2f))
* update application name to "ICM Notes" in configuration and views ([89f7f5d](https://github.com/JovannyRch/icm_notes/commit/89f7f5d9a2d906b1ef72da3710ef292b586873be))
* Update authentication and profile management UI; enhance accessibility and user experience with improved labels and layout ([536309c](https://github.com/JovannyRch/icm_notes/commit/536309c39727867fe1eec3098ced987beae874a7))
* update date handling to use businessToday() and improve ticket logo rendering ([68b4aea](https://github.com/JovannyRch/icm_notes/commit/68b4aea711336dfa40475db55d582e5c8413cb2a))
* update form ui and table structures ([e557601](https://github.com/JovannyRch/icm_notes/commit/e557601d92c36cbdffcc234a8d5db5a1d5cfa58d))
* update new price ([d7ec4d9](https://github.com/JovannyRch/icm_notes/commit/d7ec4d909247545489994f4356aefd7e8a996cdc))
* update purchase status to 'paid' for register sales and add price per m² reference in UI ([10dfd66](https://github.com/JovannyRch/icm_notes/commit/10dfd663b459a634c3b82648528e737d3e4fe6e6))
* update theme and styles for improved UI consistency ([8edb646](https://github.com/JovannyRch/icm_notes/commit/8edb646d41886a18dd8b982e93524b60b24e0b0e))
* update ticket description formatting and improve sales display labels ([f083821](https://github.com/JovannyRch/icm_notes/commit/f0838215f429e679841b380dc985dc85321b4108))
* ventas a crédito con a cuenta y resta en ventas del día y en el corte ([9080503](https://github.com/JovannyRch/icm_notes/commit/9080503524b82a3c2cb76d70eb67b454ac2e06da))
* ventas del día muestran a cuenta y resta de las ventas a crédito ([efc8ed7](https://github.com/JovannyRch/icm_notes/commit/efc8ed77c10221148c339ddbec2e2b74a7c36550))


### Correcciones

* append query parameters to pagination in index method ([51e854a](https://github.com/JovannyRch/icm_notes/commit/51e854a024d36651c54a687e0fc00e14e4660687))
* filters in products ([67cba50](https://github.com/JovannyRch/icm_notes/commit/67cba500e1b90d0e53cba25958881ec1deca495b))
* logout ([46d68ec](https://github.com/JovannyRch/icm_notes/commit/46d68ecb701d9a83f054dea964a1a7f5d8c30e9c))
* refactor cleanNotes function and apply it to balance and purchase total calculations ([60b4e55](https://github.com/JovannyRch/icm_notes/commit/60b4e55a6b7074e4f419621421ac73d808cdec6e))
* remove unnecessary blank line in docker-compose.yml ([501b64e](https://github.com/JovannyRch/icm_notes/commit/501b64ee74244d354e39373f5343b9c238cfa618))
* typo ([e37958a](https://github.com/JovannyRch/icm_notes/commit/e37958ac8afcac555b271582c3e9363477032c12))
* update cleanNotes function to filter out canceled notes ([713a6b7](https://github.com/JovannyRch/icm_notes/commit/713a6b7721699047f4b44c4fc184ce58ccbf6399))
* update locale settings to Spanish and adjust Docker configuration for MySQL and Redis ([34fe36c](https://github.com/JovannyRch/icm_notes/commit/34fe36c4ad626b48c21fb23e445f03670a12f928))
* update locale settings to Spanish and improve optional chaining in product form ([e538120](https://github.com/JovannyRch/icm_notes/commit/e538120eea31a3b901bb0c35d07becedd9420cb3))

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
