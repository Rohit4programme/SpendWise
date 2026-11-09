<?php
class IncomeController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function getAll($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        try {
            $income = $this->db->fetchAll(
                'SELECT * FROM income WHERE user_id = ? ORDER BY date DESC',
                [$userId]
            );
            
            echo json_encode($income);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch income']);
        }
    }
    
    public function create($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        $amount = $params['amount'] ?? null;
        $source = $params['source'] ?? null;
        $description = $params['description'] ?? '';
        $date = $params['date'] ?? date('Y-m-d H:i:s');
        
        if (!$amount || !$source) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $stmt = $this->db->query(
                'INSERT INTO income (user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?)',
                [$userId, $amount, $source, $description, $date]
            );
            
            $incomeId = $this->db->lastInsertId();
            
            http_response_code(201);
            echo json_encode([
                'id' => $incomeId,
                'user_id' => $userId,
                'amount' => $amount,
                'source' => $source,
                'description' => $description,
                'date' => $date
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create income']);
        }
    }
    
    public function delete($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $income = $this->db->fetch(
                'SELECT * FROM income WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$income) {
                http_response_code(404);
                echo json_encode(['error' => 'Income record not found']);
                return;
            }
            
            $this->db->query(
                'DELETE FROM income WHERE id = ?',
                [$id]
            );
            
            echo json_encode(['message' => 'Income deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete income']);
        }
    }
}
