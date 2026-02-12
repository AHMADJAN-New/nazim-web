<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Desktop download URL (for updater / updates.txt)
    |--------------------------------------------------------------------------
    */
    'download_path' => env('DESKTOP_DOWNLOAD_PATH', 'downloads'),
    'download_filename' => env('DESKTOP_DOWNLOAD_FILENAME', 'Nazim.exe'),

    /*
    |--------------------------------------------------------------------------
    | Updater section [Update] (Advanced Installer ;aiu; format)
    |--------------------------------------------------------------------------
    */
    'updater_flags' => env('DESKTOP_UPDATER_FLAGS', 'Critical'),
    'updater_registry_key' => env('DESKTOP_UPDATER_REGISTRY_KEY', 'HKLM\\Software\\Nazim\\Nazim\\Version'),

    /*
    |--------------------------------------------------------------------------
    | Use X-Accel-Redirect for downloads (nginx serves file directly = full speed)
    | Set to false when not behind nginx (e.g. local php artisan serve).
    |--------------------------------------------------------------------------
    */
    'use_x_accel_redirect' => env('DESKTOP_USE_X_ACCEL_REDIRECT', true),

];
