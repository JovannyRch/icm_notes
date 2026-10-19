<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorteSemanalPdfTest extends TestCase
{
    use RefreshDatabase;

    public function test_descarga_el_corte_semanal_en_pdf(): void
    {
        $branch = Branch::create(['name' => 'A']);
        $user = User::factory()->create();
        $user->forceFill(['role' => User::OWNER])->save();

        $response = $this->actingAs($user)->post(route('cortes_semanales.export_pdf'), [
            'title' => 'SEMANA DEL 12 AL 18 DE OCTUBRE DE 2026',
            'branch_id' => $branch->id,
            'sale_total' => '1000',
            'material_total' => '300',
            'salary' => '100',
            'extra_expenses' => '0',
            'cortes' => json_encode([['date' => 'LUNES, 12 DE OCTUBRE', 'sale_total' => 1000, 'material_total' => 300]]),
        ]);

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }
}
