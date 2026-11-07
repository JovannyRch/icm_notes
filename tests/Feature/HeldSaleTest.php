<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\HeldSale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * "Poner en espera" en caja (como en SICAR): aparcar una venta a medio armar en el servidor,
 * por sucursal (no por cajero), para que cualquiera en ese mostrador la recupere después.
 * No toca inventario ni crea una nota: sólo guarda el borrador tal cual lo arma Caja/Index.
 */
class HeldSaleTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
    }

    private function cashier(array $permissions = [], ?Branch $branch = null): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync([($branch ?? $this->a)->id]);

        return $user;
    }

    private function payload(): array
    {
        return ['cart' => [['product' => ['id' => 1], 'quantity' => '2']], 'customer' => 'Juan Pérez', 'total' => 450.0];
    }

    public function test_a_cashier_can_hold_the_sale_in_progress(): void
    {
        $user = $this->cashier();

        $this->actingAs($user)->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['label' => 'Juan Pérez', 'payload' => $this->payload()])
            ->assertOk();

        $this->assertDatabaseCount('held_sales', 1);
        $held = HeldSale::first();
        $this->assertSame($this->a->id, $held->branch_id);
        $this->assertSame($user->id, $held->user_id);
        $this->assertSame('Juan Pérez', $held->label);
        $this->assertSame('Juan Pérez', $held->payload['customer']);
    }

    public function test_any_cashier_at_the_branch_sees_a_sale_another_cashier_held(): void
    {
        $holder = $this->cashier();
        $other = $this->cashier();

        $this->actingAs($holder)->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['payload' => $this->payload()])->assertOk();

        $this->actingAs($other)->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/held-sales')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user', $holder->name)
            ->assertJsonPath('0.items_count', 1)
            ->assertJsonPath('0.total', 450);
    }

    public function test_held_sales_do_not_cross_branches(): void
    {
        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['payload' => $this->payload()])->assertOk();

        $this->actingAs($this->cashier([], $this->b))->withSession(['branch_id' => $this->b->id])
            ->getJson('/api/held-sales')
            ->assertOk()->assertJsonCount(0);
    }

    public function test_a_cashier_can_discard_a_held_sale(): void
    {
        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['payload' => $this->payload()])->assertOk();
        $held = HeldSale::first();

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->deleteJson("/api/held-sales/{$held->id}")
            ->assertOk();

        $this->assertDatabaseCount('held_sales', 0);
    }

    public function test_a_held_sale_from_another_branch_cannot_be_deleted(): void
    {
        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['payload' => $this->payload()])->assertOk();
        $held = HeldSale::first();

        $this->actingAs($this->cashier([], $this->b))->withSession(['branch_id' => $this->b->id])
            ->deleteJson("/api/held-sales/{$held->id}")
            ->assertNotFound();

        $this->assertDatabaseCount('held_sales', 1);
    }

    public function test_requires_the_permission_to_sell_in_the_register(): void
    {
        $blocked = $this->cashier(['sales.create' => false]);

        $this->actingAs($blocked)->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/held-sales')->assertForbidden();
        $this->actingAs($blocked)->withSession(['branch_id' => $this->a->id])
            ->postJson('/api/held-sales', ['payload' => $this->payload()])->assertForbidden();
    }
}
