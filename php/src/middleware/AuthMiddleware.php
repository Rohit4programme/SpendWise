<?php
class AuthMiddleware {
    private static $secret = 'your-secret-key-change-in-production';
    
    public static function generateToken($userId) {
        $payload = [
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 hours
            'userId' => $userId
        ];
        
        return self::encodeToken($payload);
    }
    
    public static function verifyToken() {
        $headers = getallheaders();
        $token = null;
        
        if (isset($headers['Authorization'])) {
            $parts = explode(' ', $headers['Authorization']);
            if (count($parts) === 2 && $parts[0] === 'Bearer') {
                $token = $parts[1];
            }
        }
        
        if (!$token) {
            return false;
        }
        
        try {
            $decoded = self::decodeToken($token);
            if ($decoded && $decoded['exp'] > time()) {
                return $decoded;
            }
        } catch (Exception $e) {
            return false;
        }
        
        return false;
    }
    
    private static function encodeToken($payload) {
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode($payload));
        $signature = hash_hmac('sha256', "$header.$payload", self::$secret, true);
        $signature = base64_encode($signature);
        
        return "$header.$payload.$signature";
    }
    
    private static function decodeToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }
        
        $header = json_decode(base64_decode($parts[0]), true);
        $payload = json_decode(base64_decode($parts[1]), true);
        $signature = $parts[2];
        
        $expectedSignature = hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", self::$secret, true);
        $expectedSignature = base64_encode($expectedSignature);
        
        if ($signature !== $expectedSignature) {
            throw new Exception('Invalid token signature');
        }
        
        return $payload;
    }
}
