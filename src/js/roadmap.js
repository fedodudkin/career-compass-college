// ── Страница Roadmap: загрузка данных, рендер и логика взаимодействия ──
import {
  loadSpecialtiesData,
  getDoneSkills,
  toggleDoneSkill,
  formatCurrency,
  isSectionCollapsed,
  toggleSectionCollapsed
} from './utils.js';

let allData      = null;
let activeFilter = 'all';
let lastFocusedElement = null;

// ── Загрузка данных и инициализация страницы ────────────────────
async function loadData() {
  try {
    allData = await loadSpecialtiesData();

    // Читаем ?spec= — передаётся при переходе с главной страницы
    const params    = new URLSearchParams(globalThis.location.search);
    const specParam = params.get('spec');
    if (specParam && allData.specialties.some(s => s.id === specParam)) {
      activeFilter = specParam; // активируем нужный таб до рендера
    }

    renderAll();
    updateGlobalStats();
    initFilters();

    // Скролл к секции после полной отрисовки DOM
    if (specParam) {
      requestAnimationFrame(() => {
        const section = document.querySelector(
          `.specialty-section[data-spec="${CSS.escape(specParam)}"]`
        );
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Регистрируем новые элементы в reveal-observer
        if (typeof globalThis.__revealObserve === 'function') {
          globalThis.__revealObserve(document.getElementById('roadmap-content'));
        }
      });
    }
  } catch (error) {
    console.error(error);
    const content  = document.getElementById('roadmap-content');
    const progress = document.getElementById('global-progress');
    if (content) {
      content.innerHTML = '<div class="load-error">Не удалось загрузить данные. Попробуйте обновить страницу позже.</div>';
    }
    if (progress) progress.textContent = 'Ошибка загрузки данных';
  }
}

