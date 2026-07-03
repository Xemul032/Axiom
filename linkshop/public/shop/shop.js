/* ══════════════════════════════════════════════
   LinkShop — shop.js
   Получает first_name + last_name из URL параметров:
   /shop?first_name=Иван&last_name=Иванов
   или из postMessage от родительского окна
══════════════════════════════════════════════ */

let currentUser = null;
let pendingProduct = null;
let products = [];

// ── Orders state ──────────────────────────────────────────────────────────
let ordersOpen = false;

// ── Notifications state ───────────────────────────────────────────────────
let notifOffset = 0;
const NOTIF_LIMIT = 10;
let notifTotal = 0;
let notifOpen = false;

// Определяем базовый URL: берём из URL-параметра server= или из текущего origin
// Это позволяет магазину работать как при прямом открытии (localhost),
// так и в iframe из внешнего сайта (с явным указанием сервера)
const _params = new URLSearchParams(window.location.search);
const _serverBase = _params.get('server') || window.location.origin;
const SHOP_API = `${_serverBase}/api/shop`;

// ── Init ──────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Слушаем postMessage от внешнего сайта
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'LINKSHOP_USER') {
      init(e.data.first_name, e.data.last_name);
    }
  });

  // Берём из URL query params
  const params = new URLSearchParams(window.location.search);
  const firstName = params.get('first_name');
  const lastName  = params.get('last_name');
  const pinParam  = params.get('pin');

  if (firstName && lastName) {
    init(firstName, lastName);
  } else if (pinParam) {
    initByPin(pinParam);
  } else {
    // Ждём postMessage 1 секунду, потом показываем PIN-экран
    setTimeout(() => {
      if (!currentUser) showPinScreen();
    }, 600);
  }

  // Инициализируем PIN-инпуты
  initPinInputs();
});

async function init(firstName, lastName) {
  try {
    // Загружаем пользователя
    const userRes = await fetch(`${SHOP_API}/me?first_name=${enc(firstName)}&last_name=${enc(lastName)}`);

    if (!userRes.ok) {
      // Если сервер вернул pin_only=true — показываем PIN-экран без сообщения об ошибке
      if (userRes.status === 403) {
        const errData = await userRes.json().catch(() => ({}));
        if (errData.pin_only) {
          showPinScreen();
          return;
        }
      }
      // Пользователь не найден по ФИО — предлагаем ввести PIN
      // (такое бывает когда имя в amoCRM не совпадает с базой)
      showPinScreen();
      return;
    }

    currentUser = await userRes.json();

    // Заголовок
    document.getElementById('userName').textContent    = `${currentUser.last_name} ${currentUser.first_name}`;
    document.getElementById('userDept').textContent    = currentUser.dept_name;
    document.getElementById('userBalance').textContent = formatLinks(currentUser.balance);
    updateSalaryBtn(currentUser.salary_folder_url);

    // Загружаем товары
    await loadProducts(firstName, lastName);

    hide('loadingScreen');
    show('shopApp');

    // Проверяем новые уведомления (не блокирует загрузку)
    checkNewNotifications();
    checkPendingOrders();

  } catch (e) {
    showError('Ошибка подключения', 'Не удалось связаться с сервером');
  }
}

