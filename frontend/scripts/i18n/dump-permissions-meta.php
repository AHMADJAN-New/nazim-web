<?php

declare(strict_types=1);

require __DIR__ . '/../../../backend/vendor/autoload.php';
require __DIR__ . '/../../../backend/database/seeders/PermissionSeeder.php';

$seen = [];
$rows = [];

foreach (Database\Seeders\PermissionSeeder::getPermissions() as $resource => $actions) {
    foreach ($actions as $action) {
        $name = "{$resource}.{$action}";
        if (isset($seen[$name])) {
            continue;
        }
        $seen[$name] = true;
        if (in_array($name, Database\Seeders\PermissionSeeder::getSuperAdminOnlyPermissions(), true)) {
            continue;
        }
        $rows[] = [
            'name' => $name,
            'resource' => $resource,
            'action' => $action,
            'dbDescription' => ucfirst((string) $action).' '.str_replace('_', ' ', $resource),
        ];
    }
}

usort($rows, fn ($a, $b) => strcmp($a['name'], $b['name']));

$out = __DIR__.'/_permissions-meta.json';
file_put_contents($out, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");

echo "Wrote ".count($rows)." rows to {$out}\n";
