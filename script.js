import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ugwchsznxsuxbxdvigsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2Noc3pueHN1eGJ4ZHZpZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY0NzEsImV4cCI6MjA4NDY5MjQ3MX0.iFzB--KryoBedjIJnybL55-xfQFIBxWnKq9RqwxuyK4";
const ADMIN_EMAIL = "miha@aluk.si"; 

// --- KONFIGURACIJA ---
const customSortOrder = [
  "Okenski sistemi",
  "Vratni sistemi",
  "Panoramski sistemi",
  "Fasadni sistemi",
  "Pisarniski sistemi",
  "Dekorativne obloge Skin"
];

const relevantExtensions = ['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'dwg', 'dxf', 'zip', 'rar', '7z'];

const folderIcons = {
  "tehničn": "🛠️", "katalog": "🛠️",
  "galerij": "📷", "foto": "📷", "referenc": "📷",
  "certifikat": "🎖️", "izjav": "🎖️",
  "vgradni": "📐", "prerezi": "📐", 
  "navodil": "ℹ️", "obdelav": "ℹ️"
};

const fileIcons = {
  "pdf": "📕",
  "xls": "📊", "xlsx": "📊", "csv": "📊",
  "doc": "📝", "docx": "📝",
  "zip": "📦", "rar": "📦", "7z": "📦",
  "jpg": "🖼️", "jpeg": "🖼️", "png": "🖼️", "webp": "🖼️"
};

document.getElementById("requestAccessBtn").href = `mailto:${ADMIN_EMAIL}?subject=Prijava v AluK Portal&body=Prošnja za dostop...`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'aluk-portal-auth' }
});

// DOM ELEMENTI
const authCard = document.getElementById("authCard");
const appCard = document.getElementById("appCard");
const mainContent = document.getElementById("mainContent");
const skeletonLoader = document.getElementById("skeletonLoader");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");
const breadcrumbsEl = document.getElementById("breadcrumbs");
const msgEl = document.getElementById("authMsg");

const updatesBanner = document.getElementById("updatesBanner");
const updatesList = document.getElementById("updatesList");
const lastUpdateDateEl = document.getElementById("lastUpdateDate");
const showMoreUpdatesBtn = document.getElementById("showMoreUpdates");

const pdfModal = document.getElementById("pdfModal");
const pdfFrame = document.getElementById("pdfFrame");
const viewerFileName = document.getElementById("viewerFileName");
const btnGrid = document.getElementById("btnGrid");
const btnList = document.getElementById("btnList");
const globalFavorites = document.getElementById("globalFavorites");
const globalFavContainer = document.getElementById("globalFavContainer");

let currentPath = ""; 
let currentItems = [];
let imageMap = {}; 

// --- POMOŽNA FUNKCIJA ZA ČIŠČENJE POTI (PREPREČUJE DUPLIKATE) ---
function normalizePath(path) {
    if (!path) return "";
    try {
        return decodeURIComponent(path).trim();
    } catch (e) {
        return path.trim();
    }
}

// --- ČISTILEC PRILJUBLJENIH ---
function loadFavorites() {
    try {
        let rawFavs = JSON.parse(localStorage.getItem('aluk_favorites') || '[]');
        // Vse poti normaliziramo
        let cleanFavs = rawFavs.map(f => normalizePath(f));
        // Odstranimo duplikate s Set
        let uniqueFavs = [...new Set(cleanFavs)];
        // Filtriramo prazne
        uniqueFavs = uniqueFavs.filter(f => f && f.length > 0);
        
        return uniqueFavs;
    } catch(e) { 
        console.error("Napaka pri nalaganju priljubljenih", e); 
        return [];
    }
}

function saveFavorites(favs) {
    localStorage.setItem('aluk_favorites', JSON.stringify(favs));
}

let favorites = loadFavorites();
let viewMode = localStorage.getItem('aluk_view_mode') || 'grid';
let folderCache = {}; 
let currentRenderId = 0; 

function getCustomSortIndex(name) {
    const index = customSortOrder.indexOf(name);
    if (index !== -1) return index;
    const partialIndex = customSortOrder.findIndex(orderName => name.includes(orderName));
    return partialIndex === -1 ? 999 : partialIndex;
}

