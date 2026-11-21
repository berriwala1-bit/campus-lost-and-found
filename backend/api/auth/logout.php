<?php
// backend/api/auth/logout.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/jwt.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Méthode non autorisée.", 405);
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authHeader === '' && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}
preg_match('/Bearer\s(\S+)/', $authHeader, $matches);

$database = new Database();
$db = $database->getConnection();
requireAuth($db);

if (isset($matches[1])) {
    JWT::revoke($db, $matches[1]);
}

jsonResponse([
    'success' => true,
    'message' => 'Déconnexion effectuée avec succès.'
]);
