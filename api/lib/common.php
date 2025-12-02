<?php
declare(strict_types=1);

function loadConfig(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $config = include $path;
    return is_array($config) ? $config : [];
}

function connectDatabase(array $config): ?PDO
{
    $host = $config['host'] ?? '';
    $dbname = $config['dbname'] ?? '';
    if ($host === '' || $dbname === '') {
        return null;
    }
    $port = (int)($config['port'] ?? 3306);
    $charset = $config['charset'] ?? 'utf8mb4';
    $user = $config['user'] ?? '';
    $password = $config['password'] ?? '';

    try {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $dbname, $charset);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        $pdo = new PDO($dsn, $user, $password, $options);
        ensureStoreTable($pdo, resolveTableName($config));
        return $pdo;
    } catch (PDOException $e) {
        error_log('MySQL connection failed: ' . $e->getMessage());
        return null;
    }
}

function ensureStoreTable(PDO $pdo, string $tableName): void
{
    if ($tableName === '') {
        return;
    }
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `$tableName` (
  `id` varchar(64) NOT NULL,
  `payload` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
    $pdo->exec($sql);
}

function resolveTableName(array $config): string
{
    $table = trim((string)($config['table'] ?? 'app_store'));
    $safe = preg_replace('/[^a-z0-9_]/', '', strtolower($table));
    return $safe ?: 'app_store';
}

function resolveRecordId(array $config): string
{
    $record = trim((string)($config['record'] ?? 'store'));
    return $record === '' ? 'store' : $record;
}

function loadDataFromDb(PDO $pdo, array $config): ?array
{
    $table = resolveTableName($config);
    if ($table === '') {
        return null;
    }
    $stmt = $pdo->prepare("SELECT `payload` FROM `$table` WHERE `id` = :id LIMIT 1");
    $stmt->execute([':id' => resolveRecordId($config)]);
    $payload = $stmt->fetchColumn();
    if ($payload === false) {
        return null;
    }
    $decoded = json_decode((string)$payload, true);
    return is_array($decoded) ? $decoded : null;
}

function saveDataToDb(PDO $pdo, array $data, array $config): bool
{
    $table = resolveTableName($config);
    if ($table === '') {
        return false;
    }
    $stmt = $pdo->prepare("
        INSERT INTO `$table` (`id`, `payload`)
        VALUES (:id, :payload)
        ON DUPLICATE KEY UPDATE `payload` = VALUES(`payload`), `updated_at` = CURRENT_TIMESTAMP
    ");
    return $stmt->execute([
        ':id' => resolveRecordId($config),
        ':payload' => json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    ]);
}
