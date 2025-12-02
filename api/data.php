<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/lib/common.php';
require_once __DIR__ . '/lib/users.php';

header('Content-Type: application/json; charset=UTF-8');

$configFile = __DIR__ . '/config.php';
$config = loadConfig($configFile);
$pdo = connectDatabase($config);
if ($pdo) {
    ensureGallerySchema($pdo);
}

$dataDir = __DIR__ . '/../data';
$dataFile = $dataDir . '/store.json';
$defaultData = [
    'users' => [],
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
        'panelName' => 'Great Panel',
        'siteIcon' => ''
    ]
];

$data = normalizeData(loadJsonData($dataFile, $defaultData), $defaultData);

$dbData = null;
if ($pdo) {
    $dbData = loadDataFromDb($pdo, $config);
    if (is_array($dbData)) {
        $data = normalizeData($dbData, $defaultData);
    } else {
        saveDataToDb($pdo, $data, $config);
    }
}
$usersFromTable = $pdo ? loadUsersFromUsersTable($pdo) : null;

$isAuthenticated = !empty($_SESSION['authenticated']) && is_array($_SESSION['user']);
$currentUserCode = $isAuthenticated ? trim((string)($_SESSION['user']['code'] ?? '')) : '';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true) ?? [];
    $action = $payload['action'] ?? '';
    $postResponse = ['status' => 'ok'];

    if ($action === 'update_user_personal') {
        handleUserUpdatePersonal($payload, $pdo, $currentUserCode);
    } elseif ($action === 'update_user_account') {
        handleUserUpdateAccount($payload, $pdo, $currentUserCode);
    } elseif ($action === 'update_user_password') {
        handleUserUpdatePassword($payload, $pdo, $currentUserCode);
    }

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
        if (array_key_exists('siteIcon', $settings)) {
            $value = $settings['siteIcon'];
            $data['settings']['siteIcon'] = is_string($value) ? $value : '';
        }
    } elseif ($action === 'add_gallery_category') {
        if (!$pdo) {
            sendJsonResponse(['status' => 'error', 'message' => 'ارتباط با پایگاه‌داده برقرار نیست.']);
        }
        $name = trim((string)($payload['name'] ?? ''));
        if ($name === '') {
            sendJsonResponse(['status' => 'error', 'message' => 'نام دسته بندی معتبر نیست.']);
        }
        $category = createGalleryCategory($pdo, $name);
        if (empty($category['id'])) {
            sendJsonResponse(['status' => 'error', 'message' => 'خطا در ثبت دسته بندی.']);
        }
        $postResponse['message'] = 'دسته بندی جدید ذخیره شد.';
    } elseif ($action === 'update_gallery_category') {
        if (!$pdo) {
            sendJsonResponse(['status' => 'error', 'message' => 'ارتباط با پایگاه‌داده برقرار نیست.']);
        }
        $categoryId = (int)($payload['id'] ?? 0);
        $name = trim((string)($payload['name'] ?? ''));
        if ($categoryId <= 0 || $name === '') {
            sendJsonResponse(['status' => 'error', 'message' => 'داده‌های دسته بندی نامعتبر است.']);
        }
        $result = updateGalleryCategory($pdo, $categoryId, $name);
        if ($result['status'] !== 'ok') {
            sendJsonResponse($result);
        }
        $postResponse['message'] = $result['message'] ?? 'دسته بندی بروز شد.';
    } elseif ($action === 'delete_gallery_category') {
        if (!$pdo) {
            sendJsonResponse(['status' => 'error', 'message' => 'ارتباط با پایگاه‌داده برقرار نیست.']);
        }
        $categoryId = (int)($payload['id'] ?? 0);
        if ($categoryId <= 0) {
            sendJsonResponse(['status' => 'error', 'message' => 'دسته بندی انتخاب نشده است.']);
        }
        $result = deleteGalleryCategory($pdo, $categoryId);
        if ($result['status'] !== 'ok') {
            sendJsonResponse($result);
        }
        $postResponse['message'] = $result['message'] ?? 'دسته بندی حذف شد.';
    } elseif ($action === 'add_gallery_photo') {
        if (!$pdo) {
            sendJsonResponse(['status' => 'error', 'message' => 'ارتباط با پایگاه‌داده برقرار نیست.']);
        }
        $file = $_FILES['photo'] ?? null;
        if (!is_array($file)) {
            sendJsonResponse(['status' => 'error', 'message' => 'فایل تصویر ارسال نشده است.']);
        }
        $photoResult = saveGalleryPhoto($pdo, $payload, $file);
        if ($photoResult['status'] !== 'ok') {
            sendJsonResponse($photoResult);
        }
        $postResponse['message'] = 'تصویر با موفقیت بارگذاری شد.';
    }

    $data = normalizeData($data, $defaultData);
    persistData($data, $dataFile, $pdo, $config);
    sendJsonResponse($postResponse);
}

