document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initSidebar();
  initCharts();
  initDataTable();
});

/* Header — current date */
function initHeader() {
  const dateEl = document.getElementById('current-date');
  if (!dateEl) return;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

/* Sidebar — mobile toggle */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');

  if (!sidebar || !toggle || !overlay) return;

  function open() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.body.classList.add('sidebar-open');
  }

  function close() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.classList.remove('sidebar-open');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('-translate-x-full') ? open() : close();
  });

  overlay.addEventListener('click', close);

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      close();
      sidebar.classList.remove('-translate-x-full');
    } else {
      sidebar.classList.add('-translate-x-full');
    }
  });
}

/* Charts — Control Panel color palette */
function initCharts() {
  const colors = {
    teal: '#7bc9d7',
    blue: '#1a9dd4',
    green: '#5cb85c',
    orange: '#f0ad4e',
    danger: '#d9534f',
    gray: '#999999',
    grid: '#eeeeee',
    tick: '#888888',
    tooltip: '#333333',
  };

  Chart.defaults.font.family = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.font.weight = '400';
  Chart.defaults.color = colors.tick;
  Chart.defaults.animation.duration = 400;

  const baseScale = {
    grid: { color: colors.grid, drawBorder: false },
    ticks: {
      color: colors.tick,
      font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
    },
    border: { display: false },
  };

  const tooltip = {
    backgroundColor: colors.tooltip,
    titleFont: { size: 12, family: "'Segoe UI', sans-serif", weight: '400' },
    bodyFont: { size: 12, family: "'Segoe UI', sans-serif", weight: '400' },
    padding: 10,
    cornerRadius: 4,
  };

  new Chart(document.getElementById('versionChart'), {
    type: 'bar',
    data: {
      labels: ['v4.5', 'v4.4', 'v4.3', 'v4.2', 'Older'],
      datasets: [{
        data: [3400, 380, 160, 90, 35],
        backgroundColor: colors.teal,
        borderRadius: 2,
        borderSkipped: false,
        barPercentage: 0.65,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip },
      scales: {
        x: { ...baseScale, grid: { display: false } },
        y: { ...baseScale, beginAtZero: true, ticks: { ...baseScale.ticks, maxTicksLimit: 5 } },
      },
    },
  });

  new Chart(document.getElementById('modelChart'), {
    type: 'doughnut',
    data: {
      labels: ['Albert Pro', 'Albert 3DFit', 'Albert Pressure Scanner', 'Zoe Pro'],
      datasets: [{
        data: [38, 25, 13, 24],
        backgroundColor: [colors.blue, colors.green, colors.orange, colors.teal],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
            color: '#333333',
          },
        },
        tooltip: {
          backgroundColor: colors.tooltip,
          callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` },
        },
      },
    },
  });

  const adoptionCtx = document.getElementById('adoptionChart').getContext('2d');
  const gradient = adoptionCtx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(26, 157, 212, 0.15)');
  gradient.addColorStop(1, 'rgba(26, 157, 212, 0.01)');

  new Chart(adoptionCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        data: [38, 51, 63, 71, 77, 82],
        borderColor: colors.blue,
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors.blue,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltip,
          callbacks: { label: (ctx) => ` ${ctx.parsed.y}%` },
        },
      },
      scales: {
        x: { ...baseScale, grid: { display: false } },
        y: {
          ...baseScale,
          beginAtZero: false,
          min: 30,
          max: 90,
          ticks: { ...baseScale.ticks, callback: (v) => `${v}%`, stepSize: 15 },
        },
      },
    },
  });

  new Chart(document.getElementById('activityChart'), {
    type: 'bar',
    data: {
      labels: ['Active (Last 7 Days)', 'Inactive (8–30 Days)', 'Offline (>30 Days)'],
      datasets: [{
        data: [3850, 290, 98],
        backgroundColor: [colors.teal, colors.gray, colors.danger],
        borderRadius: 2,
        borderSkipped: false,
        barPercentage: 0.55,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip },
      scales: {
        x: {
          ...baseScale,
          grid: { display: false },
          ticks: { ...baseScale.ticks, maxRotation: 0, autoSkip: false, font: { size: 10 } },
        },
        y: { ...baseScale, beginAtZero: true, ticks: { ...baseScale.ticks, maxTicksLimit: 5 } },
      },
    },
  });
}

/* DataTable */
const columnFilters = { retailer: '', model: '', status: '' };

const FILTER_CONFIG = [
  { key: 'retailer', label: 'Retailer', dataAttr: 'retailer' },
  { key: 'model', label: 'Model', dataAttr: 'model' },
  { key: 'status', label: 'Status', dataAttr: 'status' },
];

let scannerTable = null;

DataTable.ext.search.push((settings, _searchData, dataIndex) => {
  if (settings.nTable.id !== 'scanner-table') return true;

  const row = settings.aoData?.[dataIndex]?.nTr;
  if (!row) return true;

  return FILTER_CONFIG.every(({ key, dataAttr }) => {
    const value = columnFilters[key];
    return !value || row.dataset[dataAttr] === value;
  });
});

function getFilterOptions(dataAttr) {
  const rows = document.querySelectorAll('#scanner-table tbody tr');
  const values = new Set();
  rows.forEach((row) => {
    const val = row.dataset[dataAttr];
    if (val) values.add(val);
  });
  return [...values].sort((a, b) => a.localeCompare(b));
}

function buildColumnFiltersToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'column-filters';

  FILTER_CONFIG.forEach(({ key, label, dataAttr }) => {
    const options = getFilterOptions(dataAttr);
    const filter = document.createElement('div');
    filter.className = 'col-filter';
    filter.dataset.filter = key;

    filter.innerHTML = `
      <button type="button" class="col-filter-btn" aria-haspopup="listbox" aria-expanded="false">
        <span class="col-filter-name">${label}</span>
        <span class="col-filter-value">All</span>
        <i class="fa-solid fa-chevron-down col-filter-chevron"></i>
      </button>
      <div class="col-filter-menu" hidden>
        <div class="col-filter-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="col-filter-search" placeholder="Search ${label.toLowerCase()}…" autocomplete="off">
        </div>
        <ul class="col-filter-options" role="listbox">
          <li class="col-filter-option active" data-value="" role="option">All</li>
          ${options.map((opt) => `<li class="col-filter-option" data-value="${opt.replace(/"/g, '&quot;')}" role="option">${opt}</li>`).join('')}
        </ul>
      </div>
    `;

    toolbar.appendChild(filter);
  });

  return toolbar;
}

function setupColumnFilterEvents(table) {
  const filtersRoot = document.querySelector('#scanner-table_wrapper .column-filters');
  if (!filtersRoot) return;

  function closeAllMenus(except) {
    filtersRoot.querySelectorAll('.col-filter').forEach((filter) => {
      if (filter === except) return;
      filter.querySelector('.col-filter-menu').hidden = true;
      filter.querySelector('.col-filter-btn').setAttribute('aria-expanded', 'false');
    });
  }

  filtersRoot.querySelectorAll('.col-filter').forEach((filter) => {
    const key = filter.dataset.filter;
    const btn = filter.querySelector('.col-filter-btn');
    const menu = filter.querySelector('.col-filter-menu');
    const searchInput = filter.querySelector('.col-filter-search');
    const valueLabel = filter.querySelector('.col-filter-value');
    const options = filter.querySelectorAll('.col-filter-option');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !menu.hidden;
      closeAllMenus(filter);
      menu.hidden = isOpen;
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        searchInput.value = '';
        options.forEach((opt) => { opt.hidden = false; });
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      options.forEach((opt) => {
        const text = opt.textContent.trim().toLowerCase();
        opt.hidden = query !== '' && !text.includes(query);
      });
    });

    searchInput.addEventListener('click', (e) => e.stopPropagation());

    options.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = opt.dataset.value;
        columnFilters[key] = value;
        valueLabel.textContent = value || 'All';
        btn.classList.toggle('is-active', Boolean(value));

        options.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');

        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        table.draw();
      });
    });
  });

  document.addEventListener('click', () => closeAllMenus());
}

function initDataTable() {
  scannerTable = new DataTable('#scanner-table', {
    pageLength: 10,
    lengthMenu: [10, 25, 50],
    responsive: true,
    order: [[0, 'asc']],
    layout: {
      topStart: 'search',
      topEnd: 'pageLength',
      bottomStart: 'info',
      bottomEnd: 'paging',
    },
    language: {
      search: '',
      searchPlaceholder: 'Search scanners…',
      lengthMenu: 'Show _MENU_ entries',
      info: 'Showing _START_ to _END_ of _TOTAL_ scanners',
      infoEmpty: 'No scanners found',
      infoFiltered: '(filtered from _MAX_ total)',
      paginate: { first: 'First', last: 'Last', next: 'Next', previous: 'Prev' },
      emptyTable: 'No scanner data available',
    },
    columnDefs: [{ orderable: false, targets: 6 }],
    initComplete() {
      const topStart = document.querySelector('#scanner-table_wrapper .dt-layout-row:first-child .dt-layout-start');
      if (topStart) {
        topStart.classList.add('table-toolbar-start');
        topStart.appendChild(buildColumnFiltersToolbar());
        setupColumnFilterEvents(this.api());
      }
    },
  });
}
