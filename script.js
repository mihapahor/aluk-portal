import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

window.globalFileList = [];

const SUPABASE_URL = "https://ugwchsznxsuxbxdvigsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2Noc3pueHN1eGJ4ZHZpZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY0NzEsImV4cCI6MjA4NDY5MjQ3MX0.iFzB--KryoBedjIJnybL55-xfQFIBxWnKq9RqwxuyK4";
const R2_BASE_URL = "https://pub-28724a107246493c93629c81b8105cff.r2.dev";
const ADMIN_EMAIL = "miha@aluk.si";
const ADMIN_EMAILS = new Set([
  "miha@aluk.si",
  "miha.pahor97@gmail.com"
]);
// Tabela v Supabase: ustvari z stolpci email, name, company, created_at (RLS dovoli INSERT za anon)
const ACCESS_REQUESTS_TABLE = "access_requests"; 

// --- KONFIGURACIJA ---
const ANNOUNCEMENTS_ROUTE = "__obvestila__";
const ADMIN_ROUTE = "__admin__";
// Mape, ki so namenjene samo internemu indeksiranju (ne prikazuj v portalu).
const HIDDEN_INDEX_FOLDER_KEYS = new Set([
  "novialukpokoncni"
]);
// Root mape, ki naj bodo vedno zadnje v seznamu (UI preference).
const LAST_ROOT_FOLDER_KEYS = new Set([
  normalizeSegmentKey("Bioklimatske pergole"),
  normalizeSegmentKey("Bioklimatska pergola")
]);
const customSortOrder = [
  "Okenski sistemi", "Vratni sistemi", "Panoramski sistemi",
  "Fasadni sistemi", "Pisarniski sistemi", "Dekorativne obloge Skin"
];
const relevantExtensions = ['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'dwg', 'dxf', 'zip', 'rar', '7z'];
const folderIcons = {
  // "Tehnični katalogi" in podobno: raje ikona dokumentacije kot orodje.
  "tehničn": "book", "tehnicn": "book", "katalog": "book",
  "galerij": "image", "foto": "image", "referenc": "image",
  "certifikat": "medal", "izjav": "medal",
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
  medal:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h3l1 4 1-4h3l-2.2 7H10.2z"/><path d="M12 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><path d="M12 13.2l1 2 2.2.2-1.7 1.4.6 2.1-2.1-1.2-2.1 1.2.6-2.1-1.7-1.4 2.2-.2z"/></svg>',
  cad:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a3 3 0 0 0-3 3c0 2.2 1.5 3.6 3 5 1.5-1.4 3-2.8 3-5a3 3 0 0 0-3-3z"/><path d="M12 13v8"/><path d="M7 21h10"/><path d="M6 9l-3 3"/><path d="M18 9l3 3"/><path d="M9 16l-4-4"/><path d="M15 16l4-4"/></svg>',
  ruler:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l10-10 6 6-10 10H4z"/><path d="M14 6l4 4"/><path d="M7 13l1 1"/><path d="M9 11l1 1"/><path d="M11 9l1 1"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M12 10v7"/><path d="M12 7h.01"/></svg>',
  tool:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7l3 3"/><path d="M12.3 9.7 6 16v3h3l6.3-6.3"/><path d="M16 3a4 4 0 0 0-3 6.7l1.3 1.3A4 4 0 1 0 16 3z"/></svg>',
  cloud:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 17.5a3.5 3.5 0 0 0-1-6.86A6 6 0 0 0 7.3 8.2 4.5 4.5 0 0 0 7.5 17.5z"/></svg>',
  cloudCheck:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 17.5a3.5 3.5 0 0 0-1-6.86A6 6 0 0 0 7.3 8.2 4.5 4.5 0 0 0 7.5 17.5z"/><path d="m10 14 2 2 4-4"/></svg>',
  dotsVertical:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5h.01"/><path d="M12 12h.01"/><path d="M12 19h.01"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>',
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
  showToast("Prenašanje...");
}

function showToast(message) {
  let toast = document.getElementById("downloadToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "downloadToast";
    toast.className = "download-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2000);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'aluk-portal-auth' }
});

// --- OBVESTILA (en vir za login novico in "Obvestila" tab) ---
const FALLBACK_ANNOUNCEMENTS = [
  {
    id: "portal-launch",
    title: "Novi AluK Portal za partnerje",
    published_at: "2026-02-15",
    lead:
      "Z veseljem predstavljamo prenovljen ALUK Portal za partnerje, kjer so vsa ključna tehnična gradiva zbrana na enem mestu in vedno na voljo v najnovejši različici.",
    bullets: [
      { title: "Tehnična dokumentacija in katalogi", text: "Urejeno po sistemih in mapah, da hitro najdete pravo vsebino." },
      { title: "Hitro iskanje po mapah in datotekah", text: "Poiščete katalog, dokument ali datoteko po imenu, brez ročnega brskanja." },
      { title: "Iskanje po šifri artikla v katalogih", text: "Vpišete šifro in portal vrne zadetke iz vsebine katalogov (strani in naslovi), kar bistveno skrajša čas iskanja." },
      { title: "Priljubljene", text: "Pogosto uporabljene mape si označite med priljubljene za še hitrejši dostop." },
      { title: "Zadnje posodobitve in oznaka \"NOVO\"", text: "Takoj vidite, kaj je bilo dodano ali kateri katalog je bil posodobljen." },
      { title: "Ostala dokumentacija", text: "Ločen razdelek za obrazce, priporočila za montažo in druga podporna gradiva." },
      { title: "Prilagojeno tudi za mobilne naprave", text: "Portal ostaja pregleden in uporaben tudi na telefonu." }
    ],
    note: "Če imate predlog za dodatne vsebine ali izboljšave, nam sporočite in bomo portal nadgrajevali naprej."
  }
];
let announcementsCache = [...FALLBACK_ANNOUNCEMENTS];
const LOGIN_ANNOUNCEMENT_ID = "portal-launch";

// DOM ELEMENTI (z varnostnimi preverjanji)
const authForm = getElement("authForm");
const loginNewsCard = getElement("loginNewsCard");
const loginNewsMount = getElement("loginNewsMount");
const loginShell = getElement("loginShell");
const loginFooter = getElement("loginFooter");
const appCard = getElement("appCard");
const mainContent = getElement("mainContent");
const searchResultsWrapper = getElement("searchResultsWrapper");
const catalogResultsSection = getElement("catalogResultsSection");
const announcementsSection = getElement("announcementsSection");
const adminSection = getElement("adminSection");
const searchSpinner = getElement("searchSpinner");
const skeletonLoader = getElement("skeletonLoader");
const statusEl = getElement("status");
const connectionStateChip = getElement("connectionStateChip");
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
const globalFavorites = document.getElementById("globalFavorites");
const globalFavContainer = document.getElementById("globalFavContainer");
const sidebarFavList = getElement("sidebarFavList");
const sidebarEl = getElement("sidebar");
const sidebarOverlay = getElement("sidebarOverlay");
const menuBtn = getElement("menuBtn");
const adminLink = getElement("adminLink");
const installAppBtn = getElement("installAppBtn");
const offlineOnboardingModal = getElement("offlineOnboardingModal");
const offlineOnboardingClose = getElement("offlineOnboardingClose");
const offlineEmptyHint = getElement("offlineEmptyHint");

const toolbarEl = document.querySelector(".toolbar");
const searchSectionEl = document.querySelector(".search-section");
const contentTitleDescEl = getElement("contentTitleDesc");
const DEFAULT_CONTENT_DESC_HTML = contentTitleDescEl ? contentTitleDescEl.innerHTML : "";

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
const OFFLINE_CACHE_NAME_APP = "aluk-offline-files-app-v1";
const OFFLINE_CACHE_NAME_BROWSER = "aluk-offline-files-browser-v1";
const OFFLINE_PINS_KEY = "aluk_offline_pins";
const OFFLINE_DB_NAME = "aluk-offline-db";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_FILES_STORE = "files_meta";
const OFFLINE_CACHED_META_STORE = "cached_files_meta";
const OFFLINE_META_STORE = "meta";
const OFFLINE_CATALOG_INDEX_STORE = "catalog_index";
const OFFLINE_ONBOARDING_KEY = "aluk_offline_onboarding_seen_v1";
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
let activeItemMenuWrap = null;
let currentViewerBlobUrl = null;
let deferredInstallPrompt = null;
let offlineDbPromise = null;
const supportsOfflineStorage = typeof window !== "undefined" && "caches" in window && "indexedDB" in window;
function isPwaRuntimeContext() {
  if (typeof window === "undefined") return false;
  const hasMatch = (q) => window.matchMedia && window.matchMedia(q).matches;
  return (
    hasMatch("(display-mode: standalone)") ||
    hasMatch("(display-mode: fullscreen)") ||
    hasMatch("(display-mode: minimal-ui)") ||
    hasMatch("(display-mode: window-controls-overlay)") ||
    window.navigator.standalone === true
  );
}
const isStandaloneApp = isPwaRuntimeContext();
const OFFLINE_CACHE_NAME = isStandaloneApp ? OFFLINE_CACHE_NAME_APP : OFFLINE_CACHE_NAME_BROWSER;
const showPwaItemActionMenu = isStandaloneApp;
const itemSyncState = new Map();
const itemSyncProgress = new Map();
let syncStatusRenderTimer = null;
const CATALOG_INDEX_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
let isMetadataSyncRunning = false;
let lastSyncAtIso = null;

// --- NAV SECTIONS ---
const OTHER_DOCS_ROOT = "Ostala dokumentacija";

function getRootSegment(p) {
  const n = normalizePath(p || "");
  if (!n) return "";
  return n.split("/").filter(Boolean)[0] || "";
}

function updateSidebarNavActive(path) {
  const root = normalizePath(getRootSegment(path));
  document.querySelectorAll(".sidebar-link[data-path]").forEach((a) => {
    const target = normalizePath(a.getAttribute("data-path") || "");
    const active = (target === "" && root === "") || (target !== "" && target === root);
    a.classList.toggle("active", active);
    a.setAttribute("aria-current", active ? "page" : "false");
  });
}

function updateContentSectionTitle(path) {
  const contentTitleEl = getElement("contentTitle");
  if (!contentTitleEl) return;

  if (normalizePath(path) === normalizePath(ADMIN_ROUTE)) {
    contentTitleEl.innerHTML = `<span class="ui-icon" aria-hidden="true">${iconSvg("wrench")}</span>Admin`;
    return;
  }

  if (normalizePath(path) === normalizePath(ANNOUNCEMENTS_ROUTE)) {
    contentTitleEl.innerHTML = `<span class="ui-icon" aria-hidden="true">${iconSvg("bell")}</span>Obvestila`;
    return;
  }

  const root = normalizePath(getRootSegment(path));
  const isOtherDocs = root === normalizePath(OTHER_DOCS_ROOT);

  const title = isOtherDocs ? "Ostala dokumentacija" : "Tehnična dokumentacija";
  const iconKey = "fileText";
  contentTitleEl.innerHTML = `<span class="ui-icon" aria-hidden="true">${iconSvg(iconKey)}</span>${escapeHtml(title)}`;
}

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
    const fp = normalizePath(f.virtualPath || f.fullPath || "");
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
    fullPath: f.fullPath || (path ? `${path}/${f.name}` : f.name), // real storage path (used for open)
    virtualPath: f.virtualPath || null,
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
function loadOfflinePins() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_PINS_KEY) || "[]");
    return new Set((Array.isArray(raw) ? raw : []).map((p) => normalizePath(p)).filter(Boolean));
  } catch (e) {
    return new Set();
  }
}
function saveOfflinePins(pins) {
  try {
    localStorage.setItem(OFFLINE_PINS_KEY, JSON.stringify([...pins]));
  } catch (e) {}
}
let offlinePins = loadOfflinePins();

