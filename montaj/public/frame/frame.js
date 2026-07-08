/**
 * Логика фрейма заявки на монтаж
 * Данные пользователя читаются из родительского окна через postMessage
 * или из URL-параметров ?user=...&order=...
 */

const API_BASE = (() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('api') || window.location.origin;
})();

// ── Состояние ──────────────────────────────────────────────────────────────
let selectedFiles = [];
let currentRequestId = null;
let editMode = false;

// Данные от родительской страницы (через postMessage или URL)
let parentData = {
  userName:    '',
  orderNumber: ''
};

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const elVisitDate      = $('visitDate');         // hidden input
const elVisitType      = $('visitType');
const elWorkPlace      = $('workPlace');
const elWorkTypeSelect = $('workTypeSelect');
const elWorkTypeOther  = $('workTypeOther');
const elAddress        = $('address');
const elContacts       = $('contacts');
const elComment        = $('comment');
const elDropzone       = $('dropzone');
const elFileInput      = $('fileInput');
const elFileList       = $('fileList');
const elDateHint       = $('dateHint');
const elFormError      = $('formError');
const elBtnSubmit      = $('btnSubmit');
const elBtnCancel      = $('btnCancel');
const elBtnClose       = $('btnClose');
const elBtnEdit        = $('btnEdit');
const elBtnNewRequest  = $('btnNewRequest'); // на экране успеха
const elSuccessText    = $('successText');
const elStepForm       = $('stepForm');
const elStepSuccess    = $('stepSuccess');
const elStepDuplicate  = $('stepDuplicate');

