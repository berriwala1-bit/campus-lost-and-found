<?php
// backend/api/admin/objets.php
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

if ($method === 'POST') {
    $input = getJsonInput();
    $titre = trim($input['titre'] ?? '');
    $description = trim($input['description'] ?? '');
    $categorie = trim($input['categorie'] ?? '');
    $type = trim($input['type'] ?? '');
    $lieu = trim($input['lieu'] ?? '');
    $date = trim($input['date_evenement'] ?? '');
    $contact = trim($input['contact'] ?? '');
    $statut = trim($input['statut'] ?? 'actif');
    $allowedStatuts = ['actif', 'en_cours', 'recupere', 'cloture'];
    if ($titre === '' || $description === '' || $categorie === '' || !in_array($type, ['perdu', 'trouve'], true) || $lieu === '' || $contact === '' || !in_array($statut, $allowedStatuts, true) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonError('Tous les champs de l’annonce doivent être valides.', 422);
    }
    $insert = $db->prepare("INSERT INTO objets (user_id,titre,description,categorie,type,lieu,date_evenement,contact,statut) VALUES (?,?,?,?,?,?,?,?,?)");
    $insert->execute([(int)$currentUser['id'], $titre, $description, $categorie, $type, $lieu, $date, $contact, $statut]);
    jsonResponse(['success' => true, 'message' => 'Annonce créée.', 'data' => ['id' => (int)$db->lastInsertId()]], 201);
} elseif ($method === 'GET') {
    $type = trim($_GET['type'] ?? '');
    $statut = trim($_GET['statut'] ?? '');
    $categorie = trim($_GET['categorie'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $query = "
        SELECT 
            o.*,
            u.nom AS auteur_nom,
            u.prenom AS auteur_prenom,
            u.email AS auteur_email,
            u.role AS auteur_role,
            (SELECT COUNT(*) FROM commentaires_objets co WHERE co.objet_id = o.id) AS commentaires_count
        FROM objets o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
    ";
    $params = [];

    if (!empty($type) && $type !== 'all') {
        $query .= " AND o.type = ?";
        $params[] = $type;
    }

    if (!empty($statut) && $statut !== 'all') {
        $query .= " AND o.statut = ?";
        $params[] = $statut;
    }

    if (!empty($categorie) && $categorie !== 'all') {
        $query .= " AND o.categorie = ?";
        $params[] = $categorie;
    }

    if (!empty($search)) {
        $query .= " AND (o.titre LIKE ? OR o.description LIKE ? OR o.lieu LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $query .= " ORDER BY o.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $objets = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($objets),
        'data' => $objets
    ]);

} elseif ($method === 'PUT') {
    $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) {
        jsonError("Identifiant de l'objet obligatoire.", 422);
    }
    $check = $db->prepare("SELECT id FROM objets WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetchColumn()) {
        jsonError("Annonce introuvable.", 404);
    }
    $titre = trim($input['titre'] ?? '');
    $description = trim($input['description'] ?? '');
    $categorie = trim($input['categorie'] ?? '');
    $type = trim($input['type'] ?? '');
    $lieu = trim($input['lieu'] ?? '');
    $date = trim($input['date_evenement'] ?? '');
    $contact = trim($input['contact'] ?? '');
    $statut = trim($input['statut'] ?? '');
    $allowedStatuts = ['actif', 'en_cours', 'recupere', 'cloture'];
    if ($titre === '' || $description === '' || $categorie === '' || !in_array($type, ['perdu', 'trouve'], true) || $lieu === '' || $contact === '' || !in_array($statut, $allowedStatuts, true) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonError('Tous les champs de l’annonce doivent être valides.', 422);
    }
    $update = $db->prepare("UPDATE objets SET titre=?, description=?, categorie=?, type=?, lieu=?, date_evenement=?, contact=?, statut=?, updated_at=NOW() WHERE id=?");
    $update->execute([$titre, $description, $categorie, $type, $lieu, $date, $contact, $statut, $id]);

    jsonResponse([
        'success' => true,
        'message' => 'Annonce mise à jour avec succès.',
        'statut' => $statut
    ]);

} elseif ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        $input = getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
    }

    if ($id <= 0) {
        jsonError("Identifiant de l'objet obligatoire.", 422);
    }

    // Récupérer photo pour la supprimer du disque
    $stmt = $db->prepare("SELECT photo FROM objets WHERE id = ?");
    $stmt->execute([$id]);
    $photo = $stmt->fetchColumn();

    if ($photo) {
        $filePath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $photo);
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $del = $db->prepare("DELETE FROM objets WHERE id = ?");
    $del->execute([$id]);

    jsonResponse([
        'success' => true,
        'message' => 'Annonce modérée et supprimée avec succès.'
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
