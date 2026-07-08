/**
 * Монтаж — Админ-панель JavaScript
 */

const API = '/api/admin';
let authHeader = '';
let currentUser = { username: '', is_super: false, permissions: 'all' };

// Все возможные вкладки
const ALL_TABS = ['calendar','requests','work-types','limits','blocked','settings','stats','bot-users'];
const TAB_LABELS = {
  calendar:    '📅 Календарь',
  requests:    '📋 Заявки',
  'work-types':'🛠 Виды работ',
  limits:      '⚙️ Лимиты',
  blocked:     '🚫 Блокировки',
  settings:    '🔔 Telegram',
  stats:       '📊 Статистика',
  'bot-users': '👤 Польз. бота'
};

const VISIT_LABELS  = { montage: 'Монтаж', measurement: 'Замер' };
const PLACE_LABELS  = { indoor: 'В помещении', outdoor: 'На улице' };
const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };

const $ = id => document.getElementById(id);

// ── Auth ───────────────────────────────────────────────────────────────────
async function login() {
  const user = $('loginUser').value.trim();
  const pass = $('loginPass').value;
  if (!user || !pass) { showLoginError('Введите логин и пароль'); return; }

  const creds = btoa(user + ':' + pass);
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + creds },
    body: JSON.stringify({ username: user, password: pass })
  });

  if (res.ok) {
    const data = await res.json();
    authHeader = 'Basic ' + creds;
    currentUser = {
      username:    data.username,
      is_super:    data.is_super,
      permissions: data.permissions
    };
    sessionStorage.setItem('montaj_auth', authHeader);
    sessionStorage.setItem('montaj_user', JSON.stringify(currentUser));
    showApp();
  } else {
    showLoginError('Неверный логин или пароль');
  }
}

function showLoginError(msg) {
  const el = $('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

// Проверяет, есть ли у текущего пользователя доступ к вкладке
function canAccessTab(tab) {
  if (currentUser.is_super) return true;
  const p = currentUser.permissions;
  if (p === 'all') return true;
  return Array.isArray(p) && p.includes(tab);
}

// Применяет права: скрывает недоступные пункты меню, находит первую доступную вкладку
function applyPermissions() {
  // Обычные вкладки
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    const tab = el.dataset.tab;
    if (tab === 'admin-users') {
      el.style.display = currentUser.is_super ? '' : 'none';
    } else {
      el.style.display = canAccessTab(tab) ? '' : 'none';
    }
  });
}

// Находит первую доступную вкладку после входа
function firstAllowedTab() {
  for (const tab of ALL_TABS) {
    if (canAccessTab(tab)) return tab;
  }
  return currentUser.is_super ? 'admin-users' : null;
}

function showApp() {
  $('loginScreen').style.display = 'none';
  $('mainApp').style.display = 'flex';
  initApp();
}

function apiGet(path) {
  return fetch(API + path, { headers: { Authorization: authHeader } });
}
function apiPost(path, body) {
  return fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body)
  });
}
function apiPut(path, body) {
  return fetch(API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body)
  });
}
function apiDelete(path) {
  return fetch(API + path, { method: 'DELETE', headers: { Authorization: authHeader } });
}

// ── Navigation ─────────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const tab = $('tab-' + tabName);
  if (tab) tab.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (navEl) navEl.classList.add('active');
  loadTab(tabName);
}

function loadTab(tabName) {
  switch (tabName) {
    case 'calendar':    loadCalendar(); break;
    case 'requests':    loadRequests(); break;
    case 'work-types':  loadWorkTypes(); break;
    case 'limits':      loadLimits(); break;
    case 'blocked':     loadBlocked(); break;
    case 'settings':    loadSettings(); break;
    case 'stats':       /* ничего при первом открытии */ break;
    case 'bot-users':   loadBotUsers(); break;
    case 'admin-users': loadAdminUsers(); break;
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
function initApp() {
  // Применяем права доступа к навигации
  applyPermissions();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const tab = el.dataset.tab;
      // Проверяем доступ (кроме admin-users — он уже скрыт если нет прав)
      if (tab !== 'admin-users' && !canAccessTab(tab)) return;
      switchTab(tab);
    });
  });

  $('btnLogout').addEventListener('click', () => {
    authHeader = '';
    currentUser = { username: '', is_super: false, permissions: 'all' };
    sessionStorage.removeItem('montaj_auth');
    sessionStorage.removeItem('montaj_user');
    $('mainApp').style.display = 'none';
    $('loginScreen').style.display = 'flex';
    $('loginError').style.display = 'none';
  });

  initCalendar();
  initRequests();
  initCreateRequestModal();
  initWorkTypes();
  initLimits();
  initBlocked();
  initSettings();
  initStats();
  initBotUsers();
  initAdminUsers();

  // Открываем первую доступную вкладку
  const first = firstAllowedTab();
  if (first) {
    switchTab(first);
  } else if (currentUser.is_super) {
    switchTab('admin-users');
  }
}