// ── Датапикер ──────────────────────────────────────────────────────────────
const dp = {
  // DOM
  wrap:    $('datepickerWrap'),
  toggle:  $('datepickerToggle'),
  popup:   $('datepickerPopup'),
  label:   $('datepickerLabel'),
  grid:    $('dpGrid'),
  prev:    $('dpPrev'),
  next:    $('dpNext'),
  month:   $('dpMonthLabel'),

  // Состояние
  open:         false,
  viewYear:     0,
  viewMonth:    0,    // 0–11
  selectedDate: '',   // 'YYYY-MM-DD'
  availableSet: new Set(),   // доступные даты (из API)
  remainingMap: {},          // date → remaining count
  busyDatesSet: new Set(),   // даты, на которых есть хоть одна заявка (любого пользователя)
  loading:      false,
  loadedType:   '',          // тип, для которого загружены даты

  MONTHS_RU: ['Январь','Февраль','Март','Апрель','Май','Июнь',
              'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],

  // Включить/выключить датапикер
  setDisabled(disabled) {
    this.toggle.disabled = disabled;
    if (disabled) {
      this.toggle.classList.add('dp-disabled');
      this.close();
    } else {
      this.toggle.classList.remove('dp-disabled');
    }
  },

  init() {
    const now = new Date();
    this.viewYear  = now.getFullYear();
    this.viewMonth = now.getMonth();

    // По умолчанию — заблокирован до выбора вида выезда
    this.setDisabled(true);

    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open ? this.close() : this.openPicker();
    });
    this.prev.addEventListener('click', (e) => { e.stopPropagation(); this.shiftMonth(-1); });
    this.next.addEventListener('click', (e) => { e.stopPropagation(); this.shiftMonth(+1); });

    // Закрываем по клику вне
    document.addEventListener('click', (e) => {
      if (this.open && !this.wrap.contains(e.target)) this.close();
    });
  },

  openPicker() {
    this.popup.style.display = 'block';
    this.open = true;
    this.renderGrid();
  },

  close() {
    this.popup.style.display = 'none';
    this.open = false;
  },

  shiftMonth(delta) {
    this.viewMonth += delta;
    if (this.viewMonth > 11) { this.viewMonth = 0;  this.viewYear++; }
    if (this.viewMonth < 0)  { this.viewMonth = 11; this.viewYear--; }
    this.renderGrid();
  },

  // Загрузить доступные даты для текущего типа выезда
  async loadAvailable(visitType) {
    if (!visitType) {
      this.availableSet.clear();
      this.remainingMap = {};
      this.loadedType = '';
      if (this.open) this.renderGrid();
      return;
    }
    if (this.loadedType === visitType && this.loading === false) return; // уже загружено

    this.loading = true;
    this.loadedType = visitType;
    try {
      const res  = await fetch(`${API_BASE}/api/requests/available-dates?type=${visitType}&months=3`);
      const data = await res.json();
      this.availableSet.clear();
      this.remainingMap = {};
      this.busyDatesSet.clear();
      for (const d of data.available) {
        this.availableSet.add(d.date);
        this.remainingMap[d.date] = d.remaining;
      }
      for (const d of (data.withRequests || [])) {
        this.busyDatesSet.add(d);
      }
    } catch (e) {
      console.error('[montaj] loadAvailable:', e);
    } finally {
      this.loading = false;
      if (this.open) this.renderGrid();
    }
  },

  // Принудительно перезагрузить (сброс кэша)
  async reload(visitType) {
    this.loadedType = '';
    await this.loadAvailable(visitType);
  },

  renderGrid() {
    const todayStr = new Date().toISOString().slice(0, 10);
    this.month.textContent = `${this.MONTHS_RU[this.viewMonth]} ${this.viewYear}`;

    // Первый день месяца (0=вс..6=сб → переводим в пн=0)
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    let startDow = firstDay.getDay(); // 0=вс
    startDow = startDow === 0 ? 6 : startDow - 1; // пн=0 … вс=6

    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();

    this.grid.innerHTML = '';

    // Пустые ячейки до 1-го
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('span');
      empty.className = 'dp-day dp-empty';
      this.grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm    = String(this.viewMonth + 1).padStart(2, '0');
      const dd    = String(d).padStart(2, '0');
      const dateStr = `${this.viewYear}-${mm}-${dd}`;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.dataset.date = dateStr;

      const isPast      = dateStr < todayStr;
      const isAvail     = this.availableSet.has(dateStr);
      const isSelected  = dateStr === this.selectedDate;
      const isToday     = dateStr === todayStr;
      const hasType    = !!elVisitType.value;
      const hasBusyReq = this.busyDatesSet.has(dateStr); // есть хоть одна заявка на этот день

      let cls = 'dp-day';
      if (isPast) {
        cls += ' dp-past';
        cell.disabled = true;
      } else if (!hasType) {
        // тип не выбран — просто нейтральные клетки, прошлое заблокировано
        cls += ' dp-no-type';
        if (hasBusyReq) cls += ' dp-has-my-req';
      } else if (isAvail) {
        cls += ' dp-avail';
        if (this.remainingMap[dateStr] === 1) cls += ' dp-avail-low'; // последнее место
        if (hasBusyReq) cls += ' dp-has-my-req';
      } else {
        cls += ' dp-unavail';
        cell.disabled = true;
        if (hasBusyReq) cls += ' dp-has-my-req'; // день занят — есть заявки
      }
      if (isSelected) cls += ' dp-selected';
      if (isToday)    cls += ' dp-today';

      cell.className = cls;

      if (!cell.disabled) {
        cell.addEventListener('click', () => this.selectDate(dateStr));
      }

      this.grid.appendChild(cell);
    }
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    elVisitDate.value = dateStr;

    // Форматируем для отображения
    const [y, m, d] = dateStr.split('-');
    this.label.textContent = `${d}.${m}.${y}`;
    this.label.style.color = '#222';

    // Снять ошибку с тогла
    this.toggle.classList.remove('error');

    this.renderGrid();
    this.close();
    updateDateHint();
  },

  // Сбросить выбор
  reset() {
    this.selectedDate = '';
    elVisitDate.value = '';
    this.label.textContent = 'Выберите дату…';
    this.label.style.color = '';
    this.toggle.classList.remove('error');

    const now = new Date();
    this.viewYear  = now.getFullYear();
    this.viewMonth = now.getMonth();

    elDateHint.textContent = '';
    elDateHint.className = 'hint';
  },

  // Пометить тогл как ошибочный (аналог .error на input)
  markError(hasError) {
    if (hasError) this.toggle.classList.add('error');
    else          this.toggle.classList.remove('error');
  },

  // Установить дату программно (при редактировании заявки)
  setDate(dateStr) {
    if (!dateStr) { this.reset(); return; }
    this.selectedDate = dateStr;
    elVisitDate.value = dateStr;
    const [y, m, d] = dateStr.split('-');
    this.label.textContent = `${d}.${m}.${y}`;
    this.label.style.color = '#222';
    // Переключить вид на нужный месяц
    this.viewYear  = +y;
    this.viewMonth = +m - 1;
  }
};

