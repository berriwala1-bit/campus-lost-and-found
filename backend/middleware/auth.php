<?php
// backend/middleware/auth.php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/jwt.php';
require_once __DIR__ . '/../utils/response.php';

function requireAuth(?PDO $db = null): array {
    $authHeader = '';
    
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
    }

    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        jsonError("Accès non autorisé : jeton manquant ou invalide.", 401);
    }

    $token = $matches[1];
    $payload = JWT::verify($token);

    if (!$payload || !isset($payload['user_id'])) {
        jsonError("Session expirée ou jeton invalide. Veuillez vous reconnecter.", 401);
    }

    if ($db === null) {
        $database = new Database();
        $db = $database->getConnection();
    }

    if (!JWT::isActive($db, $token)) {
        jsonError("Session révoquée. Veuillez vous reconnecter.", 401);
    }

    $stmt = $db->prepare("SELECT id, nom, prenom, email, role, telephone, statut, created_at FROM users WHERE id = ?");
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError("Utilisateur introuvable.", 401);
    }

    if ($user['statut'] !== 'actif') {
        jsonError("Votre compte est désactivé. Veuillez contacter l'administrateur.", 403);
    }

    return $user;
}

function optionalAuth(?PDO $db = null): ?array {
    try {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return null;
        }

        $payload = JWT::verify($matches[1]);
        if (!$payload || !isset($payload['user_id'])) {
            return null;
        }

        if ($db === null) {
            $database = new Database();
            $db = $database->getConnection();
        }

        if (!JWT::isActive($db, $matches[1])) {
            return null;
        }

        $stmt = $db->prepare("SELECT id, nom, prenom, email, role, telephone, statut FROM users WHERE id = ?");
        $stmt->execute([$payload['user_id']]);
        $user = $stmt->fetch();

        return ($user && $user['statut'] === 'actif') ? $user : null;
    } catch (Exception $e) {
        return null;
    }
}
