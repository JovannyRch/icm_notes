<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Precio 2 (mayoreo): se captura en el producto y en la caja se elige por partida. */
class PriceTwoTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Product $tile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->tile = Product::create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60x60', 'mc' => '1.44', 'unit' => 'CAJA', 'iva' => 16, 'extra' => 0, 'price' => 389, 'price2' => 350, 'cost' => 250]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $this->tile->id, 'quantity' => 100]);
    }

    private function owner(): User
    {
        $u = User::factory()->create();
        $u->forceFill(['role' => User::OWNER])->save();

        return $u;
    }

    private function cashier(array $permissions = []): User
    {
        $u = User::factory()->create();
        $u->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $u->branches()->sync([$this->a->id]);

        return $u;
    }

    private function sell(User $user, array $item, array $extra = [])
    {
        return $this->actingAs($user)->withSession(['branch_id' => $this->a->id])
            ->post('/caja/ventas', ['items' => [['product_id' => $this->tile->id, 'quantity' => 10] + $item]] + $extra);
    }

    public function test_owner_saves_price2_in_the_form_and_the_list(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->withSession(['branch_id' => $this->a->id])->post(route('products.store'), [
            'brand' => 'CASTEL', 'model' => 'NUEVO', 'price' => 400, 'price2' => 360, 'cost' => 200, 'iva' => 16, 'extra' => 0,
        ])->assertSessionHasNoErrors();
        $this->assertEquals(360, Product::where('model', 'NUEVO')->value('price2'));

        $this->actingAs($owner)->withSession(['branch_id' => $this->a->id])
            ->patchJson(route('products.quick-update', $this->tile), ['field' => 'price2', 'value' => 340])
            ->assertOk()->assertJson(['price2' => 340, 'price' => 389]);
    }

    public function test_cashier_sells_at_price2_without_the_change_price_permission(): void
    {
        // Sin permiso de cambiar precios: el precio 2 es un precio de catálogo, no un cambio.
        $cashier = $this->cashier(['sales.change_price' => false]);
        $this->sell($cashier, ['price' => 350, 'price_level' => 2], ['cash_received' => 3500])->assertSessionHasNoErrors();

        $line = NoteProduct::sole();
        $this->assertEquals(350, $line->price);
        $this->assertEquals(350, $line->list_price, 'el precio de catálogo de la partida es el precio 2');
        $this->assertSame(2, (int) $line->price_level);
        $this->assertEquals(3500, Note::sole()->sale_total);

        // A precio 1, el mismo precio de 350 sí sería un cambio y se rechaza.
        $this->sell($cashier, ['price' => 350], ['cash_received' => 3500])->assertSessionHasErrors('items.0.price');
    }

    public function test_price2_needs_its_permission_and_a_price2(): void
    {
        $this->sell($this->cashier(['sales.price2' => false]), ['price' => 350, 'price_level' => 2], ['cash_received' => 3500])
            ->assertSessionHasErrors('items.0.price_level');

        $this->tile->update(['price2' => null]);
        $this->sell($this->cashier(), ['price' => 389, 'price_level' => 2], ['cash_received' => 3890])
            ->assertSessionHasErrors('items.0.price_level');
        $this->assertSame(0, Note::count());
    }

    public function test_saving_a_new_price_at_level_2_updates_price2(): void
    {
        $this->sell($this->cashier(), ['price' => 345, 'price_level' => 2, 'update_catalog' => true], ['cash_received' => 3450])->assertSessionHasNoErrors();

        $this->tile->refresh();
        $this->assertEquals(345, $this->tile->price2);
        $this->assertEquals(389, $this->tile->price, 'el precio público no cambia');
    }

    public function test_catalog_and_search_show_price2(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])->get(route('catalog'))
            ->assertInertia(fn ($page) => $page->where('pagination.data.0.price2', 350));
        $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])->getJson('/api/products/search?query=MARMOL')
            ->assertOk()->assertJsonPath('0.price2', fn ($v) => (float) $v === 350.0); // texto en Postgres, número en SQLite
    }
}
