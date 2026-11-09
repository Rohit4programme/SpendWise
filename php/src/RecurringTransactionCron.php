<?php

namespace App;

use PDO;

class RecurringTransactionCron {
    private $db;
    private $apiUrl;

    public function __construct($db, $apiUrl = 'http://localhost:3000') {
        $this->db = $db;
        $this->apiUrl = $apiUrl;
    }

    /**
     * Execute recurring transaction generation for all users
     * Call this daily via cron: 0 0 * * * php /path/to/cron/recurring.php
     */
    public function generateAll(): array {
        try {
            // Get all active users with recurring transactions
            $query = "
                SELECT DISTINCT rt.userId
                FROM recurring_transactions rt
                WHERE rt.isActive = true
                AND (rt.endDate IS NULL OR rt.endDate >= CURDATE())
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $results = [
                'total_users' => count($users),
                'transactions_generated' => 0,
                'errors' => [],
                'timestamp' => date('Y-m-d H:i:s'),
            ];

            foreach ($users as $user) {
                $userId = $user['userId'];
                $generated = $this->generateForUser($userId);
                $results['transactions_generated'] += $generated;
            }

            return $results;
        } catch (\Exception $e) {
            return [
                'error' => 'Cron execution failed: ' . $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s'),
            ];
        }
    }

    /**
     * Generate transactions for a specific user
     */
    private function generateForUser(string $userId): int {
        try {
            $query = "
                SELECT * FROM recurring_transactions
                WHERE userId = ?
                AND isActive = true
                AND (endDate IS NULL OR endDate >= CURDATE())
                AND (lastGenerated IS NULL OR DATE(lastGenerated) < CURDATE())
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            $recurring = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $generated = 0;
            
            foreach ($recurring as $rt) {
                $nextDate = $this->calculateNextDate($rt);
                
                if ($nextDate && strtotime($nextDate) <= strtotime(date('Y-m-d'))) {
                    // Create transaction
                    $insertQuery = "
                        INSERT INTO transactions 
                        (userId, amount, categoryId, description, date, type, recurringTransactionId)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ";
                    
                    $insertStmt = $this->db->prepare($insertQuery);
                    $insertStmt->execute([
                        $userId,
                        $rt['amount'],
                        $rt['categoryId'],
                        $rt['description'],
                        $nextDate,
                        $rt['type'],
                        $rt['id']
                    ]);

                    // Update lastGenerated
                    $updateQuery = "UPDATE recurring_transactions SET lastGenerated = ? WHERE id = ?";
                    $updateStmt = $this->db->prepare($updateQuery);
                    $updateStmt->execute([date('Y-m-d H:i:s'), $rt['id']]);
                    
                    $generated++;
                }
            }

            return $generated;
        } catch (\Exception $e) {
            error_log("Error generating transactions for user $userId: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Calculate next transaction date based on frequency
     */
    private function calculateNextDate(array $rt): ?string {
        $lastGenerated = $rt['lastGenerated'] ? strtotime($rt['lastGenerated']) : strtotime($rt['startDate']);
        $today = strtotime(date('Y-m-d'));

        switch ($rt['frequency']) {
            case 'DAILY':
                $nextDate = date('Y-m-d', strtotime('+1 day', $lastGenerated));
                break;
            case 'WEEKLY':
                $dayOfWeek = $rt['dayOfWeek'] ?? 1;
                $nextDate = date('Y-m-d', strtotime('next ' . $this->getDayName($dayOfWeek), $lastGenerated));
                break;
            case 'BIWEEKLY':
                $nextDate = date('Y-m-d', strtotime('+14 days', $lastGenerated));
                break;
            case 'MONTHLY':
                $dayOfMonth = $rt['dayOfMonth'] ?? date('d', $lastGenerated);
                $nextMonth = strtotime('first day of next month', $lastGenerated);
                $nextDate = date('Y-m-' . str_pad($dayOfMonth, 2, '0', STR_PAD_LEFT), $nextMonth);
                break;
            case 'QUARTERLY':
                $nextDate = date('Y-m-d', strtotime('+3 months', $lastGenerated));
                break;
            case 'YEARLY':
                $nextDate = date('Y-m-d', strtotime('+1 year', $lastGenerated));
                break;
            default:
                return null;
        }

        return ($nextDate && strtotime($nextDate) <= $today) ? $nextDate : null;
    }

    private function getDayName(int $dayOfWeek): string {
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return $days[$dayOfWeek] ?? 'Monday';
    }

    /**
     * Log cron execution
     */
    public static function logExecution(array $result): void {
        $logFile = __DIR__ . '/../../logs/recurring_cron.log';
        
        // Create logs directory if it doesn't exist
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $message = json_encode($result) . PHP_EOL;
        file_put_contents($logFile, $message, FILE_APPEND);
    }
}
?>
