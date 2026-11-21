<?php
// backend/api/objets/detail.php
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
    jsonError("Identifiant de l'objet invalide.", 400);
}

$method = $_SERVER['REQUEST_METHOD'];

// Récupérer l'objet
$stmt = $db->prepare("
    SELECT 
        o.*,
        u.nom AS auteur_nom,
        u.prenom AS auteur_prenom,
        u.email AS auteur_email,
        u.role AS auteur_role,
        u.telephone AS auteur_telephone
    FROM objets o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
");
$stmt->execute([$id]);
$objet = $stmt->fetch();

if (!$objet) {
    jsonError("Objet introuvable.", 404);
}

if ($method === 'GET') {
    $currentUser = optionalAuth($db);

    // Commentaires associés
    $comStmt = $db->prepare("
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
    $comStmt->execute([$id]);
    $commentaires = $comStmt->fetchAll();

    $isOwner = $currentUser && ((int)$currentUser['id'] === (int)$objet['user_id']);
    $isAdmin = $currentUser && ($currentUser['role'] === 'admin');

    $partagesCountStmt = $db->prepare("SELECT COUNT(*) FROM partages WHERE objet_id = ?");
    $partagesCountStmt->execute([$id]);
    $partagesCount = (int)$partagesCountStmt->fetchColumn();

    $dejaPartage = false;
    if ($currentUser) {
        $myPartageStmt = $db->prepare("SELECT id FROM partages WHERE objet_id = ? AND user_id = ?");
        $myPartageStmt->execute([$id, $currentUser['id']]);
        $dejaPartage = (bool)$myPartageStmt->fetch();
    }

    jsonResponse([
        'success' => true,
        'data' => $objet,
        'commentaires' => $commentaires,
        'is_owner' => $isOwner,
        'is_admin' => $isAdmin,
        'partages_count' => $partagesCount,
        'deja_partage' => $dejaPartage
    ]);

} elseif ($method === 'PUT' || ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT')) {
    $currentUser = requireAuth($db);

    $isOwner = ((int)$currentUser['id'] === (int)$objet['user_id']);
    $isAdmin = ($currentUser['role'] === 'admin');

    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à modifier cette annonce.", 403);
    }

    $isMultipart = !empty($_POST);
    $input = $isMultipart ? $_POST : getJsonInput();

    $titre = trim($input['titre'] ?? $input['nom'] ?? $objet['titre']);
    $description = trim($input['description'] ?? $objet['description']);
    $categorie = trim($input['categorie'] ?? $objet['categorie']);
    $type = trim($input['type'] ?? $objet['type']);
    $lieu = trim($input['lieu'] ?? $objet['lieu']);
    $dateEvenement = trim($input['date_evenement'] ?? $input['date'] ?? $objet['date_evenement']);
    $contact = trim($input['contact'] ?? $objet['contact']);
    $statut = trim($input['statut'] ?? $objet['statut']);

    $allowedStatuts = ['actif', 'en_cours', 'recupere', 'cloture'];
    if (!in_array($statut, $allowedStatuts, true)) {
        $statut = $objet['statut'];
    }
    if (!in_array($type, ['perdu', 'trouve'], true)) {
        $type = $objet['type'];
    }

    $photoPath = $objet['photo'];
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $photoPath = Uploader::handleUpload($_FILES['photo'], 'objets');
        } catch (Exception $e) {
            jsonError($e->getMessage(), 422);
        }
    }

    $update = $db->prepare("
        UPDATE objets SET 
            titre = ?, 
            description = ?, 
            categorie = ?, 
            type = ?,
            lieu = ?, 
            date_evenement = ?, 
            contact = ?, 
            statut = ?, 
            photo = ?, 
            updated_at = NOW()
        WHERE id = ?
    ");
    $update->execute([
        $titre,
        $description,
        $categorie,
        $type,
        $lieu,
        $dateEvenement,
        $contact,
        $statut,
        $photoPath,
        $id
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Annonce mise à jour avec succès.',
        'type' => $type,
        'statut' => $statut
    ]);

} elseif ($method === 'DELETE') {
    $currentUser = requireAuth($db);

    $isOwner = ((int)$currentUser['id'] === (int)$objet['user_id']);
    $isAdmin = ($currentUser['role'] === 'admin');

    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à supprimer cette annonce.", 403);
    }

    // Supprimer la photo physique si elle existe
    if (!empty($objet['photo'])) {
        $filePath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $objet['photo']);
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $del = $db->prepare("DELETE FROM objets WHERE id = ?");
    $del->execute([$id]);

    jsonResponse([
        'success' => true,
        'message' => 'Annonce supprimée avec succès.'
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
