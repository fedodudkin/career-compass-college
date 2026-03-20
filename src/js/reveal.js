/**
 * reveal.js — Универсальная система анимации появления
 * ====================================================
 * Подключается на всех страницах через main.js.
 *
 * API:
 *   window.__revealObserve(root?)  — регистрирует новые элементы
 *                                    (безопасно вызывать повторно)
 *
 * Гарантии:
 *   • .is-visible добавляется строго один раз — через unobserve
 *   • Уже видимые элементы пропускаются через :not(.is-visible)
 *   • Stagger 100ms между соседними элементами через --reveal-delay
 *   • prefers-reduced-motion: анимация полностью отключается
 */

(function () {
  'use strict';

  // ── Системная настройка уменьшить движение ──────────────────
  const prefersReduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // Показываем всё сразу без анимации
    document.querySelectorAll('.animate-on-reveal').forEach(el =>
      el.classList.add('is-visible')
    );
    window.__revealObserve = () => {
      document.querySelectorAll('.animate-on-reveal:not(.is-visible)')
        .forEach(el => el.classList.add('is-visible'));
    };
    return;
  }

  // ── Stagger: 100ms между элементами одного родителя ─────────
  function assignStagger(elements) {
    const groups = new Map();
    elements.forEach(el => {
      const key = el.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });
    groups.forEach(siblings => {
      siblings.forEach((el, i) => {
        // Не перезаписываем ручную задержку
        if (!el.style.getPropertyValue('--reveal-delay')) {
          el.style.setProperty('--reveal-delay', `${i * 100}ms`);
        }
      });
    });
  }

  // ── Один observer на всё приложение ─────────────────────────
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;

        // Задача 1: добавляем класс один раз, сразу отключаем
        if (!el.classList.contains('is-visible')) {
          el.classList.add('is-visible');
        }
        obs.unobserve(el); // ← гарантия однократности
      });
    },
    { threshold: 0.07, rootMargin: '0px 0px -32px 0px' }
  );

  /**
   * Регистрирует элементы .animate-on-reveal в observer.
   * Задача 1: :not(.is-visible) — уже анимированные пропускаются,
   * поэтому повторный вызов после quickToggle безопасен.
   */
  function observe(root) {
    const scope = root instanceof Element ? root : document;
    const els = scope.querySelectorAll('.animate-on-reveal:not(.is-visible)');
    assignStagger(els);
    els.forEach(el => observer.observe(el));
  }

  // Первичный запуск
  observe();

  // Экспорт для динамических страниц (roadmap, index)
  window.__revealObserve = observe;
})();