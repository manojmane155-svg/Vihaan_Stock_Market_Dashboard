// Inspect Router: Supports direct Angel One launch or modal inspector
function handleInspectStock(symbol, universe = 'nifty50', source = 'radar') {
  const mode = localStorage.getItem('manoj_inspect_mode') || 'modal';
  if (mode === 'angelone') {
    window.open('https://www.angelone.in/trade/tradeone/chart', '_blank');
  } else {
    openStockModal(symbol, universe, source);
  }
}

function setInspectMode(mode) {
  localStorage.setItem('manoj_inspect_mode', mode);
  const chk = document.getElementById('chk-angel-direct');
  if (chk) chk.checked = (mode === 'angelone');
}

// Vihaan Stock Market Dashboard - Indian Stock Market Live Streaming & Analytics Engine
// Author: Manoj Mane & Antigravity Pair Programmer

// Detect API Base URL (supports both http://localhost:8080 and direct file:/// opening)
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:8080' : '';

// 12-Hour Timestamp Formatter with AM/PM
function format12HrTime(dateOrStr) {
  if (!dateOrStr) return '';
  if (typeof dateOrStr === 'string' && (dateOrStr.includes('AM') || dateOrStr.includes('PM'))) {
    return dateOrStr;
  }
  const d = new Date(dateOrStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }
  if (typeof dateOrStr === 'string' && dateOrStr.includes(':')) {
    const parts = dateOrStr.trim().split(' ');
    const timePart = parts[1] || parts[0];
    const datePart = parts.length > 1 ? parts[0] + ' ' : '';
    const [hh, mm, ss] = timePart.split(':');
    let h = parseInt(hh, 10);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${datePart}${h < 10 ? '0' : ''}${h}:${mm || '00'}:${ss ? ss.slice(0, 2) : '00'} ${ampm}`;
    }
  }
  return dateOrStr;
}

// Chart.js Candlestick Wick Plugin (Draws high/low wick lines through candlestick bodies)
const CandlestickWicksPlugin = {
  id: 'candlestickWicks',
  beforeDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const yScale = chart.scales.y;
    if (!yScale) return;

    chart.data.datasets.forEach((dataset, dIdx) => {
      if (!dataset.isCandle) return;
      const meta = chart.getDatasetMeta(dIdx);
      if (!meta || meta.hidden) return;

      const highs = dataset.highs || [];
      const lows = dataset.lows || [];
      const wickColors = dataset.wickColors || [];

      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      meta.data.forEach((bar, i) => {
        const high = highs[i];
        const low = lows[i];
        if (high === undefined || low === undefined) return;
        const x = bar.x;
        const yHigh = yScale.getPixelForValue(high);
        const yLow = yScale.getPixelForValue(low);

        ctx.beginPath();
        ctx.strokeStyle = wickColors[i] || '#94a3b8';
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();
      });
      ctx.restore();
    });
  }
};

// Register custom plugin if Chart is available
if (typeof Chart !== 'undefined' && Chart.register) {
  Chart.register(CandlestickWicksPlugin);
}

// Client-side SuperTrend (10, 3.0) Calculation Engine
function computeSuperTrendJS(candles, period = 10, multiplier = 3.0) {
  if (!candles || candles.length === 0) {
    return { values: [], trends: [], current_trend: 'NEUTRAL', current_value: null };
  }
  const n = candles.length;
  if (n < 2) {
    return {
      values: candles.map(c => c.close),
      trends: candles.map(() => 1),
      current_trend: 'BULLISH',
      current_value: candles[candles.length - 1]?.close || null
    };
  }

  // 1. True Range
  const trs = [];
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    if (i === 0) {
      trs.push(c.high - c.low);
    } else {
      const prevC = candles[i - 1].close;
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevC), Math.abs(c.low - prevC)));
    }
  }

  // 2. ATR
  const effectiveP = Math.min(period, n);
  const atrs = [];
  let atr = trs.slice(0, effectiveP).reduce((a, b) => a + b, 0) / effectiveP;
  for (let i = 0; i < n; i++) {
    if (i < effectiveP - 1) {
      atrs.push(null);
    } else if (i === effectiveP - 1) {
      atrs.push(atr);
    } else {
      atr = (atrs[i - 1] * (effectiveP - 1) + trs[i]) / effectiveP;
      atrs.push(atr);
    }
  }

  // 3. SuperTrend Bands & Direction
  const stValues = [];
  const stTrends = [];
  let trend = 1;
  let prevUpper = 0.0;
  let prevLower = 0.0;

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const hl2 = (c.high + c.low) / 2.0;
    const curAtr = atrs[i] !== null ? atrs[i] : trs[i];
    const basicUpper = +(hl2 + multiplier * curAtr).toFixed(2);
    const basicLower = +(hl2 - multiplier * curAtr).toFixed(2);

    let finalUpper, finalLower;
    if (i < effectiveP) {
      finalUpper = basicUpper;
      finalLower = basicLower;
      trend = c.close >= hl2 ? 1 : -1;
    } else {
      const prevC = candles[i - 1].close;
      finalUpper = (basicUpper < prevUpper || prevC > prevUpper) ? basicUpper : prevUpper;
      finalLower = (basicLower > prevLower || prevC < prevLower) ? basicLower : prevLower;

      if (trend === 1) {
        if (c.close < finalLower) trend = -1;
      } else {
        if (c.close > finalUpper) trend = 1;
      }
    }

    const stVal = trend === 1 ? finalLower : finalUpper;
    stValues.push(+stVal.toFixed(2));
    stTrends.push(trend);
    prevUpper = finalUpper;
    prevLower = finalLower;
  }

  const lastTrend = stTrends[stTrends.length - 1] === 1 ? 'BULLISH' : 'BEARISH';
  return {
    values: stValues,
    trends: stTrends,
    current_trend: lastTrend,
    current_value: stValues[stValues.length - 1] || null
  };
}

// Application State
const state = {
  currentTab: 'breakout_buys', // Open on the high-probability buy screen
  moversFilter: 'all', // 'all' | 'nifty50' | 'banknifty' | 'sensex' | 'niftyit'
  searchQuery: '',
  filterSignal: 'all',
  top500SearchQuery: '',
  top500Filter: 'all',
  breakoutSort: 'tightness',
  etfSearchQuery: '',
  etfFilter: 'all',
  etfStrategy: 'rsi',
  selectedStock50: 'HDFCBANK',
  selectedStockNext50: 'SHREECEM',
  stockChartMode: 'candle', // 'candle' (Google Finance Candlestick) | 'line'
  stockTimeframe: '1D',
  indexChartMode: 'area', // 'area' | 'candle'
  selectedIndex: 'NIFTY 50',
  indexTimeframe: '1D',
  currentStockModalSymbol: null,
  currentStockModalUniverse: 'nifty50',
  currentStockModalSource: null,
  currentStockModalHistory: [],
  currentStockChartData: null,
  lastUpdated: null,
  autoRefreshIntervalMin: 5, // Default: Every 5 minutes
  countdownSeconds: 300,
  countdownIntervalId: null,
  isRefreshing: false,
  compounding: {
    capital: 5000,
    targetPct: 3.5,
    trades: 50
  },
  charts: {
    stockChart: null,
    modalChart: null,
    modalSubChart: null,
    indexChart: null,
    marketChart: null,
    calcChart: null
  }
};

// Live Digital Watch (Clock widget from user screenshot)
function initDigitalWatch() {
  const timeEl = document.getElementById('digital-clock-time');
  const ampmEl = document.getElementById('digital-clock-ampm');
  const dateEl = document.getElementById('digital-clock-date');

  function tick() {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hStr = hours < 10 ? '0' + hours : '' + hours;
    const minutes = now.getMinutes();
    const mStr = minutes < 10 ? '0' + minutes : '' + minutes;
    const seconds = now.getSeconds();
    const sStr = seconds < 10 ? '0' + seconds : '' + seconds;

    if (timeEl) timeEl.innerText = `${hStr}:${mStr}:${sStr}`;
    if (ampmEl) ampmEl.innerText = ampm;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dNum = now.getDate();
    const dPad = dNum < 10 ? '0' + dNum : '' + dNum;
    const year = now.getFullYear();

    if (dateEl) dateEl.innerText = `${dayName}, ${monthName} ${dPad}, ${year}`;
  }

  tick();
  setInterval(tick, 1000);
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initDigitalWatch();
  initTabs();
  renderAllViews();
  initCalculationDropdowns();
  renderCalculationView('nifty50');
  renderMarketDatesView();
  initCompoundingCalculator();
  initDragAndDrop();
  initSearchAndFilters();
  initCountdownTimer();

  // Immediately pull fresh live stream data from backend API
  await fetchLiveStocksData(false);
});

// Render all primary tables, indices, and KPIs
function renderAllViews() {
  renderIndicesBar();
  renderMarketMovers();
  renderMoversTable();
  renderEtfShopView();
  renderBreakoutBuysTable();
  renderTop500Table();
  renderKPIs();
  renderNifty50Table();
  renderNext50Table();
  updateStatusDisplay();
}

// Update Header Status & Timestamp Display (12-Hour AM/PM Format)
function updateStatusDisplay() {
  const timeEl = document.getElementById('header-last-updated');
  const statusEl = document.getElementById('upload-status');
  const countdownEl = document.getElementById('refresh-countdown');

  const timestamp = state.lastUpdated || (window.NIFTY_50_DATA && NIFTY_50_DATA[0]?.last_updated);
  
  if (timeEl) {
    if (timestamp) {
      timeEl.innerText = `Updated: ${format12HrTime(timestamp)}`;
      timeEl.title = `Last Live Sync: ${timestamp}`;
    } else {
      timeEl.innerText = `Live Connected`;
    }
  }

  // Format countdown mm:ss
  if (countdownEl) {
    if (state.autoRefreshIntervalMin > 0) {
      const m = Math.floor(state.countdownSeconds / 60);
      const s = state.countdownSeconds % 60;
      countdownEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    } else {
      countdownEl.innerText = 'Off';
    }
  }

  if (statusEl && timestamp) {
    statusEl.innerHTML = `<span class="text-emerald-400 font-semibold">⚡ Live NSE Stream Active &bull; Synced at ${format12HrTime(timestamp)}</span>`;
  }
}

// 1. Fetch Live Stock Data from Server API
async function fetchLiveStocksData(isManual = false) {
  try {
    const res = await fetch(`${API_BASE}/api/stocks?_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.nifty50 && data.nifty50.length > 0) {
      window.NIFTY_50_DATA = data.nifty50;
      window.NIFTY_NEXT_50_DATA = data.next50;
      window.CALC_NIFTY_50 = data.calc_nifty50;
      window.CALC_NIFTY_NEXT_50 = data.calc_next50;
      if (data.indices && data.indices.length > 0) window.INDICES_DATA = data.indices;
      if (data.etfs && data.etfs.length > 0) window.ETF_DATA = data.etfs;
      if (data.breakout_buys && data.breakout_buys.length > 0) window.BREAKOUT_BUYS_DATA = data.breakout_buys;
      if (data.top500 && data.top500.length > 0) window.TOP_500_STOCKS_DATA = data.top500;
      if (data.extra_constituents && data.extra_constituents.length > 0) window.EXTRA_CONSTITUENTS_DATA = data.extra_constituents;
      state.lastUpdated = data.timestamp;

      renderAllViews();
      initCalculationDropdowns();
      if (state.currentTab === 'nifty50_calc' || state.currentTab === 'next50_calc') {
        renderCalculationView(state.currentTab === 'nifty50_calc' ? 'nifty50' : 'next50');
      }

      console.log(`Live data loaded successfully: ${data.timestamp}`);
      return true;
    }
  } catch (err) {
    console.log('API fallback to pre-bundled data.js:', err.message);
    updateStatusDisplay();
    return false;
  }
}

// 2. Trigger Live Market Refresh (Calls /api/refresh)
async function triggerLiveRefresh() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;

  const btn = document.getElementById('btn-refresh-live');
  const spinner = document.getElementById('refresh-spinner');
  const btnText = document.getElementById('refresh-button-text');
  const statusEl = document.getElementById('upload-status');

  if (spinner) spinner.classList.add('spinning');
  if (btnText) btnText.innerText = 'Streaming NSE...';
  if (statusEl) statusEl.innerHTML = '<span class="text-cyan-400 font-semibold">🔄 Pulling live quotes directly from National Stock Exchange...</span>';

  try {
    const res = await fetch(`${API_BASE}/api/refresh?_t=${Date.now()}`, {
      method: 'POST',
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();

    if (result.status === 'success') {
      await fetchLiveStocksData(true);
      state.countdownSeconds = state.autoRefreshIntervalMin * 60;
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Live Market Stream Synced (${result.timestamp}) in ${result.elapsed_seconds}s!</span>`;
      }
    } else {
      throw new Error(result.message || 'Refresh error');
    }
  } catch (err) {
    console.warn('Live API error:', err);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-amber-400 font-semibold">⚠ Notice: Ensure python start_app.py is running to enable live streaming.</span>`;
    }
  } finally {
    state.isRefreshing = false;
    if (spinner) spinner.classList.remove('spinning');
    if (btnText) btnText.innerText = 'Refresh Live Data';
    updateStatusDisplay();
  }
}

// 3. Auto-Refresh 5-Minute Countdown Scheduler
function initCountdownTimer() {
  const select = document.getElementById('auto-refresh-select');
  if (select) {
    select.value = "5"; // Default 5 minutes
    select.addEventListener('change', () => {
      const mins = parseInt(select.value, 10);
      state.autoRefreshIntervalMin = mins;
      state.countdownSeconds = mins * 60;
      updateStatusDisplay();
    });
  }

  // 1-second countdown ticker
  if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
  state.countdownIntervalId = setInterval(() => {
    if (state.autoRefreshIntervalMin <= 0) return;

    state.countdownSeconds -= 1;
    if (state.countdownSeconds <= 0) {
      console.log('[Auto-Refresh Ticker] 5-minute timer expired. Triggering live refresh...');
      state.countdownSeconds = state.autoRefreshIntervalMin * 60;
      triggerLiveRefresh();
    } else {
      updateStatusDisplay();
    }
  }, 1000);
}

// Tab Switching
function initTabs() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
  // Ensure the default tab is activated cleanly on startup
  switchTab(state.currentTab || 'breakout_buys');
}

function switchTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(b => {
    if (b.getAttribute('data-tab') === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.add('hidden');
  });

  const activeContent = document.getElementById(`tab-content-${tabId}`);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }

  if (tabId === 'nifty50_calc' || tabId === 'next50_calc') {
    renderCalculationView(tabId === 'nifty50_calc' ? 'nifty50' : 'next50');
  } else if (tabId === 'market_dates') {
    renderMarketDatesChart();
  } else if (tabId === 'breakout_buys') {
    renderBreakoutBuysTable();
  } else if (tabId === 'top500') {
    renderTop500Table();
  } else if (tabId === 'etf_shop') {
    renderEtfShopView();
  } else if (tabId === 'market_movers') {
    renderMoversTable();
  }
}

