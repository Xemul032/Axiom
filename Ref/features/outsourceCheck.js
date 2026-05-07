// outsourceCheck.js — модуль очистки текста "Проверено" при статусе аутсорса
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'outsource-check-';
    const SELECTORS = {
        statusImage: config?.selectors?.statusImage || '#StatusIcon > img',
        description: config?.selectors?.description || '#Description'
    };
    const TARGET_IMAGE_SRC = config?.targetImageSrc || 'img/status/status-outsource-calc.png';
    const TEXTS = {
        removePattern: config?.texts?.removePattern || 'проверено',
        removeFlags: config?.texts?.removeFlags || 'gi' // global, case-insensitive
    };
    const CHECK_DELAYS = config?.checkDelays || [100, 500, 1000];

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let checkTimeouts = [];
    let modifiedElements = []; // { el, originalValue, originalText, type }

    // ─────────────────────────────────────────────
    // 🔥 Утилиты: отслеживание и восстановление
    // ─────────────────────────────────────────────
    function trackModified(element, type, originalValue = null, originalText = null) {
        if (!modifiedElements.find(e => e.el === element && e.type === type)) {
            modifiedElements.push({ el: element, type, originalValue, originalText });
        }
    }

    function restoreElement({ el, originalValue, originalText }) {
        if (originalValue !== null && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
            el.value = originalValue;
        }
        if (originalText !== null && el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') {
            el.textContent = originalText;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Удаление текста "Проверено"
    // ─────────────────────────────────────────────
    function removeCheckedText() {
        const descEl = document.querySelector(SELECTORS.description);
        if (!descEl) return;

        const isInput = descEl.tagName === 'TEXTAREA' || descEl.tagName === 'INPUT';
        const originalContent = isInput ? descEl.value : descEl.textContent;
        
        if (!originalContent) return;

        // Удаляем целевой текст (регистронезависимо, с пробелами)
        const pattern = new RegExp(`\\s*${TEXTS.removePattern}\\s*`, TEXTS.removeFlags);
        const cleanedText = originalContent.replace(pattern, '').trim();

        // Если изменения были — применяем и отслеживаем
        if (originalContent !== cleanedText) {
            trackModified(descEl, 'description', isInput ? originalContent : null, !isInput ? originalContent : null);
            
            if (isInput) {
                descEl.value = cleanedText;
            } else {
                descEl.textContent = cleanedText;
            }

            // Вызываем обработчик onchange или OutsourceSetValue
            if (typeof descEl.onchange === 'function') {
                descEl.onchange();
            } else {
                const onchangeAttr = descEl.getAttribute('onchange');
                const match = onchangeAttr?.match(/OutsourceSetValue\((\d+),/);
                if (match?.[1] && typeof window.OutsourceSetValue === 'function') {
                    window.OutsourceSetValue(match[1], descEl.id, isInput ? descEl.value : descEl.textContent);
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка условий: нужная иконка + наличие #Description
    // ─────────────────────────────────────────────
    function checkConditions() {
        const statusImg = document.querySelector(SELECTORS.statusImage);
        const descriptionEl = document.querySelector(SELECTORS.description);

        if (statusImg?.src?.endsWith(TARGET_IMAGE_SRC) && descriptionEl) {
            removeCheckedText();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            checkConditions();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Запуск периодических проверок
    // ─────────────────────────────────────────────
    function startCheckDelays() {
        checkTimeouts.forEach(t => clearTimeout(t));
        checkTimeouts = [];
        
        CHECK_DELAYS.forEach(delay => {
            const t = setTimeout(checkConditions, delay);
            checkTimeouts.push(t);
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        checkConditions();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        startCheckDelays();
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // Очищаем таймауты
        checkTimeouts.forEach(t => clearTimeout(t));
        checkTimeouts = [];
        
        // 🔥 Восстанавливаем все изменённые элементы
        modifiedElements.forEach(restoreElement);
        modifiedElements = [];
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        checkConditions();
    }

    function forceRemoveChecked() {
        removeCheckedText();
    }

    function resetDescription() {
        cleanup();
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
        forceRemoveChecked,
        resetDescription
    };

})(config, GM, utils, api);