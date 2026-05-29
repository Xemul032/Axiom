// hideDostavka.js — модуль скрытия 8-го пункта в #ChatManager
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы) — ВНУТРИ КОДА, не в конфиге!

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Селекторы элементов
    const SELECTORS = {
        productId: '#ProductId',
        chatManager: '#ChatManager',
        targetItem: '#ChatManager > ul > li:nth-child(8)'
    };
    
    // 🔥 Настройки логгирования (измените на true для отладки)
    const LOGGING_ENABLED = true;
    const LOG_PREFIX = '[ToggleHideChatItem]';
    
    // 🔥 Уникальный префикс для изоляции (можно настроить через config, но есть дефолт)
    const UNIQUE_PREFIX = config?.uniquePrefix || 'toggle-hide-chat-';

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;

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
    // 🔥 Применение состояния скрытия
    // ─────────────────────────────────────────────
    function applyHideState() {
        const productIdEl = document.querySelector(SELECTORS.productId);
        const chatManager = document.querySelector(SELECTORS.chatManager);
        const target = document.querySelector(SELECTORS.targetItem);

        // 🔹 Если все условия выполнены — скрываем целевой элемент
        if (productIdEl && chatManager && target) {
            if (target.style.display !== 'none') {
                target.style.display = 'none';
                log('🔒 Скрыт элемент:', SELECTORS.targetItem);
            }
        } 
        // 🔹 Если условия не выполнены — возвращаем видимость (если был скрыт)
        else if (target && target.style.display === 'none') {
            target.style.display = '';
            log('🔓 Показан элемент:', SELECTORS.targetItem);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Навешивание наблюдателя DOM
    // ─────────────────────────────────────────────
    function attachObserver() {
        if (observer) return;
        
        observer = new MutationObserver(() => {
            // 🔹 Просто вызываем функцию — элемент пересоздаётся? Найдём заново
            applyHideState();
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        log('✅ MutationObserver подключён');
    }

    // ─────────────────────────────────────────────
    // 🔥 Отвязывание наблюдателя DOM
    // ─────────────────────────────────────────────
    function detachObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
            log('✅ MutationObserver отключён');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка и применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        if (!active) return;
        attachObserver();
        applyHideState(); // 🔥 Первичное применение
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        
        active = true;
        log('🚀 Модуль инициализирован');
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // 🔥 Отключаем наблюдатель
        detachObserver();
        
        // 🔥 Возвращаем видимость элементу при отключении модуля
        const target = document.querySelector(SELECTORS.targetItem);
        if (target && target.style.display === 'none') {
            target.style.display = '';
            log('🔄 Элемент восстановлен при очистке');
        }
        
        log('🧹 Модуль очищен');
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительного обновления
    function refresh() {
        if (active) {
            applyHideState();
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
        refresh // Для внешнего вызова обновления
    };

})(config, GM, utils, api);