/* ══════════════════════════════════════════════
   LinkShop Admin — app.js
══════════════════════════════════════════════ */

const API = '/api/admin';
let token = localStorage.getItem('adminToken') || '';
let allUsers = [];
let allDepts = [];

// ── Утилиты ───────────────────────────────────────────────────────────────

function authHeaders() {
  return { 'Content-Type': 'application/json', 'X-Admin-Token': token };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    headers: authHeaders(),
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 401) { showLogin(); return null; }
  return res.json();
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.sidebar ul li a').forEach(a => a.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.remove('hidden');
  document.getElementById(`nav-${name}`).classList.add('active');

  if (name === 'departments') loadDepartments();
  if (name === 'users')       loadUsers();
  if (name === 'products')    loadProducts();
  if (name === 'orders')      loadOrders();
  if (name === 'balance')     loadBalanceSelect();
  if (name === 'stats')       initStats();
  if (name === 'preview')     initPreview();
  if (name === 'settings')    loadSettings();
}

function showLogin() {
  token = '';
  localStorage.removeItem('adminToken');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  showTab('departments');
}

// ── Auth ──────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (!res.ok) { errEl.textContent = data.error || 'Ошибка входа'; return; }
  token = data.token;
  localStorage.setItem('adminToken', token);
  showApp();
}

async function doLogout() {
  await apiFetch(`${API}/logout`, { method: 'POST' });
  showLogin();
}

// ── Departments ───────────────────────────────────────────────────────────

