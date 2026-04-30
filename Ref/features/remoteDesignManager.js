// remoteDesignManager.js — модуль управления удалённым дизайном
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'rdm-';
    
    // 🔥 Google API настройки (можно переопределить в конфиге)
    const API_KEY = config?.apiKey || 'AIzaSyD-gPXmq0YOL3WXjQ8jub9g5_xyx2PfOZU';
    const SPREADSHEET_ID = config?.spreadsheetId || '1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY';
    const LIST_SHEET_NAME = config?.listSheetName || 'List';
    const DESIGN_SHEET_NAME = config?.designSheetName || 'Design';
    const TEST_SHEET_NAME = config?.testSheetName || 'test';
    const SCRIPT_URL = config?.scriptUrl || 'https://script.google.com/macros/s/AKfycbyH_R0_8JIlAq3TW8Fq_hmN6dSJ2c-u7F9lnwTMm8jOzHNnXBw7DjX4uUMRRTNlzxDw/exec';
    
    // 🔥 Селекторы (можно переопределить в конфиге)
    const SELECTORS = {
        productId: config?.selectors?.productId || '#ProductId',
        userName: config?.selectors?.userName || 'body > ul > div > li:nth-child(1) > a.topmenu-a',
        productName: config?.selectors?.productName || '#Top > form > div > div > div > input.ProductName.form-control',
        designList: config?.selectors?.designList || '#DesignList',
        designIdChosen: config?.selectors?.designIdChosen || '#DesignId_chosen > div > ul',
        designBlockSummary: config?.selectors?.designBlockSummary || '#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea',
        designPrice: config?.selectors?.designPrice || '#DesignList > tr > td.right nobr',
        designerLabel: config?.selectors?.designerLabel || '#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b',
        launchDate: config?.selectors?.launchDate || '#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold',
        axiomPrice: config?.selectors?.axiomPrice || '#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1)',
        loader: config?.selectors?.loader || '#Doc'
    };
    
    // 🔥 Пороги и коэффициенты
    const PRICING = {
        minPriceToShowButton: config?.pricing?.minPriceToShowButton || 101,
        designerMarkup: config?.pricing?.designerMarkup || 1.75,
        maxDesignerRatio: config?.pricing?.maxDesignerRatio || 1.80
    };
    
    // 🔥 Тексты для поиска
    const TEXTS = {
        remoteDesign: config?.texts?.remoteDesign || 'Дизайнеры на удаленке (вписываем в таблицу СРАЗУ!)',
        designerRegina: config?.texts?.designerRegina || 'Дизайн Регина',
        designerReseda: config?.texts?.designerReseda || 'Дизайн Резеда'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observers = [];
    let buttonAdded = false;
    let dropdownInterval = null;

    // ─────────────────────────────────────────────
    // 🔥 СТИЛИ модуля
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            .${UNIQUE_PREFIX}loading { position: relative; display: inline-block; }
            .${UNIQUE_PREFIX}loading::after {
                content: ''; display: inline-block; animation: ${UNIQUE_PREFIX}dots 2s infinite;
                margin-left: 4px; vertical-align: middle;
            }
            @keyframes ${UNIQUE_PREFIX}dots { 0% { content: '.'; } 33% { content: '..'; } 66% { content: '...'; } 100% { content: ''; } }
            
            .${UNIQUE_PREFIX}locked {
                background-color: #f8f9fa !important;
                opacity: 0.65;
                cursor: not-allowed !important;
                position: relative;
            }
            .${UNIQUE_PREFIX}locked input, 
            .${UNIQUE_PREFIX}locked select, 
            .${UNIQUE_PREFIX}locked button, 
            .${UNIQUE_PREFIX}locked textarea, 
            .${UNIQUE_PREFIX}locked a {
                pointer-events: none !important;
                user-select: none !important;
                opacity: 0.6 !important;
            }
            .${UNIQUE_PREFIX}popup {
                position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;
                padding: 20px !important; background-color: #fff !important; border: 1px solid #ccc !important;
                border-radius: 8px !important; box-shadow: 0 5px 15px rgba(0,0,0,0.25) !important;
                z-index: 999999 !important; min-width: 320px !important; font-family: system-ui, sans-serif !important;
            }
            .${UNIQUE_PREFIX}error {
                color: #d32f2f !important; background: #ffebee !important; padding: 8px !important;
                border-radius: 4px !important; margin: 10px 0 !important; font-size: 13px !important;
                font-weight: bold !important; text-align: center !important;
            }
            .${UNIQUE_PREFIX}success {
                color: #2e7d32 !important; background: #e8f5e9 !important; padding: 8px !important;
                border-radius: 4px !important; margin: 10px 0 !important; text-align: center !important; font-weight: bold !important;
            }
            .${UNIQUE_PREFIX}info-box {
                color: #2e7d32 !important; margin-top: 10px !important; border: 1px solid #a5d6a7 !important;
                padding: 10px !important; border-radius: 5px !important; background: #f1f8e4 !important;
                font-size: 13px !important;
            }
            .${UNIQUE_PREFIX}info-table { width: 100% !important; border-collapse: collapse !important; }
            .${UNIQUE_PREFIX}info-table td { padding: 3px 0 !important; }
            .${UNIQUE_PREFIX}info-table td:first-child { font-weight: bold !important; }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Вспомогательные функции
    // ─────────────────────────────────────────────
    function getEl(selector) {
        return document.querySelector(selector);
    }

    function parseNumeric(text) {
        if (!text) return null;
        const num = parseFloat(text.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        return isNaN(num) ? null : num;
    }

    function getProductId() {
        const el = getEl(SELECTORS.productId);
        if (el) {
            const numeric = el.textContent.trim().replace(/[^0-9]/g, '');
            if (numeric) return numeric;
        }
        return null;
    }

    function getUserName() {
        const el = getEl(SELECTORS.userName);
        return el ? el.textContent.trim() : null;
    }

    function getProductName() {
        const el = getEl(SELECTORS.productName);
        return el ? el.value.trim() : null;
    }

    function getLaunchDate() {
        const el = getEl(SELECTORS.launchDate);
        if (el?.textContent.trim()) {
            return el.textContent.trim()
                .replace(/,/g, '')
                .replace(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье/g, '')
                .trim();
        }
        return null;
    }

    function getAxiomPrice() {
        const el = getEl(SELECTORS.axiomPrice);
        if (el) {
            const match = el.textContent.replace(/\s/g, '').match(/(\d+,\d+)/);
            if (match) return parseFloat(match[0].replace(',', '.'));
        }
        return null;
    }

    function isLoading() {
        const loader = getEl(SELECTORS.loader);
        return loader?.classList.contains('LoadingContent');
    }

    // ─────────────────────────────────────────────
    // 🔥 Работа с Google Sheets
    // ─────────────────────────────────────────────
    async function fetchGoogleSheetData(range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            return data.values || [];
        } catch (e) {
            return [];
        }
    }

    async function checkProductInSheet(productId, sheetName = DESIGN_SHEET_NAME) {
        const values = await fetchGoogleSheetData(`${sheetName}!A:A`);
        return values.some(row => row[0] === productId.toString());
    }

    async function writeDataToSheet(data) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Логика dropdown
    // ─────────────────────────────────────────────
    function shouldRemoveRemoteOption() {
        const cell = document.querySelector('#DesignList > tr > td:nth-child(1)');
        if (!cell) return false;
        return cell.textContent.trim() === TEXTS.remoteDesign;
    }

    function removeRemoteDesignOptionFromDropdown() {
        if (!shouldRemoveRemoteOption()) return;
        const ul = getEl(SELECTORS.designIdChosen);
        if (!ul) return;
        ul.querySelectorAll('li').forEach(li => {
            const txt = li.textContent?.trim();
            if (txt && txt.includes(TEXTS.remoteDesign)) {
                li.remove();
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Блокировка строки "Удалённый дизайн"
    // ─────────────────────────────────────────────
    function checkAndBlockRemoteDesignRow() {
        const container = getEl(SELECTORS.designList);
        if (!container) return;

        const rows = container.querySelectorAll('tr');
        let remoteRow = null;
        let hasOtherPositions = false;

        rows.forEach(row => {
            const cell = row.querySelector('td:nth-child(1)');
            if (!cell) return;
            const text = cell.textContent.trim();
            if (text === TEXTS.remoteDesign) {
                remoteRow = row;
            } else if (text && !text.startsWith('Дизайнеры на удаленке')) {
                hasOtherPositions = true;
            }
        });

        if (remoteRow) {
            if (hasOtherPositions) blockRemoteRow(remoteRow);
            else unblockRemoteRow(remoteRow);
        }
    }

    function blockRemoteRow(row) {
        if (row.classList.contains(`${UNIQUE_PREFIX}locked`)) return;
        row.classList.add(`${UNIQUE_PREFIX}locked`);
    }

    function unblockRemoteRow(row) {
        if (!row.classList.contains(`${UNIQUE_PREFIX}locked`)) return;
        row.classList.remove(`${UNIQUE_PREFIX}locked`);
    }

    // ─────────────────────────────────────────────
    // 🔥 Попап для ввода данных
    // ─────────────────────────────────────────────
    function showPopup() {
        const old = document.querySelector(`.${UNIQUE_PREFIX}popup`);
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.className = `${UNIQUE_PREFIX}popup`;

        const createEl = (tag, styles, parent) => {
            const el = document.createElement(tag);
            if (styles) Object.assign(el.style, styles);
            if (parent) parent.appendChild(el);
            return el;
        };

        createEl('label', { display:'block', marginBottom:'5px', fontWeight:'bold' }, popup).innerText = 'Сумма дизайнеру:';
        const priceInput = createEl('input', { width:'100%', padding:'8px', margin:'10px 0', border:'1px solid #ccc', borderRadius:'4px', boxSizing:'border-box' }, popup);
        priceInput.placeholder = 'Сколько платим дизайнеру?';
        priceInput.addEventListener('input', () => {
            const err = popup.querySelector(`.${UNIQUE_PREFIX}error`);
            if (err) err.remove();
        });

        createEl('label', { display:'block', marginBottom:'5px', fontWeight:'bold' }, popup).innerText = 'Дизайнер:';
        const dropdown = createEl('select', { width:'100%', padding:'8px', marginBottom:'15px', border:'1px solid #ccc', borderRadius:'4px', boxSizing:'border-box' }, popup);

        fetchGoogleSheetData(`${LIST_SHEET_NAME}!A:A`).then(cats => {
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = opt.text = c[0];
                dropdown.appendChild(opt);
            });
        });

        const sendBtn = createEl('button', { width:'100%', padding:'10px', backgroundColor:'#4CAF50', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'14px', fontWeight:'bold', marginBottom:'10px' }, popup);
        sendBtn.innerText = 'Отправить';

        sendBtn.addEventListener('click', async () => {
            if (sendBtn.disabled) return;
            sendBtn.disabled = true;
            sendBtn.style.backgroundColor = '#45a049';

            try {
                const productId = getProductId();
                const userName = getUserName();
                const productName = getProductName();
                const designerPrice = parseFloat(priceInput.value.replace(',', '.'));
                const category = dropdown.value;
                const axiomPrice = getAxiomPrice();
                const launchDate = getLaunchDate();

                if (!launchDate) {
                    if (!popup.querySelector(`.${UNIQUE_PREFIX}error`)) {
                        const err = createEl('div', {}, popup);
                        err.className = `${UNIQUE_PREFIX}error`;
                        err.innerText = 'Отправка данных только по запущенным заказам.';
                    }
                    sendBtn.disabled = false; sendBtn.style.backgroundColor = '#4CAF50';
                    return;
                }

                if (axiomPrice && designerPrice * PRICING.designerMarkup <= axiomPrice) {
                    const success = await writeDataToSheet([productId, userName, productName, designerPrice, category, axiomPrice, launchDate]);
                    if (success) {
                        const msg = createEl('div', {}, popup);
                        msg.className = `${UNIQUE_PREFIX}success`;
                        msg.innerText = 'Данные успешно загружены!';
                        
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: '✅ Данные успешно загружены!', buttonText: 'ОК', duration: 2000 });
                        }
                        
                        setTimeout(() => popup.remove(), 2500);
                        
                        const ta = getEl(SELECTORS.designBlockSummary);
                        if (ta) {
                            ta.parentElement.querySelectorAll('button').forEach(b => b.remove());
                            createCheckButton(ta);
                        }
                    } else {
                        sendBtn.disabled = false; sendBtn.style.backgroundColor = '#4CAF50';
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: '❌ Ошибка при отправке данных', buttonText: 'ОК', duration: 3000 });
                        }
                    }
                } else {
                    if (!popup.querySelector(`.${UNIQUE_PREFIX}error`)) {
                        const maxVal = axiomPrice ? Math.round(axiomPrice / PRICING.maxDesignerRatio) : 0;
                        const err = createEl('div', {}, popup);
                        err.className = `${UNIQUE_PREFIX}error`;
                        err.innerText = `Сумма дизайнеру не более ${maxVal} ₽`;
                    }
                    sendBtn.disabled = false; sendBtn.style.backgroundColor = '#4CAF50';
                }
            } catch (e) {
                sendBtn.disabled = false; sendBtn.style.backgroundColor = '#4CAF50';
                if (api?.showCenterMessage) {
                    api.showCenterMessage({ message: '❌ Ошибка при отправке данных', buttonText: 'ОК', duration: 3000 });
                }
            }
        });

        const closeBtn = createEl('button', {
            width:'100%', padding:'10px', backgroundColor:'#f44336', color:'#fff',
            border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'14px', fontWeight:'bold'
        }, popup);
        closeBtn.innerText = 'Закрыть';
        closeBtn.addEventListener('click', () => popup.remove());

        document.body.appendChild(popup);
        priceInput.focus();
    }

    // ─────────────────────────────────────────────
    // 🔥 Кнопки интерфейса
    // ─────────────────────────────────────────────
    function createRemoteDesignButton(textarea) {
        const btn = document.createElement('button');
        btn.innerText = 'Удалённый дизайн';
        btn.style.marginRight = '5px';
        textarea.parentElement.appendChild(btn);

        btn.addEventListener('click', async () => {
            const productId = getProductId();
            if (!productId) {
                if (api?.showCenterMessage) {
                    api.showCenterMessage({ message: '⚠️ Product ID не найден', buttonText: 'ОК', duration: 2000 });
                }
                return;
            }

            btn.classList.add(`${UNIQUE_PREFIX}loading`);
            btn.disabled = true;

            setTimeout(async () => {
                try {
                    const exists = await checkProductInSheet(productId);
                    textarea.parentElement.querySelectorAll('button:not(:first-child)').forEach(b => b.remove());
                    if (exists) createCheckButton(textarea);
                    else createFillButton(textarea);
                } catch (e) {
                    if (api?.showCenterMessage) {
                        api.showCenterMessage({ message: '❌ Ошибка при проверке данных', buttonText: 'ОК', duration: 3000 });
                    }
                } finally {
                    btn.classList.remove(`${UNIQUE_PREFIX}loading`);
                    btn.disabled = false;
                }
            }, 1500);
        });
    }

    function createCheckButton(textarea) {
        const btn = document.createElement('button');
        btn.innerText = 'Проверить данные';
        btn.style.marginRight = '5px';
        textarea.parentElement.appendChild(btn);
        let infoShown = false;

        btn.addEventListener('click', async () => {
            if (infoShown) return;
            const productId = getProductId();
            const [designVals, testVals] = await Promise.all([
                fetchGoogleSheetData(`${DESIGN_SHEET_NAME}!A:E`),
                fetchGoogleSheetData(`${TEST_SHEET_NAME}!A:H`)
            ]);
            const designData = designVals.find(r => r[0] === productId.toString());
            const testData = testVals.find(r => r[0] === productId.toString());

            if (designData && testData) {
                const info = document.createElement('div');
                info.className = `${UNIQUE_PREFIX}info-box`;
                const tbl = document.createElement('table');
                tbl.className = `${UNIQUE_PREFIX}info-table`;
                const addRow = (lbl, val) => {
                    const r = tbl.insertRow();
                    const l = r.insertCell(); l.style.fontWeight='bold'; l.style.padding='3px 0'; l.innerText=lbl;
                    const v = r.insertCell(); v.style.padding='3px 0'; v.innerText=val;
                };
                addRow('Оплата дизайнеру:', `${designData[3]} ₽`);
                addRow('Дизайнер:', designData[4]);
                addRow('Статус оплаты:', testData[7] || 'Не оплачено');
                info.appendChild(tbl);
                btn.parentElement.appendChild(info);
                infoShown = true;
            } else {
                const err = document.createElement('span');
                err.style.cssText = 'color:#d32f2f;margin-left:10px;font-size:13px';
                err.innerText = 'Информация не найдена';
                btn.parentElement.appendChild(err);
            }
        });
    }

    function createFillButton(textarea) {
        const btn = document.createElement('button');
        btn.innerText = 'Заполнить';
        btn.style.marginRight = '5px';
        textarea.parentElement.appendChild(btn);
        btn.addEventListener('click', showPopup);
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка низкой стоимости
    // ─────────────────────────────────────────────
    function checkLowCost() {
        const cell = document.querySelector('#DesignList > tr > td:nth-child(1)');
        if (!cell) return;
        const text = cell.textContent.trim();
        if ([TEXTS.remoteDesign, TEXTS.designerRegina, TEXTS.designerReseda].includes(text)) {
            const priceEl = getEl(SELECTORS.designPrice);
            if (priceEl) {
                const price = parseNumeric(priceEl.textContent);
                const btn = document.querySelector('#DesignBlockSummary > div > button');
                if (btn) btn.style.display = price < PRICING.minPriceToShowButton ? 'none' : '';
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдатели DOM
    // ─────────────────────────────────────────────
    function setupMainObserver() {
        const observer = new MutationObserver(() => {
            const textarea = getEl(SELECTORS.designBlockSummary);
            const designerEl = getEl(SELECTORS.designerLabel);

            if (isLoading()) {
                buttonAdded = false;
                return;
            }

            checkLowCost();
            removeRemoteDesignOptionFromDropdown();
            checkAndBlockRemoteDesignRow();

            if (designerEl?.textContent.includes('Дизайнеры на удаленке') && textarea && !buttonAdded) {
                createRemoteDesignButton(textarea);
                buttonAdded = true;
            } else if (!designerEl || !textarea) {
                buttonAdded = false;
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        observers.push(observer);
    }

    function setupDropdownObserver() {
        dropdownInterval = setInterval(() => {
            const ul = getEl(SELECTORS.designIdChosen);
            if (ul) {
                if (shouldRemoveRemoteOption()) removeRemoteDesignOptionFromDropdown();
                const mo = new MutationObserver(() => {
                    if (shouldRemoveRemoteOption()) removeRemoteDesignOptionFromDropdown();
                });
                mo.observe(ul, { childList: true, subtree: true });
                observers.push(mo);
                clearInterval(dropdownInterval);
                dropdownInterval = null;
            }
        }, 500);
        
        setTimeout(() => {
            if (dropdownInterval) {
                clearInterval(dropdownInterval);
                dropdownInterval = null;
            }
        }, 15000);
    }

    function setupDesignListObserver() {
        const target = getEl(SELECTORS.designList);
        if (!target) return;
        const observer = new MutationObserver(() => setTimeout(checkAndBlockRemoteDesignRow, 50));
        observer.observe(target, { childList: true, subtree: true, attributes: true });
        observers.push(observer);
        setTimeout(checkAndBlockRemoteDesignRow, 300);
    }

    function setupClickHandler() {
        const handler = (e) => {
            if (e.target.closest(SELECTORS.designIdChosen.replace(' > div > ul', ''))) {
                setTimeout(() => {
                    if (shouldRemoveRemoteOption()) removeRemoteDesignOptionFromDropdown();
                }, 100);
            }
        };
        document.addEventListener('click', handler);
        return handler;
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    let clickHandler = null;
    
    function init() {
        if (active) return;
        active = true;
        
        injectStyles();
        setupMainObserver();
        setupDropdownObserver();
        setupDesignListObserver();
        clickHandler = setupClickHandler();
        
        setTimeout(() => {
            if (shouldRemoveRemoteOption()) removeRemoteDesignOptionFromDropdown();
            checkAndBlockRemoteDesignRow();
        }, 1000);
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем все observers
        observers.forEach(obs => obs.disconnect());
        observers = [];
        
        // Очищаем интервал
        if (dropdownInterval) {
            clearInterval(dropdownInterval);
            dropdownInterval = null;
        }
        
        // Удаляем обработчик клика
        if (clickHandler) {
            document.removeEventListener('click', clickHandler);
            clickHandler = null;
        }
        
        // Удаляем попапы и стили
        document.querySelectorAll(`.${UNIQUE_PREFIX}popup`).forEach(el => el.remove());
        buttonAdded = false;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        checkLowCost();
        removeRemoteDesignOptionFromDropdown();
        checkAndBlockRemoteDesignRow();
    }

    function forceShowPopup() {
        showPopup();
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
        forceShowPopup,
        // Для отладки/расширения
        checkProductInSheet,
        writeDataToSheet
    };

})(config, GM, utils, api);