function openOfflineDb() {
  if (offlineDbPromise) return offlineDbPromise;
  offlineDbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB ni na voljo"));
      return;
    }
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_FILES_STORE)) {
        db.createObjectStore(OFFLINE_FILES_STORE, { keyPath: "storage_path" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_CACHED_META_STORE)) {
        db.createObjectStore(OFFLINE_CACHED_META_STORE, { keyPath: "storage_path" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_META_STORE)) {
        db.createObjectStore(OFFLINE_META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_CATALOG_INDEX_STORE)) {
        db.createObjectStore(OFFLINE_CATALOG_INDEX_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open error"));
  });
  return offlineDbPromise;
}

function idbGetAll(storeName) {
  return openOfflineDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function idbGet(storeName, key) {
  return openOfflineDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function idbPut(storeName, value) {
  return openOfflineDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(storeName).put(value);
  }));
}

function idbDelete(storeName, key) {
  return openOfflineDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(storeName).delete(key);
  }));
}

async function saveRowsToIndexedDb(rows) {
  if (!Array.isArray(rows)) return;
  const db = await openOfflineDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_FILES_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_FILES_STORE);
    store.clear();
    for (const row of rows) {
      const storage_path = buildStoragePathFromRow(row);
      if (!storage_path) continue;
      store.put({
        storage_path,
        filename: row.filename || "",
        r2_path: row.r2_path || "",
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
        modified_at: row.modified_at || null,
        size_bytes: getRowSizeBytes(row)
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
  await idbPut(OFFLINE_META_STORE, { key: "files_last_sync_at", value: new Date().toISOString() });
}

async function loadRowsFromIndexedDb() {
  const rows = await idbGetAll(OFFLINE_FILES_STORE);
  return rows.map((row) => ({
    filename: row.filename || "",
    r2_path: row.r2_path || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    modified_at: row.modified_at || null,
    size_bytes: row.size_bytes || 0
  }));
}

async function getCachedMetaMapFromDb() {
  const cachedRows = await idbGetAll(OFFLINE_CACHED_META_STORE);
  const map = new Map();
  for (const rec of cachedRows) {
    map.set(rec.storage_path, rec);
  }
  return map;
}

async function fetchAllCatalogIndexRowsFromSupabase() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("catalog_index")
      .select("code,pdf_filename,page_number,page_title,updated_at,created_at")
      .range(from, to);
    if (error) throw error;
    const batch = Array.isArray(data) ? data : [];
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function saveCatalogIndexRowsToIndexedDb(rows) {
  const db = await openOfflineDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_CATALOG_INDEX_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_CATALOG_INDEX_STORE);
    store.clear();
    for (const row of rows || []) {
      store.put({
        code: String(row?.code || ""),
        pdf_filename: String(row?.pdf_filename || ""),
        page_number: row?.page_number != null ? Number(row.page_number) : 1,
        page_title: String(row?.page_title || ""),
        updated_at: row?.updated_at || row?.created_at || null
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
  await idbPut(OFFLINE_META_STORE, { key: "catalog_index_last_sync_at", value: new Date().toISOString() });
}

async function maybeSyncCatalogIndexLocal({ force = false } = {}) {
  if (!navigator.onLine) return;
  if (!force) {
    const lastSync = await idbGet(OFFLINE_META_STORE, "catalog_index_last_sync_at");
    const ts = lastSync?.value ? new Date(lastSync.value).getTime() : 0;
    if (ts && (Date.now() - ts) < CATALOG_INDEX_SYNC_INTERVAL_MS) return;
  }
  try {
    const rows = await fetchAllCatalogIndexRowsFromSupabase();
    await saveCatalogIndexRowsToIndexedDb(rows);
  } catch (e) {
    console.warn("Catalog index local sync ni uspel:", e);
  }
}

function groupCatalogIndexRows(rows) {
  const groupedByPdf = {};
  for (const row of rows || []) {
    const fn = row?.pdf_filename;
    const page = row?.page_number != null ? Number(row.page_number) : 1;
    const title = row?.page_title ? String(row.page_title).trim() : "";
    if (!fn) continue;
    if (!groupedByPdf[fn]) groupedByPdf[fn] = [];
    const exists = groupedByPdf[fn].some((e) => e.page === page && e.title === title);
    if (!exists) groupedByPdf[fn].push({ page, title });
  }
  for (const fn of Object.keys(groupedByPdf)) {
    groupedByPdf[fn].sort((a, b) => a.page - b.page);
  }
  const catalogTotalCount = Object.values(groupedByPdf).reduce((sum, items) => sum + items.length, 0);
  return { groupedByPdf, catalogTotalCount };
}

async function searchLocalCatalogIndex(query) {
  const out = { groupedByPdf: {}, catalogTotalCount: 0 };
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) return out;
  try {
    const rows = await idbGetAll(OFFLINE_CATALOG_INDEX_STORE);
    if (!rows.length) return out;
    const q = trimmed.toLowerCase();
    const filtered = rows.filter((r) => String(r?.code || "").toLowerCase().includes(q));
    return groupCatalogIndexRows(filtered);
  } catch (e) {
    console.warn("Local catalog search error:", e);
    return out;
  }
}

function closeItemActionMenu() {
  if (!activeItemMenuWrap) return;
  activeItemMenuWrap.classList.remove("open");
  activeItemMenuWrap = null;
}

function getItemSyncState(path) {
  return itemSyncState.get(normalizePath(path || "")) || "idle";
}

function getItemSyncProgress(path) {
  const key = normalizePath(path || "");
  if (!key) return null;
  const pct = itemSyncProgress.get(key);
  return Number.isFinite(pct) ? pct : null;
}

function setItemSyncState(path, state) {
  const key = normalizePath(path || "");
  if (!key) return;
  if (!state || state === "idle") {
    itemSyncState.delete(key);
    itemSyncProgress.delete(key);
    return;
  }
  itemSyncState.set(key, state);
}

function setItemSyncProgress(path, pct) {
  const key = normalizePath(path || "");
  if (!key) return;
  if (!Number.isFinite(pct)) {
    itemSyncProgress.delete(key);
    return;
  }
  itemSyncProgress.set(key, Math.max(0, Math.min(100, pct)));
}

function scheduleSyncStatusRender() {
  if (syncStatusRenderTimer) return;
  syncStatusRenderTimer = setTimeout(() => {
    syncStatusRenderTimer = null;
    if (!isSearchActive && currentItems.length > 0) {
      renderItems(currentItems, currentRenderId);
    }
  }, 120);
}

function setTransferProgressStatus({ label, current, total, percent }) {
  if (!statusEl) return;
  const safeCurrent = Math.max(0, Number(current) || 0);
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const suffix = safeTotal > 0 ? ` (${safeCurrent}/${safeTotal})` : "";
  statusEl.textContent = `${label}: ${safePercent}%${suffix}`;
  statusEl.style.color = "var(--text-secondary)";
  statusEl.style.fontWeight = "600";
}

function clearTransferProgressStatus() {
  if (!statusEl) return;
  statusEl.style.color = "";
  statusEl.style.fontWeight = "";
}

function formatTimeShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

function updateConnectionStateChip() {
  if (!connectionStateChip) return;
  if (!isStandaloneApp) {
    connectionStateChip.style.display = "none";
    return;
  }
  connectionStateChip.style.display = "inline-flex";
  connectionStateChip.classList.remove("offline", "syncing");

  if (isMetadataSyncRunning) {
    connectionStateChip.classList.add("syncing");
    connectionStateChip.textContent = "Sinhronizacija...";
    return;
  }

  if (!navigator.onLine) {
    connectionStateChip.classList.add("offline");
    connectionStateChip.textContent = "Offline";
    return;
  }

  const time = formatTimeShort(lastSyncAtIso);
  connectionStateChip.textContent = time ? `Online • ${time}` : "Online";
}

async function updateOfflineEmptyHintVisibility() {
  if (!offlineEmptyHint) return;
  if (!isStandaloneApp) {
    offlineEmptyHint.style.display = "none";
    return;
  }
  if (navigator.onLine) {
    offlineEmptyHint.style.display = "none";
    return;
  }
  try {
    const cachedRows = await idbGetAll(OFFLINE_CACHED_META_STORE);
    offlineEmptyHint.style.display = cachedRows.length > 0 ? "none" : "block";
  } catch (e) {
    offlineEmptyHint.style.display = "block";
  }
}

function toggleItemActionMenu(menuWrap) {
  if (!menuWrap) return;
  if (activeItemMenuWrap && activeItemMenuWrap !== menuWrap) {
    activeItemMenuWrap.classList.remove("open");
  }
  const shouldOpen = !menuWrap.classList.contains("open");
  menuWrap.classList.toggle("open", shouldOpen);
  activeItemMenuWrap = shouldOpen ? menuWrap : null;
}

async function isPathCachedOffline(storagePath, directUrl) {
  if (!isStandaloneApp) return false;
  if (!("caches" in window)) return false;
  const url = directUrl || buildR2UrlFromStoragePath(storagePath);
  if (!url) return false;
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch (e) {
    return false;
  }
}

function fetchBlobWithProgress(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.timeout = 120000;
    xhr.onprogress = (event) => {
      if (typeof onProgress !== "function") return;
      if (event.lengthComputable && event.total > 0) {
        onProgress((event.loaded / event.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === "function") onProgress(100);
        resolve(xhr.response);
        return;
      }
      reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Timeout"));
    xhr.send();
  }).catch(async (xhrErr) => {
    // Fallback na fetch (brez natančnega progressa), če XHR odpove.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (typeof onProgress === "function") onProgress(100);
    return blob;
  });
}

function formatOfflineActionError(err) {
  const msg = String(err?.message || "").toLowerCase();
  if (
    msg.includes("network error") ||
    msg.includes("failed to fetch") ||
    msg.includes("cors") ||
    msg.includes("typeerror")
  ) {
    return "CORS/omrežje: vir ne dovoljuje dostopa iz tega izvora (origin).";
  }
  if (msg.startsWith("http ")) {
    return `Strežnik je vrnil napako ${err.message.replace(/^http\s*/i, "")}.`;
  }
  return err?.message || "neznana napaka";
}

function getAncestorFoldersFromVirtualFilePath(virtualFilePath) {
  const parts = normalizePath(virtualFilePath || "").split("/").filter(Boolean);
  const folders = [];
  for (let i = 1; i < parts.length; i += 1) {
    folders.push(parts.slice(0, i).join("/"));
  }
  return folders;
}

async function cacheSingleFile(storagePath, directUrl, updatedAt, onProgress) {
  if (!("caches" in window)) throw new Error("Cache API ni na voljo");
  const url = directUrl || buildR2UrlFromStoragePath(storagePath);
  if (!url) throw new Error("Datoteka nima URL naslova");

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const blob = await fetchBlobWithProgress(url, onProgress);
  await cache.put(url, new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } }));
  offlinePins.add(normalizePath(storagePath));
  saveOfflinePins(offlinePins);
  await idbPut(OFFLINE_CACHED_META_STORE, {
    storage_path: normalizePath(storagePath),
    updated_at: updatedAt || null,
    cached_at: new Date().toISOString()
  });
  return true;
}

