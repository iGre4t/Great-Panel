const body = document.body;
const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const modeToggle = document.getElementById('modeToggle');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

if (modeToggle) {
    modeToggle.addEventListener('click', () => {
        const isDark = body.classList.toggle('light');
        modeToggle.innerHTML = isDark ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
    });
}

const salesCtx = document.getElementById('salesChart');

if (salesCtx) {
    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
            datasets: [
                {
                    label: 'درآمد (میلیون تومان)',
                    data: [42, 38, 46, 54, 51, 61, 67],
                    borderColor: 'rgba(124, 58, 237, 0.9)',
                    backgroundColor: 'rgba(124, 58, 237, 0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                },
                {
                    label: 'هزینه تبلیغات',
                    data: [18, 16, 15, 21, 19, 20, 23],
                    borderColor: 'rgba(14, 165, 233, 0.9)',
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' },
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                }
            },
            scales: {
                x: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                },
                y: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                }
            }
        }
    });
}