function formatDate(isoString) { if (!isoString) return ""; const d = new Date(isoString); return d.toLocaleDateString('sl-SI'); }
function getBaseName(fileName) { const idx = fileName.lastIndexOf('.'); if (idx === -1) return fileName; return fileName.substring(0, idx); }
function getIconForName(name) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(folderIcons)) { if (lower.includes(key)) return emoji; }
  return "📂";
}

function isRelevantFile(fileName) {
    if (fileName.startsWith('.')) return false; 
    const ext = fileName.split('.').pop().toLowerCase();
    return relevantExtensions.includes(ext);
}

// --- LOGIN / LOGOUT ---
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp(session.user.email); else showLogin();
}
function showLogin() { authCard.style.display = "block"; appCard.style.display = "none"; document.getElementById("logout").style.display = "none"; }
function showApp(email) {
  authCard.style.display = "none"; appCard.style.display = "flex"; appCard.style.flexDirection = "column";
  document.getElementById("logout").style.display = "block";
  try { const stored = localStorage.getItem('aluk_user_info'); if (stored) { const data = JSON.parse(stored); if (data.name) document.getElementById("userLine").textContent = `👤 ${data.name}, ${data.company}`; } } catch (e) {}
  if (!document.getElementById("userLine").textContent) document.getElementById("userLine").textContent = `👤 ${email}`;
  setViewMode(viewMode);
  renderGlobalFavorites();
  const initialPath = getPathFromUrl();
  currentPath = initialPath;
  loadContent(initialPath);
}
document.getElementById("logout").addEventListener("click", async () => { await supabase.auth.signOut(); try { localStorage.removeItem('aluk_user_info'); } catch(e) {} window.location.reload(); });

// --- NAVIGACIJA ---
window.navigateTo = function(path) {
  currentPath = path;
  searchInput.value = ""; 
  window.history.pushState({ path }, "", "#" + path);
  loadContent(path);
}
function getPathFromUrl() {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return "";
    if (hash.startsWith("#view=")) return "";
    return decodeURIComponent(hash.slice(1));
}
window.addEventListener('popstate', (event) => {
    pdfModal.style.display = 'none';
    pdfFrame.src = "";
    const path = getPathFromUrl();
    currentPath = path;
    loadContent(path);
});

