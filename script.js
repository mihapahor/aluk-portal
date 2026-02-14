import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

window.globalFileList = [];

const SUPABASE_URL = "https://ugwchsznxsuxbxdvigsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2Noc3pueHN1eGJ4ZHZpZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY0NzEsImV4cCI6MjA4NDY5MjQ3MX0.iFzB--KryoBedjIJnybL55-xfQFIBxWnKq9RqwxuyK4";
const R2_BASE_URL = "https://pub-28724a107246493c93629c81b8105cff.r2.dev";
const ADMIN_EMAIL = "miha@aluk.si";
// Tabela v Supabase: ustvari z stolpci email, name, company, created_at (RLS dovoli INSERT za anon)
const ACCESS_REQUESTS_TABLE = "access_requests"; 

// --- KONFIGURACIJA ---
const customSortOrder = [
  "Okenski sistemi", "Vratni sistemi", "Panoramski sistemi",
  "Fasadni sistemi", "Pisarniski sistemi", "Dekorativne obloge Skin"
];
const relevantExtensions = ['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'dwg', 'dxf', 'zip', 'rar', '7z'];
const folderIcons = {
  // "Tehnični katalogi" in podobno: raje ikona dokumentacije kot orodje.
  "tehničn": "book", "tehnicn": "book", "katalog": "book",
  "galerij": "image", "foto": "image", "referenc": "image",
  "certifikat": "badge", "izjav": "badge",
  "vgradni": "ruler", "prerezi": "ruler",
  "navodil": "info", "obdelav": "info", "brosur": "info",
  "montaz": "tool",
  "splosn": "folder", "pisarnisk": "folder", "dvizn": "folder"
};
const fileIcons = {
  "pdf": "fileText",
  "xls": "table", "xlsx": "table", "csv": "table",
  "doc": "file", "docx": "file",
  "zip": "archive", "rar": "archive", "7z": "archive",
  "jpg": "image", "jpeg": "image", "png": "image", "webp": "image"
};

// --- ICONS (inline SVG, enoten stil) ---
const ICON_SVGS = {
  home:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><path d="M6 11h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><path d="M12 16v2"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/><path d="M16.5 16.5 21 21"/></svg>',
  bell:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  book:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19a2 2 0 0 0 2 2h13"/><path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h6"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  wrench:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4.5 4.5 0 0 0 4.6 6.7l-6.9 6.9a2.2 2.2 0 0 1-3.1 0l-1.2-1.2a2.2 2.2 0 0 1 0-3.1l6.9-6.9A4.5 4.5 0 0 0 11.3 4z"/><path d="M16 8l2 2"/></svg>',
  image:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 11l2.5 3 2-2.5L18 18H6z"/><path d="M9 8.5a1.2 1.2 0 1 0 0 .01z"/></svg>',
  badge:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 5 5 .9-3.6 3.6.9 5-4.3-2.3-4.3 2.3.9-5L4 7.9 9 7z"/></svg>',
  ruler:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l10-10 6 6-10 10H4z"/><path d="M14 6l4 4"/><path d="M7 13l1 1"/><path d="M9 11l1 1"/><path d="M11 9l1 1"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M12 10v7"/><path d="M12 7h.01"/></svg>',
  tool:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7l3 3"/><path d="M12.3 9.7 6 16v3h3l6.3-6.3"/><path d="M16 3a4 4 0 0 0-3 6.7l1.3 1.3A4 4 0 1 0 16 3z"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L11 2.9"/><path d="M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 0 0 7.1 7.1L13 19.1"/></svg>',
  file:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  fileText:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>',
  table:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
  archive:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M5 7l1-3h12l1 3"/><path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 11h4"/></svg>'
};

function iconSvg(name) {
  const svg = ICON_SVGS[name] || ICON_SVGS.file;
  // Hard-code common style: stroke icons, currentColor.
  return svg.replace(
    "<svg ",
    '<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  );
}

// Escapiranje za vstavljanje v HTML (prepreči XSS)
function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- VARNOSTNA FUNKCIJA ZA DOM DOSTOP (definirana na vrhu!) ---
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element z ID "${id}" ni najden.`);
  return el;
}

/** Kratko obvestilo "Prenašanje..." ob kliku na datoteko za prenos (DWG, Excel). */
function showDownloadNotification() {
  let toast = document.getElementById("downloadToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "downloadToast";
    toast.className = "download-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = "Prenašanje...";
  toast.classList.add("visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2000);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'aluk-portal-auth' }
});

// DOM ELEMENTI (z varnostnimi preverjanji)
const authForm = getElement("authForm");
const appCard = getElement("appCard");
const mainContent = getElement("mainContent");
const searchResultsWrapper = getElement("searchResultsWrapper");
const catalogResultsSection = getElement("catalogResultsSection");
const searchSpinner = getElement("searchSpinner");
const skeletonLoader = getElement("skeletonLoader");
const statusEl = getElement("status");
const searchInput = getElement("search");
const breadcrumbsEl = getElement("breadcrumbs");
const backBtn = getElement("backBtn");
const msgEl = getElement("authMsg");
const updatesBanner = getElement("updatesBanner");
const updatesAccordionHeader = getElement("updatesAccordionHeader");
const updatesAccordionBody = getElement("updatesAccordionBody");
const updatesBadge = getElement("updatesBadge");
const updatesList = getElement("updatesList");
const lastUpdateDateEl = getElement("lastUpdateDate");
const pdfModal = getElement("pdfModal");
const pdfFrame = getElement("pdfFrame");
const viewerFileName = getElement("viewerFileName");
const btnGrid = getElement("btnGrid");
const btnList = getElement("btnList");
const globalFavorites = getElement("globalFavorites");
const globalFavContainer = getElement("globalFavContainer");
const sidebarFavList = getElement("sidebarFavList");
const sidebarEl = getElement("sidebar");
const sidebarOverlay = getElement("sidebarOverlay");
const menuBtn = getElement("menuBtn");

let currentPath = ""; 
let currentItems = [];
let imageMap = {}; 
let favorites = loadFavorites();
let viewMode = localStorage.getItem('aluk_view_mode') || 'grid';
let folderCache = {}; 
let currentRenderId = 0;
let imageUrlCache = {}; // Cache za signed URLs slik
let isSearchActive = false; // Flag za preverjanje, če je aktivno iskanje 
let preloadFilesPromise = null;
const UPDATES_CACHE_KEY = "aluk_updates_cache";
const UPDATES_SINCE_KEY = "aluk_updates_since";
const UPDATES_RESET_VERSION_KEY = "aluk_updates_reset_version";
// Spremeni vrednost, ko želiš globalno (za vse uporabnike) resetirati "posodobitve" od današnjega dne naprej.
const UPDATES_RESET_VERSION = "2026-02-14";
const NEW_FILES_CACHE_TTL_MS = 60 * 1000;
const PATH_EXISTS_CACHE_TTL_MS = 30 * 1000;
let updatesRequestId = 0;
const newFilesCache = new Map();
const newFilesInFlight = new Map();
const pathExistsCache = new Map();
const pathExistsInFlight = new Map();
let filesTableCache = null;
let filesTableCachePromise = null;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function ensureUpdatesCounterResetFromToday() {
  try {
    const appliedVersion = localStorage.getItem(UPDATES_RESET_VERSION_KEY);
    if (appliedVersion === UPDATES_RESET_VERSION) return;
    localStorage.setItem(UPDATES_SINCE_KEY, startOfToday().toISOString());
    localStorage.setItem(UPDATES_RESET_VERSION_KEY, UPDATES_RESET_VERSION);
    sessionStorage.removeItem(UPDATES_CACHE_KEY);
    newFilesCache.clear();
    newFilesInFlight.clear();
  } catch (e) {}
}

function getUpdatesSinceDate() {
  try {
    const raw = localStorage.getItem(UPDATES_SINCE_KEY);
    if (raw) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  } catch (e) {}
  const today = startOfToday();
  try {
    localStorage.setItem(UPDATES_SINCE_KEY, today.toISOString());
  } catch (e) {}
  return today;
}

ensureUpdatesCounterResetFromToday();

function isAfterUpdatesSince(iso) {
  if (!iso) return false;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return false;
  return dt >= getUpdatesSinceDate();
}

function escapeJsSingleQuotedString(str) {
  return String(str == null ? "" : str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function openExternalUrl(url) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) w.opener = null;
}

function folderHasUpdatesByCurrentPathCache(folderPath) {
  const updatesInCurrentPath = getUpdatesCacheForPath(currentPath);
  if (!updatesInCurrentPath || !updatesInCurrentPath.length) return false;
  const folderPrefix = normalizePath(folderPath) + "/";
  return updatesInCurrentPath.some((f) => {
    const fp = normalizePath(f.fullPath || "");
    return fp.startsWith(folderPrefix);
  });
}

function getUpdatesCacheMap() {
  try {
    const raw = sessionStorage.getItem(UPDATES_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function getUpdatesCacheForPath(path) {
  const key = normalizePath(path || "");
  const cache = getUpdatesCacheMap();
  const entry = cache[key];
  const sinceIso = getUpdatesSinceDate().toISOString();
  if (!entry || !Array.isArray(entry.items)) return null;
  if (entry.since !== sinceIso) return null;
  return entry.items;
}

function setUpdatesCacheForPath(path, items) {
  const key = normalizePath(path || "");
  const cache = getUpdatesCacheMap();
  cache[key] = { ts: Date.now(), since: getUpdatesSinceDate().toISOString(), items };
  try {
    sessionStorage.setItem(UPDATES_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function normalizeUpdateItems(path, items) {
  return (items || []).map((f) => ({
    name: f.name || "",
    displayName: f.displayName || f.name || "",
    fullPath: f.fullPath || (path ? `${path}/${f.name}` : f.name),
    created_at: f.created_at || null
  }));
}

function renderUpdatesBanner(items, { loading = false } = {}) {
  if (!updatesBanner || !updatesList) return;

  updatesBanner.style.display = "block";
  updatesBanner.classList.remove("is-expanded");
  updatesBanner.classList.remove("is-open");
  updatesList.innerHTML = "";

  if (loading) {
    if (lastUpdateDateEl) lastUpdateDateEl.textContent = "Nalaganje posodobitev...";
    if (updatesBadge) updatesBadge.style.display = "none";
    const li = document.createElement("li");
    li.innerHTML = `<span><strong>Pridobivam posodobitve...</strong></span><span></span>`;
    updatesList.appendChild(li);
    return;
  }

  const sorted = [...(items || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (sorted.length === 0) {
    if (lastUpdateDateEl) {
      lastUpdateDateEl.textContent = "";
      lastUpdateDateEl.style.display = "none";
    }
    const updatesDescEl = getElement("updatesDescription");
    if (updatesDescEl) updatesDescEl.style.display = "none";
    if (updatesBadge) updatesBadge.style.display = "none";
    const li = document.createElement("li");
    li.innerHTML = `<span><strong>Ni novih posodobitev.</strong></span><span></span>`;
    updatesList.appendChild(li);
    return;
  }

  if (lastUpdateDateEl) {
    lastUpdateDateEl.textContent = `Zadnja sprememba: ${formatDate(sorted[0].created_at)}`;
    lastUpdateDateEl.style.display = "";
  }
  const updatesDescEl = getElement("updatesDescription");
  if (updatesDescEl) updatesDescEl.style.display = "";
  if (updatesBadge) {
    updatesBadge.textContent = sorted.length;
    updatesBadge.style.display = sorted.length > 0 ? "inline-flex" : "none";
  }

  const fragment = document.createDocumentFragment();
  sorted.forEach((f) => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.innerHTML = `<strong>${escapeHtml(f.displayName || f.name || "")}</strong>`;
    if (f.fullPath) nameSpan.onclick = () => openFileFromBanner(f.fullPath);
    const dateSpan = document.createElement("span");
    dateSpan.textContent = formatDate(f.created_at);
    li.appendChild(nameSpan);
    li.appendChild(dateSpan);
    fragment.appendChild(li);
  });
  updatesList.appendChild(fragment);
}

function clearSharedSearchMoreButton() {
  if (!searchResultsWrapper) return;
  searchResultsWrapper
    .querySelectorAll(".search-results-show-more-wrap.shared-search-more")
    .forEach((el) => el.remove());
}

function getDynamicSearchInitialLimit({ hasMapResults, hasCatalogResults }) {
  const vh = window.innerHeight || 900;
  const onlyCatalog = hasCatalogResults && !hasMapResults;
  const headerReserve = onlyCatalog ? 300 : 360;
  const usableHeight = Math.max(300, vh - headerReserve);
  const estimatedRowHeight = 44;
  const rowsOnScreen = Math.max(6, Math.floor(usableHeight / estimatedRowHeight));

  let count = onlyCatalog ? rowsOnScreen * 2 : rowsOnScreen;
  count += onlyCatalog ? 8 : 4;

  return Math.max(10, Math.min(count, 40));
}

// --- POMOŽNE FUNKCIJE ---
function normalizePath(path) { if (!path) return ""; try { return decodeURIComponent(path).trim(); } catch (e) { return path.trim(); } }
function loadFavorites() { try { let raw = JSON.parse(localStorage.getItem('aluk_favorites') || '[]'); return [...new Set(raw.map(f => normalizePath(f)))].filter(f => f); } catch(e) { return []; } }
function saveFavorites(favs) { localStorage.setItem('aluk_favorites', JSON.stringify(favs)); }

function stripPathSlashes(path) {
  return String(path || "").replace(/^\/+|\/+$/g, "");
}

function joinFolderAndFilename(folderPath, filename) {
  const folder = String(folderPath || "");
  const file = String(filename || "");
  if (!folder) return file;
  return folder.endsWith("/") ? `${folder}${file}` : `${folder}/${file}`;
}

function buildStoragePathFromRow(row) {
  return stripPathSlashes(joinFolderAndFilename(row?.r2_path || "", row?.filename || ""));
}

function buildR2UrlFromStoragePath(storagePath) {
  const base = R2_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = String(storagePath || "").replace(/^\/+/, "");
  const finalUrl = `${base}/${normalizedPath}`;
  return encodeURI(finalUrl);
}

function buildR2UrlFromFileRecord(file) {
  const publicUrl = "https://pub-28724a107246493c93629c81b8105cff.r2.dev/" + (file?.r2_path || "") + (file?.filename || "");
  return encodeURI(publicUrl);
}

function getRowTimestamp(row) {
  return row?.updated_at || row?.modified_at || row?.created_at || null;
}

function toNumberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getRowSizeBytes(row) {
  return toNumberOrZero(
    row?.size_bytes ??
    row?.file_size_bytes ??
    row?.size ??
    row?.file_size ??
    row?.bytes
  );
}

async function fetchAllFilesFromTable(forceRefresh = false) {
  if (!forceRefresh && Array.isArray(filesTableCache)) return filesTableCache;
  if (!forceRefresh && filesTableCachePromise) return filesTableCachePromise;

  filesTableCachePromise = (async () => {
    const out = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .range(from, to);
      if (error) throw error;

      const batch = Array.isArray(data) ? data : [];
      out.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    filesTableCache = out;
    return out;
  })().finally(() => {
    filesTableCachePromise = null;
  });

  return filesTableCachePromise;
}

function buildVirtualItemsForPath(rows, path) {
  const normalizedPath = stripPathSlashes(normalizePath(path || ""));
  const prefix = normalizedPath ? `${normalizedPath}/` : "";
  const expectedFolderName = normalizedPath ? normalizedPath.split("/").pop() : "Katalogi";
  const folders = new Map();
  const files = [];

  for (const row of rows || []) {
    const filename = row?.filename;
    if (!filename) continue;
    const fullPath = buildStoragePathFromRow(row);
    if (prefix && !fullPath.startsWith(prefix)) continue;

    const remaining = prefix ? fullPath.slice(prefix.length) : fullPath;
    if (!remaining) continue;
    const slashIdx = remaining.indexOf("/");

    if (slashIdx !== -1) {
      const folderName = remaining.slice(0, slashIdx);
      if (!folderName || folders.has(folderName)) continue;
      const folderFullPath = normalizedPath ? `${normalizedPath}/${folderName}` : folderName;
      folders.set(folderName, {
        name: folderName,
        metadata: null,
        created_at: getRowTimestamp(row),
        fullPath: folderFullPath
      });
      continue;
    }

    if (row?.folder_name && row.folder_name !== expectedFolderName) continue;

    files.push({
      name: filename,
      filename,
      r2_path: row.r2_path || "",
      created_at: getRowTimestamp(row),
      fullPath,
      metadata: { size: getRowSizeBytes(row) }
    });
  }

  return [...folders.values(), ...files];
}

// Preveri, če pot obstaja v Supabase Storage
async function pathExists(path) {
  const key = normalizePath(path || "");
  const now = Date.now();
  const cached = pathExistsCache.get(key);
  if (cached && (now - cached.ts) < PATH_EXISTS_CACHE_TTL_MS) {
    return cached.value;
  }
  if (pathExistsInFlight.has(key)) {
    return pathExistsInFlight.get(key);
  }

  const request = (async () => {
  try {
    const normalized = stripPathSlashes(path);
    if (!normalized) return true; // Root vedno obstaja
    const rows = await fetchAllFilesFromTable();
    const prefix = `${normalized}/`;
    const exists = rows.some((row) => {
      const fullPath = buildStoragePathFromRow(row);
      return fullPath.startsWith(prefix);
    });
    pathExistsCache.set(key, { ts: Date.now(), value: exists });
    return exists;
  } catch (e) {
    console.warn(`Napaka pri preverjanju poti "${path}":`, e);
    pathExistsCache.set(key, { ts: Date.now(), value: false });
    return false;
  }
  })().finally(() => {
    pathExistsInFlight.delete(key);
  });

  pathExistsInFlight.set(key, request);
  return request;
}

// Očisti neobstoječe priljubljene
async function cleanInvalidFavorites() {
  favorites = loadFavorites();
  if (favorites.length === 0) return;
  
  const validFavorites = [];
  for (const path of favorites) {
    const exists = await pathExists(path);
    if (exists) {
      validFavorites.push(path);
    }
  }
  
  if (validFavorites.length !== favorites.length) {
    saveFavorites(validFavorites);
    favorites = validFavorites;
  }
}
function getCustomSortIndex(name) { 
  const i = customSortOrder.indexOf(name); 
  if (i !== -1) return i;
  const partial = customSortOrder.findIndex(o => name.includes(o));
  return partial === -1 ? 999 : partial;
}

function normalizeSortName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prioriteta razvrščanja znotraj podmap:
 * 1 Tehnični katalogi, 2 Vgradni detajli/prerezi, 3 Izjave o lastnostih,
 * 4 ostale mape, 5 PDF, 6 Excel, 7 ostale datoteke.
 */
function getSubfolderSortPriority(item) {
  const isFolder = !item.metadata;
  const name = normalizeSortName(item.name);

  if (isFolder) {
    if (name.includes("tehnicni katalog")) return 1;
    if (name.includes("vgradni detajli") || name.includes("prerezi")) return 2;
    if (name.includes("izjave o lastnostih") || name.includes("izjava o lastnostih")) return 3;
    return 4;
  }

  const ext = (item.name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return 5;
  if (ext === "xls" || ext === "xlsx" || ext === "xlsm" || ext === "xlsb") return 6;
  return 7;
}

function formatDate(iso) { if (!iso) return ""; return new Date(iso).toLocaleDateString('sl-SI'); }
function getBaseName(fn) { const i = fn.lastIndexOf('.'); return i === -1 ? fn : fn.substring(0, i); }

/** Sklanjanje besede "element" v slovenščini glede na število (1 element, 2 elementa, 3/4 elementi, 0/5+ elementov). */
function elementWord(n) {
  const num = Math.abs(Number(n));
  if (num % 100 >= 11 && num % 100 <= 14) return "elementov";
  switch (num % 10) {
    case 1: return "element";
    case 2: return "elementa";
    case 3:
    case 4: return "elementi";
    default: return "elementov";
  }
}

const nameTranslations = {
  "Catalogo Tecnico": "Tehnični katalog",
  "Maniglie": "Kljuke",
  "Manuale di lavorazioni e assemblaggio": "Delavniški katalog",
  "Tehnicni katalogi": "Tehnični katalogi",
  "Tehnicni": "Tehnični",
  "Brosure": "Brošure",
  "Brosura": "Brošura",
  "Montaza": "Montaža",
  "Splosno": "Splošno",
  "Dvizno": "Dvižno",
  "Pisarniski": "Pisarniški"
};

function formatDisplayName(name) {
  if (!name || typeof name !== "string") return name;
  let s = name.replace(/_compressed/gi, "").replace(/\s*compressed\s*/gi, " ").trim();
  s = s.replace(/_/g, " ");
  for (const [from, to] of Object.entries(nameTranslations)) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    s = s.replace(re, to);
  }
  /* Končnice (npr. .pdf) ostanejo vidne */
  return s;
}

function getIconForName(name) {
  const l = String(name || "").toLowerCase();
  for (const [k, v] of Object.entries(folderIcons)) {
    if (l.includes(k)) return v;
  }
  return "folder";
}

function getFileIconKeyForExt(ext) {
  const key = String(ext || "").toLowerCase();
  return fileIcons[key] || "file";
}
function isRelevantFile(fn) { if (fn.startsWith('.')) return false; return relevantExtensions.includes(fn.split('.').pop().toLowerCase()); }

// --- LOGIN / LOGOUT ---
async function checkUser() { 
  const { data: { session } } = await supabase.auth.getSession(); 
  if (session) showApp(session.user.email); 
  else showLogin(); 
}

function showLogin() { 
  authForm.style.display = "block"; 
  appCard.style.display = "none"; 
  document.getElementById("logout").style.display = "none"; 
}

async function showApp(email) {
  const alreadyVisible = appCard && appCard.style.display === "flex";
  window.scrollTo(0, 0);
  if (authForm) authForm.style.display = "none";
  if (appCard) {
    appCard.style.display = "flex";
    appCard.style.flexDirection = "column";
  }
  const logoutBtn = getElement("logout");
  if (logoutBtn) logoutBtn.style.display = "block";

  const userLine = getElement("userLine");
  if (userLine) {
    try {
      const s = localStorage.getItem('aluk_user_info');
      if (s) {
        const d = JSON.parse(s);
        if (d.name) {
          userLine.textContent = `👤 Dobrodošli, ${d.name}.`;
        } else {
          userLine.textContent = `👤 ${email}`;
        }
      } else {
        userLine.textContent = `👤 ${email}`;
      }
    } catch (e) {
      userLine.textContent = `👤 ${email}`;
    }
  }

  // Očisti neobstoječe priljubljene ob zagonu (asinhrono, da ne blokira)
  cleanInvalidFavorites().then(() => {
    setViewMode(viewMode);
    renderGlobalFavorites();
    updateSidebarFavorites();
  });

  // Pri že prikazanem portalu ne resetiraj poti in ne kličem loadContent (prepreči skok na Domov ob preklapljanju zaviho)
  if (alreadyVisible) return;
  const path = getPathFromUrl();
  currentPath = path;
  loadContent(path);
}

document.getElementById("logout").addEventListener("click", async () => { 
  await supabase.auth.signOut(); 
  showLogin(); // Namesto reload, samo pokaži login
});

// --- NAVIGACIJA ---
window.navigateTo = function(path) {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
  clearSharedSearchMoreButton();
  currentRenderId++; // invalidiraj pending search renderje
  currentPath = path; 
  searchInput.value = ""; 
  isSearchActive = false; // Deaktiviraj iskanje ob navigaciji
  sessionStorage.removeItem('aluk_search_query');
  sessionStorage.removeItem('aluk_search_results');
  if (mainContent) mainContent.style.display = "";
  if (catalogResultsSection) {
    catalogResultsSection.style.display = "none";
    catalogResultsSection.innerHTML = "";
  }
  updateBreadcrumbs(path);
  const hasCachedTarget = !!folderCache[path];
  if (!hasCachedTarget) {
    if (mainContent) mainContent.innerHTML = "";
    if (skeletonLoader) skeletonLoader.style.display = "grid";
    if (statusEl) {
      statusEl.textContent = "Nalagam mapo...";
      statusEl.style.color = "var(--text-secondary)";
      statusEl.style.fontWeight = "500";
    }
  }
  window.history.pushState({ path }, "", "#" + pathToHash(path)); 
  loadContent(path); 
}
/** Kodira pot za lep URL: presledki → +, ostalo po segmentih (ohrani /). */
function pathToHash(path) {
  if (!path || typeof path !== "string") return "";
  return path.split("/").map((seg) => encodeURIComponent(seg).replace(/%20/g, "+")).join("/");
}
/** Dekodira hash v pot (podpora + in %20 za presledke). */
function hashToPath(hashPart) {
  if (!hashPart || typeof hashPart !== "string") return "";
  return hashPart
    .split("/")
    .map((seg) => decodeURIComponent(seg.replace(/\+/g, " ")))
    .join("/")
    .trim();
}
/** Navigacija vedno iz URL hasha – npr. #Pisarniski+sistemi/Hladni+sistem+C55K-NI. */
function getPathFromUrl() {
  const h = window.location.hash;
  if (!h || h.length <= 1 || h.startsWith("#view=")) return "";
  return hashToPath(h.slice(1));
}
window.addEventListener('popstate', () => {
  pdfModal.style.display = 'none';
  pdfFrame.src = "";
  const p = getPathFromUrl();
  currentPath = p;
  const hasActiveSearch = !!(isSearchActive && searchInput && searchInput.value.trim());
  if (hasActiveSearch) return;
  loadContent(p);
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pdfModal && pdfModal.style.display === 'flex') closePdfViewer(); });

// --- MOBILE SIDEBAR DRAWER ---
function isSidebarOpen() {
  return !!(sidebarEl && sidebarEl.classList.contains("is-open"));
}

function openSidebar() {
  if (!sidebarEl) return;
  sidebarEl.classList.add("is-open");
  if (sidebarOverlay) sidebarOverlay.classList.add("is-active");
  document.body.classList.add("sidebar-open");
  if (sidebarOverlay) sidebarOverlay.setAttribute("aria-hidden", "false");
}

function closeSidebar() {
  if (!sidebarEl) return;
  sidebarEl.classList.remove("is-open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("is-active");
  document.body.classList.remove("sidebar-open");
  if (sidebarOverlay) sidebarOverlay.setAttribute("aria-hidden", "true");
}

function toggleSidebar() {
  if (isSidebarOpen()) closeSidebar();
  else openSidebar();
}

if (menuBtn) {
  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleSidebar();
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", () => closeSidebar());
}

if (sidebarEl) {
  // Ko na mobile kliknes na navigacijo ali favorite, zapri drawer (ne vpliva na desktop).
  sidebarEl.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".sidebar-link") || t.closest(".sidebar-fav-item") || t.closest(".fav-remove")) {
      closeSidebar();
    }
  });
}

// Esc naj zapre sidebar, ce je odprt (in PDF viewer ima prednost zgoraj).
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (isSidebarOpen()) closeSidebar();
});

// --- REKURZIVNO ISKANJE (Banner) – šteje vse NOVE datoteke v trenutni mapi in vseh podmapah ---
const MAX_DEPTH_NEW_FILES = 25; // dovolj globoko za vse podmape, prepreči neskončno rekurzijo
async function getNewFilesRecursive(path, depth = 0) {
   if (depth > MAX_DEPTH_NEW_FILES) return [];
   const normalizedPath = normalizePath(path || "");
   const sinceIso = getUpdatesSinceDate().toISOString();
   const cacheKey = `${sinceIso}|${normalizedPath}|${depth}`;
   const now = Date.now();
   const cached = newFilesCache.get(cacheKey);
   if (cached && (now - cached.ts) < NEW_FILES_CACHE_TTL_MS) {
     return cached.items;
   }
   if (newFilesInFlight.has(cacheKey)) {
     return newFilesInFlight.get(cacheKey);
   }

   const request = (async () => {
     const rows = await fetchAllFilesFromTable();
     const prefix = normalizedPath ? `${stripPathSlashes(normalizedPath)}/` : "";
     const all = rows
       .map((row) => {
         const fullPath = buildStoragePathFromRow(row);
         return {
           name: row.filename || "",
           displayName: row.filename || "",
           fullPath,
           created_at: getRowTimestamp(row)
         };
       })
       .filter((f) => f.name && isRelevantFile(f.name))
       .filter((f) => !prefix || f.fullPath.startsWith(prefix))
       .filter((f) => isAfterUpdatesSince(f.created_at));
     return all;
   })()
     .then((items) => {
       newFilesCache.set(cacheKey, { ts: Date.now(), items });
       return items;
     })
     .catch((e) => {
       console.warn("Napaka pri rekurzivnem branju posodobitev:", normalizedPath, e);
       return [];
     })
     .finally(() => {
       newFilesInFlight.delete(cacheKey);
     });

   newFilesInFlight.set(cacheKey, request);
   return request;
}

function buildFolderSignature(data) {
  if (!Array.isArray(data)) return "[]";
  const entries = data
    .filter((i) => i && i.name !== ".emptyFolderPlaceholder")
    .map((i) => {
      const isFile = !!i.metadata;
      const size = isFile && i.metadata && typeof i.metadata.size === "number" ? i.metadata.size : 0;
      const createdAt = i.created_at || "";
      return `${isFile ? "f" : "d"}|${i.name}|${size}|${createdAt}`;
    })
    .sort();
  return JSON.stringify(entries);
}

// --- NALAGANJE VSEBINE ---
async function loadContent(path) {
  statusEl.textContent = ""; updateBreadcrumbs(path); currentRenderId++; const thisId = currentRenderId;
  if (mainContent) mainContent.style.display = "";
  
  // Prikaži sekcijo "TEHNIČNA DOKUMENTACIJA" ko naložiš normalno vsebino
  const contentTitleEl = getElement("contentTitle");
  const contentTitleDesc = getElement("contentTitleDesc");
  if (contentTitleEl) contentTitleEl.style.display = "";
  if (contentTitleDesc) contentTitleDesc.style.display = "";
  
  // Prikaži posodobitve (vedno, razen če je aktivno iskanje)
  if (!isSearchActive) {
    updateBannerAsync(path);
  }

  const cachedFolderData = folderCache[path];
  if (cachedFolderData) {
    await processDataAndRender(cachedFolderData, thisId);
    skeletonLoader.style.display = "none";
  } else {
    const hasVisibleContent = !!(mainContent && mainContent.childElementCount > 0);
    if (!hasVisibleContent) {
      if (mainContent) mainContent.innerHTML = "";
      skeletonLoader.style.display = "grid";
    } else {
      skeletonLoader.style.display = "none";
      statusEl.textContent = "Nalagam...";
    }
  }

  let data = null;
  let error = null;
  try {
    const rows = await fetchAllFilesFromTable();
    data = buildVirtualItemsForPath(rows, path);
  } catch (e) {
    error = e;
  }
  skeletonLoader.style.display = "none";
  if (error) { statusEl.textContent = "Napaka pri branju."; return; }
  if (thisId !== currentRenderId) return;

  const cachedSig = cachedFolderData ? buildFolderSignature(cachedFolderData) : null;
  const freshSig = buildFolderSignature(data);
  folderCache[path] = data;

  if (!cachedFolderData || cachedSig !== freshSig) {
    await processDataAndRender(data, thisId);
  }
}

async function updateBannerAsync(path) {
    const requestId = ++updatesRequestId;
    const normalizedPath = normalizePath(path || "");
    const cachedItems = getUpdatesCacheForPath(normalizedPath);
    const updatesSince = getUpdatesSinceDate();

    if (cachedItems) {
      renderUpdatesBanner(cachedItems);
    } else {
      renderUpdatesBanner([], { loading: true });
    }

    try {
      const freshItems = normalizeUpdateItems(
        normalizedPath,
        await getNewFilesRecursive(normalizedPath, 0)
      ).filter((f) => {
        const dt = new Date(f.created_at || 0);
        return !Number.isNaN(dt.getTime()) && dt >= updatesSince;
      });
      setUpdatesCacheForPath(normalizedPath, freshItems);

      if (requestId !== updatesRequestId) return;

      if (!cachedItems) {
        renderUpdatesBanner(freshItems);
      } else {
        const cachedSig = JSON.stringify(cachedItems);
        const freshSig = JSON.stringify(freshItems);
        if (cachedSig !== freshSig) {
          renderUpdatesBanner(freshItems);
        }
      }

      if (normalizedPath === normalizePath(currentPath || "") && !isSearchActive && currentItems.length > 0) {
        renderItems(currentItems, currentRenderId);
      }
    } catch (e) {
      if (requestId !== updatesRequestId) return;
      if (!cachedItems) {
        renderUpdatesBanner([]);
      }
      if (normalizedPath === normalizePath(currentPath || "") && !isSearchActive && currentItems.length > 0) {
        renderItems(currentItems, currentRenderId);
      }
    }
}
window.openFileFromBanner = function(path) { openPdfViewer(path.split('/').pop(), path); }

async function processDataAndRender(data, rId) {
  const raw = data.filter(i => i.name !== ".emptyFolderPlaceholder");
  const imgs = raw.filter(f => f.metadata && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
  imageMap = {}; imgs.forEach(i => imageMap[getBaseName(i.name).toLowerCase()] = i);
  currentItems = raw.filter(f => { if (!f.metadata) return true; return !/\.(jpg|jpeg|png|webp)$/i.test(f.name); });
  if (rId === currentRenderId) await renderItems(currentItems, rId);
}

function updateBreadcrumbs(path) {
  const p = path ? path.split('/').filter(Boolean) : [];
  let h = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span>`, b = "";
  p.forEach((pt, i) => {
    b += (i > 0 ? "/" : "") + pt;
    const label = formatDisplayName(decodeURIComponent(pt));
    const safePath = escapeJsSingleQuotedString(b);
    h += ` <span style="color:var(--text-tertiary)">/</span> <span class="breadcrumb-item" onclick="navigateTo('${safePath}')">${escapeHtml(label)}</span>`;
  });
  breadcrumbsEl.innerHTML = h;
  if (backBtn) backBtn.style.display = p.length > 0 ? "inline-flex" : "none";
}

// --- RENDER SEZNAMA ---
// Enaka HTML struktura in razredi za korensko stran in vse podmape (en sam izris).
async function renderItems(items, rId) {
  if (rId !== currentRenderId) return;
  
  // Preveri, če so prikazani rezultati iskanja - ne pobriši jih
  const hasSearchResults = mainContent.querySelector('.search-results-grid');
  if (hasSearchResults && isSearchActive) {
    // Ne osvežuj, če so prikazani rezultati iskanja
    return;
  }
  
  if (items.length === 0) { 
    mainContent.innerHTML = ""; 
    statusEl.textContent = "Mapa je prazna."; 
    return; 
  }
  statusEl.textContent = `${items.length} ${elementWord(items.length)}`;
  const cont = document.createElement("div");
  cont.className = viewMode === "list" ? "file-container list-view" : "file-container grid-view";
  favorites = loadFavorites();
  const favs = [], norms = [];
  items.forEach(i => { const p = normalizePath(currentPath ? `${currentPath}/${i.name}` : i.name); (!i.metadata && favorites.includes(p)) ? favs.push(i) : norms.push(i); });
  const sorted = [...favs, ...norms].sort((a, b) => {
     const inSubfolder = !!(currentPath && currentPath.trim());
     if (inSubfolder) {
       const pa = getSubfolderSortPriority(a);
       const pb = getSubfolderSortPriority(b);
       if (pa !== pb) return pa - pb;
       const an = normalizeSortName(a.name);
       const bn = normalizeSortName(b.name);
       return an.localeCompare(bn, "sl", { sensitivity: "base", numeric: true });
     }

     const fa = !a.metadata, fb = !b.metadata;
     if (fa && !fb) return -1; if (!fa && fb) return 1;
     if (fa && fb) {
       const ia = getCustomSortIndex(a.name), ib = getCustomSortIndex(b.name);
       if (ia !== ib) return ia - ib;
     }
     return a.name.localeCompare(b.name, "sl", { sensitivity: "base", numeric: true });
  });
  for (const item of sorted) { if (rId !== currentRenderId) return; await createItemElement(item, cont); }
  if (rId === currentRenderId) {
    mainContent.innerHTML = "";
    mainContent.appendChild(cont);
  }
}

// Enaka struktura in razredi za vsako kartico (koren in vse podmape) – brez dodatnih razredov glede na globino.
async function createItemElement(item, cont) {
    const isFolder = !item.metadata; 
    const div = document.createElement("div");
    div.className = isFolder ? "item item-card folder-item" : "item item-card";
    const full = currentPath ? `${currentPath}/${item.name}` : item.name; 
    const clean = normalizePath(full);
    let badges = "";
    
    // Značka NOVO: natanko en element na .item (brez podvajanja)
    if (isFolder) {
        const hasUpdatesInFolder = folderHasUpdatesByCurrentPathCache(full);
        badges = hasUpdatesInFolder
          ? `<span class="new-badge" style="display:inline-block">NOVO</span>`
          : `<span class="new-badge" style="display:none">NOVO</span>`;
    } else if (isRelevantFile(item.name) && isAfterUpdatesSince(item.created_at)) {
        badges = `<span class="new-badge" style="display:inline-block">NOVO</span>`;
    }
    const safeItemName = escapeJsSingleQuotedString(item.name);
    const favBtnHtml = isFolder ? `<button class="fav-btn ${favorites.includes(clean)?'active':''}" onclick="toggleFavorite(event, '${safeItemName}')">★</button>` : '';
    
    const base = getBaseName(item.name).toLowerCase();
    const ext = item.name.split('.').pop().toLowerCase();
    const isLinkFile = !isFolder && isUrlLinkFile(item.name);
    let icon = "";
    if (isFolder) {
      icon = `<div class="big-icon">${iconSvg(getIconForName(base))}</div>`;
    } else if (isLinkFile) {
      icon = `<div class="big-icon">${iconSvg("link")}</div>`;
    } else if (item.name.toLowerCase().endsWith('dwg') || item.name.toLowerCase().endsWith('dxf')) {
      icon = `<div class="big-icon">${iconSvg("ruler")}</div>`;
    } else {
      icon = `<div class="big-icon">${iconSvg(getFileIconKeyForExt(ext))}</div>`;
    }
    
    // Cache za slike – če PDF ima predogled (npr. jpg v mapi), ga prikaži v grid view; v list view vedno ikona PDF
    const isPdf = !isFolder && item.name.toLowerCase().endsWith('pdf');
    if (imageMap[base] && !(viewMode === 'list' && isPdf)) {
      const imagePath = imageMap[base].fullPath || (currentPath ? `${currentPath}/${imageMap[base].name}` : imageMap[base].name);
      const cacheKey = imagePath;
      
      if (imageUrlCache[cacheKey]) {
        // Uporabi cache URL (če ni pretekel - 3600s = 1h)
        icon = `<img src="${imageUrlCache[cacheKey]}" loading="lazy" />`;
      } else {
        const imageUrl = buildR2UrlFromStoragePath(imagePath);
        imageUrlCache[cacheKey] = imageUrl;
        icon = `<img src="${imageUrl}" loading="lazy" />`;
      }
    }

    // Za datoteke: prikaži datum takoj pod velikostjo
    const fileSizeBytes = item.metadata && typeof item.metadata.size === "number" ? item.metadata.size : 0;
    const fileSize = isFolder ? 'Mapa' : (fileSizeBytes/1024/1024).toFixed(2)+' MB';
    const dateInfo = !isFolder && item.created_at ? `<span class="item-date">Datum posodobitve: ${formatDate(item.created_at)}</span>` : '';
    const isDownloadType = !isFolder && !isLinkFile && ['dwg', 'dxf', 'xlsx', 'xls'].includes(ext);
    const previewExtraClass = isDownloadType ? ' file-preview-download' : '';
    const downloadOverlay = isDownloadType ? '<span class="download-overlay-icon" aria-hidden="true">⬇</span>' : '';
    const previewHtml = `<div class="item-preview ${isFolder?'folder-bg':'file-bg'}${previewExtraClass}">${icon}${downloadOverlay}</div>`;
    const infoHtml = `<div class="item-info"><strong>${formatDisplayName(item.name)}</strong><small>${fileSize}</small>${dateInfo}</div>`;
    if (viewMode === 'list') {
      div.innerHTML = badges + previewHtml + infoHtml + favBtnHtml;
    } else {
      div.innerHTML = favBtnHtml + badges + previewHtml + infoHtml;
    }
    if (isPdf) div.setAttribute('title', 'Odpri predogled');
    else if (isDownloadType) {
      div.setAttribute('title', 'Prenesi datoteko (Direct Download)');
      div.classList.add('file-download-type');
    }
    const fileUrl = !isFolder ? buildR2UrlFromFileRecord(item) : "";
    if (fileUrl) div.dataset.fileUrl = fileUrl;
    div.onclick = () => {
      if (isFolder) navigateTo(full);
      else if (isLinkFile) handleUrlFile(full);
      else {
        if (isDownloadType) showDownloadNotification();
        openPdfViewer(item.name, full, null, fileUrl);
      }
    };
    cont.appendChild(div);
}

// --- GLOBALNI PRILJUBLJENI ---
async function renderGlobalFavorites() {
  const favEl = document.getElementById("globalFavorites");
  if (!favEl) return; // Exit if not found
  const container = getElement("globalFavContainer");
  if (!container) {
    console.warn("globalFavContainer ni najden, preskakujem renderGlobalFavorites");
    return;
  }
  
  favorites = loadFavorites(); 
  if (favorites.length === 0) { 
    favEl.style.display = "none"; 
    return; 
  }
  favEl.style.display = "block"; 
  
  container.innerHTML = ""; 
  container.className = `file-container grid-view`;
  
  for (const p of favorites) {
      const name = p.split('/').pop(); 
      const div = document.createElement("div"); 
      div.className = "item";
      const news = await getNewFilesRecursive(p, 0);
      
      let badges = "";
      if (news.length > 0) {
          badges += '<span class="new-badge" style="display:inline-block">NOVO</span>';
      }
      
      div.innerHTML = `<div class="item-preview folder-bg" style="height:100px; position:relative;"><div class="big-icon" style="width:40px; height:40px;">${iconSvg(getIconForName(name))}</div>${badges}</div>
                       <div class="item-info" style="padding:10px;"><strong style="font-size:13px;">${escapeHtml(formatDisplayName(name))}</strong></div>
                       <button class="fav-btn active" style="top:5px; left:5px;">★</button>`;
      div.onclick = () => navigateTo(p);
      const favBtn = div.querySelector('.fav-btn');
      if (favBtn) {
        favBtn.onclick = (e) => { 
          e.stopPropagation(); 
          favorites = favorites.filter(f => f !== p); 
          saveFavorites(favorites); 
          renderGlobalFavorites(); 
          updateSidebarFavorites(); // Posodobi sidebar
          renderItems(currentItems, currentRenderId); 
        };
      }
      container.appendChild(div);
  }
}
window.toggleFavorite = function(e, name) { 
  e.stopPropagation(); 
  const p = normalizePath(currentPath ? `${currentPath}/${name}` : name); 
  favorites = loadFavorites(); 
  if (favorites.includes(p)) {
    favorites = favorites.filter(f => f !== p);
  } else {
    favorites.push(p);
  }
  saveFavorites(favorites); 
  renderGlobalFavorites(); 
  updateSidebarFavorites(); // Posodobi sidebar
  // Ne osvežuj glavne vsebine, če je aktivno iskanje
  if (!isSearchActive && currentItems.length > 0) {
    renderItems(currentItems, currentRenderId);
  } 
}

// --- SIDEBAR PRILJUBLJENE ---
function updateSidebarFavorites() {
  if (!sidebarFavList) return;
  
  // Shrani fokus iskalnega polja, če je aktiven
  const searchHasFocus = document.activeElement === searchInput;
  const searchValue = searchInput ? searchInput.value : '';
  
  favorites = loadFavorites();
  
  if (favorites.length === 0) {
    sidebarFavList.innerHTML = '<div class="sidebar-empty">Ni priljubljenih map. Kliknite ★ na mapi.</div>';
    return;
  }
  
  sidebarFavList.innerHTML = '';
  
  favorites.forEach(path => {
    const name = path.split('/').pop();
    const iconKey = getIconForName(name);
    
    const item = document.createElement('div');
    item.className = 'sidebar-fav-item';
    item.innerHTML = `
      <span class="fav-icon">★</span>
      <span class="fav-name" title="${escapeHtml(path)}"><span class="ui-icon sidebar-fav-folder-icon" aria-hidden="true">${iconSvg(iconKey)}</span>${escapeHtml(formatDisplayName(name))}</span>
      <span class="fav-remove" title="Odstrani iz priljubljenih">✕</span>
    `;
    
    // Klik na element -> navigacija z preverjanjem obstoja
    item.onclick = async (e) => {
      if (e.target.classList.contains('fav-remove')) return;
      
      // Preveri, če pot obstaja
      const exists = await pathExists(path);
      if (!exists) {
        // Odstrani iz priljubljenih in prikaži sporočilo
        favorites = favorites.filter(f => f !== path);
        saveFavorites(favorites);
        updateSidebarFavorites();
        renderGlobalFavorites();
        
        // Prikaži sporočilo uporabniku
        if (statusEl) {
          const originalText = statusEl.textContent;
          statusEl.textContent = `⚠️ Mapa "${formatDisplayName(name)}" je bila preimenovana ali premaknjena. Odstranjena iz priljubljenih.`;
          statusEl.style.color = 'var(--error)';
          setTimeout(() => {
            statusEl.textContent = originalText;
            statusEl.style.color = '';
          }, 5000);
        }
        return;
      }
      
      window.navigateTo(path);
    };
    
    // Klik na X -> odstrani iz priljubljenih
    item.querySelector('.fav-remove').onclick = (e) => {
      e.stopPropagation();
      favorites = favorites.filter(f => f !== path);
      saveFavorites(favorites);
      updateSidebarFavorites();
      renderGlobalFavorites();
      if (currentItems.length > 0 && !isSearchActive) renderItems(currentItems, currentRenderId);
    };
    
    sidebarFavList.appendChild(item);
  });
  
  // Obnovi fokus iskalnega polja, če je bil aktiven
  if (searchHasFocus && searchInput) {
    setTimeout(() => {
      searchInput.focus();
      if (searchValue) {
        searchInput.setSelectionRange(searchValue.length, searchValue.length);
      }
    }, 0);
  }
}

// --- ISKANJE (Deep PDF Search + Tehnična dokumentacija) ---
/** Agresivna normalizacija: lowercase, odstrani .pdf, samo črke in številke (brez presledkov, podčrtajev, %20). */
function cleanName(name) {
  const s = (name == null ? "" : String(name))
    .toLowerCase()
    .replace(/_compressed/gi, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]/g, "");
  return s;
}