async function removeSingleCachedFile(storagePath, directUrl) {
  if (!("caches" in window)) return false;
  const url = directUrl || buildR2UrlFromStoragePath(storagePath);
  if (!url) return false;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const removed = await cache.delete(url);
  offlinePins.delete(normalizePath(storagePath));
  saveOfflinePins(offlinePins);
  await idbDelete(OFFLINE_CACHED_META_STORE, normalizePath(storagePath));
  return removed;
}

async function getFolderFilesForCaching(folderPath) {
  const rows = await fetchAllFilesFromTable();
  const normalizedFolder = stripPathSlashes(normalizePath(folderPath));
  const prefix = normalizedFolder ? `${normalizedFolder}/` : "";
  const files = [];

  for (const row of rows) {
    const storagePath = buildStoragePathFromRow(row);
    const virtualPath = virtualizeStoragePath(storagePath);
    if (!storagePath || !virtualPath) continue;
    if (prefix && !virtualPath.startsWith(prefix)) continue;
    files.push({
      storagePath,
      virtualPath,
      ancestorFolders: getAncestorFoldersFromVirtualFilePath(virtualPath),
      fileName: row.filename || storagePath.split("/").pop() || "",
      fileUrl: buildR2UrlFromStoragePath(storagePath),
      updatedAt: getRowTimestamp(row)
    });
  }
  return files;
}

async function downloadToComputer(fileName, fileUrl, storagePath) {
  const fallbackUrl = fileUrl || buildR2UrlFromStoragePath(storagePath);
  if (!fallbackUrl) return;
  try {
    const response = await fetch(fallbackUrl);
    if (!response.ok) throw new Error("download_failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "download";
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const cached = await cache.match(fallbackUrl);
      if (cached) {
        const blob = await cached.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName || "download";
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
    } catch (err) {}
    openExternalUrl(fallbackUrl);
  }
}

async function openCachedFile(fileName, storagePath, directUrl) {
  if (!("caches" in window)) return false;
  const ext = String(fileName || "").split(".").pop().toLowerCase();
  const fileUrl = directUrl || buildR2UrlFromStoragePath(storagePath);
  if (!fileUrl) return false;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const response = await cache.match(fileUrl);
  if (!response) return false;
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  if (["xlsx", "xls", "dwg", "dxf"].includes(ext)) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    return true;
  }

  currentViewerBlobUrl = blobUrl;
  pdfModal.style.display = "flex";
  if (viewerFileName) viewerFileName.textContent = formatDisplayName(fileName);
  if (pdfFrame) pdfFrame.src = blobUrl;
  return true;
}

