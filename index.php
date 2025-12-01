<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریتی مدرن</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SzlrxWUlpfuzQ+pcUCosxcglQRNAq/DZjVsC0lE0x1pJl6tDxi1Q6E4hND3hW52zBZp7V0V3yFj6G1ZjKw5qQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="app">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand__icon">GP</div>
                <div class="brand__name">گریت پنل</div>
            </div>
            <div class="user">
                <div class="avatar">م</div>
                <div>
                    <div class="user__name">مریم نادری</div>
                    <div class="user__role">مدیر محصول</div>
                </div>
                <button class="badge">پرو</button>
            </div>
            <nav class="nav">
                <a class="nav__item active" href="#">
                    <i class="fa-solid fa-gauge-high"></i>
                    داشبورد
                </a>
                <a class="nav__item" href="#">
                    <i class="fa-solid fa-users"></i>
                    کاربران
                </a>
                <a class="nav__item" href="#">
                    <i class="fa-solid fa-bag-shopping"></i>
                    سفارش‌ها
                </a>
                <a class="nav__item" href="#">
                    <i class="fa-solid fa-chart-line"></i>
                    گزارش‌ها
                </a>
                <a class="nav__item" href="#">
                    <i class="fa-solid fa-gear"></i>
                    تنظیمات
                </a>
            </nav>
            <div class="sidebar__cta">
                <h3>سطح دسترسی تیمی</h3>
                <p>دسترسی اعضای تیم را مدیریت و نقش‌ها را تعریف کنید.</p>
                <button class="btn btn--primary">شروع مدیریت</button>
            </div>
        </aside>
        <main class="content">
            <header class="header">
                <div class="header__left">
                    <button id="sidebarToggle" class="icon-btn" aria-label="باز و بسته کردن منو">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div class="search">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" placeholder="جستجو در پنل...">
                    </div>
                </div>
                <div class="header__actions">
                    <button class="icon-btn" aria-label="اعلان‌ها">
                        <i class="fa-regular fa-bell"></i>
                        <span class="dot"></span>
                    </button>
                    <button class="icon-btn" aria-label="حالت تیره" id="modeToggle">
                        <i class="fa-regular fa-moon"></i>
                    </button>
                </div>
            </header>

            <section class="grid cards">
                <article class="card">
                    <div class="card__title">فروش امروز</div>
                    <div class="card__value">۳۲,۴۵۰,۰۰۰ <span>تومان</span></div>
                    <div class="chip success">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                        ۱۸٪ رشد نسبت به دیروز
                    </div>
                </article>
                <article class="card">
                    <div class="card__title">کاربران جدید</div>
                    <div class="card__value">۴۸۵</div>
                    <div class="chip info">
                        <i class="fa-solid fa-user-plus"></i>
                        کمپین جذب فعال
                    </div>
                </article>
                <article class="card">
                    <div class="card__title">نرخ تبدیل</div>
                    <div class="card__value">۵.۴٪</div>
                    <div class="chip warning">
                        <i class="fa-solid fa-arrows-rotate"></i>
                        نیاز به بهینه‌سازی
                    </div>
                </article>
                <article class="card">
                    <div class="card__title">وضعیت سرویس‌ها</div>
                    <div class="card__value status">پایدار</div>
                    <div class="chip success">
                        <i class="fa-solid fa-shield-heart"></i>
                        بدون قطعی در ۲۴ ساعت
                    </div>
                </article>
            </section>

            <section class="grid analytics">
                <div class="panel panel--large">
                    <div class="panel__header">
                        <div>
                            <h2>نمودار فروش</h2>
                            <p>نمای کلی ۷ روز اخیر</p>
                        </div>
                        <div class="pill">real-time</div>
                    </div>
                    <canvas id="salesChart" height="160"></canvas>
                </div>
                <div class="panel">
                    <div class="panel__header">
                        <div>
                            <h2>فعالیت‌ها</h2>
                            <p>به‌روزرسانی‌های اخیر تیم</p>
                        </div>
                        <button class="link">مشاهده همه</button>
                    </div>
                    <ul class="timeline">
                        <li>
                            <div class="dot success"></div>
                            <div>
                                <div class="timeline__title">تحویل سفارش ۲۳۴۵</div>
                                <div class="timeline__meta">۱۰ دقیقه پیش</div>
                            </div>
                        </li>
                        <li>
                            <div class="dot info"></div>
                            <div>
                                <div class="timeline__title">اضافه شدن کاربر «رضا»</div>
                                <div class="timeline__meta">۳۰ دقیقه پیش</div>
                            </div>
                        </li>
                        <li>
                            <div class="dot warning"></div>
                            <div>
                                <div class="timeline__title">مصرف سرور ۸۰٪</div>
                                <div class="timeline__meta">۲ ساعت پیش</div>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>

            <section class="grid two-columns">
                <div class="panel">
                    <div class="panel__header">
                        <div>
                            <h2>سفارش‌های باز</h2>
                            <p>آخرین تراکنش‌ها</p>
                        </div>
                        <div class="pill pill--soft">۱۴ سفارش</div>
                    </div>
                    <div class="table">
                        <div class="table__head">
                            <span>#</span>
                            <span>مشتری</span>
                            <span>مبلغ</span>
                            <span>وضعیت</span>
                        </div>
                        <div class="table__row">
                            <span>۲۳۵۰</span>
                            <span>فاطمه مقصودی</span>
                            <span>۸,۶۰۰,۰۰۰</span>
                            <span class="badge badge--success">پرداخت شده</span>
                        </div>
                        <div class="table__row">
                            <span>۲۳۴۹</span>
                            <span>میلاد شریفی</span>
                            <span>۵,۲۰۰,۰۰۰</span>
                            <span class="badge badge--warning">در انتظار</span>
                        </div>
                        <div class="table__row">
                            <span>۲۳۴۸</span>
                            <span>مهسا ابراهیمی</span>
                            <span>۹,۴۰۰,۰۰۰</span>
                            <span class="badge badge--info">ارسال شد</span>
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel__header">
                        <div>
                            <h2>میانبرهای سریع</h2>
                            <p>اعمال متداول روزانه</p>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn">
                            <i class="fa-solid fa-plus"></i>
                            افزودن محصول
                        </button>
                        <button class="btn">
                            <i class="fa-solid fa-envelope"></i>
                            ارسال خبرنامه
                        </button>
                        <button class="btn">
                            <i class="fa-solid fa-percent"></i>
                            تعریف کد تخفیف
                        </button>
                        <button class="btn">
                            <i class="fa-solid fa-circle-question"></i>
                            تیکت جدید
                        </button>
                    </div>
                </div>
            </section>
        </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
