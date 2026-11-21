<?php
// backend/api/index.php
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../utils/response.php';

jsonResponse([
    'success' => true,
    'message' => 'API Campus Lost & Found opérationnelle.',
    'version' => '1.1.0',
    'php_version' => PHP_VERSION,
    'endpoints' => [
        'auth' => '/api/auth/login.php, /api/auth/register.php, /api/auth/me.php, /api/auth/logout.php',
        'users' => '/api/users/profile.php',
        'objets' => '/api/objets/objets.php, /api/objets/index.php, /api/objets/detail.php, /api/objets/mes-objets.php, /api/objets/partages.php, /api/objets/commentaires.php',
        'reclamations' => '/api/reclamations/index.php, /api/reclamations/detail.php, /api/reclamations/mes-reclamations.php, /api/reclamations/piece-jointe.php, /api/reclamations/soutiens.php, /api/reclamations/commentaires.php',
        'admin' => '/api/admin/stats.php, /api/admin/users.php, /api/admin/objets.php, /api/admin/reclamations.php, /api/admin/commentaires.php'
    ]
]);
