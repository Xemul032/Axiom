// hideLogs.js — модуль скрытия пункта "Логи заказа" в выпадающем меню
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-logs-';
    const SELECTORS = {
        dropdownContainer: config?.selectors?.dropdownContainer || '#TopButtons > div.btn-group.btn-group-sm.dropdown',
        dropdownMenu: config?.selectors?.dropdownMenu || 'ul.dropdown-menu',
        menuItem: config?.selectors?.menuItem || 'li > a'
    };
    const TEXTS = {
        menuItemText: config?.texts?.menuItemText || 'Логи заказа'
    };
    const CLASSES = {
        dropdownOpen: config?.classes?.dropdownOpen || 'open'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let mainObserver = null;
    let dropdownObservers = new Map(); // container -> observer

    // ─────────────────────────────────────────────
    // 🔥 Обработка конкретного выпадающего меню
    // ─────────────────────────────────────────────
    function processDropdownMenu(ul) {
        if (!ul || ul.hasAttribute(`data-${UNIQUE_PREFIX}processed`)) return;
        ul.setAttribute(`data-${UNIQUE_PREFIX}processed`, 'true');

        const items = ul.querySelectorAll(SELECTORS.menuItem);
        for (const link of items) {
            if (link.textContent.trim() === TEXTS.menuItemText) {
                const li = link.closest('li');
                if (li) {
                    li.style.setProperty('display', 'none', 'important');
                    li.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
                }
                break;
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдение за контейнером меню при открытии
    // ─────────────────────────────────────────────
    function observeDropdown(container) {
        if (!container || dropdownObservers.has(container)) return;

        const observer = new MutationObserver(() => {
            if (container.classList.contains(CLASSES.dropdownOpen)) {
                const ul = container.querySelector(SELECTORS.dropdownMenu);
                if (ul) {
                    requestAnimationFrame(() => processDropdownMenu(ul));
                }
            }
        });

        observer.observe(container, {
            attributes: true,
            attributeFilter: ['class']
        });

        dropdownObservers.set(container, observer);

        // Проверка сразу, если уже открыт
        if (container.classList.contains(CLASSES.dropdownOpen)) {
            const ul = container.querySelector(SELECTORS.dropdownMenu);
            if (ul) processDropdownMenu(ul);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений к существующим элементам
    // ─────────────────────────────────────────────
    function applyChanges() {
        const existingDropdowns = document.querySelectorAll(SELECTORS.dropdownContainer);
        existingDropdowns.forEach(observeDropdown);
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка главного MutationObserver
    // ─────────────────────────────────────────────
    function setupMainObserver() {
        if (mainObserver) mainObserver.disconnect();
        
        mainObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type !== 'childList') continue;
                
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // Если сам node — это нужный контейнер
                    if (node.matches?.(SELECTORS.dropdownContainer)) {
                        observeDropdown(node);
                    }

                    // Или если внутри node есть такие контейнеры
                    if (node.querySelectorAll) {
                        const dropdowns = node.querySelectorAll(SELECTORS.dropdownContainer);
                        dropdowns.forEach(observeDropdown);
                    }
                }
            }
        });

        mainObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupMainObserver();
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем главный observer
        if (mainObserver) {
            mainObserver.disconnect();
            mainObserver = null;
        }
        
        // Отключаем все наблюдатели за дропдаунами
        dropdownObservers.forEach(observer => observer.disconnect());
        dropdownObservers.clear();
        
        // 🔥 Восстанавливаем скрытые элементы (опционально)
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}hidden]`).forEach(el => {
            el.style.removeProperty('display');
            el.removeAttribute(`data-${UNIQUE_PREFIX}hidden`);
        });
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}processed]`).forEach(el => {
            el.removeAttribute(`data-${UNIQUE_PREFIX}processed`);
        });
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        applyChanges();
    }

    function forceProcessDropdown(container) {
        if (container?.querySelector) {
            const ul = container.querySelector(SELECTORS.dropdownMenu);
            if (ul) processDropdownMenu(ul);
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
        refresh,
        forceProcessDropdown
    };

})(config, GM, utils, api);