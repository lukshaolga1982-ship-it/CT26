/* CT26 · Author tests table. Presentation only; no Firebase or app.js changes. */
(() => {
  'use strict';
  const config = [
    ['data-toggle-test', 'Доступ', '🔒'],
    ['data-test-audience', 'Учащиеся', '👥'],
    ['data-custom-test', 'Просмотр', '👁'],
    ['data-edit-test', 'Редактирование', '✎'],
    ['data-regrade-test', 'Пересчёт', '↻'],
    ['data-delete-test', 'Удаление', '🗑']
  ];
  const columns = ['Тест', 'Заданий', 'Доступ', 'Учащиеся', 'Просмотр', 'Редактировать', 'Пересчитать', 'Удалить'];
  function td(className) {
    const cell = document.createElement('td');
    cell.className = className;
    return cell;
  }
  function enhanceButton(button, icon, label) {
    if (!button) return null;
    const original = button.textContent.trim();
    const tooltip = original || label;
    button.title = tooltip;
    button.setAttribute('aria-label', tooltip);
    button.classList.add('ct26-table-action');
    button.textContent = icon;
    return button;
  }
  function convert(grid) {
    if (!grid || grid.dataset.ct26TableConverted === '1') return;
    const cards = [...grid.children].filter(el => el.matches('.custom-test-card'));
    if (!cards.length) return;
    // Only teacher cards expose management actions. Never change student catalog.
    if (!cards[0].querySelector('[data-edit-test]')) return;
    grid.dataset.ct26TableConverted = '1';
    const shell = document.createElement('div');
    shell.className = 'ct26-tests-table-shell';
    const toolbar = document.createElement('div');
    toolbar.className = 'ct26-tests-table-toolbar';
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'ct26-tests-table-search';
    search.placeholder = 'Поиск по названию теста…';
    search.setAttribute('aria-label', 'Поиск по названию теста');
    const counter = document.createElement('span');
    counter.className = 'ct26-tests-table-count';
    counter.setAttribute('aria-live', 'polite');
    toolbar.append(search, counter);
    const wrap = document.createElement('div');
    wrap.className = 'ct26-tests-table-scroll';
    const table = document.createElement('table');
    table.className = 'ct26-tests-table';
    const thead = document.createElement('thead');
    const header = document.createElement('tr');
    columns.forEach(label => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; header.appendChild(th); });
    thead.appendChild(header);
    const tbody = document.createElement('tbody');
    cards.forEach(card => {
      const row = document.createElement('tr');
      const title = card.querySelector('h3');
      const meta = card.querySelector(':scope > p');
      const number = card.querySelector('.test-no');
      const badge = card.querySelector('.test-meta .status');
      const view = card.querySelector('[data-custom-test]');
      const actions = Object.fromEntries(config.map(([attr]) => [attr, card.querySelector('[' + attr + ']')]));
      row.dataset.searchText = [title?.textContent, meta?.textContent].join(' ').toLocaleLowerCase('ru');
      const titleCell = td('ct26-col-title');
      if (number) { number.className = 'ct26-table-number'; titleCell.appendChild(number); }
      const titleBox = document.createElement('div');
      titleBox.className = 'ct26-table-title-box';
      if (title) titleBox.appendChild(title);
      if (meta) titleBox.appendChild(meta);
      titleCell.appendChild(titleBox); row.appendChild(titleCell);
      const countCell = td('ct26-col-count');
      const countMatch = meta?.textContent.match(/\d+\s+задани/i);
      countCell.textContent = countMatch ? countMatch[0].match(/\d+/)[0] : '—';
      row.appendChild(countCell);
      const accessCell = td('ct26-col-access');
      if (badge) accessCell.appendChild(badge);
      const toggle = actions['data-toggle-test'];
      if (toggle) accessCell.appendChild(enhanceButton(toggle, /Закрыть/.test(toggle.textContent) ? '🔒' : '🔓', 'Изменить доступ'));
      row.appendChild(accessCell);
      for (const [attr, label, icon] of config.slice(1)) {
        const cell = td('ct26-col-action' + (attr === 'data-delete-test' ? ' ct26-col-delete' : ''));
        const button = attr === 'data-custom-test' ? view : actions[attr];
        if (button) cell.appendChild(enhanceButton(button, icon, label));
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    });
    table.append(thead, tbody);
    wrap.appendChild(table);
    shell.append(toolbar, wrap);
    grid.replaceWith(shell);
    const rows = [...tbody.children];
    const update = () => {
      const term = search.value.trim().toLocaleLowerCase('ru');
      let shown = 0;
      rows.forEach(row => { const visible = !term || row.dataset.searchText.includes(term); row.hidden = !visible; if (visible) shown++; });
      counter.textContent = `Показано: ${shown} из ${rows.length}`;
    };
    search.addEventListener('input', update);
    update();
  }
  function scan() {
    document.querySelectorAll('.custom-tests-section > .test-grid').forEach(convert);
  }
  function boot() {
    scan();
    const app = document.querySelector('#app');
    if (!app) return;
    const observer = new MutationObserver(() => scan());
    observer.observe(app, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
