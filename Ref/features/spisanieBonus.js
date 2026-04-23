// spisanieBonus.js — модуль списания бонусов клиента
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const SCRIPT_URL = config?.scriptUrl || 'https://script.google.com/macros/s/AKfycbxjiMSlZBCDnOgqj6exEuMH4tjwBJsZcd2bWpUNn5-kXVUMx3q_IuiKmcoj2_Du3IA/exec';
    const UNIQUE_PREFIX = config?.uniquePrefix || 'bonus-module-';
    const BUTTON_TEXT = config?.buttonText || 'Списать бонусы';
    
    // Селекторы (можно переопределить в конфиге)
    const SELECTORS = {
        bonusTd: config?.selectors?.bonusTd || "#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr.bonus-finder-bonus-row > td",
        bonusTbody: config?.selectors?.bonusTbody || "#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody",
        productId: config?.selectors?.productId || "#ProductId",
        finInput: config?.selectors?.finInput || "#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input",
        summarySpan: config?.selectors?.summarySpan || "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span",
        summaryRow: config?.selectors?.summaryRow || "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2)",
        clientSelect: config?.selectors?.clientSelect || "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > select"
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let bonusValue = null;
    let buttonAdded = false;
    let domObserver = null;
    let currentModal = null;

    // ─────────────────────────────────────────────
    // 🔥 СТИЛИ: изолированные для модалки + ЗАЩИТА строки
    // ─────────────────────────────────────────────
    function injectModalStyles() {
        if (document.getElementById(`${UNIQUE_PREFIX}modal-styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}modal-styles`;
        style.textContent = `
            @keyframes ${UNIQUE_PREFIX}fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ${UNIQUE_PREFIX}slideIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes ${UNIQUE_PREFIX}shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-6px); }
                40%, 80% { transform: translateX(6px); }
            }
            .${UNIQUE_PREFIX}modal-overlay {
                position: fixed !important; top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                background: rgba(0,0,0,0.6) !important;
                display: flex !important; justify-content: center !important; align-items: center !important;
                z-index: 999999 !important;
                animation: ${UNIQUE_PREFIX}fadeIn 0.3s ease-out !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            .${UNIQUE_PREFIX}modal-content {
                background: linear-gradient(to bottom, #ffffff, #f8f9fa) !important;
                padding: 24px !important; border-radius: 12px !important;
                width: 380px !important; max-width: 95vw !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important;
                animation: ${UNIQUE_PREFIX}slideIn 0.4s ease-out !important;
            }
            .${UNIQUE_PREFIX}modal-title {
                margin: 0 0 16px 0 !important; font-size: 18px !important;
                font-weight: 600 !important; color: #333 !important;
                display: flex !important; align-items: center !important; gap: 8px !important;
            }
            .${UNIQUE_PREFIX}balance-text {
                color: #666 !important; margin: 8px 0 !important; font-size: 14px !important;
            }
            .${UNIQUE_PREFIX}balance-value {
                color: #28a745 !important; font-weight: bold !important;
            }
            .${UNIQUE_PREFIX}input-group { margin: 16px 0 !important; }
            .${UNIQUE_PREFIX}input-label {
                display: block !important; margin-bottom: 6px !important;
                font-size: 14px !important; font-weight: 500 !important; color: #333 !important;
            }
            .${UNIQUE_PREFIX}input-field {
                width: 100% !important; padding: 10px 12px !important;
                border: 2px solid #ddd !important; border-radius: 6px !important;
                font-size: 14px !important; box-sizing: border-box !important;
                transition: border-color 0.2s ease !important;
            }
            .${UNIQUE_PREFIX}input-field:focus {
                outline: none !important; border-color: #4a90d9 !important;
                box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15) !important;
            }
            .${UNIQUE_PREFIX}input-field.error {
                border-color: #dc3545 !important;
                animation: ${UNIQUE_PREFIX}shake 0.5s ease !important;
            }
            .${UNIQUE_PREFIX}error-text {
                color: #dc3545 !important; font-size: 13px !important;
                min-height: 18px !important; margin-top: 4px !important;
            }
            .${UNIQUE_PREFIX}checkbox-label {
                display: flex !important; align-items: center !important;
                margin: 16px 0 24px 0 !important; cursor: pointer !important;
                font-size: 14px !important; font-weight: 500 !important; color: #333 !important;
            }
            .${UNIQUE_PREFIX}checkbox-input { margin-right: 8px !important; }
            .${UNIQUE_PREFIX}modal-actions {
                display: flex !important; justify-content: center !important;
                gap: 8px !important; margin-top: 20px !important; flex-wrap: wrap !important;
            }
            .${UNIQUE_PREFIX}modal-btn {
                padding: 10px 16px !important; border: none !important;
                border-radius: 6px !important; font-size: 13px !important;
                font-weight: 500 !important; cursor: pointer !important;
                min-width: 110px !important; height: 38px !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important; align-items: center !important;
                justify-content: center !important; gap: 6px !important;
            }
            .${UNIQUE_PREFIX}modal-btn:disabled {
                opacity: 0.7 !important; cursor: not-allowed !important;
            }
            .${UNIQUE_PREFIX}btn-close { background: #6c757d !important; color: #fff !important; }
            .${UNIQUE_PREFIX}btn-close:hover:not(:disabled) { background: #5a6268 !important; }
            .${UNIQUE_PREFIX}btn-delete { background: #a94442 !important; color: #fff !important; }
            .${UNIQUE_PREFIX}btn-delete:hover:not(:disabled) { background: #8a3535 !important; }
            .${UNIQUE_PREFIX}btn-delete.confirm { background: #c10020 !important; }
            .${UNIQUE_PREFIX}btn-submit {
                background: linear-gradient(135deg, #28a745, #20c997) !important;
                color: #fff !important; font-weight: 600 !important;
                box-shadow: 0 2px 6px rgba(40, 167, 69, 0.3) !important;
            }
            .${UNIQUE_PREFIX}btn-submit:hover:not(:disabled) {
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4) !important;
            }
            .${UNIQUE_PREFIX}spinner {
                display: inline-block !important; width: 16px !important; height: 16px !important;
                border: 2px solid rgba(255,255,255,0.4) !important;
                border-top-color: #fff !important; border-radius: 50% !important;
                animation: ${UNIQUE_PREFIX}spin 0.8s linear infinite !important;
            }
            @keyframes ${UNIQUE_PREFIX}spin { to { transform: rotate(360deg); } }
            .${UNIQUE_PREFIX}alert-box {
                text-align: center !important; padding: 16px !important;
                color: #e74c3c !important; font-weight: 600 !important;
                background: #fdf2f2 !important; border-radius: 8px !important;
                margin: 12px 0 !important; font-size: 14px !important;
            }
            .${UNIQUE_PREFIX}loading-text {
                text-align: center !important; padding: 20px !important;
                color: #007bff !important; font-size: 14px !important;
            }
            /* 🔥 ЗАЩИТА: строка с кнопкой бонусов не должна скрываться другими скриптами */
            tr.${UNIQUE_PREFIX}bonus-row,
            tr.${UNIQUE_PREFIX}protected-row,
            tr.${UNIQUE_PREFIX}bonus-row[style*="display"],
            tr.${UNIQUE_PREFIX}protected-row[style*="display"] {
                display: table-row !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
                min-height: 40px !important;
            }
            tr.${UNIQUE_PREFIX}bonus-row > td,
            tr.${UNIQUE_PREFIX}protected-row > td {
                display: table-cell !important;
                visibility: visible !important;
                padding: 10px 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────
    function extractBonusValue(text) {
        if (!text) return null;
        const cleaned = text.replace(/[^0-9,\s.]/g, '').trim();
        if (!cleaned) return null;
        const noSpaces = cleaned.replace(/\s+/g, '');
        const normalized = noSpaces.replace(/,/g, '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    }

    function extractNumericProductId(productId) {
        if (!productId) return null;
        const numericValue = productId.toString().replace(/\D/g, '');
        return numericValue || null;
    }

    function getText(selector) {
        const el = document.querySelector(selector);
        return el ? (el.textContent || el.innerText || '').trim() : '';
    }

    // ─────────────────────────────────────────────
    // Управление кнопкой
    // ─────────────────────────────────────────────
    function tryToAddButton() {
        if (buttonAdded) return;

        const targetTd = document.querySelector(SELECTORS.bonusTd);
        const targetTbody = document.querySelector(SELECTORS.bonusTbody);

        if (!targetTd || !targetTbody) return;

        const hasCorrectAttributes =
            targetTd.colSpan === 2 &&
            targetTd.style.textAlign === 'center' &&
            targetTd.style.fontWeight === 'bold' &&
            targetTd.style.color === 'green';

        const text = targetTd.textContent || targetTd.innerText;
        if (!hasCorrectAttributes || !text.includes('Доступно бонусов:')) return;

        const value = extractBonusValue(text);
        if (value === null) return;

        bonusValue = value;
        buttonAdded = true;

        const newRow = document.createElement('tr');
        // 🔥 Классы-маркеры для защиты от скрытия
        newRow.classList.add(`${UNIQUE_PREFIX}bonus-row`, `${UNIQUE_PREFIX}protected-row`);
        
        const newCell = document.createElement('td');
        newCell.colSpan = 2;
        newCell.style.textAlign = 'center';
        newCell.style.padding = '10px 0';

        const button = document.createElement('button');
        button.textContent = BUTTON_TEXT;
        button.id = `${UNIQUE_PREFIX}useBonusBtn`;
        button.style.cssText = `
            padding: 8px 16px;
            background: linear-gradient(135deg, #007BFF, #0056b3);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        button.onmouseover = () => { if (!button.disabled) button.style.transform = 'scale(1.03)'; };
        button.onmouseout = () => { if (!button.disabled) button.style.transform = 'scale(1)'; };
        button.onclick = createModal;

        newCell.appendChild(button);
        newRow.appendChild(newCell);
        
        // 🔥 ГАРАНТИРОВАННОЕ ОТОБРАЖЕНИЕ: перебиваем любые display: none через setProperty
        newRow.style.setProperty('display', 'table-row', 'important');
        newRow.style.setProperty('visibility', 'visible', 'important');
        newRow.style.setProperty('opacity', '1', 'important');
        
        targetTbody.appendChild(newRow);
    }

    function removeButton() {
        const button = document.getElementById(`${UNIQUE_PREFIX}useBonusBtn`);
        if (button && button.parentElement?.parentElement) {
            button.parentElement.parentElement.remove();
        }
        buttonAdded = false;
        bonusValue = null;
    }

    // ─────────────────────────────────────────────
    // Модальное окно
    // ─────────────────────────────────────────────
    function createModal() {
        // Удаляем предыдущую модалку, если есть
        if (currentModal?.parentNode) {
            currentModal.parentNode.removeChild(currentModal);
        }

        const modal = document.createElement('div');
        modal.className = `${UNIQUE_PREFIX}modal-overlay`;
        modal.id = `${UNIQUE_PREFIX}modal`;
        currentModal = modal;

        const content = document.createElement('div');
        content.className = `${UNIQUE_PREFIX}modal-content`;
        
        content.innerHTML = `
            <div id="${UNIQUE_PREFIX}loading" class="${UNIQUE_PREFIX}loading-text">
                <h3 class="${UNIQUE_PREFIX}modal-title">💵 Бонусы клиента</h3>
                <p class="${UNIQUE_PREFIX}balance-text">
                    <strong>Баланс:</strong> <span class="${UNIQUE_PREFIX}balance-value">${bonusValue}</span>
                </p>
                Проверка существующих данных...
            </div>
            <div id="${UNIQUE_PREFIX}form" style="display: none;"></div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Закрытие по ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);

        // Закрытие по клику вне контента
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Загрузка данных
        loadBonusData(modal);
    }

    function closeModal() {
        if (currentModal?.parentNode) {
            currentModal.parentNode.removeChild(currentModal);
            currentModal = null;
        }
    }

    async function loadBonusData(modal) {
        const loadingDiv = document.getElementById(`${UNIQUE_PREFIX}loading`);
        const formDiv = document.getElementById(`${UNIQUE_PREFIX}form`);

        // Получаем ProductId
        const productIdEl = document.querySelector(SELECTORS.productId);
        let productId = productIdEl
            ? (productIdEl.value !== undefined ? productIdEl.value : (productIdEl.textContent || productIdEl.innerText).trim())
            : null;
        const numericProductId = extractNumericProductId(productId);

        if (!numericProductId) {
            loadingDiv.innerHTML = `
                <h3 class="${UNIQUE_PREFIX}modal-title">💵 Бонусы клиента</h3>
                <p class="${UNIQUE_PREFIX}balance-text">
                    <strong>Баланс:</strong> <span class="${UNIQUE_PREFIX}balance-value">${bonusValue}</span>
                </p>
                <div class="${UNIQUE_PREFIX}alert-box">❌ Не удалось определить числовое значение ProductId</div>
            `;
            formDiv.style.display = 'block';
            return;
        }

        // Получаем summaryText
        let summaryText = getText(SELECTORS.summarySpan);
        if (!summaryText) {
            const fallbackRow = document.querySelector(SELECTORS.summaryRow);
            if (fallbackRow) {
                const tds = fallbackRow.querySelectorAll('td');
                if (tds.length >= 2) {
                    const firstCellText = (tds[0].textContent || tds[0].innerText || '').trim().toLowerCase();
                    if (firstCellText.includes('заказчик') || firstCellText === 'клиент') {
                        summaryText = (tds[1].textContent || tds[1].innerText || '').trim();
                    }
                }
            }
        }

        // Запрос к скрипту
        const checkUrl = `${SCRIPT_URL}?action=get&productId=${encodeURIComponent(numericProductId)}`;

        try {
            const response = await fetch(checkUrl, { method: "GET", mode: "cors" });
            const result = await response.json();

            if (result.status !== "success") throw new Error(result.message || "Ошибка проверки");

            loadingDiv.style.display = 'none';
            formDiv.style.display = 'block';

            // Если заказ в зарплате — только просмотр
            if (result.found && result.data.inSalary) {
                renderSalaryLockedForm(formDiv, numericProductId);
                return;
            }

            // Получаем suggestedAmount из Fin-инпута
            const finInput = document.querySelector(SELECTORS.finInput);
            let suggestedAmount = 0;
            if (finInput) {
                const rawValue = parseFloat(finInput.value);
                if (!isNaN(rawValue)) {
                    suggestedAmount = rawValue < 0 ? Math.round(Math.abs(rawValue)) : 0;
                }
            }

            // Получаем ClientGettingID
            let gettingClientId = "";
            const clientSelect = document.querySelector(SELECTORS.clientSelect);
            if (clientSelect?.value) {
                gettingClientId = clientSelect.value;
            } else {
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const text = script.textContent || script.innerText || '';
                    if (text.includes('Product = {') && text.includes('ClientId:')) {
                        const match = text.match(/ClientId:\s*(\d+)/);
                        if (match) { gettingClientId = match[1]; break; }
                    }
                }
            }

            renderBonusForm(formDiv, {
                isEditing: result.found && !result.data.inSalary,
                existingAmount: result.data?.amount,
                existingTaxi: result.data?.taxi,
                suggestedAmount,
                gettingClientId,
                summaryText,
                numericProductId
            });

        } catch (err) {
            loadingDiv.style.display = 'none';
            formDiv.innerHTML = `
                <h3 class="${UNIQUE_PREFIX}modal-title">💵 Бонусы клиента</h3>
                <p class="${UNIQUE_PREFIX}balance-text">
                    <strong>Баланс:</strong> <span class="${UNIQUE_PREFIX}balance-value">${bonusValue}</span>
                </p>
                <div class="${UNIQUE_PREFIX}alert-box">⚠️ Не удалось загрузить данные</div>
            `;
            formDiv.style.display = 'block';
        }
    }

    function renderSalaryLockedForm(container, numericProductId) {
        container.innerHTML = `
            <h3 class="${UNIQUE_PREFIX}modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007BFF" stroke-width="2">
                    <path d="M3 10h18v4H3z"/><path d="M6 14h12v-4H6z"/><path d="M9 14h6v-4H9z"/>
                </svg>
                Бонусы клиента
            </h3>
            <p class="${UNIQUE_PREFIX}balance-text">
                <strong>Баланс:</strong> <span class="${UNIQUE_PREFIX}balance-value">${bonusValue}</span>
            </p>
            <div class="${UNIQUE_PREFIX}alert-box">⚠️ Заказ попал в зарплату!<br>Редактирование невозможно!</div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="${UNIQUE_PREFIX}modalCloseBtn" class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}btn-close">Закрыть</button>
            </div>
        `;
        document.getElementById(`${UNIQUE_PREFIX}modalCloseBtn`).onclick = closeModal;
    }

    function renderBonusForm(container, data) {
        const { isEditing, existingAmount, existingTaxi, suggestedAmount, gettingClientId, summaryText, numericProductId } = data;
        const title = isEditing ? "Редактирование бонусов" : "Списание бонусов";
        const amountLabel = isEditing
            ? '<span style="font-weight: 500;">Исправьте сумму списанных бонусов на:</span><br>'
            : '<span style="font-weight: 500;">Сколько бонусов списываем:</span><br>';
        const additionalInfo = isEditing && existingAmount
            ? `<p class="${UNIQUE_PREFIX}balance-text"><strong>Бонусов списано:</strong> <span class="${UNIQUE_PREFIX}balance-value">${existingAmount}</span></p>`
            : '';

        container.innerHTML = `
            <h3 class="${UNIQUE_PREFIX}modal-title">💵 ${title}</h3>
            <p class="${UNIQUE_PREFIX}balance-text">
                <strong>Баланс:</strong> <span class="${UNIQUE_PREFIX}balance-value">${bonusValue}</span>
            </p>
            ${additionalInfo}
            <div class="${UNIQUE_PREFIX}input-group">
                <label class="${UNIQUE_PREFIX}input-label">${amountLabel}
                    <input type="number" id="${UNIQUE_PREFIX}bonusAmountInput" min="0" step="1"
                        value="${isEditing ? (existingAmount || Math.floor(bonusValue)) : suggestedAmount}"
                        class="${UNIQUE_PREFIX}input-field" autocomplete="off">
                </label>
                <div id="${UNIQUE_PREFIX}errorMessage" class="${UNIQUE_PREFIX}error-text"></div>
            </div>
            <label class="${UNIQUE_PREFIX}checkbox-label">
                <input type="checkbox" id="${UNIQUE_PREFIX}taxiCheckbox" class="${UNIQUE_PREFIX}checkbox-input">
                <span>Списание на такси</span>
            </label>
            <div class="${UNIQUE_PREFIX}modal-actions">
                <button id="${UNIQUE_PREFIX}modalCloseBtn" class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}btn-close">Закрыть</button>
                <button id="${UNIQUE_PREFIX}modalDeleteBtn" class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}btn-delete" style="display: ${isEditing ? 'inline-flex' : 'none'};">
                    <span>Удалить</span><span>списание</span>
                </button>
                <button id="${UNIQUE_PREFIX}modalSubmitBtn" class="${UNIQUE_PREFIX}modal-btn ${UNIQUE_PREFIX}btn-submit">${isEditing ? 'Обновить' : 'Списать'}</button>
            </div>
        `;

        // Инициализация чекбокса
        const taxiCheckbox = document.getElementById(`${UNIQUE_PREFIX}taxiCheckbox`);
        if (taxiCheckbox) taxiCheckbox.checked = !!existingTaxi;

        // Настройка инпута: только цифры
        const input = document.getElementById(`${UNIQUE_PREFIX}bonusAmountInput`);
        const errorDiv = document.getElementById(`${UNIQUE_PREFIX}errorMessage`);
        
        if (input) {
            input.addEventListener('keydown', (e) => {
                const allowed = (e.key >= '0' && e.key <= '9') ||
                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
                    (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()));
                if (!allowed) e.preventDefault();
            });
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^0-9]/g, '');
                if (input.classList.contains(`${UNIQUE_PREFIX}input-field-error`)) {
                    input.classList.remove(`${UNIQUE_PREFIX}input-field-error`);
                    errorDiv.textContent = '';
                }
            });
        }

        // Обработчики кнопок
        document.getElementById(`${UNIQUE_PREFIX}modalCloseBtn`).onclick = closeModal;
        setupDeleteButton(numericProductId);
        setupSubmitButton(numericProductId, summaryText, gettingClientId);
    }

    function showError(input, errorDiv, message) {
        if (input) {
            input.classList.add(`${UNIQUE_PREFIX}input-field-error`);
            input.style.borderColor = '#dc3545';
        }
        if (errorDiv) errorDiv.textContent = message;
    }

    function setupDeleteButton(numericProductId) {
        const deleteBtn = document.getElementById(`${UNIQUE_PREFIX}modalDeleteBtn`);
        if (!deleteBtn) return;

        let deleteConfirmActive = false;
        let deleteTimeout = null;

        deleteBtn.onclick = async () => {
            if (deleteConfirmActive) {
                clearTimeout(deleteTimeout);
                deleteConfirmActive = false;
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = `<span class="${UNIQUE_PREFIX}spinner"></span><span style="font-size:12px;">Удаление…</span>`;
                deleteBtn.style.opacity = '0.8';
                deleteBtn.style.cursor = 'not-allowed';

                const delUrl = `${SCRIPT_URL}?action=delete&productId=${encodeURIComponent(numericProductId)}`;
                try {
                    const res = await fetch(delUrl, { method: "GET", mode: "cors" });
                    const data = await res.json();
                    if (data.status === "success") {
                        deleteBtn.innerHTML = '✅ Успешно!';
                        setTimeout(closeModal, 2000);
                    } else {
                        deleteBtn.innerHTML = '❌ Ошибка';
                        resetDeleteButton(deleteBtn);
                    }
                } catch (err) {
                    deleteBtn.innerHTML = '❌ Ошибка';
                    resetDeleteButton(deleteBtn);
                }
            } else {
                deleteConfirmActive = true;
                deleteBtn.textContent = "Точно?";
                deleteBtn.classList.add(`${UNIQUE_PREFIX}btn-delete-confirm`);
                deleteTimeout = setTimeout(() => {
                    deleteConfirmActive = false;
                    resetDeleteButton(deleteBtn);
                }, 3000);
            }
        };
    }

    function resetDeleteButton(btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Удалить</span><span>списание</span>';
        btn.classList.remove(`${UNIQUE_PREFIX}btn-delete-confirm`);
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }

    function setupSubmitButton(numericProductId, summaryText, gettingClientId) {
        const submitBtn = document.getElementById(`${UNIQUE_PREFIX}modalSubmitBtn`);
        const input = document.getElementById(`${UNIQUE_PREFIX}bonusAmountInput`);
        const taxiCheckbox = document.getElementById(`${UNIQUE_PREFIX}taxiCheckbox`);
        const errorDiv = document.getElementById(`${UNIQUE_PREFIX}errorMessage`);
        
        if (!submitBtn || !input) return;

        submitBtn.onclick = async () => {
            const amount = parseFloat(input.value);
            const taxiChecked = taxiCheckbox?.checked || false;

            if (errorDiv) errorDiv.textContent = '';
            if (input) input.classList.remove(`${UNIQUE_PREFIX}input-field-error`);

            if (isNaN(amount) || amount <= 0) return showError(input, errorDiv, 'Введите корректную сумму');
            if (amount > bonusValue) return showError(input, errorDiv, 'Нельзя списать больше, чем доступно');

            // Блокируем кнопку
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="${UNIQUE_PREFIX}spinner"></span><span style="font-size:12px;">Сохранение…</span>`;
            submitBtn.style.opacity = '0.8';
            submitBtn.style.cursor = 'not-allowed';

            const saveUrl = `${SCRIPT_URL}?action=save&productId=${encodeURIComponent(numericProductId)}&taxi=${taxiChecked}&summaryText=${encodeURIComponent(summaryText || "")}&amount=${encodeURIComponent(amount)}&gettingClientId=${encodeURIComponent(gettingClientId)}`;

            try {
                const res = await fetch(saveUrl, { method: "GET", mode: "cors" });
                const data = await res.json();
                if (data.status === "success") {
                    submitBtn.innerHTML = '✅ Успешно!';
                    setTimeout(closeModal, 2000);
                } else {
                    throw new Error(data.message || "Ошибка сервера");
                }
            } catch (err) {
                submitBtn.innerHTML = '❌ Ошибка';
                submitBtn.disabled = false;
                setTimeout(() => {
                    submitBtn.innerHTML = 'Повторить';
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }, 2000);
            }
        };
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        injectModalStyles();
        tryToAddButton();
        
        domObserver = new MutationObserver(() => {
            const targetTd = document.querySelector(SELECTORS.bonusTd);
            if (targetTd) {
                tryToAddButton();
            } else if (buttonAdded) {
                removeButton();
            }
        });
        
        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        
        removeButton();
        closeModal();
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

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        createModal,
        closeModal,
        tryToAddButton,
        getBonusValue: () => bonusValue
    };

})(config, GM, utils, api);