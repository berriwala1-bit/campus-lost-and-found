<?php
// backend/config/database.php
declare(strict_types=1);

class Database {
    private string $host = '127.0.0.1';
    private string $db_name = 'campus_lost_found';
    private string $username = 'root';
    private string $password = '';
    private string $charset = 'utf8mb4';
    private ?PDO $conn = null;

    public function getConnection(): ?PDO {
        $this->conn = null;

        $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Erreur de connexion à la base de données. Veuillez réessayer plus tard.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        return $this->conn;
    }
}
