<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Catálogo de consulta para el cajero: sin datos sensibles, con existencias de su sucursal. */
class CatalogTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private Product $tile;

    private Product $tire;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->tile = Product::create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60x60', 'mc' => '1.44', 'unit' => 'CAJA', 'iva' => 16, 'extra' => 7, 'price' => 389, 'cost' => 1234]);
        $this->tire = Product::create(['brand' => 'MICHELIN', 'model' => 'P4', 'measure' => '205', 'mc' => '', 'unit' => 'PZA', 'iva' => 16, 'extra' => 0, 'price' => 2500, 'cost' => 1800]);
        (new StockService)->adjustStock($this->a->id, $this->tile->id, 12, 'ADJUSTMENT');
        (new StockService)->adjustStock($this->b->id, $this->tire->id, 5, 'ADJUSTMENT');
    }

    private function cashier(array $permissions = []): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync([$this->a->id]);

        return $user;
    }

    private function catalog(User $user, string $query = '')
    {
        return $this->actingAs($user)->withSession(['branch_id' => $this->a->id])->get('/catalogo'.$query);
    }

    public function test_cashier_sees_prices_m2_and_branch_stock_but_no_sensitive_data(): void
    {
        $response = $this->catalog($this->cashier())->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Catalog/Index')
            ->has('pagination.data', 2)
            ->where('pagination.data.0.brand', 'CASTEL')
            ->where('pagination.data.0.price_per_m2', 270.14)
            ->where('pagination.data.0.m2_per_box', 1.44)
            ->where('pagination.data.0.stock', 12)
            // MICHELIN sólo tiene existencias en B: en A no se ha contado ni movido.
            ->where('pagination.data.1.stock', null)
            ->where('canSell', true));

        foreach (['cost', 'iva', 'extra', '1234', 'purchase'] as $sensitive) {
            $this->assertStringNotContainsString('"'.$sensitive, json_encode($response->viewData('page')['props']['pagination']));
        }
        $this->assertStringNotContainsString('1234', json_encode($response->viewData('page')['props']));
    }

    public function test_search_filters_and_sort(): void
    {
        $cashier = $this->cashier();
        $this->catalog($cashier, '?q=marmol 60x60')->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.model', 'MARMOL'));
        $this->catalog($cashier, '?q=1.44')->assertInertia(fn ($page) => $page->has('pagination.data', 1), 'busca por m² por caja');
        $this->catalog($cashier, '?q=1234')->assertInertia(fn ($page) => $page->has('pagination.data', 0), 'nunca busca por costo');
        $this->catalog($cashier, '?brand=MICHELIN')->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.brand', 'MICHELIN'));
        $this->catalog($cashier, '?con_existencias=1')->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.brand', 'CASTEL'));
        $this->catalog($cashier, '?sort=precio_desc')->assertInertia(fn ($page) => $page->where('pagination.data.0.brand', 'MICHELIN'));
    }

    public function test_stock_hidden_without_permission_and_catalog_can_be_turned_off(): void
    {
        $this->catalog($this->cashier(['stock.view' => false]))->assertInertia(fn ($page) => $page
            ->where('seeStock', false)
            ->where('pagination.data.0.stock', null));

        $this->catalog($this->cashier(['products.view' => false]))->assertForbidden();
    }

    public function test_sell_button_preloads_the_product_in_the_register(): void
    {
        $this->actingAs($this->cashier())->withSession(['branch_id' => $this->a->id])->get("/caja?agregar={$this->tile->id}")
            ->assertInertia(fn ($page) => $page
                ->where('preload.id', $this->tile->id)
                ->where('preload.branch_stock', 12)
                ->missing('preload.cost'));
    }
}
