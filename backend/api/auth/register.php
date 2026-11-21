<?php
// backend/api/auth/register.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/jwt.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Méthode non autorisée.", 405);
}

$input = getJsonInput();

$nom = trim($input['nom'] ?? '');
$prenom = trim($input['prenom'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$password = $input['password'] ?? '';
$passwordConfirm = $input['password_confirmation'] ?? $input['confirm_password'] ?? '';
$role = trim($input['role'] ?? 'etudiant');
$telephone = trim($input['telephone'] ?? '');

$errors = [];

if (empty($nom)) {
    $errors['nom'] = "Le nom est obligatoire.";
}
if (empty($prenom)) {
    $errors['prenom'] = "Le prénom est obligatoire.";
}
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = "Une adresse email valide est obligatoire.";
}
if (strlen($password) < 6) {
    $errors['password'] = "Le mot de passe doit comporter au moins 6 caractères.";
}
if ($password !== $passwordConfirm) {
    $errors['password_confirmation'] = "Les mots de passe ne correspondent pas.";
}

// Interdiction formelle de créer un admin via l'inscription publique
$allowedRoles = ['etudiant', 'enseignant', 'personnel'];
if (!in_array($role, $allowedRoles, true)) {
    $errors['role'] = "Profil non valide. Choisissez parmi : Étudiant, Enseignant ou Personnel.";
}

if (!empty($errors)) {
    jsonError("Erreurs de validation.", 422, $errors);
}

$database = new Database();
$db = $database->getConnection();

// Vérifier l'unicité de l'email
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError("Cette adresse email est déjà utilisée par un autre compte.", 409);
}

// Hachage sécurisé du mot de passe
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

$insert = $db->prepare("
    INSERT INTO users (nom, prenom, email, password, role, telephone, statut, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'actif', NOW())
");

try {
    $insert->execute([$nom, $prenom, $email, $hashedPassword, $role, $telephone ?: null]);
    $userId = (int)$db->lastInsertId();

    $user = [
        'id' => $userId,
        'nom' => $nom,
        'prenom' => $prenom,
        'email' => $email,
        'role' => $role,
        'telephone' => $telephone ?: null,
        'statut' => 'actif'
    ];

    $token = JWT::generate(['user_id' => $userId, 'role' => $role]);
    JWT::store($db, $token, $userId);

    jsonResponse([
        'success' => true,
        'message' => 'Inscription réussie ! Bienvenue sur Campus Lost & Found.',
        'token' => $token,
        'user' => $user
    ], 201);
} catch (PDOException $e) {
    jsonError("Une erreur est survenue lors de la création du compte.", 500);
}
