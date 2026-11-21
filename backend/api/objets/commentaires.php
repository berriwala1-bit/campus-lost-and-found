<?php
// backend/api/objets/commentaires.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $objetId = isset($_GET['objet_id']) ? (int)$_GET['objet_id'] : 0;
    if ($objetId <= 0) {
        jsonError("Paramètre objet_id manquant ou invalide.", 400);
    }

    $stmt = $db->prepare("
        SELECT 
            c.*,
            u.nom,
            u.prenom,
            u.role
        FROM commentaires_objets c
        JOIN users u ON c.user_id = u.id
        WHERE c.objet_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$objetId]);
    $commentaires = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'data' => $commentaires
    ]);

} elseif ($method === 'POST') {
    $currentUser = requireAuth($db);
    $input = getJsonInput();

    $objetId = isset($input['objet_id']) ? (int)$input['objet_id'] : 0;
    $commentaire = trim($input['commentaire'] ?? '');

    if ($objetId <= 0) {
        jsonError("Identifiant de l'objet obligatoire.", 422);
    }
    if (empty($commentaire)) {
        jsonError("Le message du commentaire ne peut pas être vide.", 422);
    }

    // Vérifier l'existence de l'objet
    $check = $db->prepare("SELECT id FROM objets WHERE id = ?");
    $check->execute([$objetId]);
    if (!$check->fetch()) {
        jsonError("L'objet spécifié n'existe pas.", 404);
    }

    $insert = $db->prepare("
        INSERT INTO commentaires_objets (objet_id, user_id, commentaire, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    $insert->execute([$objetId, $currentUser['id'], $commentaire]);
    $newId = (int)$db->lastInsertId();

    $stmt = $db->prepare("
        SELECT 
            c.*,
            u.nom,
            u.prenom,
            u.role
        FROM commentaires_objets c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
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

    $stmt = $db->prepare("SELECT id, user_id, objet_id FROM commentaires_objets WHERE id = ?");
    $stmt->execute([$commentId]);
    $commentaireExistant = $stmt->fetch();

    if (!$commentaireExistant) {
        jsonError("Commentaire introuvable.", 404);
    }

    $peutModifier = (int)$commentaireExistant['user_id'] === (int)$currentUser['id']
        || $currentUser['role'] === 'admin';
    if (!$peutModifier) {
        jsonError("Accès refusé : vous ne pouvez pas modifier ce commentaire.", 403);
    }

    if ($method === 'DELETE') {
        $delete = $db->prepare("DELETE FROM commentaires_objets WHERE id = ?");
        $delete->execute([$commentId]);
        jsonResponse(['success' => true, 'message' => 'Commentaire supprimé.']);
    }

    $texte = trim($input['commentaire'] ?? '');
    if ($texte === '') {
        jsonError("Le message du commentaire ne peut pas être vide.", 422);
    }

    $update = $db->prepare("UPDATE commentaires_objets SET commentaire = ? WHERE id = ?");
    $update->execute([$texte, $commentId]);

    $stmt = $db->prepare("
        SELECT c.*, u.nom, u.prenom, u.role
        FROM commentaires_objets c JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
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
