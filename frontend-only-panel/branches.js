// Branches (مدیریت شعب)
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

document.addEventListener('DOMContentLoaded', () => {
  const BRANCHES_KEY = 'gamenet_branches';
  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const loadBranches = () => { try { return JSON.parse(localStorage.getItem(BRANCHES_KEY) || '[]'); } catch { return []; } };
  const saveBranches = (data) => {
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('branches:updated', { detail: data }));
  };

  let branches = loadBranches();
  let currentBranchId = null;
  let currentPeriodId = null;

  if (!branches.length) {
    branches = [{
      id: genId(),
      name: 'شعبه نمونه',
      systems: [
        { id: genId(), name: 'سیستم شماره ۱', pricesByPeriod: {} },
        { id: genId(), name: 'سیستم شماره ۲', pricesByPeriod: {} }
      ],
      periods: [{ id: genId(), start: 0, end: DAY_MIN, defaultPrices: { p1: 150000, p2: 200000, p3: 260000, p4: 320000, birthday: 500000, film: 350000 } }]
    }];
    saveBranches(branches);
  }

  // Period helpers
  const DAY_MIN = 24*60;
  const toMin = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    const parts = hhmm.split(':');
    const h = parseInt(parts[0]||'0',10);
    const m = parseInt(parts[1]||'0',10);
    let t = (isNaN(h)?0:h)*60 + (isNaN(m)?0:m);
    if (!Number.isFinite(t)) t = 0;
    return Math.max(0, Math.min(DAY_MIN, t));
  };
  const toHHMM = (min) => {
    const x = Math.max(0, Math.min(DAY_MIN, Number(min)||0));
    const hh = String(Math.floor(x/60)).padStart(2,'0');
    const mm = String(x%60).padStart(2,'0');
    return `${hh}:${mm}`;
  };
  const labelPeriod = (p) => `${toHHMM(p.start)} - ${toHHMM(p.end)}`;
  const ensureBranchPeriods = (b) => {
    if (!b.periods || !Array.isArray(b.periods) || b.periods.length === 0){
      const defaults = b.defaultPrices || zeroPrices();
      b.periods = [{ id: genId(), start: 0, end: DAY_MIN, defaultPrices: defaults }];
    }
    return b;
  };

  const setTitle = (t) => { const el = qs('#page-title'); if (el) el.textContent = t; };

  const setSubnavActive = (key) => {
    qsa('#branch-subnav .sub-item').forEach(el => el.classList.toggle('active', el.dataset.view === String(key)));
  };

  const renderBranchSubnav = () => {
    const wrap = qs('#branch-items');
    if (!wrap) return;
    wrap.innerHTML = '';
    branches.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'sub-item';
      btn.dataset.view = b.id;
      btn.textContent = b.name || 'شعبه بی‌نام';
      btn.addEventListener('click', () => showBranchPage(b.id));
      wrap.appendChild(btn);
    });
    setSubnavActive(currentBranchId ? currentBranchId : 'manage');
  };

  const renderBranchesTable = () => {
    const tbody = qs('#branches-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    branches.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b.name}</td><td><button class="btn" data-open="${b.id}">باز کردن</button></td>`;
      tbody.appendChild(tr);
    });
    qsa('#branches-body button[data-open]').forEach(btn => {
      btn.addEventListener('click', () => showBranchPage(btn.getAttribute('data-open')));
    });
  };

  const renderSystemsTable = (branch) => {
    const tbody = qs('#systems-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (branch.systems || []).forEach(sys => {
      const tr = document.createElement('tr');
      const btn = `<button class=\"btn\" data-sys=\"${sys.id}\">تنظیمات</button>`;
      const status = (sys.prices == null) ? 'قیمت پیشفرض' : 'قیمت دلخواه';
      tr.innerHTML = `<td><input type=\"checkbox\" class=\"row-select\" data-id=\"${sys.id}\" /></td><td>${sys.name}</td><td>${status}</td><td>${btn}</td>`;
      tbody.appendChild(tr);
    });
    // header select control
    const headerSelect = qs('#header-select');
    const selectAll = qs('#select-all');
    const rowChecks = () => qsa('#systems-body .row-select');
    const setAll = (v) => rowChecks().forEach(ch => ch.checked = v);
    headerSelect && (headerSelect.onchange = () => setAll(headerSelect.checked));
    selectAll && (selectAll.onchange = () => setAll(selectAll.checked));

    qsa('#systems-body button[data-sys]').forEach(btn => {
      btn.addEventListener('click', () => openSystemModal(branch.id, btn.getAttribute('data-sys')));
    });
  };

  // Update the visible price status for each system based on active period
  const updateSystemStatusLabels = (branch) => {
    const tbody = qs('#systems-body');
    if (!tbody) return;
    const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
    qsa('#systems-body tr').forEach(tr => {
      const id = tr.querySelector('.row-select')?.dataset.id;
      if (!id) return;
      const sys = (branch.systems||[]).find(s => s.id === id);
      if (!sys) return;
      const hasOverride = !!(sys.pricesByPeriod && pid && sys.pricesByPeriod[pid]);
      const cell = tr.children && tr.children[2];
      if (cell) cell.textContent = hasOverride ? 'قیمت سفارشی' : 'قیمت پیشفرض';
    });
  };

  const showManageView = () => {
    currentBranchId = null;
    setSubnavActive('manage');
    const m = qs('#branch-manage-view');
    const p = qs('#branch-page-view');
    if (m && p) { m.classList.remove('hidden'); p.classList.add('hidden'); }
    renderBranchesTable();
  };

  const showBranchPage = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    currentBranchId = branch.id;
    setSubnavActive(branch.id);
    const m = qs('#branch-manage-view');
    const p = qs('#branch-page-view');
    if (m && p) { m.classList.add('hidden'); p.classList.remove('hidden'); }
    const t = qs('#branch-page-title');
    if (t) t.textContent = `شعبه: ${branch.name}`;
    renderPeriodSelect(branch);
    fillDefaultPricesForm(branch);
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
  };

  // Add branch
  qs('#add-branch-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = qs('#branch-name');
    const name = input.value.trim();
    if (!name) return;
    const b = { id: genId(), name, systems: [], periods: [{ id: genId(), start: 0, end: 24*60, defaultPrices: zeroPrices() }] };
    branches.push(b);
    saveBranches(branches);
    input.value = '';
    renderBranchSubnav();
    renderBranchesTable();
  });

  // Manage subnav button
  qs('#branch-subnav')?.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.matches('.sub-item[data-view="manage"]')) showManageView();
  });

  // Add system
  qs('#add-system-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentBranchId) return;
    const input = qs('#system-name-input');
    const name = input.value.trim();
    if (!name) return;
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    ensureBranchPeriods(branch);
    const pid = currentPeriodId || branch.periods[0]?.id;
    // new systems start with default prices (no custom override)
    const sys = { id: genId(), name, pricesByPeriod: {} };
    branch.systems = branch.systems || [];
    branch.systems.push(sys);
    saveBranches(branches);
    input.value = '';
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
  });

  // Modal helpers
  const openSystemModal = (branchId, systemId) => {
    const m = qs('#system-modal');
    const form = qs('#system-form');
    if (!m || !form) return;
    const branch = branches.find(b => b.id === branchId);
    const sys = branch?.systems?.find(s => s.id === systemId);
    if (!sys) return;
    const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
    const eff = getEffectivePrices(branch, sys, pid);
    qs('#system-name').value = sys.name || '';
    qs('#price-1p').value = formatPrice(eff.p1);
    qs('#price-2p').value = formatPrice(eff.p2);
    qs('#price-3p').value = formatPrice(eff.p3);
    qs('#price-4p').value = formatPrice(eff.p4);
    qs('#price-birthday').value = formatPrice(eff.birthday);
    qs('#price-film').value = formatPrice(eff.film);
    form.dataset.branchId = branchId;
    form.dataset.systemId = systemId;
    form.dataset.periodId = pid;
    m.classList.remove('hidden');
  };

  const closeSystemModal = () => {
    const m = qs('#system-modal');
    const form = qs('#system-form');
    if (m) m.classList.add('hidden');
    if (form) { form.reset(); form.dataset.branchId = ''; form.dataset.systemId = ''; }
    const msg = qs('#system-form-msg');
    if (msg) msg.textContent = '';
  };

  qs('#system-cancel')?.addEventListener('click', closeSystemModal);
  qs('#system-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const branchId = form.dataset.branchId;
    const systemId = form.dataset.systemId;
    const branch = branches.find(b => b.id === branchId);
    const sys = branch?.systems?.find(s => s.id === systemId);
    if (!branch || !sys) return;
    const periodId = form.dataset.periodId;
    sys.name = qs('#system-name').value.trim() || sys.name;
    // Validate non-empty and parse
    const values = [ '#price-1p', '#price-2p', '#price-3p', '#price-4p', '#price-birthday', '#price-film' ]
      .map(sel => qs(sel).value.trim());
    if (values.some(v => v === '')) { (qs('#system-form-msg').textContent = 'همه قیمت‌ها الزامی هستند'); return; }
    const toNum = (v) => { const n = parseInt(String(v).replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
    const newPrices = {
      p1: toNum(qs('#price-1p').value),
      p2: toNum(qs('#price-2p').value),
      p3: toNum(qs('#price-3p').value),
      p4: toNum(qs('#price-4p').value),
      birthday: toNum(qs('#price-birthday').value),
      film: toNum(qs('#price-film').value)
    };
    // If equal to selected period default, clear override
    const def = (ensureBranchPeriods(branch).periods.find(p => p.id === periodId)?.defaultPrices) || zeroPrices();
    sys.pricesByPeriod = sys.pricesByPeriod || {};
    if (pricesEqual(newPrices, def)) { delete sys.pricesByPeriod[periodId]; } else { sys.pricesByPeriod[periodId] = newPrices; }
    saveBranches(branches);
    closeSystemModal();
    if (currentBranchId === branch.id) { renderSystemsTable(branch); updateSystemStatusLabels(branch); }
  });

  // Initialize on switching to branches tab
  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'branches') {
      setTimeout(() => setTitle('مدیریت شعب'), 0);
      renderBranchSubnav();
      showManageView();
    }
  }));

  // ---------- Default prices logic ----------
  const zeroPrices = () => ({ p1: 0, p2: 0, p3: 0, p4: 0, birthday: 0, film: 0 });
  const formatPrice = (n) => (Number.isFinite(n) ? n : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parsePrice = (s) => { const n = parseInt(String(s||'').replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
  const pricesEqual = (a,b) => ['p1','p2','p3','p4','birthday','film'].every(k => Number(a[k]||0) === Number(b[k]||0));
  const getEffectivePrices = (branch, sys, periodId) => {
    ensureBranchPeriods(branch);
    const def = branch.periods.find(p => p.id === periodId)?.defaultPrices || zeroPrices();
    const ov = sys.pricesByPeriod && sys.pricesByPeriod[periodId];
    return ov ? ov : def;
  };

  const fillDefaultPricesForm = (branch) => {
    ensureBranchPeriods(branch);
    if (!currentPeriodId) currentPeriodId = branch.periods[0]?.id || null;
    const d = branch.periods.find(p => p.id === currentPeriodId)?.defaultPrices || zeroPrices();
    const map = { 'def-1p': d.p1, 'def-2p': d.p2, 'def-3p': d.p3, 'def-4p': d.p4, 'def-birthday': d.birthday, 'def-film': d.film };
    Object.entries(map).forEach(([id,val]) => { const el = qs('#'+id); if (el) el.value = formatPrice(val); });
  };

  const branchPageInit = () => {
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    renderPeriodSelect(branch);
    fillDefaultPricesForm(branch);
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
  };

  qs('#default-prices-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    const d = {
      p1: parsePrice(qs('#def-1p').value),
      p2: parsePrice(qs('#def-2p').value),
      p3: parsePrice(qs('#def-3p').value),
      p4: parsePrice(qs('#def-4p').value),
      birthday: parsePrice(qs('#def-birthday').value),
      film: parsePrice(qs('#def-film').value)
    };
    (function(){
      ensureBranchPeriods(branch);
      const pid = currentPeriodId || branch.periods[0]?.id;
      const pp = branch.periods.find(p => p.id === pid);
      if (pp) pp.defaultPrices = d;
    })();
    saveBranches(branches);
    const msg = qs('#default-prices-msg');
    if (msg) { msg.textContent = 'ذخیره شد'; setTimeout(() => msg.textContent = '', 1500); }
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
  });

  // Format price inputs (commas)
  const priceInputs = () => qsa('.price-input');
  const onFormat = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const raw = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
    const withCommas = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    e.target.value = withCommas;
  };
  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('price-input')) onFormat(e);
  });

  // ---------- Bulk changes ----------
  qs('#bulk-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    const selected = qsa('#systems-body .row-select:checked').map(ch => ch.dataset.id);
    if (!selected.length) { alert('هیچ سیستمی انتخاب نشده است'); return; }
    const targetPrices = {
      p1: parsePrice(qs('#bulk-1p').value),
      p2: parsePrice(qs('#bulk-2p').value),
      p3: parsePrice(qs('#bulk-3p').value),
      p4: parsePrice(qs('#bulk-4p').value),
      birthday: parsePrice(qs('#bulk-birthday').value),
      film: parsePrice(qs('#bulk-film').value)
    };
    const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
    const effs = selected.map(id => getEffectivePrices(branch, branch.systems.find(s => s.id === id), pid));
    const allSame = effs.every(p => pricesEqual(p, effs[0]));
    if (!allSame) {
      const ok = confirm('سیستم های انتخاب شده دارای قیمت / کاربری متفاوتی می باشند اگر از تغییرات مطمئن هستید ثبت کنید');
      if (!ok) return;
    }
    // Apply change; if equals default, store null to mark as default
    selected.forEach(id => {
      const sys = branch.systems.find(s => s.id === id);
      if (!sys) return;
      const def = branch.periods.find(p => p.id === pid)?.defaultPrices || zeroPrices();
      sys.pricesByPeriod = sys.pricesByPeriod || {};
      if (pricesEqual(targetPrices, def)) delete sys.pricesByPeriod[pid]; else sys.pricesByPeriod[pid] = targetPrices;
    });
    saveBranches(branches);
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
  });

  // When entering a branch page, also fill defaults/prices, so hook into showBranchPage calls
  const originalShowBranchPage = showBranchPage;
  // Override by wrapping existing function if accessible
  // If not accessible due to scoping, call branchPageInit in the places we navigate
  // Call on initial manage->branch switch via click handlers below
  
  // ---- Period select + modal ----
  function renderPeriodSelect(branch){
    ensureBranchPeriods(branch);
    const sel = qs('#period-select');
    if (!sel) return;
    sel.innerHTML = '';
    branch.periods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${('0'+Math.floor(p.start/60)).slice(-2)}:${('0'+(p.start%60)).slice(-2)} - ${('0'+Math.floor(p.end/60)).slice(-2)}:${('0'+(p.end%60)).slice(-2)}`;
      sel.appendChild(opt);
    });
    if (!currentPeriodId) currentPeriodId = branch.periods[0]?.id || null;
    sel.value = currentPeriodId || branch.periods[0]?.id || '';
    sel.onchange = () => {
      currentPeriodId = sel.value;
      fillDefaultPricesForm(branch);
    renderSystemsTable(branch);
    updateSystemStatusLabels(branch);
    };
    const btn = qs('#manage-periods');
    if (btn){ btn.onclick = () => openPeriodsModalTimeline(branch.id); }
  }

  function openPeriodsModal(branchId){
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    ensureBranchPeriods(branch);
    const m = qs('#periods-modal');
    const list = qs('#periods-list');
    if (!m || !list) return;
    list.innerHTML = '';
    function addRow(start, end){
      const row = document.createElement('div');
      row.className = 'period-row';
      row.innerHTML = `
        <label class="field"><span>شروع</span><input type="time" class="p-start" required /></label>
        <label class="field"><span>پایان</span><input type="time" class="p-end" required /></label>
        <button type="button" class="btn p-remove">×</button>`;
      row.querySelector('.p-start').value = `${('0'+Math.floor(start/60)).slice(-2)}:${('0'+(start%60)).slice(-2)}`;
      row.querySelector('.p-end').value = `${('0'+Math.floor(end/60)).slice(-2)}:${('0'+(end%60)).slice(-2)}`;
      row.querySelector('.p-remove').onclick = () => { row.remove(); };
      list.appendChild(row);
    }
    branch.periods.forEach(p => addRow(p.start, p.end));
    const addEl = qs('#add-period');
    if (addEl) addEl.onclick = () => {
      const rows = list.querySelectorAll('.period-row');
      if (rows.length >= 5) return;
      let start = 0;
      if (rows.length){
        const last = rows[rows.length-1];
        const s = last.querySelector('.p-end').value.split(':');
        start = (parseInt(s[0],10)||0)*60 + (parseInt(s[1],10)||0);
      }
      addRow(start, 24*60);
    };
    const cancelEl = qs('#periods-cancel');
    if (cancelEl) cancelEl.onclick = () => { m.classList.add('hidden'); };
    const saveEl = qs('#periods-save');
    if (saveEl) saveEl.onclick = () => {
      const rows = [...list.querySelectorAll('.period-row')];
      const msg = qs('#periods-msg'); if (msg) msg.textContent='';
      if (rows.length < 1 || rows.length > 5){ if (msg) msg.textContent='تعداد بازه باید بین ۱ تا ۵ باشد.'; return; }
      const items = rows.map(r => {
        const s = r.querySelector('.p-start').value.split(':'), e = r.querySelector('.p-end').value.split(':');
        const st = (parseInt(s[0],10)||0)*60 + (parseInt(s[1],10)||0);
        const en = (parseInt(e[0],10)||0)*60 + (parseInt(e[1],10)||0);
        return { start: st, end: en };
      });
      for (const it of items){ if (!(it.start < it.end)) { if (msg) msg.textContent='هر بازه باید شروع کمتر از پایان داشته باشد.'; return; } }
      items.sort((a,b)=> a.start-b.start);
      if (items[0].start !== 0){ if (msg) msg.textContent='بازه اول باید از 00:00 شروع شود.'; return; }
      for (let i=1;i<items.length;i++){
        if (items[i-1].end !== items[i].start){ if (msg) msg.textContent='بازه‌ها باید پشت‌سرهم و بدون فاصله باشند.'; return; }
      }
      if (items[items.length-1].end !== 24*60){ if (msg) msg.textContent='آخرین بازه باید در 24:00 پایان یابد.'; return; }
      // Map new items to old periods to preserve prices
      const oldPeriods = [...(branch.periods||[])];
      const prevPid = currentPeriodId;
      const mapped = items.map(it => {
        const mid = Math.floor((it.start + it.end) / 2);
        let src = oldPeriods.find(op => op.start <= mid && op.end > mid);
        if (!src){
          let best = oldPeriods[0], bestLen = -1;
          for (const op of oldPeriods){
            const ov = Math.max(0, Math.min(op.end, it.end) - Math.max(op.start, it.start));
            if (ov > bestLen){ bestLen = ov; best = op; }
          }
          src = best;
        }
        return { id: genId(), start: it.start, end: it.end, defaultPrices: (src && src.defaultPrices) ? src.defaultPrices : zeroPrices(), _src: src ? src.id : null };
      });
      // Commit new periods without helper field
      branch.periods = mapped.map(({_src, ...rest}) => rest);
      (branch.systems||[]).forEach(s => {
        const oldMap = s.pricesByPeriod || {};
        const newMap = {};
        mapped.forEach(np => { if (np._src && oldMap[np._src]) newMap[np.id] = oldMap[np._src]; });
        s.pricesByPeriod = newMap;
        delete s.prices;
      });
      saveBranches(branches);
      const keep = mapped.find(np => np._src === prevPid);
      currentPeriodId = (keep && keep.id) || branch.periods[0]?.id || null;
      renderPeriodSelect(branch);
      fillDefaultPricesForm(branch);
      renderSystemsTable(branch);
      updateSystemStatusLabels(branch);
      m.classList.add('hidden');
    };
    m.classList.remove('hidden');
  }

  // New timeline-based periods editor
  function openPeriodsModalTimeline(branchId){
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    ensureBranchPeriods(branch);
    const m = qs('#periods-modal');
    if (!m) return;
    const list = qs('#periods-list');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }

    // Build local boundaries from existing periods
    const ps = [...(branch.periods||[])].sort((a,b)=> a.start-b.start);
    let boundaries = [0];
    ps.forEach(p => boundaries.push(Math.max(0, Math.min(DAY_MIN, Number(p.end)||0))));
    boundaries[0] = 0;
    boundaries[boundaries.length-1] = DAY_MIN;

    // Inject timeline container if missing
    let tl = qs('#periods-timeline', m);
    if (!tl){
      tl = document.createElement('div');
      tl.id = 'periods-timeline';
      tl.className = 'timeline';
      tl.innerHTML = '<div class="timeline-scale"></div><div class="timeline-track"></div>';
      const formEl = m.querySelector('.form');
      if (formEl) formEl.insertBefore(tl, formEl.lastElementChild);
    }
    const scaleEl = tl.querySelector('.timeline-scale');
    const trackEl = tl.querySelector('.timeline-track');

    const renderScale = () => {
      if (!scaleEl) return;
      scaleEl.innerHTML = '';
      for (let h=0; h<=24; h+=2){
        const pct = (h/24)*100;
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = pct + '%';
        scaleEl.appendChild(tick);
        const lab = document.createElement('div');
        lab.className = 'label';
        lab.style.left = pct + '%';
        lab.textContent = String(h).padStart(2,'0') + ':00';
        scaleEl.appendChild(lab);
      }
    };

    const minutesToPct = (min) => (Math.max(0, Math.min(DAY_MIN, min))/DAY_MIN)*100;
    const pctToMinutes = (pct) => Math.round((pct/100)*DAY_MIN);

    let dragging = null; // { index, rect }
    let highlightPair = null; // [startHandleIndex, endHandleIndex]

    const render = () => {
      renderScale();
      if (!trackEl) return;
      trackEl.innerHTML = '';
      // segments
      for (let i=0; i<boundaries.length-1; i++){
        const start = boundaries[i], end = boundaries[i+1];
        const seg = document.createElement('div');
        seg.className = 'timeline-segment' + (i % 2 === 1 ? ' alt' : '');
        seg.style.left = minutesToPct(start) + '%';
        seg.style.width = (minutesToPct(end) - minutesToPct(start)) + '%';
        const label = document.createElement('div');
        label.textContent = `${toHHMM(start)} - ${toHHMM(end)}`;
        seg.appendChild(label);
        if (boundaries.length > 2){
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'seg-del'; del.textContent = '×';
          del.title = 'حذف این بازه';
          del.onclick = (ev) => { ev.stopPropagation(); removeSegment(i); };
          seg.appendChild(del);
        }
        trackEl.appendChild(seg);
      }
      // handles
      for (let i=0; i<boundaries.length; i++){
        const isLocked = (i === 0 || i === boundaries.length-1);
        const h = document.createElement('div');
        h.className = 'timeline-handle' + (isLocked ? ' locked' : '');
        if (highlightPair && (i === highlightPair[0] || i === highlightPair[1])) h.classList.add('new');
        h.style.left = minutesToPct(boundaries[i]) + '%';
        if (!isLocked){ h.addEventListener('pointerdown', (e) => startDrag(e, i)); }
        trackEl.appendChild(h);
      }
    };

    function removeSegment(segIndex){
      if (boundaries.length <= 2) return;
      if (segIndex === 0) boundaries.splice(1,1); else boundaries.splice(segIndex,1);
      highlightPair = null;
      render();
    }

    function startDrag(e, idx){
      e.preventDefault();
      const rect = trackEl.getBoundingClientRect();
      dragging = { index: idx, rect };
      try { trackEl.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', onDrag);
      window.addEventListener('pointerup', endDrag, { once: true });
    }
    function onDrag(e){
      if (!dragging) return;
      const { index, rect } = dragging;
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      // clamp within neighbors with 5min gap
      const minPct = minutesToPct(boundaries[index-1] + 5);
      const maxPct = minutesToPct(boundaries[index+1] - 5);
      pct = Math.max(minPct, Math.min(maxPct, pct));
      let min = pctToMinutes(pct);
      min = Math.round(min/5)*5;
      min = Math.max(boundaries[index-1]+5, Math.min(boundaries[index+1]-5, min));
      boundaries[index] = min;
      highlightPair = null;
      render();
    }
    function endDrag(){
      window.removeEventListener('pointermove', onDrag);
      dragging = null;
    }

    function addPeriod(){
      if ((boundaries.length-1) >= 5) return;
      let bestI = 0, bestLen = -1;
      for (let i=0; i<boundaries.length-1; i++){
        const len = boundaries[i+1]-boundaries[i];
        if (len > bestLen){ bestLen = len; bestI = i; }
      }
      const mid = boundaries[bestI] + Math.floor((boundaries[bestI+1]-boundaries[bestI])/2);
      boundaries.splice(bestI+1, 0, mid);
      highlightPair = [bestI+1, bestI+2];
      render();
    }

    const cancelEl = qs('#periods-cancel');
    if (cancelEl) cancelEl.onclick = () => { m.classList.add('hidden'); };
    const addEl = qs('#add-period');
    if (addEl) addEl.onclick = addPeriod;
    const saveEl = qs('#periods-save');
    if (saveEl) saveEl.onclick = () => {
      const oldPeriods = [...(branch.periods||[])];
      const prevPid = currentPeriodId;
      const mapped = [];
      for (let i=0; i<boundaries.length-1; i++){
        const start = boundaries[i], end = boundaries[i+1];
        const mid = Math.floor((start + end) / 2);
        let src = oldPeriods.find(op => op.start <= mid && op.end > mid);
        if (!src){
          let best = oldPeriods[0], bestLen = -1;
          for (const op of oldPeriods){
            const ov = Math.max(0, Math.min(op.end, end) - Math.max(op.start, start));
            if (ov > bestLen){ bestLen = ov; best = op; }
          }
          src = best;
        }
        mapped.push({ id: genId(), start, end, defaultPrices: (src && src.defaultPrices) ? src.defaultPrices : zeroPrices(), _src: src ? src.id : null });
      }
      (branch.systems||[]).forEach(s => {
        const oldMap = s.pricesByPeriod || {};
        const newMap = {};
        mapped.forEach(np => { if (np._src && oldMap[np._src]) newMap[np.id] = oldMap[np._src]; });
        s.pricesByPeriod = newMap;
        delete s.prices;
      });
      branch.periods = mapped.map(({_src, ...rest}) => rest);
      saveBranches(branches);
      const keep = mapped.find(np => np._src === prevPid);
      currentPeriodId = (keep && keep.id) || branch.periods[0]?.id || null;
      renderPeriodSelect(branch);
      fillDefaultPricesForm(branch);
      renderSystemsTable(branch);
      updateSystemStatusLabels(branch);
      m.classList.add('hidden');
    };
    render();
    m.classList.remove('hidden');
  }

  // Intercept bulk submit to use class-style modal instead of browser alerts/confirms
  (function setupBulkOverride(){
    const bulkFormEl = qs('#bulk-form');
    if (!bulkFormEl) return;
    bulkFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const branch = branches.find(b => b.id === currentBranchId);
      if (!branch) return;
      const selected = qsa('#systems-body .row-select:checked').map(ch => ch.dataset.id);
      if (!selected.length) { await showDialog('هیچ سیستمی انتخاب نشده است.', { confirm: false }); return; }
      const targetPrices = {
        p1: parsePrice(qs('#bulk-1p').value),
        p2: parsePrice(qs('#bulk-2p').value),
        p3: parsePrice(qs('#bulk-3p').value),
        p4: parsePrice(qs('#bulk-4p').value),
        birthday: parsePrice(qs('#bulk-birthday').value),
        film: parsePrice(qs('#bulk-film').value)
      };
      const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
      const effs = selected.map(id => getEffectivePrices(branch, branch.systems.find(s => s.id === id), pid));
      const allSame = effs.every(p => pricesEqual(p, effs[0]));
      if (!allSame) {
        const ok = await showDialog('قیمت‌های سیستم‌های انتخاب‌شده یکسان نیست. آیا می‌خواهید همه را با مقادیر جدید جایگزین کنید؟', { confirm: true, okText: 'بله، اعمال کن', cancelText: 'خیر' });
        if (!ok) return;
      }
      selected.forEach(id => {
        const sys = branch.systems.find(s => s.id === id);
        if (!sys) return;
        const def = branch.periods.find(p => p.id === pid)?.defaultPrices || zeroPrices();
        sys.pricesByPeriod = sys.pricesByPeriod || {};
        if (pricesEqual(targetPrices, def)) delete sys.pricesByPeriod[pid]; else sys.pricesByPeriod[pid] = targetPrices;
      });
      saveBranches(branches);
      renderSystemsTable(branch);
      updateSystemStatusLabels(branch);
    }, true);
  })();
});