// Global KPIs Calculation
function renderKPIs() {
  const allStocks = [...(window.NIFTY_50_DATA || []), ...(window.NIFTY_NEXT_50_DATA || [])];
  const totalStocks = allStocks.length;

  const buyStocks = allStocks.filter(s => s.status === 'Start Buying As Par Rules' || (s.rsi !== null && s.rsi > 0 && s.rsi <= 35));
  const waitStocks = allStocks.filter(s => s.status === 'WAIT' || (s.rsi !== null && s.rsi > 35));
  const extremeOversold = allStocks.filter(s => s.rsi !== null && s.rsi > 0 && s.rsi <= 30);

  const validRsiList = allStocks.filter(s => s.rsi !== null && s.rsi > 0).map(s => s.rsi);
  const avgRsi = validRsiList.length > 0 
    ? (validRsiList.reduce((a, b) => a + b, 0) / validRsiList.length).toFixed(1)
    : '--';

  document.getElementById('kpi-total-stocks').innerText = totalStocks;
  document.getElementById('kpi-buy-signals').innerText = buyStocks.length;
  document.getElementById('kpi-wait-signals').innerText = waitStocks.length;
  document.getElementById('kpi-extreme-oversold').innerText = extremeOversold.length;
  document.getElementById('kpi-avg-rsi').innerText = avgRsi;

  // Render top buy spotlight cards
  const spotlightContainer = document.getElementById('buy-spotlight-container');
  if (spotlightContainer) {
    if (buyStocks.length === 0) {
      spotlightContainer.innerHTML = `<div class="text-sm text-slate-400 py-3 col-span-5 text-center">No stocks currently below RSI 35. Market in holding/neutral zone.</div>`;
    } else {
      // Sort buy stocks by lowest RSI first (deepest value opportunity)
      const sortedBuys = [...buyStocks].sort((a, b) => (a.rsi || 99) - (b.rsi || 99));

      spotlightContainer.innerHTML = sortedBuys.map(stock => {
        const isNext50 = (window.NIFTY_NEXT_50_DATA || []).some(s => s.symbol === stock.symbol);
        const universe = isNext50 ? 'Next 50' : 'Nifty 50';
        const discountText = stock.discount_from_high ? `${stock.discount_from_high}% off 52W High` : '';

        const profile = getStockFuturisticProfile(stock.symbol, isNext50 ? 'next50' : 'nifty50', 'radar', stock);
        const indexLabel = profile.indexTag || (isNext50 ? 'NIFTY NEXT 50' : 'NIFTY 50');
        const shortIndexTag = isNext50 ? 'NEXT 50' : 'NIFTY 50';

        return `
          <div onclick="handleInspectStock('${stock.symbol}', '${isNext50 ? 'next50' : 'nifty50'}', 'radar')" class="cursor-pointer group p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-slate-900/90 via-[#0a1122] to-slate-950 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform hover:-translate-y-0.5 relative select-none flex flex-col justify-between">
            <!-- Compact Top Row: 36px Glowing Avatar + Symbol + Index Tag -->
            <div class="flex items-center justify-between gap-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-full border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] ring-1 ring-cyan-500/30 flex items-center justify-center bg-gradient-to-br ${profile.bg} shrink-0 group-hover:scale-105 transition-transform">
                  <span class="text-xs leading-none">${profile.emoji}</span>
                </div>
                <div class="min-w-0">
                  <span class="font-black text-white text-xs sm:text-sm tracking-tight truncate block group-hover:text-cyan-300 transition-colors">${stock.symbol}</span>
                </div>
              </div>
              <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 font-mono tracking-tight shrink-0">${shortIndexTag}</span>
            </div>

            <!-- Compact Inline Price & 52W Discount -->
            <div class="my-1.5 flex items-baseline justify-between gap-2 border-y border-slate-800/60 py-1">
              <span class="text-xs sm:text-sm font-black text-white font-mono">${stock.price ? '₹' + stock.price.toLocaleString('en-IN') : '--'}</span>
              ${discountText ? `<span class="text-[10px] text-cyan-400 font-bold font-mono truncate">${stock.discount_from_high}% off 52W</span>` : ''}
            </div>

            <!-- Compact Bottom Row: RSI + Inspect (with Angel One routing) -->
            <div class="flex items-center justify-between gap-1">
              <span class="inline-flex items-center gap-1 font-black text-emerald-400 text-[11px] font-mono">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator"></span>
                RSI ${stock.rsi !== null ? stock.rsi : '--'}
              </span>
              <button onclick="event.stopPropagation(); handleInspectStock('${stock.symbol}', '${isNext50 ? 'next50' : 'nifty50'}', 'radar')" class="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 transition-all shadow-sm flex items-center gap-1">
                <span>INSPECT</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Helpers for RSI Badges and Colors
function getRsiColor(rsi) {
  if (rsi === null || rsi === undefined) return '#6b7280';
  if (rsi <= 30) return '#ef4444'; // Extreme Oversold / Deep Value
  if (rsi <= 35) return '#10b981'; // Buy Trigger
  if (rsi <= 55) return '#06b6d4'; // Recovery / Neutral
  if (rsi <= 70) return '#3b82f6'; // Bullish
  return '#a855f7'; // Overbought
}

function getRsiBadge(rsi, status) {
  if (status === 'Start Buying As Par Rules' || (rsi !== null && rsi > 0 && rsi <= 35)) {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold badge-buy">
      <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span>
      Start Buying
    </span>`;
  }
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium badge-wait">
    WAIT
  </span>`;
}

// Expiry Day and Date Calculator for Indian Derivatives Indices
function getIndexExpiryInfo(name, dayName) {
  // Static mapping aligned with the current upcoming derivatives cycle:
  // Wednesday: 05 Nov (Wed) - BANK NIFTY
  // Thursday:  06 Nov (Thu) - NIFTY 50, GIFT NIFTY, NIFTY IT
  // Friday:    07 Nov (Fri) - SENSEX
  const cycleMap = {
    'Wednesday': { dateStr: '05 Nov', shortDay: 'Wed', displayStr: '05 Nov (Wed)' },
    'Thursday':  { dateStr: '06 Nov', shortDay: 'Thu', displayStr: '06 Nov (Thu)' },
    'Friday':    { dateStr: '07 Nov', shortDay: 'Fri', displayStr: '07 Nov (Fri)' }
  };

  if (dayName && cycleMap[dayName]) {
    return {
      dayName: cycleMap[dayName].shortDay,
      shortDay: cycleMap[dayName].shortDay,
      dateStr: cycleMap[dayName].dateStr,
      displayStr: cycleMap[dayName].displayStr
    };
  }

  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const targetDay = dayMap[dayName];
  if (targetDay === undefined) {
    return { dayName: dayName || '--', shortDay: '--', dateStr: '--', displayStr: '--' };
  }

  const now = new Date();
  const curDay = now.getDay();
  let daysAhead = (targetDay - curDay + 7) % 7;

  // If today is expiry day and after 3:30 PM (15:30), roll to next week
  const curHour = now.getHours();
  const curMin = now.getMinutes();
  if (daysAhead === 0 && (curHour > 15 || (curHour === 15 && curMin >= 30))) {
    daysAhead = 7;
  }

  const expDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dNum = expDate.getDate();
  const dPad = dNum < 10 ? '0' + dNum : '' + dNum;
  const mName = monthNames[expDate.getMonth()];
  const sDay = dayNames[expDate.getDay()];

  return {
    dayName: sDay,
    shortDay: sDay,
    dateStr: `${dPad} ${mName}`,
    displayStr: `${dPad} ${mName} (${sDay})`
  };
}

// Watchlist Storage and State
function getWatchlistSymbols() {
  try {
    const raw = localStorage.getItem('manoj_market_watchlist');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return ['PETRONET', 'ORIENTELEC', 'CIPLA', 'LT', 'HEROMOTOCO', 'SBICARD'];
}

function saveWatchlistSymbols(list) {
  try {
    localStorage.setItem('manoj_market_watchlist', JSON.stringify(list));
  } catch (e) {}
  updateWatchlistCountBadge();
}

function updateWatchlistCountBadge() {
  const badge = document.getElementById('watchlist-count-badge');
  const list = getWatchlistSymbols();
  if (badge) badge.innerText = list.length;
}

function toggleWatchlist(sym) {
  if (!sym) return;
  const clean = sym.trim().toUpperCase();
  let list = getWatchlistSymbols();
  if (list.includes(clean)) {
    list = list.filter(s => s !== clean);
  } else {
    list.push(clean);
  }
  saveWatchlistSymbols(list);
  if (state.marketView === 'watchlist') {
    renderWatchlistBar();
  }
  syncModalWatchlistButton(clean);
}

function removeFromWatchlist(sym) {
  if (!sym) return;
  const clean = sym.trim().toUpperCase();
  let list = getWatchlistSymbols();
  list = list.filter(s => s !== clean);
  saveWatchlistSymbols(list);
  if (state.marketView === 'watchlist') {
    renderWatchlistBar();
  }
  syncModalWatchlistButton(clean);
}

function promptAddToWatchlist() {
  const sym = prompt("Enter Stock Symbol to add to Watchlist (e.g. RELIANCE, TATASTEEL, INFY):");
  if (sym && sym.trim()) {
    toggleWatchlist(sym.trim().toUpperCase());
  }
}

function syncModalWatchlistButton(symbol) {
  const btnText = document.getElementById('modal-watchlist-text');
  const btn = document.getElementById('modal-watchlist-btn');
  const icon = document.getElementById('modal-watchlist-icon');
  if (!btn || !symbol) return;
  const list = getWatchlistSymbols();
  const inList = list.includes(symbol.toUpperCase());
  if (inList) {
    btn.className = 'w-7 h-7 rounded-lg bg-amber-500 text-slate-950 border border-amber-400 flex items-center justify-center text-xs transition-transform hover:scale-110 shadow';
    if (btnText) btnText.innerText = 'In Watchlist ★';
    if (icon) icon.innerText = '★';
    btn.title = 'Remove from Watchlist';
  } else {
    btn.className = 'w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 flex items-center justify-center text-xs transition-transform hover:scale-110 shadow';
    if (btnText) btnText.innerText = 'Watchlist ⭐';
    if (icon) icon.innerText = '⭐';
    btn.title = 'Add to Watchlist';
  }
}

function toggleCurrentModalWatchlist() {
  if (state.currentStockModalSymbol) {
    toggleWatchlist(state.currentStockModalSymbol);
  }
}

// Market View Switcher (Major Indices vs Watchlist)
function setMarketView(view) {
  state.marketView = view;
  const btnIndices = document.getElementById('btn-view-indices');
  const btnWatchlist = document.getElementById('btn-view-watchlist');

  if (view === 'indices') {
    if (btnIndices) btnIndices.className = 'px-2.5 py-1 rounded-md bg-white text-slate-900 font-bold text-[11px] shadow transition-all';
    if (btnWatchlist) btnWatchlist.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white text-[11px] transition-all flex items-center gap-1.5';
    renderIndicesBar();
  } else {
    if (btnWatchlist) btnWatchlist.className = 'px-2.5 py-1 rounded-md bg-cyan-600 text-white font-bold text-[11px] shadow transition-all flex items-center gap-1.5';
    if (btnIndices) btnIndices.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white text-[11px] transition-all';
    renderWatchlistBar();
  }
}

// Render Watchlist Live Cards Grid
function renderWatchlistBar() {
  const container = document.getElementById('indices-cards-container');
  if (!container) return;

  const watchlist = getWatchlistSymbols();
  updateWatchlistCountBadge();

  if (watchlist.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800 p-4">
        <div class="text-2xl mb-2">⭐</div>
        <p class="text-sm font-semibold text-white">Your Personal Watchlist is currently empty</p>
        <p class="text-xs text-slate-400 mt-1">Click "Inspect" on any stock or use the button below to add stocks.</p>
        <button onclick="promptAddToWatchlist()" class="mt-3 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow">
          ➕ Add Stock to Watchlist
        </button>
      </div>
    `;
    return;
  }

  // Pool all stocks data to find quote and meta
  const bList = window.BREAKOUT_BUYS_DATA || [];
  const topList = window.TOP_500_STOCKS_DATA || [];
  const n50 = window.NIFTY_50_DATA || [];
  const next50 = window.NIFTY_NEXT_50_DATA || [];
  const etfList = window.ETF_DATA || [];

  const cardsHtml = watchlist.map(sym => {
    const s = bList.find(x => x.symbol === sym)
      || n50.find(x => x.symbol === sym)
      || next50.find(x => x.symbol === sym)
      || topList.find(x => x.symbol === sym)
      || etfList.find(x => x.symbol === sym)
      || { symbol: sym, live_price: 250, change: 0, change_pct: 0, rsi: 50 };

    const price = s.live_price || s.price || s.sheet_cmp || s.cmp || 0;
    const priceStr = price ? `₹${price.toLocaleString('en-IN')}` : '₹--';
    const isPos = (s.change !== undefined && s.change !== null) ? s.change >= 0 : true;
    const chgSign = s.change > 0 ? '+' : '';
    const chgStr = (s.change !== undefined && s.change !== null) ? `${chgSign}${s.change}` : '--';
    const pctStr = (s.change_pct !== undefined && s.change_pct !== null) ? `(${chgSign}${s.change_pct}%)` : '';
    const borderClass = isPos ? 'border-l-4 border-emerald-500' : 'border-l-4 border-rose-500';
    const textPriceClass = isPos ? 'text-emerald-700' : 'text-rose-700';
    const badgeBg = isPos ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
    const rsiVal = s.rsi !== undefined && s.rsi !== null ? s.rsi : '--';
    const rsiColor = getRsiColor(s.rsi);
    const discStr = s.discount_from_high ? `${s.discount_from_high}% off 52W H` : '';

    const profile = getStockFuturisticProfile(sym, 'nifty50', 'watchlist', s);
    return `
      <div onclick="openStockModal('${sym}')" title="Click to inspect ${sym}" class="bg-gradient-to-br from-slate-900/90 via-[#0a1122] to-slate-950 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-pointer select-none group flex flex-col justify-between relative">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] flex items-center justify-center bg-gradient-to-br ${profile.bg}">
              <span class="text-xs leading-none">${profile.emoji}</span>
            </div>
            <div>
              <span class="text-xs font-black text-white tracking-tight group-hover:text-cyan-300 transition-colors">${sym}</span>
              <div class="text-[9px] font-bold text-cyan-300/80 font-mono">${s.code || 'NSE:' + sym}</div>
            </div>
          </div>
          <button onclick="event.stopPropagation(); removeFromWatchlist('${sym}')" title="Remove from Watchlist" class="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs font-bold transition-all border border-transparent hover:border-rose-500/40">
            ✕
          </button>
        </div>

        <div class="my-2 py-1.5 border-y border-slate-800/80">
          <div class="text-base font-black text-white font-mono">${priceStr}</div>
          <div class="text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'} font-mono">${chgStr} <span class="text-[10px]">${pctStr}</span></div>
        </div>

        <div class="flex items-center justify-between text-[10px]">
          <span class="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-cyan-500/30 font-semibold truncate max-w-[110px]">${profile.sector.split('•')[0].trim()}</span>
          <span class="font-bold font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800" style="color: ${rsiColor}">RSI ${rsiVal}</span>
        </div>
      </div>
    `;
  }).join('');

  const addCardHtml = `
    <div onclick="promptAddToWatchlist()" title="Add a stock to your watchlist" class="border-2 border-dashed border-slate-700/80 hover:border-cyan-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-800/40 text-slate-400 hover:text-cyan-300 min-h-[140px] group">
      <span class="text-2xl group-hover:scale-110 transition-transform">➕</span>
      <span class="text-xs font-bold text-slate-300 mt-1">Add Stock</span>
      <span class="text-[10px] text-slate-400">to Watchlist</span>
    </div>
  `;

  container.innerHTML = cardsHtml + addCardHtml;
}

// Render Live Indian Markets Indices Bar (including GIFT NIFTY, Expiry Date & Day)
function renderIndicesBar() {
  if (state.marketView === 'watchlist') {
    renderWatchlistBar();
    return;
  }

  const container = document.getElementById('indices-cards-container');
  const timeEl = document.getElementById('indices-last-updated');
  if (!container) return;

  updateWatchlistCountBadge();

  const data = window.INDICES_DATA || [];
  if (data.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-2 text-xs text-slate-400">Loading live Indian market indices...</div>`;
    return;
  }

  if (timeEl && data[0]?.last_updated) {
    timeEl.innerText = `Updated: ${format12HrTime(data[0].last_updated)}`;
  }

  container.innerHTML = data.map(idx => {
    const isPos = idx.change >= 0;
    const borderClass = isPos ? 'border-l-4 border-emerald-500' : 'border-l-4 border-rose-500';
    const textPriceClass = isPos ? 'text-emerald-700' : 'text-rose-700';
    const chgSign = idx.change > 0 ? '+' : '';
    const badgeBg = isPos ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
    const priceStr = idx.price !== null && idx.price !== undefined 
      ? idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : '--';
    const chgStr = idx.change !== null && idx.change !== undefined 
      ? `${chgSign}${idx.change.toFixed(2)}` 
      : '--';
    const pctStr = idx.change_pct !== null && idx.change_pct !== undefined 
      ? `(${chgSign}${idx.change_pct.toFixed(2)}%)` 
      : '';

    // Calculate Expiry Date and Day Name
    let expiryHtml = '';
    if (idx.expiry_day) {
      const exp = getIndexExpiryInfo(idx.name, idx.expiry_day);
      expiryHtml = `
        <div class="mt-1.5 py-0.5 px-2 bg-indigo-50/90 rounded border border-indigo-100 flex items-center justify-between text-[10px] whitespace-nowrap">
          <span class="text-slate-500 font-semibold flex items-center gap-1">
            <span>📅</span> <span>Expiry:</span>
          </span>
          <span class="font-extrabold text-indigo-700 font-mono tracking-tight">${exp.displayStr}</span>
        </div>
      `;
    } else {
      expiryHtml = `
        <div class="mt-1.5 py-0.5 px-2 bg-amber-50/90 rounded border border-amber-100 flex items-center justify-between text-[10px] whitespace-nowrap">
          <span class="text-amber-700 font-semibold flex items-center gap-1">
            <span>⚡</span> <span>Volatility:</span>
          </span>
          <span class="font-extrabold text-amber-800 font-mono tracking-tight">Market Gauge</span>
        </div>
      `;
    }

    return `
      <div onclick="openIndexModal('${idx.name}')" title="Click to view live intraday graph of ${idx.name}" class="bg-white rounded-xl p-3 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none group ${borderClass} flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-slate-900 tracking-tight group-hover:text-cyan-700 transition-colors">${idx.name}</span>
          <span class="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-wider">${idx.exchange}</span>
        </div>
        <div class="my-1.5">
          <span class="text-lg font-black tracking-tight ${textPriceClass}">${priceStr}</span>
        </div>
        <div class="flex items-center justify-between text-xs font-bold pt-0.5">
          <span class="${textPriceClass}">${chgStr}</span>
          <span class="text-[11px] font-bold px-1.5 py-0.5 rounded ${badgeBg}">${pctStr}</span>
        </div>
        ${expiryHtml}
        <div class="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-cyan-600 transition-colors">
          <span>Live Intraday</span>
          <span class="font-bold flex items-center gap-0.5">Live Graph 📊 &gt;</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// LIVE MARKET MOVERS: TOP GAINERS & LOSERS
// Benchmark Constituents: NIFTY 50, BANK NIFTY, SENSEX, NIFTY IT
// ==========================================

const INDEX_CONSTITUENTS = {
  nifty50: [
    'HDFCBANK', 'HCLTECH', 'HINDALCO', 'NTPC', 'ONGC', 'BAJAJFINSV', 'TECHM',
    'JSWSTEEL', 'TATACONSUM', 'LTIM', 'TITAN', 'WIPRO', 'DIVISLAB', 'M&M',
    'CIPLA', 'TATASTEEL', 'LT', 'TCS', 'SHRIRAMFIN', 'ICICIBANK', 'INFY',
    'TATAMOTORS', 'RELIANCE', 'BAJFINANCE', 'POWERGRID', 'AXISBANK', 'SBILIFE',
    'ASIANPAINT', 'BHARTIARTL', 'BRITANNIA', 'BAJAJ-AUTO', 'NESTLEIND', 'SBIN',
    'ULTRACEMCO', 'ITC', 'COALINDIA', 'DRREDDY', 'HINDUNILVR', 'ADANIENT',
    'SUNPHARMA', 'BPCL', 'MARUTI', 'INDUSINDBK', 'KOTAKBANK', 'HDFCLIFE',
    'EICHERMOT', 'GRASIM', 'ADANIPORTS', 'HEROMOTOCO', 'APOLLOHOSP'
  ],
  banknifty: [
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
    'BANKBARODA', 'PNB', 'AUBANK', 'FEDERALBNK', 'IDFCFIRSTB', 'BANDHANBNK'
  ],
  sensex: [
    'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'INFY', 'ITC', 'SBIN',
    'LT', 'HINDUNILVR', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE', 'M&M', 'SUNPHARMA',
    'MARUTI', 'HCLTECH', 'NTPC', 'POWERGRID', 'TITAN', 'TATASTEEL', 'BAJAJFINSV',
    'ULTRACEMCO', 'ASIANPAINT', 'JSWSTEEL', 'TECHM', 'ADANIPORTS', 'NESTLEIND',
    'INDUSINDBK', 'WIPRO'
  ],
  niftyit: [
    'TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM', 'LTIM', 'PERSISTENT', 'COFORGE', 'OFSS', 'MPHASIS'
  ]
};

function getAllMarketStocks() {
  const map = new Map();

  const addStock = (item, defaultTag) => {
    if (!item || !item.symbol) return;
    const sym = item.symbol.trim().toUpperCase();
    if (!map.has(sym)) {
      const low = item.day_low !== undefined && item.day_low !== null ? item.day_low : item.price;
      const high = item.day_high !== undefined && item.day_high !== null ? item.day_high : item.price;
      const price = item.price || item.cmp || 0;
      const surgeFromLow = (low && low > 0) ? +(((price - low) / low) * 100).toFixed(2) : 0;
      const rangeSpread = (high - low);
      const rangePos = rangeSpread > 0 ? Math.min(100, Math.max(0, +(((price - low) / rangeSpread) * 100).toFixed(1))) : 50;

      let tag = defaultTag;
      if (INDEX_CONSTITUENTS.banknifty.includes(sym)) tag = 'BANK NIFTY';
      else if (INDEX_CONSTITUENTS.niftyit.includes(sym)) tag = 'NIFTY IT';
      else if (INDEX_CONSTITUENTS.nifty50.includes(sym)) tag = 'NIFTY 50';
      else if (INDEX_CONSTITUENTS.sensex.includes(sym)) tag = 'SENSEX';

      map.set(sym, {
        ...item,
        symbol: sym,
        price: price,
        day_low: low,
        day_high: high,
        surge_from_low: surgeFromLow,
        range_pos: rangePos,
        primary_tag: tag
      });
    }
  };

  if (Array.isArray(window.NIFTY_50_DATA)) {
    window.NIFTY_50_DATA.forEach(s => addStock(s, 'NIFTY 50'));
  }
  if (Array.isArray(window.NIFTY_NEXT_50_DATA)) {
    window.NIFTY_NEXT_50_DATA.forEach(s => addStock(s, 'NEXT 50'));
  }
  if (typeof EXTRA_CONSTITUENTS_DATA !== 'undefined' && Array.isArray(EXTRA_CONSTITUENTS_DATA)) {
    EXTRA_CONSTITUENTS_DATA.forEach(s => addStock(s, 'CONSTITUENT'));
  }
  if (Array.isArray(window.BREAKOUT_BUYS_DATA)) {
    window.BREAKOUT_BUYS_DATA.forEach(s => addStock(s, 'BREAKOUT'));
  }

  return Array.from(map.values());
}

function setMoversFilter(filter) {
  state.moversFilter = filter || 'all';

  document.querySelectorAll('.mover-filter-btn').forEach(btn => {
    const isTarget = btn.id === `btn-mover-${filter}` || btn.getAttribute('onclick')?.includes(`'${filter}'`);
    if (isTarget) {
      btn.className = 'mover-filter-btn px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold shadow transition-all';
    } else {
      btn.className = 'mover-filter-btn px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all';
    }
  });

  renderMarketMovers();
  renderMoversTable();
}

function renderMarketMovers() {
  const filter = state.moversFilter || 'all';
  const all = getAllMarketStocks();

  let filtered = all;
  if (filter !== 'all' && INDEX_CONSTITUENTS[filter]) {
    const symbols = INDEX_CONSTITUENTS[filter];
    filtered = all.filter(s => symbols.includes(s.symbol));
  }

  const valid = filtered.filter(s => s.price && s.price > 0 && s.change_pct !== null && s.change_pct !== undefined);

  // 1. Top Gainers: Highest % Change
  const topGainers = [...valid].sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0)).slice(0, 8);

  // 2. Top Losers: Lowest % Change
  const topLosers = [...valid].sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0)).slice(0, 8);

  // 3. Top Intraday Gainers: Strongest surge from today's low
  const topIntraday = [...valid]
    .filter(s => s.surge_from_low !== undefined)
    .sort((a, b) => {
      if (b.surge_from_low !== a.surge_from_low) return (b.surge_from_low || 0) - (a.surge_from_low || 0);
      return (b.change_pct || 0) - (a.change_pct || 0);
    })
    .slice(0, 8);

  // Render Top Gainers List
  const gainersContainer = document.getElementById('top-gainers-list');
  if (gainersContainer) {
    if (topGainers.length === 0) {
      gainersContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">No gainer data available</div>';
    } else {
      gainersContainer.innerHTML = topGainers.map((s, idx) => renderMoverItem(s, idx + 1, 'gainer')).join('');
    }
  }

  // Render Top Losers List
  const losersContainer = document.getElementById('top-losers-list');
  if (losersContainer) {
    if (topLosers.length === 0) {
      losersContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">No loser data available</div>';
    } else {
      losersContainer.innerHTML = topLosers.map((s, idx) => renderMoverItem(s, idx + 1, 'loser')).join('');
    }
  }

  // Render Top Intraday Gainers List
  const intradayContainer = document.getElementById('top-intraday-gainers-list');
  if (intradayContainer) {
    if (topIntraday.length === 0) {
      intradayContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">No intraday surge data available</div>';
    } else {
      intradayContainer.innerHTML = topIntraday.map((s, idx) => renderMoverItem(s, idx + 1, 'intraday')).join('');
    }
  }
}

function renderMoverItem(s, rank, type) {
  const isPos = (s.change >= 0);
  const chgSign = isPos ? '+' : '';
  const priceFormatted = s.price ? s.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const changeFormatted = `${chgSign}₹${Math.abs(s.change).toFixed(2)}`;
  const pctFormatted = `${chgSign}${s.change_pct?.toFixed(2)}%`;

  let rankBadgeBg = 'bg-slate-800 text-slate-400 group-hover:bg-purple-600 group-hover:text-white';
  if (rank === 1) rankBadgeBg = 'bg-amber-400 text-slate-950 font-black shadow-sm';
  else if (rank === 2) rankBadgeBg = 'bg-slate-300 text-slate-950 font-black';
  else if (rank === 3) rankBadgeBg = 'bg-amber-700 text-amber-100 font-bold';

  let tagBg = 'bg-slate-800 text-slate-400 border-slate-700';
  if (s.primary_tag === 'BANK NIFTY') tagBg = 'bg-blue-950/80 text-blue-300 border-blue-700/60';
  else if (s.primary_tag === 'NIFTY IT') tagBg = 'bg-purple-950/80 text-purple-300 border-purple-700/60';
  else if (s.primary_tag === 'SENSEX') tagBg = 'bg-amber-950/80 text-amber-300 border-amber-700/60';
  else if (s.primary_tag === 'NIFTY 50') tagBg = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';

  let valueSubtext = '';
  if (type === 'intraday') {
    valueSubtext = `<div class="text-[10px] font-bold text-amber-400 font-mono">Surge: +${s.surge_from_low}% from Low</div>`;
  } else {
    valueSubtext = `<div class="text-[10px] text-slate-400 font-mono">L: ₹${s.day_low?.toLocaleString('en-IN')} &bull; H: ₹${s.day_high?.toLocaleString('en-IN')}</div>`;
  }

  const colorClass = isPos ? 'text-emerald-400' : 'text-rose-400';
  const hoverBorder = type === 'loser' ? 'hover:border-rose-500/50' : (type === 'intraday' ? 'hover:border-amber-500/50' : 'hover:border-emerald-500/50');

  return `
    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 ${hoverBorder} hover:bg-slate-800/80 transition-all flex items-center justify-between gap-2.5 group">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors shrink-0 ${rankBadgeBg}">${rank}</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span onclick="openStockModal('${s.symbol}')" class="font-black text-white text-xs truncate hover:text-cyan-400 cursor-pointer transition-colors">${s.symbol}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${tagBg}">${s.primary_tag}</span>
          </div>
          ${valueSubtext}
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="text-right">
          <div class="text-xs font-black text-white font-mono">₹${priceFormatted}</div>
          <div class="text-[11px] font-black ${colorClass} font-mono">${pctFormatted}</div>
        </div>
        <button onclick="openStockModal('${s.symbol}')" title="Inspect ${s.symbol} Candlestick & SuperTrend" class="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[10px] font-bold border border-slate-700 transition-all flex items-center gap-1 shrink-0">
          <span>🕯️</span>
        </button>
      </div>
    </div>
  `;
}

function renderMoversTable() {
  const tbody = document.getElementById('movers-table-body');
  if (!tbody) return;

  const filter = state.moversFilter || 'all';
  const all = getAllMarketStocks();

  let filtered = all;
  if (filter !== 'all' && INDEX_CONSTITUENTS[filter]) {
    const symbols = INDEX_CONSTITUENTS[filter];
    filtered = all.filter(s => symbols.includes(s.symbol));
  }

  // Filter by search query
  const searchInput = document.getElementById('movers-search');
  const q = (searchInput ? searchInput.value : '').trim().toUpperCase();
  if (q) {
    filtered = filtered.filter(s => s.symbol.toUpperCase().includes(q) || (s.code && s.code.toUpperCase().includes(q)));
  }

  // Update KPI counters
  const totalCount = filtered.length;
  const advancingCount = filtered.filter(s => s.change > 0).length;
  const decliningCount = filtered.filter(s => s.change < 0).length;
  const bestPerformer = [...filtered].sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0))[0];

  const totalEl = document.getElementById('movers-kpi-total');
  const advEl = document.getElementById('movers-kpi-advancing');
  const decEl = document.getElementById('movers-kpi-declining');
  const bestEl = document.getElementById('movers-kpi-best');
  const tagEl = document.getElementById('movers-table-tag');

  if (totalEl) totalEl.innerText = `${totalCount} Stocks`;
  if (advEl) advEl.innerText = `${advancingCount} Advancing 🚀`;
  if (decEl) decEl.innerText = `${decliningCount} Declining 🔻`;
  if (bestEl) bestEl.innerText = bestPerformer ? `${bestPerformer.symbol} (+${bestPerformer.change_pct?.toFixed(2)}%)` : '--';
  if (tagEl) {
    const nameMap = { all: 'All Benchmark Indices', nifty50: 'NIFTY 50', banknifty: 'BANK NIFTY', sensex: 'SENSEX', niftyit: 'NIFTY IT' };
    tagEl.innerText = nameMap[filter] || 'All Indices';
  }

  // Sorting
  const sortSelect = document.getElementById('movers-sort');
  const sortMode = sortSelect ? sortSelect.value : 'gain_desc';
  filtered.sort((a, b) => {
    if (sortMode === 'gain_desc') return (b.change_pct || 0) - (a.change_pct || 0);
    if (sortMode === 'gain_asc') return (a.change_pct || 0) - (b.change_pct || 0);
    if (sortMode === 'surge_desc') return (b.surge_from_low || 0) - (a.surge_from_low || 0);
    if (sortMode === 'cmp_desc') return (b.price || 0) - (a.price || 0);
    if (sortMode === 'rsi_asc') return (a.rsi || 999) - (b.rsi || 999);
    return (b.change_pct || 0) - (a.change_pct || 0);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-slate-500 text-xs">No stocks matching query</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((s, idx) => {
    const isPos = (s.change >= 0);
    const chgSign = isPos ? '+' : '';
    const priceFormatted = s.price ? s.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
    const changeFormatted = s.change !== null && s.change !== undefined ? `${chgSign}₹${Math.abs(s.change).toFixed(2)}` : '--';
    const pctFormatted = s.change_pct !== null && s.change_pct !== undefined ? `${chgSign}${s.change_pct.toFixed(2)}%` : '--';
    const colorClass = isPos ? 'text-emerald-400' : 'text-rose-400';
    const badgeBg = isPos ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' : 'bg-rose-950 text-rose-400 border-rose-800/60';

    const rsiVal = s.rsi ? s.rsi.toFixed(1) : '--';
    let rsiColor = 'text-slate-300';
    if (s.rsi && s.rsi <= 30) rsiColor = 'text-rose-400 font-bold';
    else if (s.rsi && s.rsi <= 40) rsiColor = 'text-emerald-400 font-bold';
    else if (s.rsi && s.rsi >= 70) rsiColor = 'text-amber-400 font-bold';

    const signalBadge = getStockSignalInfo(s);

    return `
      <tr class="hover:bg-slate-900/80 transition-colors">
        <td class="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">${idx + 1}</td>
        <td class="py-2.5 px-3">
          <div onclick="openStockModal('${s.symbol}')" class="font-black text-white hover:text-cyan-400 cursor-pointer transition-colors flex items-center gap-1.5">
            <span>${s.symbol}</span>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">${s.code || ''}</div>
        </td>
        <td class="py-2.5 px-3">
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">${s.primary_tag}</span>
        </td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-white">₹${priceFormatted}</td>
        <td class="py-2.5 px-3 text-right font-mono font-bold ${colorClass}">${changeFormatted}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="px-2 py-0.5 rounded text-[11px] font-black font-mono border ${badgeBg}">${pctFormatted}</span>
        </td>
        <td class="py-2.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span>₹${s.day_low?.toLocaleString('en-IN') || '--'}</span>
            <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div class="h-full bg-cyan-400 rounded-full" style="width: ${s.range_pos || 50}%"></div>
            </div>
            <span>₹${s.day_high?.toLocaleString('en-IN') || '--'}</span>
          </div>
        </td>
        <td class="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">+${s.surge_from_low}%</td>
        <td class="py-2.5 px-3 text-right font-mono ${rsiColor}">${rsiVal}</td>
        <td class="py-2.5 px-3 text-center">${signalBadge.html}</td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="openStockModal('${s.symbol}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 mx-auto">
            <span>🕯️</span> <span>Inspect</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Index Live Graph Modal (Screenshot 2 Live NIFTY 50 / Major Indices)
function openIndexModal(indexName = 'NIFTY 50', timeframe = '1D') {
  const modal = document.getElementById('index-modal');
  if (!modal) return;

  state.selectedIndex = indexName;
  state.indexTimeframe = timeframe;

  const indices = window.INDICES_DATA || [];
  const idx = indices.find(i => i.name.toUpperCase() === indexName.toUpperCase()) || indices[0] || {
    name: indexName,
    ticker: '^NSEI',
    exchange: 'NSE',
    price: 23053.10,
    open: 22964.50,
    high: 23118.10,
    low: 22905.10,
    prev_close: 22936.75,
    change: 116.35,
    change_pct: 0.51,
    is_positive: true,
    last_updated: '03:30:00 PM'
  };

  // Header & Title
  const nameEl = document.getElementById('modal-index-name');
  if (nameEl) nameEl.innerText = idx.name;

  const updatedEl = document.getElementById('modal-index-updated');
  if (updatedEl) {
    updatedEl.innerText = `Updated: ${idx.last_updated ? format12HrTime(idx.last_updated) : '03:30:00 PM IST'}`;
  }

  // Price & Change
  const priceEl = document.getElementById('modal-index-price');
  if (priceEl) {
    priceEl.innerText = idx.price !== null && idx.price !== undefined 
      ? idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : '--';
  }

  const badgeEl = document.getElementById('modal-index-change-badge');
  if (badgeEl) {
    const isPos = idx.change >= 0;
    const sign = idx.change > 0 ? '+' : '';
    const chgStr = idx.change !== null && idx.change !== undefined ? `${sign}${idx.change.toFixed(2)}` : '--';
    const pctStr = idx.change_pct !== null && idx.change_pct !== undefined ? `${sign}${idx.change_pct.toFixed(2)}%` : '--';
    badgeEl.innerText = `${chgStr} (${pctStr})`;
    badgeEl.className = isPos
      ? 'px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
      : 'px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40';
  }

  // Open, High, Low
  const openEl = document.getElementById('modal-index-open');
  if (openEl) openEl.innerText = idx.open ? idx.open.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

  const highEl = document.getElementById('modal-index-high');
  if (highEl) highEl.innerText = idx.high ? idx.high.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

  const lowEl = document.getElementById('modal-index-low');
  if (lowEl) lowEl.innerText = idx.low ? idx.low.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

  // Render Index Switcher Pills
  const pillsContainer = document.getElementById('index-pills-container');
  if (pillsContainer) {
    pillsContainer.innerHTML = indices.map(i => {
      const active = i.name.toUpperCase() === state.selectedIndex.toUpperCase();
      const activeClass = active 
        ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25' 
        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700';
      return `<button onclick="openIndexModal('${i.name}')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeClass}">${i.name}</button>`;
    }).join('');
  }

  // Populate Scrolling Ticker Ribbon
  renderIndexTickerRibbon();

  // Show Modal
  modal.classList.remove('hidden');

  // Render Index Chart
  renderIndexChart();
}

function closeIndexModal() {
  const modal = document.getElementById('index-modal');
  if (modal) modal.classList.add('hidden');
}

function setIndexChartMode(mode) {
  state.indexChartMode = mode;
  const btnArea = document.getElementById('btn-index-area');
  const btnCandle = document.getElementById('btn-index-candle');
  if (mode === 'area') {
    if (btnArea) btnArea.className = 'px-3 py-1 rounded bg-cyan-600 text-white font-bold flex items-center gap-1.5 transition-all';
    if (btnCandle) btnCandle.className = 'px-3 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all';
  } else {
    if (btnCandle) btnCandle.className = 'px-3 py-1 rounded bg-cyan-600 text-white font-bold flex items-center gap-1.5 transition-all';
    if (btnArea) btnArea.className = 'px-3 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all';
  }
  renderIndexChart();
}

function setIndexTimeframe(tf) {
  state.indexTimeframe = tf;
  document.querySelectorAll('.index-tf-btn').forEach(btn => {
    if (btn.innerText.trim() === tf) {
      btn.className = 'index-tf-btn active px-2.5 py-1 rounded bg-cyan-600 text-white font-bold';
    } else {
      btn.className = 'index-tf-btn px-2.5 py-1 rounded text-slate-400 hover:text-white';
    }
  });
  renderIndexChart();
}

// Render Scrolling Ticker Ribbon (Top of Screenshot 2)
function renderIndexTickerRibbon() {
  const track = document.getElementById('index-ticker-track');
  if (!track) return;

  const stocks = window.NIFTY_50_DATA || [];
  if (stocks.length === 0) return;

  const items = stocks.slice(0, 20).map(s => {
    const isPos = (s.change || 0) >= 0;
    const sign = (s.change || 0) > 0 ? '+' : '';
    const color = isPos ? 'text-emerald-400' : 'text-rose-400';
    const chgPct = s.change_pct !== null && s.change_pct !== undefined ? `(${sign}${s.change_pct.toFixed(2)}%)` : '';
    return `
      <div class="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs">
        <span class="font-bold text-slate-200">${s.symbol}</span>
        <span class="font-mono text-slate-300">₹${s.price ? s.price.toLocaleString('en-IN') : '--'}</span>
        <span class="font-mono font-bold ${color}">${sign}${s.change ? s.change.toFixed(2) : '0'} ${chgPct}</span>
      </div>
    `;
  }).join(' • ');

  // Duplicate for seamless infinite loop scroll
  track.innerHTML = items + ' • ' + items;
}

// Render Index Chart (Area Chart matching Screenshot 2 or 5m Candlestick)
function renderIndexChart() {
  const canvas = document.getElementById('index-chart-canvas');
  if (!canvas) return;

  const indices = window.INDICES_DATA || [];
  const idx = indices.find(i => i.name.toUpperCase() === state.selectedIndex.toUpperCase()) || indices[0];
  if (!idx) return;

  let intraday = idx.intraday || [];
  if (intraday.length === 0) {
    // Generate realistic 5m intraday points if not present
    const base = idx.open || idx.price || 23000;
    const target = idx.price || base;
    const count = 75;
    intraday = [];
    for (let i = 0; i < count; i++) {
      const factor = i / (count - 1);
      const randomNoise = (Math.sin(i / 5) * 45) + (Math.cos(i / 3) * 25);
      const closeVal = +(base + (target - base) * factor + randomNoise).toFixed(2);
      const openVal = +(closeVal - (Math.sin(i) * 15)).toFixed(2);
      const highVal = +(Math.max(openVal, closeVal) + Math.abs(Math.cos(i) * 15)).toFixed(2);
      const lowVal = +(Math.min(openVal, closeVal) - Math.abs(Math.sin(i) * 15)).toFixed(2);
      const h = 9 + Math.floor((15 + i * 5) / 60);
      const m = (15 + i * 5) % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispH = h > 12 ? h - 12 : h;
      intraday.push({
        time: `${dispH < 10 ? '0' : ''}${dispH}:${m < 10 ? '0' : ''}${m} ${ampm}`,
        open: openVal,
        high: highVal,
        low: lowVal,
        close: closeVal
      });
    }
  }

  const labels = intraday.map(p => p.time);
  const prevClose = idx.prev_close || (intraday[0] ? intraday[0].open : 22936.75);
  const baselineData = intraday.map(() => prevClose);

  if (state.charts.indexChart) {
    state.charts.indexChart.destroy();
  }

  const ctx = canvas.getContext('2d');

  if (state.indexChartMode === 'area') {
    // Screenshot 2: Area Chart with cyan gradient fill and dashed previous close baseline
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradient.addColorStop(0.7, 'rgba(6, 182, 212, 0.08)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    state.charts.indexChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${idx.name} Intraday`,
            data: intraday.map(p => p.close),
            borderColor: '#06b6d4',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.25,
            fill: 'start',
            backgroundColor: gradient,
            yAxisID: 'y'
          },
          {
            label: `Prev Close (${prevClose.toLocaleString('en-IN')})`,
            data: baselineData,
            borderColor: 'rgba(148, 163, 184, 0.45)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#090d16',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } },
            grid: { color: 'rgba(51, 65, 85, 0.15)' }
          },
          y: {
            position: 'right',
            ticks: {
              color: '#38bdf8',
              font: { size: 10 },
              callback: val => val.toLocaleString('en-IN')
            },
            grid: { color: 'rgba(51, 65, 85, 0.25)' }
          }
        }
      }
    });
  } else {
    // Candlestick Chart with 5m candles
    const highs = intraday.map(p => p.high);
    const lows = intraday.map(p => p.low);
    const wickColors = intraday.map(p => p.close >= p.open ? '#10b981' : '#ef4444');

    state.charts.indexChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${idx.name} Candlestick`,
            data: intraday.map(p => [p.open, p.close]),
            backgroundColor: intraday.map(p => p.close >= p.open ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'),
            borderColor: intraday.map(p => p.close >= p.open ? '#059669' : '#dc2626'),
            borderWidth: 1,
            isCandle: true,
            highs: highs,
            lows: lows,
            wickColors: wickColors,
            barPercentage: 0.7,
            categoryPercentage: 0.9,
            yAxisID: 'y'
          },
          {
            label: `Prev Close (${prevClose.toLocaleString('en-IN')})`,
            type: 'line',
            data: baselineData,
            borderColor: 'rgba(148, 163, 184, 0.45)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#090d16',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  const p = intraday[context.dataIndex];
                  return [
                    `Open: ₹${p.open.toLocaleString('en-IN')}`,
                    `High: ₹${p.high.toLocaleString('en-IN')}`,
                    `Low: ₹${p.low.toLocaleString('en-IN')}`,
                    `Close: ₹${p.close.toLocaleString('en-IN')}`
                  ];
                }
                return context.dataset.label;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } },
            grid: { color: 'rgba(51, 65, 85, 0.15)' }
          },
          y: {
            position: 'right',
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: val => val.toLocaleString('en-IN')
            },
            grid: { color: 'rgba(51, 65, 85, 0.25)' }
          }
        }
      }
    });
  }
}

// 4-Tier Genuine Signal Classification Engine (Manoj Mane Breakout System)
function getBreakoutSignalInfo(stock) {
  if (!stock) {
    return {
      status: 'WAIT',
      tier: 'wait',
      label: 'WAIT',
      badgeHtml: `<span class="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">WAIT</span>`,
      modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">WAIT</span>`,
      reason: 'Awaiting stock data'
    };
  }

  const cmp = stock.live_price || stock.sheet_cmp || stock.price || stock.cmp || 0;
  const dma5 = stock.dma5 || cmp;
  const dma20 = stock.dma20 || cmp;
  const dma50 = stock.dma50 || cmp;
  const dma100 = stock.dma100 || cmp;
  const dma200 = stock.dma200 || cmp;
  const rsi = (stock.rsi !== undefined && stock.rsi !== null && stock.rsi > 0) ? stock.rsi : 50;
  const chg = stock.change !== undefined ? stock.change : 0;
  const maxSpread = stock.max_spread !== undefined ? stock.max_spread : 5.0;
  const disc = stock.discount_from_high !== undefined ? stock.discount_from_high : 0;

  const aboveDma20 = cmp >= (dma20 * 0.997);
  const aboveDma50 = cmp >= (dma50 * 0.997);
  const aboveDma5 = cmp >= (dma5 * 0.997);
  const aboveDma200 = cmp >= (dma200 * 0.985);

  // 1. Genuine Breakout: Price has cleared key 20-DMA & 50-DMA coil resistance with positive RSI >= 50
  if (aboveDma20 && aboveDma50 && rsi >= 50 && (aboveDma5 || chg >= 0)) {
    return {
      status: 'Immediate Buy (Breakout)',
      tier: 'immediate_buy',
      label: 'Immediate Buy (Breakout)',
      badgeHtml: `<span title="Confirmed Breakout: CMP (₹${cmp}) has cleared 20-DMA (₹${dma20.toFixed(1)}) & 50-DMA (₹${dma50.toFixed(1)}) coil with bullish RSI (${rsi})." class="px-2.5 py-1 rounded text-[11px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> 🚀 Immediate Buy (Breakout)</span>`,
      modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 shadow-md"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> 🚀 Immediate Buy (Breakout)</span>`,
      reason: `Cleared 20-DMA (₹${dma20.toFixed(1)}) & 50-DMA (₹${dma50.toFixed(1)}) coil with RSI ${rsi}`
    };
  }

  // 2. Wait to Breakout: Coiling tightly inside DMA cluster (within ±5-7%), testing resistance, waiting for the breakout move
  if ((aboveDma20 || aboveDma50 || aboveDma5) && rsi >= 45 && maxSpread <= 7.5) {
    const keyRes = Math.max(dma20, dma50).toFixed(1);
    return {
      status: 'Wait to Breakout',
      tier: 'wait_to_breakout',
      label: 'Wait to Breakout',
      badgeHtml: `<span title="Coiled Spring: Coiling tightly within ${maxSpread}% DMA spread. Wait for confirmed breakout above ₹${keyRes} before entering." class="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> ⏳ Wait to Breakout</span>`,
      modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md"><span class="w-2 h-2 rounded-full bg-amber-400"></span> ⏳ Wait to Breakout (Hurdle: ₹${keyRes})</span>`,
      reason: `Coiling tightly in ${maxSpread}% DMA spread. Awaiting breakout cross above ₹${keyRes}`
    };
  }

  // 3. Wait and Watch: Base formation, value discount, or consolidating at support
  if (disc >= 18.0 || rsi >= 38 || aboveDma200) {
    return {
      status: 'Wait and Watch',
      tier: 'wait_and_watch',
      label: 'Wait and Watch',
      badgeHtml: `<span title="Base Formation: Consolidating at base with ${disc}% discount from 52W high. Wait and watch for upward momentum." class="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 👀 Wait and Watch</span>`,
      modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md"><span class="w-2 h-2 rounded-full bg-blue-400"></span> 👀 Wait and Watch (Base Formation)</span>`,
      reason: `Consolidating at base with ${disc}% discount from 52W high`
    };
  }

  // 4. Do Not Buy: Weak momentum, below key moving averages
  return {
    status: 'Do Not Buy',
    tier: 'do_not_buy',
    label: 'Do Not Buy',
    badgeHtml: `<span title="Avoid: Below moving average support with weak momentum (RSI: ${rsi})." class="px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> 🚫 Do Not Buy</span>`,
    modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-md"><span class="w-2 h-2 rounded-full bg-rose-400"></span> 🚫 Do Not Buy (Avoid)</span>`,
    reason: `Below key moving average support (RSI: ${rsi})`
  };
}

