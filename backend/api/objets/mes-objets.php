<?php
// backend/api/objets/mes-objets.php
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
$currentUser = requireAuth($db);

$userId = (int)$currentUser['id'];

$originals = "
    SELECT 
        o.*,
        (SELECT COUNT(*) FROM commentaires_objets co WHERE co.objet_id = o.id) AS commentaires_count,
        0 AS est_partage,
        NULL AS partage_id,
        o.created_at AS publication_date
    FROM objets o
    WHERE o.user_id = ?
";

$shared = "
    SELECT 
        o.*,
        (SELECT COUNT(*) FROM commentaires_objets co WHERE co.objet_id = o.id) AS commentaires_count,
        1 AS est_partage,
        p.id AS partage_id,
        p.created_at AS publication_date
    FROM partages p
    LEFT JOIN objets o ON o.id = p.objet_id
    WHERE p.user_id = ?
";

$stmt = $db->prepare("SELECT * FROM ({$originals} UNION ALL {$shared}) AS publications ORDER BY publication_date DESC");
$stmt->execute([$userId, $userId]);
$objets = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'data' => $objets
]);
