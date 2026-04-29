// 1urgentOrderPrice.js — модуль отображения цены срочного заказа
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'urgent-order-';
    const TARGET_SELECTOR = config?.targetSelector || '#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(6) > td';
    const ITOG_SELECTOR = config?.itogSelector || '#itog';
    const INPUT_SELECTOR = config?.inputSelector || '#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input';
    const PRICE_MULTIPLIER = config?.priceMultiplier || 1.4;

    // 🔥 Стили (можно переопределить в конфиге)
    const STYLES = {
        block: {
            backgroundColor: config?.styles?.block?.bg || '#007BFF',
            padding: config?.styles?.block?.padding || '15px',
            borderRadius: config?.styles?.block?.radius || '8px',
            boxShadow: config?.styles?.block?.shadow || '0 4px 6px rgba(0, 0, 0, 0.1)',
            color: config?.styles?.block?.color || 'white',
            textAlign: config?.styles?.block?.align || 'center'
        },
        header: {
            color: config?.styles?.header?.color || '#FFFFFF',
            margin: config?.styles?.header?.margin || '0 0 10px 0',
            fontSize: config?.styles?.header?.size || '18px'
        },
        sum: {
            color: config?.styles?.sum?.color || '#FFD700',
            fontSize: config?.styles?.sum?.size || '24px',
            fontWeight: config?.styles?.sum?.weight || 'bold'
        },
        button: {
            marginTop: config?.styles?.button?.marginTop || '10px',
            padding: config?.styles?.button?.padding || '8px 16px',
            backgroundColor: config?.styles?.button?.bg || '#28a745',
            color: config?.styles?.button?.color || '#FFFFFF',
            border: config?.styles?.button?.border || 'none',
            borderRadius: config?.styles?.button?.radius || '4px',
            cursor: config?.styles?.button?.cursor || 'pointer',
            fontSize: config?.styles?.button?.size || '14px'
        }
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let valueObserver = null;      // Для отслеживания изменений значений
    let domObserver = null;         // Для отслеживания появления/исчезновения блока
    let originalSumValue = '';
    let priceBlock = null;
    let sumElement = null;
    let copyButton = null;

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    function formatNumberWithSpaces(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function parseNumericValue(text) {
        if (!text) return 0;
        return parseFloat(text.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    }

    // ─────────────────────────────────────────────
    // Расчёт суммы
    // ─────────────────────────────────────────────
    function calculateSum() {
        const itogEl = document.querySelector(ITOG_SELECTOR);
        const inputEl = document.querySelector(INPUT_SELECTOR);
        
        if (!itogEl || !inputEl) return;

        const itogValue = parseNumericValue(itogEl.textContent);
        let inputValue = parseNumericValue(inputEl.value);

        if (inputValue < 0) {
            inputValue = Math.abs(inputValue);
            originalSumValue = ((itogValue + inputValue) * PRICE_MULTIPLIER).toFixed(2);
        } else {
            originalSumValue = ((itogValue - inputValue) * PRICE_MULTIPLIER).toFixed(2);
        }

        if (sumElement) {
            sumElement.textContent = formatNumberWithSpaces(originalSumValue);
        }
    }

    // ─────────────────────────────────────────────
    // Создание блока цены
    // ─────────────────────────────────────────────
    function createPriceBlock() {
        const itogEl = document.querySelector(ITOG_SELECTOR);
        const targetElement = document.querySelector(TARGET_SELECTOR);
        const inputEl = document.querySelector(INPUT_SELECTOR);

        // Проверяем наличие ВСЕХ необходимых элементов
        if (!itogEl || !targetElement || !inputEl) {
            return false;
        }

        // 🔥 Проверка: уже создан?
        const existingBlock = targetElement.querySelector(`.${UNIQUE_PREFIX}price`);
        if (existingBlock) {
            // Блок уже есть — просто обновляем ссылки и пересчитываем
            priceBlock = existingBlock;
            sumElement = priceBlock.querySelector('div:nth-child(2)');
            copyButton = priceBlock.querySelector('button');
            calculateSum();
            return true;
        }

        // Создаём блок
        priceBlock = document.createElement('div');
        priceBlock.className = `${UNIQUE_PREFIX}price`;
        Object.assign(priceBlock.style, STYLES.block);

        // Заголовок
        const header = document.createElement('h4');
        header.textContent = 'Цена срочного заказа';
        Object.assign(header.style, STYLES.header);
        priceBlock.appendChild(header);

        // Сумма
        sumElement = document.createElement('div');
        Object.assign(sumElement.style, STYLES.sum);
        priceBlock.appendChild(sumElement);

        // Кнопка копирования
        copyButton = document.createElement('button');
        copyButton.textContent = 'Скопировать цену';
        Object.assign(copyButton.style, STYLES.button);

        copyButton.addEventListener('click', function() {
            if (!originalSumValue) return;
            
            navigator.clipboard.writeText(originalSumValue)
                .then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Скопировано!';
                    setTimeout(() => { copyButton.textContent = originalText; }, 2000);
                })
                .catch(() => {});
        });

        priceBlock.appendChild(copyButton);
        targetElement.appendChild(priceBlock);

        // Инициализация суммы
        calculateSum();

        return true;
    }

    // ─────────────────────────────────────────────
    // Observer для отслеживания изменений значений
    // ─────────────────────────────────────────────
    function setupValueObserver() {
        if (valueObserver) valueObserver.disconnect();

        const itogEl = document.querySelector(ITOG_SELECTOR);
        const inputEl = document.querySelector(INPUT_SELECTOR);

        if (!itogEl || !inputEl) return;

        valueObserver = new MutationObserver(function(mutations) {
            // 🔥 Проверяем, не исчез ли блок
            const targetElement = document.querySelector(TARGET_SELECTOR);
            if (targetElement && !targetElement.querySelector(`.${UNIQUE_PREFIX}price`)) {
                // Блок исчез — пересоздаём
                createPriceBlock();
            } else {
                // Блок на месте — пересчитываем значение
                calculateSum();
            }
        });

        valueObserver.observe(itogEl, {
            characterData: true,
            childList: true,
            subtree: true
        });

        valueObserver.observe(inputEl, {
            attributes: true,
            attributeFilter: ['value']
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Observer для отслеживания появления целевого элемента
    // ─────────────────────────────────────────────
    function setupDomObserver() {
        if (domObserver) domObserver.disconnect();

        domObserver = new MutationObserver(function() {
            const targetElement = document.querySelector(TARGET_SELECTOR);
            const itogEl = document.querySelector(ITOG_SELECTOR);
            
            if (targetElement && itogEl) {
                // 🔥 Проверяем, есть ли наш блок
                const existingBlock = targetElement.querySelector(`.${UNIQUE_PREFIX}price`);
                
                if (!existingBlock) {
                    // Блока нет — создаём
                    const success = createPriceBlock();
                    if (success) {
                        // 🔥 Настраиваем observer для значений
                        setupValueObserver();
                    }
                } else {
                    // Блок есть — убеждаемся, что observer для значений настроен
                    if (!valueObserver) {
                        setupValueObserver();
                    }
                }
            }
        });

        domObserver.observe(document.body, {
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

        // 🔥 Настраиваем observer для отслеживания появления элементов и блока
        setupDomObserver();
        
        // 🔥 Пробуем создать сразу (если элементы уже есть)
        setTimeout(() => {
            createPriceBlock();
            setupValueObserver();
        }, 100);
    }

    function cleanup() {
        if (!active) return;
        active = false;

        // Отключаем все observers
        if (valueObserver) {
            valueObserver.disconnect();
            valueObserver = null;
        }
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }

        // Удаляем блок
        if (priceBlock && priceBlock.parentNode) {
            priceBlock.parentNode.removeChild(priceBlock);
            priceBlock = null;
        }
        
        sumElement = null;
        copyButton = null;
        originalSumValue = '';
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы
    function forceRecalculate() {
        calculateSum();
    }

    function getOriginalValue() {
        return originalSumValue;
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
        forceRecalculate,
        getOriginalValue
    };

})(config, GM, utils, api);