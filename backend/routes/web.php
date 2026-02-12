<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CertificateVerifyController;
use App\Http\Controllers\DesktopReleaseController;
use App\Http\Controllers\StorageController;

// Friendly desktop download URL: /downloads/Nazim.exe -> redirects to latest release (for updater)
Route::get('/downloads/{filename}', [DesktopReleaseController::class, 'downloadLatestAt'])
    ->where('filename', '[a-zA-Z0-9_.-]+')
    ->middleware('throttle:30,1');

// Serve public storage files via centralized StorageController (e.g. website images, media) - no auth required
Route::get('/storage/{path}', [StorageController::class, 'servePublic'])
    ->where('path', '.*');

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

// Certificate verification route (public, no auth required)
Route::get('/verify/certificate/{hash}', [CertificateVerifyController::class, 'show']);
