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
const sidebarFavList = getElement("sidebarFavList");

let currentPath = ""; 
let currentItems = [];
let imageMap = {}; 
let favorites = loadFavorites();
let viewMode = localStorage.getItem('aluk_view_mode') || 'grid';
let folderCache = {}; 
let currentRenderId = 0;
let imageUrlCache = {}; // Cache za signed URLs slik
let isSearchActive = false; // Flag za preverjanje, če je aktivno iskanje 

// --- ISKANJE (Cache) ---
let articleDatabase = [];
let isDataLoaded = false;

// --- POMOŽNE FUNKCIJE ---
function normalizePath(path) { if (!path) return ""; try { return decodeURIComponent(path).trim(); } catch (e) { return path.trim(); } }
function loadFavorites() { try { let raw = JSON.parse(localStorage.getItem('aluk_favorites') || '[]'); return [...new Set(raw.map(f => normalizePath(f)))].filter(f => f); } catch(e) { return []; } }
function saveFavorites(favs) { localStorage.setItem('aluk_favorites', JSON.stringify(favs)); }

// Preveri, če pot obstaja v Supabase Storage
async function pathExists(path) {
  try {
    const parts = path.split('/').filter(p => p);
    if (parts.length === 0) return true; // Root vedno obstaja
    
    const parentPath = parts.slice(0, -1).join('/');
    const folderName = parts[parts.length - 1];
    
    const { data, error } = await supabase.storage.from('Catalogs').list(parentPath || '', {
      limit: 1000
    });
    
    if (error) {
      console.warn(`Napaka pri preverjanju poti "${path}":`, error);
      return false;
    }
    
    return data && data.some(item => !item.metadata && item.name === folderName);
  } catch (e) {
    console.warn(`Napaka pri preverjanju poti "${path}":`, e);
    return false;
  }
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
    } else {
      console.log(`Odstranjujem neobstoječo priljubljeno: ${path}`);
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

async function showApp(email) {
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
  
  // Očisti neobstoječe priljubljene ob zagonu (asinhrono, da ne blokira)
  cleanInvalidFavorites().then(() => {
    setViewMode(viewMode);
    renderGlobalFavorites();
    updateSidebarFavorites(); // Posodobi sidebar priljubljene
  });
  
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
  currentPath = path; 
  searchInput.value = ""; 
  isSearchActive = false; // Deaktiviraj iskanje ob navigaciji
  sessionStorage.removeItem('aluk_search_query');
  sessionStorage.removeItem('aluk_search_results');
  window.history.pushState({ path }, "", "#" + path); 
  loadContent(path); 
}
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
  
  // Prikaži sekcijo "TEHNIČNA DOKUMENTACIJA" ko naložiš normalno vsebino
  const contentTitleEl = getElement("contentTitle");
  const contentTitleDesc = contentTitleEl ? contentTitleEl.nextElementSibling : null;
  if (contentTitleEl) contentTitleEl.style.display = "";
  if (contentTitleDesc && contentTitleDesc.tagName === "P") contentTitleDesc.style.display = "";
  
  if (path === "") updatesBanner.style.display = "none"; else updateBannerAsync(path);
  if (folderCache[path]) await processDataAndRender(folderCache[path], thisId); else { mainContent.innerHTML = ""; skeletonLoader.style.display = "grid"; }
  const { data, error } = await supabase.storage.from('Catalogs').list(path, { sortBy: { column: 'name', order: 'asc' }, limit: 1000 });
  skeletonLoader.style.display = "none";
  if (error) { statusEl.textContent = "Napaka pri branju."; return; }
  if (thisId === currentRenderId) { folderCache[path] = data; await processDataAndRender(data, thisId); }
}

