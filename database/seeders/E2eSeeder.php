<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Estado conocido para las pruebas E2E (Playwright). Idempotente a propósito:
 * se puede correr sobre una base existente sin duplicar sucursales.
 *
 *   APP_ENV=e2e php artisan db:seed --class=Database\\Seeders\\E2eSeeder
 */
class E2eSeeder extends Seeder
{
    public const EMAIL = 'e2e@icm.test';

    public const PASSWORD = 'password';

    public const CASHIER_EMAIL = 'caja-e2e@icm.test';

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => self::EMAIL],
            [
                'name' => 'E2E Admin',
                'password' => bcrypt(self::PASSWORD),
                'email_verified_at' => now(),
            ]
            // super_admin: además de todo lo del dueño, prueba la administración de usuarios.
        )->forceFill(['role' => User::SUPER_ADMIN, 'active' => true])->save();

        foreach (['San Felipe del Progreso', 'Jilotepec'] as $name) {
            Branch::firstOrCreate(['name' => $name]);
        }

        // Cajero de San Felipe: descuentos con tope de 10%, sin cambiar precios.
        $cashier = User::updateOrCreate(
            ['email' => self::CASHIER_EMAIL],
            ['name' => 'Cajero E2E', 'password' => bcrypt(self::PASSWORD), 'email_verified_at' => now()]
        );
        $cashier->forceFill([
            'role' => User::CASHIER, 'active' => true, 'max_discount_percent' => 10,
            'permissions' => ['sales.discount' => true, 'sales.cancel_own' => true],
        ])->save();
        $cashier->branches()->sync([Branch::where('name', 'San Felipe del Progreso')->value('id')]);

        $products = [
            ['brand' => 'MICHELIN', 'model' => 'PRIMACY 4', 'measure' => '205/55R16', 'price' => 2500, 'cost' => 1800],
            ['brand' => 'PIRELLI', 'model' => 'P7', 'measure' => '195/65R15', 'price' => 1800, 'cost' => 1300],
            ['brand' => 'GOODYEAR', 'model' => 'ASSURANCE', 'measure' => '185/65R14', 'price' => 1500, 'cost' => 1100],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(
                ['brand' => $product['brand'], 'model' => $product['model']],
                $product + ['mc' => '1', 'unit' => 'PZA', 'iva' => 0, 'extra' => 0, 'stock' => 100]
            );
        }
    }
}
