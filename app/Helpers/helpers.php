<?php

if (!function_exists('format_currency')) {
    /**
     * Formatea un número como moneda con el símbolo de peso y dos decimales.
     *
     * @param float $amount
     * @return string
     */
    function format_currency($amount)
    {
        if (!is_numeric($amount)) {
            return "-";
        }

        return '$' . number_format($amount, 2, '.', ',');
    }
}
