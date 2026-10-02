<?php

/*
| Funciones que se pueden apagar sin quitar el código. Se cambian en el .env.
*/
return [

    // Descuentos en caja y en la nota de venta. Apagados por ahora a petición del cliente:
    // las notas que ya tienen descuento lo conservan y lo siguen mostrando.
    'discounts' => (bool) env('FEATURE_DISCOUNTS', false),

];
