/**
 * Fleet world map (Leaflet + OpenStreetMap + Papa Parse)
 *
 * Data source: data/stores.csv (one row per store/scanner)
 * Fleet Overview → quick world view of metro bubbles
 * Location Explorer → click pin opens right-side scanner drawer (no popup)
 *
 * CDN deps (loaded from HTML): Leaflet CSS/JS, Papa Parse
 */

(function (global) {
  'use strict';

  const STORES_CSV_URL = 'data/stores.csv';
  const GEO_CACHE_KEY = 'aetrex-metro-geocodes-v5';
  const GEO_CONCURRENCY = 16;
  const NOMINATIM_MIN_INTERVAL_MS = 1100;
  const PHOTON_TIMEOUT_MS = 2500;
  const DEFAULT_MAP_ZOOM = 2;
  const DEFAULT_MAP_CENTER = [20, 0];
  const WORLD_BOUNDS = L.latLngBounds([[-58, -180], [75, 180]]);
  const FIT_BOUNDS_PADDING = 0.14;
  const FIT_BOUNDS_MAX_ZOOM = 4;

  const BUBBLE_COLORS = {
    green: { fill: '#5cb85c', border: '#3d8b3d' },
    yellow: { fill: '#f0ad4e', border: '#d58512' },
    orange: { fill: '#e67e22', border: '#c46814' },
    red: { fill: '#d9534f', border: '#ac2925' },
  };

  const LEGEND_HTML = `
    <span class="legend-title">Scanner Count</span>
    <span class="legend-item"><span class="legend-swatch legend-green"></span>0–50</span>
    <span class="legend-item"><span class="legend-swatch legend-yellow"></span>51–150</span>
    <span class="legend-item"><span class="legend-swatch legend-orange"></span>151–300</span>
    <span class="legend-item"><span class="legend-swatch legend-red"></span>300+</span>
  `;

  const COUNTRY_CODES = {
    'United States': 'US',
    Canada: 'CA',
    Sweden: 'SE',
    Israel: 'IL',
    Denmark: 'DK',
    Netherlands: 'NL',
    'United Arab Emirates': 'AE',
    Indonesia: 'ID',
    Finland: 'FI',
    Poland: 'PL',
    Mexico: 'MX',
    Japan: 'JP',
    Philippines: 'PH',
    Portugal: 'PT',
    Spain: 'ES',
    'United Kingdom': 'GB',
    Germany: 'DE',
    France: 'FR',
    Australia: 'AU',
    India: 'IN',
    Brazil: 'BR',
    Italy: 'IT',
    Norway: 'NO',
    Belgium: 'BE',
    Austria: 'AT',
    Switzerland: 'CH',
    Ireland: 'IE',
    'New Zealand': 'NZ',
    Singapore: 'SG',
    'South Africa': 'ZA',
    'South Korea': 'KR',
    China: 'CN',
    Turkey: 'TR',
    Greece: 'GR',
    Hungary: 'HU',
    'Czech Republic': 'CZ',
    Romania: 'RO',
    Croatia: 'HR',
    Slovakia: 'SK',
    Slovenia: 'SI',
    Lithuania: 'LT',
    Latvia: 'LV',
    Estonia: 'EE',
    Luxembourg: 'LU',
    Malta: 'MT',
    Cyprus: 'CY',
    Iceland: 'IS',
    Thailand: 'TH',
    Malaysia: 'MY',
    Vietnam: 'VN',
    Taiwan: 'TW',
    'Hong Kong': 'HK',
    Colombia: 'CO',
    Chile: 'CL',
    Argentina: 'AR',
    Peru: 'PE',
    Ecuador: 'EC',
    Panama: 'PA',
    'Costa Rica': 'CR',
    'Puerto Rico': 'PR',
    Jamaica: 'JM',
    Kuwait: 'KW',
    Qatar: 'QA',
    Bahrain: 'BH',
    'Saudi Arabia': 'SA',
    Jordan: 'JO',
    Lebanon: 'LB',
    Egypt: 'EG',
    Morocco: 'MA',
    Nigeria: 'NG',
    Kenya: 'KE',
    Kazakhstan: 'KZ',
    Ukraine: 'UA',
    Russia: 'RU',
    Belarus: 'BY',
    Serbia: 'RS',
    Bulgaria: 'BG',
    Pakistan: 'PK',
    Bangladesh: 'BD',
    'Sri Lanka': 'LK',
  };

  const COUNTRY_CENTROIDS = {
    'United States': [39.8283, -98.5795],
    Canada: [56.1304, -106.3468],
    Sweden: [60.1282, 18.6435],
    Israel: [31.0461, 34.8516],
    Denmark: [56.2639, 9.5018],
    Netherlands: [52.1326, 5.2913],
    'United Arab Emirates': [23.4241, 53.8478],
    Indonesia: [-0.7893, 113.9213],
    Finland: [61.9241, 25.7482],
    Poland: [51.9194, 19.1451],
    Mexico: [23.6345, -102.5528],
    Japan: [36.2048, 138.2529],
    Philippines: [12.8797, 121.774],
    Portugal: [39.3999, -8.2245],
    Spain: [40.4637, -3.7492],
    'United Kingdom': [55.3781, -3.436],
    Germany: [51.1657, 10.4515],
    France: [46.2276, 2.2137],
    Australia: [-25.2744, 133.7751],
    India: [20.5937, 78.9629],
    Brazil: [-14.235, -51.9253],
    Italy: [41.8719, 12.5674],
    Norway: [60.472, 8.4689],
    Belgium: [50.5039, 4.4699],
    Austria: [47.5162, 14.5501],
    Switzerland: [46.8182, 8.2275],
    Ireland: [53.4129, -8.2439],
    'New Zealand': [-40.9006, 174.886],
    Singapore: [1.3521, 103.8198],
    'South Africa': [-30.5595, 22.9375],
    'South Korea': [35.9078, 127.7669],
    China: [35.8617, 104.1954],
    Turkey: [38.9637, 35.2433],
    Greece: [39.0742, 21.8243],
    Hungary: [47.1625, 19.5033],
    'Czech Republic': [49.8175, 15.473],
    Romania: [45.9432, 24.9668],
    Croatia: [45.1, 15.2],
    Slovakia: [48.669, 19.699],
    Slovenia: [46.1512, 14.9955],
    Lithuania: [55.1694, 23.8813],
    Latvia: [56.8796, 24.6032],
    Estonia: [58.5953, 25.0136],
    Luxembourg: [49.8153, 6.1296],
    Malta: [35.9375, 14.3754],
    Cyprus: [35.1264, 33.4299],
    Iceland: [64.9631, -19.0208],
    Thailand: [15.87, 100.9925],
    Malaysia: [4.2105, 101.9758],
    Vietnam: [14.0583, 108.2772],
    Taiwan: [23.6978, 120.9605],
    'Hong Kong': [22.3193, 114.1694],
    Colombia: [4.5709, -74.2973],
    Chile: [-35.6751, -71.543],
    Argentina: [-38.4161, -63.6167],
    Peru: [-9.19, -75.0152],
    Ecuador: [-1.8312, -78.1834],
    Panama: [8.538, -80.7821],
    'Costa Rica': [9.7489, -83.7534],
    'Puerto Rico': [18.2208, -66.5901],
    Jamaica: [18.1096, -77.2975],
    Kuwait: [29.3117, 47.4818],
    Qatar: [25.3548, 51.1839],
    Bahrain: [26.0667, 50.5577],
    'Saudi Arabia': [23.8859, 45.0792],
    Jordan: [30.5852, 36.2384],
    Lebanon: [33.8547, 35.8623],
    Egypt: [26.8206, 30.8025],
    Morocco: [31.7917, -7.0926],
    Nigeria: [9.082, 8.6753],
    Kenya: [-0.0236, 37.9062],
    Kazakhstan: [48.0196, 66.9237],
    Ukraine: [48.3794, 31.1656],
    Russia: [61.524, 105.3188],
    Belarus: [53.7098, 27.9534],
    Serbia: [44.0165, 21.0059],
    Bulgaria: [42.7339, 25.4858],
    Pakistan: [30.3753, 69.3451],
    Bangladesh: [23.685, 90.3563],
    'Sri Lanka': [7.8731, 80.7718],
  };

  const CITY_ALIASES = {
    bangalore: 'Bengaluru',
    banglore: 'Bengaluru',
    bengaluru: 'Bengaluru',
    "b'luru": 'Bengaluru',
    bluru: 'Bengaluru',
    bombay: 'Mumbai',
    madras: 'Chennai',
    calcutta: 'Kolkata',
    gurgaon: 'Gurugram',
    gurugram: 'Gurugram',
    mysore: 'Mysuru',
    mysuru: 'Mysuru',
    trivandrum: 'Thiruvananthapuram',
    pondicherry: 'Puducherry',
    poona: 'Pune',
    koramangala: 'Bengaluru',
    hyd: 'Hyderabad',
    hyderabad: 'Hyderabad',
  };

  const STATE_ALIASES = {
    ka: 'Karnataka',
    kar: 'Karnataka',
    k: 'Karnataka',
    karnataka: 'Karnataka',
    bangalore: 'Karnataka',
    banglore: 'Karnataka',
    bengaluru: 'Karnataka',
    mh: 'Maharashtra',
    maharashtra: 'Maharashtra',
    tn: 'Tamil Nadu',
    'tamil nadu': 'Tamil Nadu',
    telengana: 'Telangana',
    telangana: 'Telangana',
    ts: 'Telangana',
    up: 'Uttar Pradesh',
    'uttar pradesh': 'Uttar Pradesh',
    hr: 'Haryana',
    haryana: 'Haryana',
    dl: 'Delhi',
    'new delhi': 'Delhi',
    delhi: 'Delhi',
    mp: 'Madhya Pradesh',
    'madhya pradesh': 'Madhya Pradesh',
    rj: 'Rajasthan',
    rajasthan: 'Rajasthan',
    mysore: 'Karnataka',
    tx: 'Texas',
    ca: 'California',
    ny: 'New York',
    fl: 'Florida',
    il: 'Illinois',
    pa: 'Pennsylvania',
    oh: 'Ohio',
    ga: 'Georgia',
    nc: 'North Carolina',
    mi: 'Michigan',
    nj: 'New Jersey',
    va: 'Virginia',
    wa: 'Washington',
    ma: 'Massachusetts',
    az: 'Arizona',
    co: 'Colorado',
    md: 'Maryland',
    mn: 'Minnesota',
    mo: 'Missouri',
    wi: 'Wisconsin',
    ct: 'Connecticut',
    or: 'Oregon',
    al: 'Alabama',
    ok: 'Oklahoma',
  };

  // Verified city coordinates used before any online geocoder
  const CITY_COORDS = {
    'bengaluru|india': { lat: 12.9768, lng: 77.5901 },
    'bangalore|india': { lat: 12.9768, lng: 77.5901 },
    'mumbai|india': { lat: 19.055, lng: 72.8692 },
    'thane|india': { lat: 19.1943, lng: 72.9702 },
    'mysuru|india': { lat: 12.3052, lng: 76.6554 },
    'mysore|india': { lat: 12.3052, lng: 76.6554 },
    'chennai|india': { lat: 13.0827, lng: 80.2707 },
    'hyderabad|india': { lat: 17.385, lng: 78.4867 },
    'new delhi|india': { lat: 28.6139, lng: 77.209 },
    'delhi|india': { lat: 28.6139, lng: 77.209 },
    'gurugram|india': { lat: 28.4595, lng: 77.0266 },
    'gurgaon|india': { lat: 28.4595, lng: 77.0266 },
    'noida|india': { lat: 28.5355, lng: 77.391 },
    'indore|india': { lat: 22.7196, lng: 75.8577 },
    'jodhpur|india': { lat: 26.2389, lng: 73.0243 },
    'koramangala|india': { lat: 12.9352, lng: 77.6245 },
  };

  const PLACEHOLDER_CITY = /^(x+|xxx+|tbd|abc|oo|null|n\/?a|test|unknown)$/i;

  const STATE_CENTROIDS = {
    // India
    Karnataka: [15.3173, 75.7139],
    Maharashtra: [19.7515, 75.7139],
    'Tamil Nadu': [11.1271, 78.6569],
    Telangana: [18.1124, 79.0193],
    Delhi: [28.7041, 77.1025],
    Haryana: [29.0588, 76.0856],
    'Uttar Pradesh': [26.8467, 80.9462],
    'Madhya Pradesh': [22.9734, 78.6569],
    Rajasthan: [27.0238, 74.2179],
    Gujarat: [22.2587, 71.1924],
    Kerala: [10.8505, 76.2711],
    Punjab: [31.1471, 75.3412],
    'West Bengal': [22.9868, 87.855],
    // US (common abbreviations + full names)
    Texas: [31.9686, -99.9018],
    TX: [31.9686, -99.9018],
    California: [36.7783, -119.4179],
    CA: [36.7783, -119.4179],
    'New York': [43.0, -75.0],
    NY: [43.0, -75.0],
    Florida: [27.6648, -81.5158],
    FL: [27.6648, -81.5158],
    Illinois: [40.6331, -89.3985],
    IL: [40.6331, -89.3985],
    Pennsylvania: [41.2033, -77.1945],
    PA: [41.2033, -77.1945],
    Ohio: [40.4173, -82.9071],
    OH: [40.4173, -82.9071],
    Georgia: [32.1656, -82.9001],
    GA: [32.1656, -82.9001],
    'North Carolina': [35.7596, -79.0193],
    NC: [35.7596, -79.0193],
    Michigan: [44.3148, -85.6024],
    MI: [44.3148, -85.6024],
    'New Jersey': [40.0583, -74.4057],
    NJ: [40.0583, -74.4057],
    Virginia: [37.4316, -78.6569],
    VA: [37.4316, -78.6569],
    Washington: [47.4009, -121.4905],
    WA: [47.4009, -121.4905],
    Massachusetts: [42.4072, -71.3824],
    MA: [42.4072, -71.3824],
    Arizona: [34.0489, -111.0937],
    AZ: [34.0489, -111.0937],
    Colorado: [39.5501, -105.7821],
    CO: [39.5501, -105.7821],
    Maryland: [39.0458, -76.6413],
    MD: [39.0458, -76.6413],
    Minnesota: [46.7296, -94.6859],
    MN: [46.7296, -94.6859],
    Missouri: [37.9643, -91.8318],
    MO: [37.9643, -91.8318],
    Wisconsin: [43.7844, -88.7879],
    WI: [43.7844, -88.7879],
    Connecticut: [41.6032, -73.0877],
    CT: [41.6032, -73.0877],
    Oregon: [43.8041, -120.5542],
    OR: [43.8041, -120.5542],
    Alabama: [32.3182, -86.9023],
    AL: [32.3182, -86.9023],
    Oklahoma: [35.4676, -97.5164],
    OK: [35.4676, -97.5164],
  };

  let nominatimQueue = Promise.resolve();
  let lastNominatimAt = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getBubbleColor(scanners) {
    if (scanners <= 50) return BUBBLE_COLORS.green;
    if (scanners <= 150) return BUBBLE_COLORS.yellow;
    if (scanners <= 300) return BUBBLE_COLORS.orange;
    return BUBBLE_COLORS.red;
  }

  function getBubbleRadius() {
    return 6;
  }

  function getAvailability(metro) {
    if (!metro.scanners) return 0;
    return Math.round((metro.online / metro.scanners) * 1000) / 10;
  }

  function statusBadgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'online' || s === 'ok') return 'status-online';
    if (s === 'idle' || s === 'pending' || s === 'locked') return 'status-pending';
    if (s === 'offline') return 'status-offline';
    return 'status-inactive';
  }

  function formatMetroLabel(city, state) {
    const cityName = String(city || '').trim() || 'Unknown';
    const stateName = String(state || '').trim();
    return stateName ? `${cityName}, ${stateName}` : cityName;
  }

  function buildMetroKey(city, state, country) {
    return `${String(city || '').trim().toLowerCase()}|${String(state || '')
      .trim()
      .toLowerCase()}|${String(country || '').trim().toLowerCase()}`;
  }

  function deriveScannerStatus(row) {
    const statusRaw = String(row.Status || '').trim();
    const activeFlag = String(row.ActiveFlg || '').trim().toUpperCase();

    if (/^LOCKED$/i.test(statusRaw)) return 'Offline';
    if (/^OK$/i.test(statusRaw) && activeFlag === 'Y') return 'Active';
    if (statusRaw) return statusRaw;
    return activeFlag === 'Y' ? 'Active' : 'Offline';
  }

  function normalizeStoreRow(row) {
    const hasAnyValue = Object.values(row || {}).some((v) => String(v || '').trim() !== '');
    if (!hasAnyValue) return null;

    const city = String(row.City || '').trim() || 'Unknown';
    const state = String(row.State || '').trim();
    const country = String(row.Country || '').trim() || '—';
    const metroKey = buildMetroKey(city, state, country);
    const status = deriveScannerStatus(row);

    const storeNic = String(row.StoreNIC || '').replace(/\s+/g, '');
    const deviceId = String(row.DeviceIDComputed || '').trim();
    const serial =
      deviceId ||
      storeNic ||
      (row.StoreID ? `STR-${String(row.StoreID).trim()}` : 'UNKNOWN');

    const version =
      String(row.SoftwareVersionComputed || row.iStepVerNumber || '—').trim() || '—';

    return {
      storeId: String(row.StoreID || '').trim(),
      serial,
      store: String(row.StoreName || '').trim() || 'Unknown store',
      metroKey,
      metro: formatMetroLabel(city, state),
      city,
      state,
      country,
      zip: String(row.Zip || '').trim(),
      version,
      status,
      online: status !== 'Offline',
      brand: String(row.BrandName || '').trim(),
      deviceModel: deviceId,
      address: String(row.Address || '').trim(),
    };
  }

  function buildFleetIndex(stores) {
    const scannersByMetro = new Map();
    const metroMeta = new Map();

    stores.forEach((scanner) => {
      if (!scannersByMetro.has(scanner.metroKey)) {
        scannersByMetro.set(scanner.metroKey, []);
        metroMeta.set(scanner.metroKey, {
          metroKey: scanner.metroKey,
          metro: scanner.metro,
          city: scanner.city,
          state: scanner.state,
          country: scanner.country,
          lat: null,
          lng: null,
          scanners: 0,
          online: 0,
          offline: 0,
        });
      }

      scannersByMetro.get(scanner.metroKey).push(scanner);

      const metro = metroMeta.get(scanner.metroKey);
      metro.scanners += 1;
      if (scanner.online) metro.online += 1;
      else metro.offline += 1;
    });

    return {
      stores,
      metros: Array.from(metroMeta.values()),
      scannersByMetro,
    };
  }

  function readGeoCache() {
    try {
      const raw = global.localStorage.getItem(GEO_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn('Unable to read geocode cache', err);
      return {};
    }
  }

  function writeGeoCache(cache) {
    try {
      global.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn('Unable to write geocode cache', err);
    }
  }

  function hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  let fleetDataCache = null;

  function normalizeCityName(city, state, country) {
    const raw = String(city || '').trim();
    if (!raw) return '';

    const lower = raw.toLowerCase();
    if (PLACEHOLDER_CITY.test(lower)) return '';

    // Dirty India abbreviations seen in stores.csv (b / ben / b'luru / koramangala)
    const countryNorm = String(country || '').trim().toLowerCase();
    const stateNorm = String(state || '').trim().toLowerCase();
    if (countryNorm === 'india') {
      if (
        /bengaluru|bangalore|banglore|b'?luru|koramangala/.test(lower) ||
        ((lower === 'b' || lower === 'ben') &&
          /^(k|ka|kar|karnataka|bangalore|banglore)$/.test(stateNorm))
      ) {
        return 'Bengaluru';
      }
      if (/chennai|nager/.test(lower)) return 'Chennai';
    }

    return CITY_ALIASES[lower] || raw;
  }

  function normalizeStateName(state, city, country) {
    const raw = String(state || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (PLACEHOLDER_CITY.test(lower)) return '';

    if (STATE_ALIASES[lower]) return STATE_ALIASES[lower];

    const countryNorm = String(country || '').trim().toLowerCase();
    if (countryNorm === 'india') {
      if (/banglo|bengaluru|karnataka|^ka$|^kar$/.test(lower)) return 'Karnataka';
      if (/telengana|telangana/.test(lower)) return 'Telangana';
    }

    return raw;
  }

  function sanitizeMetroLocation(metro) {
    const city = normalizeCityName(metro.city, metro.state, metro.country);
    const state = normalizeStateName(metro.state, city, metro.country);
    const country = String(metro.country || '').trim() || '—';
    const label = city
      ? state
        ? `${city}, ${state}`
        : city
      : metro.metro;

    return {
      ...metro,
      city: city || metro.city,
      state: state || metro.state,
      country,
      metro: label,
      _normalizedCity: city,
      _normalizedState: state,
    };
  }

  function lookupSeedCoords(metro) {
    const city = (metro._normalizedCity || normalizeCityName(metro.city, metro.state, metro.country) || '')
      .trim()
      .toLowerCase();
    const country = String(metro.country || '').trim().toLowerCase();
    if (!city || !country) return null;

    const direct = CITY_COORDS[`${city}|${country}`];
    if (direct) return { ...direct, source: 'seed' };

    const aliasCity = CITY_ALIASES[city];
    if (aliasCity) {
      const aliased = CITY_COORDS[`${aliasCity.toLowerCase()}|${country}`];
      if (aliased) return { ...aliased, source: 'seed' };
    }

    return null;
  }

  function getCityVariants(city) {
    const raw = String(city || '').trim().toLowerCase();
    const normalized = normalizeCityName(city).toLowerCase();
    const variants = new Set([raw, normalized]);
    Object.entries(CITY_ALIASES).forEach(([key, value]) => {
      const valueLower = value.toLowerCase();
      if (key === raw || valueLower === raw || valueLower === normalized || key === normalized) {
        variants.add(key);
        variants.add(valueLower);
      }
    });
    return Array.from(variants).filter(Boolean);
  }

  function stateMatches(resultState, metroState) {
    const a = String(resultState || '').trim().toLowerCase();
    const b = String(metroState || '').trim().toLowerCase();
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  }

  function buildGeocodeQuery(metro) {
    const city = metro._normalizedCity || normalizeCityName(metro.city, metro.state, metro.country);
    const state = metro._normalizedState || normalizeStateName(metro.state, city, metro.country);
    const country = String(metro.country || '').trim();
    const parts = [];

    if (city) parts.push(city);
    if (state && state.toLowerCase() !== city.toLowerCase()) parts.push(state);
    if (country) parts.push(country);

    return parts.join(', ') || metro.metro;
  }

  function pickPhotonResult(metro, features) {
    if (!features || !features.length) return null;

    const countryCode = COUNTRY_CODES[metro.country];
    const cityVariants = getCityVariants(metro._normalizedCity || metro.city);
    const scored = features
      .map((feature) => {
        const props = feature.properties || {};
        let score = 0;

        if (countryCode && props.countrycode && props.countrycode !== countryCode) {
          return { feature, score: -1 };
        }

        const name = String(props.name || props.city || '').trim().toLowerCase();
        if (cityVariants.some((variant) => name === variant)) score += 5;
        if (stateMatches(props.state, metro._normalizedState || metro.state)) score += 3;
        if (props.type === 'city' || props.osm_value === 'city') score += 2;
        if (props.country && props.country.toLowerCase() === String(metro.country || '').toLowerCase()) {
          score += 1;
        }

        return { feature, score };
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return null;
    if (scored[0].score >= 5) return scored[0].feature;
    if (scored[0].score >= 3) return scored[0].feature;
    return scored[0].score > 0 ? scored[0].feature : null;
  }

  function pickNominatimResult(metro, results) {
    if (!results || !results.length) return null;

    const cityVariants = getCityVariants(metro._normalizedCity || metro.city);
    const countryNorm = String(metro.country || '').trim().toLowerCase();
    const scored = results
      .map((result) => {
        const display = String(result.display_name || '').toLowerCase();
        const name = String(result.name || '').toLowerCase();
        let score = 0;

        if (cityVariants.some((variant) => name === variant || display.startsWith(`${variant},`))) {
          score += 5;
        }
        if (
          (metro._normalizedState || metro.state) &&
          display.includes(String(metro._normalizedState || metro.state).trim().toLowerCase())
        ) {
          score += 3;
        }
        if (countryNorm && display.includes(countryNorm)) score += 1;
        if (result.addresstype === 'city' || result.type === 'city' || result.class === 'place') {
          score += 1;
        }

        return { result, score };
      })
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return null;
    if (scored[0].score >= 5) return scored[0].result;
    if (scored[0].score >= 3) return scored[0].result;
    return scored[0].score > 0 ? scored[0].result : null;
  }

  function coordsFromCache(cacheEntry) {
    if (!cacheEntry || !Number.isFinite(cacheEntry.lat) || !Number.isFinite(cacheEntry.lng)) {
      return null;
    }
    return {
      lat: cacheEntry.lat,
      lng: normalizeLng(cacheEntry.lng),
      source: cacheEntry.source || 'geocode',
    };
  }

  async function runNominatimRequest(url) {
    nominatimQueue = nominatimQueue.then(async () => {
      const wait = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimAt));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AetrexFleetMap/1.0 (PoC dashboard)',
        },
      });
      lastNominatimAt = Date.now();
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      return response.json();
    });

    return nominatimQueue;
  }

  async function geocodeWithPhoton(metro) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS)
      : null;

    try {
      const query = buildGeocodeQuery(metro);
      if (!query) return null;

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`,
        controller ? { signal: controller.signal } : undefined
      );
      if (!response.ok) return null;

      const payload = await response.json();
      const feature = pickPhotonResult(metro, payload.features || []);
      if (!feature) return null;

      const [lng, lat] = feature.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return { lat, lng: normalizeLng(lng), source: 'geocode' };
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.warn('Photon geocode failed for', metro.metro, err);
      }
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function geocodeWithNominatim(metro) {
    try {
      const city =
        metro._normalizedCity || normalizeCityName(metro.city, metro.state, metro.country);
      const state =
        metro._normalizedState || normalizeStateName(metro.state, city, metro.country);

      if (!city) return null;

      const params = new URLSearchParams({
        format: 'json',
        limit: '6',
        addressdetails: '1',
      });
      params.set('city', city);
      if (state) params.set('state', state);
      if (metro.country) params.set('country', String(metro.country).trim());

      const results = await runNominatimRequest(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );
      const match = pickNominatimResult(
        { ...metro, city, state, _normalizedCity: city, _normalizedState: state },
        results
      );
      if (!match) return null;

      const lat = parseFloat(match.lat);
      const lng = parseFloat(match.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return { lat, lng: normalizeLng(lng), source: 'geocode' };
    } catch (err) {
      console.warn('Nominatim geocode failed for', metro.metro, err);
      return null;
    }
  }

  async function geocodeStateFallback(metro) {
    const state =
      metro._normalizedState || normalizeStateName(metro.state, metro.city, metro.country);
    if (!state || !metro.country) return null;

    try {
      const params = new URLSearchParams({
        state,
        country: String(metro.country).trim(),
        format: 'json',
        limit: '1',
      });
      const results = await runNominatimRequest(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );
      if (!results || !results[0]) return null;

      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const jittered = jitterFromKey(metro.metroKey, lat, lng, 0.25);
      return {
        lat: jittered.lat,
        lng: normalizeLng(jittered.lng),
        source: 'state-fallback',
      };
    } catch (err) {
      console.warn('State fallback geocode failed for', metro.metro, err);
      return null;
    }
  }
  function normalizeLng(lng) {
    let value = lng;
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
  }

  function jitterFromKey(key, lat, lng, spread = 0.65) {
    const h = hashStr(key);
    const angle = (h % 360) * (Math.PI / 180);
    const dist = ((h >> 8) % 1000) / 1000 * spread;
    const latRad = (lat * Math.PI) / 180;
    return {
      lat: lat + dist * Math.cos(angle),
      lng: lng + (dist * Math.sin(angle)) / Math.max(Math.cos(latRad), 0.2),
    };
  }

  function applyStateFallback(metro) {
    const state =
      metro._normalizedState || normalizeStateName(metro.state, metro.city, metro.country);
    const centroid = STATE_CENTROIDS[state];
    if (!centroid) return null;
    const jittered = jitterFromKey(metro.metroKey, centroid[0], centroid[1], 0.45);
    return {
      lat: jittered.lat,
      lng: normalizeLng(jittered.lng),
      source: 'state-approx',
    };
  }

  function applyCountryFallback(metro) {
    const centroid = COUNTRY_CENTROIDS[metro.country];
    if (!centroid) return null;
    const jittered = jitterFromKey(metro.metroKey, centroid[0], centroid[1], 1.2);
    return {
      lat: jittered.lat,
      lng: normalizeLng(jittered.lng),
      source: 'country-approx',
    };
  }

  /** Instant placement: seed → cache → state approx → country approx (no network) */
  function applyQuickCoords(metros) {
    const cache = readGeoCache();
    let cacheDirty = false;

    const placed = metros.map((metro) => {
      const cleaned = sanitizeMetroLocation(metro);
      const cached = coordsFromCache(cache[cleaned.metroKey]);
      if (cached && (cached.source === 'geocode' || cached.source === 'seed')) {
        return { ...cleaned, ...cached, _approximate: false };
      }

      const seeded = lookupSeedCoords(cleaned);
      if (seeded) {
        cache[cleaned.metroKey] = seeded;
        cacheDirty = true;
        return { ...cleaned, ...seeded, _approximate: false };
      }

      if (cached) {
        return { ...cleaned, ...cached, _approximate: true };
      }

      const stateApprox = applyStateFallback(cleaned);
      if (stateApprox) {
        return { ...cleaned, ...stateApprox, _approximate: true };
      }

      const countryApprox = applyCountryFallback(cleaned);
      if (countryApprox) {
        return { ...cleaned, ...countryApprox, _approximate: true };
      }

      return cleaned;
    });

    if (cacheDirty) writeGeoCache(cache);
    return placed.filter((metro) => Number.isFinite(metro.lat) && Number.isFinite(metro.lng));
  }

  function geocodeDedupeKey(metro) {
    const city =
      metro._normalizedCity || normalizeCityName(metro.city, metro.state, metro.country);
    const state =
      metro._normalizedState || normalizeStateName(metro.state, city, metro.country);
    const country = String(metro.country || '').trim().toLowerCase();
    return `${String(city || '').toLowerCase()}|${String(state || '').toLowerCase()}|${country}`;
  }

  async function geocodeMetroFast(metro, cache, sharedResults) {
    const cleaned = sanitizeMetroLocation(metro);
    const cached = coordsFromCache(cache[cleaned.metroKey]);
    if (cached && (cached.source === 'geocode' || cached.source === 'seed')) {
      return { ...cleaned, ...cached, _approximate: false };
    }

    const seeded = lookupSeedCoords(cleaned);
    if (seeded) {
      cache[cleaned.metroKey] = seeded;
      return { ...cleaned, ...seeded, _approximate: false };
    }

    const dedupeKey = geocodeDedupeKey(cleaned);
    if (sharedResults.has(dedupeKey)) {
      const shared = await sharedResults.get(dedupeKey);
      if (shared) {
        cache[cleaned.metroKey] = shared;
        return { ...cleaned, ...shared, _approximate: false };
      }
      return cleaned;
    }

    const lookupPromise = geocodeWithPhoton(cleaned).then((coords) => {
      if (coords) {
        cache[cleaned.metroKey] = coords;
        return coords;
      }
      return null;
    });
    sharedResults.set(dedupeKey, lookupPromise);

    const coords = await lookupPromise;
    if (coords) {
      return { ...cleaned, ...coords, _approximate: false };
    }

    return cleaned;
  }

  async function refineMetroCoordsInBackground(metros, onMetroUpdated) {
    const cache = readGeoCache();
    const sharedResults = new Map();
    const pending = metros.filter((metro) => {
      const cached = cache[metro.metroKey];
      return !cached || (cached.source !== 'geocode' && cached.source !== 'seed');
    });

    // Prioritize metros with more scanners so important pins refine first
    pending.sort((a, b) => (b.scanners || 0) - (a.scanners || 0));

    for (let i = 0; i < pending.length; i += GEO_CONCURRENCY) {
      const batch = pending.slice(i, i + GEO_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((metro) => geocodeMetroFast(metro, cache, sharedResults))
      );

      batchResults.forEach((metro) => {
        if (!Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) return;
        if (metro.source !== 'geocode' && metro.source !== 'seed') return;

        const idx = metros.findIndex((item) => item.metroKey === metro.metroKey);
        if (idx >= 0) {
          metros[idx] = { ...metros[idx], ...metro, _approximate: false };
          if (onMetroUpdated) onMetroUpdated(metros[idx]);
        }
      });

      writeGeoCache(cache);
    }
  }

  function showLoading(container, message = 'Loading fleet locations…') {
    container.innerHTML = `
      <div class="fleet-map-loading" role="status" aria-live="polite">
        <div class="fleet-map-spinner" aria-hidden="true"></div>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function updateLoadingMessage(container, message) {
    const textEl = container.querySelector('.fleet-map-loading p');
    if (textEl) textEl.textContent = message;
  }

  function showError(container, message) {
    container.innerHTML = `
      <div class="fleet-map-error">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <p>${message}</p>
      </div>
    `;
  }

  function initializeMap(containerId, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error('Map container not found:', containerId);
      return null;
    }

    el.innerHTML = '';

    const map = L.map(el, {
      worldCopyJump: false,
      scrollWheelZoom: options.scrollWheelZoom !== false,
      zoomControl: options.zoomControl !== false,
      minZoom: options.minZoom || 2,
      maxZoom: options.maxZoom || 18,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 0.85,
    }).setView(
      options.center || DEFAULT_MAP_CENTER,
      options.initialZoom || DEFAULT_MAP_ZOOM
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      noWrap: true,
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 80);
    const onResize = () => {
      map.invalidateSize();
      if (map._fleetUseWorldFit) {
        fitWorldToContainer(map, { mode: map._fleetFitMode || 'explorer' });
      }
    };
    window.addEventListener('resize', onResize);
    map._fleetResizeHandler = onResize;

    return map;
  }

  function fitWorldToContainer(map, options = {}) {
    if (!map) return;
    map.invalidateSize();
    const size = map.getSize();
    if (!size.x || !size.y) {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { animate: false });
      return;
    }

    // Fleet Overview: fixed compact world view for the 320px card
    if (options.mode === 'overview') {
      map.setView(DEFAULT_MAP_CENTER, 2, { animate: false });
      map._fleetUseWorldFit = true;
      map._fleetFitMode = 'overview';
      return;
    }

    const centerLat = DEFAULT_MAP_CENTER[0];
    const centerLng = DEFAULT_MAP_CENTER[1];
    let zoom = DEFAULT_MAP_ZOOM;

    map.setView([centerLat, centerLng], zoom, { animate: false });

    while (zoom < 7) {
      const west = map.latLngToContainerPoint([centerLat, -180]);
      const east = map.latLngToContainerPoint([centerLat, 180]);
      const worldWidth = east.x - west.x;

      if (worldWidth >= size.x - 2) break;

      zoom += 1;
      map.setView([centerLat, centerLng], zoom, { animate: false });
    }

    map.setView([centerLat, centerLng], zoom, { animate: false });
    map._fleetUseWorldFit = true;
    map._fleetFitMode = 'explorer';
  }

  function scheduleMapFit(map, markers, options = {}) {
    const runFit = () => fitMap(map, markers, options);
    requestAnimationFrame(() => {
      map.invalidateSize();
      runFit();
      setTimeout(() => {
        map.invalidateSize();
        runFit();
      }, 120);
    });
  }

  function parseCsvUrl(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete(results) {
          if (results.errors && results.errors.length) {
            console.warn('Papa Parse warnings:', results.errors);
          }
          resolve(results.data || []);
        },
        error(err) {
          reject(err || new Error(`Failed to load ${url}`));
        },
      });
    });
  }

  function loadFleetData() {
    if (fleetDataCache) return Promise.resolve(fleetDataCache);

    return parseCsvUrl(STORES_CSV_URL).then((rows) => {
      const stores = rows.map(normalizeStoreRow).filter(Boolean);
      fleetDataCache = buildFleetIndex(stores);
      return fleetDataCache;
    });
  }

  function loadCSV() {
    return loadFleetData().then((data) => data.metros);
  }

  /**
   * createBubble(map, metro, mode)
   * Overview keeps click popup; Explorer opens drawer instead (no popup).
   */
  function createBubble(map, metro, mode = 'overview') {
    const colors = getBubbleColor(metro.scanners);
    const radius = getBubbleRadius();
    const availability = getAvailability(metro);

    const marker = L.circleMarker([metro.lat, metro.lng], {
      radius,
      fillColor: colors.fill,
      color: colors.border,
      weight: 2,
      opacity: 0.95,
      fillOpacity: 0.55,
    }).addTo(map);

    marker.bindTooltip(
      `<strong>${escapeHtml(metro.metro)}</strong><br>` +
        `${escapeHtml(metro.country)}<br>` +
        `Total Scanners: ${metro.scanners.toLocaleString('en-US')}<br>` +
        `Online Devices: ${metro.online.toLocaleString('en-US')}<br>` +
        `Offline Devices: ${metro.offline.toLocaleString('en-US')}`,
      { className: 'fleet-map-tooltip', sticky: true, direction: 'top', opacity: 1 }
    );

    if (mode !== 'explorer') {
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
    }

    marker._metroData = metro;
    marker._mode = mode;
    return marker;
  }

  function createLegend(legendEl) {
    if (!legendEl) return null;
    legendEl.innerHTML = LEGEND_HTML;
    return legendEl;
  }

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

  function fitMap(map, markers, options = {}) {
    if (!map || !markers || !markers.length) return;

    map.invalidateSize();

    const latLngs = markers
      .map((marker) => marker.getLatLng())
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map((point) => L.latLng(point.lat, normalizeLng(point.lng)));

    if (!latLngs.length) return;

    const bounds = L.latLngBounds(latLngs);
    const spanLng = bounds.getEast() - bounds.getWest();
    const spanLat = bounds.getNorth() - bounds.getSouth();

    // Global fleet — fit single world to container
    if (spanLng > 80 || spanLat > 50) {
      fitWorldToContainer(map, options);
      return;
    }

    map._fleetUseWorldFit = false;
    map.fitBounds(bounds.pad(FIT_BOUNDS_PADDING), {
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      animate: false,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Location Explorer — right-side metro drawer                         */
  /* ------------------------------------------------------------------ */

  function getDrawerEls() {
    return {
      drawer: document.getElementById('metro-drawer'),
      backdrop: document.getElementById('metro-drawer-backdrop'),
      closeBtn: document.getElementById('metro-drawer-close'),
      nameEl: document.getElementById('drawer-metro-name'),
      countryEl: document.getElementById('drawer-metro-country'),
      listEl: document.getElementById('metro-drawer-list'),
      countEl: document.getElementById('drawer-list-count'),
      searchEl: document.getElementById('drawer-scanner-search'),
      kpiRoot: document.getElementById('metro-drawer-kpis'),
    };
  }

  function openMetroDrawer() {
    const { drawer, backdrop } = getDrawerEls();
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('is-open');
    }
    document.body.classList.add('metro-drawer-open');
  }

  function closeMetroDrawer() {
    const { drawer, backdrop, searchEl } = getDrawerEls();
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('is-open');
    }
    document.body.classList.remove('metro-drawer-open');
    if (searchEl) searchEl.value = '';
  }

  function setDrawerKpis(scanners) {
    const { kpiRoot } = getDrawerEls();
    if (!kpiRoot) return;

    const total = scanners.length;
    const online = scanners.filter((s) => s.status !== 'Offline').length;
    const offline = total - online;
    const availability = total ? Math.round((online / total) * 1000) / 10 : 0;

    const setStat = (key, value) => {
      const el = kpiRoot.querySelector(`[data-drawer-stat="${key}"]`);
      if (el) el.textContent = value;
    };

    setStat('scanners', total.toLocaleString('en-US'));
    setStat('online', online.toLocaleString('en-US'));
    setStat('offline', offline.toLocaleString('en-US'));
    setStat('availability', `${availability}%`);
  }

  function renderScannerList(scanners, filter = '') {
    const { listEl, countEl } = getDrawerEls();
    if (!listEl) return;

    const q = filter.trim().toLowerCase();
    const filtered = !q
      ? scanners
      : scanners.filter((s) => {
          const hay = `${s.serial} ${s.store} ${s.version} ${s.status} ${s.deviceModel} ${s.brand}`.toLowerCase();
          return hay.includes(q);
        });

    if (countEl) countEl.textContent = filtered.length.toLocaleString('en-US');

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="metro-drawer-empty">
          <i class="fa-solid fa-inbox" aria-hidden="true"></i>
          <p>No scanners match the current filters for this metro.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (s) => `
      <article class="metro-drawer-row" role="listitem">
        <span class="drawer-serial" title="${escapeHtml(s.serial)}">${escapeHtml(s.serial)}</span>
        <span class="drawer-store" title="${escapeHtml(s.store)}">${escapeHtml(s.store)}</span>
        <span class="drawer-version">${escapeHtml(s.version)}</span>
        <span class="drawer-status">
          <span class="status-badge ${statusBadgeClass(s.status)}">${escapeHtml(s.status)}</span>
        </span>
      </article>
    `
      )
      .join('');
  }

  async function initOverviewMap() {
    const canvas = document.getElementById('fleet-map-canvas');
    if (!canvas) return null;

    showLoading(canvas);

    try {
      const fleetData = await loadFleetData();
      const metros = applyQuickCoords(fleetData.metros);
      fleetData.metros = metros;

      createDashboardCards(metros, 'map-dashboard-cards');
      createLegend(document.getElementById('fleet-map-legend'));

      const map = initializeMap('fleet-map-canvas', { initialZoom: DEFAULT_MAP_ZOOM });
      if (!map) return null;

      const markerByKey = new Map();
      const markers = metros.map((metro) => {
        const marker = createBubble(map, metro, 'overview');
        markerByKey.set(metro.metroKey, marker);
        return marker;
      });
      fitMap(map, markers, { mode: 'overview' });
      scheduleMapFit(map, markers, { mode: 'overview' });

      refineMetroCoordsInBackground(metros, (metro) => {
        const marker = markerByKey.get(metro.metroKey);
        if (!marker) return;
        marker.setLatLng([metro.lat, metro.lng]);
        marker._metroData = metro;
      });

      const footer = document.querySelector('.model-footer');
      if (footer) {
        const countries = new Set(metros.map((m) => m.country));
        footer.innerHTML = `
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
          Deployed across <strong>${countries.size}</strong> countries · <strong>${metros.length}</strong> metros
        `;
      }

      return { map, markers, metros, fleetData };
    } catch (err) {
      console.error(err);
      showError(
        canvas,
        'Unable to load <code>data/stores.csv</code>. Open this project with Live Server and confirm the file exists.'
      );
      return null;
    }
  }

  async function initLocationExplorer() {
    const canvas = document.getElementById('explorer-map');
    if (!canvas) return null;

    const searchEl = document.getElementById('metro-search');
    const drawerEls = getDrawerEls();

    showLoading(canvas);

    try {
      const fleetData = await loadFleetData();
      const metros = applyQuickCoords(fleetData.metros);
      fleetData.metros = metros;

      createDashboardCards(metros, 'map-dashboard-cards');
      createLegend(document.getElementById('explorer-legend'));

      const map = initializeMap('explorer-map', { initialZoom: DEFAULT_MAP_ZOOM });
      if (!map) return null;

      let activeMetro = null;
      let activeScanners = [];

      function selectMetro(metro, { zoom = true } = {}) {
        activeMetro = metro;
        activeScanners = fleetData.scannersByMetro.get(metro.metroKey) || [];

        if (drawerEls.nameEl) drawerEls.nameEl.textContent = metro.metro;
        if (drawerEls.countryEl) {
          drawerEls.countryEl.textContent = `${metro.country} · ${activeScanners.length.toLocaleString('en-US')} scanners listed`;
        }

        setDrawerKpis(activeScanners);
        if (drawerEls.searchEl) drawerEls.searchEl.value = '';
        renderScannerList(activeScanners);
        openMetroDrawer();
        setTimeout(() => map.invalidateSize(), 240);

        if (zoom) {
          map.setView([metro.lat, metro.lng], Math.max(map.getZoom(), 6), { animate: true });
        }

        const viewCount = document.getElementById('scanners-in-view');
        if (viewCount) {
          viewCount.textContent = activeScanners.length.toLocaleString('en-US');
        }
      }

      const markerByKey = new Map();
      const markers = metros.map((metro) => {
        const marker = createBubble(map, metro, 'explorer');
        marker.on('click', () => selectMetro(marker._metroData, { zoom: true }));
        markerByKey.set(metro.metroKey, marker);
        return marker;
      });

      fitMap(map, markers, { mode: 'explorer' });
      scheduleMapFit(map, markers, { mode: 'explorer' });

      refineMetroCoordsInBackground(metros, (metro) => {
        const marker = markerByKey.get(metro.metroKey);
        if (!marker) return;
        marker.setLatLng([metro.lat, metro.lng]);
        marker._metroData = metro;
        if (activeMetro && activeMetro.metroKey === metro.metroKey) {
          activeMetro = metro;
        }
      });

      function focusSearchResults(query) {
        const q = query.trim().toLowerCase();
        const viewCount = document.getElementById('scanners-in-view');

        if (!q) {
          markers.forEach((marker) => {
            marker.setStyle({ opacity: 0.95, fillOpacity: 0.55 });
          });
          if (viewCount) {
            const total = metros.reduce((sum, m) => sum + m.scanners, 0);
            viewCount.textContent = total.toLocaleString('en-US');
          }
          fitMap(map, markers, { mode: 'explorer' });
          return;
        }

        const filtered = metros.filter(
          (m) =>
            m.metro.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q) ||
            m.state.toLowerCase().includes(q) ||
            m.country.toLowerCase().includes(q)
        );

        const total = filtered.reduce((sum, m) => sum + m.scanners, 0);
        if (viewCount) viewCount.textContent = total.toLocaleString('en-US');

        const filteredKeys = new Set(filtered.map((m) => m.metroKey));
        markers.forEach((marker) => {
          const isMatch = filteredKeys.has(marker._metroData.metroKey);
          marker.setStyle({
            opacity: isMatch ? 0.95 : 0.2,
            fillOpacity: isMatch ? 0.65 : 0.12,
          });
        });

        if (!filtered.length) return;

        const exactMatches = filtered.filter(
          (m) =>
            m.city.toLowerCase() === q ||
            m.metro.toLowerCase() === q ||
            m.metro.toLowerCase().startsWith(`${q},`)
        );

        const target =
          exactMatches.length === 1
            ? exactMatches[0]
            : filtered.length === 1
              ? filtered[0]
              : null;

        if (target && Number.isFinite(target.lat) && Number.isFinite(target.lng)) {
          map.setView([target.lat, target.lng], Math.max(map.getZoom(), 6), { animate: true });
          return;
        }

        const matchMarkers = markers.filter((marker) =>
          filteredKeys.has(marker._metroData.metroKey)
        );
        if (matchMarkers.length) {
          const group = L.featureGroup(matchMarkers);
          map.fitBounds(group.getBounds().pad(0.2), {
            maxZoom: filtered.length <= 5 ? 7 : 5,
            animate: true,
          });
        }
      }

      if (searchEl) {
        let searchTimer = null;
        const runSearch = () => focusSearchResults(searchEl.value);

        searchEl.addEventListener('input', () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(runSearch, 220);
        });

        searchEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimer);
            runSearch();

            const q = searchEl.value.trim().toLowerCase();
            if (!q) return;

            const exact = metros.find(
              (m) =>
                m.city.toLowerCase() === q ||
                m.metro.toLowerCase() === q ||
                m.metro.toLowerCase().startsWith(`${q},`)
            );
            const only = metros.filter(
              (m) =>
                m.metro.toLowerCase().includes(q) ||
                m.city.toLowerCase().includes(q) ||
                m.state.toLowerCase().includes(q) ||
                m.country.toLowerCase().includes(q)
            );
            const target = exact || (only.length === 1 ? only[0] : null);
            if (target) selectMetro(target, { zoom: true });
          }
        });
      }

      if (drawerEls.searchEl) {
        drawerEls.searchEl.addEventListener('input', () => {
          renderScannerList(activeScanners, drawerEls.searchEl.value);
        });
      }

      if (drawerEls.closeBtn) {
        drawerEls.closeBtn.addEventListener('click', () => {
          closeMetroDrawer();
          setTimeout(() => map.invalidateSize(), 240);
        });
      }
      if (drawerEls.backdrop) {
        drawerEls.backdrop.addEventListener('click', () => {
          closeMetroDrawer();
          setTimeout(() => map.invalidateSize(), 240);
        });
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeMetroDrawer();
          setTimeout(() => map.invalidateSize(), 240);
        }
      });

      const focus = new URLSearchParams(global.location.search).get('metro');
      if (focus) {
        const needle = focus.toLowerCase();
        const match = metros.find(
          (m) =>
            m.metro.toLowerCase() === needle ||
            m.city.toLowerCase() === needle ||
            m.metroKey === needle
        );
        if (match) selectMetro(match, { zoom: true });
      }

      return { map, markers, metros, fleetData, selectMetro, closeMetroDrawer };
    } catch (err) {
      console.error(err);
      showError(
        canvas,
        'Unable to load location data. Open this project with Live Server and confirm <code>data/stores.csv</code> exists.'
      );
      return null;
    }
  }

  global.AetrexMap = {
    initializeMap,
    loadCSV,
    loadFleetData,
    createBubble,
    createLegend,
    createDashboardCards,
    fitMap,
    initOverviewMap,
    initLocationExplorer,
    openMetroDrawer,
    closeMetroDrawer,
  };
})(window);
