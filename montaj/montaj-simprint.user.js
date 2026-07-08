// ==UserScript==
// @name         Монтажные работы — заявка на выезд
// @namespace    https://cplink.simprint.pro/
// @version      1.0.1
// @description  Кнопка и фрейм для оформления заявок на монтаж/замер
// @author       Simprint
// @match        https://cplink.simprint.pro/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── Настройки ─────────────────────────────────────────────────────────────
  // ВАЖНО: укажи реальный адрес сервера (IP:PORT или домен)
  const SERVER_URL = 'http://localhost:3001';
  const FRAME_URL  = SERVER_URL + '/frame/';

  // Ключевая фраза, по которой определяем нужный заказ
  const MONTAGE_KEYWORD = 'Монтажные работы на выезде';

  // ── Стили кнопки (из Ref/features/montages.js) ───────────────────────────
  const BTN_STYLE = `
    all: unset;
    display: inline-block;
    font-size: 12px; font-weight: 400;
    line-height: 1.5; color: #333333;
    background: #ffffff;
    background-image: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%);
    border: 1px solid #cccccc; border-radius: 0;
    padding: 5px 10px; margin: 0; margin-left: -1px;
    text-align: center; white-space: nowrap;
    vertical-align: middle; cursor: pointer;
    user-select: none; position: relative;
    float: left;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 1px rgba(0,0,0,0.075);
    text-shadow: 0 1px 0 #ffffff;
    transition: all 0.3s ease;
    box-sizing: border-box;
  `;

  // ── Стили оверлея ─────────────────────────────────────────────────────────
  const OVERLAY_STYLE = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 99998;
    display: flex; align-items: center; justify-content: center;
  `;

  const IFRAME_STYLE = `
    width: 620px; max-width: 98vw;
    height: 200px;
    max-height: 92vh;
    border: none; border-radius: 10px;
    box-shadow: 0 8px 48px rgba(0,0,0,.3);
    background: #fff;
    z-index: 99999;
    transition: height 0.15s ease;
    overflow: hidden;
  `;

  // ── Получить данные со страницы ───────────────────────────────────────────
  function getUserName() {
    try {
      const el = document.querySelector(
        'body > ul > div > li.topmenu-li.ax-topmenu-user > a'
      );
      return el ? el.textContent.trim() : '';
    } catch (e) { return ''; }
  }

  function getOrderNumber() {
    try {
      const el = document.querySelector('#ProductId');
      return el ? (el.value || el.textContent || '').trim() : '';
    } catch (e) { return ''; }
  }

  /**
   * Проверяет, есть ли на странице текст "Монтажные работы на выезде"
   */
  function hasMontageKeyword() {
    const selectors = [
      '#Top > form > div > div > div > input',
      '#Summary > table > tbody > tr > td:nth-child(1) > div[class^="formblock"] > table:nth-child(1) > tbody > tr > td:nth-child(2) > div > input'
    ];
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const val = (el.value || el.textContent || '').trim();
          if (val.includes(MONTAGE_KEYWORD)) return true;
        }
      } catch (e) {}
    }

    const allInputs = document.querySelectorAll('input[type="text"], input[type="hidden"], div.formblock input');
    for (const el of allInputs) {
      if ((el.value || '').includes(MONTAGE_KEYWORD)) return true;
    }

    return false;
  }

  // ── Оверлей с фреймом ─────────────────────────────────────────────────────
  let overlay = null;

  /**
   * Проверяет сервер на наличие заявок по productId,
   * затем открывает фрейм с нужным режимом.
   */
  async function checkAndOpenFrame(btn) {
    if (overlay) return;

    const orderNumber = getOrderNumber();

    // Показываем спиннер на кнопке
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Проверка…</span>';

    let mode             = 'new';   // 'new' | 'duplicate'
    let existingRequest  = null;    // первая заявка (обратная совместимость)
    let existingRequests = null;    // все заявки

    console.log('[Montaj] orderNumber from page:', JSON.stringify(orderNumber));

    if (orderNumber) {
      try {
        const url = `${SERVER_URL}/api/requests/check-order?order=${encodeURIComponent(orderNumber)}`;
        console.log('[Montaj] check-order URL:', url);
        const res = await fetch(url);
        console.log('[Montaj] check-order status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Montaj] check-order response:', JSON.stringify(data));
          if (data.found) {
            mode             = 'duplicate';
            existingRequest  = data.request;
            existingRequests = data.requests;
          }
        }
      } catch (e) {
        console.warn('[Montaj] check-order failed, opening as new:', e);
      }
    } else {
      console.warn('[Montaj] orderNumber is empty — #ProductId not found on page');
    }

    // Восстанавливаем кнопку
    btn.disabled = false;
    btn.innerHTML = originalHTML;

    openFrame(mode, existingRequest, existingRequests);
  }

  function openFrame(mode, existingRequest, existingRequests) {
    if (overlay) return;

    const userName    = getUserName();
    const orderNumber = getOrderNumber();

    const params = new URLSearchParams();
    if (userName)    params.set('user',  userName);
    if (orderNumber) params.set('order', orderNumber);
    params.set('api', SERVER_URL);

    // Передаём mode во фрейм через URL — фрейм сам загрузит список по order
    if (mode === 'duplicate') {
      params.set('mode', 'duplicate');
    }

    overlay = document.createElement('div');
    overlay.style.cssText = OVERLAY_STYLE;
    overlay.id = 'montaj-overlay';

    const iframe = document.createElement('iframe');
    iframe.src = FRAME_URL + '?' + params.toString();
    iframe.style.cssText = IFRAME_STYLE;
    iframe.id  = 'montaj-iframe';

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Закрыть по клику на оверлей
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeFrame();
    });

    // Закрыть по Escape
    document.addEventListener('keydown', onEscape);

    // Отправляем данные пользователя во фрейм после загрузки
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage({
        type:             'MONTAJ_INIT',
        userName,
        orderNumber,
        mode,
        existingRequest:  existingRequest  || null,
        existingRequests: existingRequests || null
      }, '*');
    });
  }

  function closeFrame() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onEscape);
  }

  function onEscape(e) {
    if (e.key === 'Escape') closeFrame();
  }

  // Глобальный слушатель сообщений от фрейма (работает всегда, не зависит от жизни оверлея)
  window.addEventListener('message', function onFrameMessage(e) {
    if (!e.data) return;
    if (e.data.type === 'MONTAJ_CLOSE') closeFrame();
    if (e.data.type === 'MONTAJ_SUBMITTED') {
      console.log('[Montaj] Заявка отправлена, id:', e.data.id);
    }
    if (e.data.type === 'MONTAJ_RESIZE') {
      const iframe = document.getElementById('montaj-iframe');
      if (iframe && e.data.height) {
        const maxH = Math.round(window.innerHeight * 0.92);
        iframe.style.height = Math.min(e.data.height, maxH) + 'px';
      }
    }
  });

  // ── Создать кнопку ────────────────────────────────────────────────────────
  function createButton(label) {
    const btn = document.createElement('button');
    btn.id = 'montaj-btn';
    btn.style.cssText = BTN_STYLE;
    btn.innerHTML = `📅 ${label}`;
    btn.addEventListener('click', () => checkAndOpenFrame(btn));
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#e0e0e0';
      btn.style.backgroundImage = 'linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%)';
      btn.style.borderColor = '#adadad';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#ffffff';
      btn.style.backgroundImage = 'linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%)';
      btn.style.borderColor = '#cccccc';
    });
    return btn;
  }

  // ── Вставка кнопки (только если есть ключевое слово) ─────────────────────
  function injectButton() {
    const existing = document.getElementById('montaj-btn');

    // Показываем кнопку только на заказах с ключевой фразой
    if (!hasMontageKeyword()) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return; // уже вставлена

    const containers = [
      '#TopButtons',
      '#Top > form > div > div > div',
      '#Top > form > div > div',
      '#Top form',
      '.order-actions',
      '#Summary',
      '.ax-order-header',
      'body > ul > div',
    ];

    for (const sel of containers) {
      const el = document.querySelector(sel);
      if (el) {
        el.appendChild(createButton('Заявка на монтаж'));
        return;
      }
    }
  }

  // ── Наблюдатель за изменениями DOM (SPA) ─────────────────────────────────
  function watchDOM() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('montaj-btn')) {
        setTimeout(injectButton, 300);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Старт ─────────────────────────────────────────────────────────────────
  function init() {
    injectButton();
    watchDOM();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
