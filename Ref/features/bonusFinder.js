// 9bonusFinder.js — модуль работы с бонусами клиента
// Версия 3: Исправлена проблема с отображением списка клиентов Chosen

(function(config, GM, utils, api) {
    'use strict';

    // 🔧 Конфигурация
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
            summaryRow: '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2)',
            // Важный селектор: контейнер клиента
            clientCell: '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)',
        },
        pageKeywords: ['Номенклатура', 'Номенклатура по умолчанию'],
        uniquePrefix: 'bonus-finder-',
    };

    const UNIQUE_PREFIX = CONFIG.uniquePrefix;

    // 🔐 Внутреннее состояние
    let active = false;
    let finderData = [];
    let spentData = [];
    let processedProductIds = new Set();
    let processedSpentFlags = new Set();
    let currentProductId = null;

    let domObserver = null;
    let productIdObserver = null;

    // ─────────────────────────────────────────────
    // 🎨 Стили
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            @keyframes ${UNIQUE_PREFIX}dots {
                0% { content: "..."; } 33% { content: "."; } 66% { content: ".."; }
            }
            .${UNIQUE_PREFIX}loading::after {
                content: "..."; animation: ${UNIQUE_PREFIX}dots 1s infinite;
            }
            .${UNIQUE_PREFIX}bonus-btn {
                margin-left: 10px !important; padding: 5px 10px !important;
                border: none !important; background-color: #4CAF50 !important;
                color: white !important; cursor: pointer !important; border-radius: 5px !important;
                font-size: 12px !important;
            }
            .${UNIQUE_PREFIX}bonus-btn:disabled { background-color: #ccc !important; cursor: not-allowed !important; }
            .${UNIQUE_PREFIX}myelem, .myelem {
                pointer-events: none !important; user-select: none !important;
                opacity: 0.5 !important; font-weight: 500 !important;
            }
            .${UNIQUE_PREFIX}bonus-value { color: #28a745 !important; font-weight: bold !important; }
            .${UNIQUE_PREFIX}error-text { color: #dc3545 !important; font-weight: 500 !important; }
            tr.${UNIQUE_PREFIX}bonus-row, tr.bonus-row { display: table-row !important; visibility: visible !important; opacity: 1 !important; }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔧 Утилиты
    // ─────────────────────────────────────────────
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

    function getSummaryData() {
        const { summarySpan, summaryRow } = CONFIG.selectors;
        let el = document.querySelector(summarySpan);
        if (el) return { text: el.textContent.trim(), element: el };
        el = document.querySelector(summaryRow);
        if (el) {
            const span = el.querySelector('div > a > span');
            return { text: span ? span.textContent.trim() : el.textContent.trim(), element: el };
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // 📊 FINDER
    // ─────────────────────────────────────────────
    function fetchFinderData(callback) {
        const { sheetId, sheetName } = CONFIG.finder;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    finderData = parseCSV(res.responseText);
                    if (callback) callback();
                    if (currentProductId) processFinder(currentProductId);
                }
            },
            onerror: () => {}, ontimeout: () => {}
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
                el.textContent = el.textContent + ' ️';
            }
            processedProductIds.add(productId);
        }
    }

    // ────────────────────────────────────────────
    //  BONUS
    // ─────────────────────────────────────────────
    function fetchBonusAmount(searchText, callback) {
        const { sheetId, sheetName, apiKey } = CONFIG.bonus;
        if (!apiKey) { callback(null); return; }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:B?key=${apiKey}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data?.values?.length > 1) {
                            for (let i = 1; i < data.values.length; i++) {
                                if (data.values[i][0] === searchText) { callback(data.values[i][1]); return; }
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

        const btn = document.createElement('button');
        btn.textContent = 'Узнать';
        btn.className = `${UNIQUE_PREFIX}bonus-btn`;
        btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.textContent = '';
            const loading = document.createElement('span');
            loading.textContent = 'Загрузка';
            loading.className = `${UNIQUE_PREFIX}loading`;
            btn.appendChild(loading);

            setTimeout(() => {
                const summary = getSummaryData();
                if (summary?.text) {
                    fetchBonusAmount(summary.text, (amount) => {
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

    // ─────────────────────────────────────────────
    // 💸 SPENT: ИСПРАВЛЕННАЯ ЛОГИКА
    // ─────────────────────────────────────────────
    function fetchSpentData(callback) {
        const { sheetId, sheetName } = CONFIG.spent;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        GM.xmlhttpRequest({
            method: 'GET', url, timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    spentData = parseCSV(res.responseText);
                    if (callback) callback();
                    if (currentProductId) processSpent(currentProductId);
                }
            },
            onerror: () => {}, ontimeout: () => {}
        });
    }

    function getSpentBonuses(productId) {
        if (!productId || !spentData.length) return null;
        const pid = productId.toString().trim();
        for (const row of spentData) {
            if (row[0]?.toString().trim() === pid) return row[4];
        }
        return null;
    }

    function processSpent(productId) {
        if (!spentData.length) return;
        const bonuses = getSpentBonuses(productId);
        if (!bonuses) return;

        const summary = getSummaryData();
        const fallbackText = summary?.text || 'Клиент';

        // 🔒 Флаг защиты от повторной обработки
        const flagKey = `spent_processed_${productId}`;
        if (processedSpentFlags.has(flagKey)) return;

        // ─── ВАРИАНТ 1: Chosen Dropdown (div > a) ───
        // Ищем строго ссылку внутри div. Это предотвращает захват списка <ul>
        const chosenLink = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a');
        
        if (chosenLink) {
            processedSpentFlags.add(flagKey);
            chosenLink.style.display = 'none'; // Скрываем только ссылку, список <ul> не трогаем

            const newEl = document.createElement('span');
            newEl.classList.add('myelem');
            newEl.style.pointerEvents = 'none';
            newEl.style.userSelect = 'none';
            newEl.style.opacity = '0.5';
            newEl.innerHTML = `${fallbackText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;

            // Вставляем ПЕРЕД скрытой ссылкой внутри того же div
            if (chosenLink.parentNode) {
                chosenLink.parentNode.insertBefore(newEl, chosenLink);
            }
            return;
        }

        // ─── ВАРИАНТ 2: Простой <td> с текстом ───
        // Если ссылки нет, ищем саму ячейку
        const targetCellSelector = '#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';
        const targetCell = document.querySelector(targetCellSelector);

        if (targetCell && !targetCell.querySelector(`.${UNIQUE_PREFIX}myelem`)) {
            processedSpentFlags.add(flagKey);
            const originalText = targetCell.textContent.trim() || fallbackText;
            
            targetCell.innerHTML = ''; // Очищаем ячейку полностью
            targetCell.style.pointerEvents = 'none';

            const newEl = document.createElement('span');
            newEl.classList.add('myelem');
            newEl.style.pointerEvents = 'none';
            newEl.style.userSelect = 'none';
            newEl.style.opacity = '0.5';
            newEl.innerHTML = `${originalText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;
            
            targetCell.appendChild(newEl);
            return;
        }

        // ─── ВАРИАНТ 3: <tr> с лейблом "Заказчик:" (Fallback) ───
        // Ограничиваем поиск только таблицей Summary
        const summaryTable = document.querySelector('#Summary > table');
        if (summaryTable) {
            const rows = summaryTable.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                for (let i = 0; i < cells.length - 1; i++) {
                    if (cells[i].textContent.trim() === 'Заказчик:') {
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
                        newEl.innerHTML = `${customerText} (Было списано <span class="${UNIQUE_PREFIX}bonus-value">${bonuses}</span> бонусов)`;
                        
                        customerCell.appendChild(newEl);
                        row.style.pointerEvents = 'none';
                        return;
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔄 Обработчик появления #ProductId
    // ─────────────────────────────────────────────
    function onProductIdAppear() {
        const el = document.querySelector(CONFIG.selectors.productId);
        if (!el) return;
        const pid = el.textContent.trim();
        if (!pid || pid === currentProductId) return;

        currentProductId = pid;
        processedSpentFlags.clear(); // Сброс флагов для нового заказа

        // 1. Finder
        processFinder(pid);

        // 2. Bonus row
        if (hasPageKeyword()) {
            hideUnwantedRows();
            addBonusRowIfNeeded();
        }

        // 3. Spent bonuses
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

    // ─────────────────────────────────────────────
    // 🚀 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        injectStyles();
        fetchFinderData();
        fetchSpentData();
        setupObservers();
    }

    function cleanup() {
        if (!active) return;
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
        
        // Восстановление Chosen
        document.querySelectorAll('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a').forEach(el => {
            if (el.style.display === 'none') el.style.display = '';
        });
    }

    function toggle() { active ? cleanup() : init(); }
    function isActive() { return active; }

    function refresh() {
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