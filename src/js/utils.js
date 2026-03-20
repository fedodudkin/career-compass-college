// ╔══════════════════════════════════════════════════════════════╗
// ║  utils.js — общие утилиты: загрузка данных, localStorage,    ║
// ║  форматирование. Используется на всех страницах проекта.     ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Типы данных (JSDoc) ───────────────────────────────────────

/**
 * @typedef {Object} УровеньЗарплаты
 * @property {number} min  — минимальная зарплата
 * @property {number} max  — максимальная зарплата
 * @property {number} avg  — средняя зарплата
 */

/**
 * @typedef {Object} ПрогнозЗарплаты
 * @property {number} year — год прогноза
 * @property {number} avg  — прогнозируемая средняя зарплата
 */

/**
 * @typedef {Object} ДанныеЗарплат
 * @property {УровеньЗарплаты} junior
 * @property {УровеньЗарплаты} middle
 * @property {УровеньЗарплаты} senior
 * @property {string} currency    — валюта (обычно "RUB")
 * @property {string} sources     — источники данных
 * @property {string} trend       — тренд: "positive" | "strong_positive"
 * @property {string} trend_note  — аналитический комментарий к прогнозу
 * @property {ПрогнозЗарплаты[]} forecast — прогноз по годам
 */

/**
 * @typedef {Object} Компания
 * @property {string} name — название компании
 * @property {string} url  — ссылка на страницу карьеры
 */

/**
 * @typedef {Object} Навык
 * @property {string}   id          — уникальный идентификатор
 * @property {string}   title       — название навыка
 * @property {string}   category    — категория (Frontend, Backend и т.д.)
 * @property {string}   description — краткое описание
 * @property {string[]} topics      — список подтем для изучения
 */

/**
 * @typedef {Object} Специальность
 * @property {string}        id          — идентификатор (web, gamedev, ai, security)
 * @property {string}        code        — код специальности (09.02.09 и т.д.)
 * @property {string}        title       — полное название
 * @property {string}        description — описание для карточки главной
 * @property {string}        color       — цвет акцента (#hex)
 * @property {string}        icon        — путь к PNG-иконке
 * @property {Навык[]}       skills      — массив навыков
 * @property {ДанныеЗарплат} salary      — данные о зарплатах
 * @property {Компания[]}    companies   — работодатели
 */

/**
 * @typedef {Object} ДанныеСпециальностей
 * @property {Специальность[]} specialties
 */

// ── Ключи хранилища ───────────────────────────────────────────
// Все данные приложения хранятся в localStorage браузера
const ROADMAP_DONE_KEY     = 'roadmap_done';     // пройденные навыки
const FORM_SUBMISSIONS_KEY = 'form_submissions'; // заявки обратной связи

// ── Вспомогательные функции ───────────────────────────────────

/**
 * Безопасно парсит JSON-строку, возвращая fallback при ошибке.
 * Защищает от сломанных данных в localStorage.
 *
 * @param {string|null} value
 * @param {any} fallback — значение по умолчанию
 * @returns {any}
 */
function safeJsonParse(value, fallback) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Минимальная проверка структуры data.json во время выполнения.
 * Отсеивает специальности с неполными данными и выбрасывает
 * исключение если ни одной корректной специальности не найдено.
 *
 * @param {any} data — распарсенные данные JSON
 * @returns {ДанныеСпециальностей}
 */
function validateSpecialtiesData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.specialties)) {
    throw new Error('Некорректный формат data.json: отсутствует массив "specialties".');
  }

  // Оставляем только специальности с обязательными полями
  const specialties = data.specialties.filter((spec) => {
    return (
      spec &&
      typeof spec.id       === 'string' &&
      typeof spec.code     === 'string' &&
      Array.isArray(spec.skills) &&
      spec.salary          &&
      typeof spec.salary   === 'object' &&
      Array.isArray(spec.companies)
    );
  });

  if (specialties.length === 0) {
    throw new Error('Некорректный формат data.json: ни одна специальность не прошла валидацию.');
  }

  return /** @type {ДанныеСпециальностей} */ ({ specialties });
}

