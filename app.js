const DEFAULT_USERS = [
  { name: "Demo User 1", phone: "09123456789", active: true },
  { name: "Demo User 2", phone: "09350001122", active: false }
];
let USER_DB = [...DEFAULT_USERS];

const TITLE_KEY = "frontend_panel_title";
const TIMEZONE_KEY = "frontend_panel_timezone";
const API_ENDPOINT = "./api/data.php";
const PANEL_TITLE_KEY = "frontend_panel_name";
const PANEL_TITLE_DEFAULT = "پنل فرانت اند";
const DEFAULT_SETTINGS = {
  title: "Great Panel",
  timezone: "Asia/Tehran",
  panelName: PANEL_TITLE_DEFAULT
};
let SERVER_SETTINGS = { ...DEFAULT_SETTINGS };
let SERVER_BRANCHES = [];
let SERVER_DATA_LOADED = false;

async function loadServerData() {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch backend data (${response.status})`);
    }
    const payload = await response.json();
    if (Array.isArray(payload.users) && payload.users.length) {
      USER_DB = payload.users.map(u => ({
        name: typeof u.name === "string" ? u.name : "",
        phone: typeof u.phone === "string" ? u.phone : "",
        active: Boolean(u.active)
      }));
    } else {
      USER_DB = [...DEFAULT_USERS];
    }
    SERVER_BRANCHES = Array.isArray(payload.branches) ? payload.branches : [];
    if (payload.settings && typeof payload.settings === "object") {
      SERVER_SETTINGS = { ...SERVER_SETTINGS, ...payload.settings };
    }
    applyServerSettings();
    SERVER_DATA_LOADED = true;
  } catch (err) {
    console.warn("Failed to load data from backend:", err);
    USER_DB = [...DEFAULT_USERS];
  }
}

function applyServerSettings() {
  if (SERVER_SETTINGS.title && !localStorage.getItem(TITLE_KEY)) {
    localStorage.setItem(TITLE_KEY, SERVER_SETTINGS.title);
  }
  if (SERVER_SETTINGS.timezone && !localStorage.getItem(TIMEZONE_KEY)) {
    localStorage.setItem(TIMEZONE_KEY, SERVER_SETTINGS.timezone);
  }
}

function applyPanelTitle(value, persist = false) {
  const name = value ?? localStorage.getItem(PANEL_TITLE_KEY) ?? PANEL_TITLE_DEFAULT;
  const finalTitle = typeof name === 'string' && name.length ? name : PANEL_TITLE_DEFAULT;
  if (persist && typeof finalTitle === "string") {
    localStorage.setItem(PANEL_TITLE_KEY, finalTitle);
  }
  const el = qs('.sidebar .title');
  if (el) el.textContent = finalTitle;
  document.title = finalTitle;
  localStorage.setItem(TITLE_KEY, finalTitle);
}

async function syncUserToBackend(user) {
  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_user", user })
    });
  } catch (err) {
    console.warn("Failed to sync user to backend:", err);
  }
}

async function syncSettings(payload) {
  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_settings", settings: payload })
    });
  } catch (err) {
    console.warn("Failed to sync settings to backend:", err);
  }
}


function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: 'خانه', users: 'کاربران', devsettings: 'تنظیمات توسعه دهنده', settings: 'تنظیمات' };
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
  if (SERVER_BRANCHES.length) {
    return SERVER_BRANCHES.length;
  }
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
  const branches = loadBranchesCount();
  const setKpiValue = (selector, value) => {
    const el = qs(selector);
    if (el) el.textContent = value;
  };
  setKpiValue('#kpi-users', total);
  setKpiValue('#kpi-active', active);
  setKpiValue('#kpi-branches', branches);
}

function renderClock(){
  const el = qs('#live-clock'); if (!el) return;
  const tz = localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
  const now = new Date();
  const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone: tz });
  const dateFa = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone: tz }).format(now);
  el.innerHTML = `<span class="time">${time}</span><span class="date">${dateFa}</span><span class="user">پنل فرانت‌اند</span>`;
}

function hideAppLoader(){
  const loader = qs('#app-loader');
  if (!loader) return;
  loader.classList.add('is-hidden');
  const removeLoader = () => loader.remove();
  loader.addEventListener('transitionend', removeLoader, { once: true });
  setTimeout(removeLoader, 700);
}

function showDialog(message, opts = {}){
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
}

function initSubSidebars(){
  qsa('.sub-layout').forEach(layout => {
    const nav = layout.querySelector('.sub-nav');
    if (!nav) return;
    nav.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element ? event.target.closest('.sub-item[data-pane]') : null;
      if (!trigger) return;
      event.preventDefault();
      const targetPane = trigger.dataset.pane;
      if (!targetPane) return;
      nav.querySelectorAll('.sub-item').forEach(item => item.classList.toggle('active', item === trigger));
      layout.querySelectorAll('.sub-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.pane === targetPane);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadServerData();
  } finally {
    hideAppLoader();
  }
  setActiveTab('home');
  renderUsers();
  updateKpis();

  const navContainer = qs('.nav');
  navContainer?.addEventListener('click', (event) => {
    const target = event.target;
    const btn = target && target instanceof Element ? target.closest('.nav-item[data-tab]') : null;
    if (!btn) return;
    event.preventDefault();
    const tab = btn.dataset.tab;
    if (tab) {
      setActiveTab(tab);
    }
  });

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
    const newUser = { name, phone, active: true };
    USER_DB.push(newUser);
    renderUsers();
    updateKpis();
    closeUserModal();
    syncUserToBackend(newUser);
  });

  const panelInput = qs('#dev-panel-name');
  const panelSaveBtn = qs('#save-panel-settings');
  const storedPanel = localStorage.getItem(PANEL_TITLE_KEY);
  const serverPanel = SERVER_DATA_LOADED ? SERVER_SETTINGS.panelName : null;
  const initialPanel = serverPanel ?? storedPanel ?? PANEL_TITLE_DEFAULT;
  if (panelInput) {
    panelInput.value = initialPanel;
  }
  applyPanelTitle(initialPanel, true);
  panelSaveBtn?.addEventListener('click', () => {
    const value = (panelInput?.value ?? '').trim();
    const panelName = value || PANEL_TITLE_DEFAULT;
    applyPanelTitle(panelName, true);
    SERVER_SETTINGS.panelName = panelName;
    syncSettings({ panelName });
  });

  populateTimezoneSelect();
  const generalSaveBtn = qs('#save-general-settings');
  const timezoneSelect = qs('#timezone-select');
  generalSaveBtn?.addEventListener('click', () => {
    const timezoneValue = timezoneSelect?.value || DEFAULT_SETTINGS.timezone;
    if (timezoneSelect) {
      localStorage.setItem(TIMEZONE_KEY, timezoneValue);
    }
    SERVER_SETTINGS.timezone = timezoneValue;
    renderClock();
    syncSettings({ timezone: timezoneValue });
  });
  initSubSidebars();

  window.addEventListener('branches:updated', updateKpis);
  window.addEventListener('storage', updateKpis);
});
