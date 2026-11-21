<?php
// backend/api/admin/commentaires.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();
$currentUser = requireAuth($db);
requireAdmin($currentUser);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 1. Commentaires sur objets
    $stmtObj = $db->query("
        SELECT 
            co.id,
            'objet' AS type_entite,
            co.objet_id AS entite_id,
            o.titre AS entite_titre,
            co.commentaire,
            co.created_at,
            u.id AS user_id,
            u.nom,
            u.prenom,
            u.email,
            u.role
        FROM commentaires_objets co
        JOIN users u ON co.user_id = u.id
        JOIN objets o ON co.objet_id = o.id
        ORDER BY co.created_at DESC
        LIMIT 100
    ");
    $comObj = $stmtObj->fetchAll();

    // 2. Commentaires sur réclamations
    $stmtRec = $db->query("
        SELECT 
            cr.id,
            'reclamation' AS type_entite,
            cr.reclamation_id AS entite_id,
            r.titre AS entite_titre,
            cr.commentaire,
            cr.created_at,
            u.id AS user_id,
            u.nom,
            u.prenom,
            u.email,
            u.role
        FROM commentaires_reclamations cr
        JOIN users u ON cr.user_id = u.id
        JOIN reclamations r ON cr.reclamation_id = r.id
        ORDER BY cr.created_at DESC
        LIMIT 100
    ");
    $comRec = $stmtRec->fetchAll();

    // Fusionner et trier par date décroissante
    $allComments = array_merge($comObj, $comRec);
    usort($allComments, function($a, $b) {
        return strcmp($b['created_at'], $a['created_at']);
    });

    jsonResponse([
        'success' => true,
        'count' => count($allComments),
        'data' => $allComments
    ]);

} elseif ($method === 'DELETE') {
    $type = trim($_GET['type'] ?? '');
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id <= 0) {
        $input = getJsonInput();
        $type = trim($input['type'] ?? $type);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
    }

    if ($id <= 0 || !in_array($type, ['objet', 'reclamation'], true)) {
        jsonError("Paramètres invalides (id et type 'objet' ou 'reclamation' requis).", 422);
    }

    if ($type === 'objet') {
        $del = $db->prepare("DELETE FROM commentaires_objets WHERE id = ?");
    } else {
        $del = $db->prepare("DELETE FROM commentaires_reclamations WHERE id = ?");
    }
    $del->execute([$id]);

    jsonResponse([
        'success' => true,
        'message' => 'Commentaire modéré et supprimé avec succès.'
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
