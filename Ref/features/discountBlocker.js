// discountBlocker.js — модуль блокировки строки скидок
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'discount-blocker-';
    
    // 🔥 Селекторы (можно переопределить в конфиге)
    const SELECTORS = {
        vmClientForm: config?.selectors?.vmClientForm || '#vmClientForm',
        targetTR: config?.selectors?.targetTR || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1)',
        textElement: config?.selectors?.textElement || '#vmClientForm > div:nth-child(1) > table > tbody > tr > td:nth-child(1) > p',
        exceptionTR: config?.selectors?.exceptionTR || 'td:nth-child(1) > table > tbody > tr:nth-child(2)'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let previousText = null;

    // ─────────────────────────────────────────────
    // 🔥 Основная функция блокировки
    // ─────────────────────────────────────────────
    function hideTR() {
        const vmClientForm = document.querySelector(SELECTORS.vmClientForm);
        if (!vmClientForm) return;

        const targetTR = document.querySelector(SELECTORS.targetTR);
        if (!targetTR) return;

        // 🔥 Блокируем всю строку
        targetTR.style.pointerEvents = 'none';
        targetTR.style.opacity = '1';

        // 🔥 Разблокируем вложенную исключённую строку
        const exceptionTR = targetTR.querySelector(SELECTORS.exceptionTR);
        if (exceptionTR) {
            exceptionTR.style.pointerEvents = 'auto';
            exceptionTR.style.opacity = '1';
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(function(mutations) {
            const vmClientForm = document.querySelector(SELECTORS.vmClientForm);
            if (!vmClientForm) return;

            const textElement = document.querySelector(SELECTORS.textElement);
            if (textElement) {
                const currentText = textElement.textContent.trim();
                if (currentText !== previousText) {
                    previousText = currentText;
                    hideTR();
                }
            }
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
        // Первичный вызов на случай, если элементы уже есть
        setTimeout(hideTR, 100);
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 🔥 Восстанавливаем стили при отключении
        const targetTR = document.querySelector(SELECTORS.targetTR);
        if (targetTR) {
            targetTR.style.pointerEvents = '';
            targetTR.style.opacity = '';
            const exceptionTR = targetTR.querySelector(SELECTORS.exceptionTR);
            if (exceptionTR) {
                exceptionTR.style.pointerEvents = '';
                exceptionTR.style.opacity = '';
            }
        }
        
        previousText = null;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего вызова
    function forceUpdate() {
        hideTR();
    }

    function resetState() {
        previousText = null;
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
        forceUpdate,
        resetState
    };

})(config, GM, utils, api);