async function loadDepartments() {
  const data = await apiFetch(`${API}/departments`);
  if (!data) return;
  allDepts = data;

  const tbody = document.querySelector('#deptsTable tbody');
  tbody.innerHTML = '';

  data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td><input class="dept-name-${d.id}" value="${esc(d.name)}" style="width:160px"></td>
      <td><input class="dept-rate-${d.id}" type="number" step="0.01" min="0.01" value="${d.rate}" style="width:90px"></td>
      <td>
        <button class="btn-sm" onclick="saveDept(${d.id})">Сохранить</button>
        <button class="btn-sm btn-danger" onclick="deleteDept(${d.id})" style="margin-left:6px">Удалить</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function addDepartment() {
  const name = document.getElementById('deptName').value.trim();
  const rate = document.getElementById('deptRate').value;
  if (!name) return alert('Введите название отдела');

  const data = await apiFetch(`${API}/departments`, { method: 'POST', body: { name, rate } });
  if (data && data.id) {
    document.getElementById('deptName').value = '';
    document.getElementById('deptRate').value = '1.0';
    loadDepartments();
  } else if (data) {
    alert(data.error);
  }
}

async function saveDept(id) {
  const name = document.querySelector(`.dept-name-${id}`).value.trim();
  const rate = document.querySelector(`.dept-rate-${id}`).value;
  const data = await apiFetch(`${API}/departments/${id}`, { method: 'PUT', body: { name, rate } });
  if (data && data.ok) loadDepartments();
  else if (data) alert(data.error);
}

async function deleteDept(id) {
  if (!confirm('Удалить отдел?')) return;
  const data = await apiFetch(`${API}/departments/${id}`, { method: 'DELETE' });
  if (data && data.ok) loadDepartments();
  else if (data) alert(data.error);
}

// ── Users ─────────────────────────────────────────────────────────────────

async function loadUsers() {
  const [users, depts] = await Promise.all([
    apiFetch(`${API}/users`),
    apiFetch(`${API}/departments`)
  ]);
  if (!users || !depts) return;
  allUsers = users;
  allDepts = depts;

  // Populate dept select in add-user form
  const sel = document.getElementById('userDept');
  sel.innerHTML = depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');

  renderUsersTable(users);
}

function renderUsersTable(users) {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    const tgDisplay = u.tg_chat_id
      ? `<span class="tg-chat-badge">${esc(u.tg_chat_id)}</span>
         <button class="btn-sm btn-secondary" style="margin-left:4px"
           onclick="editUserTgChatId(${u.id}, this, '${esc(u.tg_chat_id || '')}')">✏</button>`
      : `<button class="btn-sm btn-secondary"
           onclick="editUserTgChatId(${u.id}, this, '')">+ Добавить</button>`;
    const salaryDisplay = u.salary_folder_url
      ? `<a class="salary-url-link" href="${esc(u.salary_folder_url)}" target="_blank" rel="noopener" title="${esc(u.salary_folder_url)}">🔗 Открыть</a>
         <button class="btn-sm btn-secondary" style="margin-left:4px"
           onclick="editUserSalaryUrl(${u.id}, this, '${esc(u.salary_folder_url || '')}')">✏</button>`
      : `<button class="btn-sm btn-secondary"
           onclick="editUserSalaryUrl(${u.id}, this, '')">+ Добавить</button>`;
    const pinOnlyActive = !!u.pin_only;
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${esc(u.last_name)} ${esc(u.first_name)}</td>
      <td>${esc(u.dept_name)} <small style="color:var(--muted)">(×${u.dept_rate})</small></td>
      <td><b style="color:var(--accent2)">${u.balance}</b> линков</td>
      <td>
        <span class="pin-badge" title="PIN пользователя">${u.pin || '—'}</span>
        ${u.pin ? `<button class="btn-sm btn-secondary" style="margin-left:4px" onclick="copyPin('${u.pin}')">📋</button>` : ''}
      </td>
      <td style="text-align:center">
        <button class="btn-sm ${pinOnlyActive ? 'btn-pin-only-on' : 'btn-secondary'}"
                title="Доступ только по пинкоду"
                onclick="togglePinOnly(${u.id}, ${pinOnlyActive ? 0 : 1})">
          ${pinOnlyActive ? '🔒 Вкл' : '🔓 Выкл'}
        </button>
      </td>
      <td class="user-tg-cell">${tgDisplay}</td>
      <td class="user-salary-cell">${salaryDisplay}</td>
      <td class="token-cell" title="Нажмите чтобы скопировать" onclick="copyToken('${u.api_token}')">${u.api_token}</td>
      <td>
        <button class="btn-sm btn-danger" onclick="deleteUser(${u.id})">Удалить</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/** Инлайн редактирование tg_chat_id прямо из таблицы пользователей */
function editUserTgChatId(userId, btn, currentValue) {
  const cell = btn.closest('.user-tg-cell');
  const originalNodes = Array.from(cell.childNodes).map(n => n.cloneNode(true));

  cell.innerHTML = `
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
      <input type="text" class="tg-chat-edit-input" value="${esc(currentValue)}"
        placeholder="123456789" style="width:130px;padding:4px 8px;font-size:.85rem">
      <button class="btn-sm" id="tg-save-${userId}">✓</button>
      <button class="btn-sm btn-secondary" id="tg-cancel-${userId}">✕</button>
    </div>`;

  cell.querySelector(`#tg-save-${userId}`).addEventListener('click', () => {
    saveUserTgChatId(userId, cell.querySelector(`#tg-save-${userId}`));
  });
  cell.querySelector(`#tg-cancel-${userId}`).addEventListener('click', () => {
    cell.innerHTML = '';
    originalNodes.forEach(n => cell.appendChild(n));
  });

  cell.querySelector('.tg-chat-edit-input').focus();
}

/** Инлайн редактирование salary_folder_url прямо из таблицы пользователей */
function editUserSalaryUrl(userId, btn, currentValue) {
  const cell = btn.closest('.user-salary-cell');
  const originalNodes = Array.from(cell.childNodes).map(n => n.cloneNode(true));

  cell.innerHTML = `
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
      <input type="url" class="salary-url-edit-input" value="${esc(currentValue)}"
        placeholder="https://drive.google.com/..." style="width:200px;padding:4px 8px;font-size:.85rem">
      <button class="btn-sm" id="salary-save-${userId}">✓</button>
      <button class="btn-sm btn-secondary" id="salary-cancel-${userId}">✕</button>
    </div>`;

  cell.querySelector(`#salary-save-${userId}`).addEventListener('click', () => {
    saveUserSalaryUrl(userId, cell.querySelector(`#salary-save-${userId}`));
  });
  cell.querySelector(`#salary-cancel-${userId}`).addEventListener('click', () => {
    cell.innerHTML = '';
    originalNodes.forEach(n => cell.appendChild(n));
  });

  cell.querySelector('.salary-url-edit-input').focus();
}

async function saveUserSalaryUrl(userId, btn) {
  const cell  = btn.closest('.user-salary-cell');
  const input = cell.querySelector('.salary-url-edit-input');
  const value = input.value.trim();
  const data  = await apiFetch(`${API}/users/${userId}/salary-url`, {
    method: 'PUT', body: { salary_folder_url: value }
  });
  if (data && data.ok) {
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx !== -1) allUsers[idx].salary_folder_url = value || null;
    renderUsersTable(allUsers);
  } else {
    alert(data?.error || 'Ошибка сохранения');
  }
}

async function saveUserTgChatId(userId, btn) {
  const cell  = btn.closest('.user-tg-cell');
  const input = cell.querySelector('.tg-chat-edit-input');
  const value = input.value.trim();
  const data  = await apiFetch(`${API}/users/${userId}/tg-chat-id`, {
    method: 'PUT', body: { tg_chat_id: value }
  });
  if (data && data.ok) {
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx !== -1) allUsers[idx].tg_chat_id = value || null;
    renderUsersTable(allUsers);
  } else {
    alert(data?.error || 'Ошибка сохранения');
  }
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsers.filter(u =>
    `${u.last_name} ${u.first_name}`.toLowerCase().includes(q) ||
    u.dept_name.toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
}

function copyToken(t) {
  navigator.clipboard.writeText(t).then(() => alert('Токен скопирован:\n' + t));
}

function copyPin(p) {
  navigator.clipboard.writeText(p).then(() => alert('PIN скопирован: ' + p));
}

async function addUser() {
  const first_name = document.getElementById('userFirst').value.trim();
  const last_name  = document.getElementById('userLast').value.trim();
  const dept_id    = document.getElementById('userDept').value;
  const pin        = document.getElementById('userPin').value.trim();

  if (!first_name || !last_name) return alert('Введите имя и фамилию');

  const body = { first_name, last_name, dept_id };
  if (pin) body.pin = pin;

  const data = await apiFetch(`${API}/users`, { method: 'POST', body });
  if (data && data.id) {
    document.getElementById('userFirst').value = '';
    document.getElementById('userLast').value  = '';
    document.getElementById('userPin').value   = '';
    // Показываем сгенерированный PIN
    if (data.pin) alert(`Пользователь создан!\nPIN: ${data.pin}`);
    loadUsers();
  } else if (data) {
    alert(data.error);
  }
}

async function deleteUser(id) {
  if (!confirm('Удалить пользователя? Все транзакции будут удалены.')) return;
  const data = await apiFetch(`${API}/users/${id}`, { method: 'DELETE' });
  if (data && data.ok) loadUsers();
}

/** Переключает флаг "доступ только по пинкоду" */
async function togglePinOnly(userId, newValue) {
  const data = await apiFetch(`${API}/users/${userId}/pin-only`, {
    method: 'PUT', body: { pin_only: newValue }
  });
  if (data && data.ok) {
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx !== -1) allUsers[idx].pin_only = newValue;
    renderUsersTable(allUsers);
  } else {
    alert(data?.error || 'Ошибка сохранения');
  }
}

// ── Products ──────────────────────────────────────────────────────────────

