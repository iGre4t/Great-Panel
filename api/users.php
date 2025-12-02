<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/users.php';

header('Content-Type: application/json; charset=UTF-8');

$config = loadConfig(__DIR__ . '/config.php');
$pdo = connectDatabase($config);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true) ?? [];
    if (($payload['action'] ?? '') === 'update_user' && !empty($payload['user']) && $pdo) {
        $user = $payload['user'];
        $code = trim((string)($user['code'] ?? ''));
        if ($code === '') {
            sendJsonResponse(['status' => 'error', 'message' => 'کد کاربری یافت نشد.']);
        }
        $name = trim((string)($user['name'] ?? ''));
        $phone = trim((string)($user['phone'] ?? ''));
        $workId = trim((string)($user['work_id'] ?? ''));
        $idNumber = trim((string)($user['id_number'] ?? ''));
        try {
            $updated = updateUserRecord($pdo, $code, $name, $phone, $workId, $idNumber);
            if ($updated) {
                sendJsonResponse(['status' => 'ok', 'message' => 'اطلاعات کاربر به‌روزرسانی شد.']);
            }
            sendJsonResponse(['status' => 'error', 'message' => 'کاربری با این کد یافت نشد.']);
        } catch (PDOException $err) {
            error_log('User update failed: ' . $err->getMessage());
            sendJsonResponse(['status' => 'error', 'message' => 'خطا در ذخیره اطلاعات کاربر.']);
        }
    }
    sendJsonResponse(['status' => 'error', 'message' => 'درخواست نامعتبر است.']);
}

$users = [];
if ($pdo) {
    $users = loadUsersFromUsersTable($pdo);
}

echo json_encode(['users' => $users]);
exit;

function sendJsonResponse(array $payload): void
{
    echo json_encode($payload);
    exit;
}
