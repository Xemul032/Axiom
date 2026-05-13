// summaDiscountButtons.js — модуль кнопок скидок и наценок с корректным расчётом
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'summa-discount-';
    const SELECTORS = {
        summa: config?.selectors?.summa || '#Summa',
        correctionInput: config?.selectors?.correctionInput || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input.right.SummaCorrection',
        targetTbody: config?.selectors?.targetTbody || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody',
        firstRow: config?.selectors?.firstRow || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:first-child'
    };
    const DISCOUNTS = config?.discounts || [
        { label: '+40%', percent: 40, positive: true, class: 'tm-btn-green', order: 0 },
        { label: '-5%', percent: 5, positive: false, class: 'tm-btn-orange', order: 1 },
        { label: '-10%', percent: 10, positive: false, class: 'tm-btn-red', order: 2 }
    ];
    const STYLES = {
        button: config?.styles?.button || {
            padding: '3px 18px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#fff',
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'all 0.15s ease',
            marginRight: '6px'
        },
        colors: config?.styles?.colors || {
            green: 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
            orange: 'linear-gradient(180deg, #f0ad4e 0%, #ec971f 100%)',
            red: 'linear-gradient(180deg, #d9534f 0%, #c9302c 100%)'
        }
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let rowObserver = null;
    let styleEl = null;
    let insertedRow = null;

    // ─────────────────────────────────────────────
    // 🔥 Внедрение стилей
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (styleEl) return;
        
        styleEl = document.createElement('style');
        styleEl.id = `${UNIQUE_PREFIX}styles`;
        styleEl.textContent = `
            .${UNIQUE_PREFIX}btn {
                padding: ${STYLES.button.padding} !important;
                font-size: ${STYLES.button.fontSize} !important;
                font-weight: ${STYLES.button.fontWeight} !important;
                color: ${STYLES.button.color} !important;
                border: ${STYLES.button.border} !important;
                border-radius: ${STYLES.button.borderRadius} !important;
                cursor: ${STYLES.button.cursor} !important;
                box-shadow: ${STYLES.button.boxShadow} !important;
                transition: ${STYLES.button.transition} !important;
                margin-right: 6px;
            }
            .${UNIQUE_PREFIX}btn:last-child { margin-right: 0 !important; }
            .${UNIQUE_PREFIX}btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 3px 6px rgba(0,0,0,0.25) !important;
            }
            .${UNIQUE_PREFIX}btn-green { background: ${STYLES.colors.green} !important; }
            .${UNIQUE_PREFIX}btn-orange { background: ${STYLES.colors.orange} !important; }
            .${UNIQUE_PREFIX}btn-red { background: ${STYLES.colors.red} !important; }
            .${UNIQUE_PREFIX}row { display: table-row !important; visibility: visible !important; opacity: 1 !important; }
        `;
        document.head.appendChild(styleEl);
    }

    // ─────────────────────────────────────────────
    // 🔥 Утилиты
    // ─────────────────────────────────────────────
    function parseRussianNumber(str) {
        if (!str) return 0;
        return parseFloat(str.replace(/\s/g, '').replace(',', '.'));
    }

    function triggerEvents(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof window.jQuery !== 'undefined') {
            window.jQuery(el).trigger('input').trigger('change');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение скидки/наценки
    // ─────────────────────────────────────────────
    function applyDiscount(percent, isPositive = false) {
        const summaEl = document.querySelector(SELECTORS.summa);
        if (!summaEl) return;

        const baseSumma = parseRussianNumber(summaEl.textContent || summaEl.innerText);
        if (isNaN(baseSumma) || baseSumma === 0) return;

        const targetInput = document.querySelector(SELECTORS.correctionInput);
        if (!targetInput) return;

        // Получаем текущее значение корректировки
        let currentCorrection = 0;
        if (targetInput.value && targetInput.value.trim() !== '') {
            currentCorrection = parseRussianNumber(targetInput.value);
        }

        // Считаем эффективную сумму
        let effectiveSumma;
        if (currentCorrection < 0) {
            effectiveSumma = baseSumma + Math.abs(currentCorrection);
        } else {
            effectiveSumma = baseSumma - currentCorrection;
        }

        // Считаем процент от эффективной суммы
        const amount = effectiveSumma * percent / 100;
        const sign = isPositive ? '' : '-';
        const formattedValue = `${sign}${amount.toFixed(2).replace('.', ',')}`;

        // Записываем и триггерим события
        targetInput.value = formattedValue;
        triggerEvents(targetInput);
    }

    // ─────────────────────────────────────────────
    // 🔥 Защита строки от скрытия
    // ─────────────────────────────────────────────
    function protectRowFromHiding(rowElement) {
        if (rowObserver) rowObserver.disconnect();
        
        rowObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.style.display === 'none') {
                        target.style.setProperty('display', 'table-row', 'important');
                        target.classList.add(`${UNIQUE_PREFIX}row`);
                    }
                }
            }
        });
        
        rowObserver.observe(rowElement, { attributes: true, attributeFilter: ['style'] });
    }

    // ─────────────────────────────────────────────
    // 🔥 Создание строки с кнопками
    // ─────────────────────────────────────────────
    function addDiscountRow() {
        const targetTbody = document.querySelector(SELECTORS.targetTbody);
        if (!targetTbody || targetTbody.querySelector(`.${UNIQUE_PREFIX}row`)) return;

        const firstRow = document.querySelector(SELECTORS.firstRow);
        if (!firstRow) return;

        const newRow = firstRow.cloneNode(true);
        newRow.className = `${UNIQUE_PREFIX}row`;
        newRow.setAttribute(`data-${UNIQUE_PREFIX}created`, 'true');
        insertedRow = newRow;

        const cells = newRow.querySelectorAll('td');
        if (cells.length >= 2) {
            cells[0].textContent = 'Скидка:';
            cells[0].style.fontWeight = 'bold';
            cells[0].style.whiteSpace = 'nowrap';

            cells[1].innerHTML = '';
            cells[1].style.textAlign = 'right';
            cells[1].style.verticalAlign = 'middle';

            // Сортируем кнопки по порядку и создаём
            DISCOUNTS
                .slice()
                .sort((a, b) => a.order - b.order)
                .forEach(btnCfg => {
                    const btn = document.createElement('button');
                    btn.textContent = btnCfg.label;
                    btn.className = `${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}${btnCfg.class}`;
                    btn.type = 'button';
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        applyDiscount(btnCfg.percent, btnCfg.positive);
                    };
                    cells[1].appendChild(btn);
                });
        }

        firstRow.parentNode.insertBefore(newRow, firstRow.nextSibling);
        protectRowFromHiding(newRow);
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка и инициализация
    // ─────────────────────────────────────────────
    function checkAndInit() {
        const summaExists = !!document.querySelector(SELECTORS.summa);
        const tbodyExists = !!document.querySelector(SELECTORS.targetTbody);
        if (summaExists && tbodyExists) {
            addDiscountRow();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            checkAndInit();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        injectStyles();
        checkAndInit();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        injectStyles();
        setupObserver();
        checkAndInit();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observers
        if (observer) { observer.disconnect(); observer = null; }
        if (rowObserver) { rowObserver.disconnect(); rowObserver = null; }
        
        // Удаляем стили
        if (styleEl?.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
            styleEl = null;
        }
        
        // Удаляем добавленную строку
        if (insertedRow?.parentNode) {
            insertedRow.parentNode.removeChild(insertedRow);
            insertedRow = null;
        }
        
        // Очищаем атрибуты защиты
        document.querySelectorAll(`.${UNIQUE_PREFIX}row`).forEach(el => {
            el.classList.remove(`${UNIQUE_PREFIX}row`);
            el.removeAttribute(`data-${UNIQUE_PREFIX}created`);
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
        checkAndInit();
    }

    function forceAddRow() {
        addDiscountRow();
    }

    function forceRemoveRow() {
        if (insertedRow?.parentNode) {
            insertedRow.parentNode.removeChild(insertedRow);
            insertedRow = null;
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
        forceAddRow,
        forceRemoveRow,
        applyDiscount // Для внешнего вызова
    };

})(config, GM, utils, api);