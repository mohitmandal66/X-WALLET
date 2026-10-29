/**
 * X-WALLET Engine
 * PIN Gate: 882235 with Screen NumPad
 * 2-Step Confirmation Today's Data Reset
 * Dual Histograms & True Personal Data Ledger
 */

const STORAGE_KEY = 'X_WALLET_PC_STORE_V5';
const AUTH_KEY = 'X_WALLET_AUTH_STATUS';
const VAULT_PIN = '882235';

// Strict zero dummy data store
const DEFAULT_STORE = {
  monthlyDeposits: [], // { month: 'YYYY-MM', date: 'YYYY-MM-DD', amount: 8000, note: '...' }
  expenses: [],        // { id: '...', date: 'YYYY-MM-DD', amount: 150, category: '...', note: '...' }
  diary: []            // { date: 'YYYY-MM-DD', tag: '...', text: '...' }
};

let appData = loadLocalVault();
let currentViewDate = new Date();
let selectedDateString = null;
let activeTimeframeDays = 30;

document.addEventListener('DOMContentLoaded', () => {
  initSecurity();
  initClock();
  setupEventListeners();
  checkDayOneStatus();
  renderAll();
});

/* ==========================================================================
   1. Security Lock & Responsive On-Screen NumPad (882235)
   ========================================================================== */
function initSecurity() {
  const isUnlocked = sessionStorage.getItem(AUTH_KEY) === 'true';
  const lockScreen = document.getElementById('lockScreen');
  const dashboard = document.getElementById('appDashboard');
  const pinInput = document.getElementById('vaultPasswordInput');
  const errorMsg = document.getElementById('lockErrorMsg');

  if (isUnlocked) {
    lockScreen.style.display = 'none';
    dashboard.style.display = 'block';
  } else {
    lockScreen.style.display = 'grid';
    dashboard.style.display = 'none';
  }

  // Handle On-Screen NumPad clicks & taps
  document.querySelectorAll('.np-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const action = btn.dataset.action;

      if (key !== undefined) {
        if (pinInput.value.length < 6) {
          pinInput.value += key;
        }
      } else if (action === 'clear') {
        pinInput.value = '';
        errorMsg.style.display = 'none';
      } else if (action === 'backspace') {
        pinInput.value = pinInput.value.slice(0, -1);
      }
    });
  });

  // Physical keyboard typing support
  window.addEventListener('keydown', (e) => {
    if (lockScreen.style.display !== 'none') {
      if (/^[0-9]$/.test(e.key)) {
        if (pinInput.value.length < 6) pinInput.value += e.key;
      } else if (e.key === 'Backspace') {
        pinInput.value = pinInput.value.slice(0, -1);
      } else if (e.key === 'Enter') {
        attemptUnlock();
      }
    }
  });

  document.getElementById('unlockSubmitBtn').addEventListener('click', attemptUnlock);

  function attemptUnlock() {
    if (pinInput.value === VAULT_PIN) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      lockScreen.style.display = 'none';
      dashboard.style.display = 'block';
      errorMsg.style.display = 'none';
      pinInput.value = '';
      renderAll();
    } else {
      errorMsg.style.display = 'block';
      pinInput.value = '';
    }
  }

  document.getElementById('relockBtn').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    lockScreen.style.display = 'grid';
    dashboard.style.display = 'none';
    pinInput.value = '';
  });
}

/* ==========================================================================
   Data Persistence
   ========================================================================== */
function loadLocalVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_STORE));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

function saveLocalVault() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('Storage error', e);
  }
}

/* ==========================================================================
   Live Clock
   ========================================================================== */
function initClock() {
  const clockEl = document.getElementById('liveClock');
  function tick() {
    const now = new Date();
    clockEl.innerText = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  }
  tick();
  setInterval(tick, 1000);
}

/* ==========================================================================
   Day 1 Monthly Deposit Check
   ========================================================================== */