// Unified Stock Signal Inspector for all universes
function getStockSignalInfo(stock, universe = 'nifty50', source = null) {
  if (!stock) {
    return {
      status: 'WAIT',
      modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">WAIT</span>`
    };
  }

  const breakoutList = window.BREAKOUT_BUYS_DATA || [];
  const isBreakout = universe === 'breakout' || source === 'breakout' || breakoutList.some(b => b.symbol === stock.symbol);
  
  if (isBreakout) {
    return getBreakoutSignalInfo(stock);
  }

  // ETF Universe
  if (universe === 'etf' || source === 'etf') {
    const isEtfBuy = stock.status === 'Buy' || stock.is_daily_buy || (stock.rsi && stock.rsi < 40);
    if (isEtfBuy) {
      return {
        status: "Today's Buy ETF",
        modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> 🎯 Today's Buy ETF</span>`
      };
    }
    return {
      status: 'Hold / Watch',
      modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">👀 Hold / Watch</span>`
    };
  }

  // Top 500 Consolidated
  if (universe === 'top500') {
    if (stock.status === 'Best Time for Buy' || stock.output === 'Best Time for Buy') {
      return getBreakoutSignalInfo(stock);
    }
    return {
      status: 'Do Not Buy',
      modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">🚫 Avoid / Do Not Buy</span>`
    };
  }

  // RSI Radar Universe (Screenshots 1 & 4)
  const isRadarBuy = source === 'radar' || (stock.rsi !== null && stock.rsi !== undefined && stock.rsi > 0 && stock.rsi <= 35) || stock.status === 'Start Buying As Par Rules';
  if (isRadarBuy) {
    return {
      status: 'Immediate Buy (RSI ≤ 35)',
      modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md"><span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> ⚡ Immediate Buy (RSI ≤ 35)</span>`
    };
  }

  if (stock.rsi && stock.rsi <= 40) {
    return {
      status: 'Wait to Buy (Dip Setup)',
      modalBadgeHtml: `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md"><span class="w-2 h-2 rounded-full bg-amber-400"></span> ⏳ Wait for Dip (RSI: ${stock.rsi})</span>`
    };
  }

  if (stock.status === 'Avoid' || stock.output === 'Avoid') {
    return {
      status: 'Do Not Buy',
      modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">🚫 Do Not Buy (Avoid)</span>`
    };
  }

  return {
    status: 'WAIT',
    modalBadgeHtml: `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">👀 Wait and Watch</span>`
  };
}

