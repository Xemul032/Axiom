// ==UserScript==
// @name         LinkShop — amoCRM кнопка магазина
// @namespace    linkshop
// @version      2.1
// @description  Добавляет кнопку магазина линков на cplink.amocrm.ru. При клике открывает iframe с магазином. Автоматически начисляет линки за действия (Принять, Перейти к сделке, Звонки).
// @author       LinkShop
// @match        https://cplink.amocrm.ru/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // КОНФИГУРАЦИЯ — измените URL на адрес вашего сервера
  // ══════════════════════════════════════════════════════════
  const LINKSHOP_URL = 'http://192.168.137.66:3000'; // ← укажите адрес сервера

  const LOGO_SVG_URL = 'https://raw.githubusercontent.com/Xemul032/AmoCRM/refs/heads/main/link_logo_wt.svg';

  // ══════════════════════════════════════════════════════════
  // Стили
  // ══════════════════════════════════════════════════════════
  GM_addStyle(`
    #ls-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      z-index: 99999;
      align-items: center;
      justify-content: center;
    }
    #ls-overlay.open {
      display: flex;
    }

    #ls-modal {
      position: relative;
      width: min(860px, 95vw);
      height: min(640px, 92vh);
      background: #1a1d27;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      animation: lsSlideIn 0.25s ease;
    }
    @keyframes lsSlideIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to   { opacity: 1; transform: none; }
    }

    #ls-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: linear-gradient(90deg, #0085CA 100%,  #ffffff 0%);
      border-bottom: 1px solid rgba(0, 133, 202, 0.3);
      flex-shrink: 0;
    }
    #ls-titlebar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #ls-titlebar .ls-logo-img {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    #ls-titlebar .ls-logo-img svg,
    #ls-titlebar .ls-logo-img img {
      width: 28px;
      height: 28px;
      filter: drop-shadow(0 0 6px rgba(0, 133, 202, 0.9)) drop-shadow(0 0 14px rgba(0, 133, 202, 0.5));
    }
    #ls-titlebar .ls-logo-text {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    #ls-titlebar .ls-user-tag {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.75);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    #ls-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    #ls-close:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.2);
    }

    #ls-frame {
      flex: 1;
      border: none;
      width: 100%;
      display: block;
    }

    /* ── Кнопка в левом меню nav_menu ── */
    #ls-nav-btn-wrapper {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 12px 0 !important;
      cursor: pointer !important;
      transition: all 0.25s ease !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    #ls-nav-btn-wrapper:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    #ls-nav-btn {
      width: 48px !important;
      height: 48px !important;
      min-width: 48px !important;
      min-height: 48px !important;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      color: rgba(255, 255, 255, 0.7) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 auto !important;
      padding: 0 !important;
      transition: all 0.25s ease !important;
      opacity: 0.85 !important;
      position: relative !important;
    }
    #ls-nav-btn svg {
      width: 32px !important;
      height: 32px !important;
      fill: rgba(255, 255, 255, 0.7) !important;
      transition: all 0.25s ease !important;
      filter: drop-shadow(0 0 5px rgba(0, 133, 202, 0.7)) drop-shadow(0 0 10px rgba(0, 133, 202, 0.35)) !important;
    }
    #ls-nav-btn:hover svg,
    #ls-nav-btn-wrapper:hover #ls-nav-btn svg {
      fill: rgba(255, 255, 255, 1) !important;
    }
    #ls-nav-btn:hover,
    #ls-nav-btn-wrapper:hover #ls-nav-btn {
      opacity: 1 !important;
      transform: scale(1.05) !important;
    }
    #ls-nav-btn:active {
      transform: scale(0.95) !important;
    }
    #ls-nav-btn.loading {
      pointer-events: none;
      opacity: 0.6 !important;
    }
    #ls-nav-btn.loading::after {
      content: "";
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: rgba(255,255,255,0.8);
      border-radius: 50%;
      animation: ls-nav-spin 0.8s linear infinite;
    }
    @keyframes ls-nav-spin {
      to { transform: rotate(360deg); }
    }
    .ls-nav-btn-label {
      color: rgba(255, 255, 255, 0.7) !important;
      font-size: 11px !important;
      font-family: inherit !important;
      margin-top: 4px !important;
      text-align: center !important;
      white-space: nowrap !important;
      transition: color 0.25s ease !important;
    }
    #ls-nav-btn-wrapper:hover .ls-nav-btn-label {
      color: rgba(255, 255, 255, 1) !important;
    }
  `);

  // ══════════════════════════════════════════════════════════
  // Загрузка SVG-иконки
  // ══════════════════════════════════════════════════════════
  let _svgCache = null;

  function loadSVG() {
    return new Promise((resolve) => {
      if (_svgCache) { resolve(_svgCache); return; }
      GM_xmlhttpRequest({
        method: 'GET',
        url: LOGO_SVG_URL,
        onload(res) {
          _svgCache = (res.status === 200 && res.responseText.includes('<svg'))
            ? res.responseText
            : '🔗';
          resolve(_svgCache);
        },
        onerror() { _svgCache = '🔗'; resolve(_svgCache); }
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // Получить имя пользователя из интерфейса amoCRM
  // ══════════════════════════════════════════════════════════
  function getAmoCrmUserName() {
    const SELECTOR =
      '#left_menu > div.nav__top > div.nav__top__userbar > ' +
      'div.nav__top__userbar__userinfo.js-manage-profile > div';

    const container = document.querySelector(SELECTOR);
    if (!container) return null;

    const nameEl = container.querySelector('.nav__top__userbar__userinfo__username');
    const source = nameEl || container;

    let name = source.textContent || source.innerText || '';
    name = name.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    return name || null;
  }

  function parseName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return null;
    const first_name = parts[0];
    const last_name  = parts.slice(1).join(' ') || parts[0];
    return { first_name, last_name };
  }

  // ══════════════════════════════════════════════════════════
  // Создание DOM-элементов
  // ══════════════════════════════════════════════════════════
  let currentUser = null;

  async function createUI() {
    const iconContent = await loadSVG();

    // ── Модальный оверлей ──────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'ls-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeShop();
    });

    const modal = document.createElement('div');
    modal.id = 'ls-modal';

    // Шапка (titlebar)
    const titlebar = document.createElement('div');
    titlebar.id = 'ls-titlebar';

    const left = document.createElement('div');
    left.id = 'ls-titlebar-left';

    // Иконка
    const logoWrap = document.createElement('span');
    logoWrap.className = 'ls-logo-img';
    if (iconContent.includes('<svg')) {
      logoWrap.innerHTML = iconContent;
    } else {
      logoWrap.textContent = iconContent;
    }

    // Текст заголовка
    const logoText = document.createElement('span');
    logoText.className = 'ls-logo-text';
    logoText.textContent = 'Линк Маркет';

    const userTag = document.createElement('span');
    userTag.className = 'ls-user-tag';
    userTag.id = 'ls-user-tag';

    left.appendChild(logoWrap);
    left.appendChild(logoText);
    left.appendChild(userTag);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'ls-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Закрыть';
    closeBtn.addEventListener('click', closeShop);

    titlebar.appendChild(left);
    titlebar.appendChild(closeBtn);

    const frame = document.createElement('iframe');
    frame.id = 'ls-frame';
    frame.title = 'Линк Маркет';
    frame.setAttribute('allow', 'same-origin');

    modal.appendChild(titlebar);
    modal.appendChild(frame);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeShop();
    });

    // ── Кнопка в левом меню ────────────────────────────────
    createNavButton(iconContent);
  }

  function createNavButton(iconContent) {
    if (document.getElementById('ls-nav-btn-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'ls-nav-btn-wrapper';

    const btn = document.createElement('button');
    btn.id = 'ls-nav-btn';
    btn.title = 'Линк Маркет';
    btn.type = 'button';

    if (iconContent.includes('<svg')) {
      btn.innerHTML = iconContent;
    } else {
      btn.textContent = iconContent;
    }

    const label = document.createElement('span');
    label.className = 'ls-nav-btn-label';
    label.textContent = 'Линк Маркет';

    wrapper.appendChild(btn);
    wrapper.appendChild(label);
    wrapper.addEventListener('click', openShop);

    // Вставляем в #nav_menu после элемента "Настройки"
    const navMenu = document.querySelector('#nav_menu');
    if (!navMenu) {
      setTimeout(() => createNavButton(iconContent), 500);
      return;
    }

    let referenceElement = null;
    const menuItems = navMenu.querySelectorAll('div[class*="nav"], div[class*="menu"]');
    for (const item of menuItems) {
      if ((item.textContent || '').includes('Настройки')) {
        referenceElement = item;
        break;
      }
    }

    if (referenceElement && referenceElement.parentNode) {
      referenceElement.parentNode.insertBefore(wrapper, referenceElement.nextSibling);
    } else {
      navMenu.appendChild(wrapper);
    }
  }

  function openShop() {
    const fullName = getAmoCrmUserName();

    if (!fullName) {
      alert('Линк Маркет: не удалось определить пользователя.\nПроверьте структуру страницы amoCRM.');
      return;
    }

    const parsed = parseName(fullName);
    if (!parsed) return;

    currentUser = parsed;

    document.getElementById('ls-user-tag').textContent = fullName;

    const shopUrl = `${LINKSHOP_URL}/shop?first_name=${encodeURIComponent(parsed.first_name)}&last_name=${encodeURIComponent(parsed.last_name)}&server=${encodeURIComponent(LINKSHOP_URL)}`;
    document.getElementById('ls-frame').src = shopUrl;

    document.getElementById('ls-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    fetchBalance(parsed.first_name, parsed.last_name);
  }

  function closeShop() {
    const overlay = document.getElementById('ls-overlay');
    const frame   = document.getElementById('ls-frame');
    if (overlay) overlay.classList.remove('open');
    if (frame)   frame.src = '';
    document.body.style.overflow = '';

    if (currentUser) {
      fetchBalance(currentUser.first_name, currentUser.last_name);
    }
  }

  async function fetchBalance(firstName, lastName) {
    try {
      const url = `${LINKSHOP_URL}/api/user/balance?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`;
      const res  = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      // баланс получен, но метка не обновляется — всегда остаётся "Линк Маркет"
    } catch (e) {
      // Сервер недоступен — ничего не делаем
    }
  }

  // ══════════════════════════════════════════════════════════
  // НАЧИСЛЕНИЕ ЛИНКОВ — интеграция с newLinks()
  // ══════════════════════════════════════════════════════════

  function addLinksToCurrentUser(amount, reason) {
    const fullName = getAmoCrmUserName();
    if (!fullName) {
      console.warn('[LinkShop] addLinks: не удалось определить пользователя');
      return;
    }

    GM_xmlhttpRequest({
      method: 'POST',
      url:    `${LINKSHOP_URL}/api/user/add-links`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ full_name: fullName, amount, reason }),
      onload(res) {
        try {
          const data = JSON.parse(res.responseText);
          if (data.ok) {
            console.log(`[LinkShop] +${amount} линков (${reason}) → ${fullName}. Баланс: ${data.new_balance}`);
            const parsed = parseName(fullName);
            if (parsed) fetchBalance(parsed.first_name, parsed.last_name);
          } else {
            console.warn('[LinkShop] add-links error:', data.error);
          }
        } catch (e) {
          console.warn('[LinkShop] add-links parse error:', e);
        }
      },
      onerror(err) {
        console.warn('[LinkShop] add-links request failed:', err);
      }
    });
  }

  // ── CSS для летающих чисел ─────────────────────────────────
  GM_addStyle(`
    .ls-flying-number {
      position: fixed !important;
      pointer-events: none;
      font-weight: bold;
      font-size: 18px;
      z-index: 2147483647 !important;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
      white-space: nowrap;
      color: #17A6ED;
      animation: lsFlyUp 3s ease-out forwards;
    }
    @keyframes lsFlyUp {
      0%   { opacity: 1; transform: translate(0, 0) scale(1); }
      60%  { opacity: 1; transform: translate(0, -180px) scale(1.15); }
      100% { opacity: 0; transform: translate(0, -340px) scale(0.8); }
    }
  `);

  function createFlyingNumber(x, y, text) {
    const el = document.createElement('div');
    el.className = 'ls-flying-number';
    el.textContent = text;
    el.style.left = `${x - 30}px`;
    el.style.top  = `${y - 10}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Обработчики действий ──────────────────────────────────

  let processedButtons           = new Set();
  let processedCallNotifications = new Set();

  // "Перейти к сделке" → +5 линков (автоматически при появлении)
  function processGoToLeadButtons() {
    const containers = document.querySelectorAll(
      '#f5_smartresp_acceptance_right_bottom > div.smartresp_wrapper_items > div'
    );
    containers.forEach(container => {
      const btn = container.querySelector('.button-input-inner__text');
      if (!btn || btn.textContent.trim() !== 'Перейти к сделке') return;
      if (btn.dataset.lsProcessed) return;

      btn.dataset.lsProcessed = 'true';

      const rect = btn.getBoundingClientRect();
      createFlyingNumber(rect.left + rect.width / 2, rect.top, '+5 линков');
      addLinksToCurrentUser(5, 'Перейти к сделке');
    });
  }

  // "Принять" → +1 линк (по клику)
  function handleAcceptClick(event) {
    const btn = event.target.closest('.button-input-inner__text');
    if (!btn || btn.textContent.trim() !== 'Принять') return;
    if (btn.dataset.lsTracked) return;

    const wrapper = btn.closest(
      '.f5-notifier-notification, #f5_smartresp_acceptance_right_bottom, .smartresp_wrapper_items, .wrapper_item_actions'
    );
    if (!wrapper) return;

    btn.dataset.lsTracked = 'true';
    createFlyingNumber(event.clientX, event.clientY, '+1 линк');
    addLinksToCurrentUser(1, 'Принять');
  }

  // Закрытие уведомления "Получить Линки" → +10 линков
  function handleCallNotificationClose(event) {
    const closeBtn = event.target.closest('.f5-notifier-notification-close');
    if (!closeBtn) return;

    const notification = closeBtn.closest('.f5-notifier-notification');
    if (!notification) return;

    const title   = notification.querySelector('.f5-notifier-notification-head-title');
    const content = notification.querySelector('.f5-notifier-notification-content');
    const isCall  = (title && title.textContent.trim() === 'Получить Линки') ||
                    (content && content.textContent.includes('10 Линков'));
    if (!isCall) return;

    const nid = notification.dataset.notification_id || notification.dataset.event_group;
    if (!nid || processedCallNotifications.has(nid)) return;
    processedCallNotifications.add(nid);

    const rect = closeBtn.getBoundingClientRect();
    createFlyingNumber(rect.left + rect.width / 2, rect.top, '+10 линков');
    addLinksToCurrentUser(10, 'Звонки');
  }

  // Навешиваем обработчики на кнопки "Принять"
  function setupAcceptButtons() {
    document.querySelectorAll('.button-input-inner__text').forEach(btn => {
      if (btn.textContent.trim() !== 'Принять') return;
      if (btn.dataset.lsHooked) return;
      const wrapper = btn.closest(
        '.f5-notifier-notification, #f5_smartresp_acceptance_right_bottom, .smartresp_wrapper_items, .wrapper_item_actions'
      );
      if (!wrapper) return;
      btn.dataset.lsHooked = 'true';
      btn.addEventListener('click', handleAcceptClick);
    });
  }

  // Навешиваем обработчики на уведомления "Получить Линки"
  function setupCallNotificationHandlers() {
    document.querySelectorAll('.f5-notifier-notification').forEach(notification => {
      const title   = notification.querySelector('.f5-notifier-notification-head-title');
      const content = notification.querySelector('.f5-notifier-notification-content');
      const isCall  = (title && title.textContent.trim() === 'Получить Линки') ||
                      (content && content.textContent.includes('10 Линков'));
      if (!isCall) return;

      const closeBtn = notification.querySelector('.f5-notifier-notification-close');
      if (!closeBtn || closeBtn.dataset.lsHooked) return;
      closeBtn.dataset.lsHooked = 'true';
      closeBtn.addEventListener('click', handleCallNotificationClose);
    });
  }

  // ── MutationObserver — следим за новыми элементами ────────
  function startActivityObserver() {
    const observer = new MutationObserver((mutations) => {
      const hasNew = mutations.some(m => m.addedNodes.length > 0);
      if (!hasNew) return;
      setTimeout(() => {
        processGoToLeadButtons();
        setupAcceptButtons();
        setupCallNotificationHandlers();
        // Перепроверяем кнопку в меню (меню может загружаться позже)
        if (!document.getElementById('ls-nav-btn-wrapper') && _svgCache) {
          createNavButton(_svgCache);
        }
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════════════════
  // Инициализация — ждём загрузки userbar amoCRM
  // ══════════════════════════════════════════════════════════
  function init() {
    createUI();
    startActivityObserver();

    processGoToLeadButtons();
    setupAcceptButtons();
    setupCallNotificationHandlers();

    const fullName = getAmoCrmUserName();
    if (fullName) {
      const parsed = parseName(fullName);
      if (parsed) fetchBalance(parsed.first_name, parsed.last_name);
    } else {
      const nameObserver = new MutationObserver(() => {
        const name = getAmoCrmUserName();
        if (name) {
          nameObserver.disconnect();
          const parsed = parseName(name);
          if (parsed) fetchBalance(parsed.first_name, parsed.last_name);
        }
      });
      nameObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
