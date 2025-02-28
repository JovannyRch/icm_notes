<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\CorteController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImportController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;


Route::get('/', [NoteController::class, 'home'])->middleware(['auth', 'verified'])->name('notas');
Route::get('/productos', [ProductController::class, 'index'])->middleware(['auth', 'verified'])->name('products');
Route::get('/sucursal/{branch}/cortes', [CorteController::class, 'index'])->middleware(['auth', 'verified'])->name('cortes');



Route::post('/nota', [NoteController::class, 'store'])->middleware(['auth', 'verified'])->name('notes.store');
Route::put('/nota/{note}', [NoteController::class, 'update'])->middleware(['auth', 'verified'])->name('notes.update');
Route::post('/nota/{note}/destroy', [NoteController::class, 'destroy'])->middleware(['auth', 'verified'])->name('notes.destroy');
Route::post('/nota/destroyItems', [NoteController::class, 'deleteNotes'])->middleware(['auth', 'verified'])->name('notes.destroy.items');


//archive routes
Route::patch('/nota/{note}/archive', [NoteController::class, 'switchArchive'])->middleware(['auth', 'verified'])->name('notes.archive');
Route::post('/branch/archive', [NoteController::class, 'archiveNotes'])->middleware(['auth', 'verified'])->name('notes.archive.items');
Route::post('/branch/unarchive', [NoteController::class, 'unarchiveNotes'])->middleware(['auth', 'verified'])->name('notes.unarchive.items');

Route::get('/sucursal/{branch}/notas', [BranchController::class, 'show'])->middleware(['auth', 'verified'])->name('branches.notes');
Route::get('/sucursal/{branch}/crear-nota', [NoteController::class, 'create'])->middleware(['auth', 'verified'])->name('notes.create');
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
Route::get('/sucursal/{branch}/cortes/nuevo', [CorteController::class, 'create'])->middleware(['auth', 'verified'])->name('cortes.new');
Route::post('/cortes', [CorteController::class, 'store'])->middleware(['auth', 'verified'])->name('cortes.store');
Route::get('/corte/{corte}', [CorteController::class, 'show'])->middleware(['auth', 'verified'])->name('cortes.show');
Route::delete('/corte/{corte}', [CorteController::class, 'destroy'])->middleware(['auth', 'verified'])->name('cortes.destroy');
Route::get('/corte/download/{corte}', [CorteController::class, 'export'])->middleware(['auth', 'verified'])->name('cortes.export');


require __DIR__ . '/auth.php';
