<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/reclamation_access.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError("Méthode non autorisée.", 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    jsonError("Identifiant de réclamation invalide.", 400);
}

$database = new Database();
$db = $database->getConnection();
$currentUser = requireAuth($db);
requireReclamationAccess($db, $id, $currentUser);

$stmt = $db->prepare("SELECT piece_jointe FROM reclamations WHERE id = ?");
$stmt->execute([$id]);
$pieceJointe = $stmt->fetchColumn();

if (!is_string($pieceJointe) || !str_starts_with($pieceJointe, 'reclamations/')) {
    jsonError("Pièce jointe introuvable.", 404);
}

$fileName = substr($pieceJointe, strlen('reclamations/'));
if ($fileName === '' || basename($fileName) !== $fileName) {
    jsonError("Pièce jointe introuvable.", 404);
}

$uploadDirectory = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'reclamations');
$filePath = $uploadDirectory === false
    ? false
    : realpath($uploadDirectory . DIRECTORY_SEPARATOR . $fileName);

if ($filePath === false || !str_starts_with($filePath, $uploadDirectory . DIRECTORY_SEPARATOR) || !is_file($filePath) || !is_readable($filePath)) {
    jsonError("Pièce jointe introuvable.", 404);
}

$mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($filePath);
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'application/pdf' => 'pdf'
];
if (!is_string($mimeType) || !isset($extensions[$mimeType])) {
    jsonError("Format de pièce jointe non pris en charge.", 415);
}

header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="reclamation-' . $id . '-piece-jointe.' . $extensions[$mimeType] . '"');
header('Content-Length: ' . filesize($filePath));
header('X-Content-Type-Options: nosniff');
readfile($filePath);
exit;