// ============================================================================
// CALENDAR
// ============================================================================
let calYear, calMonth, calData = null;

function initCalendar() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth() + 1;

  $('calPrev').addEventListener('click', () => { calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; } loadCalendar(); });
  $('calNext').addEventListener('click', () => { calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; } loadCalendar(); });
  $('dayPanelClose').addEventListener('click', () => { $('dayPanel').style.display = 'none'; });

  $('btnBlockDay').addEventListener('click', () => {
    const date = $('btnBlockDay').dataset.date;
    if (!date) return;
    const reason = prompt('Причина блокировки (необязательно):') || '';
    blockDay(date, reason);
  });

  $('btnUnblockDay').addEventListener('click', async () => {
    const date = $('btnUnblockDay').dataset.date;
    if (!date) return;
    if (!confirm(`Открыть день ${date} для новых заявок?`)) return;
    const res = await apiDelete('/blocked/' + date);
    if (res.ok) {
      loadCalendar();
      $('dayPanel').style.display = 'none';
      if (canAccessTab('blocked')) loadBlocked();
    } else {
      const d = await res.json();
      alert(d.error || 'Ошибка');
    }
  });
}

async function loadCalendar() {
  const res  = await apiGet(`/calendar?year=${calYear}&month=${calMonth}`);
  calData    = await res.json();

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  $('calTitle').textContent = `${MONTHS[calMonth - 1]} ${calYear}`;

  renderCalendar();
}

function renderCalendar() {
  const grid = $('calGrid');
  grid.innerHTML = '';

  const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  DAYS.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(calYear, calMonth - 1, 1);
  // getDay: 0=вс, нужно 0=пн
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const lastDate = new Date(calYear, calMonth, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Группируем заявки по дате
  const byDate = {};
  for (const r of (calData.requests || [])) {
    if (!byDate[r.visit_date]) byDate[r.visit_date] = [];
    byDate[r.visit_date].push(r);
  }
  const blockedSet = new Set((calData.blocked || []).map(b => b.date));

  // Пустые ячейки
  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isBlocked = blockedSet.has(dateStr);
    const items = (byDate[dateStr] || []).filter(r => r.status !== 'cancelled');
    const hasRequests = items.length > 0;

    const el = document.createElement('div');
    el.className = 'cal-day';
    if (dateStr === today) el.classList.add('today');
    if (isBlocked) {
      el.classList.add('blocked');
      if (hasRequests) el.classList.add('blocked-with-requests');
    }

    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = day;
    el.appendChild(numEl);

    // Метка "Закрыт" — показываем всегда для заблокированных дней
    if (isBlocked) {
      const lbl = document.createElement('div');
      lbl.className = 'cal-blocked-label';
      lbl.textContent = '🚫 Закрыт';
      el.appendChild(lbl);
    }

    // Заявки-чипы — показываем всегда (даже если день закрыт)
    const montages = items.filter(r => r.visit_type === 'montage');
    const measures = items.filter(r => r.visit_type === 'measurement');

    if (montages.length > 0 || measures.length > 0) {
      const itemsEl = document.createElement('div');
      itemsEl.className = 'cal-day-items';

      for (const r of montages) {
        const chip = document.createElement('div');
        chip.className = 'cal-chip cal-chip-montage';
        chip.textContent = r.work_type || 'Монтаж';
        chip.title = `#${r.id} — ${r.work_type}`;
        itemsEl.appendChild(chip);
      }
      for (const r of measures) {
        const chip = document.createElement('div');
        chip.className = 'cal-chip cal-chip-measurement';
        chip.textContent = r.work_type || 'Замер';
        chip.title = `#${r.id} — ${r.work_type}`;
        itemsEl.appendChild(chip);
      }
      el.appendChild(itemsEl);
    }

    // Клик работает для всех дней (открытых и закрытых)
    el.addEventListener('click', () => openDayPanel(dateStr));
    grid.appendChild(el);
  }
}

