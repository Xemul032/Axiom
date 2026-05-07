// lockDateBuh.js — модуль блокировки поля даты для бухгалтерии
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'lock-date-buh-';
    const TARGET_SELECTOR = config?.selector || '#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(3)';
    const BLOCK_ON_INIT = config?.blockOnInit !== false; // по умолчанию true

    // 🔥 Внутреннее состояние
    let active = false;
    let isBlocked = false;
    let targetElement = null;
    let observer = null;

    // ─────────────────────────────────────────────
    // 🔥 Блокировка/разблокировка элемента
    // ─────────────────────────────────────────────
    function blockElement(element) {
        if (!element || isBlocked) return;
        
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('opacity', '0.6', 'important');
        element.setAttribute(`data-${UNIQUE_PREFIX}locked`, 'true');
        
        targetElement = element;
        isBlocked = true;
    }

    function unblockElement() {
        if (!isBlocked || !targetElement) return;
        
        targetElement.style.removeProperty('pointer-events');
        targetElement.style.removeProperty('opacity');
        targetElement.removeAttribute(`data-${UNIQUE_PREFIX}locked`);
        
        targetElement = null;
        isBlocked = false;
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка и применение блокировки
    // ─────────────────────────────────────────────
    function checkAndApplyLock() {
        const element = document.querySelector(TARGET_SELECTOR);
        
        if (element) {
            blockElement(element);
        } else {
            unblockElement();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            checkAndApplyLock();
        });
        
        observer.observe(document.body, {
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
        
        setupObserver();
        
        // Первичная проверка при инициализации
        if (BLOCK_ON_INIT) {
            setTimeout(checkAndApplyLock, 100);
        }
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // Снимаем блокировку
        unblockElement();
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function forceLock() {
        checkAndApplyLock();
    }

    function forceUnlock() {
        unblockElement();
    }

    function isElementLocked() {
        return isBlocked;
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
        forceLock,
        forceUnlock,
        isElementLocked
    };

})(config, GM, utils, api);