async function handleItemAction(action, itemCtx) {
  const { isFolder, fullPath, storagePath, fileName, fileUrl } = itemCtx;
  const stateKey = isFolder ? fullPath : storagePath;
  try {
    if (!supportsOfflineStorage && (action === "cache" || action === "free")) {
      showToast("Ta brskalnik ne podpira offline shranjevanja.");
      return;
    }
    if (!isStandaloneApp && (action === "cache" || action === "free")) {
      showToast("Za to funkcionalnost odprite nameščeno aplikacijo.");
      return;
    }
    if (action === "cache") {
      if (!navigator.onLine) {
        showToast("Za lokalno shranjevanje je potrebna internetna povezava.");
        return;
      }
      setItemSyncState(stateKey, "loading");
      setItemSyncProgress(stateKey, 0);
      if (!isSearchActive && currentItems.length > 0) renderItems(currentItems, currentRenderId);
      if (isFolder) {
        const folderFiles = await getFolderFilesForCaching(fullPath);
        if (!folderFiles.length) {
          setItemSyncState(stateKey, "error");
          setItemSyncProgress(stateKey, null);
          showToast("Mapa ne vsebuje datotek za lokalno hrambo.");
          return;
        }

        const folderStats = new Map();
        for (const f of folderFiles) {
          const relevantFolders = (f.ancestorFolders || []).filter((p) => p === fullPath || p.startsWith(`${fullPath}/`));
          for (const folderKey of relevantFolders) {
            const stat = folderStats.get(folderKey) || { total: 0, done: 0, active: 0 };
            stat.total += 1;
            folderStats.set(folderKey, stat);
            setItemSyncState(folderKey, "loading");
            setItemSyncProgress(folderKey, 0);
          }
        }
        if (!isSearchActive && currentItems.length > 0) renderItems(currentItems, currentRenderId);

        const updateFolderProgresses = () => {
          for (const [folderKey, stat] of folderStats.entries()) {
            const pct = stat.total > 0 ? ((stat.done + (stat.active / 100)) / stat.total) * 100 : 0;
            setItemSyncProgress(folderKey, pct);
          }
        };

        let ok = 0;
        let fail = 0;
        setTransferProgressStatus({ label: "Prenašanje mape", current: 0, total: folderFiles.length, percent: 0 });
        for (const f of folderFiles) {
          setItemSyncState(f.virtualPath, "loading");
          setItemSyncProgress(f.virtualPath, 0);
          const relevantFolders = (f.ancestorFolders || []).filter((p) => p === fullPath || p.startsWith(`${fullPath}/`));
          try {
            await cacheSingleFile(
              f.storagePath,
              f.fileUrl,
              f.updatedAt,
              (pct) => {
                setItemSyncProgress(f.virtualPath, pct);
                for (const folderKey of relevantFolders) {
                  const stat = folderStats.get(folderKey);
                  if (!stat) continue;
                  stat.active = pct;
                }
                updateFolderProgresses();
                const overall = ((ok + (pct / 100)) / folderFiles.length) * 100;
                setTransferProgressStatus({
                  label: "Prenašanje mape",
                  current: ok + 1,
                  total: folderFiles.length,
                  percent: overall
                });
              }
            );
            setItemSyncState(f.virtualPath, "ready");
            setItemSyncProgress(f.virtualPath, null);
            ok += 1;
          } catch (e) {
            setItemSyncState(f.virtualPath, "error");
            setItemSyncProgress(f.virtualPath, null);
            fail += 1;
          } finally {
            for (const folderKey of relevantFolders) {
              const stat = folderStats.get(folderKey);
              if (!stat) continue;
              stat.done += 1;
              stat.active = 0;
            }
            updateFolderProgresses();
            const overall = ((ok + fail) / folderFiles.length) * 100;
            setTransferProgressStatus({
              label: "Prenašanje mape",
              current: ok + fail,
              total: folderFiles.length,
              percent: overall
            });
          }
        }
        for (const [folderKey] of folderStats.entries()) {
          setItemSyncState(folderKey, fail > 0 && ok === 0 ? "error" : "ready");
          setItemSyncProgress(folderKey, null);
        }
        setItemSyncState(stateKey, fail > 0 && ok === 0 ? "error" : "ready");
        setItemSyncProgress(stateKey, null);
        showToast(`Lokalno shranjeno: ${ok}/${folderFiles.length}${fail ? `, napake: ${fail}` : ""}`);
      } else {
        setTransferProgressStatus({ label: "Prenašanje datoteke", current: 0, total: 1, percent: 0 });
        await cacheSingleFile(storagePath, fileUrl, itemCtx.updatedAt, (pct) => {
          setItemSyncProgress(stateKey, pct);
          setTransferProgressStatus({ label: "Prenašanje datoteke", current: 1, total: 1, percent: pct });
        });
        setItemSyncState(stateKey, "ready");
        setItemSyncProgress(stateKey, null);
        showToast("Datoteka je na voljo brez povezave.");
      }
    }

    if (action === "free") {
      setItemSyncState(stateKey, "loading");
      setItemSyncProgress(stateKey, 0);
      if (!isSearchActive && currentItems.length > 0) renderItems(currentItems, currentRenderId);
      if (isFolder) {
        const folderFiles = await getFolderFilesForCaching(fullPath);
        let removed = 0;
        for (const f of folderFiles) {
          if (await removeSingleCachedFile(f.storagePath, f.fileUrl)) removed += 1;
          setItemSyncState(f.virtualPath, "idle");
          setItemSyncProgress(f.virtualPath, null);
        }
        setItemSyncState(stateKey, "idle");
        setItemSyncProgress(stateKey, null);
        showToast(`Odstranjeno iz naprave: ${removed}`);
      } else {
        await removeSingleCachedFile(storagePath, fileUrl);
        setItemSyncState(stateKey, "idle");
        setItemSyncProgress(stateKey, null);
        showToast("Lokalna kopija odstranjena.");
      }
    }

    if (action === "download") {
      if (isFolder) {
        showToast("Prenos mape ni podprt. Izberi datoteko.");
      } else {
        showDownloadNotification();
        await downloadToComputer(fileName, fileUrl, storagePath);
      }
    }
  } catch (e) {
    setItemSyncState(stateKey, "error");
    showToast(`Akcija ni uspela: ${formatOfflineActionError(e)}`);
  } finally {
    clearTransferProgressStatus();
    closeItemActionMenu();
    if (!isSearchActive && currentItems.length > 0) {
      renderItems(currentItems, currentRenderId);
    }
  }
}

function stripPathSlashes(path) {
  return String(path || "").replace(/^\/+|\/+$/g, "");
}

function normalizeSegmentKey(seg) {
  return String(seg || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function isHiddenIndexFolderSegment(seg) {
  return HIDDEN_INDEX_FOLDER_KEYS.has(normalizeSegmentKey(seg));
}

function virtualizeStoragePath(storagePath) {
  const p = stripPathSlashes(String(storagePath || ""));
  if (!p) return "";
  return p
    .split("/")
    .filter(Boolean)
    .filter((seg) => !isHiddenIndexFolderSegment(seg))
    .join("/");
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
    const loadFromDbFallback = async () => {
      const localRows = await loadRowsFromIndexedDb();
      if (localRows.length > 0) {
        filesTableCache = localRows;
        return localRows;
      }
      throw new Error("Ni lokalnih podatkov za offline način.");
    };

    if (!navigator.onLine) {
      return loadFromDbFallback();
    }

    try {
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
      try {
        await saveRowsToIndexedDb(out);
      } catch (dbErr) {
        console.warn("Shranjevanje metadata v IndexedDB ni uspelo:", dbErr);
      }
      return out;
    } catch (networkErr) {
      console.warn("Supabase branje ni uspelo, preklapljam na IndexedDB:", networkErr);
      return loadFromDbFallback();
    }
  })().finally(() => {
    filesTableCachePromise = null;
  });

  return filesTableCachePromise;
}

async function refreshCachedFilesIfServerUpdated(rows) {
  if (!isStandaloneApp) return;
  if (!navigator.onLine) return;
  const byStoragePath = new Map();
  for (const row of rows || []) {
    const sp = normalizePath(buildStoragePathFromRow(row));
    if (!sp) continue;
    byStoragePath.set(sp, row);
  }

  let refreshedCount = 0;
  const cachedMetaMap = await getCachedMetaMapFromDb();
  for (const [storagePath, meta] of cachedMetaMap.entries()) {
    const serverRow = byStoragePath.get(storagePath);
    if (!serverRow) continue;
    const serverUpdatedAt = getRowTimestamp(serverRow);
    const metaUpdatedAt = meta?.updated_at || null;
    if (serverUpdatedAt && serverUpdatedAt !== metaUpdatedAt) {
      try {
        await cacheSingleFile(storagePath, buildR2UrlFromStoragePath(storagePath), serverUpdatedAt);
        refreshedCount += 1;
      } catch (e) {
        console.warn("Osvežitev lokalne datoteke ni uspela:", storagePath, e);
      }
    }
  }

  if (refreshedCount > 0) {
    showToast(`Posodobljene lokalne datoteke: ${refreshedCount}`);
  }
}

async function syncOfflineMetadataAndCache({ force = false } = {}) {
  if (!navigator.onLine && !force) return;
  isMetadataSyncRunning = true;
  updateConnectionStateChip();
  try {
    const rows = await fetchAllFilesFromTable(true);
    await refreshCachedFilesIfServerUpdated(rows);
    await maybeSyncCatalogIndexLocal({ force });
    lastSyncAtIso = new Date().toISOString();
    await idbPut(OFFLINE_META_STORE, { key: "last_sync_run_at", value: lastSyncAtIso });
    if (!isSearchActive && currentItems.length > 0) {
      renderItems(currentItems, currentRenderId);
    }
  } catch (e) {
    console.warn("Offline sync ni uspel:", e);
  } finally {
    isMetadataSyncRunning = false;
    updateConnectionStateChip();
    updateOfflineEmptyHintVisibility();
  }
}

