<?php

namespace App\Controllers;

use PDO;

class RecurringTransactionController {
    private $db;
    private $userId;

    public function __construct($db, $userId) {
        $this->db = $db;
        $this->userId = $userId;
    }

    // Get all recurring transactions for user
    public function getRecurringTransactions() {
        try {
            $query = "
                SELECT rt.*, c.name as category_name, c.color, c.icon
                FROM recurring_transactions rt
                LEFT JOIN categories c ON rt.categoryId = c.id
                WHERE rt.userId = ?
                ORDER BY rt.createdAt DESC
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->userId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to fetch recurring transactions'];
        }
    }

    // Create new recurring transaction
    public function createRecurringTransaction($data) {
        try {
            $required = ['amount', 'categoryId', 'frequency', 'type'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    http_response_code(400);
                    return ['error' => "Missing required field: $field"];
                }
            }

            $query = "
                INSERT INTO recurring_transactions 
                (userId, amount, categoryId, description, type, frequency, dayOfMonth, dayOfWeek, startDate, endDate, isActive)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([
                $this->userId,
                $data['amount'],
                $data['categoryId'],
                $data['description'] ?? null,
                $data['type'],
                $data['frequency'],
                $data['dayOfMonth'] ?? null,
                $data['dayOfWeek'] ?? null,
                $data['startDate'] ?? date('Y-m-d'),
                $data['endDate'] ?? null,
                1
            ]);

            if ($result) {
                $id = $this->db->lastInsertId();
                http_response_code(201);
                return ['id' => $id, 'message' => 'Recurring transaction created'];
            } else {
                http_response_code(400);
                return ['error' => 'Failed to create recurring transaction'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Server error: ' . $e->getMessage()];
        }
    }

    // Update recurring transaction
    public function updateRecurringTransaction($id, $data) {
        try {
            // Verify ownership
            $query = "SELECT userId FROM recurring_transactions WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$record || $record['userId'] !== $this->userId) {
                http_response_code(403);
                return ['error' => 'Unauthorized'];
            }

            $updates = [];
            $values = [];
            $allowed = ['amount', 'categoryId', 'description', 'frequency', 'dayOfMonth', 'dayOfWeek', 'endDate', 'isActive'];
            
            foreach ($allowed as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }

            if (empty($updates)) {
                http_response_code(400);
                return ['error' => 'No fields to update'];
            }

            $values[] = $id;
            $query = "UPDATE recurring_transactions SET " . implode(', ', $updates) . " WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute($values);

            if ($result) {
                return ['message' => 'Recurring transaction updated'];
            } else {
                http_response_code(400);
                return ['error' => 'Failed to update'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Server error'];
        }
    }

    // Delete recurring transaction
    public function deleteRecurringTransaction($id) {
        try {
            // Verify ownership
            $query = "SELECT userId FROM recurring_transactions WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$record || $record['userId'] !== $this->userId) {
                http_response_code(403);
                return ['error' => 'Unauthorized'];
            }

            $query = "DELETE FROM recurring_transactions WHERE id = ?";
            $stmt = $this->db->prepare($query);
            
            if ($stmt->execute([$id])) {
                return ['message' => 'Recurring transaction deleted'];
            } else {
                http_response_code(400);
                return ['error' => 'Failed to delete'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Server error'];
        }
    }

    // Generate transactions from recurring patterns
    public function generateRecurringTransactions() {
        try {
            $query = "
                SELECT * FROM recurring_transactions
                WHERE userId = ? 
                AND isActive = true
                AND (endDate IS NULL OR endDate >= CURDATE())
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->userId]);
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
                        $this->userId,
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

            return ['generated' => $generated];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to generate transactions'];
        }
    }

    // Calculate next transaction date based on frequency
    private function calculateNextDate($rt) {
        $lastGenerated = $rt['lastGenerated'] ? strtotime($rt['lastGenerated']) : strtotime($rt['startDate']);
        $today = strtotime(date('Y-m-d'));

        switch ($rt['frequency']) {
            case 'DAILY':
                $nextDate = date('Y-m-d', strtotime('+1 day', $lastGenerated));
                break;
            case 'WEEKLY':
                $dayOfWeek = $rt['dayOfWeek'] ?? 0;
                $nextDate = date('Y-m-d', strtotime('next ' . $this->getDayName($dayOfWeek), $lastGenerated));
                break;
            case 'BIWEEKLY':
                $nextDate = date('Y-m-d', strtotime('+14 days', $lastGenerated));
                break;
            case 'MONTHLY':
                $dayOfMonth = $rt['dayOfMonth'] ?? date('d');
                $nextDate = date('Y-m-' . str_pad($dayOfMonth, 2, '0', STR_PAD_LEFT), strtotime('first day of next month', $lastGenerated));
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

    private function getDayName($dayOfWeek) {
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return $days[$dayOfWeek] ?? 'Monday';
    }
}
?>
