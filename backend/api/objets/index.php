<?php
// backend/api/objets/index.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/upload.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $type = trim($_GET['type'] ?? '');
    $categorie = trim($_GET['categorie'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $statut = trim($_GET['statut'] ?? '');
    $date = trim($_GET['date'] ?? '');
    $currentUser = optionalAuth($db);
    $currentUserId = $currentUser ? (int)$currentUser['id'] : 0;

    $originals = "
        SELECT 
            o.*,
            COALESCE(u.nom, '') AS auteur_nom,
            COALESCE(u.prenom, '') AS auteur_prenom,
            COALESCE(u.email, '') AS auteur_email,
            COALESCE(u.role, '') AS auteur_role,
            (SELECT COUNT(*) FROM commentaires_objets co WHERE co.objet_id = o.id) AS commentaires_count,
            0 AS est_partage,
            NULL AS partage_id,
            NULL AS partage_par_id,
            NULL AS partage_par_prenom,
            NULL AS partage_par_nom,
            NULL AS partage_date,
            EXISTS(SELECT 1 FROM partages pm WHERE pm.objet_id = o.id AND pm.user_id = ?) AS deja_partage,
            (SELECT COUNT(*) FROM partages pc WHERE pc.objet_id = o.id) AS partages_count,
            o.created_at AS publication_date
        FROM objets o
        LEFT JOIN users u ON o.user_id = u.id
    ";

    $shared = "
        SELECT 
            o.*,
            COALESCE(u.nom, '') AS auteur_nom,
            COALESCE(u.prenom, '') AS auteur_prenom,
            COALESCE(u.email, '') AS auteur_email,
            COALESCE(u.role, '') AS auteur_role,
            (SELECT COUNT(*) FROM commentaires_objets co WHERE co.objet_id = o.id) AS commentaires_count,
            1 AS est_partage,
            p.id AS partage_id,
            pu.id AS partage_par_id,
            COALESCE(pu.prenom, '') AS partage_par_prenom,
            COALESCE(pu.nom, '') AS partage_par_nom,
            p.created_at AS partage_date,
            EXISTS(SELECT 1 FROM partages pm WHERE pm.objet_id = o.id AND pm.user_id = ?) AS deja_partage,
            (SELECT COUNT(*) FROM partages pc WHERE pc.objet_id = o.id) AS partages_count,
            p.created_at AS publication_date
        FROM partages p
        JOIN objets o ON o.id = p.objet_id
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN users pu ON p.user_id = pu.id
    ";

    $query = "SELECT * FROM ({$originals} UNION ALL {$shared}) AS publications WHERE 1=1";
    $params = [$currentUserId, $currentUserId];

    // Par défaut, si aucun statut spécifié, on n'affiche que les annonces actives (selon le cahier des charges)
    if (!empty($statut)) {
        if ($statut !== 'all') {
            $query .= " AND publications.statut = ?";
            $params[] = $statut;
        }
    } else {
        $query .= " AND publications.statut IN ('actif', 'en_cours')";
    }

    if (!empty($type) && in_array($type, ['trouve', 'perdu'], true)) {
        $query .= " AND publications.type = ?";
        $params[] = $type;
    }

    if (!empty($categorie) && $categorie !== 'all') {
        $query .= " AND publications.categorie = ?";
        $params[] = $categorie;
    }

    if (!empty($search)) {
        $query .= " AND (publications.titre LIKE ? OR publications.description LIKE ? OR publications.lieu LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    if (!empty($date)) {
        $query .= " AND publications.date_evenement = ?";
        $params[] = $date;
    }

    $query .= " ORDER BY publications.publication_date DESC, publications.id DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $objets = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($objets),
        'data' => $objets
    ]);

} elseif ($method === 'POST') {
    $currentUser = requireAuth($db);

    // Supporte multipart/form-data et JSON
    $isMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    $input = $isMultipart ? $_POST : getJsonInput();

    $titre = trim($input['titre'] ?? $input['nom'] ?? '');
    $description = trim($input['description'] ?? '');
    $categorie = trim($input['categorie'] ?? '');
    $type = trim($input['type'] ?? 'trouve');
    $lieu = trim($input['lieu'] ?? '');
    $dateEvenement = trim($input['date_evenement'] ?? $input['date'] ?? date('Y-m-d'));
    $contact = trim($input['contact'] ?? $currentUser['email']);

    $errors = [];
    if (empty($titre)) {
        $errors['titre'] = "Le nom/titre de l'objet est obligatoire.";
    }
    if (empty($description)) {
        $errors['description'] = "La description est obligatoire.";
    }
    if (empty($categorie)) {
        $errors['categorie'] = "La catégorie est obligatoire.";
    }
    if (!in_array($type, ['trouve', 'perdu'], true)) {
        $errors['type'] = "Le type doit être 'trouve' ou 'perdu'.";
    }
    if (empty($lieu)) {
        $errors['lieu'] = "Le lieu est obligatoire.";
    }
    if (empty($dateEvenement)) {
        $errors['date_evenement'] = "La date est obligatoire.";
    }
    if (empty($contact)) {
        $errors['contact'] = "Un moyen de contact est obligatoire.";
    }

    // Gestion de l'upload photo
    $photoPath = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $photoPath = Uploader::handleUpload($_FILES['photo'], 'objets');
        } catch (Exception $e) {
            $errors['photo'] = $e->getMessage();
        }
    }

    if (!empty($errors)) {
        jsonError("Validation échouée", 422, $errors);
    }

    $insert = $db->prepare("
        INSERT INTO objets (user_id, titre, description, categorie, type, lieu, date_evenement, contact, photo, statut, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', NOW())
    ");

    try {
        $insert->execute([
            $currentUser['id'],
            $titre,
            $description,
            $categorie,
            $type,
            $lieu,
            $dateEvenement,
            $contact,
            $photoPath
        ]);
        $newId = (int)$db->lastInsertId();

        $stmt = $db->prepare("
            SELECT o.*, u.nom AS auteur_nom, u.prenom AS auteur_prenom, u.role AS auteur_role
            FROM objets o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        ");
        $stmt->execute([$newId]);
        $objet = $stmt->fetch();

        jsonResponse([
            'success' => true,
            'message' => 'Annonce publiée avec succès !',
            'data' => $objet
        ], 201);
    } catch (PDOException $e) {
        jsonError("Erreur lors de l'enregistrement de l'annonce. Veuillez réessayer.", 500);
    }
} else {
    jsonError("Méthode non autorisée.", 405);
}
