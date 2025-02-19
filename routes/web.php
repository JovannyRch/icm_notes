<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;


Route::get('/', function () {
    return redirect('/inicio');
});

Route::get('/inicio', [BranchController::class, 'index'])->middleware(['auth', 'verified'])->name('inicio');


Route::post('/nota', [NoteController::class, 'store'])->middleware(['auth', 'verified'])->name('notes.store');
//put
Route::put('/nota/{note}', [NoteController::class, 'update'])->middleware(['auth', 'verified'])->name('notes.update');

//delete
Route::delete('/nota/{note}', [NoteController::class, 'destroy'])->middleware(['auth', 'verified'])->name('notes.destroy');
Route::post('/nota/destroyItems', [NoteController::class, 'deleteNotes'])->middleware(['auth', 'verified'])->name('notes.destroy.items');


//archive routes
Route::patch('/nota/{note}/archive', [NoteController::class, 'switchArchive'])->middleware(['auth', 'verified'])->name('notes.archive');
Route::post('/branch/archive', [NoteController::class, 'archiveNotes'])->middleware(['auth', 'verified'])->name('notes.archive.items');
Route::post('/branch/unarchive', [NoteController::class, 'unarchiveNotes'])->middleware(['auth', 'verified'])->name('notes.unarchive.items');


//branches - detail
Route::get('/sucursal/{branch}/notas', [BranchController::class, 'show'])->middleware(['auth', 'verified'])->name('branches.notes');

Route::get('/sucursal/{branch}/crear-nota', [NoteController::class, 'create'])->middleware(['auth', 'verified'])->name('notes.create');
Route::get('/nota/{note}', [NoteController::class, 'show'])->middleware(['auth', 'verified'])->name('notes.show');




Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