function openDayPanel(dateStr) {
  const blockedSet = new Set((calData.blocked || []).map(b => b.date));
  const isBlocked  = blockedSet.has(dateStr);

  $('dayPanel').style.display = 'block';

  // Форматируем дату для отображения: yyyy-mm-dd → dd.mm.yyyy
  const [y, m, d] = dateStr.split('-');
  $('dayPanelTitle').textContent = `${d}.${m}.${y}`;

  // Переключаем кнопки: "Закрыть день" / "Открыть день"
  const btnBlock   = $('btnBlockDay');
  const btnUnblock = $('btnUnblockDay');
  btnBlock.dataset.date   = dateStr;
  btnUnblock.dataset.date = dateStr;

  if (isBlocked) {
    btnBlock.style.display   = 'none';
    btnUnblock.style.display = '';
  } else {
    btnBlock.style.display   = '';
    btnUnblock.style.display = 'none';
  }

  const list = $('dayPanelList');
  list.innerHTML = '';

  // Если день закрыт — показываем плашку с причиной
  if (isBlocked) {
    const blockedInfo = (calData.blocked || []).find(b => b.date === dateStr);
    const reasonText  = blockedInfo && blockedInfo.reason ? blockedInfo.reason : '';
    const banner = document.createElement('div');
    banner.className = 'day-blocked-banner';
    banner.innerHTML = `🚫 День закрыт для новых заявок${reasonText ? ': <em>' + reasonText + '</em>' : ''}`;
    list.appendChild(banner);
  }

  const items = (calData.requests || []).filter(r => r.visit_date === dateStr && r.status !== 'cancelled');
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#888;font-size:12px;padding:4px 0';
    empty.textContent = 'Заявок нет';
    list.appendChild(empty);
    return;
  }
  for (const r of items) {
    const el = document.createElement('div');
    el.className = 'day-item';
    el.innerHTML = `
      <div class="day-item-title">#${r.id} — ${VISIT_LABELS[r.visit_type] || r.visit_type}: ${r.work_type}</div>
      <div class="day-item-sub">${r.user_name || '—'} ${r.order_number ? '| Заказ ' + r.order_number : ''} | <span class="badge badge-${r.status}">${STATUS_LABELS[r.status]}</span></div>
    `;
    el.addEventListener('click', () => openRequestModal(r.id));
    list.appendChild(el);
  }
}

async function blockDay(date, reason) {
  const res = await apiPost('/blocked', { date, reason });
  if (res.ok) { loadCalendar(); $('dayPanel').style.display = 'none'; }
  else { const d = await res.json(); alert(d.error || 'Ошибка'); }
}

// ============================================================================
// REQUESTS
// ============================================================================
function initRequests() {
  $('btnFilterApply').addEventListener('click', loadRequests);
  $('btnFilterReset').addEventListener('click', () => {
    $('filterSearch').value = '';
    $('filterStatus').value = '';
    $('filterType').value   = '';
    $('filterDate').value   = '';
    loadRequests();
  });
  $('filterSearch').addEventListener('keydown', e => { if (e.key === 'Enter') loadRequests(); });

  // Кнопка "Создать заявку"
  $('btnCreateRequest').addEventListener('click', openCreateRequestModal);
}

// ── Создание заявки вручную ────────────────────────────────────────────────
async function openCreateRequestModal() {
  // Сбрасываем форму
  $('crOrderNumber').value = '';
  $('crUserName').value    = '';
  $('crVisitType').value   = 'montage';
  $('crVisitDate').value   = '';
  $('crWorkPlace').value   = 'indoor';
  $('crAddress').value     = '';
  $('crContacts').value    = '';
  $('crComment').value     = '';
  $('crStatus').value      = 'new';
  $('createRequestError').style.display = 'none';

  // Подгружаем виды работ
  const res   = await apiGet('/work-types');
  const types = await res.json();
  const sel   = $('crWorkType');
  sel.innerHTML = '<option value="">— выберите —</option>';
  for (const t of types.filter(t => t.active)) {
    const opt = document.createElement('option');
    opt.value       = t.name;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }

  $('createRequestOverlay').style.display = 'flex';
  $('crOrderNumber').focus();
}