// ── Рендер всех секций специальностей ──────────────────────────
function renderAll() {
  const content = document.getElementById('roadmap-content');
  if (!content) return;

  const done = getDoneSkills();

  // Фильтруем специальности по активному фильтру
  const specialties = activeFilter === 'all'
    ? allData.specialties
    : allData.specialties.filter(s => s.id === activeFilter);

  content.innerHTML = specialties.map(spec => {
    const total       = spec.skills.length;
    const completed   = spec.skills.filter(sk => done[sk.id]).length;
    const isCollapsed = isSectionCollapsed(spec.id);

    return `
    <div class="specialty-section animate-on-reveal ${isCollapsed ? 'collapsed' : ''}" data-spec="${spec.id}">

      <!-- Заголовок секции: клик сворачивает / разворачивает -->
      <div class="spec-section-header" data-role="toggle-section" data-spec="${spec.id}">
        <div class="spec-header-left">
          <div class="spec-icon"><img src="${spec.icon}" alt="${spec.title}" class="spec-icon-img" onerror="this.style.display='none'"></div>
          <div>
            <div class="spec-info-code">${spec.code}</div>
            <div class="spec-info-title">${spec.title}</div>
          </div>
        </div>
        <div class="spec-header-right">
          <span class="spec-stats">${completed}/${total} навыков</span>
          <div class="spec-salary-badge" style="--card-color:${spec.color}" data-role="open-salary-modal" data-spec="${spec.id}">
            Зарплаты и работодатели
          </div>
          <div class="collapse-icon">▼</div>
        </div>
      </div>

      <!-- Сетка карточек навыков специальности -->
      <div class="skills-grid">
        ${spec.skills.map(sk => `
          <div class="skill-card ${done[sk.id] ? 'done' : ''} animate-on-reveal"
               style="--card-color:${spec.color}"
               data-role="open-skill-modal"
               data-spec="${spec.id}"
               data-skill="${sk.id}">

            <!-- Кнопка быстрой отметки: без открытия модалки -->
            <button class="skill-check-btn ${done[sk.id] ? 'done' : ''}"
                    style="--card-color:${spec.color}"
                    data-role="quick-toggle"
                    data-skill="${sk.id}"
                    title="${done[sk.id] ? 'Снять отметку' : 'Отметить пройденным'}">
              ✓
            </button>

            <div class="skill-category">${sk.category}</div>
            <div class="skill-title">${sk.title}</div>
            <div class="skill-desc">${sk.description}</div>
          </div>
        `).join('')}
      </div>

    </div>`;
  }).join('');

  // ── Доступность: навигация с клавиатуры ────────────────────────
  // Секции и карточки получают role=button и обработчик Enter/Пробел
  const sectionHeaders = content.querySelectorAll('.spec-section-header');
  sectionHeaders.forEach(header => {
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });

  const skillCards = content.querySelectorAll('.skill-card');
  skillCards.forEach(card => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Регистрируем новые .animate-on-reveal элементы в reveal-observer.
  // Элементы с .is-visible пропускаются — анимация не повторяется.
  if (typeof globalThis.__revealObserve === 'function') {
    globalThis.__revealObserve(content);
  }
}

// ── Быстрая отметка навыка (без открытия модалки) ──────────────
/**
 * Хирургический DOM-патч при отметке навыка.
 *
 * Почему не renderAll(): перезапись innerHTML создаёт новые узлы →
 * они не имеют .is-visible → reveal-observer подхватывает → ре-анимация.
 * Вместо этого находим существующий узел и точечно патчим его классы.
 */
function quickToggle(skillId) {
  const wasDone = !!getDoneSkills()[skillId];
  toggleDoneSkill(skillId);
  const isDone = !wasDone;

  // Патчим карточку навыка — узел остаётся тем же, .is-visible сохраняется
  const card = document.querySelector(
    `.skill-card[data-skill="${CSS.escape(skillId)}"]`
  );
  if (card) {
    card.classList.toggle('done', isDone);

    // Кнопка-галочка: стиль и подсказка
    const btn = card.querySelector('.skill-check-btn');
    if (btn) {
      btn.classList.toggle('done', isDone);
      btn.title = isDone ? 'Снять отметку' : 'Отметить пройденным';
    }

    // Счётчик «X/Y навыков» в заголовке секции
    const section = card.closest('.specialty-section');
    if (section) {
      const spec = allData?.specialties.find(s => s.id === section.dataset.spec);
      if (spec) {
        const done      = getDoneSkills();
        const completed = spec.skills.filter(sk => done[sk.id]).length;
        const statsEl   = section.querySelector('.spec-stats');
        if (statsEl) statsEl.textContent = `${completed}/${spec.skills.length} навыков`;
      }
    }
  }

  // Обновляем глобальный счётчик без перерисовки страницы
  updateGlobalStats();
}

// ── Свернуть / развернуть секцию специальности ─────────────────
function toggleSection(specId) {
  toggleSectionCollapsed(specId);
  renderAll();
}

// ════════════════════════════════════════════════════════════════
// МОДАЛЬНОЕ ОКНО НАВЫКА
// ════════════════════════════════════════════════════════════════

// ── Открыть модалку с подробностями навыка ──────────────────────
function openModal(skillId, specId) {
  const spec  = allData.specialties.find(s => s.id === specId);
  const skill = spec.skills.find(sk => sk.id === skillId);
  const isDone = !!getDoneSkills()[skillId];

  const modal   = document.getElementById('skill-modal');
  const overlay = document.getElementById('modal-overlay');

  lastFocusedElement = document.activeElement;

  // Заполняем поля модалки данными навыка
  document.getElementById('modal-spec-label').innerHTML = `<img src="${spec.icon}" class="modal-spec-icon" alt=""> ${spec.code}`;
  document.getElementById('modal-category').textContent    = skill.category;
  document.getElementById('modal-title').textContent       = skill.title;
  document.getElementById('modal-description').textContent = skill.description;

  // Список подтем для изучения
  const topicsList = document.getElementById('modal-topics-list');
  topicsList.innerHTML = (skill.topics || [])
    .map(t => `<li class="modal-topic-item"><span class="topic-dot"></span>${t}</li>`)
    .join('');

  // Задаём акцентный цвет модалки из цвета специальности
  modal.style.setProperty('--modal-color', spec.color);

  // Кнопка переключения состояния «пройдено / не пройдено»
  const btn = document.getElementById('modal-toggle-btn');
  updateModalBtn(btn, isDone);
  btn.onclick = () => {
    const nowDone = !!getDoneSkills()[skillId];
    toggleDoneSkill(skillId);
    const isDone = !nowDone;
    updateModalBtn(btn, isDone);

    // Точечный патч карточки (аналогично quickToggle) — без ре-анимации
    const card = document.querySelector(`.skill-card[data-skill="${CSS.escape(skillId)}"]`);
    if (card) {
      card.classList.toggle('done', isDone);
      const cb = card.querySelector('.skill-check-btn');
      if (cb) {
        cb.classList.toggle('done', isDone);
        cb.title = isDone ? 'Снять отметку' : 'Отметить пройденным';
      }
      // Обновляем счётчик секции
      const section = card.closest('.specialty-section');
      if (section) {
        const spec2 = allData?.specialties.find(s => s.id === section.dataset.spec);
        if (spec2) {
          const d2 = getDoneSkills();
          const c2 = spec2.skills.filter(sk => d2[sk.id]).length;
          const el2 = section.querySelector('.spec-stats');
          if (el2) el2.textContent = `${c2}/${spec2.skills.length} навыков`;
        }
      }
    }
    updateGlobalStats();
  };

  // Показываем зарплатную модалку, блокируем прокрутку фона страницы
  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) {
    closeBtn.focus();
  }
}

