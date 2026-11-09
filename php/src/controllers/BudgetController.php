<?php
class BudgetController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function getAll($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        try {
            $budgets = $this->db->fetchAll(
                'SELECT * FROM budgets WHERE user_id = ?',
                [$userId]
            );
            
            echo json_encode($budgets);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch budgets']);
        }
    }
    
    public function create($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        $category = $params['category'] ?? null;
        $limit = $params['limit'] ?? null;
        $spent = $params['spent'] ?? 0;
        
        if (!$category || !$limit) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $stmt = $this->db->query(
                'INSERT INTO budgets (user_id, category, limit_amount, spent) VALUES (?, ?, ?, ?)',
                [$userId, $category, $limit, $spent]
            );
            
            $budgetId = $this->db->lastInsertId();
            
            http_response_code(201);
            echo json_encode([
                'id' => $budgetId,
                'user_id' => $userId,
                'category' => $category,
                'limit' => $limit,
                'spent' => $spent
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create budget']);
        }
    }
    
    public function update($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $budget = $this->db->fetch(
                'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$budget) {
                http_response_code(404);
                echo json_encode(['error' => 'Budget not found']);
                return;
            }
            
            $limit = $params['limit'] ?? $budget['limit_amount'];
            $spent = $params['spent'] ?? $budget['spent'];
            
            $this->db->query(
                'UPDATE budgets SET limit_amount = ?, spent = ? WHERE id = ?',
                [$limit, $spent, $id]
            );
            
            echo json_encode(['message' => 'Budget updated successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update budget']);
        }
    }
    
    public function delete($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        $id = $params['id'] ?? null;
        
        try {
            $budget = $this->db->fetch(
                'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
                [$id, $userId]
            );
            
            if (!$budget) {
                http_response_code(404);
                echo json_encode(['error' => 'Budget not found']);
                return;
            }
            
            $this->db->query(
                'DELETE FROM budgets WHERE id = ?',
                [$id]
            );
            
            echo json_encode(['message' => 'Budget deleted successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete budget']);
        }
    }
}
