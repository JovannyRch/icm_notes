<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Reparto al 50% del corte semanal: se configura por sucursal y el Excel lo respeta. */
class WeeklySplitSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_turns_the_split_off_per_branch_and_the_export_follows_it(): void
    {
        $a = Branch::create(['name' => 'A']);
        $b = Branch::create(['name' => 'B']);
        $this->assertTrue($a->fresh()->weekly_split, 'por omisión se reparte al 50%');

        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();

        $this->actingAs($owner)->put(route('branches.weekly.update', $b), ['weekly_split' => false])->assertSessionHasNoErrors();
        $this->assertFalse($b->fresh()->weekly_split);
        $this->assertTrue($a->fresh()->weekly_split, 'las demás sucursales no cambian');

        $this->actingAs($owner)->get(route('branches.index'))->assertInertia(fn ($page) => $page
            ->where('branches.0.weekly_split', true)->where('branches.1.weekly_split', false));
        $this->actingAs($owner)->withSession(['branch_id' => $b->id])->get(route('cortes_semanales.create'))
            ->assertInertia(fn ($page) => $page->where('branch.weekly_split', false));

        // El Excel toma el reparto de la sucursal, no del navegador (que aquí manda split=true).
        Excel::fake();
        $this->actingAs($owner)->post(route('cortes_semanales.export'), [
            'title' => 'SEMANA', 'cortes' => '[]', 'branch_id' => $b->id, 'split' => true,
        ])->assertOk();
        Excel::assertDownloaded('reporte.xlsx', fn ($export) => $export->array()[13][1] === 'UTILIDAD:');
    }

    public function test_cashier_cannot_change_it(): void
    {
        $a = Branch::create(['name' => 'A']);
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$a->id]);

        $this->actingAs($cashier)->put(route('branches.weekly.update', $a), ['weekly_split' => false])->assertForbidden();
        $this->assertTrue($a->fresh()->weekly_split);
    }
}