async function loadProducts() {
  const data = await apiFetch(`${API}/products`);
  if (!data) return;

  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  if (!data.length) {
    grid.innerHTML = '<p style="color:var(--muted)">Нет товаров</p>';
    return;
  }

  data.forEach(p => {
    const div = document.createElement('div');
    div.className = `product-card${p.active ? '' : ' inactive'}`;
    div.dataset.productId = p.id;
    const imgSrc = p.image_url || 'https://placehold.co/400x200/1a1d27/4ecca3?text=No+Image';
    const placeholder = 'https://placehold.co/400x200/1a1d27/4ecca3?text=No+Image';
    const tfEnabled = p.text_field_enabled ? 1 : 0;
    const tfPlaceholder = p.text_field_placeholder || '';
    div.innerHTML = `
      <img src="${imgSrc}" alt="${esc(p.name)}" onerror="this.src='${placeholder}'" class="pc-img">
      <div class="pc-body pc-view">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-price">💰 ${p.base_price} линков</div>
        <div class="pc-desc">${esc(p.description || '')}</div>
        ${tfEnabled ? `<div class="pc-textfield-badge">✏️ Текстовое поле: <em>${esc(tfPlaceholder) || '(без плейсхолдера)'}</em></div>` : ''}
      </div>
      <div class="pc-body pc-edit hidden">
        <label class="pc-edit-label">Название
          <input class="pc-edit-name" type="text" value="${esc(p.name)}">
        </label>
        <label class="pc-edit-label">Цена (линки)
          <input class="pc-edit-price" type="number" step="0.01" min="0" value="${p.base_price}">
        </label>
        <label class="pc-edit-label">Описание
          <textarea class="pc-edit-desc" rows="2">${esc(p.description || '')}</textarea>
        </label>
        <label class="pc-edit-label">URL изображения
          <input class="pc-edit-img" type="text" value="${esc(p.image_url || '')}">
        </label>
        <label class="pc-edit-label pc-edit-tf-row" style="flex-direction:row;align-items:center;gap:8px;cursor:pointer">
          <input class="pc-edit-tf-enabled" type="checkbox" style="width:auto;padding:0;margin:0" ${tfEnabled ? 'checked' : ''}
            onchange="toggleEditTfPlaceholder(${p.id})">
          <span>Текстовое поле для заполнения</span>
        </label>
        <div class="pc-edit-tf-placeholder-wrap${tfEnabled ? '' : ' hidden'}" id="pc-tf-ph-${p.id}">
          <label class="pc-edit-label" style="margin-top:4px">Плейсхолдер для поля
            <input class="pc-edit-tf-placeholder" type="text" placeholder="Например: Введите ваше имя"
              value="${esc(tfPlaceholder)}">
          </label>
        </div>
        <div class="pc-edit-err error-msg hidden"></div>
      </div>
      <div class="pc-actions pc-actions-view">
        <button class="btn-sm btn-secondary" onclick="startEditProduct(${p.id})">✏ Изменить</button>
        <button class="btn-sm btn-danger" onclick="toggleProduct(${p.id}, ${p.active})">${p.active ? 'Скрыть' : 'Показать'}</button>
      </div>
      <div class="pc-actions pc-actions-edit hidden">
        <button class="btn-sm" onclick="saveProductEdit(${p.id})">💾 Сохранить</button>
        <button class="btn-sm btn-secondary" onclick="cancelProductEdit(${p.id})">Отмена</button>
      </div>`;
    grid.appendChild(div);
  });
}

async function addProduct() {
  const name                  = document.getElementById('prodName').value.trim();
  const description           = document.getElementById('prodDesc').value.trim();
  const base_price            = document.getElementById('prodPrice').value;
  const text_field_enabled    = document.getElementById('prodTextFieldEnabled').checked ? 1 : 0;
  const text_field_placeholder = document.getElementById('prodTextFieldPlaceholder').value.trim();

  // Определяем URL изображения: файл имеет приоритет над URL-полем
  const urlTabVisible = !document.getElementById('imgTabUrl').classList.contains('hidden');
  const image_url = urlTabVisible
    ? document.getElementById('prodImg').value.trim()
    : uploadedImageUrl;

  if (!name || !base_price) return alert('Укажите название и цену');

  const data = await apiFetch(`${API}/products`, {
    method: 'POST', body: { name, description, base_price, image_url, text_field_enabled, text_field_placeholder }
  });

  if (data && data.id) {
    document.getElementById('prodName').value  = '';
    document.getElementById('prodDesc').value  = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodImg').value   = '';
    document.getElementById('prodTextFieldEnabled').checked = false;
    document.getElementById('prodTextFieldPlaceholder').value = '';
    document.getElementById('prodTextFieldPlaceholderWrap').classList.add('hidden');
    // Сброс загрузчика файла
    uploadedImageUrl = '';
    document.getElementById('fileDropLabel').textContent = 'Нажмите или перетащите изображение (max 5 MB)';
    document.getElementById('imgUploadPreview').classList.add('hidden');
    document.getElementById('prodImgFile').value = '';
    loadProducts();
  } else if (data) {
    alert(data.error);
  }
}

function startEditProduct(id) {
  const card = document.querySelector(`.product-card[data-product-id="${id}"]`);
  if (!card) return;
  card.querySelector('.pc-view').classList.add('hidden');
  card.querySelector('.pc-edit').classList.remove('hidden');
  card.querySelector('.pc-actions-view').classList.add('hidden');
  card.querySelector('.pc-actions-edit').classList.remove('hidden');
  card.querySelector('.pc-edit-name').focus();
}

function cancelProductEdit(id) {
  const card = document.querySelector(`.product-card[data-product-id="${id}"]`);
  if (!card) return;
  card.querySelector('.pc-edit').classList.add('hidden');
  card.querySelector('.pc-view').classList.remove('hidden');
  card.querySelector('.pc-actions-edit').classList.add('hidden');
  card.querySelector('.pc-actions-view').classList.remove('hidden');
  card.querySelector('.pc-edit-err').classList.add('hidden');
}

