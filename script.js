import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ugwchsznxsuxbxdvigsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2Noc3pueHN1eGJ4ZHZpZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY0NzEsImV4cCI6MjA4NDY5MjQ3MX0.iFzB--KryoBedjIJnybL55-xfQFIBxWnKq9RqwxuyK4";
const ADMIN_EMAIL = "miha@aluk.si"; 

// --- KONFIGURACIJA ---
const customSortOrder = [
  "Okenski sistemi", "Vratni sistemi", "Panoramski sistemi",
  "Fasadni sistemi", "Pisarniski sistemi", "Dekorativne obloge Skin"
];
const relevantExtensions = ['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'dwg', 'dxf', 'zip', 'rar', '7z'];
const folderIcons = {
  "tehničn": "🛠️", "katalog": "🛠️", "galerij": "📷", "foto": "📷", "referenc": "📷",
  "certifikat": "🎖️", "izjav": "🎖️", "vgradni": "📐", "prerezi": "📐", "navodil": "ℹ️", "obdelav": "ℹ️"
};
const fileIcons = {
  "pdf": "📕", "xls": "📊", "xlsx": "📊", "csv": "📊", "doc": "📝", "docx": "📝",
  "zip": "📦", "rar": "📦", "7z": "📦", "jpg": "🖼️", "jpeg": "🖼️", "png": "🖼️", "webp": "🖼️"
};

// --- VARNOSTNA FUNKCIJA ZA DOM DOSTOP (definirana na vrhu!) ---
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element z ID "${id}" ni najden.`);
  return el;
}

// Nastavi mailto link za request access (varno)
const requestAccessBtn = getElement("requestAccessBtn");
if (requestAccessBtn) {
  requestAccessBtn.href = `mailto:${ADMIN_EMAIL}?subject=Prijava v AluK Portal&body=Prošnja za dostop...`;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'aluk-portal-auth' }
});

// DOM ELEMENTI (z varnostnimi preverjanji)
const authForm = getElement("authForm");
const appCard = getElement("appCard");
const mainContent = getElement("mainContent");
const skeletonLoader = getElement("skeletonLoader");
const statusEl = getElement("status");
const searchInput = getElement("search");
const breadcrumbsEl = getElement("breadcrumbs");
const msgEl = getElement("authMsg");
const updatesBanner = getElement("updatesBanner");
const updatesList = getElement("updatesList");
const lastUpdateDateEl = getElement("lastUpdateDate");
const showMoreUpdatesBtn = getElement("showMoreUpdates");
const pdfModal = getElement("pdfModal");
const pdfFrame = getElement("pdfFrame");
const viewerFileName = getElement("viewerFileName");
const btnGrid = getElement("btnGrid");
const btnList = getElement("btnList");
const globalFavorites = getElement("globalFavorites");
const globalFavContainer = getElement("globalFavContainer");

let currentPath = ""; 
let currentItems = [];
let imageMap = {}; 
let favorites = loadFavorites();
let viewMode = localStorage.getItem('aluk_view_mode') || 'grid';
let folderCache = {}; 
let currentRenderId = 0; 

// --- ISKANJE (Cache) ---
let articleDatabase = [];
let isDataLoaded = false;

// --- POMOŽNE FUNKCIJE ---
function normalizePath(path) { if (!path) return ""; try { return decodeURIComponent(path).trim(); } catch (e) { return path.trim(); } }
function loadFavorites() { try { let raw = JSON.parse(localStorage.getItem('aluk_favorites') || '[]'); return [...new Set(raw.map(f => normalizePath(f)))].filter(f => f); } catch(e) { return []; } }
function saveFavorites(favs) { localStorage.setItem('aluk_favorites', JSON.stringify(favs)); }
function getCustomSortIndex(name) { 
  const i = customSortOrder.indexOf(name); 
  if (i !== -1) return i;
  const partial = customSortOrder.findIndex(o => name.includes(o));
  return partial === -1 ? 999 : partial;
}
function formatDate(iso) { if (!iso) return ""; return new Date(iso).toLocaleDateString('sl-SI'); }
function getBaseName(fn) { const i = fn.lastIndexOf('.'); return i === -1 ? fn : fn.substring(0, i); }
function getIconForName(name) { const l = name.toLowerCase(); for (const [k, e] of Object.entries(folderIcons)) if (l.includes(k)) return e; return "📂"; }
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

function showApp(email) {
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
        if (d.name) userLine.textContent = `👤 ${d.name}, ${d.company}`; 
      } 
    } catch (e) {}
    if (!userLine.textContent) userLine.textContent = `👤 ${email}`;
  }
  
  // Posodobi čas v notranjosti portala
  const buildDateInner = getElement("buildDateInner");
  if (buildDateInner) {
    buildDateInner.textContent = "27.1.2026 11:55";
  }
  
  setViewMode(viewMode);
  renderGlobalFavorites();
  const path = getPathFromUrl();
  currentPath = path;
  loadContent(path);
}

document.getElementById("logout").addEventListener("click", async () => { 
  await supabase.auth.signOut(); 
  showLogin(); // Namesto reload, samo pokaži login
});

// --- NAVIGACIJA ---
window.navigateTo = function(path) { currentPath = path; searchInput.value = ""; window.history.pushState({ path }, "", "#" + path); loadContent(path); }
function getPathFromUrl() { const h = window.location.hash; if (!h || h.length <= 1 || h.startsWith("#view=")) return ""; return decodeURIComponent(h.slice(1)); }
window.addEventListener('popstate', () => { pdfModal.style.display = 'none'; pdfFrame.src = ""; const p = getPathFromUrl(); currentPath = p; loadContent(p); });

// --- REKURZIVNO ISKANJE (Banner) ---
async function getNewFilesRecursive(path, depth = 0) {
   if (depth > 2) return [];
   const d30 = new Date(); d30.setDate(d30.getDate() - 30);
   const { data } = await supabase.storage.from('Catalogs').list(path, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
   if (!data) return [];
   let all = [];
   const files = data.filter(i => i.metadata);
   all = [...all, ...files.filter(f => isRelevantFile(f.name) && new Date(f.created_at) > d30).map(f => ({...f, displayName: f.name, fullPath: path ? `${path}/${f.name}` : f.name}))];
   const folders = data.filter(i => !i.metadata && i.name !== ".emptyFolderPlaceholder");
   const sub = await Promise.all(folders.map(async f => {
       const s = await getNewFilesRecursive(path ? `${path}/${f.name}` : f.name, depth + 1);
       return s.map(sf => depth === 0 ? {...sf, displayName: `${f.name} / ${sf.name}`} : sf);
   }));
   sub.forEach(g => all = [...all, ...g]);
   return all;
}

// --- NALAGANJE VSEBINE ---
async function loadContent(path) {
  statusEl.textContent = ""; updateBreadcrumbs(path); currentRenderId++; const thisId = currentRenderId;
  if (path === "") updatesBanner.style.display = "none"; else updateBannerAsync(path);
  if (folderCache[path]) await processDataAndRender(folderCache[path], thisId); else { mainContent.innerHTML = ""; skeletonLoader.style.display = "grid"; }
  const { data, error } = await supabase.storage.from('Catalogs').list(path, { sortBy: { column: 'name', order: 'asc' }, limit: 1000 });
  skeletonLoader.style.display = "none";
  if (error) { statusEl.textContent = "Napaka pri branju."; return; }
  if (thisId === currentRenderId) { folderCache[path] = data; await processDataAndRender(data, thisId); }
}

async function updateBannerAsync(path) {
    updatesList.innerHTML = ""; showMoreUpdatesBtn.style.display = "none"; updatesBanner.style.display = "none";
    const newFiles = await getNewFilesRecursive(path, 0);
    if (newFiles.length === 0) return;
    newFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    updatesBanner.style.display = "block"; lastUpdateDateEl.textContent = `Zadnja sprememba: ${formatDate(newFiles[0].created_at)}`;
    const show = (list) => list.forEach(f => { const li = document.createElement("li"); li.innerHTML = `<span style="cursor:pointer; color:#334155" onclick="openFileFromBanner('${f.fullPath}')"><strong>${f.displayName||f.name}</strong></span> <small>(${formatDate(f.created_at)})</small>`; updatesList.appendChild(li); });
    show(newFiles.slice(0, 5));
    if (newFiles.length > 5) { showMoreUpdatesBtn.style.display = "block"; showMoreUpdatesBtn.onclick = () => { show(newFiles.slice(5)); showMoreUpdatesBtn.style.display = "none"; }; }
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
  const p = path ? path.split('/') : [];
  let h = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span>`, b = "";
  p.forEach((pt, i) => { b += (i > 0 ? "/" : "") + pt; h += ` <span style="color:#ccc">/</span> <span class="breadcrumb-item" onclick="navigateTo('${b}')">${decodeURIComponent(pt)}</span>`; });
  breadcrumbsEl.innerHTML = h;
}

