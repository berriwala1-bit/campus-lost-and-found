<?php
// backend/api/objets/partages.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/response.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $currentUser = optionalAuth($db);
        $currentUserId = $currentUser ? (int)$currentUser['id'] : 0;
        $objetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $query = "SELECT p.id, p.objet_id, p.user_id, p.created_at,
                         o.titre, o.description, o.categorie, o.type, o.lieu,
                         o.date_evenement, o.photo, o.statut AS objet_statut,
                         u.nom AS partageur_nom, u.prenom AS partageur_prenom,
                         u.role AS partageur_role,
                         EXISTS(SELECT 1 FROM partages mine WHERE mine.objet_id = p.objet_id AND mine.user_id = ?) AS partage_par_moi
                  FROM partages p
                  LEFT JOIN objets o ON o.id = p.objet_id
                  LEFT JOIN users u ON u.id = p.user_id";
        $params = [$currentUserId];
        if ($objetId > 0) {
            $query .= ' WHERE p.objet_id = ?';
            $params[] = $objetId;
        }
        $query .= ' ORDER BY p.created_at DESC, p.id DESC';
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $partages = $stmt->fetchAll();
        foreach ($partages as &$partage) {
            $partage['partage_par_moi'] = (bool)$partage['partage_par_moi'];
        }
        unset($partage);
        jsonResponse(['success' => true, 'count' => count($partages), 'data' => $partages]);
    }

    if (!in_array($method, ['POST', 'DELETE'], true)) {
        jsonError('Méthode non autorisée.', 405);
    }

    $currentUser = requireAuth($db);
    $input = $method === 'POST' ? getJsonInput() : [];
    $objetId = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['objet_id'] ?? $input['id'] ?? 0);
    if ($objetId <= 0) {
        jsonError('Identifiant de l’annonce invalide.', 422);
    }

    $check = $db->prepare('SELECT id FROM objets WHERE id = ?');
    $check->execute([$objetId]);
    if (!$check->fetch()) {
        jsonError('Annonce introuvable.', 404);
    }

    $userId = (int)$currentUser['id'];
    if ($method === 'POST') {
        $insert = $db->prepare('INSERT INTO partages (objet_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
        $insert->execute([$objetId, $userId]);
        $partageId = (int)$db->lastInsertId();
        $existing = $db->prepare('SELECT id FROM partages WHERE objet_id = ? AND user_id = ?');
        $existing->execute([$objetId, $userId]);
        $partageId = (int)$existing->fetchColumn();
        $message = 'Annonce partagée avec succès.';
        $dejaPartage = true;
    } else {
        $delete = $db->prepare('DELETE FROM partages WHERE objet_id = ? AND user_id = ?');
        $delete->execute([$objetId, $userId]);
        $partageId = null;
        $message = 'Partage retiré.';
        $dejaPartage = false;
    }

    $countStmt = $db->prepare('SELECT COUNT(*) FROM partages WHERE objet_id = ?');
    $countStmt->execute([$objetId]);
    jsonResponse([
        'success' => true,
        'message' => $message,
        'partage_id' => $partageId,
        'deja_partage' => $dejaPartage,
        'partages_count' => (int)$countStmt->fetchColumn()
    ]);
} catch (PDOException $e) {
    error_log('Partages API: ' . $e->getMessage());
    jsonError('Erreur de base de données lors du traitement des partages.', 500);
} catch (Throwable $e) {
    error_log('Partages API: ' . $e->getMessage());
    jsonError('Erreur serveur lors du traitement des partages.', 500);
}
