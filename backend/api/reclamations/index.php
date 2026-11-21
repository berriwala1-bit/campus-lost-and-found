<?php
// backend/api/reclamations/index.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';
require_once __DIR__ . '/../../utils/upload.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $currentUser = requireAuth($db);
    requireAdmin($currentUser);
    $currentUserId = (int)$currentUser['id'];

    $categorie = trim($_GET['categorie'] ?? '');
    $statut = trim($_GET['statut'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $query = "
        SELECT 
            r.*,
            u.nom AS auteur_nom,
            u.prenom AS auteur_prenom,
            u.email AS auteur_email,
            u.role AS auteur_role,
            (SELECT COUNT(*) FROM soutiens s WHERE s.reclamation_id = r.id) AS soutiens_count,
            (SELECT COUNT(*) FROM commentaires_reclamations cr WHERE cr.reclamation_id = r.id) AS commentaires_count,
            EXISTS(SELECT 1 FROM soutiens s2 WHERE s2.reclamation_id = r.id AND s2.user_id = ?) AS user_a_soutenu
        FROM reclamations r
        JOIN users u ON r.user_id = u.id
        WHERE 1=1
    ";
    $params = [$currentUserId];

    if (!empty($categorie) && $categorie !== 'all') {
        $query .= " AND r.categorie = ?";
        $params[] = $categorie;
    }

    if (!empty($statut) && $statut !== 'all') {
        $query .= " AND r.statut = ?";
        $params[] = $statut;
    }

    if (!empty($search)) {
        $query .= " AND (r.titre LIKE ? OR r.description LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $query .= " ORDER BY r.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $reclamations = $stmt->fetchAll();

    // Normaliser le champ boolean
    foreach ($reclamations as &$rec) {
        $rec['user_a_soutenu'] = (bool)$rec['user_a_soutenu'];
        $rec['soutiens_count'] = (int)$rec['soutiens_count'];
        $rec['commentaires_count'] = (int)$rec['commentaires_count'];
    }

    jsonResponse([
        'success' => true,
        'count' => count($reclamations),
        'data' => $reclamations
    ]);

} elseif ($method === 'POST') {
    $currentUser = requireAuth($db);

    $isMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    $input = $isMultipart ? $_POST : getJsonInput();

    $titre = trim($input['titre'] ?? '');
    $categorie = trim($input['categorie'] ?? '');
    $description = trim($input['description'] ?? '');

    $allowedCategories = ['pedagogique', 'administratif', 'infrastructure', 'equipements', 'organisation', 'injustice', 'autre'];

    $errors = [];
    if (empty($titre)) {
        $errors['titre'] = "Le titre de la réclamation est obligatoire.";
    }
    if (empty($categorie) || !in_array($categorie, $allowedCategories, true)) {
        $errors['categorie'] = "La catégorie sélectionnée n'est pas valide.";
    }
    if (empty($description)) {
        $errors['description'] = "La description détaillée est obligatoire.";
    }

    // Gestion du justificatif facultatif (image ou PDF)
    $pieceJointePath = null;
    if (isset($_FILES['piece_jointe']) && $_FILES['piece_jointe']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $pieceJointePath = Uploader::handleUpload(
                $_FILES['piece_jointe'], 
                'reclamations', 
                ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
            );
        } catch (Exception $e) {
            $errors['piece_jointe'] = $e->getMessage();
        }
    }

    if (!empty($errors)) {
        jsonError("Validation échouée", 422, $errors);
    }

    $insert = $db->prepare("
        INSERT INTO reclamations (user_id, titre, categorie, description, piece_jointe, statut, created_at)
        VALUES (?, ?, ?, ?, ?, 'en_attente', NOW())
    ");

    try {
        $insert->execute([
            $currentUser['id'],
            $titre,
            $categorie,
            $description,
            $pieceJointePath
        ]);
        $newId = (int)$db->lastInsertId();

        $stmt = $db->prepare("
            SELECT r.*, u.nom AS auteur_nom, u.prenom AS auteur_prenom, u.role AS auteur_role
            FROM reclamations r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        ");
        $stmt->execute([$newId]);
        $reclamation = $stmt->fetch();

        jsonResponse([
            'success' => true,
            'message' => 'Réclamation enregistrée avec succès. Elle sera examinée par l’administration.',
            'data' => $reclamation
        ], 201);
    } catch (PDOException $e) {
        jsonError("Erreur lors de l'enregistrement de la réclamation. Veuillez réessayer.", 500);
    }
} else {
    jsonError("Méthode non autorisée.", 405);
}