async function saveProductEdit(id) {
  const card = document.querySelector(`.product-card[data-product-id="${id}"]`);
  if (!card) return;

  const name                   = card.querySelector('.pc-edit-name').value.trim();
  const base_price             = card.querySelector('.pc-edit-price').value;
  const description            = card.querySelector('.pc-edit-desc').value.trim();
  const image_url              = card.querySelector('.pc-edit-img').value.trim();
  const text_field_enabled     = card.querySelector('.pc-edit-tf-enabled').checked ? 1 : 0;
  const text_field_placeholder = card.querySelector('.pc-edit-tf-placeholder').value.trim();
  const errEl                  = card.querySelector('.pc-edit-err');

  if (!name) {
    errEl.textContent = 'Название не может быть пустым';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  const data = await apiFetch(`${API}/products/${id}`, {
    method: 'PUT',
    body: { name, base_price, description, image_url, text_field_enabled, text_field_placeholder }
  });

  if (data && data.ok) {
    loadProducts();
  } else if (data) {
    errEl.textContent = data.error || 'Ошибка сохранения';
    errEl.classList.remove('hidden');
  }
}

/** Показывает/скрывает поле плейсхолдера в форме редактирования карточки */
function toggleEditTfPlaceholder(productId) {
  const wrap = document.getElementById(`pc-tf-ph-${productId}`);
  if (!wrap) return;
  const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
  const cb   = card ? card.querySelector('.pc-edit-tf-enabled') : null;
  if (cb && cb.checked) {
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

/** Показывает/скрывает поле плейсхолдера в форме добавления нового товара */
function toggleNewTfPlaceholder() {
  const cb   = document.getElementById('prodTextFieldEnabled');
  const wrap = document.getElementById('prodTextFieldPlaceholderWrap');
  if (!cb || !wrap) return;
  if (cb.checked) {
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

async function toggleProduct(id, currentActive) {
  const data = await apiFetch(`${API}/products/${id}`, {
    method: 'PUT', body: { active: currentActive ? 0 : 1 }
  });
  if (data && data.ok) loadProducts();
}

// ── User Tree (shared helper) ─────────────────────────────────────────────

/**
 * Строит дерево пользователей по отделам в контейнере treeEl.
 * prefix — уникальный префикс для id чекбоксов ('bal' или 'stats').
 * onChangeCallback — вызывается при любом изменении выбора.
 */
function buildUserTree(treeEl, users, depts, prefix, onChangeCallback) {
  treeEl.innerHTML = '';

  // Группируем пользователей по отделу
  const byDept = {};
  depts.forEach(d => { byDept[d.id] = { dept: d, users: [] }; });
  users.forEach(u => { if (byDept[u.dept_id]) byDept[u.dept_id].users.push(u); });

  depts.forEach(d => {
    const group = byDept[d.id];
    if (!group) return;

    const deptEl = document.createElement('div');
    deptEl.className = 'tree-dept';

    const header = document.createElement('div');
    header.className = 'tree-dept-header';

    const deptCb = document.createElement('input');
    deptCb.type = 'checkbox';
    deptCb.id = `${prefix}-dept-${d.id}`;
    deptCb.dataset.deptId = d.id;

    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'tree-toggle';
    toggleBtn.textContent = '▶';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tree-dept-name';
    nameSpan.textContent = `🏢 ${d.name}`;

    const infoSpan = document.createElement('span');
    infoSpan.className = 'tree-dept-info';
    infoSpan.textContent = `${group.users.length} чел.`;

    header.appendChild(deptCb);
    header.appendChild(toggleBtn);
    header.appendChild(nameSpan);
    header.appendChild(infoSpan);

    const usersEl = document.createElement('div');
    usersEl.className = 'tree-users';

    group.users.forEach(u => {
      const userRow = document.createElement('label');
      userRow.className = 'tree-user';

      const userCb = document.createElement('input');
      userCb.type = 'checkbox';
      userCb.id = `${prefix}-user-${u.id}`;
      userCb.dataset.userId = u.id;
      userCb.dataset.deptId = d.id;

      const nameEl = document.createElement('span');
      nameEl.className = 'tree-user-name';
      nameEl.textContent = `${esc(u.last_name)} ${esc(u.first_name)}`;

      const balEl = document.createElement('span');
      balEl.className = 'tree-user-bal';
      balEl.textContent = `${u.balance} лнк`;

      userRow.appendChild(userCb);
      userRow.appendChild(nameEl);
      userRow.appendChild(balEl);
      usersEl.appendChild(userRow);

      userCb.addEventListener('change', () => {
        syncDeptCheckbox(treeEl, d.id, prefix);
        onChangeCallback();
      });
    });

    // Клик по чекбоксу отдела — выбрать/снять всех в отделе
    deptCb.addEventListener('change', () => {
      usersEl.querySelectorAll(`input[type="checkbox"]`).forEach(cb => {
        cb.checked = deptCb.checked;
      });
      onChangeCallback();
    });

    // Клик по заголовку (кроме чекбокса) — раскрыть/свернуть
    header.addEventListener('click', e => {
      if (e.target === deptCb) return;
      usersEl.classList.toggle('open');
      toggleBtn.classList.toggle('open');
    });

    deptEl.appendChild(header);
    deptEl.appendChild(usersEl);
    treeEl.appendChild(deptEl);
  });
}

function syncDeptCheckbox(treeEl, deptId, prefix) {
  const deptCb = treeEl.querySelector(`#${prefix}-dept-${deptId}`);
  if (!deptCb) return;
  const userCbs = treeEl.querySelectorAll(`input[data-dept-id="${deptId}"][data-user-id]`);
  const total   = userCbs.length;
  const checked = Array.from(userCbs).filter(cb => cb.checked).length;
  deptCb.checked       = checked === total && total > 0;
  deptCb.indeterminate = checked > 0 && checked < total;
}

function getSelectedUserIds(treeEl) {
  return Array.from(treeEl.querySelectorAll('input[data-user-id]:checked'))
    .map(cb => Number(cb.dataset.userId));
}

function treeSelectAll(treeEl, value) {
  treeEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = value;
    cb.indeterminate = false;
  });
}

// ── Balance ───────────────────────────────────────────────────────────────

async function loadBalanceSelect() {
  const [users, depts] = await Promise.all([
    apiFetch(`${API}/users`),
    apiFetch(`${API}/departments`)
  ]);
  if (!users || !depts) return;
  allUsers = users;
  allDepts = depts;

  const treeEl = document.getElementById('balUserTree');
  buildUserTree(treeEl, users, depts, 'bal', updateBalCount);
  updateBalCount();

  // Скрываем таблицу при перезагрузке дерева
  document.getElementById('balTableCard').style.display = 'none';
}

function updateBalCount() {
  const treeEl = document.getElementById('balUserTree');
  const count  = getSelectedUserIds(treeEl).length;
  document.getElementById('balSelectedCount').textContent = `Выбрано: ${count}`;
}

function balTreeSelectAll(value) {
  treeSelectAll(document.getElementById('balUserTree'), value);
  updateBalCount();
}

/** Переход к шагу 2 — строим таблицу из выбранных пользователей */
function buildBalanceTable() {
  const treeEl  = document.getElementById('balUserTree');
  const userIds = getSelectedUserIds(treeEl);
  const resEl   = document.getElementById('balResult');
  resEl.textContent = '';

  if (!userIds.length) {
    alert('Выберите хотя бы одного пользователя');
    return;
  }

  const selected = allUsers.filter(u => userIds.includes(u.id));
  const tbody    = document.querySelector('#balTable tbody');
  tbody.innerHTML = '';

  selected.forEach(u => {
    const tr = document.createElement('tr');
    tr.dataset.userId = u.id;
    tr.innerHTML = `
      <td>${esc(u.last_name)} ${esc(u.first_name)}</td>
      <td>${esc(u.dept_name)}</td>
      <td><b style="color:var(--accent2)">${u.balance}</b> лнк</td>
      <td><input type="number" step="1" placeholder="0"
           class="bal-ind-amount" data-uid="${u.id}"
           style="width:100%;padding:6px 8px"></td>
      <td><input type="text" placeholder="Комментарий"
           class="bal-ind-desc" data-uid="${u.id}"
           style="width:100%;padding:6px 8px"></td>`;
    tbody.appendChild(tr);
  });

  // Сброс пакетного поля
  document.getElementById('balBatchAmount').value = '';
  document.getElementById('balBatchDesc').value   = '';

  document.getElementById('balTableCard').style.display = 'block';
  document.getElementById('balTableCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Применяет значение из поля "всем" ко всем индивидуальным инпутам */
function applyBatchToAll() {
  const amount = document.getElementById('balBatchAmount').value;
  const desc   = document.getElementById('balBatchDesc').value;
  document.querySelectorAll('.bal-ind-amount').forEach(inp => { inp.value = amount; });
  document.querySelectorAll('.bal-ind-desc').forEach(inp   => { inp.value = desc;   });
}

/** Сброс — вернуться к шагу 1 */
function resetBalanceTable() {
  document.getElementById('balTableCard').style.display = 'none';
  document.getElementById('balResult').textContent = '';
}

/** Применяет индивидуальные значения из таблицы */
async function applyIndividualBalance() {
  const resEl = document.getElementById('balResult');
  resEl.textContent = '';

  // Собираем операции — пропускаем строки с нулевой суммой
  const operations = [];
  document.querySelectorAll('#balTable tbody tr').forEach(tr => {
    const uid    = Number(tr.dataset.userId);
    const amtEl  = tr.querySelector('.bal-ind-amount');
    const descEl = tr.querySelector('.bal-ind-desc');
    const amt    = parseInt(amtEl.value, 10);
    if (!uid || isNaN(amt) || amt === 0) return;
    operations.push({ user_id: uid, amount: amt, description: descEl.value.trim() });
  });

  if (!operations.length) {
    resEl.style.color = 'var(--red)';
    resEl.textContent = 'Нет операций — заполните хотя бы одну сумму';
    return;
  }

  const data = await apiFetch(`${API}/balance/adjust-multi`, {
    method: 'POST', body: { operations }
  });

  if (!data) return;

  if (data.ok) {
    resEl.style.color = 'var(--green)';
    resEl.textContent = `✅ Готово! Обновлено: ${data.updated} пользователей`;
    // Обновляем дерево с новыми балансами
    loadBalanceSelect();
  } else {
    resEl.style.color = 'var(--red)';
    resEl.textContent = data.error || 'Ошибка';
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────

function initStats() {
  const today    = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  if (!document.getElementById('statsFrom').value) document.getElementById('statsFrom').value = monthAgo;
  if (!document.getElementById('statsTo').value)   document.getElementById('statsTo').value   = today;

  loadStatsTree();
}

async function loadStatsTree() {
  const [users, depts] = await Promise.all([
    apiFetch(`${API}/users`),
    apiFetch(`${API}/departments`)
  ]);
  if (!users || !depts) return;
  allUsers = users;
  allDepts = depts;

  const treeEl = document.getElementById('statsUserTree');
  buildUserTree(treeEl, users, depts, 'stats', updateStatsCount);
  updateStatsCount();
}

function updateStatsCount() {
  const treeEl = document.getElementById('statsUserTree');
  const count  = getSelectedUserIds(treeEl).length;
  document.getElementById('statsSelectedCount').textContent = `Выбрано: ${count}`;
}

function statsTreeSelectAll(value) {
  treeSelectAll(document.getElementById('statsUserTree'), value);
  updateStatsCount();
}

/** Возвращает список выбранных user_id; пустой массив = все */
function getStatsUserIds() {
  const treeEl = document.getElementById('statsUserTree');
  return getSelectedUserIds(treeEl);
}

async function loadStats() {
  const from = document.getElementById('statsFrom').value;
  const to   = document.getElementById('statsTo').value;
  if (!from || !to) { alert('Укажите период'); return; }

  const userIds = getStatsUserIds();

  const data = await apiFetch(`${API}/stats`, {
    method: 'POST',
    body: { from, to, user_ids: userIds }
  });
  if (!data || data.error) { alert(data?.error || 'Ошибка'); return; }

  // Summary — 4 метрики
  document.getElementById('statBonus').textContent   = data.total_bonus;
  document.getElementById('statFine').textContent    = data.total_fine;
  document.getElementById('statPurchase').textContent = data.total_purchase;
  document.getElementById('statBalance').textContent  = data.current_balance;
  document.getElementById('statsSummary').style.display = 'block';

  // Table
  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';

  if (!data.transactions.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">Нет данных за период</td></tr>';
    return;
  }

  const typeLabel = { credit: 'Поощрение', debit: 'Штраф', purchase: 'Покупка', weekly: 'Еженед.' };

  data.transactions.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.created_at.slice(0, 16)}</td>
      <td>${esc(t.last_name)} ${esc(t.first_name)}</td>
      <td>${esc(t.dept_name)}</td>
      <td><span class="tag tag-${t.type}">${typeLabel[t.type] || t.type}</span></td>
      <td><b>${t.amount}</b></td>
      <td>${esc(t.description || '')}</td>
      <td>${esc(t.product_name || '—')}</td>`;
    tbody.appendChild(tr);
  });
}

async function exportCsv() {
  const from = document.getElementById('statsFrom').value;
  const to   = document.getElementById('statsTo').value;
  if (!from || !to) { alert('Укажите период'); return; }

  const userIds = getStatsUserIds();

  const res = await fetch(`${API}/stats?format=csv&from=${from}&to=${to}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ from, to, user_ids: userIds, format: 'csv' })
  });

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `linkshop_stats_${from}_${to}.csv`;
  a.click();
}

// ── Preview ───────────────────────────────────────────────────────────────

async function initPreview() {
  const users = await apiFetch(`${API}/users`);
  if (!users) return;

  const sel = document.getElementById('previewUser');
  sel.innerHTML = '<option value="">— Выберите пользователя —</option>';
  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = `${u.first_name}|${u.last_name}`;
    opt.textContent = `${u.last_name} ${u.first_name} (${u.dept_name}, ${u.balance} лнк)`;
    sel.appendChild(opt);
  });

  // Сбросить iframe
  document.getElementById('previewIframe').src = '';
  document.getElementById('previewContainer').classList.add('hidden');
  document.getElementById('previewEmpty').classList.remove('hidden');
}

