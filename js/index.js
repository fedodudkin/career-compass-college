// ── Главная страница: загрузка специальностей и отрисовка карточек ──────────────
async function initHome() {
  const res = await fetch('/data/data.json');
  const data = await res.json();
  const done = JSON.parse(localStorage.getItem('roadmap_done') || '{}');

  const grid = document.getElementById('specialties-grid');
  if (!grid) return;

  grid.innerHTML = data.specialties.map((spec, i) => {
    const total = spec.skills.length;
    const completed = spec.skills.filter(sk => done[sk.id]).length;
    const pct = total ? Math.round(completed / total * 100) : 0;
    return `
    <div class="specialty-card fade-up" style="--card-color:${spec.color};animation-delay:${i*0.08}s"
         onclick="location.href='roadmap.html?spec=${spec.id}'">
      <span class="card-icon">${spec.icon}</span>
      <div class="card-code">${spec.code}</div>
      <div class="card-title">${spec.title}</div>
      <div class="card-desc">${spec.description}</div>
      <div class="card-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-text">${pct}%</span>
      </div>
    </div>`;
  }).join('');

  // stats
  const total = data.specialties.reduce((a, s) => a + s.skills.length, 0);
  const completed = Object.keys(done).length;
  const el = document.getElementById('stat-done');
  if (el) el.textContent = completed;
  const el2 = document.getElementById('stat-total');
  if (el2) el2.textContent = total;
}

initHome();