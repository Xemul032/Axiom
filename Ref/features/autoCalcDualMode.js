// autoCalcDualMode.js — модуль авто-расчёта #CalcUt (двойной режим: Стандарт / КБС)
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, recalcNow }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, триггеры) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Триггеры активации
    const ACTIVATE_IF_H4_CONTAINS = 'Меню';      // Скрипт активируется, если в H4 есть этот текст
    const KBS_MODE_TRIGGER = 'КБС';               // Если в H4 есть этот текст → режим КБС
    const DEBUG_MODE = false;                     // true = подробные логи, false = только ошибки
    
    // 🔥 Селекторы для СТАНДАРТНОГО режима (относительно #CalcUt)
    const SEL_STANDARD = {
        comboContainer: '.vs__selected-options',
        comboSpan: '.vs__selected-options span.vs__selected',
        radio: 'table tbody tr:nth-child(1) td:nth-child(1) table tbody tr:nth-child(4) td.a_radioselect',
        multInput: 'table tbody tr:nth-child(1) td:nth-child(1) table tbody tr:nth-child(5) td:nth-child(2) input',
        targetInput: 'table tbody tr:nth-child(1) td:nth-child(1) table tbody tr:nth-child(7) td:nth-child(2) input'
    };
    
    // 🔥 Селекторы для РЕЖИМА КБС (другая структура, без radio)
    const SEL_KBS = {
        comboContainer: '.vs__selected-options',
        comboSpan: '.vs__selected-options span.vs__selected',
        radio: null, // В режиме КБС radio отсутствует
        multInput: 'table tbody tr:nth-child(1) td:nth-child(1) table tbody tr:nth-child(4) td:nth-child(2) input',
        targetInput: 'table tbody tr:nth-child(1) td:nth-child(1) table tbody tr:nth-child(6) td:nth-child(2) input'
    };
    
    // Настройки логгирования
    const LOG_PREFIX = '[AutoCalcDual]';
    
    // 🔥 Уникальный префикс для изоляции стилей
    const UNIQUE_PREFIX = config?.uniquePrefix || 'auto-calc-dual-';

    // 🔥 Внутреннее состояние
    let active = false;
    let activeInstance = null;
    let currentRoot = null;
    let elementsWatcher = null;
    let bodyObserver = null;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования (только консоль, без UI)
    // ─────────────────────────────────────────────
    function logDebug(msg, ...args) {
        if (DEBUG_MODE) {
            console.log(LOG_PREFIX, msg, ...args);
        }
    }

    function logInfo(msg, ...args) {
        console.log(LOG_PREFIX, msg, ...args);
    }

    function logWarn(msg, ...args) {
        if (DEBUG_MODE) {
            console.warn(LOG_PREFIX, msg, ...args);
        }
    }

    function logError(msg, ...args) {
        if (DEBUG_MODE) {
            console.error(LOG_PREFIX, msg, ...args);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 CSS-блокировка (инжектится один раз)
    // ─────────────────────────────────────────────
    function injectLockStyle() {
        const styleId = `${UNIQUE_PREFIX}locked-style`;
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            input.${UNIQUE_PREFIX}locked {
                pointer-events: none !important;
                background-color: #e9ecef !important;
                cursor: not-allowed !important;
                user-select: none !important;
                color: #495057 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Извлечение числа из текста (например, "123" из "Тираж: 123")
    // ─────────────────────────────────────────────
    function extractNumber(text) {
        if (!text) return null;
        const clean = text.replace(/\u200B/g, '').trim();
        const match = clean.match(/(\d{2,3})\s*$/);
        return match ? parseInt(match[1], 10) : null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Получение текста выбранного radio по фоновому цвету
    // ─────────────────────────────────────────────
    function getSelectedRadioText(container) {
        if (!container) return '';
        const items = container.querySelectorAll('div, span, label, a, button, td, p');
        for (const item of items) {
            const bg = window.getComputedStyle(item).backgroundColor;
            if (/rgba?\(136,255,136/.test(bg.replace(/\s/g, ''))) {
                return (item.textContent || '').trim();
            }
        }
        return (container.textContent || '').trim();
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение блокировки к полю
    // ─────────────────────────────────────────────
    function applyLock(el) {
        if (!el || el.classList.contains(`${UNIQUE_PREFIX}locked`)) return;
        el.classList.add(`${UNIQUE_PREFIX}locked`);
        el.setAttribute('readonly', '');
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 Основная функция расчёта
    // ─────────────────────────────────────────────
    function calculate() {
        if (!activeInstance || !active) return;
        
        const { root, isKbs, lastVal } = activeInstance;
        const sel = isKbs ? SEL_KBS : SEL_STANDARD;

        const comboSpan = root.querySelector(sel.comboSpan);
        const radio     = sel.radio ? root.querySelector(sel.radio) : null;
        const multInp   = root.querySelector(sel.multInput);
        const targetInp = root.querySelector(sel.targetInput);

        // Ожидание полной отрисовки элементов
        if (!comboSpan || (sel.radio && !radio) || !multInp || !targetInp) {
            logDebug('⏳ Ожидание элементов...', {
                comboSpan: !!comboSpan, radio: !!radio,
                multInp: !!multInp, targetInp: !!targetInp
            });
            return;
        }

        const qty = extractNumber(comboSpan.textContent);
        if (qty === null) {
            logWarn('⚠️ Не удалось извлечь число из combobox');
            return;
        }

        let factor, modeLabel;
        if (isKbs) {
            // 🔥 Режим КБС: radio игнорируется, формула без надбавки
            factor = qty / 1000;
            modeLabel = 'KBS (без radio)';
        } else {
            // 🔥 Стандартный режим: учитываем radio
            const radioText = getSelectedRadioText(radio);
            const isNoLam = radioText.includes('Без ламинации');
            const base = qty / 1000;
            factor = isNoLam ? base : base + 0.06;
            modeLabel = `STD (Lam: ${radioText})`;
        }

        const multiplier = parseFloat(multInp.value) || 0;
        const result = Math.ceil(factor * multiplier);

        // 🔥 Обновляем целевое поле, только если значение изменилось
        if (lastVal !== result) {
            activeInstance.lastVal = result;
            targetInp.value = result;
            targetInp.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => targetInp.dispatchEvent(new Event('change', { bubbles: true })), 10);
            logInfo(`✅ Расчёт: ${result} (Qty: ${qty}, Mult: ${multiplier}, ${modeLabel})`);
        }

        // 🔥 Блокируем поле от ручной правки
        applyLock(targetInp);
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдатель за динамическим появлением элементов внутри #CalcUt
    // ─────────────────────────────────────────────
    function setupElementsWatcher(root) {
        if (elementsWatcher) elementsWatcher.disconnect();
        
        elementsWatcher = new MutationObserver(() => calculate());
        elementsWatcher.observe(root, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'style', 'value']
        });
        logDebug('🔍 Наблюдатель за элементами #CalcUt запущен');
    }

    // ─────────────────────────────────────────────
    // 🔥 Инициализация экземпляра для текущего #CalcUt
    // ─────────────────────────────────────────────
    function setupInstance(root) {
        injectLockStyle();

        const h4 = root.querySelector('h4');
        const h4Text = h4 ? h4.textContent : '';
        const isKbs = h4Text.includes(KBS_MODE_TRIGGER);

        activeInstance = { root, isKbs, lastVal: null, observers: [], listeners: [], timer: null };
        const sel = isKbs ? SEL_KBS : SEL_STANDARD;

        logInfo(`🚀 Экземпляр запущен. Режим: ${isKbs ? 'КБС' : 'Стандарт'}`);
        setupElementsWatcher(root);

        // 🔥 Debounce для быстрых изменений
        const debouncedCalc = () => {
            clearTimeout(activeInstance.timer);
            activeInstance.timer = setTimeout(calculate, 100);
        };

        // 🔥 Навешиваем слушатели на combobox
        const comboCont = root.querySelector(sel.comboContainer);
        if (comboCont) {
            comboCont.addEventListener('click', debouncedCalc);
            activeInstance.listeners.push({ el: comboCont, evt: 'click', fn: debouncedCalc });
        }

        // 🔥 Навешиваем слушатели на radio (если не КБС)
        if (!isKbs && sel.radio) {
            const radioEl = root.querySelector(sel.radio);
            if (radioEl) {
                radioEl.addEventListener('click', debouncedCalc);
                activeInstance.listeners.push({ el: radioEl, evt: 'click', fn: debouncedCalc });
            }
        }

        // 🔥 Навешиваем слушатели на multInput
        const multEl = root.querySelector(sel.multInput);
        if (multEl) {
            multEl.addEventListener('input', debouncedCalc);
            activeInstance.listeners.push({ el: multEl, evt: 'input', fn: debouncedCalc });
        }

        // 🔥 Защита targetInput от перезаписи фреймворками (Vue/React)
        const targetEl = root.querySelector(sel.targetInput);
        if (targetEl) {
            const mo = new MutationObserver(() => {
                if (!targetEl.classList.contains(`${UNIQUE_PREFIX}locked`) || 
                    parseFloat(targetEl.value) !== activeInstance.lastVal) {
                    applyLock(targetEl);
                    if (activeInstance.lastVal !== null) {
                        targetEl.value = activeInstance.lastVal;
                        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
            mo.observe(targetEl, { attributes: true, characterData: true, subtree: true });
            activeInstance.observers.push(mo);
        }

        calculate(); // 🔥 Первичный расчёт
    }

    // ─────────────────────────────────────────────
    // 🔥 Очистка при исчезновении или смене #CalcUt
    // ─────────────────────────────────────────────
    function cleanupInstance() {
        if (elementsWatcher) {
            elementsWatcher.disconnect();
            elementsWatcher = null;
        }
        
        if (activeInstance) {
            // 🔥 Отключаем все MutationObserver
            activeInstance.observers.forEach(o => o.disconnect());
            
            // 🔥 Отвязываем все event listeners
            activeInstance.listeners.forEach(l => {
                if (l.el && l.evt && l.fn) {
                    l.el.removeEventListener(l.evt, l.fn);
                }
            });
            
            // 🔥 Очищаем таймеры
            clearTimeout(activeInstance.timer);
            
            logDebug('🧹 Экземпляр очищен');
            activeInstance = null;
        }
        
        currentRoot = null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Глобальный контроль жизненного цикла #CalcUt
    // ─────────────────────────────────────────────
    function checkAndInit() {
        const root = document.querySelector('#CalcUt');
        
        if (root && root.isConnected) {
            const h4 = root.querySelector('h4');
            const conditionMet = h4 && h4.textContent.includes(ACTIVATE_IF_H4_CONTAINS);

            if (conditionMet && root !== currentRoot) {
                logInfo('🔁 Новый #CalcUt обнаружен, инициализация...');
                cleanupInstance();
                currentRoot = root;
                setupInstance(root);
            } else if (!conditionMet && currentRoot === root) {
                logInfo('🔻 #CalcUt больше не соответствует условиям, очистка...');
                cleanupInstance();
            }
        } else if (currentRoot) {
            logInfo('🔻 #CalcUt исчез из DOM, очистка...');
            cleanupInstance();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        
        active = true;
        logInfo('🚀 Модуль инициализирован (фоновый режим)');
        
        // 🔥 Запускаем глобальный наблюдатель за DOM
        bodyObserver = new MutationObserver(checkAndInit);
        bodyObserver.observe(document.body, { childList: true, subtree: true });
        
        // 🔥 Первичная проверка
        checkAndInit();
    }

    function cleanup() {
        if (!active) return;
        
        active = false;
        cleanupInstance();
        
        if (bodyObserver) {
            bodyObserver.disconnect();
            bodyObserver = null;
        }
        
        logInfo('🧹 Модуль очищен');
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительного пересчёта
    function recalcNow() {
        if (active && activeInstance) {
            calculate();
        } else {
            logWarn('⚠️ Модуль не активен, пересчёт отменён');
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
        recalcNow // Для внешнего вызова пересчёта
    };

})(config, GM, utils, api);