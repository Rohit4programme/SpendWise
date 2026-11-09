#!/usr/bin/env php
<?php
/**
 * Recurring Transaction Cron Job
 * 
 * This script should be scheduled to run daily via cron:
 * Linux/Mac: 0 0 * * * /usr/bin/php /path/to/spendwise/php/cron/recurring.php
 * 
 * Windows: Use Task Scheduler to run this daily at 00:00
 * Command: C:\php\php.exe C:\spendwise\php\cron\recurring.php
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../src/RecurringTransactionCron.php';

use App\Config\Database;
use App\RecurringTransactionCron;

try {
    // Initialize database connection
    $database = new Database();
    $db = $database->connect();

    // Create cron instance and execute
    $cron = new RecurringTransactionCron($db);
    $result = $cron->generateAll();

    // Log the execution
    RecurringTransactionCron::logExecution($result);

    // Output result
    echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
} catch (\Exception $e) {
    $error = [
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ];

    RecurringTransactionCron::logExecution($error);
    echo json_encode($error, JSON_PRETTY_PRINT) . PHP_EOL;
    exit(1);
}
?>
