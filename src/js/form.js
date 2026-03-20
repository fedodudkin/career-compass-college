// ── Валидация и отправка формы обратной связи ─────────────────
//
// Намеренно НЕ используем import для addFormSubmission —
// инлайним сохранение напрямую, чтобы исключить любые проблемы
// с цепочкой ES-модулей (utils.js → form.js).
// Это делает форму полностью автономной.

(function initForm() {
  'use strict';

  const form = document.getElementById('feedback-form');
  if (!form) return; // форма есть только на form.html

  // ── Поля с привязкой к элементам ошибок ─────────────────────
  const fields = {
    name:      { el: document.getElementById('name'),      err: document.getElementById('name-error') },
    email:     { el: document.getElementById('email'),     err: document.getElementById('email-error') },
    specialty: { el: document.getElementById('specialty'), err: document.getElementById('specialty-error') },
    message:   { el: document.getElementById('message'),   err: document.getElementById('message-error') },
  };

  const successMsg  = document.getElementById('form-success');
  const charCounter = document.getElementById('char-count');
  const MAX_MSG     = 500;

  // ── Показать ошибку поля ──────────────────────────────────────
  function showError(name, msg) {
    const { el, err } = fields[name];
    el.classList.add('error');
    err.textContent = msg;
    err.classList.add('show');
    el.setAttribute('aria-invalid', 'true');
    if (err.id) el.setAttribute('aria-describedby', err.id);
  }

  // ── Убрать ошибку поля ────────────────────────────────────────
  function clearError(name) {
    const { el, err } = fields[name];
    el.classList.remove('error');
    err.classList.remove('show');
    el.removeAttribute('aria-invalid');
    if (err.id && el.getAttribute('aria-describedby') === err.id) {
      el.removeAttribute('aria-describedby');
    }
  }

  // ── Валидация одного поля ────────────────────────────────────
  function validateField(name) {
    const val = fields[name].el.value.trim();

    switch (name) {
      case 'name':
        if (!val || val.length < 2) {
          showError('name', val ? 'Имя должно быть не менее 2 символов' : 'Введите ваше имя');
          return false;
        }
        clearError('name');
        return true;

      case 'email':
        if (!val) { showError('email', 'Введите email'); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          showError('email', 'Некорректный формат email');
          return false;
        }
        clearError('email');
        return true;

      case 'specialty':
        if (!val) { showError('specialty', 'Выберите специальность'); return false; }
        clearError('specialty');
        return true;

      case 'message':
        if (!val || val.length < 10) {
          showError('message', val ? 'Сообщение слишком короткое' : 'Напишите сообщение');
          return false;
        }
        clearError('message');
        return true;

      default:
        return true;
    }
  }

  // ── Валидация в реальном времени ─────────────────────────────
  Object.keys(fields).forEach(name => {
    // Проверяем при потере фокуса
    fields[name].el.addEventListener('blur', () => validateField(name));
    // Убираем ошибку при исправлении
    fields[name].el.addEventListener('input', () => {
      if (fields[name].el.classList.contains('error')) validateField(name);
    });
  });

  // ── Счётчик символов ─────────────────────────────────────────
  const msgEl = fields.message.el;
  if (msgEl && charCounter) {
    msgEl.addEventListener('input', () => {
      const len = msgEl.value.length;
      charCounter.textContent = `${len} / ${MAX_MSG}`;
      charCounter.classList.toggle('warn', len > MAX_MSG * 0.9);
      if (len > MAX_MSG) {
        msgEl.value = msgEl.value.slice(0, MAX_MSG);
        charCounter.textContent = `${MAX_MSG} / ${MAX_MSG}`;
      }
    });
  }

  // ── Сохранение заявки в localStorage ─────────────────────────
  function saveSubmission(data) {
    try {
      const KEY  = 'form_submissions';
      const prev = JSON.parse(localStorage.getItem(KEY) || '[]');
      prev.push(data);
      localStorage.setItem(KEY, JSON.stringify(prev));
    } catch {
      // приватный режим или переполнение — игнорируем
    }
  }

  // ── Отправка формы ───────────────────────────────────────────
  form.addEventListener('submit', function(e) {
    e.preventDefault();      // останавливаем перезагрузку страницы
    e.stopPropagation();     // на всякий случай

    // Валидируем все поля
    const results = Object.keys(fields).map(name => validateField(name));
    const isValid = results.every(Boolean);

    if (!isValid) return; // есть ошибки — не отправляем

    // Собираем данные
    const submission = {
      id:        Date.now(),
      name:      fields.name.el.value.trim(),
      email:     fields.email.el.value.trim(),
      specialty: fields.specialty.el.value,
      message:   fields.message.el.value.trim(),
      date:      new Date().toLocaleDateString('ru-RU'),
    };

    // Сохраняем в localStorage
    saveSubmission(submission);

    // Показываем сообщение об успехе
    if (successMsg) {
      successMsg.textContent = `✓ Спасибо, ${submission.name}! Ваша заявка принята.`;
      successMsg.classList.add('show');
      // Скроллим к сообщению
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Сбрасываем форму
    form.reset();
    if (charCounter) charCounter.textContent = `0 / ${MAX_MSG}`;

    // Убираем все ошибки
    Object.keys(fields).forEach(name => clearError(name));

    // Автоскрываем уведомление через 6 секунд
    setTimeout(() => {
      if (successMsg) successMsg.classList.remove('show');
    }, 6000);
  });

})(); // IIFE — не загрязняем глобальный scope