// --- RENDER SEZNAMA ---
async function renderItems(items, rId) {
  if (rId !== currentRenderId) return;
  if (items.length === 0) { mainContent.innerHTML = ""; statusEl.textContent = "Mapa je prazna."; return; }
  statusEl.textContent = `${items.length} elementov`;
  const cont = document.createElement("div"); cont.className = `file-container ${viewMode}-view`;
  favorites = loadFavorites();
  const favs = [], norms = [];
  items.forEach(i => { const p = normalizePath(currentPath ? `${currentPath}/${i.name}` : i.name); (!i.metadata && favorites.includes(p)) ? favs.push(i) : norms.push(i); });
  const sorted = [...favs, ...norms].sort((a, b) => {
     const fa = !a.metadata, fb = !b.metadata;
     if (fa && !fb) return -1; if (!fa && fb) return 1;
     if (fa && fb) { const ia = getCustomSortIndex(a.name), ib = getCustomSortIndex(b.name); if (ia !== ib) return ia - ib; }
     return a.name.localeCompare(b.name);
  });
  for (const item of sorted) { if (rId !== currentRenderId) return; await createItemElement(item, cont); }
  if (rId === currentRenderId) { mainContent.innerHTML = ""; mainContent.appendChild(cont); }
}

async function createItemElement(item, cont) {
    const isFolder = !item.metadata; const div = document.createElement("div"); div.className = "item";
    const full = currentPath ? `${currentPath}/${item.name}` : item.name; const clean = normalizePath(full);
    let badges = "";
    if (isFolder) {
        const isFav = favorites.includes(clean);
        div.innerHTML += `<button class="fav-btn ${isFav?'active':''}" onclick="toggleFavorite(event, '${item.name}')">★</button>`;
        if (currentPath.toLowerCase().includes("sistem")) {
            const sys = currentPath.split('/').pop().split(' ').pop();
            if (!item.name.includes(sys) && /tehni|vgrad|prerez/i.test(item.name)) badges += `<span class="system-badge" style="top:10px;">${sys}</span>`;
        }
        getNewFilesRecursive(full, 0).then(n => { if(n.length>0) { const b=div.querySelector('.new-badge'); if(b) b.style.display='inline-block'; const s=div.querySelector('.system-badge'); if(s) s.style.top='36px'; } });
    } else if (isRelevantFile(item.name) && item.created_at && new Date(item.created_at) > new Date(Date.now() - 30*24*3600*1000)) {
        badges += `<span class="new-badge" style="display:inline-block">NOVO</span>`;
    }
    badges = `<span class="new-badge" style="display:none">NOVO</span>` + badges; // Placeholder za async folder check
    
    const base = getBaseName(item.name).toLowerCase();
    let icon = isFolder ? `<div class="big-icon">${getIconForName(base)}</div>` : `<div class="big-icon">${fileIcons[item.name.split('.').pop().toLowerCase()]||"📄"}</div>`;
    if (item.name.toLowerCase().endsWith('dwg') || item.name.toLowerCase().endsWith('dxf')) icon = `<img src="dwg-file.png" class="icon-img" onerror="this.outerHTML='<div class=\\'big-icon\\'>📐</div>'">`;
    if (imageMap[base]) { const { data } = await supabase.storage.from('Catalogs').createSignedUrl(currentPath ? `${currentPath}/${imageMap[base].name}` : imageMap[base].name, 3600); if (data) icon = `<img src="${data.signedUrl}" loading="lazy" />`; }

    div.innerHTML = (isFolder ? `<button class="fav-btn ${favorites.includes(clean)?'active':''}" onclick="toggleFavorite(event, '${item.name}')">★</button>` : '') + 
                    badges + 
                    `<div class="item-preview ${isFolder?'folder-bg':'file-bg'}">${icon}</div>` +
                    `<div class="item-info"><strong>${item.name}</strong><small>${isFolder?'Mapa':(item.metadata.size/1024/1024).toFixed(2)+' MB'}</small>${!isFolder&&item.created_at?`<br><span style="font-size:10px;color:#999">${formatDate(item.created_at)}</span>`:''}</div>`;
    
    div.onclick = () => isFolder ? navigateTo(full) : openPdfViewer(item.name, full);
    cont.appendChild(div);
}