/**
 * Vrne polno pot do datoteke po imenu. Primerja z window.globalFileList po cleanName (agresivna normalizacija).
 * @param {string} filename - ime iz DB (npr. "Catalogo Tecnico__C67K.pdf")
 * @returns {string|null} fullPath ali null
 */
function findPathForFilename(filename) {
  const dbClean = cleanName(filename);
  if (!dbClean) return null;
  const list = window.globalFileList;
  if (!list || !list.length) return null;
  for (const f of list) {
    if (!f.metadata) continue; // samo datoteke (mapa nima .metadata)
    const storageClean = cleanName(f.name);
    if (dbClean === storageClean) return f.fullPath;
  }
  return null;
}

/** Naloži vse datoteke iz Storage v window.globalFileList (za iskanje po catalog_index). */
async function preloadFiles() {
  try {
    const files = await searchAllFilesRecursive("", "", 0, 8, 20000);
    window.globalFileList = Array.isArray(files) ? files : [];
  } catch (e) {
    window.globalFileList = [];
    console.warn("Preload failed:", e);
  }
}

async function ensureGlobalFileListLoaded() {
  if (Array.isArray(window.globalFileList) && window.globalFileList.length > 0) {
    return window.globalFileList;
  }
  if (!preloadFilesPromise) {
    preloadFilesPromise = preloadFiles().finally(() => {
      preloadFilesPromise = null;
    });
  }
  await preloadFilesPromise;
  return Array.isArray(window.globalFileList) ? window.globalFileList : [];
}

