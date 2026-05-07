// hideFin.js — модуль скрытия финансовых элементов и опции "Кредит"
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-fin-';
    const SELECTORS = {
        btnDebt: config?.selectors?.btnDebt || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > div.btn-group > button:nth-child(3)',
        btnSave: config?.selectors?.btnSave || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > div.btn-group > button.btn.btn-success',
        tr3: config?.selectors?.tr3 || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(3)',
        tr4: config?.selectors?.tr4 || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(4)',
        tr5: config?.selectors?.tr5 || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(5)',
        tr6: config?.selectors?.tr6 || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(6)',
        listboxContainer: config?.selectors?.listboxContainer || '[id$="__listbox"]'
    };
    const TEXTS = {
        creditOption: config?.texts?.creditOption || 'Кредит'
    };
    const POLLING_INTERVAL = config?.pollingInterval || 1000;

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let pollingInterval = null;
    let modifiedElements = []; // Для отслеживания изменённых элементов

    // ─────────────────────────────────────────────
    // 🔥 Утилита: отслеживание изменённых элементов
    // ─────────────────────────────────────────────
    function trackModified(element, type, styles = {}) {
        if (!modifiedElements.find(e => e.el === element && e.type === type)) {
            const original = {};
            Object.keys(styles).forEach(key => {
                original[key] = element.style[key];
            });
            modifiedElements.push({ el: element, type, original });
        }
    }

    function restoreElement({ el, original }) {
        Object.keys(original).forEach(key => {
            if (original[key] === '' || original[key] === undefined) {
                el.style.removeProperty(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
            } else {
                el.style[key] = original[key];
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Манипуляции со строками таблицы
    // ─────────────────────────────────────────────
    function manipulateRows(hideTr5 = false) {
        // Блокируемые строки (всё кроме tr5)
        [SELECTORS.tr3, SELECTORS.tr4, SELECTORS.tr6].forEach(selector => {
            const row = document.querySelector(selector);
            if (row) {
                if (!hideTr5) {
                    trackModified(row, 'pointerEvents', { pointerEvents: row.style.pointerEvents });
                    row.style.setProperty('pointer-events', 'none', 'important');
                } else {
                    restoreElement({ el: row, original: { pointerEvents: '' } });
                }
            }
        });

        // Скрываемая строка (tr5)
        const row5 = document.querySelector(SELECTORS.tr5);
        if (row5) {
            if (!hideTr5) {
                trackModified(row5, 'display', { display: row5.style.display });
                row5.style.setProperty('display', 'none', 'important');
            } else {
                restoreElement({ el: row5, original: { display: '' } });
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Скрытие опции "Кредит" в листбоксах
    // ─────────────────────────────────────────────
    function hideCreditOption() {
        const containers = document.querySelectorAll(SELECTORS.listboxContainer);
        containers.forEach(container => {
            const creditLi = Array.from(container.querySelectorAll('li')).find(li =>
                li.textContent.trim() === TEXTS.creditOption
            );
            if (creditLi && !creditLi.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) {
                trackModified(creditLi, 'creditOption', { display: creditLi.style.display });
                creditLi.style.setProperty('display', 'none', 'important');
                creditLi.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка элементов и применение изменений
    // ─────────────────────────────────────────────
    function checkElements() {
        const debtBtn = document.querySelector(SELECTORS.btnDebt);
        const saveBtn = document.querySelector(SELECTORS.btnSave);

        if (debtBtn && saveBtn) {
            manipulateRows(false); // Заблокировать и скрыть
            hideCreditOption();
        } else {
            manipulateRows(true); // Разрешить всё
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            checkElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Запуск периодической проверки "Кредит"
    // ─────────────────────────────────────────────
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            hideCreditOption();
        }, POLLING_INTERVAL);
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        startPolling();
        checkElements();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // Очищаем интервал
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        
        // 🔥 Восстанавливаем все изменённые элементы
        modifiedElements.forEach(restoreElement);
        modifiedElements = [];
        
        // Снимаем атрибуты-флаги
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}hidden]`).forEach(el => {
            el.removeAttribute(`data-${UNIQUE_PREFIX}hidden`);
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
        checkElements();
        hideCreditOption();
    }

    function forceHideCredit() {
        hideCreditOption();
    }

    function setPollingInterval(ms) {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = setInterval(() => hideCreditOption(), ms);
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
        forceHideCredit,
        setPollingInterval
    };

})(config, GM, utils, api);