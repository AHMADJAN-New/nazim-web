<?php
header('Content-Type: application/json');
echo json_encode([
  'ok' => true,
  'time' => date('c'),
  'sapi' => php_sapi_name(),
], JSON_PRETTY_PRINT);
