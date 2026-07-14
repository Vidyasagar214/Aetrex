/**
 * Fleet world map (Leaflet + OpenStreetMap + Papa Parse)
 *
 * Fleet Overview → quick world view of metro bubbles
 * Location Explorer → same data with list, search, and metro detail panel
 *
 * CDN deps (loaded from HTML): Leaflet CSS/JS, Papa Parse
 */

(function (global) {
  'use strict';

  // Path to CSV (works with VS Code Live Server)
  const CSV_URL = 'data/stores.csv';

  // Scanner-count color bands
  const BUBBLE_COLORS = {
    green: { fill: '#5cb85c', border: '#3d8b3d' },   // 0–50
    yellow: { fill: '#f0ad4e', border: '#d58512' },  // 51–150
    orange: { fill: '#e67e22', border: '#c46814' },  // 151–300
    red: { fill: '#d9534f', border: '#ac2925' },     // 300+
  };

  const LEGEND_HTML = `
    <span class="legend-title">Scanner Count</span>
    <span class="legend-item"><span class="legend-swatch legend-green"></span>0–50</span>
    <span class="legend-item"><span class="legend-swatch legend-yellow"></span>51–150</span>
    <span class="legend-item"><span class="legend-swatch legend-orange"></span>151–300</span>
    <span class="legend-item"><span class="legend-swatch legend-red"></span>300+</span>
  `;

  let metroCache = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Color by scanner count legend band */
  function getBubbleColor(scanners) {
    if (scanners <= 50) return BUBBLE_COLORS.green;
    if (scanners <= 150) return BUBBLE_COLORS.yellow;
    if (scanners <= 300) return BUBBLE_COLORS.orange;
    return BUBBLE_COLORS.red;
  }

  /** Pixel radius grows with scanner volume */
  function getBubbleRadius(scanners) {
    return Math.max(5, Math.min(18, 4 + Math.sqrt(Math.max(scanners, 0)) * 0.8));
  }

  /** Availability % = Online / Scanners * 100 */
  function getAvailability(metro) {
    if (!metro.scanners) return 0;
    return Math.round((metro.online / metro.scanners) * 1000) / 10;
  }

  /** Normalize Papa row; skip empty / invalid lat-lng */
  function normalizeRow(row) {
    const hasAnyValue = Object.values(row || {}).some((v) => String(v || '').trim() !== '');
    if (!hasAnyValue) return null;

    const lat = parseFloat(row.Latitude);
    const lng = parseFloat(row.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn('Skipping row with missing/invalid coordinates:', row);
      return null;
    }

    const scanners = Number(row.Scanners) || 0;
    const online = Number(row.Online) || 0;
    const offline = Number(row.Offline) || Math.max(0, scanners - online);

    return {
      metro: String(row.Metro || '').trim() || 'Unknown',
      country: String(row.Country || '').trim() || '—',
      lat,
      lng,
      scanners,
      online,
      offline,
    };
  }

  function showLoading(container) {
    container.innerHTML = `
      <div class="fleet-map-loading" role="status" aria-live="polite">
        <div class="fleet-map-spinner" aria-hidden="true"></div>
        <p>Loading fleet locations…</p>
      </div>
    `;
  }

  function showError(container, message) {
    container.innerHTML = `
      <div class="fleet-map-error">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * initializeMap(containerId, options)
   * Leaflet + OpenStreetMap, world-centered, wheel zoom + pan + controls.
   */
  function initializeMap(containerId, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error('Map container not found:', containerId);
      return null;
    }

    el.innerHTML = '';

    const map = L.map(el, {
      worldCopyJump: true,
      scrollWheelZoom: options.scrollWheelZoom !== false,
      zoomControl: options.zoomControl !== false,
      minZoom: options.minZoom || 1,
      maxZoom: options.maxZoom || 18,
    }).setView([20, 0], options.initialZoom || 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Fix tile sizing inside flex/responsive layouts
    setTimeout(() => map.invalidateSize(), 80);
    window.addEventListener('resize', () => map.invalidateSize());

    return map;
  }

  /**
   * loadCSV()
   * Load and parse stores.csv with Papa Parse.
   */
  function loadCSV() {
    if (metroCache) return Promise.resolve(metroCache);

    return new Promise((resolve, reject) => {
      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete(results) {
          if (results.errors && results.errors.length) {
            console.warn('Papa Parse warnings:', results.errors);
          }
          const metros = (results.data || []).map(normalizeRow).filter(Boolean);
          metroCache = metros;
          resolve(metros);
        },
        error(err) {
          reject(err || new Error('Failed to load stores.csv'));
        },
      });
    });
  }

  /**
   * createBubble(map, metro, mode)
   * Circle marker with hover tooltip and click popup.
   */
  function createBubble(map, metro, mode = 'overview') {
    const colors = getBubbleColor(metro.scanners);
    const radius = getBubbleRadius(metro.scanners);
    const availability = getAvailability(metro);

    const marker = L.circleMarker([metro.lat, metro.lng], {
      radius,
      fillColor: colors.fill,
      color: colors.border,
      weight: 2,
      opacity: 0.95,
      fillOpacity: 0.55,
    }).addTo(map);

    // Tooltip on hover
    marker.bindTooltip(
      `<strong>${escapeHtml(metro.metro)}</strong><br>` +
        `${escapeHtml(metro.country)}<br>` +
        `Total Scanners: ${metro.scanners.toLocaleString('en-US')}<br>` +
        `Online Devices: ${metro.online.toLocaleString('en-US')}<br>` +
        `Offline Devices: ${metro.offline.toLocaleString('en-US')}`,
      { className: 'fleet-map-tooltip', sticky: true, direction: 'top', opacity: 1 }
    );

    // Popup on click
    marker.bindPopup(
      `<div class="map-info-window">
         <h3 class="map-info-title">${escapeHtml(metro.metro)}</h3>
         <p class="map-info-country">${escapeHtml(metro.country)}</p>
         <dl class="map-info-stats">
           <div><dt>Total Scanners</dt><dd>${metro.scanners.toLocaleString('en-US')}</dd></div>
           <div><dt>Online</dt><dd>${metro.online.toLocaleString('en-US')}</dd></div>
           <div><dt>Offline</dt><dd>${metro.offline.toLocaleString('en-US')}</dd></div>
           <div><dt>Availability</dt><dd>${availability}%</dd></div>
         </dl>
       </div>`,
      { maxWidth: 280, className: 'fleet-map-popup' }
    );

    marker._metroData = metro;
    marker._mode = mode;
    return marker;
  }

  /**
   * createLegend(legendEl)
   * Fill an existing legend element with Scanner Count bands.
   */
  function createLegend(legendEl) {
    if (!legendEl) return null;
    legendEl.innerHTML = LEGEND_HTML;
    return legendEl;
  }

  /**
   * createDashboardCards(metros, cardsRootId)
   * Compute and display Total Metros / Scanners / Online / Offline.
   */
  function createDashboardCards(metros, cardsRootId = 'map-dashboard-cards') {
    const root = document.getElementById(cardsRootId);
    if (!root) return;

    const totals = metros.reduce(
      (acc, m) => {
        acc.scanners += m.scanners;
        acc.online += m.online;
        acc.offline += m.offline;
        return acc;
      },
      { scanners: 0, online: 0, offline: 0 }
    );

    const setValue = (key, value) => {
      const el = root.querySelector(`[data-map-stat="${key}"]`);
      if (el) el.textContent = Number(value).toLocaleString('en-US');
    };

    setValue('metros', metros.length);
    setValue('scanners', totals.scanners);
    setValue('online', totals.online);
    setValue('offline', totals.offline);

    const viewCount = document.getElementById('scanners-in-view');
    if (viewCount) viewCount.textContent = totals.scanners.toLocaleString('en-US');
  }

  /**
   * fitMap(map, markers)
   * Fit viewport to all bubble markers.
   */
  function fitMap(map, markers) {
    if (!map || !markers || !markers.length) return;
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.18), { maxZoom: 5, animate: false });
  }

  /** Fleet Overview bootstrap */
  async function initOverviewMap() {
    const canvas = document.getElementById('fleet-map-canvas');
    if (!canvas) return null;

    showLoading(canvas);

    try {
      const metros = await loadCSV();
      createDashboardCards(metros, 'map-dashboard-cards');
      createLegend(document.getElementById('fleet-map-legend'));

      const map = initializeMap('fleet-map-canvas', { initialZoom: 2 });
      if (!map) return null;

      const markers = metros.map((metro) => createBubble(map, metro, 'overview'));
      fitMap(map, markers);

      const footer = document.querySelector('.model-footer');
      if (footer) {
        const countries = new Set(metros.map((m) => m.country));
        footer.innerHTML = `
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
          Deployed across <strong>${countries.size}</strong> countries · <strong>${metros.length}</strong> metros
        `;
      }

      return { map, markers, metros };
    } catch (err) {
      console.error(err);
      showError(
        canvas,
        'Unable to load <code>data/stores.csv</code>. Open this project with Live Server and confirm the file exists.'
      );
      return null;
    }
  }

  /** Location Explorer bootstrap — detailed features */
  async function initLocationExplorer() {
    const canvas = document.getElementById('explorer-map');
    if (!canvas) return null;

    const listEl = document.getElementById('metro-list');
    const detailEl = document.getElementById('metro-detail');
    const searchEl = document.getElementById('metro-search');

    showLoading(canvas);

    try {
      const metros = await loadCSV();
      createDashboardCards(metros, 'map-dashboard-cards');
      createLegend(document.getElementById('explorer-legend'));

      const map = initializeMap('explorer-map', { initialZoom: 2 });
      if (!map) return null;

      let activeMetro = null;

      function renderList(filter = '') {
        if (!listEl) return;
        const q = filter.trim().toLowerCase();
        const filtered = metros.filter((m) => {
          if (!q) return true;
          return m.metro.toLowerCase().includes(q) || m.country.toLowerCase().includes(q);
        });

        listEl.innerHTML = filtered
          .map((m) => {
            const color = getBubbleColor(m.scanners).fill;
            const active = activeMetro && activeMetro.metro === m.metro ? 'is-active' : '';
            return `
              <button type="button" class="metro-list-item ${active}" data-metro="${escapeHtml(m.metro)}">
                <span class="metro-list-dot" style="background:${color}"></span>
                <span class="metro-list-main">
                  <span class="metro-list-name">${escapeHtml(m.metro)}</span>
                  <span class="metro-list-meta">${escapeHtml(m.country)} · ${m.scanners.toLocaleString('en-US')} scanners</span>
                </span>
                <span class="metro-list-pct">${getAvailability(m)}%</span>
              </button>
            `;
          })
          .join('');

        listEl.querySelectorAll('[data-metro]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const metro = metros.find((m) => m.metro === btn.dataset.metro);
            if (metro) selectMetro(metro, { zoom: true });
          });
        });
      }

      function renderDetail(metro) {
        if (!detailEl) return;
        detailEl.innerHTML = `
          <div class="metro-detail-header">
            <h3>${escapeHtml(metro.metro)}</h3>
            <p>${escapeHtml(metro.country)}</p>
          </div>
          <div class="metro-detail-kpis">
            <div><span class="label">Scanners</span><span class="value">${metro.scanners.toLocaleString('en-US')}</span></div>
            <div><span class="label">Online</span><span class="value text-success">${metro.online.toLocaleString('en-US')}</span></div>
            <div><span class="label">Offline</span><span class="value text-danger">${metro.offline.toLocaleString('en-US')}</span></div>
            <div><span class="label">Availability</span><span class="value">${getAvailability(metro)}%</span></div>
          </div>
        `;
      }

      function selectMetro(metro, { zoom = false } = {}) {
        activeMetro = metro;
        renderList(searchEl ? searchEl.value : '');
        renderDetail(metro);
        if (zoom) {
          map.setView([metro.lat, metro.lng], Math.max(map.getZoom(), 5), { animate: true });
          const match = markers.find((mk) => mk._metroData && mk._metroData.metro === metro.metro);
          if (match) match.openPopup();
        }
      }

      const markers = metros.map((metro) => {
        const marker = createBubble(map, metro, 'explorer');
        marker.on('click', () => selectMetro(metro));
        return marker;
      });

      fitMap(map, markers);

      if (searchEl) searchEl.addEventListener('input', () => renderList(searchEl.value));
      renderList();

      const focus = new URLSearchParams(global.location.search).get('metro');
      if (focus) {
        const match = metros.find((m) => m.metro.toLowerCase() === focus.toLowerCase());
        if (match) selectMetro(match, { zoom: true });
      }

      return { map, markers, metros, selectMetro };
    } catch (err) {
      console.error(err);
      showError(
        canvas,
        'Unable to load <code>data/stores.csv</code>. Open this project with Live Server and confirm the file exists.'
      );
      return null;
    }
  }

  global.AetrexMap = {
    initializeMap,
    loadCSV,
    createBubble,
    createLegend,
    createDashboardCards,
    fitMap,
    initOverviewMap,
    initLocationExplorer,
  };
})(window);
