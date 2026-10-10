<?php

namespace Tests\Feature;

use App\Exports\ProductsExport;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/** Importar el catálogo con la columna EXISTENCIAS, y exportarlo con ella. */
class ProductImportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $a;

    private Branch $b;

    private const HEADERS = ['MARCA', 'MODELO', 'MEDIDA', 'MC', 'UNIDAD', 'PRECIO PUBLICO', 'COSTO', 'IVA', 'EXTRA', 'EXISTENCIAS'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->a = Branch::create(['name' => 'Sucursal A']);
        $this->b = Branch::create(['name' => 'Sucursal B']);
    }

    private function excel(array $rows): UploadedFile
    {
        $book = new Spreadsheet;
        $book->getActiveSheet()->fromArray(array_merge([self::HEADERS], $rows));
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        (new Xlsx($book))->save($path);

        return new UploadedFile($path, 'productos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    private function import(Branch $branch, array $rows)
    {
        return $this->actingAs($this->user)->withSession(['branch_id' => $branch->id])
            ->post(route('import.products'), ['file' => $this->excel($rows)]);
    }

    private function stock(Branch $branch, string $model): ?float
    {
        $id = Product::where('model', $model)->value('id');
        $q = Stock::where(['branch_id' => $branch->id, 'product_id' => $id])->value('quantity');

        return $q === null ? null : (float) $q;
    }

    public function test_import_creates_products_and_loads_stock_of_the_active_branch(): void
    {
        $this->import($this->a, [
            ['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 12],
            ['GOODYEAR', 'ASSURANCE', '185/65R14', '', 'PZA', 1500, 1100, 16, 0, null],
        ])->assertSessionHas('success', fn ($m) => str_contains($m, '2 productos nuevos') && str_contains($m, 'Sucursal A: 1'));

        $this->assertSame(2, Product::count());
        $this->assertSame(12.0, $this->stock($this->a, 'P7'));
        $this->assertNull($this->stock($this->a, 'ASSURANCE')); // vacía: no se toca
        $this->assertNull($this->stock($this->b, 'P7'));        // otra sucursal: no se toca
        $this->assertSame('Carga de existencias desde Excel', StockMovement::sole()->description);
    }

    public function test_reimporting_updates_instead_of_duplicating(): void
    {
        $this->import($this->a, [['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 12]]);

        // Otra sucursal sube su conteo con distinto formato de mayúsculas/espacios y otro precio.
        $this->import($this->b, [[' pirelli ', 'p7', '195/65R15', '', '', 1900, null, null, null, 5]])
            ->assertSessionHas('success', fn ($m) => str_contains($m, '0 productos nuevos, 1 actualizados'));

        $this->assertSame(1, Product::count());
        $product = Product::sole();
        $this->assertSame(1900.0, (float) $product->price);   // se actualizó
        $this->assertSame(1300.0, (float) $product->cost);    // celda vacía: no se borró
        $this->assertSame('PZA', $product->unit);
        $this->assertSame(['PIRELLI', 'P7'], [$product->brand, $product->model]); // el nombre no cambia
        $this->assertSame(12.0, $this->stock($this->a, 'P7'));
        $this->assertSame(5.0, $this->stock($this->b, 'P7'));
    }

    public function test_same_quantity_creates_no_movement_and_invalid_quantities_are_reported(): void
    {
        $this->import($this->a, [['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 12]]);
        $this->import($this->a, [
            ['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 12],
            ['MICHELIN', 'P4', '205/55R16', '', 'PZA', 2500, 1800, 16, 0, 'diez'],
        ])->assertSessionHas('error', fn ($m) => str_contains($m, 'Fila 3') && str_contains($m, 'diez'));

        $this->assertSame(1, StockMovement::count());
        $this->assertSame(2, Product::count()); // el producto con existencias inválidas sí se da de alta
        $this->assertNull($this->stock($this->a, 'P4'));
    }

    public function test_import_and_export_require_login(): void
    {
        $this->post(route('import.products'), ['file' => $this->excel([])])->assertRedirect(route('login'));
        $this->get(route('export.products'))->assertRedirect(route('login'));
        $this->assertSame(0, Product::count());
    }

    public function test_export_includes_stock_of_the_active_branch(): void
    {
        $this->import($this->a, [['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 12]]);
        $this->import($this->b, [['PIRELLI', 'P7', '195/65R15', '', 'PZA', 1800, 1300, 16, 0, 5]]);

        $rows = (new ProductsExport(null, $this->b->id))->collection();
        // Lo exportado se puede volver a importar: incluye el precio 2 (los archivos sin esa columna también se importan).
        $this->assertSame(['MARCA', 'MODELO', 'MEDIDA', 'MC', 'UNIDAD', 'PRECIO PUBLICO', 'PRECIO 2', 'COSTO', 'IVA', 'EXTRA', 'EXISTENCIAS'], (new ProductsExport)->headings());
        $this->assertSame(5.0, (float) $rows->first()->existencias);

        Excel::fake();
        $this->actingAs($this->user)->withSession(['branch_id' => $this->a->id])->get(route('export.products'))->assertOk();
        Excel::assertDownloaded('CATALAGO_DE_PRODUCTOS_'.date('d-m-Y').'.xlsx', fn (ProductsExport $e) => (float) $e->collection()->first()->existencias === 12.0);
    }

    public function test_import_reads_price2(): void
    {
        $book = new Spreadsheet;
        $book->getActiveSheet()->fromArray([
            ['MARCA', 'MODELO', 'MEDIDA', 'MC', 'UNIDAD', 'PRECIO PUBLICO', 'PRECIO 2', 'COSTO', 'IVA', 'EXTRA', 'EXISTENCIAS'],
            ['CASTEL', 'MARMOL', '60x60', '1.44', 'CAJA', 389, 350, 250, 16, 0, null],
        ]);
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        (new Xlsx($book))->save($path);

        $this->actingAs($this->user)->withSession(['branch_id' => $this->a->id])
            ->post(route('import.products'), ['file' => new UploadedFile($path, 'p.xlsx', null, null, true)])->assertSessionHasNoErrors();

        $this->assertEquals([389, 350], [(float) Product::sole()->price, (float) Product::sole()->price2]);
    }

    public function test_the_downloadable_template_imports_with_price2(): void
    {
        // La plantilla de "Descargar template" trae las mismas columnas que la exportación.
        $path = public_path('templates/template_productos.xlsx');
        $headers = \PhpOffice\PhpSpreadsheet\IOFactory::load($path)->getActiveSheet()->rangeToArray('A1:K1')[0];
        $this->assertSame((new ProductsExport)->headings(), $headers);

        $copy = tempnam(sys_get_temp_dir(), 'tpl').'.xlsx';
        copy($path, $copy);
        $this->actingAs($this->user)->withSession(['branch_id' => $this->a->id])
            ->post(route('import.products'), ['file' => new UploadedFile($copy, 'template_productos.xlsx', null, null, true)])->assertSessionHasNoErrors();

        $product = Product::sole();
        $this->assertEquals([1300, 1200, 1000], [(float) $product->price, (float) $product->price2, (float) $product->cost]);
    }
}
