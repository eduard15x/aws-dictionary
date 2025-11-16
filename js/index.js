// app.js
// Entry point: loads services.json and renders UI
const homeView = document.getElementById('homeView');
const dictView = document.getElementById('dictView');
const dictionariesEl = document.getElementById('dictionaries');
const modulesContainer = document.getElementById('modulesContainer');
const searchInput = document.getElementById('searchInput');
const noMatchesEl = document.getElementById('noMatches');
const backLink = document.getElementById('backLink');

let awsServices = []; // populated from services.json
const dictionaries = [
  { title: 'AWS Dictionary', slug: 'aws-dictionary', description: 'Amazon Web Services concepts and terminology', entries: () => awsServices.length }
];

async function init() {
  try {
    const resp = await fetch('services.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('Failed to fetch services.json: ' + resp.status);
    awsServices = await resp.json();
  } catch (err) {
    console.error(err);
    // fallback: empty array
    awsServices = [];
  }

  renderHome();
  attachHandlers();

  // If user opens with #aws in URL, open dict automatically
  if (location.hash === '#aws') openDict();
}

function renderHome(){
  dictionariesEl.innerHTML = '';
  dictionaries.forEach(d=>{
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'card';
    a.onclick = (e)=>{ e.preventDefault(); openDict(); };
    a.innerHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start">
        <div style="margin-top:6px; color:var(--muted-foreground);">
          <!-- book icon -->
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 19.5A2.5 2.5 0 0 1 5.5 17H20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.5 5H20v12H5.5A2.5 2.5 0 0 0 3 19.5V6.5A1.5 1.5 0 0 1 4.5 5H5.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div style="flex:1">
          <h2>${d.title}</h2>
          <p>${d.description}</p>
          <div class="meta">${awsServices.length} entries</div>
        </div>
      </div>
    `;
    dictionariesEl.appendChild(a);
  });
}

function groupServices(services){
  const grouped = services.reduce((acc, s) => {
    acc[s.module] = acc[s.module] || [];
    acc[s.module].push(s);
    return acc;
  }, {});
  const entries = Object.entries(grouped).sort((a,b)=> a[0].localeCompare(b[0]));
  return entries;
}

let expandedModules = new Set(); // will be fully expanded after data loads

function renderDict(filter=''){
  const q = (filter || '').trim().toLowerCase();
  const filtered = q ? awsServices.filter(s =>
    s.abbreviation.toLowerCase().includes(q) ||
    s.fullName.toLowerCase().includes(q) ||
    s.module.toLowerCase().includes(q)
  ) : awsServices;

  const grouped = groupServices(filtered);
  modulesContainer.innerHTML = '';

  if (grouped.length === 0) {
    noMatchesEl.style.display = 'block';
    noMatchesEl.textContent = `No services found matching "${filter}"`;
    return;
  } else {
    noMatchesEl.style.display = 'none';
  }

  // Ensure expandedModules contains known modules (first render)
  if (expandedModules.size === 0) {
    (new Set(awsServices.map(s => s.module))).forEach(m => expandedModules.add(m));
  }

  grouped.forEach(([module, services]) => {
    const moduleEl = document.createElement('section');
    moduleEl.className = 'module';

    const headerBtn = document.createElement('button');
    headerBtn.className = 'module-header';
    headerBtn.type = 'button';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'module-title';
    titleDiv.textContent = module;

    const chev = document.createElementNS('http://www.w3.org/2000/svg','svg');
    chev.setAttribute('viewBox','0 0 24 24');
    chev.setAttribute('width','20');
    chev.setAttribute('height','20');
    chev.classList.add('chev');
    chev.innerHTML = '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';

    if (expandedModules.has(module)) chev.classList.add('rot');

    headerBtn.appendChild(titleDiv);
    headerBtn.appendChild(chev);
    headerBtn.onclick = ()=> {
      if (expandedModules.has(module)) expandedModules.delete(module);
      else expandedModules.add(module);
      renderDict(searchInput.value);
    };

    moduleEl.appendChild(headerBtn);

    if (expandedModules.has(module)) {
      const list = document.createElement('div');
      list.style.marginTop = '8px';
      services.forEach((service) => {
        const art = document.createElement('article');
        art.className = 'service';

        art.innerHTML = `
          <h3>${escapeHtml(service.abbreviation)} <span style="font-weight:500; font-size:15px; color:var(--muted-foreground)">(${escapeHtml(service.fullName)})</span></h3>
          <p>${escapeHtml(service.description)}</p>
          <div>
            <h4 style="margin:8px 0 6px 0; font-size:13px; margin-bottom:6px;">Example / Use Case</h4>
            <p class="usecase">${escapeHtml(service.usecase)}</p>
          </div>
          <div class="info-box">
            <h4 style="margin:0 0 8px 0; font-size:13px;">Additional Information</h4>
            <ul>
              ${service.additionalInfo.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}
            </ul>
          </div>
        `;
        list.appendChild(art);
      });
      moduleEl.appendChild(list);
    }

    modulesContainer.appendChild(moduleEl);
  });
}

function attachHandlers(){
  backLink.addEventListener('click', (e)=>{ e.preventDefault(); openHome(); });
  searchInput.addEventListener('input', (e)=> {
    renderDict(e.target.value);
  });

  // focus search when entering dict via card click
  document.addEventListener('click', (e)=>{
    if (e.target.closest && e.target.closest('.card')){
      setTimeout(()=> searchInput.focus(), 120);
    }
  });
}

function openDict(){
  homeView.style.display = 'none';
  dictView.style.display = '';
  searchInput.value = '';
  renderDict();
}

function openHome(){
  dictView.style.display = 'none';
  homeView.style.display = '';
}

function escapeHtml(str){
  if (!str) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

init();

// Load saved theme on startup
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = (currentTheme === "dark") ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
}
window.toggleTheme = toggleTheme; // <-- make it global