function checkDayOneStatus() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isDayOne = now.getDate() === 1;

  const currentMonthDeposit = appData.monthlyDeposits.find(d => d.month === currentMonth);
  const banner = document.getElementById('monthPromptBanner');
  const bannerTitle = document.getElementById('monthPromptTitle');
  const bannerSub = document.getElementById('monthPromptSub');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mName = monthNames[now.getMonth()];

  if (currentMonthDeposit) {
    banner.style.display = 'flex';
    bannerTitle.innerText = `${mName} Capital Active: ₹${currentMonthDeposit.amount.toFixed(2)}`;
    bannerSub.innerText = `Token savings initialized for this month. Added on ${currentMonthDeposit.date}.`;
  } else {
    banner.style.display = 'flex';
    if (isDayOne) {
      bannerTitle.innerText = `Today is Day 1 of ${mName}! Add Monthly Capital`;
      bannerSub.innerText = `Portal is now open. Deposit your money to establish this month's Token Savings.`;
    } else {
      bannerTitle.innerText = `${mName} Opening Capital Pending`;
      bannerSub.innerText = `Deposit your starting capital for ${mName} to set your Token Savings baseline.`;
    }
  }
}

/* ==========================================================================
   2-Step Confirmation: Reset Today's Data
   ========================================================================== */
function initResetTodayModal() {
  const modal = document.getElementById('resetTodayModal');
  const step1 = document.getElementById('resetStep1');
  const step2 = document.getElementById('resetStep2');
  const resetSummaryBox = document.getElementById('resetSummaryBox');
  const confirmInput = document.getElementById('confirmResetInput');
  const codeError = document.getElementById('resetCodeError');

  document.getElementById('openResetTodayBtn').addEventListener('click', () => {
    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('resetDateLabel').innerText = todayISO;

    // Scan today's data count
    const todayExpenses = appData.expenses.filter(e => e.date === todayISO);
    const todayDeposits = appData.monthlyDeposits.filter(d => d.date === todayISO);
    const todayDiary = appData.diary.filter(d => d.date === todayISO);

    const totalExpenseToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    resetSummaryBox.innerHTML = `
      • Expenses today: <strong>${todayExpenses.length} entries</strong> (-₹${totalExpenseToday.toFixed(2)})<br/>
      • Monthly deposit today: <strong>${todayDeposits.length > 0 ? '₹' + todayDeposits[0].amount.toFixed(2) : 'None'}</strong><br/>
      • Diary reflection today: <strong>${todayDiary.length > 0 ? '1 recorded entry' : 'None'}</strong>
    `;

    step1.style.display = 'block';
    step2.style.display = 'none';
    confirmInput.value = '';
    codeError.style.display = 'none';
    modal.classList.add('active');
  });

  document.getElementById('closeResetModalBtn').addEventListener('click', () => modal.classList.remove('active'));
  document.getElementById('cancelResetBtn').addEventListener('click', () => modal.classList.remove('active'));

  // Step 1 -> Step 2
  document.getElementById('proceedToStep2Btn').addEventListener('click', () => {
    step1.style.display = 'none';
    step2.style.display = 'block';
    confirmInput.focus();
  });

  // Step 2 -> Step 1 (Back)
  document.getElementById('backToStep1Btn').addEventListener('click', () => {
    step1.style.display = 'block';
    step2.style.display = 'none';
    codeError.style.display = 'none';
  });

  // Step 2 Final Execution
  document.getElementById('finalExecuteResetBtn').addEventListener('click', () => {
    const typed = confirmInput.value.trim();
    if (typed !== 'RESET') {
      codeError.style.display = 'block';
      return;
    }

    const todayISO = new Date().toISOString().split('T')[0];

    // Erase today's data permanently
    appData.expenses = appData.expenses.filter(e => e.date !== todayISO);
    appData.monthlyDeposits = appData.monthlyDeposits.filter(d => d.date !== todayISO);
    appData.diary = appData.diary.filter(d => d.date !== todayISO);

    saveLocalVault();
    modal.classList.remove('active');
    checkDayOneStatus();
    renderAll();
    alert(`All ledger entries for today (${todayISO}) have been safely erased.`);
  });
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */
function setupEventListeners() {
  initResetTodayModal();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      const targetId = `tab-${e.target.dataset.tab}`;
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Global Timeframe selector
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeTimeframeDays = parseInt(e.target.dataset.days, 10);
      renderAll();
    });
  });

  // Forms
  document.getElementById('transactionForm').addEventListener('submit', handleAddExpense);
  document.getElementById('diaryForm').addEventListener('submit', handleAddDiary);
  document.getElementById('monthlyAddMoneyForm').addEventListener('submit', handleMonthlyDeposit);

  // Monthly Modal controls
  const addModal = document.getElementById('addMoneyModal');
  document.getElementById('openAddMoneyBtn').addEventListener('click', () => {
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    document.getElementById('monthlyDepositDate').value = defaultDate;
    addModal.classList.add('active');
  });
  document.getElementById('closeAddMoneyBtn').addEventListener('click', () => addModal.classList.remove('active'));

  // Calendar navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar();
  });

  // Default dates for input fields
  const todayISO = new Date().toISOString().split('T')[0];
  document.getElementById('txDate').value = todayISO;
  document.getElementById('diaryDate').value = todayISO;
}

