<?php
// backend/api/admin/users.php
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
    $nom = trim($input['nom'] ?? '');
    $prenom = trim($input['prenom'] ?? '');
    $email = strtolower(trim($input['email'] ?? ''));
    $password = (string)($input['password'] ?? '');
    $role = trim($input['role'] ?? 'etudiant');
    $telephone = trim($input['telephone'] ?? '');
    $allowedRoles = ['etudiant', 'enseignant', 'personnel', 'admin'];
    if ($nom === '' || $prenom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || !in_array($role, $allowedRoles, true)) {
        jsonError('Nom, prénom, adresse e-mail valide, mot de passe de 8 caractères minimum et rôle valide requis.', 422);
    }
    try {
        $insert = $db->prepare("INSERT INTO users (nom, prenom, email, password, role, telephone, statut) VALUES (?, ?, ?, ?, ?, ?, 'actif')");
        $insert->execute([$nom, $prenom, $email, password_hash($password, PASSWORD_DEFAULT), $role, $telephone ?: null]);
        jsonResponse(['success' => true, 'message' => 'Utilisateur créé avec succès.', 'data' => ['id' => (int)$db->lastInsertId()]], 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') jsonError('Cette adresse e-mail est déjà utilisée.', 409);
        throw $e;
    }
} elseif ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $role = trim($_GET['role'] ?? '');
    $statut = trim($_GET['statut'] ?? '');

    $query = "
        SELECT 
            id, nom, prenom, email, role, telephone, statut, created_at, updated_at,
            (SELECT COUNT(*) FROM objets WHERE user_id = users.id) AS nb_objets,
            (SELECT COUNT(*) FROM reclamations WHERE user_id = users.id) AS nb_reclamations
        FROM users 
        WHERE 1=1
    ";
    $params = [];

    if (!empty($search)) {
        $query .= " AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    if (!empty($role) && $role !== 'all') {
        $query .= " AND role = ?";
        $params[] = $role;
    }

    if (!empty($statut) && $statut !== 'all') {
        $query .= " AND statut = ?";
        $params[] = $statut;
    }

    $query .= " ORDER BY created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($users),
        'data' => $users
    ]);

} elseif ($method === 'PUT') {
    $input = getJsonInput();
    $userId = isset($input['id']) ? (int)$input['id'] : 0;

    if ($userId <= 0) {
        jsonError("Identifiant utilisateur manquant.", 422);
    }

    // Récupérer l'utilisateur à modifier
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $targetUser = $stmt->fetch();

    if (!$targetUser) {
        jsonError("Utilisateur introuvable.", 404);
    }

    // Sécurité : l'admin ne peut pas désactiver ou rétrograder son propre compte
    if ((int)$currentUser['id'] === $userId) {
        if (isset($input['statut']) && $input['statut'] === 'inactif') {
            jsonError("Vous ne pouvez pas désactiver votre propre compte administrateur.", 400);
        }
        if (isset($input['role']) && $input['role'] !== 'admin') {
            jsonError("Vous ne pouvez pas rétrograder votre propre compte administrateur.", 400);
        }
    }

    $nom = trim($input['nom'] ?? $targetUser['nom']);
    $prenom = trim($input['prenom'] ?? $targetUser['prenom']);
    $email = strtolower(trim($input['email'] ?? $targetUser['email']));
    $role = trim($input['role'] ?? $targetUser['role']);
    $statut = trim($input['statut'] ?? $targetUser['statut']);
    $telephone = trim($input['telephone'] ?? ($targetUser['telephone'] ?? ''));

    $allowedRoles = ['etudiant', 'enseignant', 'personnel', 'admin'];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError("Adresse e-mail invalide.", 422);
    }
    $emailCheck = $db->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $emailCheck->execute([$email, $userId]);
    if ($emailCheck->fetchColumn()) {
        jsonError("Cette adresse e-mail est déjà utilisée.", 409);
    }
    if (!in_array($role, $allowedRoles, true)) {
        jsonError("Rôle invalide.", 422);
    }

    $allowedStatuts = ['actif', 'inactif'];
    if (!in_array($statut, $allowedStatuts, true)) {
        jsonError("Statut invalide.", 422);
    }

    $update = $db->prepare("
        UPDATE users 
        SET nom = ?, prenom = ?, email = ?, role = ?, statut = ?, telephone = ?, updated_at = NOW() 
        WHERE id = ?
    ");
    $update->execute([$nom, $prenom, $email, $role, $statut, $telephone ?: null, $userId]);

    jsonResponse([
        'success' => true,
        'message' => 'Utilisateur mis à jour avec succès.'
    ]);

} elseif ($method === 'DELETE') {
    $userId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($userId <= 0) {
        $input = getJsonInput();
        $userId = isset($input['id']) ? (int)$input['id'] : 0;
    }

    if ($userId <= 0) {
        jsonError("Identifiant utilisateur manquant.", 422);
    }

    if ((int)$currentUser['id'] === $userId) {
        jsonError("Impossible de supprimer votre propre compte administrateur.", 400);
    }

    $del = $db->prepare("DELETE FROM users WHERE id = ?");
    $del->execute([$userId]);

    jsonResponse([
        'success' => true,
        'message' => 'Utilisateur et ses données supprimés avec succès.'
    ]);

} else {
    jsonError("Méthode non autorisée.", 405);
}
