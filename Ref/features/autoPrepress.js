// autoPrepress.js — модуль кнопки «Автопрепресс» для Аксиомы
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, openTool }
// ⚠️ ВСЕ НАСТРОЙКИ (URL, селекторы, условия) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥

    // URL инструмента препресса
    const TOOL_URL = 'http://192.168.1.61:5000';
    const AP_VER = '3.13';

    // 🔥 Уникальный префикс для изоляции стилей и ID
    const UNIQUE_PREFIX = config?.uniquePrefix || 'auto-prepress-';

    // Условия появления кнопки
    const ALLOWED_POSTPRESS = 'Резка на гильотине стопой (50 х 60 мм и больше)';
    const STATUS_IMG_PATH = '/axiom/img/status/status-files.png';
    const ALLOWED_LABELS = [
        'Цифра (ТАСМА)',
        'Цифра (Копицентр)',
        '⚡️МАЛЫЕ ТИРАЖИ ЦИФРА⚡️'
    ];

    // Функции, которые перехватываются для определения номера заказа
    const HOOK_FUNCTIONS = ['ProductForm', 'ShowForm', 'OrderEdit'];

    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[Автопрепресс]';

    // 🔥 Внутреннее состояние
    let active = false;
    let modalOverlay = null;
    let modalFrame = null;
    let productIdObserver = null;
    let parseDebounceTimer = null;
    let placeButtonInterval = null;
    let hookInterval = null;
    let lastParsedOrderId = null;

    // 🔥 Сохраняем оригинальные функции window для восстановления при cleanup
    const originalWindowFunctions = {};

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования (только консоль, без UI)
    // ─────────────────────────────────────────────
    function log(...args) {
        if (LOGGING_ENABLED) {
            console.log(LOG_PREFIX, ...args);
        }
    }

    function warn(...args) {
        if (LOGGING_ENABLED) {
            console.warn(LOG_PREFIX, ...args);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Внедрение стилей (с UNIQUE_PREFIX)
    // ─────────────────────────────────────────────
    function injectStyles() {
        const styleId = `${UNIQUE_PREFIX}modal-styles`;
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #${UNIQUE_PREFIX}overlay {
                position: fixed; inset: 0; z-index: 2147483646;
                background: rgba(15, 23, 42, .55);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden;
                transition: opacity .3s ease, visibility .3s ease;
            }
            #${UNIQUE_PREFIX}overlay.${UNIQUE_PREFIX}visible { opacity: 1; visibility: visible; }
            #${UNIQUE_PREFIX}modal {
                position: relative;
                width: 95vw;
                height: 95vh; min-height: 25vh; max-height: 95vh;
                background: #fff; border-radius: 18px;
                box-shadow: 0 25px 60px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08) inset;
                display: flex; flex-direction: column; overflow: hidden;
                transform: translateY(30px) scale(.96);
                transition: transform .35s cubic-bezier(.22,1,.36,1);
            }
            #${UNIQUE_PREFIX}overlay.${UNIQUE_PREFIX}visible #${UNIQUE_PREFIX}modal { transform: translateY(0) scale(1); }
            #${UNIQUE_PREFIX}modal-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 8px 16px;
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                color: #fff; flex-shrink: 0; user-select: none;
            }
            #${UNIQUE_PREFIX}modal-title {
                font: 600 15px/1 'Segoe UI', system-ui, sans-serif;
                letter-spacing: .3px;
                display: flex; align-items: center; gap: 6px;
            }
            #${UNIQUE_PREFIX}modal-title::before { content: '🖨'; font-size: 18px; }
            #${UNIQUE_PREFIX}modal-close {
                width: 30px; height: 30px; border: 0; border-radius: 8px;
                background: rgba(255,255,255,.15); color: #fff; font-size: 18px; line-height: 1;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background .2s ease, transform .2s ease;
            }
            #${UNIQUE_PREFIX}modal-close:hover { background: rgba(255,255,255,.3); transform: rotate(90deg); }
            #${UNIQUE_PREFIX}modal-frame { flex: 1; width: 100%; border: 0; background: #f8fafc; overflow: auto; }
            #${UNIQUE_PREFIX}modal-loader {
                position: absolute; inset: 0;
                display: flex; align-items: center; justify-content: center;
                background: #fff; transition: opacity .3s ease; pointer-events: none;
            }
            #${UNIQUE_PREFIX}modal-loader.${UNIQUE_PREFIX}hidden { opacity: 0; }
            .${UNIQUE_PREFIX}spinner {
                width: 44px; height: 44px;
                border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%;
                animation: ${UNIQUE_PREFIX}spin .8s linear infinite;
            }
            @keyframes ${UNIQUE_PREFIX}spin { to { transform: rotate(360deg); } }

            #${UNIQUE_PREFIX}btn:hover, #${UNIQUE_PREFIX}btn:focus, #${UNIQUE_PREFIX}btn.focus {
                color: #333 !important;
                background-color: #e6e6e6 !important;
                background-image: linear-gradient(to bottom, #e6e6e6 0%, #d4d4d4 100%) !important;
                background-repeat: repeat-x !important;
                border-color: #adadad !important;
            }
            #${UNIQUE_PREFIX}btn:active, #${UNIQUE_PREFIX}btn.active, #${UNIQUE_PREFIX}btn:active:hover, #${UNIQUE_PREFIX}btn:active:focus {
                color: #333 !important; background-color: #d4d4d4 !important;
                background-image: none !important; border-color: #8c8c8c !important;
                box-shadow: inset 0 3px 5px rgba(0,0,0,.125) !important; outline: 0 !important;
            }
            #${UNIQUE_PREFIX}btn:focus { outline: 5px auto -webkit-focus-ring-color !important; outline-offset: -2px !important; }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Построение модального окна
    // ─────────────────────────────────────────────
    function buildModal() {
        if (modalOverlay) return;
        injectStyles();

        modalOverlay = document.createElement('div');
        modalOverlay.id = `${UNIQUE_PREFIX}overlay`;

        const modal = document.createElement('div');
        modal.id = `${UNIQUE_PREFIX}modal`;

        const header = document.createElement('div');
        header.id = `${UNIQUE_PREFIX}modal-header`;
        const title = document.createElement('div');
        title.id = `${UNIQUE_PREFIX}modal-title`;
        title.textContent = 'Автопрепресс';
        const closeBtn = document.createElement('button');
        closeBtn.id = `${UNIQUE_PREFIX}modal-close`;
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Закрыть';
        closeBtn.addEventListener('click', closeModal);
        header.append(title, closeBtn);

        modalFrame = document.createElement('iframe');
        modalFrame.id = `${UNIQUE_PREFIX}modal-frame`;
        modalFrame.setAttribute('allow', 'fullscreen');

        const loader = document.createElement('div');
        loader.id = `${UNIQUE_PREFIX}modal-loader`;
        loader.innerHTML = `<div class="${UNIQUE_PREFIX}spinner"></div>`;
        modalFrame.addEventListener('load', () => loader.classList.add(`${UNIQUE_PREFIX}hidden`));

        modal.append(header, modalFrame, loader);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
    }

    function openModal(url) {
        buildModal();
        const loader = modalOverlay.querySelector(`#${UNIQUE_PREFIX}modal-loader`);
        if (loader) loader.classList.remove(`${UNIQUE_PREFIX}hidden`);
        modalFrame.src = url;
        requestAnimationFrame(() => modalOverlay.classList.add(`${UNIQUE_PREFIX}visible`));
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove(`${UNIQUE_PREFIX}visible`);
        setTimeout(() => { if (modalFrame) modalFrame.src = 'about:blank'; }, 350);
    }

    // ─────────────────────────────────────────────
    // 🔥 Перехват функций window (с сохранением оригиналов)
    // ─────────────────────────────────────────────
    function hook(name) {
        const orig = window[name];
        if (typeof orig !== 'function' || orig.__apHooked) return;

        // 🔥 Сохраняем оригинал для восстановления при cleanup
        if (!originalWindowFunctions[name]) {
            originalWindowFunctions[name] = orig;
        }

        const wrapped = function (id) {
            if (id !== undefined && id !== null && /^\d+$/.test(String(id))) {
                window.__apOrder = String(id);
            }
            return orig.apply(this, arguments);
        };
        wrapped.__apHooked = true;
        try { window[name] = wrapped; } catch (e) {}
    }

    function hookAll() {
        HOOK_FUNCTIONS.forEach(hook);
    }

    // 🔥 Восстановление оригинальных функций window
    function unhookAll() {
        for (const name in originalWindowFunctions) {
            try {
                window[name] = originalWindowFunctions[name];
            } catch (e) {}
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Определение номера заказа
    // ─────────────────────────────────────────────
    function detectOrder() {
        if (window.__apOrder) return window.__apOrder;
        const bodyText = document.body ? document.body.innerText : '';
        const bc = document.querySelector('img[src*="barcode.php?code="]');
        if (bc) {
            const m = bc.src.match(/code=0*([1-9]\d{4,})/);
            if (m) return m[1];
        }
        for (const a of document.querySelectorAll('[href*="ProductId="],[href*="?id="]')) {
            const m = (a.getAttribute('href') || '').match(/(?:ProductId=|[?&]id=)(\d{5,})/);
            if (m) return m[1];
        }
        const big = bodyText.match(/\b(3\d{5})\b/);
        return big ? big[1] : null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Утилиты и парсинг параметров
    // ─────────────────────────────────────────────
    const clean = t => t ? t.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim() : '';

    function getInfoText() {
        const node = document.querySelector('.tab-pane.active, .tab-content, .panel, .info, [id*="info"], [class*="info"]') || document.body;
        return (node && node.textContent) ? node.textContent : '';
    }

    function detectSheet() {
        function val(sel) {
            for (const el of document.querySelectorAll(sel)) {
                if (el.offsetParent === null && el.type === 'hidden') continue;
                const v = parseFloat(String(el.value || '').replace(',', '.'));
                if (v > 0) return v;
            }
            return null;
        }
        const w = val('input.SheetWidth'), h = val('input.SheetHeight');
        return (w > 0 && h > 0) ? { w, h } : null;
    }

    function detectVidy(text) {
        const match = text.match(/(\d+)\s*вид[а-яё]*\s*по\s*(\d+)\s*шт/i);
        if (match) return { vidy: match[1], per_vid: match[2] };
        const ov = text.match(/(\d+)\s*вид[а-яё]*/i);
        return ov ? { vidy: ov[1] } : null;
    }

    function detectBleed(text) {
        const match = text.match(/вылет[а-яё]*\s*[:\-—]?\s*(?:по\s+)?([\d.,]+)\s*мм/i);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
    }

    function allColors() {
        const norm = el => (el && el.textContent || '').replace(/ /g, ' ').trim();
        const asNM = t => { const m = t.match(/^(\d+)\s*\+\s*(\d+)$/); return m ? m[1] + '+' + m[2] : null; };
        const out = [];
        for (const cell of document.querySelectorAll('td, th')) {
            if (!/^\s*Цветность\s*$/i.test(norm(cell))) continue;
            const row = cell.closest('tr'); if (!row) continue;
            for (const el of row.querySelectorAll('*')) {
                if (el.children.length) continue;
                const v = asNM(norm(el)); if (v) { out.push(v); break; }
            }
        }
        if (out.length) return out;
        for (const el of document.querySelectorAll('span, b, strong, td, div')) {
            if (el.children.length) continue;
            const v = asNM(norm(el)); if (v) { out.push(v); break; }
        }
        return out;
    }

    function parseSchemaNode(node) {
        const t = node.textContent.replace(/ /g, ' ');
        const r = {};
        let m = t.match(/Запечатываемое\s*поле\s+(\d+(?:[.,]\d+)?)\s*[xхXХ×*]\s*(\d+(?:[.,]\d+)?)/i);
        if (m) { r.fw = parseFloat(m[1].replace(',', '.')); r.fh = parseFloat(m[2].replace(',', '.')); }
        m = t.match(/Вылет[а-яё]*\s*[:\-—]?\s*(?:по\s+)?([\d.,]+)\s*мм/i);
        if (m) r.bleed = parseFloat(m[1].replace(',', '.'));
        if (/Чужой\s*оборот/i.test(t)) r.sharedBack = true;
        m = t.match(/КПЛ\s*[:\-]?\s*(\d+)/i);
        if (m) r.kpl = parseInt(m[1], 10);
        return r;
    }

    function schemaNodes() {
        return [...document.querySelectorAll('[id^="SchemaContent"]')]
            .filter(el => /Запечатываемое\s*поле/i.test(el.textContent));
    }

    function readSchema() {
        const nodes = schemaNodes();
        if (!nodes.length) return null;
        const r = parseSchemaNode(nodes[0]);
        return (r.fw || r.bleed != null || r.kpl != null) ? r : null;
    }

    function detectOrders() {
        const nodes = schemaNodes();
        if (nodes.length < 2) return [];
        const sw = [...document.querySelectorAll('input.SheetWidth')].map(e => parseFloat(String(e.value || '').replace(',', '.')));
        const sh = [...document.querySelectorAll('input.SheetHeight')].map(e => parseFloat(String(e.value || '').replace(',', '.')));
        const cols = allColors();
        return nodes.map((node, i) => {
            const r = parseSchemaNode(node);
            const o = {};
            if (r.fw) o.fw = r.fw; if (r.fh) o.fh = r.fh;
            if (r.bleed != null) o.bleed = r.bleed; if (r.kpl != null) o.kpl = r.kpl;
            if (cols[i]) o.colors = cols[i];
            if (sw[i] > 0 && sh[i] > 0) { o.sw = sw[i]; o.sh = sh[i]; }
            return o;
        });
    }

    function detectTrim() {
        const t = (document.body ? document.body.innerText : '') || '';
        const m = t.match(/шт\.?\s*,?\s*(\d+(?:[.,]\d+)?)\s*[xхXХ×*]\s*(\d+(?:[.,]\d+)?)/i);
        return m ? { tw: parseFloat(m[1].replace(',', '.')), th: parseFloat(m[2].replace(',', '.')) } : null;
    }

    function detectGrid() {
        const sizes = new Set();
        for (const tbl of document.querySelectorAll('table.pages')) {
            const rows = tbl.rows;
            if (!rows || rows.length === 0) continue;
            const c0 = rows[0].cells.length; if (c0 === 0) continue;
            let regular = true;
            for (const row of rows) if (row.cells.length !== c0) { regular = false; break; }
            if (!regular) continue;
            if (c0 * rows.length >= 2) sizes.add(c0 + 'x' + rows.length);
        }
        if (sizes.size !== 1) return null;
        const [cols, rows] = [...sizes][0].split('x').map(Number);
        return { cols, rows };
    }

    // ─────────────────────────────────────────────
    // 🔥 Парсинг постпечаток, тиража и тиражей по ордерам
    // ─────────────────────────────────────────────
    function parseGlobalPostpress() {
        const globalOps = [];
        const orderBlocks = Array.from(document.querySelectorAll('.formblock')).filter(b => b.className.match(/Order\d+/) && b.offsetParent !== null);
        if (!orderBlocks.length) return globalOps;
        let next = orderBlocks[orderBlocks.length - 1].nextElementSibling;
        while (next) {
            const table = next.tagName === 'TABLE' ? next : next.querySelector('table.table-condensed');
            if (table) {
                table.querySelectorAll('tr[class^="PostpressPrice"]').forEach(row => {
                    const b = row.querySelector('b');
                    if (b) { const v = clean(b.textContent); if (v && !globalOps.includes(v)) globalOps.push(v); }
                });
                if (globalOps.length) break;
            }
            next = next.nextElementSibling;
        }
        return globalOps;
    }

    function parseLocalPostpress() {
        const orders = [];
        document.querySelectorAll('.formblock').forEach(block => {
            const match = block.className.match(/Order(\d+)/);
            if (!match || block.offsetParent === null) return;
            const orderId = match[1];
            const nameEl = block.querySelector('.OrderName');
            const orderName = nameEl ? (nameEl.value || clean(nameEl.textContent)) : 'Без названия';
            const localPP = [];
            block.querySelectorAll('table.table-condensed tr[class^="PostpressPrice"], table.inner tr[class^="PostpressPrice"]').forEach(row => {
                const b = row.querySelector('b');
                if (b) { const v = clean(b.textContent); if (v) localPP.push(v); }
            });
            orders.push({ id: orderId, name: orderName, postpress: localPP });
        });
        return orders;
    }

    function parseTirazh() {
        const el = document.querySelector('#Tirazh');
        if (!el) return null;
        const num = parseInt(String(el.value || el.textContent).replace(/\s/g, ''), 10);
        return isNaN(num) ? null : num;
    }

    function parseOrderSums() {
        const orderSums = [];
        document.querySelectorAll('.formblock').forEach(block => {
            const match = block.className.match(/Order(\d+)/);
            if (!match || block.offsetParent === null) return;

            const orderId = match[1];
            const nameEl = block.querySelector('.OrderName');
            const orderName = nameEl ? (nameEl.value || clean(nameEl.textContent)) : 'Без названия';

            let sum = null;
            let vidy = null;
            let perVid = null;

            const h4s = block.querySelectorAll('h4');
            for (const h4 of h4s) {
                const text = clean(h4.textContent);
                const m = text.match(/(\d+)\s*вид[а-яё]*\s*по\s*(\d+)\s*шт/i);
                if (m) {
                    vidy = parseInt(m[1], 10);
                    perVid = parseInt(m[2], 10);
                    sum = vidy * perVid;
                    break;
                }
                const m2 = text.match(/(\d+)\s*шт/i);
                if (m2) {
                    vidy = 1;
                    perVid = parseInt(m2[1], 10);
                    sum = perVid;
                    break;
                }
            }

            orderSums.push({ id: orderId, name: orderName, sum, vidy, perVid });
        });
        return orderSums;
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка условий появления кнопки
    // ─────────────────────────────────────────────
    function getOrderLabel(block) {
        const h4 = block.querySelector('h4');
        if (!h4) return null;
        const span = h4.querySelector('span.label');
        if (!span) return null;
        return clean(span.textContent);
    }

    function checkConditions() {
        const results = {
            c1_localPostpress: { passed: false, detail: '' },
            c2_globalPostpress: { passed: false, detail: '' },
            c3_tirazhMatch: { passed: false, detail: '' },
            c4_statusIcon: { passed: false, detail: '' },
            c5_orderLabel: { passed: false, detail: '' },
            allPassed: false
        };

        const tirazh = parseTirazh();
        const orderSums = parseOrderSums();
        const globalPP = parseGlobalPostpress();
        const localPP = parseLocalPostpress();
        const totalByOrders = orderSums.reduce((sum, o) => sum + (o.sum || 0), 0);

        const orderBlocks = Array.from(document.querySelectorAll('.formblock'))
            .filter(b => b.className.match(/Order\d+/) && b.offsetParent !== null);

        let c1Passed = true;
        let c1Detail = '';
        if (localPP.length === 0) {
            c1Passed = false;
            c1Detail = 'Локальные постпечатки не найдены';
        } else {
            const badOrders = [];
            for (const order of localPP) {
                if (order.postpress.length === 0) continue;
                const hasOnlyAllowed = order.postpress.length === 1 && order.postpress[0] === ALLOWED_POSTPRESS;
                if (!hasOnlyAllowed) {
                    badOrders.push(`#${order.id} "${order.name}": [${order.postpress.join(', ')}]`);
                }
            }
            if (badOrders.length > 0) {
                c1Passed = false;
                c1Detail = `Запрещённые постпечатки: ${badOrders.join('; ')}`;
            } else {
                c1Passed = true;
                c1Detail = 'Все ордеры: только резка или пусто';
            }
        }
        results.c1_localPostpress = { passed: c1Passed, detail: c1Detail };

        const c2Passed = globalPP.length === 0;
        results.c2_globalPostpress = {
            passed: c2Passed,
            detail: c2Passed ? 'Глобальные постпечатки отсутствуют' : `Найдены: [${globalPP.join(', ')}]`
        };

        let c3Passed = false;
        let c3Detail = '';
        if (tirazh === null) {
            c3Detail = 'Тираж (#Tirazh) не найден';
        } else if (orderSums.length === 0) {
            c3Detail = 'Ордеры не найдены';
        } else {
            c3Passed = tirazh === totalByOrders;
            c3Detail = `Тираж=${tirazh}, сумма по ордерам=${totalByOrders}`;
        }
        results.c3_tirazhMatch = { passed: c3Passed, detail: c3Detail };

        const statusImg = document.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img');
        let c4Passed = false;
        let c4Detail = '';
        if (!statusImg) {
            c4Detail = 'Элемент статуса не найден в DOM';
        } else {
            const src = statusImg.getAttribute('src') || '';
            c4Passed = src.includes(STATUS_IMG_PATH);
            c4Detail = c4Passed ? `Статус OK (${src})` : `Статус не тот: ${src || '(пусто)'}`;
        }
        results.c4_statusIcon = { passed: c4Passed, detail: c4Detail };

        let c5Passed = false;
        let c5Detail = '';
        if (orderBlocks.length === 0) {
            c5Detail = 'Ордеры (.formblock.Order*) не найдены';
        } else {
            const badLabels = [];
            const goodLabels = [];
            for (const block of orderBlocks) {
                const match = block.className.match(/Order(\d+)/);
                const orderId = match ? match[1] : '?';
                const nameEl = block.querySelector('.OrderName');
                const orderName = nameEl ? (nameEl.value || clean(nameEl.textContent)) : 'Без названия';

                const label = getOrderLabel(block);
                if (!label) {
                    badLabels.push(`#${orderId} "${orderName}": span.label не найден`);
                } else if (!ALLOWED_LABELS.includes(label)) {
                    badLabels.push(`#${orderId} "${orderName}": "${label}"`);
                } else {
                    goodLabels.push(`#${orderId} "${orderName}": "${label}"`);
                }
            }

            if (badLabels.length > 0) {
                c5Passed = false;
                c5Detail = `Несоответствие: ${badLabels.join('; ')}`;
            } else {
                c5Passed = true;
                c5Detail = `Все ордеры OK: ${goodLabels.map(l => l.split(': ')[1]).join(', ')}`;
            }
        }
        results.c5_orderLabel = { passed: c5Passed, detail: c5Detail };

        results.allPassed = c1Passed && c2Passed && c3Passed && c4Passed && c5Passed;

        return results;
    }

    // ─────────────────────────────────────────────
    // 🔥 Авто-парсинг при появлении #ProductId
    // ─────────────────────────────────────────────
    function checkAndParseOrderData() {
        const productIdEl = document.querySelector('#ProductId');
        if (!productIdEl) return false;

        let orderId = productIdEl.value || clean(productIdEl.textContent);
        if (!orderId) {
            const name = productIdEl.getAttribute('name');
            if (name) { const m = name.match(/(\d+)/); if (m) orderId = m[1]; }
        }

        if (!orderId || orderId === lastParsedOrderId) return false;
        lastParsedOrderId = orderId;

        clearTimeout(parseDebounceTimer);
        parseDebounceTimer = setTimeout(() => {
            log(`🎯 Заказ #${orderId} загружен → парсим данные...`);
            placeButton();
        }, 800);
        return true;
    }

    function setupProductIdObserver() {
        if (productIdObserver) productIdObserver.disconnect();
        if (checkAndParseOrderData()) {
            log('✅ #ProductId уже есть на странице');
            return;
        }
        productIdObserver = new MutationObserver(() => checkAndParseOrderData());
        productIdObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'id'] });
        log('👁 Observer запущен');
    }

    // ─────────────────────────────────────────────
    // 🔥 Открытие инструмента препресса
    // ─────────────────────────────────────────────
    function openTool() {
        const order = detectOrder();
        if (!order) {
            if (api?.showCenterMessage) {
                api.showCenterMessage({
                    message: 'Не удалось определить номер заказа.<br>Открой карточку заказа и попробуй снова.',
                    buttonText: 'ОК',
                    duration: 3000
                });
            }
            return;
        }

        const text = getInfoText();
        const schema = readSchema();
        const sheet = detectSheet();
        const trim = detectTrim();
        const vid = detectVidy(text);
        const bleed = (schema && schema.bleed != null) ? schema.bleed : detectBleed(text);

        const payload = { order: String(order) };
        if (schema && schema.fw && schema.fh) { payload.fw = schema.fw; payload.fh = schema.fh; }
        if (trim && trim.tw && trim.th) { payload.tw = trim.tw; payload.th = trim.th; }
        if (vid && vid.vidy) { payload.vidy = parseInt(vid.vidy, 10); if (vid.per_vid) payload.per_vid = parseInt(vid.per_vid, 10); }
        if (bleed != null && !isNaN(bleed)) payload.bleed = bleed;
        if (schema && schema.kpl != null) payload.kpl = schema.kpl;
        if (sheet) { payload.sw = sheet.w; payload.sh = sheet.h; }
        const colors = allColors()[0];
        if (colors) payload.colors = colors;
        const grid = detectGrid();
        if (grid) { payload.grid_cols = grid.cols; payload.grid_rows = grid.rows; }

        const orders = detectOrders();
        if (orders.length >= 2) payload.orders = orders;

        log('отправляю JSON в', TOOL_URL + '/api/job_info', payload);

        // 🔥 Используем GM.xmlhttpRequest из переданного объекта
        if (GM?.xmlhttpRequest) {
            try {
                GM.xmlhttpRequest({
                    method: 'POST', url: TOOL_URL + '/api/job_info',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    data: JSON.stringify(payload),
                    onload: (r) => log('JSON сохранён:', r.status),
                    onerror: (e) => warn('POST ошибка:', e)
                });
            } catch (e) { warn('GM.xmlhttpRequest недоступен:', e); }
        } else {
            warn('GM.xmlhttpRequest не передан в модуль');
        }

        let url = `${TOOL_URL}/?order=${order}`;
        ['sw','sh','fw','fh','tw','th','vidy','per_vid','bleed','kpl','grid_cols','grid_rows'].forEach(k => {
            if (payload[k] != null) url += `&${k}=${encodeURIComponent(payload[k])}`;
        });
        if (payload.colors) url += `&colors=${encodeURIComponent(payload.colors)}`;
        url += '&from_info=1';
        openModal(url);
    }

    // ─────────────────────────────────────────────
    // 🔥 Кнопка (с проверкой условий)
    // ─────────────────────────────────────────────
    function findUploadAnchor() {
        for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,legend,label,th,td,div,span,b,strong,p,a')) {
            const txt = (el.textContent || '').trim();
            if (txt.length <= 30 && /Загрузить\s+файл/i.test(txt) && el.offsetParent !== null) return el;
        }
        return null;
    }

    function copyButtonStyles(targetBtn, sourceBtn) {
        if (!sourceBtn) return;
        const cs = window.getComputedStyle(sourceBtn);
        ['background','backgroundColor','backgroundImage','backgroundRepeat','backgroundPosition','color','border','borderRadius','padding','fontSize','fontWeight','fontFamily','lineHeight','boxShadow','textShadow','textTransform','textAlign','cursor','transition','height','minHeight','display','justifyContent','alignItems'].forEach(prop => {
            try { targetBtn.style[prop] = cs[prop]; } catch(e) {}
        });
    }

    function placeButton() {
        const head = findUploadAnchor();
        const existing = document.getElementById(`${UNIQUE_PREFIX}btn`);

        if (!head) {
            if (existing) existing.remove();
            return;
        }

        const box = head.closest('form') || head.parentElement;

        const conditions = checkConditions();

        if (!conditions.allPassed) {
            if (existing) {
                existing.remove();
                log('🔴 Кнопка скрыта (условия не выполнены)');
            }
            return;
        }

        if (existing && existing.nextElementSibling === box) return;
        if (existing) existing.remove();

        const b = document.createElement('button');
        b.id = `${UNIQUE_PREFIX}btn`; b.type = 'button'; b.textContent = '🖨 Автопрепресс';
        b.title = 'Открыть препресс для текущего заказа';
        b.style.cssText = 'width:100%;display:block;margin-bottom:8px;box-sizing:border-box;';

        const sourceBtn = document.querySelector('#chat_2 > button:nth-child(2)');
        if (sourceBtn) copyButtonStyles(b, sourceBtn);
        else Object.assign(b.style, { background:'#2563eb', color:'#fff', border:'0', borderRadius:'8px', padding:'10px 16px', fontSize:'14px', fontWeight:'700', cursor:'pointer' });

        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openTool(); };
        box.insertAdjacentElement('beforebegin', b);
        log('🟢 Кнопка показана (все условия выполнены)');
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;

        log(`🚀 Модуль инициализирован (v${AP_VER})`);

        // 🔥 Перехват функций window
        hookAll();
        hookInterval = setInterval(hookAll, 2000);

        // 🔥 Запуск наблюдателя за #ProductId
        setupProductIdObserver();

        // 🔥 Периодическое размещение кнопки
        placeButton();
        placeButtonInterval = setInterval(placeButton, 1500);
    }

    function cleanup() {
        if (!active) return;
        active = false;

        log('🧹 Модуль очищен');

        // 🔥 Очистка таймеров
        if (placeButtonInterval) {
            clearInterval(placeButtonInterval);
            placeButtonInterval = null;
        }
        if (hookInterval) {
            clearInterval(hookInterval);
            hookInterval = null;
        }
        clearTimeout(parseDebounceTimer);
        parseDebounceTimer = null;

        // 🔥 Отключение наблюдателя за #ProductId
        if (productIdObserver) {
            productIdObserver.disconnect();
            productIdObserver = null;
        }

        // 🔥 Восстановление оригинальных функций window
        unhookAll();

        // 🔥 Удаление кнопки
        const existingBtn = document.getElementById(`${UNIQUE_PREFIX}btn`);
        if (existingBtn) existingBtn.remove();

        // 🔥 Удаление модального окна
        if (modalOverlay && modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
            modalOverlay = null;
            modalFrame = null;
        }

        // 🔥 Удаление стилей
        const styleEl = document.getElementById(`${UNIQUE_PREFIX}modal-styles`);
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }

        // 🔥 Сброс состояния
        lastParsedOrderId = null;
        if (window.__apOrder) delete window.__apOrder;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительного размещения кнопки
    function refresh() {
        if (active) {
            placeButton();
        }
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
        openTool // Для внешнего вызова открытия инструмента
    };

})(config, GM, utils, api);