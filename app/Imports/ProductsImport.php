<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Importa el catálogo desde Excel (encabezados en español, ver la plantilla).
 *
 * - Un producto que ya existe (misma marca, modelo, medida y MC, sin importar
 *   mayúsculas ni espacios) se ACTUALIZA en lugar de duplicarse, y sólo con las
 *   columnas que traen valor: una celda vacía no borra nada.
 * - La columna EXISTENCIAS fija las existencias de la sucursal que importa
 *   (conteo físico); vacía no toca el stock.
 */
class ProductsImport implements ToCollection, WithHeadingRow
{
    public int $created = 0;

    public int $updated = 0;

    public int $stockLoaded = 0;

    /** @var string[] */
    public array $errors = [];

    public function __construct(private int $branchId) {}

    public function collection(Collection $rows): void
    {
        $catalog = Product::get()->keyBy(fn (Product $p) => self::key($p->brand, $p->model, $p->measure, $p->mc));
        $stock = new StockService;

        foreach ($rows as $index => $row) {
            $row = $row->toArray();
            $line = $index + 2; // fila 1 = encabezados

            if (self::blank($row['marca'] ?? null) && self::blank($row['modelo'] ?? null) && self::blank($row['medida'] ?? null)
                && self::blank($row['mc'] ?? null) && self::blank($row['costo'] ?? null)) {
                continue;
            }

            $values = array_filter([
                'brand' => $row['marca'] ?? null,
                'model' => $row['modelo'] ?? null,
                'measure' => $row['medida'] ?? null,
                'mc' => $row['mc'] ?? null,
                'unit' => $row['unidad'] ?? null,
                'cost' => $row['costo'] ?? null,
                'price' => $row['precio_venta'] ?? $row['precio_publico'] ?? $row['precio_público'] ?? $row['precio'] ?? null,
                'iva' => $row['iva'] ?? null,
                'extra' => $row['extra'] ?? null,
            ], fn ($v) => ! self::blank($v));

            $key = self::key($values['brand'] ?? null, $values['model'] ?? null, $values['measure'] ?? null, $values['mc'] ?? null);
            $product = $catalog->get($key);

            if ($product) {
                // Marca, modelo, medida y MC identifican al producto: se conservan como
                // están en el catálogo (la fila pudo venir con otras mayúsculas/espacios).
                $product->update(array_diff_key($values, array_flip(['brand', 'model', 'measure', 'mc'])));
                $this->updated++;
            } else {
                // Valores por omisión de siempre para productos nuevos.
                $product = Product::create($values + ['cost' => 0.0, 'price' => 0.0, 'iva' => 16, 'extra' => 0]);
                $catalog->put($key, $product);
                $this->created++;
            }

            $quantity = $row['existencias'] ?? null;
            if (self::blank($quantity)) {
                continue;
            }
            if (! is_numeric($quantity) || $quantity < 0) {
                $this->errors[] = "Fila {$line}: existencias \"{$quantity}\" no es un número válido; no se cargó.";

                continue;
            }

            $current = Stock::where(['branch_id' => $this->branchId, 'product_id' => $product->id])->value('quantity');
            if ($current !== null && abs((float) $current - (float) $quantity) < 0.0001) {
                continue; // ya tiene esa cantidad: sin movimiento de más en el historial
            }

            $stock->adjustStock($this->branchId, $product->id, (float) $quantity, 'ADJUSTMENT', null, 'Carga de existencias desde Excel');
            $this->stockLoaded++;
        }
    }

    private static function blank($value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '');
    }

    private static function key($brand, $model, $measure, $mc): string
    {
        $norm = fn ($v) => mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $v)));

        return implode('|', [$norm($brand), $norm($model), $norm($measure), $norm($mc)]);
    }
}
