// 1closeOldBill.js — модуль блокировки документов за закрытый квартал
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'close-old-bill-';
    const SELECTORS = {
        targetBlock: config?.selectors?.targetBlock || '#Doc > div.bigform > div:nth-child(1)',
        tableElement: config?.selectors?.tableElement || '#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table',
        divElement: config?.selectors?.divElement || '#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > div > div',
        buttonElement: config?.selectors?.buttonElement || '#Doc > div.bigform > div:nth-child(2) > button',
        divButtonElement: config?.selectors?.divButtonElement || '#Doc > div.bigform > div:nth-child(2) > div:nth-child(3)',
        summaElement: config?.selectors?.summaElement || '#Summa',
        tabElement: config?.selectors?.tabElement || '#FormTabs > li:nth-child(2) > a',
        dateElement: config?.selectors?.dateElement || '#Date'
    };
    const TEXTS = {
        noticeText: config?.texts?.noticeText || 'ДАТЫ ЗАКРЫТЫ',
        tooltipText: config?.texts?.tooltipText || 'Период в котором был сформирован документ - закрыт, для внесения правок обратитесь к главному бухгалтеру!'
    };
    const QUARTER_CLOSE_DATES = config?.quarterCloseDates || {
        Q1: { month: 3, day: 10 },   // Апрель 10
        Q2: { month: 6, day: 10 },   // Июль 10
        Q3: { month: 9, day: 10 },   // Октябрь 10
        Q4: { month: 0, day: 19 }    // Январь 19 (след. год)
    };
    const STYLES = {
        notice: config?.styles?.notice || {
            color: 'blue',
            fontSize: '16px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            cursor: 'pointer'
        },
        tooltip: config?.styles?.tooltip || {
            backgroundColor: 'black',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            width: '310px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
        },
        disabledOpacity: config?.styles?.disabledOpacity || '0.7'
    };
    const CHECK_INTERVAL = config?.checkInterval || 1000;

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let checkInterval = null;
    let modifiedElements = []; // { el, originalStyles, type }
    let isPageModified = false;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты: отслеживание и восстановление стилей
    // ─────────────────────────────────────────────
    function trackModified(element, type, styles = {}) {
        if (!modifiedElements.find(e => e.el === element && e.type === type)) {
            const original = {};
            Object.keys(styles).forEach(key => {
                original[key] = element.style[key];
            });
            modifiedElements.push({ el: element, type, original });
        }
    }

    function restoreElement({ el, original }) {
        Object.keys(original).forEach(key => {
            if (original[key] === '' || original[key] === undefined) {
                el.style.removeProperty(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
            } else {
                el.style[key] = original[key];
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Парсинг даты из формата "Пятница, 28 марта 2025"
    // ─────────────────────────────────────────────
    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;

        const dateParts = dateString.split(', ');
        if (dateParts.length !== 2) return null;

        const dayMonthYear = dateParts[1].split(' ');
        if (dayMonthYear.length !== 3) return null;

        const day = parseInt(dayMonthYear[0], 10);
        const monthName = dayMonthYear[1];
        const year = parseInt(dayMonthYear[2], 10);

        const monthMap = {
            'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
            'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
            'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
        };

        const month = monthMap[monthName.toLowerCase()];
        if (month === undefined) return null;

        return new Date(year, month, day);
    }

    // ─────────────────────────────────────────────
    // 🔥 Получение даты закрытия квартала
    // ─────────────────────────────────────────────
    function getQuarterCloseDate(currentDate) {
        const year = currentDate.getFullYear();
        const quarter = Math.ceil((currentDate.getMonth() + 1) / 3);

        let closeMonth, closeDay;
        if (quarter === 1) {
            closeMonth = QUARTER_CLOSE_DATES.Q1.month;
            closeDay = QUARTER_CLOSE_DATES.Q1.day;
        } else if (quarter === 2) {
            closeMonth = QUARTER_CLOSE_DATES.Q2.month;
            closeDay = QUARTER_CLOSE_DATES.Q2.day;
        } else if (quarter === 3) {
            closeMonth = QUARTER_CLOSE_DATES.Q3.month;
            closeDay = QUARTER_CLOSE_DATES.Q3.day;
        } else {
            closeMonth = QUARTER_CLOSE_DATES.Q4.month;
            closeDay = QUARTER_CLOSE_DATES.Q4.day;
        }

        if (quarter === 4) {
            return new Date(year + 1, closeMonth, closeDay);
        }
        return new Date(year, closeMonth, closeDay);
    }

    // ─────────────────────────────────────────────
    // 🔥 Модификация страницы (блокировка)
    // ─────────────────────────────────────────────
    function modifyPage() {
        if (isPageModified) return;
        isPageModified = true;

        // 1. Заменяем содержимое целевого блока
        const targetBlock = document.querySelector(SELECTORS.targetBlock);
        if (targetBlock) {
            trackModified(targetBlock, 'innerHTML', { innerHTML: targetBlock.innerHTML });
            targetBlock.innerHTML = `
                <div id="${UNIQUE_PREFIX}notice" style="
                    color: ${STYLES.notice.color};
                    font-size: ${STYLES.notice.fontSize};
                    font-weight: ${STYLES.notice.fontWeight};
                    text-transform: ${STYLES.notice.textTransform};
                    position: relative;
                    cursor: ${STYLES.notice.cursor};
                ">
                    ${TEXTS.noticeText}
                    <div id="${UNIQUE_PREFIX}tooltip" style="
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: ${STYLES.tooltip.backgroundColor};
                        color: ${STYLES.tooltip.color};
                        padding: ${STYLES.tooltip.padding};
                        border-radius: ${STYLES.tooltip.borderRadius};
                        text-align: center;
                        z-index: 10000;
                        ${STYLES.tooltip.boxShadow ? `box-shadow: ${STYLES.tooltip.boxShadow};` : ''}
                        font-size: ${STYLES.tooltip.fontSize};
                        width: ${STYLES.tooltip.width};
                        pointer-events: none;
                    ">
                        ${TEXTS.tooltipText}
                    </div>
                </div>
            `;

            // Обработчики tooltip
            const noticeEl = document.getElementById(`${UNIQUE_PREFIX}notice`);
            const tooltipEl = document.getElementById(`${UNIQUE_PREFIX}tooltip`);
            if (noticeEl && tooltipEl) {
                const mouseEnter = () => { tooltipEl.style.display = 'block'; };
                const mouseLeave = () => { tooltipEl.style.display = 'none'; };
                noticeEl.addEventListener('mouseenter', mouseEnter);
                noticeEl.addEventListener('mouseleave', mouseLeave);
                noticeEl._buhTooltipHandlers = { mouseEnter, mouseLeave };
            }
        }

        // 2. Делаем таблицу неактивной
        const tableEl = document.querySelector(SELECTORS.tableElement);
        if (tableEl) {
            trackModified(tableEl, 'disabled', { pointerEvents: tableEl.style.pointerEvents, opacity: tableEl.style.opacity });
            tableEl.style.setProperty('pointer-events', 'none', 'important');
            tableEl.style.setProperty('opacity', STYLES.disabledOpacity, 'important');
        }

        // 3. Делаем блок неактивным
        const divEl = document.querySelector(SELECTORS.divElement);
        if (divEl) {
            trackModified(divEl, 'disabled', { pointerEvents: divEl.style.pointerEvents, opacity: divEl.style.opacity });
            divEl.style.setProperty('pointer-events', 'none', 'important');
            divEl.style.setProperty('opacity', STYLES.disabledOpacity, 'important');
        }

        // 4. Скрываем кнопки
        const btnEl = document.querySelector(SELECTORS.buttonElement);
        if (btnEl) {
            trackModified(btnEl, 'hidden', { display: btnEl.style.display });
            btnEl.style.setProperty('display', 'none', 'important');
        }

        const divBtnEl = document.querySelector(SELECTORS.divButtonElement);
        if (divBtnEl) {
            trackModified(divBtnEl, 'hidden', { display: divBtnEl.style.display });
            divBtnEl.style.setProperty('display', 'none', 'important');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка условий блокировки
    // ─────────────────────────────────────────────
    function checkConditions() {
        const summaEl = document.querySelector(SELECTORS.summaElement);
        const tabEl = document.querySelector(SELECTORS.tabElement);

        if (!summaEl || !tabEl) return false;

        const dateEl = document.querySelector(SELECTORS.dateElement);
        if (!dateEl) return false;

        const dateString = dateEl.value?.trim();
        const parsedDate = parseDate(dateString);
        if (!parsedDate) return false;

        const currentDate = new Date();
        const quarterCloseDate = getQuarterCloseDate(parsedDate);

        if (currentDate <= quarterCloseDate) return false;

        modifyPage();
        return true;
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            if (!isPageModified) {
                checkConditions();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Запуск периодической проверки
    // ─────────────────────────────────────────────
    function startPolling() {
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => {
            if (!isPageModified) {
                checkConditions();
            }
        }, CHECK_INTERVAL);
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        if (!isPageModified) {
            checkConditions();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        startPolling();
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
        
        // Очищаем интервал
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        // 🔥 Восстанавливаем все изменённые элементы
        modifiedElements.forEach(restoreElement);
        modifiedElements = [];
        
        // Удаляем обработчики tooltip
        document.querySelectorAll(`[id^="${UNIQUE_PREFIX}notice"]`).forEach(el => {
            if (el._buhTooltipHandlers) {
                el.removeEventListener('mouseenter', el._buhTooltipHandlers.mouseEnter);
                el.removeEventListener('mouseleave', el._buhTooltipHandlers.mouseLeave);
                delete el._buhTooltipHandlers;
            }
        });
        
        // Сброс состояния
        isPageModified = false;
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        if (!isPageModified) checkConditions();
    }

    function forceModifyPage() {
        modifyPage();
    }

    function resetPage() {
        cleanup();
        isPageModified = false;
    }

    function setCheckInterval(ms) {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = setInterval(() => {
                if (!isPageModified) checkConditions();
            }, ms);
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
        refresh,
        forceModifyPage,
        resetPage,
        setCheckInterval
    };

})(config, GM, utils, api);