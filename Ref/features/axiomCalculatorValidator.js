// axiomCalculatorValidator.js — модуль валидации калькулятора перед расчётом
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const RULES_URL = config?.rulesUrl || 'https://raw.githubusercontent.com/ВАШ_НИК/ВАШ_РЕПО/main/calc_rules.json';
    const UNIQUE_PREFIX = config?.uniquePrefix || 'axiom-calc-val-';
    const CACHE_DURATION = config?.cacheDurationSec || 300; // 5 минут по умолчанию

    // 🔥 Внутреннее состояние
    let cachedRules = null;
    let cacheTime = 0;
    let active = false;
    let observer = null;
    let debounceTimer = null;

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    function debounce(fn, delay) {
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // 📥 Загрузка и кэширование правил
    async function loadRules() {
        const now = Date.now();
        if (cachedRules && now - cacheTime < CACHE_DURATION * 1000) return cachedRules;
        try {
            const res = await fetch(RULES_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            cachedRules = await res.json();
            cacheTime = now;
            return cachedRules;
        } catch (e) {
            return cachedRules || [];
        }
    }

    // 🔍 Определение типа калькулятора
    function detectCalculatorType() {
        let type = 'Неизвестный';
        let found = false;
        if (document.querySelector("#Skrepka")) { type = "Многостраничная"; found = true; }
        else {
            const pt = document.querySelector("#ProductTirazh");
            if (pt) {
                if (pt.classList.contains("superhead")) { type = "Листовая"; found = true; }
                else if (pt.classList.contains("need")) { type = "Составное"; found = true;
                }
            }
        }
        if (!found && document.querySelector("#size_max")) { type = "Перекидной календарь"; found = true; }
        if (!found && document.querySelector("#size_h")) { type = "Календарь-домик"; found = true; }
        return { type, found };
    }

    // 📊 Сбор данных ордера
    function getOrderData(el) {
        const getVal = id => el.querySelector(`input#${id}`)?.value?.trim() || '';
        const layoutSel = el.querySelector('select#CifraLayoutType');
        const layoutVal = layoutSel ? (layoutSel.options[layoutSel.selectedIndex]?.text || layoutSel.value) : '';

        const postpress = [];
        const list = el.querySelector('#PostpressList');
        if (list) {
            list.querySelectorAll('tr').forEach(row => {
                if (row.closest('thead')) return;
                const nameTd = row.querySelector('td');
                const name = nameTd ? nameTd.textContent.replace(/\s+/g, ' ').trim() : '';
                if (!name) return;
                let qty = '1';
                const qtyInput = row.querySelector('input#Quantity');
                if (qtyInput) qty = qtyInput.value.trim() || '1';
                else {
                    const cells = row.querySelectorAll('td');
                    if (cells[1]) qty = cells[1].textContent.trim() || '1';
                }
                postpress.push({ name, qty: parseFloat(qty) || 0 });
            });
        }
        return {
            tirazh: parseFloat(getVal('Tirazh')) || 0,
            pages: parseFloat(getVal('Pages')) || 1,
            trim: parseFloat(getVal('TrimSize')) || 0,
            cifra_layout: layoutVal,
            postpress_text: postpress.map(p => p.name).join(' | '),
            postpress: postpress
        };
    }

    // 🌍 Сбор глобальных данных
    function getGlobalData() {
        const container = document.querySelector("#Doc > div > div:nth-child(2)") || document.querySelector(".calc_input > div.block:first-child");
        const getVal = id => container?.querySelector(`input#${id}`)?.value?.trim() || '';

        const postpress = [];
        const list = document.querySelector('#ProductPostpress > #PostpressList, #ProductPostpress tbody#PostpressList');
        if (list) {
            list.querySelectorAll('tr').forEach(row => {
                if (row.closest('thead')) return;
                const nameTd = row.querySelector('td');
                const name = nameTd ? nameTd.textContent.replace(/\s+/g, ' ').trim() : '';
                if (!name) return;
                let qty = '1';
                const qtyInput = row.querySelector('input#Quantity');
                if (qtyInput) qty = qtyInput.value.trim() || '1';
                else {
                    const cells = row.querySelectorAll('td');
                    if (cells[1]) qty = cells[1].textContent.trim() || '1';
                }
                postpress.push({ name, qty: parseFloat(qty) || 0 });
            });
        }
        return {
            tirazh: parseFloat(getVal('Tirazh')) || 0,
            size_w: parseFloat(getVal('SizeWidth')) || 0,
            size_h: parseFloat(getVal('SizeHeight')) || 0,
            postpress_text: postpress.map(p => p.name).join(' | '),
            postpress: postpress
        };
    }

    // ⚙️ Движок проверки условия
    function checkCondition(cond, data) {
        const { field, op, value } = cond;
        let target = data[field];
        if (target === undefined) return false;

        switch (op) {
            case 'eq': return target == value;
            case 'neq': return target != value;
            case 'gt': return Number(target) > Number(value);
            case 'gte': return Number(target) >= Number(value);
            case 'lt': return Number(target) < Number(value);
            case 'lte': return Number(target) <= Number(value);
            case 'contains': return String(target).toUpperCase().includes(String(value).toUpperCase());
            case 'not_contains': return !String(target).toUpperCase().includes(String(value).toUpperCase());
            case 'has_qty': return data.postpress.some(p => p.qty == Number(value));
            case 'qty_gt': return data.postpress.some(p => p.qty > Number(value));
            case 'qty_lt': return data.postpress.some(p => p.qty < Number(value));
            default: return false;
        }
    }

    // ✅ Валидация перед расчётом
    async function validateAndCalculate(originalBtn) {
        const rules = await loadRules();
        const errors = [];

        const orderContainers = Array.from(document.querySelectorAll('[id^="Order"]'))
            .filter(el => /^Order\d+$/.test(el.id) && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden')
            .sort((a, b) => parseInt(a.id.replace('Order', '')) - parseInt(b.id.replace('Order', '')));

        const globalData = getGlobalData();

        for (const rule of rules) {
            const globalConds = rule.conditions.filter(c => c.scope === 'global');
            const globalOk = globalConds.every(c => checkCondition(c, globalData));
            if (!globalOk) continue;

            const orderConds = rule.conditions.filter(c => c.scope === 'order');

            orderContainers.forEach((el, idx) => {
                const num = idx + 1;
                const name = getOrderName(el, idx);
                const orderData = getOrderData(el);

                const orderOk = orderConds.length === 0 || orderConds.every(c => checkCondition(c, orderData));

                if (orderOk) {
                    const contextLabel = orderConds.length > 0 ? ` (Ордер №${num} - ${name})` : ' (Глобально)';
                    errors.push(`${rule.message}${contextLabel}`);
                }
            });
        }

        if (errors.length === 0) {
            originalBtn.click();
        } else {
            // 🔥 Вывод ошибок через глобальную функцию
            api?.showCenterMessage?.({
                message: `❌ Ошибки валидации:\n\n${errors.join('\n')}`,
                buttonText: 'Понятно',
                duration: 0
            });
        }
    }

    // 🔘 Замена кнопки расчёта
    function setupCalculateButton() {
        const originalBtn = document.querySelector('button[onclick*="ProductSave"]');
        if (!originalBtn || originalBtn.dataset?.[`${UNIQUE_PREFIX}wrapped`] === 'true') return;

        originalBtn.style.display = 'none';
        originalBtn.dataset[`${UNIQUE_PREFIX}wrapped`] = 'true';

        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = originalBtn.className;
        newBtn.textContent = 'Рассчитать';
        originalBtn.parentNode.insertBefore(newBtn, originalBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            validateAndCalculate(originalBtn);
        });
    }

    // 📦 Сбор постпечати (для анализа — внутренняя логика)
    function extractPostpressOps(listElement) {
        if (!listElement) return [];
        const ops = [];
        listElement.querySelectorAll('tr').forEach(row => {
            if (row.closest('thead')) return;
            const nameTd = row.querySelector('td');
            const name = nameTd ? nameTd.textContent.replace(/\s+/g, ' ').trim() : '';
            if (!name) return;
            let qty = '1';
            const qtyInput = row.querySelector('input#Quantity');
            if (qtyInput && qtyInput.value.trim()) qty = qtyInput.value.trim();
            else {
                const cells = row.querySelectorAll('td');
                if (cells.length > 1) {
                    const val = cells[1].textContent.replace(/\s+/g, ' ').trim();
                    if (val && !isNaN(parseFloat(val))) qty = val;
                }
            }
            ops.push({ name, qty });
        });
        return ops;
    }
    function getGlobalPostpressOps() { return extractPostpressOps(document.querySelector('#ProductPostpress > #PostpressList, #ProductPostpress tbody#PostpressList')); }
    function getOrderPostpressOps(c) { return extractPostpressOps(c.querySelector('#Postpress #PostpressList, #PostpressList')); }

    function getOrderName(container, idx) {
        const input = container.querySelector('input#name, input.head');
        if (input && input.value.trim()) return input.value.trim();
        const headEl = container.querySelector('td.head, .head');
        if (headEl) return headEl.textContent.trim();
        if (container.id === 'Order0' && document.querySelector('#Skrepka')) return 'Обложка';
        return `Блок ${idx + 1}`;
    }
    function getOrderPaper(orderEl) { const s = orderEl.querySelector('.chosen-container .chosen-single span'); return s ? s.textContent.trim() : 'Не выбрано'; }
    function getOrderFields(orderEl) {
        const g = id => orderEl.querySelector(`input#${id}`)?.value?.trim() || '';
        return { sizeW: g('SizeWidth'), sizeH: g('SizeHeight'), tirazh: g('Tirazh'), pages: g('Pages'), trim: g('TrimSize'), paper: getOrderPaper(orderEl) };
    }
    function getMultipageGlobalConfig() {
        const c = document.querySelector("#Doc > div > div:nth-child(2)") || document.querySelector(".calc_input > div.block:first-child");
        if (!c) return null;
        const g = id => c.querySelector(`input#${id}`)?.value?.trim() || '';
        const b = c.querySelector('#Binding');
        return { tirazh: g('Tirazh'), sizeW: g('SizeWidth'), sizeH: g('SizeHeight'), trim: g('TrimSize'), binding: b ? b.options[b.selectedIndex]?.text?.trim() : 'Не выбрано' };
    }

    // 📊 Анализ и настройка (внутренняя логика)
    function analyzeCalculator() {
        const calcRoot = document.querySelector('.calc_input');
        const postpressRoot = document.querySelector('#ProductPostpress');
        if (!calcRoot || !postpressRoot) {
            if (active) { isCalcActive = false; }
            return;
        }

        const { type: calcType, found: typeFound } = detectCalculatorType();
        if (!typeFound || calcType.includes("Календарь")) {
            if (active) { isCalcActive = false; }
            return;
        }

        isCalcActive = true;
        setupCalculateButton();

        // Анализ для внутренней логики (без вывода в консоль)
        const orders = Array.from(document.querySelectorAll('[id^="Order"]'))
            .filter(el => /^Order\d+$/.test(el.id) && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden')
            .sort((a, b) => parseInt(a.id.replace('Order', '')) - parseInt(b.id.replace('Order', '')));

        // Внутренняя логика анализа (может использоваться для других целей)
        const globalOps = getGlobalPostpressOps();
        // ... анализ без вывода в консоль ...
    }

    let isCalcActive = false;
    const runAnalysis = debounce(analyzeCalculator, 500);

    function setupObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(m => {
            if (m.some(x => x.type === 'childList' || (x.type === 'attributes' && ['checked','value','class','style'].includes(x.attributeName)))) runAnalysis();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked','value','class','style'] });
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        runAnalysis();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        clearTimeout(debounceTimer);
        
        // Восстанавливаем оригинальную кнопку
        document.querySelectorAll(`button[data-${UNIQUE_PREFIX}wrapped="true"]`).forEach(wrappedBtn => {
            const original = wrappedBtn.previousElementSibling;
            if (original && original.style.display === 'none') {
                original.style.display = '';
                delete original.dataset[`${UNIQUE_PREFIX}wrapped`];
            }
            wrappedBtn.remove();
        });
    }

    function toggle() {
        if (active) { cleanup(); } else { init(); }
    }

    function isActive() {
        return active;
    }

    // 🔥 Авто-запуск
    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // 🔥 Экспорт API для внешнего управления
    return {
        init,
        cleanup,
        toggle,
        isActive,
        // Дополнительные методы для отладки/расширения
        validateAndCalculate,
        loadRules,
        checkCondition
    };

})(config, GM, utils, api);