// AI Rating Badges for the 16 Breakout Buys (verified genuine signal)
function getBreakoutAiBadge(sym, stock = null) {
  if (stock) {
    return getBreakoutSignalInfo(stock).badgeHtml;
  }
  const breakoutList = window.BREAKOUT_BUYS_DATA || [];
  const s = breakoutList.find(x => x.symbol === sym);
  if (s) {
    return getBreakoutSignalInfo(s).badgeHtml;
  }
  return `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">WAIT</span>`;
}

// Render the 16 Breakout Buy Stocks Table
function renderBreakoutBuysTable(sortBy = state.breakoutSort || 'tightness') {
  const tbody = document.getElementById('breakout-buys-table-body');
  if (!tbody) return;

  const data = [...(window.BREAKOUT_BUYS_DATA || [])];
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-slate-400">Loading breakout buy candidates...</td></tr>`;
    return;
  }

  // Sort candidates
  if (sortBy === 'tightness') {
    data.sort((a, b) => (a.max_spread || 99) - (b.max_spread || 99));
  } else if (sortBy === 'discount') {
    data.sort((a, b) => (b.discount_from_high || 0) - (a.discount_from_high || 0));
  } else if (sortBy === 'rsi') {
    data.sort((a, b) => (a.rsi || 99) - (b.rsi || 99));
  } else if (sortBy === 'price') {
    data.sort((a, b) => (a.live_price || a.sheet_cmp || 0) - (b.live_price || b.sheet_cmp || 0));
  }

  tbody.innerHTML = data.map((s, idx) => {
    const liveCmp = s.live_price || s.sheet_cmp;
    const cmpStr = liveCmp ? `₹${liveCmp.toLocaleString('en-IN')}` : '--';
    
    let changeBadge = '--';
    if (s.change !== undefined && s.change !== null) {
      const pctStr = s.change_pct !== undefined ? ` (${s.change_pct > 0 ? '+' : ''}${s.change_pct}%)` : '';
      changeBadge = s.change >= 0 
        ? `<span class="text-xs text-emerald-400 font-bold">+${s.change}${pctStr}</span>` 
        : `<span class="text-xs text-rose-400 font-bold">${s.change}${pctStr}</span>`;
    }

    const rsiVal = s.rsi !== null && s.rsi !== undefined ? s.rsi : '--';
    const rsiColor = getRsiColor(s.rsi);
    const maxSpread = s.max_spread !== null && s.max_spread !== undefined ? `${s.max_spread}%` : '--';
    const avgSpread = s.avg_spread !== null && s.avg_spread !== undefined ? `(avg ${s.avg_spread}%)` : '';
    const discHigh = s.discount_from_high !== null && s.discount_from_high !== undefined ? `${s.discount_from_high}% off 52W H` : '--';
    const bufLow = s.buffer_from_low !== null && s.buffer_from_low !== undefined ? `<span class="text-emerald-400 font-bold">+${s.buffer_from_low}% from Low</span>` : '--';
    const aiBadge = getBreakoutAiBadge(s.symbol, s);

    return `
      <tr onclick="openStockModal('${s.symbol}', 'breakout')" class="border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors cursor-pointer">
        <td class="py-3 px-3 text-xs text-slate-400 font-bold">${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-white">${s.symbol}</span>
            <span class="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">${s.code}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-black text-slate-100">${cmpStr}</td>
        <td class="py-3 px-4 text-right">${changeBadge}</td>
        <td class="py-3 px-4 text-center font-bold font-mono" style="color: ${rsiColor}">${rsiVal}</td>
        <td class="py-3 px-4 text-right font-mono">
          <span class="text-emerald-400 font-bold">${maxSpread}</span>
          <span class="text-[10px] text-slate-400 block">${avgSpread}</span>
        </td>
        <td class="py-3 px-4 text-right font-mono text-cyan-300 text-xs">${discHigh}</td>
        <td class="py-3 px-4 text-right font-mono text-xs">${bufLow}</td>
        <td class="py-3 px-4 text-center">${aiBadge}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="event.stopPropagation(); openStockModal('${s.symbol}', 'breakout')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-semibold transition-colors">
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function sortBreakoutBuysTable(val) {
  state.breakoutSort = val;
  renderBreakoutBuysTable(val);
}

// Render Top 500 Consolidated Breakout Stocks Table
function renderTop500Table() {
  const tbody = document.getElementById('top500-table-body');
  if (!tbody) return;

  const data = window.TOP_500_STOCKS_DATA || [];
  const query = (state.top500SearchQuery || '').toLowerCase().trim();
  const filter = state.top500Filter || 'all';

  const filtered = data.filter(s => {
    const matchesSearch = (s.code && s.code.toLowerCase().includes(query)) || (s.symbol && s.symbol.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (filter === 'buy') return s.output === 'Best Time for Buy';
    if (filter === 'avoid') return s.output === 'Avoid';
    return true;
  });

  const countLabel = document.getElementById('top500-count-label');
  if (countLabel) countLabel.innerText = `${filtered.length} of ${data.length} Stocks`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-center text-slate-400">No stocks matching your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 250).map((s, idx) => {
    const isBuy = s.output === 'Best Time for Buy';
    const outputBadge = isBuy
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600 shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator"></span>Best Time for Buy</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800">Avoid</span>`;

    const cmpStr = s.cmp !== null ? `₹${s.cmp.toLocaleString('en-IN')}` : '--';
    const d5 = s.dma5 !== null ? s.dma5.toLocaleString('en-IN') : '--';
    const d20 = s.dma20 !== null ? s.dma20.toLocaleString('en-IN') : '--';
    const d50 = s.dma50 !== null ? s.dma50.toLocaleString('en-IN') : '--';
    const d100 = s.dma100 !== null ? s.dma100.toLocaleString('en-IN') : '--';
    const d200 = s.dma200 !== null ? s.dma200.toLocaleString('en-IN') : '--';
    const h52 = s.high52 !== null ? `₹${s.high52.toLocaleString('en-IN')}` : '--';
    const l52 = s.low52 !== null ? `₹${s.low52.toLocaleString('en-IN')}` : '--';

    const rowBg = isBuy ? 'bg-emerald-950/25 hover:bg-emerald-950/40' : 'hover:bg-slate-800/40';

    return `
      <tr onclick="openStockModal('${s.symbol}', 'top500')" class="border-b border-slate-800/80 ${rowBg} font-mono text-[11px] transition-colors cursor-pointer">
        <td class="py-2.5 px-3 text-slate-400">${idx + 1}</td>
        <td class="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
          <span>${s.symbol}</span>
          <span class="text-[10px] font-normal text-slate-400 font-mono">(${s.code})</span>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-slate-100">${cmpStr}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">${d5}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">${d20}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">${d50}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">${d100}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">${d200}</td>
        <td class="py-2.5 px-3 text-right text-slate-400">${h52}</td>
        <td class="py-2.5 px-3 text-center text-slate-500 text-[10px]">${s.high52_date || '--'}</td>
        <td class="py-2.5 px-3 text-right text-slate-400">${l52}</td>
        <td class="py-2.5 px-3 text-center text-slate-500 text-[10px]">${s.low52_date || '--'}</td>
        <td class="py-2.5 px-3 text-center font-sans">${outputBadge}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// ETF STOCKS FUNCTIONS
// ==========================================

function changeEtfStrategy(val) {
  state.etfStrategy = val;
  renderEtfShopView();
}

function renderEtfShopView() {
  const container = document.getElementById('etf-spotlight-container');
  const tbody = document.getElementById('etf-table-body');
  if (!container || !tbody) return;

  const rawData = window.ETF_DATA || [];
  if (rawData.length === 0) {
    container.innerHTML = `<div class="col-span-5 text-center py-4 text-xs text-slate-400">Loading ETF live stream...</div>`;
    tbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-slate-400">Loading ETF Shop data...</td></tr>`;
    return;
  }

  // Clone and sort according to selected strategy
  const isRsi = state.etfStrategy === 'rsi';
  const sorted = [...rawData].sort((a, b) => {
    if (isRsi) {
      const vA = (a.rsi !== null && a.rsi !== undefined) ? a.rsi : 999;
      const vB = (b.rsi !== null && b.rsi !== undefined) ? b.rsi : 999;
      return vA - vB;
    } else {
      const vA = (a.pct_20dma !== null && a.pct_20dma !== undefined) ? a.pct_20dma : 999;
      const vB = (b.pct_20dma !== null && b.pct_20dma !== undefined) ? b.pct_20dma : 999;
      return vA - vB;
    }
  });

  // Assign dynamic ranking and Today Buy signals
  sorted.forEach((item, idx) => {
    item.dynamic_rank = idx + 1;
    if (idx === 0) {
      item.dynamic_signal = 'TODAY BUY (#1)';
      item.dynamic_signal_badge = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    } else if (idx < 5) {
      item.dynamic_signal = `TODAY BUY (#${idx + 1})`;
      item.dynamic_signal_badge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    } else if (item.rsi && item.rsi <= 35) {
      item.dynamic_signal = 'BUY ZONE';
      item.dynamic_signal_badge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else if (item.rsi && item.rsi >= 70) {
      item.dynamic_signal = 'OVERBOUGHT';
      item.dynamic_signal_badge = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    } else {
      item.dynamic_signal = 'WAIT / HOLD';
      item.dynamic_signal_badge = 'bg-slate-800 text-slate-400 border-slate-700';
    }
  });

  // Render Top 5 Spotlight
  renderEtfSpotlight(sorted.slice(0, 5), isRsi);

  // Render Interactive Table
  renderEtfTable(sorted, isRsi);
}

function renderEtfSpotlight(top5, isRsi) {
  const container = document.getElementById('etf-spotlight-container');
  if (!container) return;

  container.innerHTML = top5.map((etf, idx) => {
    const isTop1 = idx === 0;
    const borderClass = isTop1 ? 'border-rose-500/70 bg-gradient-to-b from-rose-950/40 to-slate-900/90 shadow-rose-950/50' : 'border-purple-500/30 bg-slate-900/80';
    const rankTitle = isTop1 ? '🔥 #1 TODAY BUY' : `⚡ #${idx + 1} TODAY BUY`;
    const rankBadgeClass = isTop1 ? 'bg-rose-500 text-white font-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold';
    const rsiVal = etf.rsi !== null && etf.rsi !== undefined ? etf.rsi.toFixed(1) : '--';
    const rsiPct = Math.min(100, Math.max(0, etf.rsi || 50));
    const rsiBarBg = (etf.rsi && etf.rsi <= 30) ? 'bg-rose-500' : (etf.rsi && etf.rsi <= 40) ? 'bg-emerald-400' : 'bg-cyan-400';
    const priceStr = etf.cmp ? `₹${etf.cmp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '--';
    const dma20PctStr = (etf.pct_20dma !== null && etf.pct_20dma !== undefined) ? `${etf.pct_20dma > 0 ? '+' : ''}${etf.pct_20dma.toFixed(1)}%` : '--';
    const dma20Color = (etf.pct_20dma && etf.pct_20dma < 0) ? 'text-rose-400' : 'text-emerald-400';
    
    // Target profit calculation: 3.5% gain
    const targetPrice = etf.cmp ? `₹${(etf.cmp * 1.035).toFixed(2)} (+3.5%)` : '--';

    return `
      <div class="p-4 rounded-xl border ${borderClass} flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] tracking-wide uppercase ${rankBadgeClass}">${rankTitle}</span>
            <span class="text-[10px] text-slate-400 font-mono">${etf.category || 'ETF'}</span>
          </div>

          <div class="mt-2">
            <div class="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">${etf.symbol}</div>
            <div class="text-[11px] text-slate-300 line-clamp-1 mt-0.5" title="${etf.name}">${etf.name}</div>
          </div>

          <div class="my-3 flex items-baseline justify-between">
            <span class="text-xl font-black text-white font-mono">${priceStr}</span>
            <span class="text-xs font-bold ${dma20Color}">${dma20PctStr} vs 20D</span>
          </div>

          <!-- 14-Day RSI Bar -->
          <div class="space-y-1 mb-2">
            <div class="flex justify-between text-[10px] text-slate-400">
              <span>14-Day RSI Gauge:</span>
              <span class="font-bold font-mono text-cyan-300">${rsiVal}</span>
            </div>
            <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full ${rsiBarBg} rounded-full transition-all duration-500" style="width: ${rsiPct}%"></div>
            </div>
          </div>

          <!-- Target & Strategy Note -->
          <div class="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Target Profit:</span>
            <span class="text-emerald-400 font-bold font-mono">${targetPrice}</span>
          </div>
        </div>

        <button onclick="openStockModal('${etf.symbol}', 'etf')" class="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all">
          <span>🔍 Inspect Chart</span>
        </button>
      </div>
    `;
  }).join('');
}

function renderEtfTable(etfs, isRsi) {
  const tbody = document.getElementById('etf-table-body');
  if (!tbody) return;

  const query = (state.etfSearchQuery || '').toLowerCase().trim();
  const filter = state.etfFilter || 'all';

  const filtered = etfs.filter(e => {
    const textMatch = !query ||
      (e.symbol && e.symbol.toLowerCase().includes(query)) ||
      (e.name && e.name.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.underlying && e.underlying.toLowerCase().includes(query));
    if (!textMatch) return false;

    if (filter === 'today_buy') return e.dynamic_rank <= 5;
    if (filter === 'oversold') return e.rsi !== null && e.rsi <= 35;
    if (filter === 'below_20dma') return e.pct_20dma !== null && e.pct_20dma < 0;
    if (filter === 'global') return e.category === 'Global & US';
    if (filter === 'commodities') return e.category === 'Commodities (Gold & Silver)';
    if (filter === 'sectoral') return e.category === 'Sectoral & Thematic';
    if (filter === 'index') return e.category === 'Broad Market Index';
    return true;
  });

  const countLabel = document.getElementById('etf-count-label');
  if (countLabel) countLabel.innerText = `${filtered.length} of ${etfs.length} ETFs`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-slate-400">No ETFs matching your search/filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const isTop1 = e.dynamic_rank === 1;
    const isTop5 = e.dynamic_rank <= 5;
    const rowBg = isTop1 ? 'bg-rose-950/20 hover:bg-rose-950/30' : isTop5 ? 'bg-purple-950/20 hover:bg-purple-950/30' : 'hover:bg-slate-800/40';
    
    // Category Badge
    let catBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    if (e.category === 'Global & US') catBadgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    else if (e.category === 'Commodities (Gold & Silver)') catBadgeColor = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    else if (e.category === 'Sectoral & Thematic') catBadgeColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    else if (e.category === 'Broad Market Index') catBadgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';

    const priceStr = e.cmp ? `₹${e.cmp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '--';
    const chgSign = (e.change && e.change > 0) ? '+' : '';
    const chgColor = (e.change && e.change >= 0) ? 'text-emerald-400' : 'text-rose-400';
    const chgStr = e.change_pct !== null && e.change_pct !== undefined ? `${chgSign}${e.change_pct.toFixed(2)}%` : '--';

    const rsiVal = e.rsi !== null && e.rsi !== undefined ? e.rsi.toFixed(1) : '--';
    const rsiPct = Math.min(100, Math.max(0, e.rsi || 50));
    const rsiBarBg = (e.rsi && e.rsi <= 30) ? 'bg-rose-500' : (e.rsi && e.rsi <= 40) ? 'bg-emerald-400' : 'bg-cyan-400';

    const dma20Str = e.dma20 ? `₹${e.dma20.toFixed(2)}` : '--';
    const pct20DmaStr = (e.pct_20dma !== null && e.pct_20dma !== undefined) ? `${e.pct_20dma > 0 ? '+' : ''}${e.pct_20dma.toFixed(2)}%` : '--';
    const pct20DmaColor = (e.pct_20dma && e.pct_20dma < 0) ? 'text-rose-400' : 'text-emerald-400';

    return `
      <tr class="border-b border-slate-800/80 ${rowBg} font-mono text-xs transition-colors">
        <td class="py-3 px-3 text-center text-slate-400 font-bold">${e.dynamic_rank}</td>
        <td class="py-3 px-4 font-sans font-bold text-white">
          <div class="flex items-center gap-1.5">
            <span class="text-cyan-400">${e.symbol}</span>
            <span class="text-[10px] text-slate-500 font-mono">(${e.full_code || 'NSE:' + e.symbol})</span>
          </div>
        </td>
        <td class="py-3 px-4 font-sans text-slate-200">
          <div class="font-medium text-xs text-slate-100">${e.name}</div>
          <div class="text-[10px] text-slate-400">${e.underlying || ''}</div>
        </td>
        <td class="py-3 px-3 text-center font-sans">
          <span class="px-2 py-0.5 rounded text-[10px] font-medium border ${catBadgeColor}">${e.category || 'ETF'}</span>
        </td>
        <td class="py-3 px-4 text-right font-bold text-white text-sm">${priceStr}</td>
        <td class="py-3 px-4 text-right font-bold ${chgColor}">${chgStr}</td>
        <td class="py-3 px-4 text-center font-sans">
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="font-mono font-bold text-slate-100">${rsiVal}</span>
            <div class="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full ${rsiBarBg} rounded-full" style="width: ${rsiPct}%"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-right text-slate-300 font-mono text-[11px]">${dma20Str}</td>
        <td class="py-3 px-3 text-right font-mono font-bold ${pct20DmaColor} text-[11px]">${pct20DmaStr}</td>
        <td class="py-3 px-4 text-center font-sans">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${e.dynamic_signal_badge}">
            ${e.dynamic_signal}
          </span>
        </td>
        <td class="py-3 px-3 text-center font-sans">
          <button onclick="openStockModal('${e.symbol}', 'etf')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium">
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 1. Render Nifty 50 Table
function renderNifty50Table() {
  const tbody = document.getElementById('nifty50-table-body');
  if (!tbody) return;

  const query = state.searchQuery.toLowerCase().trim();
  const filter = state.filterSignal;
  const data = window.NIFTY_50_DATA || [];

  const filtered = data.filter(s => {
    const matchesSearch = s.symbol.toLowerCase().includes(query) || (s.code && s.code.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    if (filter === 'buy') return s.status === 'Start Buying As Par Rules' || (s.rsi !== null && s.rsi > 0 && s.rsi <= 35);
    if (filter === 'wait') return s.status === 'WAIT' || (s.rsi !== null && s.rsi > 35);
    if (filter === 'oversold') return s.rsi !== null && s.rsi > 0 && s.rsi <= 30;
    if (filter === 'overbought') return s.rsi !== null && s.rsi >= 70;
    return true;
  });

  const countLabel = document.getElementById('nifty50-count-label');
  if (countLabel) countLabel.innerText = `${filtered.length} of ${data.length} Stocks`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No stocks matching your search or filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((s, idx) => {
    const rsiVal = s.rsi !== null ? s.rsi : '--';
    const rsiWidth = s.rsi !== null ? Math.min(Math.max(s.rsi, 0), 100) : 0;
    const rsiColor = getRsiColor(s.rsi);
    const badge = getRsiBadge(s.rsi, s.status);
    const priceStr = s.price ? `₹${s.price.toLocaleString('en-IN')}` : '--';
    
    let changeBadge = '';
    if (s.change !== undefined && s.change !== null) {
      const pctStr = s.change_pct !== undefined ? ` (${s.change_pct > 0 ? '+' : ''}${s.change_pct}%)` : '';
      changeBadge = s.change >= 0 
        ? `<span class="text-xs text-emerald-400 font-medium">+${s.change}${pctStr}</span>` 
        : `<span class="text-xs text-rose-400 font-medium">${s.change}${pctStr}</span>`;
    }

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4 text-xs text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">${s.symbol}</span>
            <span class="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">${s.code || 'NSE:' + s.symbol}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="font-medium text-slate-100">${priceStr}</div>
          <div>${changeBadge}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <span class="font-bold text-sm w-12 text-right" style="color: ${rsiColor}">${rsiVal}</span>
            <div class="rsi-bar-container flex-1">
              <div class="rsi-bar-fill" style="width: ${rsiWidth}%; background-color: ${rsiColor}"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          ${badge}
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="openStockModal('${s.symbol}', 'nifty50')" class="px-3 py-1 text-xs font-medium rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/80 hover:border-cyan-400 transition-all">
            📊 Analyze
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 2. Render Nifty Next 50 Table
function renderNext50Table() {
  const tbody = document.getElementById('next50-table-body');
  if (!tbody) return;

  const query = state.searchQuery.toLowerCase().trim();
  const filter = state.filterSignal;
  const data = window.NIFTY_NEXT_50_DATA || [];

  const filtered = data.filter(s => {
    const matchesSearch = s.symbol.toLowerCase().includes(query) || (s.code && s.code.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    if (filter === 'buy') return s.status === 'Start Buying As Par Rules' || (s.rsi !== null && s.rsi > 0 && s.rsi <= 35);
    if (filter === 'wait') return s.status === 'WAIT' || (s.rsi !== null && s.rsi > 35);
    if (filter === 'oversold') return s.rsi !== null && s.rsi > 0 && s.rsi <= 30;
    if (filter === 'overbought') return s.rsi !== null && s.rsi >= 70;
    return true;
  });

  const countLabel = document.getElementById('next50-count-label');
  if (countLabel) countLabel.innerText = `${filtered.length} of ${data.length} Stocks`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400">No stocks matching your search or filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((s, idx) => {
    const rsiVal = s.rsi !== null ? s.rsi : '--';
    const rsiWidth = s.rsi !== null ? Math.min(Math.max(s.rsi, 0), 100) : 0;
    const rsiColor = getRsiColor(s.rsi);
    const badge = getRsiBadge(s.rsi, s.status);
    const priceStr = s.price ? `₹${s.price.toLocaleString('en-IN')}` : '--';
    const peStr = s.pe ? s.pe : '--';
    const low52Str = s.low52 ? `₹${s.low52.toLocaleString('en-IN')}` : '--';
    const high52Str = s.high52 ? `₹${s.high52.toLocaleString('en-IN')}` : '--';
    
    // Range position calculation
    const rangePct = s.range_position_pct !== null && s.range_position_pct !== undefined 
      ? Math.min(Math.max(s.range_position_pct, 0), 100) 
      : 50;
    const discountStr = s.discount_from_high !== null && s.discount_from_high !== undefined 
      ? `${s.discount_from_high}% off 52W High` 
      : '';

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors">
        <td class="py-3 px-4 text-xs text-slate-400">${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">${s.symbol}</span>
            <span class="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">${s.code || 'NSE:' + s.symbol}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-medium text-slate-100">
          ${priceStr}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <span class="font-bold text-sm w-12 text-right" style="color: ${rsiColor}">${rsiVal}</span>
            <div class="rsi-bar-container flex-1">
              <div class="rsi-bar-fill" style="width: ${rsiWidth}%; background-color: ${rsiColor}"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          ${badge}
        </td>
        <td class="py-3 px-4 text-right text-xs">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${peStr}</span>
        </td>
        <td class="py-3 px-4 w-48">
          <div class="text-[10px] flex justify-between text-slate-400 mb-1">
            <span>${low52Str}</span>
            <span>${high52Str}</span>
          </div>
          <div class="range-track">
            <div class="range-pin" style="left: ${rangePct}%"></div>
          </div>
          <div class="text-[10px] text-emerald-400 text-right mt-1 font-medium">${discountStr}</div>
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="openStockModal('${s.symbol}', 'next50')" class="px-3 py-1 text-xs font-medium rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/80 hover:border-cyan-400 transition-all">
            📊 Analyze
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. Calculation Engine View (Nifty 50 & Nifty Next 50)
function initCalculationDropdowns() {
  const calc50 = window.CALC_NIFTY_50 || {};
  const calcNext50 = window.CALC_NIFTY_NEXT_50 || {};

  const select50 = document.getElementById('calc-stock-select-50');
  if (select50) {
    const symbols = Object.keys(calc50).sort();
    if (symbols.length > 0) {
      if (!symbols.includes(state.selectedStock50)) {
        state.selectedStock50 = symbols[0];
      }
      select50.innerHTML = symbols.map(sym => {
        return `<option value="${sym}" ${sym === state.selectedStock50 ? 'selected' : ''}>${sym}</option>`;
      }).join('');

      select50.onchange = (e) => {
        state.selectedStock50 = e.target.value;
        renderCalculationView('nifty50');
      };
    }
  }

  const selectNext50 = document.getElementById('calc-stock-select-next50');
  if (selectNext50) {
    const symbols = Object.keys(calcNext50).sort();
    if (symbols.length > 0) {
      if (!symbols.includes(state.selectedStockNext50)) {
        state.selectedStockNext50 = symbols[0];
      }
      selectNext50.innerHTML = symbols.map(sym => {
        return `<option value="${sym}" ${sym === state.selectedStockNext50 ? 'selected' : ''}>${sym}</option>`;
      }).join('');

      selectNext50.onchange = (e) => {
        state.selectedStockNext50 = e.target.value;
        renderCalculationView('next50');
      };
    }
  }
}

function renderCalculationView(universe) {
  const is50 = universe === 'nifty50';
  const symbol = is50 ? state.selectedStock50 : state.selectedStockNext50;
  const dataMap = is50 ? (window.CALC_NIFTY_50 || {}) : (window.CALC_NIFTY_NEXT_50 || {});
  const history = dataMap[symbol] || [];

  const tbodyId = is50 ? 'calc-table-body-50' : 'calc-table-body-next50';
  const tbody = document.getElementById(tbodyId);
  const chartCanvasId = is50 ? 'calc-chart-50' : 'calc-chart-next50';

  if (tbody) {
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400">No calculation records found for ${symbol}.</td></tr>`;
    } else {
      tbody.innerHTML = history.slice(0, 50).map((row) => {
        const changeClass = (row.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
        const rsiColor = getRsiColor(row.rsi);
        return `
          <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 font-mono text-xs">
            <td class="py-2.5 px-3 text-slate-300">${row.date}</td>
            <td class="py-2.5 px-3 text-right font-medium text-slate-100">₹${row.close !== null ? row.close.toLocaleString('en-IN') : '--'}</td>
            <td class="py-2.5 px-3 text-right font-medium ${changeClass}">${row.change !== null ? row.change : '--'}</td>
            <td class="py-2.5 px-3 text-right text-emerald-400">${row.gain !== null ? row.gain : '--'}</td>
            <td class="py-2.5 px-3 text-right text-rose-400">${row.loss !== null ? row.loss : '--'}</td>
            <td class="py-2.5 px-3 text-right text-slate-400">${row.avgGain !== null ? row.avgGain : '--'}</td>
            <td class="py-2.5 px-3 text-right text-slate-400">${row.avgLoss !== null ? row.avgLoss : '--'}</td>
            <td class="py-2.5 px-3 text-right text-slate-300">${row.rs !== null ? row.rs : '--'}</td>
            <td class="py-2.5 px-3 text-right font-bold" style="color: ${rsiColor}">${row.rsi !== null ? row.rsi : '--'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Chart
  renderStockChart(chartCanvasId, symbol, history);
}

function setStockChartMode(mode) {
  state.stockChartMode = mode;
  const btnCandle = document.getElementById('btn-stock-candle');
  const btnLine = document.getElementById('btn-stock-line');
  if (mode === 'candle') {
    if (btnCandle) btnCandle.className = 'px-3 py-1 rounded bg-cyan-600 text-white font-bold flex items-center gap-1.5 transition-all';
    if (btnLine) btnLine.className = 'px-3 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all';
  } else {
    if (btnLine) btnLine.className = 'px-3 py-1 rounded bg-cyan-600 text-white font-bold flex items-center gap-1.5 transition-all';
    if (btnCandle) btnCandle.className = 'px-3 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all';
  }
  if (state.currentStockChartData) {
    if (mode === 'candle') {
      renderGoogleFinanceCandleChart(state.currentStockChartData);
    } else {
      renderStockLineAndRsiChart(state.currentStockModalSymbol, state.currentStockChartData);
    }
  }
}

// Chart.js Price, Candlestick & Wilder RSI Chart (Screenshot 5 SBICARD with dual mode)
function renderStockChart(canvasId, symbol, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const reversed = [...history].reverse(); // chronological order
  const labels = reversed.map(r => r.date);
  const prices = reversed.map(r => r.close);
  const rsis = reversed.map(r => r.rsi);

  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }

  const ctx = canvas.getContext('2d');

  if (state.stockChartMode === 'candle') {
    // Candlestick Mode: OHLC floating bars with high/low wicks + Wilder RSI secondary axis
    const opens = reversed.map(r => (r.open !== undefined && r.open !== null) ? r.open : r.close);
    const highs = reversed.map(r => (r.high !== undefined && r.high !== null) ? r.high : Math.max(r.close, r.open || r.close));
    const lows = reversed.map(r => (r.low !== undefined && r.low !== null) ? r.low : Math.min(r.close, r.open || r.close));
    const candleData = reversed.map((r, i) => [opens[i], r.close]);
    const wickColors = reversed.map((r, i) => r.close >= opens[i] ? '#10b981' : '#ef4444');

    state.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${symbol} Candlestick (₹)`,
            data: candleData,
            backgroundColor: reversed.map((r, i) => r.close >= opens[i] ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'),
            borderColor: reversed.map((r, i) => r.close >= opens[i] ? '#059669' : '#dc2626'),
            borderWidth: 1,
            isCandle: true,
            highs: highs,
            lows: lows,
            wickColors: wickColors,
            barPercentage: 0.7,
            categoryPercentage: 0.9,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: `${symbol} 14-Day Wilder RSI`,
            data: rsis,
            borderColor: '#f59e0b',
            borderDash: [4, 4],
            pointRadius: 2,
            tension: 0.2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8' }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  const i = context.dataIndex;
                  return [
                    `Open: ₹${opens[i].toLocaleString('en-IN')}`,
                    `High: ₹${highs[i].toLocaleString('en-IN')}`,
                    `Low: ₹${lows[i].toLocaleString('en-IN')}`,
                    `Close: ₹${reversed[i].close.toLocaleString('en-IN')}`
                  ];
                }
                return `14D RSI: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 12 },
            grid: { color: 'rgba(51, 65, 85, 0.2)' }
          },
          y: {
            type: 'linear',
            position: 'left',
            ticks: {
              color: '#38bdf8',
              callback: val => '₹' + val.toLocaleString('en-IN')
            },
            grid: { color: 'rgba(51, 65, 85, 0.3)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            ticks: { color: '#f59e0b' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  } else {
    // Line Mode: Price & RSI Dual Chart (Screenshot 5)
    state.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${symbol} Close Price (₹)`,
            data: prices,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true,
            tension: 0.2,
            yAxisID: 'y'
          },
          {
            label: `${symbol} 14-Day RSI`,
            data: rsis,
            borderColor: '#f59e0b',
            borderDash: [4, 4],
            tension: 0.2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8' }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 12 },
            grid: { color: 'rgba(51, 65, 85, 0.2)' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              color: '#38bdf8',
              callback: val => '₹' + val.toLocaleString('en-IN')
            },
            grid: { color: 'rgba(51, 65, 85, 0.3)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            ticks: { color: '#f59e0b' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
}

// 4. Market Dates Chart
function renderMarketDatesView() {
  const container = document.getElementById('market-dates-summary');
  const marketData = window.MARKET_DATES_DATA || [];
  if (container) {
    container.innerText = `${marketData.length} Market Sessions Tracked (${marketData[0]?.date || '2016'} to ${marketData[marketData.length - 1]?.date || '2026'})`;
  }
}

function renderMarketDatesChart() {
  const canvas = document.getElementById('market-dates-chart');
  if (!canvas) return;

  const marketData = window.MARKET_DATES_DATA || [];
  const dates = marketData.map(d => d.date);
  const closes = marketData.map(d => d.close);
  const volumes = marketData.map(d => d.volume);

  if (state.charts.marketChart) {
    state.charts.marketChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  state.charts.marketChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Market Benchmark Close',
          data: closes,
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          yAxisID: 'y'
        },
        {
          label: 'Trading Volume',
          type: 'bar',
          data: volumes,
          backgroundColor: 'rgba(99, 102, 241, 0.35)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxTicksLimit: 14 },
          grid: { color: 'rgba(51, 65, 85, 0.2)' }
        },
        y: {
          position: 'left',
          ticks: { color: '#10b981' },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        y1: {
          position: 'right',
          ticks: { color: '#818cf8' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

// Futuristic Brand Emblem & Sector Identifier (Screenshot 1: Futuristic Cyber Card)
function getStockFuturisticProfile(symbol, universe, source, stockMeta = {}) {
  const sym = (symbol || '').toUpperCase().trim();
  
  const profiles = {
    'PETRONET': { emoji: '🔥', text: 'PET', bg: 'from-cyan-500 to-blue-700', sector: 'LNG & Gas Logistics • Breakout Buy' },
    'ORIENTELEC': { emoji: '⚡', text: 'OEL', bg: 'from-amber-400 to-orange-600', sector: 'Electrical Consumer • Breakout Buy' },
    'SBICARD': { emoji: '💳', text: 'SBI', bg: 'from-sky-500 to-blue-700', sector: 'Credit Cards & Fintech • Breakout Buy' },
    'RELIANCE': { emoji: '👑', text: 'RIL', bg: 'from-blue-600 to-indigo-900', sector: 'Energy & Telecom • NIFTY 50' },
    'TCS': { emoji: '💻', text: 'TCS', bg: 'from-purple-600 to-indigo-800', sector: 'IT Services • NIFTY 50' },
    'INFY': { emoji: '🚀', text: 'INF', bg: 'from-blue-500 to-cyan-600', sector: 'IT Consulting • NIFTY 50' },
    'HDFCBANK': { emoji: '🏦', text: 'HDFC', bg: 'from-blue-900 to-rose-700', sector: 'Private Banking • NIFTY 50' },
    'ICICIBANK': { emoji: '🏛️', text: 'ICICI', bg: 'from-orange-600 to-amber-700', sector: 'Private Banking • NIFTY 50' },
    'SBIN': { emoji: '🏛️', text: 'SBI', bg: 'from-sky-500 to-blue-700', sector: 'PSU Banking • NIFTY 50' },
    'TATAMOTORS': { emoji: '🚗', text: 'TATA', bg: 'from-blue-700 to-slate-900', sector: 'Automotive & EV • NIFTY 50' },
    'TATASTEEL': { emoji: '🏗️', text: 'STEEL', bg: 'from-slate-600 to-cyan-800', sector: 'Steel & Materials • NIFTY 50' },
    'BHARTIARTL': { emoji: '📡', text: 'AIR', bg: 'from-rose-600 to-red-800', sector: 'Telecom 5G • NIFTY 50' },
    'ITC': { emoji: '🌿', text: 'ITC', bg: 'from-emerald-600 to-teal-800', sector: 'FMCG & Hotels • NIFTY 50' },
    'LT': { emoji: '⚙️', text: 'L&T', bg: 'from-amber-600 to-slate-800', sector: 'Engineering & Infra • NIFTY 50' },
    'CIPLA': { emoji: '💊', text: 'CIP', bg: 'from-teal-500 to-emerald-700', sector: 'Pharma & Healthcare • NIFTY 50' },
    'HEROMOTOCO': { emoji: '🏍️', text: 'HERO', bg: 'from-red-600 to-slate-800', sector: '2-Wheelers • NIFTY 50' },
    'GOLDBEES': { emoji: '🪙', text: 'GOLD', bg: 'from-amber-400 to-yellow-600', sector: 'Physical Gold • Commodity ETF' },
    'SILVERBEES': { emoji: '🥈', text: 'SLVR', bg: 'from-slate-300 to-slate-600', sector: 'Physical Silver • Commodity ETF' },
    'NIFTYBEES': { emoji: '📈', text: 'NIFTY', bg: 'from-emerald-500 to-cyan-700', sector: 'NIFTY 50 Index • Benchmark ETF' },
    'BANKBEES': { emoji: '🏦', text: 'BANK', bg: 'from-blue-600 to-indigo-800', sector: 'Bank Nifty • Sectoral ETF' },
    'ITBEES': { emoji: '💻', text: 'IT', bg: 'from-purple-500 to-blue-700', sector: 'Nifty IT Index • Sectoral ETF' }
  };

  if (profiles[sym]) {
    return profiles[sym];
  }

  let emoji = '📊';
  if (sym.includes('BEES') || sym.includes('ETF')) emoji = '📦';
  else if (sym.includes('BANK')) emoji = '🏦';
  else if (sym.includes('TECH') || sym.includes('IT')) emoji = '💻';
  else if (sym.includes('POWER') || sym.includes('ENERGY')) emoji = '⚡';
  else if (sym.includes('AUTO') || sym.includes('MOTOR')) emoji = '🚗';
  else if (sym.includes('PHARMA') || sym.includes('LAB')) emoji = '💊';

  const gradients = [
    'from-cyan-600 to-blue-800',
    'from-emerald-600 to-teal-800',
    'from-purple-600 to-indigo-900',
    'from-amber-500 to-orange-700',
    'from-rose-600 to-pink-800',
    'from-sky-500 to-indigo-700'
  ];
  const charCodeSum = sym.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = gradients[charCodeSum % gradients.length];

  const next50List = (window.NIFTY_NEXT_50_DATA || []).map(x => x.symbol);
  const isN50Next = universe === 'next50' || next50List.includes(sym);
  const indexTag = isN50Next ? 'NIFTY NEXT 50' : (sym.includes('BEES') || sym.includes('ETF') ? 'NIFTY ETF' : 'NIFTY 50');

  let sector = indexTag;
  if (stockMeta.category) {
    sector = `${stockMeta.category} • ${indexTag}`;
  } else if (source === 'breakout') {
    sector = `${indexTag} • Breakout Buy`;
  }

  return {
    emoji,
    text: sym.slice(0, 4),
    bg,
    sector,
    indexTag
  };
}


// 5. Stock Modal Analyzer (Google Finance Style Candlestick & Volume Terminal)
async function openStockModal(symbol, universe = 'nifty50', source = null) {
  const modal = document.getElementById('stock-modal');
  if (!modal) return;

  // 1. Locate stock metadata from all available datasets
  let stockMeta = null;
  const breakoutList = window.BREAKOUT_BUYS_DATA || [];
  const top500List = window.TOP_500_STOCKS_DATA || [];
  const n50List = window.NIFTY_50_DATA || [];
  const next50List = window.NIFTY_NEXT_50_DATA || [];
  const etfList = window.ETF_DATA || [];

  if (universe === 'breakout' || source === 'breakout') {
    stockMeta = breakoutList.find(s => s.symbol === symbol) || top500List.find(s => s.symbol === symbol);
  } else if (universe === 'top500') {
    stockMeta = top500List.find(s => s.symbol === symbol) || breakoutList.find(s => s.symbol === symbol);
  } else if (universe === 'nifty50') {
    stockMeta = n50List.find(s => s.symbol === symbol);
  } else if (universe === 'next50') {
    stockMeta = next50List.find(s => s.symbol === symbol);
  } else if (universe === 'etf') {
    stockMeta = etfList.find(s => s.symbol === symbol);
  }

  // Fallback search across all lists
  if (!stockMeta) {
    stockMeta = breakoutList.find(s => s.symbol === symbol)
      || n50List.find(s => s.symbol === symbol)
      || next50List.find(s => s.symbol === symbol)
      || top500List.find(s => s.symbol === symbol)
      || etfList.find(s => s.symbol === symbol)
      || {};
  }

  state.currentStockModalSymbol = symbol;
  state.currentStockModalUniverse = universe;
  state.currentStockModalSource = source;
  state.stockTimeframe = state.stockTimeframe || '1D';

  // 2. Title & Ticker
  const titleEl = document.getElementById('modal-stock-title');
  const codeEl = document.getElementById('modal-stock-code');
  if (titleEl) titleEl.innerText = symbol;
  if (codeEl) codeEl.innerText = stockMeta.code || `NSE:${symbol}`;
  syncModalWatchlistButton(symbol);

  // 3. Price & Day Change
  const priceVal = stockMeta.live_price || stockMeta.price || stockMeta.sheet_cmp || stockMeta.cmp || null;
  const priceEl = document.getElementById('modal-stock-price');
  if (priceEl) priceEl.innerText = priceVal ? `₹${priceVal.toLocaleString('en-IN')}` : '₹--';

  const chgEl = document.getElementById('modal-stock-change');
  if (chgEl) {
    if (stockMeta.change !== undefined && stockMeta.change !== null) {
      const isPos = stockMeta.change >= 0;
      const sign = stockMeta.change > 0 ? '+' : '';
      const pctStr = stockMeta.change_pct !== undefined ? `${sign}${stockMeta.change_pct}%` : '';
      chgEl.className = isPos ? 'text-sm font-bold text-emerald-400' : 'text-sm font-bold text-rose-400';
      chgEl.innerText = `${isPos ? '▲' : '▼'} ${pctStr} (${sign}${stockMeta.change}) Today`;
    } else {
      chgEl.innerText = '--';
      chgEl.className = 'text-sm font-bold text-slate-400';
    }
  }

  // 4. Timestamp
  const updatedEl = document.getElementById('modal-stock-updated');
  if (updatedEl) {
    const timeStr = format12HrTime(stockMeta.last_updated || new Date());
    updatedEl.innerText = `${timeStr} IST • INR`;
  }

  // 5. Dynamic Genuine Status Badge (Verified 4-Tier Breakout / Radar / ETF)
  const statusEl = document.getElementById('modal-stock-status');
  if (statusEl) {
    const signalInfo = getStockSignalInfo(stockMeta, universe, source);
    statusEl.innerHTML = signalInfo.modalBadgeHtml;
  }

  // 6. RSI, 52W High Discount, 52W Low Buffer & Futuristic Profile
  const profile = getStockFuturisticProfile(symbol, universe, source, stockMeta);
  const emblemEl = document.getElementById('modal-stock-emblem');
  const iconEmojiEl = document.getElementById('modal-stock-icon-emoji');
  const emblemTextEl = document.getElementById('modal-stock-emblem-text');
  const catPillEl = document.getElementById('modal-stock-category-pill');
  const extLinkEl = document.getElementById('modal-external-link');

  if (emblemEl) {
    emblemEl.className = `w-full h-full rounded-full flex flex-col items-center justify-center font-black text-white text-base sm:text-lg tracking-wider bg-gradient-to-br ${profile.bg} shadow-inner`;
  }
  if (iconEmojiEl) iconEmojiEl.innerText = profile.emoji;
  if (emblemTextEl) emblemTextEl.innerText = profile.text;
  if (catPillEl) catPillEl.innerText = profile.sector;
  if (extLinkEl) extLinkEl.href = `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}:NSE`;

  const rsiEl = document.getElementById('modal-stock-rsi');
  const rsiZoneEl = document.getElementById('modal-stock-rsi-zone');
  if (rsiEl) {
    rsiEl.innerText = stockMeta.rsi !== null && stockMeta.rsi !== undefined ? stockMeta.rsi : '--';
    rsiEl.style.color = getRsiColor(stockMeta.rsi);
  }
  if (rsiZoneEl) {
    const rsi = stockMeta.rsi;
    if (rsi === null || rsi === undefined) {
      rsiZoneEl.innerText = 'Awaiting Data';
      rsiZoneEl.className = 'text-[10px] text-slate-400 font-semibold mt-0.5';
    } else if (rsi <= 30) {
      rsiZoneEl.innerText = '🚨 Extreme Oversold';
      rsiZoneEl.className = 'text-[10px] text-rose-400 font-semibold mt-0.5';
    } else if (rsi <= 35) {
      rsiZoneEl.innerText = '💎 Value Accumulation';
      rsiZoneEl.className = 'text-[10px] text-emerald-400 font-semibold mt-0.5';
    } else if (rsi <= 55) {
      rsiZoneEl.innerText = '⚖️ Neutral / Recovery';
      rsiZoneEl.className = 'text-[10px] text-cyan-400 font-semibold mt-0.5';
    } else if (rsi <= 70) {
      rsiZoneEl.innerText = '🚀 Bullish Momentum';
      rsiZoneEl.className = 'text-[10px] text-blue-400 font-semibold mt-0.5';
    } else {
      rsiZoneEl.innerText = '🔥 Overbought Alert';
      rsiZoneEl.className = 'text-[10px] text-purple-400 font-semibold mt-0.5';
    }
  }

  const discEl = document.getElementById('modal-stock-disc');
  if (discEl) {
    discEl.innerText = stockMeta.discount_from_high !== null && stockMeta.discount_from_high !== undefined
      ? `${stockMeta.discount_from_high}%`
      : '--';
  }

  const bufEl = document.getElementById('modal-stock-buf');
  if (bufEl) {
    bufEl.innerText = stockMeta.buffer_from_low !== null && stockMeta.buffer_from_low !== undefined
      ? `+${stockMeta.buffer_from_low}%`
      : '--';
  }

  // 7. Sync Angel One TradeOne Launch Button & Checkbox
  const angelBtn = document.getElementById('modal-angel-one-btn');
  if (angelBtn) {
    angelBtn.href = `https://www.angelone.in/trade/tradeone/chart`;
    angelBtn.innerHTML = `<span>🚀 Open ${symbol} in Angel One Chart</span> <span class="text-xs">↗</span>`;
  }
  const chkAngel = document.getElementById('chk-angel-direct');
  if (chkAngel) {
    chkAngel.checked = (localStorage.getItem('manoj_inspect_mode') === 'angelone');
  }

  // 8. Show Modal
  modal.classList.remove('hidden');

  // Highlight timeframe button
  document.querySelectorAll('.stock-tf-btn').forEach(btn => {
    if (btn.innerText.trim().toUpperCase() === (state.stockTimeframe || '1D').toUpperCase()) {
      btn.className = 'stock-tf-btn active px-2.5 py-1 rounded bg-cyan-600 text-white font-bold transition-all';
    } else {
      btn.className = 'stock-tf-btn px-2.5 py-1 rounded text-slate-400 hover:text-white transition-all';
    }
  });

  // Reset chart mode button styling
  setStockChartMode(state.stockChartMode || 'candle');

  // 8. Load Google Finance Candlestick data & render
  await loadStockChart(symbol, state.stockTimeframe || '1D');
}

function closeStockModal() {
  const modal = document.getElementById('stock-modal');
  if (modal) modal.classList.add('hidden');
  if (state.charts.modalChart) {
    state.charts.modalChart.destroy();
    state.charts.modalChart = null;
  }
  if (state.charts.modalSubChart) {
    state.charts.modalSubChart.destroy();
    state.charts.modalSubChart = null;
  }
}

function setStockTimeframe(tf) {
  state.stockTimeframe = tf;
  document.querySelectorAll('.stock-tf-btn').forEach(btn => {
    if (btn.innerText.trim().toUpperCase() === tf.toUpperCase()) {
      btn.className = 'stock-tf-btn active px-2.5 py-1 rounded bg-cyan-600 text-white font-bold transition-all';
    } else {
      btn.className = 'stock-tf-btn px-2.5 py-1 rounded text-slate-400 hover:text-white transition-all';
    }
  });
  if (state.currentStockModalSymbol) {
    loadStockChart(state.currentStockModalSymbol, tf);
  }
}

async function loadStockChart(symbol, timeframe = '1D') {
  const canvas = document.getElementById('modal-chart-canvas');
  if (!canvas) return;

  const tf = (timeframe || '1D').toLowerCase();
  let chartData = null;

  try {
    const res = await fetch(`${API_BASE}/api/chart?symbol=${encodeURIComponent(symbol)}&range=${tf}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.candles && json.candles.length > 0) {
        chartData = json;
      }
    }
  } catch (err) {
    console.warn('[StockChart] API fetch failed, falling back to local dataset', err);
  }

  // Fallback if API returned nothing or offline
  if (!chartData || !chartData.candles || chartData.candles.length === 0) {
    chartData = generateClientStockFallback(symbol, timeframe);
  }

  state.currentStockChartData = chartData;

  // Sync header live price & day change from latest candle data
  if (chartData.price) {
    const pEl = document.getElementById('modal-stock-price');
    if (pEl) pEl.innerText = `₹${Number(chartData.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (chartData.change !== undefined && chartData.change !== null) {
    const chgEl = document.getElementById('modal-stock-change');
    if (chgEl) {
      const isPos = chartData.change >= 0;
      const sign = chartData.change > 0 ? '+' : '';
      const pctStr = chartData.change_pct !== undefined ? `${sign}${chartData.change_pct.toFixed(2)}%` : '';
      chgEl.className = isPos ? 'text-sm font-bold text-emerald-400' : 'text-sm font-bold text-rose-400';
      chgEl.innerText = `${isPos ? '▲' : '▼'} ${pctStr} (${sign}${Number(chartData.change).toFixed(2)}) Today`;
    }
  }
  if (chartData.last_updated) {
    const upEl = document.getElementById('modal-stock-updated');
    if (upEl) upEl.innerText = `${format12HrTime(chartData.last_updated)} IST • INR`;
  }

  // Render chart in current mode
  if (state.stockChartMode === 'line') {
    renderStockLineAndRsiChart(symbol, chartData);
  } else {
    renderGoogleFinanceCandleChart(chartData);
  }
}

function generateClientStockFallback(symbol, timeframe) {
  const breakoutList = window.BREAKOUT_BUYS_DATA || [];
  const top500List = window.TOP_500_STOCKS_DATA || [];
  const n50 = window.NIFTY_50_DATA || [];
  const next50 = window.NIFTY_NEXT_50_DATA || [];
  const s = breakoutList.find(x => x.symbol === symbol) 
    || top500List.find(x => x.symbol === symbol)
    || n50.find(x => x.symbol === symbol)
    || next50.find(x => x.symbol === symbol) || {};

  const price = s.live_price || s.price || s.cmp || s.sheet_cmp || 250;
  const prev_close = s.prev_close || (price * 0.995);
  const day_open = s.day_open || (price * 0.998);
  const day_high = s.day_high || (price * 1.015);
  const day_low = s.day_low || (price * 0.985);
  const change = s.change !== undefined ? s.change : +(price - prev_close).toFixed(2);
  const change_pct = s.change_pct !== undefined ? s.change_pct : +(((price - prev_close) / prev_close) * 100).toFixed(2);

  const count = 75;
  const candles = [];
  for (let i = 0; i < count; i++) {
    const factor = i / (count - 1);
    const noise = Math.sin(i / 5) * (day_high - day_low) * 0.25;
    const c = +(day_open + (price - day_open) * factor + noise).toFixed(2);
    const o = +(c - Math.sin(i) * (day_high - day_low) * 0.1).toFixed(2);
    const h = +(Math.max(o, c) + Math.abs(Math.cos(i) * (day_high - day_low) * 0.08)).toFixed(2);
    const l = +(Math.min(o, c) - Math.abs(Math.sin(i) * (day_high - day_low) * 0.08)).toFixed(2);
    const hour = 9 + Math.floor((15 + i * 5) / 60);
    const minute = (15 + i * 5) % 60;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const dh = hour > 12 ? hour - 12 : hour;
    const tStr = `${dh < 10 ? '0' : ''}${dh}:${minute < 10 ? '0' : ''}${minute} ${ampm}`;
    const vol = Math.floor(Math.abs(Math.sin(i) * 15000) + 5000);
    candles.push({ time: tStr, open: o, high: h, low: l, close: c, volume: vol });
  }

  const closes = candles.map(c => c.close);
  const sma5 = closes.map((_, i) => {
    const sub = i < 4 ? closes.slice(0, i + 1) : closes.slice(i - 4, i + 1);
    return +(sub.reduce((a, b) => a + b, 0) / sub.length).toFixed(2);
  });

  return {
    status: 'fallback',
    symbol: symbol,
    ticker: s.code || `NSE:${symbol}`,
    price: price,
    prev_close: prev_close,
    day_open: day_open,
    day_high: day_high,
    day_low: day_low,
    change: change,
    change_pct: change_pct,
    candles: candles,
    sma5: sma5,
    last_updated: '03:30:00 PM'
  };
}

function renderGoogleFinanceCandleChart(chartData) {
  const canvas = document.getElementById('modal-chart-canvas');
  if (!canvas) return;

  const candles = chartData.candles || [];
  if (candles.length === 0) return;

  if (state.charts.modalChart) {
    state.charts.modalChart.destroy();
  }

  // Calculate or obtain SuperTrend (10, 3.0)
  const supertrend = (chartData.supertrend && chartData.supertrend.values && chartData.supertrend.values.length > 0)
    ? chartData.supertrend
    : computeSuperTrendJS(candles, 10, 3.0);

  const stValues = supertrend.values || [];
  const stTrends = supertrend.trends || [];
  const curStTrend = supertrend.current_trend || 'BULLISH';
  const curStVal = supertrend.current_value;

  // Update Toolbar SuperTrend badge
  const stBadge = document.getElementById('modal-supertrend-badge');
  if (stBadge) {
    if (curStTrend === 'BULLISH') {
      stBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500 flex items-center gap-1.5 shadow-sm';
      stBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> 🟢 SuperTrend Bullish (₹${curStVal ? curStVal.toLocaleString('en-IN') : '--'})`;
    } else {
      stBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500 flex items-center gap-1.5 shadow-sm';
      stBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> 🔴 SuperTrend Bearish (₹${curStVal ? curStVal.toLocaleString('en-IN') : '--'})`;
    }
  }

  const labels = candles.map(c => c.time);
  const candleBars = candles.map(c => {
    const o = c.open;
    const cl = c.close;
    if (Math.abs(o - cl) < 0.05) {
      return [o - 0.05, cl + 0.05];
    }
    return [Math.min(o, cl), Math.max(o, cl)];
  });
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const bgColors = candles.map(c => c.close >= c.open ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)');
  const borderColors = candles.map(c => c.close >= c.open ? '#059669' : '#dc2626');
  const wickColors = candles.map(c => c.close >= c.open ? '#10b981' : '#ef4444');

  const prevClose = chartData.prev_close || (candles[0] ? candles[0].open : null);
  const prevCloseLine = candles.map(() => prevClose);

  // Auto-scale Y-axis min and max so candlesticks occupy the full vertical middle of the canvas
  const allPricePoints = [];
  highs.forEach(h => { if (typeof h === 'number' && !isNaN(h)) allPricePoints.push(h); });
  lows.forEach(l => { if (typeof l === 'number' && !isNaN(l)) allPricePoints.push(l); });
  stValues.forEach(v => { if (typeof v === 'number' && !isNaN(v) && v > 0) allPricePoints.push(v); });
  if (typeof prevClose === 'number' && !isNaN(prevClose) && prevClose > 0) allPricePoints.push(prevClose);
  (chartData.sma5 || []).forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPricePoints.push(v); });

  let yMin = 0;
  let yMax = 100;
  if (allPricePoints.length > 0) {
    const lowest = Math.min(...allPricePoints);
    const highest = Math.max(...allPricePoints);
    const diff = highest - lowest;
    const pad = diff > 0 ? Math.max(diff * 0.12, highest * 0.005) : (highest * 0.02 || 2);
    yMin = Math.max(0, +(lowest - pad).toFixed(2));
    yMax = +(highest + pad).toFixed(2);
  }

  const ctx = canvas.getContext('2d');
  state.charts.modalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: `${chartData.symbol} Candlestick`,
          data: candleBars,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          isCandle: true,
          highs: highs,
          lows: lows,
          wickColors: wickColors,
          barPercentage: 0.7,
          categoryPercentage: 0.85,
          order: 2
        },
        {
          type: 'line',
          label: 'SuperTrend (10, 3)',
          data: stValues,
          borderColor: curStTrend === 'BULLISH' ? '#10b981' : '#ef4444',
          segment: {
            borderColor: (ctx) => {
              const idx = ctx.p1DataIndex;
              return (stTrends[idx] === 1 || stTrends[idx - 1] === 1) ? '#10b981' : '#ef4444';
            }
          },
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.15,
          order: 1
        },
        {
          type: 'line',
          label: 'Moving average (SMA-5)',
          data: chartData.sma5 || [],
          borderColor: '#f59e0b',
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.2,
          order: 3
        },
        {
          type: 'line',
          label: 'Prev. close line',
          data: prevCloseLine,
          borderColor: '#94a3b8',
          borderDash: [4, 4],
          borderWidth: 1.2,
          pointRadius: 0,
          order: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { size: 11 },
            boxWidth: 12,
            filter: (item) => !item.text.includes('Candlestick')
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          titleColor: '#e2e8f0',
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              return `${chartData.symbol} • ${candles[i]?.time || ''}`;
            },
            label: (context) => {
              if (context.dataset.isCandle) {
                const i = context.dataIndex;
                const c = candles[i];
                if (!c) return '';
                const chg = +(c.close - c.open).toFixed(2);
                const chgSign = chg >= 0 ? '+' : '';
                return [
                  `Open:   ₹${c.open.toLocaleString('en-IN')}`,
                  `High:   ₹${c.high.toLocaleString('en-IN')}`,
                  `Low:    ₹${c.low.toLocaleString('en-IN')}`,
                  `Close:  ₹${c.close.toLocaleString('en-IN')} (${chgSign}${chg})`,
                  `Volume: ${c.volume.toLocaleString('en-IN')}`
                ];
              }
              if (context.dataset.label && context.dataset.label.includes('SuperTrend') && context.parsed.y) {
                const i = context.dataIndex;
                const tr = stTrends[i] === 1 ? 'Bullish (Support)' : 'Bearish (Resistance)';
                return `SuperTrend (10, 3): ₹${Number(context.parsed.y).toLocaleString('en-IN')} [${tr}]`;
              }
              if (context.dataset.label && context.dataset.label.includes('SMA-5') && context.parsed.y) {
                return `SMA-5: ₹${context.parsed.y.toLocaleString('en-IN')}`;
              }
              if (context.dataset.label && context.dataset.label.includes('Prev. close') && context.parsed.y) {
                return `Prev Close: ₹${context.parsed.y.toLocaleString('en-IN')}`;
              }
              return `${context.dataset.label}: ₹${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.2)' }
        },
        y: {
          type: 'linear',
          position: 'right',
          min: yMin,
          max: yMax,
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: val => '₹' + Number(val).toLocaleString('en-IN')
          },
          grid: { color: 'rgba(51, 65, 85, 0.25)' }
        }
      }
    }
  });

  // Render Volume Sub-chart (Screenshot 3)
  renderStockSubchartVolume(chartData);
}

function renderStockSubchartVolume(chartData) {
  const subCanvas = document.getElementById('modal-subchart-canvas');
  if (!subCanvas) return;

  const candles = chartData.candles || [];
  if (candles.length === 0) return;

  if (state.charts.modalSubChart) {
    state.charts.modalSubChart.destroy();
  }

  const labels = candles.map(c => c.time);
  const volumes = candles.map(c => c.volume);
  const colors = candles.map(c => c.close >= c.open ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)');
  const borderColors = candles.map(c => c.close >= c.open ? '#059669' : '#dc2626');

  const subCtx = subCanvas.getContext('2d');
  state.charts.modalSubChart = new Chart(subCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Volume',
          data: volumes,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1,
          barPercentage: 0.65,
          categoryPercentage: 0.85
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => `Volume: ${ctx.parsed.y.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 9 } },
          grid: { display: false }
        },
        y: {
          position: 'right',
          ticks: {
            color: '#64748b',
            font: { size: 9 },
            callback: val => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
          },
          grid: { color: 'rgba(51, 65, 85, 0.15)' }
        }
      }
    }
  });
}

function renderStockLineAndRsiChart(symbol, chartData) {
  const canvas = document.getElementById('modal-chart-canvas');
  if (!canvas) return;

  const candles = chartData.candles || [];
  if (candles.length === 0) return;

  if (state.charts.modalChart) {
    state.charts.modalChart.destroy();
  }
  if (state.charts.modalSubChart) {
    state.charts.modalSubChart.destroy();
  }

  const labels = candles.map(c => c.time);
  const prices = candles.map(c => c.close);
  const prevClose = chartData.prev_close || (candles[0] ? candles[0].open : null);
  const prevCloseLine = candles.map(() => prevClose);

  // Auto-scale Y-axis min/max
  const allPricePoints = [...prices];
  if (typeof prevClose === 'number' && !isNaN(prevClose) && prevClose > 0) allPricePoints.push(prevClose);
  (chartData.sma5 || []).forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPricePoints.push(v); });

  let yMin = 0;
  let yMax = 100;
  if (allPricePoints.length > 0) {
    const lowest = Math.min(...allPricePoints);
    const highest = Math.max(...allPricePoints);
    const diff = highest - lowest;
    const pad = diff > 0 ? Math.max(diff * 0.12, highest * 0.005) : (highest * 0.02 || 2);
    yMin = Math.max(0, +(lowest - pad).toFixed(2));
    yMax = +(highest + pad).toFixed(2);
  }

  const ctx = canvas.getContext('2d');
  state.charts.modalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `${symbol} Price (₹)`,
          data: prices,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 1
        },
        {
          label: 'Moving Average (SMA-5)',
          data: chartData.sma5 || [],
          borderColor: '#f59e0b',
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.2
        },
        {
          label: 'Prev. Close',
          data: prevCloseLine,
          borderColor: '#94a3b8',
          borderDash: [4, 4],
          borderWidth: 1.2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#94a3b8', font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.2)' }
        },
        y: {
          type: 'linear',
          position: 'right',
          min: yMin,
          max: yMax,
          ticks: {
            color: '#38bdf8',
            font: { size: 10 },
            callback: val => '₹' + Number(val).toLocaleString('en-IN')
          },
          grid: { color: 'rgba(51, 65, 85, 0.25)' }
        }
      }
    }
  });

  // Subchart: Wilder RSI line
  const subCanvas = document.getElementById('modal-subchart-canvas');
  if (subCanvas) {
    const subCtx = subCanvas.getContext('2d');
    const rsis = [];
    let gains = 0, losses = 0;
    const period = 14;
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        rsis.push(50);
        continue;
      }
      const diff = prices[i] - prices[i - 1];
      if (i <= period) {
        if (diff >= 0) gains += diff; else losses -= diff;
        if (i === period) {
          const avgG = gains / period;
          const avgL = losses / period;
          const rs = avgL === 0 ? 100 : avgG / avgL;
          rsis.push(+(100 - (100 / (1 + rs))).toFixed(1));
        } else {
          rsis.push(50);
        }
      } else {
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        gains = (gains * (period - 1) + gain) / period;
        losses = (losses * (period - 1) + loss) / period;
        const rs = losses === 0 ? 100 : gains / losses;
        rsis.push(+(100 - (100 / (1 + rs))).toFixed(1));
      }
    }

    state.charts.modalSubChart = new Chart(subCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '14-Day RSI',
            data: rsis,
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.2
          },
          {
            label: 'Oversold (35)',
            data: labels.map(() => 35),
            borderColor: '#10b981',
            borderDash: [3, 3],
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: 'Overbought (70)',
            data: labels.map(() => 70),
            borderColor: '#ef4444',
            borderDash: [3, 3],
            borderWidth: 1,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            display: true,
            ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 9 } },
            grid: { display: false }
          },
          y: {
            position: 'right',
            min: 10,
            max: 90,
            ticks: { color: '#f59e0b', font: { size: 9 }, stepSize: 20 },
            grid: { color: 'rgba(51, 65, 85, 0.15)' }
          }
        }
      }
    });
  }
}

