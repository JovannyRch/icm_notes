<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSearchTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs): Product
    {
        return Product::create(array_merge([
            'brand' => 'MARCA', 'model' => 'MODELO', 'measure' => '1', 'mc' => '', 'unit' => 'PZA',
            'iva' => 16, 'extra' => 0, 'price' => 100, 'cost' => 50,
        ], $attrs));
    }

    public function test_search_returns_matching_products_and_keeps_query_in_pagination_links(): void
    {
        Branch::create(['name' => 'Sucursal A']);
        $this->product(['brand' => 'CASTEL', 'model' => 'C1']);
        $this->product(['brand' => 'castel', 'model' => 'C2', 'price' => 250.5]);
        $this->product(['brand' => 'OTRA', 'model' => 'Z9']);

        $this->actingAs(User::factory()->create())
            ->get('/productos?query=castel')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Products/Index')
                ->where('pagination.total', 2)
                ->where('pagination.first_page_url', fn ($url) => str_contains($url, 'query=castel')));
    }

    public function test_search_combines_query_and_brand_filter(): void
    {
        Branch::create(['name' => 'Sucursal A']);
        $this->product(['brand' => 'CASTEL', 'model' => 'RIN 15']);
        $this->product(['brand' => 'OTRA', 'model' => 'RIN 15']);

        $this->actingAs(User::factory()->create())
            ->get('/productos?query=rin&brand=CASTEL')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('pagination.total', 1));
    }

    public function test_api_search_returns_stock_of_the_requested_branch(): void
    {
        $a = Branch::create(['name' => 'Sucursal A']);
        $b = Branch::create(['name' => 'Sucursal B']);
        $p = $this->product(['brand' => 'PIRELLI', 'model' => 'P7']);
        $this->product(['brand' => 'PIRELLI', 'model' => 'SIN-STOCK']);
        \App\Models\Stock::create(['branch_id' => $a->id, 'product_id' => $p->id, 'quantity' => 1]);
        \App\Models\Stock::create(['branch_id' => $b->id, 'product_id' => $p->id, 'quantity' => 13.5]);

        // La búsqueda ya va con sesión (antes era pública); sin branch_id no hay branch_stock.
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/products/search?query=PIRELLI')->assertOk()->assertJsonMissingPath('0.branch_stock');

        $stock = fn ($branch) => collect($this->getJson("/api/products/search?query=PIRELLI&branch_id={$branch}")->json())
            ->mapWithKeys(fn ($row) => [$row['model'] => $row['branch_stock'] === null ? null : (float) $row['branch_stock']]);

        $this->assertSame(['P7' => 1.0, 'SIN-STOCK' => null], $stock($a->id)->sortKeys()->all());
        $this->assertSame(['P7' => 13.5, 'SIN-STOCK' => null], $stock($b->id)->sortKeys()->all());
    }
}
