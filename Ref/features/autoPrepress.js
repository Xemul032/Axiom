// autoPrepress1.js — модуль кнопки «Автопрепресс» для Аксиомы
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, openTool }
// ⚠️ ВСЕ НАСТРОЙКИ (URL, селекторы) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥

    // URL инструмента препресса
    const TOOL_URL = 'http://192.168.1.61:5000';
    const AP_VER = '3.8';

    // 🔥 Уникальный префикс для изоляции стилей и ID
    const UNIQUE_PREFIX = config?.uniquePrefix || 'auto-prepress-';

    // 🔥 ЕДИНСТВЕННОЕ УСЛОВИЕ показа кнопки — статус изображения
    const STATUS_IMG_SELECTOR = '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img';
    const STATUS_IMG_PATH = '/axiom/img/status/status-files.png';

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

    // 🔥 Кэш объекта Product (сбрасывается при смене заказа)
    let _apProdCache = undefined;

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

        if (!originalWindowFunctions[name]) {
            originalWindowFunctions[name] = orig;
        }

        const wrapped = function (id) {
            if (id !== undefined && id !== null && /^\d+$/.test(String(id))) {
                const sid = String(id);
                if (window.__apOrder !== sid) {
                    // 🔥 Аксиома переключает заказы без перезагрузки страницы —
                    // сбрасываем кэш Product при смене номера заказа
                    window.__apOrder = sid;
                    _apProdCache = undefined;
                }
            }
            return orig.apply(this, arguments);
        };
        wrapped.__apHooked = true;
        try { window[name] = wrapped; } catch (e) {}
    }

    function hookAll() {
        HOOK_FUNCTIONS.forEach(hook);
    }

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

    function allVidy() {
        const t = (document.body ? document.body.innerText : '') || '';
        const re = /(\d+)\s*вид[а-яё]*\s*по\s*(\d+)\s*шт\.?\s*,?\s*(?:(\d+(?:[.,]\d+)?)\s*[xхXХ×*]\s*(\d+(?:[.,]\d+)?))?/ig;
        const out = [];
        let m;
        while ((m = re.exec(t)) !== null) {
            const e = { vidy: parseInt(m[1], 10), per_vid: parseInt(m[2], 10) };
            if (m[3] && m[4]) {
                e.tw = parseFloat(m[3].replace(',', '.'));
                e.th = parseFloat(m[4].replace(',', '.'));
            }
            out.push(e);
        }
        return out;
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

    // ─────────────────────────────────────────────
    // 🔥 НОВЫЕ ФУНКЦИИ ПАРСИНГА (из юзерскрипта v3.8)
    // ─────────────────────────────────────────────

    // Чтение объекта Product из инлайн-скрипта страницы
    function readProduct() {
        if (_apProdCache !== undefined) return _apProdCache;
        _apProdCache = null;
        try {
            const w = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
            if (w && w.Product && w.Product.Orders) { _apProdCache = w.Product; return _apProdCache; }
        } catch (e) {}
        try {
            for (const s of document.querySelectorAll('script')) {
                const t = s.textContent || '';
                const i = t.indexOf('Product = {');
                if (i < 0) continue;
                let depth = 0, start = t.indexOf('{', i), end = -1;
                for (let j = start; j < t.length; j++) {
                    const ch = t[j];
                    if (ch === '{') depth++;
                    else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
                }
                if (end < 0) continue;
                const lit = t.slice(start, end + 1);
                _apProdCache = (new Function('return (' + lit + ')'))();
                if (_apProdCache && _apProdCache.Orders) return _apProdCache;
            }
        } catch (e) { warn('не разобрал Product из скрипта:', e); }
        return _apProdCache;
    }

    // Извлечение OrderId из id="SchemaContent<OrderId>"
    function orderIdOfNode(node) {
        const m = (node && node.id || '').match(/SchemaContent(\d+)/);
        return m ? m[1] : null;
    }

    // «Инфо» под НАЗВАНИЕМ заказа (уровень заказа, не ордера)
    function productInfo() {
        const div = document.querySelector('input.ProductName + div.form-control');
        if (!div) return null;
        const t = (div.textContent || '').replace(/\s+/g, ' ').trim();
        return t || null;
    }

    // Техпроцесс ордера = цветной лейбл в области своей кнопки схемы
    function techLabelFor(orderId) {
        const btn = document.getElementById('SchemaButton' + orderId);
        const scope = btn && (btn.closest('h4, nobr, td') || btn.parentElement);
        if (!scope) return null;
        for (const el of scope.querySelectorAll('span.label[style]')) {
            if (el.id && /^SchemaButton/.test(el.id)) continue;
            if (/background-color/i.test(el.getAttribute('style') || '')) {
                const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
                if (t) return t;
            }
        }
        return null;
    }

    // Постпечатные операции ордера с комментариями
    function postpressOpsFor(orderId) {
        const out = [];
        for (const tr of document.querySelectorAll('.Order' + orderId + ' tr[class*="PostpressPrice"]')) {
            const name = ((tr.querySelector('td') || {}).textContent || '').replace(/\s+/g, ' ').trim();
            const params = ((tr.querySelector('td.Instruction') || {}).textContent || '').replace(/\s+/g, ' ').trim();
            if (name) out.push(params ? { name, params } : { name });
        }
        return out;
    }

    // Все доп. поля по ордеру в один объект
    function orderExtras(orderId, prod) {
        const o = {};
        if (!orderId) return o;
        const po = prod && prod.Orders && prod.Orders[orderId];
        if (po && po.Postpress) o.postpress = String(po.Postpress).trim();
        const tech = techLabelFor(orderId);
        if (tech) o.tech = tech;
        const ops = postpressOpsFor(orderId);
        if (ops.length) o.postpress_ops = ops;
        return o;
    }

    // Заказ из НЕСКОЛЬКИХ ордеров (с джойном по OrderId)
    function detectOrders() {
        const nodes = schemaNodes();
        if (nodes.length < 2) return [];

        const sw = [...document.querySelectorAll('input.SheetWidth')]
            .map(e => parseFloat(String(e.value || '').replace(',', '.')));
        const sh = [...document.querySelectorAll('input.SheetHeight')]
            .map(e => parseFloat(String(e.value || '').replace(',', '.')));
        const cols = allColors();
        const grids = allGrids();
        const commonGrid = detectGrid();
        const prod = readProduct();

        const arr = nodes.map((node, i) => {
            const r = parseSchemaNode(node);
            const o = {};
            if (r.fw) o.fw = r.fw;
            if (r.fh) o.fh = r.fh;
            if (r.bleed != null) o.bleed = r.bleed;
            if (r.kpl != null) o.kpl = r.kpl;
            if (cols[i]) o.colors = cols[i];
            if (sw[i] > 0 && sh[i] > 0) { o.sw = sw[i]; o.sh = sh[i]; }

            const g = gridFromRoot(node.closest('.formblock'))
                   || ((grids.length === nodes.length) ? grids[i] : commonGrid);
            if (g) { o.grid_cols = g.cols; o.grid_rows = g.rows; }

            // 🔥 доп. данные по ордеру — джойн по OrderId
            Object.assign(o, orderExtras(orderIdOfNode(node), prod));
            return o;
        });

        const bodyVidy = allVidy();
        const cleanMatch = bodyVidy.length === arr.length;
        const diag = [];

        arr.forEach((o, i) => {
            let v = detectVidy(nodes[i].textContent || ''), src = v ? 'node' : null;
            if (!v && cleanMatch) { v = bodyVidy[i]; src = 'body'; }
            if (v && v.vidy) {
                o.vidy = parseInt(v.vidy, 10);
                if (v.per_vid) o.per_vid = parseInt(v.per_vid, 10);
            }
            if (cleanMatch && bodyVidy[i].tw > 0 && bodyVidy[i].th > 0) {
                o.tw = bodyVidy[i].tw;
                o.th = bodyVidy[i].th;
            }
            diag.push({
                i,
                vidy: o.vidy || null,
                tw: o.tw || null,
                th: o.th || null,
                grid: (o.grid_cols && o.grid_rows) ? (o.grid_cols + '×' + o.grid_rows) : null,
                src,
                nodeText: (nodes[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220)
            });
        });

        log('ДИАГНОСТИКА видов по ордерам:', {
            orders: arr.length,
            bodyVidyCount: bodyVidy.length,
            bodyVidy: bodyVidy,
            perOrder: diag
        });

        return arr;
    }

    function detectTrim() {
        const t = (document.body ? document.body.innerText : '') || '';
        const m = t.match(/шт\.?\s*,?\s*(\d+(?:[.,]\d+)?)\s*[xхXХ×*]\s*(\d+(?:[.,]\d+)?)/i);
        return m ? { tw: parseFloat(m[1].replace(',', '.')), th: parseFloat(m[2].replace(',', '.')) } : null;
    }

    // Матрица раскладки — использует allGrids() и проверяет на идентичность
    function detectGrid() {
        const grids = allGrids();
        const sizes = new Set(grids.map(g => g.cols + 'x' + g.rows));
        if (sizes.size !== 1) return null;
        return grids[0] || null;
    }

    function gridFromRoot(root) {
        if (!root) return null;
        for (const tbl of root.querySelectorAll('table.pages')) {
            const g = gridFromTable(tbl);
            if (g) return g;
        }
        return null;
    }

    function gridFromTable(tbl) {
        const rows = tbl && tbl.rows;
        if (!rows || rows.length === 0) return null;
        const c0 = rows[0].cells.length;
        if (c0 === 0) return null;
        for (const row of rows) if (row.cells.length !== c0) return null;
        return (c0 * rows.length >= 2) ? { cols: c0, rows: rows.length } : null;
    }

    function allGrids() {
        const raw = [];
        for (const tbl of document.querySelectorAll('table.pages')) {
            const g = gridFromTable(tbl);
            if (g) raw.push(g);
        }
        // Дедупликация: 5×6,5×6,5×6,5×6,3×5 → 5×6,3×5
        const out = [];
        let prev = '';
        for (const g of raw) {
            const key = g.cols + 'x' + g.rows;
            if (key !== prev) out.push(g);
            prev = key;
        }
        return out;
    }

    // ─────────────────────────────────────────────
    // 🔥 УПРОЩЁННАЯ проверка условий показа кнопки
    // ─────────────────────────────────────────────
    function checkConditions() {
        const statusImg = document.querySelector(STATUS_IMG_SELECTOR);
        if (!statusImg) {
            return { allPassed: false, detail: 'Элемент статуса не найден в DOM' };
        }

        const src = statusImg.getAttribute('src') || '';
        const passed = src.includes(STATUS_IMG_PATH);

        return {
            allPassed: passed,
            detail: passed ? `Статус OK (${src})` : `Статус не тот: ${src || '(пусто)'}`
        };
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
    // 🔥 Открытие инструмента препресса (с расширенным payload)
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

        log('grid:', grid ? (grid.cols + '×' + grid.rows) : 'не определён (расходится/нет) — сервер посчитает сам');

        const orders = detectOrders();
        if (orders.length >= 2) payload.orders = orders;

        log('ордеров:', orders.length >= 2 ? orders.length : 1,
            orders.length >= 2 ? orders : '(одиночный — плоские поля)');

        // 🔥 ДОП. ДАННЫЕ ЗАКАЗА (из объекта Product + DOM)
        const prod = readProduct();
        if (prod) {
            if (prod.Tirazh != null && !isNaN(parseInt(prod.Tirazh, 10)))
                payload.tirazh = parseInt(prod.Tirazh, 10);
            if (prod.Postpress) payload.postpress_common = String(prod.Postpress).trim();
        }
        const pinfo = productInfo();
        if (pinfo) payload.info = pinfo;

        // Для одиночного заказа доп. данные кладём плоско в payload
        if (orders.length < 2) {
            const fnode = (schemaNodes()[0]) || null;
            let oid = fnode ? orderIdOfNode(fnode) : null;
            if (!oid && prod && prod.Orders) {
                const k = Object.keys(prod.Orders);
                if (k.length === 1) oid = k[0];
            }
            Object.assign(payload, orderExtras(oid, prod));
        }

        log('доп. данные:', {
            tirazh: payload.tirazh,
            postpress_common: payload.postpress_common,
            info: payload.info,
            postpress: payload.postpress,
            tech: payload.tech,
            postpress_ops: payload.postpress_ops
        });

        log('отправляю JSON в', TOOL_URL + '/api/job_info', payload);

        if (GM?.xmlhttpRequest) {
            try {
                GM.xmlhttpRequest({
                    method: 'POST', url: TOOL_URL + '/api/job_info',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    data: JSON.stringify(payload),
                    onload: (r) => log('JSON сохранён, ответ сервера:', r.status, r.responseText),
                    onerror: (e) => warn('POST ошибка (проверь разрешение GM_xmlhttpRequest / @connect):', e)
                });
            } catch (e) { warn('GM.xmlhttpRequest недоступен:', e); }
        } else {
            warn('GM.xmlhttpRequest не передан в модуль');
        }

        let url = `${TOOL_URL}/?order=${order}`;
        const NUM = ['sw', 'sh', 'fw', 'fh', 'tw', 'th', 'vidy', 'per_vid', 'bleed', 'kpl',
                     'grid_cols', 'grid_rows', 'tirazh'];
        for (const k of NUM) {
            if (payload[k] != null) url += `&${k}=${encodeURIComponent(payload[k])}`;
        }
        if (payload.colors) url += `&colors=${encodeURIComponent(payload.colors)}`;
        url += '&from_info=1';
        openModal(url);
    }

    // ─────────────────────────────────────────────
    // 🔥 Кнопка (с упрощённой проверкой условий)
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

        // 🔥 УПРОЩЁННАЯ ПРОВЕРКА — только statusIcon
        const conditions = checkConditions();

        if (!conditions.allPassed) {
            if (existing) {
                existing.remove();
                log('🔴 Кнопка скрыта:', conditions.detail);
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
        log('🟢 Кнопка показана:', conditions.detail);
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;

        log(`🚀 Модуль инициализирован (v${AP_VER})`);

        hookAll();
        hookInterval = setInterval(hookAll, 2000);

        setupProductIdObserver();

        placeButton();
        placeButtonInterval = setInterval(placeButton, 1500);
    }

    function cleanup() {
        if (!active) return;
        active = false;

        log('🧹 Модуль очищен');

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

        if (productIdObserver) {
            productIdObserver.disconnect();
            productIdObserver = null;
        }

        unhookAll();

        const existingBtn = document.getElementById(`${UNIQUE_PREFIX}btn`);
        if (existingBtn) existingBtn.remove();

        if (modalOverlay && modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
            modalOverlay = null;
            modalFrame = null;
        }

        const styleEl = document.getElementById(`${UNIQUE_PREFIX}modal-styles`);
        if (styleEl && styleEl.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
        }

        lastParsedOrderId = null;
        _apProdCache = undefined;
        if (window.__apOrder) delete window.__apOrder;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    function refresh() {
        if (active) {
            placeButton();
        }
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
        openTool
    };

})(config, GM, utils, api);