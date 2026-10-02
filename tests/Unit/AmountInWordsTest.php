<?php

namespace Tests\Unit;

use App\Support\AmountInWords;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class AmountInWordsTest extends TestCase
{
    public static function amounts(): array
    {
        return [
            [0, 'CERO PESOS 00/100 M.N.'],
            [1, 'UN PESO 00/100 M.N.'],
            [0.5, 'CERO PESOS 50/100 M.N.'],
            [15, 'QUINCE PESOS 00/100 M.N.'],
            [16, 'DIECISÉIS PESOS 00/100 M.N.'],
            [21, 'VEINTIÚN PESOS 00/100 M.N.'],
            [22.1, 'VEINTIDÓS PESOS 10/100 M.N.'],
            [31, 'TREINTA Y UN PESOS 00/100 M.N.'],
            [100, 'CIEN PESOS 00/100 M.N.'],
            [101, 'CIENTO UN PESOS 00/100 M.N.'],
            [245, 'DOSCIENTOS CUARENTA Y CINCO PESOS 00/100 M.N.'],
            [500, 'QUINIENTOS PESOS 00/100 M.N.'],
            [1000, 'MIL PESOS 00/100 M.N.'],
            [1100, 'MIL CIEN PESOS 00/100 M.N.'],
            [1234.5, 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.'],
            [5795, 'CINCO MIL SETECIENTOS NOVENTA Y CINCO PESOS 00/100 M.N.'],
            [21000, 'VEINTIÚN MIL PESOS 00/100 M.N.'],
            [100000, 'CIEN MIL PESOS 00/100 M.N.'],
            [999999.99, 'NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE PESOS 99/100 M.N.'],
            [1000000, 'UN MILLÓN DE PESOS 00/100 M.N.'],
            [1000100, 'UN MILLÓN CIEN PESOS 00/100 M.N.'],
            [2500000, 'DOS MILLONES QUINIENTOS MIL PESOS 00/100 M.N.'],
            [3000000, 'TRES MILLONES DE PESOS 00/100 M.N.'],
            [10.999, 'ONCE PESOS 00/100 M.N.'],
        ];
    }

    #[DataProvider('amounts')]
    public function test_amount_in_words(float $amount, string $expected): void
    {
        $this->assertSame($expected, AmountInWords::pesos($amount));
    }
}
