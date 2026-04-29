// urgentOrderPrice.js — модуль отображения цены срочного заказа
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
    let observer = null;
    let domObserver = null;
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

        // 🔥 Проверяем наличие ВСЕХ необходимых элементов
        if (!itogEl || !targetElement || !inputEl) {
            return false;
        }

        // 🔥 Проверка: уже создан?
        if (targetElement.querySelector(`.${UNIQUE_PREFIX}price`)) {
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

        // 🔥 Настройка Observer для отслеживания изменений
        setupMutationObserver(itogEl, inputEl);

        return true;
    }

    // ─────────────────────────────────────────────
    // Observer для отслеживания изменений значений
    // ─────────────────────────────────────────────
    function setupMutationObserver(itogEl, inputEl) {
        if (observer) observer.disconnect();

        observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'characterData' || 
                    mutation.type === 'childList' || 
                    (mutation.type === 'attributes' && mutation.attributeName === 'value')) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) calculateSum();
        });

        if (itogEl) {
            observer.observe(itogEl, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }
        if (inputEl) {
            observer.observe(inputEl, {
                attributes: true,
                attributeFilter: ['value']
            });
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Observer для ожидания появления элементов
    // ─────────────────────────────────────────────
    function setupDomObserver() {
        if (domObserver) domObserver.disconnect();

        domObserver = new MutationObserver(function() {
            const itogEl = document.querySelector(ITOG_SELECTOR);
            const targetElement = document.querySelector(TARGET_SELECTOR);
            
            if (itogEl && targetElement) {
                // 🔥 Элементы появились — создаём блок
                const success = createPriceBlock();
                if (success) {
                    // 🔥 Элементы созданы — отключаем этот observer
                    if (domObserver) {
                        domObserver.disconnect();
                        domObserver = null;
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

        // 🔥 Сначала пробуем создать сразу (если элементы уже есть)
        const success = createPriceBlock();
        
        if (!success) {
            // 🔥 Элементов ещё нет — ждём их появления
            setupDomObserver();
        }
    }

    function cleanup() {
        if (!active) return;
        active = false;

        // Отключаем все observers
        if (observer) {
            observer.disconnect();
            observer = null;
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
            // 🔥 Небольшая задержка для гарантии загрузки DOM
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