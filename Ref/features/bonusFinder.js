// 4bonusFinder.js — модуль работы с бонусами клиента
(function(config, GM, utils, api) {
    'use strict';

    const CONFIG = {
        finderSheetId: config?.finderSheetId || '1h4vwAC83sqAnf2ibalKW4qfTSHe0qToPs0-0aSdpdrU',
        finderSheetName: config?.finderSheetName || 'finder',
        finderRefreshMs: config?.finderRefreshMs || 900000,
        bonusSheetId: config?.bonusSheetId || '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ',
        bonusSheetName: config?.bonusSheetName || 'ОСТАТОК',
        bonusApiKey: config?.bonusApiKey || 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0',
        spentSheetId: config?.spentSheetId || '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkCFl970',
        spentSheetName: config?.spentSheetName || 'idCheck',
        spentRefreshMs: config?.spentRefreshMs || 900000,
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

    let active = false;
    let finderData = [];
    let spentData = [];
    let processedProductIds = new Set();
    let currentProductId = null;
    
    let productIdObserver = null;
    let domObserver = null;
    let chosenObserver = null;
    let finderInterval = null;
    let spentInterval = null;
    let processDebounceTimer = null;
    let chosenRetryTimer = null;

    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            .${UNIQUE_PREFIX}myelem, .myelem {
                pointer-events: none !important;
                user-select: none !important;
                opacity: 0.5 !important;
                font-weight: 500 !important;
            }
            .${UNIQUE_PREFIX}bonus-value {
                color: #28a745 !important;
                font-weight: bold !important;
            }
        `;
        document.head.appendChild(style);
    }

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
    // ТАБЛИЦА 1: finder
    // ─────────────────────────────────────────────
    function fetchFinderData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.finderSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.finderSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    finderData = parseCSV(res.responseText);
                    if (callback) callback();
                    if (currentProductId) processProductIdElement(document.querySelector(CONFIG.selectors.productId));
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
    // ТАБЛИЦА 2: бонусы
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
            button.textContent = 'Загрузка...';
            setTimeout(() => {
                const summaryData = getSummaryData();
                const searchText = summaryData?.text;
                if (searchText) {
                    fetchBonusAmount(searchText, (amount) => {
                        if (amount !== null && amount !== undefined) {
                            cell.textContent = `Доступно бонусов: ${amount}`;
                            cell.style.color = 'green';
                        } else {
                            cell.textContent = 'Бонусов нет';
                            cell.style.color = 'red';
                        }
                    });
                }
            }, 500);
        });
        cell.appendChild(button);
        row.appendChild(cell);
        return row;
    }

    function addBonusRowIfNeeded() {
        const targetTable = document.querySelector(CONFIG.selectors.bonusTable);
        if (!targetTable) return;
        const tbody = targetTable.querySelector('tbody');
        if (!tbody) return;
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
            if (row.classList.contains(`${UNIQUE_PREFIX}bonus-row`) || row.classList.contains('bonus-row')) return;
            const text = row.textContent || row.innerText || '';
            if (!text.includes('Корректировка суммы') && !text.includes('Юр. лицо') && !text.includes('Доступно бонусов')) {
                row.style.display = 'none';
            }
        });
    }

    // ─────────────────────────────────────────────
    // ТАБЛИЦА 3: spent — ИСПРАВЛЕНО
    // ─────────────────────────────────────────────
    function fetchSpentData(callback) {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spentSheetId}/gviz/tq?tqx=out:csv&sheet=${CONFIG.spentSheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    spentData = parseCSV(res.responseText);
                    if (callback) callback();
                    // Повторная обработка после загрузки данных
                    if (currentProductId) {
                        processSpentBonuses(currentProductId);
                    }
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
            const bonusCell = spentData[i][4];
            if (productCell?.toString().trim() === pidStr) {
                return bonusCell;
            }
        }
        return null;
    }

    // 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: наблюдаем за появлением элемента
    function tryProcessSpentBonuses(productId) {
        // Ищем элемент несколькими способами
        const selectors = [
            '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a',
            '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2)',
            '.chosen-single',
            CONFIG.selectors.chosenSingle
        ];

        let chosenElement = null;
        for (const selector of selectors) {
            chosenElement = document.querySelector(selector);
            if (chosenElement) break;
        }

        if (!chosenElement) {
            // Элемент ещё не появился — пробуем позже
            if (chosenRetryTimer) clearTimeout(chosenRetryTimer);
            chosenRetryTimer = setTimeout(() => {
                tryProcessSpentBonuses(productId);
            }, 300);
            return;
        }

        // Очищаем предыдущий таймер
        if (chosenRetryTimer) {
            clearTimeout(chosenRetryTimer);
            chosenRetryTimer = null;
        }

        const bonuses = getSpentBonuses(productId);
        if (!bonuses) return;

        // Проверяем, не обрабатывали ли уже этот ProductId
        const processedKey = `${productId}_${chosenElement.getAttribute('data-processed') || ''}`;
        if (chosenElement.classList.contains(`${UNIQUE_PREFIX}processed`)) return;
        
        // Получаем данные клиента
        const selectorData = getSummaryData();
        if (!selectorData) return;

        // Скрываем оригинальный элемент
        chosenElement.style.display = 'none';
        chosenElement.classList.add(`${UNIQUE_PREFIX}processed`);

        // Создаём новый элемент
        const newEl = document.createElement('span');
        newEl.classList.add('myelem');
        newEl.style.pointerEvents = 'none';
        newEl.style.userSelect = 'none';
        newEl.style.opacity = '0.5';
        newEl.innerHTML = `${selectorData.text} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;

        // Вставляем
        const container = document.querySelector(CONFIG.selectors.clientSelectContainer) || 
                         document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div");
        
        if (container) {
            container.style.pointerEvents = 'none';
            if (chosenElement.parentNode) {
                chosenElement.parentNode.insertBefore(newEl, chosenElement);
            } else {
                container.appendChild(newEl);
            }
        }
    }

    function processSpentBonuses(productId) {
        if (!spentData.length) return;
        tryProcessSpentBonuses(productId);
    }

    // ─────────────────────────────────────────────
    // ОБРАБОТКА ProductId
    // ─────────────────────────────────────────────
    function processCurrentProductId() {
        const pidEl = document.querySelector(CONFIG.selectors.productId);
        if (!pidEl) return;

        const newPid = pidEl.textContent.trim();
        if (!newPid || newPid === currentProductId) return;

        if (processDebounceTimer) clearTimeout(processDebounceTimer);
        processDebounceTimer = setTimeout(() => {
            currentProductId = newPid;

            // Сбрасываем флаг обработки для нового ProductId
            document.querySelectorAll(`.${UNIQUE_PREFIX}processed`).forEach(el => {
                el.classList.remove(`${UNIQUE_PREFIX}processed`);
            });

            // 1. Finder
            processProductIdElement(pidEl);

            // 2. Bonus row
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }

            // 3. Spent — пробуем обработать
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

        // Наблюдаем за появлением chosen элемента
        chosenObserver = new MutationObserver(() => {
            if (currentProductId && spentData.length) {
                tryProcessSpentBonuses(currentProductId);
            }
        });
        chosenObserver.observe(document.body, { childList: true, subtree: true });

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
    // ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ
    // ─────────────────────────────────────────────
    function startPeriodicUpdates() {
        fetchFinderData();
        finderInterval = setInterval(fetchFinderData, CONFIG.finderRefreshMs);
        fetchSpentData();
        spentInterval = setInterval(fetchSpentData, CONFIG.spentRefreshMs);
    }

    // ─────────────────────────────────────────────
    // API МОДУЛЯ
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
        if (chosenRetryTimer) { clearTimeout(chosenRetryTimer); chosenRetryTimer = null; }

        if (productIdObserver) { productIdObserver.disconnect(); productIdObserver = null; }
        if (domObserver) { domObserver.disconnect(); domObserver = null; }
        if (chosenObserver) { chosenObserver.disconnect(); chosenObserver = null; }

        processedProductIds.clear();
        currentProductId = null;
        finderData = [];
        spentData = [];

        document.querySelectorAll(`.${UNIQUE_PREFIX}bonus-row, .bonus-row`).forEach(el => el.remove());
        document.querySelectorAll(`.${UNIQUE_PREFIX}myelem, .myelem`).forEach(el => el.remove());
        document.querySelectorAll('.chosen-single').forEach(el => {
            if (el.style.display === 'none') {
                el.style.display = '';
            }
        });
    }

    function toggle() { if (active) cleanup(); else init(); }
    function isActive() { return active; }

    function refresh() {
        fetchFinderData();
        fetchSpentData();
        processCurrentProductId();
    }

    if (CONFIG.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    return {
        init, cleanup, toggle, isActive, refresh,
        getFinderData: () => [...finderData],
        getSpentData: () => [...spentData],
        getCurrentProductId: () => currentProductId
    };

})(config, GM, utils, api);