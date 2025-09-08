<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CheckoutController;

Route::get('/pay', [CheckoutController::class, 'pay'])->name('checkout.pay');
Route::get('/test-encrypt', [CheckoutController::class, 'testEncrypt'])->name('test.encrypt');

// Optional success/failure routes for testing
Route::get('/yagoutpay/success', function () {
    return response()->json(['message' => 'Payment successful']);
})->name('yagoutpay.success');

Route::get('/yagoutpay/failure', function () {
    return response()->json(['message' => 'Payment failed']);
})->name('yagoutpay.failure');