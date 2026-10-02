<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Catálogo de consulta para el mostrador (cajeros): precios, m² por caja y existencias
 * de la sucursal. Nunca expone costo, IVA, extra ni utilidades: sólo se seleccionan
 * columnas seguras, y los datos salen ya armados (no el modelo completo).
 */
class CatalogController extends Controller
{
    public const SORTS = ['marca', 'precio_asc', 'precio_desc', 'existencias'];

    public function index(Request $request)
    {
        $user = $request->user();
        $branch = Branch::find(currentBranchId());
        $seeStock = $user->can('stock.view') || $user->can('costs.view');

        $filters = [
            'q' => trim((string) $request->input('q', '')),
            'brand' => $request->input('brand') ?: null,
            'in_stock' => $seeStock && $request->boolean('con_existencias'),
            'sort' => in_array($request->input('sort'), self::SORTS, true) ? $request->input('sort') : 'marca',
        ];

        $query = Product::query()->select(['products.id', 'products.brand', 'products.model', 'products.measure', 'products.mc', 'products.unit', 'products.price']);

        if ($seeStock && $branch) {
            $query->addSelect([
                'branch_stock' => Stock::select('quantity')->whereColumn('stocks.product_id', 'products.id')->where('stocks.branch_id', $branch->id)->limit(1),
                'branch_counted_at' => Stock::select('counted_at')->whereColumn('stocks.product_id', 'products.id')->where('stocks.branch_id', $branch->id)->limit(1),
            ]);
        }

        $this->search($query, $filters['q']);
        $query->when($filters['brand'], fn ($q, $brand) => $q->where('products.brand', $brand));
        $query->when($filters['in_stock'] && $branch, fn ($q) => $q->whereExists(fn ($s) => $s->select(DB::raw(1))->from('stocks')
            ->whereColumn('stocks.product_id', 'products.id')->where('stocks.branch_id', $branch->id)->where('stocks.quantity', '>', 0)));

        match ($filters['sort']) {
            'precio_asc' => $query->orderBy('products.price'),
            'precio_desc' => $query->orderByDesc('products.price'),
            'existencias' => $seeStock ? $query->orderByDesc('branch_stock') : null,
            default => $query->orderBy('products.brand')->orderBy('products.model'),
        };
        $query->orderBy('products.id'); // desempate estable entre motores

        $pagination = $query->paginate(30)->withQueryString();
        $pagination->setCollection($pagination->getCollection()->map(fn (Product $p) => $this->present($p, $seeStock)));

        return Inertia::render('Catalog/Index', [
            'pagination' => $pagination,
            'brands' => Product::query()->whereNotNull('brand')->where('brand', '!=', '')->distinct()->orderBy('brand')->pluck('brand'),
            'filters' => $filters,
            'seeStock' => $seeStock,
            'canSell' => $user->can('sales.create'),
            'branch' => $branch?->only('id', 'name'),
        ]);
    }

    /** Lo único que ve el mostrador de cada producto. */
    private function present(Product $p, bool $seeStock): array
    {
        $mc = str_replace(',', '.', trim((string) $p->mc));
        $perBox = is_numeric($mc) && (float) $mc > 0 ? (float) $mc : null;
        $quantity = $p->getAttribute('branch_stock');
        $counted = $p->getAttribute('branch_counted_at') !== null;
        // Igual que showsStock() en el frontend: número si se contó o si ya se movió.
        $stock = $seeStock && ($counted || ($quantity !== null && (float) $quantity != 0)) ? (float) $quantity : null;

        return [
            'id' => $p->id,
            'brand' => $p->brand,
            'model' => $p->model,
            'measure' => $p->measure,
            'mc' => $p->mc,
            'unit' => $p->unit,
            'price' => (float) $p->price,
            'm2_per_box' => $perBox,
            'price_per_m2' => $perBox ? round((float) $p->price / $perBox, 2) : null,
            'stock' => $stock,
            'counted' => $counted,
        ];
    }

    /** Cada palabra debe aparecer en marca, modelo, medida, m² o unidad (nunca en costo). */
    private function search(Builder $query, string $text): void
    {
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
        foreach (preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) as $word) {
            $query->where(fn ($q) => $q->where('products.brand', $like, "%{$word}%")
                ->orWhere('products.model', $like, "%{$word}%")
                ->orWhere('products.measure', $like, "%{$word}%")
                ->orWhere('products.mc', $like, "%{$word}%")
                ->orWhere('products.unit', $like, "%{$word}%"));
        }
    }
}
