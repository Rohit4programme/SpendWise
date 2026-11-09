<?php
class Router {
    private $routes = [];
    private $basePath = '/php';
    
    public function __construct() {
        $this->registerRoutes();
    }
    
    private function registerRoutes() {
        // Auth routes
        $this->post('/api/auth/register', 'AuthController@register');
        $this->post('/api/auth/signup', 'AuthController@register');
        $this->post('/api/auth/login', 'AuthController@login');
        $this->post('/api/auth/logout', 'AuthController@logout');
        $this->get('/api/auth/me', 'AuthController@me');
        
        // Transactions routes
        $this->get('/api/transactions', 'TransactionController@getAll');
        $this->post('/api/transactions', 'TransactionController@create');
        $this->put('/api/transactions/:id', 'TransactionController@update');
        $this->delete('/api/transactions/:id', 'TransactionController@delete');
        
        // Budgets routes
        $this->get('/api/budgets', 'BudgetController@getAll');
        $this->post('/api/budgets', 'BudgetController@create');
        $this->put('/api/budgets/:id', 'BudgetController@update');
        $this->delete('/api/budgets/:id', 'BudgetController@delete');
        
        // Income routes
        $this->get('/api/income', 'IncomeController@getAll');
        $this->post('/api/income', 'IncomeController@create');
        $this->delete('/api/income/:id', 'IncomeController@delete');
        
        // Debts routes
        $this->get('/api/debts', 'DebtController@getAll');
        $this->post('/api/debts', 'DebtController@create');
        $this->put('/api/debts/:id', 'DebtController@update');
        $this->delete('/api/debts/:id', 'DebtController@delete');
        
        // Recurring Transactions routes
        $this->get('/api/recurring-transactions', 'RecurringTransactionController@getRecurringTransactions');
        $this->post('/api/recurring-transactions', 'RecurringTransactionController@createRecurringTransaction');
        $this->put('/api/recurring-transactions/:id', 'RecurringTransactionController@updateRecurringTransaction');
        $this->delete('/api/recurring-transactions/:id', 'RecurringTransactionController@deleteRecurringTransaction');
        $this->post('/api/recurring-transactions/generate', 'RecurringTransactionController@generateRecurringTransactions');
        
        // Export routes
        $this->get('/api/export/transactions/csv', 'ExportController@exportTransactionsCSV');
        $this->get('/api/export/budgets/csv', 'ExportController@exportBudgetsCSV');
        $this->get('/api/export/debts/csv', 'ExportController@exportDebtsCSV');
        $this->get('/api/export/all/json', 'ExportController@exportAllJSON');
        $this->get('/api/export/summary', 'ExportController@getExportSummary');
        
        // Dashboard routes
        $this->get('/api/dashboard/summary', 'DashboardController@getSummary');
    }
    
    public function get($path, $action) {
        $this->routes['GET'][$path] = $action;
    }
    
    public function post($path, $action) {
        $this->routes['POST'][$path] = $action;
    }
    
    public function put($path, $action) {
        $this->routes['PUT'][$path] = $action;
    }
    
    public function delete($path, $action) {
        $this->routes['DELETE'][$path] = $action;
    }
    
    public function dispatch($method, $path) {
        // Remove base path
        $path = str_replace($this->basePath, '', $path);
        if (empty($path)) {
            $path = '/';
        }
        
        $route = $this->matchRoute($method, $path);
        
        if (!$route) {
            http_response_code(404);
            echo json_encode(['error' => 'Route not found']);
            return;
        }
        
        list($controller, $action) = explode('@', $route['action']);
        
        // Check authentication for protected routes
        if (strpos($path, '/api/auth') !== 0) {
            if (!AuthMiddleware::verifyToken()) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                return;
            }
        }
        
        $controllerFile = __DIR__ . '/controllers/' . $controller . '.php';
        if (!file_exists($controllerFile)) {
            http_response_code(500);
            echo json_encode(['error' => 'Controller not found']);
            return;
        }
        
        require_once $controllerFile;
        $controllerClass = new $controller();
        
        if (!method_exists($controllerClass, $action)) {
            http_response_code(500);
            echo json_encode(['error' => 'Action not found']);
            return;
        }
        
        // Extract parameters from path
        $params = $this->extractParams($route['pattern'], $path);
        call_user_func_array([$controllerClass, $action], [$params]);
    }
    
    private function matchRoute($method, $path) {
        if (!isset($this->routes[$method])) {
            return null;
        }
        
        foreach ($this->routes[$method] as $pattern => $action) {
            $regex = preg_replace('/:(\w+)/', '(?P<$1>[^/]+)', $pattern);
            $regex = "#^$regex$#";
            
            if (preg_match($regex, $path)) {
                return ['pattern' => $pattern, 'action' => $action];
            }
        }
        
        return null;
    }
    
    private function extractParams($pattern, $path) {
        $regex = preg_replace('/:(\w+)/', '(?P<$1>[^/]+)', $pattern);
        $regex = "#^$regex$#";
        
        preg_match($regex, $path, $matches);
        
        $params = [];
        foreach ($matches as $key => $value) {
            if (!is_numeric($key)) {
                $params[$key] = $value;
            }
        }
        
        // Add query parameters and body
        if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
            $body = json_decode(file_get_contents('php://input'), true);
            if ($body) {
                $params = array_merge($params, $body);
            }
        } else {
            $params = array_merge($params, $_GET);
        }
        
        return $params;
    }
}