function filterLocalSearchResults(allItems, searchTerm, maxResults = 20000) {
  if (!Array.isArray(allItems) || !allItems.length || !searchTerm) return [];
  const lowerSearchTerm = String(searchTerm).toLowerCase();
  const out = [];

  for (const item of allItems) {
    if (out.length >= maxResults) break;
    const isFolder = !item.metadata;
    const itemName = (item.name || "").toLowerCase();
    if (!itemName.includes(lowerSearchTerm)) continue;
    if (!isFolder) {
      const ext = (item.name || "").split(".").pop().toLowerCase();
      if (!["pdf", "dwg", "xlsx"].includes(ext)) continue;
    }
    out.push(item);
  }

  return out;
}

/**
 * Iskanje v Supabase catalog_index. Združi po pdf_filename, vrne skupno število zadetkov.
 * @param {string} query - iskalni niz
 * @returns {Promise<{ groupedByPdf: Object, catalogTotalCount: number }>}
 */
async function searchSupabaseCatalog(query) {
  const out = { groupedByPdf: {}, catalogTotalCount: 0 };
  if (!query || String(query).trim().length < 2) return out;
  try {
    const trimmed = String(query).trim();
    const pageSize = 1000;
    let from = 0;
    let indexRows = [];

    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("catalog_index")
        .select("pdf_filename, page_number, page_title")
        .ilike("code", "%" + trimmed + "%")
        .range(from, to);
      if (error) return out;
      const batch = Array.isArray(data) ? data : [];
      if (batch.length === 0) break;
      indexRows = indexRows.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (indexRows.length === 0) return out;
    const groupedByPdf = {};
    for (const row of indexRows) {
      const fn = row.pdf_filename;
      const page = row.page_number != null ? Number(row.page_number) : 1;
      const title = (row.page_title != null && String(row.page_title).trim()) ? String(row.page_title).trim() : "";
      if (!fn) continue;
      if (!groupedByPdf[fn]) groupedByPdf[fn] = [];
      const exists = groupedByPdf[fn].some((e) => e.page === page && e.title === title);
      if (!exists) groupedByPdf[fn].push({ page, title });
    }
    for (const fn of Object.keys(groupedByPdf)) groupedByPdf[fn].sort((a, b) => a.page - b.page);
    const catalogTotalCount = Object.values(groupedByPdf).reduce((sum, items) => sum + items.length, 0);
    return { groupedByPdf, catalogTotalCount };
  } catch (e) {
    console.warn("searchSupabaseCatalog error:", e);
    return out;
  }
}

