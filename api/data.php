<?php
declare(strict_types=1);

use PDO;
use PDOException;

header('Content-Type: application/json; charset=UTF-8');

$configFile = __DIR__ . '/config.php';
$config = loadConfig($configFile);
$pdo = connectDatabase($config);

$dataDir = __DIR__ . '/../data';
$dataFile = $dataDir . '/store.json';
$defaultData = [
    'users' => [
        ['name' => 'Demo User 1', 'phone' => '09123456789', 'active' => true],
        ['name' => 'Demo User 2', 'phone' => '09350001122', 'active' => false]
    ],
    'branches' => [
        [
            'id' => 'branch-main',
            'name' => 'Main Branch',
            'systems' => [
                ['id' => 'system-1', 'name' => 'Gaming Station', 'pricesByPeriod' => []]
            ],
            'periods' => [
                [
                    'id' => 'default',
                    'start' => 0,
                    'end' => 1440,
                    'defaultPrices' => [
                        'p1' => 150000,
                        'p2' => 200000,
                        'p3' => 260000,
                        'p4' => 320000,
                        'birthday' => 500000,
                        'film' => 350000
                    ]
                ]
            ]
        ]
    ],
    'settings' => [
        'title' => 'Great Panel',
        'timezone' => 'Asia/Tehran',
        'panelName' => 'Great Panel'
    ]
];

$data = normalizeData(loadJsonData($dataFile, $defaultData), $defaultData);

if ($pdo) {
    $dbData = loadDataFromDb($pdo, $config);
    if (is_array($dbData)) {
        $data = normalizeData($dbData, $defaultData);
    } else {
        saveDataToDb($pdo, $data, $config);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true) ?? [];
    $action = $payload['action'] ?? '';

    if ($action === 'add_user' && !empty($payload['user'])) {
        $user = $payload['user'];
        $name = trim((string)($user['name'] ?? ''));
        if ($name !== '') {
            $phone = trim((string)($user['phone'] ?? ''));
            $data['users'][] = [
                'name' => $name,
                'phone' => $phone,
                'active' => !empty($user['active']),
                'createdAt' => time()
            ];
        }
    } elseif ($action === 'save_settings' && !empty($payload['settings'])) {
        $settings = $payload['settings'];
        foreach (['title', 'timezone', 'panelName'] as $field) {
            if (array_key_exists($field, $settings)) {
                $value = $settings[$field];
                $data['settings'][$field] = is_string($value) ? trim($value) : $value;
            }
        }
    }

    $data = normalizeData($data, $defaultData);
    persistData($data, $dataFile, $pdo, $config);
    echo json_encode(['status' => 'ok']);
    exit;
}

echo json_encode($data);
exit;

function loadConfig(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $config = include $path;
    return is_array($config) ? $config : [];
}

function loadJsonData(string $path, array $defaults): array
{
    if (!is_file($path)) {
        return $defaults;
    }
    $content = file_get_contents($path);
    if ($content === false) {
        return $defaults;
    }
    $decoded = json_decode($content, true);
    if (!is_array($decoded)) {
        return $defaults;
    }
    return $decoded;
}

function normalizeData(array $data, array $defaults): array
{
    $result = $data;
    $result['users'] = array_values(
        is_array($result['users'] ?? null) ? $result['users'] : $defaults['users']
    );
    $result['branches'] = array_values(
        is_array($result['branches'] ?? null) ? $result['branches'] : $defaults['branches']
    );
    $result['settings'] = array_merge(
        $defaults['settings'],
        is_array($result['settings'] ?? null) ? $result['settings'] : []
    );
    return $result;
}

function persistData(array $data, string $file, ?PDO $pdo, array $config): void
{
    $directory = dirname($file);
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($pdo) {
        saveDataToDb($pdo, $data, $config);
    }
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
