// axiomValidator.js — модуль валидации заказа перед отправкой
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'axiom-val-';
    const RULES_URL = config?.rulesUrl || 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Ref/test_rules.json';
    const RULES_CACHE_TIME = config?.rulesCacheTime || 5 * 60 * 1000;
    const VALIDATION_BUTTONS = config?.validationButtons || [
        {
            selector: '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button',
            trigger: 'Файлы получены'
        },
        {
            selector: '#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)',
            trigger: 'В работу с файлами'
        }
    ];

    // 🔥 Логгер модуля
    const log = {
        prefix: `[AxiomValidator]`,
        info: (...args) => console.log(log.prefix, 'ℹ️', ...args),
        warn: (...args) => console.warn(log.prefix, '⚠️', ...args),
        error: (...args) => console.error(log.prefix, '❌', ...args),
        debug: (...args) => {
            if (config?.debug) console.log(log.prefix, '🔍', ...args);
        }
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let debounceTimer = null;
    let isRunning = false;
    let lastStateHash = '';
    let validationRules = null;
    let rulesLastFetch = 0;
    let originalButtons = [];
    let domObserver = null;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты
    // ─────────────────────────────────────────────
    const clean = t => t ? t.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim() : '';
    const parseNum = str => {
        if (!str) return 0;
        const numStr = str.toString().replace(/\s/g, '').replace(',', '.');
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num;
    };
    const getSelectedText = select => {
        if (!select) return '';
        if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
            return clean(select.options[select.selectedIndex].text);
        }
        return clean(select.value);
    };

    // ─────────────────────────────────────────────
    // 🔥 Загрузка правил
    // ─────────────────────────────────────────────
    async function fetchValidationRules() {
        log.debug('fetchValidationRules: start');
        const now = Date.now();
        
        if (validationRules && (now - rulesLastFetch) < RULES_CACHE_TIME) {
            log.debug('fetchValidationRules: using cached rules');
            return validationRules;
        }

        log.info('fetchValidationRules: loading from', RULES_URL);

        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                log.debug('fetchValidationRules: using GM_xmlhttpRequest');
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: RULES_URL,
                    onload: (response) => {
                        log.debug('fetchValidationRules: response status', response.status);
                        if (response.status === 200) {
                            try {
                                validationRules = JSON.parse(response.responseText);
                                rulesLastFetch = now;
                                log.info('fetchValidationRules: rules loaded successfully, count:', validationRules.rules?.length || 0);
                                if (typeof GM_setValue !== 'undefined') {
                                    GM_setValue(`${UNIQUE_PREFIX}rules`, response.responseText);
                                    GM_setValue(`${UNIQUE_PREFIX}rules_time`, now);
                                    log.debug('fetchValidationRules: rules cached in GM storage');
                                }
                                resolve(validationRules);
                            } catch (e) {
                                log.warn('fetchValidationRules: JSON parse error', e.message);
                                resolve(loadCachedRules());
                            }
                        } else {
                            log.warn('fetchValidationRules: HTTP error', response.status);
                            resolve(loadCachedRules());
                        }
                    },
                    onerror: (err) => {
                        log.warn('fetchValidationRules: network error', err);
                        resolve(loadCachedRules());
                    }
                });
            } else {
                log.debug('fetchValidationRules: using native fetch');
                fetch(RULES_URL)
                    .then(r => {
                        log.debug('fetchValidationRules: fetch response status', r.status);
                        return r.json();
                    })
                    .then(data => {
                        validationRules = data;
                        rulesLastFetch = now;
                        log.info('fetchValidationRules: rules loaded via fetch, count:', validationRules.rules?.length || 0);
                        resolve(validationRules);
                    })
                    .catch(err => {
                        log.warn('fetchValidationRules: fetch error', err.message);
                        resolve(loadCachedRules());
                    });
            }
        });
    }

    function loadCachedRules() {
        log.debug('loadCachedRules: attempting to load from cache');
        if (typeof GM_getValue !== 'undefined') {
            const cached = GM_getValue(`${UNIQUE_PREFIX}rules`);
            const cachedTime = GM_getValue(`${UNIQUE_PREFIX}rules_time`);
            if (cached && cachedTime) {
                try {
                    validationRules = JSON.parse(cached);
                    rulesLastFetch = cachedTime;
                    log.info('loadCachedRules: loaded from cache, age:', Math.round((Date.now() - cachedTime) / 1000), 'sec');
                    return validationRules;
                } catch (e) {
                    log.warn('loadCachedRules: cache parse error', e.message);
                }
            } else {
                log.debug('loadCachedRules: no cache found');
            }
        }
        log.info('loadCachedRules: using empty default rules');
        validationRules = { rules: [], defaults: { failMessage: '⚠️ Проверка не пройдена' } };
        return validationRules;
    }

    // ─────────────────────────────────────────────
    // 🔥 Универсальные валидаторы
    // ─────────────────────────────────────────────
    const validators = {
        contains: (value, expected, opts) => {
            if (!value) return false;
            const v = opts?.caseSensitive ? String(value) : String(value).toLowerCase();
            const e = opts?.caseSensitive ? String(expected) : String(expected).toLowerCase();
            return v.includes(e);
        },
        equals: (value, expected, opts) => {
            if (!value) return false;
            const v = opts?.caseSensitive ? String(value).trim() : String(value).trim().toLowerCase();
            const e = opts?.caseSensitive ? String(expected).trim() : String(expected).trim().toLowerCase();
            return v === e;
        },
        gt: (value, expected) => parseNum(value) > parseNum(expected),
        gte: (value, expected) => parseNum(value) >= parseNum(expected),
        lt: (value, expected) => parseNum(value) < parseNum(expected),
        lte: (value, expected) => parseNum(value) <= parseNum(expected),
        eq: (value, expected) => parseNum(value) === parseNum(expected),
        ne: (value, expected) => parseNum(value) !== parseNum(expected),
        exists: (value) => value && String(value).trim() !== '' && !['Не указано', 'Не указана'].includes(String(value).trim()),
        notExists: (value) => !value || String(value).trim() === '' || ['Не указано', 'Не указана'].includes(String(value).trim()),
        
        // 🔥 БЕЗОПАСНЫЙ calc: переменные передаются как аргументы функции
        calc: (data, formula, expected, operator) => {
            try {
                const ctx = {
                    req: parseNum(data?.stock?.req) || 0,
                    stock: parseNum(data?.stock?.stock) || 0,
                    others: parseNum(data?.stock?.others) || 0,
                    res: parseNum(data?.stock?.res) || 0,
                    summa: parseNum(data?.summa) || 0,
                    mass: parseNum(data?.mass) || 0
                };
                
                const safeFormula = String(formula).replace(/[^\w\s+\-*/().,<>=!&|?:]/g, '');
                
                const evaluator = new Function(
                    'req', 'stock', 'others', 'res', 'summa', 'mass',
                    '"use strict"; return (' + safeFormula + ')'
                );
                
                const result = evaluator(
                    ctx.req, ctx.stock, ctx.others, ctx.res, ctx.summa, ctx.mass
                );
                
                const exp = parseNum(expected);
                const ops = { 
                    gt: r => r > exp, 
                    gte: r => r >= exp, 
                    lt: r => r < exp, 
                    lte: r => r <= exp, 
                    eq: r => r === exp,
                    ne: r => r !== exp 
                };
                return ops[operator]?.(result) ?? false;
            } catch (e) {
                log.warn('calc validator error:', e.message, { formula, data });
                return false;
            }
        },
        
        nestedStatus: (obj, path, expected) => {
            const val = path.split('.').reduce((o, k) => o?.[k], obj);
            const map = { 'не начат': '❌ НЕ НАЧАТ', 'в работе': '⏳ В РАБОТЕ', 'готово': '✅ ГОТОВО', 'нет данных': 'Нет данных' };
            return (val?.status || val) === (map[expected?.toLowerCase()] || expected);
        }
    };

    // ─────────────────────────────────────────────
    // 🔥 Парсинг данных
    // ─────────────────────────────────────────────
    function parseProductName() {
        const input = document.querySelector('#Top > form > div > div > div > input') || document.querySelector('.ProductName.form-control');
        return input ? input.value.trim() : 'Не указано';
    }

    function parseProductMass() {
        let mass = 'Не указана';
        const massCell = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(3) > tr:nth-child(8) > td:nth-child(2)');
        if (massCell) {
            mass = clean(massCell.textContent);
        } else {
            const labels = document.querySelectorAll('td');
            for (let i = 0; i < labels.length; i++) {
                if (clean(labels[i].textContent).includes('Масса тиража')) {
                    const nextTd = labels[i].nextElementSibling;
                    if (nextTd) { mass = clean(nextTd.textContent); break; }
                }
            }
        }
        return mass;
    }

    function parseProductSumma() {
        let summa = 0, correction = 0;
        const summaEl = document.querySelector('.summa.Summa#Summa, .Summa');
        if (summaEl) summa = parseNum(summaEl.textContent || summaEl.value);
        const correctionEl = document.querySelector('input.SummaCorrection');
        if (correctionEl) correction = parseNum(correctionEl.value);
        return { rawSumma: summa, rawCorrection: correction, total: (summa - correction).toFixed(2) };
    }

    function parseInvoiceInfo() {
        const topButtons = document.querySelector('#TopButtons');
        if (!topButtons) return { hasInvoice: false, invoiceNumber: null };
        const invoiceBtn = Array.from(topButtons.querySelectorAll('a.btn')).find(btn => {
            const text = clean(btn.textContent);
            return text.startsWith('Счет') && text.match(/Счет\s*\d+/);
        });
        if (invoiceBtn) {
            const text = clean(invoiceBtn.textContent);
            const match = text.match(/Счет\s*(\d+)/);
            if (match) return { hasInvoice: true, invoiceNumber: match[1], rawText: text };
        }
        return { hasInvoice: false, invoiceNumber: null };
    }

    function parseProductInfo() {
        let client = 'Не указан', deliveryPoint = 'Не указана', address = 'Не указан';

        const clientTextRow = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(2) > tr:nth-child(2)');
        if (clientTextRow && clientTextRow.querySelector('td:first-child')?.textContent.includes('Контактное лицо')) {
            client = clean(clientTextRow.querySelector('td:nth-child(2)').textContent);
        } else {
            const summaryCell = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)');
            if (summaryCell) {
                const chosenLink = summaryCell.querySelector('div > a.chosen-single span');
                client = chosenLink ? clean(chosenLink.textContent) : (summaryCell.querySelector('select[name="ClientId"]') ? getSelectedText(summaryCell.querySelector('select[name="ClientId"]')) : clean(summaryCell.textContent));
            } else {
                const sel = document.querySelector('select[name="ClientId"]');
                if (sel) client = getSelectedText(sel);
            }
        }

        const pointRow = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(1)');
        if (pointRow && pointRow.querySelector('td:first-child')?.textContent.includes('Точка выдачи')) {
            const pointCell = pointRow.querySelector('td:nth-child(2)');
            if (pointCell) {
                const chosenSpan = pointCell.querySelector('.chosen-single span');
                deliveryPoint = chosenSpan ? clean(chosenSpan.textContent) : (pointCell.querySelector('select') ? getSelectedText(pointCell.querySelector('select')) : clean(pointCell.textContent));
            }
        } else {
            const houseSpan = document.querySelector('.HouseTargetId + .chosen-container .chosen-single span');
            if (houseSpan) deliveryPoint = clean(houseSpan.textContent);
            else {
                const h = document.querySelector('select.HouseTargetId, select[name*="HouseTarget"]');
                if (h) deliveryPoint = getSelectedText(h);
            }
        }

        const addrRow = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(2)');
        if (addrRow && addrRow.querySelector('td:first-child')?.textContent.includes('Адрес доставки')) {
            const addrCell = addrRow.querySelector('td:nth-child(2)');
            if (addrCell) {
                const addrInput = addrCell.querySelector('input.AddressText#AddressText, input[name*="AddressText"]');
                if (addrInput?.value) address = clean(addrInput.value);
                else {
                    const chosenSpan = addrCell.querySelector('.chosen-single span');
                    address = chosenSpan ? clean(chosenSpan.textContent) : (addrCell.querySelector('select') ? getSelectedText(addrCell.querySelector('select')) : clean(addrCell.textContent));
                }
            }
        } else {
            const addrInput = document.querySelector('input.AddressText#AddressText, input[name*="AddressText"]');
            if (addrInput?.value) address = clean(addrInput.value);
            else {
                const aSpan = document.querySelector('.AddressId + .chosen-container .chosen-single span');
                address = aSpan ? clean(aSpan.textContent) : (document.querySelector('select.AddressId, select[name*="AddressId"]') ? getSelectedText(document.querySelector('select.AddressId, select[name*="AddressId"]')) : '');
            }
        }

        return { client, deliveryPoint, address };
    }

    function parseDesignBlock() {
        const block = document.querySelector('#DesignBlockSummary');
        if (!block) return null;
        const table = block.querySelector('table');
        if (!table) return null;
        const designs = [];
        table.querySelectorAll('tbody tr').forEach(row => {
            const t1 = row.querySelector('td:first-child'), t2 = row.querySelector('td:nth-child(2)');
            if (t1 && t2) {
                const txt = clean(t1.textContent);
                if (txt.length > 5 && txt.includes('руб')) {
                    const ta = t2.querySelector('textarea');
                    designs.push({ desc: txt, instr: ta ? clean(ta.value) : '' });
                }
            }
        });
        return designs.length > 0 ? designs : null;
    }

    function parseHistoryPrepress() {
        const hist = document.querySelector('#History');
        if (!hist) return null;
        let check = { status: 'Нет данных', who: '', when: '' }, layout = { status: 'Нет данных', who: '', when: '' };
        hist.querySelectorAll('tr').forEach(row => {
            const first = row.querySelector('td:first-child');
            if (!first) return;
            const text = clean(first.textContent);
            if (text.includes('Операция') || text.includes('Участник')) return;
            if (text.includes('Препресс проверка')) {
                check.who = row.querySelector('td:nth-child(3)')?.textContent.trim() || '';
                check.when = row.querySelector('td:nth-child(4)')?.textContent.trim() || '';
                check.status = (check.who && check.when) ? '✅ ГОТОВО' : (check.who ? '⏳ В РАБОТЕ' : '❌ НЕ НАЧАТ');
            }
            if (text.includes('Препресс монтаж')) {
                layout.who = row.querySelector('td:nth-child(3)')?.textContent.trim() || '';
                layout.when = row.querySelector('td:nth-child(4)')?.textContent.trim() || '';
                layout.status = (layout.who && layout.when) ? '✅ ГОТОВО' : (layout.who ? '⏳ В РАБОТЕ' : '❌ НЕ НАЧАТ');
            }
        });
        return { check, layout };
    }

    function parseGlobalPostpress() {
        const globals = [];
        const orders = Array.from(document.querySelectorAll('.formblock')).filter(b => b.className.match(/Order(\d+)/) && b.offsetParent !== null);
        if (orders.length === 0) return globals;
        let next = orders[orders.length - 1].nextElementSibling;
        while (next) {
            const table = next.tagName === 'TABLE' ? next : next.querySelector('table.table-condensed');
            if (table) {
                table.querySelectorAll('tr[class^="PostpressPrice"]').forEach(r => {
                    const b = r.querySelector('b');
                    if (b) { const n = clean(b.textContent); if (n && !globals.includes(n)) globals.push(n); }
                });
                if (globals.length > 0) break;
            }
            next = next.nextElementSibling;
        }
        return globals;
    }

    function parseOrders() {
        const orders = [];
        document.querySelectorAll('.formblock').forEach(block => {
            const m = block.className.match(/Order(\d+)/);
            if (!m || block.offsetParent === null) return;
            const id = m[1];
            const nameEl = block.querySelector('.OrderName');
            const name = nameEl ? (nameEl.value || clean(nameEl.textContent)) : 'Без названия';
            let printInfo = '', colorInfo = '', paperInfo = '';
            const header = block.querySelector('td[align="right"] h4, td[align="right"] nobr h4');
            if (header) {
                const clone = header.cloneNode(true);
                clone.querySelectorAll('script, button, .glyphicon, .label, .hide, .btn, .PrepressControllerOrder').forEach(e => e.remove());
                printInfo = clean(clone.textContent);
            }
            const cRow = [...block.querySelectorAll('tr')].find(tr => { const f = tr.querySelector('td.fieldname'); return f && clean(f.textContent) === 'Цветность'; });
            if (cRow) { const s = cRow.querySelector('td.center span'); colorInfo = s ? clean(s.textContent) : 'N/A'; }
            const pLabel = [...block.querySelectorAll('td.fieldname')].find(td => clean(td.textContent) === 'Бумага');
            if (pLabel) {
                const v = pLabel.nextElementSibling;
                if (v) { const cl = v.cloneNode(true); cl.querySelectorAll('span, div, script, button, .glyphicon, .MaterialCommentForm').forEach(e => e.remove()); paperInfo = clean(cl.textContent); }
            }
            let stock = { req: '-', res: '-', stock: '-', others: '-' };
            const sklad = block.querySelector('td.SkladBlock');
            if (sklad) {
                sklad.querySelectorAll('tr').forEach(tr => {
                    const [k, v] = tr.querySelectorAll('td');
                    if (k && v) {
                        const key = clean(k.textContent), val = clean(v.textContent) || '-';
                        if (key.includes('Требуется')) stock.req = val;
                        else if (key.includes('Использовано') || key.includes('зарезервировано')) stock.res = val;
                        else if (key.includes('На складе')) stock.stock = val;
                        else if (key.includes('Другие заказы')) stock.others = val;
                    }
                });
            }
            const localPP = [];
            block.querySelectorAll('table.table-condensed tr[class^="PostpressPrice"], table.inner tr[class^="PostpressPrice"]').forEach(r => { const b = r.querySelector('b'); if (b) localPP.push(clean(b.textContent)); });
            orders.push({ id, name, printInfo, colorInfo, paperInfo, stock, localPP });
        });
        return orders;
    }

    // ─────────────────────────────────────────────
    // 🔥 Движок валидации
    // ─────────────────────────────────────────────
    function getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => o?.[k], obj);
    }

    function evaluateCondition(condition, data) {
        const { field, operator, value, options, formula, expectedOperator, source, failMessage } = condition;

        let context = data;
        if (source === 'orders' && data.orders?.length) {
            const orders = condition.checkAll ? data.orders : [data.orders[0]];
            const results = orders.map(ord => {
                const ctx = { ...data, ...ord, stock: ord.stock };
                const fieldValue = field ? getNestedValue(ctx, field) : ctx;
                return runValidator(operator, fieldValue, value, options, ctx, formula, expectedOperator);
            });
            const passed = condition.any ? results.some(r => r.passed) : results.every(r => r.passed);
            return {
                passed,
                message: passed ? null : (failMessage || results.find(r => !r.passed)?.message || '⚠️ Проверка не пройдена')
            };
        }

        const fieldValue = field ? getNestedValue(context, field) : context;
        const result = runValidator(operator, fieldValue, value, options, context, formula, expectedOperator);
        return {
            passed: result,
            message: result ? null : failMessage
        };
    }

    function runValidator(operator, fieldValue, value, options, context, formula, expectedOperator) {
        if (operator === 'calc' && formula) {
            return validators.calc(context, formula, value, expectedOperator);
        }
        if (operator === 'nestedStatus') {
            return validators.nestedStatus(fieldValue, options?.path, value);
        }
        const validator = validators[operator];
        if (!validator) {
            log.warn('runValidator: unknown operator', operator);
            return false;
        }
        return validator(fieldValue, value, options);
    }

    function evaluateRule(rule, data) {
        if (!rule.conditions?.length) return { passed: true, messages: [] };

        const logic = rule.logic || 'AND';
        const results = rule.conditions.map(cond => evaluateCondition(cond, data));

        if (logic === 'AND') {
            const failed = results.filter(r => !r.passed);
            return {
                passed: failed.length === 0,
                messages: failed.map(r => r.message).filter(Boolean)
            };
        } else {
            const passed = results.some(r => r.passed);
            return {
                passed,
                messages: passed ? [] : results.map(r => r.message).filter(Boolean)
            };
        }
    }

    function runValidation(data) {
        log.debug('runValidation: start, rules count:', validationRules?.rules?.length || 0);
        
        if (!validationRules?.rules?.length) {
            log.debug('runValidation: no rules, passing');
            return { passed: true, messages: [] };
        }
        
        const allFailedMessages = [];

        for (const rule of validationRules.rules) {
            if (rule.triggers?.length) {
                const match = rule.triggers.some(t => {
                    const val = getNestedValue(data, t.field);
                    const opts = t.options || {};
                    if (t.caseSensitive !== undefined) opts.caseSensitive = t.caseSensitive;
                    return validators[t.operator]?.(val, t.value, opts);
                });
                if (!match) {
                    log.debug('runValidation: rule skipped (no trigger match)', rule.id || rule.name);
                    continue;
                }
            }

            const ruleResult = evaluateRule(rule, data);
            if (!ruleResult.passed) {
                log.debug('runValidation: rule failed', rule.id || rule.name, ruleResult.messages);
                if (ruleResult.messages.length > 0) {
                    allFailedMessages.push(...ruleResult.messages.filter(Boolean));
                } else if (rule.failMessage) {
                    allFailedMessages.push(rule.failMessage);
                } else {
                    allFailedMessages.push(validationRules.defaults?.failMessage || '⚠️ Проверка не пройдена');
                }
            }
        }
        
        log.debug('runValidation: result', { passed: allFailedMessages.length === 0, errors: allFailedMessages.length });
        return { passed: allFailedMessages.length === 0, messages: allFailedMessages };
    }

    // ─────────────────────────────────────────────
    // 🔥 Перехват кнопок
    // ─────────────────────────────────────────────
    function interceptButtons() {
        log.info('interceptButtons: start, buttons to intercept:', VALIDATION_BUTTONS.length);
        
        VALIDATION_BUTTONS.forEach((btnConfig, idx) => {
            log.debug(`interceptButtons: processing button #${idx + 1}`, btnConfig.selector);
            
            const originalBtn = document.querySelector(btnConfig.selector);
            if (!originalBtn) {
                log.warn(`interceptButtons: button NOT FOUND`, btnConfig.selector);
                return;
            }
            log.debug(`interceptButtons: button found`, originalBtn);

            if (originalBtn.getAttribute(`data-${UNIQUE_PREFIX}wrapped`) === 'true') {
                log.debug('interceptButtons: button already wrapped, skipping');
                return;
            }

            const origDisplay = originalBtn.style.display || '';
            const origVisibility = originalBtn.style.visibility || '';

            originalBtn.style.display = 'none';
            originalBtn.setAttribute(`data-${UNIQUE_PREFIX}wrapped`, 'true');
            originalBtn.setAttribute(`data-${UNIQUE_PREFIX}display`, origDisplay);
            originalBtn.setAttribute(`data-${UNIQUE_PREFIX}visibility`, origVisibility);

            originalButtons.push({ original: originalBtn, config: btnConfig });

            const newBtn = originalBtn.cloneNode(true);
            newBtn.removeAttribute(`data-${UNIQUE_PREFIX}wrapped`);
            newBtn.style.display = origDisplay || 'inline-block';
            newBtn.style.visibility = origVisibility || 'visible';
            newBtn.style.opacity = '1';

            const clone = newBtn.cloneNode(true);
            clone.onclick = null;

            clone.addEventListener('click', async (e) => {
                log.info('interceptButtons: button clicked, starting validation');
                e.preventDefault();
                e.stopPropagation();

                const productName = parseProductName();
                const mass = parseProductMass();
                const summaData = parseProductSumma();
                const invoiceInfo = parseInvoiceInfo();
                const productInfo = parseProductInfo();
                const designData = parseDesignBlock();
                const prepress = parseHistoryPrepress();
                const globalPP = parseGlobalPostpress();
                const orders = parseOrders();

                const validationData = {
                    productName,
                    summa: summaData.total,
                    rawSumma: summaData.rawSumma,
                    mass,
                    invoice: invoiceInfo.hasInvoice,
                    invoiceNumber: invoiceInfo.invoiceNumber,
                    client: productInfo.client,
                    deliveryPoint: productInfo.deliveryPoint,
                    address: productInfo.address,
                    prepress,
                    globalPP,
                    orders: orders.map(o => ({
                        id: o.id, name: o.name, paperInfo: o.paperInfo,
                        stock: o.stock, localPP: o.localPP
                    })),
                    stock: orders[0]?.stock,
                    design: designData?.map(d => d.desc).join(' | ') || ''
                };

                log.debug('interceptButtons: validation data prepared', { 
                    productName, hasInvoice: invoiceInfo.hasInvoice, ordersCount: orders.length 
                });

                await fetchValidationRules();
                const result = runValidation(validationData);

                if (!result.passed) {
                    log.warn('interceptButtons: validation FAILED', result.messages);
                    if (api?.showCenterMessage) {
                        const formattedErrors = result.messages.map((msg, idx) => `${idx + 1}. ${msg}`).join('<br><br>');
                        api.showCenterMessage({
                            message: formattedErrors,
                            buttonText: 'Понятно',
                            duration: 0
                        });
                    }
                    return false;
                }

                log.info('interceptButtons: validation PASSED, clicking original button');
                originalBtn.click();
            });

            originalBtn.parentNode?.insertBefore(clone, originalBtn.nextSibling);
            log.debug(`interceptButtons: button #${idx + 1} wrapped successfully`);
        });
        
        log.info('interceptButtons: complete');
    }

    // ─────────────────────────────────────────────
    // 🔥 Парсер для запуска
    // ─────────────────────────────────────────────
    function runParser() {
        log.debug('runParser: start');
        
        if (isRunning) {
            log.debug('runParser: already running, skipping');
            return;
        }
        isRunning = true;

        try {
            const productName = parseProductName();
            const mass = parseProductMass();
            const summaData = parseProductSumma();
            const invoiceInfo = parseInvoiceInfo();
            const productInfo = parseProductInfo();
            const designData = parseDesignBlock();
            const prepress = parseHistoryPrepress();
            const globalPP = parseGlobalPostpress();
            const orders = parseOrders();

            log.debug('runParser: parsed data', {
                productName,
                mass,
                summa: summaData.total,
                hasInvoice: invoiceInfo.hasInvoice,
                ordersCount: orders.length,
                client: productInfo.client
            });

            const currentState = JSON.stringify({
                n: productName, m: mass, s: summaData, inv: invoiceInfo,
                p: productInfo, d: designData, pp: prepress,
                gpp: globalPP?.sort?.(),
                o: orders.map(o => ({ id: o.id, name: o.name, ppCount: o.localPP?.length }))
            });

            if (currentState === lastStateHash) { 
                log.debug('runParser: state unchanged, skipping intercept');
                isRunning = false; 
                return; 
            }
            log.debug('runParser: state changed, scheduling interceptButtons');
            lastStateHash = currentState;

            setTimeout(() => {
                try {
                    interceptButtons();
                } catch (e) {
                    log.error('runParser: interceptButtons error', e);
                }
            }, 300);
        } catch (e) {
            log.error('runParser: parsing error', e);
        } finally {
            isRunning = false;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка observer'ов
    // ─────────────────────────────────────────────
    function setupObserver() {
        log.info('setupObserver: initializing MutationObserver');
        
        if (domObserver) {
            log.debug('setupObserver: disconnecting existing observer');
            domObserver.disconnect();
        }

        domObserver = new MutationObserver((mutations) => {
            log.debug('setupObserver: DOM mutation detected, scheduling runParser');
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runParser, 400);
        });

        domObserver.observe(document.body, { childList: true, subtree: true });
        log.info('setupObserver: observer active on document.body');
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        log.info('🚀 init: module initialization started');
        
        if (active) {
            log.warn('init: module already active, skipping');
            return;
        }
        active = true;
        log.debug('init: config', { 
            uniquePrefix: UNIQUE_PREFIX, 
            rulesUrl: RULES_URL, 
            cacheTime: RULES_CACHE_TIME,
            buttonsCount: VALIDATION_BUTTONS.length,
            debug: config?.debug 
        });

        try {
            setupObserver();
            log.debug('init: observer setup complete');
        } catch (e) {
            log.error('init: setupObserver failed', e);
        }

        setTimeout(() => {
            try {
                runParser();
                log.debug('init: initial runParser scheduled');
            } catch (e) {
                log.error('init: runParser failed', e);
            }
        }, 600);
        
        fetchValidationRules().then(rules => {
            log.info('init: rules loaded, ready to validate');
        }).catch(e => {
            log.error('init: fetchValidationRules failed', e);
        });
        
        log.info('✅ init: module initialization complete');
    }

    function cleanup() {
        log.info('🧹 cleanup: module cleanup started');
        
        if (!active) {
            log.warn('cleanup: module not active, skipping');
            return;
        }
        active = false;

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
            log.debug('cleanup: observer disconnected');
        }
        clearTimeout(debounceTimer);
        log.debug('cleanup: debounce timer cleared');

        originalButtons.forEach(({ original }, idx) => {
            if (original && original.parentNode) {
                const origDisplay = original.getAttribute(`data-${UNIQUE_PREFIX}display`) || '';
                const origVisibility = original.getAttribute(`data-${UNIQUE_PREFIX}visibility`) || '';
                original.style.display = origDisplay;
                original.style.visibility = origVisibility;

                original.removeAttribute(`data-${UNIQUE_PREFIX}wrapped`);
                original.removeAttribute(`data-${UNIQUE_PREFIX}display`);
                original.removeAttribute(`data-${UNIQUE_PREFIX}visibility`);

                const clone = original.nextElementSibling;
                if (clone && clone.getAttribute(`data-${UNIQUE_PREFIX}wrapped`) !== 'true') {
                    clone.remove();
                    log.debug(`cleanup: cloned button #${idx + 1} removed`);
                }
            }
        });
        originalButtons = [];
        log.debug('cleanup: original buttons restored');

        lastStateHash = '';
        isRunning = false;
        
        log.info('✅ cleanup: module cleanup complete');
    }

    function toggle() {
        log.info('🔄 toggle: called, current active:', active);
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    function forceValidate() {
        log.info('⚡ forceValidate: manual validation triggered');
        runParser();
    }

    function reloadRules() {
        log.info('🔄 reloadRules: forcing rules reload');
        rulesLastFetch = 0;
        return fetchValidationRules();
    }

    // 🔥 Авто-запуск
    if (config?.autoInit !== false) {
        log.info('📦 axiomValidator module loaded, autoInit enabled');
        if (document.readyState === 'loading') {
            log.debug('autoInit: waiting for DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', () => {
                log.debug('autoInit: DOMContentLoaded fired, calling init');
                init();
            });
        } else {
            log.debug('autoInit: DOM already loaded, scheduling init');
            setTimeout(init, 100);
        }
    } else {
        log.info('📦 axiomValidator module loaded, autoInit disabled');
    }

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        forceValidate,
        reloadRules,
        runValidation,
        parseOrders,
        fetchValidationRules
    };

})(config, GM, utils, api);