// Debounce za iskanje (optimizacija)
let searchTimeout = null;

// Funkcija za kopiranje v odložišče (GitHub-style: ikona → kljukica, zelena, 2s nazaj)
window.copyToClipboard = function(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<span class="copy-check-icon" aria-hidden="true">✓</span>';
        button.classList.add("copied-success");
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove("copied-success");
        }, 2000);
    }).catch(err => {
        console.error("Napaka pri kopiranju:", err);
    });
};

if (searchInput) {
  // Križec za brisanje iskanja
  const clearSearchBtn = getElement("clearSearch");
  if (clearSearchBtn) {
    searchInput.addEventListener("input", (e) => {
      clearSearchBtn.style.display = e.target.value.trim() ? "flex" : "none";
    });
    
    clearSearchBtn.addEventListener("click", () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }
      clearSharedSearchMoreButton();
      currentRenderId++; // invalidiraj vse pending search rendeje
      searchInput.value = "";
      clearSearchBtn.style.display = "none";
      isSearchActive = false; // Deaktiviraj iskanje
      sessionStorage.removeItem('aluk_search_query');
      sessionStorage.removeItem('aluk_search_results');
      if (mainContent) mainContent.style.display = "";
      if (catalogResultsSection) {
        catalogResultsSection.style.display = "none";
        catalogResultsSection.innerHTML = "";
      }
      
      // Prikaži posodobitve nazaj
      if (updatesBanner) {
        updatesBanner.style.display = "";
      }
      
      loadContent(currentPath);
    });
  }
  
  // Enter key handler za ponovno iskanje
  searchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (!val) return;
      
      // Preveri, če so rezultati izgubljeni
      const savedQuery = sessionStorage.getItem('aluk_search_query');
      if (savedQuery === val && mainContent && mainContent.innerHTML.trim() === "") {
        // Ponovno izvedi iskanje
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  
  searchInput.addEventListener("input", async (e) => {
    // Prikaži/skrij križec
    if (clearSearchBtn) {
      clearSearchBtn.style.display = e.target.value.trim() ? "flex" : "none";
    }
    
    // Debounce - počakaj 300ms preden iščeš
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const val = e.target.value.trim();
    
    if (!val) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }
      clearSharedSearchMoreButton();
      currentRenderId++; // invalidiraj search, ki je še v teku
      sessionStorage.removeItem('aluk_search_query');
      sessionStorage.removeItem('aluk_search_results');
      isSearchActive = false;
      if (mainContent) mainContent.style.display = "";
      if (catalogResultsSection) {
        catalogResultsSection.style.display = "none";
        catalogResultsSection.innerHTML = "";
      }
      const contentTitleEl = getElement("contentTitle");
      const contentTitleDesc = getElement("contentTitleDesc");
      if (contentTitleEl) contentTitleEl.style.display = "";
      if (contentTitleDesc) contentTitleDesc.style.display = "";
      if (updatesBanner) updatesBanner.style.display = "";
      if (searchSpinner) searchSpinner.style.display = "none";
      loadContent(currentPath);
      return;
    }
    
    isSearchActive = true; // Aktiviraj iskanje
    
    // Skrij posodobitve ob iskanju
    if (updatesBanner) {
      updatesBanner.style.display = "none";
    }
    
    searchTimeout = setTimeout(async () => {
        const liveVal = searchInput ? searchInput.value.trim() : "";
        if (!isSearchActive || !liveVal || liveVal !== val) {
          return;
        }

        currentRenderId++;
        const thisRenderId = currentRenderId;

        const contentTitleEl = getElement("contentTitle");
        const contentTitleDesc = getElement("contentTitleDesc");
        if (contentTitleEl) contentTitleEl.style.display = "none";
        if (contentTitleDesc) contentTitleDesc.style.display = "none";

        if (searchSpinner) searchSpinner.style.display = "inline-block";
        if (statusEl) {
            statusEl.innerHTML = '<span class="loading-indicator">Iščem<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>';
            statusEl.style.color = "var(--loading-color)";
            statusEl.style.fontWeight = "500";
        }

        const fileListPromise = ensureGlobalFileListLoaded();
        const catalogPromise = liveVal.length >= 3 ? searchSupabaseCatalog(liveVal) : Promise.resolve({ groupedByPdf: {}, catalogTotalCount: 0 });
        const [allFiles, catalogResult] = await Promise.all([
            fileListPromise,
            catalogPromise
        ]);
        if (allFiles && allFiles.length > 0) window.globalFileList = allFiles;
        const allMatches = filterLocalSearchResults(allFiles, liveVal, 20000);

        const stillLiveVal = searchInput ? searchInput.value.trim() : "";
        if (!isSearchActive || !stillLiveVal || stillLiveVal !== liveVal) {
          if (searchSpinner) searchSpinner.style.display = "none";
          return;
        }

        if (thisRenderId !== currentRenderId) {
          if (searchSpinner) searchSpinner.style.display = "none";
          return;
        }
        clearSharedSearchMoreButton();

        const fileCount = allMatches.length;
        const { groupedByPdf, catalogTotalCount } = catalogResult;

        if (searchSpinner) searchSpinner.style.display = "none";

        const hasCatalogResults = liveVal.length >= 3 && catalogTotalCount > 0;
        const hasMapResults = fileCount > 0;
        const initialLimit = getDynamicSearchInitialLimit({ hasMapResults, hasCatalogResults });
        const catalogNeedsMore = hasCatalogResults && catalogTotalCount > initialLimit;
        const mapsNeedsMore = hasMapResults && fileCount > initialLimit;
        let isExpanded = false;

        if (mainContent) mainContent.style.display = "";

        let catalogGrid = null;
        const catalogEntries = Object.entries(groupedByPdf);
        const renderCatalogResults = (expanded) => {
          if (!catalogGrid) return;
          catalogGrid.innerHTML = "";
          const maxItems = expanded ? Number.MAX_SAFE_INTEGER : initialLimit;
          let shown = 0;
          for (const [filename, pageEntries] of catalogEntries) {
            const visibleEntries = [];
            for (const entry of pageEntries) {
              if (shown >= maxItems) break;
              visibleEntries.push(entry);
              shown++;
            }
            if (!visibleEntries.length) continue;

            const fullPath = findPathForFilename(filename);
            const card = document.createElement("div");
            card.className = "catalog-card";
            const header = document.createElement("div");
            header.className = "catalog-card-header";
            header.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span>${formatDisplayName(filename)}</span>
            `;
            card.appendChild(header);
            const list = document.createElement("div");
            list.className = "match-list";
            visibleEntries.forEach(({ page, title }) => {
              const link = document.createElement("a");
              link.className = "match-item";
              link.href = `${fullPath || filename}#page=${page}`;
              link.target = "_blank";
              if (fullPath && typeof window.openPdfViewer === "function") {
                link.addEventListener("click", (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.openPdfViewer(filename, fullPath, page);
                });
              }
              const titleText = title ? title : `Stran ${page}`;
              link.innerHTML = `
                <span class="page-badge">Str. ${page}</span>
                <span class="match-title">${titleText}</span>
              `;
              list.appendChild(link);
            });
            card.appendChild(list);
            catalogGrid.appendChild(card);
            if (shown >= maxItems) break;
          }
        };

        if (catalogResultsSection) {
          if (!hasCatalogResults) {
            catalogResultsSection.style.display = "none";
          } else {
            catalogResultsSection.style.display = "block";
            if (!hasMapResults && mainContent) {
              mainContent.style.display = "none";
            }
            catalogResultsSection.innerHTML = "";
            const catalogHeader = document.createElement("div");
            catalogHeader.className = "search-section-header catalog-section-header";
            const h3 = document.createElement("h3");
            h3.className = "catalog-results-title";
            h3.style.color = "var(--result-doc-heading)";
            h3.appendChild(Object.assign(document.createElement("span"), { className: "ui-icon", innerHTML: iconSvg("fileText") }));
            h3.appendChild(document.createTextNode(" Vsebina katalogov (" + catalogTotalCount + ")"));
            const p = document.createElement("p");
            p.textContent = "Strani in naslovi, ki se ujemajo z iskanjem.";
            p.style.fontSize = "13px";
            p.style.color = "var(--text-primary)";
            catalogHeader.appendChild(h3);
            catalogHeader.appendChild(p);
            catalogResultsSection.appendChild(catalogHeader);
            catalogGrid = document.createElement("div");
            catalogGrid.className = "catalog-grid";
            catalogResultsSection.appendChild(catalogGrid);
            renderCatalogResults(false);
          }
        }

        const resCont = document.createElement("div");
        resCont.className = "file-container list-view";
        const mapsCol = document.createElement("div");
        mapsCol.style.paddingTop = "0";
        let mapsList = null;

        const buildMapCard = (item) => {
          const div = document.createElement("div");
          div.className = "item search-item-card";
          const isFolder = !item.metadata;
          const pathParts = item.fullPath.split("/");
          const fileName = pathParts[pathParts.length - 1];
          const folderPath = pathParts.slice(0, -1).map(formatDisplayName).join(" / ");
          const isLinkFile = !isFolder && isUrlLinkFile(fileName);
          div.onclick = () => {
            if (isFolder) navigateTo(item.fullPath);
            else if (isLinkFile) handleUrlFile(item.fullPath);
            else openPdfViewer(fileName, item.fullPath);
          };
          const baseName = getBaseName(fileName).toLowerCase();
          let displayIcon = isFolder ? iconSvg(getIconForName(baseName)) : iconSvg("file");
          const ext = fileName.split(".").pop().toLowerCase();
          if (!isFolder && isLinkFile) displayIcon = iconSvg("link");
          else if (!isFolder) displayIcon = iconSvg(getFileIconKeyForExt(ext));
          if (!isFolder && !isLinkFile && (ext === "dwg" || ext === "dxf")) displayIcon = iconSvg("ruler");
          div.innerHTML = `
            <div class="item-preview ${isFolder ? "folder-bg" : "file-bg"}">${displayIcon}</div>
            <div class="item-info">
              <strong style="color:var(--result-doc-text);">${escapeHtml(formatDisplayName(fileName))}</strong>
              <small>${escapeHtml(folderPath || "Koren")}</small>
            </div>
            <div class="item-arrow" style="color:var(--text-secondary); font-size:18px; flex-shrink:0; margin-left:10px;">→</div>
          `;
          return div;
        };

        const renderMapResults = (expanded) => {
          if (!mapsList) return;
          mapsList.innerHTML = "";
          const items = expanded ? allMatches : allMatches.slice(0, initialLimit);
          items.forEach((item) => mapsList.appendChild(buildMapCard(item)));
        };

        if (hasMapResults) {
          mapsCol.innerHTML = `<div class="search-section-header"><h3 style="color:var(--result-doc-heading);"><span class="ui-icon" aria-hidden="true">${iconSvg("folder")}</span> Tehnična dokumentacija (${fileCount})</h3><p style="font-size:13px; color:var(--text-primary);">Datoteke in mape, ki se ujemajo z iskanjem.</p></div>`;
          mapsList = document.createElement("div");
          mapsList.className = "search-results-list";
          renderMapResults(false);
          mapsCol.appendChild(mapsList);
          resCont.appendChild(mapsCol);
        }

        const hasSharedColumns = hasMapResults && hasCatalogResults;
        const shouldShowMore = mapsNeedsMore || catalogNeedsMore;
        if (shouldShowMore) {
          const showMoreWrap = document.createElement("div");
          showMoreWrap.className = "search-results-show-more-wrap" + (hasSharedColumns ? " shared-search-more" : "");
          const showMoreBtn = document.createElement("button");
          showMoreBtn.type = "button";
          showMoreBtn.className = "show-more-results-btn";
          showMoreBtn.textContent = "Pokaži več";
          showMoreBtn.addEventListener("click", function () {
            isExpanded = !isExpanded;
            this.textContent = isExpanded ? "Pokaži manj" : "Pokaži več";
            if (mapsNeedsMore) renderMapResults(isExpanded);
            if (catalogNeedsMore) renderCatalogResults(isExpanded);
          });
          showMoreWrap.appendChild(showMoreBtn);
          if (hasSharedColumns && searchResultsWrapper) {
            searchResultsWrapper.appendChild(showMoreWrap);
          } else if (hasMapResults) {
            resCont.appendChild(showMoreWrap);
          } else if (hasCatalogResults && catalogResultsSection) {
            catalogResultsSection.appendChild(showMoreWrap);
          }
        }

        const found = fileCount > 0 || catalogTotalCount > 0;
        if (mainContent) {
          mainContent.innerHTML = "";
          if (fileCount > 0) {
            mainContent.appendChild(resCont);
          } else if (catalogTotalCount === 0) {
            mainContent.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);"><h3 style="color:var(--text-primary);">Ni zadetkov za \"${escapeHtml(liveVal)}\"</h3></div>`;
          }
        }

        if (statusEl) {
          if (!found) {
            statusEl.textContent = "Ni zadetkov.";
            statusEl.style.color = "var(--text-secondary)";
            statusEl.style.fontWeight = "400";
          } else {
            statusEl.textContent = (fileCount > 0 ? fileCount + " datotek/map" : "") + (fileCount > 0 && catalogTotalCount > 0 ? ", " : "") + (catalogTotalCount > 0 ? catalogTotalCount + " zadetkov v katalogih" : "");
            statusEl.style.color = "var(--success)";
            statusEl.style.fontWeight = "500";
          }
        }

        try {
          sessionStorage.setItem("aluk_search_query", liveVal);
          sessionStorage.setItem("aluk_search_results", JSON.stringify({ fileCount, catalogTotalCount: catalogTotalCount || 0, timestamp: Date.now() }));
        } catch (e) {}
    }, 300);
  });
}

