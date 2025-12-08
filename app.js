const DEFAULT_USERS = [
  {
    code: "demo-user-1",
    username: "demo-user-1",
    email: "demo1@example.com",
    name: "Demo User 1",
    phone: "09123456789",
    work_id: "EMP-1001",
    id_number: "007000111",
    active: true
  },
  {
    code: "demo-user-2",
    username: "demo-user-2",
    email: "demo2@example.com",
    name: "Demo User 2",
    phone: "09350001122",
    work_id: "EMP-1002",
    id_number: "007000112",
    active: false
  }
];
let USER_DB = [...DEFAULT_USERS];
let editingUserCode = "";
let deletingUserCode = "";
// Keys stored in localStorage plus appearance defaults keep the UI consistent between sessions.

const TITLE_KEY = "frontend_panel_title";
const TIMEZONE_KEY = "frontend_panel_timezone";
const API_ENDPOINT = "./api/data.php"; // Shared handler supplying data for both users and gallery tabs.
const PANEL_TITLE_KEY = "frontend_panel_name";
const PANEL_TITLE_DEFAULT = "Frontend panel";
const DEFAULT_SETTINGS = {
  title: "Great Panel",
  timezone: "Asia/Tehran",
  panelName: PANEL_TITLE_DEFAULT
};
const SITE_ICON_DEFAULT_DATA_URI = "data:,";
const DEFAULT_APPEARANCE = {
  primary: "#e11d2e",
  background: "#ffffff",
  text: "#111111",
  toggle: "#e11d2e"
};
const APPEARANCE_PRIMARY_KEY = "frontend_appearance_primary";
const APPEARANCE_BACKGROUND_KEY = "frontend_appearance_background";
const APPEARANCE_TEXT_KEY = "frontend_appearance_text";
const APPEARANCE_TOGGLE_KEY = "frontend_appearance_toggle";
const APPEARANCE_HINT_DEFAULT = "Fine-tune the UI colors directly from the developer lab.";
const LOCAL_UNCATEGORIZED_CATEGORY_NAME = "--no category--";
let currentAppearanceState = { ...DEFAULT_APPEARANCE };
const APPEARANCE_KEYS = ["primary", "background", "text", "toggle"];
const APPEARANCE_HSL_BASE = {
  primary: { s: 0.78, l: 0.54 },
  background: { s: 0.12, l: 0.96 },
  text: { s: 0.65, l: 0.18 },
  toggle: { s: 0.65, l: 0.75 }
};
const APPEARANCE_LABELS = {
  primary: "Primary color",
  background: "Background color",
  text: "Text color",
  toggle: "Toggle button color"
};
const COLOR_PICKER_GRID = {
  minS: 0.08,
  maxS: 0.95,
  minL: 0.35,
  maxL: 0.95
};
const appearancePickerGridState = {};
let activeAppearancePickerKey = null;
let SERVER_SETTINGS = { ...DEFAULT_SETTINGS };
let SERVER_DATA_LOADED = false;
let SERVER_DATABASE_CONNECTED = false;
let GALLERY_CATEGORIES = [];
let GALLERY_PHOTOS = [];
const GALLERY_GRID_INITIAL_COUNT = 8;
const GALLERY_GRID_LOAD_STEP = 8;
const GALLERY_THUMB_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const GALLERY_THUMB_DEFAULT_MODE = "default";
const GALLERY_THUMB_PREVIEW_MODE = "preview";
const GALLERY_THUMB_LAZY_ROOT_MARGIN = "250px";
const GALLERY_THUMB_LOAD_BATCH = 2;
let galleryVisibleCount = GALLERY_GRID_INITIAL_COUNT;
let photoChooserVisibleCount = GALLERY_GRID_INITIAL_COUNT;
let gallerySearchTerm = "";
let photoChooserSearchTerm = "";
let gallerySearchInputElement = null;
let gallerySearchCountElement = null;
let photoChooserSearchInputElement = null;
let photoChooserSearchCountElement = null;
const photoChooserSelectedIds = new Set();
let photoChooserAllowMultiple = true;
let photoChooserOnChoose = null;
let photoChooserModalElement;
let photoChooserGridElement;
let photoChooserEmptyElement;
let photoChooserLoadMoreButton;
let photoChooserChooseButton;
let photoChooserCancelButton;
let photoChooserUploadButton;
let photoChooserReopenContext = null;
let siteIconValue = "";
let siteIconPreviewImage = null;
let siteIconPlaceholder = null;
let siteIconAddButton = null;
let siteIconClearButton = null;
let faviconLinkElement = null;
let sidebarLogoImage = null;
let sidebarLogoText = null;
let galleryCategorySubmitDefaultText = "";
let galleryImageObserver = null;
let galleryThumbLoadQueue = [];
let galleryThumbLoadScheduled = false;
const galleryPendingCounts = new WeakMap();
const galleryGridLoaderMap = new WeakMap();
const galleryImageGridMap = new WeakMap();

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function parseNumericUserCode(value) {
  const candidate = String(value ?? "").replace(/\D/g, "");
  if (candidate === "") {
    return NaN;
  }
  return Number.parseInt(candidate, 10);
}

function getNextUserCode() {
  const highest = USER_DB.reduce((max, user) => {
    const parsed = parseNumericUserCode(user.code);
    if (Number.isFinite(parsed)) {
      return Math.max(max, parsed);
    }
    return max;
  }, 0);
  return String(highest + 1).padStart(6, "0");
}

function loadGalleryThumbnailImage(image) {
  if (!image || image.dataset.galleryThumbLoaded === "1") {
    return;
  }
  const nextSrc = image.dataset.galleryThumbSrc;
  if (!nextSrc) {
    return;
  }
  enqueueGalleryThumbLoad(image, nextSrc);
}

function enqueueGalleryThumbLoad(image, src) {
  galleryThumbLoadQueue.push({ image, src });
  scheduleGalleryThumbLoad();
}

function scheduleGalleryThumbLoad() {
  if (galleryThumbLoadScheduled) {
    return;
  }
  galleryThumbLoadScheduled = true;
  requestAnimationFrame(processGalleryThumbLoadQueue);
}

function processGalleryThumbLoadQueue() {
  galleryThumbLoadScheduled = false;
  if (!galleryThumbLoadQueue.length) {
    return;
  }
  const batch = galleryThumbLoadQueue.splice(
    0,
    Math.max(1, Math.min(galleryThumbLoadQueue.length, GALLERY_THUMB_LOAD_BATCH))
  );
  batch.forEach(({ image, src }) => {
    if (!image) {
      return;
    }
    const grid = galleryImageGridMap.get(image);
    image.dataset.galleryThumbLoaded = "1";
    delete image.dataset.galleryThumbSrc;
    image.src = src;
    if (grid) {
      decrementGalleryGridPending(grid);
      galleryImageGridMap.delete(image);
    }
  });
  if (galleryThumbLoadQueue.length) {
    requestAnimationFrame(processGalleryThumbLoadQueue);
  }
}

function getGalleryLoaderForGrid(grid) {
  if (!grid) {
    return null;
  }
  if (galleryGridLoaderMap.has(grid)) {
    return galleryGridLoaderMap.get(grid);
  }
  let loader = grid.parentElement?.querySelector("[data-gallery-loading]");
  if (!loader) {
    const chooserScroll = grid.closest(".photo-chooser-scroll");
    loader = chooserScroll?.querySelector("[data-gallery-loading]") ?? null;
  }
  galleryGridLoaderMap.set(grid, loader);
  return loader;
}

function updateGalleryLoaderVisibility(grid) {
  const loader = getGalleryLoaderForGrid(grid);
  if (!loader) {
    return;
  }
  const pending = Math.max(0, galleryPendingCounts.get(grid) ?? 0);
  loader.classList.toggle("hidden", pending === 0);
}

function setGalleryGridPendingCount(grid, count) {
  if (!grid) {
    return;
  }
  const normalized = Math.max(0, Number.isFinite(count) ? count : 0);
  galleryPendingCounts.set(grid, normalized);
  updateGalleryLoaderVisibility(grid);
}

function decrementGalleryGridPending(grid) {
  if (!grid) {
    return;
  }
  const current = galleryPendingCounts.get(grid) ?? 0;
  const next = Math.max(0, current - 1);
  galleryPendingCounts.set(grid, next);
  updateGalleryLoaderVisibility(grid);
}

function initializeGalleryGridLoading(grid, visibleCount) {
  if (!grid) {
    return;
  }
  setGalleryGridPendingCount(grid, visibleCount);
}

function getGalleryImageObserver() {
  if (galleryImageObserver !== null || typeof IntersectionObserver === "undefined") {
    return galleryImageObserver;
  }
  galleryImageObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }
        const img = entry.target;
        galleryImageObserver?.unobserve(img);
        loadGalleryThumbnailImage(img);
      });
    },
    {
      rootMargin: GALLERY_THUMB_LAZY_ROOT_MARGIN,
      threshold: 0
    }
  );
  return galleryImageObserver;
}

function scheduleGalleryThumbnailLoad(image) {
  if (!image) {
    return;
  }
  const observer = getGalleryImageObserver();
  if (observer) {
    observer.observe(image);
    return;
  }
  loadGalleryThumbnailImage(image);
}

function scrollGalleryGridByRows(grid, rows = 1) {
  if (!grid || rows <= 0) {
    return;
  }
  const card = grid.querySelector(".gallery-thumb-card");
  const baseHeight = card ? card.offsetHeight : grid.offsetHeight;
  if (!baseHeight) {
    return;
  }
  const doc = grid.ownerDocument ?? document;
  const computedStyle =
    doc.defaultView && typeof doc.defaultView.getComputedStyle === "function"
      ? doc.defaultView.getComputedStyle(grid)
      : null;
  const rowGap = computedStyle ? parseFloat(computedStyle.rowGap) || 0 : 0;
  const scrollHeight = (baseHeight + rowGap) * rows;
  if (!scrollHeight) {
    return;
  }
  const scrollParent = findScrollableAncestor(grid);
  const docScrolling =
    doc.scrollingElement || doc.documentElement || window;
  const target = scrollParent || docScrolling || window;
  animateVerticalScroll(target, scrollHeight);
}

