<?php

// Generate application key
$key = 'base64:' . base64_encode(random_bytes(32));

// Read .env file
$envFile = __DIR__ . '/.env';
$content = file_get_contents($envFile);

// Replace APP_KEY line
$content = preg_replace('/^APP_KEY=.*$/m', 'APP_KEY=' . $key, $content);

// Write back
file_put_contents($envFile, $content);

echo "Application key generated successfully!\n";
echo "Key: " . $key . "\n";