// --- OSTALO ---
function isUrlLinkFile(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  return ext === 'url' || ext === 'link' || ext === 'txt';
}

async function handleUrlFile(storagePath) {
  try {
    const fileUrl = buildR2UrlFromStoragePath(storagePath);
    if (!fileUrl) return;
    const res = await fetch(fileUrl);
    const text = await res.text();
    let extractedUrl = null;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.toUpperCase().startsWith('URL=')) {
        extractedUrl = line.slice(4).trim();
        break;
      }
      if (/^https?:\/\//i.test(line)) {
        extractedUrl = line;
        break;
      }
    }
    if (!extractedUrl && /https?:\/\//i.test(text)) extractedUrl = text.trim();
    if (extractedUrl && /^https?:\/\//i.test(extractedUrl)) {
      openExternalUrl(extractedUrl);
    } else {
      openExternalUrl(fileUrl);
    }
  } catch (e) {
    console.warn('handleUrlFile:', e);
    openExternalUrl(buildR2UrlFromStoragePath(storagePath));
  }
}

window.openPdfViewer = async function(fn, path, page, directUrl) {
  const ext = (fn.split('.').pop() || '').toLowerCase();
  const p = path || (currentPath ? `${currentPath}/${fn}` : fn);
  const fileUrl = directUrl || buildR2UrlFromStoragePath(p);
  const forceDownload = ['xlsx', 'xls', 'dwg', 'dxf'].includes(ext);
  if (forceDownload) {
    if (fileUrl) {
      try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fn;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        openExternalUrl(fileUrl);
      }
    }
    return;
  }
  const pageNum = page != null && page > 0 ? Math.floor(Number(page)) : 1;
  const url = "#view=" + fn;
  window.history.pushState({ type: 'viewer', file: fn }, "", url);
  pdfModal.style.display = 'flex';
  if (viewerFileName) viewerFileName.textContent = formatDisplayName(fn);
  if (!pdfFrame) {
    console.error("[openPdfViewer] pdfFrame element ni najden (id=pdfFrame)");
    pdfModal.style.display = "none";
    if (statusEl) statusEl.textContent = "Napaka: predogled ni na voljo.";
    return;
  }
  try {
    if (fileUrl) {
      pdfFrame.src = fileUrl + "#page=" + pageNum + "&view=Fit";
    } else {
      console.warn("[openPdfViewer] R2 URL ni na voljo");
      pdfModal.style.display = "none";
      if (statusEl) statusEl.textContent = "Datoteke ni mogoče naložiti.";
    }
  } catch (e) {
    console.error("[openPdfViewer] Izjema:", e);
    pdfModal.style.display = "none";
    if (statusEl) statusEl.textContent = "Napaka pri odpiranju datoteke.";
  }
}
window.closePdfViewer = function() { 
  pdfModal.style.display = 'none'; 
  pdfFrame.src = ""; 
  const p = currentPath; 
  window.history.replaceState({ path: p }, "", "#" + pathToHash(p)); 
  const hasActiveSearch = !!(isSearchActive && searchInput && searchInput.value.trim());
  if (hasActiveSearch) return;
  // Brez ponovnega nalaganja; obdrži točno isti seznam pod modalom.
}

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem('aluk_view_mode', mode);
  if (mode === 'grid') { 
    if (btnGrid) btnGrid.classList.add('active'); 
    if (btnList) btnList.classList.remove('active'); 
  } else { 
    if (btnGrid) btnGrid.classList.remove('active'); 
    if (btnList) btnList.classList.add('active'); 
  }
  if (currentItems.length > 0) renderItems(currentItems, currentRenderId);
}