function animateVerticalScroll(target, delta, duration = 360) {
  if (!delta || duration <= 0) {
    return;
  }
  const isWindow = target === window;
  const getPosition = () => {
    if (isWindow) {
      return window.scrollY || window.pageYOffset || 0;
    }
    return (target && typeof target.scrollTop === "number" ? target.scrollTop : 0);
  };
  const setPosition = value => {
    if (isWindow) {
      window.scrollTo({ top: value, behavior: "auto" });
    } else if (target && typeof target.scrollTo === "function") {
      target.scrollTo({ top: value, behavior: "auto" });
    } else if (target && typeof target.scrollTop === "number") {
      target.scrollTop = value;
    }
  };
  const start = getPosition();
  const end = start + delta;
  const startTime = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
    const next = start + (end - start) * eased;
    setPosition(next);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      setPosition(end);
    }
  };
  requestAnimationFrame(step);
}

function findScrollableAncestor(element) {
  if (!element) {
    return null;
  }
  let current = element.parentElement;
  while (current && current !== document.body) {
    if (
      current.scrollHeight > current.clientHeight &&
      current instanceof HTMLElement
    ) {
      const style =
        current.ownerDocument?.defaultView &&
        typeof current.ownerDocument.defaultView.getComputedStyle === "function"
          ? current.ownerDocument.defaultView.getComputedStyle(current)
          : null;
      const overflowY = style?.overflowY || "";
      if (["auto", "scroll", "overlay"].includes(overflowY)) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function isValidEmail(value) {
  const email = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loadServerData() {
  SERVER_DATABASE_CONNECTED = false;
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch backend data (${response.status})`);
    }
    const payload = await response.json();
    if (Array.isArray(payload.users) && payload.users.length) {
      USER_DB = payload.users.map(u => {
        const username = normalizeValue(u.username) || normalizeValue(u.code);
        return {
          code: normalizeValue(u.code),
          username,
          name:
            normalizeValue(u.name) ||
            normalizeValue(u.fullname) ||
            username ||
            normalizeValue(u.code),
          phone: normalizeValue(u.phone),
          work_id: normalizeValue(u.work_id),
          id_number: normalizeValue(u.id_number),
          email: normalizeValue(u.email),
          active: Boolean(u.active)
        };
      });
    } else {
      USER_DB = [...DEFAULT_USERS];
    }
    SERVER_DATABASE_CONNECTED = Boolean(payload.databaseConnected);
    if (payload.settings && typeof payload.settings === "object") {
      SERVER_SETTINGS = { ...SERVER_SETTINGS, ...payload.settings };
    }
    updateGalleryStateFromPayload(payload);
    applyServerSettings(); // Save server-provided defaults for the next session.
    SERVER_DATA_LOADED = true;
  } catch (err) {
    console.warn("Failed to load data from backend:", err);
    SERVER_DATABASE_CONNECTED = false;
    USER_DB = [...DEFAULT_USERS];
    updateGalleryStateFromPayload();
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

function ensureHexColor(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return "";
}

function hexToRgb(hex) {
  const cleaned = ensureHexColor(hex);
  if (!cleaned) {
    return null;
  }
  return {
    r: parseInt(cleaned.slice(1, 3), 16),
    g: parseInt(cleaned.slice(3, 5), 16),
    b: parseInt(cleaned.slice(5, 7), 16)
  };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: (h + 360) % 360, s, l };
}

function hexToRgba(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "";
  }
  const safeAlpha = clamp(alpha, 0, 1);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}

function clamp(value, min, max) {
  if (typeof value !== "number") {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeGridHsl(hsl, key = "primary") {
  const base = APPEARANCE_HSL_BASE[key] || APPEARANCE_HSL_BASE.primary;
  const source = hsl && typeof hsl === "object" ? hsl : base;
  return {
    s: clamp(source.s, COLOR_PICKER_GRID.minS, COLOR_PICKER_GRID.maxS),
    l: clamp(source.l, COLOR_PICKER_GRID.minL, COLOR_PICKER_GRID.maxL)
  };
}

function gridCoordsFromHsl(hsl) {
  const sRange = COLOR_PICKER_GRID.maxS - COLOR_PICKER_GRID.minS;
  const lRange = COLOR_PICKER_GRID.maxL - COLOR_PICKER_GRID.minL;
  const sPortion = sRange ? (clamp(hsl.s, COLOR_PICKER_GRID.minS, COLOR_PICKER_GRID.maxS) - COLOR_PICKER_GRID.minS) / sRange : 0;
  const lPortion = lRange ? (COLOR_PICKER_GRID.maxL - clamp(hsl.l, COLOR_PICKER_GRID.minL, COLOR_PICKER_GRID.maxL)) / lRange : 0;
  return {
    x: clamp(sPortion, 0, 1),
    y: clamp(lPortion, 0, 1)
  };
}

function hslFromGridCoords({ x = 0, y = 0 }) {
  const sRange = COLOR_PICKER_GRID.maxS - COLOR_PICKER_GRID.minS;
  const lRange = COLOR_PICKER_GRID.maxL - COLOR_PICKER_GRID.minL;
  const s = clamp(COLOR_PICKER_GRID.minS + clamp(x, 0, 1) * sRange, COLOR_PICKER_GRID.minS, COLOR_PICKER_GRID.maxS);
  const l = clamp(COLOR_PICKER_GRID.maxL - clamp(y, 0, 1) * lRange, COLOR_PICKER_GRID.minL, COLOR_PICKER_GRID.maxL);
  return { s, l };
}

function syncGridStateFromColor(key, hex) {
  if (!key) {
    return null;
  }
  const rgb = hexToRgb(hex);
  if (!rgb) {
    const normalized = normalizeGridHsl(APPEARANCE_HSL_BASE[key], key);
    appearancePickerGridState[key] = normalized;
    return normalized;
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const normalized = normalizeGridHsl(hsl, key);
  appearancePickerGridState[key] = normalized;
  return normalized;
}

APPEARANCE_KEYS.forEach(key => {
  syncGridStateFromColor(key, DEFAULT_APPEARANCE[key]);
});

function componentToHex(value) {
  const rounded = Math.round(value);
  const hex = rounded.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
  } else if (hh >= 1 && hh < 2) {
    r = x;
    g = c;
  } else if (hh >= 2 && hh < 3) {
    g = c;
    b = x;
  } else if (hh >= 3 && hh < 4) {
    g = x;
    b = c;
  } else if (hh >= 4 && hh < 5) {
    r = x;
    b = c;
  } else if (hh >= 5 && hh < 6) {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  return `#${componentToHex((r + m) * 255)}${componentToHex((g + m) * 255)}${componentToHex((b + m) * 255)}`;
}

function adjustHexLightness(hex, delta) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "";
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
  return hslToHex(hsl);
}

function getHueFromColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 0;
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return Math.round(hsl.h);
}

function persistAppearanceState(state) {
  localStorage.setItem(APPEARANCE_PRIMARY_KEY, state.primary);
  localStorage.setItem(APPEARANCE_BACKGROUND_KEY, state.background);
  localStorage.setItem(APPEARANCE_TEXT_KEY, state.text);
  localStorage.setItem(APPEARANCE_TOGGLE_KEY, state.toggle);
}

function clearAppearanceStorage() {
  localStorage.removeItem(APPEARANCE_PRIMARY_KEY);
  localStorage.removeItem(APPEARANCE_BACKGROUND_KEY);
  localStorage.removeItem(APPEARANCE_TEXT_KEY);
  localStorage.removeItem(APPEARANCE_TOGGLE_KEY);
}

function loadAppearanceState() {
  return {
    primary: ensureHexColor(localStorage.getItem(APPEARANCE_PRIMARY_KEY)),
    background: ensureHexColor(localStorage.getItem(APPEARANCE_BACKGROUND_KEY)),
    text: ensureHexColor(localStorage.getItem(APPEARANCE_TEXT_KEY)),
    toggle: ensureHexColor(localStorage.getItem(APPEARANCE_TOGGLE_KEY))
  };
}

function applyAppearancePalette(state, { persist = false } = {}) {
  const palette = {
    primary: ensureHexColor(state.primary) || DEFAULT_APPEARANCE.primary,
    background: ensureHexColor(state.background) || DEFAULT_APPEARANCE.background,
    text: ensureHexColor(state.text) || DEFAULT_APPEARANCE.text,
    toggle: ensureHexColor(state.toggle) || DEFAULT_APPEARANCE.toggle
  };
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  const darker = adjustHexLightness(palette.primary, -0.18);
  root.style.setProperty("--primary-600", darker || palette.primary);
  root.style.setProperty("--bg", palette.background);
  root.style.setProperty("--text", palette.text);
  const toggleBg = hexToRgba(palette.toggle, 0.12) || "rgba(225,29,46,0.08)";
  const toggleBorder = hexToRgba(palette.toggle, 0.22) || "rgba(225,29,46,0.22)";
  root.style.setProperty("--sidebar-active", toggleBg);
  root.style.setProperty("--sidebar-active-border", toggleBorder);
  currentAppearanceState = { ...palette };
  APPEARANCE_KEYS.forEach(key => syncGridStateFromColor(key, palette[key]));
  if (persist) {
    persistAppearanceState(palette);
    const hintEl = qs("#appearance-hint");
    if (hintEl) {
      hintEl.textContent = "Appearance preferences saved.";
    }
  }
  return palette;
}

function refreshFieldValue(key, color) {
  const normalized = ensureHexColor(color) || DEFAULT_APPEARANCE[key];
  const input = qs(`[data-appearance-hex="${key}"]`);
  if (input) {
    input.value = normalized;
  }
  const preview = qs(`[data-appearance-preview="${key}"]`);
  if (preview) {
    preview.style.background = normalized;
  }
}

function refreshModalPicker(key, color) {
  const modal = qs("#appearance-picker-modal");
  const picker = qs("[data-appearance-modal-picker]");
  if (!modal || !picker || !key) {
    return;
  }
  const normalized = ensureHexColor(color) || DEFAULT_APPEARANCE[key];
  const handle = picker.querySelector(".default-color-picker__handle");
  const slider = picker.querySelector("input[type='range']");
  const gridState = appearancePickerGridState[key] || normalizeGridHsl(APPEARANCE_HSL_BASE[key], key);
  appearancePickerGridState[key] = gridState;
  const handleCoords = gridCoordsFromHsl(gridState);
  if (handle) {
    handle.style.background = normalized;
    handle.style.left = `${handleCoords.x * 100}%`;
    handle.style.top = `${handleCoords.y * 100}%`;
  }
  if (slider) {
    const hue = getHueFromColor(normalized);
    slider.value = hue;
    const accent = adjustHexLightness(normalized, 0.18) || normalized;
    slider.style.setProperty("--slider-thumb", normalized);
    picker.style.setProperty("--picker-base", normalized);
    picker.style.setProperty("--picker-accent", accent);
  }
  const title = qs("#appearance-picker-title");
  if (title) {
    title.textContent = APPEARANCE_LABELS[key] || "Choose color";
  }
}

function updateAppearanceState(changes) {
  if (!changes || typeof changes !== "object") {
    return;
  }
  const merged = { ...currentAppearanceState, ...changes };
  applyAppearancePalette(merged, { persist: false });
  Object.keys(changes).forEach(key => {
    if (APPEARANCE_KEYS.includes(key)) {
      const color = ensureHexColor(changes[key]) || currentAppearanceState[key];
      if (color) {
        syncGridStateFromColor(key, color);
      }
      refreshFieldValue(key, currentAppearanceState[key]);
    }
  });
  if (activeAppearancePickerKey) {
    refreshModalPicker(activeAppearancePickerKey, currentAppearanceState[activeAppearancePickerKey]);
  }
  const hintEl = qs("#appearance-hint");
  if (hintEl) {
    hintEl.textContent = APPEARANCE_HINT_DEFAULT;
  }
}

function updateAppearanceInputs(state) {
  if (!state) {
    return;
  }
  APPEARANCE_KEYS.forEach(key => refreshFieldValue(key, state[key]));
  if (activeAppearancePickerKey) {
    refreshModalPicker(activeAppearancePickerKey, state[activeAppearancePickerKey]);
  }
}

function openColorPickerModal(key) {
  const modal = qs("#appearance-picker-modal");
  if (!modal || !key) {
    return;
  }
  activeAppearancePickerKey = key;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  refreshModalPicker(key, currentAppearanceState[key]);
}

function closeColorPickerModal() {
  const modal = qs("#appearance-picker-modal");
  if (!modal) {
    return;
  }
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  activeAppearancePickerKey = null;
}

function initAppearanceControls() {
  const stored = loadAppearanceState();
  if (stored.primary || stored.background || stored.text || stored.toggle) {
    currentAppearanceState = {
      ...DEFAULT_APPEARANCE,
      ...stored
    };
  }
  applyAppearancePalette(currentAppearanceState, { persist: false });
  updateAppearanceInputs(currentAppearanceState);
  qsa("[data-show-appearance-picker]").forEach(button => {
    const key = button.dataset.showAppearancePicker;
    button.addEventListener("click", () => openColorPickerModal(key));
  });
  qsa("[data-appearance-hex]").forEach(input => {
    const key = input.dataset.appearanceHex;
    input.addEventListener("input", () => {
      const color = ensureHexColor(input.value);
      if (color) {
        updateAppearanceState({ [key]: color });
      }
    });
    input.addEventListener("blur", () => {
      const normalized = ensureHexColor(input.value) || currentAppearanceState[key];
      if (normalized) {
        refreshFieldValue(key, normalized);
      }
    });
  });
  const modalPicker = qs("[data-appearance-modal-picker]");
  const slider = modalPicker?.querySelector("input[type='range']");
  slider?.addEventListener("input", () => {
    if (!activeAppearancePickerKey) {
      return;
    }
    const hue = Number(slider.value) || 0;
    const gridHsl = appearancePickerGridState[activeAppearancePickerKey] || normalizeGridHsl(APPEARANCE_HSL_BASE[activeAppearancePickerKey], activeAppearancePickerKey);
    const nextColor = hslToHex({ h: hue, s: gridHsl.s, l: gridHsl.l });
    updateAppearanceState({ [activeAppearancePickerKey]: nextColor });
  });
  const pickerGrid = modalPicker?.querySelector(".default-color-picker__grid");
  let isPickerDragging = false;
  const handleGridInteraction = (event) => {
    if (!pickerGrid || !activeAppearancePickerKey) {
      return;
    }
    const rect = pickerGrid.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const { s, l } = hslFromGridCoords({ x, y });
    appearancePickerGridState[activeAppearancePickerKey] = { s, l };
    const hue = Number(slider?.value ?? getHueFromColor(currentAppearanceState[activeAppearancePickerKey])) || 0;
    const nextColor = hslToHex({ h: hue, s, l });
    updateAppearanceState({ [activeAppearancePickerKey]: nextColor });
  };
  pickerGrid?.addEventListener("pointerdown", (event) => {
    if (!activeAppearancePickerKey) {
      return;
    }
    isPickerDragging = true;
    pickerGrid.setPointerCapture?.(event.pointerId);
    handleGridInteraction(event);
  });
  pickerGrid?.addEventListener("pointermove", (event) => {
    if (isPickerDragging) {
      handleGridInteraction(event);
    }
  });
  const stopGridInteraction = (event) => {
    if (!isPickerDragging) {
      return;
    }
    isPickerDragging = false;
    pickerGrid.releasePointerCapture?.(event.pointerId);
  };
  pickerGrid?.addEventListener("pointerup", stopGridInteraction);
  pickerGrid?.addEventListener("pointerleave", stopGridInteraction);
  pickerGrid?.addEventListener("pointercancel", stopGridInteraction);
  qs("[data-close-appearance-picker]")?.addEventListener("click", closeColorPickerModal);
  const modal = qs("#appearance-picker-modal");
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeColorPickerModal();
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape" && activeAppearancePickerKey) {
      closeColorPickerModal();
    }
  });
  qs("#save-appearance-settings")?.addEventListener("click", () => {
    applyAppearancePalette(currentAppearanceState, { persist: true });
    updateAppearanceInputs(currentAppearanceState);
  });
  qs("#reset-appearance-settings")?.addEventListener("click", () => {
    currentAppearanceState = { ...DEFAULT_APPEARANCE };
    applyAppearancePalette(currentAppearanceState, { persist: false });
    clearAppearanceStorage();
    updateAppearanceInputs(currentAppearanceState);
    const hintEl = qs("#appearance-hint");
    if (hintEl) {
      hintEl.textContent = "Appearance reverted to defaults.";
    }
  });
}

