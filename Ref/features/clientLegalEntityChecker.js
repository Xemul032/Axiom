// clientLegalEntityChecker.js — модуль проверки юр.лиц для клиентов
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'client-legal-check-';
    const SELECTORS = {
        clientName: config?.selectors?.clientName || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > input',
        clientInn: config?.selectors?.clientInn || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2) > div > input',
        submitButton: config?.selectors?.submitButton || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > div > button.btn.btn-success',
        dangerElement: config?.selectors?.dangerElement || '#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(3) > td > div'
    };
    const TEXTS = config?.texts || {
        requiredFields: ['Название', 'ИНН', 'Полное название', 'КПП', 'БИК', 'Банк'],
        physicalPersonPrefix: 'ОПЛАТА ФИЗЛИЦА - ',
        messages: {
            innError: 'Поле ИНН не поддерживает символы кроме цифр!',
            prefixHint: 'в поле Название необходимо прописать большими буквами без кавычек "ОПЛАТА ФИЗЛИЦА - ", данный текст уже скопирован - можете просто вставить',
            duplicateWarning: 'Вы пытаетесь создать ДУБЛЬ - так нельзя! Если прям нужно создать дубль - обращайтесь к Коммерческому директору'
        }
    };
    const STYLES = {
        overlay: config?.styles?.overlay || {
            position: 'fixed',
            bottom: '0',
            width: '100vw',
            zIndex: '5000',
            height: '10%',
            backgroundColor: 'transparent',
            display: 'none'
        }
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let overlayEl = null;
    let clientNameEl = null;
    let clientInnEl = null;
    let submitBtn = null;
    let dangerObserver = null;
    let dangerVisibilityChecked = false;
    let inputHandlers = { name: null, inn: null };
    let clickHandler = null;

    // ─────────────────────────────────────────────
    // 🔥 Внедрение стилей
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}styles`)) return;
        
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            .${UNIQUE_PREFIX}overlay {
                position: ${STYLES.overlay.position} !important;
                bottom: ${STYLES.overlay.bottom} !important;
                width: ${STYLES.overlay.width} !important;
                z-index: ${STYLES.overlay.zIndex} !important;
                height: ${STYLES.overlay.height} !important;
                background-color: ${STYLES.overlay.backgroundColor} !important;
                display: ${STYLES.overlay.display} !important;
                cursor: pointer !important;
            }
            .${UNIQUE_PREFIX}overlay:hover {
                background-color: rgba(0, 145, 211, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка наличия требуемых полей на странице
    // ─────────────────────────────────────────────
    function hasRequiredFields() {
        const bodyText = document.body.innerText;
        return TEXTS.requiredFields.every(field => bodyText.includes(field));
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка названия клиента на "физ.лицо"
    // ─────────────────────────────────────────────
    function checkClientName() {
        if (!clientNameEl) return;
        
        const clientValue = clientNameEl.value.toLowerCase();
        const isPhysicalPerson = clientValue.includes('физ') && clientValue.includes('лиц');
        
        if (overlayEl) {
            overlayEl.style.display = isPhysicalPerson ? 'block' : 'none';
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик клика по оверлею
    // ─────────────────────────────────────────────
    function handleOverlayClick() {
        if (!clientNameEl) return;
        
        const clientValue = clientNameEl.value.trim();
        
        if (clientValue.startsWith(TEXTS.physicalPersonPrefix)) {
            if (overlayEl) overlayEl.style.display = 'none';
        } else {
            // Копируем префикс в буфер
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(TEXTS.physicalPersonPrefix);
            }
            
            // Показываем подсказку через глобальную функцию
            if (api?.showCenterMessage) {
                api.showCenterMessage({ 
                    message: TEXTS.messages.prefixHint, 
                    buttonText: 'Понятно', 
                    duration: 8000 
                });
            }
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка ИНН на цифры
    // ─────────────────────────────────────────────
    function checkInnForDigitsOnly() {
        if (!clientInnEl || !submitBtn) return;
        
        const innValue = clientInnEl.value;
        const hasNonDigits = /\D/.test(innValue);
        
        if (hasNonDigits) {
            if (api?.showCenterMessage) {
                api.showCenterMessage({ 
                    message: TEXTS.messages.innError, 
                    buttonText: 'ОК', 
                    duration: 3000 
                });
            }
            submitBtn.style.display = 'none';
        } else {
            submitBtn.style.display = 'block';
        }
        
        dangerVisibilityChecked = false;
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка видимости элемента #danger (дубликат)
    // ─────────────────────────────────────────────
    function checkDangerVisibility() {
        if (!submitBtn) return;
        
        const dangerEl = document.querySelector(SELECTORS.dangerElement);
        
        if (!dangerVisibilityChecked) {
            if (dangerEl && dangerEl.offsetParent !== null) {
                submitBtn.style.display = 'none';
            } else {
                submitBtn.style.display = 'block';
            }
        }
        
        dangerVisibilityChecked = true;
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка обработчиков
    // ─────────────────────────────────────────────
    function setupHandlers() {
        if (!clientNameEl || !clientInnEl) return;
        
        // Обработчик для названия клиента
        inputHandlers.name = checkClientName;
        clientNameEl.addEventListener('input', inputHandlers.name);
        
        // Обработчик для ИНН
        inputHandlers.inn = checkInnForDigitsOnly;
        clientInnEl.addEventListener('input', inputHandlers.inn);
        
        // Обработчик клика по оверлею
        clickHandler = handleOverlayClick;
        if (overlayEl) {
            overlayEl.addEventListener('click', clickHandler);
        }
        
        // Observer для отслеживания появления #danger
        dangerObserver = new MutationObserver(checkDangerVisibility);
        dangerObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ─────────────────────────────────────────────
    // 🔥 Очистка обработчиков
    // ─────────────────────────────────────────────
    function cleanupHandlers() {
        if (clientNameEl && inputHandlers.name) {
            clientNameEl.removeEventListener('input', inputHandlers.name);
        }
        if (clientInnEl && inputHandlers.inn) {
            clientInnEl.removeEventListener('input', inputHandlers.inn);
        }
        if (overlayEl && clickHandler) {
            overlayEl.removeEventListener('click', clickHandler);
        }
        if (dangerObserver) {
            dangerObserver.disconnect();
            dangerObserver = null;
        }
        inputHandlers = { name: null, inn: null };
        clickHandler = null;
        dangerVisibilityChecked = false;
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        // Ищем элементы
        clientNameEl = document.querySelector(SELECTORS.clientName);
        clientInnEl = document.querySelector(SELECTORS.clientInn);
        submitBtn = document.querySelector(SELECTORS.submitButton);
        
        // Если не нашли требуемые поля — выходим
        if (!hasRequiredFields() || !clientNameEl || !clientInnEl) {
            if (overlayEl) overlayEl.style.display = 'none';
            return;
        }
        
        // Создаём оверлей, если ещё не создан
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.className = `${UNIQUE_PREFIX}overlay`;
            overlayEl.id = `${UNIQUE_PREFIX}overlay`;
            document.body.appendChild(overlayEl);
        }
        
        // Настраиваем обработчики
        setupHandlers();
        
        // Первичная проверка
        checkClientName();
        checkInnForDigitsOnly();
        checkDangerVisibility();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        injectStyles();
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Очищаем обработчики
        cleanupHandlers();
        
        // Удаляем оверлей
        if (overlayEl?.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
            overlayEl = null;
        }
        
        // Сбрасываем ссылки на элементы
        clientNameEl = null;
        clientInnEl = null;
        submitBtn = null;
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

    function forceCheck() {
        checkClientName();
        checkInnForDigitsOnly();
        checkDangerVisibility();
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
        forceCheck
    };

})(config, GM, utils, api);