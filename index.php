<?php
session_start();

require_once __DIR__ . '/api/lib/common.php';
require_once __DIR__ . '/api/lib/users.php';

const DEFAULT_PANEL_SETTINGS = [
  'title' => 'Great Panel',
  'timezone' => 'Asia/Tehran',
  'panelName' => 'در حال برگزاری',
  'siteIcon' => ''
];

function loadJsonPayload(string $path): array {
  if (!is_file($path)) {
    return [];
  }
  $content = file_get_contents($path);
  if ($content === false) {
    return [];
  }
  $decoded = json_decode($content, true);
  return is_array($decoded) ? $decoded : [];
}

function loadPanelSettings(): array {
  $data = loadJsonPayload(__DIR__ . '/data/store.json');
  $config = loadConfig(__DIR__ . '/api/config.php');
  $pdo = connectDatabase($config);
  if ($pdo) {
    $dbData = loadDataFromDb($pdo, $config);
    if (is_array($dbData)) {
      $data = $dbData;
    }
  }
  $settings = [];
  if (isset($data['settings']) && is_array($data['settings'])) {
    $settings = $data['settings'];
  }
  return array_merge(DEFAULT_PANEL_SETTINGS, $settings);
}

function normalizeUserValue($value): string {
  $trimmed = trim((string)$value);
  return ($trimmed === '' || $trimmed === '0') ? '' : $trimmed;
}

$panelSettings = loadPanelSettings();
$panelTitle = $panelSettings['panelName'] ?? DEFAULT_PANEL_SETTINGS['panelName'];
if (!is_string($panelTitle) || $panelTitle === '') {
  $panelTitle = DEFAULT_PANEL_SETTINGS['panelName'];
}

if (empty($_SESSION['authenticated'])) {
  header('Location: login.php');
  exit;
}
$sessionUser = $_SESSION['user'] ?? [];
$userConfig = loadConfig(__DIR__ . '/api/config.php');
$userPdo = connectDatabase($userConfig);
$userCode = normalizeUserValue($sessionUser['code'] ?? '');
$dbUser = ($userPdo && $userCode !== '') ? loadUserByCode($userPdo, $userCode) : null;
$currentUser = array_merge($sessionUser, is_array($dbUser) ? $dbUser : []);
$sidebarName = normalizeUserValue($currentUser['fullname'] ?? '');
if ($sidebarName === '') {
  $sidebarName = normalizeUserValue($currentUser['username'] ?? '') ?: 'ادمین';
}
$sidebarUser = $sidebarName;
$topbarName = normalizeUserValue($currentUser['username'] ?? '');
$topbarUserName = $topbarName !== '' ? $topbarName : ($sidebarName ?: 'ادمین');
$personalFullname = $currentUser['fullname'] ?? '';
$personalIdNumber = $currentUser['id_number'] ?? $currentUser['id'] ?? '';
$personalWorkId = $currentUser['work_id'] ?? '';
$accountUsername = $currentUser['username'] ?? '';
$accountPhone = $currentUser['phone'] ?? '';
$accountEmail = $currentUser['email'] ?? '';
?>