// --- ZAVIHKI PRIJAVE (Obstoječi / Nov uporabnik) ---
function setupAuthTabs() {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginSection = document.getElementById("loginSection");
  const requestSection = document.getElementById("requestSection");
  if (!tabs.length || !loginSection || !requestSection) return;
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      if (target === "login") {
        loginSection.style.display = "";
        loginSection.setAttribute("aria-hidden", "false");
        requestSection.style.display = "none";
        requestSection.setAttribute("aria-hidden", "true");
      } else {
        loginSection.style.display = "none";
        loginSection.setAttribute("aria-hidden", "true");
        requestSection.style.display = "";
        requestSection.setAttribute("aria-hidden", "false");
      }
    });
  });
}

// --- PERSISTENCA POLJ (localStorage) ---
const AUTH_KEYS = { loginName: "aluk_loginName", loginEmail: "aluk_loginEmail", reqName: "aluk_reqName", reqCompany: "aluk_reqCompany", reqEmail: "aluk_reqEmail" };
function setupAuthPersistence() {
  ["loginName", "loginEmail", "reqName", "reqCompany", "reqEmail"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = AUTH_KEYS[id];
    try {
      const saved = localStorage.getItem(key);
      if (saved) el.value = saved;
    } catch (e) {}
    el.addEventListener("input", () => {
      try {
        localStorage.setItem(key, el.value);
      } catch (e) {}
    });
  });
}

