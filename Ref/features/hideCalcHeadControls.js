// hideCalcHeadControls.js — модуль скрытия элементов управления в шапке калькулятора
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-calc-head-';
    const SELECTORS = {
        calcHead: config?.selectors?.calcHead || '#Doc > div.calc_head',
        priceMethodCell: config?.selectors?.priceMethodCell || '#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(1)',
        discountCell: config?.selectors?.discountCell || '#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(2)'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let hiddenElements = []; // { el, originalDisplay }

    // ─────────────────────────────────────────────
    // 🔥 Скрытие элемента с отслеживанием оригинального display
    // ─────────────────────────────────────────────
    function hideElement(selector) {
        const el = document.querySelector(selector);
        if (!el || el.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) return;
        
        hiddenElements.push({ el, originalDisplay: el.style.display });
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
    }

    // ─────────────────────────────────────────────
    // 🔥 Восстановление элемента
    // ─────────────────────────────────────────────
    function showElement({ el, originalDisplay }) {
        if (!el?.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) return;
        
        if (originalDisplay === '' || originalDisplay === undefined) {
            el.style.removeProperty('display');
        } else {
            el.style.display = originalDisplay;
        }
        el.removeAttribute(`data-${UNIQUE_PREFIX}hidden`);
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        const calcHead = document.querySelector(SELECTORS.calcHead);
        if (calcHead) {
            hideElement(SELECTORS.priceMethodCell);
            hideElement(SELECTORS.discountCell);
        } else {
            // Если calcHead исчез — восстанавливаем элементы
            hiddenElements = hiddenElements.filter(({ el }) => {
                if (!el.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) return false;
                showElement({ el, originalDisplay: el.style.display });
                return false;
            });
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            applyChanges();
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
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 🔥 Восстанавливаем все скрытые элементы
        hiddenElements.forEach(showElement);
        hiddenElements = [];
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

    function forceHide() {
        hideElement(SELECTORS.priceMethodCell);
        hideElement(SELECTORS.discountCell);
    }

    function forceShow() {
        hiddenElements.forEach(showElement);
        hiddenElements = [];
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
        forceHide,
        forceShow
    };

})(config, GM, utils, api);