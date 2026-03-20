// ── Главная страница: загрузка специальностей и рендер карточек ──

import { loadSpecialtiesData, getDoneSkills } from './utils.js';

// Маппинг специальностей на PNG-иконки из папки img/
const ICONS = {
  web:      'img/icons8-web-development-48.png',
  gamedev:  'img/icons8-game-controller-48.png',
  ai:       'img/icons8-artificial-intelligence-brain-48.png',
  security: 'img/icons8-security-shield-48.png'
};

// Бейджи статуса для каждой специальности
const BADGES = {
  web:      'Высокий спрос',
  gamedev:  'Растущий рынок',
  ai:       'Топ направление',
  security: 'Стабильный спрос',
};

async function initHome() {
  const grid = document.getElementById('specialties-grid');
  if (!grid) return;

  let data;
  try {
    data = await loadSpecialtiesData();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<div class="load-error">Не удалось загрузить данные. Попробуйте обновить страницу позже.</div>';
    return;
  }

  const done = getDoneSkills();

  // Рендерим карточку для каждой специальности
  grid.innerHTML = data.specialties.map((spec, i) => {
    const total = spec.skills.length;
    const completed = spec.skills.filter(sk => done[sk.id]).length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const badge = BADGES[spec.id] || 'Актуально';

    return `
    <article class="specialty-card animate-on-reveal"
             style="--card-color:${spec.color}; --reveal-delay:${i * 80}ms"
             data-spec-id="${spec.id}"
             role="button"
             tabindex="0"
             aria-label="${spec.title}">

      <!-- Иконка специальности -->
      <div class="card-icon-wrap">
        <img class="card-icon-img"
             src="${ICONS[spec.id]}"
             alt=""
             aria-hidden="true">
      </div>

      <!-- Код специальности -->
      <div class="card-code">${spec.code}</div>

      <!-- Заголовок и описание -->
      <h2 class="card-title">${spec.title}</h2>
      <p class="card-desc">${spec.description}</p>

      <!-- Бейдж статуса + счётчик навыков -->
      <div class="card-meta">
        <span class="card-badge">${badge}</span>
        <span class="card-skill-count">${total} навыков</span>
      </div>

      <!-- Прогресс-бар пройденных навыков -->
      <div class="card-progress" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Прогресс: ${pct}%">
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-text">${pct}%</span>
      </div>

    </article>`;
  }).join('');

  // Делегирование событий: переход к roadmap по клику/Enter/Space
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.specialty-card');
    if (!card) return;
    const specId = card.dataset.specId;
    if (!specId) return;
    globalThis.location.href = `roadmap.html?spec=${encodeURIComponent(specId)}`;
  });

  grid.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.specialty-card');
    if (!card) return;
    event.preventDefault();
    const specId = card.dataset.specId;
    if (!specId) return;
    globalThis.location.href = `roadmap.html?spec=${encodeURIComponent(specId)}`;
  });

  // Регистрируем карточки в системе анимации появления
  if (typeof globalThis.__revealObserve === 'function') {
    globalThis.__revealObserve(grid);
  }

  // Обработчик ошибки загрузки иконки — показать fallback-значок
  grid.querySelectorAll('.card-icon-img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback) {
        fallback.style.display = 'flex';
      }
    });
  });

  // Обновляем счётчики статистики на главной
  const total = data.specialties.reduce((acc, s) => acc + s.skills.length, 0);
  const completed = Object.keys(done).length;
  const elDone = document.getElementById('stat-done');
  const elTotal = document.getElementById('stat-total');
  if (elDone) elDone.textContent = completed;
  if (elTotal) elTotal.textContent = total;
}

await initHome();