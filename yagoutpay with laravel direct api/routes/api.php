<?php

use App\Http\Controllers\PaymentController;

Route::post('/pay', [PaymentController::class, 'makePayment']);
Route::post('/payment-callback', [PaymentController::class, 'paymentCallback']);
