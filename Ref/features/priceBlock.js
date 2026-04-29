// V.1 urgentOrderPrice.js — модуль отображения цены срочного заказа
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, recalculate }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json (с дефолтами)
    const CONFIG = {
        enabled: config?.urgentPrice?.enabled ?? true,
        markup: parseFloat(config?.urgentPrice?.markup) ?? 1.4, // Наценка 40%
        targetSelector: config?.urgentPrice?.targetSelector ?? '#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(6) > td',
        itogSelector: config?.urgentPrice?.itogSelector ?? '#itog',
        inputSelector: config?.urgentPrice?.inputSelector ?? '#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input',
        uniquePrefix: config?.uniquePrefix ?? 'axiom-urgent-price-',
        styles: config?.urgentPrice?.styles ?? {}
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let priceBlock = null;
    let originalSumValue = '';

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    
    // Форматирование числа с пробелами (12345.67 → "12 345.67")
    function formatNumberWithSpaces(number) {
        const [int, dec] = number.toString().split('.');
        const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return dec ? `${formattedInt}.${dec}` : formattedInt;
    }

    // Извлечение числового значения из текста (удаляет всё кроме цифр, точки, запятой)
    function parseNumericValue(text) {
        if (!text) return 0;
        return parseFloat(String(text).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    }

    // Получение элементов с проверкой существования
    function getElements() {
        return {
            itog: document.querySelector(CONFIG.itogSelector),
            input: document.querySelector(CONFIG.inputSelector),
            target: document.querySelector(CONFIG.targetSelector)
        };
    }

    // Расчёт суммы срочного заказа
    function calculateUrgentSum() {
        const { itog, input } = getElements();
        if (!itog || !input) return null;

        const itogValue = parseNumericValue(itog.textContent);
        let inputValue = parseNumericValue(input.value);

        // Логика: если значение в инпуте отрицательное — прибавляем, иначе вычитаем
        const baseSum = inputValue < 0 ? (itogValue + Math.abs(inputValue)) : (itogValue - inputValue);
        return (baseSum * CONFIG.markup).toFixed(2);
    }

    // Обновление отображаемой суммы
    function updateSumDisplay() {
        const sumElement = priceBlock?.querySelector('.urgent-order-sum');
        if (!sumElement) return;

        const newSum = calculateUrgentSum();
        if (newSum !== null) {
            originalSumValue = newSum;
            sumElement.textContent = formatNumberWithSpaces(newSum);
        }
    }

    // Копирование суммы в буфер обмена
    async function copySumToClipboard(button) {
        if (!originalSumValue) return;
        
        try {
            await navigator.clipboard.writeText(originalSumValue);
            const originalText = button.textContent;
            button.textContent = '✓ Скопировано!';
            button.style.backgroundColor = '#20c997';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
            }, 2000);
            
            // 🔥 Уведомление через API, если доступно
            if (api?.showToast) {
                api.showToast({ message: 'Цена скопирована в буфер', type: 'success' });
            }
        } catch (err) {
            console.warn('[UrgentPrice] Не удалось скопировать:', err);
            if (api?.showToast) {
                api.showToast({ message: 'Ошибка копирования', type: 'error' });
            }
        }
    }

    // Создание DOM-элемента блока цены
    function createPriceBlockElement() {
        const block = document.createElement('div');
        block.className = 'urgent-order-price';
        block.dataset[CONFIG.uniquePrefix.replace('-', '') + 'created'] = 'true';

        // 🔥 Стили через CSS-переменные для гибкой кастомизации
        const defaultStyles = {
            backgroundColor: '#007BFF',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            color: 'white',
            textAlign: 'center',
            fontFamily: 'inherit',
            marginBottom: '10px'
        };
        
        Object.assign(block.style, { ...defaultStyles, ...CONFIG.styles });

        // Заголовок
        const header = document.createElement('h4');
        header.textContent = '💨 Цена срочного заказа';
        Object.assign(header.style, {
            color: '#FFFFFF',
            margin: '0 0 10px 0',
            fontSize: '18px',
            fontWeight: '600'
        });
        block.appendChild(header);

        // Сумма
        const sumElement = document.createElement('div');
        sumElement.className = 'urgent-order-sum';
        Object.assign(sumElement.style, {
            color: '#FFD700',
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
        });
        block.appendChild(sumElement);

        // Кнопка копирования
        const copyButton = document.createElement('button');
        copyButton.className = 'urgent-order-copy-btn';
        copyButton.textContent = '📋 Скопировать цену';
        Object.assign(copyButton.style, {
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s',
            fontWeight: '500'
        });
        
        copyButton.addEventListener('mouseenter', (e) => {
            e.target.style.backgroundColor = '#218838';
        });
        copyButton.addEventListener('mouseleave', (e) => {
            e.target.style.backgroundColor = '#28a745';
        });
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            copySumToClipboard(e.target);
        });
        
        block.appendChild(copyButton);

        return block;
    }

    // Настройка MutationObserver для отслеживания изменений
    function setupObserver() {
        if (observer) observer.disconnect();
        
        const { itog, input } = getElements();
        if (!itog || !input) return;

        observer = new MutationObserver((mutations) => {
            // Обновляем сумму при изменении текста или атрибутов
            const shouldUpdate = mutations.some(m => 
                m.type === 'characterData' || 
                m.type === 'childList' || 
                (m.type === 'attributes' && m.attributeName === 'value')
            );
            if (shouldUpdate) {
                utils?.debounce?.(updateSumDisplay, 100) || updateSumDisplay();
            }
        });

        observer.observe(itog, { characterData: true, childList: true, subtree: true });
        observer.observe(input, { attributes: true, attributeFilter: ['value'] });
    }

    // Инициализация модуля
    function init() {
        if (!CONFIG.enabled || active) return;
        
        const { target, itog, input } = getElements();
        if (!target || !itog || !input) {
            console.warn('[UrgentPrice] Не найдены целевые элементы. Проверьте селекторы в config.');
            return;
        }

        // Проверка: не создан ли уже блок
        if (target.querySelector('.urgent-order-price')) {
            active = true;
            return;
        }

        // Создание и вставка блока
        priceBlock = createPriceBlockElement();
        target.prepend(priceBlock); // Вставляем в начало, чтобы не перекрывать другие элементы

        // Инициализация суммы
        updateSumDisplay();
        
        // Настройка наблюдателя
        setupObserver();
        
        active = true;
        console.log('[UrgentPrice] ✅ Модуль активен');
    }

    // Очистка: удаление блока и отключение наблюдателя
    function cleanup() {
        if (!active) return;
        
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        if (priceBlock?.parentNode) {
            priceBlock.parentNode.removeChild(priceBlock);
            priceBlock = null;
        }
        
        originalSumValue = '';
        active = false;
        console.log('[UrgentPrice] 🧹 Модуль деактивирован');
    }

    // Переключение состояния
    function toggle() {
        active ? cleanup() : init();
    }

    // Проверка активности
    function isActive() {
        return active;
    }

    // Публичный метод для принудительного пересчёта (вызов извне)
    function recalculate() {
        if (active) updateSumDisplay();
    }

    // 🔥 Авто-запуск при загрузке (если не отключено в config)
    if (CONFIG.enabled && config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // Небольшая задержка для гарантии, что целевые элементы отрендерились
            setTimeout(init, 100);
        }
    }

    // 🔥 Экспорт публичного API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        recalculate,
        getConfig: () => ({ ...CONFIG }) // Только для чтения
    };

})(config, GM, utils, api);