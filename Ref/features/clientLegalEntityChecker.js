// 1clientLegalEntityChecker.js — модуль проверки юр.лиц для клиентов
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
    let initialized = false; // 🔥 Флаг: обработчики навешаны или нет
    let dangerVisibilityChecked = false;
    
    // 🔥 Ссылки на элементы и обработчики (для очистки)
    let clientNameEl = null;
    let clientInnEl = null;
    let submitBtn = null;
    let dangerObserver = null;
    let nameInputHandler = null;
    let innInputHandler = null;
    let overlayClickHandler = null;

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
    // 🔥 🔥 НАВЕШИВАНИЕ ОБРАБОТЧИКОВ (только когда элементы есть)
    // ─────────────────────────────────────────────
    function attachHandlers() {
        if (initialized) return;
        
        // Пересобираем элементы
        clientNameEl = document.querySelector(SELECTORS.clientName);
        clientInnEl = document.querySelector(SELECTORS.clientInn);
        submitBtn = document.querySelector(SELECTORS.submitButton);
        
        // Если не нашли всё необходимое — выходим
        if (!hasRequiredFields() || !clientNameEl || !clientInnEl || !submitBtn) {
            return;
        }
        
        // Создаём оверлей, если ещё не создан
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.className = `${UNIQUE_PREFIX}overlay`;
            overlayEl.id = `${UNIQUE_PREFIX}overlay`;
            document.body.appendChild(overlayEl);
        }
        
        // 🔥 Создаём и сохраняем обработчики
        nameInputHandler = () => checkClientName();
        innInputHandler = () => checkInnForDigitsOnly();
        overlayClickHandler = () => handleOverlayClick();
        
        // 🔥 Навешиваем обработчики
        clientNameEl.addEventListener('input', nameInputHandler);
        clientInnEl.addEventListener('input', innInputHandler);
        overlayEl.addEventListener('click', overlayClickHandler);
        
        // 🔥 Observer для #danger
        dangerObserver = new MutationObserver(() => {
            dangerVisibilityChecked = false;
            checkDangerVisibility();
        });
        dangerObserver.observe(document.body, { childList: true, subtree: true });
        
        // 🔥 Первичная проверка
        checkClientName();
        checkInnForDigitsOnly();
        checkDangerVisibility();
        
        initialized = true;
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 ОТВЯЗЫВАНИЕ ОБРАБОТЧИКОВ (когда элементы пропали)
    // ─────────────────────────────────────────────
    function detachHandlers() {
        if (!initialized) return;
        
        // Снимаем обработчики
        if (clientNameEl && nameInputHandler) {
            clientNameEl.removeEventListener('input', nameInputHandler);
        }
        if (clientInnEl && innInputHandler) {
            clientInnEl.removeEventListener('input', innInputHandler);
        }
        if (overlayEl && overlayClickHandler) {
            overlayEl.removeEventListener('click', overlayClickHandler);
        }
        if (dangerObserver) {
            dangerObserver.disconnect();
            dangerObserver = null;
        }
        
        // Скрываем оверлей
        if (overlayEl) {
            overlayEl.style.display = 'none';
        }
        
        // Сбрасываем ссылки
        clientNameEl = null;
        clientInnEl = null;
        submitBtn = null;
        dangerVisibilityChecked = false;
        initialized = false;
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 OBSERVER: отслеживаем появление/исчезновение ключевых элементов
    // ─────────────────────────────────────────────
    function setupElementsObserver() {
        const observer = new MutationObserver(() => {
            // Проверяем наличие ключевых элементов
            const nameExists = !!document.querySelector(SELECTORS.clientName);
            const innExists = !!document.querySelector(SELECTORS.clientInn);
            const submitExists = !!document.querySelector(SELECTORS.submitButton);
            const fieldsExist = hasRequiredFields();
            
            // 🔥 Если все элементы есть И обработчики ещё не навешаны — навешиваем
            if (nameExists && innExists && submitExists && fieldsExist && !initialized) {
                attachHandlers();
            }
            // 🔥 Если хотя бы одного элемента нет И обработчики навешаны — отвязываем
            else if ((!nameExists || !innExists || !submitExists || !fieldsExist) && initialized) {
                detachHandlers();
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // 🔥 Первичная проверка при запуске
        setTimeout(() => {
            const nameExists = !!document.querySelector(SELECTORS.clientName);
            const innExists = !!document.querySelector(SELECTORS.clientInn);
            const submitExists = !!document.querySelector(SELECTORS.submitButton);
            const fieldsExist = hasRequiredFields();
            
            if (nameExists && innExists && submitExists && fieldsExist) {
                attachHandlers();
            }
        }, 100);
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        injectStyles();
        setupElementsObserver();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // 🔥 Отвязываем все обработчики
        detachHandlers();
        
        // 🔥 Удаляем оверлей
        if (overlayEl?.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
            overlayEl = null;
        }
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        // Принудительно перепроверить состояние
        const nameExists = !!document.querySelector(SELECTORS.clientName);
        const innExists = !!document.querySelector(SELECTORS.clientInn);
        const submitExists = !!document.querySelector(SELECTORS.submitButton);
        const fieldsExist = hasRequiredFields();
        
        if (nameExists && innExists && submitExists && fieldsExist && !initialized) {
            attachHandlers();
        } else if ((!nameExists || !innExists || !submitExists || !fieldsExist) && initialized) {
            detachHandlers();
        }
    }

    function forceCheck() {
        if (initialized) {
            checkClientName();
            checkInnForDigitsOnly();
            checkDangerVisibility();
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
        forceCheck
    };

})(config, GM, utils, api);