// ── Form validation & submission ──────────────────────────────
const form = document.getElementById('feedback-form');
if (!form) throw new Error('Form not found');

const fields = {
  name:      { el: document.getElementById('name'),      err: document.getElementById('name-error') },
  email:     { el: document.getElementById('email'),     err: document.getElementById('email-error') },
  specialty: { el: document.getElementById('specialty'), err: document.getElementById('specialty-error') },
  message:   { el: document.getElementById('message'),   err: document.getElementById('message-error') },
};
const successMsg = document.getElementById('form-success');
const charCounter = document.getElementById('char-count');
const MAX_MSG = 500;

// ── Real-time validation ──────────────────────────────────────
function showError(field, msg) {
  fields[field].el.classList.add('error');
  fields[field].err.textContent = msg;
  fields[field].err.classList.add('show');
}
function clearError(field) {
  fields[field].el.classList.remove('error');
  fields[field].err.classList.remove('show');
}

function validateField(name) {
  const val = fields[name].el.value.trim();
  if (name === 'name') {
    if (!val) return showError('name', 'Введите ваше имя');
    if (val.length < 2) return showError('name', 'Имя должно быть не менее 2 символов');
    clearError('name');
  }
  if (name === 'email') {
    if (!val) return showError('email', 'Введите email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return showError('email', 'Некорректный формат email');
    clearError('email');
  }
  if (name === 'specialty') {
    if (!val) return showError('specialty', 'Выберите специальность');
    clearError('specialty');
  }
  if (name === 'message') {
    if (!val) return showError('message', 'Напишите сообщение');
    if (val.length < 10) return showError('message', 'Сообщение слишком короткое');
    clearError('message');
  }
}

Object.keys(fields).forEach(name => {
  fields[name].el.addEventListener('blur', () => validateField(name));
  fields[name].el.addEventListener('input', () => {
    if (fields[name].el.classList.contains('error')) validateField(name);
  });
});

// ── Char counter ──────────────────────────────────────────────
if (fields.message.el && charCounter) {
  fields.message.el.addEventListener('input', () => {
    const len = fields.message.el.value.length;
    charCounter.textContent = `${len} / ${MAX_MSG}`;
    charCounter.classList.toggle('warn', len > MAX_MSG * 0.9);
    if (len > MAX_MSG) fields.message.el.value = fields.message.el.value.slice(0, MAX_MSG);
  });
}

// ── Submit ────────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;

  Object.keys(fields).forEach(name => {
    validateField(name);
    if (fields[name].el.classList.contains('error') || !fields[name].el.value.trim()) {
      valid = false;
      if (!fields[name].el.value.trim()) showError(name, 'Это поле обязательно');
    }
  });

  if (!valid) return;

  // Save to localStorage
  const submissions = JSON.parse(localStorage.getItem('form_submissions') || '[]');
  submissions.push({
    id: Date.now(),
    name: fields.name.el.value.trim(),
    email: fields.email.el.value.trim(),
    specialty: fields.specialty.el.value,
    message: fields.message.el.value.trim(),
    date: new Date().toLocaleDateString('ru-RU')
  });
  localStorage.setItem('form_submissions', JSON.stringify(submissions));

  // Show success
  successMsg.textContent = `✓ Спасибо, ${fields.name.el.value.trim()}! Ваша заявка принята.`;
  successMsg.classList.add('show');
  form.reset();
  charCounter && (charCounter.textContent = `0 / ${MAX_MSG}`);

  setTimeout(() => successMsg.classList.remove('show'), 5000);
});