// --- ZAHTEVEK ZA DOSTOP: shrani ime v localStorage (prikaz v portalu), v Supabase, odpri mailto ---
function doRequestAccess() {
  const name = (document.getElementById("reqName") && document.getElementById("reqName").value.trim()) || "";
  const company = (document.getElementById("reqCompany") && document.getElementById("reqCompany").value.trim()) || "";
  const email = (document.getElementById("reqEmail") && document.getElementById("reqEmail").value.trim()) || "";
  if (name) {
    try {
      localStorage.setItem("aluk_user_info", JSON.stringify({ name, company: company || undefined }));
    } catch (e) {}
  }
  try {
    supabase.from(ACCESS_REQUESTS_TABLE).insert({
      email: email || null,
      name: name || null,
      company: company || null,
      created_at: new Date().toISOString()
    }).then(({ error }) => { if (error) console.warn("Supabase access_requests insert:", error.message); });
  } catch (e) {
    console.warn("Supabase access_requests ni na voljo:", e);
  }
  const subject = "Prošnja za dostop do AluK Portala";
  const body = `Pozdravljeni,

Prosim za dostop do portala.

Podatki:
Ime: ${name}
Podjetje: ${company}
Email: ${email}

Hvala.`;
  const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

function setupRequestMailBtn() {
  const btn = document.getElementById("requestMailBtn");
  if (btn) btn.addEventListener("click", doRequestAccess);
}

// Registriraj form submit handler (Magic Link iz #loginSection ali Enter v #requestSection → mailto)
function setupFormHandler() {
  const form = document.getElementById("authForm");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const emailInput = document.getElementById("loginEmail");
      const requestSection = document.getElementById("requestSection");
      const isRequestVisible = requestSection && requestSection.style.display !== "none";
      if (isRequestVisible) {
        doRequestAccess();
        return false;
      }
      const msgEl = document.getElementById("authMsg");
      if (!emailInput) {
        if (msgEl) { msgEl.textContent = "Napaka: Polje za e-pošto ni na voljo."; msgEl.className = "error-msg"; }
        return false;
      }
      const e = emailInput.value.trim();
      if (!e) {
        if (msgEl) { msgEl.textContent = "Prosimo, vpišite e-poštni naslov."; msgEl.className = "error-msg"; }
        return false;
      }
      const btn = document.getElementById("sendLink");
      if (!btn) return false;
      btn.disabled = true;
      btn.textContent = "Pošiljam...";
      if (msgEl) { msgEl.textContent = ""; msgEl.className = ""; }
      // Get the full URL (e.g., https://mihapahor.github.io/aluk-portal/)
      // We strip query params (?) and hashes (#) but KEEP the path (/aluk-portal/)
      let redirectUrl = window.location.origin + window.location.pathname;
      if (!redirectUrl.endsWith("/")) {
        redirectUrl += "/";
      }
      const nameInput = document.getElementById("loginName");
      const fullName = (nameInput && nameInput.value && nameInput.value.trim()) ? nameInput.value.trim() : "";
      if (fullName) {
        try {
          const existing = localStorage.getItem("aluk_user_info");
          const data = existing ? { ...JSON.parse(existing), name: fullName } : { name: fullName };
          localStorage.setItem("aluk_user_info", JSON.stringify(data));
        } catch (err) {}
      }
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: e,
          options: { emailRedirectTo: redirectUrl }
        });
        if (error) {
          const isSignupsNotAllowed = (error.message || "").toLowerCase().includes("signups not allowed");
          if (msgEl) {
            msgEl.textContent = isSignupsNotAllowed
              ? "Vaš e-naslov še ni registriran v našem sistemu. Prosimo, oddajte zahtevek za dostop v sosednjem zavihku."
              : "Napaka: " + error.message;
            msgEl.className = "error-msg";
            msgEl.style.color = "#E2001A";
          }
          btn.disabled = false;
          btn.textContent = "Pošlji povezavo za vstop";
          if (isSignupsNotAllowed) {
            setTimeout(() => {
              const loginSection = document.getElementById("loginSection");
              const requestSection = document.getElementById("requestSection");
              const tabs = document.querySelectorAll(".auth-tab");
              const requestTab = document.querySelector('.auth-tab[data-tab="request"]');
              const reqEmailInput = document.getElementById("reqEmail");
              if (loginSection) { loginSection.style.display = "none"; loginSection.setAttribute("aria-hidden", "true"); }
              if (requestSection) { requestSection.style.display = ""; requestSection.setAttribute("aria-hidden", "false"); }
              tabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
              if (requestTab) { requestTab.classList.add("active"); requestTab.setAttribute("aria-selected", "true"); }
              if (reqEmailInput && e) { reqEmailInput.value = e; try { localStorage.setItem("aluk_reqEmail", e); } catch (err) {} }
            }, 2000);
          }
        } else {
          if (msgEl) {
            msgEl.textContent = "✅ Povezava poslana! Preverite svoj e-poštni predal.";
            msgEl.className = "success-msg";
            msgEl.style.color = "";
          }
          btn.textContent = "Pošlji povezavo za vstop";
          btn.disabled = false;
        }
      } catch (err) {
        if (msgEl) {
          msgEl.textContent = "Napaka: " + (err.message || "Neznana napaka");
          msgEl.className = "error-msg";
          msgEl.style.color = "#E2001A";
        }
        btn.disabled = false;
        btn.textContent = "Pošlji povezavo za vstop";
      }
      return false;
    });
  }
  setupAuthTabs();
  setupAuthPersistence();
  setupRequestMailBtn();
}