function initCreateRequestModal() {
  $('createRequestClose').addEventListener('click',   () => { $('createRequestOverlay').style.display = 'none'; });
  $('btnCreateRequestCancel').addEventListener('click', () => { $('createRequestOverlay').style.display = 'none'; });
  $('createRequestOverlay').addEventListener('click', e => {
    if (e.target === $('createRequestOverlay')) $('createRequestOverlay').style.display = 'none';
  });

  $('btnCreateRequestSave').addEventListener('click', async () => {
    const errEl = $('createRequestError');
    errEl.style.display = 'none';

    const body = {
      order_number: $('crOrderNumber').value.trim() || null,
      user_name:    $('crUserName').value.trim()    || null,
      visit_type:   $('crVisitType').value,
      visit_date:   $('crVisitDate').value,
      work_place:   $('crWorkPlace').value,
      work_type:    $('crWorkType').value,
      address:      $('crAddress').value.trim(),
      contacts:     $('crContacts').value.trim(),
      comment:      $('crComment').value.trim() || null,
      status:       $('crStatus').value
    };

    // Валидация
    if (!body.visit_date)  { errEl.textContent = 'Укажите дату'; errEl.style.display = 'block'; return; }
    if (!body.work_type)   { errEl.textContent = 'Выберите вид работ'; errEl.style.display = 'block'; return; }
    if (!body.address)     { errEl.textContent = 'Укажите адрес'; errEl.style.display = 'block'; return; }
    if (!body.contacts)    { errEl.textContent = 'Укажите контакты'; errEl.style.display = 'block'; return; }

    const btn = $('btnCreateRequestSave');
    btn.disabled = true;
    btn.textContent = 'Создаём…';

    try {
      const res = await apiPost('/requests', body);
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Ошибка создания заявки';
        errEl.style.display = 'block';
        return;
      }
      $('createRequestOverlay').style.display = 'none';
      loadRequests();
      if (calData) loadCalendar();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Создать заявку';
    }
  });
}

async function loadRequests() {
  const params = new URLSearchParams();
  const search = $('filterSearch').value.trim();
  const status = $('filterStatus').value;
  const type   = $('filterType').value;
  const date   = $('filterDate').value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (type)   params.set('type',   type);
  if (date)   params.set('date',   date);

  const res  = await apiGet('/requests?' + params.toString());
  const rows = await res.json();
  const tbody = $('requestsBody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888;padding:20px">Нет заявок</td></tr>';
    return;
  }

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.order_number || '—'}</td>
      <td>${r.user_name || '—'}</td>
      <td><span class="badge badge-${r.visit_type}">${VISIT_LABELS[r.visit_type] || r.visit_type}</span></td>
      <td>${r.visit_date}</td>
      <td>${PLACE_LABELS[r.work_place] || r.work_place}</td>
      <td>${r.work_type}</td>
      <td><span class="badge badge-${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
      <td><button class="btn btn-sm btn-outline-sm" data-id="${r.id}">Открыть</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => openRequestModal(r.id));
    tbody.appendChild(tr);
  }
}

// ── Modal заявки ───────────────────────────────────────────────────────────
let currentModalId = null;

