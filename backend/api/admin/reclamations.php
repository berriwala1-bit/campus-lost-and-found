<?php
// backend/api/admin/reclamations.php
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
    $categorie = trim($input['categorie'] ?? '');
    $description = trim($input['description'] ?? '');
    $allowedCategories = ['pedagogique', 'administratif', 'infrastructure', 'equipements', 'organisation', 'injustice', 'autre'];
    if ($titre === '' || $description === '' || !in_array($categorie, $allowedCategories, true)) jsonError('Titre, description et catégorie valide obligatoires.', 422);
    $insert = $db->prepare("INSERT INTO reclamations (user_id,titre,categorie,description,statut) VALUES (?,?,?,?,'en_attente')");
    $insert->execute([(int)$currentUser['id'], $titre, $categorie, $description]);
    jsonResponse(['success' => true, 'message' => 'Réclamation créée.', 'data' => ['id' => (int)$db->lastInsertId()]], 201);
} elseif ($method === 'GET') {
    $statut = trim($_GET['statut'] ?? '');
    $categorie = trim($_GET['categorie'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $query = "
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
        WHERE 1=1
    ";
    $params = [];

    if (!empty($statut) && $statut !== 'all') {
        $query .= " AND r.statut = ?";
        $params[] = $statut;
    }

    if (!empty($categorie) && $categorie !== 'all') {
        $query .= " AND r.categorie = ?";
        $params[] = $categorie;
    }

    if (!empty($search)) {
        $query .= " AND (r.titre LIKE ? OR r.description LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $query .= " ORDER BY r.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $reclamations = $stmt->fetchAll();

    foreach ($reclamations as &$rec) {
        $rec['soutiens_count'] = (int)$rec['soutiens_count'];
        $rec['commentaires_count'] = (int)$rec['commentaires_count'];
    }

    jsonResponse([
        'success' => true,
        'count' => count($reclamations),
        'data' => $reclamations
    ]);

} elseif ($method === 'PUT') {
    $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    $statut = trim($input['statut'] ?? '');
    $reponseOfficielle = trim($input['reponse_officielle'] ?? '');

    if ($id <= 0) {
        jsonError("Identifiant de la réclamation manquant.", 422);
    }

    $allowedStatuts = ['en_attente', 'en_cours', 'resolue', 'refusee'];
    if (!empty($statut) && !in_array($statut, $allowedStatuts, true)) {
        jsonError("Statut invalide.", 422);
    }

    $stmt = $db->prepare("SELECT * FROM reclamations WHERE id = ?");
    $stmt->execute([$id]);
    $rec = $stmt->fetch();

    if (!$rec) {
        jsonError("Réclamation introuvable.", 404);
    }

    $newStatut = !empty($statut) ? $statut : $rec['statut'];
    $newReponse = !empty($reponseOfficielle) ? $reponseOfficielle : $rec['reponse_officielle'];
    $dateReponse = !empty($reponseOfficielle) ? date('Y-m-d H:i:s') : $rec['date_reponse'];
    $titre = trim($input['titre'] ?? $rec['titre']);
    $categorie = trim($input['categorie'] ?? $rec['categorie']);
    $description = trim($input['description'] ?? $rec['description']);
    $allowedCategories = ['pedagogique', 'administratif', 'infrastructure', 'equipements', 'organisation', 'injustice', 'autre'];
    if ($titre === '' || $description === '' || !in_array($categorie, $allowedCategories, true)) jsonError('Titre, description ou catégorie invalide.', 422);
    $update = $db->prepare("UPDATE reclamations SET titre=?, categorie=?, description=?, statut=?, reponse_officielle=?, date_reponse=?, updated_at=NOW() WHERE id=?");
    $update->execute([$titre, $categorie, $description, $newStatut, $newReponse ?: null, $dateReponse, $id]);

    jsonResponse([
        'success' => true,
        'message' => 'Réclamation et réponse officielle mises à jour avec succès.',
        'statut' => $newStatut
    ]);

} elseif ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        $input = getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
    }

    if ($id <= 0) {
        jsonError("Identifiant manquant.", 422);
    }

    $stmtFile = $db->prepare("SELECT piece_jointe FROM reclamations WHERE id = ?");
    $stmtFile->execute([$id]);
    $pieceJointe = $stmtFile->fetchColumn();
    if (is_string($pieceJointe) && $pieceJointe !== '') {
        $cheminFichier = __DIR__ . '/../../uploads/' . $pieceJointe;
        if (is_file($cheminFichier)) {
            unlink($cheminFichier);
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
