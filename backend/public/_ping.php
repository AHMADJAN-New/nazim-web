<?php
header('Content-Type: text/plain');
echo "PING OK\n";
echo "SAPI=" . php_sapi_name() . "\n";
echo "SCRIPT_FILENAME=" . ($_SERVER['SCRIPT_FILENAME'] ?? '') . "\n";
