<?php

namespace App\Support;

/**
 * Importe con letra para el ticket: 1234.5 → "MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N."
 */
class AmountInWords
{
    private const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];

    private const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];

    private const TWENTIES = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];

    private const TENS = [3 => 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

    private const HUNDREDS = [1 => 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    public static function pesos(float $amount): string
    {
        $amount = round(abs($amount), 2);
        $integer = (int) floor($amount);
        $cents = (int) round(($amount - $integer) * 100);
        if ($cents === 100) {
            $integer++;
            $cents = 0;
        }

        $words = $integer === 0 ? 'CERO' : self::number($integer);
        // "UN MILLÓN DE PESOS", pero "UN MILLÓN CIEN PESOS".
        $of = $integer >= 1_000_000 && $integer % 1_000_000 === 0 ? ' DE' : '';
        $currency = $integer === 1 ? 'PESO' : 'PESOS';

        return sprintf('%s%s %s %02d/100 M.N.', $words, $of, $currency, $cents);
    }

    private static function number(int $n): string
    {
        $parts = [];

        $millions = intdiv($n, 1_000_000);
        if ($millions > 0) {
            $parts[] = $millions === 1 ? 'UN MILLÓN' : self::upTo999999($millions).' MILLONES';
        }

        $rest = $n % 1_000_000;
        if ($rest > 0) {
            $parts[] = self::upTo999999($rest);
        }

        return implode(' ', $parts);
    }

    private static function upTo999999(int $n): string
    {
        $thousands = intdiv($n, 1000);
        $rest = $n % 1000;
        $parts = [];

        if ($thousands > 0) {
            $parts[] = $thousands === 1 ? 'MIL' : self::upTo999($thousands).' MIL';
        }
        if ($rest > 0) {
            $parts[] = self::upTo999($rest);
        }

        return implode(' ', $parts);
    }

    private static function upTo999(int $n): string
    {
        if ($n === 100) {
            return 'CIEN';
        }

        $hundreds = intdiv($n, 100);
        $rest = $n % 100;
        $parts = [];

        if ($hundreds > 0) {
            $parts[] = self::HUNDREDS[$hundreds];
        }
        if ($rest > 0) {
            $parts[] = self::upTo99($rest);
        }

        return implode(' ', $parts);
    }

    private static function upTo99(int $n): string
    {
        return match (true) {
            $n < 10 => self::UNITS[$n],
            $n < 20 => self::TEENS[$n - 10],
            $n < 30 => self::TWENTIES[$n - 20],
            default => self::TENS[intdiv($n, 10)].($n % 10 ? ' Y '.self::UNITS[$n % 10] : ''),
        };
    }
}