async function loadProducts(firstName, lastName) {
  const res = await fetch(`${SHOP_API}/products?first_name=${enc(firstName)}&last_name=${enc(lastName)}`);
  products = await res.json();

  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  if (!products.length) {
    show('emptyState');
    return;
  }

  hide('emptyState');

  products.forEach(p => {
    const canAfford = currentUser.balance >= p.final_price;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${esc(p.image_url || '')}" alt="${esc(p.name)}"
           onerror="this.src='https://placehold.co/400x200/1a1d27/4ecca3?text=No+Image'">
      <div class="pc-body">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-desc">${esc(p.description || '')}</div>
        <div class="pc-price-row">
          <span class="pc-final">${formatLinks(p.final_price)}</span>
        </div>
      </div>
      <div class="pc-footer">
        <button class="buy-btn" ${canAfford ? '' : 'disabled'}
                onclick="openBuyModal(${p.id})">
          ${canAfford ? '🛒 Купить' : '❌ Недостаточно'}
        </button>
      </div>`;
    // Раскрытие/скрытие описания по клику на карточку
    card.addEventListener('click', (e) => {
      // Не реагируем на клик по кнопке "Купить"
      if (e.target.closest('.buy-btn')) return;
      card.classList.toggle('expanded');
    });

    grid.appendChild(card);
  });
}

// ── Buy Modal ─────────────────────────────────────────────────────────────

function openBuyModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  pendingProduct = p;

  document.getElementById('modalImg').src       = p.image_url || 'https://placehold.co/400x200/1a1d27/4ecca3?text=No+Image';
  document.getElementById('modalImg').onerror   = function() { this.src = 'https://placehold.co/400x200/1a1d27/4ecca3?text=No+Image'; };
  document.getElementById('modalName').textContent    = p.name;
  document.getElementById('modalPrice').textContent   = formatLinks(p.final_price);
  document.getElementById('modalBalance').textContent = formatLinks(currentUser.balance);
  document.getElementById('modalAfter').textContent   = formatLinks(+(currentUser.balance - p.final_price).toFixed(2));

  // Показываем/скрываем текстовое поле
  const tfWrap    = document.getElementById('modalUserTextField');
  const tfTextarea = document.getElementById('modalUserText');
  if (p.text_field_enabled) {
    tfTextarea.placeholder = p.text_field_placeholder || 'Введите текст...';
    tfTextarea.value = '';
    tfWrap.classList.remove('hidden');
  } else {
    tfWrap.classList.add('hidden');
    tfTextarea.value = '';
  }

  show('buyModal');
}

function closeModal() {
  hide('buyModal');
  pendingProduct = null;
}

async function confirmBuy() {
  if (!pendingProduct || !currentUser) return;

  // Сохраняем ссылки ДО closeModal(), который обнуляет pendingProduct
  const product  = pendingProduct;
  const user     = currentUser;
  const userText = document.getElementById('modalUserText').value.trim();

  // Проверяем обязательность текстового поля
  if (product.text_field_enabled && !userText) {
    const ta = document.getElementById('modalUserText');
    ta.style.borderColor = 'var(--red, #e74c3c)';
    ta.focus();
    setTimeout(() => { ta.style.borderColor = ''; }, 2000);
    return;
  }

  closeModal();

  // Определяем идентификатор пользователя
  const params = new URLSearchParams(window.location.search);
  const pin    = params.get('pin');

  const bodyData = { product_id: product.id };
  if (pin) {
    bodyData.pin = pin;
  } else {
    bodyData.first_name = user.first_name;
    bodyData.last_name  = user.last_name;
  }
  if (product.text_field_enabled && userText) {
    bodyData.user_text = userText;
  }

  try {
    const res = await fetch(`${SHOP_API}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      currentUser.balance = data.new_balance;
      document.getElementById('userBalance').textContent = formatLinks(data.new_balance);
      showToast(`✅ Куплено: ${product.name}. Остаток: ${formatLinks(data.new_balance)}`, 'ok');
      // Перерендерим карточки с новым балансом
      await loadProducts(user.first_name, user.last_name);
      // Покупка = новая транзакция — обновляем бейджи
      checkNewNotifications();
      checkPendingOrders();
    } else {
      showToast(`❌ ${data.error || 'Ошибка покупки'}`, 'err');
    }
  } catch (e) {
    showToast('❌ Ошибка соединения с сервером', 'err');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function showError(title, text) {
  hide('loadingScreen');
  hide('shopApp');
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorText').textContent  = text;
  show('errorScreen');
}

let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  show('toast');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide('toast'), 3500);
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function enc(str) { return encodeURIComponent(str); }

function formatLinks(n) {
  const num = Math.abs(Math.round(n));
  const mod10  = num % 10;
  const mod100 = num % 100;
  let word;
  if (mod100 >= 11 && mod100 <= 19) {
    word = 'линков';
  } else if (mod10 === 1) {
    word = 'линк';
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = 'линка';
  } else {
    word = 'линков';
  }
  return `${n} ${word}`;
}

// ── PIN Screen ────────────────────────────────────────────────────────────

function showPinScreen() {
  hide('loadingScreen');
  hide('shopApp');
  hide('errorScreen');
  show('pinScreen');
  // Фокус на первый инпут
  setTimeout(() => {
    const first = document.querySelector('.pin-digit');
    if (first) first.focus();
  }, 100);
}

function initPinInputs() {
  const digits = document.querySelectorAll('.pin-digit');

  digits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      // Только цифры
      input.value = input.value.replace(/\D/g, '').slice(-1);

      if (input.value) {
        input.classList.add('filled');
        // Переходим к следующему
        if (idx < digits.length - 1) digits[idx + 1].focus();
      } else {
        input.classList.remove('filled');
      }

      // Автоматический вход при заполнении всех 4 полей
      const allFilled = [...digits].every(d => d.value.length === 1);
      if (allFilled) submitPin();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
        digits[idx - 1].value = '';
        digits[idx - 1].classList.remove('filled');
      }
    });

    // Запрещаем вставку нецифрового текста
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...text.slice(0, 4)].forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch;
          digits[i].classList.add('filled');
        }
      });
      const allFilled = [...digits].every(d => d.value.length === 1);
      if (allFilled) submitPin();
    });
  });
}

