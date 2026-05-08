// 7remoteDesignManager.js — модуль управления удалённым дизайном

(function(config, GM, utils, api) {
    'use strict';

    const UNIQUE_PREFIX = config?.uniquePrefix || 'rdm-';
    const API_KEY = config?.apiKey || 'AIzaSyALpfvbkX3xaWS70uInPbtfl-m8EBxNBN8';
    const SPREADSHEET_ID = config?.spreadsheetId || '1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY';
    const LIST_SHEET_NAME = config?.listSheetName || 'List';
    const DESIGN_SHEET_NAME = config?.designSheetName || 'Design';
    const TEST_SHEET_NAME = config?.testSheetName || 'test';
    const SCRIPT_URL = config?.scriptUrl || 'https://script.google.com/macros/s/AKfycbyH_R0_8JIlAq3TW8Fq_hmN6dSJ2c-u7F9lnwTMm8jOzHNnXBw7DjX4uUMRRTNlzxDw/exec';
    
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
    
    const PRICING = {
        minPriceToShowButton: config?.pricing?.minPriceToShowButton || 101,
        designerMarkup: config?.pricing?.designerMarkup || 1.75,
        maxDesignerRatio: config?.pricing?.maxDesignerRatio || 1.80
    };
    
    const TEXTS = {
        remoteDesign: config?.texts?.remoteDesign || 'Дизайнеры на удаленке (вписываем в таблицу СРАЗУ!)',
        designerRegina: config?.texts?.designerRegina || 'Дизайн Регина',
        designerReseda: config?.texts?.designerReseda || 'Дизайн Резеда'
    };

    let active = false;
    let observers = [];
    let buttonAdded = false;
    let dropdownInterval = null;

    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            /* Спиннер как отдельный элемент */
            .${UNIQUE_PREFIX}spinner {
                display: none;
                width: 12px;
                height: 12px;
                border: 2px solid rgba(255,255,255, 0.3);
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: ${UNIQUE_PREFIX}spin 0.8s linear infinite;
                margin-left: 6px;
                flex-shrink: 0;
            }
            
            .${UNIQUE_PREFIX}btn-primary .${UNIQUE_PREFIX}spinner {
                border: 2px solid rgba(0,0,0, 0.1);
                border-top: 2px solid #495057;
            }
            
            .${UNIQUE_PREFIX}loading .${UNIQUE_PREFIX}spinner {
                display: inline-block;
            }
            
            @keyframes ${UNIQUE_PREFIX}spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .${UNIQUE_PREFIX}locked {
                background-color: #f8f9fa !important;
                opacity: 0.65;
                cursor: not-allowed !important;
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
            
            /* 🔥 Кнопка с flexbox для идеального центрирования */
            .${UNIQUE_PREFIX}btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 4px 16px !important;
                margin: 0 5px 0 0 !important;
                border: 1px solid #ced4da !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                background: #f8f9fa !important;
                color: #495057 !important;
                transition: all 0.2s ease !important;
                line-height: 1.2 !important;
                min-width: 140px !important;
                min-height: 28px !important;
                position: relative !important;
                box-sizing: border-box !important;
                gap: 6px !important; /* Расстояние между текстом и спиннером */
            }
            
            .${UNIQUE_PREFIX}btn-text {
                flex-shrink: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .${UNIQUE_PREFIX}btn:hover {
                background: #e2e6ea !important;
                border-color: #adb5bd !important;
            }
            
            .${UNIQUE_PREFIX}btn-primary {
                background: #6c757d !important;
                color: #fff !important;
                border-color: #6c757d !important;
            }
            .${UNIQUE_PREFIX}btn-primary:hover {
                background: #5a6268 !important;
                border-color: #545b62 !important;
            }
            
            .${UNIQUE_PREFIX}btn-success {
                background: #28a745 !important;
                color: #fff !important;
                border-color: #28a745 !important;
            }
            .${UNIQUE_PREFIX}btn-success:hover {
                background: #218838 !important;
                border-color: #1e7e34 !important;
            }
            
            .${UNIQUE_PREFIX}btn-info {
                background: #17a2b8 !important;
                color: #fff !important;
                border-color: #17a2b8 !important;
            }
            .${UNIQUE_PREFIX}btn-info:hover {
                background: #138496 !important;
                border-color: #117a8b !important;
            }
            
            .${UNIQUE_PREFIX}btn:disabled {
                opacity: 0.6 !important;
                cursor: wait !important;
            }
            
            .${UNIQUE_PREFIX}popup {
                position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;
                padding: 20px !important; background-color: #fff !important; border: 1px solid #ccc !important;
                border-radius: 8px !important; box-shadow: 0 5px 20px rgba(0,0,0,0.2) !important;
                z-index: 999999 !important; min-width: 300px !important; font-family: system-ui, sans-serif !important;
            }
            .${UNIQUE_PREFIX}error {
                color: #721c24 !important; background: #f8d7da !important; padding: 8px !important;
                border-radius: 4px !important; margin: 10px 0 !important; font-size: 12px !important; text-align: center !important;
            }
            .${UNIQUE_PREFIX}success {
                color: #155724 !important; background: #d4edda !important; padding: 8px !important;
                border-radius: 4px !important; margin: 10px 0 !important; text-align: center !important; font-weight: bold !important;
            }
            .${UNIQUE_PREFIX}info-box {
                margin-top: 8px !important; border: 1px solid #c3e6cb !important;
                padding: 8px !important; border-radius: 4px !important; background: #d4edda !important;
                font-size: 12px !important; color: #155724 !important;
            }
            .${UNIQUE_PREFIX}info-table { width: 100% !important; border-collapse: collapse !important; }
            .${UNIQUE_PREFIX}info-table td { padding: 2px 0 !important; vertical-align: top !important; }
            .${UNIQUE_PREFIX}info-table td:first-child { font-weight: bold !important; padding-right: 8px !important; white-space: nowrap !important; }
        `;
        document.head.appendChild(style);
    }

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

        createEl('label', { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'13px' }, popup).innerText = 'Сумма дизайнеру:';
        const priceInput = createEl('input', { width:'100%', padding:'6px', margin:'5px 0 10px', border:'1px solid #ced4da', borderRadius:'4px', boxSizing:'border-box', fontSize:'13px' }, popup);
        priceInput.placeholder = 'Сколько платим дизайнеру?';
        priceInput.addEventListener('input', () => {
            const err = popup.querySelector(`.${UNIQUE_PREFIX}error`);
            if (err) err.remove();
        });

        createEl('label', { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'13px' }, popup).innerText = 'Дизайнер:';
        const dropdown = createEl('select', { width:'100%', padding:'6px', marginBottom:'15px', border:'1px solid #ced4da', borderRadius:'4px', boxSizing:'border-box', fontSize:'13px' }, popup);

        fetchGoogleSheetData(`${LIST_SHEET_NAME}!A:A`).then(cats => {
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = opt.text = c[0];
                dropdown.appendChild(opt);
            });
        });

        const sendBtn = createEl('button', { width:'100%', padding:'8px', backgroundColor:'#28a745', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', marginBottom:'8px' }, popup);
        sendBtn.innerText = 'Отправить';

        sendBtn.addEventListener('click', async () => {
            if (sendBtn.disabled) return;
            sendBtn.disabled = true;
            sendBtn.innerText = 'Отправка...';

            try {
                const productId = getProductId();
                const userName = getUserName();
                const productName = getProductName();
                const designerPrice = parseFloat(priceInput.value.replace(',', '.'));
                const category = dropdown.value;
                const axiomPrice = getAxiomPrice();
                const launchDate = getLaunchDate();

                if (!launchDate) {
                    const err = createEl('div', { marginTop:'10px' }, popup);
                    err.className = `${UNIQUE_PREFIX}error`;
                    err.innerText = 'Отправка данных только по запущенным заказам.';
                    sendBtn.disabled = false; sendBtn.innerText = 'Отправить';
                    return;
                }

                if (axiomPrice && designerPrice * PRICING.designerMarkup <= axiomPrice) {
                    const success = await writeDataToSheet([productId, userName, productName, designerPrice, category, axiomPrice, launchDate]);
                    if (success) {
                        const msg = createEl('div', { marginTop:'10px' }, popup);
                        msg.className = `${UNIQUE_PREFIX}success`;
                        msg.innerText = '✅ Данные успешно загружены!';
                        
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: '✅ Данные успешно загружены!', buttonText: 'ОК', duration: 2000 });
                        }
                        
                        setTimeout(() => {
                            popup.remove();
                            const btn = document.querySelector(`.${UNIQUE_PREFIX}btn`);
                            if (btn) {
                                btn.className = `${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-primary`;
                                setButtonText(btn, 'Удалённый дизайн');
                                btn.onclick = null;
                                btn.addEventListener('click', handleMainButtonClick);
                            }
                        }, 2000);
                    } else {
                        const err = createEl('div', { marginTop:'10px' }, popup);
                        err.className = `${UNIQUE_PREFIX}error`;
                        err.innerText = '❌ Ошибка при отправке данных';
                        sendBtn.disabled = false; sendBtn.innerText = 'Отправить';
                    }
                } else {
                    const maxVal = axiomPrice ? Math.round(axiomPrice / PRICING.maxDesignerRatio) : 0;
                    const err = createEl('div', { marginTop:'10px' }, popup);
                    err.className = `${UNIQUE_PREFIX}error`;
                    err.innerText = `Сумма дизайнеру не более ${maxVal} ₽`;
                    sendBtn.disabled = false; sendBtn.innerText = 'Отправить';
                }
            } catch (e) {
                const err = createEl('div', { marginTop:'10px' }, popup);
                err.className = `${UNIQUE_PREFIX}error`;
                err.innerText = 'Ошибка соединения';
                sendBtn.disabled = false; sendBtn.innerText = 'Отправить';
            }
        });

        const closeBtn = createEl('button', {
            width:'100%', padding:'8px', backgroundColor:'#6c757d', color:'#fff',
            border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'13px', fontWeight:'bold'
        }, popup);
        closeBtn.innerText = 'Закрыть';
        closeBtn.addEventListener('click', () => popup.remove());

        document.body.appendChild(popup);
        priceInput.focus();
    }

    function showCheckInfo() {
        const btn = document.querySelector(`.${UNIQUE_PREFIX}btn-info`);
        if (!btn) return;
        
        if (btn.parentElement.querySelector(`.${UNIQUE_PREFIX}info-box`)) return;
        
        const productId = getProductId();
        
        const originalText = getButtonText(btn);
        setButtonText(btn, 'Загрузка...');
        btn.disabled = true;

        Promise.all([
            fetchGoogleSheetData(`${DESIGN_SHEET_NAME}!A:E`),
            fetchGoogleSheetData(`${TEST_SHEET_NAME}!A:H`)
        ]).then(([designVals, testVals]) => {
            const designData = designVals.find(r => r[0] === productId.toString());
            const testData = testVals.find(r => r[0] === productId.toString());

            setButtonText(btn, originalText);
            btn.disabled = false;

            if (designData && testData) {
                const info = document.createElement('div');
                info.className = `${UNIQUE_PREFIX}info-box`;
                const tbl = document.createElement('table');
                tbl.className = `${UNIQUE_PREFIX}info-table`;
                const addRow = (lbl, val) => {
                    const r = tbl.insertRow();
                    const l = r.insertCell(); l.innerText = lbl;
                    const v = r.insertCell(); v.innerText = val;
                };
                addRow('Оплата:', `${designData[3]} ₽`);
                addRow('Дизайнер:', designData[4]);
                addRow('Статус:', testData[7] || 'Не оплачено');
                info.appendChild(tbl);
                btn.parentElement.appendChild(info);
            } else {
                const err = document.createElement('span');
                err.style.cssText = 'color:#dc3545;margin-left:10px;font-size:12px;font-weight:bold';
                err.innerText = '⚠ Данные не найдены';
                btn.parentElement.appendChild(err);
            }
        });
    }

    // Вспомогательные функции для работы с текстом кнопки
    function setButtonText(btn, text) {
        const textSpan = btn.querySelector(`.${UNIQUE_PREFIX}btn-text`);
        if (textSpan) {
            textSpan.innerText = text;
        } else {
            btn.innerText = text;
        }
    }

    function getButtonText(btn) {
        const textSpan = btn.querySelector(`.${UNIQUE_PREFIX}btn-text`);
        return textSpan ? textSpan.innerText : btn.innerText;
    }

    async function handleMainButtonClick(e) {
        const btn = e.currentTarget;
        const productId = getProductId();
        
        if (!productId) {
            if (api?.showCenterMessage) {
                api.showCenterMessage({ message: '⚠️ Product ID не найден', buttonText: 'ОК', duration: 2000 });
            }
            return;
        }

        // Добавляем класс loading - покажет спиннер
        btn.classList.add(`${UNIQUE_PREFIX}loading`);
        btn.disabled = true;

        setTimeout(async () => {
            try {
                const exists = await checkProductInSheet(productId);
                
                btn.classList.remove(`${UNIQUE_PREFIX}loading`);
                
                if (exists) {
                    btn.className = `${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-info`;
                    setButtonText(btn, 'Проверить');
                    btn.onclick = null;
                    btn.addEventListener('click', showCheckInfo);
                } else {
                    btn.className = `${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-success`;
                    setButtonText(btn, 'Заполнить');
                    btn.onclick = null;
                    btn.addEventListener('click', showPopup);
                }
                btn.disabled = false;
            } catch (e) {
                btn.classList.remove(`${UNIQUE_PREFIX}loading`);
                btn.disabled = false;
                if (api?.showCenterMessage) {
                    api.showCenterMessage({ message: '❌ Ошибка при проверке', buttonText: 'ОК', duration: 3000 });
                }
            }
        }, 1200);
    }

    function createRemoteDesignButton(textarea) {
        const btn = document.createElement('button');
        btn.className = `${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-primary`;
        
        // Создаем структуру: текст + спиннер
        const textSpan = document.createElement('span');
        textSpan.className = `${UNIQUE_PREFIX}btn-text`;
        textSpan.innerText = 'Удалённый дизайн';
        
        const spinner = document.createElement('span');
        spinner.className = `${UNIQUE_PREFIX}spinner`;
        
        btn.appendChild(textSpan);
        btn.appendChild(spinner);
        textarea.parentElement.appendChild(btn);

        btn.addEventListener('click', handleMainButtonClick);
    }

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
        
        observers.forEach(obs => obs.disconnect());
        observers = [];
        
        if (dropdownInterval) {
            clearInterval(dropdownInterval);
            dropdownInterval = null;
        }
        
        if (clickHandler) {
            document.removeEventListener('click', clickHandler);
            clickHandler = null;
        }
        
        document.querySelectorAll(`.${UNIQUE_PREFIX}popup`).forEach(el => el.remove());
        buttonAdded = false;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    function refresh() {
        checkLowCost();
        removeRemoteDesignOptionFromDropdown();
        checkAndBlockRemoteDesignRow();
    }

    function forceShowPopup() {
        showPopup();
    }

    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }

    return {
        init,
        cleanup,
        toggle,
        isActive,
        refresh,
        forceShowPopup,
        checkProductInSheet,
        writeDataToSheet
    };

})(config, GM, utils, api);