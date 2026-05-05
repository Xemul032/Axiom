// 11axiomValidator.js — модуль валидации заказа перед отправкой
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }
// 🔥 РЕЖИМ: Оверлей-перехватчик (оригинальные кнопки НЕ скрываются)

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
    const DEBUG_OVERLAY = config?.debugOverlay === true;

    // === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
    let debounceTimer = null;
    let isRunning = false;
    let lastStateHash = '';
    let validationRules = null;
    let rulesLastFetch = 0;
    let active = false;
    let domObserver = null;
    let resizeObservers = new Map();
    let scrollHandlers = new Map();

    // === УТИЛИТЫ ===
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

    // === ЗАГРУЗКА ПРАВИЛ ===
    async function fetchValidationRules() {
        const now = Date.now();
        if (validationRules && (now - rulesLastFetch) < RULES_CACHE_TIME) {
            return validationRules;
        }

        return new Promise((resolve) => {
            if (GM && typeof GM.xmlHttpRequest === 'function') {
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: RULES_URL,
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                validationRules = JSON.parse(response.responseText);
                                rulesLastFetch = now;
                                if (GM && typeof GM.setValue === 'function') {
                                    GM.setValue(`${UNIQUE_PREFIX}rules`, response.responseText);
                                    GM.setValue(`${UNIQUE_PREFIX}rules_time`, now);
                                }
                                resolve(validationRules);
                            } catch (e) {
                                resolve(loadCachedRules());
                            }
                        } else {
                            resolve(loadCachedRules());
                        }
                    },
                    onerror: () => {
                        resolve(loadCachedRules());
                    }
                });
            } else {
                fetch(RULES_URL)
                    .then(r => r.json())
                    .then(data => {
                        validationRules = data;
                        rulesLastFetch = now;
                        resolve(validationRules);
                    })
                    .catch(() => resolve(loadCachedRules()));
            }
        });
    }

    async function loadCachedRules() {
        if (GM && typeof GM.getValue === 'function') {
            const cached = await GM.getValue(`${UNIQUE_PREFIX}rules`);
            const cachedTime = await GM.getValue(`${UNIQUE_PREFIX}rules_time`);
            if (cached && cachedTime) {
                try {
                    validationRules = JSON.parse(cached);
                    rulesLastFetch = cachedTime;
                    return validationRules;
                } catch (e) { /* ignore */ }
            }
        }
        validationRules = { rules: [], defaults: { failMessage: '⚠️ Проверка не пройдена' } };
        return validationRules;
    }

    // === УНИВЕРСАЛЬНЫЕ ВАЛИДАТОРЫ ===
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
        exists: (value) => value && String(value).trim() !== '' && !['Не указано', 'Не указана'].includes(String(value).trim()),
        notExists: (value) => !value || String(value).trim() === '' || ['Не указано', 'Не указана'].includes(String(value).trim()),
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
                const result = new Function('ctx', `with(ctx) { return ${formula}; }`)(ctx);
                const exp = parseNum(expected);
                const ops = { gt: r=>r>exp, gte: r=>r>=exp, lt: r=>r<exp, lte: r=>r<=exp, eq: r=>r===exp };
                return ops[operator]?.(result) ?? false;
            } catch (e) {
                return false;
            }
        },
        nestedStatus: (obj, path, expected) => {
            const val = path.split('.').reduce((o, k) => o?.[k], obj);
            const map = { 'не начат': '❌ НЕ НАЧАТ', 'в работе': '⏳ В РАБОТЕ', 'готово': '✅ ГОТОВО', 'нет данных': 'Нет данных' };
            return (val?.status || val) === (map[expected?.toLowerCase()] || expected);
        }
    };

    // === ПАРСИНГ ДАННЫХ ===
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
            if (text.includes('Операция') || text.includes('Участок')) return;
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

    // === ДВИЖОК ВАЛИДАЦИИ ===
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
            message: result ? null : (failMessage || '⚠️ Проверка не пройдена')
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
        if (!validator) return false;
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
        if (!validationRules?.rules?.length) return { passed: true, messages: [] };
        const allFailedMessages = [];

        for (const rule of validationRules.rules) {
            if (rule.triggers?.length) {
                const match = rule.triggers.some(t => {
                    const val = getNestedValue(data, t.field);
                    return validators[t.operator]?.(val, t.value, t.options);
                });
                if (!match) continue;
            }

            const ruleResult = evaluateRule(rule, data);
            if (!ruleResult.passed) {
                if (ruleResult.messages.length > 0) {
                    allFailedMessages.push(...ruleResult.messages);
                }
                if (rule.failMessage) {
                    allFailedMessages.push(rule.failMessage);
                } else if (ruleResult.messages.length === 0) {
                    allFailedMessages.push(validationRules.defaults?.failMessage || '⚠️ Проверка не пройдена');
                }
            }
        }
        return { passed: allFailedMessages.length === 0, messages: allFailedMessages };
    }

    // === ПЕРЕХВАТ КНОПОК ЧЕРЕЗ ОВЕРЛЕЙ ===
    // ✅ ОРИГИНАЛЬНЫЕ КНОПКИ НЕ СКРЫВАЮТСЯ!
    function interceptButtons() {
        VALIDATION_BUTTONS.forEach(btnConfig => {
            const originalBtn = document.querySelector(btnConfig.selector);
            if (!originalBtn) return;
            
            // Проверяем, не создан ли уже оверлей (используем setAttribute/getAttribute)
            if (originalBtn.getAttribute(`${UNIQUE_PREFIX}overlay`) === 'true') return;
            originalBtn.setAttribute(`${UNIQUE_PREFIX}overlay`, 'true');

            // Создаем оверлей
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'pointer';
            overlay.style.background = DEBUG_OVERLAY ? 'rgba(255, 0, 0, 0.15)' : 'transparent';
            overlay.style.border = DEBUG_OVERLAY ? '1px dashed rgba(255, 0, 0, 0.5)' : 'none';
            overlay.style.borderRadius = originalBtn.style.borderRadius || '4px';
            overlay.setAttribute(`${UNIQUE_PREFIX}overlay-target`, 'true');

            // Обеспечиваем позиционирование родителя
            const btnStyle = window.getComputedStyle(originalBtn);
            const parentStyle = window.getComputedStyle(originalBtn.parentNode);
            if (btnStyle.position === 'static' && parentStyle.position === 'static') {
                originalBtn.style.position = 'relative';
            }

            // Вставляем оверлей ПОСЛЕ кнопки (чтобы не перекрывать вложенный контент)
            if (originalBtn.parentNode) {
                originalBtn.parentNode.insertBefore(overlay, originalBtn.nextSibling);
            }

            // Функция обновления позиции оверлея
            const updateOverlayPosition = () => {
                const rect = originalBtn.getBoundingClientRect();
                const parentRect = originalBtn.parentNode.getBoundingClientRect();
                overlay.style.top = (rect.top - parentRect.top) + 'px';
                overlay.style.left = (rect.left - parentRect.left) + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
            };
            updateOverlayPosition();

            // Подписка на ResizeObserver
            if (typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => {
                    updateOverlayPosition();
                });
                ro.observe(originalBtn);
                resizeObservers.set(originalBtn, ro);
            }

            // Подписка на scroll для коррекции позиции
            const onScroll = () => updateOverlayPosition();
            window.addEventListener('scroll', onScroll, { passive: true });
            scrollHandlers.set(originalBtn, onScroll);

            // Обработчик клика по оверлею
            overlay.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

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

                await fetchValidationRules();
                const result = runValidation(validationData);

                if (!result.passed) {
                    if (api?.showCenterMessage) {
                        const formattedErrors = result.messages.map((msg, idx) => `${idx + 1}. ${msg}`).join('<br><br>');
                        api.showCenterMessage({
                            message: formattedErrors,
                            buttonText: 'Понятно',
                            duration: 0
                        });
                    }
                    // Оверлей НЕ удаляем — пользователь должен исправить ошибки
                    return;
                }

                // ✅ Валидация пройдена: удаляем оверлей и кликаем по оригиналу
                removeOverlay(originalBtn);
                // Небольшая задержка для визуального "отклика"
                setTimeout(() => originalBtn.click(), 50);
            });
        });
    }

    // Удаление оверлея для конкретной кнопки
    function removeOverlay(originalBtn) {
        if (!originalBtn) return;
        
        originalBtn.removeAttribute(`${UNIQUE_PREFIX}overlay`);
        
        // Удаляем оверлей (следующий элемент после кнопки)
        const overlay = originalBtn.nextElementSibling;
        if (overlay && overlay.getAttribute(`${UNIQUE_PREFIX}overlay-target`) === 'true') {
            // Отписываемся от scroll
            const onScroll = scrollHandlers.get(originalBtn);
            if (onScroll) {
                window.removeEventListener('scroll', onScroll);
                scrollHandlers.delete(originalBtn);
            }
            overlay.remove();
        }
        
        // Очищаем ResizeObserver
        const ro = resizeObservers.get(originalBtn);
        if (ro) {
            ro.disconnect();
            resizeObservers.delete(originalBtn);
        }
        
        // Возвращаем позиционирование, если меняли
        if (originalBtn.style.position === 'relative') {
            const cs = window.getComputedStyle(originalBtn);
            if (!originalBtn.getAttribute('style')?.match(/position\s*:\s*relative/)) {
                originalBtn.style.position = '';
            }
        }
    }

    // === ПАРСЕР ===
    function runParser() {
        if (isRunning) return;
        isRunning = true;

        const productName = parseProductName();
        const mass = parseProductMass();
        const summaData = parseProductSumma();
        const invoiceInfo = parseInvoiceInfo();
        const productInfo = parseProductInfo();
        const designData = parseDesignBlock();
        const prepress = parseHistoryPrepress();
        const globalPP = parseGlobalPostpress();
        const orders = parseOrders();

        const currentState = JSON.stringify({
            n: productName, m: mass, s: summaData, inv: invoiceInfo,
            p: productInfo, d: designData, pp: prepress,
            gpp: globalPP?.sort?.(),
            o: orders.map(o => ({ id: o.id, name: o.name, ppCount: o.localPP?.length }))
        });

        if (currentState === lastStateHash) { isRunning = false; return; }
        lastStateHash = currentState;

        setTimeout(interceptButtons, 300);
        isRunning = false;
    }

    // === НАБЛЮДАТЕЛИ ===
    function setupObserver() {
        if (domObserver) domObserver.disconnect();
        domObserver = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runParser, 400);
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    function waitForButtons(callback) {
        const maxAttempts = 30;
        let attempts = 0;
        const check = () => {
            attempts++;
            const found = VALIDATION_BUTTONS.some(btn => document.querySelector(btn.selector));
            if (found) {
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 300);
            }
        };
        check();
    }

    // === API МОДУЛЯ ===
    function init() {
        if (active) return;
        active = true;
        setupObserver();
        waitForButtons(() => setTimeout(runParser, 200));
        fetchValidationRules();
    }

    function cleanup() {
        if (!active) return;
        active = false;

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        clearTimeout(debounceTimer);

        // Удаляем все оверлеи
        document.querySelectorAll(`[${UNIQUE_PREFIX}overlay="true"]`).forEach(btn => {
            removeOverlay(btn);
        });
        
        // Очищаем все ResizeObservers
        resizeObservers.forEach(ro => ro.disconnect());
        resizeObservers.clear();
        
        // Очищаем все scroll handlers
        scrollHandlers.forEach((handler, btn) => {
            window.removeEventListener('scroll', handler);
        });
        scrollHandlers.clear();

        lastStateHash = '';
        isRunning = false;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    function forceValidate() {
        runParser();
    }

    function reloadRules() {
        rulesLastFetch = 0;
        return fetchValidationRules();
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
        forceValidate,
        reloadRules,
        runValidation,
        parseOrders,
        fetchValidationRules
    };

})(config, GM, utils, api);