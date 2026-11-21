<?php
// backend/utils/jwt.php
declare(strict_types=1);

require_once __DIR__ . '/../config/jwt.php';

class JWT {
    private static function config(): array {
        static $config = null;
        if ($config === null) {
            $config = require __DIR__ . '/../config/jwt.php';
        }
        return $config;
    }

    private static function secret(): string {
        return (string)self::config()['secret'];
    }

    public static function expirySeconds(): int {
        return (int)self::config()['expiry_seconds'];
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'), true) ?: '';
    }

    public static function generate(array $payload, ?int $expirySeconds = null): string {
        $expirySeconds ??= self::expirySeconds();
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;

        $encodedHeader = self::base64UrlEncode((string)json_encode($header));
        $encodedPayload = self::base64UrlEncode((string)json_encode($payload));

        $signature = hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", self::secret(), true);
        return "{$encodedHeader}.{$encodedPayload}." . self::base64UrlEncode($signature);
    }

    public static function verify(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3 || $parts[0] === '' || $parts[1] === '' || $parts[2] === '') {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $header = json_decode(self::base64UrlDecode($encodedHeader), true);
        if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256' || ($header['typ'] ?? null) !== 'JWT') {
            return null;
        }

        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", self::secret(), true)
        );
        if (!hash_equals($expectedSignature, $encodedSignature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);
        if (!is_array($payload) || !isset($payload['user_id']) || !is_int($payload['user_id'])) {
            return null;
        }

        if (!isset($payload['exp']) || !is_int($payload['exp']) || $payload['exp'] <= time()) {
            return null;
        }

        return $payload;
    }

    public static function store(PDO $db, string $token, int $userId, ?array $payload = null): void {
        $payload ??= self::verify($token) ?? [];
        $expiresAt = date('Y-m-d H:i:s', (int)($payload['exp'] ?? (time() + self::expirySeconds())));
        $stmt = $db->prepare(
            'INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
        );
        $stmt->execute([$userId, hash('sha256', $token), $expiresAt]);
    }

    public static function isActive(PDO $db, string $token): bool {
        $stmt = $db->prepare(
            'SELECT user_id FROM auth_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([hash('sha256', $token)]);
        return (bool)$stmt->fetch();
    }

    public static function revoke(PDO $db, string $token): void {
        $stmt = $db->prepare(
            'UPDATE auth_tokens SET revoked = 1 WHERE token_hash = ?'
        );
        $stmt->execute([hash('sha256', $token)]);
    }
}