function updateGalleryStateFromPayload(payload = {}) {
  const categories = Array.isArray(payload.galleryCategories)
    ? payload.galleryCategories
    : [];
  const photos = Array.isArray(payload.galleryPhotos)
    ? payload.galleryPhotos
    : [];
  GALLERY_CATEGORIES = categories
    .map(normalizeGalleryCategory)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  GALLERY_PHOTOS = photos
    .map(normalizeGalleryPhoto)
    .filter(Boolean)
    .sort((a, b) => b.uploadedAtTs - a.uploadedAtTs);
  resetGalleryVisibleCount();
}

// Helper to guard and normalize gallery category rows fetched from the backend.
function normalizeGalleryCategory(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const id = Number(row.id ?? 0);
  if (id <= 0) {
    return null;
  }
  const motherRaw = row.mother_category_id ?? row.motherCategoryId ?? null;
  const motherCandidate = Number(motherRaw ?? 0);
  const motherCategoryId =
    Number.isFinite(motherCandidate) && motherCandidate > 0
      ? motherCandidate
      : null;
  return {
    id,
    name: normalizeValue(row.name).trim(),
    slug: normalizeValue(row.slug).trim(),
    motherCategoryId
  };
}

function getCategoryLabel(category) {
  if (!category || typeof category !== "object") {
    return "";
  }
  const name = normalizeValue(category.name).trim();
  if (name) {
    return name;
  }
  const slug = normalizeValue(category.slug).trim();
  if (slug) {
    return slug;
  }
  return `Category ${category.id ?? ""}`;
}

// Normalizes gallery photo payloads so the frontend can read consistent fields.
function normalizeGalleryPhoto(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const id = Number(row.photo_id ?? row.id ?? 0);
  if (id <= 0) {
    return null;
  }
  const uploadedAt = normalizeValue(row.uploaded_at ?? row.uploadedAt ?? "");
  const uploadedAtTs = Number.isFinite(Date.parse(uploadedAt))
    ? Date.parse(uploadedAt)
    : 0;
  const categoryId = Number(row.category_id ?? row.categoryId ?? 0);
  const rawCategoryName = normalizeValue(row.category_name ?? row.categoryName ?? "");
  const hasCategory = categoryId > 0;
  const normalizedCategoryName =
    hasCategory && rawCategoryName
      ? rawCategoryName
      : LOCAL_UNCATEGORIZED_CATEGORY_NAME;
  return {
    id,
    title: normalizeValue(row.title),
    altText: normalizeValue(row.alt_text ?? row.altText ?? ""),
    filename: normalizeValue(row.filename),
    categoryId,
    categoryName: normalizedCategoryName,
    uploadedAt,
    uploadedAtTs
  };
}

function resetGalleryVisibleCount() {
  galleryVisibleCount = GALLERY_GRID_INITIAL_COUNT;
}