<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><?= htmlspecialchars($panelTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="color-scheme" content="light" />
    <link rel="icon" href="data:," />
    <link rel="preload" href="fonts/remixicon.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="stylesheet" href="styles.css" />
    <link rel="stylesheet" href="remixicon.css" />
  </head>
  <body>
    <div id="app-loader" role="status" aria-live="polite" aria-label="در حال بارگذاری پنل">
      <div class="loader-card">
        <div class="loader-ring" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <p class="loader-title">در حال بارگذاری</p>
      </div>
    </div>
    <div id="app-view" class="view">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo small">GN</div>
          <div class="title"><?= htmlspecialchars($panelTitle, ENT_QUOTES, 'UTF-8') ?></div>
        </div>
        <nav class="nav">
          <button class="nav-item active" data-tab="home" aria-current="page">
            <span class="nav-icon ri ri-home-4-line" aria-hidden="true"></span>
            <span>خانه</span>
          </button>
          <button class="nav-item" data-tab="users">
            <span class="nav-icon ri ri-user-3-line" aria-hidden="true"></span>
            <span>کاربران</span>
          </button>
          <button class="nav-item" data-tab="gallery">
            <span class="nav-icon ri ri-gallery-line" aria-hidden="true"></span>
            <span>گالری تصاویر</span>
          </button>
          <button class="nav-item" data-tab="devsettings">
            <span class="nav-icon ri ri-terminal-box-line" aria-hidden="true"></span>
            <span>تنظیمات توسعه دهنده</span>
          </button>
          <button class="nav-item" data-tab="settings">
            <span class="nav-icon ri ri-user-settings-line" aria-hidden="true"></span>
            <span>تنظیمات حساب کاربری</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <span class="footer-title"><?= htmlspecialchars($sidebarUser, ENT_QUOTES, 'UTF-8') ?></span>
          <a class="nav-item logout-nav" href="logout.php" aria-label="خروج از سیستم">
            <span class="nav-icon ri ri-logout-box-line" aria-hidden="true"></span>
            <span>خروج از سیستم</span>
          </a>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <button id="sidebarToggle" class="icon-btn" title="کوچک/بزرگ کردن سایدبار" aria-label="کوچک/بزرگ کردن سایدبار">≡</button>
          <h2 id="page-title">خانه</h2>
          <div class="spacer"></div>
          <div id="live-clock" class="clock" aria-live="polite"></div>
        </header>

        <section id="tab-home" class="tab active">
          <div class="cards">
            <div class="card kpi">
              <div class="kpi-label">تعداد کاربران</div>
              <div class="kpi-value" id="kpi-users">0</div>
            </div>
            <div class="card kpi">
              <div class="kpi-label">کاربران فعال</div>
              <div class="kpi-value" id="kpi-active">0</div>
            </div>
            <div class="card kpi">
              <div class="kpi-label">تعداد شعب</div>
              <div class="kpi-value" id="kpi-branches">0</div>
            </div>
          </div>
          <div class="card">
            <h3>نسخه فرانت‌اند</h3>
            <p class="muted">این نسخه تماماً روی مرورگر اجرا می‌شود و هیچ سیستم ورود یا بک‌اندی ندارد.</p>
          </div>
        </section>

        <section id="tab-users" class="tab">
          <div class="card">
            <div class="table-header">
              <h3>کاربران</h3>
              <button class="btn primary" id="add-user">افزودن کاربر</button>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>کد یکتا کاربری</th>
                    <th>نام کامل</th>
                    <th>شماره تلفن</th>
                    <th>شماره پرسنلی</th>
                    <th>کد ملی</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody id="users-body"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="tab-gallery" class="tab">
          <div class="sub-layout" data-sub-layout>
            <aside class="sub-sidebar">
              <div class="sub-header">گالری تصاویر</div>
              <div class="sub-nav">
                <button type="button" class="sub-item active" data-pane="gallery-categories">
                  دسته بندی تصاویر
                </button>
                <button type="button" class="sub-item" data-pane="gallery-upload">
                  اضافه کردن تصویر
                </button>
                <button type="button" class="sub-item" data-pane="gallery-list">
                  گالری تصاویر
                </button>
              </div>
            </aside>
            <div class="sub-content">
              <div class="sub-pane active" data-pane="gallery-categories">
                <div class="card">
                  <div class="section-header">
                    <h3>دسته بندی تصاویر</h3>
                  </div>
                  <form id="gallery-category-form" class="form grid full">
                    <label class="field">
                      <span>نام دسته بندی</span>
                      <input id="gallery-category-name" type="text" required />
                    </label>
                    <div class="modal-actions">
                      <button type="submit" class="btn primary">اضافه کردن دسته بندی جدید</button>
                    </div>
                    <p id="gallery-category-msg" class="hint"></p>
                  </form>
                </div>
              <div class="card gallery-category-list-card">
                <div class="section-header">
                  <h3>لیست دسته بندی ها</h3>
                </div>
                <p id="gallery-category-status" class="hint"></p>
                <div id="gallery-category-list" class="gallery-category-list"></div>
              </div>
              </div>
              <div class="sub-pane" data-pane="gallery-upload">
                <div class="card">
                  <div class="section-header">
                    <h3>اضافه کردن تصویر</h3>
                  </div>
                  <form id="gallery-photo-form" class="form">
                    <div class="photo-uploader" data-photo-uploader="gallery">
                      <div class="photo-preview">
                        <img data-photo-image class="hidden" alt="" />
                        <div data-photo-placeholder class="photo-placeholder">پیش نمایش فایل</div>
                        <button type="button" class="photo-preview-clear hidden" data-photo-clear aria-label="حذف فایل">×</button>
                      </div>
                      <div class="photo-actions">
                        <input type="file" data-photo-input accept="image/*" hidden />
                        <button type="button" class="btn" data-photo-upload>انتخاب فایل</button>
                      </div>
                    </div>
                    <div class="grid">
                      <label class="field">
                        <span>عنوان تصویر</span>
                        <input id="gallery-photo-title" type="text" required />
                      </label>
                      <label class="field">
                        <span>متن جایگزین (alt)</span>
                        <input id="gallery-photo-alt" type="text" />
                      </label>
                      <label class="field">
                        <span>دسته بندی</span>
                        <select id="gallery-photo-category" required>
                          <option value="">انتخاب کنید</option>
                        </select>
                      </label>
                    </div>
                    <div class="modal-actions">
                      <button type="submit" class="btn primary">بارگذاری تصویر</button>
                    </div>
                    <p id="gallery-photo-msg" class="hint"></p>
                  </form>
                </div>
              </div>
              <div class="sub-pane" data-pane="gallery-list">
                <div class="card">
                  <div class="table-header">
                    <h3>آلبوم تصاویر</h3>
                  </div>
                  <div class="default-list gallery-photos-table">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>عنوان</th>
                          <th>دسته بندی</th>
                          <th>نام فایل</th>
                          <th>تاریخ آپلود</th>
                        </tr>
                      </thead>
                      <tbody id="gallery-photos-body"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tab-devsettings" class="tab">
          <div class="sub-layout" data-sub-layout>
            <aside class="sub-sidebar">
              <div class="sub-header">تنظیمات توسعه دهنده</div>
              <div class="sub-nav">
                <button type="button" class="sub-item active" data-pane="panel-settings">
                  تنظیمات پنل
                </button>
              </div>
            </aside>
            <div class="sub-content">
              <div class="sub-pane active" data-pane="panel-settings">
                <?php include __DIR__ . '/dev-settings.php'; ?>
              </div>
            </div>
          </div>
        </section>

        <section id="tab-settings" class="tab">
          <div class="settings-grid">
            <div class="card settings-section">
              <div class="section-header">
                <h3>اطلاعات شخصی</h3>
              </div>
              <form id="personal-info-form" class="form">
                <label class="field">
                  <span>نام کامل</span>
                  <input id="personal-fullname" name="fullname" type="text" value="<?= htmlspecialchars($personalFullname, ENT_QUOTES, 'UTF-8') ?>" required />
                </label>
                <label class="field">
                  <span>شماره شناسنامه</span>
                  <input type="text" value="<?= htmlspecialchars($personalIdNumber, ENT_QUOTES, 'UTF-8') ?>" readonly />
                </label>
                <label class="field">
                  <span>کد پرسنلی</span>
                  <input type="text" value="<?= htmlspecialchars($personalWorkId, ENT_QUOTES, 'UTF-8') ?>" readonly />
                </label>
                <p id="personal-info-msg" class="hint"></p>
                <div class="section-footer">
                  <button type="submit" class="btn primary">ذخیره</button>
                </div>
              </form>
            </div>

            <div class="card settings-section">
              <div class="section-header">
                <h3>اطلاعات کاربری</h3>
              </div>
              <form id="account-info-form" class="form">
                <label class="field">
                  <span>نام کاربری</span>
                  <input id="account-username" name="username" type="text" value="<?= htmlspecialchars($accountUsername, ENT_QUOTES, 'UTF-8') ?>" required />
                </label>
                <label class="field">
                  <span>شماره تلفن</span>
                  <input id="account-phone" name="phone" type="text" value="<?= htmlspecialchars($accountPhone, ENT_QUOTES, 'UTF-8') ?>" />
                </label>
                <label class="field">
                  <span>ایمیل</span>
                  <input id="account-email" name="email" type="email" value="<?= htmlspecialchars($accountEmail, ENT_QUOTES, 'UTF-8') ?>" />
                </label>
                <p id="account-info-msg" class="hint"></p>
                <div class="section-footer">
                  <button type="submit" class="btn primary">ذخیره</button>
                </div>
              </form>
            </div>

            <div class="card settings-section">
              <div class="section-header">
                <h3>حریم خصوصی</h3>
              </div>
              <form id="privacy-form" class="form">
                <label class="field">
                  <span>رمز عبور فعلی</span>
                  <input id="current-password" name="current_password" type="password" autocomplete="current-password" />
                </label>
                <label class="field">
                  <span>رمز عبور جدید</span>
                  <input id="new-password" name="new_password" type="password" autocomplete="new-password" />
                </label>
                <label class="field">
                  <span>تکرار رمز عبور جدید</span>
                  <input id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" />
                </label>
                <p id="privacy-msg" class="hint"></p>
                <div class="section-footer">
                  <button type="submit" class="btn primary">ذخیره</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div id="user-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div class="modal-card">
        <h3 id="user-modal-title">افزودن کاربر</h3>
        <form id="user-form" class="form" data-mode="add">
          <input type="hidden" id="user-code" />
          <label class="field">
            <span>نام کاربر</span>
            <input id="user-name" type="text" required />
          </label>
          <label class="field">
            <span>شماره تلفن (11 رقم)</span>
            <input id="user-phone" type="text" inputmode="numeric" pattern="^\d{11}$" placeholder="09xxxxxxxxx" required />
          </label>
          <label class="field">
            <span>شماره پرسنلی</span>
            <input id="user-work-id" type="text" />
          </label>
          <label class="field">
            <span>کد ملی</span>
            <input id="user-id-number" type="text" />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn" id="user-cancel">انصراف</button>
            <button type="submit" class="btn primary">افزودن</button>
          </div>
          <p id="user-form-msg" class="hint"></p>
        </form>
      </div>
    </div>

    <div id="system-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="system-modal-title">
      <div class="modal-card">
        <h3 id="system-modal-title">تنظیمات سیستم</h3>
        <form id="system-form" class="form">
          <div class="grid full">
            <label class="field">
              <span>نام سیستم</span>
              <input id="system-name" type="text" required />
            </label>
          </div>
          <div class="grid full">
            <label class="field">
              <span>تک دسته (ریال/ساعت)</span>
              <input id="price-1p" class="price-input" type="text" inputmode="numeric" required />
            </label>
            <label class="field">
              <span>دو دسته (ریال/ساعت)</span>
              <input id="price-2p" class="price-input" type="text" inputmode="numeric" required />
            </label>
            <label class="field">
              <span>سه دسته (ریال/ساعت)</span>
              <input id="price-3p" class="price-input" type="text" inputmode="numeric" required />
            </label>
            <label class="field">
              <span>چهار دسته (ریال/ساعت)</span>
              <input id="price-4p" class="price-input" type="text" inputmode="numeric" required />
            </label>
          </div>
          <div class="grid full">
            <label class="field">
              <span>تولد (ریال)</span>
              <input id="price-birthday" class="price-input" type="text" inputmode="numeric" required />
            </label>
            <label class="field">
              <span>فیلم (ریال)</span>
              <input id="price-film" class="price-input" type="text" inputmode="numeric" required />
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" id="system-cancel">انصراف</button>
            <button type="submit" class="btn primary">ذخیره</button>
          </div>
          <p id="system-form-msg" class="hint"></p>
        </form>
      </div>
    </div>

    <div id="periods-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="periods-modal-title">
      <div class="modal-card" style="max-width:640px;">
        <h3 id="periods-modal-title">تنظیم بازه‌های زمانی (۲۴ ساعته)</h3>
        <div class="form">
          <div class="hint">بین ۱ تا ۵ بازه تعریف کنید؛ کل ۲۴ ساعت را بدون هم‌پوشانی و بدون فاصله پوشش دهید.</div>
          <div id="periods-list" class="periods-list"></div>
          <div style="display:flex; gap:8px;">
            <button id="add-period" type="button" class="btn">+ افزودن بازه</button>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="periods-cancel">انصراف</button>
          <button type="button" class="btn primary" id="periods-save">ذخیره</button>
        </div>
        <p id="periods-msg" class="hint"></p>
      </div>
    </div>

    <div id="dialog-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="modal-card" style="max-width:420px;">
        <h3 id="dialog-title">پیام</h3>
        <div class="form">
          <div id="dialog-text" class="hint" style="white-space: pre-wrap;"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="dialog-cancel">انصراف</button>
          <button type="button" class="btn primary" id="dialog-ok">باشه</button>
        </div>
      </div>
    </div>

    <script>
      window.__CURRENT_USER_NAME = <?= json_encode($topbarUserName, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>;
    </script>
    <script src="app.js"></script>
  </body>
</html>
