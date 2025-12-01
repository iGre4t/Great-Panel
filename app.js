const USER_DB = [
  { name: "ادمین پیشفرض", phone: "09123456789", active: true },
  { name: "کاربر آزمایشی", phone: "09350001122", active: false }
];

const TITLE_KEY = "frontend_panel_title";
const TIMEZONE_KEY = "frontend_panel_timezone";

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: 'خانه', users: 'کاربران', branches: 'مدیریت شعب', settings: 'تنظیمات' };
  const el = qs('#page-title');
  if (el) el.textContent = titles[tab] || '';
}

function renderUsers() {
  const tbody = qs('#users-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  USER_DB.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name}</td><td>${u.phone || ''}</td><td>${u.active ? 'فعال' : 'غیرفعال'}</td>`;
    tbody.appendChild(tr);
  });
}

function loadBranchesCount(){
  try {
    const branches = JSON.parse(localStorage.getItem('gamenet_branches') || '[]');
    return Array.isArray(branches) ? branches.length : 0;
  } catch {
    return 0;
  }
}

function updateKpis() {
  const total = USER_DB.length;
  const active = USER_DB.filter(u => u.active).length;
  qs('#kpi-users')?.textContent = total;
  qs('#kpi-active')?.textContent = active;
  qs('#kpi-branches')?.textContent = loadBranchesCount();
}

function renderClock(){
  const el = qs('#live-clock'); if (!el) return;
  const tz = localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
  const now = new Date();
  const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone: tz });
  const dateFa = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone: tz }).format(now);
  el.innerHTML = `<span class="time">${time}</span><span class="date">${dateFa}</span><span class="user">پنل فرانت‌اند</span>`;
}

async function showDialog(message, opts = {}){
  const modal = qs('#dialog-modal');
  const titleEl = qs('#dialog-title');
  const textEl = qs('#dialog-text');
  const okBtn = qs('#dialog-ok');
  const cancelBtn = qs('#dialog-cancel');
  if (!modal || !okBtn || !cancelBtn || !textEl) {
    if (opts.confirm) return confirm(message);
    alert(message);
    return true;
  }
  textEl.textContent = message;
  if (titleEl) titleEl.textContent = opts.title || 'پیام';
  if (opts.okText) okBtn.textContent = opts.okText;
  if (opts.cancelText) cancelBtn.textContent = opts.cancelText;
  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      resolve(result);
    };
    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    modal.classList.remove('hidden');
    if (!opts.confirm) cancelBtn.classList.add('hidden'); else cancelBtn.classList.remove('hidden');
  });
}

function populateTimezoneSelect(){
  const select = qs('#timezone-select');
  if (!select) return;
  const storedTz = localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
  function supportedTimeZones(){
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf){
      try { return Intl.supportedValuesOf('timeZone'); } catch { /* noop */ }
    }
    return [
      'Asia/Tehran','Asia/Dubai','Asia/Baghdad','Asia/Qatar','Asia/Kolkata','Asia/Tokyo','Asia/Shanghai',
      'Europe/Moscow','Europe/Berlin','Europe/Paris','Europe/London','UTC',
      'Africa/Cairo','Africa/Nairobi',
      'America/Sao_Paulo','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Pacific/Auckland'
    ];
  }
  function tzOffsetLabel(tz){
    try {
      const parts = new Intl.DateTimeFormat('en-US',{ timeZone: tz, timeZoneName:'shortOffset'}).formatToParts(new Date());
      const v = parts.find(p=>p.type==='timeZoneName')?.value || '';
      return v.startsWith('GMT')?v:('GMT'+v.replace('UTC',''));
    } catch { return 'GMT'; }
  }
  const zones = supportedTimeZones();
  zones.sort((a,b)=>{
    const ao = tzOffsetLabel(a).replace('GMT','');
    const bo = tzOffsetLabel(b).replace('GMT','');
    return ao.localeCompare(bo) || a.localeCompare(b);
  });
  select.innerHTML = '';
  zones.forEach(z=>{
    const opt = document.createElement('option');
    const label = z.replace(/_/g,'/');
    opt.value = z;
    opt.textContent = `${label} (${tzOffsetLabel(z)})`;
    if (z === storedTz) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    localStorage.setItem(TIMEZONE_KEY, select.value);
    renderClock();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveTab('home');
  renderUsers();
  updateKpis();

  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

  renderClock();
  setInterval(renderClock, 1000);

  qs('#sidebarToggle')?.addEventListener('click', () => {
    const app = qs('#app-view');
    if (!app) return;
    app.classList.toggle('collapsed');
    app.style.gridTemplateColumns = '';
  });

  const openUserModal = () => qs('#user-modal')?.classList.remove('hidden');
  const closeUserModal = () => {
    const m = qs('#user-modal');
    if (!m) return;
    m.classList.add('hidden');
    qs('#user-form')?.reset();
    const msg = qs('#user-form-msg');
    if (msg) msg.textContent = '';
  };

  qs('#add-user')?.addEventListener('click', openUserModal);
  qs('#user-cancel')?.addEventListener('click', closeUserModal);
  qs('#user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = qs('#user-name').value.trim();
    const phone = qs('#user-phone').value.trim();
    const msg = qs('#user-form-msg');
    if (!name){ msg.textContent = 'نام را وارد کنید.'; return; }
    if (!/^\d{11}$/.test(phone)) { msg.textContent = 'شماره تلفن باید ۱۱ رقم باشد.'; return; }
    USER_DB.push({ name, phone, active: true });
    renderUsers();
    updateKpis();
    closeUserModal();
  });

  const savedTitle = localStorage.getItem(TITLE_KEY) || 'پنل مدیریت';
  qs('#site-title')?.addEventListener('input', (e) => {
    const val = e.target.value;
    localStorage.setItem(TITLE_KEY, val);
    document.title = val || 'پنل مدیریت';
    const sidebarTitle = qs('.sidebar .title');
    if (sidebarTitle) sidebarTitle.textContent = val || 'پنل فرانت‌اند';
  });
  const titleInput = qs('#site-title');
  if (titleInput){
    titleInput.value = savedTitle;
    document.title = savedTitle;
    const sidebarTitle = qs('.sidebar .title');
    if (sidebarTitle) sidebarTitle.textContent = savedTitle;
  }

  populateTimezoneSelect();

  window.addEventListener('branches:updated', updateKpis);
  window.addEventListener('storage', updateKpis);
});