// --- REKURZIVNO ISKANJE (Za Banner) ---
async function getNewFilesRecursive(path, depth = 0) {
   if (depth > 2) return [];

   const thirtyDaysAgo = new Date();
   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
   
   const { data } = await supabase.storage.from('Catalogs').list(path, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
   if (!data) return [];
   
   let allNewFiles = [];

   const files = data.filter(item => item.metadata);
   const newFilesHere = files.filter(f => {
       return isRelevantFile(f.name) && new Date(f.created_at) > thirtyDaysAgo;
   });
   
   newFilesHere.forEach(f => {
       f.displayName = f.name; 
       f.fullPath = path ? `${path}/${f.name}` : f.name;
   });
   allNewFiles = [...allNewFiles, ...newFilesHere];

   const folders = data.filter(item => !item.metadata && item.name !== ".emptyFolderPlaceholder");
   
   const subfolderPromises = folders.map(async (folder) => {
       const subPath = path ? `${path}/${folder.name}` : folder.name;
       const subFiles = await getNewFilesRecursive(subPath, depth + 1);
       subFiles.forEach(f => {
           if(depth === 0) f.displayName = `${folder.name} / ${f.name}`;
       });
       return subFiles;
   });

   const nestedFiles = await Promise.all(subfolderPromises);
   nestedFiles.forEach(group => {
       allNewFiles = [...allNewFiles, ...group];
   });

   return allNewFiles;
}

// --- NALAGANJE VSEBINE MAPE ---
async function loadContent(path) {
  statusEl.textContent = "";
  updateBreadcrumbs(path);
  currentRenderId++;
  const thisRenderId = currentRenderId;
  
  if (path === "") {
      updatesBanner.style.display = "none";
  } else {
      updateBannerAsync(path);
  }

  // Uporabi cache
  if (folderCache[path]) { await processDataAndRender(folderCache[path], thisRenderId); } 
  else { mainContent.innerHTML = ""; skeletonLoader.style.display = "grid"; }
  
  const { data, error } = await supabase.storage.from('Catalogs').list(path, { sortBy: { column: 'name', order: 'asc' }, limit: 1000 });
  skeletonLoader.style.display = "none"; 
  
  if (error) { statusEl.textContent = "Napaka pri branju podatkov."; return; }
  
  // Posodobi cache in izriši, ČE SMO ŠE VEDNO NA ISTI STRANI
  if (thisRenderId === currentRenderId) { 
      folderCache[path] = data; 
      await processDataAndRender(data, thisRenderId); 
  }
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
    
    const firstBatch = newFiles.slice(0, 5);
    firstBatch.forEach(f => {
      const li = document.createElement("li");
      const nameToShow = f.displayName || f.name;
      li.innerHTML = `<span style="cursor:pointer; color:#334155" onclick="openFileFromBanner('${f.fullPath}')"><strong>${nameToShow}</strong></span> <small class="text-gray-500">(${formatDate(f.created_at)})</small>`;
      updatesList.appendChild(li);
    });

    if (newFiles.length > 5) {
        showMoreUpdatesBtn.style.display = "block";
        showMoreUpdatesBtn.onclick = () => {
            const rest = newFiles.slice(5);
            rest.forEach(f => {
                const li = document.createElement("li");
                const nameToShow = f.displayName || f.name;
                li.innerHTML = `<span style="cursor:pointer; color:#334155" onclick="openFileFromBanner('${f.fullPath}')"><strong>${nameToShow}</strong></span> <small class="text-gray-500">(${formatDate(f.created_at)})</small>`;
                updatesList.appendChild(li);
            });
            showMoreUpdatesBtn.style.display = "none"; 
        };
    }
}

window.openFileFromBanner = function(fullPath) {
    const name = fullPath.split('/').pop();
    openPdfViewer(name, fullPath);
}

async function processDataAndRender(data, renderId) {
  const rawItems = data.filter(item => item.name !== ".emptyFolderPlaceholder");
  
  const images = rawItems.filter(f => f.metadata && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
  imageMap = {};
  for (const img of images) { imageMap[getBaseName(img.name).toLowerCase()] = img; }
  
  const displayItems = rawItems.filter(f => { if (!f.metadata) return true; return !/\.(jpg|jpeg|png|webp)$/i.test(f.name); });
  
  currentItems = displayItems;
  // Kliči render samo, če je ID še vedno veljaven
  if (renderId === currentRenderId) await renderItems(displayItems, renderId);
}

function updateBreadcrumbs(path) {
  const parts = path ? path.split('/') : [];
  let html = `<span class="breadcrumb-item" onclick="navigateTo('')">Domov</span>`;
  let buildPath = "";
  parts.forEach((part, index) => {
    buildPath += (index > 0 ? "/" : "") + part;
    html += ` <span style="color:#ccc">/</span> <span class="breadcrumb-item" onclick="navigateTo('${buildPath}')">${decodeURIComponent(part)}</span>`;
  });
  breadcrumbsEl.innerHTML = html;
}

// --- GLAVNI RENDER SEZNAMA (POPRAVLJEN ZA DUPLIKATE) ---
async function renderItems(items, renderId) {
  // 1. Takoj preveri, če je ta izris še aktualen
  if (renderId !== currentRenderId) return;
  
  if (items.length === 0) { 
      mainContent.innerHTML = "";
      statusEl.textContent = "Ta mapa je prazna."; 
      return; 
  }
  statusEl.textContent = `${items.length} elementov`;

  // 2. Pripravi nov kontejner v pomnilniku (še ne na ekranu)
  const normContainer = document.createElement("div");
  normContainer.className = `file-container ${viewMode}-view`;
  
  const favItems = [];
  const normalItems = [];

  // Posodobi seznam priljubljenih (za vsak slučaj)
  favorites = loadFavorites();

  items.forEach(item => {
    const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    const cleanPath = normalizePath(fullPath);
    const isFolder = !item.metadata;
    
    if (isFolder && favorites.includes(cleanPath)) favItems.push(item);
    else normalItems.push(item);
  });

  const allSorted = [...favItems, ...normalItems].sort((a, b) => {
     const isFolderA = !a.metadata; const isFolderB = !b.metadata;
     if (isFolderA && !isFolderB) return -1;
     if (!isFolderA && isFolderB) return 1;
     
     if (isFolderA && isFolderB) {
         const idxA = getCustomSortIndex(a.name);
         const idxB = getCustomSortIndex(b.name);
         if (idxA !== idxB) return idxA - idxB;
     }
     return a.name.localeCompare(b.name);
  });

  // 3. Ustvarjaj elemente (async loop)
  for (const item of allSorted) { 
      // Vmes preverjaj, če je uporabnik že zamenjal stran
      if (renderId !== currentRenderId) return; 
      await createItemElement(item, normContainer); 
  }
  
  // 4. KLJUČNI TRENUTEK: Ponovno preveri in zamenjaj vsebino
  if (renderId === currentRenderId) {
      mainContent.innerHTML = ""; // Počisti staro
      mainContent.appendChild(normContainer); // Dodaj novo
  }
}

// --- IZRIS POSAMEZNE KARTICE ---
async function createItemElement(item, container) {
    const isFolder = !item.metadata; 
    const div = document.createElement("div");
    div.className = "item";
    const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    const cleanPath = normalizePath(fullPath);
    
    let favHtml = '';
    if (isFolder) {
      const isFav = favorites.includes(cleanPath);
      favHtml = `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${item.name}')">★</button>`;
    }

    let dateHtml = "";
    let isNew = false;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (!isFolder && item.created_at) {
        if (isRelevantFile(item.name)) {
            isNew = new Date(item.created_at) > thirtyDaysAgo;
        }
        dateHtml = `<span class="item-date">Datum posodobitve: ${formatDate(item.created_at)}</span>`;
    }
    
    if (isFolder) {
        getNewFilesRecursive(fullPath, 0).then(newFiles => {
            if (newFiles.length > 0) {
                const badge = div.querySelector('.new-badge');
                if(badge) badge.style.display = 'inline-block';
                const sysBadge = div.querySelector('.system-badge');
                if(sysBadge) sysBadge.style.top = '36px';
            }
        });
    }
    
    let badgesHtml = `<span class="new-badge" style="${isFolder ? 'display:none' : (isNew ? 'display:inline-block' : 'display:none')}">NOVO</span>`;
    
    if (isFolder && currentPath.toLowerCase().includes("sistem")) {
         const lowerName = item.name.toLowerCase();
         if (lowerName.includes("tehnicn") || lowerName.includes("tehničn") || lowerName.includes("vgradn") || lowerName.includes("prerez")) {
             const systemName = currentPath.split('/').pop();
             const shortCode = systemName.split(' ').pop(); 
             if (!item.name.includes(shortCode)) {
                 badgesHtml += `<span class="system-badge" style="top:10px;">${shortCode}</span>`;
             }
         }
    }

    const baseName = getBaseName(item.name).toLowerCase();
    const thumbImage = imageMap[baseName];
    
    let displayIcon = isFolder ? "📂" : "📄";
    let iconHtml = "";

    if (isFolder) {
       displayIcon = getIconForName(baseName);
       iconHtml = `<div class="big-icon">${displayIcon}</div>`;
    } else {
       const ext = item.name.split('.').pop().toLowerCase();
       if (ext === 'dwg' || ext === 'dxf') {
           iconHtml = `<img src="dwg-file.png" alt="DWG" class="icon-img" onerror="this.outerHTML='<div class=\\'big-icon\\'>📐</div>'">`;
       } else {
           if (fileIcons[ext]) displayIcon = fileIcons[ext];
           iconHtml = `<div class="big-icon">${displayIcon}</div>`;
       }
    }

    if (thumbImage) {
       const thumbPath = currentPath ? `${currentPath}/${thumbImage.name}` : thumbImage.name;
       const { data: thumbData } = await supabase.storage.from('Catalogs').createSignedUrl(thumbPath, 3600);
       if (thumbData) iconHtml = `<img src="${thumbData.signedUrl}" alt="${item.name}" loading="lazy" />`;
    }

    if (isFolder) {
      div.onclick = () => navigateTo(fullPath);
      div.innerHTML = `
        ${favHtml}
        ${badgesHtml}
        <div class="item-preview folder-bg">${iconHtml}</div>
        <div class="item-info">
          <strong>${item.name}</strong>
          <small>Mapa</small>
        </div>`;
    } else {
      div.onclick = () => openPdfViewer(item.name, fullPath);
      div.innerHTML = `
        ${badgesHtml}
        <div class="item-preview file-bg">${iconHtml}</div>
        <div class="item-info">
          <strong>${item.name}</strong>
          <small>${(item.metadata.size/1024/1024).toFixed(2)} MB</small>
          ${dateHtml}
        </div>`;
    }
    container.appendChild(div);
}

// --- RENDER GLOBALIH PRILJUBLJENIH ---
async function renderGlobalFavorites() {
  favorites = loadFavorites(); 
  
  if (favorites.length === 0) { globalFavorites.style.display = "none"; return; }
  globalFavorites.style.display = "block";
  globalFavContainer.innerHTML = "";
  globalFavContainer.className = `file-container grid-view`;

  for (const favPath of favorites) {
    const name = favPath.split('/').pop();
    const displayIcon = getIconForName(name);
    
    const parts = favPath.split('/');
    let systemBadge = "";
    if (parts.length > 1) {
        const parent = parts[parts.length - 2]; 
        if (parent.toLowerCase().includes("sistem")) {
            systemBadge = parent.split(' ').pop(); 
        }
    }
    
    const lowerName = name.toLowerCase();
    const showSystemBadge = lowerName.includes("tehnicn") || lowerName.includes("tehničn") || lowerName.includes("vgradn") || lowerName.includes("prerez");
    
    const newFiles = await getNewFilesRecursive(favPath, 0);
    const hasNewContent = newFiles.length > 0;
    
    let badgesHtml = "";
    let badgeTop = 10;
    
    if (hasNewContent) {
        badgesHtml += `<span class="new-badge" style="display:inline-block">NOVO</span>`;
        badgeTop = 36; 
    }
    
    if (showSystemBadge && systemBadge) {
        badgesHtml += `<span class="system-badge" style="top:${badgeTop}px;">${systemBadge}</span>`;
    }

    const div = document.createElement("div");
    div.className = "item";
    div.onclick = () => navigateTo(favPath);
    div.innerHTML = `
      <div class="item-preview folder-bg" style="height:100px;">
         <div class="big-icon" style="font-size:40px;">${displayIcon}</div>
      </div>
      <div class="item-info" style="padding:10px;">
        <strong style="font-size:13px;">${name}</strong>
      </div>
      ${badgesHtml}
      <button class="fav-btn active" style="top:5px; left:5px; width:24px; height:24px; font-size:14px;">★</button>
    `;
    const btn = div.querySelector('.fav-btn');
    btn.onclick = (e) => {
       e.stopPropagation();
       let currentFavs = loadFavorites();
       favorites = currentFavs.filter(f => f !== favPath);
       saveFavorites(favorites);
       renderGlobalFavorites(); 
       renderItems(currentItems, currentRenderId);
    };
    globalFavContainer.appendChild(div);
  }
}

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem('aluk_view_mode', mode);
  if (mode === 'grid') { btnGrid.classList.add('active'); btnList.classList.remove('active'); }
  else { btnGrid.classList.remove('active'); btnList.classList.add('active'); }
  renderItems(currentItems, currentRenderId);
}
btnGrid.addEventListener('click', () => setViewMode('grid'));
btnList.addEventListener('click', () => setViewMode('list'));

window.openPdfViewer = async function(fileName, fullPathOverride) {
  const viewerUrl = "#view=" + fileName;
  window.history.pushState({ type: 'viewer', file: fileName }, "", viewerUrl);
  pdfModal.style.display = 'flex';
  viewerFileName.textContent = fileName;
  pdfFrame.src = ""; 
  const filePath = fullPathOverride ? fullPathOverride : (currentPath ? `${currentPath}/${fileName}` : fileName);
  const { data, error } = await supabase.storage.from('Catalogs').createSignedUrl(filePath, 3600);
  if (error) { alert("Napaka pri odpiranju datoteke."); window.history.back(); return; }
  pdfFrame.src = data.signedUrl; 
}

window.closePdfViewer = function() { 
    pdfModal.style.display = 'none';
    pdfFrame.src = "";
    window.history.replaceState({ path: currentPath }, "", "#" + currentPath);
    loadContent(currentPath); 
}

// --- UPRAVLJANJE PRILJUBLJENIH (POPRAVLJENO) ---
window.toggleFavorite = function(e, itemName) {
  e.stopPropagation(); 
  const fullPath = currentPath ? `${currentPath}/${itemName}` : itemName;
  const cleanPath = normalizePath(fullPath);
  
  // Ponovno naloži, da imamo sveže stanje
  favorites = loadFavorites();

  if (favorites.includes(cleanPath)) {
      // Odstrani
      favorites = favorites.filter(f => f !== cleanPath);
  } else {
      // Dodaj
      favorites.push(cleanPath);
  }
  
  saveFavorites(favorites);
  renderGlobalFavorites();
  renderItems(currentItems, currentRenderId); 
}

document.getElementById("sendLink").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const name = document.getElementById("userName").value.trim();
  const company = document.getElementById("companyName").value.trim();
  const btn = document.getElementById("sendLink");
  if (!email || !name || !company) { msgEl.textContent = "Prosimo, izpolnite vsa polja."; return; }
  try { localStorage.setItem('aluk_user_info', JSON.stringify({ name, company })); } catch (e) {}
  btn.disabled = true; btn.textContent = "Pošiljam ..."; msgEl.textContent = "";
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) { msgEl.textContent = "Napaka: " + error.message; btn.disabled = false; }
  else { msgEl.textContent = "Povezava poslana!"; msgEl.className = "success-msg"; }
});

