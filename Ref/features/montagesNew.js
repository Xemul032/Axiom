// montagesNew.js — модуль кнопки "Заявка на монтаж" с фреймом
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, openFrame }
// ⚠️ ВСЕ НАСТРОЙКИ (URL, селекторы, ключевые слова) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥

    // URL сервера заявок на монтаж
    const SERVER_URL = 'http://192.168.137.66:3001';
    const FRAME_URL = SERVER_URL + '/frame/';

    // Ключевая фраза для определения нужного заказа
    const MONTAGE_KEYWORD = 'Монтажные работы на выезде';

    // 🔥 Уникальный префикс для изоляции стилей и ID
    const UNIQUE_PREFIX = config?.uniquePrefix || 'montage-req-';

    // Селекторы для проверки ключевого слова
    const KEYWORD_SELECTORS = [
        '#Top > form > div > div > div > input',
        '#Summary > table > tbody > tr > td:nth-child(1) > div[class^="formblock"] > table:nth-child(1) > tbody > tr > td:nth-child(2) > div > input'
    ];

    // Контейнеры для вставки кнопки (по приоритету)
    const BUTTON_CONTAINERS = [
        '#TopButtons',
        '#Top > form > div > div > div',
        '#Top > form > div > div',
        '#Top form',
        '.order-actions',
        '#Summary',
        '.ax-order-header',
        'body > ul > div'
    ];

    // Селекторы для получения данных
    const SELECTORS = {
        userName: 'body > ul > div > li.topmenu-li.ax-topmenu-user > a',
        orderNumber: '#ProductId'
    };

    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[MontageRequests]';

    // 🔥 Внутреннее состояние
    let active = false;
    let overlayEl = null;
    let iframeEl = null;
    let buttonEl = null;
    let domObserver = null;
    let escapeHandler = null;
    let messageHandler = null;
    let injectTimeout = null;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования (только консоль, без UI)
    // ─────────────────────────────────────────────
    function log(...args) {
        if (LOGGING_ENABLED) {
            console.log(LOG_PREFIX, ...args);
        }
    }

    function warn(...args) {
        if (LOGGING_ENABLED) {
            console.warn(LOG_PREFIX, ...args);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Внедрение стилей (с UNIQUE_PREFIX)
    // ─────────────────────────────────────────────
    function injectStyles() {
        const styleId = `${UNIQUE_PREFIX}styles`;
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #${UNIQUE_PREFIX}overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,.55);
                z-index: 99998;
                display: flex; align-items: center; justify-content: center;
            }
            #${UNIQUE_PREFIX}iframe {
                width: 620px; max-width: 98vw;
                height: 200px;
                max-height: 92vh;
                border: none; border-radius: 10px;
                box-shadow: 0 8px 48px rgba(0,0,0,.3);
                background: #fff;
                z-index: 99999;
                transition: height 0.15s ease;
                overflow: hidden;
            }
            #${UNIQUE_PREFIX}btn {
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
            }
            #${UNIQUE_PREFIX}btn:hover {
                background: #e0e0e0;
                background-image: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
                border-color: #adadad;
            }
            #${UNIQUE_PREFIX}btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Получить данные со страницы
    // ─────────────────────────────────────────────
    function getUserName() {
        try {
            const el = document.querySelector(SELECTORS.userName);
            return el ? el.textContent.trim() : '';
        } catch (e) { return ''; }
    }

    function getOrderNumber() {
        try {
            const el = document.querySelector(SELECTORS.orderNumber);
            return el ? (el.value || el.textContent || '').trim() : '';
        } catch (e) { return ''; }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка ключевого слова на странице
    // ─────────────────────────────────────────────
    function hasMontageKeyword() {
        // 1. Проверяем по селекторам
        for (const sel of KEYWORD_SELECTORS) {
            try {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    const val = (el.value || el.textContent || '').trim();
                    if (val.includes(MONTAGE_KEYWORD)) return true;
                }
            } catch (e) {}
        }

        // 2. Проверяем все текстовые инпуты
        const allInputs = document.querySelectorAll('input[type="text"], input[type="hidden"], div.formblock input');
        for (const el of allInputs) {
            if ((el.value || '').includes(MONTAGE_KEYWORD)) return true;
        }

        return false;
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка сервера и открытие фрейма
    // ─────────────────────────────────────────────
    async function checkAndOpenFrame(btn) {
        if (overlayEl) return;

        const orderNumber = getOrderNumber();

        // Показываем спиннер на кнопке
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span><span>Проверка…</span>';

        let mode = 'new';
        let existingRequest = null;
        let existingRequests = null;

        log('orderNumber from page:', JSON.stringify(orderNumber));

        if (orderNumber) {
            try {
                const url = `${SERVER_URL}/api/requests/check-order?order=${encodeURIComponent(orderNumber)}`;
                log('check-order URL:', url);
                const res = await fetch(url);
                log('check-order status:', res.status);
                if (res.ok) {
                    const data = await res.json();
                    log('check-order response:', JSON.stringify(data));
                    if (data.found) {
                        mode = 'duplicate';
                        existingRequest = data.request;
                        existingRequests = data.requests;
                    }
                }
            } catch (e) {
                warn('check-order failed, opening as new:', e);
            }
        } else {
            warn('orderNumber is empty — #ProductId not found on page');
        }

        // Восстанавливаем кнопку
        btn.disabled = false;
        btn.innerHTML = originalHTML;

        openFrame(mode, existingRequest, existingRequests);
    }

    // ─────────────────────────────────────────────
    // 🔥 Открытие фрейма
    // ─────────────────────────────────────────────
    function openFrame(mode, existingRequest, existingRequests) {
        if (overlayEl) return;

        const userName = getUserName();
        const orderNumber = getOrderNumber();

        const params = new URLSearchParams();
        if (userName) params.set('user', userName);
        if (orderNumber) params.set('order', orderNumber);
        params.set('api', SERVER_URL);

        if (mode === 'duplicate') {
            params.set('mode', 'duplicate');
        }

        overlayEl = document.createElement('div');
        overlayEl.id = `${UNIQUE_PREFIX}overlay`;

        iframeEl = document.createElement('iframe');
        iframeEl.src = FRAME_URL + '?' + params.toString();
        iframeEl.id = `${UNIQUE_PREFIX}iframe`;

        overlayEl.appendChild(iframeEl);
        document.body.appendChild(overlayEl);

        // Закрыть по клику на оверлей
        overlayEl.addEventListener('click', e => {
            if (e.target === overlayEl) closeFrame();
        });

        // Закрыть по Escape
        if (!escapeHandler) {
            escapeHandler = e => {
                if (e.key === 'Escape') closeFrame();
            };
            document.addEventListener('keydown', escapeHandler);
        }

        // Отправляем данные во фрейм после загрузки
        iframeEl.addEventListener('load', () => {
            iframeEl.contentWindow.postMessage({
                type: 'MONTAJ_INIT',
                userName,
                orderNumber,
                mode,
                existingRequest: existingRequest || null,
                existingRequests: existingRequests || null
            }, '*');
        });

        log('Фрейм открыт в режиме:', mode);
    }

    // ─────────────────────────────────────────────
    // 🔥 Закрытие фрейма
    // ─────────────────────────────────────────────
    function closeFrame() {
        if (!overlayEl) return;
        overlayEl.remove();
        overlayEl = null;
        iframeEl = null;

        if (escapeHandler) {
            document.removeEventListener('keydown', escapeHandler);
            escapeHandler = null;
        }

        log('Фрейм закрыт');
    }

    // ─────────────────────────────────────────────
    // 🔥 Глобальный обработчик сообщений от фрейма
    // ─────────────────────────────────────────────
    function setupMessageHandler() {
        if (messageHandler) return;

        messageHandler = e => {
            if (!e.data) return;

            if (e.data.type === 'MONTAJ_CLOSE') {
                closeFrame();
            } else if (e.data.type === 'MONTAJ_SUBMITTED') {
                log('Заявка отправлена, id:', e.data.id);
            } else if (e.data.type === 'MONTAJ_RESIZE') {
                const iframe = document.getElementById(`${UNIQUE_PREFIX}iframe`);
                if (iframe && e.data.height) {
                    const maxH = Math.round(window.innerHeight * 0.92);
                    iframe.style.height = Math.min(e.data.height, maxH) + 'px';
                }
            }
        };

        window.addEventListener('message', messageHandler);
    }

    function removeMessageHandler() {
        if (messageHandler) {
            window.removeEventListener('message', messageHandler);
            messageHandler = null;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Создать кнопку
    // ─────────────────────────────────────────────
    function createButton() {
        const btn = document.createElement('button');
        btn.id = `${UNIQUE_PREFIX}btn`;
        btn.innerHTML = `📅 Заявка на монтаж`;
        btn.addEventListener('click', () => checkAndOpenFrame(btn));
        return btn;
    }

    // ─────────────────────────────────────────────
    // 🔥 Вставка кнопки (только если есть ключевое слово)
    // ─────────────────────────────────────────────
    function injectButton() {
        const existing = document.getElementById(`${UNIQUE_PREFIX}btn`);

        // Показываем кнопку только на заказах с ключевой фразой
        if (!hasMontageKeyword()) {
            if (existing) existing.remove();
            buttonEl = null;
            return;
        }

        if (existing) {
            buttonEl = existing;
            return;
        }

        for (const sel of BUTTON_CONTAINERS) {
            const el = document.querySelector(sel);
            if (el) {
                buttonEl = createButton();
                el.appendChild(buttonEl);
                log('Кнопка добавлена в:', sel);
                return;
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдатель за изменениями DOM (SPA)
    // ─────────────────────────────────────────────
    function setupDomObserver() {
        if (domObserver) return;

        domObserver = new MutationObserver(() => {
            if (injectTimeout) clearTimeout(injectTimeout);
            injectTimeout = setTimeout(() => {
                if (!document.getElementById(`${UNIQUE_PREFIX}btn`)) {
                    injectButton();
                }
            }, 300);
        });

        domObserver.observe(document.body, { childList: true, subtree: true });
        log('DOM-наблюдатель запущен');
    }

    function removeDomObserver() {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        if (injectTimeout) {
            clearTimeout(injectTimeout);
            injectTimeout = null;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;

        log('🚀 Модуль инициализирован');

        injectStyles();
        setupMessageHandler();
        injectButton();
        setupDomObserver();
    }

    function cleanup() {
        if (!active) return;
        active = false;

        log('🧹 Модуль очищен');

        // Закрываем фрейм если открыт
        closeFrame();

        // Отключаем наблюдатели
        removeDomObserver();
        removeMessageHandler();

        // Удаляем кнопку
        if (buttonEl && buttonEl.parentNode) {
            buttonEl.parentNode.removeChild(buttonEl);
            buttonEl = null;
        }

        // Удаляем стили
        const styleEl = document.getElementById(`${UNIQUE_PREFIX}styles`);
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительного открытия фрейма
    function open() {
        if (active) {
            checkAndOpenFrame(buttonEl || createButton());
        } else {
            warn('Модуль не активен, открытие отменено');
        }
    }

    // 🔥 Авто-запуск
    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        open // Для внешнего вызова открытия фрейма
    };

})(config, GM, utils, api);