// --- GLOBALNI PRILJUBLJENI ---
async function renderGlobalFavorites() {
  favorites = loadFavorites(); if (favorites.length === 0) { globalFavorites.style.display = "none"; return; }
  globalFavorites.style.display = "block"; globalFavContainer.innerHTML = ""; globalFavContainer.className = `file-container grid-view`;
  for (const p of favorites) {
      const name = p.split('/').pop(); const div = document.createElement("div"); div.className = "item";
      const news = await getNewFilesRecursive(p, 0);
      div.innerHTML = `<div class="item-preview folder-bg" style="height:100px;"><div class="big-icon" style="font-size:40px;">${getIconForName(name)}</div></div>
                       <div class="item-info" style="padding:10px;"><strong style="font-size:13px;">${name}</strong></div>
                       ${news.length>0 ? '<span class="new-badge" style="display:inline-block">NOVO</span>' : ''}
                       <button class="fav-btn active" style="top:5px; left:5px;">★</button>`;
      div.onclick = () => navigateTo(p);
      div.querySelector('.fav-btn').onclick = (e) => { e.stopPropagation(); favorites = favorites.filter(f => f !== p); saveFavorites(favorites); renderGlobalFavorites(); renderItems(currentItems, currentRenderId); };
      globalFavContainer.appendChild(div);
  }
}
window.toggleFavorite = function(e, name) { e.stopPropagation(); const p = normalizePath(currentPath ? `${currentPath}/${name}` : name); favorites = loadFavorites(); if (favorites.includes(p)) favorites = favorites.filter(f => f !== p); else favorites.push(p); saveFavorites(favorites); renderGlobalFavorites(); renderItems(currentItems, currentRenderId); }