/* ==========================================================================
   Ledger Operations
   ========================================================================== */
function handleMonthlyDeposit(e) {
  e.preventDefault();
  const date = document.getElementById('monthlyDepositDate').value;
  const amount = parseFloat(document.getElementById('monthlyDepositAmount').value);
  const note = document.getElementById('monthlyDepositNote').value.trim() || 'Monthly deposit';

  if (isNaN(amount) || amount <= 0) return;

  const monthKey = date.slice(0, 7);
  const existingIdx = appData.monthlyDeposits.findIndex(d => d.month === monthKey);

  if (existingIdx >= 0) {
    appData.monthlyDeposits[existingIdx] = { month: monthKey, date, amount, note };
  } else {
    appData.monthlyDeposits.push({ month: monthKey, date, amount, note });
  }

  saveLocalVault();
  document.getElementById('addMoneyModal').classList.remove('active');
  document.getElementById('monthlyDepositAmount').value = '';
  checkDayOneStatus();
  renderAll();
}

function handleAddExpense(e) {
  e.preventDefault();
  const date = document.getElementById('txDate').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const note = document.getElementById('txNote').value.trim();

  if (isNaN(amount) || amount <= 0) return;

  const newExpense = {
    id: 'exp-' + Date.now(),
    date,
    amount,
    category,
    note
  };

  appData.expenses.push(newExpense);
  saveLocalVault();
  renderAll();
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value = '';
}

function handleAddDiary(e) {
  e.preventDefault();
  const date = document.getElementById('diaryDate').value;
  const tag = document.getElementById('diaryTag').value;
  const text = document.getElementById('diaryContent').value.trim();

  if (!text) return;

  const existingIdx = appData.diary.findIndex(d => d.date === date);
  if (existingIdx >= 0) {
    appData.diary[existingIdx] = { date, tag, text };
  } else {
    appData.diary.push({ date, tag, text });
  }

  saveLocalVault();
  renderDiaryFeed();
  document.getElementById('diaryContent').value = '';
}

/* ==========================================================================
   Financial Metrics Engine
   Token Savings = Total Added Money - Total Expenses Deducted
   ========================================================================== */
function calculateMetrics(daysCount) {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - daysCount);

  let totalAdded = 0;
  let totalExpense = 0;

  appData.monthlyDeposits.forEach(d => {
    const depDate = new Date(d.date);
    if (daysCount === 99999 || (depDate >= cutoff && depDate <= now)) {
      totalAdded += d.amount;
    }
  });

  appData.expenses.forEach(tx => {
    const txDate = new Date(tx.date);
    if (daysCount === 99999 || (txDate >= cutoff && txDate <= now)) {
      totalExpense += tx.amount;
    }
  });

  const tokenSavings = totalAdded - totalExpense;
  return { totalAdded, totalExpense, tokenSavings };
}

function renderHeaderMetrics() {
  const global = calculateMetrics(activeTimeframeDays);
  document.getElementById('totalAddedDisplay').innerText = formatCurrency(global.totalAdded);
  document.getElementById('totalSpentDisplay').innerText = formatCurrency(global.totalExpense);
  document.getElementById('tokenSavingsDisplay').innerText = formatCurrency(global.tokenSavings);
}

