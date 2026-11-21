<?php
// backend/api/admin/stats.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/role.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError("Méthode non autorisée.", 405);
}

$database = new Database();
$db = $database->getConnection();
$currentUser = requireAuth($db);
requireAdmin($currentUser);

// 1. Statistiques utilisateurs
$stmtUsers = $db->query("
    SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'etudiant' THEN 1 ELSE 0 END) AS nb_etudiants,
        SUM(CASE WHEN role = 'enseignant' THEN 1 ELSE 0 END) AS nb_enseignants,
        SUM(CASE WHEN role = 'personnel' THEN 1 ELSE 0 END) AS nb_personnels,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS nb_admins,
        SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) AS nb_actifs,
        SUM(CASE WHEN statut = 'inactif' THEN 1 ELSE 0 END) AS nb_inactifs
    FROM users
");
$userStats = $stmtUsers->fetch();

// 2. Statistiques objets
$stmtObjets = $db->query("
    SELECT 
        COUNT(*) AS total_objets,
        SUM(CASE WHEN type = 'trouve' THEN 1 ELSE 0 END) AS nb_objets_trouves,
        SUM(CASE WHEN type = 'perdu' THEN 1 ELSE 0 END) AS nb_objets_perdus,
        SUM(CASE WHEN type = 'perdu' AND statut IN ('actif', 'en_cours') THEN 1 ELSE 0 END) AS nb_objets_perdus_actifs,
        SUM(CASE WHEN statut = 'recupere' THEN 1 ELSE 0 END) AS nb_objets_recuperes,
        SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) AS nb_objets_actifs,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS nb_objets_en_cours,
        SUM(CASE WHEN statut = 'cloture' THEN 1 ELSE 0 END) AS nb_objets_clotures
    FROM objets
");
$objetStats = $stmtObjets->fetch();

// 3. Statistiques réclamations
$stmtReclamations = $db->query("
    SELECT 
        COUNT(*) AS total_reclamations,
        SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) AS nb_reclamations_en_attente,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS nb_reclamations_en_cours,
        SUM(CASE WHEN statut = 'resolue' THEN 1 ELSE 0 END) AS nb_reclamations_resolues,
        SUM(CASE WHEN statut = 'refusee' THEN 1 ELSE 0 END) AS nb_reclamations_refusees
    FROM reclamations
");
$recStats = $stmtReclamations->fetch();

// 4. Répartition des objets par catégorie (pour graphiques)
$stmtCatObjets = $db->query("
    SELECT categorie, COUNT(*) as count 
    FROM objets 
    GROUP BY categorie 
    ORDER BY count DESC 
    LIMIT 6
");
$categoriesObjets = $stmtCatObjets->fetchAll();

// 5. Répartition des réclamations par catégorie (pour graphiques)
$stmtCatRec = $db->query("
    SELECT categorie, COUNT(*) as count 
    FROM reclamations 
    GROUP BY categorie 
    ORDER BY count DESC
");
$categoriesReclamations = $stmtCatRec->fetchAll();

// 6. Activité récente (derniers objets et dernières réclamations)
$stmtRecentObjets = $db->query("
    SELECT o.id, o.titre, o.type, o.statut, o.created_at, u.nom, u.prenom 
    FROM objets o 
    JOIN users u ON o.user_id = u.id 
    ORDER BY o.created_at DESC 
    LIMIT 5
");
$recentObjets = $stmtRecentObjets->fetchAll();

$stmtRecentRec = $db->query("
    SELECT r.id, r.titre, r.categorie, r.statut, r.created_at, u.nom, u.prenom 
    FROM reclamations r 
    JOIN users u ON r.user_id = u.id 
    ORDER BY r.created_at DESC 
    LIMIT 5
");
$recentReclamations = $stmtRecentRec->fetchAll();

jsonResponse([
    'success' => true,
    'data' => [
        'users' => [
            'total' => (int)($userStats['total_users'] ?? 0),
            'etudiants' => (int)($userStats['nb_etudiants'] ?? 0),
            'enseignants' => (int)($userStats['nb_enseignants'] ?? 0),
            'personnels' => (int)($userStats['nb_personnels'] ?? 0),
            'admins' => (int)($userStats['nb_admins'] ?? 0),
            'actifs' => (int)($userStats['nb_actifs'] ?? 0),
            'inactifs' => (int)($userStats['nb_inactifs'] ?? 0),
        ],
        'objets' => [
            'total' => (int)($objetStats['total_objets'] ?? 0),
            'trouves' => (int)($objetStats['nb_objets_trouves'] ?? 0),
            'perdus' => (int)($objetStats['nb_objets_perdus'] ?? 0),
            'perdus_actifs' => (int)($objetStats['nb_objets_perdus_actifs'] ?? 0),
            'recuperes' => (int)($objetStats['nb_objets_recuperes'] ?? 0),
            'actifs' => (int)($objetStats['nb_objets_actifs'] ?? 0),
            'en_cours' => (int)($objetStats['nb_objets_en_cours'] ?? 0),
            'clotures' => (int)($objetStats['nb_objets_clotures'] ?? 0),
        ],
        'reclamations' => [
            'total' => (int)($recStats['total_reclamations'] ?? 0),
            'en_attente' => (int)($recStats['nb_reclamations_en_attente'] ?? 0),
            'en_cours' => (int)($recStats['nb_reclamations_en_cours'] ?? 0),
            'resolues' => (int)($recStats['nb_reclamations_resolues'] ?? 0),
            'refusees' => (int)($recStats['nb_reclamations_refusees'] ?? 0),
        ],
        'categories_objets' => $categoriesObjets,
        'categories_reclamations' => $categoriesReclamations,
        'recent_objets' => $recentObjets,
        'recent_reclamations' => $recentReclamations,
    ]
]);