async function openRequestModal(id) {
  const res  = await apiGet(`/requests/${id}`);
  const data = await res.json();
  currentModalId = id;

  $('modalTitle').textContent = `Заявка #${id}`;
  $('modalStatus').value = data.status;

  const filesHtml = (data.files || []).length
    ? `<div class="files-list">${data.files.map(f =>
        `<a class="file-link" href="/uploads/${f.filename}" target="_blank">${f.orig_name}</a>`
      ).join('')}</div>`
    : '<span style="color:#888">нет файлов</span>';

  $('modalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value">#${data.id}</div></div>
      <div class="detail-item"><div class="detail-label">Номер заказа</div><div class="detail-value">${data.order_number || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Менеджер</div><div class="detail-value">${data.user_name || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Вид выезда</div><div class="detail-value">${VISIT_LABELS[data.visit_type] || data.visit_type}</div></div>
      <div class="detail-item"><div class="detail-label">Дата</div><div class="detail-value">${data.visit_date}</div></div>
      <div class="detail-item"><div class="detail-label">Место</div><div class="detail-value">${PLACE_LABELS[data.work_place] || data.work_place}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Что монтируем</div><div class="detail-value">${data.work_type}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Адрес</div><div class="detail-value">${data.address}</div></div>
      <div class="detail-item detail-full"><div class="detail-label">Контакты</div><div class="detail-value">${data.contacts}</div></div>
      ${data.comment ? `<div class="detail-item detail-full"><div class="detail-label">Комментарий</div><div class="detail-value">${data.comment}</div></div>` : ''}
      <div class="detail-item detail-full"><div class="detail-label">Файлы</div>${filesHtml}</div>
      <div class="detail-item"><div class="detail-label">Создана</div><div class="detail-value">${data.created_at}</div></div>
      <div class="detail-item"><div class="detail-label">Обновлена</div><div class="detail-value">${data.updated_at}</div></div>
    </div>
  `;

  $('modalOverlay').style.display = 'flex';
}

function initModal() {
  $('modalClose').addEventListener('click',    () => { $('modalOverlay').style.display = 'none'; });
  $('btnModalCancel').addEventListener('click', () => { $('modalOverlay').style.display = 'none'; });
  $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) $('modalOverlay').style.display = 'none'; });

  $('btnModalSaveStatus').addEventListener('click', async () => {
    if (!currentModalId) return;
    const status = $('modalStatus').value;
    await apiPut(`/requests/${currentModalId}`, { status });
    $('modalOverlay').style.display = 'none';
    loadRequests();
    if (calData) loadCalendar();
  });

  $('btnModalDelete').addEventListener('click', async () => {
    if (!currentModalId) return;
    if (!confirm('Удалить заявку? Это действие необратимо.')) return;
    await apiDelete(`/requests/${currentModalId}`);
    $('modalOverlay').style.display = 'none';
    loadRequests();
    if (calData) loadCalendar();
  });
}

// ============================================================================
// WORK TYPES
// ============================================================================
let editingWorkTypeId = null;

function initWorkTypes() {
  $('btnAddWorkType').addEventListener('click', () => {
    editingWorkTypeId = null;
    $('workTypeFormTitle').textContent = 'Добавить вид работ';
    $('wtName').value  = '';
    $('wtOrder').value = '0';
    $('workTypeForm').style.display = 'block';
    $('wtName').focus();
  });

  $('btnCancelWorkType').addEventListener('click', () => {
    $('workTypeForm').style.display = 'none';
    editingWorkTypeId = null;
  });

  $('btnSaveWorkType').addEventListener('click', async () => {
    const name  = $('wtName').value.trim();
    const order = parseInt($('wtOrder').value) || 0;
    if (!name) { alert('Введите название'); return; }

    if (editingWorkTypeId) {
      await apiPut(`/work-types/${editingWorkTypeId}`, { name, sort_order: order });
    } else {
      await apiPost('/work-types', { name, sort_order: order });
    }
    $('workTypeForm').style.display = 'none';
    editingWorkTypeId = null;
    loadWorkTypes();
  });
}

async function loadWorkTypes() {
  const res   = await apiGet('/work-types');
  const types = await res.json();
  const tbody = $('workTypesBody');
  tbody.innerHTML = '';

  for (const t of types) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.name}</td>
      <td>${t.sort_order}</td>
      <td>${t.active ? '✅' : '❌'}</td>
      <td>
        <button class="btn btn-sm btn-outline-sm btn-edit-wt" data-id="${t.id}" data-name="${t.name}" data-order="${t.sort_order}">✏️</button>
        <button class="btn btn-sm btn-${t.active ? 'danger' : 'primary'} btn-toggle-wt" data-id="${t.id}" data-active="${t.active}" style="margin-left:4px">${t.active ? 'Скрыть' : 'Показать'}</button>
        <button class="btn btn-sm btn-danger btn-del-wt" data-id="${t.id}" style="margin-left:4px">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.btn-edit-wt').forEach(btn => {
    btn.addEventListener('click', () => {
      editingWorkTypeId = btn.dataset.id;
      $('workTypeFormTitle').textContent = 'Редактировать вид работ';
      $('wtName').value  = btn.dataset.name;
      $('wtOrder').value = btn.dataset.order;
      $('workTypeForm').style.display = 'block';
      $('wtName').focus();
    });
  });

  tbody.querySelectorAll('.btn-toggle-wt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active === '1' ? 0 : 1;
      await apiPut(`/work-types/${btn.dataset.id}`, { active });
      loadWorkTypes();
    });
  });

  tbody.querySelectorAll('.btn-del-wt').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить вид работ?')) return;
      await apiDelete(`/work-types/${btn.dataset.id}`);
      loadWorkTypes();
    });
  });
}

// ============================================================================
// LIMITS
// ============================================================================
function initLimits() {
  $('btnSaveLimits').addEventListener('click', async () => {
    const body = {
      montage_per_day:     parseInt($('limMontage').value),
      measurement_per_day: parseInt($('limMeasure').value),
      combined_per_day:    parseInt($('limCombined').value),
      buffer_montage_days: parseInt($('bufMontage').value),
      buffer_measure_days: parseInt($('bufMeasure').value)
    };
    await apiPut('/limits', body);
    const msg = $('limitsMsg');
    msg.style.display = 'inline-block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });
}

async function loadLimits() {
  const res = await apiGet('/limits');
  const lim = await res.json();
  $('limMontage').value  = lim.montage_per_day;
  $('limMeasure').value  = lim.measurement_per_day;
  $('limCombined').value = lim.combined_per_day;
  $('bufMontage').value  = lim.buffer_montage_days;
  $('bufMeasure').value  = lim.buffer_measure_days;
}

// ============================================================================
// BLOCKED DAYS
// ============================================================================
function initBlocked() {
  $('btnAddBlock').addEventListener('click', async () => {
    const date   = $('newBlockDate').value;
    const reason = $('newBlockReason').value.trim();
    const msg    = $('blockMsg');
    if (!date) { msg.textContent = 'Укажите дату'; msg.style.display = 'block'; return; }
    msg.style.display = 'none';

    const res = await apiPost('/blocked', { date, reason });
    if (res.ok) {
      $('newBlockDate').value   = '';
      $('newBlockReason').value = '';
      loadBlocked();
    } else {
      const d = await res.json();
      msg.textContent = d.error || 'Ошибка';
      msg.style.display = 'block';
    }
  });
}

async function loadBlocked() {
  const res  = await apiGet('/blocked');
  const rows = await res.json();
  const tbody = $('blockedBody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;padding:16px">Нет заблокированных дней</td></tr>';
    return;
  }

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.reason || '—'}</td>
      <td><button class="btn btn-sm btn-outline-sm btn-unblock" data-date="${r.date}">Разблокировать</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.btn-unblock').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiDelete('/blocked/' + btn.dataset.date);
      loadBlocked();
      if (calData) loadCalendar();
    });
  });
}

// ============================================================================
// SETTINGS
// ============================================================================
function initSettings() {
  // ── Основной бот ────────────────────────────────────────────────────────
  $('btnSaveSettings').addEventListener('click', async () => {
    const body = {
      tg_bot_token: $('tgToken').value.trim(),
      tg_chat_ids:  $('tgChatIds').value.trim()
    };
    await apiPut('/settings', body);
    const msg = $('settingsMsg');
    msg.style.display = 'inline-block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });

  $('btnTestTg').addEventListener('click', async () => {
    const token   = $('tgToken').value.trim();
    const chatIds = $('tgChatIds').value.trim().split(/[,\s]+/).filter(Boolean);
    if (!token || !chatIds.length) { alert('Сначала укажите Bot Token и Chat ID'); return; }

    let sent = 0;
    for (const chatId of chatIds) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: '✅ Тест от системы монтажных заявок' })
      });
      if (r.ok) sent++;
    }
    alert(`Отправлено в ${sent} из ${chatIds.length} чатов`);
  });

  // ── Бот уведомлений монтажника ───────────────────────────────────────────
  $('btnSaveNotifySettings').addEventListener('click', async () => {
    const body = {
      tg_notify_bot_token: $('tgNotifyToken').value.trim(),
      tg_notify_chat_id:   $('tgNotifyChatId').value.trim()
    };
    await apiPut('/settings', body);
    const msg = $('notifySettingsMsg');
    msg.style.display = 'inline-block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });

  $('btnTestNotifyTg').addEventListener('click', async () => {
    const token  = $('tgNotifyToken').value.trim();
    const chatId = $('tgNotifyChatId').value.trim();
    if (!token || !chatId) { alert('Сначала укажите Bot Token и Chat ID группы'); return; }

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ Тест: Заказ №12345 Баннер требует изменений! Проверочное сообщение' })
    });
    const d = await r.json();
    if (d.ok) {
      alert('Тестовое сообщение отправлено успешно');
    } else {
      alert('Ошибка: ' + (d.description || 'Неизвестная ошибка'));
    }
  });
}

async function loadSettings() {
  const res      = await apiGet('/settings');
  const settings = await res.json();
  $('tgToken').value        = settings.tg_bot_token        || '';
  $('tgChatIds').value      = settings.tg_chat_ids         || '';
  $('tgNotifyToken').value  = settings.tg_notify_bot_token || '';
  $('tgNotifyChatId').value = settings.tg_notify_chat_id   || '';
}

// ============================================================================
// STATS
// ============================================================================
function initStats() {
  // Дефолтный период — текущий месяц
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const d    = String(now.getDate()).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  $('statsFrom').value = `${y}-${m}-01`;
  $('statsTo').value   = `${y}-${m}-${String(last).padStart(2, '0')}`;

  $('btnStatsLoad').addEventListener('click',  loadStats);
  $('btnStatsExcel').addEventListener('click', exportStatsExcel);
}

async function loadStats() {
  const from = $('statsFrom').value;
  const to   = $('statsTo').value;
  const type = $('statsType').value;
  const errEl = $('statsError');

  errEl.style.display = 'none';
  if (!from || !to) { errEl.textContent = 'Укажите период (с и по)'; errEl.style.display = 'block'; return; }
  if (from > to)    { errEl.textContent = 'Дата «с» не может быть позже даты «по»'; errEl.style.display = 'block'; return; }

  const params = new URLSearchParams({ from, to });
  if (type) params.set('type', type);

  const res  = await apiGet('/stats?' + params.toString());
  const data = await res.json();

  if (!res.ok) { errEl.textContent = data.error || 'Ошибка загрузки'; errEl.style.display = 'block'; return; }

  // Сводные цифры
  $('statTotal').textContent     = data.total;
  $('statMontages').textContent  = data.montages;
  $('statMeasures').textContent  = data.measurements;
  $('statDone').textContent      = data.byStatus.done        || 0;
  $('statCancelled').textContent = data.byStatus.cancelled   || 0;

  // Разбивка по видам работ
  const wtList = $('statsWorkTypeList');
  wtList.innerHTML = '';
  const maxCount = Math.max(1, ...Object.values(data.byWorkType));
  for (const [name, count] of Object.entries(data.byWorkType).sort((a,b) => b[1]-a[1])) {
    const pct = Math.round(count / maxCount * 100);
    const row = document.createElement('div');
    row.className = 'stats-bar-row';
    row.innerHTML = `
      <div class="stats-bar-name">${name}</div>
      <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%"></div></div>
      <div class="stats-bar-count">${count}</div>
    `;
    wtList.appendChild(row);
  }
  $('statsWorkTypeCard').style.display = Object.keys(data.byWorkType).length ? '' : 'none';

  // Таблица
  const tbody = $('statsBody');
  tbody.innerHTML = '';
  if (data.rows.length === 0) {
    $('statsSummary').style.display = 'none';
    $('statsEmpty').style.display   = 'block';
    return;
  }

  $('statsEmpty').style.display   = 'none';
  $('statsSummary').style.display = 'block';

  for (const r of data.rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.order_number || '—'}</td>
      <td>${r.user_name    || '—'}</td>
      <td><span class="badge badge-${r.visit_type}">${VISIT_LABELS[r.visit_type] || r.visit_type}</span></td>
      <td>${r.visit_date}</td>
      <td>${PLACE_LABELS[r.work_place] || r.work_place}</td>
      <td>${r.work_type}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.address}">${r.address}</td>
      <td><span class="badge badge-${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

function exportStatsExcel() {
  const from = $('statsFrom').value;
  const to   = $('statsTo').value;
  const type = $('statsType').value;
  const errEl = $('statsError');

  errEl.style.display = 'none';
  if (!from || !to) { errEl.textContent = 'Укажите период (с и по)'; errEl.style.display = 'block'; return; }
  if (from > to)    { errEl.textContent = 'Дата «с» не может быть позже даты «по»'; errEl.style.display = 'block'; return; }

  const params = new URLSearchParams({ from, to });
  if (type) params.set('type', type);

  // Скачиваем через скрытый <a> с Bearer-заголовком через fetch → blob
  const url = `/api/admin/stats/export?${params.toString()}`;
  fetch(url, { headers: { Authorization: authHeader } })
    .then(r => {
      if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Ошибка'); });
      return r.blob();
    })
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `stat_${from}_${to}${type ? '_' + type : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    })
    .catch(e => { errEl.textContent = e.message; errEl.style.display = 'block'; });
}

// ============================================================================
// BOT USERS
// ============================================================================
function initBotUsers() {
  $('btnReloadBotUsers').addEventListener('click', loadBotUsers);
}

async function loadBotUsers() {
  const res   = await apiGet('/bot-users');
  const users = await res.json();
  const tbody = $('botUsersBody');
  tbody.innerHTML = '';

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Нет зарегистрированных пользователей</td></tr>';
    return;
  }

  for (const u of users) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td><code>${u.chat_id}</code></td>
      <td>${u.created_at}</td>
      <td><button class="btn btn-sm btn-danger btn-del-botuser" data-id="${u.id}" data-name="${u.name}">🗑 Удалить</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.btn-del-botuser').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Удалить пользователя «${btn.dataset.name}»? Он потеряет доступ к боту до повторной регистрации.`)) return;
      const res = await apiDelete(`/bot-users/${btn.dataset.id}`);
      if (res.ok) {
        loadBotUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Ошибка удаления');
      }
    });
  });
}