async function submitPin() {
  const digits = document.querySelectorAll('.pin-digit');
  const pin = [...digits].map(d => d.value).join('');
  if (pin.length !== 4) return;

  const errEl = document.getElementById('pinError');
  errEl.textContent = '';

  await initByPin(pin);
}

async function initByPin(pin) {
  try {
    hide('pinScreen');
    show('loadingScreen');

    const userRes = await fetch(`${SHOP_API}/me?pin=${enc(String(pin))}`);

    if (!userRes.ok) {
      const err = await userRes.json();
      hide('loadingScreen');
      show('pinScreen');

      // Показываем ошибку и трясём инпуты
      const errEl = document.getElementById('pinError');
      if (errEl) {
        errEl.textContent = err.error || 'Неверный PIN';
        // Перезапускаем анимацию
        errEl.style.animation = 'none';
        void errEl.offsetWidth;
        errEl.style.animation = '';
      }
      // Очищаем поля
      document.querySelectorAll('.pin-digit').forEach(d => {
        d.value = '';
        d.classList.remove('filled');
      });
      setTimeout(() => {
        const first = document.querySelector('.pin-digit');
        if (first) first.focus();
      }, 100);
      return;
    }

    currentUser = await userRes.json();

    document.getElementById('userName').textContent    = `${currentUser.last_name} ${currentUser.first_name}`;
    document.getElementById('userDept').textContent    = currentUser.dept_name;
    document.getElementById('userBalance').textContent = formatLinks(currentUser.balance);
    updateSalaryBtn(currentUser.salary_folder_url);

    await loadProducts(currentUser.first_name, currentUser.last_name);

    hide('loadingScreen');
    show('shopApp');

    // Проверяем новые уведомления
    checkNewNotifications();
    checkPendingOrders();

  } catch (e) {
    showError('Ошибка подключения', 'Не удалось связаться с сервером');
  }
}

// ── Salary button ─────────────────────────────────────────────────────────

/**
 * Показывает или скрывает кнопку "₽" в зависимости от наличия ссылки.
 * @param {string|null} url — значение salary_folder_url из API
 */
function updateSalaryBtn(url) {
  const btn = document.getElementById('salaryBtn');
  if (!btn) return;
  if (url) {
    btn.href = url;
    btn.classList.remove('hidden');
  } else {
    btn.href = '#';
    btn.classList.add('hidden');
  }
}

// ── Notifications ─────────────────────────────────────────────────────────

/** Ключ localStorage для хранения ID последней просмотренной транзакции */
function notifSeenKey() {
  return `linkshop_seen_${currentUser ? currentUser.id : 'u'}`;
}

/** Сохраняет ID последней просмотренной транзакции */
function saveSeenId(id) {
  try { localStorage.setItem(notifSeenKey(), String(id)); } catch (e) {}
}

/** Читает ID последней просмотренной транзакции */
function loadSeenId() {
  try { return parseInt(localStorage.getItem(notifSeenKey()), 10) || 0; } catch (e) { return 0; }
}

/**
 * Формирует строку запроса идентификации пользователя.
 * Использует PIN если пользователь авторизован через него, иначе ФИО.
 */
