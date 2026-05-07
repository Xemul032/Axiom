// groupZapusk.js — модуль скрытия элемента #GroupEditor > div:nth-child(3)
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'group-zapusk-';
    const SELECTORS = {
        targetElement: config?.selectors?.targetElement || '#GroupEditor > div:nth-child(3)'
    };
    const DISPLAY_VALUE = config?.displayValue || 'none';

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let isHidden = false;
    let originalDisplay = null;
    let targetElement = null;

    // ─────────────────────────────────────────────
    // 🔥 Скрытие элемента с отслеживанием оригинального стиля
    // ─────────────────────────────────────────────
    function hideElement(element) {
        if (!element || isHidden) return;
        
        // Сохраняем оригинальный display для восстановления
        originalDisplay = element.style.display || '';
        targetElement = element;
        
        element.style.setProperty('display', DISPLAY_VALUE, 'important');
        element.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
        isHidden = true;
    }

    // ─────────────────────────────────────────────
    // 🔥 Восстановление элемента
    // ─────────────────────────────────────────────
    function showElement(element) {
        if (!element || !isHidden) return;
        
        if (originalDisplay === '' || originalDisplay === undefined) {
            element.style.removeProperty('display');
        } else {
            element.style.display = originalDisplay;
        }
        element.removeAttribute(`data-${UNIQUE_PREFIX}hidden`);
        
        isHidden = false;
        originalDisplay = null;
        targetElement = null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик изменений DOM
    // ─────────────────────────────────────────────
    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type !== 'childList') continue;
            
            const element = document.querySelector(SELECTORS.targetElement);
            
            if (element && !isHidden) {
                hideElement(element);
            } else if (!element && isHidden) {
                // Элемент исчез из DOM — сбрасываем состояние
                isHidden = false;
                originalDisplay = null;
                targetElement = null;
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(handleMutations);
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        const element = document.querySelector(SELECTORS.targetElement);
        if (element && !isHidden) {
            hideElement(element);
        }
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
        
        // 🔥 Восстанавливаем элемент, если он ещё в DOM
        if (targetElement && document.contains(targetElement)) {
            showElement(targetElement);
        } else if (isHidden) {
            // Элемент мог быть удалён из DOM, ищем по атрибуту
            const hiddenEl = document.querySelector(`[data-${UNIQUE_PREFIX}hidden]`);
            if (hiddenEl) {
                showElement(hiddenEl);
            }
            isHidden = false;
            originalDisplay = null;
            targetElement = null;
        }
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
        const element = document.querySelector(SELECTORS.targetElement);
        if (element) hideElement(element);
    }

    function forceShow() {
        const element = targetElement || document.querySelector(SELECTORS.targetElement);
        if (element) showElement(element);
    }

    function isElementHidden() {
        return isHidden;
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
        forceShow,
        isElementHidden
    };

})(config, GM, utils, api);