// ============================================================================
// ADMIN USERS (управление пользователями и правами, только суперадмин)
// ============================================================================
let editingAdminUserId = null;

function initAdminUsers() {
  if (!currentUser.is_super) return;

  $('btnAddAdminUser').addEventListener('click', () => {
    editingAdminUserId = null;
    $('adminUserFormTitle').textContent = 'Новый пользователь';
    $('auUsername').value  = '';
    $('auUsername').disabled = false;
    $('auPassword').value  = '';
    $('auPassword').placeholder = 'Пароль';
    // Сброс чекбоксов
    document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);
    $('auPermAll').checked = false;
    $('adminUserFormMsg').style.display = 'none';
    $('adminUserForm').style.display = 'block';
    $('auUsername').focus();
  });

  $('btnCancelAdminUser').addEventListener('click', () => {
    $('adminUserForm').style.display = 'none';
    editingAdminUserId = null;
  });

  // "Полный доступ" — снимает/ставит все чекбоксы
  $('auPermAll').addEventListener('change', () => {
    const checked = $('auPermAll').checked;
    document.querySelectorAll('.perm-cb').forEach(cb => {
      cb.checked = checked;
      cb.disabled = checked;
    });
  });

  $('btnSaveAdminUser').addEventListener('click', saveAdminUser);
}

