<?php
// backend/config/jwt.php
declare(strict_types=1);

return [
    // Secret aléatoire local. Peut être surchargé par la variable d'environnement JWT_SECRET.
    'secret' => getenv('JWT_SECRET') ?: '1aa68e2b2c6706c192c1b22c65d5485ba12ccdf61a20175ac86dc45d7dde6728db38859e82acef938c9d6211735607ff',
    'expiry_seconds' => 86400 * 7
];