function userQueryParams() {
  if (!currentUser) return '';
  const params = new URLSearchParams(window.location.search);
  const pin = params.get('pin');
  if (pin) return `pin=${enc(pin)}`;
  return `first_name=${enc(currentUser.first_name)}&last_name=${enc(currentUser.last_name)}`;
}

/**
 * Проверяет наличие новых (непросмотренных) транзакций и обновляет бейдж.
 * Вызывается после загрузки пользователя и после каждой покупки.
 */
async function checkNewNotifications() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${SHOP_API}/transactions?${userQueryParams()}&offset=0&limit=1`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.transactions || !data.transactions.length) return;

    const latestId = data.transactions[0].id;
    const seenId   = loadSeenId();
    const hasNew   = latestId > seenId;

    updateBellBadge(hasNew);
  } catch (e) { /* тихо */ }
}

/** Обновляет внешний вид колокольчика */
function updateBellBadge(hasNew) {
  const btn   = document.getElementById('bellBtn');
  const badge = document.getElementById('bellBadge');
  if (!btn || !badge) return;

  if (hasNew) {
    btn.classList.add('has-new');
    badge.classList.remove('hidden');
  } else {
    btn.classList.remove('has-new');
    badge.classList.add('hidden');
  }
}

/** Открывает/закрывает панель уведомлений */
async function toggleNotifications() {
  if (notifOpen) {
    closeNotifications();
  } else {
    openNotifications();
  }
}

async function openNotifications() {
  notifOpen = true;
  notifOffset = 0;
  show('notifPanel');
  show('notifOverlay');

  await fetchAndRenderNotifications(false);
}

function closeNotifications() {
  notifOpen = false;
  hide('notifPanel');
  hide('notifOverlay');
}

/** Загружает следующую страницу (кнопка «Загрузить следующие записи») */
async function loadMoreNotifications() {
  notifOffset += NOTIF_LIMIT;
  await fetchAndRenderNotifications(true);
}

/**
 * Запрашивает транзакции и рисует их в списке.
 * @param {boolean} append — true = дописать к существующим, false = заменить
 */
async function fetchAndRenderNotifications(append) {
  const listEl   = document.getElementById('notifList');
  const footerEl = document.getElementById('notifFooter');
  const loadBtn  = document.getElementById('notifLoadMore');

  if (!append) {
    listEl.innerHTML = '<div class="notif-empty">Загрузка...</div>';
    footerEl.classList.add('hidden');
  } else {
    if (loadBtn) loadBtn.disabled = true;
  }

  try {
    const res = await fetch(
      `${SHOP_API}/transactions?${userQueryParams()}&offset=${notifOffset}&limit=${NOTIF_LIMIT}`
    );
    if (!res.ok) throw new Error('Ошибка запроса');

    const data = await res.json();
    notifTotal = data.total;

    const seenId   = loadSeenId();
    const typeLabel = { credit: 'Начисление', debit: 'Штраф', purchase: 'Покупка', weekly: 'Еженед.' };

    if (!append) listEl.innerHTML = '';

    if (!data.transactions.length && !append) {
      listEl.innerHTML = '<div class="notif-empty">История пуста</div>';
      footerEl.classList.add('hidden');
      return;
    }

    data.transactions.forEach(t => {
      const isPlus   = (t.type === 'credit' || t.type === 'weekly');
      const sign     = isPlus ? '+' : '−';
      const amtClass = isPlus ? 'plus' : 'minus';
      const isUnseen = t.id > seenId;

      // Форматируем дату в формате ДД.ММ.ГГ
      const dtParts = t.created_at.slice(0, 10).split('-'); // ['2026','07','02']
      const dateStr = `${dtParts[2]}.${dtParts[1]}.${dtParts[0].slice(2)}`;

      // Описание: для покупок берём название товара если есть
      const desc = t.product_name
        ? `${t.product_name}`
        : (t.description || typeLabel[t.type] || t.type);

      const item = document.createElement('div');
      item.className = `notif-item${isUnseen ? ' unseen' : ''}`;
      item.innerHTML = `
        <span class="notif-amount ${amtClass}">${sign}${Math.abs(t.amount)}</span>
        <span class="notif-desc" title="${esc(desc)}">${esc(desc)}</span>
        <span class="notif-type ${t.type}">${typeLabel[t.type] || t.type}</span>
        <span class="notif-date">${dateStr}</span>`;
      listEl.appendChild(item);
    });

    // Показываем кнопку "загрузить ещё" если есть что грузить
    const loaded = notifOffset + data.transactions.length;
    if (loaded < notifTotal) {
      footerEl.classList.remove('hidden');
      if (loadBtn) loadBtn.disabled = false;
    } else {
      footerEl.classList.add('hidden');
    }

    // Отмечаем просмотренными: берём максимальный id из первой порции
    if (!append && data.transactions.length > 0) {
      // Первая транзакция — самая новая (сортировка DESC)
      const maxId = data.transactions[0].id;
      if (maxId > seenId) {
        saveSeenId(maxId);
        updateBellBadge(false);
      }
    }

  } catch (e) {
    if (!append) {
      listEl.innerHTML = '<div class="notif-empty">Не удалось загрузить историю</div>';
    }
    if (loadBtn) loadBtn.disabled = false;
  }
}

// ── Orders ────────────────────────────────────────────────────────────────

/** Обновляет жёлтый бейдж над кнопкой заказов */
function updateOrdersBadge(hasPending) {
  const btn   = document.getElementById('ordersBtn');
  const badge = document.getElementById('ordersBadge');
  if (!btn || !badge) return;

  if (hasPending) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Проверяет наличие заказов в ожидании и обновляет бейдж.
 * Вызывается после загрузки пользователя и после каждой покупки.
 */
async function checkPendingOrders() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${SHOP_API}/orders?${userQueryParams()}`);
    if (!res.ok) return;
    const data = await res.json();
    const hasPending = !!(data.orders && data.orders.some(o => !o.completed));
    updateOrdersBadge(hasPending);
  } catch (e) { /* тихо */ }
}

