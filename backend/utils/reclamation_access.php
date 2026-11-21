<?php
declare(strict_types=1);

function requireReclamationAccess(PDO $db, int $reclamationId, array $currentUser): array
{
    $stmt = $db->prepare("SELECT id, user_id FROM reclamations WHERE id = ?");
    $stmt->execute([$reclamationId]);
    $reclamation = $stmt->fetch();

    if (!$reclamation) {
        jsonError("Réclamation introuvable.", 404);
    }

    $isOwner = (int)$reclamation['user_id'] === (int)$currentUser['id'];
    $isAdmin = $currentUser['role'] === 'admin';
    if (!$isOwner && !$isAdmin) {
        jsonError("Vous n'êtes pas autorisé à accéder à cette réclamation.", 403);
    }

    return $reclamation;
}
