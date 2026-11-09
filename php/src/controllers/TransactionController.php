<?php
class TransactionController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function getAll($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        try {
            $transactions = $this->db->fetchAll(
                'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC',
                [$userId]
            );
            
            echo json_encode($transactions);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch transactions']);
        }
    }
    
    public function create($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        $amount = $params['amount'] ?? null;
        $category = $params['category'] ?? null;
        $type = $params['type'] ?? 'expense';
        $description = $params['description'] ?? '';
        $date = $params['date'] ?? date('Y-m-d H:i:s');
        
        if (!$amount || !$category) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $stmt = $this->db->query(
                'INSERT INTO transactions (user_id, amount, category, type, description, date) VALUES (?, ?, ?, ?, ?, ?)',
                [$userId, $amount, $category, $type, $description, $date]
            );
            
            $transactionId = $this->db->lastInsertId();
            
            http_response_code(201);
            echo json_encode([
                'id' => $transactionId,
                'user_id' => $userId,
                'amount' => $amount,
                'category' => $category,
                'type' => $type,
                'description' => $description,
                'date' => $date
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create transaction']);
        }
    }
    
    public function update($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $transaction = $this->db->fetch(
                'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$transaction) {
                http_response_code(404);
                echo json_encode(['error' => 'Transaction not found']);
                return;
            }
            
            $amount = $params['amount'] ?? $transaction['amount'];
            $category = $params['category'] ?? $transaction['category'];
            $description = $params['description'] ?? $transaction['description'];
            
            $this->db->query(
                'UPDATE transactions SET amount = ?, category = ?, description = ? WHERE id = ?',
                [$amount, $category, $description, $id]
            );
            
            echo json_encode(['message' => 'Transaction updated successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update transaction']);
        }
    }
    
    public function delete($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $transaction = $this->db->fetch(
                'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$transaction) {
                http_response_code(404);
                echo json_encode(['error' => 'Transaction not found']);
                return;
            }
            
            $this->db->query(
                'DELETE FROM transactions WHERE id = ?',
                [$id]
            );
            
            echo json_encode(['message' => 'Transaction deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete transaction']);
        }
    }
}
