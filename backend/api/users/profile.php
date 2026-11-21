<?php
// backend/api/users/profile.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';

$database = new Database();
$db = $database->getConnection();
$currentUser = requireAuth($db);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Obtenir le profil et les statistiques personnelles
    $userId = (int)$currentUser['id'];

    $stmtObjets = $db->prepare("SELECT COUNT(*) FROM objets WHERE user_id = ?");
    $stmtObjets->execute([$userId]);
    $nbObjets = (int)$stmtObjets->fetchColumn();

    $stmtReclamations = $db->prepare("SELECT COUNT(*) FROM reclamations WHERE user_id = ?");
    $stmtReclamations->execute([$userId]);
    $nbReclamations = (int)$stmtReclamations->fetchColumn();

    jsonResponse([
        'success' => true,
        'user' => $currentUser,
        'stats' => [
            'objets_publies' => $nbObjets,
            'reclamations_creees' => $nbReclamations
        ]
    ]);
} elseif ($method === 'PUT') {
    $input = getJsonInput();

    $nom = trim($input['nom'] ?? $currentUser['nom']);
    $prenom = trim($input['prenom'] ?? $currentUser['prenom']);
    $telephone = trim($input['telephone'] ?? ($currentUser['telephone'] ?? ''));
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';

    if (empty($nom) || empty($prenom)) {
        jsonError("Le nom et le prénom ne peuvent pas être vides.", 422);
    }

    $passwordToUpdate = null;
    if (!empty($newPassword)) {
        if (empty($currentPassword)) {
            jsonError("Veuillez saisir votre mot de passe actuel pour le modifier.", 422);
        }

        // Vérifier le mot de passe actuel
        $checkStmt = $db->prepare("SELECT password FROM users WHERE id = ?");
        $checkStmt->execute([$currentUser['id']]);
        $realHash = $checkStmt->fetchColumn();

        if (!password_verify($currentPassword, $realHash)) {
            jsonError("Le mot de passe actuel est incorrect.", 403);
        }

        if (strlen($newPassword) < 6) {
            jsonError("Le nouveau mot de passe doit contenir au moins 6 caractères.", 422);
        }

        $passwordToUpdate = password_hash($newPassword, PASSWORD_BCRYPT);
    }

    if ($passwordToUpdate) {
        $updateStmt = $db->prepare("
            UPDATE users SET nom = ?, prenom = ?, telephone = ?, password = ? WHERE id = ?
        ");
        $updateStmt->execute([$nom, $prenom, $telephone ?: null, $passwordToUpdate, $currentUser['id']]);
    } else {
        $updateStmt = $db->prepare("
            UPDATE users SET nom = ?, prenom = ?, telephone = ? WHERE id = ?
        ");
        $updateStmt->execute([$nom, $prenom, $telephone ?: null, $currentUser['id']]);
    }

    $stmt = $db->prepare("SELECT id, nom, prenom, email, role, telephone, statut, created_at FROM users WHERE id = ?");
    $stmt->execute([$currentUser['id']]);
    $updatedUser = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'Profil mis à jour avec succès.',
        'user' => $updatedUser
    ]);
} else {
    jsonError("Méthode non autorisée.", 405);
}