// 6. "Vihaan Stock Market Dashboard" ₹5,000 -> ₹2 Crore Compounding Calculator (Curated by Manoj Mane)
function initCompoundingCalculator() {
  const capitalInput = document.getElementById('calc-capital-input');
  const profitInput = document.getElementById('calc-profit-input');
  const tradesInput = document.getElementById('calc-trades-input');

  const updateSim = () => {
    const capital = parseFloat(capitalInput.value) || 5000;
    const profitPct = parseFloat(profitInput.value) || 3.5;
    const trades = parseInt(tradesInput.value, 10) || 50;

    let balance = capital;
    const tableBody = document.getElementById('compounding-table-body');
    const rows = [];

    for (let t = 1; t <= trades; t++) {
      const profit = balance * (profitPct / 100);
      balance += profit;
      if (t <= 20 || t % 10 === 0 || t === trades || t === 338) {
        rows.push(`
          <tr class="border-b border-slate-800 text-xs">
            <td class="py-2 px-3 text-slate-400 font-bold">Trade #${t}</td>
            <td class="py-2 px-3 text-right font-mono text-emerald-400">+₹${Math.round(profit).toLocaleString('en-IN')}</td>
            <td class="py-2 px-3 text-right font-mono text-white font-bold">₹${Math.round(balance).toLocaleString('en-IN')}</td>
          </tr>
        `);
      }
    }

    if (tableBody) tableBody.innerHTML = rows.join('');
    document.getElementById('calc-final-balance').innerText = `₹${Math.round(balance).toLocaleString('en-IN')}`;
    
    // Estimate trades to 2 Crore
    const tradesTo2Cr = Math.ceil(Math.log(20000000 / capital) / Math.log(1 + (profitPct / 100)));
    document.getElementById('calc-trades-to-2cr').innerText = `${tradesTo2Cr} Trades`;
  };

  if (capitalInput) capitalInput.addEventListener('input', updateSim);
  if (profitInput) profitInput.addEventListener('input', updateSim);
  if (tradesInput) tradesInput.addEventListener('input', updateSim);
  updateSim();
}