// --- ISKANJE (VSE: Šifrant + PDF Index) ---
async function loadSearchData() {
    if (isDataLoaded) return;
    try {
        const artRes = await fetch('/sifrant.json?v=99');
        if (artRes.ok) articleDatabase = await artRes.json();
        isDataLoaded = true;
    } catch (e) { 
        console.error("Napaka pri nalaganju iskalnih baz", e); 
    }
}

// Debounce za iskanje (optimizacija)
let searchTimeout = null;

if (searchInput) {
  searchInput.addEventListener("input", async (e) => {
    // Debounce - počakaj 300ms preden iščeš
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const val = e.target.value.trim();
    
    if (!val) { 
      if (currentItems.length > 0) renderItems(currentItems, currentRenderId); 
      return; 
    }
    
    searchTimeout = setTimeout(async () => {
        const lowerVal = val.toLowerCase();
        
        if (!isDataLoaded) await loadSearchData();

        currentRenderId++; 
        if (mainContent) mainContent.innerHTML = "";
        if (statusEl) statusEl.textContent = "Iščem po vseh mapah...";
        
        const resCont = document.createElement("div"); 
        resCont.className = "file-container list-view";
        let found = false;

        // 1. Iskanje po ŠIFRANTU
        const arts = articleDatabase.filter(a => 
            a.sifra.toLowerCase().includes(lowerVal) || 
            a.opis.toLowerCase().includes(lowerVal)
        ).slice(0, 20);
        
        if (arts.length > 0) {
            found = true;
            resCont.innerHTML += `<h3 style="grid-column:1/-1; margin-bottom:10px; color:#2563eb">Najdeno v šifrantu artiklov (${arts.length}):</h3>`;
            arts.forEach(a => {
                resCont.innerHTML += `<div class="item" style="cursor:default"><div class="item-preview file-bg" style="background:#eff6ff"><div class="big-icon">🏷️</div></div><div class="item-info"><strong style="color:#1e40af">${a.sifra}</strong><small style="color:#334155">${a.opis}</small></div></div>`;
            });
        }

        // 2. REKURZIVNO ISKANJE PO VSEH MAPAH
        console.log("🔍 Začenjam rekurzivno iskanje za:", val);
        const allMatches = await searchAllFilesRecursive("", val, 0, 10, 200);
        console.log("✅ Iskanje končano, najdeno:", allMatches.length, "rezultatov");
        
        if (allMatches.length > 0) {
            found = true;
            if (arts.length > 0) {
                resCont.innerHTML += `<div style="grid-column:1/-1; border-top:1px solid #e2e8f0; margin:20px 0;"></div>`;
            }
            resCont.innerHTML += `<h3 style="grid-column:1/-1; margin-bottom:10px;">Najdene datoteke in mape (${allMatches.length}):</h3>`;

            // Prikaži rezultate z potjo
            for (const item of allMatches) {
                const div = document.createElement("div");
                div.className = "item";
                const isFolder = !item.metadata;
                const pathParts = item.fullPath.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const folderPath = pathParts.slice(0, -1).join(' / ');
                
                div.onclick = () => {
                    if (isFolder) {
                        navigateTo(item.fullPath);
                    } else {
                        openPdfViewer(fileName, item.fullPath);
                    }
                };
                
                const baseName = getBaseName(fileName).toLowerCase();
                let displayIcon = isFolder ? getIconForName(baseName) : "📄";
                const ext = fileName.split('.').pop().toLowerCase();
                if (!isFolder && fileIcons[ext]) displayIcon = fileIcons[ext];
                if (!isFolder && (ext === 'dwg' || ext === 'dxf')) {
                    displayIcon = "📐";
                }
                
                div.innerHTML = `
                    <div class="item-preview ${isFolder ? 'folder-bg' : 'file-bg'}" style="width:50px; height:50px; border-radius:6px; margin-right:15px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:24px;">
                        ${displayIcon}
                    </div>
                    <div class="item-info" style="flex-grow:1;">
                        <strong style="color:#111; display:block; margin-bottom:2px;">${fileName}</strong>
                        <small style="color:#6b7280; font-size:12px;">${folderPath || 'Koren'}</small>
                    </div>
                `;
                resCont.appendChild(div);
            }
        }

        if (!found) { 
            if (statusEl) statusEl.textContent = "Ni zadetkov."; 
            if (mainContent) {
                mainContent.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;"><h3>Ni zadetkov za "${val}"</h3></div>`;
            }
        } else { 
            if (statusEl) statusEl.textContent = `Najdeno: ${arts.length} artiklov, ${allMatches.length} datotek/map`; 
            if (mainContent) mainContent.appendChild(resCont); 
        }
    }, 300);
  });
}

