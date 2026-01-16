<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$config = config('database.connections.pgsql');

// Connect to default 'postgres' database to create the new one
$dsn = "pgsql:host={$config['host']};port={$config['port']};dbname=postgres";
$username = $config['username'];
$password = $config['password'];

try {
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Check if database exists
    $stmt = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'nazim_testing'");
    if ($stmt->fetch()) {
        echo "Database 'nazim_testing' already exists.\n";
    } else {
        $pdo->exec("CREATE DATABASE nazim_testing");
        echo "Database 'nazim_testing' created successfully.\n";
    }
} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage() . "\n");
}

