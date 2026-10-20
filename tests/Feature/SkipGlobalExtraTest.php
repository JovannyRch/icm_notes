<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkipGlobalExtraTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::OWNER])->save();

        return $user;
    }

    public function test_effective_extra_respeta_la_excepcion(): void
    {
        $normal = new Product(['extra' => 3]);
        $exento = new Product(['extra' => 0, 'skip_global_extra' => true]);

        $this->assertSame(6.0, $normal->effectiveExtra(6.0));
        $this->assertSame(3.0, $normal->effectiveExtra(null));
        $this->assertSame(0.0, $exento->effectiveExtra(6.0));
    }

    public function test_el_dueno_marca_la_excepcion_desde_la_lista_y_el_producto_la_guarda(): void
    {
        $product = Product::create(['brand' => 'A', 'model' => 'X', 'iva' => 0, 'extra' => 0, 'price' => 10, 'cost' => 5]);

        $this->actingAs($this->owner())->patchJson(route('products.quick-update', $product), ['field' => 'skip_global_extra', 'value' => 1])
            ->assertOk()->assertJsonPath('skip_global_extra', true);
        $this->assertTrue($product->fresh()->skip_global_extra);

        $this->patchJson(route('products.quick-update', $product), ['field' => 'skip_global_extra', 'value' => 0])->assertOk();
        $this->assertFalse($product->fresh()->skip_global_extra);
    }

    public function test_la_lista_calcula_el_costo_real_sin_el_global_en_los_exentos(): void
    {
        $branch = Branch::create(['name' => 'A', 'extra_percentage' => 6]);
        $owner = $this->owner();
        $con = Product::create(['brand' => 'A', 'model' => 'Con', 'iva' => 0, 'extra' => 0, 'price' => 105, 'cost' => 100]);
        Product::create(['brand' => 'A', 'model' => 'Sin', 'iva' => 0, 'extra' => 0, 'price' => 105, 'cost' => 100, 'skip_global_extra' => true]);

        // Con 6% global el costo real es 106 > 105 (pérdida); sin global es 100 (no).
        $this->actingAs($owner)->withSession(['branch_id' => $branch->id])
            ->get(route('products', ['estado' => 'con_perdida']))
            ->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.model', 'Con'));
    }

    public function test_la_venta_de_caja_usa_el_extra_propio_en_los_exentos(): void
    {
        $branch = Branch::create(['name' => 'A', 'extra_percentage' => 10]);
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$branch->id]);
        $con = Product::create(['brand' => 'A', 'model' => 'Con', 'iva' => 0, 'extra' => 0, 'price' => 200, 'cost' => 100]);
        $sin = Product::create(['brand' => 'A', 'model' => 'Sin', 'iva' => 0, 'extra' => 0, 'price' => 200, 'cost' => 100, 'skip_global_extra' => true]);

        $this->actingAs($cashier)->withSession(['branch_id' => $branch->id])->post('/caja/ventas', [
            'items' => [['product_id' => $con->id, 'quantity' => 1], ['product_id' => $sin->id, 'quantity' => 1]],
            'cash_received' => 400,
        ])->assertSessionHasNoErrors();

        // Con: 100 × 1.10 = 110 · Sin: 100 (sin extra) → compra 210.
        $this->assertEquals(210, \App\Models\Note::sole()->purchase_total);
    }

    public function test_el_excel_marca_y_exporta_la_columna_sin_extra_global(): void
    {
        $branch = Branch::create(['name' => 'A']);
        $owner = $this->owner();

        $book = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $book->getActiveSheet()->fromArray([
            ['MARCA', 'MODELO', 'MEDIDA', 'MC', 'COSTO', 'SIN EXTRA GLOBAL'],
            ['A', 'Uno', '', '', 10, 'SI'],
            ['A', 'Dos', '', '', 10, ''],
        ]);
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($book))->save($path);
        $file = new \Illuminate\Http\UploadedFile($path, 'p.xlsx', null, null, true);

        $this->actingAs($owner)->withSession(['branch_id' => $branch->id])->post(route('import.products'), ['file' => $file]);

        $this->assertTrue(Product::where('model', 'Uno')->first()->skip_global_extra);
        $this->assertFalse(Product::where('model', 'Dos')->first()->skip_global_extra);

        $export = new \App\Exports\ProductsExport(null, $branch->id);
        $rows = $export->collection();
        $this->assertSame('SI', $export->map($rows->firstWhere('model', 'Uno'))[11]);
        $this->assertSame('', $export->map($rows->firstWhere('model', 'Dos'))[11]);
    }
}
