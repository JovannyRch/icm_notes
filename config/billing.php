<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pago mensual del servicio
    |--------------------------------------------------------------------------
    |
    | Recordatorio del pago mensual del sistema. Queda apagado mientras
    | BILLING_START_MONTH esté vacío: es el primer mes (YYYY-MM) que se cobra,
    | y los meses anteriores nunca se marcan como pendientes.
    |
    | BILLING_ADMIN_EMAILS: correos (separados por coma) que pueden ver la
    | pantalla /admin/pagos-servicio. Para cualquier otro usuario responde 404.
    |
    */

    'start_month' => env('BILLING_START_MONTH'),

    'due_day' => (int) env('BILLING_DUE_DAY', 7),

    'admin_emails' => array_values(array_filter(array_map(
        fn ($email) => strtolower(trim($email)),
        explode(',', (string) env('BILLING_ADMIN_EMAILS', ''))
    ))),

    // APP_TIMEZONE es UTC; el vencimiento se cuenta en hora local del cliente.
    'timezone' => env('BILLING_TIMEZONE', 'America/Mexico_City'),

];
