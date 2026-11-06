<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Autocompletar clientes al vender: busca en `notes` (no hay tabla de clientes), agrupa
 * al mismo cliente y excluye "Público en general". Comparte permiso con la búsqueda de
 * productos (products.search), que ya cubre caja, notas, entradas y productos.
 */
class CustomerSearchTest extends TestCase
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

    private function cashier(array $permissions = []): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync([$this->a->id]);

        return $user;
    }

    /** Nota mínima con datos de cliente, con fecha de captura controlable para el orden. */
    private function note(string $folio, Branch $branch, ?string $customer, ?string $phone = null, ?string $address = null, ?string $createdAt = null): Note
    {
        $note = Note::create(['folio' => $folio, 'date' => '2026-10-01', 'branch_id' => $branch->id, 'customer' => $customer,
            'customer_phone' => $phone, 'customer_address' => $address, 'sale_total' => 100, 'purchase_total' => 0,
            'status' => 'paid', 'purchase_status' => 'paid', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0]);
        if ($createdAt) {
            $note->forceFill(['created_at' => Carbon::parse($createdAt)])->save();
        }

        return $note;
    }

    public function test_matches_by_customer_name(): void
    {
        $this->note('1', $this->a, 'Juan Pérez', '7121110000', 'Calle 1');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=juan')
            ->assertOk()
            ->assertJson([['customer' => 'Juan Pérez', 'customer_phone' => '7121110000', 'customer_address' => 'Calle 1']]);
    }

    public function test_matches_by_phone(): void
    {
        $this->note('1', $this->a, 'Ana Ruiz', '7129998888', 'Calle 2');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=99988')
            ->assertOk()
            ->assertJson([['customer' => 'Ana Ruiz', 'customer_phone' => '7129998888', 'customer_address' => 'Calle 2']]);
    }

    public function test_excludes_the_default_walk_in_customer(): void
    {
        $this->note('1', $this->a, 'Público en general');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=público')
            ->assertOk()->assertJson([]);
    }

    public function test_dedupes_the_same_customer_and_orders_by_recency(): void
    {
        // Mismo cliente, 3 compras: una sola sugerencia.
        $this->note('1', $this->a, 'Rosa Martínez', '7125551234', 'Av. Siempre Viva', '2026-09-01 10:00:00');
        $this->note('2', $this->a, 'Rosa Martínez', '7125551234', 'Av. Siempre Viva', '2026-09-15 10:00:00');
        $this->note('3', $this->a, 'Rosa Martínez', '7125551234', 'Av. Siempre Viva', '2026-10-01 10:00:00');
        // Otro cliente que también hace match, pero compró hace más tiempo.
        $this->note('4', $this->a, 'Roberto Salas', '7125559999', null, '2026-01-01 10:00:00');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=ro')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.customer', 'Rosa Martínez')
            ->assertJsonPath('1.customer', 'Roberto Salas');
    }

    public function test_matches_regardless_of_the_notes_branch(): void
    {
        // El mismo cliente puede haber comprado en cualquier sucursal: la búsqueda no se limita a la actual.
        $this->note('1', $this->b, 'Carla Soto', '7120001111', 'Otra sucursal');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=carla')
            ->assertOk()->assertJsonCount(1);
    }

    public function test_short_query_returns_nothing(): void
    {
        $this->note('1', $this->a, 'Juan Pérez', '7121110000');

        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=j')
            ->assertOk()->assertJson([]);
    }

    public function test_requires_a_permission_that_can_build_sales_or_notes(): void
    {
        $this->note('1', $this->a, 'Juan Pérez', '7121110000');
        // Un cajero sin sales.create no tiene ninguna de las habilidades que dan acceso.
        $blocked = $this->cashier(['sales.create' => false]);

        $this->actingAs($blocked)->withSession(['branch_id' => $this->a->id])
            ->getJson('/api/customers/search?query=juan')
            ->assertForbidden();
    }
}
