<?php
declare(strict_types=1);

function loadUsersFromUsersTable(PDO $pdo): array
{
    try {
        $stmt = $pdo->query('SELECT `code`, `fullname`, `phone`, `work_id`, `id_number` FROM `users` ORDER BY `fullname` ASC, `code` ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $err) {
        error_log('Failed to fetch users table: ' . $err->getMessage());
        return [];
    }

    if (!is_array($rows)) {
        return [];
    }

    return array_values(array_map(function ($row) {
        $name = trim((string)($row['fullname'] ?? ''));
        if ($name === '' || $name === '0') {
            $name = trim((string)($row['code'] ?? ''));
        }
        $code = trim((string)($row['code'] ?? ''));
        return [
            'code' => $code,
            'name' => $name ?: 'User',
            'phone' => trim((string)($row['phone'] ?? '')),
            'work_id' => trim((string)($row['work_id'] ?? '')),
            'id_number' => trim((string)($row['id_number'] ?? '')),
            'active' => true
        ];
    }, $rows));
}

function loadUserByCode(PDO $pdo, string $code): ?array
{
    $code = trim($code);
    if ($code === '') {
        return null;
    }
    try {
        $stmt = $pdo->prepare('SELECT `code`, `username`, `fullname`, `phone`, `email`, `id_number`, `work_id`, `password_hash` FROM `users` WHERE `code` = :code LIMIT 1');
        $stmt->execute([':code' => $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $err) {
        error_log('Failed to load user by code: ' . $err->getMessage());
        return null;
    }
    return is_array($row) ? $row : null;
}

function isUsernameTaken(PDO $pdo, string $username, string $excludeCode = ''): bool
{
    $username = trim($username);
    if ($username === '') {
        return true;
    }
    $sql = 'SELECT COUNT(*) FROM `users` WHERE `username` = :username';
    if ($excludeCode !== '') {
        $sql .= ' AND `code` != :code';
    }
    try {
        $stmt = $pdo->prepare($sql);
        $params = [':username' => $username];
        if ($excludeCode !== '') {
            $params[':code'] = $excludeCode;
        }
        $stmt->execute($params);
        $count = (int)$stmt->fetchColumn();
    } catch (PDOException $err) {
        error_log('Failed to check username availability: ' . $err->getMessage());
        return true;
    }
    return $count > 0;
}

function updateUserByCode(PDO $pdo, string $code, array $fields): bool
{
    $code = trim($code);
    if ($code === '') {
        return false;
    }
    $allowed = ['fullname', 'username', 'phone', 'email', 'password_hash', 'id_number', 'work_id'];
    $updates = [];
    $params = [];
    foreach ($fields as $key => $value) {
        if (!in_array($key, $allowed, true)) {
            continue;
        }
        $updates[] = "`$key` = :$key";
        $params[":$key"] = $value;
    }
    if (!$updates) {
        return false;
    }
    $params[':code'] = $code;
    $setClause = implode(', ', $updates);
    try {
        $stmt = $pdo->prepare("UPDATE `users` SET $setClause WHERE `code` = :code");
        return $stmt->execute($params);
    } catch (PDOException $err) {
        error_log('Failed to update user: ' . $err->getMessage());
        return false;
    }
}

function updateUserRecord(PDO $pdo, string $code, string $fullname, string $phone, string $workId, string $idNumber): bool
{
    if ($code === '') {
        return false;
    }
    $stmt = $pdo->prepare('
        UPDATE `users`
        SET `fullname` = :fullname,
            `phone` = :phone,
            `work_id` = :work_id,
            `id_number` = :id_number
        WHERE `code` = :code
    ');
    return $stmt->execute([
        ':fullname' => $fullname,
        ':phone' => $phone,
        ':work_id' => $workId,
        ':id_number' => $idNumber,
        ':code' => $code
    ]);
}
