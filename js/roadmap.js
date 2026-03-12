// ── Загрузка данных и отрисовка дорожной карты ────────────────────────────────
let allData = null;
let activeFilter = 'all';

async function loadData() {
  const res = await fetch('/data/data.json');
  allData = await res.json();
  renderAll();
  updateGlobalStats();
}

// ── Вспомогательные функции для LocalStorage ──────────────────────────────────────
function getDoneSkills() {
  return JSON.parse(localStorage.getItem('roadmap_done') || '{}');
}
function toggleSkill(id) {
  const done = getDoneSkills();
  done[id] ? delete done[id] : (done[id] = true);
  localStorage.setItem('roadmap_done', JSON.stringify(done));
  return done;
}

// ── Отрисовка интерфейса ────────────────────────────────────────────────────
function renderAll() {
  const content = document.getElementById('roadmap-content');
  if (!content) return;
  const done = getDoneSkills();

  const specialties = activeFilter === 'all'
    ? allData.specialties
    : allData.specialties.filter(s => s.id === activeFilter);

  content.innerHTML = specialties.map(spec => {
    const total = spec.skills.length;
    const completed = spec.skills.filter(sk => done[sk.id]).length;
    const pct = total ? Math.round(completed / total * 100) : 0;
    const isCollapsed = localStorage.getItem(`collapsed_${spec.id}`) === '1';

    return `
    <div class="specialty-section ${isCollapsed ? 'collapsed' : ''}" data-spec="${spec.id}">
      <div class="spec-section-header" onclick="toggleSection('${spec.id}')">
        <div class="spec-header-left">
          <div class="spec-icon">${spec.icon}</div>
          <div>
            <div class="spec-info-code">${spec.code}</div>
            <div class="spec-info-title">${spec.title}</div>
          </div>
        </div>
        <div class="spec-header-right">
          <span class="spec-stats">${completed}/${total} навыков</span>
          <div class="collapse-icon">▼</div>
        </div>
      </div>
      <div class="skills-grid">
        ${spec.skills.map(sk => `
          <div class="skill-card ${done[sk.id] ? 'done' : ''}"
               style="--card-color:${spec.color}"
               onclick="handleSkillClick('${sk.id}', '${spec.id}')">
            <div class="skill-check">✓</div>
            <div class="skill-category">${sk.category}</div>
            <div class="skill-title">${sk.title}</div>
            <div class="skill-desc">${sk.description}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

function handleSkillClick(skillId, specId) {
  toggleSkill(skillId);
  renderAll();
  updateGlobalStats();
  updateHomeCards();
}

function toggleSection(specId) {
  const key = `collapsed_${specId}`;
  localStorage.getItem(key) === '1'
    ? localStorage.removeItem(key)
    : localStorage.setItem(key, '1');
  renderAll();
}

// ── Фильтры специальностей ───────────────────────────────────────────────────
function initFilters() {
  if (!allData) return;
  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  const filters = [{ id: 'all', label: 'Все специальности' }, ...allData.specialties.map(s => ({ id: s.id, label: s.icon + ' ' + s.code }))];

  bar.innerHTML = filters.map(f =>
    `<button class="filter-btn ${f.id === activeFilter ? 'active' : ''}"
      onclick="setFilter('${f.id}')">${f.label}</button>`
  ).join('');
}

function setFilter(id) {
  activeFilter = id;
  initFilters();
  renderAll();
}

// ── Обновление глобальной статистики ──────────────────────────────────────────────
function updateGlobalStats() {
  if (!allData) return;
  const done = getDoneSkills();
  const total = allData.specialties.reduce((a, s) => a + s.skills.length, 0);
  const completed = Object.keys(done).length;
  const pct = total ? Math.round(completed / total * 100) : 0;

  const el = document.getElementById('global-progress');
  if (el) el.textContent = `${completed} / ${total} навыков пройдено`;

  const pctEl = document.getElementById('global-pct');
  if (pctEl) pctEl.textContent = pct + '%';
}

// ── Обновление карточек главной страницы (вызывается из roadmap при синхронизации данных)
function updateHomeCards() {}

// ── Инициализация ──────────────────────────────────────────────────────
loadData().then(() => {
  initFilters();
});