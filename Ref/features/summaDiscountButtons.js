// 1summaDiscountButtons.js — модуль кнопок скидок и наценок с корректным расчётом
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'summa-discount-';
    const CSS_URL = config?.cssUrl || 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Ref/summaDiscountButtons.css';
    const SELECTORS = {
        summa: config?.selectors?.summa || '#Summa',
        correctionInput: config?.selectors?.correctionInput || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input.right.SummaCorrection',
        targetTbody: config?.selectors?.targetTbody || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody',
        firstRow: config?.selectors?.firstRow || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:first-child'
    };
    const DISCOUNTS = config?.discounts || [
        { label: '+40%', percent: 40, positive: true, class: 'summa-discount-btn-green', order: 0 },
        { label: '-5%', percent: 5, positive: false, class: 'summa-discount-btn-orange', order: 1 },
        { label: '-10%', percent: 10, positive: false, class: 'summa-discount-btn-red', order: 2 }
    ];

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let rowObserver = null;
    let styleEl = null;
    let insertedRow = null;
    let cssLoaded = false;

    // ─────────────────────────────────────────────
    // 🔥 INLINE-СТИЛИ ДЛЯ КНОПОК (гарантированное применение)
    // ─────────────────────────────────────────────
    const BUTTON_BASE_STYLES = {
        padding: '3px 18px',
        fontSize: '11px',
        fontWeight: '700',
        color: '#fff',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: '4px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'all 0.15s ease',
        marginRight: '6px',
        display: 'inline-block',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',
        lineHeight: '1.4'
    };

    const BUTTON_COLORS = {
        green: 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
        orange: 'linear-gradient(180deg, #f0ad4e 0%, #ec971f 100%)',
        red: 'linear-gradient(180deg, #d9534f 0%, #c9302c 100%)'
    };

    // ─────────────────────────────────────────────
    // 🔥 Загрузка внешней CSS-библиотеки
    // ─────────────────────────────────────────────
    function loadCssLibrary() {
        return new Promise((resolve) => {
            if (cssLoaded || document.getElementById(`${UNIQUE_PREFIX}css-lib`)) {
                cssLoaded = true;
                resolve();
                return;
            }

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CSS_URL,
                    timeout: 10000,
                    onload: (response) => {
                        if (response.status === 200) {
                            injectStyles(response.responseText);
                            cssLoaded = true;
                        }
                        resolve();
                    },
                    onerror: () => {
                        console.warn('[Axiom] Ошибка загрузки CSS');
                        injectFallbackStyles();
                        resolve();
                    },
                    ontimeout: () => {
                        injectFallbackStyles();
                        resolve();
                    }
                });
            } else {
                const link = document.createElement('link');
                link.id = `${UNIQUE_PREFIX}css-lib`;
                link.rel = 'stylesheet';
                link.href = CSS_URL;
                link.onload = () => { cssLoaded = true; resolve(); };
                link.onerror = () => {
                    injectFallbackStyles();
                    resolve();
                };
                document.head.appendChild(link);
            }
        });
    }

    function injectStyles(cssText) {
        if (styleEl) return;
        styleEl = document.createElement('style');
        styleEl.id = `${UNIQUE_PREFIX}styles`;
        styleEl.textContent = cssText;
        document.head.appendChild(styleEl);
    }

    function injectFallbackStyles() {
        if (styleEl) return;
        styleEl = document.createElement('style');
        styleEl.id = `${UNIQUE_PREFIX}fallback`;
        styleEl.textContent = `
            .summa-discount-btn {
                padding: 3px 18px !important; font-size: 11px !important; font-weight: 700 !important;
                color: #fff !important; border: 1px solid rgba(0,0,0,0.2) !important;
                border-radius: 4px !important; cursor: pointer !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important; margin-right: 6px !important;
            }
            .summa-discount-btn:last-child { margin-right: 0 !important; }
            .summa-discount-btn:hover { transform: translateY(-1px) !important; }
            .summa-discount-btn-green { background: ${BUTTON_COLORS.green} !important; }
            .summa-discount-btn-orange { background: ${BUTTON_COLORS.orange} !important; }
            .summa-discount-btn-red { background: ${BUTTON_COLORS.red} !important; }
            .summa-discount-row { display: table-row !important; visibility: visible !important; opacity: 1 !important; }
        `;
        document.head.appendChild(styleEl);
        cssLoaded = true;
    }

    // ─────────────────────────────────────────────
    // 🔥 Создание кнопки с inline-стилями
    // ─────────────────────────────────────────────
    function createButton(btnCfg) {
        const btn = document.createElement('button');
        btn.textContent = btnCfg.label;
        btn.className = `summa-discount-btn ${btnCfg.class}`;
        btn.type = 'button';
        
        // 🔥 Применяем inline-стили
        Object.assign(btn.style, BUTTON_BASE_STYLES);
        
        // 🔥 Добавляем цвет фона
        let bgColor = '';
        if (btnCfg.class.includes('green')) bgColor = BUTTON_COLORS.green;
        else if (btnCfg.class.includes('orange')) bgColor = BUTTON_COLORS.orange;
        else if (btnCfg.class.includes('red')) bgColor = BUTTON_COLORS.red;
        
        btn.style.background = bgColor;
        btn.style.backgroundImage = bgColor;
        
        // 🔥 Hover-эффект через inline-стили
        btn.onmouseenter = () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        };
        
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            applyDiscount(btnCfg.percent, btnCfg.positive);
        };
        
        return btn;
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

        let currentCorrection = 0;
        if (targetInput.value && targetInput.value.trim() !== '') {
            currentCorrection = parseRussianNumber(targetInput.value);
        }

        let effectiveSumma;
        if (currentCorrection < 0) {
            effectiveSumma = baseSumma + Math.abs(currentCorrection);
        } else {
            effectiveSumma = baseSumma - currentCorrection;
        }

        const amount = effectiveSumma * percent / 100;
        const sign = isPositive ? '' : '-';
        const formattedValue = `${sign}${amount.toFixed(2).replace('.', ',')}`;

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
                        target.classList.add('summa-discount-row');
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
        if (!targetTbody || targetTbody.querySelector('.summa-discount-row')) return;

        const firstRow = document.querySelector(SELECTORS.firstRow);
        if (!firstRow) return;

        const newRow = firstRow.cloneNode(true);
        newRow.className = 'summa-discount-row';
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

            // Создаём кнопки с inline-стилями
            DISCOUNTS
                .slice()
                .sort((a, b) => a.order - b.order)
                .forEach(btnCfg => {
                    const btn = createButton(btnCfg);
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
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    async function init() {
        if (active) return;
        active = true;
        
        // 🔥 Сначала загружаем CSS, затем инициализируем
        await loadCssLibrary();
        
        setupObserver();
        checkAndInit();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        if (observer) { observer.disconnect(); observer = null; }
        if (rowObserver) { rowObserver.disconnect(); rowObserver = null; }
        
        if (styleEl?.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
            styleEl = null;
        }
        
        if (insertedRow?.parentNode) {
            insertedRow.parentNode.removeChild(insertedRow);
            insertedRow = null;
        }
        
        document.querySelectorAll('.summa-discount-row').forEach(el => {
            el.classList.remove('summa-discount-row');
            el.removeAttribute(`data-${UNIQUE_PREFIX}created`);
        });
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

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
        applyDiscount
    };

})(config, GM, utils, api);