async function saveAdminUser() {
  const msg = $('adminUserFormMsg');
  msg.style.display = 'none';

  const username = $('auUsername').value.trim();
  const password = $('auPassword').value.trim();
  const isAll    = $('auPermAll').checked;

  if (!editingAdminUserId && !username) {
    msg.textContent = 'Введите логин'; msg.style.display = 'block'; return;
  }
  if (!editingAdminUserId && !password) {
    msg.textContent = 'Введите пароль'; msg.style.display = 'block'; return;
  }

  // Собираем массив разрешений
  let permissions;
  if (isAll) {
    permissions = 'all';
  } else {
    permissions = [...document.querySelectorAll('.perm-cb:checked')].map(cb => cb.value);
    if (permissions.length === 0) {
      msg.textContent = 'Выберите хотя бы один раздел или «Полный доступ»';
      msg.style.display = 'block'; return;
    }
  }

  let res;
  if (editingAdminUserId) {
    const body = { permissions };
    if (password) body.password = password;
    res = await apiPut(`/admin-users/${editingAdminUserId}`, body);
  } else {
    res = await apiPost('/admin-users', { username, password, permissions });
  }

  if (res.ok) {
    $('adminUserForm').style.display = 'none';
    editingAdminUserId = null;
    loadAdminUsers();
  } else {
    const d = await res.json();
    msg.textContent = d.error || 'Ошибка';
    msg.style.display = 'block';
  }
}