// ── Инициализация ──────────────────────────────────────────────────────────
// Флаг: режим уже определён через URL, postMessage не должен переопределять
let modeResolvedByUrl = false;

async function init() {
  const params = new URLSearchParams(window.location.search);
  // URLSearchParams.get() декодирует сам — дополнительный decodeURIComponent не нужен
  if (params.get('user'))  parentData.userName    = params.get('user');
  if (params.get('order')) parentData.orderNumber = params.get('order');

  window.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'MONTAJ_INIT') {
      if (e.data.userName)    parentData.userName    = e.data.userName;
      if (e.data.orderNumber) parentData.orderNumber = e.data.orderNumber;

      // Если URL уже показал нужный экран — игнорируем postMessage для режима
      if (modeResolvedByUrl) return;

      // Родительская страница передала готовый результат проверки
      if (e.data.mode === 'duplicate') {
        const list = e.data.existingRequests || (e.data.existingRequest ? [e.data.existingRequest] : null);
        if (list && list.length) { showDuplicate(list); return; }
      }

      // Фоллбэк: если mode не передан или 'new' — форма уже показана, ничего делать не нужно
      // Если mode вообще не пришёл (старый userscript) — проверяем сами
      if (!e.data.mode && parentData.orderNumber) {
        await checkDuplicate();
      }
    }
    if (e.data && e.data.type === 'MONTAJ_CLOSE') {
      closeFrame();
    }
  });

  dp.init();
  await loadWorkTypes();
  setupEventListeners();

  const editId = params.get('edit');
  if (editId) {
    // Режим редактирования — проверка дубликата не нужна
    await loadAndFillRequest(editId);
    modeResolvedByUrl = true;
    return;
  }

  // Если URL содержит mode=duplicate — грузим все заявки по order
  const urlMode = params.get('mode');
  if (urlMode === 'duplicate' && parentData.orderNumber) {
    modeResolvedByUrl = true;
    await loadAndShowDuplicate(parentData.orderNumber);
    return;
  }

  // mode=new или не задан — показываем пустую форму (уже показана по умолчанию)
  modeResolvedByUrl = true;
}