// ── Обновить состояние кнопки «Отметить» в модалке ──────────────
function updateModalBtn(btn, isDone) {
  btn.textContent = isDone ? '✓ Пройдено' : 'Отметить пройденным';
  btn.classList.toggle('is-done', isDone);
}

// ── Закрыть любую открытую модалку ──────────────────────────────
function closeModal() {
  document.getElementById('skill-modal').classList.remove('open');
  document.getElementById('salary-modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
}

// Привязываем обработчики после загрузки DOM
// ── Обработчики событий ──────────────────────────────────────
// ES-модуль выполняется с defer — DOM уже готов, DOMContentLoaded не нужен

// Закрытие модалок по клику на полупрозрачный оверлей
const overlay = document.getElementById('modal-overlay');
if (overlay) overlay.addEventListener('click', closeModal);

// Закрытие модалки навыка по кнопке ✕
const closeBtn = document.getElementById('modal-close-btn');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

// Закрытие зарплатной модалки по кнопке ✕
const salaryCloseBtn = document.getElementById('salary-close-btn');
if (salaryCloseBtn) salaryCloseBtn.addEventListener('click', closeModal);

// Закрытие любой открытой модалки по клавише Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Делегирование кликов в области roadmap-content ───────────
// Один обработчик на весь контент вместо множества обработчиков на элементы
const content = document.getElementById('roadmap-content');
if (content) {
  content.addEventListener('click', (event) => {
    const roleTarget = event.target.closest('[data-role]');
    if (!roleTarget) return;
    const role = roleTarget.dataset.role;

    if (role === 'quick-toggle') {
      // Быстрая отметка через кнопку-галочку без открытия модалки
      const skillId = roleTarget.dataset.skill;
      if (!skillId) return;
      event.stopPropagation();
      quickToggle(skillId);
      return;
    }
    if (role === 'toggle-section') {
      // Сворачивание / разворачивание секции специальности
      const specId = roleTarget.dataset.spec
        || roleTarget.closest('[data-spec]')?.dataset.spec;
      if (!specId) return;
      toggleSection(specId);
      return;
    }
    if (role === 'open-salary-modal') {
      // Открытие модалки с зарплатами
      const specId = roleTarget.dataset.spec;
      if (!specId) return;
      event.stopPropagation();
      openSalaryModal(specId);
      return;
    }
    if (role === 'open-skill-modal') {
      // Открытие модалки с подробностями навыка
      const specId  = roleTarget.dataset.spec;
      const skillId = roleTarget.dataset.skill;
      if (!specId || !skillId) return;
      openModal(skillId, specId);
    }
  });
}

// ── Делегирование кликов на фильтр-баре ──────────────────────
const filterBar = document.getElementById('filter-bar');
if (filterBar) {
  filterBar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter-id]');
    if (!btn) return;
    const id = btn.dataset.filterId;
    if (!id) return;
    setFilter(id);
  });
}

// ── Инициализация фильтров по специальностям ────────────────────
function initFilters() {
  if (!allData) return;
  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  const filters = [
    { id: 'all', label: 'Все специальности' },
    ...allData.specialties.map(s => ({ id: s.id, label: `<img src="${s.icon}" class="filter-btn-icon" alt=""> ${s.code}` }))
  ];

  bar.innerHTML = filters.map(f =>
    `<button class="filter-btn ${f.id === activeFilter ? 'active' : ''}"
      type="button"
      data-filter-id="${f.id}">${f.label}</button>`
  ).join('');
}