async function loadAdminUsers() {
  const res   = await apiGet('/admin-users');
  const users = await res.json();
  const tbody = $('adminUsersBody');
  tbody.innerHTML = '';

  for (const u of users) {
    const permLabel = u.is_super
      ? '<span class="badge badge-montage">Суперадмин</span>'
      : (u.permissions === 'all'
          ? '<span class="badge badge-done">Полный доступ</span>'
          : u.permissions.map(p => TAB_LABELS[p] || p).join(', ') || '—');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${u.username}</strong></td>
      <td style="font-size:12px">${permLabel}</td>
      <td>
        ${u.is_super ? '<span style="color:#888;font-size:12px">Нельзя изменить</span>' : `
          <button class="btn btn-sm btn-outline-sm btn-edit-au" data-id="${u.id}">✏️ Изменить</button>
          <button class="btn btn-sm btn-danger btn-del-au" data-id="${u.id}" data-name="${u.username}" style="margin-left:4px">🗑</button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Кнопка редактирования
  tbody.querySelectorAll('.btn-edit-au').forEach(btn => {
    btn.addEventListener('click', async () => {
      const u = users.find(x => x.id == btn.dataset.id);
      if (!u) return;
      editingAdminUserId = u.id;
      $('adminUserFormTitle').textContent = `Изменить: ${u.username}`;
      $('auUsername').value    = u.username;
      $('auUsername').disabled = true;
      $('auPassword').value    = '';
      $('auPassword').placeholder = 'Новый пароль (оставьте пустым, чтобы не менять)';

      const isAll = u.permissions === 'all';
      $('auPermAll').checked = isAll;
      document.querySelectorAll('.perm-cb').forEach(cb => {
        cb.disabled = isAll;
        cb.checked  = isAll || (Array.isArray(u.permissions) && u.permissions.includes(cb.value));
      });

      $('adminUserFormMsg').style.display = 'none';
      $('adminUserForm').style.display = 'block';
      $('auPassword').focus();
    });
  });

  // Кнопка удаления
  tbody.querySelectorAll('.btn-del-au').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Удалить пользователя «${btn.dataset.name}»?`)) return;
      const res = await apiDelete(`/admin-users/${btn.dataset.id}`);
      if (res.ok) {
        loadAdminUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Ошибка');
      }
    });
  });
}

// ============================================================================
// BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем сохранённую сессию (с правами)
  const savedAuth = sessionStorage.getItem('montaj_auth');
  const savedUser = sessionStorage.getItem('montaj_user');
  if (savedAuth) {
    authHeader = savedAuth;
    if (savedUser) {
      try { currentUser = JSON.parse(savedUser); } catch (_) {}
    }
    showApp();
  }

  $('btnLogin').addEventListener('click', login);
  $('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginPass').focus(); });

  initModal();
});