// ── Загрузка всех заявок по orderNumber и показ экрана дубликата ──────────
async function loadAndShowDuplicate(orderNumber) {
  try {
    const res = await fetch(`${API_BASE}/api/requests/check-order?order=${encodeURIComponent(orderNumber)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.found && data.requests && data.requests.length) {
      showDuplicate(data.requests);
    }
  } catch (e) {
    console.error('[montaj] loadAndShowDuplicate:', e);
  }
}

// ── Проверка дублирующейся заявки по order_number (фоллбэк) ──────────────
// Вызывается только если родительская страница не передала готовый результат
async function checkDuplicate() {
  if (!parentData.orderNumber) return;
  try {
    const res  = await fetch(
      `${API_BASE}/api/requests/check-order?order=${encodeURIComponent(parentData.orderNumber)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.found) {
      showDuplicate(data.requests || [data.request]);
    }
  } catch (e) {
    console.error('[montaj] checkDuplicate:', e);
  }
}

// ── Показ экрана дубликата ─────────────────────────────────────────────────
const VISIT_TYPE_LABELS = { montage: 'Монтаж', measurement: 'Замер' };
const WORK_PLACE_LABELS = { indoor: 'В помещении', outdoor: 'На улице' };
const STATUS_LABELS = {
  new:         'Новая',
  in_progress: 'В работе',
  done:        'Выполнена',
  cancelled:   'Отменена'
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Показывает экран с информацией о существующих заявках.
 * @param {object[]} requests — массив заявок (минимум одна)
 */
function showDuplicate(requests) {
  // Поддержка вызова с одним объектом (обратная совместимость)
  if (!Array.isArray(requests)) requests = [requests];

  const count = requests.length;
  $('dupOrderNumber').textContent = parentData.orderNumber || requests[0].order_number || '—';
  $('dupCountText').textContent   = count === 1
    ? 'уже существует активная заявка на монтаж.'
    : `уже существует ${count} активных заявки на монтаж.`;

  // Рендерим список карточек
  const listEl = $('dupList');
  listEl.innerHTML = '';

  for (const req of requests) {
    const card = document.createElement('div');
    card.className = 'dup-card';
    card.innerHTML = `
      <div class="dup-card-header">
        <span class="dup-card-id">#${req.id}</span>
        <span class="dup-status dup-status--${req.status}">${STATUS_LABELS[req.status] || req.status}</span>
      </div>
      <div class="dup-row"><span class="dup-label">Тип выезда</span><span>${VISIT_TYPE_LABELS[req.visit_type] || req.visit_type}</span></div>
      <div class="dup-row"><span class="dup-label">Дата</span><span>${formatDate(req.visit_date)}</span></div>
      <div class="dup-row"><span class="dup-label">Место</span><span>${WORK_PLACE_LABELS[req.work_place] || req.work_place}</span></div>
      <div class="dup-row"><span class="dup-label">Что монтируем</span><span>${req.work_type}</span></div>
      <div class="dup-row"><span class="dup-label">Адрес</span><span>${req.address}</span></div>
      <div class="dup-row"><span class="dup-label">Контакты</span><span>${req.contacts}</span></div>
    `;

    // Кнопка редактировать — только если заявку создал текущий пользователь
    const currentUser = parentData.userName;
    const isOwner = currentUser && req.user_name && req.user_name === currentUser;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm dup-edit-btn';

    if (isOwner) {
      editBtn.className += ' btn-outline';
      editBtn.textContent = 'Редактировать';
      editBtn.addEventListener('click', async () => {
        await loadAndFillRequest(req.id);
        showStep('form');
      });
    } else {
      editBtn.className += ' btn-outline dup-edit-btn--locked';
      editBtn.disabled = true;
      editBtn.title = req.user_name
        ? `Заявку создал ${req.user_name} — только он может её редактировать`
        : 'Редактирование недоступно';
      editBtn.textContent = '🔒 Редактировать';
    }
    card.appendChild(editBtn);

    listEl.appendChild(card);
  }

  showStep('duplicate');

  // Кнопка "Закрыть"
  $('btnDupClose').onclick = closeFrame;
}

// ── Загрузка видов работ ───────────────────────────────────────────────────
async function loadWorkTypes() {
  try {
    const res   = await fetch(`${API_BASE}/api/requests/work-types`);
    const types = await res.json();

    elWorkTypeSelect.innerHTML = '<option value="">Выберите…</option>';
    for (const t of types) {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      elWorkTypeSelect.appendChild(opt);
    }
    const optOther = document.createElement('option');
    optOther.value = '__other__';
    optOther.textContent = 'Другое…';
    elWorkTypeSelect.appendChild(optOther);
  } catch (e) {
    console.error('[montaj] loadWorkTypes:', e);
  }
}

// ── Слушатели событий ──────────────────────────────────────────────────────
function setupEventListeners() {
  // "Другое" в виде работ
  elWorkTypeSelect.addEventListener('change', () => {
    if (elWorkTypeSelect.value === '__other__') {
      elWorkTypeOther.style.display = 'block';
      elWorkTypeOther.focus();
    } else {
      elWorkTypeOther.style.display = 'none';
      elWorkTypeOther.value = '';
    }
  });

  // При смене типа выезда — загружаем доступные даты и перерисовываем
  elVisitType.addEventListener('change', async () => {
    const type = elVisitType.value;

    // Если уже выбрана дата, но теперь тип изменился — сбрасываем дату
    if (dp.selectedDate) {
      dp.reset();
    }

    if (type) {
      dp.setDisabled(false);
      await dp.reload(type);
    } else {
      dp.setDisabled(true);
      dp.availableSet.clear();
      dp.remainingMap = {};
      dp.loadedType = '';
    }

    if (dp.open) dp.renderGrid();
    updateDateHint();
    elVisitType.classList.remove('error');
  });

  // Дропзона
  elDropzone.addEventListener('click', (e) => {
    if (e.target !== elFileInput && !e.target.closest('.dropzone-link')) {
      elFileInput.click();
    }
  });
  elDropzone.addEventListener('dragover',  (e) => { e.preventDefault(); elDropzone.classList.add('drag-over'); });
  elDropzone.addEventListener('dragleave', () => elDropzone.classList.remove('drag-over'));
  elDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elDropzone.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });
  elFileInput.addEventListener('change', () => {
    addFiles(elFileInput.files);
    elFileInput.value = '';
  });

  // Кнопки
  elBtnSubmit.addEventListener('click', handleSubmit);
  elBtnCancel.addEventListener('click', closeFrame);
  elBtnClose.addEventListener('click',  closeFrame);
  elBtnEdit.addEventListener('click', () => {
    editMode = true;
    showStep('form');
    markEditMode();
  });
  elBtnNewRequest.addEventListener('click', () => {
    resetForm();
    editMode = false;
    currentRequestId = null;
    showStep('form');
  });

  // Снятие ошибок при вводе
  [elVisitType, elWorkPlace, elWorkTypeSelect, elAddress, elContacts].forEach(el => {
    el.addEventListener('change', () => el.classList.remove('error'));
    el.addEventListener('input',  () => el.classList.remove('error'));
  });
}

