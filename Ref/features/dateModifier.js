// dateModifier.js — модуль модификации дат: скрытие времени, прибавление дней, перенос воскресенья
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, forceProcess }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, параметры) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Параметры модификации дат
    const DAYS_TO_ADD = 0;              // Количество дней для прибавления (0 = не прибавлять)
    
    // 🔥 Уникальный префикс для изоляции
    const UNIQUE_PREFIX = config?.uniquePrefix || 'date-modifier-';
    
    // Селекторы элементов
    const SELECTORS = {
        managerList: '#ManagerList',
        planBlock: 'td.PlanBlock',
        utCalcResult: '#UtCalcResult',
        dateReady: '.DateReady',
        planReady: '.PlanReady'
    };

    // Маппинг месяцев (родительный падеж) - все в нижнем регистре
    const MONTHS_GENITIVE = {
        'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
        'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
        'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
    };

    const MONTHS_GENITIVE_ARRAY = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    // Дни недели
    const DAYS_OF_WEEK = [
        'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
        'Четверг', 'Пятница', 'Суббота'
    ];

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let processedElements = null;
    let originalTexts = null; // Для восстановления при отключении

    // ─────────────────────────────────────────────
    // 🔥 Универсальная функция прибавления дней с переносом воскресенья
    // ─────────────────────────────────────────────
    function addDaysWithSundayShift(date, days) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);

        // Если выпало на воскресенье (0 в JS), переносим на понедельник (+1 день)
        if (newDate.getDay() === 0) {
            newDate.setDate(newDate.getDate() + 1);
        }

        return newDate;
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработка #ManagerList
    // ─────────────────────────────────────────────
    function processManagerList() {
        const managerList = document.querySelector(SELECTORS.managerList);
        if (!managerList) return;

        const spans = managerList.querySelectorAll('div.ax-table-body table span');

        spans.forEach(span => {
            if (processedElements.has(span)) return;

            const text = span.textContent.trim();
            const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})$/);

            if (match) {
                const [, day, month, year] = match;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                let newDate = date;
                if (DAYS_TO_ADD > 0) {
                    newDate = addDaysWithSundayShift(date, DAYS_TO_ADD);
                }

                const newDay = String(newDate.getDate()).padStart(2, '0');
                const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
                const newYear = newDate.getFullYear();

                // Сохраняем оригинальный текст для восстановления
                if (!originalTexts.has(span)) {
                    originalTexts.set(span, text);
                }

                span.textContent = `${newDay}.${newMonth}.${newYear}`;
                processedElements.add(span);
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработка #Summary PlanBlock
    // ─────────────────────────────────────────────
    function processSummaryPlanBlock() {
        const planBlocks = document.querySelectorAll(SELECTORS.planBlock);

        planBlocks.forEach((planBlock) => {
            if (processedElements.has(planBlock)) return;

            const dateReady = planBlock.querySelector(SELECTORS.dateReady);
            const planReady = planBlock.querySelector(SELECTORS.planReady);

            // Скрываем точное время
            if (planReady && !processedElements.has(planReady)) {
                // Сохраняем оригинальный display для восстановления
                if (!originalTexts.has(planReady)) {
                    originalTexts.set(planReady, { display: planReady.style.display });
                }
                planReady.style.display = 'none';
                processedElements.add(planReady);
            }

            // Прибавляем дни к дате
            if (dateReady && !processedElements.has(dateReady)) {
                const text = dateReady.textContent.trim();

                // Формат 1: "Пятница, 05/06/2026"
                let match = text.match(/^([а-яА-ЯёЁ]+),\s*(\d{2})\/(\d{2})\/(\d{4})$/);

                if (match) {
                    const [, , day, month, year] = match;
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const newDate = addDaysWithSundayShift(date, DAYS_TO_ADD);

                    const newDayName = DAYS_OF_WEEK[newDate.getDay()];
                    const newDay = String(newDate.getDate()).padStart(2, '0');
                    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
                    const newYear = newDate.getFullYear();

                    const newText = `${newDayName}, ${newDay}/${newMonth}/${newYear}`;
                    
                    if (!originalTexts.has(dateReady)) {
                        originalTexts.set(dateReady, text);
                    }

                    dateReady.textContent = newText;
                    processedElements.add(dateReady);
                    processedElements.add(planBlock);
                    return;
                }

                // Формат 2: "Пятница, 5/6/2026" (без ведущих нулей)
                match = text.match(/^([а-яА-ЯёЁ]+),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

                if (match) {
                    const [, , day, month, year] = match;
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const newDate = addDaysWithSundayShift(date, DAYS_TO_ADD);

                    const newDayName = DAYS_OF_WEEK[newDate.getDay()];
                    const newDay = String(newDate.getDate()).padStart(2, '0');
                    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
                    const newYear = newDate.getFullYear();

                    const newText = `${newDayName}, ${newDay}/${newMonth}/${newYear}`;
                    
                    if (!originalTexts.has(dateReady)) {
                        originalTexts.set(dateReady, text);
                    }

                    dateReady.textContent = newText;
                    processedElements.add(dateReady);
                    processedElements.add(planBlock);
                    return;
                }
            }

            processedElements.add(planBlock);
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработка #UtCalcResult
    // ─────────────────────────────────────────────
    function processUtCalcResult() {
        const utCalcResult = document.querySelector(SELECTORS.utCalcResult);
        if (!utCalcResult) return;

        const rows = utCalcResult.querySelectorAll('tr');

        rows.forEach(row => {
            if (processedElements.has(row)) return;

            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const link = cells[0].querySelector('a.help_link');
                if (link && link.textContent.includes('Расчетная дата:')) {
                    const dateCell = cells[1];
                    const text = dateCell.textContent.trim();

                    // Формат: "5 июня"
                    const match = text.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)$/);

                    if (match) {
                        const [, day, monthName] = match;
                        const monthIndex = MONTHS_GENITIVE[monthName.toLowerCase()];

                        if (monthIndex !== undefined) {
                            const currentYear = new Date().getFullYear();
                            const date = new Date(currentYear, monthIndex, parseInt(day));
                            const newDate = addDaysWithSundayShift(date, DAYS_TO_ADD);

                            const newDay = newDate.getDate();
                            const newMonth = MONTHS_GENITIVE_ARRAY[newDate.getMonth()];

                            const newText = `${newDay} ${newMonth}`;
                            
                            if (!originalTexts.has(dateCell)) {
                                originalTexts.set(dateCell, text);
                            }

                            dateCell.textContent = newText;
                            processedElements.add(row);
                        }
                    }
                }
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Восстановление оригинальных значений
    // ─────────────────────────────────────────────
    function restoreOriginalValues() {
        for (const [element, original] of originalTexts.entries()) {
            if (element instanceof HTMLElement) {
                if (typeof original === 'string') {
                    // Текстовое содержимое
                    element.textContent = original;
                } else if (typeof original === 'object' && original.display !== undefined) {
                    // Стили
                    element.style.display = original.display;
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Главная функция обработки
    // ─────────────────────────────────────────────
    function processAll() {
        if (!active) return;
        
        processManagerList();
        processSummaryPlanBlock();
        processUtCalcResult();
    }

    // ─────────────────────────────────────────────
    // 🔥 Инициализация наблюдателя DOM
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) return;
        
        observer = new MutationObserver((mutations) => {
            // Используем requestAnimationFrame для пакетной обработки
            requestAnimationFrame(processAll);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Очистка наблюдателя
    // ─────────────────────────────────────────────
    function cleanupObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Инициализация хранилищ
    // ─────────────────────────────────────────────
    function initState() {
        processedElements = new WeakSet();
        originalTexts = new WeakMap();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        
        active = true;
        initState();
        
        // 🔥 ЕДИНСТВЕННОЕ СООБЩЕНИЕ В КОНСОЛЬ
        console.log(`[${UNIQUE_PREFIX}] ✅ Модуль запущен`);
        
        setupObserver();
        processAll(); // Первичная обработка
    }

    function cleanup() {
        if (!active) return;
        
        active = false;
        cleanupObserver();
        restoreOriginalValues();
        
        // Очистка хранилищ
        processedElements = null;
        originalTexts = null;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительной обработки
    function forceProcess() {
        if (active) {
            processAll();
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
        forceProcess // Для внешней принудительной обработки
    };

})(config, GM, utils, api);