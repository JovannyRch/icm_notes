<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\CajaController;
use App\Http\Controllers\CorteController;
use App\Http\Controllers\CorteSemanalController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\PdfController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServicePaymentController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockEntryController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
| Cada ruta va en el bloque del permiso que la protege (config/permissions.php).
| tests/Feature/RouteAuthorizationTest.php falla si una ruta queda sin auth o sin
| permiso: al agregar una ruta, ponla en su bloque.
*/

Route::get('/', fn () => redirect()->route('dashboard'));

Route::middleware(['auth', 'verified'])->group(function () {

    // Pantalla inicial: quien no tiene dashboard (cajero) se va a su pantalla (ver controlador).
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Cambiar de sucursal: sólo a una de las asignadas al usuario.
    Route::post('/set-branch', function (Request $request) {
        $request->validate(['branch_id' => 'required|exists:branches,id']);
        abort_unless($request->user()->canAccessBranch((int) $request->branch_id), 403, 'No tienes acceso a esa sucursal.');
        session()->put('branch_id', (int) $request->branch_id);
        session()->save();

        return response()->json(['message' => 'Branch set successfully'], 200);
    })->name('set-branch');

    Route::get('/api/branches', [BranchController::class, 'getList']);

    // Volver a la cuenta del super_admin tras "entrar como" (el controlador valida la sesión).
    Route::post('/admin/volver-a-mi-cuenta', [ImpersonationController::class, 'stop'])->name('impersonation.stop');

    // --- Caja ---------------------------------------------------------------
    Route::middleware('can:sales.create')->group(function () {
        Route::get('/caja', [CajaController::class, 'index'])->name('caja');
    });

    // --- Dashboard -----------------------------------------------------------
    Route::middleware('can:dashboard.view')->group(function () {
        Route::get('/dashboard/exportar', [DashboardController::class, 'export'])->name('dashboard.export');
    });

    // --- Notas de venta ------------------------------------------------------
    Route::middleware('can:notes.view')->group(function () {
        Route::get('/notas', [NoteController::class, 'index'])->name('notas');
        Route::get('/api/notes/status/pending', [NoteController::class, 'getPendingNotes']);
    });

    Route::middleware('can:notes.manage')->group(function () {
        Route::get('/nota/crear', [NoteController::class, 'create'])->name('notes.create');
        Route::post('/nota', [NoteController::class, 'store'])->name('notes.store');
        Route::get('/nota/{note}', [NoteController::class, 'show'])->name('notes.show');
        Route::put('/nota/{note}', [NoteController::class, 'update'])->name('notes.update');
        Route::post('/nota/{note}/destroy', [NoteController::class, 'destroy'])->name('notes.destroy');
        Route::post('/nota/destroyItems', [NoteController::class, 'deleteNotes'])->name('notes.destroy.items');
        Route::patch('/nota/{note}/archive', [NoteController::class, 'switchArchive'])->name('notes.archive');
        Route::post('/branch/archive', [NoteController::class, 'archiveNotes'])->name('notes.archive.items');
        Route::post('/branch/unarchive', [NoteController::class, 'unarchiveNotes'])->name('notes.unarchive.items');
    });

    // --- Búsqueda de productos y existencias (notas, caja, notas de entrada) ---
    Route::middleware('can:products.search')->group(function () {
        Route::get('/api/products/search', [ProductController::class, 'search']);
        Route::get('/api/products/stock', [ProductController::class, 'stockByIds']);
    });

    // --- Productos ------------------------------------------------------------
    Route::middleware('can:products.manage')->group(function () {
        Route::get('/productos', [ProductController::class, 'index'])->name('products');
        Route::get('/productos/crear', [ProductController::class, 'create'])->name('products.create');
        Route::post('/productos', [ProductController::class, 'store'])->name('products.store');
        Route::get('/productos/{product}', [ProductController::class, 'show'])->name('products.show');
        Route::put('/productos/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('/productos/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
        Route::post('/productos/destroy/items', [ProductController::class, 'destroyItems'])->name('products.destroy.items');
        Route::post('/productos/destroy/all', [ProductController::class, 'destroyAll'])->name('products.destroy.all');
        // Importa/exporta catálogo y existencias de la sucursal activa.
        Route::post('/import-products', [ProductImportController::class, 'store'])->name('import.products');
        Route::get('/export-products', [ProductImportController::class, 'export'])->name('export.products');
    });

    // --- Inventario -----------------------------------------------------------
    Route::middleware('can:stock.manage')->group(function () {
        Route::resource('stock', StockController::class)->only(['index', 'store'])->names([
            'index' => 'stock.index',
            'store' => 'stock.store',
        ]);
        Route::post('/stock-movements', [StockMovementController::class, 'store'])->name('stock-movements.store');
        Route::get('/nota-entrada/crear', [StockEntryController::class, 'create'])->name('stock-entries.create');
        Route::post('/nota-entrada', [StockEntryController::class, 'store'])->name('stock-entries.store');
        Route::put('/sucursales/{branch}/extra', [BranchController::class, 'updateExtra'])->name('branches.extra.update');
    });

    // --- Cortes ---------------------------------------------------------------
    Route::middleware('can:cortes.manage')->group(function () {
        Route::get('/cortes', [CorteController::class, 'index'])->name('cortes');
        Route::get('/cortes/crear', [CorteController::class, 'create'])->name('cortes.new');
        Route::post('/cortes', [CorteController::class, 'store'])->name('cortes.store');
        Route::get('/corte/{corte}', [CorteController::class, 'show'])->name('cortes.show');
        Route::delete('/corte/{corte}', [CorteController::class, 'destroy'])->name('cortes.destroy');
        Route::get('/corte/download/{corte}', [PdfController::class, 'exportCorte'])->name('cortes.export');
        Route::get('/api/notes/{branchId}/searchByFolio/{folio}', [NoteController::class, 'searchNoteByFolio']);
        Route::get('/api/notes/{branch}/{date}', [NoteController::class, 'getNotesByDate'])->name('api.notas.corte');

        Route::get('/corte_semanales', [CorteSemanalController::class, 'index'])->name('cortes_semanales.index');
        Route::get('/corte_semanales/crear', [CorteSemanalController::class, 'create'])->name('cortes_semanales.create');
        Route::post('/corte_semanal', [CorteSemanalController::class, 'store'])->name('cortes_semanales.store');
        Route::get('/corte_semanal/{corte}', [CorteSemanalController::class, 'show'])->name('cortes_semanales.show');
        Route::delete('/corte_semanal/{corte}', [CorteSemanalController::class, 'destroy'])->name('cortes_semanales.destroy');
        Route::post('/api/export/corte_semanal', [CorteSemanalController::class, 'exportCorteSemanal'])->name('cortes_semanales.export');
    });

    // --- Sistema (sólo super_admin; 404 para los demás, la pantalla no se delata) -----
    Route::middleware('hidden:billing.manage')->group(function () {
        Route::get('/admin/pagos-servicio', [ServicePaymentController::class, 'index'])->name('service-payments.index');
        Route::post('/admin/pagos-servicio', [ServicePaymentController::class, 'store'])->name('service-payments.store');
        Route::delete('/admin/pagos-servicio/{servicePayment}', [ServicePaymentController::class, 'destroy'])->name('service-payments.destroy');
    });

    Route::middleware('hidden:users.manage')->group(function () {
        Route::get('/admin/usuarios', [UserController::class, 'index'])->name('users.index');
        Route::get('/admin/usuarios/crear', [UserController::class, 'create'])->name('users.create');
        Route::post('/admin/usuarios', [UserController::class, 'store'])->name('users.store');
        Route::get('/admin/usuarios/{user}', [UserController::class, 'edit'])->name('users.edit');
        Route::put('/admin/usuarios/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('/admin/usuarios/{user}/activo', [UserController::class, 'toggleActive'])->name('users.toggle-active');
        Route::post('/admin/usuarios/{user}/entrar', [ImpersonationController::class, 'start'])->name('impersonation.start');
    });
});

require __DIR__ . '/auth.php';
