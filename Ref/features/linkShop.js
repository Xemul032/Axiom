// linkShop.js — модуль кнопки «Линк Маркет» для Simprint
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }
// ⚠️ ВСЕ НАСТРОЙКИ (URL, селекторы) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // URL сервера LinkShop
    const LINKSHOP_URL = 'http://192.168.137.66:3000';
    
    // 🔥 Уникальный префикс для изоляции стилей и ID
    const UNIQUE_PREFIX = config?.uniquePrefix || 'linkshop-';
    
    // Селекторы
    const SELECTORS = {
        menuList: 'body > ul',
        menuItem: 'body > ul > li:nth-child(8)',
        userMenu: 'body > ul > div > li.ax-topmenu-user > a, body > ul div li.ax-topmenu-user a',
        overlay: `#${UNIQUE_PREFIX}overlay`,
        modal: `#${UNIQUE_PREFIX}modal`,
        frame: `#${UNIQUE_PREFIX}frame`,
        closeBtn: `#${UNIQUE_PREFIX}close`,
        menuItemId: `${UNIQUE_PREFIX}menu-item`
    };

    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[LinkShop]';

    // 🔥 Внутреннее состояние
    let active = false;
    let overlayEl = null;
    let modalEl = null;
    let frameEl = null;
    let menuButtonEl = null;
    let observer = null;
    let keydownHandler = null;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования
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
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(6px);
                z-index: 99999;
                align-items: center;
                justify-content: center;
            }
            #${UNIQUE_PREFIX}overlay.${UNIQUE_PREFIX}open { display: flex; }

            #${UNIQUE_PREFIX}modal {
                position: relative;
                width: min(860px, 95vw);
                height: min(640px, 92vh);
                background: #1a1d27;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 24px 80px rgba(0,0,0,.8);
                display: flex;
                flex-direction: column;
                animation: ${UNIQUE_PREFIX}SlideIn 0.25s ease;
            }
            @keyframes ${UNIQUE_PREFIX}SlideIn {
                from { opacity:0; transform: scale(0.96) translateY(10px); }
                to   { opacity:1; transform: none; }
            }

            #${UNIQUE_PREFIX}titlebar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 18px;
                background: linear-gradient(90deg,#0085CA 100%, #ffffff 0%);
                border-bottom: none;
                flex-shrink: 0;
            }
            #${UNIQUE_PREFIX}titlebar .${UNIQUE_PREFIX}logo {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 15px;
                font-weight: 700;
                color: #fff;
                font-family: 'Segoe UI', system-ui, sans-serif;
                text-shadow: 0 1px 3px rgba(0,0,0,0.15);
            }
            #${UNIQUE_PREFIX}titlebar .${UNIQUE_PREFIX}logo img {
                height: 24px;
                width: auto;
                display: block;
                filter: drop-shadow(0 0 6px rgba(0, 133, 202, 0.8)) drop-shadow(0 0 12px rgba(0, 133, 202, 0.4));
            }
            #${UNIQUE_PREFIX}close {
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
            #${UNIQUE_PREFIX}close:hover { color: #005f90; background: rgba(0,133,202,.12); }

            #${UNIQUE_PREFIX}frame {
                flex: 1;
                border: none;
                width: 100%;
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Создание модального окна
    // ─────────────────────────────────────────────
    function createModal() {
        if (overlayEl) return;

        overlayEl = document.createElement('div');
        overlayEl.id = `${UNIQUE_PREFIX}overlay`;
        overlayEl.addEventListener('click', e => {
            if (e.target === overlayEl) closeShop();
        });

        modalEl = document.createElement('div');
        modalEl.id = `${UNIQUE_PREFIX}modal`;

        const titlebar = document.createElement('div');
        titlebar.id = `${UNIQUE_PREFIX}titlebar`;
        titlebar.innerHTML = `<span class="${UNIQUE_PREFIX}logo"><img src="https://raw.githubusercontent.com/Xemul032/AmoCRM/refs/heads/main/link_logo_wt.svg" alt="LinkShop">Линк Маркет</span>`;

        const closeBtn = document.createElement('button');
        closeBtn.id = `${UNIQUE_PREFIX}close`;
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Закрыть';
        closeBtn.addEventListener('click', closeShop);
        titlebar.appendChild(closeBtn);

        frameEl = document.createElement('iframe');
        frameEl.id = `${UNIQUE_PREFIX}frame`;
        frameEl.title = 'Линк Маркет';

        modalEl.appendChild(titlebar);
        modalEl.appendChild(frameEl);
        overlayEl.appendChild(modalEl);
        document.body.appendChild(overlayEl);

        // Обработчик Escape
        keydownHandler = e => {
            if (e.key === 'Escape') closeShop();
        };
        document.addEventListener('keydown', keydownHandler);
    }

    // ─────────────────────────────────────────────
    // 🔥 Извлечение ФИО текущего пользователя
    // ─────────────────────────────────────────────
    function getCurrentUserName() {
        const a = document.querySelector(SELECTORS.userMenu);
        if (!a) return null;

        const text = a.textContent.trim();
        if (!text) return null;

        // Формат: «Фамилия Имя» — первое слово фамилия, второе имя
        const parts = text.split(/\s+/);
        if (parts.length < 2) return null;

        return {
            last_name: parts[0],
            first_name: parts[1]
        };
    }

    // ─────────────────────────────────────────────
    // 🔥 Открытие магазина
    // ─────────────────────────────────────────────
    function openShop() {
        if (!frameEl) return;

        const user = getCurrentUserName();

        let shopUrl = `${LINKSHOP_URL}/shop?server=${encodeURIComponent(LINKSHOP_URL)}`;
        if (user) {
            shopUrl += `&first_name=${encodeURIComponent(user.first_name)}&last_name=${encodeURIComponent(user.last_name)}`;
        }

        frameEl.src = shopUrl;
        overlayEl.classList.add(`${UNIQUE_PREFIX}open`);
        document.body.style.overflow = 'hidden';
        
        log('Магазин открыт', { user });
    }

    // ─────────────────────────────────────────────
    // 🔥 Закрытие магазина
    // ─────────────────────────────────────────────
    function closeShop() {
        if (!overlayEl) return;

        overlayEl.classList.remove(`${UNIQUE_PREFIX}open`);
        if (frameEl) frameEl.src = '';
        document.body.style.overflow = '';
        
        log('Магазин закрыт');
    }

    // ─────────────────────────────────────────────
    // 🔥 Вставка кнопки в меню
    // ─────────────────────────────────────────────
    function insertMenuButton() {
        const ul = document.querySelector(SELECTORS.menuList);
        if (!ul) return false;

        const refItem = document.querySelector(SELECTORS.menuItem);
        if (!refItem) return false;

        // Проверяем — не добавляли ли уже
        if (document.getElementById(SELECTORS.menuItemId)) {
            menuButtonEl = document.getElementById(SELECTORS.menuItemId);
            return true;
        }

        // Создаём новый элемент
        menuButtonEl = document.createElement('li');
        menuButtonEl.id = SELECTORS.menuItemId;
        menuButtonEl.className = refItem.className;

        // Строим внутреннюю структуру
        const refInner = refItem.querySelector('a') || refItem.querySelector('button');
        if (refInner) {
            const innerEl = document.createElement(refInner.tagName.toLowerCase());
            innerEl.className = refInner.className;
            innerEl.style.cursor = 'pointer';

            if (refInner.style.cssText) innerEl.style.cssText = refInner.style.cssText;

            // Иконка
            const refImg = refItem.querySelector('img');
            const refSvg = refItem.querySelector('svg');
            const refIconSpan = refItem.querySelector('[class*="icon"]');

            if (refImg) {
                const iconSpan = document.createElement('span');
                iconSpan.textContent = '🛍';
                iconSpan.style.cssText = `display:inline-block; width:${refImg.width || 20}px; text-align:center; font-size:16px;`;
                innerEl.appendChild(iconSpan);
            } else if (refSvg) {
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

            // Текст
            const refTextSpan = refInner.querySelector('span:not([class*="icon"]):not([class*="badge"])');
            if (refTextSpan) {
                const textSpan = document.createElement('span');
                textSpan.className = refTextSpan.className;
                textSpan.textContent = 'Линк Маркет';
                innerEl.appendChild(textSpan);
            } else {
                innerEl.appendChild(document.createTextNode(' Линк Маркет'));
            }

            menuButtonEl.appendChild(innerEl);
        } else {
            menuButtonEl.textContent = '🛍 Линк Маркет';
            menuButtonEl.style.cursor = 'pointer';
        }

        // Обработчик клика
        menuButtonEl.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            openShop();
        }, true);

        // Вставляем после 8-го элемента
        refItem.insertAdjacentElement('afterend', menuButtonEl);
        
        log('Кнопка меню добавлена');
        return true;
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;

        log('🚀 Модуль инициализирован');

        injectStyles();
        createModal();

        // Пробуем сразу вставить кнопку
        if (insertMenuButton()) return;

        // Меню может грузиться динамически — ждём
        observer = new MutationObserver(() => {
            if (insertMenuButton() && observer) {
                observer.disconnect();
                observer = null;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Таймаут на случай если DOM не меняется
        setTimeout(() => {
            insertMenuButton();
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }, 5000);
    }

    function cleanup() {
        if (!active) return;
        active = false;

        log('🧹 Модуль очищен');

        // Закрываем магазин если открыт
        closeShop();

        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        // Удаляем обработчик клавиатуры
        if (keydownHandler) {
            document.removeEventListener('keydown', keydownHandler);
            keydownHandler = null;
        }

        // Удаляем кнопку меню
        if (menuButtonEl && menuButtonEl.parentNode) {
            menuButtonEl.parentNode.removeChild(menuButtonEl);
            menuButtonEl = null;
        }

        // Удаляем модальное окно
        if (overlayEl && overlayEl.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
            overlayEl = null;
            modalEl = null;
            frameEl = null;
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

    // 🔥 Публичный метод для открытия магазина
    function open() {
        if (active) {
            openShop();
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
        open // Для внешнего вызова открытия магазина
    };

})(config, GM, utils, api);