// ── Подсказка к дате ───────────────────────────────────────────────────────
async function updateDateHint() {
  const type = elVisitType.value;
  const date = elVisitDate.value;
  if (!type || !date) { elDateHint.textContent = ''; elDateHint.className = 'hint'; return; }

  // Данные уже есть в dp.remainingMap (загружены при выборе типа)
  if (dp.availableSet.has(date)) {
    const rem = dp.remainingMap[date];
    elDateHint.textContent = rem !== undefined ? `Свободно мест: ${rem}` : 'Дата доступна';
    elDateHint.className = 'hint ok';
  } else {
    elDateHint.textContent = 'Этот день недоступен';
    elDateHint.className = 'hint warn';
  }
}

// ── Файлы ──────────────────────────────────────────────────────────────────
function addFiles(fileList) {
  for (const f of fileList) {
    if (selectedFiles.length >= 10) break;
    if (!selectedFiles.find(s => s.name === f.name && s.size === f.size)) {
      selectedFiles.push(f);
    }
  }
  renderFileList();
}

function renderFileList() {
  elFileList.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span title="${f.name}">${f.name}</span><button class="file-remove" data-i="${i}" title="Удалить">✕</button>`;
    elFileList.appendChild(item);
  });
  elFileList.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(+btn.dataset.i, 1);
      renderFileList();
    });
  });
}

// ── Валидация ──────────────────────────────────────────────────────────────
function validate() {
  let ok = true;

  // Проверяем дату через датапикер
  if (!elVisitDate.value) {
    dp.markError(true);
    ok = false;
  }

  const required = [
    [elVisitType,      elVisitType.value],
    [elWorkPlace,      elWorkPlace.value],
    [elWorkTypeSelect, elWorkTypeSelect.value],
    [elAddress,        elAddress.value.trim()],
    [elContacts,       elContacts.value.trim()],
  ];

  if (elWorkTypeSelect.value === '__other__' && !elWorkTypeOther.value.trim()) {
    elWorkTypeOther.classList.add('error');
    ok = false;
  }

  for (const [el, val] of required) {
    if (!val) {
      el.classList.add('error');
      ok = false;
    }
  }
  return ok;
}

// ── Отправка ───────────────────────────────────────────────────────────────
async function handleSubmit() {
  hideError();
  if (!validate()) {
    showError('Заполните все обязательные поля');
    return;
  }

  const workType = elWorkTypeSelect.value === '__other__'
    ? elWorkTypeOther.value.trim()
    : elWorkTypeSelect.value;

  const fd = new FormData();
  fd.append('order_number', parentData.orderNumber || '');
  fd.append('user_name',    parentData.userName    || '');
  fd.append('visit_type',   elVisitType.value);
  fd.append('visit_date',   elVisitDate.value);
  fd.append('work_place',   elWorkPlace.value);
  fd.append('work_type',    workType);
  fd.append('address',      elAddress.value.trim());
  fd.append('contacts',     elContacts.value.trim());
  fd.append('comment',      elComment.value.trim());

  for (const f of selectedFiles) fd.append('files', f);

  elBtnSubmit.disabled = true;
  elBtnSubmit.textContent = 'Отправка…';

  try {
    const url    = editMode && currentRequestId
      ? `${API_BASE}/api/requests/${currentRequestId}`
      : `${API_BASE}/api/requests`;
    const method = editMode && currentRequestId ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, body: fd });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Ошибка сервера');
      return;
    }

    if (!editMode) currentRequestId = data.id;
    editMode = false;

    elSuccessText.textContent = 'Производство может связаться с вами для уточнения деталей.';

    showStep('success');
    window.parent.postMessage({ type: 'MONTAJ_SUBMITTED', id: currentRequestId }, '*');

    // Сбрасываем кэш доступных дат (чтобы при следующей заявке было актуально)
    dp.loadedType = '';

  } catch (e) {
    showError('Не удалось отправить заявку. Проверьте соединение.');
  } finally {
    elBtnSubmit.disabled = false;
    elBtnSubmit.textContent = 'Отправить';
  }
}

// ── Загрузка и заполнение заявки для редактирования ───────────────────────
async function loadAndFillRequest(id) {
  try {
    const res  = await fetch(`${API_BASE}/api/requests/${id}`);
    if (!res.ok) return;
    const data = await res.json();

    currentRequestId = data.id;
    editMode = true;

    // Сначала устанавливаем тип, чтобы загрузить доступные даты
    elVisitType.value = data.visit_type || '';
    if (data.visit_type) {
      dp.setDisabled(false);
      await dp.reload(data.visit_type);
    }

    dp.setDate(data.visit_date || '');
    elWorkPlace.value  = data.work_place  || '';
    elAddress.value    = data.address     || '';
    elContacts.value   = data.contacts    || '';
    elComment.value    = data.comment     || '';

    const optExists = [...elWorkTypeSelect.options].some(o => o.value === data.work_type);
    if (optExists) {
      elWorkTypeSelect.value = data.work_type;
    } else {
      elWorkTypeSelect.value = '__other__';
      elWorkTypeOther.style.display = 'block';
      elWorkTypeOther.value = data.work_type;
    }

    updateDateHint();
    markEditMode();
  } catch (e) {
    console.error('[montaj] loadAndFillRequest:', e);
  }
}

// ── Вспомогательные ────────────────────────────────────────────────────────
function showStep(step) {
  elStepForm.style.display         = step === 'form'          ? '' : 'none';
  elStepSuccess.style.display      = step === 'success'       ? '' : 'none';
  elStepDuplicate.style.display    = step === 'duplicate'     ? '' : 'none';
  $('stepNotifyChange').style.display = step === 'notifyChange' ? '' : 'none';
  $('stepBlockDay').style.display     = step === 'blockDay'     ? '' : 'none';
  // Уведомляем родительский фрейм о новой высоте контента
  requestAnimationFrame(resizeToFit);
}

function resizeToFit() {
  const h = document.getElementById('app').scrollHeight;
  window.parent.postMessage({ type: 'MONTAJ_RESIZE', height: h }, '*');
}

function markEditMode() {
  const notice = document.querySelector('.edit-notice');
  if (notice) {
    notice.style.display = 'block';
    $('editRequestId').textContent = `#${currentRequestId}`;
  }
  elBtnSubmit.textContent = 'Сохранить изменения';
}