if (is_array($usersFromTable)) {
    $data['users'] = $usersFromTable;
}

$galleryCategories = $pdo ? loadGalleryCategories($pdo) : [];
$galleryPhotos = $pdo ? loadGalleryPhotos($pdo) : [];

$data['galleryCategories'] = $galleryCategories;
$data['galleryPhotos'] = $galleryPhotos;

echo json_encode($data);
exit;

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

function sendJsonResponse(array $payload): void
{
    echo json_encode($payload);
    exit;
}

function ensureGallerySchema(PDO $pdo): void
{
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `gallery_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_gallery_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gallery` (
  `photo_id` INT(10) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `alt_text` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`photo_id`),
  KEY `idx_gallery_category` (`category_id`),
  CONSTRAINT `fk_gallery_category` FOREIGN KEY (`category_id`)
    REFERENCES `gallery_category` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;

    $pdo->exec($sql);
}

function loadGalleryCategories(PDO $pdo): array
{
    try {
        $stmt = $pdo->query('SELECT `id`, `name`, `slug` FROM `gallery_category` ORDER BY `name` ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $err) {
        error_log('Failed to fetch gallery categories: ' . $err->getMessage());
        return [];
    }
    return is_array($rows) ? $rows : [];
}

function loadGalleryPhotos(PDO $pdo): array
{
    try {
        $stmt = $pdo->query(
            'SELECT
                g.photo_id,
                g.filename,
                g.title,
                g.alt_text,
                g.uploaded_at,
                g.category_id,
                gc.name AS category_name
             FROM `gallery` g
             LEFT JOIN `gallery_category` gc ON gc.id = g.category_id
             ORDER BY g.uploaded_at DESC'
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $err) {
        error_log('Failed to fetch gallery photos: ' . $err->getMessage());
        return [];
    }
    return is_array($rows) ? $rows : [];
}

function handleUserUpdatePersonal(array $payload, ?PDO $pdo, string $userCode): void
{
    if (!$pdo) {
        sendJsonResponse(['status' => 'error', 'message' => 'اتصال به پایگاه داده برقرار نیست.']);
    }
    if ($userCode === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'برای انجام این عملیات باید وارد شوید.']);
    }
    $fullname = trim((string)($payload['fullname'] ?? ''));
    if ($fullname === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'نام کامل نمی‌تواند خالی باشد.']);
    }
    if (!updateUserByCode($pdo, $userCode, ['fullname' => $fullname])) {
        sendJsonResponse(['status' => 'error', 'message' => 'خطایی هنگام ثبت نام کامل رخ داد.']);
    }
    $user = loadUserByCode($pdo, $userCode);
    if (!$user) {
        sendJsonResponse(['status' => 'error', 'message' => 'کاربر یافت نشد.']);
    }
    refreshSessionUser($user);
    sendJsonResponse([
        'status' => 'ok',
        'message' => 'نام کامل با موفقیت به‌روزرسانی شد.',
        'user' => normalizeUserForResponse($user)
    ]);
}

function handleUserUpdateAccount(array $payload, ?PDO $pdo, string $userCode): void
{
    if (!$pdo) {
        sendJsonResponse(['status' => 'error', 'message' => 'اتصال به پایگاه داده برقرار نیست.']);
    }
    if ($userCode === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'برای انجام این عملیات باید وارد شوید.']);
    }
    $username = trim((string)($payload['username'] ?? ''));
    $phone = trim((string)($payload['phone'] ?? ''));
    $email = trim((string)($payload['email'] ?? ''));
    if ($username === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'نام کاربری نمی‌تواند خالی باشد.']);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(['status' => 'error', 'message' => 'ایمیل معتبر وارد کنید.']);
    }
    if ($phone !== '' && !preg_match('/^\d{11}$/', $phone)) {
        sendJsonResponse(['status' => 'error', 'message' => 'شماره تلفن باید ۱۱ رقم باشد.']);
    }
    if (isUsernameTaken($pdo, $username, $userCode)) {
        sendJsonResponse(['status' => 'error', 'message' => 'نام کاربری انتخاب‌شده قبلاً استفاده شده است.']);
    }
    if (!updateUserByCode($pdo, $userCode, ['username' => $username, 'phone' => $phone, 'email' => $email])) {
        sendJsonResponse(['status' => 'error', 'message' => 'خطایی هنگام ثبت اطلاعات کاربری رخ داد.']);
    }
    $user = loadUserByCode($pdo, $userCode);
    if (!$user) {
        sendJsonResponse(['status' => 'error', 'message' => 'کاربر یافت نشد.']);
    }
    refreshSessionUser($user);
    sendJsonResponse([
        'status' => 'ok',
        'message' => 'اطلاعات کاربری با موفقیت به‌روزرسانی شد.',
        'user' => normalizeUserForResponse($user)
    ]);
}

