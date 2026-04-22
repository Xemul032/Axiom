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
    // 🔥 СТИЛИ: только для модального окна (изолированные)
    // ─────────────────────────────────────────────
    function injectModalStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}modal-styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}modal-styles`;
        style.textContent = `
            .${UNIQUE_PREFIX}modal-overlay {
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                background: rgba(0, 0, 0, 0.6) !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
                z-index: 99999 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                animation: ${UNIQUE_PREFIX}fadeIn 0.2s ease-out !important;
            }
            .${UNIQUE_PREFIX}modal-box {
                background: #ffffff !important;
                border-radius: 12px !important;
                padding: 24px !important;
                width: 420px !important; max-width: 95vw !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
                animation: ${UNIQUE_PREFIX}slideUp 0.25s ease-out !important;
            }
            .${UNIQUE_PREFIX}modal-title {
                margin: 0 0 20px 0 !important;
                font-size: 18px !important; font-weight: 600 !important;
                color: #1a1a1a !important; text-align: center !important;
            }
            .${UNIQUE_PREFIX}input-group { margin-bottom: 20px !important; }
            .${UNIQUE_PREFIX}input-label {
                display: block !important; margin-bottom: 8px !important;
                font-size: 14px !important; font-weight: 500 !important; color: #333 !important;
            }
            .${UNIQUE_PREFIX}input-field {
                width: 100% !important; padding: 10px 12px !important;
                border: 2px solid #d0d0d0 !important; border-radius: 6px !important;
                font-size: 14px !important; box-sizing: border-box !important;
                transition: border-color 0.2s ease !important;
            }
            .${UNIQUE_PREFIX}input-field:focus {
                outline: none !important; border-color: #4a90d9 !important;
                box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15) !important;
            }
            .${UNIQUE_PREFIX}input-field.error {
                border-color: #e74c3c !important;
                box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15) !important;
            }
            .${UNIQUE_PREFIX}modal-actions {
                display: flex !important; gap: 12px !important; justify-content: center !important; margin-top: 24px !important;
            }
            .${UNIQUE_PREFIX}modal-btn {
                padding: 10px 28px !important; border: none !important; border-radius: 6px !important;
                font-size: 14px !important; font-weight: 500 !important; cursor: pointer !important;
                transition: all 0.2s ease !important; min-width: 110px !important;
            }
            .${UNIQUE_PREFIX}modal-btn-primary {
                background: #4a90d9 !important; color: #fff !important;
            }
            .${UNIQUE_PREFIX}modal-btn-primary:hover:not(:disabled) {
                background: #3a7fc8 !important; transform: translateY(-1px) !important;
            }
            .${UNIQUE_PREFIX}modal-btn-primary:disabled {
                opacity: 0.7 !important; cursor: not-allowed !important;
            }
            .${UNIQUE_PREFIX}modal-btn-secondary {
                background: #f5f5f5 !important; color: #333 !important; border: 1px solid #ddd !important;
            }
            .${UNIQUE_PREFIX}modal-btn-secondary:hover {
                background: #e8e8e8 !important; transform: translateY(-1px) !important;
            }
            .${UNIQUE_PREFIX}notification {
                position: fixed !important; top: 20px !important; right: 20px !important;
                padding: 12px 20px !important; border-radius: 8px !important;
                font-size: 14px !important; font-weight: 500 !important;
                z-index: 100000 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
                animation: ${UNIQUE_PREFIX}slideIn 0.3s ease-out !important;
            }
            .${UNIQUE_PREFIX}notification.success {
                background: #2ecc71 !important; color: #fff !important;
            }
            .${UNIQUE_PREFIX}notification.error {
                background: #e74c3c !important; color: #fff !important;
            }
            .${UNIQUE_PREFIX}spinner {
                display: inline-block !important; width: 14px !important; height: 14px !important;
                border: 2px solid rgba(255,255,255,0.4) !important;
                border-top-color: #fff !important; border-radius: 50% !important;
                animation: ${UNIQUE_PREFIX}spin 0.7s linear infinite !important;
                vertical-align: middle !important; margin-right: 6px !important;
            }
            @keyframes ${UNIQUE_PREFIX}fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ${UNIQUE_PREFIX}slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ${UNIQUE_PREFIX}slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
            @keyframes ${UNIQUE_PREFIX}spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // 🔥 КНОПКА: копируем стили ТОЛЬКО с #TopButtons
    // ─────────────────────────────────────────────
    function applyTopButtonsStyle(targetBtn) {
        const topButtons = document.querySelector("#TopButtons");
        if (!topButtons || !targetBtn) return;

        // Ищем первую подходящую кнопку/ссылку для копирования стилей
        const styleSource = topButtons.querySelector('button, a.btn, input[type="button"], [role="button"], .btn') ||
                           topButtons.querySelector('a, input') ||
                           topButtons.firstElementChild;

        if (!styleSource) return;

        // Копируем классы
        if (styleSource.className) {
            targetBtn.className = styleSource.className + ` ${UNIQUE_PREFIX}custom-btn`;
        }

        // Копируем inline-стили
        const sourceStyle = styleSource.getAttribute('style');
        if (sourceStyle) {
            targetBtn.setAttribute('style', sourceStyle);
        }

        // Копируем data-атрибуты
        Array.from(styleSource.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && !targetBtn.hasAttribute(attr.name)) {
                targetBtn.setAttribute(attr.name, attr.value);
            }
        });

        // Гарантируем интерактивность
        targetBtn.style.cursor = 'pointer';
        targetBtn.style.userSelect = 'none';
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
        const notification = document.createElement('div');
        notification.className = `${UNIQUE_PREFIX}notification ${type === 'success' ? 'success' : 'error'}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${type === 'success' ? '✅' : '❌'}</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
        }, 4000);
    }

    // ─────────────────────────────────────────────
    // Модальное окно (СОБСТВЕННЫЕ стили)
    // ─────────────────────────────────────────────
    function showModal(onSubmit) {
        const overlay = document.createElement('div');
        overlay.className = `${UNIQUE_PREFIX}modal-overlay`;
        
        const box = document.createElement('div');
        box.className = `${UNIQUE_PREFIX}modal-box`;
        
        box.innerHTML = `
            <h3 class="${UNIQUE_PREFIX}modal-title">${MODAL_TITLE}</h3>
            <div class="${UNIQUE_PREFIX}input-group">
                <label class="${UNIQUE_PREFIX}input-label">Счёт от подрядчика</label>
                <input type="text" class="${UNIQUE_PREFIX}input-field" id="${UNIQUE_PREFIX}invoiceInput" placeholder="${INPUT_PLACEHOLDER}" autocomplete="off">
            </div>
            <div class="${UNIQUE_PREFIX}modal-actions">
                <button class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}modal-btn-primary" id="${UNIQUE_PREFIX}submitBtn">
                    <span id="${UNIQUE_PREFIX}submitText">Сохранить</span>
                </button>
                <button class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}modal-btn-secondary" id="${UNIQUE_PREFIX}cancelBtn">Отмена</button>
            </div>
        `;
        
        overlay.appendChild(box);

        const input = box.querySelector(`#${UNIQUE_PREFIX}invoiceInput`);
        const submitBtn = box.querySelector(`#${UNIQUE_PREFIX}submitBtn`);
        const cancelBtn = box.querySelector(`#${UNIQUE_PREFIX}cancelBtn`);
        const submitText = box.querySelector(`#${UNIQUE_PREFIX}submitText`);

        setTimeout(() => { if (input) input.focus(); }, 50);

        // Обработчики
        if (input) {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && submitBtn) submitBtn.click(); });
            input.addEventListener('input', () => { if (input) input.classList.remove(`${UNIQUE_PREFIX}input-field-error`); });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const value = input?.value.trim();
                if (!value) {
                    if (input) {
                        input.classList.add(`${UNIQUE_PREFIX}input-field-error`);
                        input.focus();
                    }
                    return;
                }
                // Состояние загрузки
                submitBtn.disabled = true;
                const originalText = submitText.textContent;
                submitText.innerHTML = `<span class="${UNIQUE_PREFIX}spinner"></span>Сохранение...`;

                onSubmit(value, () => {
                    // Восстановление
                    submitBtn.disabled = false;
                    submitText.textContent = originalText;
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                });
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            });
        }

        // Закрытие по клику вне окна
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });

        document.body.appendChild(overlay);
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
            
            // 🔥 Копируем стили ТОЛЬКО для кнопки
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
        
        injectModalStyles(); // Стили модалки — свои
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
        // Удаляем открытые модалки при очистке
        document.querySelectorAll(`.${UNIQUE_PREFIX}modal-overlay`).forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
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
        applyTopButtonsStyle,  // полезно для других модулей
        checkAndToggleButton
    };

})(config, GM, utils, api);