function resetForm() {
  dp.reset();
  elVisitType.value  = '';
  elWorkPlace.value  = '';
  elWorkTypeSelect.value = '';
  elWorkTypeOther.value  = '';
  elWorkTypeOther.style.display = 'none';
  elAddress.value    = '';
  elContacts.value   = '';
  elComment.value    = '';
  selectedFiles = [];
  renderFileList();
  hideError();
  elBtnSubmit.textContent = 'Отправить';

  // Сбрасываем загруженные даты и блокируем датапикер
  dp.availableSet.clear();
  dp.remainingMap = {};
  dp.loadedType = '';
  dp.setDisabled(true);

  const notice = document.querySelector('.edit-notice');
  if (notice) notice.style.display = 'none';
}

function showError(msg) {
  elFormError.textContent = msg;
  elFormError.style.display = 'block';
}

function hideError() {
  elFormError.style.display = 'none';
}

function closeFrame() {
  window.parent.postMessage({ type: 'MONTAJ_CLOSE' }, '*');
  resetForm();
  showStep('form');
}

// ── Старт ─────────────────────────────────────────
let ncSelectedRequestId = null;

async function openNotifyChange() {
  ncSelectedRequestId = null;
  $('recentRequestsList').innerHTML = '<div class="nc-loading">Загрузка заявок…</div>';
  $('ncSelectedInfo').style.display = 'none';
  $('ncCommentGroup').style.display = 'none';
  $('ncComment').value = '';
  $('ncError').style.display = 'none';
  $('ncSuccess').style.display = 'none';
  $('ncFooter').style.display = '';
  $('btnNcSend').disabled = true;

  showStep('notifyChange');

  try {
    const userParam = parentData.userName ? `?user=${encodeURIComponent(parentData.userName)}` : '';
    const res = await fetch(`${API_BASE}/api/requests/recent${userParam}`);
    const rows = await res.json();

    const listEl = $('recentRequestsList');
    listEl.innerHTML = '';

    if (!rows.length) {
      listEl.innerHTML = '<div class="nc-empty">Нет активных заявок</div>';
      return;
    }

    for (const r of rows) {
      const item = document.createElement('div');
      item.className = 'nc-request-item';
      item.dataset.id = r.id;
      const orderLabel = r.order_number ? `Заказ №${r.order_number}` : `Заявка #${r.id}`;
      item.innerHTML = `
        <div class="nc-req-main">${orderLabel}</div>
        <div class="nc-req-sub">${r.work_type} · ${formatDate(r.visit_date)}</div>
      `;
      item.addEventListener('click', () => selectNcRequest(r, item));
      listEl.appendChild(item);
    }
  } catch (e) {
    $('recentRequestsList').innerHTML = '<div class="nc-empty">Ошибка загрузки заявок</div>';
  }
}

