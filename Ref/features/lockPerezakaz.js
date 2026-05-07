// lockPerezakaz.js — модуль блокировки элементов при перезаказе
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'lock-perezakaz-';
    const SELECTORS = {
        description: config?.selectors?.description || '#Description',
        summa: config?.selectors?.summa || '#Summa',
        cost: config?.selectors?.cost || '#Cost',
        quantity: config?.selectors?.quantity || '#Quantity',
        labelForContractor: config?.selectors?.labelForContractor || '#LabelForContractor > td:nth-child(2)',
        labelForSumma: config?.selectors?.labelForSumma || '#LabelForSumma > td:nth-child(2) > span',
        labelForQuantity: config?.selectors?.labelForQuantity || '#LabelForQuantity',
        topButton: config?.selectors?.topButton || '#TopButtons > a:nth-child(1)'
    };
    const STYLES = {
        textColor: config?.styles?.textColor || 'rgb(128, 0, 0)',
        bgColor: config?.styles?.bgColor || 'rgb(255, 224, 224)',
        disabledOpacity: config?.styles?.disabledOpacity || '0.6'
    };
    const TEXTS = {
        lockTrigger: config?.texts?.lockTrigger || 'Проверено',
        buttonTitle: config?.texts?.buttonTitle || 'Введите корректное количество перед продолжением'
    };
    const INTERVALS = {
        checkLabel: config?.intervals?.checkLabel || 500,
        checkFormLock: config?.intervals?.checkFormLock || 500,
        buttonSetup: config?.intervals?.buttonSetup || 500
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let isButtonPressed = false;
    let labelObserver = null;
    let checkLabelInterval = null;
    let checkFormLockInterval = null;
    let buttonSetupInterval = null;
    let modifiedElements = []; // { el, originalProps, type }

    // ─────────────────────────────────────────────
    // 🔥 Утилиты: отслеживание и восстановление
    // ─────────────────────────────────────────────
    function trackModified(element, type, props = {}) {
        if (!modifiedElements.find(e => e.el === element && e.type === type)) {
            const original = {};
            Object.keys(props).forEach(key => {
                if (key === 'disabled') {
                    original.disabled = element.disabled;
                } else if (key.startsWith('style.')) {
                    const styleKey = key.replace('style.', '');
                    original[styleKey] = element.style[styleKey];
                } else {
                    original[key] = element[key];
                }
            });
            modifiedElements.push({ el: element, type, original });
        }
    }

    function restoreElement({ el, original }) {
        Object.keys(original).forEach(key => {
            if (key === 'disabled') {
                el.disabled = original.disabled;
            } else if (key.startsWith('style.')) {
                const styleKey = key.replace('style.', '');
                if (original[styleKey] === '' || original[styleKey] === undefined) {
                    el.style.removeProperty(styleKey.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
                } else {
                    el.style[styleKey] = original[styleKey];
                }
            } else {
                el[key] = original[key];
            }
        });
        // Снимаем внутренний флаг блокировки
        delete el.__blocked;
    }

    // ─────────────────────────────────────────────
    // 🔥 Получение элементов для блокировки
    // ─────────────────────────────────────────────
    function getElementsToBlock() {
        return [
            document.querySelector(SELECTORS.description),
            document.querySelector(SELECTORS.summa),
            document.querySelector(SELECTORS.cost),
            document.querySelector(SELECTORS.quantity),
            document.querySelector(SELECTORS.labelForContractor),
            document.querySelector(SELECTORS.labelForSumma),
        ].filter(Boolean);
    }

    // ─────────────────────────────────────────────
    // 🔥 Блокировка элементов
    // ─────────────────────────────────────────────
    function blockElements(elements) {
        elements.forEach(el => {
            if (el.__blocked) return;

            const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
            
            // Отслеживаем оригинальные значения
            trackModified(el, 'block', {
                disabled: isInput ? el.disabled : undefined,
                'style.color': el.style.color,
                'style.pointerEvents': el.style.pointerEvents,
                'style.opacity': el.style.opacity,
                'style.backgroundColor': el.style.backgroundColor
            });

            if (isInput) {
                el.disabled = true;
                el.style.color = STYLES.textColor;
            } else {
                el.style.pointerEvents = 'none';
                el.style.opacity = STYLES.disabledOpacity;
            }

            if (!el.style.backgroundColor || el.style.backgroundColor === '') {
                el.style.backgroundColor = STYLES.bgColor;
            }

            el.__blocked = true;
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Разблокировка элементов
    // ─────────────────────────────────────────────
    function unblockElements(elements) {
        elements.forEach(el => {
            if (!el.__blocked) return;
            restoreElement({ el, original: {} });
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка блокировки формы (по тексту "Проверено")
    // ─────────────────────────────────────────────
    function checkFormLock() {
        const description = document.querySelector(SELECTORS.description);
        if (!description) return;

        const text = (description.value || description.textContent || '').trim();
        const elementsToBlock = getElementsToBlock();

        if (text.includes(TEXTS.lockTrigger)) {
            blockElements(elementsToBlock);
        } else {
            unblockElements(elementsToBlock);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка кнопки и Quantity
    // ─────────────────────────────────────────────
    function checkLabel() {
        const quantityInput = document.querySelector(SELECTORS.quantity);
        const labelElement = document.querySelector(SELECTORS.labelForQuantity);
        const button = document.querySelector(SELECTORS.topButton);

        let isEmptyOrZero = false;
        if (quantityInput) {
            const value = quantityInput.value.trim();
            const numValue = parseFloat(value);
            isEmptyOrZero = value === '' || isNaN(numValue) || numValue <= 0;
        }

        if (!labelElement) return;

        const labelCell = labelElement.querySelector('td:nth-child(1)');

        if (isButtonPressed && isEmptyOrZero) {
            // Подсветка лейбла
            if (labelElement.style.backgroundColor !== STYLES.bgColor) {
                trackModified(labelElement, 'labelHighlight', { 'style.backgroundColor': labelElement.style.backgroundColor });
                labelElement.style.backgroundColor = STYLES.bgColor;
            }
            if (labelCell && labelCell.style.color !== STYLES.textColor) {
                trackModified(labelCell, 'labelCellColor', { 'style.color': labelCell.style.color });
                labelCell.style.color = STYLES.textColor;
            }
            if (quantityInput && quantityInput.style.color !== STYLES.textColor) {
                trackModified(quantityInput, 'quantityColor', { 'style.color': quantityInput.style.color });
                quantityInput.style.color = STYLES.textColor;
            }

            blockButton(button);
            labelElement.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        } else {
            // Сброс подсветки
            if (labelElement.style.backgroundColor === STYLES.bgColor) {
                restoreElement({ el: labelElement, original: {} });
            }
            if (labelCell?.style.color === STYLES.textColor) {
                restoreElement({ el: labelCell, original: {} });
            }
            if (quantityInput?.style.color === STYLES.textColor) {
                restoreElement({ el: quantityInput, original: {} });
            }

            unblockButton(button);
        }
    }

    function blockButton(button) {
        if (button && !button.disabled) {
            trackModified(button, 'buttonBlock', {
                disabled: button.disabled,
                'style.opacity': button.style.opacity,
                'style.pointerEvents': button.style.pointerEvents,
                title: button.title
            });
            button.disabled = true;
            button.style.opacity = STYLES.disabledOpacity;
            button.style.pointerEvents = 'none';
            button.title = TEXTS.buttonTitle;
        }
    }

    function unblockButton(button) {
        if (button && button.disabled) {
            restoreElement({ el: button, original: {} });
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка обработчика клика по кнопке
    // ─────────────────────────────────────────────
    function setupButtonClickHandler() {
        if (buttonSetupInterval) clearInterval(buttonSetupInterval);
        
        buttonSetupInterval = setInterval(() => {
            const buttons = document.querySelectorAll(SELECTORS.topButton);
            buttons.forEach(button => {
                if (!button?.__clickHandlerSet) {
                    button.addEventListener('click', () => {
                        isButtonPressed = true;
                        checkLabel();
                    });
                    button.__clickHandlerSet = true;
                    button.setAttribute(`data-${UNIQUE_PREFIX}click-set`, 'true');
                }
            });

            if (buttons.length > 0 && buttonSetupInterval) {
                clearInterval(buttonSetupInterval);
                buttonSetupInterval = null;
            }
        }, INTERVALS.buttonSetup);
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка интервалов проверки
    // ─────────────────────────────────────────────
    function startIntervals() {
        if (checkLabelInterval) clearInterval(checkLabelInterval);
        if (checkFormLockInterval) clearInterval(checkFormLockInterval);
        
        checkLabelInterval = setInterval(checkLabel, INTERVALS.checkLabel);
        checkFormLockInterval = setInterval(checkFormLock, INTERVALS.checkFormLock);
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдатель за появлением #LabelForContractor
    // ─────────────────────────────────────────────
    function setupLabelObserver() {
        if (labelObserver) labelObserver.disconnect();
        
        labelObserver = new MutationObserver(() => {
            const labelExists = !!document.querySelector(SELECTORS.labelForContractor.replace(' > td:nth-child(2)', ''));
            if (labelExists && !active) {
                // Элемент появился, но модуль не активен — можно проинициализировать
                // (если autoInit=false, пользователь сам вызовет init())
            }
        });
        
        labelObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        checkFormLock();
        checkLabel();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupLabelObserver();
        setupButtonClickHandler();
        startIntervals();
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observers
        if (labelObserver) {
            labelObserver.disconnect();
            labelObserver = null;
        }
        
        // Очищаем интервалы
        if (checkLabelInterval) { clearInterval(checkLabelInterval); checkLabelInterval = null; }
        if (checkFormLockInterval) { clearInterval(checkFormLockInterval); checkFormLockInterval = null; }
        if (buttonSetupInterval) { clearInterval(buttonSetupInterval); buttonSetupInterval = null; }
        
        // 🔥 Восстанавливаем все изменённые элементы
        modifiedElements.forEach(restoreElement);
        modifiedElements = [];
        
        // Сбрасываем флаги на кнопках
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}click-set]`).forEach(btn => {
            btn.removeAttribute(`data-${UNIQUE_PREFIX}click-set`);
            btn.__clickHandlerSet = false;
        });
        
        // Сброс состояния
        isButtonPressed = false;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        checkFormLock();
        checkLabel();
    }

    function forceLock() {
        const elements = getElementsToBlock();
        blockElements(elements);
    }

    function forceUnlock() {
        const elements = getElementsToBlock();
        unblockElements(elements);
    }

    function setButtonPressed(pressed) {
        isButtonPressed = pressed;
        checkLabel();
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
        forceLock,
        forceUnlock,
        setButtonPressed
    };

})(config, GM, utils, api);