// Keeps gallery table, dropdown, and CTA text aligned with the current data set.
function renderGalleryCategories() {
  populateGalleryCategoryMotherFormSelect();
  renderGalleryCategoryTable();
  updateGalleryPhotoCategorySelect();
  const statusMessage = GALLERY_CATEGORIES.length
    ? `${GALLERY_CATEGORIES.length} categories available`
    : "No categories available yet.";
  setGalleryStatus(statusMessage, false);
}

function populateGalleryCategoryMotherFormSelect() {
  const select = qs("#gallery-category-mother");
  if (!select) {
    return;
  }
  fillMotherCategorySelect(select);
}

function fillMotherCategorySelect(select, { excludeId = null, selectedId = null } = {}) {
  if (!select) {
    return;
  }
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "No mother category";
  select.appendChild(placeholder);
  GALLERY_CATEGORIES.forEach(category => {
    if (excludeId !== null && category.id === excludeId) {
      return;
    }
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = getCategoryLabel(category);
    if (selectedId !== null && category.id === selectedId) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  if (selectedId === null) {
    select.value = "";
  } else {
    select.value = String(selectedId);
  }
}

// Builds the gallery category editor rows and wires the save/delete buttons to their handlers.
function renderGalleryCategoryTable() {
  const body = qs("#gallery-category-table-body");
  if (!body) {
    return;
  }
  body.innerHTML = "";
  if (!GALLERY_CATEGORIES.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 3;
    emptyCell.classList.add("muted");
    emptyCell.textContent = "No categories yet.";
    emptyRow.appendChild(emptyCell);
    body.appendChild(emptyRow);
    return;
  }
  GALLERY_CATEGORIES.forEach(category => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "category-name-input";
    nameInput.value = category.name || "";
    nameInput.dataset.categoryId = String(category.id);
    nameCell.appendChild(nameInput);
    row.appendChild(nameCell);
    const motherCell = document.createElement("td");
    const motherSelect = document.createElement("select");
    motherSelect.className = "category-mother-select";
    motherSelect.dataset.categoryId = String(category.id);
    fillMotherCategorySelect(motherSelect, {
      excludeId: category.id,
      selectedId: category.motherCategoryId ?? null
    });
    motherCell.appendChild(motherSelect);
    row.appendChild(motherCell);
    const actionCell = document.createElement("td");
    actionCell.classList.add("category-actions");
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn primary";
    saveBtn.textContent = "Save";
    const inlineSave = () => {
      void updateGalleryCategoryNameInline(category.id, nameInput, motherSelect, saveBtn);
    };
    saveBtn.addEventListener("click", inlineSave);
    actionCell.appendChild(saveBtn);
    nameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        inlineSave();
      }
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteGalleryCategoryById(category));
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);
    body.appendChild(row);
  });
}
// Sends inline edits for gallery categories through the shared API endpoint.
async function updateGalleryCategoryNameInline(categoryId, inputEl, motherSelect, triggerButton) {
  if (!categoryId) {
    return;
  }
  const trimmedName = (inputEl?.value ?? "").trim();
  if (!trimmedName) {
    setGalleryStatus("Category name is required.", true);
    inputEl?.focus();
    return;
  }
  triggerButton?.setAttribute("disabled", "disabled");
  const motherValue = (motherSelect?.value ?? "").trim();
  try {
    const payload = {
      action: "update_gallery_category",
      id: categoryId,
      name: trimmedName,
      mother_category_id: motherValue
    };
    const result = await sendGalleryRequest(payload);
    const successMessage = result?.message || "Category updated successfully.";
    await reloadGalleryData();
    setGalleryStatus(successMessage, false);
  } catch (error) {
    setGalleryStatus(
      error?.message || "Failed to update category.",
      true
    );
  } finally {
    triggerButton?.removeAttribute("disabled");
  }
}

// Rebuilds the photo category dropdown whenever backend data changes.
function updateGalleryPhotoCategorySelect() {
  const selects = qsa("[data-gallery-photo-category]");
  if (!selects.length) {
    return;
  }
  selects.forEach(select => {
    const placeholder = select.querySelector('option[value=""]');
    const placeholderText = placeholder?.textContent?.trim() || "Select a category";
    select.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholderText;
    select.appendChild(emptyOption);
    GALLERY_CATEGORIES.forEach(category => {
      const option = document.createElement("option");
      option.value = String(category.id);
      option.textContent = category.name || category.slug || `Category ${category.id}`;
      select.appendChild(option);
    });
  });
}

// Renders the photo thumbnails grid and toggles the "load more" button.
function renderGalleryGrid() {
  const grid = qs("#gallery-thumb-grid");
  if (!grid) {
    return;
  }
  const emptyMessage = qs("#gallery-thumb-empty");
  const loadMoreBtn = qs("#gallery-load-more");
  const filteredPhotos = getGalleryFilteredPhotos(false);
  const totalPhotos = filteredPhotos.length;
  const visible = Math.min(galleryVisibleCount, totalPhotos);
  initializeGalleryGridLoading(grid, visible);
  grid.innerHTML = "";
  if (emptyMessage) {
    emptyMessage.classList.toggle("hidden", totalPhotos > 0);
  }
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < visible; i += 1) {
    const photo = filteredPhotos[i];
    if (!photo) {
      continue;
    }
    fragment.appendChild(
      createGalleryThumbnail(photo, {
        mode: GALLERY_THUMB_PREVIEW_MODE,
        gridElement: grid
      })
    );
  }
  grid.appendChild(fragment);
  if (loadMoreBtn) {
    const hasMore = visible < totalPhotos;
    loadMoreBtn.classList.toggle("hidden", !hasMore);
    loadMoreBtn.disabled = !hasMore;
  }
  updateGallerySearchCount(gallerySearchCountElement, totalPhotos, Boolean(gallerySearchTerm));
  renderPhotoChooserGrid();
}

function renderPhotoChooserGrid() {
  if (!photoChooserGridElement) {
    return;
  }
  const filteredPhotos = getGalleryFilteredPhotos(true);
  const totalPhotos = filteredPhotos.length;
  const visible = Math.min(photoChooserVisibleCount, totalPhotos);
  initializeGalleryGridLoading(photoChooserGridElement, visible);
  photoChooserGridElement.innerHTML = "";
  if (photoChooserEmptyElement) {
    photoChooserEmptyElement.classList.toggle("hidden", totalPhotos > 0);
  }
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < visible; i += 1) {
    const photo = filteredPhotos[i];
    if (!photo) {
      continue;
    }
    const card = createGalleryThumbnail(photo, {
      mode: GALLERY_THUMB_PREVIEW_MODE,
      gridElement: photoChooserGridElement,
      onActivate: () => togglePhotoChooserSelection(photo.id)
    });
    card.classList.add("gallery-thumb-card--selectable");
    if (photoChooserSelectedIds.has(photo.id)) {
      card.classList.add("gallery-thumb-card--selected");
    }
    fragment.appendChild(card);
  }
  photoChooserGridElement.appendChild(fragment);
  if (photoChooserLoadMoreButton) {
    const hasMore = visible < totalPhotos;
    photoChooserLoadMoreButton.classList.toggle("hidden", !hasMore);
    photoChooserLoadMoreButton.disabled = !hasMore;
  }
  updateGallerySearchCount(photoChooserSearchCountElement, totalPhotos, Boolean(photoChooserSearchTerm));
  updatePhotoChooserChooseButtonState();
}

function normalizeGallerySearchTerm(value) {
  return String(value ?? "").trim();
}

function getGalleryFilteredPhotos(isChooser = false) {
  const term = isChooser ? photoChooserSearchTerm : gallerySearchTerm;
  if (!term) {
    return GALLERY_PHOTOS;
  }
  const normalizedTerm = term.toLowerCase();
  return GALLERY_PHOTOS.filter(photo => {
    const haystack = `${photo.title || ""} ${photo.categoryName || ""}`.toLowerCase();
    return haystack.includes(normalizedTerm);
  });
}

function updateGallerySearchCount(element, total, hasQuery) {
  if (!element) {
    return;
  }
  const plural = total === 1 ? "" : "s";
  const suffix = hasQuery ? " match" : " total";
  element.textContent = `${total} photo${plural}${suffix}`;
}

function applyGallerySearchValue(rawValue) {
  gallerySearchTerm = normalizeGallerySearchTerm(rawValue);
  resetGalleryVisibleCount();
  renderGalleryGrid();
}

function applyPhotoChooserSearchValue(rawValue) {
  photoChooserSearchTerm = normalizeGallerySearchTerm(rawValue);
  photoChooserVisibleCount = GALLERY_GRID_INITIAL_COUNT;
  renderPhotoChooserGrid();
}

function setPhotoChooserSelection(ids = []) {
  photoChooserSelectedIds.clear();
  ids.forEach(item => {
    const parsed = Number(item);
    if (Number.isFinite(parsed) && parsed > 0) {
      photoChooserSelectedIds.add(parsed);
    }
  });
}

function togglePhotoChooserSelection(photoId) {
  const normalized = Number(photoId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return;
  }
  if (!photoChooserAllowMultiple) {
    photoChooserSelectedIds.clear();
  }
  if (photoChooserSelectedIds.has(normalized)) {
    photoChooserSelectedIds.delete(normalized);
  } else {
    if (!photoChooserAllowMultiple) {
      photoChooserSelectedIds.clear();
    }
    photoChooserSelectedIds.add(normalized);
  }
  renderPhotoChooserGrid();
}

function updatePhotoChooserChooseButtonState() {
  if (!photoChooserChooseButton) {
    return;
  }
  photoChooserChooseButton.disabled = photoChooserSelectedIds.size === 0;
}

function openPhotoChooserModal({ allowMultiple = true, initialSelection = [], onChoose = null } = {}) {
  if (!photoChooserModalElement) {
    return;
  }
  photoChooserAllowMultiple = Boolean(allowMultiple);
  photoChooserOnChoose = typeof onChoose === "function" ? onChoose : null;
  setPhotoChooserSelection(initialSelection);
  photoChooserVisibleCount = GALLERY_GRID_INITIAL_COUNT;
  renderPhotoChooserGrid();
  photoChooserModalElement.classList.remove("hidden");
  photoChooserModalElement.setAttribute("aria-hidden", "false");
}

