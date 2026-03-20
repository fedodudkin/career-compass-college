// ── Глобальные утилиты: подключаются на всех страницах ───────

// Система анимации появления элементов (Intersection Observer)
import './reveal.js';

// ── Мобильное меню (бургер) ───────────────────────────────────
const burger   = document.querySelector('.nav-burger');
const navLinks = document.querySelector('.nav-links');

if (burger && navLinks) {
  // Открыть / закрыть меню по клику на бургер
  burger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Закрыть меню при нажатии на любую ссылку (в т.ч. мобильный переход)
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    })
  );
}

// ── Подсветка активной ссылки в навигации ────────────────────
// Сравниваем текущий URL с атрибутом href каждой ссылки навбара
const currentPage = globalThis.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});