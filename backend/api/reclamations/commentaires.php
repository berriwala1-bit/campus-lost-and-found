<?php
// backend/api/reclamations/commentaires.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/reclamation_access.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $currentUser = requireAuth($db);
    $reclamationId = isset($_GET['reclamation_id']) ? (int)$_GET['reclamation_id'] : 0;
    if ($reclamationId <= 0) {
        jsonError("Paramètre reclamation_id obligatoire.", 400);
    }
    requireReclamationAccess($db, $reclamationId, $currentUser);

    $stmt = $db->prepare("
        SELECT 
            cr.*,
            u.nom,
            u.prenom,
            u.role
        FROM commentaires_reclamations cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.reclamation_id = ?
        ORDER BY cr.created_at ASC
    ");
    $stmt->execute([$reclamationId]);
    $commentaires = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'data' => $commentaires
    ]);

} elseif ($method === 'POST') {
    $currentUser = requireAuth($db);
    $input = getJsonInput();

    $reclamationId = isset($input['reclamation_id']) ? (int)$input['reclamation_id'] : 0;
    $commentaire = trim($input['commentaire'] ?? '');

    if ($reclamationId <= 0) {
        jsonError("Identifiant de la réclamation obligatoire.", 422);
    }
    if (empty($commentaire)) {
        jsonError("Le commentaire ne peut pas être vide.", 422);
    }

    requireReclamationAccess($db, $reclamationId, $currentUser);

    $insert = $db->prepare("
        INSERT INTO commentaires_reclamations (reclamation_id, user_id, commentaire, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    $insert->execute([$reclamationId, $currentUser['id'], $commentaire]);
    $newId = (int)$db->lastInsertId();

    $stmt = $db->prepare("
        SELECT 
            cr.*,
            u.nom,
            u.prenom,
            u.role
        FROM commentaires_reclamations cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.id = ?
    ");
    $stmt->execute([$newId]);
    $nouveauCommentaire = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'Commentaire ajouté avec succès.',
        'data' => $nouveauCommentaire
    ], 201);

} elseif ($method === 'PUT' || $method === 'DELETE') {
    $currentUser = requireAuth($db);
    $input = getJsonInput();
    $commentId = isset($input['id']) ? (int)$input['id'] : (int)($_GET['id'] ?? 0);

    if ($commentId <= 0) {
        jsonError("Identifiant du commentaire obligatoire.", 422);
    }

    $stmt = $db->prepare("SELECT id, user_id, reclamation_id FROM commentaires_reclamations WHERE id = ?");
    $stmt->execute([$commentId]);
    $commentaireExistant = $stmt->fetch();

    if (!$commentaireExistant) {
        jsonError("Commentaire introuvable.", 404);
    }
    requireReclamationAccess($db, (int)$commentaireExistant['reclamation_id'], $currentUser);

    $peutModifier = (int)$commentaireExistant['user_id'] === (int)$currentUser['id']
        || $currentUser['role'] === 'admin';
    if (!$peutModifier) {
        jsonError("Accès refusé : vous ne pouvez pas modifier ce commentaire.", 403);
    }

    if ($method === 'DELETE') {
        $delete = $db->prepare("DELETE FROM commentaires_reclamations WHERE id = ?");
        $delete->execute([$commentId]);
        jsonResponse(['success' => true, 'message' => 'Commentaire supprimé.']);
    }

    $texte = trim($input['commentaire'] ?? '');
    if ($texte === '') {
        jsonError("Le message du commentaire ne peut pas être vide.", 422);
    }

    $update = $db->prepare("UPDATE commentaires_reclamations SET commentaire = ? WHERE id = ?");
    $update->execute([$texte, $commentId]);

    $stmt = $db->prepare("
        SELECT cr.*, u.nom, u.prenom, u.role
        FROM commentaires_reclamations cr JOIN users u ON cr.user_id = u.id
        WHERE cr.id = ?
    ");
    $stmt->execute([$commentId]);

    jsonResponse([
        'success' => true,
        'message' => 'Commentaire mis à jour.',
        'data' => $stmt->fetch()
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