function closePhotoChooserModal({ resetCallback = true } = {}) {
  if (!photoChooserModalElement) {
    return;
  }
  photoChooserModalElement.classList.add("hidden");
  photoChooserModalElement.setAttribute("aria-hidden", "true");
  photoChooserSelectedIds.clear();
  if (resetCallback) {
    photoChooserOnChoose = null;
  }
  photoChooserAllowMultiple = true;
}

// Builds each gallery card that appears inside the gallery grid.
function createGalleryThumbnail(photo, options = {}) {
  const card = document.createElement("article");
  card.className = "gallery-thumb-card";
  card.dataset.photoId = String(photo.id ?? "");
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  image.alt = photo.altText || photo.title || "Gallery photo";
  image.loading = "lazy";
  image.decoding = "async";
  image.src = GALLERY_THUMB_PLACEHOLDER;
  const thumbMode =
    typeof options.mode === "string" && options.mode
      ? options.mode
      : GALLERY_THUMB_DEFAULT_MODE;
  const thumbUrl = getGalleryThumbnailUrl(photo, { mode: thumbMode });
  if (thumbUrl) {
    image.dataset.galleryThumbSrc = thumbUrl;
    scheduleGalleryThumbnailLoad(image);
    const gridElement = options.gridElement ?? null;
    if (gridElement) {
      galleryImageGridMap.set(image, gridElement);
    }
  }
  figure.appendChild(image);
  card.appendChild(figure);
  const body = document.createElement("div");
  body.className = "gallery-thumb-card-body";
  const title = document.createElement("span");
  title.className = "gallery-thumb-card-title";
  title.textContent = photo.title || "Untitled photo";
  const meta = document.createElement("div");
  meta.className = "gallery-thumb-card-meta";
  const categoryTag = document.createElement("span");
  categoryTag.textContent = photo.categoryName || "Uncategorized";
  meta.appendChild(categoryTag);
  body.appendChild(title);
  body.appendChild(meta);
  card.appendChild(body);
  const activateCard = () => {
    if (typeof options.onActivate === "function") {
      options.onActivate(photo, card);
      return;
    }
    openGalleryPhotoModal(photo);
  };
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.addEventListener("click", activateCard);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard();
    }
  });
  return card;
}

function getGalleryThumbnailUrl(photoOrId, options = {}) {
  const id =
    Number(
      (typeof photoOrId === "object" ? photoOrId?.id : photoOrId) ?? 0
    );
  if (!id) {
    return "";
  }
  const timestamp =
    Number(
      (typeof photoOrId === "object"
        ? photoOrId?.uploadedAtTs
        : null) ?? Date.now()
    ) || Date.now();
  const mode =
    typeof options.mode === "string" && options.mode
      ? options.mode
      : GALLERY_THUMB_DEFAULT_MODE;
  return `./api/gallery-thumb.php?id=${encodeURIComponent(
    String(id)
  )}&mode=${encodeURIComponent(mode)}&v=${timestamp}`;
}

function formatGalleryPhotoDate(rawValue) {
  if (!rawValue) {
    return "";
  }
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

function setGalleryStatus(message, isError = false) {
  const statusEl = qs("#gallery-category-status");
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.toggle("error", Boolean(isError));
}

function resetGalleryCategoryForm() {
  const nameInput = qs("#gallery-category-name");
  if (nameInput) {
    nameInput.value = "";
  }
  const motherSelect = qs("#gallery-category-mother");
  if (motherSelect) {
    motherSelect.value = "";
  }
  const submitBtn = qs("#gallery-category-submit");
  if (submitBtn) {
    submitBtn.textContent =
      galleryCategorySubmitDefaultText || submitBtn.textContent || "";
  }
  const cancelBtn = qs("#gallery-category-cancel");
  if (cancelBtn) {
    cancelBtn.classList.add("hidden");
  }
}

async function deleteGalleryCategoryById(category) {
  if (!category || !category.id) {
    return;
  }
  const confirmed = await showDialog(
    `Delete "${category.name || category.slug}"?`,
    {
      confirm: true,
      title: "Delete category",
      okText: "Delete",
      cancelText: "Cancel"
    }
  );
  if (!confirmed) {
    return;
  }
    try {
      await sendGalleryRequest({
        action: "delete_gallery_category",
        id: category.id
      });
      setGalleryStatus("Category deleted successfully.", false);
      await reloadGalleryData();
      resetGalleryCategoryForm();
  } catch (err) {
    setGalleryStatus(err.message || "Failed to delete category.", true);
  }
}

// Refreshes gallery/state by fetching from the backend and re-rendering affected sections.
async function reloadGalleryData() {
  SERVER_DATABASE_CONNECTED = false;
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error("Failed to refresh gallery data.");
    }
    const payload = await response.json();
    SERVER_DATABASE_CONNECTED = Boolean(payload.databaseConnected);
    updateGalleryStateFromPayload(payload);
    renderGalleryCategories();
    renderGalleryGrid();
    updateKpis();
  } catch (err) {
    SERVER_DATABASE_CONNECTED = false;
    console.warn("Failed to refresh gallery data:", err);
  }
}

// Helper to POST gallery actions to the shared API and fail loudly on backend errors.
async function sendGalleryRequest(body) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!response.ok) {
    throw new Error(
      payload?.message || "The server failed to process the request."
    );
  }
  if (payload && payload.status === "error") {
    throw new Error(payload.message || "The server reported an error.");
  }
  return payload;
}

// Syncs the panel title between the sidebar, document title, and localStorage.
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

// Sends add/update/delete user intent to the backend without waiting for a response.
async function syncUserToBackend(action, payload) {
  try {
    const body =
      action === "delete_user"
        ? { action, code: payload?.code ?? "" }
        : { action, user: payload };
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.warn("Failed to sync user to backend:", err);
  }
}

// Persists panel settings changes to the backend store for the next load.
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

// Sets up all uploaders in the developer area to show previews and clear buttons.
function initPhotoUploaders() {
  qsa("[data-photo-uploader]").forEach(uploader => {
    const input = qs("[data-photo-input]", uploader);
    const uploadBtn = qs("[data-photo-upload]", uploader);
    const clearBtn = qs("[data-photo-clear]", uploader);
    if (!input || !uploadBtn) {
      return;
    }
    uploadBtn.addEventListener("click", () => input.click());
    input.addEventListener("change", () => updatePhotoUploaderPreview(uploader));
    clearBtn?.addEventListener("click", () => {
      input.value = "";
      updatePhotoUploaderPreview(uploader);
    });
    updatePhotoUploaderPreview(uploader);
  });
}

function updatePhotoUploaderPreview(uploader) {
  if (!uploader) {
    return;
  }
  const input = qs("[data-photo-input]", uploader);
  const preview = qs("[data-photo-image]", uploader);
  const placeholder = qs("[data-photo-placeholder]", uploader);
  const clearBtn = qs("[data-photo-clear]", uploader);
  if (!input) {
    return;
  }
  const file = input.files?.[0] ?? null;
  if (file && preview) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      preview.src = reader.result ?? "";
      preview.classList.remove("hidden");
      placeholder?.classList.add("hidden");
    });
    reader.readAsDataURL(file);
  } else {
    if (preview) {
      preview.removeAttribute("src");
      preview.classList.add("hidden");
    }
    placeholder?.classList.remove("hidden");
  }
  if (clearBtn) {
    clearBtn.classList.toggle("hidden", !file);
  }
}

function setGalleryPhotoMessage(form, message, isError = false) {
  if (!form) {
    return;
  }
  const msg = qs("[data-gallery-photo-msg]", form);
  if (!msg) {
    return;
  }
  msg.textContent = message;
  msg.classList.toggle("error", Boolean(isError));
}

let galleryUploadModalElement;
let galleryUploadModalFormElement;
let galleryUploadModalUploader;

function openGalleryUploadModal() {
  if (!galleryUploadModalElement) {
    return;
  }
  galleryUploadModalElement.classList.remove("hidden");
  galleryUploadModalElement.setAttribute("aria-hidden", "false");
  if (galleryUploadModalFormElement) {
    galleryUploadModalFormElement.reset();
    updatePhotoUploaderPreview(galleryUploadModalUploader);
    setGalleryPhotoMessage(galleryUploadModalFormElement, "", false);
    galleryUploadModalFormElement.querySelector('input[name="title"]')?.focus();
  }
}

function closeGalleryUploadModal() {
  if (!galleryUploadModalElement) {
    return;
  }
  galleryUploadModalElement.classList.add("hidden");
  galleryUploadModalElement.setAttribute("aria-hidden", "true");
}

let galleryPhotoModalElement;
let galleryPhotoModalFormElement;
let galleryPhotoModalImageElement;
let galleryPhotoModalLinkElement;
let galleryPhotoModalTitleInput;
let galleryPhotoModalAltInput;
let galleryPhotoModalReplaceInput;
let galleryPhotoModalReplaceButton;
let galleryPhotoModalDeleteButton;
let galleryPhotoModalCloseButton;
let galleryPhotoModalCategorySelect;
let galleryPhotoModalSaveButton;
let galleryPhotoModalCreatedElement;
let galleryModalActivePhotoId = 0;

function getGalleryPhotoFileUrl(photo) {
  if (!photo) {
    return "";
  }
  const filename = normalizeValue(photo.filename);
  if (!filename) {
    return getGalleryThumbnailUrl(photo);
  }
  if (filename.startsWith("/") || filename.startsWith("./")) {
    return filename;
  }
  return `./${filename}`;
}

function normalizeSiteIconHref(value) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }
  if (/^(?:data:|https?:\/\/|\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }
  return `./${trimmed}`;
}

