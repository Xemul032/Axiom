// 12bonusFinder.js — модуль работы с бонусами клиента
// Версия 6: ПОЛНОЕ ЛОГИРОВАНИЕ для отладки

(function(config, GM, utils, api) {
    'use strict';

    const CONFIG = {
        finder: {
            sheetId: config?.finderSheetId || '1h4vwAC83sqAnf2ibalKW4qfTSHe0qToPs0-0aSdpdrU',
            sheetName: config?.finderSheetName || 'finder',
        },
        bonus: {
            sheetId: config?.bonusSheetId || '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ',
            sheetName: config?.bonusSheetName || 'ОСТАТОК',
            apiKey: config?.bonusApiKey || 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0',
        },
        spent: {
            sheetId: config?.spentSheetId || '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkCFl970',
            sheetName: config?.spentSheetName || 'idCheck',
        },
        selectors: {
            productId: '#ProductId',
            bonusTable: '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table',
            summarySpan: '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span',
            summaryCell: '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)',
            chosenLink: '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a',
            clientContainer: '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div',
        },
        pageKeywords: ['Номенклатура', 'Номенклатура по умолчанию'],
        uniquePrefix: 'bonus-finder-',
    };

    const UNIQUE_PREFIX = CONFIG.uniquePrefix;
    const LOG_TAG = '[bonusFinder]';

    let active = false;
    let finderData = [];
    let spentData = [];
    let processedProductIds = new Set();
    let processedSpentFlags = new Set();
    let currentProductId = null;
    let domObserver = null;
    let productIdObserver = null;

    // ─────────────────────────────────────────────
    // 🔊 Логирование
    // ─────────────────────────────────────────────
    function log(...args) { console.log(LOG_TAG, ...args); }
    function warn(...args) { console.warn(LOG_TAG, ...args); }
    function error(...args) { console.error(LOG_TAG, ...args); }

    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            @keyframes ${UNIQUE_PREFIX}dots { 0% { content: "..."; } 33% { content: "."; } 66% { content: ".."; } }
            .${UNIQUE_PREFIX}loading::after { content: "..."; animation: ${UNIQUE_PREFIX}dots 1s infinite; }
            .${UNIQUE_PREFIX}bonus-btn { margin-left: 10px !important; padding: 5px 10px !important; border: none !important; background-color: #4CAF50 !important; color: white !important; cursor: pointer !important; border-radius: 5px !important; font-size: 12px !important; }
            .${UNIQUE_PREFIX}bonus-btn:disabled { background-color: #ccc !important; cursor: not-allowed !important; }
            .${UNIQUE_PREFIX}myelem, .myelem { pointer-events: none !important; user-select: none !important; opacity: 0.5 !important; font-weight: 500 !important; }
            .${UNIQUE_PREFIX}bonus-value { color: #28a745 !important; font-weight: bold !important; }
            .${UNIQUE_PREFIX}error-text { color: #dc3545 !important; font-weight: 500 !important; }
            tr.${UNIQUE_PREFIX}bonus-row, tr.bonus-row { display: table-row !important; visibility: visible !important; opacity: 1 !important; }
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
            for (let j = 0; j < values.length; j++) values[j] = values[j].replace(/^"|"$/g, '').trim();
            result.push(values);
        }
        return result;
    }

    function hasPageKeyword() {
        const text = document.body.textContent || '';
        return CONFIG.pageKeywords.some(kw => text.includes(kw));
    }

    // 🔥 ИСПРАВЛЕНО + ЛОГИРОВАНИЕ
    function getClientData() {
        const { summarySpan, summaryCell } = CONFIG.selectors;
        
        log('getClientData: searching for client element...');
        
        // 1. Ищем span внутри ссылки (Chosen)
        let element = document.querySelector(summarySpan);
        if (element) {
            log('getClientData: found span element', element);
            const parent = element.closest(`.${UNIQUE_PREFIX}myelem`);
            if (parent && parent.dataset.originalClient) {
                log('getClientData: using saved originalClient from data-attr:', parent.dataset.originalClient);
                return { text: parent.dataset.originalClient, element: parent };
            }
            const text = element.textContent.trim();
            log('getClientData: extracted text from span:', text);
            return { text, element };
        }
        
        // 2. Ищем саму ячейку <td>
        element = document.querySelector(summaryCell);
        if (element) {
            log('getClientData: found td element', element);
            const myelem = element.querySelector(`.${UNIQUE_PREFIX}myelem`);
            if (myelem && myelem.dataset.originalClient) {
                log('getClientData: using saved originalClient from myelem:', myelem.dataset.originalClient);
                return { text: myelem.dataset.originalClient, element: myelem };
            }
            const spanElement = element.querySelector('div > a > span');
            const text = spanElement ? spanElement.textContent.trim() : element.textContent.trim();
            log('getClientData: extracted text from td:', text, '(source:', (spanElement ? 'span' : 'td'), ')');
            return { text, element };
        }
        
        log('getClientData: NO ELEMENT FOUND');
        return null;
    }

    function fetchFinderData(callback) {
        const { sheetId, sheetName } = CONFIG.finder;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    finderData = parseCSV(res.responseText);
                    log(`Finder data loaded: ${finderData.length} rows`);
                    if (callback) callback();
                    if (currentProductId) processFinder(currentProductId);
                }
            },
            onerror: () => error('Finder fetch error'), 
            ontimeout: () => error('Finder fetch timeout')
        });
    }

    function checkProductIdInFinder(productId) {
        if (!productId || !finderData.length) return false;
        const pid = productId.toString().trim();
        for (const row of finderData) {
            for (const cell of row) {
                if (cell.toString().trim() === pid) return true;
            }
        }
        return false;
    }

    function processFinder(productId) {
        if (!productId || processedProductIds.has(productId)) return;
        if (checkProductIdInFinder(productId)) {
            const el = document.querySelector(CONFIG.selectors.productId);
            if (el && !el.textContent.includes('⚡️')) {
                el.textContent = el.textContent + ' ⚡️';
                log(`Finder: marked ProductId ${productId} with ⚡️`);
            }
            processedProductIds.add(productId);
        }
    }

    // 🔥 ЛОГИРОВАНИЕ ЗАПРОСА К БОНУСАМ
    function fetchBonusAmount(searchText, callback) {
        const { sheetId, sheetName, apiKey } = CONFIG.bonus;
        
        log('=== fetchBonusAmount START ===');
        log('searchText received:', JSON.stringify(searchText));
        log('apiKey present:', !!apiKey);
        log('sheetId:', sheetId);
        log('sheetName:', sheetName);
        
        if (!apiKey) { 
            log('fetchBonusAmount: NO API KEY, returning null');
            callback(null); 
            return; 
        }
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:B?key=${apiKey}`;
        log('Request URL:', url);
        
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                log('API Response status:', res.status);
                if (res.status === 200) {
                    try {
                        const data = JSON.parse(res.responseText);
                        log('API Response data:', data);
                        
                        if (data?.values?.length > 1) {
                            log(`Checking ${data.values.length - 1} rows for match...`);
                            for (let i = 1; i < data.values.length; i++) {
                                const rowKey = data.values[i][0];
                                const rowValue = data.values[i][1];
                                log(`  Row ${i}: key="${rowKey}", value="${rowValue}", match=${rowKey === searchText}`);
                                if (rowKey === searchText) {
                                    log(`✅ MATCH FOUND: returning "${rowValue}"`);
                                    log('=== fetchBonusAmount END (success) ===\n');
                                    callback(rowValue); 
                                    return; 
                                }
                            }
                            log('❌ NO MATCH: searchText not found in any row');
                        } else {
                            log('❌ API returned empty or invalid data');
                        }
                    } catch (e) {
                        error('API parse error:', e);
                    }
                } else {
                    error('API error response:', res.responseText);
                }
                log('=== fetchBonusAmount END (null) ===\n');
                callback(null);
            },
            onerror: (err) => { 
                error('API request error:', err); 
                log('=== fetchBonusAmount END (error) ===\n');
                callback(null); 
            }, 
            ontimeout: () => { 
                error('API timeout'); 
                log('=== fetchBonusAmount END (timeout) ===\n');
                callback(null); 
            }
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

        const btn = document.createElement('button');
        btn.textContent = 'Узнать';
        btn.className = `${UNIQUE_PREFIX}bonus-btn`;
        btn.addEventListener('click', () => {
            log('\n=== BUTTON CLICKED ===');
            btn.disabled = true;
            btn.textContent = '';
            const loading = document.createElement('span');
            loading.textContent = 'Загрузка';
            loading.className = `${UNIQUE_PREFIX}loading`;
            btn.appendChild(loading);

            setTimeout(() => {
                log('Button: calling getClientData()...');
                const summary = getClientData();
                log('Button: getClientData returned:', summary);
                
                if (summary?.text) {
                    log(`Button: fetching bonuses for searchText="${summary.text}"`);
                    fetchBonusAmount(summary.text, (amount) => {
                        log(`Button: callback received amount:`, amount);
                        if (amount !== null && amount !== undefined) {
                            log('Button: SUCCESS, updating cell');
                            cell.textContent = `Доступно бонусов: ${amount}`;
                            cell.style.color = 'green';
                        } else {
                            log('Button: FAILED (amount is null/undefined), showing error');
                            cell.innerHTML = `<span class="${UNIQUE_PREFIX}error-text">Бонусов нет</span>`;
                        }
                    });
                } else {
                    log('Button: FAILED (summary.text is null/undefined)');
                    cell.innerHTML = `<span class="${UNIQUE_PREFIX}error-text">Ошибка: нет данных</span>`;
                }
            }, 800);
        });

        cell.appendChild(btn);
        row.appendChild(cell);
        return row;
    }

    function addBonusRowIfNeeded() {
        const table = document.querySelector(CONFIG.selectors.bonusTable);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        if (tbody.querySelector(`.${UNIQUE_PREFIX}bonus-row`) || tbody.querySelector('.bonus-row')) return;
        tbody.appendChild(createBonusRow());
        log('Bonus row added to table');
    }

    function hideUnwantedRows() {
        const table = document.querySelector(CONFIG.selectors.bonusTable);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(row => {
            if (row.classList.contains(`${UNIQUE_PREFIX}bonus-row`) || row.classList.contains('bonus-row')) return;
            const text = row.textContent || row.innerText || '';
            if (!text.includes('Корректировка суммы') && !text.includes('Юр. лицо') && !text.includes('Доступно бонусов')) {
                row.style.display = 'none';
            }
        });
    }

    function fetchSpentData(callback) {
        const { sheetId, sheetName } = CONFIG.spent;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    spentData = parseCSV(res.responseText);
                    log(`Spent data loaded: ${spentData.length} rows`);
                    if (callback) callback();
                    if (currentProductId) processSpent(currentProductId);
                }
            },
            onerror: () => error('Spent fetch error'), 
            ontimeout: () => error('Spent fetch timeout')
        });
    }

    function getSpentBonuses(productId) {
        if (!productId || !spentData.length) return null;
        const pid = productId.toString().trim();
        log(`getSpentBonuses: searching for productId="${pid}" in ${spentData.length} rows`);
        for (let i = 0; i < spentData.length; i++) {
            const productCell = spentData[i][0];
            const bonusCell = spentData[i][4];
            if (productCell?.toString().trim() === pid) {
                log(`getSpentBonuses: ✅ FOUND, returning "${bonusCell}"`);
                return bonusCell;
            }
        }
        log('getSpentBonuses: ❌ NOT FOUND');
        return null;
    }

    function processSpent(productId) {
        log(`\n=== processSpent called for productId="${productId}" ===`);
        if (!spentData.length) { log('processSpent: spentData not loaded yet'); return; }
        
        const bonuses = getSpentBonuses(productId);
        if (!bonuses) { log('processSpent: no bonuses found, exiting'); return; }
        log(`processSpent: bonuses value="${bonuses}"`);

        const flagKey = `spent_processed_${productId}`;
        if (processedSpentFlags.has(flagKey)) { log('processSpent: already processed, skipping'); return; }

        const clientData = getClientData();
        if (!clientData) { log('processSpent: clientData is null, exiting'); return; }
        const originalClientText = clientData.text;
        log(`processSpent: originalClientText="${originalClientText}"`);

        // ─── ВАРИАНТ 1: Chosen Dropdown ───
        const chosenLink = document.querySelector(CONFIG.selectors.chosenLink);
        if (chosenLink) {
            log('processSpent: using Chosen variant');
            processedSpentFlags.add(flagKey);
            chosenLink.style.display = 'none';

            const newEl = document.createElement('span');
            newEl.classList.add('myelem');
            newEl.style.pointerEvents = 'none';
            newEl.style.userSelect = 'none';
            newEl.style.opacity = '0.5';
            newEl.dataset.originalClient = originalClientText;
            newEl.innerHTML = `${originalClientText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;

            if (chosenLink.parentNode) {
                chosenLink.parentNode.insertBefore(newEl, chosenLink);
                log('processSpent: element inserted');
            }
            return;
        }

        // ─── ВАРИАНТ 2: Простой <td> ───
        const targetCell = document.querySelector(CONFIG.selectors.summaryCell);
        if (targetCell && !targetCell.querySelector(`.${UNIQUE_PREFIX}myelem`)) {
            log('processSpent: using td variant');
            processedSpentFlags.add(flagKey);
            
            targetCell.innerHTML = '';
            targetCell.style.pointerEvents = 'none';

            const newEl = document.createElement('span');
            newEl.classList.add('myelem');
            newEl.style.pointerEvents = 'none';
            newEl.style.userSelect = 'none';
            newEl.style.opacity = '0.5';
            newEl.dataset.originalClient = originalClientText;
            newEl.innerHTML = `${originalClientText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;
            
            targetCell.appendChild(newEl);
            log('processSpent: element inserted into td');
            return;
        }

        // ─── ВАРИАНТ 3: <tr> с "Заказчик:" ───
        const summaryTable = document.querySelector('#Summary > table');
        if (summaryTable) {
            const rows = summaryTable.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                for (let i = 0; i < cells.length - 1; i++) {
                    if (cells[i].textContent.trim() === 'Заказчик:') {
                        log('processSpent: using tr variant');
                        const customerCell = cells[i + 1];
                        const customerText = customerCell.textContent.trim();
                        if (!customerText) continue;

                        processedSpentFlags.add(flagKey);
                        customerCell.innerHTML = '';
                        
                        const newEl = document.createElement('span');
                        newEl.classList.add('myelem');
                        newEl.style.pointerEvents = 'none';
                        newEl.style.userSelect = 'none';
                        newEl.style.opacity = '0.5';
                        newEl.dataset.originalClient = customerText;
                        newEl.innerHTML = `${customerText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;
                        
                        customerCell.appendChild(newEl);
                        row.style.pointerEvents = 'none';
                        log('processSpent: element inserted into tr');
                        return;
                    }
                }
            }
        }
        log('processSpent: no matching structure found');
    }

    function onProductIdAppear() {
        const el = document.querySelector(CONFIG.selectors.productId);
        if (!el) return;
        const pid = el.textContent.trim();
        if (!pid || pid === currentProductId) return;

        log(`\n=== onProductIdAppear: new pid="${pid}" ===`);
        currentProductId = pid;
        processedSpentFlags.clear();

        processFinder(pid);
        if (hasPageKeyword()) {
            hideUnwantedRows();
            addBonusRowIfNeeded();
        }
        processSpent(pid);
    }

    function setupObservers() {
        productIdObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes.length || m.type === 'characterData') {
                    onProductIdAppear();
                    break;
                }
            }
        });
        const pidEl = document.querySelector(CONFIG.selectors.productId);
        if (pidEl) {
            productIdObserver.observe(pidEl, { childList: true, subtree: true, characterData: true });
        }

        domObserver = new MutationObserver(() => {
            if (document.querySelector(CONFIG.selectors.productId)) {
                onProductIdAppear();
            }
            if (hasPageKeyword()) {
                hideUnwantedRows();
                addBonusRowIfNeeded();
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        onProductIdAppear();
    }

    function init() {
        if (active) return;
        log('INIT called');
        active = true;
        injectStyles();
        fetchFinderData();
        fetchSpentData();
        setupObservers();
    }

    function cleanup() {
        if (!active) return;
        log('CLEANUP called');
        active = false;

        if (productIdObserver) { productIdObserver.disconnect(); productIdObserver = null; }
        if (domObserver) { domObserver.disconnect(); domObserver = null; }

        processedProductIds.clear();
        processedSpentFlags.clear();
        currentProductId = null;
        finderData = [];
        spentData = [];

        document.querySelectorAll(`.${UNIQUE_PREFIX}bonus-row, .bonus-row`).forEach(el => el.remove());
        document.querySelectorAll(`.${UNIQUE_PREFIX}myelem, .myelem`).forEach(el => el.remove());
        
        document.querySelectorAll(CONFIG.selectors.chosenLink).forEach(el => {
            if (el.style.display === 'none') el.style.display = '';
        });
    }

    function toggle() { active ? cleanup() : init(); }
    function isActive() { return active; }
    function refresh() {
        log('REFRESH called');
        fetchFinderData();
        fetchSpentData();
        if (currentProductId) onProductIdAppear();
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
        getCurrentProductId: () => currentProductId,
    };

})(config, GM, utils, api);