function formatCurrency(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ==========================================================================
   Dual Histograms
   ========================================================================== */
function generateDateList(daysCount) {
  const list = [];
  const now = new Date();

  if (daysCount === 99999) {
    const set = new Set();
    appData.monthlyDeposits.forEach(d => set.add(d.date));
    appData.expenses.forEach(e => set.add(e.date));
    const sorted = Array.from(set).sort();
    return sorted.length > 0 ? sorted : [now.toISOString().split('T')[0]];
  }

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    list.push(d.toISOString().split('T')[0]);
  }
  return list;
}

function renderSavingsHistogram() {
  const canvas = document.getElementById('savingsHistogramChart');
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const dates = generateDateList(activeTimeframeDays);

  let runningAdded = 0;
  let runningExpense = 0;

  const startDate = dates[0];
  appData.monthlyDeposits.forEach(d => {
    if (d.date < startDate) runningAdded += d.amount;
  });
  appData.expenses.forEach(e => {
    if (e.date < startDate) runningExpense += e.amount;
  });

  const dailyData = dates.map(date => {
    appData.monthlyDeposits.filter(d => d.date === date).forEach(d => runningAdded += d.amount);
    appData.expenses.filter(e => e.date === date).forEach(e => runningExpense += e.amount);
    const savings = runningAdded - runningExpense;
    return { date, value: Math.max(0, savings) };
  });

  const maxVal = Math.max(...dailyData.map(d => d.value), 1000);

  if (dailyData.every(d => d.value === 0)) {
    renderEmptyState(ctx, width, height, 'No token savings recorded yet. Add capital on Day 1.');
    return;
  }

  drawPureHistogram(ctx, canvas, dailyData, maxVal, width, height, '#10b981', 'Token Savings', 'savingsTooltip');
}

function renderExpenseHistogram() {
  const canvas = document.getElementById('expenseHistogramChart');
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const dates = generateDateList(activeTimeframeDays);

  const dailyData = dates.map(date => {
    const dayTotal = appData.expenses
      .filter(e => e.date === date)
      .reduce((sum, e) => sum + e.amount, 0);
    return { date, value: dayTotal };
  });

  const maxVal = Math.max(...dailyData.map(d => d.value), 1000);

  if (dailyData.every(d => d.value === 0)) {
    renderEmptyState(ctx, width, height, 'Zero expenses recorded in this period.');
    return;
  }

  drawPureHistogram(ctx, canvas, dailyData, maxVal, width, height, '#f43f5e', 'Expense Burn', 'expenseTooltip');
}

function renderEmptyState(ctx, width, height, text) {
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height / 2);
}

function drawPureHistogram(ctx, canvas, data, maxVal, width, height, barColor, labelTitle, tooltipId) {
  const padding = { top: 20, right: 25, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  function getY(val) {
    return padding.top + chartH - (val / maxVal) * chartH;
  }

  const baseY = getY(0);

  // Horizontal Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'right';

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal / gridSteps) * i;
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText('₹' + Math.round(val), padding.left - 6, y + 3);
  }

  const count = data.length;
  const stepX = chartW / count;
  const barW = Math.max(3, Math.min(30, stepX * 0.7));

  data.forEach((d, idx) => {
    const x = padding.left + idx * stepX + (stepX - barW) / 2;
    const barH = Math.max(2, baseY - getY(d.value));

    ctx.fillStyle = barColor;
    ctx.fillRect(x, getY(d.value), barW, barH);

    const showLabel = count <= 14 || idx % Math.ceil(count / 7) === 0;
    if (showLabel) {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(d.date.slice(5), x + barW / 2, height - padding.bottom + 18);
    }
  });

  setupHover(canvas, data, stepX, padding, tooltipId, labelTitle, barColor);
}

