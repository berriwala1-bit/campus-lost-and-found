<?php
// backend/api/reclamations/detail.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/upload.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    jsonError("Identifiant de réclamation invalide.", 400);
}

$method = $_SERVER['REQUEST_METHOD'];

// Récupérer la réclamation
$stmt = $db->prepare("
    SELECT 
        r.*,
        u.nom AS auteur_nom,
        u.prenom AS auteur_prenom,
        u.email AS auteur_email,
        u.role AS auteur_role,
        (SELECT COUNT(*) FROM soutiens s WHERE s.reclamation_id = r.id) AS soutiens_count,
        (SELECT COUNT(*) FROM commentaires_reclamations cr WHERE cr.reclamation_id = r.id) AS commentaires_count
    FROM reclamations r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
");
$stmt->execute([$id]);
$reclamation = $stmt->fetch();

if (!$reclamation) {
    jsonError("Réclamation introuvable.", 404);
}

if ($method === 'GET') {
    $currentUser = requireAuth($db);
    $isOwner = (int)$currentUser['id'] === (int)$reclamation['user_id'];
    $isAdmin = $currentUser['role'] === 'admin';
    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à accéder à cette réclamation.", 403);
    }

    $userASoutenu = false;

    $checkSoutien = $db->prepare("SELECT 1 FROM soutiens WHERE reclamation_id = ? AND user_id = ?");
    $checkSoutien->execute([$id, $currentUser['id']]);
    $userASoutenu = (bool)$checkSoutien->fetch();

    // Récupérer les commentaires
    $comStmt = $db->prepare("
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
    $comStmt->execute([$id]);
    $commentaires = $comStmt->fetchAll();

    $reclamation['user_a_soutenu'] = $userASoutenu;
    $reclamation['soutiens_count'] = (int)$reclamation['soutiens_count'];

    jsonResponse([
        'success' => true,
        'data' => $reclamation,
        'commentaires' => $commentaires,
        'is_owner' => $isOwner,
        'is_admin' => $isAdmin
    ]);

} elseif ($method === 'PUT' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT')) {
    $currentUser = requireAuth($db);

    $isOwner = ((int)$currentUser['id'] === (int)$reclamation['user_id']);
    $isAdmin = ($currentUser['role'] === 'admin');

    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à modifier cette réclamation.", 403);
    }

    $isMultipart = !empty($_POST);
    $input = $isMultipart ? $_POST : getJsonInput();

    $titre = trim($input['titre'] ?? $reclamation['titre']);
    $description = trim($input['description'] ?? $reclamation['description']);
    $categorie = trim($input['categorie'] ?? $reclamation['categorie']);
    $statut = trim($input['statut'] ?? $reclamation['statut']);
    $reponseOfficielle = trim($input['reponse_officielle'] ?? ($reclamation['reponse_officielle'] ?? ''));

    // Seul l'admin peut modifier le statut et ajouter une réponse officielle
    if (!$isAdmin) {
        $statut = $reclamation['statut'];
        $reponseOfficielle = $reclamation['reponse_officielle'];
    }

    $dateReponse = $reclamation['date_reponse'];
    if ($isAdmin && !empty($reponseOfficielle) && $reponseOfficielle !== $reclamation['reponse_officielle']) {
        $dateReponse = date('Y-m-d H:i:s');
    }

    $update = $db->prepare("
        UPDATE reclamations SET 
            titre = ?, 
            description = ?, 
            categorie = ?, 
            statut = ?, 
            reponse_officielle = ?, 
            date_reponse = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $update->execute([
        $titre,
        $description,
        $categorie,
        $statut,
        $reponseOfficielle ?: null,
        $dateReponse,
        $id
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Réclamation mise à jour avec succès.',
        'statut' => $statut
    ]);

} elseif ($method === 'DELETE') {
    $currentUser = requireAuth($db);

    $isOwner = ((int)$currentUser['id'] === (int)$reclamation['user_id']);
    $isAdmin = ($currentUser['role'] === 'admin');

    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à supprimer cette réclamation.", 403);
    }

    // Supprimer la pièce jointe physique
    if (!empty($reclamation['piece_jointe'])) {
        $filePath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $reclamation['piece_jointe']);
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $del = $db->prepare("DELETE FROM reclamations WHERE id = ?");
    $del->execute([$id]);

    jsonResponse([
        'success' => true,
        'message' => 'Réclamation supprimée avec succès.'
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
