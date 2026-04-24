// bonusFinder.js — модуль работы с бонусами клиента
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, refresh }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const CONFIG = {
        // Таблица 1: проверка ProductId (finder)
        finderSheetId: config?.finderSheetId || '1h4vwAC83sqAnf2ibalKW4qfTSHe0qToPs0-0aSdpdrU',
        finderSheetName: config?.finderSheetName || 'finder',
        finderRefreshMs: config?.finderRefreshMs || 900000,

        // Таблица 2: остатки бонусов (ОСТАТОК)
        bonusSheetId: config?.bonusSheetId || '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ',
        bonusSheetName: config?.bonusSheetName || 'ОСТАТОК',
        bonusApiKey: config?.bonusApiKey || 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0',

        // Таблица 3: списанные бонусы (idCheck)
        spentSheetId: config?.spentSheetId || '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkCFl970',
        spentSheetName: config?.spentSheetName || 'idCheck',
        spentRefreshMs: config?.spentRefreshMs || 900000,

        // Селекторы — ИСПРАВЛЕНО: класс bonus-row без префикса в селекторе
        selectors: {
            productId: config?.selectors?.productId || '#ProductId',
            bonusTable: config?.selectors?.bonusTable || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table',
            summarySpan: config?.selectors?.summarySpan || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span',
            summaryRow: config?.selectors?.summaryRow || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2)',
            chosenSingle: config?.selectors?.chosenSingle || '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a',
            clientSelectContainer: config?.selectors?.clientSelectContainer || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div'
        },

        pageKeywords: config?.pageKeywords || ['Номенклатура', 'Номенклатура по умолчанию'],
        uniquePrefix: config?.uniquePrefix || 'bonus-finder-'
    };

    const UNIQUE_PREFIX = CONFIG.uniquePrefix;

    // 🔥 Внутреннее состояние
    let active = false;
    let finderData = [];
    let spentData = [];
    let processedProductIds = new Set();
    let currentProductId = null;
    
    // 🔥 Set для отслеживания обработанных chosen-single элементов (как в оригинале)
    let processedChosenElements = new Set();

    // 🔥 Наблюдатели и таймеры
    let productIdObserver = null;
    let domObserver = null;
    let finderInterval = null;
    let spentInterval = null;
    let processDebounceTimer = null;

    // ─────────────────────────────────────────────
    // 🔥 СТИЛИ
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            @keyframes ${UNIQUE_PREFIX}dots {
                0% { content: "..."; }
                33% { content: "."; }
                66% { content: ".."; }
            }
            .${UNIQUE_PREFIX}loading::after {
                content: "...";
                animation: ${UNIQUE_PREFIX}dots 1s infinite;
            }
            .${UNIQUE_PREFIX}bonus-btn {
                margin-left: 10px !important;
                padding: 5px 10px !important;
                border: none !important;
                background-color: #4CAF50 !important;
                color: white !important;
                cursor: pointer !important;
                border-radius: 5px !important;
                font-size: 12px !important;
            }
            .${UNIQUE_PREFIX}bonus-btn:disabled {
                background-color: #ccc !important;
                cursor: not-allowed !important;
            }
            .${UNIQUE_PREFIX}myelem {
                pointer-events: none !important;
                user-select: none !important;
                opacity: 0.9 !important;
                font-weight: 500 !important;
            }
            .${UNIQUE_PREFIX}bonus-value {
                color: #28a745 !important;
                font-weight: bold !important;
            }
            .${UNIQUE_PREFIX}error-text {
                color: #dc3545 !important;
                font-weight: 500 !important;
            }
            /* 🔥 Защита строки с кнопкой */
            tr.${UNIQUE_PREFIX}bonus-row,
            tr.bonus-row {
                display: table-row !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    function parseCSV(csvText) {
        if (!csvText) return [];
        const lines = csvText.split('\n');
        const result = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            for (let j = 0; j < values.length; j++) {
                values[j] = values[j].replace(/^"|"$/g, '').trim();
            }
            result.push(values);
        }
        return result;
    }

    function hasPageKeyword() {
        const text = document.body.textContent || '';
        return CONFIG.pageKeywords.some(kw => text.includes(kw));
    }

    function getText(selector) {
        const el = document.querySelector(selector);
        return el ? (el.textContent || el.innerText || '').trim() : null;
    }

    // 🔥 ИСПРАВЛЕНО: возвращаем объект {text, element} как в оригинале
    function getSummaryData() {
        const selector1 = CONFIG.selectors.summarySpan;
        const selector2 = CONFIG.selectors.summaryRow;

        let element = document.querySelector(selector1);
        if (element) {
            return { text: element.textContent.trim(), element };
        } else {
            element = document.querySelector(selector2);
            if (element) {
                const spanElement = element.querySelector('div > a > span');
                const text = spanElement ? spanElement.textContent.trim() : element.textContent.trim();
                return { text, element };
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // 🔥 ТАБЛИЦА 1: finder
    // ─────────────────────────────────────────────
    function fetchFinderData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.finderSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.finderSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    finderData = parseCSV(res.responseText);
                    if (callback) callback();
                }
            },
            onerror: () => {}, ontimeout: () => {}
        });
    }

    function checkProductIdInFinder(productId) {
        if (!productId || !finderData.length) return false;
        const pidStr = productId.toString().trim();
        for (let i = 0; i < finderData.length; i++) {
            for (let j = 0; j < finderData[i].length; j++) {
                if (finderData[i][j].toString().trim() === pidStr) return true;
            }
        }
        return false;
    }

    function processProductIdElement(element) {
        if (!element) return;
        const productId = element.textContent.trim();
        if (!productId || processedProductIds.has(productId)) return;

        if (checkProductIdInFinder(productId)) {
            if (!element.textContent.includes('⚡️')) {
                element.textContent = element.textContent + ' ⚡️';
            }
            processedProductIds.add(productId);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 ТАБЛИЦА 2: бонусы
    // ─────────────────────────────────────────────
    function fetchBonusAmount(searchText, callback) {
        if (!CONFIG.bonusApiKey) { callback(null); return; }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.bonusSheetId}/values/${CONFIG.bonusSheetName}!A:B?key=${CONFIG.bonusApiKey}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data?.values?.length > 1) {
                            for (let i = 1; i < data.values.length; i++) {
                                const row = data.values[i];
                                if (row[0] === searchText) { callback(row[1]); return; }
                            }
                        }
                    } catch (e) {}
                }
                callback(null);
            },
            onerror: () => callback(null), ontimeout: () => callback(null)
        });
    }

    function createBonusRow() {
        const row = document.createElement('tr');
        // 🔥 Добавляем оба класса для совместимости
        row.classList.add(`${UNIQUE_PREFIX}bonus-row`, 'bonus-row');
        
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.style.textAlign = 'center';
        cell.style.fontWeight = 'bold';
        cell.textContent = 'Доступно бонусов: ';

        const button = document.createElement('button');
        button.textContent = 'Узнать';
        button.className = `${UNIQUE_PREFIX}bonus-btn`;

        button.addEventListener('click', () => {
            button.disabled = true;
            button.textContent = '';
            const loading = document.createElement('span');
            loading.textContent = 'Загрузка';
            loading.className = `${UNIQUE_PREFIX}loading`;
            button.appendChild(loading);

            setTimeout(() => {
                const summaryData = getSummaryData();
                const searchText = summaryData?.text;
                if (searchText) {
                    fetchBonusAmount(searchText, (amount) => {
                        if (amount !== null && amount !== undefined) {
                            cell.textContent = `Доступно бонусов: ${amount}`;
                            cell.style.color = 'green';
                        } else {
                            cell.innerHTML = `<span class="${UNIQUE_PREFIX}error-text">Бонусов нет</span>`;
                        }
                    });
                } else {
                    cell.innerHTML = `<span class="${UNIQUE_PREFIX}error-text">Ошибка: нет данных</span>`;
                }
            }, 800);
        });

        cell.appendChild(button);
        row.appendChild(cell);
        
        // 🔥 Гарантия отображения
        row.style.setProperty('display', 'table-row', 'important');
        row.style.setProperty('visibility', 'visible', 'important');
        
        return row;
    }

    function addBonusRowIfNeeded() {
        const targetTable = document.querySelector(CONFIG.selectors.bonusTable);
        if (!targetTable) return;
        const tbody = targetTable.querySelector('tbody');
        if (!tbody) return;
        // 🔥 Проверяем оба класса
        if (tbody.querySelector(`.${UNIQUE_PREFIX}bonus-row`) || tbody.querySelector('.bonus-row')) return;
        tbody.appendChild(createBonusRow());
    }

    function hideUnwantedRows() {
        const targetTable = document.querySelector(CONFIG.selectors.bonusTable);
        if (!targetTable) return;
        const tbody = targetTable.querySelector('tbody');
        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // 🔥 Пропускаем строки с любым из классов
            if (row.classList.contains(`${UNIQUE_PREFIX}bonus-row`) || row.classList.contains('bonus-row')) return;
            const text = row.textContent || row.innerText || '';
            if (
                !text.includes('Корректировка суммы') &&
                !text.includes('Юр. лицо') &&
                !text.includes('Доступно бонусов')
            ) {
                row.style.display = 'none';
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 ТАБЛИЦА 3: spent — ИСПРАВЛЕННАЯ ЛОГИКА
    // ─────────────────────────────────────────────
    function fetchSpentData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spentSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.spentSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    spentData = parseCSV(res.responseText);
                    if (callback) callback();
                }
            },
            onerror: () => {}, ontimeout: () => {}
        });
    }

    function getSpentBonuses(productId) {
        if (!productId || !spentData.length) return null;
        const pidStr = productId.toString().trim();
        for (let i = 0; i < spentData.length; i++) {
            const productCell = spentData[i][0];
            const bonusCell = spentData[i][4]; // Столбец E
            if (productCell?.toString().trim() === pidStr) {
                return bonusCell;
            }
        }
        return null;
    }

    // 🔥 ПОЛНОСТЬЮ ПЕРЕПИСАНО как в оригинале
    function processSpentBonuses(productId) {
        const bonuses = getSpentBonuses(productId);
        // 🔥 В оригинале: если бонусов нет — просто выходим, не создаём элемент
        if (!bonuses) return;

        const chosenSingle = document.querySelector(CONFIG.selectors.chosenSingle);
        if (!chosenSingle) return;

        // 🔥 ИСПРАВЛЕНО: используем Set с ссылкой на DOM-элемент (как в оригинале)
        if (processedChosenElements.has(chosenSingle)) return;
        processedChosenElements.add(chosenSingle);

        // 🔥 Получаем данные как объект {text, element}
        const selectorData = getSummaryData();
        // 🔥 В оригинале: проверяем существование объекта, а не текста
        if (!selectorData) return;

        // Скрываем оригинальный элемент
        chosenSingle.style.display = 'none';

        // Создаём новый элемент
        const newEl = document.createElement('span');
        newEl.classList.add(`${UNIQUE_PREFIX}myelem`, 'myelem'); // 🔥 Добавляем оба класса
        
        // 🔥 ИСПРАВЛЕНО: инлайновые стили как в оригинале
        newEl.style.pointerEvents = 'none';
        newEl.style.userSelect = 'none';
        newEl.style.opacity = '0.5';

        // Формируем текст
        if (bonuses) {
            newEl.innerHTML = `${selectorData.text} (Было списано <span class="${UNIQUE_PREFIX}bonus-value" style="color: green;">${bonuses}</span> бонусов)`;
        } else {
            newEl.textContent = selectorData.text;
        }

        // Вставляем в контейнер
        const container = document.querySelector(CONFIG.selectors.clientSelectContainer);
        if (container && chosenSingle.parentNode) {
            container.style.pointerEvents = 'none';
            chosenSingle.parentNode.insertBefore(newEl, chosenSingle);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 ОБРАБОТКА #ProductId
    // ─────────────────────────────────────────────
    function processCurrentProductId() {
        const pidEl = document.querySelector(CONFIG.selectors.productId);
        if (!pidEl) return;

        const newPid = pidEl.textContent.trim();
        if (!newPid || newPid === currentProductId) return;

        if (processDebounceTimer) clearTimeout(processDebounceTimer);
        processDebounceTimer = setTimeout(() => {
            currentProductId = newPid;

            // 1. Finder
            processProductIdElement(pidEl);

            // 2. Bonus row
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }

            // 3. Spent — 🔥 вызываем с числовым productId
            processSpentBonuses(newPid);
        }, 300);
    }

    function setupProductIdObserver() {
        productIdObserver = new MutationObserver((mutations) => {
            let changed = false;
            for (const m of mutations) {
                if (m.type === 'characterData' || m.addedNodes.length || m.removedNodes.length) {
                    changed = true;
                    break;
                }
            }
            if (changed) processCurrentProductId();
        });

        const pidEl = document.querySelector(CONFIG.selectors.productId);
        if (pidEl) {
            productIdObserver.observe(pidEl, { childList: true, subtree: true, characterData: true });
            processCurrentProductId();
        }

        domObserver = new MutationObserver(() => {
            const pidEl = document.querySelector(CONFIG.selectors.productId);
            if (pidEl && !productIdObserver) {
                setupProductIdObserver();
            }
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        if (hasPageKeyword()) {
            hideUnwantedRows();
            addBonusRowIfNeeded();
        }
        processCurrentProductId();
    }

    // ─────────────────────────────────────────────
    // 🔥 ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ
    // ─────────────────────────────────────────────
    function startPeriodicUpdates() {
        fetchFinderData();
        finderInterval = setInterval(fetchFinderData, CONFIG.finderRefreshMs);

        fetchSpentData();
        spentInterval = setInterval(fetchSpentData, CONFIG.spentRefreshMs);
    }

    // ─────────────────────────────────────────────
    // 🔥 API МОДУЛЯ
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;

        injectStyles();
        startPeriodicUpdates();
        setupProductIdObserver();
    }

    function cleanup() {
        if (!active) return;
        active = false;

        if (finderInterval) { clearInterval(finderInterval); finderInterval = null; }
        if (spentInterval) { clearInterval(spentInterval); spentInterval = null; }
        if (processDebounceTimer) { clearTimeout(processDebounceTimer); processDebounceTimer = null; }

        if (productIdObserver) { productIdObserver.disconnect(); productIdObserver = null; }
        if (domObserver) { domObserver.disconnect(); domObserver = null; }

        processedProductIds.clear();
        processedChosenElements.clear(); // 🔥 Очищаем и этот Set
        currentProductId = null;
        finderData = [];
        spentData = [];

        document.querySelectorAll(`.${UNIQUE_PREFIX}bonus-row, .bonus-row`).forEach(el => el.remove());
        document.querySelectorAll(`.${UNIQUE_PREFIX}myelem, .myelem`).forEach(el => {
            const original = el.previousSibling;
            if (original?.classList?.contains('chosen-single')) {
                original.style.display = '';
            }
            el.remove();
        });
    }

    function toggle() { if (active) { cleanup(); } else { init(); } }
    function isActive() { return active; }

    function refresh() {
        fetchFinderData();
        fetchSpentData();
        processCurrentProductId();
    }

    // 🔥 Авто-запуск
    if (CONFIG.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // 🔥 Экспорт API
    return {
        init, cleanup, toggle, isActive, refresh,
        getFinderData: () => [...finderData],
        getSpentData: () => [...spentData],
        getCurrentProductId: () => currentProductId,
        processProductId: processCurrentProductId
    };

})(config, GM, utils, api);