async function updateBannerAsync(path) {
    updatesList.innerHTML = ""; 
    showMoreUpdatesBtn.style.display = "none"; 
    updatesBanner.style.display = "none";
    
    const newFiles = await getNewFilesRecursive(path, 0);
    if (newFiles.length === 0) return;
    
    newFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    updatesBanner.style.display = "block"; 
    lastUpdateDateEl.textContent = `Zadnja sprememba: ${formatDate(newFiles[0].created_at)}`;
    
    // Funkcija za prikaz posodobitev z flexbox poravnavo
    const show = (list, isHidden = false) => {
      list.forEach(f => { 
        const li = document.createElement("li");
        if (isHidden) {
          li.className = "update-item-hidden";
        }
        
        const nameSpan = document.createElement("span");
        nameSpan.innerHTML = `<strong>${f.displayName||f.name}</strong>`;
        nameSpan.onclick = () => openFileFromBanner(f.fullPath);
        
        const dateSpan = document.createElement("span");
        dateSpan.textContent = formatDate(f.created_at);
        
        li.appendChild(nameSpan);
        li.appendChild(dateSpan);
        updatesList.appendChild(li);
      });
    };
    
    // Prikaži prvih 3 elemente
    const initialItems = newFiles.slice(0, 3);
    const remainingItems = newFiles.slice(3);
    
    show(initialItems, false);
    
    // Če so dodatni elementi, prikaži gumb za toggle
    if (remainingItems.length > 0) {
      show(remainingItems, true); // Dodaj jih, vendar skrite
      showMoreUpdatesBtn.style.display = "block";
      showMoreUpdatesBtn.textContent = "▼ Pokaži več posodobitev";
      
      let isExpanded = false;
      showMoreUpdatesBtn.onclick = () => {
        const hiddenItems = updatesList.querySelectorAll(".update-item-hidden");
        
        if (isExpanded) {
          // Skrij dodatne elemente
          hiddenItems.forEach(item => {
            item.classList.add("update-item-hidden");
          });
          showMoreUpdatesBtn.textContent = "▼ Pokaži več posodobitev";
          isExpanded = false;
          // Pomakni se na vrh bannerja
          updatesBanner.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          // Prikaži dodatne elemente
          hiddenItems.forEach(item => {
            item.classList.remove("update-item-hidden");
          });
          showMoreUpdatesBtn.textContent = "▲ Pokaži manj posodobitev";
          isExpanded = true;
        }
      };
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
  const p = path ? path.split('/') : [];
  let h = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span>`, b = "";
  p.forEach((pt, i) => { b += (i > 0 ? "/" : "") + pt; h += ` <span style="color:var(--text-tertiary)">/</span> <span class="breadcrumb-item" onclick="navigateTo('${b}')">${decodeURIComponent(pt)}</span>`; });
  breadcrumbsEl.innerHTML = h;
}

// --- RENDER SEZNAMA ---
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

// Funkcija za pridobitev oznake sistema iz poti (zadnja beseda drugega nivoja)
// Primer: "Okenski sistemi/C67K/Tehnični katalogi" → "C67K"
function getSystemBadgeFromPath(path) {
    if (!path) return null;
    const parts = path.split('/').filter(p => p.trim());
    // Če je pot "Okenski sistemi/C67K/..." → vrni "C67K" (drugi nivo)
    if (parts.length >= 2) {
        const secondLevel = parts[1];
        // Vzemi zadnjo besedo (npr. "Okenski sistemi C67K" → "C67K")
        // Ali pa celoten drugi nivo, če je kratek (npr. "C67K")
        const words = secondLevel.split(' ');
        // Če je zadnja beseda kratka (npr. "C67K", "C68K"), jo uporabi
        const lastWord = words[words.length - 1];
        if (lastWord.length <= 10 && /^[A-Z0-9]+$/i.test(lastWord)) {
            return lastWord;
        }
        // Sicer uporabi celoten drugi nivo
        return secondLevel;
    }
    return null;
}

async function createItemElement(item, cont) {
    const isFolder = !item.metadata; 
    const div = document.createElement("div"); 
    div.className = "item";
    const full = currentPath ? `${currentPath}/${item.name}` : item.name; 
    const clean = normalizePath(full);
    let badges = "";
    
    if (isFolder) {
        const isFav = favorites.includes(clean);
        div.innerHTML += `<button class="fav-btn ${isFav?'active':''}" onclick="toggleFavorite(event, '${item.name}')">★</button>`;
        
        // Pridobi oznako sistema iz poti (zadnja beseda drugega nivoja)
        const systemBadge = getSystemBadgeFromPath(full);
        if (systemBadge) {
            badges += `<span class="system-badge" style="top:10px;">${systemBadge}</span>`;
        }
        
        // Preveri za NOVO badge asinhrono
        getNewFilesRecursive(full, 0).then(n => { 
            if(n.length > 0) { 
                const b = div.querySelector('.new-badge'); 
                if(b) {
                    b.style.display = 'inline-block';
                    // Če ima tudi system badge, ga premakni navzdol
                    const s = div.querySelector('.system-badge');
                    if(s) s.style.top = '36px';
                }
            } 
        });
    } else if (isRelevantFile(item.name) && item.created_at && new Date(item.created_at) > new Date(Date.now() - 30*24*3600*1000)) {
        badges += `<span class="new-badge" style="display:inline-block">NOVO</span>`;
    }
    
    // Placeholder za NOVO badge (za mape)
    badges = `<span class="new-badge" style="display:none">NOVO</span>` + badges;
    
    const base = getBaseName(item.name).toLowerCase();
    let icon = isFolder ? `<div class="big-icon">${getIconForName(base)}</div>` : `<div class="big-icon">${fileIcons[item.name.split('.').pop().toLowerCase()]||"📄"}</div>`;
    if (item.name.toLowerCase().endsWith('dwg') || item.name.toLowerCase().endsWith('dxf')) icon = `<img src="dwg-file.png" class="icon-img" onerror="this.outerHTML='<div class=\\'big-icon\\'>📐</div>'">`;
    
    // Cache za slike - preveri, če že imamo URL
    if (imageMap[base]) {
      const imagePath = currentPath ? `${currentPath}/${imageMap[base].name}` : imageMap[base].name;
      const cacheKey = imagePath;
      
      if (imageUrlCache[cacheKey]) {
        // Uporabi cache URL (če ni pretekel - 3600s = 1h)
        icon = `<img src="${imageUrlCache[cacheKey]}" loading="lazy" />`;
      } else {
        // Naloži nov URL in shrani v cache
        const { data } = await supabase.storage.from('Catalogs').createSignedUrl(imagePath, 3600);
        if (data) {
          imageUrlCache[cacheKey] = data.signedUrl;
          icon = `<img src="${data.signedUrl}" loading="lazy" />`;
        }
      }
    }

    div.innerHTML = (isFolder ? `<button class="fav-btn ${favorites.includes(clean)?'active':''}" onclick="toggleFavorite(event, '${item.name}')">★</button>` : '') + 
                    badges + 
                    `<div class="item-preview ${isFolder?'folder-bg':'file-bg'}">${icon}</div>` +
                    `<div class="item-info"><strong>${item.name}</strong><small>${isFolder?'Mapa':(item.metadata.size/1024/1024).toFixed(2)+' MB'}</small>${!isFolder&&item.created_at?`<br><span style="font-size:10px;color:var(--text-tertiary)">${formatDate(item.created_at)}</span>`:''}</div>`;
    
    div.onclick = () => isFolder ? navigateTo(full) : openPdfViewer(item.name, full);
    cont.appendChild(div);
}

// --- GLOBALNI PRILJUBLJENI ---
async function renderGlobalFavorites() {
  favorites = loadFavorites(); 
  if (favorites.length === 0) { 
    if (globalFavorites) globalFavorites.style.display = "none"; 
    return; 
  }
  if (globalFavorites) globalFavorites.style.display = "block"; 
  if (globalFavContainer) {
    globalFavContainer.innerHTML = ""; 
    globalFavContainer.className = `file-container grid-view`;
  }
  
  for (const p of favorites) {
      const name = p.split('/').pop(); 
      const div = document.createElement("div"); 
      div.className = "item";
      const news = await getNewFilesRecursive(p, 0);
      
      // Pridobi oznako sistema iz poti
      const systemBadge = getSystemBadgeFromPath(p);
      let badges = "";
      if (news.length > 0) {
          badges += '<span class="new-badge" style="display:inline-block">NOVO</span>';
          if (systemBadge) {
              badges += `<span class="system-badge" style="top:36px;">${systemBadge}</span>`;
          }
      } else if (systemBadge) {
          badges += `<span class="system-badge" style="top:10px;">${systemBadge}</span>`;
      }
      
      div.innerHTML = `<div class="item-preview folder-bg" style="height:100px; position:relative;"><div class="big-icon" style="font-size:40px;">${getIconForName(name)}</div>${badges}</div>
                       <div class="item-info" style="padding:10px;"><strong style="font-size:13px;">${name}</strong></div>
                       <button class="fav-btn active" style="top:5px; left:5px;">★</button>`;
      div.onclick = () => navigateTo(p);
      div.querySelector('.fav-btn').onclick = (e) => { 
        e.stopPropagation(); 
        favorites = favorites.filter(f => f !== p); 
        saveFavorites(favorites); 
        renderGlobalFavorites(); 
        updateSidebarFavorites(); // Posodobi sidebar
        renderItems(currentItems, currentRenderId); 
      };
      globalFavContainer.appendChild(div);
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
    const icon = getIconForName(name);
    
    const item = document.createElement('div');
    item.className = 'sidebar-fav-item';
    item.innerHTML = `
      <span class="fav-icon">★</span>
      <span class="fav-name" title="${path}">${icon} ${name}</span>
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
          statusEl.textContent = `⚠️ Mapa "${name}" je bila preimenovana ali premaknjena. Odstranjena iz priljubljenih.`;
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

console.log("🔎 searchInput element:", searchInput);

if (searchInput) {
  console.log("✓ searchInput najden, registriram event listener za iskanje");
} else {
  console.error("✗ searchInput NI NAJDEN! Iskanje ne bo delovalo.");
}

// Funkcija za kopiranje v odložišče
window.copyToClipboard = function(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = "✓ Kopirano";
        button.style.background = "var(--success)";
        button.style.color = "white";
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = "var(--bg-secondary)";
            button.style.color = "var(--text-primary)";
        }, 2000);
    }).catch(err => {
        console.error("Napaka pri kopiranju:", err);
        button.textContent = "✗ Napaka";
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
      searchInput.value = "";
      clearSearchBtn.style.display = "none";
      isSearchActive = false; // Deaktiviraj iskanje
      sessionStorage.removeItem('aluk_search_query');
      sessionStorage.removeItem('aluk_search_results');
      if (currentItems.length > 0) renderItems(currentItems, currentRenderId);
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
    console.log("⌨️ Input event triggered, vrednost:", e.target.value);
    
    // Prikaži/skrij križec
    if (clearSearchBtn) {
      clearSearchBtn.style.display = e.target.value.trim() ? "flex" : "none";
    }
    
    // Debounce - počakaj 300ms preden iščeš
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const val = e.target.value.trim();
    
    if (!val) { 
      // Počisti sessionStorage
      sessionStorage.removeItem('aluk_search_query');
      sessionStorage.removeItem('aluk_search_results');
      isSearchActive = false; // Deaktiviraj iskanje
      
      // Prikaži nazaj sekcijo "TEHNIČNA DOKUMENTACIJA"
      const contentTitleEl = getElement("contentTitle");
      const contentTitleDesc = contentTitleEl ? contentTitleEl.nextElementSibling : null;
      if (contentTitleEl) contentTitleEl.style.display = "";
      if (contentTitleDesc && contentTitleDesc.tagName === "P") contentTitleDesc.style.display = "";
      
      if (currentItems.length > 0) renderItems(currentItems, currentRenderId); 
      return; 
    }
    
    isSearchActive = true; // Aktiviraj iskanje
    
    searchTimeout = setTimeout(async () => {
        console.log("🔍 Začenjam iskanje za:", val);
        const lowerVal = val.toLowerCase();
        
        if (!isDataLoaded) await loadSearchData();

        // Povečaj renderID, da preprečimo podvajanje
        currentRenderId++; 
        const thisRenderId = currentRenderId;
        
        // POČISTI prejšnje rezultate
        if (mainContent) mainContent.innerHTML = "";
        
        // Skrij sekcijo "TEHNIČNA DOKUMENTACIJA" ko iščeš
        const contentTitleEl = getElement("contentTitle");
        const contentTitleDesc = contentTitleEl ? contentTitleEl.nextElementSibling : null;
        if (contentTitleEl) contentTitleEl.style.display = "none";
        if (contentTitleDesc && contentTitleDesc.tagName === "P") contentTitleDesc.style.display = "none";
        
        // Prikaži loading indikator
        if (statusEl) {
            statusEl.innerHTML = '<span class="loading-indicator">Iščem po vseh mapah<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>';
            statusEl.style.color = "var(--loading-color)";
            statusEl.style.fontWeight = "500";
        }
        
        const resCont = document.createElement("div"); 
        resCont.className = "file-container list-view";
        let found = false;

        // 1. Iskanje po ŠIFRANTU
        const arts = articleDatabase.filter(a => 
            a.sifra.toLowerCase().includes(lowerVal) || 
            a.opis.toLowerCase().includes(lowerVal)
        ).slice(0, 50);
        
        // Ustvari container za rezultate v dveh stolpcih
        const resultsWrapper = document.createElement("div");
        resultsWrapper.className = "search-results-grid";
        resultsWrapper.style.display = "grid";
        resultsWrapper.style.gridTemplateColumns = "1fr 1fr";
        resultsWrapper.style.gap = "20px";
        resultsWrapper.style.marginTop = "15px";
        
        const sifrantCol = document.createElement("div");
        const mapsCol = document.createElement("div");
        
        // Poravnaj začetek rezultatov - uporabi min-height za naslove in opise
        sifrantCol.style.paddingTop = "0";
        mapsCol.style.paddingTop = "0";
        
        if (arts.length > 0) {
            found = true;
            // Uporabi min-height za naslov in opis, da se poravnata z drugim stolpcem
            sifrantCol.innerHTML += `<div style="min-height:60px;"><h3 style="margin-bottom:12px; color:var(--result-article-heading); font-size:15px; font-weight:600; margin-top:0;">📋 Šifrant artiklov (${arts.length})</h3><p style="font-size:12px; color:var(--text-secondary); margin-bottom:15px; line-height:1.5;">Iskanje šifre artikla vrne opis artikla iz šifranta.</p></div>`;
            
            arts.forEach(a => {
                const artDiv = document.createElement("div");
                artDiv.className = "item";
                artDiv.style.cursor = "default";
                artDiv.style.marginBottom = "8px";
                artDiv.style.position = "relative";
                
                const copyText = `${a.sifra} - ${a.opis}`;
                artDiv.innerHTML = `
                    <div class="item-preview file-bg" style="background:var(--bg-secondary); width:50px; height:50px; border-radius:6px; margin-right:15px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid var(--border-light);">
                        🏷️
                    </div>
                    <div class="item-info" style="flex-grow:1; min-width:0; overflow:hidden;">
                        <strong style="color:var(--result-article-heading); display:block; margin-bottom:2px; font-weight:600;">${a.sifra}</strong>
                        <small style="color:var(--result-article-text); display:block; line-height:1.4; word-wrap:break-word;">${a.opis}</small>
                    </div>
                    <button class="copy-btn" onclick="copyToClipboard('${copyText.replace(/'/g, "\\'")}', this)" style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:6px; width:36px; height:36px; cursor:pointer; font-size:16px; color:var(--text-primary); margin-left:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0;" title="Kopiraj šifro in opis">📋</button>
                `;
                artDiv.style.display = "flex";
                artDiv.style.alignItems = "flex-start";
                artDiv.style.paddingTop = "8px";
                sifrantCol.appendChild(artDiv);
            });
        }

        // 2. REKURZIVNO ISKANJE PO VSEH MAPAH (optimizirano)
        const allMatches = await searchAllFilesRecursive("", val, 0, 8, 100);
        
        if (allMatches.length > 0) {
            found = true;
            // Uporabi min-height za naslov in opis, da se poravnata z drugim stolpcem
            mapsCol.innerHTML += `<div style="min-height:60px;"><h3 style="margin-bottom:12px; color:var(--result-doc-heading); font-size:15px; font-weight:600; margin-top:0;">📁 Tehnična dokumentacija (${allMatches.length})</h3><p style="font-size:12px; color:var(--text-secondary); margin-bottom:15px; line-height:1.5;">Iskanje katalogov prikaže vse kataloge, ki se ujemajo in so na voljo na tem portalu.</p></div>`;

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
                        <strong style="color:var(--result-doc-text); display:block; margin-bottom:2px; font-weight:600;">${fileName}</strong>
                        <small style="color:var(--text-secondary); font-size:12px;">${folderPath || 'Koren'}</small>
                    </div>
                `;
                mapsCol.appendChild(div);
            }
        }

        // Preveri, če je to še vedno aktualno iskanje
        if (thisRenderId !== currentRenderId) {
            console.log("⚠️ Iskanje zastarelo, preskoči prikaz");
            return;
        }
        
        // Dodaj stolpce v wrapper
        if (arts.length > 0) resultsWrapper.appendChild(sifrantCol);
        if (allMatches.length > 0) resultsWrapper.appendChild(mapsCol);
        
        // Če imamo samo en stolpec, spremeni grid na 1 stolpec
        if (arts.length === 0 || allMatches.length === 0) {
            resultsWrapper.style.gridTemplateColumns = "1fr";
        }
        
        // Dodaj wrapper v resCont
        if (arts.length > 0 || allMatches.length > 0) {
            resCont.appendChild(resultsWrapper);
        }
        
        // Shrani rezultate v sessionStorage
        try {
            sessionStorage.setItem('aluk_search_query', val);
            sessionStorage.setItem('aluk_search_results', JSON.stringify({
                arts: arts.length,
                matches: allMatches.length,
                timestamp: Date.now()
            }));
        } catch(e) {
            console.warn("Napaka pri shranjevanju rezultatov:", e);
        }
        
        if (!found) { 
            if (statusEl) {
                statusEl.textContent = "Ni zadetkov.";
                statusEl.style.color = "var(--text-secondary)";
                statusEl.style.fontWeight = "400";
            }
            if (mainContent) {
                mainContent.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);"><h3 style="color:var(--text-primary);">Ni zadetkov za "${val}"</h3></div>`;
            }
        } else { 
            if (statusEl) {
                statusEl.textContent = `Najdeno: ${arts.length} artiklov, ${allMatches.length} datotek/map`;
                statusEl.style.color = "var(--success)";
                statusEl.style.fontWeight = "500";
            }
            if (mainContent) {
                mainContent.innerHTML = ""; // Počisti ponovno za vsak slučaj
                mainContent.appendChild(resCont); 
            }
        }
    }, 300);
  });
} else {
  console.error("❌ KRITIČNA NAPAKA: searchInput element ni najden!");
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

// --- REKURZIVNO ISKANJE PO VSEH MAPAH (Za iskanje) - OPTIMIZIRANO ---
async function searchAllFilesRecursive(path, searchTerm, depth = 0, maxDepth = 8, maxResults = 100) {
   if (depth > maxDepth) return [];
   
   const lowerSearchTerm = searchTerm.toLowerCase();
   let results = [];
   
   try {
       const { data, error } = await supabase.storage.from('Catalogs').list(path, { 
           limit: 500, // Zmanjšano za hitrejše iskanje
           sortBy: { column: 'name', order: 'asc' } 
       });
       
       if (error || !data || data.length === 0) return [];
       
       // Filtriraj datoteke in mape
       const items = data.filter(item => item.name !== ".emptyFolderPlaceholder");
       
       // Najprej preveri direktna ujemanja (hitreje)
       for (const item of items) {
           if (results.length >= maxResults) break;
           
           const itemName = item.name.toLowerCase();
           const isFolder = !item.metadata;
           const fullPath = path ? `${path}/${item.name}` : item.name;
           
           // Preveri, če se ime ujema z iskalnim nizom
           if (itemName.includes(lowerSearchTerm)) {
               // Za datoteke filtriraj samo pdf, dwg, xlsx
               if (!isFolder) {
                   const ext = item.name.split('.').pop().toLowerCase();
                   if (!['pdf', 'dwg', 'xlsx'].includes(ext)) {
                       continue; // Preskoči datoteke, ki niso pdf, dwg ali xlsx
                   }
               }
               results.push({
                   ...item,
                   fullPath: fullPath,
                   displayPath: fullPath
               });
           }
       }
       
       // Nato rekurzivno išči v mapah (samo če še ni dosežen maxResults)
       if (results.length < maxResults) {
           for (const item of items) {
               if (results.length >= maxResults) break;
               
               const isFolder = !item.metadata;
               if (isFolder) {
                   const fullPath = path ? `${path}/${item.name}` : item.name;
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
       }
   } catch (e) {
       console.warn("Napaka pri iskanju v mapi:", path, e);
   }
   
   return results;
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

// Obnovi rezultate ob vračanju fokusa na stran
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const savedQuery = sessionStorage.getItem('aluk_search_query');
    if (savedQuery && searchInput && mainContent && mainContent.innerHTML.trim() === "") {
      searchInput.value = savedQuery;
      isSearchActive = true; // Aktiviraj iskanje
      if (clearSearchBtn) clearSearchBtn.style.display = "flex";
      // Ponovno izvedi iskanje
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
});

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