function updateFaviconLink(iconUrl) {
  if (!faviconLinkElement) {
    return;
  }
  faviconLinkElement.href = iconUrl || SITE_ICON_DEFAULT_DATA_URI;
}

function updateSidebarLogoIcon(iconUrl) {
  const hasIcon = Boolean(iconUrl);
  if (sidebarLogoImage) {
    if (hasIcon) {
      sidebarLogoImage.src = iconUrl;
      sidebarLogoImage.classList.remove("hidden");
    } else {
      sidebarLogoImage.removeAttribute("src");
      sidebarLogoImage.classList.add("hidden");
    }
  }
  if (sidebarLogoText) {
    sidebarLogoText.classList.toggle("hidden", hasIcon);
  }
}

function updateSiteIconPreview(iconUrl) {
  const hasIcon = Boolean(iconUrl);
  if (siteIconPreviewImage) {
    if (hasIcon) {
      siteIconPreviewImage.src = iconUrl;
      siteIconPreviewImage.classList.remove("hidden");
    } else {
      siteIconPreviewImage.removeAttribute("src");
      siteIconPreviewImage.classList.add("hidden");
    }
  }
  if (siteIconPlaceholder) {
    siteIconPlaceholder.classList.toggle("hidden", hasIcon);
  }
  if (siteIconClearButton) {
    siteIconClearButton.disabled = !hasIcon;
  }
}

function applySiteIconValue(value, { persist = false } = {}) {
  siteIconValue = typeof value === "string" ? value.trim() : "";
  const iconUrl = normalizeSiteIconHref(siteIconValue);
  updateSiteIconPreview(iconUrl);
  updateSidebarLogoIcon(iconUrl);
  updateFaviconLink(iconUrl);
  if (persist) {
    SERVER_SETTINGS.siteIcon = siteIconValue;
    syncSettings({ siteIcon: siteIconValue });
  }
}

function findGalleryPhotoMatchingSiteIcon() {
  if (!siteIconValue) {
    return null;
  }
  return GALLERY_PHOTOS.find(photo => {
    const filename = normalizeValue(photo.filename);
    if (filename && filename === siteIconValue) {
      return true;
    }
    const url = getGalleryPhotoFileUrl(photo);
    return url === siteIconValue;
  });
}

function setGalleryPhotoModalMessage(message, isError = false) {
  setGalleryPhotoMessage(galleryPhotoModalFormElement, message, isError);
}

function openGalleryPhotoModal(photo) {
  if (!photo || !galleryPhotoModalElement || !galleryPhotoModalFormElement) {
    return;
  }
  galleryModalActivePhotoId = photo.id;
  setGalleryPhotoModalMessage("", false);
  const photoUrl = getGalleryPhotoFileUrl(photo);
  if (galleryPhotoModalImageElement) {
    galleryPhotoModalImageElement.src = photoUrl;
    galleryPhotoModalImageElement.alt = photo.altText || photo.title || "Gallery photo preview";
  }
  if (galleryPhotoModalLinkElement) {
    galleryPhotoModalLinkElement.href = photoUrl;
  }
  if (galleryPhotoModalTitleInput) {
    galleryPhotoModalTitleInput.value = photo.title || "";
  }
  if (galleryPhotoModalAltInput) {
    galleryPhotoModalAltInput.value = photo.altText || "";
  }
  if (galleryPhotoModalCategorySelect) {
    galleryPhotoModalCategorySelect.value = String(photo.categoryId || "");
  }
  if (galleryPhotoModalCreatedElement) {
    const formattedDate = formatGalleryPhotoDate(photo.uploadedAt);
    galleryPhotoModalCreatedElement.textContent = formattedDate ? `Created ${formattedDate}` : "";
  }
  if (galleryPhotoModalReplaceInput) {
    galleryPhotoModalReplaceInput.value = "";
  }
  galleryPhotoModalElement.classList.remove("hidden");
  galleryPhotoModalElement.setAttribute("aria-hidden", "false");
}

function closeGalleryPhotoModal() {
  if (!galleryPhotoModalElement) {
    return;
  }
  galleryModalActivePhotoId = 0;
  galleryPhotoModalElement.classList.add("hidden");
  galleryPhotoModalElement.setAttribute("aria-hidden", "true");
  setGalleryPhotoModalMessage("", false);
  galleryPhotoModalFormElement?.reset();
  if (galleryPhotoModalReplaceInput) {
    galleryPhotoModalReplaceInput.value = "";
  }
}

async function sendGalleryFormRequest(formData) {
  const response = await fetch(API_ENDPOINT, { method: "POST", body: formData });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload?.message || "The server failed to process the request.");
  }
  if (payload && payload.status === "error") {
    throw new Error(payload.message || "The server reported an error.");
  }
  return payload;
}

async function handleGalleryPhotoModalSave(event) {
  event.preventDefault();
  if (!galleryModalActivePhotoId) {
    return;
  }
  const title = (galleryPhotoModalTitleInput?.value ?? "").trim();
  const alt = (galleryPhotoModalAltInput?.value ?? "").trim();
  if (!title) {
    setGalleryPhotoModalMessage("Photo title is required.", true);
    galleryPhotoModalTitleInput?.focus();
    return;
  }
  const categoryValue = (galleryPhotoModalCategorySelect?.value ?? "").trim();
  const parsedCategoryId = Number(categoryValue);
  const normalizedCategoryId =
    Number.isFinite(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null;
  setGalleryPhotoModalMessage("Saving photo...", false);
  galleryPhotoModalSaveButton?.setAttribute("disabled", "disabled");
  try {
    await sendGalleryRequest({
      action: "update_gallery_photo",
      photo_id: galleryModalActivePhotoId,
      title,
      alt_text: alt,
      category_id: normalizedCategoryId
    });
    setGalleryPhotoModalMessage("Photo details updated.", false);
    await reloadGalleryData();
    const refreshedPhoto = GALLERY_PHOTOS.find(p => p.id === galleryModalActivePhotoId);
    if (refreshedPhoto) {
      openGalleryPhotoModal(refreshedPhoto);
    } else {
      closeGalleryPhotoModal();
    }
  } catch (error) {
    setGalleryPhotoModalMessage(
      error?.message || "Failed to update photo.",
      true
    );
  } finally {
    galleryPhotoModalSaveButton?.removeAttribute("disabled");
  }
}

async function handleGalleryPhotoReplace(file) {
  if (!file || !galleryModalActivePhotoId) {
    return;
  }
  setGalleryPhotoModalMessage("Replacing photo...", false);
  galleryPhotoModalReplaceButton?.setAttribute("disabled", "disabled");
  const formData = new FormData();
  formData.set("action", "replace_gallery_photo");
  formData.set("photo_id", String(galleryModalActivePhotoId));
  formData.set("photo", file);
  try {
    await sendGalleryFormRequest(formData);
    await reloadGalleryData();
    const refreshedPhoto = GALLERY_PHOTOS.find(p => p.id === galleryModalActivePhotoId);
    if (refreshedPhoto) {
      openGalleryPhotoModal(refreshedPhoto);
      setGalleryPhotoModalMessage("Photo replaced successfully.", false);
    } else {
      closeGalleryPhotoModal();
    }
  } catch (error) {
    setGalleryPhotoModalMessage(
      error?.message || "Failed to replace photo.",
      true
    );
  } finally {
    galleryPhotoModalReplaceButton?.removeAttribute("disabled");
  }
}

async function handleGalleryPhotoDelete() {
  if (!galleryModalActivePhotoId) {
    return;
  }
  const photo = GALLERY_PHOTOS.find(p => p.id === galleryModalActivePhotoId);
  const title = photo?.title || photo?.filename || "this photo";
  const confirmed = await showDialog(
    `Delete "${title}"?`,
    {
      confirm: true,
      title: "Delete photo",
      okText: "Delete",
      cancelText: "Cancel"
    }
  );
  if (!confirmed) {
    return;
  }
  setGalleryPhotoModalMessage("Deleting photo...", false);
  try {
    await sendGalleryRequest({
      action: "delete_gallery_photo",
      photo_id: galleryModalActivePhotoId
    });
    closeGalleryPhotoModal();
    await reloadGalleryData();
  } catch (error) {
    setGalleryPhotoModalMessage(
      error?.message || "Failed to delete photo.",
      true
    );
  }
}

// Highlights the requested tab and updates the page title bar.
function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: 'Home', users: 'Users', devsettings: 'Developer Settings', settings: 'Settings' };
  const el = qs('#page-title');
  if (el) el.textContent = titles[tab] || '';
}

function createTextCell(value) {
  const td = document.createElement('td');
  td.textContent = value == null ? '' : String(value);
  return td;
}

function getUserDisplayName(user) {
  return (
    normalizeValue(user.name) ||
    normalizeValue(user.fullname) ||
    normalizeValue(user.username)
  );
}

// Rebuilds the users table from the current USER_DB snapshot.
function renderUsers() {
  const tbody = qs('#users-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  USER_DB.forEach(user => {
    const tr = document.createElement('tr');
    tr.appendChild(createTextCell(user.code));
    tr.appendChild(createTextCell(getUserDisplayName(user)));
    tr.appendChild(createTextCell(user.phone));
    tr.appendChild(createTextCell(user.work_id));
    tr.appendChild(createTextCell(user.id_number));
    tr.appendChild(createTextCell(user.email));
    const actionCell = document.createElement('td');
    actionCell.classList.add('users-actions-cell');
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn ghost';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openUserModal(user));
    // The delete CTA uses the primary theme so it visually matches the requested styling.
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn primary';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => openDeleteModal(user));
    actionCell.appendChild(editBtn);
    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);
    tbody.appendChild(tr);
  });
}