// --- ISKANJE (Datoteke + Šifrant artiklov) ---
let articleDatabase = [];
let isArticlesLoaded = false;

async function loadArticles() {
    if (isArticlesLoaded) return;
    try {
        const response = await fetch('/sifrant.json?v=2');
        if (response.ok) {
            articleDatabase = await response.json();
            isArticlesLoaded = true;
            console.log("Šifrant naložen:", articleDatabase.length, "artiklov.");
        }
    } catch (e) {
        console.warn("Šifranta ni mogoče naložiti.", e);
    }
}

searchInput.addEventListener("input", async (e) => {
    const val = e.target.value.toLowerCase().trim();
    
    if (!val) {
        renderItems(currentItems, currentRenderId);
        return;
    }

    if (!isArticlesLoaded) {
        await loadArticles();
    }

    currentRenderId++;
    mainContent.innerHTML = ""; 

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "file-container list-view"; 

    let matchesFound = false;

    let topArticles = [];
    if (isArticlesLoaded) {
        const foundArticles = articleDatabase.filter(a => 
            a.sifra.toLowerCase().includes(val) || 
            a.opis.toLowerCase().includes(val)
        );
        topArticles = foundArticles.slice(0, 20);
    }

    if (topArticles.length > 0) {
        matchesFound = true;
        const title = document.createElement("h3");
        title.style.gridColumn = "1 / -1";
        title.style.margin = "0 0 10px 0";
        title.style.color = "#2563eb";
        title.textContent = `Najdeno v šifrantu artiklov (${topArticles.length}):`;
        resultsContainer.appendChild(title);

        topArticles.forEach(art => {
            const div = document.createElement("div");
            div.className = "item";
            div.style.cursor = "default";
            div.innerHTML = `
                <div class="item-preview file-bg" style="background:#eff6ff"><div class="big-icon">🏷️</div></div>
                <div class="item-info">
                  <strong style="color:#1e40af">${art.sifra}</strong>
                  <small style="font-size:1em; color:#334155">${art.opis}</small>
                </div>`;
            resultsContainer.appendChild(div);
        });
    }

    const localMatches = currentItems.filter(item => item.name.toLowerCase().includes(val));
    
    if (localMatches.length > 0) {
        matchesFound = true;
        if (topArticles.length > 0) {
            const separator = document.createElement("div");
            separator.style.gridColumn = "1 / -1";
            separator.style.borderTop = "1px solid #e2e8f0";
            separator.style.margin = "20px 0";
            resultsContainer.appendChild(separator);
        }
        const title = document.createElement("h3");
        title.style.gridColumn = "1 / -1";
        title.style.margin = "0 0 10px 0";
        title.textContent = "Najdene datoteke in mape:";
        resultsContainer.appendChild(title);

        for (const item of localMatches) {
            await createItemElement(item, resultsContainer);
        }
    }

    if (!matchesFound) {
        statusEl.textContent = "Ni rezultatov.";
        mainContent.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b;">
                <div style="font-size:40px; margin-bottom:10px;">🔍</div>
                <h3>Ni zadetkov</h3>
                <p>Nismo našli artikla "${e.target.value}" v šifrantu,<br>niti datoteke s tem imenom v tej mapi.</p>
            </div>
        `;
    } else {
        statusEl.textContent = `Najdeno: ${topArticles.length} artiklov, ${localMatches.length} datotek`;
        mainContent.appendChild(resultsContainer);
    }
});

(async () => {
  if (window.location.search.includes("code=") || window.location.hash.includes("access_token=")) {
    await supabase.auth.getSession(); window.history.replaceState({}, document.title, window.location.pathname);
  }
  checkUser();
  supabase.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' && session) showApp(session.user.email); if (event === 'SIGNED_OUT') showLogin(); });
})();