function selectNcRequest(r, itemEl) {
  // Снять выделение с остальных
  $('recentRequestsList').querySelectorAll('.nc-request-item').forEach(el => el.classList.remove('selected'));
  itemEl.classList.add('selected');

  ncSelectedRequestId = r.id;

  const orderLabel = r.order_number ? `Заказ №${r.order_number}` : `Заявка #${r.id}`;
  const infoEl = $('ncSelectedInfo');
  infoEl.textContent = `Выбрано: ${orderLabel} — ${r.work_type}`;
  infoEl.style.display = 'block';

  $('ncCommentGroup').style.display = 'block';
  $('ncComment').focus();
  $('btnNcSend').disabled = false;
}

async function sendNotifyChange() {
  const comment = $('ncComment').value.trim();
  $('ncError').style.display = 'none';

  if (!ncSelectedRequestId) {
    $('ncError').textContent = 'Выберите заявку из списка';
    $('ncError').style.display = 'block';
    return;
  }
  if (!comment) {
    $('ncError').textContent = 'Введите комментарий';
    $('ncError').style.display = 'block';
    return;
  }

  $('btnNcSend').disabled = true;
  $('btnNcSend').textContent = 'Отправка…';

  try {
    const res = await fetch(`${API_BASE}/api/requests/notify-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: ncSelectedRequestId, comment })
    });
    const data = await res.json();

    if (!res.ok) {
      $('ncError').textContent = data.error || 'Ошибка отправки';
      $('ncError').style.display = 'block';
      $('btnNcSend').disabled = false;
      $('btnNcSend').textContent = 'Отправить';
      return;
    }

    // Успех
    $('ncFooter').style.display = 'none';
    $('ncSuccess').style.display = 'block';
    $('recentRequestsList').style.display = 'none';
    $('ncSelectedInfo').style.display = 'none';
    $('ncCommentGroup').style.display = 'none';

  } catch (e) {
    $('ncError').textContent = 'Не удалось отправить. Проверьте соединение.';
    $('ncError').style.display = 'block';
    $('btnNcSend').disabled = false;
    $('btnNcSend').textContent = 'Отправить';
  }
}

// ── "Исключить день из графика" ────────────────────────────────────────────
let bdStep = 'date'; // 'date' | 'reason'

function openBlockDay() {
  bdStep = 'date';
  $('bdDate').value = '';
  $('bdReason').value = '';
  $('bdDateGroup').style.display = '';
  $('bdReasonGroup').style.display = 'none';
  $('bdError').style.display = 'none';
  $('bdSuccess').style.display = 'none';
  $('bdFooter').style.display = '';
  $('btnBdNext').textContent = 'Далее';
  $('btnBdNext').disabled = false;

  showStep('blockDay');
  setTimeout(() => $('bdDate').focus(), 50);
}

// Авто-форматирование ввода дд.мм.гггг
function initBdDateInput() {
  const input = $('bdDate');
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 2) v = v.slice(0,2) + '.' + v.slice(2);
    if (v.length > 5) v = v.slice(0,5) + '.' + v.slice(5);
    if (v.length > 10) v = v.slice(0,10);
    input.value = v;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleBdNext();
  });
}

async function handleBdNext() {
  $('bdError').style.display = 'none';

  if (bdStep === 'date') {
    const dateVal = $('bdDate').value.trim();
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
      $('bdError').textContent = 'Введите дату в формате дд.мм.гггг';
      $('bdError').style.display = 'block';
      return;
    }
    // Переходим к вводу причины
    bdStep = 'reason';
    $('bdReasonGroup').style.display = 'block';
    $('btnBdNext').textContent = 'Заблокировать';
    setTimeout(() => $('bdReason').focus(), 50);
    return;
  }

  if (bdStep === 'reason') {
    const reason = $('bdReason').value.trim();
    if (!reason) {
      $('bdError').textContent = 'Введите причину блокировки';
      $('bdError').style.display = 'block';
      return;
    }

    $('btnBdNext').disabled = true;
    $('btnBdNext').textContent = 'Сохранение…';

    try {
      const res = await fetch(`${API_BASE}/api/requests/block-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: $('bdDate').value.trim(), reason })
      });
      const data = await res.json();

      if (!res.ok) {
        $('bdError').textContent = data.error || 'Ошибка сохранения';
        $('bdError').style.display = 'block';
        $('btnBdNext').disabled = false;
        $('btnBdNext').textContent = 'Заблокировать';
        return;
      }

      // Успех
      $('bdFooter').style.display = 'none';
      $('bdDateGroup').style.display = 'none';
      $('bdReasonGroup').style.display = 'none';
      $('bdSuccessTitle').textContent = `День ${$('bdDate').value} заблокирован!`;
      $('bdSuccess').style.display = 'block';

    } catch (e) {
      $('bdError').textContent = 'Не удалось сохранить. Проверьте соединение.';
      $('bdError').style.display = 'block';
      $('btnBdNext').disabled = false;
      $('btnBdNext').textContent = 'Заблокировать';
    }
  }
}

// ── Навешиваем обработчики для новых кнопок ────────────────────────────────
function setupExtraButtons() {
  // "Заявка требует изменений" — отправить / закрыть
  $('btnNcSend').addEventListener('click', sendNotifyChange);
  $('btnNcCancel').addEventListener('click', () => {
    $('recentRequestsList').style.display = '';
    showStep('form');
  });

  // "Исключить день" — далее / закрыть
  $('btnBdNext').addEventListener('click', handleBdNext);
  $('btnBdCancel').addEventListener('click', () => showStep('form'));

  // Форматирование ввода даты
  initBdDateInput();
}

// ── Адаптивная высота iframe ───────────────────────────────────────────────
(function initResizeReporter() {
  function reportHeight() {
    const h = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'MONTAJ_RESIZE', height: h }, '*');
  }
  const ro = new ResizeObserver(() => reportHeight());
  ro.observe(document.body);
  reportHeight();
})();

// ── Старт ──────────────────────────────────────────────────────────────────
setupExtraButtons();
init();