function handleUserUpdatePassword(array $payload, ?PDO $pdo, string $userCode): void
{
    if (!$pdo) {
        sendJsonResponse(['status' => 'error', 'message' => 'اتصال به پایگاه داده برقرار نیست.']);
    }
    if ($userCode === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'برای انجام این عملیات باید وارد شوید.']);
    }
    $current = trim((string)($payload['current_password'] ?? ''));
    $new = trim((string)($payload['new_password'] ?? ''));
    $confirm = trim((string)($payload['confirm_password'] ?? ''));
    if ($new === '' || $confirm === '') {
        sendJsonResponse(['status' => 'error', 'message' => 'هر دو رمز عبور جدید و تایید آن مورد نیاز است.']);
    }
    if ($new !== $confirm) {
        sendJsonResponse(['status' => 'error', 'message' => 'رمز عبور جدید و تکرار آن باید یکسان باشند.']);
    }
    if (mb_strlen($new, 'UTF-8') < 8) {
        sendJsonResponse(['status' => 'error', 'message' => 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.']);
    }
    $user = loadUserByCode($pdo, $userCode);
    if (!$user || !password_verify($current, (string)($user['password_hash'] ?? ''))) {
        sendJsonResponse(['status' => 'error', 'message' => 'رمز عبور جاری اشتباه است.']);
    }
    $hash = password_hash($new, PASSWORD_DEFAULT);
    if ($hash === false || !updateUserByCode($pdo, $userCode, ['password_hash' => $hash])) {
        sendJsonResponse(['status' => 'error', 'message' => 'خطایی هنگام ثبت رمز عبور رخ داد.']);
    }
    $user = loadUserByCode($pdo, $userCode);
    if (!$user) {
        sendJsonResponse(['status' => 'error', 'message' => 'کاربر یافت نشد.']);
    }
    refreshSessionUser($user);
    sendJsonResponse(['status' => 'ok', 'message' => 'رمز عبور با موفقیت به‌روزرسانی شد.']);
}

function normalizeUserForResponse(array $row): array
{
    return [
        'code' => $row['code'] ?? '',
        'username' => $row['username'] ?? '',
        'fullname' => $row['fullname'] ?? '',
        'phone' => $row['phone'] ?? '',
        'email' => $row['email'] ?? '',
        'id_number' => $row['id_number'] ?? '',
        'work_id' => $row['work_id'] ?? ''
    ];
}

function refreshSessionUser(array $row): void
{
    if (empty($row['code'])) {
        return;
    }
    $user = normalizeUserForResponse($row);
    $user['display_name'] = buildUserDisplayNameFromRow($user);
    $_SESSION['user'] = $user;
}

function buildUserDisplayNameFromRow(array $user): string
{
    foreach (['fullname', 'display_name', 'username'] as $field) {
        if (!array_key_exists($field, $user)) {
            continue;
        }
        $value = trim((string)$user[$field]);
        if ($value === '' || $value === '0') {
            continue;
        }
        return $value;
    }
    return 'ادمین';
}

function createGalleryCategory(PDO $pdo, string $name): array
{
    $slug = slugify($name);
    if ($slug === '') {
        $slug = 'category';
    }
    $slug = ensureUniqueCategorySlug($pdo, $slug);
    $stmt = $pdo->prepare('INSERT INTO `gallery_category` (`name`, `slug`) VALUES (:name, :slug)');
    $stmt->execute([
        ':name' => $name,
        ':slug' => $slug
    ]);
    return [
        'id' => (int)$pdo->lastInsertId(),
        'name' => $name,
        'slug' => $slug
    ];
}

function updateGalleryCategory(PDO $pdo, int $id, string $name): array
{
    $slug = slugify($name);
    if ($slug === '') {
        $slug = 'category';
    }
    try {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM `gallery_category` WHERE `slug` = :slug AND `id` != :id');
        $stmt->execute([':slug' => $slug, ':id' => $id]);
        $count = (int)$stmt->fetchColumn();
    } catch (PDOException $err) {
        error_log('Failed to check category slug: ' . $err->getMessage());
        return ['status' => 'error', 'message' => 'خطا در بررسی دسته بندی.'];
    }
    $attempt = 0;
    $baseSlug = $slug;
    while ($count > 0) {
        $attempt++;
        $slug = $baseSlug . '-' . $attempt;
        try {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM `gallery_category` WHERE `slug` = :slug AND `id` != :id');
            $stmt->execute([':slug' => $slug, ':id' => $id]);
            $count = (int)$stmt->fetchColumn();
        } catch (PDOException $err) {
            error_log('Failed to check category slug: ' . $err->getMessage());
            return ['status' => 'error', 'message' => 'خطا در بررسی دسته بندی.'];
        }
    }
    try {
        $stmt = $pdo->prepare('UPDATE `gallery_category` SET `name` = :name, `slug` = :slug WHERE `id` = :id');
        $stmt->execute([
            ':name' => $name,
            ':slug' => $slug,
            ':id' => $id
        ]);
    } catch (PDOException $err) {
        error_log('Failed to update gallery category: ' . $err->getMessage());
        return ['status' => 'error', 'message' => 'خطا در بروزرسانی دسته بندی.'];
    }
    return ['status' => 'ok', 'message' => 'دسته بندی با موفقیت بروزرسانی شد.'];
}

function deleteGalleryCategory(PDO $pdo, int $id): array
{
    try {
        $stmt = $pdo->prepare('DELETE FROM `gallery_category` WHERE `id` = :id');
        $stmt->execute([':id' => $id]);
    } catch (PDOException $err) {
        error_log('Failed to delete gallery category: ' . $err->getMessage());
        return ['status' => 'error', 'message' => 'نمی‌توان دسته بندی را حذف کرد، ابتدا تصاویر مرتبط را پاک کنید.'];
    }
    return ['status' => 'ok', 'message' => 'دسته بندی حذف شد.'];
}

function ensureUniqueCategorySlug(PDO $pdo, string $base): string
{
    $slug = $base;
    $attempt = 0;
    while (true) {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM `gallery_category` WHERE `slug` = :slug');
        $stmt->execute([':slug' => $slug]);
        if ((int)$stmt->fetchColumn() === 0) {
            return $slug;
        }
        $attempt++;
        $slug = $base . '-' . $attempt;
    }
}

function slugify(string $value): string
{
    $value = mb_strtolower($value, 'UTF-8');
    $value = preg_replace('/[^\p{L}\p{N}]+/u', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value;
}

function saveGalleryPhoto(PDO $pdo, array $payload, array $file): array
{
    $title = trim((string)($payload['title'] ?? ''));
    $alt = trim((string)($payload['alt_text'] ?? ''));
    $categoryId = (int)($payload['category_id'] ?? 0);
    if ($title === '' || $alt === '' || $categoryId <= 0) {
        return ['status' => 'error', 'message' => 'اطلاعات تصویر کامل نیست.'];
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['status' => 'error', 'message' => 'فایل تصویر ارسال نشده است.'];
    }
    $extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($extension, $allowed, true)) {
        return ['status' => 'error', 'message' => 'فرمت فایل پشتیبانی نمی شود.'];
    }
    $uploadDir = __DIR__ . '/../uploads/gallery';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        return ['status' => 'error', 'message' => 'دسترسی به مسیر بارگذاری ممکن نیست.'];
    }
    $filename = uniqid('gallery-', true) . '.' . $extension;
    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        return ['status' => 'error', 'message' => 'بارگذاری فایل انجام نشد.'];
    }
    $relativePath = 'uploads/gallery/' . $filename;
    try {
        $stmt = $pdo->prepare('INSERT INTO `gallery` (`filename`, `category_id`, `title`, `alt_text`) VALUES (:filename, :category_id, :title, :alt_text)');
        $stmt->execute([
            ':filename' => $relativePath,
            ':category_id' => $categoryId,
            ':title' => $title,
            ':alt_text' => $alt
        ]);
    } catch (PDOException $err) {
        error_log('Gallery photo insert failed: ' . $err->getMessage());
        return ['status' => 'error', 'message' => 'خطا در ذخیره تصویر.'];
    }
    return ['status' => 'ok'];
}