// ── Установить активный фильтр и перерендерить секции ───────────
function setFilter(id) {
  activeFilter = id;
  initFilters();
  renderAll();
}

// ── Глобальный счётчик прогресса (X / Y навыков пройдено) ───────
function updateGlobalStats() {
  if (!allData) return;
  const done      = getDoneSkills();
  const total     = allData.specialties.reduce((acc, s) => acc + s.skills.length, 0);
  const completed = Object.keys(done).length;

  const el = document.getElementById('global-progress');
  if (el) el.textContent = `${completed} / ${total} навыков пройдено`;
}

// ════════════════════════════════════════════════════════════════
// ЗАРПЛАТНАЯ МОДАЛКА
// ════════════════════════════════════════════════════════════════

// ── Открыть зарплатную модалку для специальности ────────────────
function openSalaryModal(specId) {
  const spec = allData.specialties.find(s => s.id === specId);
  const sal  = spec.salary;
  const modal   = document.getElementById('salary-modal');
  const overlay = document.getElementById('modal-overlay');

  lastFocusedElement = document.activeElement;

  // Заполняем шапку модалки: иконка, код, источники
  document.getElementById('sal-spec-label').innerHTML = `<img src="${spec.icon}" class="modal-spec-icon" alt=""> ${spec.code}`;
  document.getElementById('sal-spec-title').textContent  = spec.title;
  const srcEl = document.getElementById('sal-source');
  if (srcEl) srcEl.textContent = sal.sources ? `Источники: ${sal.sources}` : '';

  // Цвет акцента — берётся из цвета специальности
  modal.style.setProperty('--modal-color', spec.color);

  // Таблица уровней зарплат: Junior / Middle / Senior
  const levels = { jun: 'junior', mid: 'middle', sen: 'senior' };
  Object.entries(levels).forEach(([key, level]) => {
    document.getElementById(`sal-${key}-min`).textContent = formatCurrency(sal[level].min);
    document.getElementById(`sal-${key}-avg`).textContent = formatCurrency(sal[level].avg);
    document.getElementById(`sal-${key}-max`).textContent = formatCurrency(sal[level].max);
  });


  // Горизонтальные бары прогноза зарплат по годам
  const barsEl  = document.getElementById('sal-forecast-bars');
  const maxVal  = Math.max(...sal.forecast.map(f => f.avg));
  barsEl.innerHTML = sal.forecast.map(f => {
    const pct = Math.round(f.avg / maxVal * 100);
    return `
    <div class="sal-bar-row">
      <span class="sal-bar-year">${f.year}</span>
      <div class="sal-bar-wrap">
        <div class="sal-bar-fill" style="width:${pct}%; background:${spec.color}"></div>
      </div>
      <span class="sal-bar-val">${formatCurrency(f.avg)}</span>
    </div>`;
  }).join('');

  // Аналитический комментарий к тренду
  const noteEl = document.getElementById('sal-trend-note');
  if (noteEl) noteEl.textContent = sal.trend_note || '';

  // Список компаний-работодателей с кликабельными ссылками
  const companiesList = document.getElementById('sal-companies-list');
    // Рендерим ссылки на работодателей.
  // Если URL отсутствует — рендерим некликабельный <span>
  companiesList.innerHTML = (spec.companies || []).map(c => {
    const hasUrl = c.url && c.url.trim() !== '' && c.url !== '#';
    if (hasUrl) {
      return `<a class="sal-company-badge"
                 href="${c.url}"
                 target="_blank"
                 rel="noopener noreferrer"
                 style="--modal-color:${spec.color}">${c.name}<span class="sal-company-arrow">↗</span></a>`;
    }
    return `<span class="sal-company-badge company-badge--disabled"
                  title="Страница карьеры временно недоступна">${c.name}</span>`;
  }).join('');

  // Показываем зарплатную модалку
  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const closeBtn = document.getElementById('salary-close-btn');
  if (closeBtn) {
    closeBtn.focus();
  }
}

// ── Точка входа: загрузка данных ────────────────────────────────
await loadData();