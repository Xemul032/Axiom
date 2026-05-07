// hideInfoPage.js — модуль скрытия элементов на странице информации
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'hide-info-';
    const SELECTORS = {
        input: config?.selectors?.input || 'input[type="text"].need.AddressText',
        dropdownContainer: config?.selectors?.dropdownContainer || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > div',
        nomenclatureTable: config?.selectors?.nomenclatureTable || '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3)',
        costTable: config?.selectors?.costTable || 'table.table.table-striped.table-condensed',
        deliveryLink: config?.selectors?.deliveryLink || 'a[href="#chat_8"]'
    };
    const TEXTS = {
        otherOption: config?.texts?.otherOption || '- Другое -',
        nomenclatureRows: config?.texts?.nomenclatureRows || ['Тип номенклатуры', 'Номенклатура'],
        costCell: config?.texts?.costCell || 'Себестоимость',
        deliveryText: config?.texts?.deliveryText || 'Доставка',
        deliveryReplacement: config?.texts?.deliveryReplacement || 'Упаковка'
    };
    const CLASSES = {
        dropdownActive: config?.classes?.dropdownActive || 'chosen-container-active'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let modifiedElements = []; // { el, originalStyles, originalAttrs, type }

    // ─────────────────────────────────────────────
    // 🔥 Утилиты для отслеживания изменений
    // ─────────────────────────────────────────────
    function trackModified(element, type, styles = {}, attrs = {}) {
        if (!modifiedElements.find(e => e.el === element && e.type === type)) {
            const originalStyles = {};
            const originalAttrs = {};
            
            Object.keys(styles).forEach(key => {
                originalStyles[key] = element.style[key];
            });
            Object.keys(attrs).forEach(key => {
                originalAttrs[key] = element.getAttribute(key);
            });
            
            modifiedElements.push({ el: element, type, originalStyles, originalAttrs });
        }
    }

    function restoreElement({ el, originalStyles, originalAttrs }) {
        Object.keys(originalStyles).forEach(key => {
            if (originalStyles[key] === '' || originalStyles[key] === undefined) {
                el.style.removeProperty(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
            } else {
                el.style[key] = originalStyles[key];
            }
        });
        Object.keys(originalAttrs).forEach(key => {
            if (originalAttrs[key] === null || originalAttrs[key] === undefined) {
                el.removeAttribute(key);
            } else {
                el.setAttribute(key, originalAttrs[key]);
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 1. Скрытие input
    // ─────────────────────────────────────────────
    function hideInput(el) {
        if (!el || el.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) return;
        
        trackModified(el, 'input', { opacity: el.style.opacity, pointerEvents: el.style.pointerEvents }, { 'data-hidden': null });
        
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
    }

    // ─────────────────────────────────────────────
    // 🔥 2. Скрытие пункта "- Другое -" в активном дропдауне
    // ─────────────────────────────────────────────
    function hideOtherOption(container) {
        if (!container || !container.classList.contains(CLASSES.dropdownActive)) return;

        const drop = container.querySelector('.chosen-drop');
        if (!drop) return;

        const otherItem = Array.from(drop.querySelectorAll('li, div, span')).find(el =>
            el.textContent.trim() === TEXTS.otherOption
        );

        if (otherItem && !otherItem.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) {
            trackModified(otherItem, 'otherOption', { display: otherItem.style.display }, { 'data-hidden': null });
            otherItem.style.setProperty('display', 'none', 'important');
            otherItem.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 3. Скрытие строк "Тип номенклатуры" и "Номенклатура"
    // ─────────────────────────────────────────────
    function hideSpecificNomenclatureRows(container) {
        if (!container) return;

        const rows = container.querySelectorAll('tr');
        rows.forEach(row => {
            const firstTd = row.querySelector('td:first-child');
            if (!firstTd) return;

            const text = firstTd.textContent.trim();
            if (TEXTS.nomenclatureRows.includes(text) && !row.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) {
                trackModified(row, 'nomenclatureRow', { opacity: row.style.opacity, pointerEvents: row.style.pointerEvents }, { 'data-hidden': null });
                row.style.setProperty('opacity', '0.5', 'important');
                row.style.setProperty('pointer-events', 'none', 'important');
                row.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 4. Скрытие таблицы с "Себестоимость"
    // ─────────────────────────────────────────────
    function hideCostTable() {
        const tables = document.querySelectorAll(SELECTORS.costTable);
        tables.forEach(table => {
            const hasCostTd = Array.from(table.querySelectorAll('td')).some(td =>
                td.textContent.trim() === TEXTS.costCell
            );
            if (hasCostTd && !table.hasAttribute(`data-${UNIQUE_PREFIX}hidden`)) {
                trackModified(table, 'costTable', { opacity: table.style.opacity, pointerEvents: table.style.pointerEvents }, { 'data-hidden': null });
                table.style.setProperty('opacity', '0', 'important');
                table.style.setProperty('pointer-events', 'none', 'important');
                table.setAttribute(`data-${UNIQUE_PREFIX}hidden`, 'true');
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 5. Замена "Доставка" на "Упаковка"
    // ─────────────────────────────────────────────
    function replaceDeliveryWithPacking() {
        const deliveryLinks = document.querySelectorAll(SELECTORS.deliveryLink);
        deliveryLinks.forEach(link => {
            if (link.textContent.trim() === TEXTS.deliveryText && !link.hasAttribute(`data-${UNIQUE_PREFIX}renamed`)) {
                trackModified(link, 'deliveryLink', {}, { textContent: link.textContent, 'data-renamed': null });
                link.textContent = TEXTS.deliveryReplacement;
                link.setAttribute(`data-${UNIQUE_PREFIX}renamed`, 'true');
            }
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение всех изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        // 1. Скрытие input
        document.querySelectorAll(SELECTORS.input).forEach(hideInput);

        // 2. Скрытие "- Другое -"
        const dropdownContainer = document.querySelector(SELECTORS.dropdownContainer);
        if (dropdownContainer) hideOtherOption(dropdownContainer);

        // 3. Скрытие строк номенклатуры
        const nomenclatureContainer = document.querySelector(SELECTORS.nomenclatureTable);
        if (nomenclatureContainer) hideSpecificNomenclatureRows(nomenclatureContainer);

        // 4. Скрытие таблицы себестоимости
        hideCostTable();

        // 5. Замена "Доставка" → "Упаковка"
        replaceDeliveryWithPacking();
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        
                        if (node.matches && node.matches(SELECTORS.input)) hideInput(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll(SELECTORS.input).forEach(hideInput);
                        }

                        // Выпадающий список
                        let dropdownContainers = [];
                        if (node.matches && node.matches(SELECTORS.dropdownContainer)) {
                            dropdownContainers.push(node);
                        }
                        if (node.querySelectorAll) {
                            dropdownContainers = dropdownContainers.concat(Array.from(node.querySelectorAll(SELECTORS.dropdownContainer)));
                        }
                        dropdownContainers.forEach(hideOtherOption);

                        // Таблица номенклатуры
                        if (node.matches && node.matches(SELECTORS.nomenclatureTable)) {
                            hideSpecificNomenclatureRows(node);
                        }
                        if (node.querySelectorAll) {
                            node.querySelectorAll(SELECTORS.nomenclatureTable).forEach(hideSpecificNomenclatureRows);
                        }

                        // Таблица себестоимости
                        if (node.tagName === 'TABLE' || (node.querySelectorAll && node.querySelectorAll('table').length > 0)) {
                            hideCostTable();
                        }

                        // Замена "Доставка" → "Упаковка"
                        if ((node.tagName === 'A' && node.href?.includes('#chat_8')) || 
                            (node.querySelectorAll && node.querySelectorAll(SELECTORS.deliveryLink).length > 0)) {
                            replaceDeliveryWithPacking();
                        }
                    });
                }

                // Отслеживаем изменение классов (активация дропдауна)
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.nodeType === Node.ELEMENT_NODE && target.matches?.(SELECTORS.dropdownContainer)) {
                        hideOtherOption(target);
                    }
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
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
        applyChanges();
    }

    function resetStyles() {
        cleanup();
        applyChanges();
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