// ── Загрузка данных ───────────────────────────────────────────

/**
 * Загружает данные специальностей из data.json.
 *
 * ВАЖНО: fetch резолвит путь относительно window.location (HTML-страницы),
 * а НЕ относительно JS-файла. Все HTML находятся в src/, data.json — в src/data/.
 * Поэтому путь: 'data/data.json' (без ../).
 *
 * @returns {Promise<ДанныеСпециальностей>}
 */
export async function loadSpecialtiesData() {
  let response;
  try {
    response = await fetch('data/data.json');
  } catch {
    throw new Error('Ошибка сети при загрузке data.json');
  }
  if (!response.ok) {
    throw new Error(`Не удалось загрузить data.json: статус ${response.status}`);
  }
  const rawData = await response.json();
  return validateSpecialtiesData(rawData);
}

// ── Управление прогрессом (localStorage) ─────────────────────

/**
 * Возвращает карту пройденных навыков из localStorage.
 * Ключ — id навыка, значение — true.
 *
 * @returns {{ [skillId: string]: boolean }}
 */
export function getDoneSkills() {
  try {
    const raw    = localStorage.getItem(ROADMAP_DONE_KEY);
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Сохраняет карту пройденных навыков в localStorage.
 *
 * @param {{ [skillId: string]: boolean }} doneMap
 */
export function setDoneSkills(doneMap) {
  try {
    localStorage.setItem(ROADMAP_DONE_KEY, JSON.stringify(doneMap));
  } catch {
    // Тихо игнорируем ошибки записи (приватный режим, переполнение)
  }
}

/**
 * Переключает состояние навыка (пройден / не пройден)
 * и сохраняет результат в localStorage.
 *
 * @param {string} skillId
 * @returns {{ [skillId: string]: boolean }} обновлённая карта
 */
export function toggleDoneSkill(skillId) {
  const done = getDoneSkills();
  if (done[skillId]) {
    delete done[skillId];
  } else {
    done[skillId] = true;
  }
  setDoneSkills(done);
  return done;
}

// ── Управление состоянием секций (localStorage) ───────────────

/**
 * Проверяет, свёрнута ли секция специальности.
 *
 * @param {string} specId
 * @returns {boolean}
 */
export function isSectionCollapsed(specId) {
  try {
    return localStorage.getItem(`collapsed_${specId}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Переключает состояние «свёрнуто / развёрнуто» секции
 * и сохраняет его в localStorage.
 *
 * @param {string} specId
 * @returns {boolean} текущее состояние после переключения
 */
export function toggleSectionCollapsed(specId) {
  const key = `collapsed_${specId}`;
  try {
    const isCollapsed = localStorage.getItem(key) === '1';
    if (isCollapsed) {
      localStorage.removeItem(key);
      return false;
    }
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

// ── Управление заявками формы (localStorage) ──────────────────

/**
 * Читает список заявок обратной связи из localStorage.
 *
 * @returns {Array<{id:number; name:string; email:string; specialty:string; message:string; date:string}>}
 */
export function getFormSubmissions() {
  try {
    const raw    = localStorage.getItem(FORM_SUBMISSIONS_KEY);
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Добавляет новую заявку в localStorage.
 *
 * @param {{id:number; name:string; email:string; specialty:string; message:string; date:string}} submission
 */
export function addFormSubmission(submission) {
  const submissions = getFormSubmissions();
  submissions.push(submission);
  try {
    localStorage.setItem(FORM_SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch {
    // Тихо игнорируем ошибки записи
  }
}

// ── Форматирование ────────────────────────────────────────────

/**
 * Форматирует число как денежную сумму в рублях.
 * Пример: 180000 → «180 000 ₽»
 *
 * @param {number} num
 * @returns {string}
 */
export function formatCurrency(num) {
  return num.toLocaleString('ru-RU') + ' ₽';
}