function loadPreview() {
  const val = document.getElementById('previewUser').value;
  if (!val) { alert('Выберите пользователя'); return; }

  const [firstName, lastName] = val.split('|');
  const url = `/shop?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`;

  document.getElementById('previewIframe').src = url;
  document.getElementById('previewContainer').classList.remove('hidden');
  document.getElementById('previewEmpty').classList.add('hidden');
}

// ── Image upload (file) ───────────────────────────────────────────────────

let uploadedImageUrl = ''; // хранит URL загруженного файла

function switchImgTab(tab, btn) {
  document.querySelectorAll('.img-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (tab === 'url') {
    document.getElementById('imgTabUrl').classList.remove('hidden');
    document.getElementById('imgTabFile').classList.add('hidden');
  } else {
    document.getElementById('imgTabUrl').classList.add('hidden');
    document.getElementById('imgTabFile').classList.remove('hidden');
  }
  uploadedImageUrl = '';
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  uploadFile(file);
}

async function uploadFile(file) {
  const label = document.getElementById('fileDropLabel');
  label.textContent = 'Загрузка...';

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API}/upload-image`, {
    method: 'POST',
    headers: { 'X-Admin-Token': token }, // без Content-Type — FormData сам ставит boundary
    body: formData
  });

  const data = await res.json();

  if (res.ok && data.url) {
    uploadedImageUrl = data.url;
    label.textContent = '✅ ' + file.name;

    const preview = document.getElementById('imgUploadPreview');
    preview.innerHTML = `<img src="${data.url}" alt="preview">`;
    preview.classList.remove('hidden');
  } else {
    label.textContent = '❌ ' + (data.error || 'Ошибка загрузки');
    uploadedImageUrl = '';
  }
}

// Drag-and-drop
window.addEventListener('DOMContentLoaded', () => {
  // Инициализируем drag-and-drop после загрузки DOM
  // (основной DOMContentLoaded ниже, этот добавляется как ещё один листенер)
  setTimeout(() => {
    const zone = document.getElementById('fileDropZone');
    if (!zone) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) uploadFile(file);
    });
  }, 100);
});

// ── Settings ──────────────────────────────────────────────────────────────

const BONUS_DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** Добавляет строку с инпутом для нового Chat ID */
function addChatIdInput(value = '') {
  const list = document.getElementById('tgChatIdList');
  const row  = document.createElement('div');
  row.className = 'chatid-row';
  row.innerHTML = `
    <input type="text" class="tg-chat-id-input" placeholder="-100123456789" value="${esc(value)}" style="flex:1">
    <button type="button" class="btn-sm btn-danger" onclick="this.parentElement.remove()" title="Удалить">✕</button>`;
  list.appendChild(row);
}

/** Читает все заполненные Chat ID из списка */
function getChatIdInputValues() {
  return Array.from(document.querySelectorAll('.tg-chat-id-input'))
    .map(inp => inp.value.trim())
    .filter(Boolean);
}

/** Заполняет список Chat ID инпутами из строки (разделитель — запятая) */
function setChatIdInputs(raw) {
  const list = document.getElementById('tgChatIdList');
  list.innerHTML = '';
  const ids = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (ids.length === 0) {
    addChatIdInput(''); // хотя бы одна пустая строка
  } else {
    ids.forEach(id => addChatIdInput(id));
  }
}

async function loadSettings() {
  const data = await apiFetch(`${API}/settings`);
  if (!data) return;

  document.getElementById('tgBotToken').value     = data.tg_bot_token      || '';
  document.getElementById('tgUserBotToken').value = data.tg_user_bot_token || '';
  document.getElementById('tgEnabled').checked    = data.tg_notify_purchase === '1';

  setChatIdInputs(data.tg_chat_id || '');

  document.getElementById('bonusAmount').value = data.bonus_amount || '80';
  document.getElementById('bonusDay').value    = data.bonus_day    || '1';
  document.getElementById('bonusHour').value   = data.bonus_hour   || '9';

  updateBonusInfo();
  document.getElementById('settingsResult').textContent = '';
}

function updateBonusInfo() {
  const day    = parseInt(document.getElementById('bonusDay').value, 10);
  const hour   = parseInt(document.getElementById('bonusHour').value, 10);
  const amount = document.getElementById('bonusAmount').value;
  const infoEl = document.getElementById('bonusScheduleInfo');
  if (infoEl) {
    const dayName = BONUS_DAYS[day] || '?';
    const h = String(hour).padStart(2, '0');
    infoEl.textContent = `📅 Каждый ${dayName} в ${h}:00 МСК — +${amount} линков`;
  }
}

async function saveSettings() {
  const resEl = document.getElementById('settingsResult');
  resEl.textContent = '';

  const bonusAmount = parseInt(document.getElementById('bonusAmount').value, 10);
  const bonusDay    = parseInt(document.getElementById('bonusDay').value, 10);
  const bonusHour   = parseInt(document.getElementById('bonusHour').value, 10);

  if (isNaN(bonusAmount) || bonusAmount < 1) {
    resEl.style.color = 'var(--red)';
    resEl.textContent = 'Количество линков должно быть больше 0';
    return;
  }
  if (isNaN(bonusHour) || bonusHour < 0 || bonusHour > 23) {
    resEl.style.color = 'var(--red)';
    resEl.textContent = 'Час должен быть от 0 до 23';
    return;
  }

  // Собираем все chat_id через запятую
  const chatIds = getChatIdInputValues().join(',');

  const body = {
    tg_bot_token:        document.getElementById('tgBotToken').value.trim(),
    tg_user_bot_token:   document.getElementById('tgUserBotToken').value.trim(),
    tg_chat_id:          chatIds,
    tg_notify_purchase:  document.getElementById('tgEnabled').checked ? '1' : '0',
    bonus_amount:        String(bonusAmount),
    bonus_day:           String(bonusDay),
    bonus_hour:          String(bonusHour)
  };

  const data = await apiFetch(`${API}/settings`, { method: 'POST', body });
  if (data && data.ok) {
    resEl.style.color = 'var(--green)';
    resEl.textContent = '✅ Настройки сохранены';
    updateBonusInfo();
  } else if (data) {
    resEl.style.color = 'var(--red)';
    resEl.textContent = data.error || 'Ошибка сохранения';
  }
}

async function testTelegram() {
  const resEl = document.getElementById('settingsResult');
  resEl.style.color = 'var(--muted)';
  resEl.textContent = 'Отправляю тестовое сообщение...';

  // Сначала сохраняем, потом тестируем
  await saveSettings();

  const res = await fetch(`${API}/settings/test-telegram`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await res.json();

  if (res.ok && data.ok) {
    resEl.style.color = 'var(--green)';
    resEl.textContent = '✅ Тестовое сообщение отправлено! Проверьте Telegram.';
  } else {
    resEl.style.color = 'var(--red)';
    resEl.textContent = '❌ Ошибка: ' + (data.error || 'Неизвестная ошибка. Проверьте токен и Chat ID.');
  }
}

// ── Orders ────────────────────────────────────────────────────────────────

let allOrders = [];

async function loadOrders() {
  const data = await apiFetch(`${API}/orders`);
  if (!data) return;
  allOrders = data;
  renderOrders();
}

function renderOrders() {
  const showCompleted = document.getElementById('ordersShowCompleted').checked;
  const list = showCompleted ? allOrders : allOrders.filter(o => !o.completed);

  const countEl = document.getElementById('ordersCount');
  countEl.textContent = `Всего: ${allOrders.length}, показано: ${list.length}`;

  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">
      ${allOrders.length ? 'Все заказы выполнены' : 'Заказов пока нет'}</td></tr>`;
    return;
  }

  list.forEach(o => {
    const tr = document.createElement('tr');
    tr.dataset.orderId = o.id;
    if (o.completed) tr.classList.add('order-completed');

    const dateStr = o.created_at ? o.created_at.slice(0, 16).replace('T', ' ') : '—';

    // Chat ID ячейка — инлайн редактирование
    const chatIdDisplay = o.tg_chat_id
      ? `<span class="tg-chat-badge" title="Telegram Chat ID">${esc(o.tg_chat_id)}</span>
         <button class="btn-sm btn-secondary" style="margin-left:4px" onclick="editTgChatId(${o.user_id}, this, '${esc(o.tg_chat_id || '')}')">✏</button>`
      : `<button class="btn-sm btn-secondary" onclick="editTgChatId(${o.user_id}, this, '')">+ Добавить</button>`;

    // Сертификат
    const certHtml = o.cert_file
      ? `<span class="cert-badge">📄 ${esc(o.cert_file)}</span>
         <button class="btn-sm btn-danger" style="margin-left:4px" onclick="deleteCert(${o.id})" title="Удалить файл">✕</button>`
      : '';

    // Текст от пользователя
    const userTextHtml = o.user_text
      ? `<span class="user-text-badge" title="${esc(o.user_text)}">${esc(o.user_text)}</span>`
      : '<span style="color:var(--muted)">—</span>';

    // Статус заказа
    const statusBadge = o.completed === 2
      ? `<span class="order-status-badge cancelled">Отменён</span>`
      : o.completed === 1
        ? `<span class="order-status-badge done">Выполнен</span>`
        : '';

    tr.innerHTML = `
      <td>${o.id}</td>
      <td style="white-space:nowrap">${dateStr}</td>
      <td>
        <b>${esc(o.last_name)} ${esc(o.first_name)}</b>
        <small style="display:block;color:var(--muted)">${esc(o.dept_name)}</small>
      </td>
      <td class="tg-chat-cell">${chatIdDisplay}</td>
      <td>
        ${esc(o.product_name)}
        <small style="display:block;color:var(--muted)">${o.paid_price} лнк</small>
      </td>
      <td>${userTextHtml}</td>
      <td><b style="color:var(--accent2)">${o.paid_price}</b></td>
      <td class="cert-cell">
        <div class="cert-actions">
          ${certHtml}
          <label class="btn-sm btn-secondary cert-upload-btn" title="Загрузить электронный сертификат">
            📎 ${o.cert_file ? 'Заменить' : 'Загрузить файл'}
            <input type="file" style="display:none" onchange="uploadCert(${o.id}, this)">
          </label>
        </div>
        <div class="cert-status" id="cert-status-${o.id}"></div>
      </td>
      <td style="text-align:center">
        ${statusBadge}
        ${o.completed === 0 || o.completed == null ? `
        <div class="order-action-btns">
          <button class="btn-order-done"    title="Выполнен"  onclick="completeOrder(${o.id})">✔</button>
          <button class="btn-order-cancel"  title="Отменить"  onclick="cancelOrder(${o.id})">✖</button>
        </div>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
}

async function completeOrder(orderId) {
  const data = await apiFetch(`${API}/orders/${orderId}/complete`, {
    method: 'PUT',
    body: { completed: true }
  });
  if (data && data.ok) {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      allOrders[idx].completed = 1;
      allOrders[idx].completed_at = new Date().toISOString();
    }
    renderOrders();
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Отменить заказ? Линки будут возвращены пользователю.')) return;
  const data = await apiFetch(`${API}/orders/${orderId}/cancel`, { method: 'PUT' });
  if (data && data.ok) {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) allOrders[idx].completed = 2;
    renderOrders();
  } else if (data) {
    alert(data.error || 'Ошибка отмены заказа');
  }
}

