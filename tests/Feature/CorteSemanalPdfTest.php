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

    public function test_la_sucursal_puede_apagar_los_gastos_extra(): void
    {
        $a = Branch::create(['name' => 'A']);
        $b = Branch::create(['name' => 'B']);
        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();

        $this->assertTrue($a->fresh()->weekly_extra_expenses, 'por omisión se manejan');

        $this->actingAs($owner)->put(route('branches.weekly.update', $b), ['weekly_extra_expenses' => false])->assertSessionHasNoErrors();
        $this->assertFalse($b->fresh()->weekly_extra_expenses);
        $this->assertTrue($a->fresh()->weekly_extra_expenses, 'las demás sucursales no cambian');
        $this->assertTrue($b->fresh()->weekly_split, 'el 50% no se toca');

        // El PDF sale igual aunque el navegador mande gastos: el servidor los ignora.
        $this->actingAs($owner)->post(route('cortes_semanales.export_pdf'), [
            'title' => 'SEMANA', 'branch_id' => $b->id, 'sale_total' => '1000', 'gasolina' => '500',
            'extra_expenses' => '500', 'cortes' => '[]',
        ])->assertOk();
    }
}
