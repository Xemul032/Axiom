// 17axiomFullValidator.js — модуль полной валидации заказа и проверки бумаги
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'axiom-full-val-';
    const RULES_URL = config?.rulesUrl || 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Ref/test_rules.json';
    const RULES_BACKUP_URL = config?.rulesBackupUrl || 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Ref/test_rules.json';
    const RULES_CACHE_TIME = config?.rulesCacheTime || 5 * 60 * 1000;
    const SELECTORS = {
        fullValidation: config?.selectors?.fullValidation || [
            '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button',
            '#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)'
        ],
        paperOnly: config?.selectors?.paperOnly || [
            'button.RegButton:not(#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)):not(#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2))'
        ],
        warningOnly: config?.selectors?.warningOnly || [
            '#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)'
        ],
        regButton: config?.selectors?.regButton || '#RegButton',
        skladBlock: config?.selectors?.skladBlock || '.SkladBlock'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let debounceTimer = null;
    let isRunning = false;
    let lastStateHash = '';
    let validationRules = null;
    let rulesLastFetch = 0;
    let observer = null;
    let regButtonObserver = null; // 🔥 Отдельный observer для RegButton
    let isProcessingClick = false;
    const originalHandlers = new WeakMap();
    const attachedHandlers = new WeakMap();

    // ─────────────────────────────────────────────
    // 🔥 Утилиты
    // ─────────────────────────────────────────────
    const clean = t => t ? t.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim() : '';
    const parseNum = str => {
        if (!str) return 0;
        const num = parseFloat(str.toString().replace(/\s/g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
    };
    const getSelectedText = select => {
        if (!select) return '';
        return (select.selectedIndex >= 0 && select.options[select.selectedIndex])
            ? clean(select.options[select.selectedIndex].text)
            : clean(select.value);
    };
    const getNestedValue = (obj, path) => {
        if (!path) return undefined;
        return String(path).split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : undefined, obj);
    };

    // ─────────────────────────────────────────────
    // 🔥 Загрузка правил
    // ─────────────────────────────────────────────
    async function fetchValidationRules() {
        const now = Date.now();
        if (validationRules && (now - rulesLastFetch) < RULES_CACHE_TIME) {
            return validationRules;
        }

        const urls = [RULES_URL, RULES_BACKUP_URL].filter(Boolean);
        
        for (const url of urls) {
            try {
                const data = await new Promise((resolve) => {
                    if (typeof GM_xmlhttpRequest !== 'undefined') {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: url,
                            timeout: 10000,
                            onload: (response) => {
                                if (response.status === 200) {
                                    try {
                                        const parsed = JSON.parse(response.responseText);
                                        resolve(parsed);
                                    } catch {
                                        resolve(loadCachedRules());
                                    }
                                } else {
                                    resolve(loadCachedRules());
                                }
                            },
                            onerror: () => resolve(loadCachedRules()),
                            ontimeout: () => resolve(loadCachedRules())
                        });
                    } else {
                        fetch(url, { signal: AbortSignal.timeout(10000) })
                            .then(r => r.ok ? r.json() : Promise.reject())
                            .then(resolve)
                            .catch(() => resolve(loadCachedRules()));
                    }
                });
                
                validationRules = data;
                rulesLastFetch = now;
                
                if (typeof GM_setValue !== 'undefined') {
                    GM_setValue(`${UNIQUE_PREFIX}rules`, JSON.stringify(data));
                    GM_setValue(`${UNIQUE_PREFIX}rules_time`, now);
                }
                
                return data;
            } catch {
                // Пробуем следующий URL
            }
        }
        
        validationRules = loadCachedRules();
        rulesLastFetch = now;
        return validationRules;
    }

    function loadCachedRules() {
        try {
            if (typeof GM_getValue !== 'undefined') {
                const c = GM_getValue(`${UNIQUE_PREFIX}rules`);
                return c ? JSON.parse(c) : { rules: [], defaults: { failMessage: '⚠️ Проверка не пройдена' } };
            }
        } catch { /* ignore */ }
        return { rules: [], defaults: { failMessage: '⚠️ Проверка не пройдена' } };
    }

    // ─────────────────────────────────────────────
    // 🔥 Валидаторы
    // ─────────────────────────────────────────────
    const validators = {
        contains: (v, e, cs=false) => {
            if (!v) return false;
            const val = cs ? String(v) : String(v).toLowerCase();
            const exp = cs ? String(e) : String(e).toLowerCase();
            return val.includes(exp);
        },
        notContains: (v, e, cs=false) => !validators.contains(v, e, cs),
        gt: (v, e) => parseNum(v) > parseNum(e),
        gte: (v, e) => parseNum(v) >= parseNum(e),
        lt: (v, e) => parseNum(v) < parseNum(e),
        lte: (v, e) => parseNum(v) <= parseNum(e),
        eq: (v, e) => parseNum(v) === parseNum(e),
        isTrue: v => v === true || v === 'true' || v === 1,
        isFalse: v => v === false || v === 'false' || v === 0,
        filled: v => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'Не указано' && String(v).trim() !== 'Не указана',
        empty: v => !validators.filled(v),
        
        arrayContains: (arr, val, cs=false) => {
            if (!Array.isArray(arr)) return false;
            return arr.some(item => validators.contains(item, val, cs));
        },
        arrayNotContains: (arr, val, cs=false) => !validators.arrayContains(arr, val, cs),
        
        ordersContain: (orders, field, val, cs=false) => {
            if (!Array.isArray(orders)) return false;
            return orders.some(o => {
                const fieldValue = o[field];
                if (Array.isArray(fieldValue)) {
                    return fieldValue.some(item => validators.contains(item, val, cs));
                }
                return validators.contains(fieldValue, val, cs);
            });
        },
        ordersNotContain: (orders, field, val, cs=false) => !validators.ordersContain(orders, field, val, cs),
        
        ordersArrayContain: (orders, field, val, cs=false) => {
            if (!Array.isArray(orders)) return false;
            return orders.some(o => Array.isArray(o[field]) && o[field].some(item => validators.contains(item, val, cs)));
        },
        ordersArrayNotContain: (orders, field, val, cs=false) => !validators.ordersArrayContain(orders, field, val, cs)
    };

    // ─────────────────────────────────────────────
    // 🔥 Парсинг данных
    // ─────────────────────────────────────────────
    function parseProductName() {
        const i = document.querySelector('#Top > form > div > div > div > input') || document.querySelector('.ProductName.form-control');
        return i ? i.value.trim() : 'Не указано';
    }
    function parseProductMass() {
        let m = 'Не указана';
        const c = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(3) > tr:nth-child(8) > td:nth-child(2)');
        if (c) m = clean(c.textContent);
        else document.querySelectorAll('td').forEach((td, i, arr) => { if (clean(td.textContent).includes('Масса тиража') && arr[i+1]) m = clean(arr[i+1].textContent); });
        return m;
    }
    function parseProductSumma() {
        let s=0, c=0;
        const se = document.querySelector('.summa.Summa#Summa, .Summa');
        if (se) s = parseNum(se.textContent || se.value);
        const ce = document.querySelector('input.SummaCorrection');
        if (ce) c = parseNum(ce.value);
        return { rawSumma: s, rawCorrection: c, total: (s-c).toFixed(2) };
    }
    function parseInvoiceInfo() {
        const tb = document.querySelector('#TopButtons');
        if (!tb) return { hasInvoice: false, invoiceNumber: null };
        const btn = Array.from(tb.querySelectorAll('a.btn')).find(b => clean(b.textContent).match(/Счет\s*\d+/));
        if (btn) { const m = clean(btn.textContent).match(/Счет\s*(\d+)/); if (m) return { hasInvoice: true, invoiceNumber: m[1] }; }
        return { hasInvoice: false, invoiceNumber: null };
    }
    function parseProductInfo() {
        let client='Не указан', dp='Не указана', addr='Не указан';
        const cr = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(2) > tr:nth-child(2)');
        if (cr && cr.querySelector('td:first-child')?.textContent.includes('Контактное лицо')) client = clean(cr.querySelector('td:nth-child(2)').textContent);
        else {
            const sc = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)');
            if (sc) {
                const ch = sc.querySelector('div > a.chosen-single span');
                client = ch ? clean(ch.textContent) : (sc.querySelector('select[name="ClientId"]') ? getSelectedText(sc.querySelector('select[name="ClientId"]')) : clean(sc.textContent));
            } else { const s=document.querySelector('select[name="ClientId"]'); if(s) client=getSelectedText(s); }
        }
        const pr = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(1)');
        if (pr && pr.querySelector('td:first-child')?.textContent.includes('Точка выдачи')) {
            const pc = pr.querySelector('td:nth-child(2)');
            if (pc) { const ch=pc.querySelector('.chosen-single span'); dp = ch ? clean(ch.textContent) : (pc.querySelector('select.HouseTargetId, select[name*="HouseTarget"]') ? getSelectedText(pc.querySelector('select.HouseTargetId, select[name*="HouseTarget"]')) : clean(pc.textContent)); }
        } else { const h=document.querySelector('.HouseTargetId + .chosen-container .chosen-single span') || document.querySelector('select.HouseTargetId, select[name*="HouseTarget"]'); if(h) dp = h.tagName==='SELECT' ? getSelectedText(h) : clean(h.textContent); }
        const ar = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(2)');
        if (ar && ar.querySelector('td:first-child')?.textContent.includes('Адрес доставки')) {
            const ac = ar.querySelector('td:nth-child(2)');
            if (ac) { const inp=ac.querySelector('input.AddressText#AddressText, input[name*="AddressText"]'); if(inp?.value) addr=clean(inp.value); else { const ch=ac.querySelector('.chosen-single span'); addr = ch ? clean(ch.textContent) : (ac.querySelector('select.AddressId, select[name*="AddressId"]') ? getSelectedText(ac.querySelector('select.AddressId, select[name*="AddressId"]')) : clean(ac.textContent)); } }
        } else { const ai=document.querySelector('input.AddressText#AddressText, input[name*="AddressText"]'); if(ai?.value) addr=clean(ai.value); else { const as=document.querySelector('.AddressId + .chosen-container .chosen-single span') || document.querySelector('select.AddressId, select[name*="AddressId"]'); if(as) addr = as.tagName==='SELECT' ? getSelectedText(as) : clean(as.textContent); } }
        return { client, deliveryPoint: dp, address: addr };
    }
    function parseDesignBlock() {
        const b = document.querySelector('#DesignBlockSummary');
        if (!b) return null;
        const t = b.querySelector('table'); if (!t) return null;
        const d = [];
        t.querySelectorAll('tbody tr').forEach(r => {
            const t1=r.querySelector('td:first-child'), t2=r.querySelector('td:nth-child(2)');
            if (t1 && t2) { const txt=clean(t1.textContent); if (txt.length > 3) { const ta=t2.querySelector('textarea'); d.push({ desc: txt, instr: ta ? clean(ta.value) : '' }); } }
        });
        return d.length ? d : null;
    }
    function parseHistoryPrepress() {
        const h = document.querySelector('#History'); if (!h) return null;
        let ch={status:'Нет данных',who:'',when:''}, la={status:'Нет данных',who:'',when:''};
        h.querySelectorAll('tr').forEach(r => {
            const f=r.querySelector('td:first-child'); if(!f) return;
            const t=clean(f.textContent); if(t.includes('Операция')||t.includes('Участник')) return;
            if(t.includes('Препресс проверка')) { ch.who=r.querySelector('td:nth-child(3)')?.textContent.trim()||''; ch.when=r.querySelector('td:nth-child(4)')?.textContent.trim()||''; ch.status=(ch.who&&ch.when)?'✅ ГОТОВО':(ch.who?'⏳ В РАБОТЕ':'❌ НЕ НАЧАТ'); }
            if(t.includes('Препресс монтаж')) { la.who=r.querySelector('td:nth-child(3)')?.textContent.trim()||''; la.when=r.querySelector('td:nth-child(4)')?.textContent.trim()||''; la.status=(la.who&&la.when)?'✅ ГОТОВО':(la.who?'⏳ В РАБОТЕ':'❌ НЕ НАЧАТ'); }
        });
        return { check: ch, layout: la };
    }
    function parseGlobalPostpress() {
        const g=[]; const os=Array.from(document.querySelectorAll('.formblock')).filter(b=>b.className.match(/Order(\d+)/)&&b.offsetParent!==null); if(!os.length) return g;
        let n=os[os.length-1].nextElementSibling;
        while(n) { const t=n.tagName==='TABLE'?n:n.querySelector('table.table-condensed'); if(t) { t.querySelectorAll('tr[class^="PostpressPrice"]').forEach(r=>{const b=r.querySelector('b'); if(b){const v=clean(b.textContent); if(v&&!g.includes(v))g.push(v);}}); if(g.length)break; } n=n.nextElementSibling; }
        return g;
    }
    function parseSkladInfo(orderBlock) {
        const skladBlock = orderBlock.querySelector(SELECTORS.skladBlock);
        if (!skladBlock) return null;
        const rows = skladBlock.querySelectorAll('tbody tr');
        const data = { required: null, inStock: null, otherOrders: null };
        rows.forEach(row => {
            const labelTd = row.querySelector('td:first-child');
            const valueTd = row.querySelector('td.right.nobreak, td:nth-child(2)');
            if (labelTd && valueTd) {
                const label = clean(labelTd.textContent);
                const valueText = clean(valueTd.textContent);
                const value = parseNum(valueText);
                if (label.includes('Требуется листов')) data.required = value;
                else if (label.includes('На складе')) data.inStock = value;
                else if (label.includes('Другие заказы')) data.otherOrders = value;
            }
        });
        if (data.required === null && data.inStock === null && data.otherOrders === null) return null;
        return data;
    }
    function checkPaperAvailability(skladData, orderId, orderName) {
        if (!skladData || skladData.required === null || skladData.inStock === null) {
            return { status: 'unknown', message: 'Нет данных' };
        }
        const otherOrders = skladData.otherOrders || 0;
        const available = skladData.inStock - otherOrders;
        const needed = skladData.required + 50;
        const diff = available - needed;
        if (needed <= available) {
            return { status: 'enough', needed, available, diff, message: `✅ Бумаги хватает (запас: ${diff} л.)` };
        } else {
            return { status: 'notEnough', needed, available, diff: Math.abs(diff), message: `❌ Бумаги не хватает! Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу` };
        }
    }
    function parseOrders() {
        const os=[];
        document.querySelectorAll('.formblock').forEach(bl => {
            const m=bl.className.match(/Order(\d+)/);
            if(!m||bl.offsetParent===null) return;
            const id=m[1], ne=bl.querySelector('.OrderName'), name=ne?(ne.value||clean(ne.textContent)):'Без названия';
            let pi='',ci='',pap='';
            const hd=bl.querySelector('td[align="right"] h4, td[align="right"] nobr h4');
            if(hd){const c=hd.cloneNode(true);c.querySelectorAll('script,button,.glyphicon,.label,.hide,.btn,.PrepressControllerOrder').forEach(e=>e.remove());pi=clean(c.textContent);}
            const cr=[...bl.querySelectorAll('tr')].find(tr=>{const f=tr.querySelector('td.fieldname');return f&&clean(f.textContent)==='Цветность';});
            if(cr){const s=cr.querySelector('td.center span');ci=s?clean(s.textContent):'N/A';}
            const pl=[...bl.querySelectorAll('td.fieldname')].find(td=>clean(td.textContent)==='Бумага');
            if(pl){const v=pl.nextElementSibling; if(v){const c=v.cloneNode(true);c.querySelectorAll('span,div,script,button,.glyphicon,.MaterialCommentForm').forEach(e=>e.remove());pap=clean(c.textContent);}}
            const lpp=[]; bl.querySelectorAll('table.table-condensed tr[class^="PostpressPrice"], table.inner tr[class^="PostpressPrice"]').forEach(r=>{const b=r.querySelector('b');if(b)lpp.push(clean(b.textContent));});
            const skladInfo = parseSkladInfo(bl);
            os.push({id,name,printInfo:pi,colorInfo:ci,paperInfo:pap,localPP:lpp, sklad: skladInfo});
        });
        return os;
    }

    // ─────────────────────────────────────────────
    // 🔥 Движок валидации
    // ─────────────────────────────────────────────
    function evaluateCondition(cond, data) {
        const { field, operator, value, caseSensitive, subField } = cond;
        if (!field) return false;
        let fv = getNestedValue(data, field);
        if (field === 'orders') {
            if (operator === 'ordersContain') return validators.ordersContain(fv, subField, value, caseSensitive);
            if (operator === 'ordersNotContain') return validators.ordersNotContain(fv, subField, value, caseSensitive);
            if (operator === 'ordersArrayContain') return validators.ordersArrayContain(fv, subField, value, caseSensitive);
            if (operator === 'ordersArrayNotContain') return validators.ordersArrayNotContain(fv, subField, value, caseSensitive);
        }
        if (Array.isArray(fv)) {
            if (operator === 'arrayContains') return validators.arrayContains(fv, value, caseSensitive);
            if (operator === 'arrayNotContains') return validators.arrayNotContains(fv, value, caseSensitive);
        }
        const v = validators[operator];
        return v ? v(fv, value, caseSensitive) : false;
    }

    function runValidation(data) {
        if (!validationRules?.rules?.length) return {passed:true, messages:[]};
        const fails = [];
        const defaults = validationRules.defaults || {};
        for(const r of validationRules.rules) {
            if (r.triggers?.length) {
                const triggerMatch = r.triggers.some(t => {
                    if (!t.field || !data[t.field]) return false;
                    return validators.contains(data[t.field], t.value, t.caseSensitive);
                });
                if (!triggerMatch) continue;
            }
            const conditionResults = r.conditions.map(c => evaluateCondition(c, data));
            const isRulePassed = (r.logic || 'AND') === 'AND' ? conditionResults.every(Boolean) : conditionResults.some(Boolean);
            if (isRulePassed) {
                let msg = null;
                if (r.conditions?.length) {
                    for (let i = 0; i < r.conditions.length; i++) {
                        if (conditionResults[i] && r.conditions[i].failMessage) {
                            msg = r.conditions[i].failMessage;
                            break;
                        }
                    }
                }
                if (!msg) {
                    msg = r.failMessage || r.message || r.error || r.text || defaults.failMessage || '⚠️ Проверка не пройдена';
                }
                fails.push(msg);
            }
        }
        return {passed: !fails.length, messages: fails};
    }

    function isFullValidationButton(btn) {
        return SELECTORS.fullValidation.some(selector => { try { return btn.matches(selector); } catch { return false; } });
    }
    function isPaperOnlyButton(btn) {
        return SELECTORS.paperOnly.some(selector => { try { return btn.matches(selector); } catch { return false; } });
    }
    function isWarningOnlyButton(btn) {
        return SELECTORS.warningOnly.some(selector => { try { return btn.matches(selector); } catch { return false; } });
    }

    function runPaperCheck(pData) {
        let paperErrors = [];
        if (pData.orders?.length) {
            pData.orders.forEach(order => {
                if (order.sklad) {
                    const paperCheck = checkPaperAvailability(order.sklad, order.id, order.name);
                    if (paperCheck?.status === 'notEnough') {
                        paperErrors.push(`Ордер #${order.id} "${order.name}": ${paperCheck.message}`);
                    }
                }
            });
        }
        return paperErrors;
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик клика
    // ─────────────────────────────────────────────
    function createHandler(btn, handlerType, originalOnClick) {
        return async function(e) {
            if (isProcessingClick) return;
            isProcessingClick = true;
            
            try {
                const pData = {
                    productName: parseProductName(), 
                    mass: parseProductMass(), 
                    summaData: parseProductSumma(),
                    invoiceInfo: parseInvoiceInfo(), 
                    productInfo: parseProductInfo(), 
                    designData: parseDesignBlock(),
                    prepress: parseHistoryPrepress(), 
                    globalPP: parseGlobalPostpress(), 
                    orders: parseOrders()
                };

                if (handlerType === 'full') {
                    const paperErrors = runPaperCheck(pData);
                    
                    await fetchValidationRules();
                    const validationData = {
                        productName: pData.productName,
                        summa: pData.summaData.total, rawSumma: pData.summaData.rawSumma, mass: pData.mass,
                        invoice: pData.invoiceInfo.hasInvoice, invoiceNumber: pData.invoiceInfo.invoiceNumber,
                        client: pData.productInfo.client, deliveryPoint: pData.productInfo.deliveryPoint, address: pData.productInfo.address,
                        prepress: pData.prepress, globalPP: pData.globalPP,
                        orders: pData.orders.map(o => ({ id: o.id, name: o.name, printInfo: o.printInfo, colorInfo: o.colorInfo, paperInfo: o.paperInfo, localPP: o.localPP })),
                        design: pData.designData?.map(d => d.desc).join(' | ') || ''
                    };
                    const res = runValidation(validationData);
                    
                    if (!res.passed || paperErrors.length > 0) {
                        e.stopImmediatePropagation(); e.preventDefault();
                        const allErrors = [];
                        if (res.messages.length) { 
                            allErrors.push('<b>📋 Ошибки из правил:</b>'); 
                            res.messages.forEach(m => allErrors.push('• ' + m)); 
                        }
                        if (paperErrors.length) { 
                            if (allErrors.length) allErrors.push('<br>'); 
                            allErrors.push('<b>📦 Не хватает бумаги!:</b>'); 
                            paperErrors.forEach(m => allErrors.push('• ' + m)); 
                        }
                        const alertMsg = '<b>⛔ Проверка не пройдена!</b><br><br>' + allErrors.join('<br>');
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: alertMsg, buttonText: 'Понятно', duration: 0 });
                        }
                        isProcessingClick = false;
                        return false;
                    }
                    
                    if (originalOnClick) {
                        btn.onclick = null;
                        originalOnClick.call(btn, e);
                        btn.onclick = originalOnClick;
                    }
                }
                else if (handlerType === 'paperOnly') {
                    const paperErrors = runPaperCheck(pData);
                    if (paperErrors.length > 0) {
                        e.stopImmediatePropagation(); e.preventDefault();
                        const alertMsg = '<b>⛔ Бумаги не хватает!</b><br><br>' + paperErrors.map(e => '• ' + e).join('<br>');
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: alertMsg, buttonText: 'Понятно', duration: 0 });
                        }
                        isProcessingClick = false;
                        return false;
                    }
                    
                    if (originalOnClick) {
                        btn.onclick = null;
                        originalOnClick.call(btn, e);
                        btn.onclick = originalOnClick;
                    }
                }
                else if (handlerType === 'warningOnly') {
                    const paperErrors = runPaperCheck(pData);
                    if (paperErrors.length > 0) {
                        const alertMsg = '<b>⚠️ ВНИМАНИЕ: Бумаги не хватает!</b><br><br>' + 
                                        paperErrors.map(e => '• ' + e).join('<br>') + 
                                        '<br><br>🔸 Действие всё равно будет выполнено.';
                        if (api?.showCenterMessage) {
                            api.showCenterMessage({ message: alertMsg, buttonText: 'Понятно', duration: 5000 });
                        }
                    }
                    if (originalOnClick) {
                        btn.onclick = null;
                        originalOnClick.call(btn, e);
                        btn.onclick = originalOnClick;
                    }
                }
            } catch {
                if (handlerType !== 'warningOnly') {
                    e.stopImmediatePropagation(); e.preventDefault();
                    if (api?.showCenterMessage) {
                        api.showCenterMessage({ message: '⚠️ Произошла ошибка в скрипте валидации. Действие отменено.', buttonText: 'ОК', duration: 0 });
                    }
                }
            } finally {
                setTimeout(() => { isProcessingClick = false; }, 50);
            }
        };
    }

    function attachHandler(btn, handlerType) {
        if (!originalHandlers.has(btn) && btn.onclick) {
            originalHandlers.set(btn, btn.onclick);
        }
        const originalOnClick = originalHandlers.get(btn) || null;
        const currentHandler = attachedHandlers.get(btn);
        if (currentHandler?.type === handlerType) return;
        const newHandler = createHandler(btn, handlerType, originalOnClick);
        attachedHandlers.set(btn, { type: handlerType, handler: newHandler });
        if (btn.onclick && btn.onclick !== newHandler) {
            btn.onclick = newHandler;
        } else if (!btn.onclick) {
            btn.addEventListener('click', newHandler, true);
        }
    }

    function interceptButtons() {
        SELECTORS.fullValidation.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => { if (btn) attachHandler(btn, 'full'); });
        });
        SELECTORS.paperOnly.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => { if (btn && !isFullValidationButton(btn) && !isWarningOnlyButton(btn)) attachHandler(btn, 'paperOnly'); });
        });
        SELECTORS.warningOnly.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => { if (btn) attachHandler(btn, 'warningOnly'); });
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 НОВЫЙ OBSERVER: отслеживаем RegButton
    // ─────────────────────────────────────────────
    function setupRegButtonObserver() {
        if (regButtonObserver) regButtonObserver.disconnect();
        
        regButtonObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // 🔥 Проверяем, изменилась ли кнопка RegButton
                if (mutation.target.id === 'RegButton') {
                    const regBtn = mutation.target;
                    const isDisabled = regBtn.hasAttribute('disabled');
                    const text = regBtn.textContent.trim();
                    
                    // 🔥 Если кнопка disabled и текст "Запущен в работу"
                    if (isDisabled && text === 'Запущен в работу') {
                        // 🔥 Перезапускаем перехват кнопок
                        setTimeout(() => {
                            interceptButtons();
                        }, 300);
                    }
                }
            });
        });
        
        // 🔥 Начинаем наблюдение за RegButton
        const regBtn = document.querySelector(SELECTORS.regButton);
        if (regBtn) {
            regButtonObserver.observe(regBtn, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    function runParser() {
        if (isProcessingClick) return;
        if (isRunning) return;
        isRunning = true;
        const pN=parseProductName(), m=parseProductMass(), sD=parseProductSumma(), iI=parseInvoiceInfo(), pI=parseProductInfo(), dD=parseDesignBlock(), pr=parseHistoryPrepress(), gP=parseGlobalPostpress(), oS=parseOrders();
        const st = JSON.stringify({n:pN,m:m,s:sD,inv:iI,p:pI,d:dD,pp:pr,gpp:gP.sort(),o:oS.map(o=>({id:o.id,name:o.name,pp:o.localPP.length}))});
        if(st===lastStateHash){isRunning=false;return;} lastStateHash=st;
        setTimeout(interceptButtons, 300);
        isRunning = false;
    }

    function setupObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(()=>{
            if (isProcessingClick) return;
            clearTimeout(debounceTimer);
            debounceTimer=setTimeout(runParser,400);
        });
        observer.observe(document.body,{childList:true,subtree:true});
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        setupObserver();
        setupRegButtonObserver(); // 🔥 Запускаем observer для RegButton
        setTimeout(runParser, 600);
        fetchValidationRules();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        if (observer) { observer.disconnect(); observer = null; }
        if (regButtonObserver) { regButtonObserver.disconnect(); regButtonObserver = null; } // 🔥 Отключаем observer
        clearTimeout(debounceTimer);
        attachedHandlers.clear();
        originalHandlers.clear();
        isProcessingClick = false;
        isRunning = false;
        lastStateHash = '';
    }

    function toggle() { active ? cleanup() : init(); }
    function isActive() { return active; }

    function refresh() { runParser(); }
    function reloadRules() { rulesLastFetch = 0; return fetchValidationRules(); }

    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }

    return {
        init, cleanup, toggle, isActive, refresh, reloadRules,
        runValidation, parseOrders, fetchValidationRules
    };

})(config, GM, utils, api);