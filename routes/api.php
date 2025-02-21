<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/products/search', [ProductController::class, 'search']);
Route::get('/branches', [BranchController::class, 'getList']);
