// perezakazBtn.js — модуль сохранения перезаказов в таблицу
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const SCRIPT_URL = config?.scriptUrl || 'https://script.google.com/macros/s/AKfycbzCQ6W3fOLGa-y1RgWeMjVEhqW1dAjtt3CS_8bEtcYZleHVhhim1wQfRZhFqAEj3fsu/exec';
    const UNIQUE_PREFIX = config?.uniquePrefix || 'custom-save-data-';
    const BUTTON_TEXT = config?.buttonText || '💾 В таблицу перезаказов';
    const MODAL_TITLE = config?.modalTitle || '📋 Счёт от подрядчика';
    const INPUT_PLACEHOLDER = config?.inputPlaceholder || 'Счёт № . . .';

    // 🔥 Внутреннее состояние
    let active = false;
    let button = null;
    let domObserver = null;

    // ─────────────────────────────────────────────
    // 🔥 КОПИРОВАНИЕ СТИЛЕЙ С #TopButtons
    // ─────────────────────────────────────────────
    function copyButtonStyles(sourceBtn, targetBtn) {
        if (!sourceBtn || !targetBtn) return;

        // Копируем все классы источника
        targetBtn.className = sourceBtn.className;
        // Добавляем наш префикс для изоляции, если нужно
        if (!targetBtn.classList.contains(`${UNIQUE_PREFIX}custom-btn`)) {
            targetBtn.classList.add(`${UNIQUE_PREFIX}custom-btn`);
        }

        // Копируем inline-стили (если есть)
        const sourceStyle = sourceBtn.getAttribute('style');
        if (sourceStyle) {
            targetBtn.setAttribute('style', sourceStyle);
        }

        // Копируем data-атрибуты (для совместимости с существующими обработчиками)
        Array.from(sourceBtn.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && !targetBtn.hasAttribute(attr.name)) {
                targetBtn.setAttribute(attr.name, attr.value);
            }
        });
    }

    function applyTopButtonsStyle(btn) {
        const topButtons = document.querySelector("#TopButtons");
        if (!topButtons) return;

        // Ищем первую подходящую кнопку/ссылку для копирования стилей
        const styleSource = topButtons.querySelector('button, a.btn, input[type="button"], .btn') ||
                           topButtons.firstElementChild;

        if (styleSource) {
            copyButtonStyles(styleSource, btn);
        }

        // Дополнительные правки для нашей кнопки
        btn.style.cursor = 'pointer';
        btn.style.userSelect = 'none';
    }

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    function isDocumentLoading() {
        const docEl = document.querySelector("#Doc");
        return docEl && docEl.classList.contains("LoadingContent");
    }

    function hasContractorLabel() {
        const el = document.querySelector("#Doc > div.bigform > div.row > div:nth-child(2) > table > tbody > tr:nth-child(2)");
        return el && el.textContent.trim().includes("Подрядчик");
    }

    function getText(selector) {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
    }

    function showNotification(message, type = 'success') {
        // Создаём уведомление с минимальными стилями, наследуя от системы
        const notification = document.createElement('div');
        
        // Копируем стиль с существующих алертов/уведомлений на странице, если есть
        const systemAlert = document.querySelector('.alert, .notification, .message, [class*="alert"], [class*="notify"]');
        if (systemAlert) {
            notification.className = systemAlert.className;
        } else {
            // Fallback: базовые стили
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 10001;
                padding: 12px 20px; border-radius: 6px; font-size: 14px;
                font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                background: ${type === 'success' ? '#4CAF50' : '#f44336'};
                color: white; font-family: inherit;
            `;
        }
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${type === 'success' ? '✅' : '❌'}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ─────────────────────────────────────────────
    // Модальное окно (стили копируются с системы)
    // ─────────────────────────────────────────────
    function showModal(onSubmit) {
        const modal = document.createElement('div');
        
        // Копируем стиль модальных окон, если они есть в системе
        const systemModal = document.querySelector('.modal, .popup, [class*="modal"], [class*="popup"]');
        if (systemModal) {
            modal.className = systemModal.className;
        } else {
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center;
                z-index: 10000; font-family: inherit;
            `;
        }

        const content = document.createElement('div');
        // Копируем стиль контента модального окна
        const systemModalContent = document.querySelector('.modal-content, .popup-content, [class*="modal-content"]');
        if (systemModalContent) {
            content.className = systemModalContent.className;
        } else {
            content.style.cssText = `
                background: white; padding: 24px; border-radius: 8px;
                width: 400px; max-width: 90vw; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            `;
        }

        content.innerHTML = `
            <div style="margin-bottom: 20px; text-align: center; font-weight: 600; font-size: 18px;">${MODAL_TITLE}</div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Счёт от подрядчика</label>
                <input type="text" id="${UNIQUE_PREFIX}invoiceInput" placeholder="${INPUT_PLACEHOLDER}"
                    style="width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="${UNIQUE_PREFIX}submitBtn" style="padding: 10px 24px; border-radius: 4px; font-weight: 500; cursor: pointer;">Сохранить</button>
                <button id="${UNIQUE_PREFIX}cancelBtn" style="padding: 10px 24px; border-radius: 4px; font-weight: 500; cursor: pointer; background: #f5f5f5; border: 1px solid #ddd;">Отмена</button>
            </div>
        `;

        // Применяем стили к кнопкам внутри модалки из системы
        const systemBtn = document.querySelector('#TopButtons button, #TopButtons .btn');
        if (systemBtn) {
            const submitBtn = content.querySelector(`#${UNIQUE_PREFIX}submitBtn`);
            const cancelBtn = content.querySelector(`#${UNIQUE_PREFIX}cancelBtn`);
            copyButtonStyles(systemBtn, submitBtn);
            copyButtonStyles(systemBtn, cancelBtn);
            // Немного отличаем вторичную кнопку
            cancelBtn.style.opacity = '0.9';
        }

        modal.appendChild(content);

        const input = content.querySelector(`#${UNIQUE_PREFIX}invoiceInput`);
        const submitBtn = content.querySelector(`#${UNIQUE_PREFIX}submitBtn`);
        const cancelBtn = content.querySelector(`#${UNIQUE_PREFIX}cancelBtn`);

        setTimeout(() => { if (input) input.focus(); }, 100);

        if (input) {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && submitBtn) submitBtn.click(); });
            input.addEventListener('input', () => { if (input) input.style.borderColor = ''; });
        }

        if (submitBtn) {
            submitBtn.onclick = () => {
                const value = input?.value.trim();
                if (!value) {
                    if (input) {
                        input.style.borderColor = '#f44336';
                        input.focus();
                    }
                    return;
                }
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Сохранение...';

                onSubmit(value, () => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
        }

        modal.onclick = (e) => { if (e.target === modal && modal.parentNode) modal.parentNode.removeChild(modal); };

        document.body.appendChild(modal);
    }

    // ─────────────────────────────────────────────
    // API-запросы
    // ─────────────────────────────────────────────
    function checkIfRowExists(textFromDoc, callback) {
        GM.xmlhttpRequest({
            method: 'GET',
            url: `${SCRIPT_URL}?action=check&textFromDoc=${encodeURIComponent(textFromDoc)}`,
            headers: {'Cache-Control': 'no-cache'},
            timeout: 30000,
            onload: function (response) {
                try {
                    if (response.status !== 200) return callback(false);
                    const responseText = response.responseText.trim();
                    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) return callback(false);
                    const data = JSON.parse(responseText);
                    callback(data.exists || false);
                } catch (e) {
                    callback(false);
                }
            },
            onerror: () => callback(false),
            ontimeout: () => callback(false)
        });
    }

    function saveData(payload, callback) {
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify(payload),
            headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-cache'},
            timeout: 30000,
            onload: function (response) {
                try {
                    if (response.status === 200 || response.status === 201) {
                        const responseText = response.responseText.trim();
                        if (responseText === 'OK' || responseText.includes('OK')) {
                            callback(true, 'Перезаказ внесён в таблицу');
                            return;
                        }
                    }
                    callback(false, 'Ошибка при сохранении данных');
                } catch (e) {
                    callback(false, 'Ошибка при обработке ответа сервера');
                }
            },
            onerror: () => callback(false, 'Ошибка подключения к серверу'),
            ontimeout: () => callback(false, 'Превышено время ожидания ответа')
        });
    }

    // ─────────────────────────────────────────────
    // Обработчик кнопки
    // ─────────────────────────────────────────────
    function handleButtonClick() {
        const textFromDoc = getText("#Doc > div.form-group > div > div > span:nth-child(1)");
        const menuItemText = getText("body > ul > div > li:nth-child(1) > a");
        const contractorText = getText("#Contractor_chosen > a > span");

        if (!textFromDoc || !menuItemText || !contractorText) {
            showNotification('Не все данные доступны. Попробуйте позже.', 'error');
            return;
        }

        showModal((invoiceNumber, closeModal) => {
            checkIfRowExists(textFromDoc, (exists) => {
                if (exists) {
                    showNotification('Перезаказ уже внесен!', 'error');
                    closeModal();
                    return;
                }

                const payload = {
                    action: 'save',
                    invoiceNumber,
                    textFromDoc,
                    menuItemText,
                    contractorText
                };

                saveData(payload, (success, message) => {
                    showNotification(message, success ? 'success' : 'error');
                    closeModal();
                });
            });
        });
    }

    // ─────────────────────────────────────────────
    // Управление кнопкой
    // ─────────────────────────────────────────────
    function checkAndToggleButton() {
        const topButtons = document.querySelector("#TopButtons");
        if (!topButtons) return;

        const isLoading = isDocumentLoading();
        const meetsLabelTextCondition = hasContractorLabel();
        const shouldShowButton = !isLoading && meetsLabelTextCondition;

        if (shouldShowButton && !button) {
            button = document.createElement("button");
            button.textContent = BUTTON_TEXT;
            
            // 🔥 Копируем стили с существующих кнопок в #TopButtons
            applyTopButtonsStyle(button);
            
            button.addEventListener("click", handleButtonClick);
            topButtons.appendChild(button);
        } else if (!shouldShowButton && button) {
            if (button.parentNode) button.parentNode.removeChild(button);
            button = null;
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        checkAndToggleButton();
        
        domObserver = new MutationObserver(checkAndToggleButton);
        domObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        if (button && button.parentNode) {
            button.parentNode.removeChild(button);
            button = null;
        }
    }

    function toggle() {
        if (active) { cleanup(); } else { init(); }
    }

    function isActive() {
        return active;
    }

    // 🔥 Авто-запуск, если не отключено в конфиге
    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // 🔥 Экспорт API для внешнего управления
    return {
        init,
        cleanup,
        toggle,
        isActive,
        copyButtonStyles,      // полезно для других модулей
        applyTopButtonsStyle,  // полезно для других модулей
        checkAndToggleButton   // публичный метод обновления кнопки
    };

})(config, GM, utils, api);