function buildVirtualItemsForPath(rows, path) {
  const normalizedPath = stripPathSlashes(normalizePath(path || ""));
  const prefix = normalizedPath ? `${normalizedPath}/` : "";
  const folders = new Map();
  const files = [];

  for (const row of rows || []) {
    const filename = row?.filename;
    if (!filename) continue;
    const fullPath = buildStoragePathFromRow(row); // real storage path
    const virtualPath = virtualizeStoragePath(fullPath);
    if (prefix && !virtualPath.startsWith(prefix)) continue;

    const remaining = prefix ? virtualPath.slice(prefix.length) : virtualPath;
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
      const v = virtualizeStoragePath(fullPath);
      return v.startsWith(prefix);
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

function getLastPathSegment(pathStr) {
  const p = String(pathStr || "");
  const parts = p.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/** Prioriteta razvrščanja znotraj podmap:
 * 1 Tehnični katalogi, 2 Vgradni detajli/prerezi, 3 Izjave o lastnostih,
 * 4 ostale mape, 5 PDF, 6 Excel, 7 ostale datoteke.
 */
function getSubfolderSortPriority(item) {
  const isFolder = !item.metadata;
  const name = normalizeSortName(item.name);
  const currentFolder = normalizeSortName(getLastPathSegment(currentPath));

  // Special order for: Notranje predelne stene
  // Desired: Slim, Glass, Double Glass, C55K-NI (then other folders, then files).
  if (isFolder && currentFolder === "notranje predelne stene") {
    if (name.includes("slim")) return 1;
    // "double glass" contains "glass", so check it first.
    if (name.includes("double glass")) return 3;
    if (name.includes("glass")) return 2;
    if (name.includes("c55k ni")) return 4;
    return 10;
  }

  if (isFolder) {
    if (name.includes("tehnicni katalog")) return 1;
    if (name.includes("vgradni detajli") || name.includes("prerezi")) return 2;
    if (name.includes("izjave o lastnostih") || name.includes("izjava o lastnostih")) return 3;
    return 4;
  }

  const ext = (item.name.split(".").pop() || "").toLowerCase();
  // Keep files after folders even in special folder ordering.
  const base = (currentFolder === "notranje predelne stene") ? 50 : 0;
  if (ext === "pdf") return base + 5;
  if (ext === "xls" || ext === "xlsx" || ext === "xlsm" || ext === "xlsb") return base + 6;
  return base + 7;
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

function isAdminEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return ADMIN_EMAILS.has(e);
}

async function getCurrentUserEmail() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session && session.user ? session.user.email : null;
  } catch (e) {
    return null;
  }
}

async function refreshAnnouncements() {
  // Try to load from Supabase (table: announcements). If missing/blocked, fallback to hard-coded.
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,published_at,lead,bullets,note,created_at")
      .order("published_at", { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      announcementsCache = [...FALLBACK_ANNOUNCEMENTS];
    } else {
      announcementsCache = rows.map((r) => ({
        id: r.id,
        title: r.title || "",
        published_at: r.published_at || null,
        lead: r.lead || "",
        bullets: Array.isArray(r.bullets) ? r.bullets : (r.bullets && typeof r.bullets === "object" ? r.bullets : []),
        note: r.note || ""
      }));
    }
  } catch (e) {
    announcementsCache = [...FALLBACK_ANNOUNCEMENTS];
  }

  // Keep UI in sync.
  renderLoginNews();
  if (normalizePath(currentPath) === normalizePath(ANNOUNCEMENTS_ROUTE)) renderAnnouncements();
  if (normalizePath(currentPath) === normalizePath(ADMIN_ROUTE)) renderAdminPage();
}

function showLogin() { 
  document.body.classList.add("login-view");
  document.body.classList.remove("app-view");
  if (loginShell) loginShell.style.display = "grid";
  if (authForm) authForm.style.display = "";
  if (loginNewsCard) loginNewsCard.style.display = "";
  if (loginFooter) loginFooter.style.display = "block";
  appCard.style.display = "none"; 
  document.getElementById("logout").style.display = "none"; 
}

function setDocsUiVisible(visible) {
  if (searchResultsWrapper) searchResultsWrapper.style.display = visible ? "" : "none";
  if (toolbarEl) toolbarEl.style.display = visible ? "" : "none";
  if (searchSectionEl) searchSectionEl.style.display = visible ? "" : "none";
  // updatesBanner and skeletonLoader visibility is controlled by the docs rendering logic;
  // here we only ensure they are hidden on the announcements page.
  if (!visible) {
    if (updatesBanner) updatesBanner.style.display = "none";
    if (skeletonLoader) skeletonLoader.style.display = "none";
  }
}

function showAnnouncementsPage() {
  // Hide "docs" UI and show announcements content.
  setDocsUiVisible(false);
  if (announcementsSection) announcementsSection.style.display = "block";
  if (adminSection) adminSection.style.display = "none";
  if (statusEl) statusEl.textContent = "";
  if (contentTitleDescEl) {
    contentTitleDescEl.style.display = "";
    contentTitleDescEl.innerHTML = "Zadnje pomembne informacije, posodobitve in novosti na portalu.";
  }
  renderAnnouncements();
}

function hideAnnouncementsPage() {
  if (announcementsSection) {
    announcementsSection.style.display = "none";
    announcementsSection.innerHTML = "";
  }
  if (adminSection) {
    adminSection.style.display = "none";
    adminSection.innerHTML = "";
  }
  if (contentTitleDescEl) {
    contentTitleDescEl.style.display = "";
    if (DEFAULT_CONTENT_DESC_HTML) contentTitleDescEl.innerHTML = DEFAULT_CONTENT_DESC_HTML;
  }
  setDocsUiVisible(true);
}

function showAdminPage() {
  setDocsUiVisible(false);
  if (announcementsSection) announcementsSection.style.display = "none";
  if (adminSection) adminSection.style.display = "block";
  if (statusEl) statusEl.textContent = "";
  if (contentTitleDescEl) {
    contentTitleDescEl.style.display = "";
    contentTitleDescEl.innerHTML = "Urejanje obvestil in administracija portala.";
  }
  renderAdminPage();
}

function renderLoginNews() {
  if (!loginNewsMount) return;
  const a =
    (announcementsCache || []).find((x) => x && x.id === LOGIN_ANNOUNCEMENT_ID) ||
    (FALLBACK_ANNOUNCEMENTS || []).find((x) => x && x.id === LOGIN_ANNOUNCEMENT_ID) ||
    (FALLBACK_ANNOUNCEMENTS || [])[0] ||
    null;
  if (!a) return;
  const bullets = (a.bullets || [])
    .slice(0, 6)
    .map((b) => {
      const t = escapeHtml(b.title || "");
      const tx = escapeHtml(b.text || "");
      return `
        <li>
          <strong>${t}</strong>
          <span>${tx}</span>
        </li>
      `;
    })
    .join("");
  loginNewsMount.innerHTML = `
    <div class="login-landing-hero">
      <h2 class="login-landing-title">${escapeHtml(a.title || "")}</h2>
      <p class="login-landing-lead">${escapeHtml(a.lead || "")}</p>
    </div>
    <div class="login-landing-body">
      <ul class="login-landing-grid">${bullets}</ul>
    </div>
  `;
}

function renderAnnouncements() {
  if (!announcementsSection) return;
  const items = [...(announcementsCache || [])].sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
  announcementsSection.innerHTML = `
    <div class="announcements-list">
      ${items
        .map((a, idx) => {
          const published = a.published_at ? formatDate(a.published_at) : "";
          const bullets = (a.bullets || [])
            .map((b) => {
              const t = escapeHtml(b.title || "");
              const tx = escapeHtml(b.text || "");
              return `
                <li>
                  <span class="news-bullet ui-icon" aria-hidden="true">${iconSvg("info")}</span>
                  <span><strong>${t}:</strong> ${tx}</span>
                </li>
              `;
            })
            .join("");
          const badge = idx === 0 ? `<span class="new-badge inline-badge" aria-label="Novo">NOVO</span>` : "";
          return `
            <section class="card login-news-card news-card">
              <div class="news-hero">
                <div class="news-kicker"></div>
                <div class="news-title-row">
                  <h3 class="news-title">${escapeHtml(a.title || "")}</h3>
                  <div class="news-title-right">
                    ${published ? `<span class="news-date">${escapeHtml(published)}</span>` : ""}
                    ${badge}
                  </div>
                </div>
                <p class="news-lead">${escapeHtml(a.lead || "")}</p>
              </div>
              <div class="news-body">
                <h4 class="news-subtitle">Kaj dobite v portalu</h4>
                <ul class="news-list">${bullets}</ul>
                ${a.note ? `<p class="news-note">${escapeHtml(a.note)}</p>` : ""}
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function parseBulletsFromEditor(text) {
  const raw = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = [];
  for (const line of raw) {
    const idx = line.indexOf(":");
    if (idx === -1) {
      bullets.push({ title: line, text: "" });
      continue;
    }
    const t = line.slice(0, idx).trim();
    const tx = line.slice(idx + 1).trim();
    bullets.push({ title: t, text: tx });
  }
  return bullets;
}

function bulletsToEditorText(bullets) {
  const arr = Array.isArray(bullets) ? bullets : [];
  return arr
    .map((b) => {
      const t = (b && b.title) ? String(b.title).trim() : "";
      const tx = (b && b.text) ? String(b.text).trim() : "";
      return tx ? `${t}: ${tx}` : t;
    })
    .filter(Boolean)
    .join("\n");
}

async function upsertAnnouncementAdmin(payload) {
  const email = await getCurrentUserEmail();
  if (!isAdminEmail(email)) throw new Error("Nimate pravic za urejanje obvestil.");
  const { data, error } = await supabase.from("announcements").upsert(payload).select("*");
  if (error) throw error;
  return data;
}

async function deleteAnnouncementAdmin(id) {
  const email = await getCurrentUserEmail();
  if (!isAdminEmail(email)) throw new Error("Nimate pravic za brisanje obvestil.");
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

function renderAdminPage() {
  if (!adminSection) return;
  adminSection.innerHTML = "";

  (async () => {
    const email = await getCurrentUserEmail();
    const isAdmin = isAdminEmail(email);
    if (!isAdmin) {
      adminSection.innerHTML = `<div class="card"><strong>Dostop zavrnjen.</strong><div style="margin-top:8px; color:var(--text-secondary); font-size:13px;">Ta stran je vidna samo administratorju.</div></div>`;
      return;
    }

    const items = [...(announcementsCache || [])].sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));

    const wrap = document.createElement("div");
    wrap.className = "admin-grid";

    const actionsRow = document.createElement("div");
    actionsRow.className = "admin-header";
    actionsRow.innerHTML = `
      <div style="font-size:12px; color:var(--text-secondary); padding-top:10px;">${escapeHtml(email || "")}</div>
      <div class="admin-actions">
        <button type="button" class="admin-btn" id="adminReloadAnnouncementsBtn">Osveži</button>
        <button type="button" class="admin-btn primary" id="adminNewAnnouncementBtn">+ Novo obvestilo</button>
      </div>
    `;
    adminSection.appendChild(actionsRow);
    adminSection.appendChild(wrap);

    const renderEditorCard = (initial) => {
      const a = initial || { id: "", title: "", published_at: new Date().toISOString().slice(0, 10), lead: "", bullets: [], note: "" };
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div style="font-weight:800; color:var(--text-primary);">Urejanje obvestila</div>
          <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(email || "")}</div>
        </div>
        <div style="height:12px;"></div>
        <form class="admin-form" id="adminAnnouncementForm">
          <div class="full">
            <label>Naslov</label>
            <input id="adminA_title" type="text" value="${escapeHtml(a.title || "")}" placeholder="Naslov obvestila" required />
          </div>
          <div>
            <label>Datum objave</label>
            <input id="adminA_published" type="date" value="${escapeHtml(String(a.published_at || '').slice(0,10))}" />
          </div>
          <div></div>
          <div class="full">
            <label>Besedilo (lead)</label>
            <textarea id="adminA_lead" placeholder="Kratek opis...">${escapeHtml(a.lead || "")}</textarea>
          </div>
          <div class="full">
            <label>Točke (bullets)</label>
            <textarea id="adminA_bullets" placeholder="Naslov: besedilo (vsaka vrstica posebej)">${escapeHtml(bulletsToEditorText(a.bullets))}</textarea>
            <div class="hint">Format: <code>Naslov: besedilo</code> (vsaka vrstica je ena točka).</div>
          </div>
          <div class="full">
            <label>Zaključek (note)</label>
            <textarea id="adminA_note" placeholder="Zaključni stavek...">${escapeHtml(a.note || "")}</textarea>
          </div>
          <div class="admin-row-actions full">
            ${a.id ? `<button type="button" class="admin-btn admin-danger" id="adminDeleteAnnouncementBtn">Izbriši</button>` : ""}
            <button type="button" class="admin-btn" id="adminCancelAnnouncementBtn">Prekliči</button>
            <button type="submit" class="admin-btn primary" id="adminSaveAnnouncementBtn">Shrani</button>
          </div>
        </form>
      `;

      const form = card.querySelector("#adminAnnouncementForm");
      const cancelBtn = card.querySelector("#adminCancelAnnouncementBtn");
      const delBtn = card.querySelector("#adminDeleteAnnouncementBtn");
      const reloadBtn = document.getElementById("adminReloadAnnouncementsBtn");

      if (reloadBtn) reloadBtn.onclick = async () => { await refreshAnnouncements(); };
      if (cancelBtn) cancelBtn.onclick = () => { card.remove(); };
      if (delBtn) delBtn.onclick = async () => {
        if (!a.id) return;
        const ok = confirm("Želite izbrisati to obvestilo?");
        if (!ok) return;
        try {
          await deleteAnnouncementAdmin(a.id);
          await refreshAnnouncements();
          card.remove();
        } catch (e) {
          alert("Brisanje ni uspelo: " + (e.message || e));
        }
      };

      if (form) {
        form.onsubmit = async (ev) => {
          ev.preventDefault();
          const title = card.querySelector("#adminA_title").value.trim();
          const published = card.querySelector("#adminA_published").value || null;
          const lead = card.querySelector("#adminA_lead").value.trim();
          const bullets = parseBulletsFromEditor(card.querySelector("#adminA_bullets").value);
          const note = card.querySelector("#adminA_note").value.trim();
          if (!title) return;
          const payload = {
            ...(a.id ? { id: a.id } : {}),
            title,
            published_at: published,
            lead,
            bullets,
            note
          };
          try {
            await upsertAnnouncementAdmin(payload);
            await refreshAnnouncements();
            card.remove();
          } catch (e) {
            alert("Shranjevanje ni uspelo: " + (e.message || e));
          }
        };
      }

      return card;
    };

    // List cards (read-only preview)
    for (const a of items) {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "18px";
      const date = a.published_at ? formatDate(a.published_at) : "—";
      card.innerHTML = `
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
          <div style="font-weight:800; color:var(--text-primary);">${escapeHtml(a.title || "")}</div>
          <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap;">${escapeHtml(date)}</div>
        </div>
        <div style="margin-top:10px; color:var(--text-secondary); font-size:13px; line-height:1.6;">${escapeHtml(a.lead || "")}</div>
        <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="admin-btn" data-edit-id="${escapeHtml(a.id || "")}">Uredi</button>
        </div>
      `;
      const editBtn = card.querySelector("button[data-edit-id]");
      if (editBtn) editBtn.onclick = () => {
        wrap.prepend(renderEditorCard(a));
      };
      wrap.appendChild(card);
    }

    const newBtn = document.getElementById("adminNewAnnouncementBtn");
    if (newBtn) newBtn.onclick = () => {
      wrap.prepend(renderEditorCard(null));
    };

    const reloadBtn2 = document.getElementById("adminReloadAnnouncementsBtn");
    if (reloadBtn2) reloadBtn2.onclick = async () => { await refreshAnnouncements(); };
  })();
}

async function showApp(email) {
  const alreadyVisible = appCard && appCard.style.display === "flex";
  window.scrollTo(0, 0);
  document.body.classList.remove("login-view");
  document.body.classList.add("app-view");
  if (loginShell) loginShell.style.display = "none";
  if (authForm) authForm.style.display = "none";
  if (loginNewsCard) loginNewsCard.style.display = "none";
  if (loginFooter) loginFooter.style.display = "none";
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
  maybeShowOfflineOnboarding();
  syncOfflineMetadataAndCache();

  // Pri že prikazanem portalu ne resetiraj poti in ne kličem loadContent (prepreči skok na Domov ob preklapljanju zaviho)
  if (alreadyVisible) return;
  if (adminLink) adminLink.style.display = isAdminEmail(email) ? "inline" : "none";
  const path = getPathFromUrl();
  currentPath = path;
  updateSidebarNavActive(path);
  updateContentSectionTitle(path);
  if (normalizePath(path) === normalizePath(ADMIN_ROUTE)) showAdminPage();
  else if (normalizePath(path) === normalizePath(ANNOUNCEMENTS_ROUTE)) showAnnouncementsPage();
  else {
    hideAnnouncementsPage();
    loadContent(path);
  }
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
  updateSidebarNavActive(path);
  updateContentSectionTitle(path);
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
  if (normalizePath(path) === normalizePath(ADMIN_ROUTE)) {
    if (mainContent) mainContent.innerHTML = "";
    if (skeletonLoader) skeletonLoader.style.display = "none";
    if (statusEl) statusEl.textContent = "";
    window.history.pushState({ path }, "", "#" + pathToHash(path));
    showAdminPage();
    return;
  }
  if (normalizePath(path) === normalizePath(ANNOUNCEMENTS_ROUTE)) {
    if (mainContent) mainContent.innerHTML = "";
    if (skeletonLoader) skeletonLoader.style.display = "none";
    if (statusEl) statusEl.textContent = "";
    window.history.pushState({ path }, "", "#" + pathToHash(path));
    showAnnouncementsPage();
    return;
  }
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
  hideAnnouncementsPage();
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
  updateSidebarNavActive(p);
  updateContentSectionTitle(p);
  const hasActiveSearch = !!(isSearchActive && searchInput && searchInput.value.trim());
  if (hasActiveSearch) return;
  if (normalizePath(p) === normalizePath(ADMIN_ROUTE)) {
    showAdminPage();
    return;
  }
  if (normalizePath(p) === normalizePath(ANNOUNCEMENTS_ROUTE)) {
    showAnnouncementsPage();
    return;
  }
  hideAnnouncementsPage();
  loadContent(p);
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pdfModal && pdfModal.style.display === 'flex') closePdfViewer(); });
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".item-menu-wrap")) return;
  closeItemActionMenu();
});

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
         const virtualPath = virtualizeStoragePath(fullPath);
         return {
           name: row.filename || "",
           displayName: row.filename || "",
           fullPath,
           virtualPath,
           created_at: getRowTimestamp(row)
         };
       })
       .filter((f) => f.name && isRelevantFile(f.name))
       .filter((f) => !prefix || String(f.virtualPath || "").startsWith(prefix))
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

  updateSidebarNavActive(path);
  updateContentSectionTitle(path);
  
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
  const raw = data
    .filter(i => i.name !== ".emptyFolderPlaceholder")
    // "Ostala dokumentacija" naj bo dosegljiva samo prek sidebar taba, ne med mapami na Domov.
    .filter((i) => {
      const isRoot = !normalizePath(currentPath || "");
      if (!isRoot) return true;
      const isFolder = !i.metadata;
      if (!isFolder) return true;
      return normalizePath(i.name || "") !== normalizePath(OTHER_DOCS_ROOT);
    });
  const imgs = raw.filter(f => f.metadata && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
  imageMap = {}; imgs.forEach(i => imageMap[getBaseName(i.name).toLowerCase()] = i);
  currentItems = raw.filter(f => { if (!f.metadata) return true; return !/\.(jpg|jpeg|png|webp)$/i.test(f.name); });
  if (rId === currentRenderId) await renderItems(currentItems, rId);
}

function updateBreadcrumbs(path) {
  if (normalizePath(path) === normalizePath(ADMIN_ROUTE)) {
    const h = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span> <span style="color:var(--text-tertiary)">/</span> <span class="breadcrumb-item" onclick="navigateTo('${escapeJsSingleQuotedString(ADMIN_ROUTE)}')">Admin</span>`;
    breadcrumbsEl.innerHTML = h;
    if (backBtn) backBtn.style.display = "inline-flex";
    return;
  }
  if (normalizePath(path) === normalizePath(ANNOUNCEMENTS_ROUTE)) {
    const h = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span> <span style="color:var(--text-tertiary)">/</span> <span class="breadcrumb-item" onclick="navigateTo('${escapeJsSingleQuotedString(ANNOUNCEMENTS_ROUTE)}')">Obvestila</span>`;
    breadcrumbsEl.innerHTML = h;
    if (backBtn) backBtn.style.display = "inline-flex";
    return;
  }
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
  cont.className = viewMode === "list" ? "file-container list-view list-compact" : "file-container grid-view";

  if (viewMode === "list") {
    const header = document.createElement("div");
    header.className = "list-header";
    header.innerHTML = `
      <div class="lvh-name">Ime</div>
      <div class="lvh-modified">Posodobljeno</div>
      <div class="lvh-size">Velikost</div>
      <div class="lvh-actions"></div>
    `;
    cont.appendChild(header);
  }
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
	       const aLast = LAST_ROOT_FOLDER_KEYS.has(normalizeSegmentKey(a.name));
	       const bLast = LAST_ROOT_FOLDER_KEYS.has(normalizeSegmentKey(b.name));
	       if (aLast !== bLast) return aLast ? 1 : -1;
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

function buildSyncStatusHtml({ isFolder, isCached, syncState }) {
  if (!isStandaloneApp) return "";
  if (syncState === "loading") {
    return `<span class="sync-status-icon loading" title="Sinhronizacija v teku"><span class="sync-spinner" aria-hidden="true"></span></span>`;
  }
  if (syncState === "error") {
    return `<span class="sync-status-icon error" title="Sinhronizacija ni uspela">!</span>`;
  }
  if (isFolder) {
    return `<span class="sync-status-icon cloud" title="Mapa je na voljo ob povezavi">${iconSvg("cloud")}</span>`;
  }
  if (isCached) {
    return `<span class="sync-status-icon ready" title="Datoteka je na voljo brez povezave">${iconSvg("cloudCheck")}</span>`;
  }
  return `<span class="sync-status-icon cloud" title="Datoteka ni shranjena lokalno">${iconSvg("cloud")}</span>`;
}

function buildItemActionMenuHtml({ disableOfflineActions = false, offlineOnlyHint = false }) {
  const hintAttr = offlineOnlyHint ? `title="Na voljo v nameščeni aplikaciji"` : "";
  return `
    <div class="item-menu-wrap">
      <button type="button" class="item-menu-btn" title="Več možnosti" aria-label="Več možnosti">
        <span class="ui-icon" aria-hidden="true">${iconSvg("dotsVertical")}</span>
      </button>
      <div class="item-menu-dropdown" role="menu">
        <button type="button" class="item-menu-action" data-action="cache" role="menuitem" ${disableOfflineActions ? "disabled" : ""} ${hintAttr}>Na voljo brez povezave</button>
        <button type="button" class="item-menu-action" data-action="free" role="menuitem" ${disableOfflineActions ? "disabled" : ""} ${hintAttr}>Sprosti prostor</button>
        <button type="button" class="item-menu-action" data-action="download" role="menuitem">Prenesi na računalnik</button>
      </div>
    </div>
  `;
}

// Enaka struktura in razredi za vsako kartico (koren in vse podmape) – brez dodatnih razredov glede na globino.
async function createItemElement(item, cont) {
    const isFolder = !item.metadata;
    const div = document.createElement("div");
    div.className = isFolder ? "item item-card folder-item" : "item item-card";
    const full = currentPath ? `${currentPath}/${item.name}` : item.name;
    const clean = normalizePath(full);
    let badges = "";

    if (isFolder) {
      const hasUpdatesInFolder = folderHasUpdatesByCurrentPathCache(full);
      badges = hasUpdatesInFolder
        ? `<span class="new-badge" style="display:inline-block">NOVO</span>`
        : `<span class="new-badge" style="display:none">NOVO</span>`;
    } else if (isRelevantFile(item.name) && isAfterUpdatesSince(item.created_at)) {
      badges = `<span class="new-badge" style="display:inline-block">NOVO</span>`;
    }

    const safeItemName = escapeJsSingleQuotedString(item.name);
    const favBtnHtml = isFolder ? `<button class="fav-btn ${favorites.includes(clean) ? "active" : ""}" onclick="toggleFavorite(event, '${safeItemName}')">★</button>` : "";
    const base = getBaseName(item.name).toLowerCase();
    const ext = item.name.split(".").pop().toLowerCase();
    const isLinkFile = !isFolder && isUrlLinkFile(item.name);
    const storagePath = !isFolder ? normalizePath(buildStoragePathFromRow(item)) : "";
    const fileUrl = !isFolder ? buildR2UrlFromStoragePath(storagePath) : "";
    const isCachedOffline = !isFolder ? await isPathCachedOffline(storagePath, fileUrl) : false;
    const syncStateKey = isFolder ? full : storagePath;
    const syncState = getItemSyncState(syncStateKey);
    const syncStatusHtml = buildSyncStatusHtml({ isFolder, isCached: isCachedOffline, syncState });

    let icon = "";
    if (isFolder) {
      icon = `<div class="big-icon">${iconSvg(getIconForName(base))}</div>`;
    } else if (isLinkFile) {
      icon = `<div class="big-icon">${iconSvg("link")}</div>`;
    } else if (item.name.toLowerCase().endsWith("dwg") || item.name.toLowerCase().endsWith("dxf")) {
      icon = `<div class="big-icon">${iconSvg("ruler")}</div>`;
    } else {
      icon = `<div class="big-icon">${iconSvg(getFileIconKeyForExt(ext))}</div>`;
    }

    const isPdf = !isFolder && item.name.toLowerCase().endsWith("pdf");
    if (imageMap[base] && !(viewMode === "list" && isPdf)) {
      const imagePath = imageMap[base].fullPath || (currentPath ? `${currentPath}/${imageMap[base].name}` : imageMap[base].name);
      const cacheKey = imagePath;
      const fallbackIcon = isFolder ? getIconForName(base) : (isLinkFile ? "link" : getFileIconKeyForExt(ext));
      if (imageUrlCache[cacheKey]) {
        icon = `<div class="big-icon thumb-fallback">${iconSvg(fallbackIcon)}</div><img src="${imageUrlCache[cacheKey]}" loading="lazy" onload="if(this.previousElementSibling){this.previousElementSibling.style.display='none';}" onerror="if(this.previousElementSibling){this.previousElementSibling.style.display='flex';} this.remove();" />`;
      } else {
        const imageUrl = buildR2UrlFromStoragePath(imagePath);
        imageUrlCache[cacheKey] = imageUrl;
        icon = `<div class="big-icon thumb-fallback">${iconSvg(fallbackIcon)}</div><img src="${imageUrl}" loading="lazy" onload="if(this.previousElementSibling){this.previousElementSibling.style.display='none';}" onerror="if(this.previousElementSibling){this.previousElementSibling.style.display='flex';} this.remove();" />`;
      }
    }

    const fileSizeBytes = item.metadata && typeof item.metadata.size === "number" ? item.metadata.size : 0;
    const fileSize = isFolder ? "Mapa" : (fileSizeBytes > 0 ? `${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB` : "—");
    const dateInfo = !isFolder && item.created_at ? `<span class="item-date">Datum posodobitve: ${formatDate(item.created_at)}</span>` : "";
    const modifiedText = item.created_at ? formatDate(item.created_at) : "—";
    const previewHtml = `<div class="item-preview ${isFolder ? "folder-bg" : "file-bg"}">${icon}</div>`;
    const infoHtml = `<div class="item-info"><strong>${formatDisplayName(item.name)} ${syncStatusHtml}</strong><small>${fileSize}</small>${dateInfo}</div>`;
    const actionsMenuHtml = showPwaItemActionMenu
      ? buildItemActionMenuHtml({
          disableOfflineActions: !supportsOfflineStorage || !isStandaloneApp,
          offlineOnlyHint: !isStandaloneApp
        })
      : "";

    if (viewMode === "list") {
      const sizeCol = isFolder ? "—" : fileSize;
      const metaLine = isFolder ? "Mapa" : `${modifiedText}${sizeCol && sizeCol !== "—" ? ` · ${sizeCol}` : ""}`;
      div.innerHTML = `
        <div class="lv-name">
          ${previewHtml}
          <div class="lv-title">
            <div class="lv-title-line">
              <strong>${escapeHtml(formatDisplayName(item.name))}</strong>
              ${syncStatusHtml}
              ${badges}
            </div>
            <small class="lv-meta">${escapeHtml(metaLine)}</small>
          </div>
        </div>
        <div class="lv-modified">${escapeHtml(modifiedText)}</div>
        <div class="lv-size">${escapeHtml(sizeCol)}</div>
        <div class="lv-actions">${favBtnHtml}${actionsMenuHtml}</div>
      `;
    } else {
      div.innerHTML = `${favBtnHtml}${badges}${actionsMenuHtml}${previewHtml}${infoHtml}`;
    }

    const hasOfflineAccess = !isStandaloneApp || isFolder || isCachedOffline || navigator.onLine;
    if (!hasOfflineAccess) div.classList.add("offline-unavailable");

    if (fileUrl) div.dataset.fileUrl = fileUrl;
    div.onclick = async () => {
      if (isFolder) {
        navigateTo(full);
        return;
      }
      if (isLinkFile) {
        handleUrlFile(full);
        return;
      }
      if (!navigator.onLine && !isCachedOffline) {
        showToast("Ni internetne povezave. Datoteka ni shranjena lokalno.");
        return;
      }
      if (!navigator.onLine && isCachedOffline) {
        const opened = await openCachedFile(item.name, storagePath, fileUrl);
        if (!opened) showToast("Datoteke ni mogoče odpreti brez povezave.");
        return;
      }
      openPdfViewer(item.name, full, null, fileUrl);
    };

    if (showPwaItemActionMenu) {
      const menuWrap = div.querySelector(".item-menu-wrap");
      const menuBtn = div.querySelector(".item-menu-btn");
      if (menuBtn && menuWrap) {
        menuBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleItemActionMenu(menuWrap);
        });
      }
      div.querySelectorAll(".item-menu-action").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const action = btn.getAttribute("data-action");
          await handleItemAction(action, {
            isFolder,
            fullPath: full,
            storagePath,
            fileName: item.name,
            fileUrl,
            updatedAt: getRowTimestamp(item)
          });
        });
      });
    }

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

function normalizeTitleKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

const CATALOG_PAGE_TITLE_TRANSLATIONS = new Map([
  ["nodi tipici", "Tipični prerezi"],
  ["profili fermavetro", "Steklitvene letvice"],
  ["profili anta", "Profili krila"],
  ["guarnizioni e profili in plastica", "Tesnila in plastični profili"],
  ["trasmittanza termica u", "Toplotna prehodnost"],
  ["distinte di taglio", "Razrezne liste"],
  ["accessori", "Okovje"],
  ["accessori di chiusura", "Okovje"],
  ["indice profili", "Profili"],
  ["sinottico", "Zbor profilov"],
  ["profili stipite", "Profili fiksov"]
]);

function translateCatalogPageTitle(title) {
  const t = String(title || "").trim();
  if (!t) return "";
  const mapped = CATALOG_PAGE_TITLE_TRANSLATIONS.get(normalizeTitleKey(t));
  return mapped || t;
}

function resolveCatalogPdfPath(pdfFilenameOrPath) {
  const raw = stripPathSlashes(String(pdfFilenameOrPath || "").trim());
  if (!raw) return null;
  const list = window.globalFileList;
  if (Array.isArray(list) && list.length) {
    for (const f of list) {
      if (!f || !f.metadata) continue;
      const real = stripPathSlashes(String(f.fullPath || ""));
      if (!real) continue;
      if (real === raw) return f.fullPath;
      const virt = virtualizeStoragePath(real);
      if (virt === raw) return f.fullPath;
    }
  }
  // Fallback: try by basename (handles cases where catalog_index stores a path or a different folder).
  const base = raw.includes("/") ? raw.split("/").pop() : raw;
  return findPathForFilename(base);
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
  if (!navigator.onLine) {
    const local = await searchLocalCatalogIndex(query);
    if (statusEl && local.catalogTotalCount > 0) {
      statusEl.textContent = `Offline iskanje šifer: ${local.catalogTotalCount} zadetkov`;
    }
    return local;
  }
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
      if (error) {
        const local = await searchLocalCatalogIndex(query);
        return local.catalogTotalCount > 0 ? local : out;
      }
      const batch = Array.isArray(data) ? data : [];
      if (batch.length === 0) break;
      indexRows = indexRows.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (indexRows.length === 0) return out;
    return groupCatalogIndexRows(indexRows);
  } catch (e) {
    console.warn("searchSupabaseCatalog error:", e);
    const local = await searchLocalCatalogIndex(query);
    return local.catalogTotalCount > 0 ? local : out;
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
        const onlyCatalog = hasCatalogResults && !hasMapResults;
        const initialLimit = getDynamicSearchInitialLimit({ hasMapResults, hasCatalogResults });
        // When we only have catalog results, show everything immediately (no "Pokaži več").
        const catalogNeedsMore = !onlyCatalog && hasCatalogResults && catalogTotalCount > initialLimit;
        const mapsNeedsMore = hasMapResults && fileCount > initialLimit;
        let isExpanded = false;

        if (mainContent) mainContent.style.display = "";

        let catalogGrid = null;
        const catalogEntries = Object.entries(groupedByPdf);
        const renderCatalogResults = (expanded) => {
          if (!catalogGrid) return;
          catalogGrid.innerHTML = "";
          const maxItems = (expanded || onlyCatalog) ? Number.MAX_SAFE_INTEGER : initialLimit;
          let shown = 0;
          for (const [filename, pageEntries] of catalogEntries) {
            const displayFilename = String(filename || "").split("/").pop() || String(filename || "");
            const visibleEntries = [];
            for (const entry of pageEntries) {
              if (shown >= maxItems) break;
              visibleEntries.push(entry);
              shown++;
            }
            if (!visibleEntries.length) continue;

            const fullPath = resolveCatalogPdfPath(filename);
            const card = document.createElement("div");
            card.className = "catalog-card";
            const header = document.createElement("div");
            header.className = "catalog-card-header";
            header.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span>${formatDisplayName(displayFilename)}</span>
            `;
            card.appendChild(header);
            const list = document.createElement("div");
            list.className = "match-list";
            visibleEntries.forEach(({ page, title }) => {
              const link = document.createElement("a");
              link.className = "match-item";
              if (fullPath) {
                // Open the real PDF directly from R2 when user opens in a new tab or copies link.
                const r2Url = buildR2UrlFromStoragePath(fullPath);
                link.href = `${r2Url}#page=${page}`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
              } else {
                // Fallback: keep it clickable via JS, but don't navigate to a non-existent local URL.
                link.href = "#";
              }
              // Always prevent default so we don't jump to top on href="#".
              link.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fullPath && typeof window.openPdfViewer === "function") {
                  window.openPdfViewer(displayFilename, fullPath, page);
                } else if (statusEl) {
                  statusEl.textContent = "Kataloga ni mogoče najti v bazi datotek. Najprej osvežite kataloge.";
                  statusEl.style.color = "var(--error)";
                }
              });
              const titleText = title ? translateCatalogPageTitle(title) : `Stran ${page}`;
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
            catalogGrid.className = "catalog-grid" + (!hasMapResults ? " single-column" : "");
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
          const realPath = String(item.fullPath || "");
          const displayPath = virtualizeStoragePath(realPath) || realPath;
          const pathParts = displayPath.split("/");
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
  if (!navigator.onLine) {
    const opened = await openCachedFile(fn, p, fileUrl);
    if (!opened) {
      showToast("Ni internetne povezave. Datoteka ni shranjena lokalno.");
    }
    return;
  }
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
  if (currentViewerBlobUrl) {
    URL.revokeObjectURL(currentViewerBlobUrl);
    currentViewerBlobUrl = null;
  }
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

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.warn("Service worker registracija ni uspela:", e);
  }
}

function setupInstallPrompt() {
  if (!installAppBtn) return;

  installAppBtn.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      installAppBtn.style.display = "none";
      return;
    }
    showToast("Namestitev: odpri meni brskalnika in izberi 'Install app' ali 'Add to Home Screen'.");
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installAppBtn.style.display = "inline-flex";
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installAppBtn.style.display = "none";
  });

  if (!isStandaloneApp) {
    installAppBtn.style.display = "inline-flex";
  } else {
    installAppBtn.style.display = "none";
  }
}