// --- OSTALO ---
window.openPdfViewer = async function(fn, path) { const url = "#view=" + fn; window.history.pushState({ type: 'viewer', file: fn }, "", url); pdfModal.style.display = 'flex'; viewerFileName.textContent = fn; const p = path || (currentPath ? `${currentPath}/${fn}` : fn); const { data } = await supabase.storage.from('Catalogs').createSignedUrl(p, 3600); if(data) pdfFrame.src = data.signedUrl; }
window.closePdfViewer = function() { 
  pdfModal.style.display = 'none'; 
  pdfFrame.src = ""; 
  const p = currentPath; 
  window.history.replaceState({ path: p }, "", "#" + p); 
  loadContent(p); 
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

// Registriraj form submit handler
function setupFormHandler() {
  const form = document.getElementById("authForm");
  if (form) {
    console.log("✓ Form najden, registriram event listener");
    
    form.addEventListener("submit", async (event) => {
      console.log("✓ Form submit triggered");
      // PREPREČI DEFAULT OBNAŠANJE
      event.preventDefault();
      event.stopPropagation();
      
      const emailInput = document.getElementById("email");
      const nameInput = document.getElementById("userName");
      const companyInput = document.getElementById("companyName");
      const msgEl = document.getElementById("authMsg");
      
      if (!emailInput || !nameInput || !companyInput) {
        console.error("Nekateri vnosni elementi niso najdeni");
        if (msgEl) {
          msgEl.textContent = "Napaka: Nekateri elementi niso najdeni.";
          msgEl.className = "error-msg";
        }
        return false;
      }
      
      const e = emailInput.value.trim();
      const n = nameInput.value.trim();
      const c = companyInput.value.trim();
      
      console.log("Vrednosti:", e, n, c);
      
      if (!e || !n || !c) { 
        if (msgEl) {
          msgEl.textContent = "Vsa polja so obvezna."; 
          msgEl.className = "error-msg";
        }
        return false; 
      }
      
      try { 
        localStorage.setItem('aluk_user_info', JSON.stringify({ name: n, company: c })); 
      } catch(err) {
        console.error("Napaka pri shranjevanju uporabniških podatkov:", err);
      }
      
      const btn = document.getElementById("sendLink");
      if (!btn) {
        console.error("Gumb 'sendLink' ni najden");
        return false;
      }
      
      btn.disabled = true;
      btn.textContent = "Pošiljam...";
      
      if (msgEl) {
        msgEl.textContent = "";
        msgEl.className = "";
      }
      
      try {
        console.log("Pošiljam OTP na:", e);
        const { error } = await supabase.auth.signInWithOtp({
          email: e, 
          options: { emailRedirectTo: window.location.origin }
        });
        
        if (error) {
          console.error("Supabase error:", error);
          if (msgEl) {
            msgEl.textContent = "Napaka: " + error.message;
            msgEl.className = "error-msg";
          }
          btn.disabled = false;
          btn.textContent = "Pošlji povezavo za prijavo";
        } else {
          console.log("OTP uspešno poslan");
          if (msgEl) {
            msgEl.textContent = "✅ Povezava poslana! Preverite svoj e-poštni predal.";
            msgEl.className = "success-msg";
          }
          // Ne resetiraj forme - ohrani podatke
        }
      } catch (err) {
        console.error("Napaka pri pošiljanju:", err);
        if (msgEl) {
          msgEl.textContent = "Napaka: " + (err.message || "Neznana napaka");
          msgEl.className = "error-msg";
        }
        btn.disabled = false;
        btn.textContent = "Pošlji povezavo za prijavo";
      }
      
      return false;
    });
  } else {
    console.error("✗ authForm NI NAJDEN!");
  }
}

// Pokliči takoj, ker je script type="module" naložen na koncu body
setupFormHandler();

if (btnGrid) btnGrid.addEventListener('click', () => setViewMode('grid')); 
if (btnList) btnList.addEventListener('click', () => setViewMode('list'));

// --- REKURZIVNO ISKANJE PO VSEH MAPAH (Za iskanje) ---
async function searchAllFilesRecursive(path, searchTerm, depth = 0, maxDepth = 10, maxResults = 200) {
   if (depth > maxDepth) return [];
   
   const lowerSearchTerm = searchTerm.toLowerCase();
   let results = [];
   
   try {
       const { data, error } = await supabase.storage.from('Catalogs').list(path, { 
           limit: 1000, 
           sortBy: { column: 'name', order: 'asc' } 
       });
       
       if (error) {
           console.warn("Napaka pri branju mape:", path, error);
           return [];
       }
       
       if (!data || data.length === 0) return [];
       
       // Filtriraj datoteke in mape, ki se ujemajo z iskalnim nizom
       const items = data.filter(item => item.name !== ".emptyFolderPlaceholder");
       
       for (const item of items) {
           if (results.length >= maxResults) break;
           
           const itemName = item.name.toLowerCase();
           const isFolder = !item.metadata;
           const fullPath = path ? `${path}/${item.name}` : item.name;
           
           // Preveri, če se ime ujema z iskalnim nizom (začetek ali vmesni del)
           // Podpira tudi delno ujemanje - npr. "okn" najde "Okenski sistemi"
           if (itemName.includes(lowerSearchTerm)) {
               results.push({
                   ...item,
                   fullPath: fullPath,
                   displayPath: fullPath
               });
           }
           
           // Če je mapa, VEDNO rekurzivno išči v njej (ne glede na to, ali se ujema)
           // To omogoča iskanje tudi po vmesnih delih poti
           if (isFolder) {
               const subResults = await searchAllFilesRecursive(
                   fullPath, 
                   searchTerm, 
                   depth + 1, 
                   maxDepth, 
                   maxResults - results.length
               );
               results = [...results, ...subResults];
           }
       }
   } catch (e) {
       console.warn("Napaka pri iskanju v mapi:", path, e);
   }
   
   return results;
}

// --- INICIALIZACIJA ---
(async () => { 
  // Preveri, če je uporabnik prišel iz email povezave (magic link)
  const hasMagicLink = window.location.search.includes("code=") || window.location.hash.includes("access_token=");
  
  if (hasMagicLink) {
    // Počakaj, da Supabase obdela magic link in shrani session
    // Supabase avtomatsko obdela URL parametre, vendar moramo počakati
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Poskusi dobiti session - Supabase bi ga moral že shraniti
    let session = null;
    for (let i = 0; i < 5; i++) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        session = currentSession;
        break;
      }
      // Počakaj malo in poskusi znova
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Očisti URL parametre
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (session) {
      // Session je uspešno shranjen, prikaži aplikacijo
      showApp(session.user.email);
    } else {
      // Če session ni shranjen, preveri normalno
      checkUser();
    }
  } else {
    // Normalna inicializacija
    checkUser();
  }
  
  // Poslušaj spremembe avtentikacije (za prihodnje spremembe)
  supabase.auth.onAuthStateChange((e, s) => { 
    if (e === 'SIGNED_IN' && s) {
      // Uporabnik se je prijavil - prikaži aplikacijo
      showApp(s.user.email);
    } else if (e === 'SIGNED_OUT') {
      // Uporabnik se je odjavil - prikaži login
      showLogin();
    } else if (e === 'TOKEN_REFRESHED' && s) {
      // Token je bil osvežen - ohrani uporabnika prijavljenega
      if (s.user) showApp(s.user.email);
    }
  });
})();