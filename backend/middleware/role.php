<?php
// backend/middleware/role.php
declare(strict_types=1);

require_once __DIR__ . '/../utils/response.php';

function requireRole(array $user, array|string $roles): void {
    $rolesArray = is_array($roles) ? $roles : [$roles];
    if (!in_array($user['role'], $rolesArray, true)) {
        jsonError("Accès refusé : permissions insuffisantes pour effectuer cette action.", 403);
    }
}

function requireAdmin(array $user): void {
    requireRole($user, 'admin');
}
