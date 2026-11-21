<?php
// backend/api/reclamations/mes-reclamations.php
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

$stmt = $db->prepare("
    SELECT 
        r.*,
        (SELECT COUNT(*) FROM soutiens s WHERE s.reclamation_id = r.id) AS soutiens_count,
        (SELECT COUNT(*) FROM commentaires_reclamations cr WHERE cr.reclamation_id = r.id) AS commentaires_count
    FROM reclamations r
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$currentUser['id']]);
$reclamations = $stmt->fetchAll();

foreach ($reclamations as &$rec) {
    $rec['soutiens_count'] = (int)$rec['soutiens_count'];
    $rec['commentaires_count'] = (int)$rec['commentaires_count'];
}

jsonResponse([
    'success' => true,
    'data' => $reclamations
]);
