<?php
class DashboardController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function getSummary($params) {
        $authData = AuthMiddleware::verifyToken();
        $userId = $authData['userId'];
        
        try {
            // Get total expenses
            $expensesResult = $this->db->fetch(
                'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "expense"',
                [$userId]
            );
            $totalExpenses = $expensesResult['total'] ?? 0;
            
            // Get total income
            $incomeResult = $this->db->fetch(
                'SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = ?',
                [$userId]
            );
            $totalIncome = $incomeResult['total'] ?? 0;
            
            // Get total debts
            $debtsResult = $this->db->fetch(
                'SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE user_id = ?',
                [$userId]
            );
            $totalDebts = $debtsResult['total'] ?? 0;
            
            // Get category breakdown
            $categoryBreakdown = $this->db->fetchAll(
                'SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "expense" GROUP BY category',
                [$userId]
            );
            
            // Get budget status
            $budgets = $this->db->fetchAll(
                'SELECT category, limit_amount, spent FROM budgets WHERE user_id = ?',
                [$userId]
            );
            
            $summary = [
                'totalIncome' => (float)$totalIncome,
                'totalExpenses' => (float)$totalExpenses,
                'balance' => (float)($totalIncome - $totalExpenses),
                'totalDebts' => (float)$totalDebts,
                'categoryBreakdown' => $categoryBreakdown,
                'budgetStatus' => $budgets
            ];
            
            echo json_encode($summary);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch dashboard summary']);
        }
    }
}