// 7. Search and Filter Event Listeners
function initSearchAndFilters() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderNifty50Table();
      renderNext50Table();
    });
  }

  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('bg-cyan-500', 'text-slate-950', 'font-bold'));
      btn.classList.add('bg-cyan-500', 'text-slate-950', 'font-bold');
      state.filterSignal = btn.getAttribute('data-filter');
      renderNifty50Table();
      renderNext50Table();
    });
  });

  // Top 500 Search
  const top500Search = document.getElementById('top500-search');
  if (top500Search) {
    top500Search.addEventListener('input', (e) => {
      state.top500SearchQuery = e.target.value;
      renderTop500Table();
    });
  }

  // Top 500 Filter Buttons
  const top500FilterBtns = document.querySelectorAll('.top500-filter-btn');
  top500FilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      top500FilterBtns.forEach(b => {
        b.classList.remove('bg-cyan-500', 'text-slate-950', 'font-bold');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.add('bg-cyan-500', 'text-slate-950', 'font-bold');
      btn.classList.remove('bg-slate-800', 'text-slate-300');
      state.top500Filter = btn.getAttribute('data-top500-filter');
      renderTop500Table();
    });
  });

  // Breakout Buys Sort Selector
  const sortSelect = document.getElementById('breakout-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBreakoutBuysTable(e.target.value);
    });
  }

  // ETF Shop Search
  const etfSearch = document.getElementById('etf-search');
  if (etfSearch) {
    etfSearch.addEventListener('input', (e) => {
      state.etfSearchQuery = e.target.value;
      renderEtfShopView();
    });
  }

  // ETF Shop Filter Buttons
  const etfFilterBtns = document.querySelectorAll('.etf-filter-btn');
  etfFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      etfFilterBtns.forEach(b => {
        b.classList.remove('bg-purple-600', 'text-white', 'font-bold', 'shadow');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.add('bg-purple-600', 'text-white', 'font-bold', 'shadow');
      btn.classList.remove('bg-slate-800', 'text-slate-300');
      state.etfFilter = btn.getAttribute('data-etf-filter');
      renderEtfShopView();
    });
  });
}

