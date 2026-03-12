// ── Обработчик клика по бургер-меню для открытия/закрытия меню навигации ────────────────────────────────────────────────
const burger = document.querySelector('.nav-burger');
const navLinks = document.querySelector('.nav-links');

if (burger && navLinks) {
  burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

// ── Определение текущей страницы и добавление статуса 'active' к соответствующей ссылке в меню ───────────────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === currentPage || (currentPage === '' && a.getAttribute('href') === 'index.html')) {
    a.classList.add('active');
  }
});