// Prepares and shows the modal that allows adding or editing a user record.
// Opens the user modal and pre-fills fields for edit mode (or blank state for new entries).
function openUserModal(user = null) {
  const form = qs('#user-form');
  if (form) {
    form.dataset.mode = user ? 'edit' : 'add';
  }
  editingUserCode = user?.code ?? '';
  const titleEl = qs('#user-modal-title');
  const submitBtn = qs('#user-form button[type="submit"]');
  if (titleEl) {
    titleEl.textContent = user ? 'Edit user' : 'Add user';
  }
  if (submitBtn) {
    submitBtn.textContent = user ? 'Save' : 'Add';
  }
  const codeInput = qs('#user-code');
  const usernameInput = qs('#user-name');
  const fullnameInput = qs('#user-fullname');
  const phoneInput = qs('#user-phone');
  const workInput = qs('#user-work-id');
  const idInput = qs('#user-id-number');
  const emailInput = qs('#user-email');
  const activeInput = qs('#user-active');
  if (codeInput) {
    codeInput.value = user?.code ?? getNextUserCode();
  }
  if (usernameInput) {
    usernameInput.value = user?.username ?? user?.name ?? '';
  }
  if (fullnameInput) {
    fullnameInput.value = user?.name ?? user?.fullname ?? '';
  }
  if (phoneInput) {
    phoneInput.value = user?.phone ?? '';
  }
  if (workInput) {
    workInput.value = user?.work_id ?? '';
  }
  if (emailInput) {
    emailInput.value = user?.email ?? '';
  }
  if (idInput) {
    idInput.value = user?.id_number ?? '';
  }
  if (activeInput) {
    activeInput.checked = Boolean(user ? user.active : true);
  }
  const msg = qs('#user-form-msg');
  if (msg) {
    msg.textContent = '';
  }
  qs('#user-modal')?.classList.remove('hidden');
}

// Hides the user modal and resets its form.
function closeUserModal() {
  const modal = qs('#user-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  const form = qs('#user-form');
  if (form) {
    form.reset();
    form.dataset.mode = 'add';
  }
  editingUserCode = '';
  const msg = qs('#user-form-msg');
  if (msg) {
    msg.textContent = '';
  }
}

// Opens the delete confirmation modal with the target user's name.
function openDeleteModal(user) {
  if (!user) return;
  deletingUserCode = user.code ?? '';
  const nameHolder = qs('#user-delete-name');
  if (nameHolder) {
    nameHolder.textContent = user.name || user.username || 'this user';
  }
  qs('#user-delete-modal')?.classList.remove('hidden');
}

// Hides the delete modal and clears the temporary state.
function closeDeleteModal() {
  deletingUserCode = '';
  const nameHolder = qs('#user-delete-name');
  if (nameHolder) {
    nameHolder.textContent = '';
  }
  qs('#user-delete-modal')?.classList.add('hidden');
}

// Removes the user from local state and notifies the backend.
function confirmUserDeletion() {
  if (!deletingUserCode) {
    closeDeleteModal();
    return;
  }
  const index = USER_DB.findIndex(u => (u.code ?? '') === deletingUserCode);
  if (index >= 0) {
    USER_DB.splice(index, 1);
    renderUsers();
    updateKpis();
    syncUserToBackend('delete_user', { code: deletingUserCode });
  }
  closeDeleteModal();
}

// Refreshes the KPI cards with the latest user/photo counts and database connectivity.
function updateKpis() {
  const total = USER_DB.length;
  const photoCount = GALLERY_PHOTOS.length;
  const setKpiValue = (selector, value) => {
    const el = qs(selector);
    if (el) el.textContent = value;
  };
  setKpiValue('#kpi-users', total);
  setKpiValue('#kpi-photos', photoCount);
  const statusEl = qs('#kpi-db-status');
  if (statusEl) {
    const connected = SERVER_DATABASE_CONNECTED;
    statusEl.textContent = connected ? 'Connected' : 'Disconnected';
    statusEl.classList.toggle('connected', connected);
    statusEl.classList.toggle('disconnected', !connected);
  }
}

// Updates the live clock in the top bar using the selected timezone.
function renderClock(){
  const el = qs('#live-clock'); if (!el) return;
  const tz = localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute:'2-digit',
    second:'2-digit',
    hour12:false,
    timeZone: tz
  });
  const englishParts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
    timeZone: tz
  }).formatToParts(now);
  const partValue = (type) => englishParts.find(p => p.type === type)?.value || '';
  const dateLabel = `${partValue('weekday')}, ${partValue('month')} ${partValue('day')} ${partValue('year')}`.trim();
  const displayName = (window.__CURRENT_USER_NAME || PANEL_TITLE_DEFAULT);
  el.innerHTML = `<span class="time">${time}</span><span class="date">${dateLabel}</span><span class="user">${displayName}</span>`;
}

// Removes the initial spinner after transition end to reveal the SPA.
function hideAppLoader(){
  const loader = qs('#app-loader');
  if (!loader) return;
  loader.classList.add('is-hidden');
  const removeLoader = () => loader.remove();
  loader.addEventListener('transitionend', removeLoader, { once: true });
  setTimeout(removeLoader, 700);
}