// 8. Excel & CSV Drag and Drop Updater (SheetJS Fallback)
function initDragAndDrop() {
  const dropzone = document.getElementById('excel-dropzone');
  const fileInput = document.getElementById('excel-file-input');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleUploadedExcel(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedExcel(e.target.files[0]);
    }
  });
}

function handleUploadedExcel(file) {
  const reader = new FileReader();
  const statusEl = document.getElementById('upload-status');
  if (statusEl) statusEl.innerText = `Processing custom file ${file.name}...`;

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      let updatedCount = 0;
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (sheetName.toLowerCase().includes('nifty 50') && !sheetName.toLowerCase().includes('next')) {
          jsonRows.slice(2).forEach(r => {
            if (r[0] && String(r[0]).startsWith('NSE:')) {
              const sym = String(r[0]).replace('NSE:', '').trim();
              const existing = (window.NIFTY_50_DATA || []).find(s => s.symbol === sym);
              if (existing && r[1] !== undefined) {
                existing.rsi = parseFloat(Number(r[1]).toFixed(2));
                existing.status = existing.rsi <= 35 ? 'Start Buying As Par Rules' : 'WAIT';
                updatedCount++;
              }
            }
          });
        }

        if (sheetName.toLowerCase().includes('next 50')) {
          jsonRows.slice(2).forEach(r => {
            if (r[0] && String(r[0]).startsWith('NSE:')) {
              const sym = String(r[0]).replace('NSE:', '').trim();
              const existing = (window.NIFTY_NEXT_50_DATA || []).find(s => s.symbol === sym);
              if (existing) {
                if (r[1] !== undefined) {
                  existing.rsi = parseFloat(Number(r[1]).toFixed(2));
                  existing.status = existing.rsi <= 35 ? 'Start Buying As Par Rules' : 'WAIT';
                }
                if (r[3] !== undefined) existing.pe = parseFloat(r[3]);
                if (r[4] !== undefined) existing.price = parseFloat(r[4]);
                if (r[5] !== undefined) existing.low52 = parseFloat(r[5]);
                if (r[6] !== undefined) existing.high52 = parseFloat(r[6]);
                updatedCount++;
              }
            }
          });
        }
      });

      renderAllViews();
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-emerald-400 font-semibold">✓ Successfully updated ${updatedCount} stocks from ${file.name}!</span>`;
      }
    } catch (err) {
      console.error(err);
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-rose-400 font-semibold">Error reading file: ${err.message}</span>`;
      }
    }
  };
  reader.readAsArrayBuffer(file);
}

// 9. Export Table to CSV
function exportCurrentTable() {
  const is50 = state.currentTab === 'nifty50';
  const data = is50 ? (window.NIFTY_50_DATA || []) : (window.NIFTY_NEXT_50_DATA || []);
  const filename = is50 ? 'Nifty_50_Live_RSI_Analysis.csv' : 'Nifty_Next_50_Live_RSI_Analysis.csv';

  let csvContent = "data:text/csv;charset=utf-8,";
  if (is50) {
    csvContent += "Symbol,Code,Price,Change_Pct,RSI,Status,52W_Low,52W_High\n";
    data.forEach(s => {
      csvContent += `${s.symbol},${s.code},${s.price || ''},${s.change_pct || ''},${s.rsi || ''},"${s.status}",${s.low52 || ''},${s.high52 || ''}\n`;
    });
  } else {
    csvContent += "Symbol,Code,Price,Change_Pct,RSI,Status,PE,52W_Low,52W_High,Discount_From_High_Pct\n";
    data.forEach(s => {
      csvContent += `${s.symbol},${s.code},${s.price || ''},${s.change_pct || ''},${s.rsi || ''},"${s.status}",${s.pe || ''},${s.low52 || ''},${s.high52 || ''},${s.discount_from_high || ''}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
