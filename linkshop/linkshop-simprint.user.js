// ==UserScript==
// @name         LinkShop1 — Simprint кнопка магазина
// @namespace    linkshop
// @version      1.1
// @description  Добавляет кнопку «Магазин линков» в навигационное меню на cplink.simprint.pro. При клике открывает iframe магазина с авторизацией по PIN-коду.
// @author       LinkShop
// @match        https://cplink.simprint.pro/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // КОНФИГУРАЦИЯ — измените на адрес вашего сервера LinkShop
  // ══════════════════════════════════════════════════════════
  const LINKSHOP_URL = 'http://192.168.137.66:3000'; // ← адрес сервера

  // ══════════════════════════════════════════════════════════
  // Стили оверлея и модального окна
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
    #ls-overlay.open { display: flex; }

    #ls-modal {
      position: relative;
      width: min(860px, 95vw);
      height: min(640px, 92vh);
      background: #1a1d27;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,.8);
      display: flex;
      flex-direction: column;
      animation: lsSlideIn 0.25s ease;
    }
    @keyframes lsSlideIn {
      from { opacity:0; transform: scale(0.96) translateY(10px); }
      to   { opacity:1; transform: none; }
    }

    #ls-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: linear-gradient(90deg,#0085CA 100%, #ffffff 0%);
      border-bottom: none;
      flex-shrink: 0;
    }
    #ls-titlebar .ls-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    #ls-titlebar .ls-logo img {
      height: 24px;
      width: auto;
      display: block;
      filter: drop-shadow(0 0 6px rgba(0, 133, 202, 0.8)) drop-shadow(0 0 12px rgba(0, 133, 202, 0.4));
    }
    #ls-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.85);
      font-size: 22px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
      transition: color .15s, background .15s;
    }
    #ls-close:hover { color: #005f90; background: rgba(0,133,202,.12); }

    #ls-frame {
      flex: 1;
      border: none;
      width: 100%;
      display: block;
    }
  `);

  // ══════════════════════════════════════════════════════════
  // Создание UI
  // ══════════════════════════════════════════════════════════

  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'ls-overlay';
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeShop();
    });

    const modal = document.createElement('div');
    modal.id = 'ls-modal';

    const titlebar = document.createElement('div');
    titlebar.id = 'ls-titlebar';
    titlebar.innerHTML = '<span class="ls-logo"><img src="https://raw.githubusercontent.com/Xemul032/AmoCRM/refs/heads/main/link_logo_wt.svg" alt="LinkShop">Линк Маркет</span>';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'ls-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Закрыть';
    closeBtn.addEventListener('click', closeShop);
    titlebar.appendChild(closeBtn);

    const frame = document.createElement('iframe');
    frame.id = 'ls-frame';
    frame.title = 'Линк Маркет';

    modal.appendChild(titlebar);
    modal.appendChild(frame);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeShop();
    });
  }

  // ══════════════════════════════════════════════════════════
  // Извлечение ФИО текущего пользователя из меню Simprint
  // Элемент: body > ul > div > li.ax-topmenu-user > a
  // Формат текста: «Фамилия Имя»
  // ══════════════════════════════════════════════════════════
  function getCurrentUserName() {
    const a = document.querySelector(
      'body > ul > div > li.ax-topmenu-user > a, ' +
      'body > ul div li.ax-topmenu-user a'
    );
    if (!a) return null;

    const text = a.textContent.trim();
    if (!text) return null;

    // Формат: «Фамилия Имя» — первое слово фамилия, второе имя
    const parts = text.split(/\s+/);
    if (parts.length < 2) return null;

    return {
      last_name:  parts[0],   // Щёкин
      first_name: parts[1]    // Александр
    };
  }

  function openShop() {
    const user = getCurrentUserName();

    let shopUrl = `${LINKSHOP_URL}/shop?server=${encodeURIComponent(LINKSHOP_URL)}`;
    if (user) {
      // Передаём ФИО — shop.js сам проверит по API:
      // найден → витрина, не найден → PIN-экран
      shopUrl += `&first_name=${encodeURIComponent(user.first_name)}&last_name=${encodeURIComponent(user.last_name)}`;
    }
    // Если user не найден в DOM — shop.js покажет PIN-экран самостоятельно

    document.getElementById('ls-frame').src = shopUrl;
    document.getElementById('ls-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeShop() {
    document.getElementById('ls-overlay').classList.remove('open');
    document.getElementById('ls-frame').src = '';
    document.body.style.overflow = '';
  }

  // ══════════════════════════════════════════════════════════
  // Вставка кнопки в меню
  // ══════════════════════════════════════════════════════════

  function insertMenuButton() {
    // Целевой список: body > ul
    const ul = document.querySelector('body > ul');
    if (!ul) return false;

    // Эталонный элемент — 8-й li (nth-child считается с 1)
    const refItem = ul.querySelector('li:nth-child(8)');
    if (!refItem) return false;

    // Проверяем — не добавляли ли уже
    if (document.getElementById('ls-menu-item')) return true;

    // Берём ТОЛЬКО className эталона — не клонируем содержимое,
    // чтобы не унаследовать data-атрибуты и обработчики
    const newLi = document.createElement('li');
    newLi.id = 'ls-menu-item';
    newLi.className = refItem.className;

    // Строим внутреннюю структуру вручную, копируя только визуальный шаблон
    // Смотрим что внутри эталона и повторяем структуру
    const refInner = refItem.querySelector('a') || refItem.querySelector('button');
    if (refInner) {
      // Создаём такой же тег с теми же классами, но без href/data-атрибутов
      const innerEl = document.createElement(refInner.tagName.toLowerCase());
      innerEl.className = refInner.className;
      innerEl.style.cursor = 'pointer';

      // Копируем inline-стили если есть
      if (refInner.style.cssText) innerEl.style.cssText = refInner.style.cssText;

      // Строим содержимое: иконка + текст
      // Ищем иконку в эталоне
      const refImg = refItem.querySelector('img');
      const refSvg = refItem.querySelector('svg');
      const refIconSpan = refItem.querySelector('[class*="icon"]');

      if (refImg) {
        // Если иконка — img, ставим emoji-span той же ширины
        const iconSpan = document.createElement('span');
        iconSpan.textContent = '🛍';
        iconSpan.style.cssText = `display:inline-block; width:${refImg.width || 20}px; text-align:center; font-size:16px;`;
        innerEl.appendChild(iconSpan);
      } else if (refSvg) {
        // SVG-иконку просто ставим emoji
        const iconSpan = document.createElement('span');
        iconSpan.textContent = '🛍';
        iconSpan.style.cssText = 'margin-right:4px; font-size:16px;';
        innerEl.appendChild(iconSpan);
      } else if (refIconSpan) {
        const iconSpan = document.createElement('span');
        iconSpan.className = refIconSpan.className;
        iconSpan.textContent = '🛍';
        innerEl.appendChild(iconSpan);
      }

      // Текстовый узел или span с текстом
      const refTextNode = [...refInner.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      const refTextSpan = refInner.querySelector('span:not([class*="icon"]):not([class*="badge"])');

      if (refTextSpan) {
        const textSpan = document.createElement('span');
        textSpan.className = refTextSpan.className;
        textSpan.textContent = 'Линк Маркет';
        innerEl.appendChild(textSpan);
      } else {
        innerEl.appendChild(document.createTextNode(' Линк Маркет'));
      }

      newLi.appendChild(innerEl);
    } else {
      // Совсем простая структура — просто текст
      newLi.textContent = '🛍 Линк Маркет';
      newLi.style.cursor = 'pointer';
    }

    // Перехватываем клик — stopImmediatePropagation чтобы не сработали
    // делегированные обработчики на ul
    newLi.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openShop();
    }, true); // capture-фаза — срабатывает раньше всех

    // Вставляем ПОСЛЕ 8-го элемента
    refItem.insertAdjacentElement('afterend', newLi);
    return true;
  }

  // ══════════════════════════════════════════════════════════
  // Инициализация — ждём загрузки меню
  // ══════════════════════════════════════════════════════════

  function init() {
    createModal();

    // Пробуем сразу
    if (insertMenuButton()) return;

    // Меню может грузиться динамически — ждём
    const observer = new MutationObserver(() => {
      if (insertMenuButton()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Таймаут на случай если DOM не меняется
    setTimeout(() => {
      insertMenuButton();
      observer.disconnect();
    }, 5000);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
