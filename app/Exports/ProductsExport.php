<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    protected $brand;

    protected ?int $branchId;

    /** @param int|null $branchId sucursal cuyas existencias van en la columna EXISTENCIAS */
    public function __construct($brand = null, ?int $branchId = null)
    {
        $this->brand = $brand;
        $this->branchId = $branchId;
    }

    public function collection()
    {
        // Mismas columnas que lee ProductsImport, así el archivo exportado se puede
        // editar (p. ej. con el conteo físico) y volver a importar.
        return Product::query()
            ->when($this->brand, fn ($q) => $q->where('brand', $this->brand))
            ->leftJoin('stocks', fn ($join) => $join->on('stocks.product_id', '=', 'products.id')
                ->where('stocks.branch_id', $this->branchId ?? 0))
            ->orderBy('products.id')
            ->get(['products.brand', 'products.model', 'products.measure', 'products.mc', 'products.unit', 'products.price',
                'products.cost', 'products.iva', 'products.extra', 'stocks.quantity as existencias']);
    }

    public function headings(): array
    {
        return ['MARCA', 'MODELO', 'MEDIDA', 'MC', 'UNIDAD', 'PRECIO PUBLICO', 'COSTO', 'IVA', 'EXTRA', 'EXISTENCIAS'];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle($sheet->calculateWorksheetDimension())->getFont()->setSize(14);

        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '4F81BD']],
            ],
        ];
    }
}