async function toggleOrderComplete(orderId, cb) {
  const completed = cb.checked;
  const data = await apiFetch(`${API}/orders/${orderId}/complete`, {
    method: 'PUT',
    body: { completed }
  });
  if (data && data.ok) {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      allOrders[idx].completed = completed ? 1 : 0;
      allOrders[idx].completed_at = completed ? new Date().toISOString() : null;
    }
    renderOrders();
  } else {
    cb.checked = !completed;
  }
}

async function uploadCert(orderId, input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(`cert-status-${orderId}`);
  statusEl.textContent = '⏳ Загрузка...';
  statusEl.style.color = 'var(--muted)';

  const formData = new FormData();
  formData.append('cert', file);

  const res = await fetch(`${API}/orders/${orderId}/upload-cert`, {
    method: 'POST',
    headers: { 'X-Admin-Token': token },
    body: formData
  });
  const data = await res.json();

  if (res.ok && data.ok) {
    // Обновляем локальный стейт
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) allOrders[idx].cert_file = data.cert_file;

    const order = idx !== -1 ? allOrders[idx] : null;
    if (order && order.tg_chat_id) {
      statusEl.textContent = '✅ Файл загружен. Telegram отправится после подтверждения ✔';
    } else {
      statusEl.textContent = '✅ Файл загружен (TG Chat ID не указан)';
    }
    statusEl.style.color = 'var(--green)';
    // Перерисовываем через секунду чтобы статус был виден
    setTimeout(() => renderOrders(), 2000);
  } else {
    statusEl.textContent = '❌ ' + (data.error || 'Ошибка загрузки');
    statusEl.style.color = 'var(--red)';
  }
  input.value = '';
}

