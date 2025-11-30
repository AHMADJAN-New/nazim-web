<?php

use Illuminate\Support\Facades\Route;

// Serve landing page - redirects to frontend React app
Route::get('/', function () {
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:8080');
    // Redirect to frontend React app which has the full landing page
    return redirect($frontendUrl);
});

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Nazim API',
        'version' => '1.0.0',
    ]);
});
