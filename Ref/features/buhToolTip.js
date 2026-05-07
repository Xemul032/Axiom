// buhToolTip.js — модуль tooltip и блокировки пунктов меню для бухгалтерии
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'buh-tooltip-';
    const SELECTORS = {
        dropdown: config?.selectors?.dropdown || '#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown',
        dropdownMenu: config?.selectors?.dropdownMenu || '#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown > ul',
        dLabel: config?.selectors?.dLabel || '#dLabel',
        invoiceList: config?.selectors?.invoiceList || '#InvoiceProductList',
        clientChosen: config?.selectors?.clientChosen || '#Client_chosen > a',
        actItem: config?.selectors?.actItem || '#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown.open > ul > li:nth-child(3)',
        upduItem: config?.selectors?.upduItem || '#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown.open > ul > li:nth-child(4)'
    };
    const TEXTS = {
        actText: config?.texts?.actText || 'Акт',
        upduText: config?.texts?.upduText || 'УПД',
        tooltipMessage: config?.texts?.tooltipMessage || 'Невозможно выставить документ на некорректный счет. Устраните ошибки в счете или обратитесь в бухгалтерию.'
    };
    const CLASSES = {
        dropdownOpen: config?.classes?.dropdownOpen || 'open',
        animateClass: config?.classes?.animateClass || 'animate'
    };
    const ANIMATION = {
        duration: config?.animation?.duration || 300,
        delay: config?.animation?.delay || 0
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let tooltipEl = null;
    let styleEl = null;
    let observer = null;
    let outsideClickHandler = null;
    let processedItems = new Set(); // Для отслеживания обработанных элементов

    // ─────────────────────────────────────────────
    // 🔥 Внедрение стилей
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (styleEl) return;
        
        styleEl = document.createElement('style');
        styleEl.id = `${UNIQUE_PREFIX}styles`;
        styleEl.textContent = `
            /* Прячем выпадающее меню по умолчанию */
            ${SELECTORS.dropdownMenu} {
                display: block !important;
                opacity: 0 !important;
                transform: scaleY(0.95) !important;
                transform-origin: top !important;
                transition: all ${ANIMATION.duration}ms ease !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                background-color: white !important;
                border: 1px solid #ccc !important;
                min-width: 160px !important;
                z-index: 9999 !important;
                position: absolute !important;
                margin-top: 4px !important;
                pointer-events: none !important;
            }

            /* Класс для анимации появления */
            ${SELECTORS.dropdownMenu}.${CLASSES.animateClass} {
                opacity: 1 !important;
                transform: scaleY(1) !important;
                pointer-events: auto !important;
            }
            
            /* Визуальные подсказки для заблокированных пунктов */
            [data-${UNIQUE_PREFIX}blocked] {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // ─────────────────────────────────────────────
    // 🔥 Tooltip
    // ─────────────────────────────────────────────
    function createTooltip() {
        if (tooltipEl) return;
        
        tooltipEl = document.createElement('div');
        tooltipEl.id = `${UNIQUE_PREFIX}tooltip`;
        tooltipEl.innerText = TEXTS.tooltipMessage;
        tooltipEl.style.cssText = `
            position: fixed !important;
            z-index: 9999999 !important;
            background-color: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            padding: 10px 14px !important;
            border-radius: 6px !important;
            max-width: 300px !important;
            word-wrap: break-word !important;
            font-size: 14px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: opacity ${ANIMATION.duration}ms ease, visibility ${ANIMATION.duration}ms !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            line-height: 1.4 !important;
        `;
        document.body.appendChild(tooltipEl);
    }

    function showTooltip(x, y) {
        if (!tooltipEl) createTooltip();
        tooltipEl.style.left = `${x + 10}px`;
        tooltipEl.style.top = `${y + 10}px`;
        tooltipEl.style.opacity = '1';
        tooltipEl.style.visibility = 'visible';
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.style.opacity = '0';
            tooltipEl.style.visibility = 'hidden';
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработка меню
    // ─────────────────────────────────────────────
    function processDropdownMenu() {
        const invoiceList = document.querySelector(SELECTORS.invoiceList);
        const clientChosen = document.querySelector(SELECTORS.clientChosen);

        if (!invoiceList) return;

        const actItem = document.querySelector(SELECTORS.actItem);
        const upduItem = document.querySelector(SELECTORS.upduItem);

        // Скрытие "Акт"
        if (actItem && actItem.innerText.trim() === TEXTS.actText && !processedItems.has('act')) {
            actItem.style.setProperty('display', 'none', 'important');
            actItem.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
            processedItems.add('act');
        }

        // Обработка "УПД"
        if (upduItem && clientChosen && !processedItems.has('updu')) {
            // Tooltip handlers
            const mouseEnter = (e) => showTooltip(e.pageX, e.pageY);
            const mouseMove = (e) => showTooltip(e.pageX, e.pageY);
            
            upduItem.addEventListener('mouseenter', mouseEnter);
            upduItem.addEventListener('mouseleave', hideTooltip);
            upduItem.addEventListener('mousemove', mouseMove);

            // Блокировка клика
            const clickBlocker = (e) => {
                e.stopPropagation();
                e.preventDefault();
            };
            upduItem.addEventListener('click', clickBlocker);

            // Блокировка подменю
            const subMenu = upduItem.querySelector('ul.dropdown-menu');
            if (subMenu) {
                subMenu.style.setProperty('display', 'none', 'important');
                subMenu.style.setProperty('pointer-events', 'none', 'important');
                if (subMenu.parentElement?.classList.contains('dropdown-submenu')) {
                    subMenu.parentElement.classList.remove('dropdown-submenu');
                }
            }

            // Визуальная подсказка
            upduItem.setAttribute(`data-${UNIQUE_PREFIX}blocked`, 'true');
            upduItem.setAttribute(`data-${UNIQUE_PREFIX}tooltip-added`, 'true');
            
            // Сохраняем обработчики для удаления в cleanup
            upduItem._buhTooltipHandlers = { mouseEnter, mouseMove, clickBlocker };
            
            processedItems.add('updu');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработка открытия меню
    // ─────────────────────────────────────────────
    function waitForDropdownAndProcess() {
        const dropdown = document.querySelector(SELECTORS.dropdown);
        if (!dropdown) return;
        
        const menu = dropdown.querySelector('ul');
        if (!menu) return;

        // Открытие меню
        dropdown.classList.add(CLASSES.dropdownOpen);

        // Сброс анимации
        menu.classList.remove(CLASSES.animateClass);
        void menu.offsetWidth; // trigger reflow

        // Обработка пунктов
        processDropdownMenu();

        // Анимация появления
        setTimeout(() => {
            menu.classList.add(CLASSES.animateClass);
        }, ANIMATION.delay);

        // Обработчик клика вне меню
        if (!dropdown.dataset?.[`${UNIQUE_PREFIX}outsideClickSet`]) {
            setupOutsideClickHandler(menu);
            dropdown.dataset[`${UNIQUE_PREFIX}outsideClickSet`] = 'true';
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Закрытие меню при клике вне
    // ─────────────────────────────────────────────
    function setupOutsideClickHandler(menuElement) {
        if (outsideClickHandler) {
            document.removeEventListener('click', outsideClickHandler);
        }
        
        outsideClickHandler = function(e) {
            const dropdown = menuElement?.closest?.('.dropdown');
            const dLabel = document.querySelector(SELECTORS.dLabel);
            
            if (!dropdown?.contains(e.target) && e.target !== dLabel) {
                dropdown?.classList?.remove(CLASSES.dropdownOpen);
                menuElement?.classList?.remove(CLASSES.animateClass);
            }
        };
        
        document.addEventListener('click', outsideClickHandler);
    }

    // ─────────────────────────────────────────────
    // 🔥 Наблюдение за #dLabel
    // ─────────────────────────────────────────────
    function observeDLabel() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            const dLabel = document.querySelector(SELECTORS.dLabel);
            if (dLabel && !dLabel.dataset?.[`${UNIQUE_PREFIX}listenerAdded`]) {
                dLabel.addEventListener('click', () => {
                    setTimeout(waitForDropdownAndProcess, 0);
                });
                dLabel.dataset[`${UNIQUE_PREFIX}listenerAdded`] = 'true';
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений к существующим элементам
    // ─────────────────────────────────────────────
    function applyChanges() {
        injectStyles();
        createTooltip();
        observeDLabel();
        
        // Первичная проверка
        const dLabel = document.querySelector(SELECTORS.dLabel);
        if (dLabel) {
            waitForDropdownAndProcess();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Удаляем стили
        if (styleEl?.parentNode) {
            styleEl.parentNode.removeChild(styleEl);
            styleEl = null;
        }
        
        // Удаляем tooltip
        if (tooltipEl?.parentNode) {
            tooltipEl.parentNode.removeChild(tooltipEl);
            tooltipEl = null;
        }
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // Отключаем обработчик клика вне
        if (outsideClickHandler) {
            document.removeEventListener('click', outsideClickHandler);
            outsideClickHandler = null;
        }
        
        // 🔥 Восстанавливаем обработанные элементы
        // "Акт"
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}hidden]`).forEach(el => {
            el.style.removeProperty('display');
            el.removeAttribute(`data-${UNIQUE_PREFIX}hidden`);
        });
        
        // "УПД" — убираем блокировку и обработчики
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}blocked]`).forEach(el => {
            el.style.removeProperty('opacity');
            el.style.removeProperty('cursor');
            el.removeAttribute(`data-${UNIQUE_PREFIX}blocked`);
            
            // Удаляем обработчики событий
            if (el._buhTooltipHandlers) {
                el.removeEventListener('mouseenter', el._buhTooltipHandlers.mouseEnter);
                el.removeEventListener('mouseleave', hideTooltip);
                el.removeEventListener('mousemove', el._buhTooltipHandlers.mouseMove);
                el.removeEventListener('click', el._buhTooltipHandlers.clickBlocker);
                delete el._buhTooltipHandlers;
            }
            el.removeAttribute(`data-${UNIQUE_PREFIX}tooltip-added`);
        });
        
        // Сбрасываем флаги
        processedItems.clear();
        
        // Сбрасываем дата-атрибуты на dropdown
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}outsideClickSet]`).forEach(el => {
            el.removeAttribute(`data-${UNIQUE_PREFIX}outsideClickSet`);
        });
        document.querySelectorAll(`[data-${UNIQUE_PREFIX}listenerAdded]`).forEach(el => {
            el.removeAttribute(`data-${UNIQUE_PREFIX}listenerAdded`);
        });
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        applyChanges();
    }

    function forceShowTooltip(x, y) {
        showTooltip(x, y);
    }

    function forceHideTooltip() {
        hideTooltip();
    }

    function resetProcessed() {
        processedItems.clear();
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
        forceShowTooltip,
        forceHideTooltip,
        resetProcessed
    };

})(config, GM, utils, api);