// Pokliči takoj, ker je script type="module" naložen na koncu body
setupFormHandler();

if (btnGrid) btnGrid.addEventListener('click', () => setViewMode('grid')); 
if (btnList) btnList.addEventListener('click', () => setViewMode('list'));
if (backBtn) backBtn.addEventListener('click', () => {
  const parts = currentPath.split('/').filter(Boolean);
  if (parts.length === 0) return;
  const parentPath = parts.slice(0, -1).join('/');
  navigateTo(parentPath);
});

if (updatesAccordionHeader && updatesBanner) {
  updatesAccordionHeader.addEventListener("click", () => {
    const isOpen = updatesBanner.classList.toggle("is-open");
    updatesAccordionHeader.setAttribute("aria-expanded", isOpen);
  });
}

// --- REKURZIVNO ISKANJE PO VSEH MAPAH (Za iskanje) - OPTIMIZIRANO ---
async function searchAllFilesRecursive(path, searchTerm, depth = 0, maxDepth = 8, maxResults = 100) {
   if (depth > maxDepth) return [];

   const lowerSearchTerm = String(searchTerm || "").toLowerCase();
   const normalizedBasePath = stripPathSlashes(path);

   try {
     const rows = await fetchAllFilesFromTable();
     const out = [];
     const prefix = normalizedBasePath ? `${normalizedBasePath}/` : "";

     for (const row of rows) {
       if (out.length >= maxResults) break;
       const fileName = row.filename || "";
       if (!fileName) continue;

       const fullPath = buildStoragePathFromRow(row);
       if (prefix && !fullPath.startsWith(prefix)) continue;

       const lowerName = fileName.toLowerCase();
       if (lowerSearchTerm && !lowerName.includes(lowerSearchTerm)) continue;

       const ext = lowerName.split(".").pop();
       if (ext && !["pdf", "dwg", "xlsx"].includes(ext)) continue;

       out.push({
         name: fileName,
         filename: fileName,
         r2_path: row.r2_path || "",
         metadata: { size: getRowSizeBytes(row) },
         created_at: getRowTimestamp(row),
         fullPath,
         displayPath: fullPath
       });
     }

     return out;
   } catch (e) {
     console.warn("Napaka pri iskanju v mapi:", path, e);
     return [];
   }
}

// Obnovi rezultate ob vračanju na stran
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Stran je bila obnovljena iz cache
    const savedQuery = sessionStorage.getItem('aluk_search_query');
    if (savedQuery && searchInput) {
      searchInput.value = savedQuery;
      isSearchActive = true; // Aktiviraj iskanje
      // Ponovno izvedi iskanje
      if (searchInput.value.trim()) {
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
});

// Rezultati iskanja ostanejo pri preklopu zavihka; osvežijo se šele, ko uporabnik spremeni ali izbriše vsebino iskalnega polja.

// --- INICIALIZACIJA (zanesljivo za mobilne magic linke) ---
(function handleAuthErrorInUrl() {
  const h = window.location.hash || "";
  if (h.includes("error=") && h.includes("error_description=")) {
    const msgEl = getElement("authMsg");
    if (msgEl) {
      msgEl.textContent = "Povezava za prijavo ni več veljavna ali je že bila uporabljena. Prosimo, zahtevajte novo povezavo.";
      msgEl.className = "error-msg";
    }
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }
})();

(function initAuth() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hasAuthInUrl = hash.includes("access_token=") || search.includes("code=");

  // Pomagalo: ali je portal že prikazan (da ne kličemo showApp in ne resetiramo na Domov)
  function isAppVisible() {
    const ac = getElement("appCard");
    return ac && ac.style.display === "flex";
  }
  // URL ob auth dogodkih ohranimo hash (npr. #Okenski sistemi), da navigacija ostane tam
  function replaceStatePreserveHash() {
    const url = window.location.pathname + window.location.search + (window.location.hash || "");
    window.history.replaceState({}, document.title, url);
  }

  // 1) Listener TAKOJ na začetku – preden karkoli awaitamo, da ne zamudimo INITIAL_SESSION / SIGNED_IN (pomembno za mobilne brskalnike)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" && session) {
      replaceStatePreserveHash();
      if (!isAppVisible()) showApp(session.user.email);
      return;
    }
    if (event === "SIGNED_IN" && session) {
      replaceStatePreserveHash();
      if (!isAppVisible()) showApp(session.user.email);
      return;
    }
    if (event === "SIGNED_OUT") {
      replaceStatePreserveHash();
      showLogin();
      return;
    }
    if (event === "TOKEN_REFRESHED" && session && session.user) {
      if (!isAppVisible()) showApp(session.user.email);
    }
  });

  // 2) Če je v URL-ju token, prikaži "Prijavljanje..." takoj
  if (hasAuthInUrl && msgEl) {
    msgEl.textContent = "Prijavljanje...";
    msgEl.className = "";
    msgEl.style.color = "var(--text-primary)";
    const sendBtn = document.getElementById("sendLink");
    const emailInput = document.getElementById("loginEmail");
    if (sendBtn) sendBtn.style.display = "none";
    if (emailInput) emailInput.style.display = "none";
  }

  function showRetryAndClearHash() {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    if (msgEl) {
      msgEl.innerHTML = "Prijava se ni uspela. <button type=\"button\" id=\"authRetryBtn\" style=\"margin-top:8px; padding:8px 16px; background:var(--primary); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;\">Poskusite znova</button>";
      msgEl.className = "error-msg";
      const retryBtn = document.getElementById("authRetryBtn");
      if (retryBtn) retryBtn.addEventListener("click", () => { msgEl.textContent = ""; msgEl.className = ""; const s = document.getElementById("sendLink"); const e = document.getElementById("loginEmail"); if (s) s.style.display = ""; if (e) e.style.display = ""; checkUser(); });
    }
    const sendBtn = document.getElementById("sendLink");
    const emailInput = document.getElementById("loginEmail");
    if (sendBtn) sendBtn.style.display = "";
    if (emailInput) emailInput.style.display = "";
    checkUser();
  }

  async function runSessionCheck() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      replaceStatePreserveHash();
      if (!isAppVisible()) showApp(session.user.email);
      return true;
    }
    return false;
  }

  (async () => {
    if (hasAuthInUrl) {
      await new Promise(r => setTimeout(r, 50));
      for (let i = 0; i < 10; i++) {
        if (await runSessionCheck()) return;
        await new Promise(r => setTimeout(r, 300));
      }
      const timeoutMs = 5000;
      const timeoutId = setTimeout(() => {
        if (!isAppVisible()) {
          showRetryAndClearHash();
        }
      }, timeoutMs);
      supabase.auth.onAuthStateChange((event, s) => {
        if (event === "SIGNED_IN" && s) clearTimeout(timeoutId);
      });
      return;
    }

    const ok = await runSessionCheck();
    if (!ok) checkUser();
  })();
})();

// Ensure any loading overlay is hidden so the page is interactive
(function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
})();

// Iskalni indeks se naloži na zahtevo (ob iskanju), brez background preloada ob zagonu.