function setupHover(canvas, data, stepX, padding, tooltipId, title, color) {
  const tooltip = document.getElementById(tooltipId);

  function handleMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const idx = Math.floor((mouseX - padding.left) / stepX);
    if (idx >= 0 && idx < data.length) {
      const item = data[idx];
      tooltip.style.opacity = '1';
      tooltip.style.left = `${Math.min(mouseX + 12, rect.width - 150)}px`;
      tooltip.style.top = `${Math.min(mouseY, 160)}px`;
      tooltip.innerHTML = `
        <strong>${item.date}</strong><br/>
        <span style="color:${color}">● ${title}: ₹${item.value.toFixed(2)}</span>
      `;
    } else {
      tooltip.style.opacity = '0';
    }
  }

  canvas.onmousemove = (e) => handleMove(e.clientX, e.clientY);
  canvas.ontouchmove = (e) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  canvas.onmouseleave = () => tooltip.style.opacity = '0';
  canvas.ontouchend = () => tooltip.style.opacity = '0';
}

/* ==========================================================================
   Calendar Engine
   ========================================================================== */
function renderCalendar() {
  const grid = document.getElementById('calendarDays');
  const monthYearLabel = document.getElementById('calendarMonthYear');
  grid.innerHTML = '';

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  monthYearLabel.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (selectedDateString === dateStr) cell.classList.add('selected');

    cell.innerHTML = `<span>${d}</span>`;

    const hasDep = appData.monthlyDeposits.some(m => m.date === dateStr);
    const hasExp = appData.expenses.some(e => e.date === dateStr);

    if (hasDep || hasExp) {
      const dots = document.createElement('div');
      dots.className = 'dot-group';
      if (hasDep) dots.innerHTML += `<div class="cal-dot green"></div>`;
      if (hasExp) dots.innerHTML += `<div class="cal-dot red"></div>`;
      cell.appendChild(dots);
    }

    cell.addEventListener('click', () => {
      selectedDateString = dateStr;
      document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      renderDayDetails(dateStr);
    });

    grid.appendChild(cell);
  }
}

function renderDayDetails(dateStr) {
  document.getElementById('selectedDateBadge').innerText = `Selected: ${dateStr}`;
  const list = document.getElementById('dayTransactionsList');
  const deps = appData.monthlyDeposits.filter(d => d.date === dateStr);
  const exps = appData.expenses.filter(e => e.date === dateStr);
  const diary = appData.diary.find(d => d.date === dateStr);

  if (deps.length === 0 && exps.length === 0 && !diary) {
    list.innerHTML = `<span class="text-muted">No transactions or notes recorded on ${dateStr}.</span>`;
    return;
  }

  let html = '';
  deps.forEach(d => {
    html += `
      <div class="day-item">
        <span>[DAY 1 ADDED CAPITAL] ${d.note}</span>
        <strong class="text-amber">+₹${d.amount.toFixed(2)}</strong>
      </div>
    `;
  });

  exps.forEach(e => {
    html += `
      <div class="day-item">
        <span>[EXPENSE] ${e.category} - ${e.note}</span>
        <strong class="text-rose">-₹${e.amount.toFixed(2)}</strong>
      </div>
    `;
  });

  if (diary) {
    html += `
      <div class="day-item" style="border-left: 2px solid #38bdf8; flex-direction:column; align-items:flex-start; gap:4px;">
        <span style="color:#38bdf8; font-weight:600;">${diary.tag || 'Daily Reflection'}:</span>
        <span style="color:#e2e8f0;">"${diary.text}"</span>
      </div>
    `;
  }

  list.innerHTML = html;
}

/* ==========================================================================
   Diary Feed
   ========================================================================== */
function renderDiaryFeed() {
  const container = document.getElementById('diaryEntriesFeed');
  if (appData.diary.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size:0.75rem;">No notes recorded yet.</div>`;
    return;
  }

  const sorted = [...appData.diary].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map(d => `
    <div class="diary-card">
      <div class="diary-meta">
        <span>${d.date}</span>
        <span style="color:#38bdf8;">${escapeHTML(d.tag || '🎯 Note')}</span>
      </div>
      <div class="diary-text">${escapeHTML(d.text)}</div>
    </div>
  `).join('');
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

/* ==========================================================================
   Master Render Loop
   ========================================================================== */
function renderAll() {
  renderHeaderMetrics();
  renderSavingsHistogram();
  renderExpenseHistogram();
  renderCalendar();
  renderDiaryFeed();
}

window.addEventListener('resize', () => {
  renderSavingsHistogram();
  renderExpenseHistogram();
});