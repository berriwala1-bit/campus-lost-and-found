<?php
// backend/api/reclamations/soutiens.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/reclamation_access.php';

$database = new Database();
$db = $database->getConnection();
$currentUser = requireAuth($db);

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

$reclamationId = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['reclamation_id'] ?? 0);

if ($reclamationId <= 0) {
    jsonError("Identifiant de la réclamation invalide.", 422);
}

requireReclamationAccess($db, $reclamationId, $currentUser);

$userId = (int)$currentUser['id'];

// Vérifier l'état actuel du soutien
$soutienCheck = $db->prepare("SELECT id FROM soutiens WHERE reclamation_id = ? AND user_id = ?");
$soutienCheck->execute([$reclamationId, $userId]);
$hasSupported = (bool)$soutienCheck->fetch();

if ($method === 'POST') {
    // Si déjà soutenu, on retire le soutien (toggle) ou on renvoie une erreur selon paramètre
    $action = $input['action'] ?? 'toggle';

    if ($hasSupported) {
        if ($action === 'add') {
            jsonError("Vous soutenez déjà cette réclamation.", 409);
        }
        // Retirer le soutien
        $del = $db->prepare("DELETE FROM soutiens WHERE reclamation_id = ? AND user_id = ?");
        $del->execute([$reclamationId, $userId]);
        $supportedNow = false;
        $msg = "Soutien retiré.";
    } else {
        // Ajouter le soutien
        $ins = $db->prepare("INSERT INTO soutiens (reclamation_id, user_id, created_at) VALUES (?, ?, NOW())");
        $ins->execute([$reclamationId, $userId]);
        $supportedNow = true;
        $msg = "Réclamation soutenue avec succès.";
    }
} elseif ($method === 'DELETE') {
    $del = $db->prepare("DELETE FROM soutiens WHERE reclamation_id = ? AND user_id = ?");
    $del->execute([$reclamationId, $userId]);
    $supportedNow = false;
    $msg = "Soutien retiré.";
} else {
    jsonError("Méthode non autorisée.", 405);
}

// Obtenir le nombre de soutiens actualisé
$countStmt = $db->prepare("SELECT COUNT(*) FROM soutiens WHERE reclamation_id = ?");
$countStmt->execute([$reclamationId]);
$newCount = (int)$countStmt->fetchColumn();

jsonResponse([
    'success' => true,
    'message' => $msg,
    'soutiens_count' => $newCount,
    'user_a_soutenu' => $supportedNow
]);
