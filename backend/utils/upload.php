<?php
// backend/utils/upload.php
declare(strict_types=1);

class Uploader {
    public static function handleUpload(
        array $file,
        string $subDir = 'objets',
        array $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
        int $maxSizeBytes = 5 * 1024 * 1024
    ): ?string {
        if (!isset($file['error']) || is_array($file['error'])) {
            throw new Exception("Paramètres de fichier invalides.");
        }

        if ($file['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Erreur lors du téléversement du fichier (Code: {$file['error']}).");
        }

        if ($file['size'] > $maxSizeBytes) {
            throw new Exception("La taille du fichier dépasse la limite autorisée (5 Mo).");
        }

        // Vérification MIME type réelle avec finfo
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        if (!in_array($mime, $allowedTypes, true)) {
            throw new Exception("Format de fichier non autorisé. Formats acceptés : " . implode(', ', $allowedTypes));
        }

        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf'
        ];
        $ext = $extensions[$mime] ?? 'bin';

        $uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $subDir . DIRECTORY_SEPARATOR;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uniqueName = $subDir . '_' . bin2hex(random_bytes(8)) . '_' . time() . '.' . $ext;
        $destination = $uploadDir . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception("Échec de l'enregistrement du fichier sur le serveur.");
        }

        return $subDir . '/' . $uniqueName;
    }
}
