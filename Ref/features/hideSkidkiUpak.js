// hideSkidkiUpak.js — модуль скрытия элементов скидок и упаковки
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-skidki-';
    const SELECTORS = {
        calcUt: config?.selectors?.calcUt || '#CalcUt',
        targetCell: config?.selectors?.targetCell || '#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(2)',
        packTypeBlock: config?.selectors?.packTypeBlock || '#PackTypeBlock',
        summaModifyMin: config?.selectors?.summaModifyMin || '#SummaModifyMin',
        tirazhLabel: config?.selectors?.tirazhLabel || '#TirazhLabel'
    };
    const STYLES = {
        tirazhPadding: config?.styles?.tirazhPadding || '20px'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let modifiedElements = []; // Для отслеживания изменённых элементов

    // ─────────────────────────────────────────────
    // 🔥 Вспомогательная функция: поиск ближайшего TD с классом
    // ─────────────────────────────────────────────
    function closestTdWithClass(el, className) {
        while (el && el.tagName !== 'HTML') {
            if (el.tagName === 'TD' && el.classList.contains(className)) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений видимости
    // ─────────────────────────────────────────────
    function updateVisibility() {
        // 1. Условное скрытие ячейки внутри #CalcUt
        const calcUt = document.querySelector(SELECTORS.calcUt);
        const targetCell = document.querySelector(SELECTORS.targetCell);
        if (calcUt && targetCell) {
            targetCell.style.setProperty('display', 'none', 'important');
            trackModified(targetCell, 'display');
        } else if (targetCell) {
            targetCell.style.removeProperty('display');
        }

        // 2. Скрыть #PackTypeBlock всегда
        const packTypeBlock = document.getElementById(SELECTORS.packTypeBlock.replace('#', ''));
        if (packTypeBlock) {
            packTypeBlock.style.setProperty('display', 'none', 'important');
            trackModified(packTypeBlock, 'display');
        }

        // 3. Скрыть <td class="nobreak" width="100">, содержащий SummaModifyMin
        const summaModifyMin = document.getElementById(SELECTORS.summaModifyMin.replace('#', ''));
        if (summaModifyMin) {
            const containerTd = closestTdWithClass(summaModifyMin, 'nobreak');
            if (containerTd && containerTd.getAttribute('width') === '100') {
                containerTd.style.setProperty('display', 'none', 'important');
                trackModified(containerTd, 'display');
            }
        }

        // 4. Добавить отступы к #TirazhLabel.superhead
        const tirazhLabel = document.getElementById(SELECTORS.tirazhLabel.replace('#', ''));
        if (tirazhLabel && tirazhLabel.classList.contains('superhead')) {
            tirazhLabel.style.setProperty('padding-left', STYLES.tirazhPadding, 'important');
            tirazhLabel.style.setProperty('padding-right', STYLES.tirazhPadding, 'important');
            trackModified(tirazhLabel, 'padding');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Отслеживание изменённых элементов для cleanup
    // ─────────────────────────────────────────────
    function trackModified(element, property) {
        if (!modifiedElements.find(e => e.el === element)) {
            const original = {
                display: element.style.display,
                paddingLeft: element.style.paddingLeft,
                paddingRight: element.style.paddingRight
            };
            modifiedElements.push({ el: element, original, property });
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            updateVisibility();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        updateVisibility();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 🔥 Восстанавливаем исходные стили изменённых элементов
        modifiedElements.forEach(({ el, original }) => {
            if (original.display !== undefined) {
                if (original.display === '') {
                    el.style.removeProperty('display');
                } else {
                    el.style.display = original.display;
                }
            }
            if (original.paddingLeft !== undefined) {
                if (original.paddingLeft === '') {
                    el.style.removeProperty('padding-left');
                } else {
                    el.style.paddingLeft = original.paddingLeft;
                }
            }
            if (original.paddingRight !== undefined) {
                if (original.paddingRight === '') {
                    el.style.removeProperty('padding-right');
                } else {
                    el.style.paddingRight = original.paddingRight;
                }
            }
        });
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
        updateVisibility();
    }

    function resetStyles() {
        cleanup();
        updateVisibility();
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
        resetStyles
    };

})(config, GM, utils, api);