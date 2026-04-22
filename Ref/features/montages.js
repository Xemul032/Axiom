// montages.js — модуль заявок на монтажные работы
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json (обязательные поля)
    const SCRIPT_URL = config?.scriptUrl || 'https://script.google.com/macros/s/AKfycbzt9bAtaWRRXyAtq6a1J3eFWjWoBPDWrw9s_0MOWnrfSaGRToux4THTN77BAN9aR0lH/exec';
    const TYPES_SHEET_URL = config?.typesSheetUrl || 'https://docs.google.com/spreadsheets/d/1IPo3ysUMbU0LOVTHKY3PuLW9DRutL_cduurf0Ztt47o/gviz/tq?tqx=out:csv&sheet=types';
    const TELEGRAM_TOKEN = config?.telegramToken || '';
    const TELEGRAM_CHAT_IDS = config?.telegramChatIds || [];
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`;
    const TELEGRAM_DELAY = config?.telegramDelayMs || 60000;

    // 🔥 Селекторы для обнаружения кнопки
    const SELECTORS = config?.selectors || [
        "#Top > form > div > div > div > input:nth-child(5)",
        "#Top > form > div > div > div > input.ProductName.form-control",
        "#Top > form > div > div > div > div.form-control",
        'div.formblock[class^="Order"] input.OrderName'
    ];
    const TARGET_TEXT = config?.targetText || "Монтажные работы на выезде";

    // 🔥 Изоляция стилей
    const UNIQUE_PREFIX = config?.uniquePrefix || 'montage-script-v2-';
    
    // 🔥 Внутреннее состояние
    let active = false;
    let buttonAdded = false;
    let createdButton = null;
    let productIdCache = new Set();
    let isProcessing = false;
    let typesCache = [];
    let files = [];
    let dateCache = new Map();
    const DATE_CACHE_TTL = config?.dateCacheTtlMs || 30000;

    // 🔥 Наблюдатели и таймеры
    let domObserver = null;
    let intervalChecker = null;
    let delayedSenderTimer = null;

    // ─────────────────────────────────────────────
    // Инициализация системы отложенной отправки
    // ─────────────────────────────────────────────
    function initDelayedTelegramSender() {
        checkPendingFiles();
        delayedSenderTimer = setInterval(checkPendingFiles, 5000);
    }

    function saveFilesForDelayedSending(productId, filesArray) {
        if (!filesArray || filesArray.length === 0) return;

        const fileData = filesArray.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        }));

        const promises = filesArray.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: reader.result
                });
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(base64Files => {
            const delayedData = {
                productId: productId,
                files: base64Files,
                scheduledTime: Date.now() + TELEGRAM_DELAY,
                timestamp: Date.now()
            };
            const key = `telegram_delayed_${productId}_${Date.now()}`;
            try {
                sessionStorage.setItem(key, JSON.stringify(delayedData));
            } catch (e) {
                // Ошибка сохранения — молча игнорируем
            }
        });
    }

    function checkPendingFiles() {
        const now = Date.now();
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('telegram_delayed_')) {
                keys.push(key);
            }
        }

        keys.forEach(key => {
            try {
                const data = JSON.parse(sessionStorage.getItem(key));
                if (data && data.scheduledTime <= now) {
                    sendFilesToTelegramFromStorage(data.productId, data.files);
                    sessionStorage.removeItem(key);
                }
            } catch (e) {
                sessionStorage.removeItem(key);
            }
        });
    }

    async function sendFilesToTelegramFromStorage(productId, base64Files) {
        const caption = `Файлы для заказа ${productId}`;

        for (const fileData of base64Files) {
            try {
                const response = await fetch(fileData.data);
                const blob = await response.blob();
                const file = new File([blob], fileData.name, { type: fileData.type });

                const formData = new FormData();
                formData.append('caption', caption);
                formData.append('document', file);

                for (const chatId of TELEGRAM_CHAT_IDS) {
                    formData.set('chat_id', chatId);
                    try {
                        const resp = await fetch(TELEGRAM_API, {
                            method: 'POST',
                            body: formData
                        });
                        await resp.json();
                    } catch (err) {
                        // Ошибка отправки в чат — игнорируем
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (err) {
                // Ошибка отправки файла — игнорируем
            }
        }
    }

    // ─────────────────────────────────────────────
    // Стили
    // ─────────────────────────────────────────────
    function addIsolatedStyles() {
        if (document.querySelector(`#${UNIQUE_PREFIX}styles`)) return;
        const style = document.createElement('style');
        style.id = `${UNIQUE_PREFIX}styles`;
        style.textContent = `
            .${UNIQUE_PREFIX}reset,
            .${UNIQUE_PREFIX}reset *,
            .${UNIQUE_PREFIX}reset *:before,
            .${UNIQUE_PREFIX}reset *:after {
                margin: 0 !important; padding: 0 !important; border: 0 !important;
                font-size: 100% !important; font: inherit !important;
                vertical-align: baseline !important; box-sizing: border-box !important;
                background: transparent !important; color: inherit !important;
                text-decoration: none !important; list-style: none !important;
                outline: none !important; box-shadow: none !important;
                text-shadow: none !important; transition: none !important;
                transform: none !important; animation: none !important;
            }
            .${UNIQUE_PREFIX}main-button {
                all: unset !important; display: inline-block !important;
                font-size: 12px !important; font-weight: 400 !important;
                line-height: 1.5 !important; color: #333333 !important;
                background: #ffffff !important;
                background-image: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%) !important;
                border: 1px solid #cccccc !important; border-radius: 0 !important;
                padding: 5px 10px !important; margin: 0 !important; margin-left: -1px !important;
                text-align: center !important; white-space: nowrap !important;
                vertical-align: middle !important; cursor: pointer !important;
                user-select: none !important; position: relative !important;
                float: left !important;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 1px rgba(0, 0, 0, 0.075) !important;
                text-shadow: 0 1px 0 #ffffff !important; transition: all 0.3s ease !important;
            }
            .${UNIQUE_PREFIX}main-button:hover:not(:disabled) {
                color: #333333 !important; background: #e0e0e0 !important;
                background-image: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%) !important;
                border-color: #adadad !important; text-decoration: none !important;
            }
            .${UNIQUE_PREFIX}main-button:active:not(:disabled) {
                color: #333333 !important; background: #d0d0d0 !important;
                background-image: linear-gradient(to bottom, #d0d0d0 0%, #e0e0e0 100%) !important;
                box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125) !important;
            }
            .${UNIQUE_PREFIX}main-button:disabled { opacity: 0.6 !important; cursor: not-allowed !important; }
            .${UNIQUE_PREFIX}modal-overlay {
                all: unset !important; position: fixed !important; top: 0 !important;
                left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important;
                background: rgba(0, 0, 0, 0.7) !important; display: flex !important;
                justify-content: center !important; align-items: center !important;
                z-index: 999999 !important; font-size: 14px !important;
                line-height: 1.4 !important; color: #333333 !important;
            }
            .${UNIQUE_PREFIX}modal-content {
                all: unset !important; display: flex !important;
                flex-direction: column !important; background: #ffffff !important;
                border-radius: 12px !important; padding: 24px !important;
                width: 800px !important; max-width: 95% !important;
                max-height: 95vh !important; overflow-y: auto !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
                color: #333333 !important;
            }
            .${UNIQUE_PREFIX}modal-title {
                all: unset !important; display: block !important;
                font-size: 20px !important; font-weight: 600 !important;
                color: #333333 !important; text-align: center !important;
                margin-bottom: 20px !important;
            }
            .${UNIQUE_PREFIX}modal-body {
                all: unset !important; display: flex !important;
                gap: 20px !important; margin-bottom: 20px !important;
            }
            .${UNIQUE_PREFIX}modal-column {
                all: unset !important; display: block !important; flex: 1 !important;
            }
            .${UNIQUE_PREFIX}modal-column-title {
                all: unset !important; display: block !important;
                font-size: 16px !important; font-weight: 500 !important;
                color: #333333 !important; margin-bottom: 16px !important;
                padding-bottom: 8px !important; border-bottom: 2px solid #eeeeee !important;
            }
            .${UNIQUE_PREFIX}modal-label {
                all: unset !important; display: block !important;
                margin-bottom: 12px !important; font-weight: 500 !important;
                color: #333333 !important; font-size: 14px !important;
            }
            .${UNIQUE_PREFIX}required-star {
                all: unset !important; color: #dc3545 !important; font-weight: bold !important;
            }
            .${UNIQUE_PREFIX}modal-input,
            .${UNIQUE_PREFIX}modal-select,
            .${UNIQUE_PREFIX}modal-textarea {
                all: unset !important; display: block !important;
                width: 100% !important; padding: 10px !important;
                border: 2px solid #cccccc !important; border-radius: 6px !important;
                margin-top: 4px !important; font-size: 14px !important;
                color: #333333 !important; background: #ffffff !important;
                box-sizing: border-box !important;
            }
            .${UNIQUE_PREFIX}modal-input:focus,
            .${UNIQUE_PREFIX}modal-select:focus,
            .${UNIQUE_PREFIX}modal-textarea:focus {
                border-color: #4CAF50 !important; outline: none !important;
            }
            .${UNIQUE_PREFIX}modal-textarea { min-height: 60px !important; resize: vertical !important; }
            .${UNIQUE_PREFIX}custom-input-container {
                all: unset !important; display: none !important; margin-top: 8px !important;
            }
            .${UNIQUE_PREFIX}custom-input-container.show { display: block !important; }
            .${UNIQUE_PREFIX}custom-input {
                all: unset !important; display: block !important;
                width: 100% !important; padding: 10px !important;
                border: 2px solid #4CAF50 !important; border-radius: 6px !important;
                font-size: 14px !important; color: #333333 !important;
                background: #f9fff9 !important; box-sizing: border-box !important;
            }
            .${UNIQUE_PREFIX}custom-input:focus {
                border-color: #2e7d32 !important; outline: none !important;
                background: #ffffff !important;
            }
            .${UNIQUE_PREFIX}modal-buttons {
                all: unset !important; display: flex !important;
                gap: 10px !important; justify-content: flex-end !important;
                margin-top: 16px !important;
            }
            .${UNIQUE_PREFIX}modal-button {
                all: unset !important; display: inline-block !important;
                flex: 1 !important; padding: 12px !important; border: none !important;
                border-radius: 6px !important; cursor: pointer !important;
                font-size: 14px !important; font-weight: 500 !important;
                text-align: center !important; color: #ffffff !important;
                transition: background-color 0.3s ease !important;
            }
            .${UNIQUE_PREFIX}modal-button.submit { background-color: #cccccc !important; }
            .${UNIQUE_PREFIX}modal-button.submit:not(:disabled) { background-color: #4CAF50 !important; }
            .${UNIQUE_PREFIX}modal-button.submit:not(:disabled):hover { background-color: #45a049 !important; }
            .${UNIQUE_PREFIX}modal-button.close { background-color: #f44336 !important; }
            .${UNIQUE_PREFIX}modal-button.close:hover { background-color: #da190b !important; }
            .${UNIQUE_PREFIX}modal-button:disabled { cursor: not-allowed !important; opacity: 0.6 !important; }
            .${UNIQUE_PREFIX}date-indicator {
                all: unset !important; display: flex !important;
                align-items: center !important; justify-content: center !important;
                margin-top: 8px !important; padding: 8px 12px !important;
                border-radius: 6px !important; font-size: 13px !important;
                font-weight: 500 !important; text-align: center !important;
                min-height: 20px !important; transition: all 0.3s ease !important;
            }
            .${UNIQUE_PREFIX}date-indicator.free {
                background-color: #e8f5e8 !important; color: #2e7d32 !important;
                border: 1px solid #a5d6a7 !important;
            }
            .${UNIQUE_PREFIX}date-indicator.partial {
                background-color: #fff3e0 !important; color: #f57c00 !important;
                border: 1px solid #ffcc02 !important;
            }
            .${UNIQUE_PREFIX}date-indicator.full {
                background-color: #ffebee !important; color: #c62828 !important;
                border: 1px solid #ef5350 !important;
            }
            .${UNIQUE_PREFIX}date-indicator.empty {
                background-color: #f5f5f5 !important; color: #757575 !important;
                border: 1px solid #e0e0e0 !important;
            }
            .${UNIQUE_PREFIX}date-indicator.loading {
                background-color: #f0f0f0 !important; color: #666666 !important;
                border: 1px solid #dddddd !important;
            }
            .${UNIQUE_PREFIX}spinner {
                all: unset !important; display: inline-block !important;
                width: 13px !important; height: 13px !important;
                border: 2px solid #ffffffff !important;
                border-top: 2px solid #333333 !important;
                border-radius: 50% !important;
                animation: ${UNIQUE_PREFIX}spin 0.5s linear infinite !important;
                margin-right: 8px !important; vertical-align: middle !important;
            }
            .${UNIQUE_PREFIX}spinner-white {
                border: 2px solid rgba(187, 206, 214, 0.3) !important;
                border-top: 2px solid #ffffffff !important;
            }
            @keyframes ${UNIQUE_PREFIX}spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .${UNIQUE_PREFIX}click-blocker {
                all: unset !important; position: fixed !important;
                top: 0 !important; left: 0 !important; width: 100% !important;
                height: 100% !important; z-index: 99998 !important;
                background: transparent !important; cursor: wait !important;
                pointer-events: all !important;
            }
            .${UNIQUE_PREFIX}loading-button {
                position: relative !important; pointer-events: none !important;
                opacity: 0.8 !important;
            }
            .${UNIQUE_PREFIX}input-error {
                border-color: #dc3545 !important; background-color: #fff5f5 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
            .${UNIQUE_PREFIX}input-error-shake {
                animation: ${UNIQUE_PREFIX}shake 0.5s ease-in-out !important;
            }
            @keyframes ${UNIQUE_PREFIX}shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .${UNIQUE_PREFIX}error-message {
                all: unset !important; display: none !important;
                color: #dc3545 !important; font-size: 14px !important;
                margin-top: 8px !important; padding: 8px 12px !important;
                background-color: #f8d7da !important; border: 1px solid #f5c6cb !important;
                border-radius: 4px !important;
            }
            .${UNIQUE_PREFIX}error-message.show { display: block !important; }
            .${UNIQUE_PREFIX}dropzone {
                all: unset !important; display: flex !important;
                align-items: center !important; justify-content: center !important;
                flex-direction: column !important; height: 120px !important;
                border: 2px dashed #26a69a !important; border-radius: 8px !important;
                cursor: pointer !important; background-color: #f8f8f8 !important;
                color: #555555 !important; transition: all 0.2s !important;
                margin-top: 8px !important;
            }
            .${UNIQUE_PREFIX}dropzone:hover {
                border-color: #00695c !important; background-color: #e0f7fa !important;
            }
            .${UNIQUE_PREFIX}dropzone-text {
                all: unset !important; font-size: 16px !important; color: inherit !important;
            }
            .${UNIQUE_PREFIX}file-input { display: none !important; }
            .${UNIQUE_PREFIX}file-list {
                all: unset !important; display: none !important;
                margin-top: 12px !important; max-height: 150px !important;
                overflow-y: auto !important; border: 1px solid #eeeeee !important;
                padding: 8px !important; border-radius: 6px !important;
                font-size: 13px !important; background-color: #f9f9f9 !important;
            }
            .${UNIQUE_PREFIX}file-list.show { display: block !important; }
            .${UNIQUE_PREFIX}file-ul {
                all: unset !important; display: block !important; list-style: none !important;
            }
            .${UNIQUE_PREFIX}file-item {
                all: unset !important; display: flex !important;
                align-items: center !important; justify-content: space-between !important;
                padding: 6px 0 !important; color: #555555 !important;
                cursor: pointer !important; transition: background-color 0.2s !important;
                white-space: nowrap !important; overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .${UNIQUE_PREFIX}file-item:hover { background-color: #f0f0f0 !important; }
            .${UNIQUE_PREFIX}file-name {
                all: unset !important; flex: 1 !important;
                overflow: hidden !important; text-overflow: ellipsis !important;
            }
            .${UNIQUE_PREFIX}file-remove {
                all: unset !important; color: #dc3545 !important;
                font-weight: bold !important; margin-left: 8px !important;
                cursor: pointer !important; opacity: 0.7 !important;
                font-size: 16px !important; transition: opacity 0.2s !important;
            }
            .${UNIQUE_PREFIX}file-remove:hover { opacity: 1 !important; }
            .${UNIQUE_PREFIX}file-count {
                all: unset !important; display: block !important;
                font-size: 12px !important; color: #777777 !important;
                margin-top: 6px !important;
            }
            .${UNIQUE_PREFIX}preview-modal {
                all: unset !important; position: fixed !important;
                top: 0 !important; left: 0 !important; width: 100% !important;
                height: 100% !important; background: rgba(0, 0, 0, 0.9) !important;
                display: flex !important; justify-content: center !important;
                align-items: center !important; z-index: 100000 !important;
                cursor: zoom-out !important;
            }
            .${UNIQUE_PREFIX}preview-image {
                all: unset !important; max-width: 90% !important;
                max-height: 90% !important; object-fit: contain !important;
                border: 3px solid #ffffff !important; border-radius: 8px !important;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) !important;
            }
            .${UNIQUE_PREFIX}delayed-info {
                all: unset !important; display: block !important;
                margin-top: 8px !important; padding: 8px 12px !important;
                background-color: #e3f2fd !important; border: 1px solid #90caf9 !important;
                border-radius: 6px !important; font-size: 12px !important;
                color: #1565c0 !important; text-align: center !important;
            }
            .${UNIQUE_PREFIX}dialog-content {
                all: unset !important; display: block !important;
                background: #ffffff !important; padding: 32px !important;
                border-radius: 16px !important; width: 500px !important;
                max-width: 90% !important; text-align: center !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
                color: #333333 !important;
            }
            .${UNIQUE_PREFIX}dialog-icon {
                all: unset !important; display: block !important;
                font-size: 64px !important; margin-bottom: 20px !important;
            }
            .${UNIQUE_PREFIX}dialog-title {
                all: unset !important; display: block !important;
                font-size: 24px !important; font-weight: 600 !important;
                margin-bottom: 16px !important; color: #333333 !important;
            }
            .${UNIQUE_PREFIX}dialog-title.warning { color: #ff9800 !important; }
            .${UNIQUE_PREFIX}dialog-title.success { color: #4CAF50 !important; }
            .${UNIQUE_PREFIX}dialog-text {
                all: unset !important; display: block !important;
                font-size: 16px !important; color: #666666 !important;
                margin-bottom: 24px !important; line-height: 1.4 !important;
            }
            .${UNIQUE_PREFIX}dialog-text strong {
                color: #333333 !important; font-weight: 600 !important;
            }
            .${UNIQUE_PREFIX}dialog-button {
                all: unset !important; display: inline-block !important;
                width: 100% !important; padding: 14px !important;
                background: #2196F3 !important; color: #ffffff !important;
                border-radius: 8px !important; cursor: pointer !important;
                font-size: 16px !important; font-weight: 500 !important;
                transition: background-color 0.3s ease !important;
                text-align: center !important;
            }
            .${UNIQUE_PREFIX}dialog-button:hover { background: #1976D2 !important; }
            .${UNIQUE_PREFIX}change-date-container {
                all: unset !important; display: block !important;
                margin-bottom: 24px !important;
            }
            .${UNIQUE_PREFIX}change-date-input {
                all: unset !important; display: block !important;
                width: 100% !important; padding: 12px !important;
                border: 2px solid #cccccc !important; border-radius: 8px !important;
                font-size: 16px !important; color: #333333 !important;
                background: #ffffff !important; box-sizing: border-box !important;
                text-align: center !important; margin-bottom: 8px !important;
            }
            .${UNIQUE_PREFIX}change-date-input:focus {
                border-color: #4CAF50 !important; outline: none !important;
            }
            .${UNIQUE_PREFIX}change-date-help {
                all: unset !important; display: block !important;
                font-size: 12px !important; color: #999999 !important;
                margin-top: 8px !important;
            }
            .${UNIQUE_PREFIX}change-date-buttons {
                all: unset !important; display: flex !important;
                gap: 12px !important; justify-content: center !important;
            }
            .${UNIQUE_PREFIX}change-date-button {
                all: unset !important; display: inline-block !important;
                flex: 1 !important; padding: 14px !important;
                border-radius: 8px !important; cursor: pointer !important;
                font-size: 14px !important; font-weight: 500 !important;
                text-align: center !important; transition: background-color 0.3s ease !important;
                color: #ffffff !important;
            }
            .${UNIQUE_PREFIX}change-date-button.confirm { background: #cccccc !important; }
            .${UNIQUE_PREFIX}change-date-button.confirm:not(:disabled) { background: #4CAF50 !important; }
            .${UNIQUE_PREFIX}change-date-button.confirm:not(:disabled):hover { background: #45a049 !important; }
            .${UNIQUE_PREFIX}change-date-button.cancel { background: #f44336 !important; }
            .${UNIQUE_PREFIX}change-date-button.cancel:hover { background: #da190b !important; }
            .${UNIQUE_PREFIX}change-date-button:disabled {
                cursor: not-allowed !important; opacity: 0.6 !important;
            }
            .${UNIQUE_PREFIX}countdown-text {
                all: unset !important; display: block !important;
                font-size: 14px !important; color: #999999 !important;
            }
            .${UNIQUE_PREFIX}countdown-number {
                all: unset !important; font-weight: bold !important;
                color: #4CAF50 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // Кэш дат
    // ─────────────────────────────────────────────
    function cleanDateCache() {
        const now = Date.now();
        for (const [key, data] of dateCache.entries()) {
            if (now - data.timestamp > DATE_CACHE_TTL) {
                dateCache.delete(key);
            }
        }
    }

    function getCachedDateInfo(date) {
        cleanDateCache();
        const cached = dateCache.get(date);
        if (cached && (Date.now() - cached.timestamp < DATE_CACHE_TTL)) {
            return cached.data;
        }
        return null;
    }

    function setCachedDateInfo(date, data) {
        dateCache.set(date, { data: data, timestamp: Date.now() });
    }

    // ─────────────────────────────────────────────
    // Загрузка типов из Google Sheets
    // ─────────────────────────────────────────────
    function loadTypesFromSheet(callback) {
        if (typesCache.length > 0) return callback(typesCache);
        GM.xmlhttpRequest({
            method: 'GET',
            url: TYPES_SHEET_URL,
            timeout: 10000,
            onload: function(response) {
                try {
                    const csv = response.responseText;
                    const lines = csv.split('\n');
                    const types = [];
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && line !== '""' && line !== '') {
                            const cleanLine = line.replace(/^"|"$/g, '').trim();
                            if (cleanLine) types.push(cleanLine);
                        }
                    }
                    typesCache = types;
                    callback(types);
                } catch (e) {
                    callback([]);
                }
            },
            onerror: () => callback([]),
            ontimeout: () => callback([])
        });
    }

    // ─────────────────────────────────────────────
    // Блокировщик кликов
    // ─────────────────────────────────────────────
    function createClickBlocker() {
        const blocker = document.createElement('div');
        blocker.className = `${UNIQUE_PREFIX}click-blocker`;
        blocker.id = `${UNIQUE_PREFIX}click-blocker`;
        document.body.appendChild(blocker);
        return blocker;
    }

    function removeClickBlocker() {
        const blocker = document.getElementById(`${UNIQUE_PREFIX}click-blocker`);
        if (blocker) blocker.remove();
    }

    // ─────────────────────────────────────────────
    // UI: кнопка загрузки
    // ─────────────────────────────────────────────
    function setButtonLoading(button, isLoading, loadingText = "Загрузка...") {
        if (isLoading) {
            button.disabled = true;
            button.classList.add(`${UNIQUE_PREFIX}loading-button`);
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="${UNIQUE_PREFIX}spinner ${UNIQUE_PREFIX}spinner-white"></span>${loadingText}`;
        } else {
            button.disabled = false;
            button.classList.remove(`${UNIQUE_PREFIX}loading-button`);
            button.innerHTML = button.dataset.originalText || button.textContent;
        }
    }

    function showErrorMessage(message) {
        const errorContainer = document.getElementById("errorContainer");
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.className = `${UNIQUE_PREFIX}error-message show`;
            setTimeout(() => errorContainer.classList.remove('show'), 5000);
        }
    }

    function clearErrorMessage() {
        const errorContainer = document.getElementById("errorContainer");
        if (errorContainer) errorContainer.className = `${UNIQUE_PREFIX}error-message`;
    }

    function validateRequiredFields(inputs) {
        const empty = inputs.filter(input => !input.value.trim());
        if (empty.length) {
            empty.forEach(input => {
                input.classList.add(`${UNIQUE_PREFIX}input-error`, `${UNIQUE_PREFIX}input-error-shake`);
                setTimeout(() => input.classList.remove(`${UNIQUE_PREFIX}input-error-shake`), 500);
            });
            const labels = empty.map(input => {
                const label = input.closest('label')?.textContent?.replace('*', '').replace(':', '').trim();
                return label || 'Поле';
            }).join(', ');
            showErrorMessage(`Заполните: ${labels}`);
            return false;
        }
        return true;
    }

    // ─────────────────────────────────────────────
    // Кнопка модуля
    // ─────────────────────────────────────────────
    function checkAndAddButton() {
        const shouldShow = SELECTORS.some(selector => {
            const el = document.querySelector(selector);
            if (!el) return false;
            if (el.tagName === "INPUT") {
                return typeof el.value === "string" && el.value.trim().startsWith(TARGET_TEXT);
            }
            return el.textContent && el.textContent.trim().startsWith(TARGET_TEXT);
        });

        if (shouldShow) {
            if (!buttonAdded || !createdButton || !document.contains(createdButton)) {
                createButton();
                buttonAdded = true;
            }
        } else if (buttonAdded && createdButton) {
            createdButton.remove();
            buttonAdded = false;
            createdButton = null;
        }
    }

    function createButton() {
        if (createdButton && document.contains(createdButton)) createdButton.remove();
        const button = document.createElement("button");
        button.textContent = "📅 Заявка на монтаж";
        button.className = `${UNIQUE_PREFIX}main-button ${UNIQUE_PREFIX}reset`;
        createdButton = button;
        const topButtons = document.querySelector("#TopButtons") || document.querySelector("#Top > form > div > div > div");
        if (topButtons) topButtons.appendChild(button);
        button.addEventListener("click", (e) => {
            e.preventDefault();
            if (isProcessing) return;
            handleButtonClick(button);
        });
    }

    async function handleButtonClick(button) {
        isProcessing = true;
        setButtonLoading(button, true, "Загрузка...");
        createClickBlocker();
        try {
            await loadProductIdCacheAsync();
            openModal(() => {
                setButtonLoading(button, false);
                removeClickBlocker();
                isProcessing = false;
            });
        } catch (error) {
            setButtonLoading(button, false);
            removeClickBlocker();
            isProcessing = false;
            showErrorMessage('Ошибка загрузки данных');
        }
    }

    function loadProductIdCacheAsync() {
        return new Promise((resolve, reject) => {
            GM.xmlhttpRequest({
                method: 'POST',
                url: SCRIPT_URL,
                data: JSON.stringify({ action: 'getProductIds' }),
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
                onload: function(response) {
                    try {
                        const text = response.responseText.trim();
                        if (text.startsWith('<')) {
                            reject(new Error('Сервис недоступен'));
                            return;
                        }
                        const result = JSON.parse(text);
                        productIdCache.clear();
                        if (result.productIds) {
                            result.productIds.forEach(id => id && productIdCache.add(id));
                        }
                        resolve();
                    } catch (e) {
                        reject(new Error('Неверный ответ'));
                    }
                },
                onerror: () => reject(new Error('Ошибка сети')),
                ontimeout: () => reject(new Error('Таймаут сети'))
            });
        });
    }

    // ─────────────────────────────────────────────
    // Индикатор даты
    // ─────────────────────────────────────────────
    function updateDateIndicator(selectedDate, indicatorId = `${UNIQUE_PREFIX}date-indicator`) {
        const indicator = document.getElementById(indicatorId);
        if (!indicator) return;
        if (!selectedDate) {
            indicator.className = `${UNIQUE_PREFIX}date-indicator empty`;
            indicator.textContent = "Выберите дату";
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        if (selected < today) {
            indicator.className = `${UNIQUE_PREFIX}date-indicator full`;
            indicator.innerHTML = `🚫 <strong>Дата в прошлом</strong>`;
            setCachedDateInfo(selectedDate, { count: -1, maxReached: true, isPast: true });
            return;
        }
        const cached = getCachedDateInfo(selectedDate);
        if (cached && !cached.isPast) {
            displayDateStatus(indicator, cached.count, cached.maxReached);
            return;
        }
        indicator.className = `${UNIQUE_PREFIX}date-indicator loading`;
        indicator.innerHTML = `<span class="${UNIQUE_PREFIX}spinner"></span>Проверка...`;
        checkEntryCount(selectedDate, (count, maxReached) => {
            setCachedDateInfo(selectedDate, { count, maxReached, isPast: false });
            displayDateStatus(indicator, count, maxReached);
        });
    }

    function displayDateStatus(indicator, count, maxReached) {
        const max = 3;
        const free = max - count;
        function getPlacesWord(num) {
            const lastDigit = num % 10;
            const lastTwoDigits = num % 100;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'мест';
            if (lastDigit === 1) return 'место';
            if (lastDigit >= 2 && lastDigit <= 4) return 'места';
            return 'мест';
        }
        if (count === 0) {
            indicator.className = `${UNIQUE_PREFIX}date-indicator free`;
            indicator.innerHTML = `✅ <strong>${max} ${getPlacesWord(max)}</strong>`;
        } else if (count < max) {
            indicator.className = `${UNIQUE_PREFIX}date-indicator partial`;
            indicator.innerHTML = `⚠️ <strong>${count}/${max}</strong> • Свободно: <strong>${free} ${getPlacesWord(free)}</strong>`;
        } else {
            indicator.className = `${UNIQUE_PREFIX}date-indicator full`;
            indicator.innerHTML = `🚫 <strong>${count}/${max}</strong> • Требуется согласование`;
        }
    }

    function setupDateIndicator(dateInputId = "workDate", indicatorId = `${UNIQUE_PREFIX}date-indicator`) {
        const dateInput = document.getElementById(dateInputId);
        if (!dateInput) return;
        const indicator = document.createElement("div");
        indicator.id = indicatorId;
        indicator.className = `${UNIQUE_PREFIX}date-indicator empty`;
        indicator.textContent = "Выберите дату";
        dateInput.parentNode.insertBefore(indicator, dateInput.nextSibling);
        let debounceTimer;
        const debounceDelay = 300;
        const handleDateChange = (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateDateIndicator(e.target.value, indicatorId);
            }, debounceDelay);
        };
        ['input', 'change'].forEach(ev => dateInput.addEventListener(ev, handleDateChange));
        if (dateInput.value) updateDateIndicator(dateInput.value, indicatorId);
    }

    function setupWhatMountSelect() {
        const whatMount = document.getElementById("whatMount");
        const container = document.getElementById("customInputContainer");
        const input = document.getElementById("customInput");
        if (!whatMount || !container || !input) return;
        whatMount.addEventListener("change", () => {
            if (whatMount.value === "Другое") {
                container.classList.add("show");
                setTimeout(() => input.focus(), 100);
            } else {
                container.classList.remove("show");
                input.value = "";
            }
            checkAllRequiredFields();
        });
        input.addEventListener("input", checkAllRequiredFields);
    }

    function checkAllRequiredFields() {
        const fields = [
            document.getElementById("workDate"),
            document.getElementById("visitType"),
            document.getElementById("workType"),
            document.getElementById("address"),
            document.getElementById("contactInfo")
        ];
        const whatMount = document.getElementById("whatMount");
        const customInput = document.getElementById("customInput");
        const submitBtn = document.getElementById("submitBtn");
        if (!submitBtn) return;
        let allFilled = fields.every(f => f?.value.trim());
        if (whatMount?.value === "Другое") {
            allFilled = allFilled && customInput?.value.trim();
        } else {
            allFilled = allFilled && whatMount?.value.trim();
        }
        submitBtn.disabled = !allFilled;
        submitBtn.style.backgroundColor = allFilled ? "#4CAF50" : "#cccccc";
    }

    function getWhatMountValue() {
        const select = document.getElementById("whatMount");
        const input = document.getElementById("customInput");
        return select?.value === "Другое" ? input?.value.trim() || "" : select?.value || "";
    }

    // ─────────────────────────────────────────────
    // Модальное окно
    // ─────────────────────────────────────────────
    function openModal(onComplete) {
        const productIdEl = document.querySelector("#ProductId");
        const productId = productIdEl ? productIdEl.textContent.trim() : "N/A";
        checkProductStatus(productId, (statusData) => {
            if (statusData.exists) {
                if (statusData.status === 0) {
                    showChangeDateDialog(productId, statusData.currentDate);
                    if (onComplete) onComplete();
                } else {
                    showProductExistsDialog(productId);
                    if (onComplete) onComplete();
                }
                return;
            }
            loadTypesFromSheet((types) => {
                const modal = createModalElement(productId);
                document.body.appendChild(modal);
                setupDateIndicator();
                setupWhatMountSelect();
                setupDropZone(modal);
                const requiredInputs = [
                    document.getElementById("workDate"),
                    document.getElementById("visitType"),
                    document.getElementById("workType"),
                    document.getElementById("address"),
                    document.getElementById("contactInfo")
                ];
                requiredInputs.forEach(input => {
                    input.addEventListener("input", () => {
                        clearErrorMessage();
                        input.classList.remove(`${UNIQUE_PREFIX}input-error`);
                        checkAllRequiredFields();
                    });
                    input.addEventListener("change", checkAllRequiredFields);
                });
                document.getElementById("submitBtn").addEventListener("click", handleSubmit(productId, requiredInputs));
                document.getElementById("closeBtn").addEventListener("click", () => modal.remove());
                modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
                const today = new Date().toISOString().split('T')[0];
                document.getElementById("workDate").setAttribute('min', today);
                setTimeout(() => {
                    document.getElementById("workDate").focus();
                    if (onComplete) onComplete();
                }, 0);
            });
        });
    }

    function createModalElement(productId) {
        const types = typesCache.map(t => `<option value="${t}">${t}</option>`).join('');
        const modal = document.createElement("div");
        modal.className = `${UNIQUE_PREFIX}modal-overlay ${UNIQUE_PREFIX}reset`;
        modal.innerHTML = `
            <div class="${UNIQUE_PREFIX}modal-content ${UNIQUE_PREFIX}reset">
                <h3 class="${UNIQUE_PREFIX}modal-title ${UNIQUE_PREFIX}reset">Заявка на монтаж</h3>
                <div class="${UNIQUE_PREFIX}modal-body ${UNIQUE_PREFIX}reset">
                    <div class="${UNIQUE_PREFIX}modal-column ${UNIQUE_PREFIX}reset">
                        <h4 class="${UNIQUE_PREFIX}modal-column-title ${UNIQUE_PREFIX}reset">Основная информация</h4>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Дата <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <input type="date" id="workDate" class="${UNIQUE_PREFIX}modal-input ${UNIQUE_PREFIX}reset" required>
                        </label>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Вид выезда <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <select id="visitType" class="${UNIQUE_PREFIX}modal-select ${UNIQUE_PREFIX}reset" required>
                                <option value="">Выберите...</option>
                                <option value="Замеры">Замеры</option>
                                <option value="Монтаж">Монтаж</option>
                            </select>
                        </label>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Тип работ <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <select id="workType" class="${UNIQUE_PREFIX}modal-select ${UNIQUE_PREFIX}reset" required>
                                <option value="">Выберите...</option>
                                <option value="В помещении">В помещении</option>
                                <option value="На улице">На улице</option>
                            </select>
                        </label>
                    </div>
                    <div class="${UNIQUE_PREFIX}modal-column ${UNIQUE_PREFIX}reset">
                        <h4 class="${UNIQUE_PREFIX}modal-column-title ${UNIQUE_PREFIX}reset">Дополнительно</h4>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Что монтируем? <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <select id="whatMount" class="${UNIQUE_PREFIX}modal-select ${UNIQUE_PREFIX}reset" required>
                                <option value="">Выберите...</option>
                                ${types}
                                <option value="Другое">Другое</option>
                            </select>
                            <div id="customInputContainer" class="${UNIQUE_PREFIX}custom-input-container ${UNIQUE_PREFIX}reset">
                                <input type="text" id="customInput" class="${UNIQUE_PREFIX}custom-input ${UNIQUE_PREFIX}reset" placeholder="Уточните...">
                            </div>
                        </label>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Адрес <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <input type="text" id="address" class="${UNIQUE_PREFIX}modal-input ${UNIQUE_PREFIX}reset" required>
                        </label>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Контакты <span class="${UNIQUE_PREFIX}required-star">*</span>:
                            <input type="text" id="contactInfo" class="${UNIQUE_PREFIX}modal-input ${UNIQUE_PREFIX}reset" required>
                        </label>
                        <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                            Комментарии:
                            <textarea id="comments" class="${UNIQUE_PREFIX}modal-textarea ${UNIQUE_PREFIX}reset"></textarea>
                        </label>
                        <div id="dropzone" class="${UNIQUE_PREFIX}dropzone ${UNIQUE_PREFIX}reset">
                            <p class="${UNIQUE_PREFIX}dropzone-text ${UNIQUE_PREFIX}reset">Перетащите файлы сюда</p>
                            <input type="file" id="file-input" class="${UNIQUE_PREFIX}file-input ${UNIQUE_PREFIX}reset" multiple>
                        </div>
                        <div id="file-list" class="${UNIQUE_PREFIX}file-list ${UNIQUE_PREFIX}reset">
                            <ul id="file-ul" class="${UNIQUE_PREFIX}file-ul ${UNIQUE_PREFIX}reset"></ul>
                            <div class="${UNIQUE_PREFIX}file-count ${UNIQUE_PREFIX}reset">Выбрано: <span id="file-count">0</span> файлов</div>
                        </div>
                    </div>
                </div>
                <div id="errorContainer" class="${UNIQUE_PREFIX}error-message ${UNIQUE_PREFIX}reset"></div>
                <div class="${UNIQUE_PREFIX}modal-buttons ${UNIQUE_PREFIX}reset">
                    <button id="submitBtn" class="${UNIQUE_PREFIX}modal-button submit ${UNIQUE_PREFIX}reset">Отправить</button>
                    <button id="closeBtn" class="${UNIQUE_PREFIX}modal-button close ${UNIQUE_PREFIX}reset">Закрыть</button>
                </div>
            </div>`;
        return modal;
    }

    // ─────────────────────────────────────────────
    // Drag & Drop для файлов
    // ─────────────────────────────────────────────
    function setupDropZone(modal) {
        const dropzone = modal.querySelector('#dropzone');
        const fileInput = modal.querySelector('#file-input');
        const fileList = modal.querySelector('#file-list');
        const fileUl = modal.querySelector('#file-ul');
        const fileCount = modal.querySelector('#file-count');

        function updateFileList() {
            fileUl.innerHTML = '';
            files.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = `${UNIQUE_PREFIX}file-item ${UNIQUE_PREFIX}reset`;
                li.innerHTML = `
                    <span class="${UNIQUE_PREFIX}file-name ${UNIQUE_PREFIX}reset">${file.name}</span>
                    <span class="${UNIQUE_PREFIX}file-remove ${UNIQUE_PREFIX}reset" data-index="${index}">✕</span>
                `;
                fileUl.appendChild(li);
                li.addEventListener('click', () => {
                    if (file.type.startsWith('image/')) {
                        setupImagePreview(file);
                    }
                });
                li.querySelector(`.${UNIQUE_PREFIX}file-remove`).addEventListener('click', (e) => {
                    e.stopPropagation();
                    files.splice(index, 1);
                    updateFileList();
                    checkAllRequiredFields();
                });
            });
            fileCount.textContent = files.length;
            fileList.classList.toggle('show', files.length > 0);
        }

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                files = [...files, ...Array.from(fileInput.files)];
                updateFileList();
            }
        });

        ['dragover', 'dragenter'].forEach(evt => {
            dropzone.addEventListener(evt, e => {
                e.preventDefault();
                dropzone.style.borderColor = '#00695c';
                dropzone.style.backgroundColor = '#e0f7fa';
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropzone.addEventListener(evt, e => {
                e.preventDefault();
                dropzone.style.borderColor = '#26a69a';
                dropzone.style.backgroundColor = '#f8f8f8';
            });
        });

        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            const newFiles = Array.from(e.dataTransfer.files);
            files = [...files, ...newFiles];
            updateFileList();
        });
    }

    function setupImagePreview(file) {
        const url = URL.createObjectURL(file);
        const previewModal = document.createElement('div');
        previewModal.className = `${UNIQUE_PREFIX}preview-modal ${UNIQUE_PREFIX}reset`;
        previewModal.innerHTML = `<img src="${url}" class="${UNIQUE_PREFIX}preview-image ${UNIQUE_PREFIX}reset">`;
        document.body.appendChild(previewModal);
        previewModal.addEventListener('click', () => {
            URL.revokeObjectURL(url);
            previewModal.remove();
        });
    }

    // ─────────────────────────────────────────────
    // Отправка формы
    // ─────────────────────────────────────────────
    function handleSubmit(productId, requiredInputs) {
        return async (e) => {
            e.preventDefault();
            if (isProcessing) return;
            isProcessing = true;
            const conditionalInputs = [...requiredInputs];
            const whatMount = document.getElementById("whatMount");
            if (whatMount.value === "Другое") {
                conditionalInputs.push(document.getElementById("customInput"));
            } else {
                conditionalInputs.push(whatMount);
            }
            if (!validateRequiredFields(conditionalInputs)) {
                isProcessing = false;
                return;
            }
            const workDate = document.getElementById("workDate").value;
            const visitType = document.getElementById("visitType").value;
            const workType = document.getElementById("workType").value;
            const whatMountVal = getWhatMountValue();
            const address = document.getElementById("address").value.trim();
            const contactInfo = document.getElementById("contactInfo").value.trim();
            const comments = document.getElementById("comments").value.trim();
            const submitBtn = document.getElementById("submitBtn");
            setButtonLoading(submitBtn, true, "Проверка...");
            createClickBlocker();
            checkDuplicate(productId, (exists) => {
                if (exists) {
                    setButtonLoading(submitBtn, false);
                    removeClickBlocker();
                    isProcessing = false;
                    showProductExistsDialog(productId);
                    return;
                }
                checkEntryCount(workDate, (count, maxReached) => {
                    let approval = "";
                    if (maxReached || whatMount.value === "Другое") {
                        approval = "согласование";
                    }
                    sendToGoogleSheet(productId, workDate, visitType, workType, approval, () => {
                        sendToSheet2(productId, whatMountVal, address, contactInfo, comments, () => {
                            setButtonLoading(submitBtn, false);
                            removeClickBlocker();
                            isProcessing = false;
                            if (files.length > 0) {
                                saveFilesForDelayedSending(productId, files);
                                files = [];
                            }
                            const modal = document.querySelector(`.${UNIQUE_PREFIX}modal-overlay`);
                            if (modal) modal.remove();
                            productIdCache.add(productId);
                        }, (error) => {
                            setButtonLoading(submitBtn, false);
                            removeClickBlocker();
                            isProcessing = false;
                            showErrorMessage("Ошибка: " + error);
                        });
                    }, (error) => {
                        setButtonLoading(submitBtn, false);
                        removeClickBlocker();
                        isProcessing = false;
                        showErrorMessage("Ошибка: " + error);
                    });
                });
            });
        };
    }

    // ─────────────────────────────────────────────
    // API-запросы к Google Apps Script
    // ─────────────────────────────────────────────
    function checkProductStatus(productId, callback) {
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify({ action: 'checkProductStatus', productId }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
            onload: (res) => {
                try {
                    callback(JSON.parse(res.responseText));
                } catch (e) {
                    callback({ exists: false });
                }
            },
            onerror: () => callback({ exists: false }),
            ontimeout: () => callback({ exists: false })
        });
    }

    function checkDuplicate(productId, callback) {
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify({ action: 'checkDuplicate', productId }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
            onload: (res) => {
                try {
                    callback(JSON.parse(res.responseText).exists);
                } catch (e) {
                    callback(false);
                }
            },
            onerror: () => callback(false),
            ontimeout: () => callback(false)
        });
    }

    function checkEntryCount(date, callback) {
        const cached = getCachedDateInfo(date);
        if (cached && !cached.isPast) {
            callback(cached.count, cached.maxReached);
            return;
        }
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify({ action: 'checkDate', date }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000,
            onload: (res) => {
                try {
                    const result = JSON.parse(res.responseText);
                    const count = result.count || 0;
                    const maxReached = count >= 3;
                    setCachedDateInfo(date, { count, maxReached, isPast: false });
                    callback(count, maxReached);
                } catch (e) {
                    callback(0, false);
                }
            },
            onerror: () => callback(0, false),
            ontimeout: () => callback(0, false)
        });
    }

    function sendToGoogleSheet(productId, date, visitType, workType, approval, onSuccess, onError) {
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify({ action: 'addAndCheck', productId, date, visitType, workType, approval, linkText: '' }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        const cleanText = res.responseText.trim();
                        if (cleanText.startsWith('<')) {
                            onError('Сервер вернул HTML');
                            return;
                        }
                        const result = JSON.parse(cleanText);
                        if (result.status === "success") {
                            dateCache.delete(date);
                            onSuccess();
                        } else {
                            onError(result.error || "Ошибка в данных");
                        }
                    } catch (e) {
                        onError("Ошибка ответа: сервер не вернул JSON");
                    }
                } else {
                    onError(`Ошибка HTTP: ${res.status}`);
                }
            },
            onerror: (err) => onError(`Ошибка сети: ${err.statusText || err}`),
            ontimeout: () => onError("Таймаут запроса")
        });
    }

    function sendToSheet2(productId, whatMount, address, contactInfo, comments, onSuccess, onError) {
        GM.xmlhttpRequest({
            method: 'POST',
            url: SCRIPT_URL,
            data: JSON.stringify({ action: 'addExtraData', productId, whatMount, address, contactInfo, comments }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        const cleanText = res.responseText.trim();
                        if (cleanText.startsWith('<')) {
                            onError('Сервер вернул HTML вместо JSON');
                            return;
                        }
                        const result = JSON.parse(cleanText);
                        if (result.status === "success") {
                            onSuccess();
                        } else {
                            onError(result.error || "Ошибка в данных от сервера");
                        }
                    } catch (e) {
                        onError("Ошибка ответа: некорректный JSON от сервера");
                    }
                } else {
                    onError(`Ошибка HTTP: ${res.status}`);
                }
            },
            onerror: (err) => onError(`Ошибка сети при отправке в таблицу 2: ${err.statusText || err}`),
            ontimeout: () => onError("Таймаут запроса при отправке дополнительных данных")
        });
    }

    // ─────────────────────────────────────────────
    // Диалоги
    // ─────────────────────────────────────────────
    function showChangeDateDialog(productId, oldDate) {
        const modal = document.createElement("div");
        modal.className = `${UNIQUE_PREFIX}modal-overlay ${UNIQUE_PREFIX}reset`;
        const today = new Date();
        const minDate = today.toISOString().split('T')[0];

        const content = document.createElement("div");
        content.className = `${UNIQUE_PREFIX}dialog-content ${UNIQUE_PREFIX}reset`;
        content.innerHTML = `
            <div class="${UNIQUE_PREFIX}dialog-icon ${UNIQUE_PREFIX}reset">⚠️</div>
            <h3 class="${UNIQUE_PREFIX}dialog-title warning ${UNIQUE_PREFIX}reset">Заказ отклонён</h3>
            <p class="${UNIQUE_PREFIX}dialog-text ${UNIQUE_PREFIX}reset">
                Заказ <strong>№${productId}</strong> был отклонён.<br>
                Вы можете выбрать новую дату для монтажа.
            </p>
            <div class="${UNIQUE_PREFIX}change-date-container ${UNIQUE_PREFIX}reset">
                <label class="${UNIQUE_PREFIX}modal-label ${UNIQUE_PREFIX}reset">
                    Новая дата:
                    <input type="date"
                           id="changeDateInput"
                           class="${UNIQUE_PREFIX}change-date-input ${UNIQUE_PREFIX}reset"
                           min="${minDate}"
                           value="${oldDate || ''}">
                </label>
                <div id="changeDateIndicator"></div>
                <div class="${UNIQUE_PREFIX}change-date-help ${UNIQUE_PREFIX}reset">
                    Выберите дату не ранее сегодняшнего дня
                </div>
            </div>
            <div class="${UNIQUE_PREFIX}change-date-buttons ${UNIQUE_PREFIX}reset">
                <button id="changeDateConfirmBtn"
                        class="${UNIQUE_PREFIX}change-date-button confirm ${UNIQUE_PREFIX}reset"
                        disabled>
                    ✅ Подтвердить новую дату
                </button>
                <button id="changeDateCancelBtn"
                        class="${UNIQUE_PREFIX}change-date-button cancel ${UNIQUE_PREFIX}reset">
                    ✖️ Отмена
                </button>
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);

        setupDateIndicator("changeDateInput", "changeDateIndicator");

        const dateInput = document.getElementById("changeDateInput");
        const confirmBtn = document.getElementById("changeDateConfirmBtn");
        const cancelBtn = document.getElementById("changeDateCancelBtn");

        dateInput.addEventListener("input", () => {
            checkChangeDateFields();
            dateInput.classList.remove(`${UNIQUE_PREFIX}input-error`);
        });
        dateInput.addEventListener("change", checkChangeDateFields);

        confirmBtn.addEventListener("click", () => {
            const newDate = dateInput.value;
            if (!newDate) {
                dateInput.classList.add(`${UNIQUE_PREFIX}input-error`, `${UNIQUE_PREFIX}input-error-shake`);
                setTimeout(() => dateInput.classList.remove(`${UNIQUE_PREFIX}input-error-shake`), 500);
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(newDate);
            if (selected < today) {
                dateInput.classList.add(`${UNIQUE_PREFIX}input-error`, `${UNIQUE_PREFIX}input-error-shake`);
                setTimeout(() => dateInput.classList.remove(`${UNIQUE_PREFIX}input-error-shake`), 500);
                return;
            }
            setButtonLoading(confirmBtn, true, "Обновление...");
            createClickBlocker();
            GM.xmlhttpRequest({
                method: 'POST',
                url: SCRIPT_URL,
                data: JSON.stringify({ action: 'updateProductDate', productId, newDate, linkText: '' }),
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
                onload: (response) => {
                    setButtonLoading(confirmBtn, false);
                    removeClickBlocker();
                    modal.remove();
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.status === 'success') {
                            showSuccessModal("Дата успешно обновлена!");
                            productIdCache.delete(productId);
                            dateCache.clear();
                            setTimeout(() => openModal(), 1000);
                        } else {
                            showErrorMessage("Ошибка обновления: " + (result.error || "Неизвестная ошибка"));
                        }
                    } catch (e) {
                        showErrorMessage("Ошибка обработки ответа");
                    }
                },
                onerror: () => {
                    setButtonLoading(confirmBtn, false);
                    removeClickBlocker();
                    showErrorMessage("Ошибка сети при обновлении даты");
                },
                ontimeout: () => {
                    setButtonLoading(confirmBtn, false);
                    removeClickBlocker();
                    showErrorMessage("Таймаут при обновлении даты");
                }
            });
        });

        cancelBtn.addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        setTimeout(() => {
            checkChangeDateFields();
            if (dateInput.value) updateDateIndicator(dateInput.value, "changeDateIndicator");
            dateInput.focus();
        }, 100);
    }

    function checkChangeDateFields() {
        const dateInput = document.getElementById("changeDateInput");
        const confirmBtn = document.getElementById("changeDateConfirmBtn");
        if (!dateInput || !confirmBtn) return;
        const isValid = dateInput.value.trim() !== "";
        confirmBtn.disabled = !isValid;
    }

    function showProductExistsDialog(productId) {
        const modal = document.createElement("div");
        modal.className = `${UNIQUE_PREFIX}modal-overlay ${UNIQUE_PREFIX}reset`;
        const content = document.createElement("div");
        content.className = `${UNIQUE_PREFIX}dialog-content ${UNIQUE_PREFIX}reset`;
        content.innerHTML = `
            <div class="${UNIQUE_PREFIX}dialog-icon ${UNIQUE_PREFIX}reset">⚠️</div>
            <h3 class="${UNIQUE_PREFIX}dialog-title warning ${UNIQUE_PREFIX}reset">Внимание!</h3>
            <p class="${UNIQUE_PREFIX}dialog-text ${UNIQUE_PREFIX}reset">
                Запись на заказ <strong>№${productId}</strong> уже существует.
            </p>
            <p class="${UNIQUE_PREFIX}dialog-text ${UNIQUE_PREFIX}reset" style="font-size: 14px !important; color: #999999 !important;">
                Если вы хотите внести изменения, обратитесь к администратору.
            </p>
            <button class="${UNIQUE_PREFIX}dialog-button ${UNIQUE_PREFIX}reset" id="existsCloseBtn">Понятно</button>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);
        const closeBtn = document.getElementById("existsCloseBtn");
        closeBtn.addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });
        setTimeout(() => closeBtn.focus(), 100);
    }

    function showSuccessModal(message) {
        const modal = document.createElement("div");
        modal.className = `${UNIQUE_PREFIX}modal-overlay ${UNIQUE_PREFIX}reset`;
        const content = document.createElement("div");
        content.className = `${UNIQUE_PREFIX}dialog-content ${UNIQUE_PREFIX}reset`;
        content.innerHTML = `
            <div class="${UNIQUE_PREFIX}dialog-icon ${UNIQUE_PREFIX}reset">✅</div>
            <h3 class="${UNIQUE_PREFIX}dialog-title success ${UNIQUE_PREFIX}reset">Успешно!</h3>
            <p class="${UNIQUE_PREFIX}dialog-text ${UNIQUE_PREFIX}reset">${message}</p>
            <div class="${UNIQUE_PREFIX}countdown-text ${UNIQUE_PREFIX}reset">
                Закроется через <span id="countdown" class="${UNIQUE_PREFIX}countdown-number ${UNIQUE_PREFIX}reset">3</span> сек.
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);
        let t = 3;
        const timer = setInterval(() => {
            if (--t <= 0) {
                clearInterval(timer);
                modal.remove();
            }
            const countdown = document.getElementById("countdown");
            if (countdown) countdown.textContent = t;
        }, 1000);
        modal.addEventListener("click", () => {
            clearInterval(timer);
            modal.remove();
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Управление модулем
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        addIsolatedStyles();
        initDelayedTelegramSender();
        checkAndAddButton();
        domObserver = new MutationObserver(checkAndAddButton);
        domObserver.observe(document.body, { childList: true, subtree: true });
        intervalChecker = setInterval(checkAndAddButton, 500);
    }

    function cleanup() {
        if (!active) return;
        active = false;
        if (domObserver) { domObserver.disconnect(); domObserver = null; }
        if (intervalChecker) { clearInterval(intervalChecker); intervalChecker = null; }
        if (delayedSenderTimer) { clearInterval(delayedSenderTimer); delayedSenderTimer = null; }
        if (createdButton) { createdButton.remove(); createdButton = null; }
        buttonAdded = false;
        isProcessing = false;
        files = [];
        dateCache.clear();
        removeClickBlocker();
        const modal = document.querySelector(`.${UNIQUE_PREFIX}modal-overlay`);
        if (modal) modal.remove();
    }

    function toggle() {
        if (active) { cleanup(); } else { init(); }
    }

    function isActive() {
        return active;
    }

    // 🔥 Авто-запуск, если включено в конфиге
    if (config?.autoInit !== false) {
        init();
    }

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        addIsolatedStyles,
        checkAndAddButton,
        openModal,
        saveFilesForDelayedSending,
        checkPendingFiles
    };

})(config, GM, utils, api);