async function deleteCert(orderId) {
  if (!confirm('Удалить прикреплённый файл?')) return;
  const data = await apiFetch(`${API}/orders/${orderId}/cert`, { method: 'DELETE' });
  if (data && data.ok) {
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) allOrders[idx].cert_file = null;
    renderOrders();
  }
}

/** Инлайн редактирование Telegram Chat ID пользователя */
function editTgChatId(userId, btn, currentValue) {
  const cell = btn.closest('.tg-chat-cell');
  const original = cell.innerHTML;

  cell.innerHTML = `
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
      <input type="text" class="tg-chat-edit-input" value="${esc(currentValue)}"
        placeholder="Например: 123456789" style="width:140px;padding:4px 8px;font-size:.85rem">
      <button class="btn-sm" onclick="saveTgChatId(${userId}, this)">✓</button>
      <button class="btn-sm btn-secondary" onclick="cancelTgChatId(this, \`${original.replace(/`/g, '\\`')}\`)">✕</button>
    </div>`;
  cell.querySelector('.tg-chat-edit-input').focus();
}

function cancelTgChatId(btn, original) {
  btn.closest('.tg-chat-cell').innerHTML = original;
}

async function saveTgChatId(userId, btn) {
  const cell  = btn.closest('.tg-chat-cell');
  const input = cell.querySelector('.tg-chat-edit-input');
  const value = input.value.trim();

  const data = await apiFetch(`${API}/users/${userId}/tg-chat-id`, {
    method: 'PUT',
    body: { tg_chat_id: value }
  });

  if (data && data.ok) {
    // Обновляем все заказы этого пользователя в локальном стейте
    allOrders.forEach(o => {
      if (o.user_id === userId) o.tg_chat_id = value || null;
    });
    renderOrders();
  } else {
    alert(data?.error || 'Ошибка сохранения');
    loadOrders();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Enter на форме логина
  ['loginUser', 'loginPass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  if (token) {
    // Проверяем валидность токена
    fetch(`${API}/departments`, { headers: authHeaders() }).then(r => {
      if (r.ok) showApp();
      else showLogin();
    }).catch(() => showLogin());
  }
});
