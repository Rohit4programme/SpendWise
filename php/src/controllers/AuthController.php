<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AuthController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function register($params) {
        $email = $params['email'] ?? null;
        $password = $params['password'] ?? null;
        $name = $params['name'] ?? null;
        
        if (!$email || !$password || !$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            
            $stmt = $this->db->query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [$name, $email, $hashedPassword]
            );
            
            $userId = $this->db->lastInsertId();
            $token = AuthMiddleware::generateToken($userId);
            
            http_response_code(201);
            echo json_encode([
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'token' => $token
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed']);
        }
    }
    
    public function login($params) {
        $email = $params['email'] ?? null;
        $password = $params['password'] ?? null;
        
        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }
        
        try {
            $user = $this->db->fetch(
                'SELECT id, name, email, password FROM users WHERE email = ?',
                [$email]
            );
            
            if (!$user || !password_verify($password, $user['password'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
                return;
            }
            
            $token = AuthMiddleware::generateToken($user['id']);
            
            echo json_encode([
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'token' => $token
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Login failed']);
        }
    }
    
    public function logout($params) {
        echo json_encode(['message' => 'Logged out successfully']);
    }
    
    public function me($params) {
        $authData = AuthMiddleware::verifyToken();
        if (!$authData) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $user = $this->db->fetch(
                'SELECT id, name, email FROM users WHERE id = ?',
                [$authData['userId']]
            );
            
            echo json_encode($user);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch user']);
        }
    }
}
