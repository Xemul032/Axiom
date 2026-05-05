// a2xiomValidator.js — модуль валидации заказа перед отправкой
// Версия: 2.1 (Fix calc logic + Advanced Debugging)

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация
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

    // 🔥 Система логирования
    const log = {
        prefix: '[AxiomValidator]',
        info: (...args) => console.log(log.prefix, 'ℹ️', ...args),
        warn: (...args) => console.warn(log.prefix, '⚠️', ...args),
        error: (...args) => console.error(log.prefix, '❌', ...args),
        debug: (...args) => {
            if (config?.debug === true) {
                console.log(log.prefix, '🔍', ...args);
            }
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
        // Убираем пробелы, заменяем запятую на точку (для 1 695 -> 1695.0)
        const numStr = String(str).replace(/\s/g, '').replace(',', '.');
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

    // ────────────────────────────────────────────
    //  Загрузка правил
    // ─────────────────────────────────────────────
    async function fetchValidationRules() {
        log.debug('Fetching rules...');
        const now = Date.now();
        
        // Проверка кэша в памяти
        if (validationRules && (now - rulesLastFetch) < RULES_CACHE_TIME) {
            log.debug('Using cached rules from memory.');
            return validationRules;
        }

        return new Promise((resolve) => {
            const successHandler = (responseText) => {
                try {
                    validationRules = JSON.parse(responseText);
                    rulesLastFetch = now;
                    log.info('Rules loaded successfully. Count:', validationRules.rules?.length || 0);
                    
                    // Сохраняем в GM Storage
                    if (typeof GM_setValue !== 'undefined') {
                        GM_setValue(`${UNIQUE_PREFIX}rules`, responseText);
                        GM_setValue(`${UNIQUE_PREFIX}rules_time`, now);
                    }
                    resolve(validationRules);
                } catch (e) {
                    log.warn('JSON parse error:', e.message);
                    resolve(loadCachedRules());
                }
            };

            const failHandler = (reason) => {
                log.warn('Fetch failed, loading cache. Reason:', reason);
                resolve(loadCachedRules());
            };

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: RULES_URL,
                    onload: (response) => {
                        if (response.status === 200) successHandler(response.responseText);
                        else failHandler(`HTTP ${response.status}`);
                    },
                    onerror: (err) => failHandler(err)
                });
            } else {
                fetch(RULES_URL)
                    .then(r => r.ok ? r.text() : Promise.reject(r.status))
                    .then(successHandler)
                    .catch(failHandler);
            }
        });
    }

    function loadCachedRules() {
        if (typeof GM_getValue !== 'undefined') {
            const cached = GM_getValue(`${UNIQUE_PREFIX}rules`);
            const cachedTime = GM_getValue(`${UNIQUE_PREFIX}rules_time`);
            if (cached && cachedTime) {
                try {
                    validationRules = JSON.parse(cached);
                    rulesLastFetch = cachedTime;
                    log.info('Loaded rules from GM cache.');
                    return validationRules;
                } catch (e) { /* ignore */ }
            }
        }
        log.info('No cache found, using empty defaults.');
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
        
        // 🔥 ИСПРАВЛЕННЫЙ CALC
        calc: (data, formula, expected, operator) => {
            try {
                // 1. Подготовка контекста переменных
                const ctx = {
                    req: parseNum(data?.stock?.req) || 0,
                    stock: parseNum(data?.stock?.stock) || 0,
                    others: parseNum(data?.stock?.others) || 0,
                    res: parseNum(data?.stock?.res) || 0,
                    summa: parseNum(data?.summa) || 0,
                    mass: parseNum(data?.mass) || 0
                };

                // 2. Безопасная формула (удаляем опасные символы)
                const safeFormula = String(formula).replace(/[^\w\s+\-*/().,<>=!&|?:]/g, '');
                
                // 3. Создание функции
                // Переменные передаются как аргументы, чтобы избежать подмены строк
                const evaluator = new Function(
                    'req', 'stock', 'others', 'res', 'summa', 'mass',
                    '"use strict"; return (' + safeFormula + ')'
                );
                
                // 4. Вычисление
                const result = evaluator(
                    ctx.req, ctx.stock, ctx.others, ctx.res, ctx.summa, ctx.mass
                );
                
                // 5. Сравнение результата
                const exp = parseNum(expected);
                const ops = { 
                    gt: r => r > exp, 
                    gte: r => r >= exp, 
                    lt: r => r < exp, 
                    lte: r => r <= exp, 
                    eq: r => r === exp,
                    ne: r => r !== exp 
                };
                
                const isPassed = ops[operator]?.(result) ?? false;

                // 🔍 ДЕТАЛЬНОЕ ЛОГГИРОВАНИЕ (Включается через config.debug = true)
                log.debug('CALC CHECK:', {
                    formula: safeFormula,
                    inputs: { req: ctx.req, stock: ctx.stock }, // Показывает, что парсер нашел
                    rawResult: result,
                    check: `${result} ${operator} ${exp}`,
                    final: isPassed
                });

                return isPassed;
            } catch (e) {
                log.error('Calc execution error:', e.message, { formula });
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
    // 🔥 Парсинг данных из DOM
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

        // Поиск клиента
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

        // Поиск точки выдачи
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

        // Поиск адреса
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
                layout.status = (layout.who && layout.when) ? '✅ ГОТОВО' : (layout.who ? ' В РАБОТЕ' : '❌ НЕ НАЧАТ');
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

    // 🔥 Парсинг списка ордеров (включая складские остатки)
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
            
            //  Считываем данные склада
            let stock = { req: '-', res: '-', stock: '-', others: '-' };
            const sklad = block.querySelector('td.SkladBlock');
            if (sklad) {
                sklad.querySelectorAll('tr').forEach(tr => {
                    const [k, v] = tr.querySelectorAll('td');
                    if (k && v) {
                        const key = clean(k.textContent);
                        const val = clean(v.textContent) || '-';
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
        
        // Если проверяем массив ордеров (source: orders)
        if (source === 'orders' && data.orders?.length) {
            const orders = condition.checkAll ? data.orders : [data.orders[0]];
            const results = orders.map(ord => {
                // Сливаем данные ордера с общими данными
                const ctx = { ...data, ...ord, stock: ord.stock };
                const fieldValue = field ? getNestedValue(ctx, field) : ctx;
                return runValidator(operator, fieldValue, value, options, ctx, formula, expectedOperator);
            });
            
            // Логика объединения результатов (any/all)
            const passed = condition.any ? results.some(r => r) : results.every(r => r);
            return {
                passed,
                message: passed ? null : (failMessage || '⚠️ Проверка не пройдена')
            };
        }

        // Обычная проверка одного поля
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
            log.warn('Unknown operator:', operator);
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
        } else { // OR
            const passed = results.some(r => r.passed);
            return {
                passed,
                messages: passed ? [] : results.map(r => r.message).filter(Boolean)
            };
        }
    }

    function runValidation(data) {
        log.info(' Running validation checks...');
        
        if (!validationRules?.rules?.length) {
            log.debug('No rules defined, skipping validation.');
            return { passed: true, messages: [] };
        }
        
        const allFailedMessages = [];

        for (const rule of validationRules.rules) {
            // Проверка триггеров (когда правило вообще применять)
            if (rule.triggers?.length) {
                const match = rule.triggers.some(t => {
                    const val = getNestedValue(data, t.field);
                    const opts = t.options || {};
                    if (t.caseSensitive !== undefined) opts.caseSensitive = t.caseSensitive;
                    return validators[t.operator]?.(val, t.value, opts);
                });
                if (!match) {
                    log.debug(`Rule "${rule.name}" skipped (triggers not matched).`);
                    continue;
                }
            }

            log.debug(`Evaluating rule: ${rule.name}`);
            const ruleResult = evaluateRule(rule, data);
            
            if (!ruleResult.passed) {
                log.warn(`Rule "${rule.name}" FAILED.`);
                if (ruleResult.messages.length > 0) {
                    allFailedMessages.push(...ruleResult.messages.filter(Boolean));
                } else if (rule.failMessage) {
                    allFailedMessages.push(rule.failMessage);
                } else {
                    allFailedMessages.push(validationRules.defaults?.failMessage || '⚠️ Проверка не пройдена');
                }
            } else {
                log.debug(`Rule "${rule.name}" passed.`);
            }
        }
        
        log.info('Validation result:', allFailedMessages.length === 0 ? '✅ PASSED' : '❌ FAILED');
        return { passed: allFailedMessages.length === 0, messages: allFailedMessages };
    }

    // ────────────────────────────────────────────
    //  Перехват кнопок
    // ─────────────────────────────────────────────
    function interceptButtons() {
        log.debug('Attempting to intercept buttons...');
        
        VALIDATION_BUTTONS.forEach((btnConfig, idx) => {
            const originalBtn = document.querySelector(btnConfig.selector);
            if (!originalBtn) {
                log.debug(`Button #${idx + 1} not found: ${btnConfig.selector}`);
                return;
            }

            // Защита от дублирования
            if (originalBtn.getAttribute(`data-${UNIQUE_PREFIX}wrapped`) === 'true') return;

            // Скрываем оригинал
            const origDisplay = originalBtn.style.display || '';
            originalBtn.style.display = 'none';
            originalBtn.setAttribute(`data-${UNIQUE_PREFIX}wrapped`, 'true');
            originalBtn.setAttribute(`data-${UNIQUE_PREFIX}display`, origDisplay);

            originalButtons.push({ original: originalBtn, config: btnConfig });

            // Создаем клон
            const clone = originalBtn.cloneNode(true);
            clone.removeAttribute(`data-${UNIQUE_PREFIX}wrapped`);
            clone.style.display = origDisplay || 'inline-block';
            clone.onclick = null; // Сброс старых событий

            // 🔥 НОВЫЙ ОБРАБОТЧИК
            clone.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                log.info('🖱️ Button clicked! Starting validation sequence...');

                // Сбор данных
                const productName = parseProductName();
                const mass = parseProductMass();
                const summaData = parseProductSumma();
                const invoiceInfo = parseInvoiceInfo();
                const productInfo = parseProductInfo();
                const designData = parseDesignBlock();
                const prepress = parseHistoryPrepress();
                const globalPP = parseGlobalPostpress();
                const orders = parseOrders();

                log.debug('Parsed Data:', { productName, client: productInfo.client, ordersCount: orders.length });

                // Формируем объект для валидации
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
                    stock: orders[0]?.stock, // Для глобальных проверок берем первый ордер
                    design: designData?.map(d => d.desc).join(' | ') || ''
                };

                // Загружаем правила (если не кэшированы)
                await fetchValidationRules();
                const result = runValidation(validationData);

                if (!result.passed) {
                    log.warn('Validation FAILED. Errors:', result.messages);
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

                log.info('✅ Validation PASSED. Clicking original button...');
                // Если все ок — жмем настоящую кнопку
                originalBtn.click();
            });

            originalBtn.parentNode?.insertBefore(clone, originalBtn.nextSibling);
            log.debug(`Button #${idx + 1} intercepted successfully.`);
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Парсер состояния (Debounce)
    // ─────────────────────────────────────────────
    function runParser() {
        if (isRunning) return;
        isRunning = true;

        // Грубый хэш состояния для предотвращения лишних проверок
        const productName = parseProductName();
        const orders = parseOrders(); // Считаем количество ордеров
        
        const currentState = JSON.stringify({
            n: productName,
            o: orders.length
        });

        if (currentState === lastStateHash) { 
            isRunning = false; 
            return; 
        }
        lastStateHash = currentState;
        
        log.debug('DOM state changed. Running parser...');
        setTimeout(() => {
            try {
                interceptButtons();
            } catch (err) {
                log.error('Error in interceptButtons:', err);
            }
            isRunning = false;
        }, 300);
    }

    // ─────────────────────────────────────────────
    // 🔥 Observer & Lifecycle
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (domObserver) domObserver.disconnect();

        domObserver = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runParser, 500);
        });

        domObserver.observe(document.body, { childList: true, subtree: true });
        log.info('MutationObserver started.');
    }

    function init() {
        if (active) return;
        active = true;
        log.info(' Module initialized.');

        setupObserver();
        setTimeout(runParser, 600);
        fetchValidationRules();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        log.info('🔴 Module cleanup.');

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        clearTimeout(debounceTimer);

        // Восстанавливаем кнопки
        originalButtons.forEach(({ original }) => {
            if (original && original.parentNode) {
                original.style.display = original.getAttribute(`data-${UNIQUE_PREFIX}display`) || '';
                original.removeAttribute(`data-${UNIQUE_PREFIX}wrapped`);
                original.removeAttribute(`data-${UNIQUE_PREFIX}display`);
                
                // Удаляем клон
                const clone = original.nextElementSibling;
                if (clone && clone.getAttribute(`data-${UNIQUE_PREFIX}wrapped`) !== 'true') {
                    clone.remove();
                }
            }
        });
        originalButtons = [];
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() { return active; }

    // Автозапуск
    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }

    return { init, cleanup, toggle, isActive, reloadRules: () => { rulesLastFetch = 0; return fetchValidationRules(); } };

})(config, GM, utils, api);