// hideBrakCreateByStatus.js — модуль скрытия #BrakCreate по статусу изображения
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, пути) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Селекторы элементов
    const IMG_SELECTOR = '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img';
    const BRAK_SELECTOR = '#BrakCreate';
    
    // Пути статусов, при которых элемент НЕ должен скрываться
    const EXCLUDED_SRCS = [
        '/axiom/img/status/status-nofiles.png',
        '/axiom/img/status/status-calc.png'
    ];
    
    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[HideBrakCreate]';
    
    // 🔥 Уникальный префикс для изоляции (можно настроить через config, но есть дефолт)
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-brak-status-';

    // 🔥 Внутреннее состояние
    let active = false;
    let productIdObserver = null;
    let domObserver = null;

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
    // 🔥 Основная функция: проверка и применение скрытия
    // ─────────────────────────────────────────────
    function checkAndApply() {
        const img = document.querySelector(IMG_SELECTOR);
        const brak = document.querySelector(BRAK_SELECTOR);

        // Если одного из элементов ещё нет в DOM — выходим
        if (!img || !brak) {
            log('⏳ Ожидание элементов:', { img: !!img, brak: !!brak });
            return;
        }

        // Получаем src (учитываем относительные и абсолютные пути)
        const src = img.getAttribute('src') || img.src || '';
        const isExcluded = EXCLUDED_SRCS.some(excluded => src.includes(excluded));

        // Если src НЕ входит в список разрешённых — скрываем
        if (!isExcluded) {
            if (brak.style.display !== 'none') {
                brak.style.setProperty('display', 'none', 'important');
                log('🔒 #BrakCreate скрыт (статус:', src, ')');
            }
        } else {
            if (brak.style.display === 'none') {
                brak.style.removeProperty('display');
                log('🔓 #BrakCreate показан (статус:', src, ')');
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Навешивание наблюдателей
    // ─────────────────────────────────────────────
    function attachObservers() {
        if (productIdObserver || domObserver) return;
        
        // 1. Ждём появления #ProductId как триггера готовности страницы
        productIdObserver = new MutationObserver((mutations, obs) => {
            if (document.querySelector('#ProductId')) {
                log('✅ #ProductId найден, инициализируем основной наблюдатель');
                obs.disconnect();
                productIdObserver = null;
                
                // Первичная проверка сразу
                checkAndApply();
                
                // 2. Реактивный наблюдатель за изменениями DOM
                domObserver = new MutationObserver(() => {
                    checkAndApply();
                });
                
                domObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['src', 'class', 'style']
                });
                
                log('✅ Наблюдатели активны');
            }
        });
        
        productIdObserver.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        log('🔍 Наблюдатель за #ProductId запущен');
    }

    // ─────────────────────────────────────────────
    // 🔥 Отвязывание наблюдателей
    // ─────────────────────────────────────────────
    function detachObservers() {
        if (productIdObserver) {
            productIdObserver.disconnect();
            productIdObserver = null;
            log('✅ Наблюдатель за #ProductId отключён');
        }
        
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
            log('✅ DOM-наблюдатель отключён');
        }
        
        // 🔥 Восстанавливаем видимость элемента при деактивации модуля
        const brak = document.querySelector(BRAK_SELECTOR);
        if (brak && brak.style.display === 'none') {
            brak.style.removeProperty('display');
            log('🔓 #BrakCreate восстановлен при очистке');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка и применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        if (!active) return;
        attachObservers();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        
        active = true;
        log('🚀 Модуль инициализирован (фоновый режим)');
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        detachObservers();
        log('🧹 Модуль очищен');
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительной проверки
    function forceCheck() {
        if (active) {
            checkAndApply();
        } else {
            warn('⚠️ Модуль не активен, проверка отменена');
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
        forceCheck // Для внешней принудительной проверки
    };

})(config, GM, utils, api);