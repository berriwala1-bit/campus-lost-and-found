<?php
// backend/api/auth/me.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError("Méthode non autorisée.", 405);
}

$database = new Database();
$db = $database->getConnection();
$user = requireAuth($db);

jsonResponse([
    'success' => true,
    'user' => $user
]);
