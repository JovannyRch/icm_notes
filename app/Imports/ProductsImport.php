<?php

namespace App\Imports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductsImport implements ToModel, WithHeadingRow
{
    /**
     * @param array $row
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {

        if (empty($row['codigo']) && empty($row['modelo']) && empty($row['medida']) && empty($row['mc']) && empty($row['costo']) && empty($row['medida'])) {
            return null;
        }

        return new Product([
            'code'  => $row['codigo'] ?? $row['código'] ?? null,
            'type' => $row['tipo'] ?? null,
            'brand' => $row['marca'] ?? null,
            'model' => $row['modelo'] ?? null,
            'measure' => $row['medida'] ?? null,
            'mc' => $row['mc'] ?? null,
            'unit' => $row['unidad'] ?? null,
            'cost' => $row['costo'] ?? 0.0,
            'price' => $row['precio'] ?? 0.0,
            'iva' => $row['iva'] ?? 16,
            'extra' => $row['extra'] ?? 0,
        ]);
    }
}
