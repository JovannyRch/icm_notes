<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
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

        /* User::where('email', 'admin2025@imc.com')->delete();
        User::where('email', 'admin2026@imc.com')->delete();

        User::create([
            'name' => 'Admin1',
            'email' => 'admin2025@imc.com',
            'password' => bcrypt('yQHHR~;|uZO3'),
        ]);

        User::create([
            'name' => 'Admin2',
            'email' => 'admin2026@imc.com',
            'password' => bcrypt('ttutFDtojlJh3gt'),
        ]); */

        //Create a branch
        Branch::create([
            'name' => 'San Felipe del Progreso',
        ]);

        Branch::create([
            'name' => 'Jilotepec',
        ]);
    }
}
