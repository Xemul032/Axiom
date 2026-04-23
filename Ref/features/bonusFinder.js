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
        finderRefreshMs: config?.finderRefreshMs || 900000, // 15 мин

        // Таблица 2: остатки бонусов (ОСТАТОК)
        bonusSheetId: config?.bonusSheetId || '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ',
        bonusSheetName: config?.bonusSheetName || 'ОСТАТОК',
        bonusApiKey: config?.bonusApiKey || 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0',

        // Таблица 3: списанные бонусы (idCheck)
        spentSheetId: config?.spentSheetId || '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkFl970',
        spentSheetName: config?.spentSheetName || 'idCheck',
        spentRefreshMs: config?.spentRefreshMs || 900000,

        // Селекторы
        selectors: {
            productId: config?.selectors?.productId || '#ProductId',
            bonusTable: config?.selectors?.bonusTable || '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table',
            summaryText1: config?.selectors?.summaryText1 || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span',
            summaryText2: config?.selectors?.summaryText2 || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)',
            chosenSingle: config?.selectors?.chosenSingle || '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a',
            clientSelectContainer: config?.selectors?.clientSelectContainer || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div'
        },

        // Текст для поиска на странице
        pageKeywords: config?.pageKeywords || ['Номенклатура', 'Номенклатура по умолчанию'],

        // Префикс для изоляции
        uniquePrefix: config?.uniquePrefix || 'bonus-finder-'
    };

    const UNIQUE_PREFIX = CONFIG.uniquePrefix;

    // 🔥 Внутреннее состояние
    let active = false;
    let finderData = [];
    let spentData = [];
    let processedProductIds = new Set();
    let currentProductId = null;

    // 🔥 Наблюдатели и таймеры
    let productIdObserver = null;
    let domObserver = null;
    let finderInterval = null;
    let spentInterval = null;
    let processDebounceTimer = null;

    // ─────────────────────────────────────────────
    // 🔥 СТИЛИ: изолированные
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

    function getSummaryText() {
        return getText(CONFIG.selectors.summaryText1) || getText(CONFIG.selectors.summaryText2);
    }

    // ─────────────────────────────────────────────
    // 🔥 ТАБЛИЦА 1: finder — проверка ProductId
    // ─────────────────────────────────────────────
    function fetchFinderData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.finderSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.finderSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    finderData = parseCSV(res.responseText);
                    if (callback) callback();
                }
            },
            onerror: () => {},
            ontimeout: () => {}
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
    // 🔥 ТАБЛИЦА 2: бонусы — кнопка "Узнать"
    // ─────────────────────────────────────────────
    function fetchBonusAmount(searchText, callback) {
        if (!CONFIG.bonusApiKey) {
            callback(null);
            return;
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.bonusSheetId}/values/${CONFIG.bonusSheetName}!A:B?key=${CONFIG.bonusApiKey}`;
        GM.xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data?.values?.length > 1) {
                            for (let i = 1; i < data.values.length; i++) {
                                const row = data.values[i];
                                if (row[0] === searchText) {
                                    callback(row[1]);
                                    return;
                                }
                            }
                        }
                    } catch (e) {}
                }
                callback(null);
            },
            onerror: () => callback(null),
            ontimeout: () => callback(null)
        });
    }

    function createBonusRow() {
        const row = document.createElement('tr');
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
                const searchText = getSummaryText();
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
        row.classList.add(`${UNIQUE_PREFIX}bonus-row`);
        return row;
    }

    function addBonusRowIfNeeded() {
        const targetTable = document.querySelector(CONFIG.selectors.bonusTable);
        if (!targetTable) return;
        const tbody = targetTable.querySelector('tbody');
        if (!tbody) return;
        if (tbody.querySelector(`.${UNIQUE_PREFIX}bonus-row`)) return;
        tbody.appendChild(createBonusRow());
    }

    function hideUnwantedRows() {
        const targetTable = document.querySelector(CONFIG.selectors.bonusTable);
        if (!targetTable) return;
        const tbody = targetTable.querySelector('tbody');
        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.classList.contains(`${UNIQUE_PREFIX}bonus-row`)) return;
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
    // 🔥 ТАБЛИЦА 3: spent — отображение списанных бонусов
    // ─────────────────────────────────────────────
    function fetchSpentData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spentSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.spentSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    spentData = parseCSV(res.responseText);
                    if (callback) callback();
                }
            },
            onerror: () => {},
            ontimeout: () => {}
        });
    }

    function getSpentBonuses(productId) {
        if (!productId || !spentData.length) return null;
        const pidStr = productId.toString().trim();
        for (let i = 0; i < spentData.length; i++) {
            const productCell = spentData[i][0];
            const bonusCell = spentData[i][4];
            if (productCell?.toString().trim() === pidStr) {
                return bonusCell;
            }
        }
        return null;
    }

    function processSpentBonuses(productId) {
        const bonuses = getSpentBonuses(productId);
        if (!bonuses) return;

        const chosenSingle = document.querySelector(CONFIG.selectors.chosenSingle);
        if (!chosenSingle) return;

        // Проверяем, не обрабатывали ли уже этот элемент
        const markerKey = `spent_${productId}`;
        if (chosenSingle.dataset[markerKey]) return;
        chosenSingle.dataset[markerKey] = '1';

        const selectorData = getSummaryText();
        if (!selectorData) return;

        chosenSingle.style.display = 'none';

        const newEl = document.createElement('span');
        newEl.className = `${UNIQUE_PREFIX}myelem`;
        newEl.innerHTML = `${selectorData} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;

        const container = document.querySelector(CONFIG.selectors.clientSelectContainer);
        if (container) {
            container.style.pointerEvents = 'none';
            container.insertBefore(newEl, chosenSingle);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 ОБРАБОТКА #ProductId — БЕЗ ТАЙМЕРА
    // ─────────────────────────────────────────────
    function processCurrentProductId() {
        const pidEl = document.querySelector(CONFIG.selectors.productId);
        if (!pidEl) return;

        const newPid = pidEl.textContent.trim();
        if (!newPid || newPid === currentProductId) return;

        // Дебаунс: ждём 300мс стабильности значения
        if (processDebounceTimer) clearTimeout(processDebounceTimer);
        processDebounceTimer = setTimeout(() => {
            currentProductId = newPid;

            // 1. Finder: проверка ProductId
            processProductIdElement(pidEl);

            // 2. Bonus row: добавляем кнопку
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }

            // 3. Spent: отображаем списанные бонусы
            processSpentBonuses(newPid);
        }, 300);
    }

    function setupProductIdObserver() {
        // 1. Прямой наблюдатель за #ProductId
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
            processCurrentProductId(); // обработка при инициализации
        }

        // 2. Наблюдатель за появлением #ProductId в DOM
        domObserver = new MutationObserver(() => {
            const pidEl = document.querySelector(CONFIG.selectors.productId);
            if (pidEl && !productIdObserver) {
                setupProductIdObserver(); // переподключаем, если элемент появился
            }
            // Также проверяем контекст страницы
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        // Первичная проверка
        if (hasPageKeyword()) {
            hideUnwantedRows();
            addBonusRowIfNeeded();
        }
        processCurrentProductId();
    }

    // ─────────────────────────────────────────────
    // 🔥 ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ДАННЫХ (редко)
    // ─────────────────────────────────────────────
    function startPeriodicUpdates() {
        // Finder: обновление раз в 15 мин (не 15 сек!)
        fetchFinderData();
        finderInterval = setInterval(fetchFinderData, CONFIG.finderRefreshMs);

        // Spent: обновление раз в 15 мин
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

        // Останавливаем таймеры
        if (finderInterval) { clearInterval(finderInterval); finderInterval = null; }
        if (spentInterval) { clearInterval(spentInterval); spentInterval = null; }
        if (processDebounceTimer) { clearTimeout(processDebounceTimer); processDebounceTimer = null; }

        // Отключаем наблюдатели
        if (productIdObserver) { productIdObserver.disconnect(); productIdObserver = null; }
        if (domObserver) { domObserver.disconnect(); domObserver = null; }

        // Сбрасываем состояние
        processedProductIds.clear();
        currentProductId = null;
        finderData = [];
        spentData = [];

        // Убираем добавленные элементы (опционально)
        document.querySelectorAll(`.${UNIQUE_PREFIX}bonus-row`).forEach(el => el.remove());
        document.querySelectorAll(`.${UNIQUE_PREFIX}myelem`).forEach(el => {
            // Восстанавливаем оригинальный элемент, если он был скрыт
            const original = el.previousSibling;
            if (original?.classList?.contains('chosen-single')) {
                original.style.display = '';
            }
            el.remove();
        });
    }

    function toggle() {
        if (active) { cleanup(); } else { init(); }
    }

    function isActive() {
        return active;
    }

    function refresh() {
        // Принудительное обновление данных из таблиц
        fetchFinderData();
        fetchSpentData();
        // И повторная обработка текущего ProductId
        processCurrentProductId();
    }

    // 🔥 Авто-запуск, если не отключено в конфиге
    if (CONFIG.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        refresh,
        // Публичные методы для отладки/интеграции
        getFinderData: () => [...finderData],
        getSpentData: () => [...spentData],
        getCurrentProductId: () => currentProductId,
        processProductId: processCurrentProductId
    };

})(config, GM, utils, api);