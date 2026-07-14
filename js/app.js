document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initSidebar();
  initCharts();
  initAdoptionChart();
  initDevicesTable();
  initFleetMaps();
});

async function initFleetMaps() {
  if (!window.AetrexMap) return;

  if (document.getElementById('fleet-map-canvas')) {
    await window.AetrexMap.initOverviewMap();
  }

  if (document.getElementById('explorer-map')) {
    await window.AetrexMap.initLocationExplorer();
  }
}

/* Header — data-as-of timestamp */
function initHeader() {
  const dateEl = document.getElementById('data-as-of');
  if (!dateEl) return;

  const now = new Date();
  const datePart = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });

  dateEl.textContent = `Data as of ${datePart} · ${timePart} UTC`;
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

/* Charts — Control Panel color palette (Fleet Overview) */
function initCharts() {
  const versionCanvas = document.getElementById('versionChart');
  const modelCanvas = document.getElementById('modelChart');
  if (!versionCanvas || !modelCanvas || typeof Chart === 'undefined') return;

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

  new Chart(versionCanvas, {
    type: 'bar',
    data: {
      labels: ['v4.5', 'v4.4', 'v4.3', 'v4.2', 'Older'],
      datasets: [{
        data: [3475, 380, 160, 98, 125],
        backgroundColor: [
          colors.teal,
          colors.blue,
          colors.green,
          colors.orange,
          colors.danger,
        ],
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
        y: {
          ...baseScale,
          beginAtZero: true,
          ticks: { ...baseScale.ticks, maxTicksLimit: 5 },
        },
      },
    },
  });

  new Chart(modelCanvas, {
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
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
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
}

/* Releases & Upgrades — latest release adoption line chart */
function initAdoptionChart() {
  const canvas = document.getElementById('adoptionChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const colors = {
    blue: '#1a9dd4',
    danger: '#d9534f',
    grid: '#eeeeee',
    tick: '#888888',
    tooltip: '#333333',
  };

  const labels = ['May 18', 'May 25', 'Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 29', 'Jul 6', 'Jul 13'];
  const adoptionData = [8, 18, 29, 41, 52, 61, 70, 77, 82];
  const targetData = labels.map(() => 90);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(26, 157, 212, 0.15)');
  gradient.addColorStop(1, 'rgba(26, 157, 212, 0.01)');

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Adoption %',
          data: adoptionData,
          borderColor: colors.blue,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: colors.blue,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          order: 1,
        },
        {
          label: 'Target %',
          data: targetData,
          borderColor: colors.danger,
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            padding: 16,
            font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
            color: '#333333',
          },
        },
        tooltip: {
          backgroundColor: colors.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: {
            color: colors.tick,
            font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
          },
          border: { display: false },
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: colors.grid, drawBorder: false },
          ticks: {
            color: colors.tick,
            stepSize: 25,
            callback: (v) => `${v}%`,
            font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
          },
          border: { display: false },
        },
      },
    },
  });
}

/* Devices page — DataTable + filter bar */
const deviceFilters = {
  search: '',
  country: '',
  model: '',
  version: '',
  status: '',
};

const DEVICE_FILTER_KEYS = [
  { key: 'country', selectId: 'filter-country', dataAttr: 'country' },
  { key: 'model', selectId: 'filter-model', dataAttr: 'model' },
  { key: 'version', selectId: 'filter-version', dataAttr: 'version' },
  { key: 'status', selectId: 'filter-status', dataAttr: 'status' },
];

function getDeviceFilterOptions(dataAttr) {
  const rows = document.querySelectorAll('#scanner-table tbody tr');
  const values = new Set();
  rows.forEach((row) => {
    const val = row.dataset[dataAttr];
    if (val) values.add(val);
  });
  return [...values].sort((a, b) => a.localeCompare(b));
}

function populateDeviceFilterSelects() {
  DEVICE_FILTER_KEYS.forEach(({ selectId, dataAttr }) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const options = getDeviceFilterOptions(dataAttr);
    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
  });
}

function updateScannersInView(table) {
  const countEl = document.getElementById('scanners-in-view');
  if (!countEl || !table) return;
  const count = table.rows({ search: 'applied' }).count();
  countEl.textContent = count.toLocaleString('en-US');
}

function rowMatchesDeviceSearch(row, query) {
  if (!query) return true;

  const haystack = [
    row.dataset.serial,
    row.dataset.retailer,
    row.dataset.city,
    row.dataset.country,
    row.dataset.model,
    row.dataset.version,
    row.dataset.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function initDevicesTable() {
  const tableEl = document.getElementById('scanner-table');
  if (!tableEl || typeof DataTable === 'undefined') return;

  populateDeviceFilterSelects();

  DataTable.ext.search.push((settings, _searchData, dataIndex) => {
    if (settings.nTable.id !== 'scanner-table') return true;

    const row = settings.aoData?.[dataIndex]?.nTr;
    if (!row) return true;

    if (!rowMatchesDeviceSearch(row, deviceFilters.search)) return false;

    return DEVICE_FILTER_KEYS.every(({ key, dataAttr }) => {
      const value = deviceFilters[key];
      return !value || row.dataset[dataAttr] === value;
    });
  });

  const table = new DataTable(tableEl, {
    pageLength: 10,
    lengthMenu: [10, 25, 50],
    responsive: true,
    order: [[5, 'desc']],
    layout: {
      topStart: null,
      topEnd: null,
      bottomStart: 'info',
      bottomEnd: 'paging',
    },
    language: {
      search: '',
      searchPlaceholder: 'Search serial, retailer, city…',
      lengthMenu: 'Show _MENU_ entries',
      info: 'Showing _START_ to _END_ of _TOTAL_ scanners',
      infoEmpty: 'No devices match the current filters',
      infoFiltered: '(filtered from _MAX_ total)',
      zeroRecords: 'No devices match the current filters',
      emptyTable: 'No devices match the current filters',
      paginate: { first: 'First', last: 'Last', next: 'Next', previous: 'Prev' },
    },
    columnDefs: [
      { orderable: false, targets: 7 },
      { className: 'dt-body-right', targets: 6 },
    ],
    initComplete() {
      const wrapper = document.getElementById('scanner-table_wrapper');
      if (wrapper) {
        wrapper.classList.add('devices-table-wrapper');
        // Remove empty top feature row so the table is first
        const topRow = wrapper.querySelector('.dt-layout-row:first-child');
        if (topRow && !topRow.querySelector('table') && !topRow.querySelector('.dt-info') && !topRow.querySelector('.dt-paging')) {
          const empty = !topRow.textContent.trim() && !topRow.querySelector('input, select, button');
          if (empty) topRow.remove();
        }
      }
      updateScannersInView(this.api());
    },
  });

  table.on('draw', () => updateScannersInView(table));

  const searchInput = document.getElementById('fleet-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        deviceFilters.search = searchInput.value.trim().toLowerCase();
        table.draw();
      }, 150);
    });
  }

  DEVICE_FILTER_KEYS.forEach(({ key, selectId }) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.addEventListener('change', () => {
      deviceFilters[key] = select.value;
      table.draw();
    });
  });
}
