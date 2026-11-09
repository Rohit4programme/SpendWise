<?php
class DebtController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function getAll($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        try {
            $debts = $this->db->fetchAll(
                'SELECT * FROM debts WHERE user_id = ?',
                [$userId]
            );
            
            echo json_encode($debts);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch debts']);
        }
    }
    
    public function create($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        $creditor = $params['creditor'] ?? null;
        $amount = $params['amount'] ?? null;
        $interest_rate = $params['interest_rate'] ?? 0;
        $due_date = $params['due_date'] ?? null;
        
        if (!$creditor || !$amount) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $stmt = $this->db->query(
                'INSERT INTO debts (user_id, creditor, amount, interest_rate, due_date) VALUES (?, ?, ?, ?, ?)',
                [$userId, $creditor, $amount, $interest_rate, $due_date]
            );
            
            $debtId = $this->db->lastInsertId();
            
            http_response_code(201);
            echo json_encode([
                'id' => $debtId,
                'user_id' => $userId,
                'creditor' => $creditor,
                'amount' => $amount,
                'interest_rate' => $interest_rate,
                'due_date' => $due_date
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create debt']);
        }
    }
    
    public function update($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $debt = $this->db->fetch(
                'SELECT * FROM debts WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$debt) {
                http_response_code(404);
                echo json_encode(['error' => 'Debt not found']);
                return;
            }
            
            $amount = $params['amount'] ?? $debt['amount'];
            $interest_rate = $params['interest_rate'] ?? $debt['interest_rate'];
            $due_date = $params['due_date'] ?? $debt['due_date'];
            
            $this->db->query(
                'UPDATE debts SET amount = ?, interest_rate = ?, due_date = ? WHERE id = ?',
                [$amount, $interest_rate, $due_date, $id]
            );
            
            echo json_encode(['message' => 'Debt updated successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update debt']);
        }
    }
    
    public function delete($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $debt = $this->db->fetch(
                'SELECT * FROM debts WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$debt) {
                http_response_code(404);
                echo json_encode(['error' => 'Debt not found']);
                return;
            }
            
            $this->db->query(
                'DELETE FROM debts WHERE id = ?',
                [$id]
            );
            
            echo json_encode(['message' => 'Debt deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete debt']);
        }
    }
}
