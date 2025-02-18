<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Product;
/* use App\Models\User; */
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        /*  User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]); */

        //Create a branch
        Branch::create([
            'name' => 'San Felipe del Progreso',
        ]);

        Branch::create([
            'name' => 'Jilotepec',
        ]);

        //protected $fillable = ['code', 'type', 'brand', 'model', 'measure', 'description', 'caja_bulto', 'cost', 'iva', 'commission', 'stock'];

        Product::create([
            'code' => 'COD1',
            'type' => 'PISO',
            'brand' => 'CASTEL',
            'model' => 'BASILIA GOLDEN',
            'measure' => '30 X 60',
            'caja_bulto' => 1.98,
            'cost' => 96.00,
            'iva' => 0.16,
            'commission' => 0.07,
            'stock' => 100,
        ]);

        Product::create([
            'code' => 'COD2',
            'type' => 'PISO',
            'brand' => 'CASTEL',
            'model' => 'BASILIA PLATINUM',
            'measure' => '30 X 90',
            'caja_bulto' => 1.98,
            'cost' => 100.00,
            'iva' => 0.16,
            'commission' => 0.07,
            'stock' => 100,
        ]);
    }
}