/** Открывает/закрывает панель заказов */
function toggleOrders() {
  if (ordersOpen) {
    closeOrders();
  } else {
    openOrders();
  }
}

async function openOrders() {
  ordersOpen = true;
  show('ordersPanel');
  show('ordersOverlay');
  await fetchAndRenderOrders();
}

function closeOrders() {
  ordersOpen = false;
  hide('ordersPanel');
  hide('ordersOverlay');
}

/** Загружает и отрисовывает список заказов пользователя */
async function fetchAndRenderOrders() {
  const listEl = document.getElementById('ordersList');
  listEl.innerHTML = '<div class="notif-empty">Загрузка...</div>';

  try {
    const res = await fetch(`${SHOP_API}/orders?${userQueryParams()}`);
    if (!res.ok) throw new Error('Ошибка запроса');

    const data = await res.json();
    listEl.innerHTML = '';

    if (!data.orders || !data.orders.length) {
      listEl.innerHTML = '<div class="notif-empty">Заказов пока нет</div>';
      return;
    }

    data.orders.forEach(o => {
      const isCancelled = o.completed === 2;
      const isPending   = !o.completed;
      const statusClass = isPending ? 'pending' : isCancelled ? 'cancelled' : 'done';
      const statusLabel = isPending ? 'В ожидании' : isCancelled ? 'Отменён' : 'Завершён';

      // Форматируем дату создания (created_at хранится как Moscow time без суффикса → указываем +03:00)
      const dt  = new Date(o.created_at.replace(' ', 'T') + '+03:00');
      const now = new Date();
      let dateStr;
      if (dt.toDateString() === now.toDateString()) {
        dateStr = 'Сегодня';
      } else {
        dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
      }

      const thumbSrc = o.image_url || '';

      const item = document.createElement('div');
      item.className = 'order-item';
      item.innerHTML = `
        <img class="order-thumb"
             src="${esc(thumbSrc)}"
             alt="${esc(o.product_name)}"
             onerror="this.src='https://placehold.co/40x40/cce3f2/0085CA?text=📦'">
        <div class="order-info">
          <div class="order-name" title="${esc(o.product_name)}">${esc(o.product_name)}</div>
          <div class="order-date">${dateStr}</div>
        </div>
        <span class="order-status ${statusClass}">${statusLabel}</span>`;
      listEl.appendChild(item);
    });

  } catch (e) {
    listEl.innerHTML = '<div class="notif-empty">Не удалось загрузить заказы</div>';
  }
}
