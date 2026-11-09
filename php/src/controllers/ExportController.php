<?php

namespace App\Controllers;

use PDO;
use App\Config\Database;
use AuthMiddleware;

class ExportController {
    private $db;
    private $userId;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->userId = AuthMiddleware::getUserId();
    }

    /**
     * Export transactions as CSV
     */
    public function exportTransactionsCSV() {
        try {
            $query = "
                SELECT 
                    t.id,
                    t.date,
                    c.name as category,
                    t.type,
                    t.amount,
                    t.description,
                    t.createdAt
                FROM transactions t
                LEFT JOIN categories c ON t.categoryId = c.id
                WHERE t.userId = ?
                ORDER BY t.date DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->userId]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $filename = 'transactions_' . date('Y-m-d_His') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            $output = fopen('php://output', 'w');
            
            // Add BOM for proper Excel UTF-8 encoding
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Write header
            fputcsv($output, ['Date', 'Category', 'Type', 'Amount', 'Description', 'Created']);

            // Write data
            foreach ($transactions as $row) {
                fputcsv($output, [
                    $row['date'],
                    $row['category'],
                    $row['type'],
                    $row['amount'],
                    $row['description'],
                    $row['createdAt'],
                ]);
            }

            fclose($output);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Export failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Export budgets as CSV
     */
    public function exportBudgetsCSV() {
        try {
            $query = "
                SELECT 
                    b.id,
                    c.name as category,
                    b.limit,
                    b.spent,
                    CONCAT(b.month, '/', b.year) as period,
                    ROUND((b.spent / NULLIF(b.limit, 0)) * 100, 2) as percentage_used,
                    b.rollover,
                    b.createdAt
                FROM budgets b
                LEFT JOIN categories c ON b.categoryId = c.id
                WHERE b.userId = ?
                ORDER BY b.year DESC, b.month DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->userId]);
            $budgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $filename = 'budgets_' . date('Y-m-d_His') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            $output = fopen('php://output', 'w');
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($output, ['Category', 'Limit', 'Spent', 'Period', 'Percentage Used', 'Rollover']);

            foreach ($budgets as $row) {
                fputcsv($output, [
                    $row['category'],
                    $row['limit'],
                    $row['spent'],
                    $row['period'],
                    $row['percentage_used'] . '%',
                    $row['rollover'] ? 'Yes' : 'No',
                ]);
            }

            fclose($output);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Export failed']);
        }
    }

    /**
     * Export debts as CSV
     */
    public function exportDebtsCSV() {
        try {
            $query = "
                SELECT 
                    d.id,
                    d.personName,
                    d.type,
                    d.amount,
                    d.date,
                    d.dueDate,
                    d.status,
                    d.notes,
                    COALESCE(SUM(r.amount), 0) as paid_amount,
                    (d.amount - COALESCE(SUM(r.amount), 0)) as remaining,
                    d.createdAt
                FROM debts d
                LEFT JOIN repayments r ON d.id = r.debtId
                WHERE d.userId = ?
                GROUP BY d.id
                ORDER BY d.date DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->userId]);
            $debts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $filename = 'debts_' . date('Y-m-d_His') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            $output = fopen('php://output', 'w');
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($output, ['Person', 'Type', 'Amount', 'Paid', 'Remaining', 'Due Date', 'Status', 'Notes']);

            foreach ($debts as $row) {
                fputcsv($output, [
                    $row['personName'],
                    $row['type'],
                    $row['amount'],
                    $row['paid_amount'],
                    $row['remaining'],
                    $row['dueDate'],
                    $row['status'],
                    $row['notes'],
                ]);
            }

            fclose($output);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Export failed']);
        }
    }

    /**
     * Export all data as JSON
     */
    public function exportAllJSON() {
        try {
            // Fetch all data
            $transQuery = "
                SELECT 
                    t.id, t.date, c.name as category, t.type, t.amount, t.description, t.createdAt
                FROM transactions t
                LEFT JOIN categories c ON t.categoryId = c.id
                WHERE t.userId = ?
                ORDER BY t.date DESC
            ";
            
            $budgetQuery = "
                SELECT 
                    b.id, c.name as category, b.limit, b.spent, b.month, b.year, b.rollover
                FROM budgets b
                LEFT JOIN categories c ON b.categoryId = c.id
                WHERE b.userId = ?
                ORDER BY b.year DESC, b.month DESC
            ";

            $debtQuery = "
                SELECT 
                    d.id, d.personName, d.type, d.amount, d.date, d.dueDate, d.status, d.notes
                FROM debts d
                WHERE d.userId = ?
                ORDER BY d.date DESC
            ";

            $stmt1 = $this->db->prepare($transQuery);
            $stmt1->execute([$this->userId]);
            $transactions = $stmt1->fetchAll(PDO::FETCH_ASSOC);

            $stmt2 = $this->db->prepare($budgetQuery);
            $stmt2->execute([$this->userId]);
            $budgets = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            $stmt3 = $this->db->prepare($debtQuery);
            $stmt3->execute([$this->userId]);
            $debts = $stmt3->fetchAll(PDO::FETCH_ASSOC);

            $data = [
                'exportDate' => date('Y-m-d H:i:s'),
                'totalRecords' => [
                    'transactions' => count($transactions),
                    'budgets' => count($budgets),
                    'debts' => count($debts),
                ],
                'transactions' => $transactions,
                'budgets' => $budgets,
                'debts' => $debts,
            ];

            $filename = 'spendwise_export_' . date('Y-m-d_His') . '.json';
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Export failed']);
        }
    }

    /**
     * Get export summary (without downloading)
     */
    public function getExportSummary() {
        try {
            $queries = [
                'transactions' => "SELECT COUNT(*) as count FROM transactions WHERE userId = ?",
                'budgets' => "SELECT COUNT(*) as count FROM budgets WHERE userId = ?",
                'debts' => "SELECT COUNT(*) as count FROM debts WHERE userId = ?"
            ];
            
            $counts = [];
            foreach ($queries as $key => $sql) {
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$this->userId]);
                $counts[$key] = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
            }

            header('Content-Type: application/json');
            echo json_encode([
                'transactions' => (int)$counts['transactions'],
                'budgets' => (int)$counts['budgets'],
                'debts' => (int)$counts['debts'],
                'formats' => ['csv', 'json'],
            ]);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch summary']);
            exit;
        }
    }
}
?>