function setupOfflineOnboarding() {
  if (!offlineOnboardingModal || !offlineOnboardingClose) return;
  const close = () => {
    offlineOnboardingModal.style.display = "none";
    offlineOnboardingModal.setAttribute("aria-hidden", "true");
    try {
      localStorage.setItem(OFFLINE_ONBOARDING_KEY, "1");
    } catch (e) {}
  };
  offlineOnboardingClose.addEventListener("click", close);
  offlineOnboardingModal.addEventListener("click", (e) => {
    if (e.target === offlineOnboardingModal) close();
  });
}

function maybeShowOfflineOnboarding() {
  if (!offlineOnboardingModal) return;
  let seen = false;
  try {
    seen = localStorage.getItem(OFFLINE_ONBOARDING_KEY) === "1";
  } catch (e) {}
  if (seen) return;
  offlineOnboardingModal.style.display = "flex";
  offlineOnboardingModal.setAttribute("aria-hidden", "false");
}

function setupConnectivityHandlers() {
  window.addEventListener("online", () => {
    updateConnectionStateChip();
    showToast("Povezava je vzpostavljena. Sinhroniziram podatke...");
    syncOfflineMetadataAndCache();
  });
  window.addEventListener("offline", () => {
    updateConnectionStateChip();
    showToast("Trenutno ste brez povezave.");
    updateOfflineEmptyHintVisibility();
    if (!isSearchActive && currentItems.length > 0) renderItems(currentItems, currentRenderId);
  });
}

function setupPeriodicOfflineSync() {
  const intervalMs = 5 * 60 * 1000;
  setInterval(() => {
    if (!navigator.onLine) return;
    syncOfflineMetadataAndCache();
  }, intervalMs);
}

async function initConnectionState() {
  try {
    const row = await idbGet(OFFLINE_META_STORE, "last_sync_run_at");
    lastSyncAtIso = row?.value || null;
  } catch (e) {
    lastSyncAtIso = null;
  }
  updateConnectionStateChip();
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
setupInstallPrompt();
setupOfflineOnboarding();
setupConnectivityHandlers();
setupPeriodicOfflineSync();
initConnectionState();
registerServiceWorker();
refreshAnnouncements();
renderLoginNews();

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
