<?php

/*
|--------------------------------------------------------------------------
| Roles y permisos
|--------------------------------------------------------------------------
|
| Fuente única de quién puede hacer qué. Cada ruta se protege con can:<permiso>
| y el frontend recibe la lista de permisos del usuario para armar la navegación.
|
| - super_admin: todo (el desarrollador; administra usuarios y el pago del sistema).
| - owner: toda la operación del negocio, sin usuarios ni pago del sistema.
| - cashier: sólo lo de caja. Cada permiso con 'cashier' => true se puede activar o
|   desactivar por cajero (users.permissions); 'default' es su valor inicial. Los
|   que no son configurables nunca los tiene un cajero.
|
*/

return [

    'roles' => [
        'super_admin' => 'Super administrador',
        'owner' => 'Dueño',
        'cashier' => 'Cajero',
    ],

    'abilities' => [
        // Caja (configurables por cajero)
        'sales.create' => ['label' => 'Vender en caja', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'sales.view_own' => ['label' => 'Ver sus ventas del día y reimprimir tickets', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'sales.view_branch' => ['label' => 'Ver las ventas de toda la sucursal', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'sales.edit_folio' => ['label' => 'Cambiar el folio de la venta', 'group' => 'Caja', 'cashier' => true, 'default' => false],
        'sales.change_price' => ['label' => 'Cambiar el precio de un producto en la venta', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'products.update_price' => ['label' => 'Guardar el precio nuevo en el catálogo desde la caja', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'sales.discount' => ['label' => 'Aplicar descuentos (hasta su tope)', 'group' => 'Caja', 'cashier' => true, 'default' => false],
        'sales.credit' => ['label' => 'Vender a crédito (el cliente paga después)', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'sales.cancel_own' => ['label' => 'Cancelar sus ventas del día', 'group' => 'Caja', 'cashier' => true, 'default' => false],
        'stock.view' => ['label' => 'Ver existencias', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'products.view' => ['label' => 'Ver el catálogo de productos (sin costos)', 'group' => 'Caja', 'cashier' => true, 'default' => true],
        'cortes.create' => ['label' => 'Hacer el corte del día de su sucursal (sin ver compras)', 'group' => 'Caja', 'cashier' => true, 'default' => true],

        // Operación del negocio (owner)
        'dashboard.view' => ['label' => 'Dashboard y reportes', 'group' => 'Negocio'],
        'notes.view' => ['label' => 'Ver notas de venta', 'group' => 'Negocio'],
        'notes.manage' => ['label' => 'Crear, editar, archivar y eliminar notas', 'group' => 'Negocio'],
        'costs.view' => ['label' => 'Ver costos, compras y utilidades', 'group' => 'Negocio'],
        'products.manage' => ['label' => 'Administrar productos e importar/exportar', 'group' => 'Negocio'],
        'stock.manage' => ['label' => 'Administrar inventario y notas de entrada', 'group' => 'Negocio'],
        'branches.manage' => ['label' => 'Datos de sucursales y del ticket', 'group' => 'Negocio'],
        'cortes.manage' => ['label' => 'Cortes semanales y eliminar cortes', 'group' => 'Negocio'],
        'billing.notice' => ['label' => 'Ver el aviso de pago del sistema', 'group' => 'Negocio'],

        // Sistema (sólo super_admin)
        'users.manage' => ['label' => 'Administrar usuarios y permisos', 'group' => 'Sistema', 'super_admin_only' => true],
        'billing.manage' => ['label' => 'Registrar pagos del servicio', 'group' => 'Sistema', 'super_admin_only' => true],
        'usage.view' => ['label' => 'Ver el uso del sistema (adopción de la caja)', 'group' => 'Sistema', 'super_admin_only' => true],
    ],

];
