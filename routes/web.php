<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\CorteController;
use App\Http\Controllers\CorteSemanalController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\PdfController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::get('/notas', [NoteController::class, 'index'])->middleware(['auth', 'verified'])->name('notas');

Route::get('/', function () {
    return redirect()->route('notas');
});

Route::get('/dashboard', function () {
    return redirect()->route('notas');
});


Route::get('/productos', [ProductController::class, 'index'])->middleware(['auth', 'verified'])->name('products');
Route::get('/cortes', [CorteController::class, 'index'])->middleware(['auth', 'verified'])->name('cortes');



Route::post('/nota', [NoteController::class, 'store'])->middleware(['auth', 'verified'])->name('notes.store');
Route::put('/nota/{note}', [NoteController::class, 'update'])->middleware(['auth', 'verified'])->name('notes.update');
Route::post('/nota/{note}/destroy', [NoteController::class, 'destroy'])->middleware(['auth', 'verified'])->name('notes.destroy');
Route::post('/nota/destroyItems', [NoteController::class, 'deleteNotes'])->middleware(['auth', 'verified'])->name('notes.destroy.items');


//archive routes
Route::patch('/nota/{note}/archive', [NoteController::class, 'switchArchive'])->middleware(['auth', 'verified'])->name('notes.archive');
Route::post('/branch/archive', [NoteController::class, 'archiveNotes'])->middleware(['auth', 'verified'])->name('notes.archive.items');
Route::post('/branch/unarchive', [NoteController::class, 'unarchiveNotes'])->middleware(['auth', 'verified'])->name('notes.unarchive.items');

Route::get('/nota/crear', [NoteController::class, 'create'])->middleware(['auth', 'verified'])->name('notes.create');
Route::get('/nota/{note}', [NoteController::class, 'show'])->middleware(['auth', 'verified'])->name('notes.show');




Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


//Files
Route::post('/import-products', [ProductImportController::class, 'store'])->name('import.products');
Route::get('/export-products', [ProductImportController::class, 'export'])->name('export.products');



//Products
Route::post('/productos/destroy/items', [ProductController::class, 'destroyItems'])->middleware(['auth', 'verified'])->name('products.destroy.items');
Route::post('/productos/destroy/all', [ProductController::class, 'destroyAll'])->middleware(['auth', 'verified'])->name('products.destroy.all');
Route::get('/productos/crear', [ProductController::class, 'create'])->middleware(['auth', 'verified'])->name('products.create');
Route::get('/productos/{product}', [ProductController::class, 'show'])->middleware(['auth', 'verified'])->name('products.show');
Route::put('/productos/{product}', [ProductController::class, 'update'])->middleware(['auth', 'verified'])->name('products.update');
Route::post('/productos', [ProductController::class, 'store'])->middleware(['auth', 'verified'])->name('products.store');
Route::delete('/productos/{product}', [ProductController::class, 'destroy'])->middleware(['auth', 'verified'])->name('products.destroy');



//Cortes
Route::get('/cortes/crear', [CorteController::class, 'create'])->middleware(['auth', 'verified'])->name('cortes.new');
Route::post('/cortes', [CorteController::class, 'store'])->middleware(['auth', 'verified'])->name('cortes.store');
Route::get('/corte/{corte}', [CorteController::class, 'show'])->middleware(['auth', 'verified'])->name('cortes.show');
Route::delete('/corte/{corte}', [CorteController::class, 'destroy'])->middleware(['auth', 'verified'])->name('cortes.destroy');
Route::get('/corte/download/{corte}', [PdfController::class, 'exportCorte'])->middleware(['auth', 'verified'])->name('cortes.export');

//Corte Semanal
Route::get('/corte_semanales', [CorteSemanalController::class, 'index'])->middleware(['auth', 'verified'])->name('cortes_semanales.index');
Route::get('/corte_semanales/crear', [CorteSemanalController::class, 'create'])->middleware(['auth', 'verified'])->name('cortes_semanales.create');
Route::post('/corte_semanal', [CorteSemanalController::class, 'store'])->middleware(['auth', 'verified'])->name('cortes_semanales.store');
Route::get('/corte_semanal/{corte}', [CorteSemanalController::class, 'show'])->middleware(['auth', 'verified'])->name('cortes_semanales.show');
Route::delete('/corte_semanal/{corte}', [CorteSemanalController::class, 'destroy'])->middleware(['auth', 'verified'])->name('cortes_semanales.destroy');


//Stock
Route::resource('stock', StockController::class)->only(['index', 'store'])->middleware(['auth', 'verified'])->names([
    'index' => 'stock.index',
    'store' => 'stock.store',
]);

//stock-movements.store
Route::post('/stock-movements', [StockMovementController::class, 'store'])->middleware(['auth', 'verified'])->name('stock-movements.store');

Route::post('/set-branch', function (Request $request) {
    $request->validate(['branch_id' => 'required|exists:branches,id']);
    session()->put('branch_id', $request->branch_id);
    session()->save();

    return response()->json(['message' => 'Branch set successfully'], 200);
})->name('set-branch');



require __DIR__ . '/auth.php';