// Displays the reusable modal dialog for confirmations and alerts.
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
  if (titleEl) titleEl.textContent = opts.title || 'Message';
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
// Bootstraps the UI once DOM is ready: load data, render galleries/users, and attach all handlers.
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadServerData();
  } finally {
    hideAppLoader();
  }
  setActiveTab('home');
  renderUsers();
  updateKpis();
  renderGalleryCategories();
  gallerySearchCountElement = qs("[data-gallery-search-count]");
  photoChooserSearchCountElement = qs("[data-photo-chooser-search-count]");
  renderGalleryGrid();
  initPhotoUploaders();
  const loadMoreGalleryPhotos = qs("#gallery-load-more");
  loadMoreGalleryPhotos?.addEventListener("click", () => {
    galleryVisibleCount += GALLERY_GRID_LOAD_STEP;
    renderGalleryGrid();
    requestAnimationFrame(() => {
      scrollGalleryGridByRows(qs("#gallery-thumb-grid"), 2);
    });
    loadMoreGalleryPhotos.blur();
  });

  // Clicking a nav-item switches tabs and refreshes the header/title.
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

  // Toggles the collapsed sidebar state.
  qs('#sidebarToggle')?.addEventListener('click', () => {
    const app = qs('#app-view');
    if (!app) return;
    app.classList.toggle('collapsed');
    app.style.gridTemplateColumns = '';
  });

  // Wire add/edit user button to show the modal.
  qs('#add-user')?.addEventListener('click', () => openUserModal());
  // Cancel button simply hides the modal.
  qs('#user-cancel')?.addEventListener('click', closeUserModal);
  // Handles form submissions by updating the local state and syncing back to the server.
  qs('#user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = qs('#user-name').value.trim();
    const fullname = qs('#user-fullname').value.trim();
    const phone = qs('#user-phone').value.trim();
    const email = qs('#user-email').value.trim();
    const msg = qs('#user-form-msg');
    const codeInput = qs('#user-code');
    const codeValue = (codeInput?.value ?? "").trim();
    const workId = qs('#user-work-id').value.trim();
    const idNumber = qs('#user-id-number').value.trim();
    const activeInput = qs('#user-active');
    const isActive = activeInput ? activeInput.checked : true;
    if (!username) { msg.textContent = 'Username is required.'; return; }
    if (!fullname) { msg.textContent = 'Full name is required.'; return; }
    if (!/^\d{11}$/.test(phone)) { msg.textContent = 'Phone number must be 11 digits.'; return; }
    if (!isValidEmail(email)) { msg.textContent = 'Please provide a valid email address.'; return; }
    const normalizedPhone = normalizeDigits(phone);
    if (normalizedPhone.length !== 11) {
      msg.textContent = 'Phone number must contain 11 digits.'; return;
    }
    const duplicatePhone = USER_DB.some(u => {
      if (editingUserCode && u.code === editingUserCode) {
        return false;
      }
      const existingPhone = normalizeDigits(u.phone);
      return existingPhone !== '' && existingPhone === normalizedPhone;
    });
    if (duplicatePhone) {
      msg.textContent = 'Phone number must be unique.'; return;
    }
    const normalizedId = normalizeDigits(idNumber);
    const code = codeValue || getNextUserCode();
    const payload = {
      code,
      username,
      fullname,
      phone: normalizedPhone,
      work_id: workId,
      id_number: normalizedId,
      active: isActive
    };
    payload.email = email;
    if (editingUserCode) {
      const index = USER_DB.findIndex(u => u.code === editingUserCode);
      if (index >= 0) {
        USER_DB[index] = {
          ...USER_DB[index],
          username,
          name: fullname,
          fullname,
          phone: normalizedPhone,
          work_id: workId,
          id_number: normalizedId,
          email,
          active: isActive
        };
        renderUsers();
        updateKpis();
        closeUserModal();
        syncUserToBackend('update_user', payload);
        return;
      }
      msg.textContent = 'User not found.'; return;
    }
    const newUser = {
      ...payload,
      name: fullname,
      username,
      fullname
    };
    USER_DB.push(newUser);
    renderUsers();
    updateKpis();
    closeUserModal();
    syncUserToBackend('add_user', newUser);
  });
  // Delete modal buttons drive the confirm/cancel flow.
  qs('#user-delete-cancel')?.addEventListener('click', closeDeleteModal);
  qs('#user-delete-confirm')?.addEventListener('click', confirmUserDeletion);

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
  initAppearanceControls();
  faviconLinkElement = qs('#site-icon-link');
  sidebarLogoImage = qs('[data-sidebar-site-icon]');
  sidebarLogoText = qs('[data-sidebar-logo-text]');
  siteIconPreviewImage = qs('[data-site-icon-image]');
  siteIconPlaceholder = qs('[data-site-icon-placeholder]');
  siteIconAddButton = qs('[data-open-photo-chooser]');
  siteIconClearButton = qs('[data-clear-site-icon]');
  applySiteIconValue(SERVER_SETTINGS.siteIcon ?? "", { persist: false });
  siteIconAddButton?.addEventListener('click', () => {
    const activePhoto = findGalleryPhotoMatchingSiteIcon();
    const initialSelection = activePhoto ? [activePhoto.id] : [];
    openPhotoChooserModal({
      allowMultiple: false,
      initialSelection,
      onChoose: (selectedPhotos = []) => {
        const photo = selectedPhotos[0];
        if (!photo) {
          return;
        }
        const filename = normalizeValue(photo.filename);
        applySiteIconValue(filename, { persist: true });
      }
    });
  });
  siteIconClearButton?.addEventListener('click', () => {
    applySiteIconValue("", { persist: true });
  });
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
  const galleryPhotoForms = qsa('[data-gallery-photo-form]');
  galleryPhotoModalElement = qs('#gallery-photo-modal');
  galleryPhotoModalFormElement = qs('[data-gallery-photo-modal-form]');
  galleryPhotoModalImageElement = galleryPhotoModalElement
    ? qs('[data-gallery-photo-preview]', galleryPhotoModalElement)
    : null;
  galleryPhotoModalLinkElement = galleryPhotoModalElement
    ? qs('[data-gallery-photo-link]', galleryPhotoModalElement)
    : null;
  galleryPhotoModalTitleInput = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-modal-title]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalAltInput = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-modal-alt]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalCategorySelect = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-category]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalCreatedElement = galleryPhotoModalElement
    ? qs('[data-gallery-photo-created]', galleryPhotoModalElement)
    : null;
  galleryPhotoModalReplaceInput = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-replace-input]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalReplaceButton = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-replace]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalDeleteButton = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-delete]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalSaveButton = galleryPhotoModalFormElement
    ? qs('[data-gallery-photo-save]', galleryPhotoModalFormElement)
    : null;
  galleryPhotoModalCloseButton = galleryPhotoModalElement
    ? qs('[data-gallery-photo-close]', galleryPhotoModalElement)
    : null;
  galleryUploadModalElement = qs('#gallery-upload-modal');
  galleryUploadModalFormElement = galleryUploadModalElement
    ? qs('[data-gallery-photo-form]', galleryUploadModalElement)
    : null;
  galleryUploadModalUploader = galleryUploadModalFormElement
    ? qs('[data-photo-uploader="gallery"]', galleryUploadModalFormElement)
    : null;
  photoChooserModalElement = qs('#photo-chooser-modal');
  photoChooserGridElement = qs('#photo-chooser-thumb-grid');
  photoChooserEmptyElement = qs('#photo-chooser-thumb-empty');
  photoChooserLoadMoreButton = qs('#photo-chooser-load-more');
  photoChooserChooseButton = qs('#photo-chooser-choose');
  photoChooserCancelButton = qs('[data-photo-chooser-cancel]');
  photoChooserUploadButton = qs('[data-photo-chooser-upload]');
  gallerySearchInputElement = qs('[data-gallery-search]');
  photoChooserSearchInputElement = qs('[data-photo-chooser-search]');
  const photoChooserCloseButtons = photoChooserModalElement
    ? qsa('[data-photo-chooser-close]', photoChooserModalElement)
    : [];
  const attachSearchInput = (inputEl, handler) => {
    const runSearch = (sourceEvent) => {
      handler(sourceEvent?.target?.value ?? inputEl?.value ?? "");
    };
    inputEl?.addEventListener("input", runSearch);
    inputEl?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearch(event);
      }
    });
  };
  attachSearchInput(gallerySearchInputElement, applyGallerySearchValue);
  attachSearchInput(photoChooserSearchInputElement, applyPhotoChooserSearchValue);
  photoChooserLoadMoreButton?.addEventListener('click', () => {
    photoChooserVisibleCount += GALLERY_GRID_LOAD_STEP;
    renderPhotoChooserGrid();
    requestAnimationFrame(() => {
      scrollGalleryGridByRows(photoChooserGridElement, 2);
    });
    photoChooserLoadMoreButton.blur();
  });
  photoChooserChooseButton?.addEventListener('click', () => {
    if (!photoChooserOnChoose) {
      closePhotoChooserModal();
      return;
    }
    photoChooserReopenContext = null;
    const selectedPhotos = [];
    photoChooserSelectedIds.forEach(id => {
      const photo = GALLERY_PHOTOS.find(p => p.id === id);
      if (photo) {
        selectedPhotos.push(photo);
      }
    });
    photoChooserOnChoose(selectedPhotos);
    closePhotoChooserModal();
  });
  photoChooserUploadButton?.addEventListener('click', () => {
    photoChooserReopenContext = {
      allowMultiple: photoChooserAllowMultiple,
      onChoose: photoChooserOnChoose
    };
    closePhotoChooserModal({ resetCallback: false });
    openGalleryUploadModal();
  });
  photoChooserCancelButton?.addEventListener('click', closePhotoChooserModal);
  photoChooserCloseButtons.forEach(btn => btn.addEventListener('click', closePhotoChooserModal));
  photoChooserModalElement?.addEventListener('click', (event) => {
    if (event.target === photoChooserModalElement) {
      closePhotoChooserModal();
    }
  });
  renderPhotoChooserGrid();
  const galleryCategoryForm = qs('#gallery-category-form');
  const galleryCategorySubmitButton = qs('#gallery-category-submit');
  const galleryCategoryCancelButton = qs('#gallery-category-cancel');
  galleryCategorySubmitDefaultText =
    galleryCategorySubmitButton?.textContent?.trim() ||
    galleryCategorySubmitDefaultText ||
    "Submit";
  galleryCategoryCancelButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetGalleryCategoryForm();
  });
  galleryPhotoForms.forEach(form => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const uploader = qs('[data-photo-uploader="gallery"]', form);
      const fileInput = qs('[data-photo-input]', uploader ?? form);
      if (!fileInput || !fileInput.files?.length) {
        setGalleryPhotoMessage(form, 'Please select a photo first.', true);
        return;
      }
      const submitButton = qs('button[type="submit"]', form);
      submitButton?.setAttribute('disabled', 'disabled');
      setGalleryPhotoMessage(form, 'Uploading photo...', false);
      const formData = new FormData(form);
      formData.set('action', 'add_gallery_photo');
      try {
        const response = await fetch(API_ENDPOINT, { method: 'POST', body: formData });
        let payload = {};
        try {
          payload = await response.json();
        } catch {
          payload = {};
        }
        if (!response.ok) {
          throw new Error(payload['message'] ?? 'Failed to upload photo.');
        }
        if (payload && payload.status === 'error') {
          throw new Error(payload.message || 'The server reported an error.');
        }
        const successMessage = payload.message || 'Photo uploaded successfully.';
        form.reset();
        if (uploader) {
          updatePhotoUploaderPreview(uploader);
        }
        setGalleryPhotoMessage(form, successMessage, false);
        await reloadGalleryData();
        if (photoChooserReopenContext) {
          const latestPhoto = GALLERY_PHOTOS[0];
          const selection = latestPhoto ? [latestPhoto.id] : [];
          const { allowMultiple, onChoose } = photoChooserReopenContext;
          photoChooserReopenContext = null;
          closeGalleryUploadModal();
          openPhotoChooserModal({
            allowMultiple: Boolean(allowMultiple),
            initialSelection: selection,
            onChoose
          });
        }
      } catch (error) {
        setGalleryPhotoMessage(
          form,
          error && typeof error.message === 'string'
            ? error.message
            : 'Failed to upload photo.',
          true
        );
      } finally {
        submitButton?.removeAttribute('disabled');
      }
    });
  });
  galleryCategoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = qs('#gallery-category-name');
    const motherSelect = qs('#gallery-category-mother');
    const name = (input?.value ?? '').trim();
    const motherValue = (motherSelect?.value ?? '').trim();
    if (!name) {
      setGalleryStatus('Category name is required.', true);
      return;
    }
    const payload = {
      action: 'add_gallery_category',
      name,
      mother_category_id: motherValue
    };
    setGalleryStatus('Saving category...', false);
    galleryCategorySubmitButton?.setAttribute('disabled', 'disabled');
    try {
      const result = await sendGalleryRequest(payload);
      const successMessage =
        result.message || 'Category saved successfully.';
      setGalleryStatus(successMessage, false);
      resetGalleryCategoryForm();
      await reloadGalleryData();
    } catch (error) {
      setGalleryStatus(
        error.message || 'Failed to save category.',
        true
      );
    } finally {
      galleryCategorySubmitButton?.removeAttribute('disabled');
    }
  });
  resetGalleryCategoryForm();
  initSubSidebars();

  const galleryUploadModalOpenButton = qs('#open-gallery-upload-modal');
  galleryUploadModalOpenButton?.addEventListener('click', (event) => {
    event.preventDefault();
    openGalleryUploadModal();
  });
  const galleryUploadModalCloseButtons = galleryUploadModalElement
    ? qsa('[data-gallery-upload-modal-close]', galleryUploadModalElement)
    : [];
  galleryUploadModalCloseButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      closeGalleryUploadModal();
    });
  });
  galleryUploadModalElement?.addEventListener('click', (event) => {
    if (event.target === galleryUploadModalElement) {
      closeGalleryUploadModal();
    }
  });

  galleryPhotoModalCloseButton?.addEventListener('click', closeGalleryPhotoModal);
  galleryPhotoModalElement?.addEventListener('click', (event) => {
    if (event.target === galleryPhotoModalElement) {
      closeGalleryPhotoModal();
    }
  });
  galleryPhotoModalFormElement?.addEventListener('submit', handleGalleryPhotoModalSave);
  galleryPhotoModalReplaceButton?.addEventListener('click', () => {
    galleryPhotoModalReplaceInput?.click();
  });
  galleryPhotoModalReplaceInput?.addEventListener('change', async (event) => {
    const file = event.currentTarget?.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (file) {
      await handleGalleryPhotoReplace(file);
    }
  });
  galleryPhotoModalDeleteButton?.addEventListener('click', handleGalleryPhotoDelete);

  window.addEventListener('storage', updateKpis);
});
