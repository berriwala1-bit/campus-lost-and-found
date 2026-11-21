<?php
// backend/utils/response.php
declare(strict_types=1);

set_exception_handler(static function (Throwable $exception): void {
    error_log((string)$exception);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur interne du serveur. Réessayez plus tard.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function jsonSuccess(string $message = 'Opération réussie', array $extra = [], int $code = 200): void {
    jsonResponse(array_merge([
        'success' => true,
        'message' => $message
    ], $extra), $code);
}

function jsonError(string $message, int $code = 400, ?array $errors = null): void {
    $payload = [
        'success' => false,
        'message' => $message
    ];
    if ($errors !== null) {
        $payload['errors'] = $errors;
    }
    jsonResponse($payload, $code);
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        jsonError('Corps de requête JSON invalide.', 400);
    }
    return $decoded;
}
