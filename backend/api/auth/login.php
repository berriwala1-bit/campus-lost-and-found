<?php
// backend/api/auth/login.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/jwt.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Méthode non autorisée.", 405);
}

$input = getJsonInput();

$email = strtolower(trim($input['email'] ?? ''));
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    jsonError("Veuillez saisir votre adresse email et votre mot de passe.", 422);
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("SELECT id, nom, prenom, email, password, role, telephone, statut FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonError("Identifiants incorrects. Veuillez vérifier votre email et mot de passe.", 401);
}

if ($user['statut'] !== 'actif') {
    jsonError("Ce compte a été désactivé par l'administrateur. Veuillez contacter le support.", 403);
}

unset($user['password']);

$token = JWT::generate([
    'user_id' => (int)$user['id'],
    'role' => $user['role']
]);
JWT::store($db, $token, (int)$user['id']);

jsonResponse([
    'success' => true,
    'message' => 'Connexion réussie.',
    'token' => $token,
    'user' => [
        'id' => (int)$user['id'],
        'nom' => $user['nom'],
        'prenom' => $user['prenom'],
        'email' => $user['email'],
        'role' => $user['role'],
        'telephone' => $user['telephone'],
        'statut' => $user['statut']
    ]
]);
