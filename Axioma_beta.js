// ==UserScript==
// @name         Проверка заказа 10.0.86
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description
// @author       Ваше имя
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      sheets.googleapis.com
// @connect      docs.google.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      raw.githubusercontent.com
// @connect      api.ipify.org
// ==/UserScript==


(function () {

   //Политика конфиденциальности
function confidAgree() {
    'use strict';

    let warningButton = null;
    let popupElement = null;
    let warningShown = false;
    let warningTimer = null;
    let elementsDetected = false;

    // Добавление стилей
    function injectStyles() {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            /* Стили для кнопки предупреждения */
            .axiom-warning-button {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 50vh;
                background-color: transparent !important;
                color: white !important;
                font-size: 24px;
                border: none !important;
                cursor: pointer;
                z-index: 9999;
                text-align: center;
                box-shadow: none !important;
                outline: none !important;
            }
            .axiom-warning-button:hover {
                background-color: transparent !important;
                color: red !important;
                box-shadow: none !important;
            }

            /* Стили для всплывающего окна */
            .axiom-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 600px;
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                z-index: 10000;
            }
            .axiom-popup-header {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: red;
                text-align: center;
            }
            .axiom-popup-content {
                font-size: 16px;
                margin-bottom: 20px;
                text-align: center;
            }

            /* Стили для чекбокса и текста соглашения */
            .axiom-checkbox-container {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 10px !important;
                margin: 20px 0 !important;
            }
            input[type="checkbox"] {
                width: 13px;
                height: 13px;
                accent-color: #aaa;
                cursor: pointer;
            }
            .axiom-agreement-text {
                font-size: 16px;
                color: #aaa;
                white-space: nowrap;
            }
            .axiom-agreement-text.active {
                color: black;
            }

            /* Стили для кнопки "Войти" */
            .axiom-enter-button {
                display: block;
                margin: 0 auto;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.5;
                pointer-events: none;
                transition: opacity 0.3s, background-color 0.3s;
            }
            .axiom-enter-button.visible {
                opacity: 1;
                pointer-events: auto;
            }
            .axiom-enter-button:hover {
                background-color: #45a049;
            }

            /* Стили для ссылки на соглашение */
            .axiom-agreement-link {
                color: blue;
                text-decoration: underline;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Создание кнопки предупреждения
    function createWarningButton() {
        if (warningButton || warningShown) return;

        warningButton = document.createElement('button');
        warningButton.className = 'axiom-warning-button';
        warningButton.addEventListener('click', showPopup);
        document.body.appendChild(warningButton);
    }

    // Показ всплывающего окна
    function showPopup() {
        if (popupElement) return;

        popupElement = document.createElement('div');
        popupElement.className = 'axiom-popup';
        popupElement.innerHTML = `
            <div class="axiom-popup-header">Согласие о конфиденциальности</div>
            <p class="axiom-popup-content">
                Вся информация, доступная при входе в систему "Axiom", является конфиденциальной и составляет коммерческую тайну ООО "Линк".
            </p>
                        <div class="axiom-checkbox-container">
                <input type="checkbox" id="axiom-agreement-checkbox">
                <label for="axiom-agreement-checkbox" class="axiom-agreement-text">С вышеописанным ознакомлен и согласен</label>
            </div>
            <button id="axiom-enter-button" class="axiom-enter-button">Войти</button>
        `;
        document.body.appendChild(popupElement);

        const checkbox = document.getElementById('axiom-agreement-checkbox');
        const agreementText = document.querySelector('.axiom-agreement-text');
        const enterButton = document.getElementById('axiom-enter-button');

        // Обработка состояния чекбокса
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                agreementText.classList.add('active');
                enterButton.classList.add('visible');
            } else {
                agreementText.classList.remove('active');
                enterButton.classList.remove('visible');
            }
        });

        // Обработка клика по кнопке "Войти"
        enterButton.addEventListener('click', function () {
            if (enterButton.classList.contains('visible')) {
                const loginButton = document.querySelector("body > table > tbody > tr:nth-child(2) > td > div > form > div > div:nth-child(5) > button");
                if (loginButton) {
                    loginButton.click();
                }
                document.body.removeChild(popupElement);
                document.body.removeChild(warningButton);
                popupElement = null;
                warningButton = null;
                warningShown = true;
            }
        });
    }

    // Проверить наличие элементов
    function checkElements() {
        if (warningShown) return;

        // Проверка наличия изображения
        const logo = document.querySelector('img[src*="img/ax/axlogotrans.png"]');

        // Проверка наличия текста
        const textElement = document.querySelector('body > table > tbody > tr:nth-child(3) > td > p');
        const hasText = textElement && textElement.textContent.includes('Система управления полиграфическим производством');

        // Элементы обнаружены
        if (logo && hasText) {
            if (!elementsDetected) {
                elementsDetected = true;
                createWarningButton();
            }
        }
        // Элементы исчезли
        else if (elementsDetected) {
            elementsDetected = false;

            // Запускаем таймер, если его еще нет
            if (!warningTimer && warningButton && !popupElement) {
                warningTimer = setTimeout(() => {
                    if (!document.querySelector('img[src*="img/ax/axlogotrans.png"]') &&
                        !document.querySelector('body > table > tbody > tr:nth-child(3) > td > p')) {

                        if (warningButton && !popupElement) {
                            document.body.removeChild(warningButton);
                            warningButton = null;
                        }
                    }
                    warningTimer = null;
                }, 10000);
            }
        }
    }

    // Инициализация скрипта
    function initScript() {
        injectStyles();

        // Создаем наблюдатель за изменениями DOM
        const observerConfig = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'textContent']
        };

        const observer = new MutationObserver((mutations) => {
            // Проверяем только если страница видима пользователю
            if (document.visibilityState === 'visible') {
                checkElements();
            }
        });

        observer.observe(document.body, observerConfig);

        // Проверяем начальное состояние
        checkElements();

        // Также проверяем при возвращении к странице
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkElements();
            }
        });
    }

    // Запуск скрипта после загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }
}

confidAgree();

function montages() {
    'use strict';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzt9bAtaWRRXyAtq6a1J3eFWjWoBPDWrw9s_0MOWnrfSaGRToux4THTN77BAN9aR0lH/exec';
    const TYPES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IPo3ysUMbU0LOVTHKY3PuLW9DRutL_cduurf0Ztt47o/gviz/tq?tqx=out:csv&sheet=types';
    const TELEGRAM_TOKEN = '7859059996:AAHCCslXp3xvZp1iuSNPv6ApJs9-7MUIG7I';
    const TELEGRAM_CHAT_IDS = ['759432344', '577323348', '385756991', '5242608348'];
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`;
    const TELEGRAM_DELAY = 60000; // 70 секунд

    // Проверяем, где находится текст "Монтажные работы на выезде"
const selectors = [
    "#Top > form > div > div > div > input:nth-child(5)",
    "#Top > form > div > div > div > input.ProductName.form-control",
    "#Top > form > div > div > div > div.form-control",
    'div.formblock[class^="Order"] input.OrderName'
    ];
    const UNIQUE_PREFIX = 'montage-script-v2-';
    let buttonAdded = false;
    let createdButton = null;
    let productIdCache = new Set();
    let isProcessing = false;
    let typesCache = [];
    let files = []; // Для хранения выбранных файлов
    // Кэш для дат
    let dateCache = new Map();
    const DATE_CACHE_TTL = 30000; // 30 сек

    // Инициализация системы отложенной отправки файлов
    initDelayedTelegramSender();
    addIsolatedStyles();

    function initDelayedTelegramSender() {
        // Проверяем наличие отложенных файлов при загрузке страницы
        checkPendingFiles();

        // Периодически проверяем отложенные файлы
        setInterval(checkPendingFiles, 5000);
    }

    function saveFilesForDelayedSending(productId, files) {
        if (files.length === 0) return;

        const fileData = files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        }));

        // Конвертируем файлы в base64 для хранения
        const promises = files.map(file => {
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

            // Сохраняем в sessionStorage
            const key = `telegram_delayed_${productId}_${Date.now()}`;
            try {
                sessionStorage.setItem(key, JSON.stringify(delayedData));

            } catch (e) {
                console.error('Ошибка сохранения файлов в sessionStorage:', e);
            }
        });
    }

    function checkPendingFiles() {
        const now = Date.now();
        const keys = [];

        // Получаем все ключи из sessionStorage
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
                    // Время отправки пришло

                    sendFilesToTelegramFromStorage(data.productId, data.files);
                    sessionStorage.removeItem(key);
                }
            } catch (e) {
                console.error('Ошибка обработки отложенного файла:', e);
                sessionStorage.removeItem(key);
            }
        });
    }

    async function sendFilesToTelegramFromStorage(productId, base64Files) {
        const caption = `Файлы для заказа ${productId}`;

        for (const fileData of base64Files) {
            try {
                // Конвертируем base64 обратно в File
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
                        const result = await resp.json();
                        if (!result.ok) {
                            console.error(`Ошибка отправки в чат ${chatId}:`, result);
                        }
                    } catch (err) {
                        console.error(`Ошибка сети для чата ${chatId}:`, err);
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (err) {
                console.error(`Ошибка отправки файла ${fileData.name}:`, err);
            }
        }

    }

    function addIsolatedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Полный сброс стилей для всех элементов скрипта */
            .${UNIQUE_PREFIX}reset,
            .${UNIQUE_PREFIX}reset *,
            .${UNIQUE_PREFIX}reset *:before,
            .${UNIQUE_PREFIX}reset *:after {
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                font-size: 100% !important;
                font: inherit !important;
                vertical-align: baseline !important;
                box-sizing: border-box !important;
                background: transparent !important;
                color: inherit !important;
                text-decoration: none !important;
                list-style: none !important;
                outline: none !important;
                box-shadow: none !important;
                text-shadow: none !important;
                transition: none !important;
                transform: none !important;
                animation: none !important;
            }

            /* Основная кнопка */
            .${UNIQUE_PREFIX}main-button {
                all: unset !important;
                display: inline-block !important;
                font-size: 12px !important;
                font-weight: 400 !important;
                line-height: 1.5 !important;
                color: #333333 !important;
                background: #ffffff !important;
                background-image: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%) !important;
                border: 1px solid #cccccc !important;
                border-radius: 0 !important;
                padding: 5px 10px !important;
                margin: 0 !important;
                margin-left: -1px !important;
                text-align: center !important;
                white-space: nowrap !important;
                vertical-align: middle !important;
                cursor: pointer !important;
                user-select: none !important;
                position: relative !important;
                float: left !important;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 1px rgba(0, 0, 0, 0.075) !important;
                text-shadow: 0 1px 0 #ffffff !important;
                transition: all 0.3s ease !important;
            }

            .${UNIQUE_PREFIX}main-button:hover:not(:disabled) {
                color: #333333 !important;
                background: #e0e0e0 !important;
                background-image: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%) !important;
                border-color: #adadad !important;
                text-decoration: none !important;
            }

            .${UNIQUE_PREFIX}main-button:active:not(:disabled) {
                color: #333333 !important;
                background: #d0d0d0 !important;
                background-image: linear-gradient(to bottom, #d0d0d0 0%, #e0e0e0 100%) !important;
                box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125) !important;
            }

            .${UNIQUE_PREFIX}main-button:disabled {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
            }

            /* Модальные окна */
            .${UNIQUE_PREFIX}modal-overlay {
                all: unset !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.7) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 999999 !important;
                font-size: 14px !important;
                line-height: 1.4 !important;
                color: #333333 !important;
            }

            .${UNIQUE_PREFIX}modal-content {
                all: unset !important;
                display: flex !important;
                flex-direction: column !important;
                background: #ffffff !important;
                border-radius: 12px !important;
                padding: 24px !important;
                width: 800px !important;
                max-width: 95% !important;
                max-height: 95vh !important;
                overflow-y: auto !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
                color: #333333 !important;
            }

            .${UNIQUE_PREFIX}modal-title {
                all: unset !important;
                display: block !important;
                font-size: 20px !important;
                font-weight: 600 !important;
                color: #333333 !important;
                text-align: center !important;
                margin-bottom: 20px !important;
            }

            .${UNIQUE_PREFIX}modal-body {
                all: unset !important;
                display: flex !important;
                gap: 20px !important;
                margin-bottom: 20px !important;
            }

            .${UNIQUE_PREFIX}modal-column {
                all: unset !important;
                display: block !important;
                flex: 1 !important;
            }

            .${UNIQUE_PREFIX}modal-column-title {
                all: unset !important;
                display: block !important;
                font-size: 16px !important;
                font-weight: 500 !important;
                color: #333333 !important;
                margin-bottom: 16px !important;
                padding-bottom: 8px !important;
                border-bottom: 2px solid #eeeeee !important;
            }

            .${UNIQUE_PREFIX}modal-label {
                all: unset !important;
                display: block !important;
                margin-bottom: 12px !important;
                font-weight: 500 !important;
                color: #333333 !important;
                font-size: 14px !important;
            }

            .${UNIQUE_PREFIX}required-star {
                all: unset !important;
                color: #dc3545 !important;
                font-weight: bold !important;
            }

            .${UNIQUE_PREFIX}modal-input,
            .${UNIQUE_PREFIX}modal-select,
            .${UNIQUE_PREFIX}modal-textarea {
                all: unset !important;
                display: block !important;
                width: 100% !important;
                padding: 10px !important;
                border: 2px solid #cccccc !important;
                border-radius: 6px !important;
                margin-top: 4px !important;
                font-size: 14px !important;
                color: #333333 !important;
                background: #ffffff !important;
                box-sizing: border-box !important;
            }

            .${UNIQUE_PREFIX}modal-input:focus,
            .${UNIQUE_PREFIX}modal-select:focus,
            .${UNIQUE_PREFIX}modal-textarea:focus {
                border-color: #4CAF50 !important;
                outline: none !important;
            }

            .${UNIQUE_PREFIX}modal-textarea {
                min-height: 60px !important;
                resize: vertical !important;
            }

            /* Кастомный инпут */
            .${UNIQUE_PREFIX}custom-input-container {
                all: unset !important;
                display: none !important;
                margin-top: 8px !important;
            }

            .${UNIQUE_PREFIX}custom-input-container.show {
                display: block !important;
            }

            .${UNIQUE_PREFIX}custom-input {
                all: unset !important;
                display: block !important;
                width: 100% !important;
                padding: 10px !important;
                border: 2px solid #4CAF50 !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                color: #333333 !important;
                background: #f9fff9 !important;
                box-sizing: border-box !important;
            }

            .${UNIQUE_PREFIX}custom-input:focus {
                border-color: #2e7d32 !important;
                outline: none !important;
                background: #ffffff !important;
            }

            /* Кнопки модальных окон */
            .${UNIQUE_PREFIX}modal-buttons {
                all: unset !important;
                display: flex !important;
                gap: 10px !important;
                justify-content: flex-end !important;
                margin-top: 16px !important;
            }

            .${UNIQUE_PREFIX}modal-button {
                all: unset !important;
                display: inline-block !important;
                flex: 1 !important;
                padding: 12px !important;
                border: none !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                text-align: center !important;
                color: #ffffff !important;
                transition: background-color 0.3s ease !important;
            }

            .${UNIQUE_PREFIX}modal-button.submit {
                background-color: #cccccc !important;
            }

            .${UNIQUE_PREFIX}modal-button.submit:not(:disabled) {
                background-color: #4CAF50 !important;
            }

            .${UNIQUE_PREFIX}modal-button.submit:not(:disabled):hover {
                background-color: #45a049 !important;
            }

            .${UNIQUE_PREFIX}modal-button.close {
                background-color: #f44336 !important;
            }

            .${UNIQUE_PREFIX}modal-button.close:hover {
                background-color: #da190b !important;
            }

            .${UNIQUE_PREFIX}modal-button:disabled {
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }

            /* Индикатор даты */
            .${UNIQUE_PREFIX}date-indicator {
                all: unset !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-top: 8px !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                text-align: center !important;
                min-height: 20px !important;
                transition: all 0.3s ease !important;
            }

            .${UNIQUE_PREFIX}date-indicator.free {
                background-color: #e8f5e8 !important;
                color: #2e7d32 !important;
                border: 1px solid #a5d6a7 !important;
            }

            .${UNIQUE_PREFIX}date-indicator.partial {
                background-color: #fff3e0 !important;
                color: #f57c00 !important;
                border: 1px solid #ffcc02 !important;
            }

            .${UNIQUE_PREFIX}date-indicator.full {
                background-color: #ffebee !important;
                color: #c62828 !important;
                border: 1px solid #ef5350 !important;
            }

            .${UNIQUE_PREFIX}date-indicator.empty {
                background-color: #f5f5f5 !important;
                color: #757575 !important;
                border: 1px solid #e0e0e0 !important;
            }

            .${UNIQUE_PREFIX}date-indicator.loading {
                background-color: #f0f0f0 !important;
                color: #666666 !important;
                border: 1px solid #dddddd !important;
            }

/* Спиннер */
.${UNIQUE_PREFIX}spinner {
    all: unset !important;
    display: inline-block !important;
    width: 13px !important;
    height: 13px !important;
    border: 2px solid #ffffffff !important;
    border-top: 2px solid #333333 !important;
    border-radius: 50% !important;
    animation: ${UNIQUE_PREFIX}spin 0.5s linear infinite !important; /* Изменено с 1s на 0.5s */
    margin-right: 8px !important;
    vertical-align: middle !important;
}

.${UNIQUE_PREFIX}spinner-white {
    border: 2px solid rgba(187, 206, 214, 0.3) !important;
    border-top: 2px solid #ffffffff !important;
}

@keyframes ${UNIQUE_PREFIX}spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

            /* Блокировщик кликов */
            .${UNIQUE_PREFIX}click-blocker {
                all: unset !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 99998 !important;
                background: transparent !important;
                cursor: wait !important;
                pointer-events: all !important;
            }

            .${UNIQUE_PREFIX}loading-button {
                position: relative !important;
                pointer-events: none !important;
                opacity: 0.8 !important;
            }

            /* Ошибки валидации */
            .${UNIQUE_PREFIX}input-error {
                border-color: #dc3545 !important;
                background-color: #fff5f5 !important;
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
                all: unset !important;
                display: none !important;
                color: #dc3545 !important;
                font-size: 14px !important;
                margin-top: 8px !important;
                padding: 8px 12px !important;
                background-color: #f8d7da !important;
                border: 1px solid #f5c6cb !important;
                border-radius: 4px !important;
            }

            .${UNIQUE_PREFIX}error-message.show {
                display: block !important;
            }

            /* Файловая зона */
            .${UNIQUE_PREFIX}dropzone {
                all: unset !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                height: 120px !important;
                border: 2px dashed #26a69a !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                background-color: #f8f8f8 !important;
                color: #555555 !important;
                transition: all 0.2s !important;
                margin-top: 8px !important;
            }

            .${UNIQUE_PREFIX}dropzone:hover {
                border-color: #00695c !important;
                background-color: #e0f7fa !important;
            }

            .${UNIQUE_PREFIX}dropzone-text {
                all: unset !important;
                font-size: 16px !important;
                color: inherit !important;
            }

            .${UNIQUE_PREFIX}file-input {
                display: none !important;
            }

            .${UNIQUE_PREFIX}file-list {
                all: unset !important;
                display: none !important;
                margin-top: 12px !important;
                max-height: 150px !important;
                overflow-y: auto !important;
                border: 1px solid #eeeeee !important;
                padding: 8px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                background-color: #f9f9f9 !important;
            }

            .${UNIQUE_PREFIX}file-list.show {
                display: block !important;
            }

            .${UNIQUE_PREFIX}file-ul {
                all: unset !important;
                display: block !important;
                list-style: none !important;
            }

            .${UNIQUE_PREFIX}file-item {
                all: unset !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 6px 0 !important;
                color: #555555 !important;
                cursor: pointer !important;
                transition: background-color 0.2s !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            .${UNIQUE_PREFIX}file-item:hover {
                background-color: #f0f0f0 !important;
            }

            .${UNIQUE_PREFIX}file-name {
                all: unset !important;
                flex: 1 !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            .${UNIQUE_PREFIX}file-remove {
                all: unset !important;
                color: #dc3545 !important;
                font-weight: bold !important;
                margin-left: 8px !important;
                cursor: pointer !important;
                opacity: 0.7 !important;
                font-size: 16px !important;
                transition: opacity 0.2s !important;
            }

            .${UNIQUE_PREFIX}file-remove:hover {
                opacity: 1 !important;
            }

            .${UNIQUE_PREFIX}file-count {
                all: unset !important;
                display: block !important;
                font-size: 12px !important;
                color: #777777 !important;
                margin-top: 6px !important;
            }

            /* Превью изображений */
            .${UNIQUE_PREFIX}preview-modal {
                all: unset !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.9) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 100000 !important;
                cursor: zoom-out !important;
            }

            .${UNIQUE_PREFIX}preview-image {
                all: unset !important;
                max-width: 90% !important;
                max-height: 90% !important;
                object-fit: contain !important;
                border: 3px solid #ffffff !important;
                border-radius: 8px !important;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) !important;
            }

            /* Индикатор отложенной отправки */
            .${UNIQUE_PREFIX}delayed-info {
                all: unset !important;
                display: block !important;
                margin-top: 8px !important;
                padding: 8px 12px !important;
                background-color: #e3f2fd !important;
                border: 1px solid #90caf9 !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                color: #1565c0 !important;
                text-align: center !important;
            }

            /* Диалоги */
            .${UNIQUE_PREFIX}dialog-content {
                all: unset !important;
                display: block !important;
                background: #ffffff !important;
                padding: 32px !important;
                border-radius: 16px !important;
                width: 500px !important;
                max-width: 90% !important;
                text-align: center !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
                color: #333333 !important;
            }

            .${UNIQUE_PREFIX}dialog-icon {
                all: unset !important;
                display: block !important;
                font-size: 64px !important;
                margin-bottom: 20px !important;
            }

            .${UNIQUE_PREFIX}dialog-title {
                all: unset !important;
                display: block !important;
                font-size: 24px !important;
                font-weight: 600 !important;
                margin-bottom: 16px !important;
                color: #333333 !important;
            }

            .${UNIQUE_PREFIX}dialog-title.warning {
                color: #ff9800 !important;
            }

            .${UNIQUE_PREFIX}dialog-title.success {
                color: #4CAF50 !important;
            }

            .${UNIQUE_PREFIX}dialog-text {
                all: unset !important;
                display: block !important;
                font-size: 16px !important;
                color: #666666 !important;
                margin-bottom: 24px !important;
                line-height: 1.4 !important;
            }

            .${UNIQUE_PREFIX}dialog-text strong {
                color: #333333 !important;
                font-weight: 600 !important;
            }

            .${UNIQUE_PREFIX}dialog-button {
                all: unset !important;
                display: inline-block !important;
                width: 100% !important;
                padding: 14px !important;
                background: #2196F3 !important;
                color: #ffffff !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                font-weight: 500 !important;
                transition: background-color 0.3s ease !important;
                text-align: center !important;
            }

            .${UNIQUE_PREFIX}dialog-button:hover {
                background: #1976D2 !important;
            }

            /* Поля смены даты */
            .${UNIQUE_PREFIX}change-date-container {
                all: unset !important;
                display: block !important;
                margin-bottom: 24px !important;
            }

            .${UNIQUE_PREFIX}change-date-input {
                all: unset !important;
                display: block !important;
                width: 100% !important;
                padding: 12px !important;
                border: 2px solid #cccccc !important;
                border-radius: 8px !important;
                font-size: 16px !important;
                color: #333333 !important;
                background: #ffffff !important;
                box-sizing: border-box !important;
                text-align: center !important;
                margin-bottom: 8px !important;
            }

            .${UNIQUE_PREFIX}change-date-input:focus {
                border-color: #4CAF50 !important;
                outline: none !important;
            }

            .${UNIQUE_PREFIX}change-date-help {
                all: unset !important;
                display: block !important;
                font-size: 12px !important;
                color: #999999 !important;
                margin-top: 8px !important;
            }

            .${UNIQUE_PREFIX}change-date-buttons {
                all: unset !important;
                display: flex !important;
                gap: 12px !important;
                justify-content: center !important;
            }

            .${UNIQUE_PREFIX}change-date-button {
                all: unset !important;
                display: inline-block !important;
                flex: 1 !important;
                padding: 14px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                text-align: center !important;
                transition: background-color 0.3s ease !important;
                color: #ffffff !important;
            }

            .${UNIQUE_PREFIX}change-date-button.confirm {
                background: #cccccc !important;
            }

            .${UNIQUE_PREFIX}change-date-button.confirm:not(:disabled) {
                background: #4CAF50 !important;
            }

            .${UNIQUE_PREFIX}change-date-button.confirm:not(:disabled):hover {
                background: #45a049 !important;
            }

            .${UNIQUE_PREFIX}change-date-button.cancel {
                background: #f44336 !important;
            }

            .${UNIQUE_PREFIX}change-date-button.cancel:hover {
                background: #da190b !important;
            }

            .${UNIQUE_PREFIX}change-date-button:disabled {
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }

            /* Счетчик для успешного диалога */
            .${UNIQUE_PREFIX}countdown-text {
                all: unset !important;
                display: block !important;
                font-size: 14px !important;
                color: #999999 !important;
            }

            .${UNIQUE_PREFIX}countdown-number {
                all: unset !important;
                font-weight: bold !important;
                color: #4CAF50 !important;
            }
        `;
        document.head.appendChild(style);
    }

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
        dateCache.set(date, {
            data: data,
            timestamp: Date.now()
        });
    }

    function loadTypesFromSheet(callback) {
        if (typesCache.length > 0) return callback(typesCache);
        GM_xmlhttpRequest({
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
                    console.error('Ошибка парсинга CSV:', e);
                    callback([]);
                }
            },
            onerror: (err) => {
                console.error('Ошибка загрузки типов:', err);
                callback([]);
            },
            ontimeout: () => {
                console.error('Таймаут загрузки типов');
                callback([]);
            }
        });
    }

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

function checkAndAddButton() {
    const targetText = "Монтажные работы на выезде";

    const shouldShow = selectors.some(selector => {
        const el = document.querySelector(selector);
        if (!el) return false;

        if (el.tagName === "INPUT") {
            return typeof el.value === "string" && el.value.trim().startsWith(targetText);
        }

        return el.textContent && el.textContent.trim().startsWith(targetText);
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
    topButtons.appendChild(button);
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
            GM_xmlhttpRequest({
                method: 'POST',
                url: SCRIPT_URL,
                data: JSON.stringify({ action: 'getProductIds' }),
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
                onload: function(response) {
                    try {
                        const text = response.responseText.trim();
                        if (text.startsWith('<')) {
                            console.error('HTML вместо JSON:', text.substring(0, 200));
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
                        console.error('Ошибка парсинга JSON:', e);
                        reject(new Error('Неверный ответ'));
                    }
                },
                onerror: (err) => {
                    console.error('Ошибка запроса:', err);
                    reject(new Error('Ошибка сети'));
                },
                ontimeout: () => {
                    console.error('Таймаут запроса');
                    reject(new Error('Таймаут сети'));
                }
            });
        });
    }

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
        ['input', 'change'].forEach(ev =>
                                    dateInput.addEventListener(ev, handleDateChange)
                                   );
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

                // Превью (если изображение)
                li.addEventListener('click', () => {
                    if (file.type.startsWith('image/')) {
                        setupImagePreview(file);
                    }
                });

                // Удаление
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

                            // Сохраняем файлы для отложенной отправки
                            if (files.length > 0) {
                                saveFilesForDelayedSending(productId, files);
                                files = []; // Очищаем локальный массив
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

    function checkProductStatus(productId, callback) {
        GM_xmlhttpRequest({
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
        GM_xmlhttpRequest({
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
        GM_xmlhttpRequest({
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
        GM_xmlhttpRequest({
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
        GM_xmlhttpRequest({
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
            onerror: (err) => {
                onError(`Ошибка сети при отправке в таблицу 2: ${err.statusText || err}`);
            },
            ontimeout: () => {
                onError("Таймаут запроса при отправке дополнительных данных");
            }
        });
    }

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
            GM_xmlhttpRequest({
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

    const observer = new MutationObserver(checkAndAddButton);
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(checkAndAddButton, 500);
}

montages();

    function hideNewFiles () {
    'use strict';

    const HISTORY_SELECTOR = '#History';
    const TIME_FILES_SELECTOR = 'tr.TimeFilesInfo';

    let observer = null;           // За изменениями в #History
    let mainObserver = null;       // За появлением/исчезновением #History
    let pollingInterval = null;    // Периодическая проверка
    let recheckInterval = null;    // Доп. проверка видимости tr.TimeFilesInfo
    let isMonitoring = false;

    // Основная проверка: нужно ли скрывать?
    function checkAndHide() {
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (!historyEl) return;

        const timeFilesRow = document.querySelector(TIME_FILES_SELECTOR);
        if (!timeFilesRow) return;

        // Проверяем наличие дат у двух операций
        const rows = historyEl.querySelectorAll('tbody tr');
        let prepressCheck = false;
        let prepressMount = false;

        for (const row of rows) {
            const opCell = row.querySelector('td');
            if (!opCell) continue;

            const opText = opCell.textContent.trim();
            const nobr = row.querySelector('td.right nobr');
            const dateText = nobr ? nobr.textContent.trim() : '';

            if (opText === 'Препресс проверка') {
                prepressCheck = !!dateText;
            }
            if (opText === 'Препресс монтаж') {
                prepressMount = !!dateText;
            }
        }

        // Если оба этапа завершены — скрываем
        if (prepressCheck && prepressMount) {
            if (timeFilesRow.style.display !== 'none') {
                timeFilesRow.style.display = 'none';
            }
        } else {
            // Если условия не выполнены — возвращаем
            if (timeFilesRow.style.display === 'none') {
                timeFilesRow.style.display = '';
            }
        }
    }

    // Запуск мониторинга при появлении #History
    function startMonitoring() {
        if (isMonitoring) return;
        isMonitoring = true;

        // Проверяем сразу
        checkAndHide();

        // Наблюдаем за изменениями в #History
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (historyEl && !observer) {
            observer = new MutationObserver(checkAndHide);
            observer.observe(historyEl, { childList: true, subtree: true });
        }

        // Запускаем дополнительную проверку каждые 500 мс
        // Это нужно, если tr.TimeFilesInfo был пересоздан или стили сброшены
        if (!recheckInterval) {
            recheckInterval = setInterval(checkAndHide, 100);
        }
    }

    // Остановка мониторинга
    function stopMonitoring() {
        if (!isMonitoring) return;

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        // Восстанавливаем элемент, если он был скрыт
        const timeFilesRow = document.querySelector(TIME_FILES_SELECTOR);
        if (timeFilesRow && timeFilesRow.style.display === 'none') {
            timeFilesRow.style.display = '';
        }

        isMonitoring = false;
    }

    // Проверка наличия #History
    function detectAndHandleHistory() {
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (historyEl && !isMonitoring) {
            startMonitoring();
        } else if (!historyEl && isMonitoring) {
            stopMonitoring();
        }
    }

    // Поллинг для обнаружения #History
    function startPolling() {
        pollingInterval = setInterval(detectAndHandleHistory, 500);
    }

    // Основной observer за DOM
    mainObserver = new MutationObserver(() => {
        setTimeout(detectAndHandleHistory, 100);
    });

    mainObserver.observe(document.body, { childList: true, subtree: true });

    // Первоначальная проверка
    detectAndHandleHistory();

    // Если не нашли — запускаем поллинг
    if (!isMonitoring) {
        startPolling();
    }

    // Очистка при завершении
    window.addEventListener('beforeunload', () => {
        if (mainObserver) mainObserver.disconnect();
        if (pollingInterval) clearInterval(pollingInterval);
        if (recheckInterval) clearInterval(recheckInterval);
        stopMonitoring();
    });
};

// hideNewFiles ();

function lockManager() {
  'use strict';

  // Селекторы для блокировки элементов
  const selector1 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > div";
  const contractInputSelector = "#Top > form > div > div > div > input.ProductName.form-control";
  const selector2 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div";
  const selector3 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(3) > tr:nth-child(4) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > div";

  // Другие селекторы
  const buttonToRemove = "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)";
  const timeFilesRow = "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo";
//Сломаный селектор на старые финстопы. Для возврата меняем пэсхема 4 на пэйсхема 1
  const paySchemaImage = "#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img[src*='payschema-4.png']";
  const hiddenButtonInRow = "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button";
  const triggerButtonSelector = "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button"; // "Запущен в работу"
  const rightContainerSelector = "#Summary > table > tbody > tr > td:nth-child(1) > div.right";
  const regButtonSelector = "#RegButton";
  const hideConditionSelector = "#History > table:nth-child(1) > tbody > tr:nth-child(4) > td.right.bold";

  let isChecking = false;

  // Функция блокировки элемента
  function blockElement(element) {
    if (!element || element.blocked) return;
    element.blocked = true;
    element.style.pointerEvents = 'none';
    element.style.userSelect = 'none';
    element.style.opacity = '0.6';
    const children = element.querySelectorAll('*');
    children.forEach(child => {
      child.style.pointerEvents = 'none';
      child.style.userSelect = 'none';
    });
  }

  // Функция разблокировки элемента
  function unblockElement(element) {
    if (!element || !element.blocked) return;
    element.blocked = false;
    element.style.pointerEvents = '';
    element.style.userSelect = '';
    element.style.opacity = '';
    const children = element.querySelectorAll('*');
    children.forEach(child => {
      child.style.pointerEvents = '';
      child.style.userSelect = '';
    });
  }

  // Основная функция проверки и блокировки
  function checkAndBlockElements() {
    if (isChecking) return;
    isChecking = true;
    try {

      // Проверяем наличие "Договор №" в поле ввода
      const contractInput = document.querySelector(contractInputSelector);
      const hasContractNumber = contractInput && contractInput.value.includes("Договор №");

      // Получаем целевые элементы
      const target1 = document.querySelector(selector1);
      const target2 = document.querySelector(selector2);
      const target3 = document.querySelector(selector3);

      if (hasContractNumber) {
        // === Если есть "Договор №" — блокируем ВСЕ три селектора, игнорируя статус ===
        if (target1 && !target1.blocked) blockElement(target1);
        if (target2 && !target2.blocked) blockElement(target2);
        if (target3 && !target3.blocked) blockElement(target3);
      } else {
        // === Если "Договор №" отсутствует — применяем логику со статусом для selector1 ===
        const statusImage = document.querySelector("#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img");
        const isCalcStatus = statusImage && statusImage.src && statusImage.src.includes('status-calc.png');

        if (target1) {
          if (!isCalcStatus) {
            if (!target1.blocked) blockElement(target1);
          } else {
            if (target1.blocked) unblockElement(target1);
          }
        }

        // selector2 и selector3 разблокируются, если нет "Договор №"
        if (target2 && target2.blocked) unblockElement(target2);
        if (target3 && target3.blocked) unblockElement(target3);
      }

      // Удаляем лишнюю кнопку
      const btnToRemove = document.querySelector(buttonToRemove);
      if (btnToRemove) {
        btnToRemove.remove();
      }

      // === Скрытие строки по заданному селектору ===
      const rowToHide = document.querySelector(
        "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(5)"
      );
      if (rowToHide) {
        rowToHide.style.display = 'none';
      }

      // === Скрытие строки с td.BuhComment ===
      const buhCommentRow = document.querySelector("td.BuhComment")?.closest("tr");
      if (buhCommentRow) {
        buhCommentRow.style.display = 'none';
      }

      // Логика работы с PaySchemaIcon и фин.стопом
      const image = document.querySelector(paySchemaImage);
      const container = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody");

     if (image) {
         const oldWorkBtn = document.getElementById('workWithFilesBtn');
     if (oldWorkBtn) oldWorkBtn.remove();

     if (!document.getElementById('financialStopBtn')) {
         const financialStopBtn = document.createElement('tr');
        financialStopBtn.id = 'financialStopBtn';
         financialStopBtn.innerHTML = `<td colspan="2">
              <button style="
                  -webkit-text-size-adjust: 100%;
                   -webkit-tap-highlight-color: rgba(0,0,0,0);
                   font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                   line-height: 1.42857143;
                  font-size: 14px;
                   border-spacing: 0;
                   border-collapse: collapse;
                   box-sizing: border-box;
                   border: solid 1px #a90000;
                   background-color: #ff0000;
                   color: #ffffff;
                   text-align: center;
                   padding: 6px 12px;
                   margin: 10px 0;
                   width: 100%;
                   display: block;
                   cursor: pointer;
                   transition: all 0.2s ease;
              ">Фин.стоп</button>
          </td>`;
           container.appendChild(financialStopBtn);
         }
      } else {
         const oldFinBtn = document.getElementById('financialStopBtn');
        if (oldFinBtn) oldFinBtn.remove();

        const regButton = document.querySelector(regButtonSelector);
        const rightDiv = document.querySelector(rightContainerSelector);
        const hideConditionEl = document.querySelector(hideConditionSelector);
        const hideCondition = hideConditionEl && hideConditionEl.querySelector('nobr')?.textContent.trim() !== '';
        const shouldShowWorkButton = regButton && !hideCondition;

        if (shouldShowWorkButton && !document.getElementById('workWithFilesBtn') && rightDiv) {
          const workBtn = document.createElement('button');
          workBtn.id = 'workWithFilesBtn';
          workBtn.textContent = 'Файлы получены';
          Object.assign(workBtn.style, {
            '-webkit-text-size-adjust': '100%',
            '-webkit-tap-highlight-color': 'rgba(0,0,0,0)',
            'box-sizing': 'border-box',
            'font': 'inherit',
            'text-transform': 'none',
            'font-family': 'inherit',
            'display': 'inline-block',
            'font-weight': '400',
            'text-align': 'center',
            'white-space': 'nowrap',
            'vertical-align': 'middle',
            'touch-action': 'manipulation',
            'cursor': 'pointer',
            'user-select': 'none',
            'border': '1px solid transparent',
            'color': '#fff',
            'background-color': '#5cb85c',
            'padding': '10px 16px',
            'font-size': '18px',
            'line-height': '1.3333333',
            'border-radius': '6px',
            'text-shadow': '0 -1px 0 rgba(0,0,0,.2)',
            'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075)',
            'background-image': 'linear-gradient(to bottom,#5cb85c 0,#419641 100%)',
            'background-repeat': 'repeat-x',
            'border-color': '#3e8f3e',
            'position': 'relative',
            'margin-left': '10px'
          });

          workBtn.addEventListener('click', () => {
            const hiddenBtn = document.querySelector(hiddenButtonInRow);
            if (hiddenBtn) hiddenBtn.click();
          });

          const existingButton = document.querySelector(triggerButtonSelector);
          if (existingButton) {
            existingButton.parentNode.insertBefore(workBtn, existingButton.nextSibling);
          } else if (rightDiv) {
            rightDiv.appendChild(workBtn);
          }
        }
      }

      // Логика отображения/скрытия TimeFilesInfo
      const rowToShow = document.querySelector(timeFilesRow);
      if (rowToShow) {
        const hasWorkButton = !!document.querySelector("#workWithFilesBtn");
        const paySchemaExists = !!document.querySelector(paySchemaImage);
        const historyConditionEl = document.querySelector("#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold");
        const hasHistoryText = historyConditionEl && historyConditionEl.querySelector('nobr')?.textContent.trim() !== '';
        rowToShow.style.display = hasWorkButton || (!paySchemaExists && hasHistoryText) ? '' : 'none';
      }

    } catch (e) {
      console.warn('Ошибка в checkAndBlockElements:', e);
    } finally {
      isChecking = false;
    }
  }

  // Наблюдатель за изменениями DOM
  const observer = new MutationObserver(checkAndBlockElements);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Первичная проверка
  checkAndBlockElements();
}

// Запуск менеджера
lockManager();


  "use strict";
  let blurOverlay = document.createElement("div");
  blurOverlay.id = "Spinner";
  blurOverlay.style.position = "fixed";
  blurOverlay.style.top = "0";
  blurOverlay.style.left = "0";
  blurOverlay.style.width = "100%";
  blurOverlay.style.height = "100%";
  blurOverlay.style.backgroundColor = "rgba(2, 2, 2, 0.8)";
  blurOverlay.style.backdropFilter = "blur(5px)";
  blurOverlay.style.zIndex = "9998";
  let blur = false;


  const loaderContainer = document.createElement("div");
  loaderContainer.style.position = "fixed";
  loaderContainer.style.top = "50%";
  loaderContainer.style.color = "#fff";
  loaderContainer.style.textAlign = "center";
  loaderContainer.style.textTransform = "uppercase";
  loaderContainer.style.fontWeight = "700";
  loaderContainer.style.left = "50%";
  loaderContainer.style.transform = "translate(-50%, -50%)";
  loaderContainer.style.padding = "15px 40px";
  loaderContainer.style.zIndex = "10000";
  loaderContainer.style.width = "500px";
  loaderContainer.style.height = "500px";

    let messageHTML = `<img src="https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/animlogo.gif" width="270px" height="270px"/> <br/> <br/> <h3>Готовим калькулятор...</h3>`;

  loaderContainer.innerHTML = messageHTML;

  // Переменная для хранения начального значения даты
  let initialDateReadyValue = null;
  let checkButtonClicked = false; // Переменная для отслеживания нажатия кнопки "Проверить"
  let choosenCalcId = "";
  let closeBtnId = "";
  // всекм привет
  // Функция для проверки текста "Номенклатура" и получения значения "DateReady"

  let choosenCalcParent = null;
  let choosenCalc = null;
  setInterval(() => {
    choosenCalcParent = document.querySelector("#Doc > div.TemplateChooser");

  const choosenCalcParent1 = document.querySelector("#Doc > div.calc_head");
  const raschCifr = document.querySelector('#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(1)');
  const skidki = document.querySelector('#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(2)');
      if (choosenCalcParent1){
        raschCifr.style.display = "none"
      }
     if(skidki){
        skidki.style.display = "none"
      }

    let resultCals = document.getElementById("result");

    if (resultCals) {
      let editBtn = resultCals.querySelectorAll(
        "div > table > tbody > tr:nth-child(1) > td.control > div > button:nth-child(2)"
      );
      for (let k = 0; k < editBtn.length; k++) {
        editBtn[k].addEventListener("click", function () {
          choosenCalc = null;
          document.body.appendChild(blurOverlay);
          document.body.appendChild(loaderContainer);

blur = true;
if (blur) {
  setTimeout(() => {
    blurOverlay?.remove();
    loaderContainer?.remove();
    blur = false;
  }, 1000);
}


          // Получаем индекс элемента, на который нажали

          // Выводим индекс в консоль
          setTimeout(() => {
            choosenCalc = null;
            choosenCalcId = null;
            closeBtnId = null;
            const manyPages = document.getElementById("DoubleBind");
            const listImg = document.querySelector(
              'img[src="img/calc/sheet.png"]'
            );
            const blocknote = document.querySelector(
              'img[src="img/calc/blocknot_blok.png"]'
            );
            const sostav = document.getElementById("CifraLayoutType");
            const convert = document.querySelector(
              'img[src="img/calc/konvert.png"]'
            );
            if (listImg && !sostav) {


              closeBtnId =
                "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalcId =
                "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              choosenCalc = 2;
            } else if (sostav) {
              closeBtnId =
                "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalcId =
                "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              choosenCalc = 0;
            } else if (manyPages) {
              choosenCalcId =
                "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              closeBtnId =
                "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalc = 1;
            } else if (convert) {
              closeBtnId = null;
              choosenCalcId = null;

            } else {
              closeBtnId = null;
              choosenCalcId = null;
            }
          }, 500);
        });
      }
    }


    if (choosenCalcParent) {
      for (let i = 0; i < 9; i++) {
        choosenCalcParent.children[i].addEventListener("click", function () {
          document.body.appendChild(blurOverlay);
          document.body.appendChild(loaderContainer);
          blur = true;

          if (blur) {
            setTimeout(() => {
              document.body.removeChild(blurOverlay);
              document.body.removeChild(loaderContainer);

              blur = false;
            }, 1500);
          }
          choosenCalc = null;
          choosenCalcId = null;
          closeBtnId = null;
          // Получаем индекс элемента, на который нажали
          choosenCalc = parseInt(i);
          const manyPages = document.getElementById("DoubleBind");
          const listImg = document.querySelector(
            'img[src="img/calc/sheet.png"]'
          );
          const blocknote = document.querySelector(
            'img[src="img/calc/blocknot_blok.png"]'
          );
          const sostav = document.getElementById("CifraLayoutType");
          // Выводим индекс в консоль

          if (choosenCalc === 0) {
            closeBtnId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            choosenCalc = 0;
          } else if (choosenCalc === 1) {
            choosenCalcId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            closeBtnId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalc = 1;
          } else if (choosenCalc === 2) {


            closeBtnId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            choosenCalc = 2;
          } else if (
            choosenCalc === 3 ||
            choosenCalc === 4 ||
            choosenCalc === 5 ||
            choosenCalc === 6 ||
            choosenCalc === 8
          ) {
            closeBtnId = null;
            choosenCalcId = null;
          } else if (choosenCalc === 7) {
            closeBtnId = null;
            choosenCalcId = null;

          }
        });
      }
    }

    const new4Style = document.createElement("style");
    new4Style.type = "text/css";
    let new4Styles = `${closeBtnId} {margin-left: 500px;}`;
    new4Style.appendChild(document.createTextNode(new4Styles));
    document.head.appendChild(new4Style);
  }, 100);



  // Создание кнопки для проверки заказа
  const orderCheckButton = document.createElement("button");
  orderCheckButton.style.display = "none";
  orderCheckButton.innerHTML = "Рассчитать";
  orderCheckButton.style.width = "130px";
  orderCheckButton.style.height = "45px";
  orderCheckButton.style.borderRadius = "5px";
  orderCheckButton.style.backgroundImage =
    "linear-gradient(to bottom, #5BB75B, #429742)";
  orderCheckButton.style.color = "white";
  orderCheckButton.style.fontSize = "18px";
  orderCheckButton.style.cursor = "pointer";
  orderCheckButton.style.position = "fixed"; // Фиксированное позиционирование
  orderCheckButton.style.bottom = "25px"; // Отступ от нижнего края
  orderCheckButton.style.left = "25px"; // Отступ от левого края
  orderCheckButton.style.zIndex = "9998";

  // Убираем обводку
  orderCheckButton.style.border = "none"; // Нет обводки
  orderCheckButton.style.outline = "none"; // Нет фокусной обводки

  document.body.appendChild(orderCheckButton); // Добавляем кнопку на страницу

  // Настройка стилей фокуса (для лучшего UX)
  orderCheckButton.addEventListener("focus", () => {
    orderCheckButton.style.outline = "none"; // Убираем обводку при фокусе
  });

  orderCheckButton.addEventListener("mousedown", () => {
    orderCheckButton.style.border = "2px solid black"; // Устанавливаем черную рамку при нажатии
  });

  orderCheckButton.addEventListener("mouseup", () => {
    orderCheckButton.style.border = "none"; // Убираем рамку при отпускании
  });

  orderCheckButton.addEventListener("blur", () => {
    orderCheckButton.style.border = "none"; // Убираем рамку при уходе из фокуса
  });

  // Обработчик клика для кнопки проверки заказа
  orderCheckButton.addEventListener("click", function () {
    checkButtonClicked = true; // Устанавливаем флаг нажатия кнопки
    let messages = [];

    if (choosenCalc === 0 || choosenCalc === 2) {
      let ordersArray = [];
      let prevArray = [];
      const currentArray = JSON.stringify(ordersArray);
      if (currentArray !== prevArray) {
        ordersArray = [];
        const children = document.getElementById("Orders").children;
        for (let i = 0; i < children.length; i++) {
          // Проверка наличия атрибута id у дочернего элемента
          if (children[i].id) {
            ordersArray.push(children[i].id);
          }
        }
      }

      // Проверка значения в input id="ProdName" и "Tirazh"
      const prodName = document.getElementById("ProdName")
        ? document.getElementById("ProdName").value
        : "";
      // const tirazh = document.getElementById('Tirazh') ? parseInt(document.getElementById('Tirazh').value) : 0;
      let tirazhAll = document.getElementById("ProductTirazh");
      if (
        (/робн/.test(prodName) || /браз/.test(prodName)) &&
        tirazhAll.value == 1
      ) {
        messages.push("Пробники оформляем в количестве двух штук!");

        tirazhAll.style.backgroundColor = "#FA8072";
      }

      //   if (tirazh === 0) {
      //     messages.push('Укажите количество в тираже!');
      // }

      // Проверяем элементы в заказах Order0 до Order7
      let productPostpress = document.querySelector("#ProductPostpress");
      let productZKList = productPostpress
        .querySelector("#PostpressList")
        .getElementsByTagName("tr");
      let productZKtr = null;
      let productZKValue = 0;
      if (productZKList.length >= 1) {

        for (let i = 0; i < productZKList.length; i++) {
          if (productZKList[i].innerText.includes("zk")) {
            productZKtr = i;
            productZKValue =
              productZKList[productZKtr].querySelector("#Quantity").value;

          }

          if (productZKValue == 1) {
            let sms2 = productZKList[i].children[0];


            sms2.style.color = "red";
            messages.push(
              `В операции "${sms2.innerText}", Количество не должно быть 1, или подойдите к Щёкину Александру`
            );
            productZKValue = 0;
          }
        }
      }

      for (let i = 0; i < ordersArray.length; i++) {

        const orderElem = document.getElementById(ordersArray[i]);

        let postpressList2 = orderElem.querySelector("#PostpressList");
        let rows = postpressList2.getElementsByTagName("tr");
        let foundSkvoznaya = false;
        let foundOlod = false;
        let foundLicoMgi = false;
        let foundLicoMgi1 = false;
        let foundLicoMgi2 = false;
        let foundOborotMgi1 = false;
        let found1Plus1 = false;
        let foundPerf = false;
        let foundZk = false;
        let lamPlot = false;
        let kontRezka = false;
        let kashirSam = false;
        let lamSoft = false;
        let vyrTigel = false;
        let plotLam = false;
        let folgRegular = false;

        for (let row of rows) {
          let cells = row.getElementsByTagName("td");
          let name = cells[0] ? cells[0].innerText : "";

          foundSkvoznaya = foundSkvoznaya || name.includes("СКВОЗНАЯ");
          foundOlod = foundOlod || name.includes("олод");
          foundLicoMgi = foundLicoMgi || name.includes("ЛИЦО МГИ");
          foundLicoMgi1 = foundLicoMgi1 || name.includes("ЦО МГИ1 Ла");
          foundLicoMgi2 = foundLicoMgi2 || name.includes("ЦО МГИ1 Фо");
          foundOborotMgi1 = foundOborotMgi1 || name.includes("ОБОРОТ МГИ1");
          found1Plus1 = found1Plus1 || name.includes("(1+1)");
          foundPerf = foundPerf || name.includes("ерфорация");
          foundZk = foundZk || name.includes("zk");
          lamPlot = lamPlot || name.includes("минация");
          kashirSam = kashirSam || name.includes("ашировка");
          lamSoft = lamSoft || name.includes("софттач");
          vyrTigel = vyrTigel || name.includes("тигеле");
          plotLam = plotLam || name.includes("пакетная");
          kontRezka = kontRezka || name.includes("онтурная");
          folgRegular = folgRegular || name.includes("ольгирование");
        }

        // Проверка условий 3 мм сквозная
        let trimSize = null;
        const trimSizeColor = orderElem.querySelector("#TrimSize");
        trimSize = orderElem.querySelector("#TrimSize")
          ? parseInt(orderElem.querySelector("#TrimSize").value)
          : null;
        const tirazhColor = orderElem.querySelector("#Tirazh");
        const tirazh = orderElem.querySelector("#Tirazh")
          ? parseInt(orderElem.querySelector("#Tirazh").value)
          : 0;

        if (tirazh === 0) {
          messages.push(`Укажите количество в тираже в ${getOrderName(i)}!`);
          tirazhColor.style.backgroundColor = "#FA8072";
        }
        if (foundSkvoznaya) {
          if (trimSize !== 3) {
            messages.push(
              `На сквозную резку в ${getOrderName(i)} вылет ставим 3мм!`
            );
            trimSizeColor.style.backgroundColor = "#FA8072";
          }
        }

        // Проверка условий для карточек и ламинации
        const cifraLayoutType = document.getElementById("CifraLayoutType");
        if (foundOlod && cifraLayoutType && cifraLayoutType.value !== "2") {
          messages.push(
            `СМОТРИ СЮДА Карты нужно раскладывать каждый вид на отдельный лист в ${getOrderName(
              i
            )}`
          );
          cifraLayoutType.style.backgroundColor = "#FA8072";
        }
        // Проверка софттач+мги
        if (foundLicoMgi && !lamSoft) {

          messages.push(
            `Вы забыли софттач ламинацию для МГИ в ${getOrderName(
              i
            )}! Если Вы действительно собираетесь делать без ламинации - обратитесь к Александру Щ.`
          );
        }
        // Проверка на ЛИЦО МГИ1+ЛИЦО МГИ1
        if (foundLicoMgi1 && foundLicoMgi2) {
          messages.push(
            `Нужно указать "ЛИЦО МГИ1 и ЛИЦО МГИ2 в ${getOrderName(i)}!`
          );
        }
        // Проверка на пустой оборот мги
        if (foundOborotMgi1 && !foundLicoMgi) {
          messages.push(
            `ОБОРОТ МГИ выбран неверно в ${getOrderName(
              i
            )}! Вместо него поставьте "ЛИЦО МГИ"!`
          );
        }
        // Проверка на термопереплет и двухсторонюю ламинацию
        if (found1Plus1) {
          const termopereplet = document.body.innerText.includes(
            "Термопереплет (кбс), толщина блока от 3 мм"
          );
          if (termopereplet) {
            messages.push(
              `Двухстороняя ламинация недоступна при термопереплете в ${getOrderName(
                i
              )}! Выберите одностороннюю!`
            );
          }
        }

        // Проверка связки тигель + отверстие
        if (vyrTigel) {
          const sverlOtverst = orderElem.innerText.includes("Отверстие");
          if (sverlOtverst) {
            messages.push(
              `Сверление отверстий после вырубки в ${getOrderName(
                i
              )} невозможно после вырубки на тигеле! Если сверление отверстий необходимо и возможно - обратитесь за помощью к Александру Щ.`
            );
          }
        }

        // Проверка связки пакетная ламинация + биговка
        if (plotLam) {
          const bigovka = orderElem.innerText.includes("Биговка");
          if (bigovka) {
            messages.push(
              `Биговку в ${getOrderName(
                i
              )} можно выполнить только по тонкой ламинации!`
            );
          }
        }

        // Проверка связки фольгирование + софттач
        if (folgRegular && !lamSoft) {
          messages.push(
            `В ${getOrderName(
              i
            )} делается фольгирование. Оно ложится только на софттач ламинацию!`
          );
        }
        // Проверка на количество листов для скрепки
        let sumDensity = 0;
        let paperSum = 0;
        let paperType2 = document.querySelectorAll(
          "#PaperType_chosen .chosen-single span"
        );
        let productPostpress = document.querySelector("#ProductPostpress");
        let productZKList = productPostpress
          .querySelector("#PostpressList")
          .getElementsByTagName("tr");
        if (productZKList.length >= 0) {
          for (let j = 0; j < productZKList.length; j++) {
            if (productZKList[j].innerText.includes("Скрепка")) {

              if (paperType2.length === 1) {
                let paperName = paperType2[0].innerText;
                let density = Number(paperName.split(",").pop());
                sumDensity += density;
              } else {
                let paperName = paperType2[1].innerText;
                let density = Number(paperName.split(",").pop());
                sumDensity += density;
              }
            }
          }
        }
        //Проверка на люверс
        function isInteger(num) {
          return num % 1 === 0;
        }
        const postpressList1 = document.querySelector("#PostpressList");
        const ltrs = postpressList1.querySelectorAll("tr");


        ltrs.forEach((elem) => {
          if (elem.innerText.includes("Люверс") === true) {



            let lQuantity = elem.querySelector("#Quantity").value;


            if (!isInteger(lQuantity)) {

              messages.push(
                `В ${getOrderName(
                  i
                )} люверс указан неверно! Перенесите люверс в нижнюю постпечать!`
              );
            } else {

            }
          }
        });

        const trs = productPostpress.querySelectorAll("tr");
        for (let i = 0; i < trs.length; i++) {
          const tdText = trs[i].innerText.toLowerCase();
          if (tdText.includes("листоподбор")) {
            const tds = trs[i].querySelectorAll("td");
            paperSum = Number(tds[1].innerHTML);
            break; // выходим из цикла после нахождения первого совпадения
          }
        }
        if (sumDensity * paperSum > 2400) {
          messages.push(
            `Слишком толстый блок для скрепки! Обратитесь к технологу!`
          );
        }

        // Проверка на операции ZK
        let postpressList = orderElem.querySelector("#PostpressList");
        let ZKList = postpressList.getElementsByTagName("tr");
        let ZKtr = null;
        let ZKValue = 0;

        if (ZKList.length >= 2) {
          for (let i = 0; i < ZKList.length; i++) {
            if (ZKList[i].innerText.includes("zk")) {
              ZKtr = i;
              ZKValue = ZKList[ZKtr].querySelector("#Quantity").value;

              if (ZKValue == 1) {
                let sms = ZKList[0].children[0];
                sms.style.color = "red";
                messages.push(
                  `В операции "${sms.innerText}", Количество не должно быть 1, или подойдите к Щёкину Александру`
                );

                ZKValue = 0;
              }
            }
          }
        }

        // Проверка связки ламинация+контурная резка
        if (lamPlot) {
          const konturRezka = orderElem.innerText.includes(
            "резка наклеек ПРОСТАЯ - ПОЛИГРАФИЯ"
          );
          if (konturRezka) {
            messages.push(
              `Контурная резка с ламинацией в ${getOrderName(
                i
              )}! Выберите операцию "Плоттерная (контурная) резка ламинированных наклеек ПРОСТАЯ - ПОЛИГРАФИЯ"!`
            );
          }
        }

        // Проверка на использование бумаги с надсечками
        if (foundLicoMgi1) {
          const paperType = orderElem.querySelector(
            "#PaperType_chosen .chosen-single span"
          );
          if (paperType && paperType.innerText.includes("с надсечками")) {
            messages.push(
              `На MGI используется бумага БЕЗ надсечек в ${getOrderName(i)}!`
            );
          }
        }
        // Проверка на надсечку с кашировкой
        if (kashirSam) {
          const paperType = orderElem.querySelector(
            "#PaperType_chosen .chosen-single span"
          );
          if (paperType && paperType.innerText.includes("с надсечками")) {
            messages.push(
              `Для кашировки используется бумага без надсечки в ${getOrderName(
                i
              )}!`
            );
          }
        }

        // Проверка на надсечку с контурной резкй
        if (kontRezka) {
          const paperType = orderElem.querySelector(
            "#PaperType_chosen .chosen-single span"
          );
          if (paperType && paperType.innerText.includes("с надсечками")) {
            messages.push(
              `Для контурной резки бумага без надсечки в ${getOrderName(i)}!`
            );
          }
        }
        // Проверка на контурную резку и материал
        if (kontRezka) {
          const paperType = orderElem.querySelector(
            "#PaperType_chosen .chosen-single span"
          );
          if (paperType && !paperType.innerText.includes("амокле")) {
            messages.push(
              `В ${getOrderName(
                i
              )} используется неподходящий материал для контурной резки! Укажите сквозную резку!`
            );
          }
        }

        //  Проверка условий 0 мм
        let useMargins = orderElem.querySelector("#UseMargins");
        const paperType1 = orderElem.querySelector(
          "#PaperType_chosen .chosen-single span"
        );
        if (
          paperType1 &&
          paperType1.innerText.includes("СНЕГУРОЧКА") &&
          trimSize !== 0
        ) {
          messages.push(
            `В ${getOrderName(
              i
            )} указана офстека в пачках! Не забудьте указать вылет ноль!`
          );
        } else if (
          paperType1 &&
          paperType1.innerText.includes("СНЕГУРОЧКА") &&
          !useMargins.checked
        ) {
          messages.push(
            `в ${getOrderName(
              i
            )} Необходимо поставить галочку напротив "Использовать поля (цифр. печ.)"!`
          );
        }
        // Проверка на бумагу
        if (paperType1.innerText.includes("-- Другая --")) {
          messages.push(`Не указана Бумага`);
        }
      }
    } else if (choosenCalc === 1) {
      let Tirazh = document.getElementById("Tirazh");
      if (Tirazh.value == 0) {
        messages.push("Укажите тираж");
        Tirazh.style.backgroundColor = "#FA8072";
        window.scrollTo({
          top: Tirazh.offsetTop,
          behavior: "smooth",
        });
      }

      let ordersArray = [];
      let prevArray = [];
      const currentArray = JSON.stringify(ordersArray);
      if (currentArray !== prevArray) {
        let oblozhkaCheck = document.getElementById("HasCover");
        if (oblozhkaCheck.checked) {
          ordersArray = ["Order0"];
        }
        const children = document.getElementById("Blocks").children;
        for (let i = 0; i < children.length; i++) {
          // Проверка наличия атрибута id у дочернего элемента
          if (children[i].id) {
            ordersArray.push(children[i].id);
          }
        }
      }


      for (let i = 0; i < ordersArray.length; i++) {
        const orderElem = document.getElementById(ordersArray[i]);
        let postpressList3 = orderElem.querySelector("#PostpressList");



        let rows = postpressList3.getElementsByTagName("tr");
        let backLamination = orderElem.querySelector("#pantoneback");


        let foundSkvoznaya = false;
        let foundOlod = false;
        let foundLicoMgi = false;
        let foundLicoMgi1 = false;
        let foundLicoMgi2 = false;
        let foundOborotMgi1 = false;
        let found1Plus1 = false;
        let foundPerf = false;
        let foundZk = false;
        let lamPlot = false;
        let kontRezka = false;
        let kashirSam = false;
        let lamSoft = false;
        let vyrTigel = false;
        let plotLam = false;
        let folgRegular = false;

        for (let row of rows) {
          let cells = row.getElementsByTagName("td");
          let name = cells[0] ? cells[0].innerText : "";

          foundSkvoznaya = foundSkvoznaya || name.includes("СКВОЗНАЯ");
          foundOlod = foundOlod || name.includes("олод");
          foundLicoMgi = foundLicoMgi || name.includes("ЛИЦО МГИ");
          foundLicoMgi1 = foundLicoMgi1 || name.includes("ЦО МГИ1 Ла");
          foundLicoMgi2 = foundLicoMgi2 || name.includes("ЦО МГИ1 Фо");
          foundOborotMgi1 = foundOborotMgi1 || name.includes("ОБОРОТ МГИ1");
          found1Plus1 = found1Plus1 || name.includes("(1+1)");
          foundPerf = foundPerf || name.includes("ерфорация");
          foundZk = foundZk || name.includes("zk");
          lamPlot = lamPlot || name.includes("минация");
          kashirSam = kashirSam || name.includes("ашировка");
          lamSoft = lamSoft || name.includes("софттач");
          vyrTigel = vyrTigel || name.includes("тигеле");
          plotLam = plotLam || name.includes("пакетная");
          kontRezka = kontRezka || name.includes("онтурная");
          folgRegular = folgRegular || name.includes("ольгирование");
        }
        let productPostpress = document.querySelector("#ProductPostpress");
        let productZKList = productPostpress
          .querySelector("#PostpressList")
          .getElementsByTagName("tr");
        let productZKtr = null;
        let productZKValue = 0;
        // Проверка термопереплета
        if (productZKList.length >= 0) {
          for (let j = 0; j < productZKList.length; j++) {
            if (
              productZKList[j].innerText.includes(
                "Термопереплет (кбс), толщина блока от 3 мм - pr @ "
              ) &&
              lamPlot &&
              found1Plus1
            ) {
              productZKtr = j;
              messages.push(
                `Двухстороняя ламинация недоступна при термопереплете в ${getOrderName(
                  i
                )}! Выберите одностороннюю`
              );
            }
          }
        }
        // Проверка софттач+мги
        if (foundLicoMgi && !lamSoft) {
          messages.push(
            `Вы забыли софттач ламинацию для МГИ в ${getOrderName(
              i
            )}! Если Вы действительно собираетесь делать без ламинации - обратитесь к Александру Щёкину.`
          );
        }
        // Проверка на пустой оборот мги
        if (foundOborotMgi1 && !foundLicoMgi) {
          messages.push(
            `ОБОРОТ МГИ выбран неверно в ${getOrderName(
              i
            )}! Вместо него поставьте "ЛИЦО МГИ"!`
          );
        }
        // Проверка связки фольгирование + софттач
        if (folgRegular && !lamSoft) {
          messages.push(
            `В ${getOrderName(
              i
            )} делается фольгирование. Оно ложится только на софттач ламинацию!`
          );
        }
      }
      // Проверка на количество листов для скрепки
      let sumDensity = 0;
      let paperSum = 0;
      let paperType2 = document.querySelectorAll(
        "#PaperType_chosen .chosen-single span"
      );
      let productPostpress = document.querySelector("#ProductPostpress");
      let productZKList = productPostpress
        .querySelector("#PostpressList")
        .getElementsByTagName("tr");
      if (productZKList.length >= 0) {
        for (let j = 0; j < productZKList.length; j++) {
          if (productZKList[j].innerText.includes("Скрепка")) {

            if (paperType2.length === 1) {
              let paperName = paperType2[0].innerText;
              let density = Number(paperName.split(",").pop());
              sumDensity += density;
            } else {
              let paperName = paperType2[1].innerText;
              let density = Number(paperName.split(",").pop());
              sumDensity += density;
            }
          }
        }
      }

      //Проверка на люверс
      function isInteger(num) {
        return num % 1 === 0;
      }
      const postpressList1 = document.querySelector("#PostpressList");
      const ltrs = postpressList1.querySelectorAll("tr");


      ltrs.forEach((elem) => {
        if (elem.innerText.includes("Люверс") === true) {



          let lQuantity = elem.querySelector("#Quantity").value;


          if (!isInteger(lQuantity)) {
            messages.push(
              `в ${getOrderName(
                i
              )} не целое число - убирай епрст и перекидывай на общую постпечать !`
            );

          }
        }
      });

      const trs = productPostpress.querySelectorAll("tr");
      for (let i = 0; i < trs.length; i++) {
        const tdText = trs[i].innerText.toLowerCase();
        if (tdText.includes("листоподбор")) {
          const tds = trs[i].querySelectorAll("td");
          paperSum = Number(tds[1].innerHTML);
          break; // выходим из цикла после нахождения первого совпадения
        }
      }
      if (sumDensity * paperSum > 2400) {
        messages.push(
          `Слишком толстый блок для скрепки! Обратитесь к технологу!`
        );
      }
    }

    // Вывод сообщений
    if (messages.length === 0) {
      messages.push("Всё в порядке!");



      let calcButton = document.querySelector(choosenCalcId);


      calcButton.click();
      choosenCalcParent = null;
      choosenCalc = null;
    }

    showMessages(messages);
  });
  let count = 0;
  let userName1 = document.querySelector(
    "body > ul > div > li:nth-child(1) > a.topmenu-a"
  ).textContent;


  let user1 = "Кандеев Рустам";
  let user2 = "Щёкин Александр";
  let user3 = "Галимов Адель";
  let user4 = "Козлов Артём";

  document.addEventListener("keydown", function (event) {
    if (event.getModifierState("CapsLock")) {
      count++;
      if (count === 2) {
        if (
          userName1 === user1 ||
          userName1 === user2 ||
          userName1 === user3 ||
          userName1 === user4
        ) {
          const new2Style = document.createElement("style");
          new2Style.type = "text/css";
          let new2Styles = `${choosenCalcId} {display: inline-block!important}`;
          new2Style.appendChild(document.createTextNode(new2Styles));
          document.head.appendChild(new2Style);
          count = 0;
        }
      }
    }
  });



  // Функция для отображения сообщения о смене даты

  function showCenterMessage(message) {
    const blurOverlay = document.createElement("div");
    blurOverlay.id = "blueOverlay";
    blurOverlay.style.position = "fixed";
    blurOverlay.style.top = "0";
    blurOverlay.style.left = "0";
    blurOverlay.style.width = "100%";
    blurOverlay.style.height = "100%";
    blurOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    blurOverlay.style.backdropFilter = "blur(5px)";
    blurOverlay.style.zIndex = "9998";

    const messageContainer = document.createElement("div");
    messageContainer.id = "messageContainer";
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "50%";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translate(-50%, -50%)";
    messageContainer.style.backgroundColor = "white";
    messageContainer.style.padding = "15px";
    messageContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.borderRadius = "10px";

    let message1 = document.getElementById("messageContainer");
    if (!message1) {
      document.body.appendChild(blurOverlay);
      let messageHTML = "<b>" + message + "</b><br><br>";
      messageHTML +=
        '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

      messageContainer.innerHTML = messageHTML;
      document.body.appendChild(messageContainer);
      document
        .getElementById("closeMessage")
        .addEventListener("click", function () {
          document.body.removeChild(messageContainer);
          document.body.removeChild(blurOverlay);
        });
    }
  }

  // Функция для отображения сообщений
  function showMessages(messages) {
    const blurOverlay = document.createElement("div");
    blurOverlay.style.position = "fixed";
    blurOverlay.style.top = "0";
    blurOverlay.style.left = "0";
    blurOverlay.style.width = "100%";
    blurOverlay.style.height = "100%";
    blurOverlay.style.backgroundColor = "rgba(2, 2, 2, 0.5)";
    blurOverlay.style.backdropFilter = "blur(5px)";
    blurOverlay.style.zIndex = "9998";
    document.body.appendChild(blurOverlay);

    const messageContainer = document.createElement("div");
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "50%";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translate(-50%, -50%)";
    messageContainer.style.backgroundColor = "white";
    messageContainer.style.padding = "15px 40px";
    messageContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.borderRadius = "10px";

    let messageHTML = "<b>" + messages.join("</b><br><b>") + "</b><br><br>";
    messageHTML +=
      '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

    messageContainer.innerHTML = messageHTML;
    document.body.appendChild(messageContainer);

    document
      .getElementById("closeMessage")
      .addEventListener("click", function () {
        document.body.removeChild(messageContainer);
        document.body.removeChild(blurOverlay);
        initialDateReadyValue = null;
      });
  }

  // Функция для проверки наличия текста на странице каждые 1 секунду
  function checkForText() {
    const searchText = "Лак для офсета";
    const searchText2 = "Тираж:";
    const searchText3 = "Размер";
    const pageContent = document.body.innerText;
    const manyPages = document.getElementById("DoubleBind");
    const listImg = document.querySelector('img[src="img/calc/sheet.png"]');
    const blocknote = document.querySelector(
      'img[src="img/calc/blocknot_blok.png"]'
    );
    const sostav = document.getElementById("CifraLayoutType");
    const perekid = document.querySelector(
      'img[src="img/calc/calendar_wall.png"]'
    );
    const blokn = document.querySelector(
      'img[src="img/calc/blocknot_top.png"]'
    );

    // Создаем цикл проверки по ордерам

    if (
      pageContent.includes(searchText) &&
      pageContent.includes(searchText2) &&
      pageContent.includes(searchText3)
    ) {
      if ((manyPages && !blocknote) || (listImg && !sostav) || sostav) {
        orderCheckButton.style.display = "block"; // Показываем кнопку
        const new3Style = document.createElement("style");
        new3Style.type = "text/css";
        let new3Styles = `${choosenCalcId} {display: none}`;
        new3Style.appendChild(document.createTextNode(new3Styles));
        document.head.appendChild(new3Style);
      } else {
        orderCheckButton.style.display = "none"; // Показываем кнопку
        const new3Style = document.createElement("style");
        new3Style.type = "text/css";
        let new3Styles = `${choosenCalcId} {display: inline-block}`;
        new3Style.appendChild(document.createTextNode(new3Styles));
        document.head.appendChild(new3Style);
      }
    } else {
      orderCheckButton.style.display = "none"; // Показываем кнопку
      const new3Style = document.createElement("style");
      new3Style.type = "text/css";
      let new3Styles = `${choosenCalcId} {display: inline-block}`;
      new3Style.appendChild(document.createTextNode(new3Styles));
      document.head.appendChild(new3Style);
    }
  }


  // Функция для получения названия заказа по индексу
  function getOrderName(index) {
    return `Ордер №${index + 1}`;
  }
  let counter = 0;

  // Создаем проверку по вопросу "Попасть в цвет"
  const colorCheckBtn = document.createElement("div");
  colorCheckBtn.style.position = "fixed";
  colorCheckBtn.style.top = "55%";
  colorCheckBtn.style.left = "55%";
  colorCheckBtn.style.width = "100vw";
  colorCheckBtn.style.zIndex = "5000";
  colorCheckBtn.style.height = "100vh";
  colorCheckBtn.style.backgroundColor = "transparent";
  colorCheckBtn.style.display = "none";
  document.body.appendChild(colorCheckBtn);
  let colorCheck = false;
  let count1 = 0;
  let count2 = 0;
  let phraseFound1 = false;
  setTimeout(() => {
    colorCheck = false;
  }, 100000);
  let colorBtnClick = false;
  function checkForcolorCheck() {
    const searchText1 = "Менеджер";
    const searchText2 = "Орбита";
    const searchText3 = "Контактное лицо";
    const searchText4 = "Плательщик";
    const searchText5 = "Комментарий для бухгалтерии";
    const searchText6 = "Запустить в работу";
    const searchText7 = "РЕКЛАМА";
    const bodyText = document.body.innerText;
    const header1 = document.querySelectorAll(
      "#Summary > table > tbody > tr > td:nth-child(1) > div.formblock > table:nth-child(1) > tbody > tr > td:nth-child(3) > nobr > h4 > span"
    );



if (
  bodyText.includes(searchText1) &&
  bodyText.includes(searchText2) &&
  bodyText.includes(searchText3) &&
  bodyText.includes(searchText4) &&
  bodyText.includes(searchText5) &&
  bodyText.includes(searchText6)
) {
      colorCheck = true;
      let phraseFound = false;
      if (colorCheck === true && count1 < 1) {
        count1++;
        colorCheckBtn.style.display = "block";

        colorCheckBtn.addEventListener("click", function () {
          colorBtnClick = true;

          colorCheckBtn.style.display = "none";

          // Проверяем наличие фразы "Попасть в цвет"
          header1.forEach((e) => {
            if (
              e.textContent.includes("Попасть в цвет") ||
              e.textContent.includes("РЕКЛАМА")
            ) {
              phraseFound = true;
            }
          });
          if (colorBtnClick === true && phraseFound === false) {
            colorCheck = false;
            phraseFound = true;
            count = 0;
            colorBtnClick = false;

            showCenterMessage(
              'В данном заказе не установлена операция "ПОПАСТЬ В ЦВЕТ", в таком случае - никаких гарантий по цвету - нет!!!'
            );

            // Выполняем действие при наличии фразы
            // if (phraseFound == true) {
            //   // Здесь можно выполнить какое-то действие, например, вывести сообщение или изменить стиль элемента
            //
            // } else {

            //   phraseFound = false;

            //   colorCheck = true;
            // }
          } else {

            phraseFound = false;
          }
        });
      }
    } else {
      count1 = 0;
      colorCheck = false;
      colorBtnClick = false;
      colorCheckBtn.style.display = "none";
    }
  }
  // Проверка юр лиц для клиентов
  const checkingClientsBtn = document.createElement("div");
  checkingClientsBtn.style.position = "fixed";
  checkingClientsBtn.style.bottom = "0";
  checkingClientsBtn.style.width = "100vw";
  checkingClientsBtn.style.zIndex = "5000";
  checkingClientsBtn.style.height = "10%";
  checkingClientsBtn.style.backgroundColor = "transparent";
  checkingClientsBtn.style.display = "none";
  document.body.appendChild(checkingClientsBtn);
  let checkingClientsBtnClick = false;

  function checkingClients() {
    let userName2 = document.querySelector(
      "body > ul > div > li:nth-child(1) > a.topmenu-a"
    ).textContent;

    let user01 = "Кандеев Рустам";
    let user02 = "Щёкин Александр";
    let user03 = "Галимов Адель";
    let user04 = "Козлов Артём";

    // ИСПРАВЛЕНО: двойное использование if
    if (
      userName2 === user01 ||
      userName2 === user02 ||
      userName2 === user03 ||
      userName2 === user04
    ) {
      return;
    }
    const bodyText = document.body.innerText;
    const searchText1 = "Название";
    const searchText2 = "ИНН";
    const searchText3 = "Полное название";
    const searchText4 = "КПП";
    const searchText5 = "БИК";
    const searchText6 = "Банк";
    const clientName = document.querySelector(
      "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > input"
    );
    const clientInn = document.querySelector(
      "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2) > div > input"
    );

    if (
      bodyText.includes(searchText1) &&
      bodyText.includes(searchText2) &&
      bodyText.includes(searchText3) &&
      bodyText.includes(searchText4) &&
      bodyText.includes(searchText5) &&
      bodyText.includes(searchText6)
    ) {
      function checkInputValue() {
        let clientValue = clientName.value.toLowerCase();
        // Проверяем, содержит ли строка "физ" и "лиц"
        if (clientValue.includes("физ") && clientValue.includes("лиц")) {
          checkingClientsBtn.style.display = "block"; // Показать кнопку, если содержит
        } else {
          checkingClientsBtn.style.display = "none"; // Скрыть кнопку, если не содержит
        }
      }
      // Функция для проверки начала строки при нажатии на кнопку
      function handleClick() {
        const clientValue = clientName.value.trim();

        // Проверяем, начинается ли строка с "ОПЛАТА ФИЗЛИЦА - "
        if (clientValue.startsWith("ОПЛАТА ФИЗЛИЦА - ")) {
          checkingClientsBtn.style.display = "none";

        } else {
          navigator.clipboard.writeText("ОПЛАТА ФИЗЛИЦА - ");

          showCenterMessage(
            'в поле Название необходимо прописать большими буквами без кавычек "ОПЛАТА ФИЗЛИЦА - ", данный текст уже скопирован - можете просто вставить'
          );
        }
      }
      clientName.addEventListener("input", checkInputValue);

      // Обработчик нажатия на кнопку
      checkingClientsBtn.addEventListener("click", handleClick);
      const buttonDone = document.querySelector(
        "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > div > button.btn.btn-success"
      );

      // Флаг для отслеживания необходимости проверки видимости #danger
      let dangerVisibilityChecked = false;

      // Функция для проверки ввода на наличие символов, отличных от цифр
      function checkInputForNumbersOnly() {
        const clientInnValue = clientInn.value;

        // Проверяем, содержит ли строка что-то кроме цифр
        const nonDigits = /\D/; // Регулярное выражение, которое ищет все символы, не являющиеся цифрами

        if (nonDigits.test(clientInnValue)) {
          clientInn.value = clientInnValue;
          showCenterMessage("Поле ИНН не поддерживает символы кроме цифр!");
          buttonDone.style.display = "none";
        } else {
          buttonDone.style.display = "block";
        }
        dangerVisibilityChecked = false;
      }

      // Функция для управления видимостью кнопки в зависимости от видимости элемента #danger
      function toggleButtonVisibility() {
        let userName3 = document.querySelector(
          "body > ul > div > li:nth-child(1) > a.topmenu-a"
        ).textContent;

        let user001 = "Кандеев Рустам";
        let user002 = "Щёкин Александр";
        let user003 = "Галимов Адель";
        let user004 = "Козлов Артём";

        // ИСПРАВЛЕНО: двойное использование if
        if (
          userName3 === user001 ||
          userName3 === user002 ||
          userName3 === user003 ||
          userName3 === user004
        ) {
          return;
        }

        const dangerElement = document.querySelector(
          "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(3) > td > div"
        ); // получаем элемент #danger

        // Проверяем, виден ли элемент #danger
        if (!dangerVisibilityChecked) {
          if (dangerElement && dangerElement.offsetParent !== null) {
            // showCenterMessage(
            //   "Вы пытаетесь создать ДУБЛЬ - так нельзя! Если прям нужно создать дубль - обращайтесь к Коммерческому директору"
            // );
            buttonDone.style.display = "none"; // скрываем кнопку, если элемент #danger видим
          } else {
            buttonDone.style.display = "block"; // показываем кнопку, если элемент #danger не видим
          }
        }

        // Устанавливаем флаг, чтобы не повторять проверку
        dangerVisibilityChecked = true;
      }

      // Отслеживаем изменения в input.form

      clientInn.addEventListener("input", checkInputForNumbersOnly);

      // Отслеживаем изменения видимости #danger

      new MutationObserver(toggleButtonVisibility).observe(
        document.querySelector("body"),
        {
          childList: true,
          subtree: true,
        }
      );
    } else {
      checkingClientsBtn.style.display = "none";
    }
  }

    //начало проверки бумаги
let calcCheck = 0;
let currentProductId = null;
let lastRulonMessage = false;
let paperShortageActive = false;

function safeParseInt(str) {
  if (!str) return 0;
  const cleaned = str.replace(/\s|&nbsp;/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

setInterval(() => {
  // === Проверка на РЕКЛАМА / РУЛОНКА-КОПИЦЕНТР ===
  const labelElements = document.querySelectorAll('span.label');
  const hasRulonOrReklama = Array.from(labelElements).some(el =>
    el.textContent.trim() === "РЕКЛАМА" ||
    el.textContent.trim() === "РУЛОНКА-КОПИЦЕНТР"
  );

  if (hasRulonOrReklama) {
    if (!lastRulonMessage) {
      lastRulonMessage = true;
    }
    calcCheck = 0;
    paperShortageActive = false;
    return;
  } else {
    lastRulonMessage = false;
  }

  // === Отслеживание смены заказа ===
  // Берем ProductId из первого script тега внутри #Doc
  let newProductId = null;
  const scriptTag = document.querySelector("#Doc > script:nth-child(1)");
  if (scriptTag) {
    // Извлекаем значение Product.Id из содержимого скрипта
    const scriptContent = scriptTag.textContent;
    const productIdMatch = scriptContent.match(/Product\s*=\s*{\s*Id:\s*(\d+)/);
    if (productIdMatch && productIdMatch[1]) {
      newProductId = productIdMatch[1];
    }
  }

  if (newProductId !== currentProductId) {
    calcCheck = 0;
    paperShortageActive = false;
    currentProductId = newProductId;
  }

  // === Исключающие статусы ===
  const excludedStatuses = [
    'status-files.png',
    'status-prepress-check.png',
    'status-prepress-layout.png',
    'status-print.png',
    'status-postpress-ready.png',
    'status-pack.png',
    'status-pack-onmove.png',
    'status-pack-tomove.png',
    'status-close.png'
  ].map(src =>
    document.querySelector(
      `#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="/axiom/img/status/${src}"]`
    )
  );

  const hasExcludedStatus = excludedStatuses.some(el => el !== null);
  if (hasExcludedStatus) {
    calcCheck = 0;
    paperShortageActive = false;
    return;
  }

  // === Сброс при загрузке или сохранении ===
  const fullWindow = document.querySelector("#Doc");
  const spinner = document.getElementsByClassName("spinner")[0];

  const isCalcStatus = Boolean(
    document.querySelector('#Top img[src="/axiom/img/status/status-calc.png"]') ||
    document.querySelector('#Top img[src="/axiom/img/status/status-calc-files.png"]') ||
    document.querySelector('#Top img[src="/axiom/img/status/status-nofiles.png"]')
  );

  if (isCalcStatus && fullWindow?.classList.contains("LoadingContent")) {
    calcCheck = 0;
    paperShortageActive = false;
  }

  if (document.body.innerText.includes("Сохранить расчет") && spinner) {
    calcCheck = 0;
    paperShortageActive = false;
  }

  // === 🔑 ВОССТАНОВЛЕНИЕ .RegButton при статусе calc ===
  const statusIconCalc = document.querySelector('#Top img[src="/axiom/img/status/status-calc.png"]');
  const statusIconCalcWFiles = document.querySelector('#Top img[src="/axiom/img/status/status-calc-files.png"]');
  const statusIconNoFiles = document.querySelector('#Top img[src="/axiom/img/status/status-nofiles.png"]');

  let currentStatus = null;
  if (statusIconCalc) currentStatus = "calc";
  else if (statusIconCalcWFiles) currentStatus = "calc-files";
  else if (statusIconNoFiles) currentStatus = "nofiles";
  else currentStatus = "other";

  if (currentStatus === "calc") {
    const regButton = document.querySelector(".RegButton");
    if (regButton) {
      regButton.style.display = "";
      regButton.disabled = false;
    }
  }

  // === Принудительное скрытие прочих кнопок при нехватке ===
  if (paperShortageActive) {
    const btnToWorkWFiles = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button");
    const newFilesGet = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button");
    const btnsgroup31 = document.querySelector("#workWithFilesBtn");

    if (btnToWorkWFiles) btnToWorkWFiles.style.display = "none";
    if (newFilesGet) newFilesGet.style.display = "none";
    if (btnsgroup31) btnsgroup31.style.display = "none";

    return;
  }

  // === Остальная логика только если нет нехватки ===
  if (currentStatus === "other") {
    calcCheck = 0;
    return;
  }

  if (calcCheck === 1) {
    return;
  }

  // === Элементы управления ===
  const btnsgroup1 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)");
  const btnsgroup2 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)");
  const btnsgroup3 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right");
  const btnToWorkWFiles = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button");
  const newFilesGet = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button");

  const paperList = document.querySelectorAll('table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr');
  const orders = document.querySelectorAll("#Summary > table > tbody > tr > td:nth-child(1) > .formblock");

  if (orders.length === 0) {
    return;
  }

  calcCheck = 1;
  let shortageFound = false;

  orders.forEach((el, index) => {
    if (shortageFound) return;

    const needCountEl = el.querySelector("table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(1) > td.right.nobreak");
    const stockRemainEl = el.querySelector("table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(3) > td.right.nobreak");

    if (!needCountEl || !stockRemainEl) {
      return;
    }

    let needToOtherEl = null;
    if (paperList.length >= 6) {
      needToOtherEl = el.querySelector("table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak");
    } else {
      needToOtherEl = el.querySelector("table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak");
    }

    if (needToOtherEl && !needToOtherEl.classList.contains('nobreak')) {
      return;
    }

    const needCountValue = safeParseInt(needCountEl.innerText);
    const stockRemainValue = safeParseInt(stockRemainEl.innerText);
    const needToOtherValue = needToOtherEl ? safeParseInt(needToOtherEl.innerText) : 0;

    const totalNeeded = needCountValue + needToOtherValue + 50;

    if (stockRemainValue <= 0 || totalNeeded > stockRemainValue) {
      shortageFound = true;
      paperShortageActive = true;

      if (currentStatus === "calc") {
        if (btnsgroup2) {
          btnsgroup2.style.display = "none";
        }
      } else if (currentStatus === "calc-files") {
        if (btnToWorkWFiles) btnToWorkWFiles.style.display = "none";
        if (btnsgroup1) btnsgroup1.style.display = "none";
        if (btnsgroup2) btnsgroup2.style.display = "none";
      } else if (currentStatus === "nofiles") {
        if (newFilesGet) newFilesGet.style.display = "none";
        if (btnsgroup3) btnsgroup3.style.display = "none";
      }

      showCenterMessage(
        `Не хватает бумаги для ордера №${index + 1}. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
      );
    }
  });

  if (!shortageFound) {
    paperShortageActive = false;
  }
}, 2000);
//конец проверки бумаги

  setInterval(() => {
    if (!document.body.innerText.includes("ОТГРУЗКА НА СЛЕДУЮЩИЙ ДЕНЬ!")) {
      counter = 0;
    }
  }, 1000);

  function createPriceBlock() {
    // Проверяем наличие элемента #itog на странице
    if (!document.getElementById('itog')) {
        return;
    }

    // Определяем путь к целевому элементу
    const targetElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(6) > td');

    // Проверяем, существует ли уже блок с ценой
    if (targetElement.querySelector('.urgent-order-price')) {
        return;
    }

    // Создаем новый блок
    const priceBlock = document.createElement('div');
    priceBlock.className = 'urgent-order-price';

    // Добавляем стили для блока
    priceBlock.style.backgroundColor = '#007BFF'; // Синий фон
    priceBlock.style.padding = '15px';
    priceBlock.style.borderRadius = '8px';
    priceBlock.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    priceBlock.style.color = 'white';
    priceBlock.style.textAlign = 'center';

    // Создаем заголовок
    const header = document.createElement('h4');
    header.textContent = 'Цена срочного заказа';
    header.style.color = '#FFFFFF'; // Белый текст
    header.style.margin = '0 0 10px 0';
    header.style.fontSize = '18px';
    priceBlock.appendChild(header);

    // Создаем элемент для отображения суммы
    const sumElement = document.createElement('div');
    sumElement.style.color = '#FFD700'; // Желтый текст
    sumElement.style.fontSize = '24px'; // Большой шрифт
    sumElement.style.fontWeight = 'bold';
    priceBlock.appendChild(sumElement);

    // Создаем кнопку "Скопировать корректировку"
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Скопировать цену';
    copyButton.style.marginTop = '10px';
    copyButton.style.padding = '8px 16px';
    copyButton.style.backgroundColor = '#28a745'; // Зеленый цвет кнопки
    copyButton.style.color = '#FFFFFF'; // Белый текст
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '14px';

    // Переменная для хранения оригинального числа (без пробелов)
    let originalSumValue = '';

    // Функция для форматирования числа с пробелами
    function formatNumberWithSpaces(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // Функция для расчета и обновления суммы
    function updateSum() {
        const itogText = document.getElementById('itog').textContent;
        const itogValue = parseFloat(itogText.replace(/[^0-9.,]/g, '').replace(',', '.'));
        const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');
        let inputValue = parseFloat(inputElement.value);

        if (inputValue < 0) {
            inputValue = Math.abs(inputValue);
            originalSumValue = ((itogValue + inputValue) * 1.4).toFixed(2);
        } else {
            originalSumValue = ((itogValue - inputValue) * 1.4).toFixed(2);
        }

        // Отображаем отформатированное число с пробелами
        sumElement.textContent = formatNumberWithSpaces(originalSumValue);
    }

    // Добавляем обработчик события для кнопки
    copyButton.addEventListener('click', function () {
        // Копируем оригинальное число (без пробелов) в буфер обмена
        navigator.clipboard.writeText(originalSumValue)
            .then(() => {
                // Меняем текст кнопки на "Скопировано!"
                copyButton.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyButton.textContent = 'Скопировать цену';
                }, 2000); // Возвращаем исходный текст через 2 секунды
            })
            .catch((err) => {

            });
    });

    // Добавляем кнопку в блок
    priceBlock.appendChild(copyButton);

    // Инициализация суммы
    updateSum();

    // Добавляем блок в целевой элемент
    targetElement.appendChild(priceBlock);

    // Настройка MutationObserver для отслеживания изменений
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                updateSum();
            }
        });
    });

    // Наблюдаем за изменениями в #itog и в input
    observer.observe(document.getElementById('itog'), {
        characterData: true,
        childList: true,
        subtree: true
    });

    const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');
    observer.observe(inputElement, {
        attributes: true,
        attributeFilter: ['value']
    });
}




  // Функция для преобразования строки в дату и изменения её на следующий день
  let datecheck = 0;
  let datecheck1 = 0;
  function addOneDay() {
    const dateInCalc = document.querySelector(
      "#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(11) > td.right > b"
    );
    const dateInProduct = document.querySelector(
      "#UtCalcResult > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)"
    );
    const calcDateLine = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(11)')
    if(calcDateLine){
      calcDateLine.style.display = "none"
    }
    const salePrice = document.querySelector('#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > a');
    if (salePrice){
      salePrice.style.display = "none"
    }
    if (
      (document.getElementById("result") !== null && datecheck === 0) ||
      (document.getElementById("UtCalcResult") !== null && datecheck === 0)
    ) {
      function updateDate(dateString) {
        const months = {
          января: 0,
          февраля: 1,
          марта: 2,
          апреля: 3,
          мая: 4,
          июня: 5,
          июля: 6,
          августа: 7,
          сентября: 8,
          октября: 9,
          ноября: 10,
          декабря: 11,
        };

        // Разделяем строку на части
        const [day, monthName] = dateString.split(" ");
        const dayNumber = parseInt(day, 10);
        const monthNumber = months[monthName];

        // Проверяем, что месяц корректный
        if (monthNumber === undefined) {
          throw new Error("Некорректный формат месяца: " + monthName);
        }

        // Создаем объект Date и добавляем один день
        const currentDate = new Date(2025, monthNumber, dayNumber); // Год указан для примера
        currentDate.setDate(currentDate.getDate() + 1);

        // Формируем новую строку с датой
        const newDay = currentDate.getDate();
        const newMonthName = Object.keys(months).find(
          (key) => months[key] === currentDate.getMonth()
        );

        return `${newDay} ${newMonthName}`;
      }
      if (datecheck === 0 && document.getElementById("result") !== null) {
        // const oldDate = dateInCalc.innerHTML.trim();
        // const newDate = updateDate(oldDate);
        // dateInCalc.innerHTML = newDate; // Обновляем текст в блоке
        datecheck = 1;
      } else if (
            datecheck === 0 &&
            document.getElementById("UtCalcResult") !== null
        ) {
            // Проверяем, существует ли элемент dateInProduct
            if (dateInProduct) {
                const oldDate = dateInProduct.innerHTML.trim();
                const newDate = updateDate(oldDate);
                dateInProduct.innerHTML = newDate; // Обновляем текст в блоке
                dateInProduct.style.backgroundColor = "yellow";
                dateInProduct.style.padding = "10px";
                datecheck = 1;
            }
        }
      // dateInCalc.innerHTML = "Расчитается после"

      // Создание элемента <div class="prepress">




    } else if (
      document.getElementById("result") == null &&
      document.getElementById("UtCalcResult") == null
    ) {
      datecheck = 0;
    }
    const links = document.body.querySelectorAll("a");


    // Выбираем все дочерние элементы первого уровня у div




    const dateInOrder = document.querySelector(
      "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
    );
    if (dateInOrder) {
      function updateDateInElement(selector) {
        // Находим элемент

        if (!dateInOrder) {

          return;
        }

        // Получаем текст элемента
        const text = dateInOrder.textContent;

        // Регулярное выражение для извлечения даты
        const dateMatch = text.match(
          /(\d{1,2}) (января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря) (\d{4}) (\d{2}):(\d{2})/
        );
        if (!dateMatch) {
          return;
        }

        // Словарь для преобразования названий месяцев в номера
        const months = {
          января: 0,
          февраля: 1,
          марта: 2,
          апреля: 3,
          мая: 4,
          июня: 5,
          июля: 6,
          августа: 7,
          сентября: 8,
          октября: 9,
          ноября: 10,
          декабря: 11,
        };

        // Извлекаем части даты
        const day = parseInt(dateMatch[1], 10);
        const month = months[dateMatch[2]];
        const year = parseInt(dateMatch[3], 10);

        // Создаем объект даты
        const date = new Date(year, month, day);

        // Добавляем 1 день
        date.setDate(date.getDate() + 1);

        // Устанавливаем время на 21:30
       // date.setHours(10, 0, 0, 0);

        // Форматируем дату для отображения
        const updatedDate = date.toLocaleString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
        //  hour: "2-digit",
         // minute: "2-digit",
        });

        // Обновляем текст в элементе
        dateInOrder.textContent = `Расчетная дата сдачи заказа: ${updatedDate}, в течении дня`;
        dateInOrder.style.background = "yellow"
        dateInOrder.style.padding = "10px"
      }

      // Обновляем дату в элементе с классом .textDate
      updateDateInElement(
        "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
      );
    }

    const dateForWorkOrder = document.querySelector(
      "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
    );

    if (dateForWorkOrder) {
      // Сопоставление дней недели
      const daysOfWeek = [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
      ];

      // Функция для добавления одного дня
      function addOneDayToDate() {
        if (!dateForWorkOrder) {
          return;
        }

        // Извлекаем текст из элемента
        const dateText = dateForWorkOrder.textContent.trim();

        // Разделяем текст для извлечения даты
        const [, datePart] = dateText.split(",").map((part) => part.trim());

        // Преобразуем дату в объект Date
        const [day, month, year] = datePart.split("/").map(Number);
        const currentDate = new Date(year, month - 1, day);

        // Добавляем 1 день
        currentDate.setDate(currentDate.getDate() + 1);

        // Форматируем новую дату
        const newDayOfWeek = daysOfWeek[currentDate.getDay()];
        const newDatePart = `${currentDate
          .getDate()
          .toString()
          .padStart(2, "0")}/${(currentDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${currentDate.getFullYear()}`;
        const newDateText = `${newDayOfWeek}, ${newDatePart}`;

        // Обновляем содержимое элемента

        dateForWorkOrder.textContent = newDateText;
        dateForWorkOrder.style.backgroundColor = "yellow"
        dateForWorkOrder.style.padding = "10px"
      }

      // Запускаем функцию
      if (datecheck1 === 0) {
        addOneDayToDate();
        datecheck1 = 1;
      }
    } else if (dateForWorkOrder == null) {
      datecheck1 = 0;
    }
  }

  let dateListUpdate1 = 0;

function addDateOnOrderList() {
    const dateColumn = document.querySelector(
        "#ManagerList > div > div.ax-table-body > table > thead > tr:nth-child(1) > th:nth-child(11) > span"
    );

    if (dateColumn !== null && dateListUpdate1 === 0) {
        dateListUpdate1 = 1;

        // Обработчик для существующих и новых элементов
        function processDateElements() {
            const dateElements = document.querySelectorAll(
                "#ManagerList > div > div.ax-table-body > table > tbody > tr > td.nobreak > span"
            );

            dateElements.forEach(element => {
                // Пропускаем уже обработанные элементы
                if (element.hasAttribute('data-date-processed')) return;

                const dateText = element.textContent.trim();
                const newDateRegex = /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/;

                if (newDateRegex.test(dateText)) {
                    try {
                        const [datePart, timePart] = dateText.split(', ');
                        const [day, month, year] = datePart.split('.').map(Number);
                        const [hours, minutes] = timePart.split(':').map(Number);

                        let dateObj = new Date(year, month - 1, day, hours, minutes);
                        dateObj.setDate(dateObj.getDate() + 1);
                        dateObj.setHours(10, 0, 0, 0);

                        const newDay = String(dateObj.getDate()).padStart(2, '0');
                        const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const newYear = dateObj.getFullYear();

                        element.textContent = `${newDay}.${newMonth}.${newYear}, 10:00`;
                        element.style.backgroundColor = "yellow";
                        element.setAttribute('data-date-processed', 'true');
                    } catch (e) {
                        console.error("Error processing date:", e);
                    }
                }
            });
        }

        // Обрабатываем существующие элементы
        processDateElements();

        // Настройка наблюдателя для новых элементов
        const tableBody = document.querySelector(
            "#ManagerList > div > div.ax-table-body > table > tbody"
        );

        if (tableBody) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.tagName === 'TR') {
                            processDateElements();
                        }
                    });
                });
            });

            observer.observe(tableBody, {
                childList: true,
                subtree: false
            });
        }
    } else if (dateColumn == null) {
        dateListUpdate1 = 0;
    }
}
  let prepressCheck = 0;
  function hideDropzone() {
    const searchText = "Номенклатура";
    const searchText1 = "Номенклатура по умолчанию";
    const bodyText = document.body.innerText;
    const statusNotToCheck1 = document.querySelector(
      '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="/axiom/img/status/status-files.png"]'
    );
    const statusNotToCheck2 = document.querySelector(
      '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="/axiom/img/status/status-prepress-check.png"]'
    );
    const ordersHistory = document.querySelectorAll(".formblock");
    const fullWindow = document.querySelector("#Doc");
    const stop = document.querySelector("#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img")
    if (fullWindow.classList.contains("LoadingContent") === true) {
      prepressCheck = 0;
    }
    ordersHistory.forEach((elem) => {
      if (
        bodyText.includes(searchText || bodyText.includes(searchText1)) &&
        (statusNotToCheck1 !== null || statusNotToCheck2 !== null) && stop === null
      ) {
        const selector =
          "#History > div > table.table.table-hover.table-condensed.table-bordered > tbody > tr:nth-child(3) > td:nth-child(3)";

        const selector1 =
          "#History > div > table.table.table-hover.table-condensed.table-bordered > tbody > tr:nth-child(2) > td:nth-child(3)";

        // Селекторы элементов для скрытия
        const buttonSelector =
          "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1)";
        const dropzoneSelector = "#Dropzone";
        const newFiles =
          "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button";

        const element = elem.querySelector(selector);
        const element1 = elem.querySelector(selector1);
        const buttonElement = document.querySelector(buttonSelector);
        const dropzoneElement = document.querySelector(dropzoneSelector);
        const newFilesElem = document.querySelector(newFiles);

        if (
          (element && element.textContent.trim() && prepressCheck === 0 ) ||
          (element1 && element1.textContent.trim() && prepressCheck === 0)
        ) {


          // Создание элемента <div class="prepress">
          const prepressElement = document.createElement("div");
          prepressElement.style.backgroundColor = "orange";
          prepressElement.style.fontSize = "25px";
          prepressElement.style.fontWeight = "700";
          prepressElement.style.color = "#ffffff";
          prepressElement.style.textAlign = "center";
          prepressElement.style.textTransform = "uppercase";
          prepressElement.textContent =
            "Идет препресс - изменение файлов невозможно!";

          // Замена элемента form.dropzone на новый элемент
          dropzoneElement.parentNode.replaceChild(
            prepressElement,
            dropzoneElement
          );
          prepressCheck = 1;

          // Скрываем кнопку и поле dropzone
          buttonElement.style.display = "none";
          // dropzoneElement.style.display = "none";
          newFilesElem.style.display = "none";
        }
      } else {
        prepressCheck = 0;
      }
    });
  }

  // Запускаем проверку при загрузке страницы
  //window.addEventListener("load");
 // setInterval(checkForText, 500); // Проверка наличия текста каждую секунду

  setInterval(checkForcolorCheck, 100);
  setInterval(checkingClients, 100);
  setInterval(addOneDay, 0);
  setInterval(addDateOnOrderList, 0);
  setInterval(hideDropzone, 200);
  setInterval(createPriceBlock, 200);
  setInterval(() => {
    count = 0;

    checkForcolorCheck();
  }, 1000);
  setInterval(() => {
    count1 = 0;
  }, 100000);
  // Сбрасываем значение даты каждые 10 секунд
  setInterval(() => {
    initialDateReadyValue = null;
    checkForText = null;
    colorBtnClick = false;
  }, 1000);


  (function() {
    // Функция для проверки наличия слова на странице
    function checkForWord() {
        const word = "Производительность сотрудников";
        const wordExists = document.body.innerText.includes(word);

        if (wordExists && !document.getElementById('sumButton')) {
            createButtons();
        } else if (!wordExists && document.getElementById('sumButton')) {
            removeButtons();
        }
    }

    // Функция для создания кнопок
    function createButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.right = '20px';
        buttonContainer.style.bottom = '20px';
        buttonContainer.style.zIndex = '1000';

        const sumButton = document.createElement('button');
        sumButton.id = 'sumButton';
        sumButton.innerText = 'SUM';
        sumButton.style.backgroundColor = '#007BFF'; // Синий цвет
        sumButton.style.color = '#FFFFFF'; // Белый текст
        sumButton.style.border = 'none';
        sumButton.style.borderRadius = '5px';
        sumButton.style.padding = '10px 20px';
        sumButton.style.marginRight = '10px';
        sumButton.style.cursor = 'pointer';
        sumButton.style.fontSize = '14px';
        sumButton.style.fontWeight = 'bold';
        sumButton.onclick = () => {
            copySumValue();
            showFeedback(sumButton);
        };

        const tableButton = document.createElement('button');
        tableButton.id = 'tableButton';
        tableButton.innerText = 'Table';
        tableButton.style.backgroundColor = '#007BFF'; // Синий цвет
        tableButton.style.color = '#FFFFFF'; // Белый текст
        tableButton.style.border = 'none';
        tableButton.style.borderRadius = '5px';
        tableButton.style.padding = '10px 20px';
        tableButton.style.cursor = 'pointer';
        tableButton.style.fontSize = '14px';
        tableButton.style.fontWeight = 'bold';
        tableButton.onclick = () => {
            copyTableValues();
            showFeedback(tableButton);
        };

        buttonContainer.appendChild(sumButton);
        buttonContainer.appendChild(tableButton);
        document.body.appendChild(buttonContainer);
    }

    // Функция для удаления кнопок
    function removeButtons() {
        const buttonContainer = document.querySelector('div[style*="right: 20px;"]');
        if (buttonContainer) {
            buttonContainer.remove();
        }
    }

    // Функция для копирования и обработки значения SUM
    function copySumValue() {
        const selector = '#Tabs > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1) > td > div > table > thead > tr.ax-ftable-total > th:nth-child(3)';
        const element = document.querySelector(selector);

        if (element) {
            let value = element.innerText.replace(/\s+/g, ''); // Удаляем пробелы
            value = Math.round(parseFloat(value.replace(',', '.'))); // Округляем до целого числа
            navigator.clipboard.writeText(value.toString());
        }
    }

    // Функция для копирования и обработки значений таблицы
    function copyTableValues() {
        const selector = '#Tabs > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1) > td > div > table > tbody';
        const tableBody = document.querySelector(selector);

        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            let values = [];

            rows.forEach(row => {
                const thirdTd = row.querySelector('td:nth-child(3)');
                if (thirdTd) {
                    let value = thirdTd.innerText.replace(/\s+/g, ''); // Удаляем пробелы
                    value = Math.round(parseFloat(value.replace(',', '.'))); // Округляем до целого числа
                    if (value >= 10000) { // Фильтруем значения меньше 10000
                        values.push(value);
                    }
                }
            });

            const clipboardText = values.join('\n'); // Соединяем значения в одну строку с переносами
            navigator.clipboard.writeText(clipboardText);
        }
    }

    function replaceDropzoneWithDirectUpload() {
  // Проверяем наличие текста "Номенклатура" или "Номенклатура по умолчанию" на странице
  const bodyText = document.body.innerText;
  const hasNomenclature = bodyText.includes("Номенклатура") || bodyText.includes("номенклатура по умолчанию");

  // Проверяем наличие текста "Нет изображений" в указанном элементе
  const previewBlock = document.querySelector("#PreviewBlock > div");
  const hasNoImages = previewBlock && previewBlock.classList.contains("fororama_no_previews") &&
                       previewBlock.textContent.includes("Файловый сервер недоступен");

  // Если оба условия выполняются
  if (hasNomenclature && hasNoImages) {

      // Находим элемент Dropzone
      const dropzoneElement = document.querySelector("#Dropzone");

      if (dropzoneElement) {
          // Создаем новый элемент
          const directUploadElement = document.createElement("div");
          directUploadElement.style.backgroundColor = "#4CAF50"; // Зеленый фон
          directUploadElement.style.fontSize = "25px";
          directUploadElement.style.fontWeight = "700";
          directUploadElement.style.color = "#ffffff";
          directUploadElement.style.textAlign = "center";
          directUploadElement.style.padding = "20px";
          directUploadElement.style.margin = "10px 0";
          directUploadElement.style.borderRadius = "5px";
          directUploadElement.style.cursor = "pointer";
          directUploadElement.textContent = "Загрузите файл через папку или отошлите на почту!";


          // Заменяем Dropzone на новый элемент
          dropzoneElement.parentNode.replaceChild(directUploadElement, dropzoneElement);

      }
  }
}

// Функция для периодической проверки условий (на случай, если элементы загружаются динамически)
function checkAndReplaceDropzone() {
  replaceDropzoneWithDirectUpload();

  // Наблюдатель за изменениями в DOM
  const observer = new MutationObserver(function(mutations) {
      replaceDropzoneWithDirectUpload();
  });

  // Начинаем наблюдение за изменениями в body
  observer.observe(document.body, { childList: true, subtree: true });
}

// Запускаем проверку после полной загрузки страницы
window.addEventListener("load", function() {
    checkAndReplaceDropzone();
});

// Также проверяем сразу, если DOM уже загружен
if (document.readyState === "interactive" || document.readyState === "complete") {
    checkAndReplaceDropzone();
}


const SHEET_ID = '1h4vwAC83sqAnf2ibalKW4qfTSHe0qToPs0-0aSdpdrU';
const SHEET_NAME = 'finder';

// Глобальная переменная для хранения данных таблицы
let sheetData = [];

// Функция для получения данных из Google таблицы
function fetchGoogleSheetData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            if (response.status === 200) {
                sheetData = parseCSV(response.responseText);

            } else {

            }
        },
        onerror: function(error) {

        }
    });
}

// Функция для парсинга CSV данных
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        // Обработка CSV с учетом возможных кавычек
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        for (let j = 0; j < values.length; j++) {
            values[j] = values[j].replace(/^"|"$/g, '').trim();
        }

        result.push(values);
    }

    return result;
}

// Функция для проверки наличия ProductId в данных таблицы
function checkProductIdInData(productId, data) {
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            // Приводим всё к строке и удаляем пробелы для корректного сравнения
            if (data[i][j].toString().trim() === productId.toString().trim()) {
                return true;
            }
        }
    }
    return false;
}

// Функция для обработки элемента ProductId
function processProductId(element) {
    const productId = element.textContent.trim();

    if (checkProductIdInData(productId, sheetData)) {
        if (!element.textContent.includes('⚡️')) {
            element.textContent = element.textContent + '⚡️';
        }

    } else {

    }
}

// Функция для наблюдения за DOM и отслеживания появления #ProductId
function observeDOM() {
    // Настраиваем наблюдатель за DOM
    const observer = new MutationObserver(function(mutations) {
        const productIdElement = document.getElementById('ProductId');
        if (productIdElement) {
            processProductId(productIdElement);
        }
    });

    // Начинаем наблюдение за всем DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Также проверяем существующий DOM на наличие элемента
    const existingProductId = document.getElementById('ProductId');
    if (existingProductId) {
        processProductId(existingProductId);
    }
}

// Запускаем обновление данных каждые 15 секунд
function startPeriodicUpdates() {
    // Первый вызов для немедленной загрузки данных
    fetchGoogleSheetData();

    // Устанавливаем интервал для обновления данных каждые 15 секунд
    setInterval(fetchGoogleSheetData, 15000);
}

// Запускаем наблюдение и обновление данных, когда страница полностью загружена
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        startPeriodicUpdates();
        observeDOM();
    });
} else {
    startPeriodicUpdates();
    observeDOM();
}
  // Добавляем CSS для анимации
  GM_addStyle(`
    /* Анимация для текста "Получаем информацию о бонусах..." */
    @keyframes dots {
        0% { content: "..."; }
        33% { content: "."; }
        66% { content: ".."; }
    }

    .loading-text::after {
        content: "...";
        animation: dots 1s infinite;
    }
`);

// Функция для получения данных из селектора на странице
function getDataFromSelector() {
  const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
  const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';

  let element = document.querySelector(selector1);
  if (element) {
      return element.textContent.trim();
  } else {
      element = document.querySelector(selector2);
      if (element) {
          const spanElement = element.querySelector('div > a > span');
          return spanElement ? spanElement.textContent.trim() : element.textContent.trim();
      }
  }
  return null;
}

// Функция для создания строки с информацией о бонусах
function createBonusRow() {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 2; // Устанавливаем colspan, чтобы ячейка занимала всю ширину строки
  cell.style.textAlign = 'center'; // Центрируем текст
  cell.style.fontWeight = 'bold'; // Делаем текст жирным

  // Создаем текстовое содержимое
  const text = document.createTextNode('Доступно бонусов: ');
  cell.appendChild(text);

  // Создаем кнопку "Узнать"
  const button = document.createElement('button');
  button.textContent = 'Узнать';
  button.style.marginLeft = '10px';
  button.style.padding = '5px 10px';
  button.style.border = 'none';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.cursor = 'pointer';
  button.style.borderRadius = '5px';

   // Добавляем обработчик события для кнопки
   button.addEventListener('click', () => {
    // Отключаем кнопку и показываем спиннер
    button.disabled = true;
    button.textContent = ''; // Очищаем текст кнопки
    button.style.backgroundColor = '#ccc'; // Серый цвет для отключения

    // Добавляем текст "Получаем информацию о бонусах..."
    const loadingText = document.createElement('span');
    loadingText.textContent = 'Загрузка';
    loadingText.classList.add('loading-text'); // Применяем анимацию
    button.appendChild(loadingText);

    // Задержка в 2 секунды перед отправкой запроса
    setTimeout(() => {
        const searchText = getDataFromSelector();
        if (searchText) {
            fetchDataFromGoogleSheets(searchText, (bonusAmount) => {
                if (bonusAmount !== null) {
                    cell.textContent = `Доступно бонусов: ${bonusAmount}`;
                    cell.style.color = 'green';
                } else {
                    cell.textContent = 'Бонусов нет';
                    cell.style.color = 'red';
                }
            });
        } else {
            cell.textContent = 'Ошибка: невозможно получить данные';
            cell.style.color = 'red';
        }
    }, 1000); // Задержка в 2 секунды
});

  // Добавляем кнопку в ячейку
  cell.appendChild(button);

  // Добавляем ячейку в строку
  row.appendChild(cell);
  return row;
}

// Функция для скрытия всех элементов, кроме указанных строк
function removeUnwantedElements(targetTableBody) {
        // Проходим по всем строкам таблицы
        const rows = targetTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            // Получаем текст строки и проверяем его содержимое
            const rowText = row.textContent || row.innerText || '';
            if (
    !rowText.includes('Корректировка суммы') &&
    !rowText.includes('Юр. лицо') &&
    !rowText.includes('Доступно бонусов') &&
    !document.querySelector('.bonus-row')
) {
                row.style.display = 'none'; // Скрываем строку
            }
        });
    }

// Функция для добавления строки с бонусами в таблицу
function addBonusRowToTable(targetTable) {
  // Проверяем, существует ли уже строка с бонусами
  const existingBonusRow = targetTable.querySelector('.bonus-row');
  if (existingBonusRow) {
      return; // Если строка уже существует, ничего не делаем
  }

  // Создаем новую строку с бонусами
  const bonusRow = createBonusRow();
  bonusRow.classList.add('bonus-row'); // Добавляем уникальный класс для идентификации

  // Вставляем строку в конец таблицы
  targetTable.querySelector('tbody').appendChild(bonusRow);
}

// Функция для получения данных из Google Sheets
function fetchDataFromGoogleSheets(searchText, callback) {
  const spreadsheetId = '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ';
  const sheetName = 'ОСТАТОК';
  const apiKey = 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0'; // Замените на ваш API ключ Google Sheets

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:B?key=${apiKey}`;

  GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function(response) {
          if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              if (data && data.values && data.values.length > 1) {
                  for (let i = 1; i < data.values.length; i++) {
                      const row = data.values[i];
                      if (row[0] === searchText) {
                          callback(row[1]); // Передаем значение бонусов в callback
                          return;
                      }
                  }
              }
          }
          callback(null); // Если совпадений нет или произошла ошибка
      },
      onerror: function(error) {

          callback(null);
      }
  });
}

// Флаг для предотвращения повторной обработки, пока элементы видимы
let isProcessing = false;

// Функция для проверки наличия текста "Номенклатура" или "Номенклатура по умолчанию" на странице
function hasNomenclatureText() {
  const pageText = document.body.textContent || '';
  return pageText.includes('Номенклатура') || pageText.includes('Номенклатура по умолчанию');
}

// Функция проверки наличия и обработки элементов
function checkAndProcessElements() {
  // Проверяем наличие текста "Номенклатура" или "Номенклатура по умолчанию"
  if (!hasNomenclatureText()) {
      isProcessing = false;
      return;
  }

  const targetTable = document.querySelector('#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table');
  if (targetTable) {
      // Получаем тело таблицы
      const targetTableBody = targetTable.querySelector('tbody');
      if (targetTableBody) {
          // Скрываем все элементы, кроме указанных строк
          removeUnwantedElements(targetTableBody);

          // Добавляем строку с бонусами
          addBonusRowToTable(targetTable);
      }
  } else {
      isProcessing = false;
  }
}

// Функция для настройки MutationObserver
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
      if (hasNomenclatureText()) {
          const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
          const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';
          if (document.querySelector(selector1) || document.querySelector(selector2)) {
              checkAndProcessElements();
          } else {
              isProcessing = false;
          }
      }
  });

  observer.observe(document.documentElement, {
      childList: true,
      subtree: true
  });

  // Также проверим сразу, вдруг элементы уже есть на странице
  checkAndProcessElements();

  // Запускаем проверку каждую секунду
  setInterval(checkAndProcessElements, 800);
}

// Запускаем настройку наблюдателя, когда документ загружен
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupObserver);
} else {
  setupObserver();
}

    //отображение списаных бонусов за заказ

const gs_SHEET_ID = '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkCFl970';
const gs_SHEET_NAME = 'idCheck';

let gs_sheetData = [];
let gs_processedElements = new Set();

// Функция для получения данных из Google таблицы
function gs_fetchGoogleSheetData() {
    const url = `https://docs.google.com/spreadsheets/d/${gs_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${gs_SHEET_NAME}`;

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            if (response.status === 200) {
                gs_sheetData = gs_parseCSV(response.responseText);
            } else {
                console.error('Ошибка при получении данных из Google таблицы:', response.statusText);
            }
        },
        onerror: function (error) {
            console.error('Ошибка при запросе к Google таблице:', error);
        }
    });
}

// Функция для парсинга CSV данных
function gs_parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        for (let j = 0; j < values.length; j++) {
            values[j] = values[j].replace(/^"|"$/g, '').trim();
        }

        result.push(values);
    }

    return result;
}

// Функция для проверки наличия ProductId в данных таблицы
function gs_checkProductIdInData(productId, data) {
    for (let i = 0; i < data.length; i++) {
        const productCell = data[i][0]; // Столбец A
        const bonusCell = data[i][4];   // Столбец E

        if (productCell.toString().trim() === productId.toString().trim()) {
            return bonusCell; // Возвращаем значение из столбца E
        }
    }
    return null;
}

// Функция для получения данных из селекторов на странице
function gs_getDataFromSelector() {
    const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
    const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';

    let element = document.querySelector(selector1);
    if (element) {
        return { text: element.textContent.trim(), element };
    } else {
        element = document.querySelector(selector2);
        if (element) {
            const spanElement = element.querySelector('div > a > span');
            return { text: spanElement ? spanElement.textContent.trim() : element.textContent.trim(), element };
        }
    }
    return null;
}

// Функция для обработки элемента chosen-single
function gs_processChosenSingle(productId) {
    // Проверяем, есть ли ProductId в таблице
    const bonuses = gs_checkProductIdInData(productId, gs_sheetData);
    if (!bonuses) {
        return; // Если ProductId нет в таблице, выходим из функции
    }

    const chosenSingleElement = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a');
    if (chosenSingleElement && !gs_processedElements.has(chosenSingleElement)) {
        gs_processedElements.add(chosenSingleElement);

        chosenSingleElement.style.display = 'none';

        const selectorData = gs_getDataFromSelector();
        const newElement = document.createElement('span');
        newElement.classList.add('myelem');

        // Запрещаем все действия с элементом через CSS-свойства
        newElement.style.pointerEvents = 'none'; // Отключает все события мыши (клик, наведение и т.д.)
        newElement.style.userSelect = 'none';    // Запрещает выделение текста
        newElement.style.opacity = '0.5';

        // Формируем текст для нового элемента
        if (bonuses) {
            // Оборачиваем значение bonuses в span с зеленым цветом
            newElement.innerHTML = `${selectorData.text} (Было списано <span style="color: green;">${bonuses}</span> бонусов)`;
        } else {
            newElement.textContent = selectorData.text;
        }

        if (selectorData) {
            const clientSelect = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div");
            clientSelect.style.pointerEvents = 'none';

            chosenSingleElement.parentNode.insertBefore(newElement, chosenSingleElement);
        }
    }
}

// Функция для обработки ProductId
function gs_processProductId() {
    const productIdElement = document.querySelector("#ProductId");
    if (productIdElement) {
        const productId = productIdElement.textContent.trim();

        // Проверяем, есть ли ProductId в таблице
        const bonuses = gs_checkProductIdInData(productId, gs_sheetData);
        if (!bonuses) {
            return; // Если ProductId нет в таблице, выходим из функции
        }

        gs_processChosenSingle(productId); // Обрабатываем элемент chosen-single
    }
}

// MutationObserver для отслеживания изменений DOM
const gs_observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.querySelector("#ProductId")) {
                    gs_processProductId();
                }
                if (node.querySelector('a.chosen-single')) {
                    const productIdElement = document.querySelector("#ProductId");
                    if (productIdElement) {
                        const productId = productIdElement.textContent.trim();
                        gs_processChosenSingle(productId);
                    }
                }
            }
        });
    });
});

gs_observer.observe(document.body, { childList: true, subtree: true });

gs_fetchGoogleSheetData();

      function closeOldBill()  {

  // Функция для конвертации даты из формата "Пятница, 28 марта 2025" в объект Date
  function parseDate(dateString) {
      if (!dateString || typeof dateString !== 'string') {
          return null;
      }

      const dateParts = dateString.split(', ');
      if (dateParts.length !== 2) {
          return null;
      }

      const dayMonthYear = dateParts[1].split(' ');
      if (dayMonthYear.length !== 3) {
          return null;
      }

      const day = parseInt(dayMonthYear[0], 10);
      const monthName = dayMonthYear[1];
      const year = parseInt(dayMonthYear[2], 10);

      const monthMap = {
          'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
          'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
          'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
      };

      const month = monthMap[monthName.toLowerCase()];
      if (month === undefined) {
          return null;
      }

      return new Date(year, month, day);
  }

  // Функция для получения даты закрытия квартала
  function getQuarterCloseDate(currentDate) {
      const year = currentDate.getFullYear();
      const quarter = Math.ceil((currentDate.getMonth() + 1) / 3); // Определяем текущий квартал

      let closeMonth, closeDay;
      if (quarter === 1) {
          closeMonth = 3; // Апрель
          closeDay = 10;
      } else if (quarter === 2) {
          closeMonth = 6; // Июль
          closeDay = 10;
      } else if (quarter === 3) {
          closeMonth = 9; // Октябрь
          closeDay = 10;
      } else if (quarter === 4) {
          closeMonth = 0; // Январь следующего года
          closeDay = 19;
      }

      if (quarter === 4) {
          return new Date(year + 1, closeMonth, closeDay);
      }
      return new Date(year, closeMonth, closeDay);
  }

  // Функция для изменения страницы
  function modifyPage() {
      // Заменяем содержимое блока #Doc > div.bigform > div:nth-child(1)
      const targetBlock = document.querySelector('#Doc > div.bigform > div:nth-child(1)');
      if (targetBlock) {
          targetBlock.innerHTML = `
              <div id="closedNotice" style="
                  color: red;
                  font-size: 16px;
                  font-weight: bold;
                  text-transform: uppercase;
                  position: relative;
                  cursor: pointer;
              ">
                  ДАТЫ ЗАКРЫТЫ
                  <div id="tooltip" style="
                      display: none;
                      position: absolute;
                      top: 100%;
                      left: 50%;
                      transform: translateX(-50%);
                      background-color: black;
                      color: white;
                      padding: 10px;
                      border-radius: 8px;
                      text-align: center;
                      z-index: 10000;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
                      font-size: 12px;
                      width: 310px;
                  ">
                      Период в котором был сформирован документ - закрыт,
                      для внесения правок обратитесь к главному бухгалтеру!
                  </div>
              </div>
          `;

          // Добавляем обработчик событий для показа/скрытия tooltip
          const noticeElement = document.getElementById('closedNotice');
          const tooltipElement = document.getElementById('tooltip');

          noticeElement.addEventListener('mouseenter', () => {
              tooltipElement.style.display = 'block';
          });

          noticeElement.addEventListener('mouseleave', () => {
              tooltipElement.style.display = 'none';
          });
      }

      // Делаем таблицу неактивной
      const tableElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table');
      if (tableElement) {
          tableElement.style.pointerEvents = 'none';
          tableElement.style.opacity = '0.7'; // Добавляем эффект "неактивности"
      }

      // Делаем блок неактивным
      const divElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > div > div');
      if (divElement) {
          divElement.style.pointerEvents = 'none';
          divElement.style.opacity = '0.7';
      }

      // Скрываем кнопки
      const buttonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > button');
      if (buttonElement) buttonElement.style.display = 'none';

      const divButtonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > div:nth-child(3)');
      if (divButtonElement) divButtonElement.style.display = 'none';
  }

  // Функция для проверки условий
  function checkConditions() {
      const summaElement = document.querySelector('#Summa');
      const tabElement = document.querySelector('#FormTabs > li:nth-child(2) > a');

      // Если оба элемента найдены
      if (summaElement && tabElement) {
          const dateElement = document.querySelector('#Date');
          if (!dateElement) {
              setTimeout(checkConditions, 1000);
              return;
          }

          const dateString = dateElement.value.trim();
          const parsedDate = parseDate(dateString);

          if (!parsedDate) {
              setTimeout(checkConditions, 1000);
              return;
          }

          const currentDate = new Date();
          const quarterCloseDate = getQuarterCloseDate(parsedDate);

          // Проверяем, прошла ли дата порог закрытия квартала
          if (currentDate <= quarterCloseDate) {
              setTimeout(checkConditions, 1000);
              return;
          }

          modifyPage();
      } else {
          setTimeout(checkConditions, 1000);
      }
  }

  // Наблюдатель за изменениями DOM
  function observeDOM() {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                  // Проверяем, есть ли элементы #Date и #Summa
                  const dateElement = document.querySelector('#Date');
                  const summaElement = document.querySelector('#Summa');

                  if (!dateElement || !summaElement) {
                      checkConditions();
                  }
              }
          });
      });

      // Начинаем наблюдение за всем DOM
      observer.observe(document.body, { childList: true, subtree: true });
  }

  // Запускаем проверку условий и наблюдение за DOM
  checkConditions();
  observeDOM();
}
closeOldBill();

//Связка аксиомы и таблицы дизайнеров
    function newDesign() {
    'use strict';
    const API_KEY = 'AIzaSyD-gPXmq0YOL3WXjQ8jub9g5_xyx2PfOZU';
    const SPREADSHEET_ID = '1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY';
    const DESIGN_SHEET_NAME = 'Design';
    const LIST_SHEET_NAME = 'List';

    // Добавляем CSS для анимации загрузки
    GM_addStyle(`
        .loading-animation {
            position: relative;
            display: inline-block;
        }
        .loading-animation::after {
            content: '';
            display: inline-block;
            animation: dots 2s infinite;
        }
        @keyframes dots {
            0% { content: '.'; }
            33% { content: '..'; }
            66% { content: '...'; }
            100% { content: ''; }
        }
    `);

    // Функция для получения productID
function gs_processProductId() {
    const productIdElement = document.querySelector("#ProductId");
    if (productIdElement) {
        let text = productIdElement.textContent.trim();

        // Удаляем все нецифровые символы
        const numericId = text.replace(/[^0-9]/g, '');

        // Если после очистки есть цифры — возвращаем, иначе null
        if (numericId) {
            return numericId;
        }
    }
    return null;
}

    // Функция для получения имени пользователя
    function getUserName() {
        const userNameElement = document.querySelector("body > ul > div > li:nth-child(1) > a.topmenu-a");
        if (userNameElement) {
            return userNameElement.textContent.trim();
        }
        return null;
    }

    // Функция для получения названия продукта
    function getProductName() {
        const productNameElement = document.querySelector("#Top > form > div > div > div > input.ProductName.form-control");
        if (productNameElement) {
            return productNameElement.value.trim();
        }
        return null;
    }

    // Функция для проверки наличия productID в таблице
    async function checkProductInSheet(productId) {
        const range = `Design!A:A`;
        const values = await fetchGoogleSheetData(range);
        return values.some(row => row[0] === productId.toString());
    }



    // Функция для получения данных из Google Sheets
    async function fetchGoogleSheetData(range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.values || [];
    }

    // Функция для записи данных в Google Sheets
    async function writeDataToSheet(data) {
        const url = "https://script.google.com/macros/s/AKfycbyH_R0_8JIlAq3TW8Fq_hmN6dSJ2c-u7F9lnwTMm8jOzHNnXBw7DjX4uUMRRTNlzxDw/exec";
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            return true;
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            alert('Произошла ошибка при отправке данных. Проверьте консоль.');
            return false;
        }
    }

    // Функция для получения данных по productID из таблицы
    async function getProductDataFromSheet(productId) {
        const range = `Design!A:E`; // Берем столбцы от A до E (productID, ..., Цена продажи, Дизайнер)
        const values = await fetchGoogleSheetData(range);
        return values.find(row => row[0] === productId.toString()) || null;
    }

    // Функция для показа попапа
    function showPopup() {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = '#f9f9f9'; // Более светлый фон
    popup.style.border = '1px solid #ddd'; // Серая рамка
    popup.style.borderRadius = '8px'; // Скругленные углы
    popup.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; // Тень для эффекта глубины
    popup.style.zIndex = '1000';

    const priceLabel = document.createElement('label');
    priceLabel.innerText = 'Сумма дизайнеру:';
    priceLabel.style.display = 'block';
    priceLabel.style.marginBottom = '5px';
    priceLabel.style.fontWeight = 'bold';

    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.placeholder = 'Сколько платим дизайнеру?';
    priceInput.style.width = '100%';
    priceInput.style.padding = '10px';
    priceInput.style.marginTop = '10px';
    priceInput.style.marginBottom = '10px';
    priceInput.style.border = '1px solid #ccc';
    priceInput.style.borderRadius = '4px';
    priceInput.style.boxSizing = 'border-box';

    // Добавляем обработчик для удаления сообщения об ошибке при изменении суммы
    priceInput.addEventListener('input', () => {
        const errorMessage = popup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.parentElement.removeChild(errorMessage); // Удаляем таблицу с ошибкой
        }
    });

    const dropdownLabel = document.createElement('label');
    dropdownLabel.innerText = 'Дизайнер:';
    dropdownLabel.style.display = 'block';
    dropdownLabel.style.marginBottom = '5px';
    dropdownLabel.style.fontWeight = 'bold';

    const dropdown = document.createElement('select');
    dropdown.style.width = '100%';
    dropdown.style.marginBottom = '10px';
    dropdown.style.padding = '10px';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxSizing = 'border-box';

    fetchGoogleSheetData(`${LIST_SHEET_NAME}!A:A`).then(categories => {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category[0];
            option.text = category[0];
            dropdown.add(option);
        });
    });

    const sendButton = document.createElement('button');
    sendButton.innerText = 'Отправить';
    sendButton.style.width = '100%';
    sendButton.style.padding = '10px';
    sendButton.style.backgroundColor = '#4CAF50'; // Зеленый цвет кнопки
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.fontSize = '16px';
    sendButton.style.transition = 'background-color 0.3s';

// Функция для получения даты запуска заказа
function getLaunchDate() {
    const launchDateElement = document.querySelector("#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold");
    if (launchDateElement && launchDateElement.textContent.trim()) {
        return launchDateElement.textContent.trim()
            .replace(/,/g, '')
            .replace(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье/g, '')
            .trim();
    }
    return null;
}

sendButton.addEventListener('click', async () => {
    if (sendButton.disabled) return; // Проверяем, не заблокирована ли уже кнопка

    sendButton.style.backgroundColor = '#45a049'; // Изменение цвета при нажатии
    sendButton.disabled = true; // Блокируем кнопку для предотвращения двойного нажатия

    try {
        const productId = gs_processProductId();
        const userName = getUserName();
        const productName = getProductName();
        const designerPrice = parseFloat(priceInput.value.replace(',', '.'));
        const category = dropdown.value;
        const axiomPriceElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1)');
        let axiomPriceText = '';
        if (axiomPriceElement) {
            axiomPriceText = axiomPriceElement.textContent.replace(/\s/g, '').match(/(\d+,\d+)/); // Удаляем пробелы
            axiomPriceText = axiomPriceText ? axiomPriceText[0].replace(',', '.') : null; // Заменяем запятую на точку
        }
        const axiomPrice = parseFloat(axiomPriceText);
        const launchDate = getLaunchDate();

        if (!launchDate) {
            const existingError = popup.querySelector('.error-message');
            if (!existingError) {
                const errorTable = document.createElement('table');
                errorTable.style.width = '100%';
                errorTable.style.borderCollapse = 'collapse';
                errorTable.style.marginTop = '10px';
                errorTable.style.border = '1px solid red';
                errorTable.style.borderRadius = '4px';
                const errorRow = errorTable.insertRow();
                const errorCell = errorRow.insertCell();
                errorCell.colSpan = 2;
                errorCell.style.textAlign = 'center';
                errorCell.style.color = 'red';
                errorCell.style.fontWeight = 'bold';
                errorCell.style.padding = '10px';
                errorCell.className = 'error-message';
                errorCell.innerText = 'Отправка данных только по запущенным заказам.';
                popup.appendChild(errorTable);
            }
            sendButton.disabled = false; // Разблокируем кнопку при ошибке
            return;
        }

        if (designerPrice * 1.75 <= axiomPrice) {
            const data = [
                productId,
                userName,
                productName,
                designerPrice,
                category,
                axiomPrice,
                launchDate
            ];

            const success = await writeDataToSheet(data);
            if (success) {
                const successMessage = document.createElement('p');
                successMessage.style.marginTop = '10px';
                successMessage.style.color = 'green';
                successMessage.style.fontWeight = 'bold';
                successMessage.style.textAlign = 'center';
                successMessage.innerText = 'Данные успешно загружены!';
                popup.appendChild(successMessage);

                setTimeout(() => {
                    popup.remove();
                }, 3000);

                const textarea = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea');
                if (textarea) {
                    const existingButtons = textarea.parentElement.querySelectorAll('button');
                    existingButtons.forEach(button => button.remove());
                    createCheckButton(textarea);
                }
            } else {
                sendButton.disabled = false; // Разблокируем кнопку при ошибке
            }
        } else {
            const existingError = popup.querySelector('.error-message');
            const maxDesignValue = axiomPrice/1.80;
            if (!existingError) {
                const errorTable = document.createElement('table');
                errorTable.style.width = '100%';
                errorTable.style.borderCollapse = 'collapse';
                errorTable.style.marginTop = '10px';
                errorTable.style.border = '1px solid red';
                errorTable.style.borderRadius = '4px';
                const errorRow = errorTable.insertRow();
                const errorCell = errorRow.insertCell();
                errorCell.colSpan = 2;
                errorCell.style.textAlign = 'center';
                errorCell.style.color = 'red';
                errorCell.style.fontWeight = 'bold';
                errorCell.style.padding = '10px';
                errorCell.className = 'error-message';
                errorCell.innerText = `Сумма дизайнеру не более ${Math.round(maxDesignValue)}`;
                popup.appendChild(errorTable);
            }
            sendButton.disabled = false; // Разблокируем кнопку при ошибке
        }
    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
        alert('Произошла ошибка при отправке данных.');
        sendButton.disabled = false; // Разблокируем кнопку при ошибке
    }
});
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Закрыть';
    closeButton.style.width = '100%';
    closeButton.style.padding = '10px';
    closeButton.style.marginTop = '10px';
    closeButton.style.backgroundColor = '#f44336'; // Красный цвет кнопки
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.transition = 'background-color 0.3s';

    closeButton.addEventListener('click', () => {
        closeButton.style.backgroundColor = '#d32f2f'; // Изменение цвета при нажатии
        popup.remove();
    });

    popup.appendChild(priceLabel);
    popup.appendChild(priceInput);
    popup.appendChild(dropdownLabel);
    popup.appendChild(dropdown);
    popup.appendChild(sendButton);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);
}

    // Функция для создания кнопки "Удалённый дизайн"
    function createRemoteDesignButton(textarea) {
        const remoteDesignButton = document.createElement('button');
        remoteDesignButton.innerText = 'Удалённый дизайн';
        textarea.parentElement.appendChild(remoteDesignButton);

        remoteDesignButton.addEventListener('click', async () => {
            const productId = gs_processProductId();
            if (!productId) {
                alert('Product ID не найден.');
                return;
            }

            // Добавляем класс для анимации загрузки
            remoteDesignButton.classList.add('loading-animation');
            remoteDesignButton.disabled = true;

            // Добавляем задержку в 2 секунды перед проверкой данных
            setTimeout(async () => {
                try {
                    // Проверяем, существует ли productID в таблице
                    const existsInSheet = await checkProductInSheet(productId);

                    // Удаляем все предыдущие кнопки, если они есть
                    const existingButtons = textarea.parentElement.querySelectorAll('button:not(:first-child)');
                    existingButtons.forEach(button => button.remove());

                    // Если продукт найден, создаем кнопку "Проверить данные"
                    if (existsInSheet) {
                        createCheckButton(textarea);
                    }
                    // Если продукт не найден, создаем кнопку "Заполнить"
                    else {
                        createFillButton(textarea);
                    }
                } catch (error) {
                    console.error('Ошибка при проверке productID:', error);
                    alert('Произошла ошибка при проверке данных.');
                } finally {
                    // Убираем анимацию и включаем кнопку обратно
                    remoteDesignButton.classList.remove('loading-animation');
                    remoteDesignButton.disabled = false;
                }
            }, 2000); // Задержка в 2000 миллисекунд (2 секунды)
        });
    }

// Функция для создания кнопки "Проверить данные"
function createCheckButton(textarea) {
    const checkButton = document.createElement('button');
    checkButton.innerText = 'Проверить данные';
    textarea.parentElement.appendChild(checkButton);
    let infoDivCreated = false;

    checkButton.addEventListener('click', async () => {
        const productId = gs_processProductId();

        // Получаем данные из листа Design
        const designRange = `Design!A:E`;
        const designValues = await fetchGoogleSheetData(designRange);
        const designData = designValues.find(row => row[0] === productId.toString()) || null;

        // Получаем данные из листа test
        const testRange = `test!A:H`;
        const testValues = await fetchGoogleSheetData(testRange);
        const testData = testValues.find(row => row[0] === productId.toString()) || null;

        if (designData && testData) {
            if (!infoDivCreated) {
                const infoDiv = document.createElement('div');
                infoDiv.style.color = 'green';
                infoDiv.style.marginTop = '10px';
                infoDiv.style.border = '1px solid green';
                infoDiv.style.padding = '10px';
                infoDiv.style.borderRadius = '5px';

                const table = document.createElement('table');
                table.style.width = '50%';
                table.style.borderCollapse = 'collapse';

                // Отображение оплаты дизайнеру (столбец D листа Design)
                const priceRow = table.insertRow();
                const priceLabelCell = priceRow.insertCell();
                priceLabelCell.style.fontWeight = 'bold';
                priceLabelCell.innerText = 'Оплата дизайнеру:';
                const priceValueCell = priceRow.insertCell();
                priceValueCell.innerText = `${designData[3]} руб.`;

                // Отображение дизайнера (столбец E листа Design)
                const designerRow = table.insertRow();
                const designerLabelCell = designerRow.insertCell();
                designerLabelCell.style.fontWeight = 'bold';
                designerLabelCell.innerText = 'Дизайнер:';
                const designerValueCell = designerRow.insertCell();
                designerValueCell.innerText = designData[4];

                // Отображение статуса оплаты (столбец H листа test)
                const paymentStatusRow = table.insertRow();
                const paymentStatusLabelCell = paymentStatusRow.insertCell();
                paymentStatusLabelCell.style.fontWeight = 'bold';
                paymentStatusLabelCell.innerText = 'Статус оплаты: ';
                const paymentStatusValueCell = paymentStatusRow.insertCell();
                paymentStatusValueCell.innerText = testData[7] || 'Не оплачено'; // Столбец H

                infoDiv.appendChild(table);
                checkButton.parentElement.appendChild(infoDiv);
                infoDivCreated = true;
            }
        } else {
            const errorSpan = document.createElement('span');
            errorSpan.innerText = 'Информация о продукте не найдена.';
            errorSpan.style.color = 'red';
            checkButton.parentElement.appendChild(errorSpan);
        }
    });
}

    // Функция для создания кнопки "Заполнить"
    function createFillButton(textarea) {
        const fillButton = document.createElement('button');
        fillButton.innerText = 'Заполнить';
        textarea.parentElement.appendChild(fillButton);
        fillButton.addEventListener('click', () => {
            showPopup();
        });
    }

    let buttonAdded = false;

function hideTopButtonIfRemoteDesigners() {
    // Проверяем наличие элемента с текстом "Дизайнеры на удаленке"
    const designerElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b');
    if (designerElement && designerElement.textContent.includes('Дизайнеры на удаленке')) {
        // Находим кнопку, содержащую элемент с классом "glyphicon glyphicon-picture"
        const iconElement = document.querySelector('a > .glyphicon.glyphicon-picture');

        if (iconElement) {
            const topButtonToRemove = iconElement.parentNode;

            if (topButtonToRemove) {
                topButtonToRemove.remove(); // Удаляем элемент
            }
        }
    }
}

     function checkLowCost() {
        // Проверяем текст в первом столбце
        const firstColumn = document.querySelector("#DesignList > tr > td:nth-child(1)");
        if (
            firstColumn &&
            (
                firstColumn.textContent.trim() === "Дизайнеры на удаленке (вписываем в таблицу СРАЗУ!)" ||
                firstColumn.textContent.trim() === "Дизайн Регина" ||
                firstColumn.textContent.trim() === "Дизайн Резеда"
            )
        ) {


            // Ищем элемент с ценой
            const priceElement = document.querySelector("#DesignList > tr > td.right nobr");
            if (priceElement) {
                const priceText = priceElement.textContent.trim();


                // Извлекаем числовое значение из строки "1,00 Р"
                const priceValue = parseFloat(priceText.replace(',', '.').replace(/[^0-9\.]/g, ''));

                // Проверяем значение и скрываем кнопку, если оно меньше 101
                const button = document.querySelector("#DesignBlockSummary > div > button");
                if (button) {
                    if (priceValue < 101) {
                        button.style.display = "none";
                        } else {
                        button.style.display = "";

                    }
                }
            }
        }
    }

    function observeDOMChanges() {
        const observer = new MutationObserver(async (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Проверяем наличие нужных элементов
                    const designerElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b');
                    const textarea = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea');
                    const refreshWindow = document.querySelector("#Doc");

                    // Если появился класс LoadingContent, сбрасываем флаг buttonAdded
                    if (refreshWindow && refreshWindow.classList.contains("LoadingContent")) {
                        buttonAdded = false;
                        continue; // Пропускаем остальную логику, пока идет загрузка
                    }
                       // Вызываем функцию для скрытия кнопки при необходимости
                         hideTopButtonIfRemoteDesigners();
                        checkLowCost();

                    // Если элементы существуют и текст содержит "Дизайнеры на удаленке"
                    if (designerElement && designerElement.textContent.includes('Дизайнеры на удаленке')) {
                        if (!buttonAdded) {
                            createRemoteDesignButton(textarea); // Добавляем кнопку "Удалённый дизайн"
                            buttonAdded = true;
                        }
                    } else {
                        // Если элементы исчезли, сбрасываем флаг
                        buttonAdded = false;
                    }
                }
            }
        });

        // Наблюдаем за всеми изменениями в DOM
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    observeDOMChanges();
};
newDesign();


function hideDiscounts() {
    'use strict';

    // Список пользователей, для которых блокировка НЕ выполняется
    const excludedUsers = [
        "Щёкин Александр",
        "Кандеев Рустам",
        "Галимов Адель",
        "Козлов Артём"
    ];

    // Переменная для хранения предыдущего значения текста
    let previousText = null;

    // Функция для скрытия целевого <tr>
    function hideTR() {
        // Проверяем, существует ли #vmClientForm
        const vmClientForm = document.querySelector("#vmClientForm");
        if (!vmClientForm) {
            return;
        }

        // Ищем нужный <tr> по точному CSS-селектору
        const targetTR = document.querySelector(
            "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1)"
        );

        if (!targetTR) {
            return;
        }

        // Получаем имя пользователя из меню
        const userLink = document.querySelector("body > ul > div > li:nth-child(1) > a");

        if (userLink) {
            const currentUserName = userLink.textContent.trim();

            // Если имя в списке исключений — не блокируем
            if (excludedUsers.includes(currentUserName)) {
                targetTR.style.pointerEvents = ""; // Восстанавливаем доступность
                targetTR.style.opacity = "";
                return;
            }
        }

        // Блокируем всё содержимое строки
        targetTR.style.pointerEvents = "none";
        targetTR.style.opacity = "1";

        // Разблокируем конкретную вложенную строку
        const exceptionTR = targetTR.querySelector(
            "td:nth-child(1) > table > tbody > tr:nth-child(2)"
        );

        if (exceptionTR) {
            // Разрешаем взаимодействие
            exceptionTR.style.pointerEvents = "auto";
            // Восстанавливаем нормальную видимость
            exceptionTR.style.opacity = "1";
        }
    }

    // MutationObserver для отслеживания динамических изменений в DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const vmClientForm = document.querySelector("#vmClientForm");

            if (vmClientForm) {
                // Отслеживаем изменение текста в конкретном месте
                const textElement = document.querySelector(
                    "#vmClientForm > div:nth-child(1) > table > tbody > tr > td:nth-child(1) > p"
                );

                if (textElement) {
                    const currentText = textElement.textContent.trim();

                    if (currentText !== previousText) {
                        previousText = currentText;
                        hideTR(); // Вызываем блокировку нужного TR
                    }
                }
            }
        });
    });

    // Начинаем наблюдать за изменениями в DOM
    observer.observe(document.body, { childList: true, subtree: true });
}

// Вызов функции
hideDiscounts();


function zoomIzdelia() {
    'use strict';

    // Функция для проверки, находится ли элемент в видимой части экрана
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Функция для применения зум эффекта
    function applyZoomEffect(containers) {
        containers.forEach((container) => {
            const backgroundImage = container.style.backgroundImage;

            // Проверяем, есть ли background-image и находится ли элемент в видимой области
            if (backgroundImage && backgroundImage.includes('url') && isElementInViewport(container)) {
                // Проверяем, не был ли уже применён обработчик
                if (!container.dataset.zoomApplied) {
                    container.dataset.zoomApplied = true; // Помечаем элемент как обработанный

                    // Добавляем зум эффект при наведении
                    container.addEventListener('mouseenter', () => {
                        container.style.transform = 'scale(1.1)';
                        container.style.transition = 'transform 0.3s ease';
                    });

                    container.addEventListener('mouseleave', () => {
                        container.style.transform = 'scale(1)';
                    });
                }
            }
        });
    }

    // Функция для инициализации MutationObserver
    function initObserver() {
        const utList = document.querySelector("#UtList");
        if (!utList) return;

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const newContainers = Array.from(
                        utList.querySelectorAll("div.rubricator > a")
                    ).filter((container) => !container.dataset.zoomApplied);

                    applyZoomEffect(newContainers);
                }
            }
        });

        // Начинаем наблюдать за изменениями внутри #UtList
        observer.observe(utList, { childList: true, subtree: true });
    }

    // Дебаунсинг для обработчика прокрутки
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Обновляем эффект при прокрутке страницы
    const handleScroll = debounce(() => {
        const utList = document.querySelector("#UtList");
        if (utList) {
            const containers = Array.from(
                utList.querySelectorAll("div.rubricator > a")
            ).filter((container) => !container.dataset.zoomApplied);

            applyZoomEffect(containers);
        }
    }, 150); // Задержка в 150 мс

    // Инициализация
    window.addEventListener('scroll', handleScroll);
    initObserver();

    // Применяем зум к начальным видимым элементам
    const utList = document.querySelector("#UtList");
    if (utList) {
        applyZoomEffect(utList.querySelectorAll("div.rubricator > a"));
    }
}

zoomIzdelia();

function fixOrderList() {
    'use strict';

    // Функция для применения стилей
    function applyStyles() {
        const targetElements = document.querySelectorAll('#ManagerList > div > div.ax-table-body');
        targetElements.forEach(element => {
            element.style.display = 'table-cell';
            element.style.padding = '4px 12px 4px 25px';
            element.style.width = '100%';
        });
    }

    // Функция для запуска наблюдателя за #ManagerList
    function observeManagerList() {
        const managerList = document.querySelector('#ManagerList');

        if (managerList) {
            const observer = new MutationObserver(() => {
                applyStyles();
            });

            observer.observe(managerList, { childList: true, subtree: true });
            applyStyles(); // Применяем стили сразу при загрузке
        }
    }

    // Главный наблюдатель за динамическим появлением/исчезанием #ManagerList
    const mainObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Проверяем наличие #ManagerList после каждого изменения
                observeManagerList();
            }
        }
    });

    // Наблюдаем за <body> или другим корневым элементом
    const bodyElement = document.querySelector('body');
    if (bodyElement) {
        mainObserver.observe(bodyElement, { childList: true, subtree: true });
    }
}
fixOrderList();


function titleOrder() {
 'use strict';

    let originalTitle = document.title; // Сохраняем оригинальный заголовок страницы

    // Функция для обновления заголовка страницы
    function updateTitle(orderId) {
        if (orderId) {
            document.title = `Заказ №${orderId} | ${originalTitle}`;
        } else {
            document.title = originalTitle; // Возвращаемся к исходному заголовку
        }
    }



    // Функция для отслеживания элемента
    function observeProductId() {
        const observer = new MutationObserver((mutationsList) => {
            let currentOrderId = null;

            // Проверяем текущее значение ProductId
            const productIdElement = document.querySelector('#ProductId');
            if (productIdElement) {
                currentOrderId = productIdElement.textContent.trim();
            }

            // Обновляем заголовок страницы
            updateTitle(currentOrderId);


        });

        // Начинаем наблюдать за body или определенным контейнером
        const targetNode = document.body;
        const config = { childList: true, subtree: true, characterData: true, attributes: true };
        observer.observe(targetNode, config);
    }

    // Запускаем наблюдение
    observeProductId();
}
titleOrder();


function dynamicTooltip() {
    'use strict';

    // Функция для создания тултипа
    function createTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Полупрозрачный черный фон
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px'; // Фиксированный отступ в 5 пикселей
        tooltip.style.borderRadius = '5px';
        tooltip.style.zIndex = '10000';
        tooltip.style.opacity = '0'; // Начальная прозрачность
        tooltip.style.transition = 'opacity 0.3s ease'; // Плавное появление
        tooltip.style.maxWidth = `${window.innerWidth * 0.3}px`; // Максимальная ширина - 30% от ширины экрана
        tooltip.style.wordWrap = 'break-word'; // Перенос слов
        tooltip.style.whiteSpace = 'normal'; // Разрешение переноса текста
        tooltip.style.textAlign = 'center'; // Центрирование текста
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // Функция для позиционирования тултипа
    function positionTooltip(tooltip, target) {
        const rect = target.getBoundingClientRect();
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
        tooltip.style.left = `${rect.left + window.scrollX + (rect.width - tooltip.offsetWidth) / 2}px`;
    }

    // Основная функция для обработки целевого элемента
    function handleImageElement(imgElement) {
        let tooltipMessage = null;

        // Проверка изображений в StopIcon
        if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon')) {
            if (imgElement.src.includes('/img/stop/1.png')) {
                tooltipMessage = 'Заказ остановлен, ответственный менеджер заказа';
            } else if (
                imgElement.src.includes('/img/stop/2.png') ||
                imgElement.src.includes('/img/stop/3.png') ||
                imgElement.src.includes('/img/stop/4.png') ||
                imgElement.src.includes('/img/stop/5.png') ||
                imgElement.src.includes('/img/stop/6.png') ||
                imgElement.src.includes('/img/stop/7.png')
            ) {
                tooltipMessage = 'Заказ остановлен на производстве,\nответственный руководитель участка';
            }
        }

        // Проверка изображений в PaySchemaIcon
       // if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon')) {
       //     if (imgElement.src.includes('/img/payschema/payschema-2.png')) {
       //         tooltipMessage = 'Заказ в работу запущен,\nдоставка/выдача после оплаты';
       //     } else if (imgElement.src.includes('/img/payschema/payschema-1.png')) {
       //         tooltipMessage = 'Заказ в работу запущен,\nпечать только после оплаты';
       //     }
       // }

        // Проверка изображений в StatusIcon
        if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon')) {
            if (imgElement.src.includes('/img/status/lock-print.png')) {
                tooltipMessage = 'Заказ поступил в печать';
            } else if (imgElement.src.includes('/img/status/lock.png')) {
                tooltipMessage = 'С заказом работает препресс,\nпри пересчете согласовывать';
            } else if (imgElement.src.includes('/img/status/status-files.png')) {
                tooltipMessage = 'Принят в работу с макетом';
            } else if (imgElement.src.includes('/img/status/status-nofiles.png')) {
                tooltipMessage = 'Принят в работу без макета';
            } else if (imgElement.src.includes('/img/status/status-pack.png')) {
                tooltipMessage = 'Заказ упакован';
            } else if (imgElement.src.includes('/img/status/status-postpress-ready.png')) {
                tooltipMessage = 'Препресс не требуется';
            } else if (imgElement.src.includes('/img/status/status-prepress-layout.png')) {
                tooltipMessage = 'Препресс выполнен';
            } else if (imgElement.src.includes('/img/status/urgent.png')) {
                tooltipMessage = 'Готовность заказа раньше\nрасчетного срока';
            } else if (imgElement.src.includes('/img/status/status-prepress-ctp.png')) {
                tooltipMessage = 'Формы готовы';
            } else if (imgElement.src.includes('/img/status/status-calc.png')) {
                tooltipMessage = 'Расчёт без макета';
            } else if (imgElement.src.includes('/img/status/status-calc-files.png')) {
                tooltipMessage = 'Расчёт с файлами';
            } else if (imgElement.src.includes('/img/status/status-pack-tomove.png')) {
                tooltipMessage = 'Заказ упакован, не в точке выдачи заказа';
            } else if (imgElement.src.includes('/img/status/status-pack-onmove.png')) {
                tooltipMessage = 'Заказ упакован, в перемещении';
            } else if (imgElement.src.includes('/img/status/status-print.png')) {
                tooltipMessage = 'Заказ отпечатан';
            } else if (imgElement.src.includes('img/status/status-prepress-check.png')) {
                tooltipMessage = 'Проверека препрессом';
            } else if (imgElement.src.includes('img/status/status-print.png')) {
                tooltipMessage = 'Заказ отпечатан';
            } else if (imgElement.src.includes('img/status/status-close.png')) {
                tooltipMessage = 'Заказ выдан';
            }
        }

        if (tooltipMessage) {
            // Создаем тултип
            const tooltip = createTooltip(tooltipMessage);

            // Добавляем обработчики событий для показа/скрытия тултипа
            imgElement.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
                positionTooltip(tooltip, imgElement);
                setTimeout(() => {
                    tooltip.style.opacity = '1'; // Плавное появление
                }, 10); // Небольшая задержка для корректной анимации
            });

            imgElement.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0'; // Плавное исчезновение
                setTimeout(() => {
                    tooltip.style.display = 'none'; // Скрываем тултип после завершения анимации
                }, 300); // Время анимации (0.3s)
            });
        }
    }

    // Функция для проверки существующих элементов
    function checkExistingElements() {
        // Проверяем элементы StatusIcon
        const statusIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img');
        statusIcons.forEach((imgElement) => {
            handleImageElement(imgElement);
        });

        // Проверяем элементы StopIcon
        const stopIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img');
        stopIcons.forEach((imgElement) => {
            handleImageElement(imgElement);
        });

        // Проверяем элементы PaySchemaIcon
       // const paySchemaIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img');
       // paySchemaIcons.forEach((imgElement) => {
       //     handleImageElement(imgElement);
       // });
    }

    // Инициализация MutationObserver
    function init() {
        // Проверяем существующие элементы при загрузке страницы
        checkExistingElements();

        // Настройка MutationObserver для отслеживания изменений в DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Проверяем добавленные элементы StatusIcon
                        const statusIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img')
                            ? node
                            : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img');
                        if (statusIconImg) {
                            handleImageElement(statusIconImg);
                        }

                        // Проверяем добавленные элементы StopIcon
                        const stopIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img')
                            ? node
                            : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img');
                        if (stopIconImg) {
                            handleImageElement(stopIconImg);
                        }

                        // Проверяем добавленные элементы PaySchemaIcon
                        //const paySchemaIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img')
                        //    ? node
                        //    : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img');
                        //if (paySchemaIconImg) {
                        //    handleImageElement(paySchemaIconImg);
                        //}
                    }
                });
            });
        });

        // Начинаем наблюдение за изменениями в DOM
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Запускаем инициализацию
    init();
}

dynamicTooltip();
     function buhToolTip() {
    'use strict';

    // === Внедрение стилей для плавного появления конкретного меню ===
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Прячем выпадающее меню по умолчанию */
            #Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown > ul {
                display: block;
                opacity: 0;
                transform: scaleY(0.95);
                transform-origin: top;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                background-color: white;
                border: 1px solid #ccc;
                min-width: 160px;
                z-index: 9999;
                position: absolute;
                margin-top: 4px;
                pointer-events: none;
            }

            /* Класс для анимации появления */
            #Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown > ul.animate {
                opacity: 1;
                transform: scaleY(1);
                pointer-events: auto;
            }
        `;
        document.head.appendChild(style);

    }

    // === Tooltip ===
    let tooltipEl = null;

    function createTooltip() {
        if (tooltipEl) return;
        tooltipEl = document.createElement('div');
        tooltipEl.innerText = "Невозможно выставить документ на некорректный счет. Устраните ошибки в счете или обратитесь в бухгалтерию.";
        tooltipEl.style.cssText = `
            position: fixed;
            z-index: 9999999;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            max-width: 300px;
            word-wrap: break-word;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s;
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

    // === Обработка меню ===
    function processDropdownMenu() {
        const invoiceList = document.querySelector("#InvoiceProductList");
        const clientChosen = document.querySelector("#Client_chosen > a");

        if (!invoiceList) {

            return;
        }

        const actItem = document.querySelector("#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown.open > ul > li:nth-child(3)");
        const upduItem = document.querySelector("#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown.open > ul > li:nth-child(4)");

        // Скрытие "Акт"
        if (actItem && actItem.innerText.trim() === "Акт") {
            actItem.style.display = 'none';

        }

        // Обработка "УПД"
        if (upduItem && clientChosen) {
            if (!upduItem.dataset.tooltipListenerAdded) {
                // Tooltip
                upduItem.addEventListener('mouseenter', e => {
                    showTooltip(e.pageX, e.pageY);
                });
                upduItem.addEventListener('mouseleave', hideTooltip);
                upduItem.addEventListener('mousemove', e => {
                    showTooltip(e.pageX, e.pageY);
                });

                // Блокируем клик по "УПД"
                const clickBlocker = (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                };
                upduItem.addEventListener('click', clickBlocker);

                // === Блокируем само подменю ===
                const subMenu = upduItem.querySelector('ul.dropdown-menu');
                if (subMenu) {
                    subMenu.style.display = 'none'; // Прячем подменю
                    subMenu.style.pointerEvents = 'none'; // Запрещаем взаимодействие

                    // Убираем класс, чтобы оно не работало как dropdown-submenu
                    if (subMenu.parentElement?.classList.contains('dropdown-submenu')) {
                        subMenu.parentElement.classList.remove('dropdown-submenu');

                    }
                }

                upduItem.dataset.tooltipListenerAdded = "true";
                upduItem.dataset.blocked = "true";

                // Визуальная подсказка
                upduItem.style.opacity = '0.6';
                upduItem.style.cursor = 'not-allowed';

            }
        }
    }

    // === Ждём открытия меню и запускаем анимацию ===
    function waitForDropdownAndProcess() {
        const dropdown = document.querySelector("#Doc > div.bigform > div:nth-child(2) > div.btn-group.btn-group-sm.dropdown");

        if (dropdown) {
            const menu = dropdown.querySelector("ul");

            // Открытие меню
            dropdown.classList.add("open");

            if (menu) {
                // Сброс предыдущей анимации
                menu.classList.remove("animate");
                void menu.offsetWidth; // триггер reflow

                // === СКРЫТИЕ ПУНКТОВ ПРЯМО ПРИ ОТКРЫТИИ ===
                processDropdownMenu();

                // Анимация
                setTimeout(() => {
                    menu.classList.add("animate");
                }, 0);
            }

            // Один раз добавляем обработчик для закрытия при клике вне
            if (!dropdown.dataset.outsideClickListenerSet) {
                setupOutsideClickHandler(menu);
                dropdown.dataset.outsideClickListenerSet = "true";
            }
        }
    }

    // === Закрытие меню при клике вне его ===
    function setupOutsideClickHandler(menuElement) {
        document.addEventListener("click", function (e) {
            const dropdown = menuElement.closest(".dropdown");

            // Если клик НЕ по меню и НЕ по кнопке dLabel
            if (!dropdown.contains(e.target) && !e.target.matches("#dLabel")) {
                dropdown.classList.remove("open");
                menuElement.classList.remove("animate"); // Сбрасываем анимацию

            }
        });
    }

    // === Наблюдатель за появлением #dLabel ===
    function observeDLabel() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(() => {
                const dLabel = document.querySelector("#dLabel");

                if (dLabel && !dLabel.dataset.dLabelListenerAdded) {


                    dLabel.addEventListener("click", () => {

                        setTimeout(waitForDropdownAndProcess, 0);
                    });

                    dLabel.dataset.dLabelListenerAdded = "true";
                } else if (!dLabel) {

                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

    }

    // === Запуск ===
    injectStyles();
    createTooltip();
    observeDLabel();
}

buhToolTip();



     function notHalfButton() {
    'use strict';

    const GOOGLE_SHEETS_API_KEY = "AIzaSyD-gPXmq0YOL3WXjQ8jub9g5_xyx2PfOZU";
    const SPREADSHEET_ID = "1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY";
    const SHEET_NAME = "notHalf";
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGHhoKoSgdS5_nbtK6HKXo5oJrDyFNVyixNApdjS8HcsFy6w2u4-M7XMJ6d93ik0Yo/exec";

    function checkAndCreateButton() {
        const topButtons = document.querySelector("#TopButtons");
        const chatManager = document.querySelector("#ChatManager");
        const labelForDescription = document.querySelector("#LabelForDescription");

        if (!topButtons) return;

        // Если кнопка уже есть — не делаем ничего
        if (topButtons.querySelector("button[data-not-half]")) return;

        let showButton = false;
        let managerNameElement = null;
        let summaryNameElement = null;

        if (chatManager) {
            // Сценарий #ChatManager
            managerNameElement = document.querySelector("body > ul > div > li:nth-child(1) > a");
            summaryNameElement = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > div > a > span");

            if (managerNameElement && summaryNameElement) {
                const managerText = managerNameElement.textContent.trim(); // Фамилия Имя
                const summaryText = summaryNameElement.textContent.trim(); // Имя Отчество Фамилия

                const managerSurname = managerText.split(" ")[0];
                const summaryParts = summaryText.split(" ");
                const summarySurname = summaryParts[summaryParts.length - 1];

                showButton = managerSurname === summarySurname;
            }

        } else if (labelForDescription) {
            // Сценарий #LabelForDescription
            managerNameElement = document.querySelector("#Manager_chosen > a > span"); // Имя Фамилия
            summaryNameElement = document.querySelector("body > ul > div > li:nth-child(1) > a"); // Фамилия Имя

            if (managerNameElement && summaryNameElement) {
                const managerText = managerNameElement.textContent.trim();
                const summaryText = summaryNameElement.textContent.trim();

                const managerSurname = managerText.split(" ")[1];
                const summarySurname = summaryText.split(" ")[0];


                showButton = managerSurname === summarySurname;
            }
        }

        if (!showButton) {
            return;
        }

        const productId = gs_processProductId();
        if (productId) {
            createNotHalfButton();
        }
    }

    function gs_processProductId() {
        if (document.querySelector("#LabelForDescription")) {
            const productIdElement = document.querySelector("#Doc > div.form-group > div > div > span:nth-child(1)");
            return productIdElement ? productIdElement.textContent.trim() : null;
        } else {
            const productIdElement = document.querySelector("#ProductId");
            return productIdElement ? productIdElement.textContent.trim() : null;
        }
    }

    function createNotHalfButton() {
        const topButtons = document.querySelector("#TopButtons");
        const button = document.createElement("button");
        button.setAttribute("data-not-half", "true");
        button.style.cssText = `
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: rgba(0,0,0,0);
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            border-spacing: 0;
            border-collapse: collapse;
            box-sizing: border-box;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 0;
            font-weight: 400;
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
            touch-action: manipulation;
            cursor: pointer;
            user-select: none;
            border: 1px solid transparent;
            color: #333;
            background-color: #fff;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075);
            text-shadow: 0 1px 0 #fff;
            background-image: linear-gradient(to bottom, #fff 0, #e0e0e0 100%);
            background-repeat: repeat-x;
            border-color: #ccc;
            padding: 5px 10px;
            font-size: 12px;
            line-height: 1.5;
            position: relative;
            float: left;
            margin-left: 0;
            border-radius: 0;
        `;
        button.textContent = "Не пополам";
        button.addEventListener("mousedown", () => {
            button.style.border = "1px solid black";
        });
        button.addEventListener("mouseup", () => {
            button.style.border = "none";
        });
        button.addEventListener("click", showPercentageModal);
        topButtons.appendChild(button);
    }

    function createActionButton(text, bgColor, isSpecial = false) {
        const button = document.createElement("button");
        button.textContent = text;
        let commonStyles = `
            width: 100%;
            padding: 10px;
            margin-top: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
            box-sizing: border-box;
        `;
        if (isSpecial === "allToMe") {
            button.style.cssText = `
                ${commonStyles}
                color: #333;
                background-image: linear-gradient(to bottom, #f0fff0 0, #d0ecd0 100%);
                background-repeat: repeat-x;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075);
                text-shadow: 0 1px 0 #fff;
                border-color: #ccc;
            `;
        } else if (isSpecial === "allToOther") {
            button.style.cssText = `
                ${commonStyles}
                color: #333;
                background-image: linear-gradient(to bottom, #faebd7 0, #e0d3b5 100%);
                background-repeat: repeat-x;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075);
                text-shadow: 0 1px 0 #fff;
                border-color: #ccc;
            `;
        } else if (bgColor === "red") {
            button.style.cssText = `
                ${commonStyles}
                color: white;
                background-color: red;
            `;
        } else {
            button.style.cssText = `
                ${commonStyles}
                color: #333;
                background-color: #fff;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075);
                text-shadow: 0 1px 0 #fff;
                background-image: linear-gradient(to bottom, #fff 0, #e0e0e0 100%);
                background-repeat: repeat-x;
                border-color: #ccc;
            `;
        }
        button.addEventListener("mousedown", () => {
            button.style.border = "1px solid black";
        });
        button.addEventListener("mouseup", () => {
            button.style.border = "none";
        });
        return button;
    }

    function showPercentageModal() {
        const productId = gs_processProductId();
        if (!productId) {
            alert("Не удалось получить ProductId!");
            return;
        }
        const loadingPopup = createLoadingPopup();
        document.body.appendChild(loadingPopup);
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            loadingPopup.querySelector(".loading-message").textContent = `Проверка${".".repeat(dotCount)}`;
        }, 300);
        checkIfProductIdExists(productId)
            .then((exists) => {
                clearInterval(dotInterval);
                loadingPopup.remove();
                if (exists) {
                    showInfoPopup("Данные уже внесены!", "red");
                    return;
                }
                const popup = document.createElement("div");
                popup.style.position = "fixed";
                popup.style.top = "50%";
                popup.style.left = "50%";
                popup.style.transform = "translate(-50%, -50%)";
                popup.style.padding = "20px";
                popup.style.backgroundColor = "#f9f9f9";
                popup.style.border = "1px solid #ddd";
                popup.style.borderRadius = "8px";
                popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                popup.style.zIndex = "1000";
                popup.style.width = "300px";
                const title = document.createElement("div");
                title.textContent = "Выберите действие:";
                title.style.fontWeight = "bold";
                title.style.textAlign = "center";
                title.style.marginBottom = "15px";
                title.style.fontSize = "16px";
                popup.appendChild(title);
                const buttonAllToMe = createActionButton("Вся премия мне", null, "allToMe");
                buttonAllToMe.addEventListener("click", () => handleAutoSend(popup, 100, 0));
                popup.appendChild(buttonAllToMe);
                const buttonAllToOther = createActionButton("Вся премия другому менеджеру", null, "allToOther");
                buttonAllToOther.addEventListener("click", () => handleAutoSend(popup, 0, 100));
                popup.appendChild(buttonAllToOther);
                const buttonManual = createActionButton("Указать кому сколько вручную");
                buttonManual.addEventListener("click", () => {
                    popup.remove();
                    showManualInputPopup();
                });
                //popup.appendChild(buttonManual);
                const buttonClose = createActionButton("Закрыть", "red");
                buttonClose.addEventListener("click", () => popup.remove());
                popup.appendChild(buttonClose);
                document.body.appendChild(popup);
            })
            .catch((error) => {
                clearInterval(dotInterval);
                loadingPopup.remove();
                console.error("Error:", error);
                showInfoPopup("Ошибка при проверке данных", "red");
            });
    }

    function handleAutoSend(popup, managerPercentage, remainingPercentage) {
        const productId = gs_processProductId();
        if (!productId) {
            alert("Не удалось получить ProductId!");
            return;
        }
        popup.remove();
        const loadingPopup = createLoadingPopup();
        document.body.appendChild(loadingPopup);
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            loadingPopup.querySelector(".loading-message").textContent = `Загрузка${".".repeat(dotCount)}`;
        }, 300);
        checkIfProductIdExists(productId)
            .then((exists) => {
                if (exists) {
                    clearInterval(dotInterval);
                    loadingPopup.remove();
                    showInfoPopup("Данные уже внесены!", "red");
                } else {
                    return sendToGoogleAppsScript(productId, `${managerPercentage}%`, `${remainingPercentage}%`)
                        .then(() => {
                            clearInterval(dotInterval);
                            loadingPopup.remove();
                            showInfoPopup("Данные успешно отправлены!", "green");
                        })
                        .catch((error) => {
                            clearInterval(dotInterval);
                            loadingPopup.remove();
                            console.error("Error:", error);
                            showInfoPopup("Ошибка при отправке данных", "red");
                        });
                }
            })
            .catch((error) => {
                clearInterval(dotInterval);
                loadingPopup.remove();
                console.error("Error:", error);
                showInfoPopup("Ошибка при проверке данных", "red");
            });
    }

    function showManualInputPopup() {
        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.padding = "20px";
        popup.style.backgroundColor = "#f9f9f9";
        popup.style.border = "1px solid #ddd";
        popup.style.borderRadius = "8px";
        popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        popup.style.zIndex = "1000";
        popup.style.width = "300px";
        const percentageLabel = document.createElement("label");
        percentageLabel.innerText = "Процент премии мне";
        percentageLabel.style.display = "block";
        percentageLabel.style.marginBottom = "5px";
        percentageLabel.style.fontWeight = "bold";
        percentageLabel.style.textAlign = "center";
        popup.appendChild(percentageLabel);
        const percentageInput = document.createElement("input");
        percentageInput.type = "text";
        percentageInput.value = "50";
        percentageInput.style.width = "100%";
        percentageInput.style.padding = "10px";
        percentageInput.style.marginTop = "10px";
        percentageInput.style.marginBottom = "10px";
        percentageInput.style.border = "1px solid #ccc";
        percentageInput.style.borderRadius = "4px";
        percentageInput.style.boxSizing = "border-box";
        percentageInput.style.textAlign = "center";
        popup.appendChild(percentageInput);
        const okButton = createActionButton("OK");
        okButton.addEventListener("click", () => handleOk(popup, percentageInput.value));
        popup.appendChild(okButton);
        const backButton = createActionButton("Назад", "red");
        backButton.addEventListener("click", () => {
            popup.remove();
            showPercentageModal();
        });
        popup.appendChild(backButton);
        document.body.appendChild(popup);
    }

    function handleOk(popup, percentageInput) {
        const productId = gs_processProductId();
        if (!productId) {
            alert("Не удалось получить ProductId!");
            return;
        }
        const percentage = parseFloat(percentageInput.replace(/%/g, ""));
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            alert("Неверное значение процента!");
            return;
        }
        popup.remove();
        const loadingPopup = createLoadingPopup();
        document.body.appendChild(loadingPopup);
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            loadingPopup.querySelector(".loading-message").textContent = `Загрузка${".".repeat(dotCount)}`;
        }, 300);
        checkIfProductIdExists(productId)
            .then((exists) => {
                if (exists) {
                    clearInterval(dotInterval);
                    loadingPopup.remove();
                    showInfoPopup("Данные уже внесены!", "red");
                } else {
                    return sendToGoogleAppsScript(productId, `${percentage}%`, `${(100 - percentage)}%`)
                        .then(() => {
                            clearInterval(dotInterval);
                            loadingPopup.remove();
                            showInfoPopup("Данные успешно отправлены!", "green");
                        })
                        .catch((error) => {
                            clearInterval(dotInterval);
                            loadingPopup.remove();
                            console.error("Error:", error);
                            showInfoPopup("Ошибка при отправке данных", "red");
                        });
                }
            })
            .catch((error) => {
                clearInterval(dotInterval);
                loadingPopup.remove();
                console.error("Error:", error);
                showInfoPopup("Ошибка при проверке данных", "red");
            });
    }

    function createLoadingPopup() {
        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.padding = "20px";
        popup.style.backgroundColor = "#f9f9f9";
        popup.style.border = "1px solid #ddd";
        popup.style.borderRadius = "8px";
        popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        popup.style.zIndex = "1000";
        const message = document.createElement("div");
        message.className = "loading-message";
        message.style.textAlign = "center";
        message.style.fontWeight = "bold";
        message.style.color = "grey";
        message.textContent = "Загрузка";
        popup.appendChild(message);
        document.body.appendChild(popup);
        return popup;
    }

    function showInfoPopup(messageText, color) {
        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.padding = "20px";
        popup.style.backgroundColor = "#f9f9f9";
        popup.style.border = "1px solid #ddd";
        popup.style.borderRadius = "8px";
        popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        popup.style.zIndex = "1000";
        const message = document.createElement("div");
        message.style.textAlign = "center";
        message.style.fontWeight = "bold";
        message.style.color = color;
        message.textContent = messageText;
        popup.appendChild(message);
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 2500);
    }

    function checkIfProductIdExists(productId) {
        return new Promise((resolve, reject) => {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${GOOGLE_SHEETS_API_KEY}`;
            GM_xmlhttpRequest({
                method: "GET",
                url,
                onload: function (response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const values = data.values || [];
                        const exists = values.some(row => row[0] === productId);
                        resolve(exists);
                    } catch (error) {
                        reject(new Error("Failed to parse response"));
                    }
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    }

function sendToGoogleAppsScript(productId, managerPercentage, remainingPercentage) {
    return new Promise((resolve, reject) => {
        const url = `${APPS_SCRIPT_URL}?sheet=notHalf&action=append&productId=${encodeURIComponent(productId)}&managerPercentage=${encodeURIComponent(managerPercentage)}&remainingPercentage=${encodeURIComponent(remainingPercentage)}`;

        GM_xmlhttpRequest({
            method: "POST",
            url,
            headers: {
                // Меняем на правильный Content-Type для POST без тела
                "Content-Type": "application/x-www-form-urlencoded"
            },
            // Можно оставить пустое тело, так как данные в URL
            data: "",  // обязательно, если требуется тело запроса
            onload: function(response) {
                if (response.status === 200 && response.responseText === "success") {
                    resolve();
                } else {
                    reject(new Error(`Server error: ${response.status}, ${response.responseText}`));
                }
            },
            onerror: function(error) {
                reject(error);
            }
        });
    });
}

    const observer = new MutationObserver(checkAndCreateButton);
    observer.observe(document.body, { childList: true, subtree: true });

    checkAndCreateButton();
}

// notHalfButton();
function mgiDisCheck() {
    'use strict';



    // Функция для скрытия элемента, если он существует
    function hideElement(selector) {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'none';
    }

    // Функция для отображения элемента
    function showElement(selector) {
        const el = document.querySelector(selector);
        if (el) el.style.display = '';
    }

    // Основная функция проверки
    function runFullCheck() {
        const chatManager = document.getElementById('ChatManager');
        if (!chatManager) {

            return;
        }

        // Сбрасываем отображение кнопок перед новой проверкой
        showElement("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)");
        showElement("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)");
        showElement("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right");

        // 1. Проверка .formblock.OrderXXXXXX на наличие "МГИ"
        const allFormBlocks = document.querySelectorAll('.formblock');
        const relevantBlocks = Array.from(allFormBlocks).filter(block =>
            Array.from(block.classList).some(className => /^Order\d+$/.test(className))
        );

        const hasMGIInFormblocks = relevantBlocks.some(block => {
            const text = block.textContent || block.innerText;
            return text.includes('МГИ');
        });

        // 2. Проверка #DesignBlockSummary через td внутри tr
        const designSummary = document.querySelector("#DesignBlockSummary");
        let hasMGIInSummary = false;

        if (designSummary) {
            const tds = designSummary.querySelectorAll("tr td");
            for (const td of tds) {
                const text = td.textContent || td.innerText;
                if (/МГИ/i.test(text)) {
                    hasMGIInSummary = true;
                    break;
                }
            }
        }



        // 3. Проверка исключения: строка с особым текстом в #History
        const historyTable = document.querySelector("#History > table:nth-child(1)");
        let excludeHiding = false;

        if (historyTable) {
            const tds = historyTable.querySelectorAll("td");
            for (const td of tds) {
                const text = td.textContent.trim();
                if (text.includes("Макет подходит под MGI, БЕСПЛАТНАЯ ПРОВЕРКА, Менеджер")) {
                    excludeHiding = true;
                    break;
                }
            }
        }

        if (excludeHiding) {

            return;
        }

        // 4. Проверка таблицы #History > table:nth-child(1)
        if (!historyTable) {

            return;
        }

        const rows = historyTable.querySelectorAll("tr");
        let foundMGIRow = false;
        let nobrHasContent = false;

        const historyKeywords = [/МГИ/i, /MGI/i, /Регина/i, /Резеда/i];

        for (const row of rows) {
            const tds = row.querySelectorAll("td");
            let containsKeyword = false;

            for (const td of tds) {
                const text = td.textContent.trim();
                if (historyKeywords.some(regex => regex.test(text))) {
                    containsKeyword = true;
                    break;
                }
            }

            if (containsKeyword) {
                foundMGIRow = true;

                const targetTd = row.querySelector("td.right.bold");
                const nobr = targetTd ? targetTd.querySelector("nobr") : null;
                const nobrText = nobr ? nobr.textContent.trim() : '';

                if (nobr && nobrText !== '') {
                    nobrHasContent = true;
                } else {
                    nobrHasContent = false;
                }
            }
        }

        // Новая логика вывода для истории + скрытие кнопок
        if (hasMGIInFormblocks) {
            if (!foundMGIRow) {

                hideElement("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right");
                hideElement("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)");
                hideElement("#workWithFilesBtn");

            } else if (foundMGIRow && !nobrHasContent) {

                hideElement("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right");
                hideElement("#workWithFilesBtn");

            } else if (foundMGIRow && nobrHasContent) {

            }
        }
    }

    // Отслеживаем появление ChatManager
    const observer = new MutationObserver(() => {
        const chatManager = document.getElementById('ChatManager');
        if (chatManager) {

            runFullCheck();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

}
mgiDisCheck();

function hideFin () {
    'use strict';

    const selectors = {
        btnDebt: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > div.btn-group > button:nth-child(3)",
        btnSave: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > div.btn-group > button.btn.btn-success",
        tr6: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(6)",
        tr5: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(5)",
        tr4: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(4)",
        tr3: "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3) > table > tbody > tr:nth-child(3)",
    };

    function manipulateRows(hideTr5 = false) {
        // Блокируемые строки (всё кроме tr5)
        [selectors.tr3, selectors.tr4, selectors.tr6].forEach(selector => {
            const row = document.querySelector(selector);
            if (row) {
                row.style.pointerEvents = hideTr5 ? '' : 'none';
            }
        });

        // Скрываемая строка (tr5)
        const row5 = document.querySelector(selectors.tr5);
        if (row5) {
            row5.style.display = hideTr5 ? '' : 'none';
        }
    }

    function hideCreditOption() {
        const listboxContainers = document.querySelectorAll('[id$="__listbox"]');

        listboxContainers.forEach(container => {
            const creditLi = Array.from(container.querySelectorAll('li')).find(li =>
                li.textContent.trim() === 'Кредит'
            );

            if (creditLi) {
                creditLi.style.display = 'none';
            }
        });
    }

    function checkElements() {
        const debtBtn = document.querySelector(selectors.btnDebt);
        const saveBtn = document.querySelector(selectors.btnSave);

        if (debtBtn && saveBtn) {
            manipulateRows(false); // Заблокировать и скрыть
            hideCreditOption();
        } else {
            manipulateRows(true); // Разрешить всё
        }
    }

    function setupObserver() {
        const observer = new MutationObserver(() => {
            checkElements();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function startPollingCreditOption(interval = 1000) {
        setInterval(() => {
            hideCreditOption();
        }, interval);
    }

    // Инициализация
    checkElements();
    setupObserver();
    startPollingCreditOption();

}

hideFin();


     // Умный поиск коробок и пакетов
function smartSerch() {
    'use strict';

    // Допуски по типу изделия
    const TOLERANCES = {
        BOX: { MINUS: 10, PLUS: 20 },
        PACKAGE: { MINUS: 10, PLUS: 40 },
        KONVERT: { MINUS: 10, PLUS: 15 },
        PAPKA: { MINUS: 10, PLUS: 40 }
    };

    // ID Google Sheets и листы
    const SHEET_ID = "1Of-dn4FcXTga_a3-9dJfBd5IrQ2pES6GAhpbVHYrAhI";
    const SHEETS = {
        BOX: {
            name: "Korobka",
            title: "коробки",
            icon: "📦",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Korobka`
        },
        PACKAGE: {
            name: "Paket",
            title: "пакеты",
            icon: "🛍️",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Paket`
        },
        KONVERT: {
            name: "Konvert",
            title: "конверты",
            icon: "✉️",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Konvert`
        },
        PAPKA: {
            name: "Papka",
            title: "папки",
            icon: "📁",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Papka`
        }
    };

    // Стили модального окна
    const style = document.createElement("style");
    style.innerHTML = `
        .box-picker-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .box-picker-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            padding: 0;
            width: 500px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            scroll-behavior: smooth;
        }
        /* Кастомный скролл */
        .box-picker-content::-webkit-scrollbar {
            width: 8px;
        }
        .box-picker-content::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
            margin: 12px 0;
        }
        .box-picker-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        .box-picker-content::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #007bb8 0%, #004373 100%);
            box-shadow: 0 2px 8px rgba(0, 145, 211, 0.3);
        }
        .box-picker-content::-webkit-scrollbar-thumb:active {
            background: linear-gradient(135deg, #00659d 0%, #003a5e 100%);
        }
        /* Для Firefox */
        .box-picker-content {
            scrollbar-width: thin;
            scrollbar-color: #0091D3 #f1f1f1;
        }
        .box-picker-header {
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 12px 12px 0 0;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            text-align: center;
        }
        .product-selector {
            padding: 30px;
            text-align: center;
        }
        .selector-title {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 30px;
        }
        .product-options {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        .product-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 30px 20px;
            border: 3px solid #e0e0e0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #fafafa;
            text-decoration: none;
            color: #333;
        }
        .product-option:hover {
            border-color: #0091D3;
            background: #f0f8ff;
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 145, 211, 0.15);
        }
        .product-option-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        .product-option-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        .product-option-description {
            font-size: 14px;
            color: #666;
            text-align: center;
            line-height: 1.4;
        }
        .box-picker-form {
            padding: 30px;
        }
        .form-section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            color: #666;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 20px;
        }
        .back-btn:hover {
            background: #ebebeb;
            border-color: #ccc;
        }
        .dimension-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 15px;
        }
        .dimension-label {
            font-weight: 500;
            color: #555;
            width: 120px;
            font-size: 14px;
            flex-shrink: 0;
        }
        .param-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }
        .param-input:focus {
            outline: none;
            border-color: #0091D3;
            box-shadow: 0 0 0 3px rgba(0, 145, 211, 0.1);
        }
        .types-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 10px;
        }
        .type-checkbox {
            display: flex;
            align-items: center;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #fafafa;
            min-height: 50px;
        }
        .type-checkbox:hover {
            border-color: #0091D3;
            background: #f0f8ff;
        }
        .type-checkbox input[type="checkbox"] {
            margin-right: 10px;
            width: 18px;
            height: 18px;
            accent-color: #0091D3;
            flex-shrink: 0;
        }
        .type-checkbox label {
            font-size: 14px;
            font-weight: 500;
            color: #333;
            cursor: pointer;
            flex: 1;
        }
        .submit-btn {
            width: 100%;
            padding: 16px 20px;
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            margin-top: 10px;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 145, 211, 0.3);
        }
        .submit-btn:active {
            transform: translateY(0);
        }
        .result-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
        }
        .results-group {
            margin-bottom: 25px;
        }
        .results-group-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            padding: 10px 15px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .results-group-title.exact-match {
            background: #e8f5e8;
            color: #2e7d2e;
            border-left: 4px solid #4CAF50;
        }
        .results-group-title.other-types {
            background: #fff3e0;
            color: #e65100;
            border-left: 4px solid #ff9800;
        }
        .result-item {
            background: #f8f9ff;
            border: 1px solid #e0e6ff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            border-left: 4px solid #0091D3;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .result-item:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(0, 145, 211, 0.15);
        }
        .result-item.other-type {
            background: #fef9f3;
            border: 1px solid #ffd4a3;
            border-left: 4px solid #ff9800;
        }
        .result-header {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 16px;
        }
        .result-details {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        .result-description {
            color: #888;
            font-style: italic;
            margin-top: 5px;
            font-size: 13px;
        }
        .type-mismatch-notice {
            background: #fff3e0;
            color: #e65100;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
            display: inline-block;
        }
        .click-hint {
            margin-top: 10px;
            font-size: 12px;
            color: #0091D3;
            font-weight: 500;
        }
        .no-results {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 16px;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #0091D3;
            font-style: italic;
        }
        .close-btn {
            position: absolute;
            top: 15px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 24px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s ease;
        }
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .box-picker-inline-btn {
            display: inline-block;
            padding: 8px 16px;
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            margin-left: 10px;
            text-decoration: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            vertical-align: middle;
        }
        .box-picker-inline-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 145, 211, 0.3);
        }
        .results-container {
            animation: fadeInUp 0.5s ease-out;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @media (max-width: 768px) {
            .box-picker-content {
                width: 95%;
                margin: 10px;
            }
            .box-picker-content::-webkit-scrollbar {
                width: 6px;
            }
            .product-options {
                grid-template-columns: 1fr;
            }
            .dimension-row {
                flex-wrap: wrap;
                gap: 10px;
            }
            .dimension-label {
                width: 100%;
                margin-bottom: 5px;
            }
            .param-input {
                max-width: none;
                min-width: 120px;
            }
            .types-container {
                grid-template-columns: 1fr;
            }
            .box-picker-form {
                padding: 20px;
            }
            .product-selector {
                padding: 20px;
            }
        }
    `;
    document.head.appendChild(style);

    let allData = [];
    let currentProductType = null;

    function getCellValue(cell, defaultValue = "") {
        return cell && cell.v !== null && cell.v !== undefined ? cell.v : defaultValue;
    }

    function parseFloatSafe(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    function showSuccessNotification(stampText) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: sans-serif;
            font-weight: 600;
            z-index: 100000;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">✅</span>
                <span>Выбран: ${stampText}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 50);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showPreviewModal(imageUrl) {
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            cursor: zoom-out;
        `;
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        `;
        modal.appendChild(img);
        modal.addEventListener("click", () => {
            modal.remove();
        });
        document.body.appendChild(modal);
    }

    function checkAndAddButton() {
        const utList = document.querySelector("#UtList");
        const tagsH4 = document.querySelector("#UtList > div.tags > h4");
        if (utList && tagsH4 && !tagsH4.querySelector('.box-picker-inline-btn')) {
            const button = document.createElement("button");
            button.innerText = "Умный поиск";
            button.className = "box-picker-inline-btn";
            button.addEventListener("click", (e) => {
                e.preventDefault();
                openProductSelector();
            });
            tagsH4.appendChild(button);
        }
    }

    function initRubricatorPreviewCache() {
        if (sessionStorage.getItem('stampPreviews')) {

            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                const rubricator = document.querySelector("#UtList > div.rubricator");
                if (rubricator) {
                    observer.disconnect();

                    const links = Array.from(rubricator.querySelectorAll("a"));
                    const previewMap = [];

                    links.forEach(link => {
                        const textDiv = link.querySelector("div");
                        if (textDiv && textDiv.textContent) {
                            const match = textDiv.textContent.match(/штамп №(\d+)/i);
                            if (match && match[1]) {
                                const stampNumber = match[1];
                                const backgroundImage = window.getComputedStyle(link).backgroundImage;
                                const imageUrl = backgroundImage
                                    .replace(/^url\(['"]?/, '')
                                    .replace(/['"]?\)$/, '');

                                previewMap.push({
                                    number: stampNumber,
                                    url: imageUrl
                                });
                            }
                        }
                    });

                    sessionStorage.setItem('stampPreviews', JSON.stringify(previewMap));

                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function openProductSelector() {
        const modal = document.createElement("div");
        modal.className = "box-picker-modal";
        const content = document.createElement("div");
        content.className = "box-picker-content";
        content.innerHTML = `
            <div class="box-picker-header">
                Выбор типа изделия
                <button class="close-btn">&times;</button>
            </div>
            <div class="product-selector">
                <div class="selector-title">Что вы хотите подобрать?</div>
                <div class="product-options">
                    <div class="product-option" data-type="BOX">
                        <div class="product-option-icon">📦</div>
                        <div class="product-option-title">Коробки</div>
                        <div class="product-option-description">Поиск коробок по размерам</div>
                    </div>
                    <div class="product-option" data-type="PACKAGE">
                        <div class="product-option-icon">🛍️</div>
                        <div class="product-option-title">Пакеты</div>
                        <div class="product-option-description">Поиск пакетов по размерам</div>
                    </div>
                    <div class="product-option" data-type="KONVERT">
                        <div class="product-option-icon">✉️</div>
                        <div class="product-option-title">Конверты</div>
                        <div class="product-option-description">Поиск конвертов по длине и ширине</div>
                    </div>
                    <div class="product-option" data-type="PAPKA">
                        <div class="product-option-icon">📁</div>
                        <div class="product-option-title">Папки</div>
                        <div class="product-option-description">Поиск папок по длине и ширине</div>
                    </div>
                </div>
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);
        content.querySelectorAll('.product-option').forEach(option => {
            option.addEventListener('click', () => {
                const productType = option.getAttribute('data-type');
                currentProductType = productType;
                modal.remove();
                fetchData(productType);
            });
        });
        const closeModal = () => modal.remove();
        content.querySelector(".close-btn").addEventListener("click", closeModal);
        modal.addEventListener("click", e => {
            if (e.target === modal) closeModal();
        });
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                closeModal();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    }

    function fetchData(productType) {
        const sheet = SHEETS[productType];
        GM_xmlhttpRequest({
            method: "GET",
            url: sheet.url,
            onload: function (response) {
                try {
                    let json;
                    try {
                        json = JSON.parse(response.responseText);
                    } catch (e) {
                        const match = response.responseText.match(/.*?({.*}).*/);
                        if (!match || !match[1]) throw new Error("Не удалось найти JSON в ответе");
                        json = JSON.parse(match[1]);
                    }
                    if (!json || !json.table || !json.table.rows || json.table.rows.length < 2) {
                        throw new Error("Нет данных в таблице или неправильная структура");
                    }
                    const rows = json.table.rows;
                    allData = rows.slice(1).map(row => {
                        if (!row || !row.c || !Array.isArray(row.c)) return null;
                        const number = getCellValue(row.c[0], "");
                        const length = parseFloatSafe(getCellValue(row.c[1], 0));
                        const width = parseFloatSafe(getCellValue(row.c[2], 0));
                        if (productType === 'KONVERT' || productType === 'PAPKA') {
                            if (!number || length <= 0 || width <= 0) return null;
                            return {
                                number: number,
                                length: length,
                                width: width,
                                type: getCellValue(row.c[3] || row.c[4], "")
                            };
                        } else {
                            const depth = parseFloatSafe(getCellValue(row.c[3], 0));
                            const type = getCellValue(row.c[4], "");
                            if (!number || length <= 0 || width <= 0 || depth <= 0) return null;
                            return {
                                number: number,
                                length: length,
                                width: width,
                                depth: depth,
                                type: type
                            };
                        }
                    }).filter(item => item !== null);
                    if (allData.length === 0) {
                        alert(`В таблице ${sheet.title} нет корректных данных`);
                        return;
                    }
                    openModal(productType);
                } catch (error) {
                    console.error("Ошибка при получении данных:", error);
                    alert(
                        `Ошибка при получении данных для "${sheet.title}": ${error.message}
Проверьте:
1. Доступность таблицы
2. Корректность ссылки
3. Опубликована ли таблица в формате JSON
4. Структура листа соответствует ожиданиям скрипта`
                    );
                }
            },
            onerror: function (error) {
                console.error("Ошибка сети:", error);
                alert(`Ошибка сети при получении данных для ${sheet.title}`);
            }
        });
    }

    function openModal(productType) {
        const sheet = SHEETS[productType];
        const usesDepth = ['BOX', 'PACKAGE'].includes(currentProductType);
        const modal = document.createElement("div");
        modal.className = "box-picker-modal";
        const content = document.createElement("div");
        content.className = "box-picker-content";
        content.innerHTML = `
            <div class="box-picker-header">
                ${sheet.icon} Подбор ${sheet.title}
                <button class="close-btn">&times;</button>
            </div>
            <div class="box-picker-form">
                <button class="back-btn">← Назад к выбору типа</button>
                <div class="form-section">
                    <div class="section-title">Габариты изделия</div>
                    <div id="dimensions-container">
                        <div class="dimension-row">
                            <span class="dimension-label">${productType === 'PACKAGE' ? 'Ширина' : 'Длина'} (мм)</span>
                            <input type="number" id="length" class="param-input" placeholder="${productType === 'PACKAGE' ? 'Введите ширину' : 'Введите длину'}">
                        </div>
                        <div class="dimension-row">
                            <span class="dimension-label">${productType === 'PACKAGE' ? 'Высота' : 'Ширина'} (мм)</span>
                            <input type="number" id="width" class="param-input" placeholder="${productType === 'PACKAGE' ? 'Введите высоту' : 'Введите ширину'}">
                        </div>
                        ${usesDepth ? `
                        <div class="dimension-row">
                            <span class="dimension-label">Глубина (мм)</span>
                            <input type="number" id="depth" class="param-input" placeholder="Введите глубину">
                        </div>` : ''}
                    </div>
                </div>
                <div class="form-section">
                    <div class="section-title">Тип ${sheet.title}</div>
                    <div id="types-container" class="types-container"></div>
                </div>
                <button id="submit-btn" class="submit-btn">Найти подходящие ${sheet.title}</button>
                <div id="result" class="result-section" style="display: none;"></div>
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);
        content.querySelector('.back-btn').addEventListener('click', () => {
            modal.remove();
            openProductSelector();
        });
        const types = [...new Set(allData.map(d => d.type))].filter(Boolean);
        const typesContainer = content.querySelector("#types-container");
        types.forEach(type => {
            const div = document.createElement("div");
            div.className = "type-checkbox";
            div.innerHTML = `<input type="checkbox" name="type" value="${type}"><label>${type}</label>`;
            const checkbox = div.querySelector("input");
            div.addEventListener("click", (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    div.classList.toggle("checked", checkbox.checked);
                }
            });
            checkbox.addEventListener("change", () => {
                div.classList.toggle("checked", checkbox.checked);
            });
            typesContainer.appendChild(div);
        });
const createResultItem = (item, index, isOtherType = false) => {
    const lengthInputEl = document.getElementById("length");
    const widthInputEl = document.getElementById("width");
    const depthInputEl = document.getElementById("depth");

    const length = lengthInputEl ? parseFloat(lengthInputEl.value) || 0 : 0;
    const width = widthInputEl ? parseFloat(widthInputEl.value) || 0 : 0;
    const depth = depthInputEl ? parseFloat(depthInputEl.value) || 0 : 0;

    const lengthDiff = length - item.length;
    const widthDiff = width - item.width;

    let description = "";
    let statusIcon = "✅";

    if (lengthDiff === 0 && widthDiff === 0) {
        description = "Размеры полностью совпадают";
        statusIcon = "🎯";
    } else {
        const differences = [];
        if (lengthDiff !== 0) {
            differences.push(`длина ${lengthDiff > 0 ? "меньше" : "больше"} на ${Math.abs(lengthDiff)} мм`);
        }
        if (widthDiff !== 0) {
            differences.push(`ширина ${widthDiff > 0 ? "меньше" : "больше"} на ${Math.abs(widthDiff)} мм`);
        }
        description = differences.join(", ");
    }

    const bestBadge = index === 0 ? '<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">ЛУЧШИЙ</span>' : '';
    const typeMismatchNotice = isOtherType ? '<div class="type-mismatch-notice">⚠️ Другой тип</div>' : '';

    // Определяем, нужна ли глубина
    const usesDepth = ['BOX', 'PACKAGE'].includes(currentProductType);

    // Формируем HTML для размеров
    let dimensionsHtml = `
        <strong>Размеры:</strong> ${item.length} × ${item.width} мм
    `;
    if (usesDepth) {
        dimensionsHtml += ` × ${item.depth} мм`;
    }

    const resultElement = document.createElement('div');
    resultElement.className = `result-item ${isOtherType ? 'other-type' : ''}`;
    resultElement.innerHTML = `
        <div class="result-header">${statusIcon} Штамп №${item.number} ${bestBadge}</div>
        <div class="result-details">
            ${dimensionsHtml}<br>
            <strong>Тип:</strong> ${item.type}
        </div>
        <div class="result-description">${description}</div>
        ${typeMismatchNotice}
        <div class="click-hint">💡 Нажмите, чтобы выбрать этот штамп</div>
        <button class="preview-btn" style="margin-top: 10px; background: none; color: #0091D3; border: none; padding: 0; font-size: 14px; cursor: pointer;">
            📷 <strong>Просмотр превью</strong> 📷
        </button>
    `;

    // Обработчик кнопки "Просмотр превью"
    const previewBtn = resultElement.querySelector('.preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stampNumber = item.number;
            const cachedPreviews = JSON.parse(sessionStorage.getItem('stampPreviews') || '[]');
            const preview = cachedPreviews.find(p => p.number === stampNumber);
            if (preview) {
                showPreviewModal(preview.url);
            } else {
                alert("Превью не найдено");
            }
        });
    }

    // Обработчик клика по карточке
    resultElement.addEventListener('click', () => {
        const inputField = document.querySelector("#UtList > div.input-group.inputcontainer > input");
        if (inputField) {
            inputField.focus();
            inputField.value = '';
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
                const stampText = `Штамп №${item.number}`;
                inputField.value = stampText;
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                const lastChar = String(item.number).slice(-1);
                inputField.dispatchEvent(new KeyboardEvent('keyup', {
                    key: lastChar,
                    code: `Digit${lastChar}`,
                    bubbles: true
                }));
                setTimeout(() => inputField.blur(), 100);
                showSuccessNotification(stampText);
                setTimeout(() => modal.remove(), 500);
            }, 100);
        }
    });

    return resultElement;
};

        content.querySelector("#submit-btn").addEventListener("click", () => {
            const resultDiv = content.querySelector("#result");
            resultDiv.style.display = "block";
            resultDiv.innerHTML = `<div class="loading">🔍 Поиск подходящих ${sheet.title}...</div>`;
            setTimeout(() => {
                const length = parseFloat(document.getElementById("length").value) || 0;
                const width = parseFloat(document.getElementById("width").value) || 0;
                const depth = usesDepth ? parseFloat(document.getElementById("depth").value) || 0 : 0;
                if (length <= 0 || width <= 0 || (usesDepth && depth <= 0)) {
                    resultDiv.innerHTML = `
                        <div class="no-results">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Некорректные размеры</div>
                            <div>Пожалуйста, введите положительные значения для всех размеров</div>
                        </div>
                    `;
                    return;
                }
                const selectedTypes = Array.from(document.querySelectorAll("input[name=type]:checked")).map(cb => cb.value);
                const currentTolerances = TOLERANCES[productType];
                const exactMatches = allData.filter(item => {
                    if (selectedTypes.length && !selectedTypes.includes(item.type)) return false;
                    if (usesDepth) {
                        return (
                            item.length >= length - currentTolerances.MINUS &&
                            item.length <= length + currentTolerances.PLUS &&
                            item.width >= width - currentTolerances.MINUS &&
                            item.width <= width + currentTolerances.PLUS &&
                            item.depth >= depth - currentTolerances.MINUS &&
                            item.depth <= depth + currentTolerances.PLUS
                        );
                    } else {
                        return (
                            item.length >= length - currentTolerances.MINUS &&
                            item.length <= length + currentTolerances.PLUS &&
                            item.width >= width - currentTolerances.MINUS &&
                            item.width <= width + currentTolerances.PLUS
                        );
                    }
                });
                const otherMatches = selectedTypes.length > 0 ? allData.filter(item => {
                    if (selectedTypes.includes(item.type)) return false;
                    if (usesDepth) {
                        return (
                            item.length >= length - currentTolerances.MINUS &&
                            item.length <= length + currentTolerances.PLUS &&
                            item.width >= width - currentTolerances.MINUS &&
                            item.width <= width + currentTolerances.PLUS &&
                            item.depth >= depth - currentTolerances.MINUS &&
                            item.depth <= depth + currentTolerances.PLUS
                        );
                    } else {
                        return (
                            item.length >= length - currentTolerances.MINUS &&
                            item.length <= length + currentTolerances.PLUS &&
                            item.width >= width - currentTolerances.MINUS &&
                            item.width <= width + currentTolerances.PLUS
                        );
                    }
                }) : [];
                if (exactMatches.length === 0 && otherMatches.length === 0) {
                    resultDiv.innerHTML = `
                        <div class="no-results">
                            <div style="font-size: 48px; margin-bottom: 20px;">${sheet.icon}</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Подходящие ${sheet.title} не найдены</div>
                            <div>Попробуйте изменить параметры поиска или выбрать другие типы</div>
                        </div>
                    `;
                    return;
                }
                const sortByCloseness = (items) => {
                    return items.sort((a, b) => {
                        const diffA = Math.abs(a.length - length) +
                                      Math.abs(a.width - width) +
                                      (usesDepth ? Math.abs(a.depth - depth) : 0);
                        const diffB = Math.abs(b.length - length) +
                                      Math.abs(b.width - width) +
                                      (usesDepth ? Math.abs(b.depth - depth) : 0);
                        return diffA - diffB;
                    });
                };
                const sortedExactMatches = sortByCloseness([...exactMatches]);
                const sortedOtherMatches = sortByCloseness([...otherMatches]);
                resultDiv.innerHTML = '';
                const resultsContainer = document.createElement('div');
                resultsContainer.className = 'results-container';
                if (sortedExactMatches.length > 0) {
                    const exactGroup = document.createElement('div');
                    exactGroup.className = 'results-group';
                    const typeText = selectedTypes.length > 0 ? `по выбранным типам (${selectedTypes.join(', ')})` : 'по всем типам';
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'results-group-title exact-match';
                    titleDiv.innerHTML = `✅ Найдено ${typeText}: ${sortedExactMatches.length}`;
                    exactGroup.appendChild(titleDiv);
                    sortedExactMatches.forEach((item, index) => {
                        const itemElement = createResultItem(item, index, false);
                        exactGroup.appendChild(itemElement);
                    });
                    resultsContainer.appendChild(exactGroup);
                }
                if (sortedOtherMatches.length > 0) {
                    const otherGroup = document.createElement('div');
                    otherGroup.className = 'results-group';
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'results-group-title other-types';
                    titleDiv.innerHTML = `🔄 Подходящие ${sheet.title} других типов: ${sortedOtherMatches.length}`;
                    otherGroup.appendChild(titleDiv);
                    sortedOtherMatches.forEach((item, index) => {
                        const itemElement = createResultItem(item, index, true);
                        otherGroup.appendChild(itemElement);
                    });
                    resultsContainer.appendChild(otherGroup);
                }
                resultDiv.appendChild(resultsContainer);
            }, 500);
        });

        const closeModal = () => modal.remove();
        content.querySelector(".close-btn").addEventListener("click", closeModal);
        modal.addEventListener("click", e => {
            if (e.target === modal) closeModal();
        });
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                closeModal();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    }

    function init() {
        checkAndAddButton();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    checkAndAddButton();
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Запуск кэширования превью
        initRubricatorPreviewCache();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
};


smartSerch ();



function perezakazBtn () {
    'use strict';
    let button = null;
    const UNIQUE_PREFIX = 'custom-save-data-';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCQ6W3fOLGa-y1RgWeMjVEhqW1dAjtt3CS_8bEtcYZleHVhhim1wQfRZhFqAEj3fsu/exec';

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Ваши стили остаются без изменений */
            .${UNIQUE_PREFIX}modal {position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(0, 0, 0, 0.7) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 10000 !important; backdrop-filter: blur(5px) !important; animation: ${UNIQUE_PREFIX}fadeIn 0.3s ease-out !important;}
            .${UNIQUE_PREFIX}modal-content {background: linear-gradient(135deg, #0091D3 0%, #005189 100%) !important; padding: 0 !important; border-radius: 16px !important; width: 400px !important; max-width: 90vw !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important; transform: scale(0.9) !important; animation: ${UNIQUE_PREFIX}modalSlideIn 0.3s ease-out forwards !important; overflow: hidden !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; box-sizing: border-box !important;}
            .${UNIQUE_PREFIX}modal-header {background: rgba(255, 255, 255, 0.1) !important; padding: 20px !important; text-align: center !important; border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;}
            .${UNIQUE_PREFIX}modal-header h3 {margin: 0 !important; color: white !important; font-size: 20px !important; font-weight: 600 !important; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important; font-family: inherit !important;}
            .${UNIQUE_PREFIX}modal-body {padding: 25px !important; background: white !important;}
            .${UNIQUE_PREFIX}input-group {margin-bottom: 20px !important;}
            .${UNIQUE_PREFIX}input-label {display: block !important; margin-bottom: 8px !important; font-weight: 600 !important; color: #333 !important; font-size: 14px !important; font-family: inherit !important;}
            .${UNIQUE_PREFIX}custom-input {width: 100% !important; padding: 12px 16px !important; border: 2px solid #e1e5e9 !important; border-radius: 8px !important; font-size: 14px !important; transition: all 0.3s ease !important; box-sizing: border-box !important; font-family: inherit !important; background: white !important; color: #333 !important;}
            .${UNIQUE_PREFIX}custom-input:focus {outline: none !important; border-color: #0091D3 !important; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;}
            .${UNIQUE_PREFIX}modal-buttons {display: flex !important; gap: 12px !important; justify-content: center !important; margin-top: 20px !important;}
            .${UNIQUE_PREFIX}btn {padding: 12px 24px !important; border: none !important; border-radius: 8px !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important; transition: all 0.3s ease !important; min-width: 100px !important; font-family: inherit !important; text-decoration: none !important; display: inline-flex !important; align-items: center !important; justify-content: center !important;}
            .${UNIQUE_PREFIX}btn-primary {background: linear-gradient(135deg, #0091D3 0%, #005189 100%) !important; color: white !important; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;}
            .${UNIQUE_PREFIX}btn-primary:hover {transform: translateY(-2px) !important; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6) !important;}
            .${UNIQUE_PREFIX}btn-secondary {background: #f8f9fa !important; color: #6c757d !important; border: 2px solid #e9ecef !important;}
            .${UNIQUE_PREFIX}btn-secondary:hover {background: #e9ecef !important; color: #495057 !important; transform: translateY(-1px) !important;}
            .${UNIQUE_PREFIX}success-message {position: fixed !important; top: 20px !important; right: 20px !important; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%) !important; color: white !important; padding: 16px 24px !important; border-radius: 8px !important; z-index: 10001 !important; box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4) !important; animation: ${UNIQUE_PREFIX}slideInRight 0.5s ease-out !important; font-weight: 600 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-size: 14px !important;}
            .${UNIQUE_PREFIX}error-message {position: fixed !important; top: 20px !important; right: 20px !important; background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%) !important; color: white !important; padding: 16px 24px !important; border-radius: 8px !important; z-index: 10001 !important; box-shadow: 0 8px 24px rgba(244, 67, 54, 0.4) !important; animation: ${UNIQUE_PREFIX}slideInRight 0.5s ease-out !important; font-weight: 600 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-size: 14px !important;}
            .${UNIQUE_PREFIX}loading {opacity: 0.7 !important; pointer-events: none !important;}
            .${UNIQUE_PREFIX}spinner {display: inline-block !important; width: 16px !important; height: 16px !important; border: 2px solid #ffffff !important; border-radius: 50% !important; border-top-color: transparent !important; animation: ${UNIQUE_PREFIX}spin 1s ease-in-out infinite !important; margin-right: 8px !important;}
            @keyframes ${UNIQUE_PREFIX}fadeIn {from { opacity: 0; } to { opacity: 1; }}
            @keyframes ${UNIQUE_PREFIX}modalSlideIn {from {transform: scale(0.7) translateY(-20px); opacity: 0;} to {transform: scale(1) translateY(0); opacity: 1;}}
            @keyframes ${UNIQUE_PREFIX}slideInRight {from {transform: translateX(100%); opacity: 0;} to {transform: translateX(0); opacity: 1;}}
            @keyframes ${UNIQUE_PREFIX}spin {to { transform: rotate(360deg); }}
            .${UNIQUE_PREFIX}main-button {-webkit-text-size-adjust: 100% !important; -webkit-tap-highlight-color: rgba(0,0,0,0) !important; font-family: "Helvetica Neue",Helvetica,Arial,sans-serif !important; border-spacing: 0 !important; border-collapse: collapse !important; box-sizing: border-box !important; text-decoration: none !important; display: inline-block !important; margin-bottom: 0 !important; font-weight: 400 !important; text-align: center !important; white-space: nowrap !important; vertical-align: middle !important; touch-action: manipulation !important; cursor: pointer !important; user-select: none !important; border: 1px solid transparent !important; color: #333 !important; background-color: #fff !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.15),0 1px 1px rgba(0,0,0,.075) !important; text-shadow: 0 1px 0 #fff !important; background-image: linear-gradient(to bottom,#fff 0,#e0e0e0 100%) !important; background-repeat: repeat-x !important; border-color: #ccc !important; padding: 5px 10px !important; font-size: 12px !important; line-height: 1.5 !important; position: relative !important; float: left !important; margin-left: -1px !important; border-radius: 0 !important;}
            .${UNIQUE_PREFIX}main-button:hover {background-image: linear-gradient(to bottom,#e0e0e0 0,#d0d0d0 100%) !important; border-color: #adadad !important;}
            .${UNIQUE_PREFIX}main-button:active {background-image: linear-gradient(to bottom,#d0d0d0 0,#e0e0e0 100%) !important; box-shadow: inset 0 3px 5px rgba(0,0,0,.125) !important;}
        `;
        document.head.appendChild(style);
    }

    // === Проверяем, является ли элемент в состоянии загрузки ===
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
        notification.className = type === 'success' ? `${UNIQUE_PREFIX}success-message` : `${UNIQUE_PREFIX}error-message`;
        notification.innerHTML = `
            <div style="display: flex !important; align-items: center !important;">
                <span style="margin-right: 10px !important;">${type === 'success' ? '✅' : '❌'}</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = `${UNIQUE_PREFIX}slideInRight 0.3s ease-out reverse`;
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    function showModal(onSubmit) {
        const modal = document.createElement('div');
        modal.className = `${UNIQUE_PREFIX}modal`;
        modal.innerHTML = `
            <div class="${UNIQUE_PREFIX}modal-content">
                <div class="${UNIQUE_PREFIX}modal-header">
                    <h3>📋 Счёт от подрядчика</h3>
                </div>
                <div class="${UNIQUE_PREFIX}modal-body">
                    <div class="${UNIQUE_PREFIX}input-group">
                        <label class="${UNIQUE_PREFIX}input-label">Счёт от подрядчика</label>
                        <input type="text" class="${UNIQUE_PREFIX}custom-input" id="${UNIQUE_PREFIX}invoiceInput" placeholder="Счёт № . . ." />
                    </div>
                    <div class="${UNIQUE_PREFIX}modal-buttons">
                        <button class="${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-primary" id="${UNIQUE_PREFIX}submitBtn">
                            <span id="${UNIQUE_PREFIX}submitText">Сохранить</span>
                        </button>
                        <button class="${UNIQUE_PREFIX}btn ${UNIQUE_PREFIX}btn-secondary" id="${UNIQUE_PREFIX}cancelBtn">Отмена</button>
                    </div>
                </div>
            </div>
        `;
        const input = modal.querySelector(`#${UNIQUE_PREFIX}invoiceInput`);
        const submitBtn = modal.querySelector(`#${UNIQUE_PREFIX}submitBtn`);
        const cancelBtn = modal.querySelector(`#${UNIQUE_PREFIX}cancelBtn`);
        const submitText = modal.querySelector(`#${UNIQUE_PREFIX}submitText`);

        setTimeout(() => input.focus(), 100);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitBtn.click();
        });

        submitBtn.onclick = () => {
            const value = input.value.trim();
            if (!value) {
                input.style.borderColor = '#f44336';
                input.focus();
                return;
            }
            submitBtn.classList.add(`${UNIQUE_PREFIX}loading`);
            submitText.innerHTML = `<span class="${UNIQUE_PREFIX}spinner"></span>Сохранение...`;

            onSubmit(value, () => {
                if (modal.parentNode) document.body.removeChild(modal);
            });
        };

        cancelBtn.onclick = () => {
            if (modal.parentNode) document.body.removeChild(modal);
        };

        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };

        document.body.appendChild(modal);
    }

    function checkIfRowExists(textFromDoc, callback) {
        GM_xmlhttpRequest({
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
        GM_xmlhttpRequest({
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
                    if (success) {
                        showNotification(message, 'success');
                    } else {
                        showNotification(message, 'error');
                    }
                    closeModal();
                });
            });
        });
    }

    function checkAndToggleButton() {
        const topButtons = document.querySelector("#TopButtons");
        if (!topButtons) return;

        const isLoading = isDocumentLoading();
        const meetsLabelTextCondition = hasContractorLabel();
        const shouldShowButton = !isLoading && meetsLabelTextCondition;

        if (shouldShowButton && !button) {
            button = document.createElement("button");
            button.textContent = "💾 В таблицу перезаказов";
            button.className = `${UNIQUE_PREFIX}main-button`;
            button.addEventListener("click", handleButtonClick);
            topButtons.appendChild(button);
        } else if (!shouldShowButton && button) {
            button.remove();
            button = null;
        }
    }

    function init() {
        addStyles();
        checkAndToggleButton();

        const observer = new MutationObserver(checkAndToggleButton);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
perezakazBtn ();

function lockPerezakaz() {
    'use strict';

    let isButtonPressed = false;
    let isInitialized = false;

    const textColor = "rgb(128, 0, 0)";
    const bgColor = "rgb(255, 224, 224)";

    // === Список элементов для блокировки ===
    function getElementsToBlock() {
        return [
            document.querySelector("#Description"),
            document.querySelector("#Summa"),
            document.querySelector("#Cost"),
            document.querySelector("#Quantity"),
            document.querySelector("#LabelForContractor > td:nth-child(2)"),
            document.querySelector("#LabelForSumma > td:nth-child(2) > span"),
        ].filter(Boolean); // Отфильтровываем null/undefined
    }

    // === Функция блокировки элементов ===
    function blockElements(elements) {
        elements.forEach(el => {
            if (el.__blocked) return;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.disabled = true;
                el.style.color = textColor;
            } else {
                el.style.pointerEvents = "none";
                el.style.opacity = "0.6";
            }

            if (!el.style.backgroundColor) {
                el.style.backgroundColor = bgColor;
            }

            el.__blocked = true;
        });
    }

    // === Функция разблокировки элементов ===
    function unblockElements(elements) {
        elements.forEach(el => {
            if (!el.__blocked) return;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.disabled = false;
                el.style.color = "";
            } else {
                el.style.pointerEvents = "";
                el.style.opacity = "";
            }

            el.style.backgroundColor = "";
            el.__blocked = false;
        });
    }

    // === Основная функция проверки ===
    function checkFormLock() {
        const description = document.querySelector("#Description");
        if (!description) return;

        const text = description.value.trim();
        const elementsToBlock = getElementsToBlock();

        if (text.includes("Проверено")) {
            blockElements(elementsToBlock);
        } else {
            unblockElements(elementsToBlock);
        }
    }

    // === Проверка кнопки и Quantity ===
    function checkLabel() {
        const quantityInput = document.querySelector("#Quantity");
        const labelElement = document.querySelector("#LabelForQuantity");
        const button = document.querySelector("#TopButtons > a:nth-child(1)");

        let isEmptyOrZero = false;
        if (quantityInput) {
            const value = quantityInput.value.trim();
            const numValue = parseFloat(value);
            isEmptyOrZero = value === "" || isNaN(numValue) || numValue <= 0;
        }

        if (!labelElement) return;

        const labelCell = labelElement.querySelector("td:nth-child(1)");

        if (isButtonPressed && isEmptyOrZero) {
            labelElement.style.backgroundColor = bgColor;
            if (labelCell) labelCell.style.color = textColor;
            if (quantityInput) quantityInput.style.color = textColor;

            blockButton(button);

            labelElement.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            labelElement.style.backgroundColor = "";
            if (labelCell) labelCell.style.color = "";
            if (quantityInput) quantityInput.style.color = "";

            unblockButton(button);
        }
    }

    function blockButton(button) {
        if (button && !button.disabled) {
            button.disabled = true;
            button.style.opacity = "0.6";
            button.style.pointerEvents = "none";
            button.title = "Введите корректное количество перед продолжением";
        }
    }

    function unblockButton(button) {
        if (button && button.disabled) {
            button.disabled = false;
            button.style.opacity = "";
            button.style.pointerEvents = "";
            button.title = "";
        }
    }

    // === Обработчик клика по кнопке ===
    function setupButtonClickHandler() {
        const buttonSelector = "#TopButtons > a:nth-child(1)";
        const interval = setInterval(() => {
            const buttons = document.querySelectorAll(buttonSelector);
            buttons.forEach(button => {
                if (!button.__clickHandlerSet) {
                    button.addEventListener("click", () => {
                        isButtonPressed = true;
                        checkLabel();
                    });
                    button.__clickHandlerSet = true;
                }
            });

            if (buttons.length > 0) clearInterval(interval);
        }, 500);
    }

    // === Инициализация ===
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        setupButtonClickHandler();
        setInterval(checkLabel, 500);
        setInterval(checkFormLock, 500);
    }

    // === Наблюдатель за появлением #LabelForContractor ===
    function startObserver() {
        const observer = new MutationObserver((mutations, obs) => {
            const labelExists = !!document.querySelector("#LabelForContractor");
            if (labelExists) {

                init();

            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // === Запуск наблюдателя ===
    startObserver();
}

// Вызов функции
lockPerezakaz();
      function prolongaror() {
    'use strict';

    // === Настройки скидок для техпроцессов ===
    const DISCOUNTS = {
        onlyDigital: 15,
        onlyOffset: 15,
        onlyNoPrint: 15,
        digitalAndNoPrint: 15,
        offsetOrMixed: 15,
        noDiscount: 0
    };

    // === Маппинг категорий техпроцессов ===
    const TYPE_MAP = {
        "цифра": [
            "Цифра",
            "Цифра (ТАСМА)",
            "ЧБ-печать (ТАСМА)",
            "Цифра (ТАСМА) 330 х 320 мм",
            "XL (до 762 мм)",
            "Цифра + БЕЛЫЙ/ЛАК (ТАСМА)"
        ],
        "офсет": [
            "Офсет B2",
            "Офсет B2 + PANTONE"
        ],
        "копи": [
            "Цифра (Копицентр)",
            "ЧБ-печать (Копицентр)",
            "⚡️МАЛЫЕ ТИРАЖИ ЦИФРА⚡️",
            "⚡️МАЛЫЕ ТИРАЖИ ХL⚡️",
            "Чертежи (Копицентр)",
            "⚡️МАЛЫЕ ТИРАЖИ ЧБ ЦИФРА⚡️",
            "СБОРКА (КОПИЦЕНТР)"
        ],
        "без печати": [
            "Без печати"
        ]
    };

    function getType(processName) {
        for (const [type, names] of Object.entries(TYPE_MAP)) {
            if (names.includes(processName)) return type;
        }
        return null;
    }

    let hasCopyProcess = false;
    let currentDiscount = 0;

    function checkSelectedProcesses() {
        const table = document.querySelector("table.list");
        if (!table) return [];
        const headerRow = table.querySelector("thead tr");
        if (!headerRow) return [];
        const headerCells = headerRow.querySelectorAll("th");
        const columnHeaders = [];
        let currentPosition = 0;
        headerCells.forEach(th => {
            const text = th.textContent.trim();
            const colspan = parseInt(th.getAttribute('colspan') || '1');
            for (let i = 0; i < colspan; i++) {
                columnHeaders[currentPosition + i] = text;
            }
            currentPosition += colspan;
        });
        const bodyRows = table.querySelectorAll("tbody tr");
        const selectedProcesses = [];
        for (let rowIndex = 0; rowIndex < bodyRows.length; rowIndex++) {
            const row = bodyRows[rowIndex];
            const cells = row.querySelectorAll("td");
            for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                const cell = cells[cellIndex];
                if (cell.classList.contains("numeric") && cell.classList.contains("selected")) {
                    const link = cell.querySelector("a");
                    const value = link ? link.textContent.replace(/\s+/g, ' ').trim() : cell.textContent.trim();
                    let processName = "";
                    const parentTh = Array.from(headerCells).find(th => {
                        const index = Array.from(headerCells).indexOf(th);
                        const colspan = parseInt(th.getAttribute('colspan') || '1');
                        const end = index + colspan;
                        const cellIndexInTable = calculateColumnPosition(cell);
                        return cellIndexInTable >= index && cellIndexInTable < end;
                    });
                    if (parentTh) processName = parentTh.textContent.trim();
                    selectedProcesses.push({ processName, value, rowIndex });
                }
            }
        }
        hasCopyProcess = selectedProcesses.some(p => {
            const type = getType(p.processName);
            return type === "копи";
        });
        applyDiscountLogic(selectedProcesses);
        return selectedProcesses;
    }

    function calculateColumnPosition(cell) {
        const row = cell.parentElement;
        const cells = Array.from(row.children);
        let columnIndex = 0;
        for (let i = 0; i < cells.indexOf(cell); i++) {
            const prevCell = cells[i];
            const colspan = parseInt(prevCell.getAttribute('colspan') || '1');
            columnIndex += colspan;
        }
        return columnIndex;
    }

    function applyDiscountLogic(processes) {
        const types = new Set();
        processes.forEach(proc => {
            const type = getType(proc.processName);
            if (type) types.add(type);
        });
        let discount = 0;
        if (types.size === 0) {
            discount = 0;
        } else if (types.has("офсет")) {
            discount = DISCOUNTS.offsetOrMixed;
        } else if (types.size === 1) {
            const type = [...types][0];
            if (type === "цифра") {
                discount = DISCOUNTS.onlyDigital;
            } else if (type === "без печати") {
                discount = DISCOUNTS.onlyNoPrint;
            }
        } else if (types.size === 2 && types.has("цифра") && types.has("без печати")) {
            discount = DISCOUNTS.digitalAndNoPrint;
        } else {
            discount = 0;
        }
        currentDiscount = discount;
    }

    function findSaveButtonByText() {
        const buttons = document.querySelectorAll("button.btn.btn-success.btn-lg");
        for (const button of buttons) {
            if (button.textContent.trim() === "Рассчитать") {
                return button;
            }
        }
        return null;
    }

    // === Основной функционал удлинения срока ===
    let blockCreated = false;

    function waitForElement(selector, callback, attempts = 0, maxAttempts = 20) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else if (attempts < maxAttempts) {
            setTimeout(() => waitForElement(selector, callback, attempts + 1, maxAttempts), 500);
        }
    }

    function parseCustomDate(str) {
        const months = {
            января: 0,
            февраля: 1,
            марта: 2,
            апреля: 3,
            мая: 4,
            июня: 5,
            июля: 6,
            августа: 7,
            сентября: 8,
            октября: 9,
            ноября: 10,
            декабря: 11
        };
        const [dayStr, monthStr] = str.split(' ');
        const day = parseInt(dayStr);
        const month = months[monthStr.toLowerCase()];
        const year = new Date().getFullYear();
        if (isNaN(day) || month === undefined) return null;
        return new Date(year, month, day);
    }

    function formatDate(date) {
        const options = { day: 'numeric', month: 'long' };
        return date.toLocaleDateString('ru-RU', options);
    }

    function getDayWord(num) {
        const remainder = num % 100;
        if (remainder >= 11 && remainder <= 14) return 'дней';
        const digit = num % 10;
        switch (digit) {
            case 1:
                return 'день';
            case 2:
            case 3:
            case 4:
                return 'дня';
            default:
                return 'дней';
        }
    }

    function isSingleClientRow() {
        const tbody = document.querySelector("#SelectClient > div.AxClientSelector_ClientTips > table > tbody");
        if (!tbody) return false;
        const rows = tbody.querySelectorAll("tr");
        return rows.length === 1;
    }

    // === Создание блока долгого заказа ===
    function createLongOrderPriceBlock() {
        const table = document.querySelector("table.list");
        if (!table) return;
        checkSelectedProcesses(); // Обновляем флаг hasCopyProcess и текущую скидку

        const targetElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(6) > td');
        if (!targetElement) return;
        if (targetElement.querySelector('.long-order-block')) return;

        const block = document.createElement('div');
        block.className = 'long-order-block';
        block.style.backgroundColor = '#17A2B8';
        block.style.padding = '15px';
        block.style.borderRadius = '8px';
        block.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        block.style.color = 'white';
        block.style.marginTop = '15px';

        const priceSection = document.createElement('div');
        priceSection.style.textAlign = 'center';
        priceSection.style.marginBottom = '15px';

        const priceHeader = document.createElement('h4');
        priceHeader.id = 'price-header';
        priceHeader.textContent = `Цена долгого заказа`;
        priceHeader.style.fontSize = '18px';
        priceHeader.style.margin = '0 0 10px 0';
        priceHeader.style.color = '#FFFFFF';

        const sumElement = document.createElement('div');
        sumElement.style.color = '#FFD700';
        sumElement.style.fontSize = '24px';
        sumElement.style.fontWeight = 'bold';

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Скопировать цену';
        copyButton.style.marginTop = '10px';
        copyButton.style.padding = '8px 16px';
        copyButton.style.backgroundColor = '#28a745';
        copyButton.style.color = '#FFFFFF';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '14px';

        priceSection.appendChild(priceHeader);
        priceSection.appendChild(sumElement);
        priceSection.appendChild(copyButton);

        const dateSection = document.createElement('div');
        dateSection.style.textAlign = 'center';

        const dateHeader = document.createElement('h4');
        dateHeader.textContent = 'Увеличить срок';
        dateHeader.style.fontSize = '18px';
        dateHeader.style.margin = '0 0 10px 0';
        dateHeader.style.color = '#FFFFFF';

        const dateButton = document.createElement('button');
        dateButton.textContent = hasCopyProcess ? 'Удлиненный заказ недоступен!' : 'Узнать дату сдачи';
        dateButton.disabled = hasCopyProcess;
        dateButton.style.marginTop = '10px';
        dateButton.style.padding = '8px 16px';
        dateButton.style.backgroundColor = hasCopyProcess ? '#6c757d' : '#007bff';
        dateButton.style.color = '#FFFFFF';
        dateButton.style.border = 'none';
        dateButton.style.borderRadius = '4px';
        dateButton.style.cursor = hasCopyProcess ? 'not-allowed' : 'pointer';
        dateButton.style.fontSize = '14px';

        const dateResult = document.createElement('div');
        dateResult.style.marginTop = '10px';
        dateResult.style.fontSize = '16px';
        dateResult.style.fontWeight = 'bold';

        dateSection.appendChild(dateHeader);
        dateSection.appendChild(dateButton);
        dateSection.appendChild(dateResult);

        block.appendChild(priceSection);
        block.appendChild(document.createElement('hr'));
        block.appendChild(dateSection);
        targetElement.appendChild(block);

        let originalSumValue = '';

        function formatNumberWithSpaces(number) {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }

        function updateSum() {
            const itogElement = document.getElementById('itog');
            if (!itogElement) return;
            const itogText = itogElement.textContent;
            const itogValue = parseFloat(itogText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');
            let inputValue = parseFloat(inputElement?.value || 0);
            let basePrice;
            if (inputValue < 0) {
                inputValue = Math.abs(inputValue);
                basePrice = itogValue + inputValue;
            } else {
                basePrice = itogValue - inputValue;
            }
            const discountMultiplier = 1 - currentDiscount / 100;
            originalSumValue = (basePrice * discountMultiplier).toFixed(2);
            if (parseFloat(originalSumValue) < 7500) {
                sumElement.innerHTML = 'Минимальная сумма <br>для долгого срока <br>7500 ₽';
                sumElement.style.textAlign = 'center';
                sumElement.style.display = 'block';
                copyButton.style.display = 'none';
                dateButton.disabled = true;
                dateButton.style.backgroundColor = '#6c757d';
                dateButton.style.cursor = 'not-allowed';
                return;
            }
            priceHeader.textContent = `Цена долгого заказа`;
            sumElement.textContent = `${formatNumberWithSpaces(originalSumValue)} (-${currentDiscount}%)`;
        }

        copyButton.addEventListener('click', () => {
            if (!originalSumValue) return;
            navigator.clipboard.writeText(originalSumValue)
                .then(() => {
                    copyButton.textContent = 'Скопировано!';
                    setTimeout(() => copyButton.textContent = 'Скопировать цену', 2000);
                })
                .catch(err => console.error('Ошибка при копировании:', err));
        });

        dateButton.addEventListener('click', onDateButtonClick);

        function onDateButtonClick() {
            const tbody = document.querySelector("#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody");
            if (!tbody) return;
            const rows = tbody.querySelectorAll("tr");
            if (rows.length === 0) return;
            const lastRow = rows[rows.length - 1];
            const dateCell = lastRow.querySelector("td.right b");
            if (!dateCell) return;
            const rawDateText = dateCell.textContent.trim();
            const parsedDate = parseCustomDate(rawDateText);
            if (!parsedDate) {
                dateResult.textContent = 'Ошибка при чтении даты.';
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((parsedDate - today) / (1000 * 60 * 60 * 24));
            const extendedDays = (diffDays * 2)+1;
            const daysToAdd = extendedDays - diffDays;
            const extendedDate = new Date(today);
            extendedDate.setDate(extendedDate.getDate() + extendedDays);
            dateResult.innerHTML = `
                Увеличенный срок: <strong>${formatDate(extendedDate)}</strong><br>
            `;
            dateButton.textContent = 'Подтверждаю';
            dateButton.disabled = !isSingleClientRow();
            dateButton.style.backgroundColor = isSingleClientRow() ? '#007bff' : '#6c757d';
            dateButton.style.cursor = isSingleClientRow() ? 'pointer' : 'not-allowed';
            dateButton.removeEventListener('click', onDateButtonClick);
            dateButton.addEventListener('click', handleAddOperationClick);
        }

        function showOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'custom-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0, 0, 0, 0.7)';
            overlay.style.backdropFilter = 'blur(5px)';
            overlay.style.zIndex = '99999';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.flexDirection = 'column';

            const messageHTML = `<img src="https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/animlogo.gif " width="270px" height="270px"/> <br/> <br/> <h3 style="color: white;">Увеличиваем срок</h3>`;
            overlay.innerHTML = messageHTML;
            document.body.appendChild(overlay);
        }

        function hideOverlay() {
            const overlay = document.getElementById('custom-overlay');
            if (overlay) overlay.remove();
        }

        function handleAddOperationClick() {
            showOverlay(); // Показываем overlay

            const pencilButton = document.querySelector("#result > div > div > table > tbody > tr:nth-child(1) > td.control > div > button:nth-child(2)");
            if (pencilButton) pencilButton.click();

            const tbody = document.querySelector("#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody");
            if (!tbody) return;
            const rows = tbody.querySelectorAll("tr");
            if (rows.length === 0) return;
            const lastRow = rows[rows.length - 1];
            const dateCell = lastRow.querySelector("td.right b");
            if (!dateCell) return;
            const rawDateText = dateCell.textContent.trim();
            const parsedDate = parseCustomDate(rawDateText);
            if (!parsedDate) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((parsedDate - today) / (1000 * 60 * 60 * 24));
            const extendedDays = diffDays * 2;
            const daysToAdd = extendedDays - diffDays;

            setTimeout(() => {
                const productPostpress = document.querySelector("#ProductPostpress");
                if (!productPostpress) return;
                const selectElement = productPostpress.querySelector("#PostpressId");
                if (!selectElement) return;

                const targetValue = `[Long] +${daysToAdd} ${getDayWord(daysToAdd)}`;
                let targetOption = Array.from(selectElement.options).find(opt => opt.textContent.trim() === targetValue);
                if (!targetOption) {
                    targetOption = document.createElement("option");
                    targetOption.value = targetValue;
                    targetOption.textContent = targetValue;
                    selectElement.appendChild(targetOption);
                }

                selectElement.value = targetOption.value;
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));

                const chosenContainer = productPostpress.querySelector("#PostpressId_chosen");
                if (chosenContainer) {
                    const chosenLink = chosenContainer.querySelector("a");
                    const chosenSpan = chosenContainer.querySelector("a > span");
                    if (chosenLink) chosenLink.setAttribute("title", targetValue);
                    if (chosenSpan) chosenSpan.textContent = targetValue;
                }

                const targetButton = productPostpress.querySelector("table > thead > tr:nth-child(4) > td:nth-child(7) > button");
                if (targetButton) targetButton.click();

                const saveButton = findSaveButtonByText();
                if (saveButton) {
                    saveButton.click();
                }

                // Убираем overlay через 3 секунды
                setTimeout(hideOverlay, 2000);
            }, 2000);
        }

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    updateSum();
                }
            });
        });

        const itogElement = document.getElementById('itog');
        const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');

        if (itogElement) {
            observer.observe(itogElement, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }

        if (inputElement) {
            observer.observe(inputElement, {
                attributes: true,
                attributeFilter: ['value'],
                subtree: true
            });
        }

        updateSum();
        blockCreated = true;
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            if (document.getElementById('itog') && !document.querySelector('.long-order-block')) {
                createLongOrderPriceBlock();
            }
        }, 1000);
    });

    setInterval(() => {
        if (!document.querySelector('.long-order-block')) {
            createLongOrderPriceBlock();
        }
    }, 200);
};

// prolongaror();

function turtle () {
    'use strict';

    // === Переменные для ProductId и постпечатей ===
    let lastProductId = '';
    let lastProcessedTable = null;

    // === Переменные для дат ===
    const selectorDate1 = "#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold";
    const selectorDate2 = "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady";

    let date1Element = null;
    let date2Element = null;

    // === Функции для работы с постпечатями ===

    function findTableAfterFormBlock() {
        const formBlock = document.querySelector('div.formblock');
        if (!formBlock) return null;

        let nextElement = formBlock.nextElementSibling;
        while (nextElement) {
            if (nextElement.tagName === 'TABLE') return nextElement;
            nextElement = nextElement.nextElementSibling;
        }

        return null;
    }

    function findPostPrintMessage() {
        const formBlock = document.querySelector('div.formblock');
        if (!formBlock) return null;

        let nextElement = formBlock.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'TABLE') {
            if (
                nextElement.classList &&
                nextElement.classList.contains('head2') &&
                nextElement.textContent.trim() === 'Постпечатные операции отсутствуют'
            ) {
                return nextElement;
            }
            nextElement = nextElement.nextElementSibling;
        }

        return null;
    }

    function calculateDelayFromLongOperations(table) {
        const rows = table.querySelectorAll("tr");
        let longCount = 0;

        for (let row of rows) {
            const cells = row.querySelectorAll("td");
            for (let cell of cells) {
                if (cell.textContent.includes("[Long]")) {
                    longCount++;
                }
            }
        }

        return longCount * 3; // например, +3 дня за каждую Long-операцию
    }

    function checkPostPrintOperations() {
        const currentTable = findTableAfterFormBlock();
        const currentMessage = findPostPrintMessage();

        const productIdEl = document.querySelector("#ProductId");
        if (!productIdEl) return;

        let currentText = productIdEl.textContent.trim();

        // Проверяем наличие [Long]
        let hasLong = false;
        let delayDays = 0;

        if (currentTable) {
            hasLong = calculateDelayFromLongOperations(currentTable) > 0;
            delayDays = calculateDelayFromLongOperations(currentTable);
        }

        // Убираем старый эмодзи, если он был
        let newText = currentText.replace("🐢", "").trim();

        // Добавляем эмодзи, если есть Long
        if (hasLong) {
            newText += "🐢";
        }

        if (newText !== currentText) {
            productIdEl.textContent = newText;
        }

        // Логика определения состояния постпечатей
        if (currentTable && currentTable !== lastProcessedTable) {
            lastProcessedTable = currentTable;
        } else if (currentMessage) {
            if (lastProcessedTable !== 'message') {
                lastProcessedTable = 'message';
            }
        } else {
            const formBlockExists = document.querySelector('div.formblock') !== null;
            if (formBlockExists && lastProcessedTable !== null && lastProcessedTable !== 'message') {
                lastProcessedTable = null;
            }
        }
    }

    function handleProductChange() {
        const productIdEl = document.querySelector('#ProductId');
        if (!productIdEl) return;

        const currentProductId = productIdEl.textContent.trim().replace("🐢", "").trim();
        if (currentProductId !== lastProductId) {
            lastProductId = currentProductId;
            lastProcessedTable = null;
        }

        checkPostPrintOperations();
    }

    // === Функции для работы с датами ===

    function parseDate1(rawDateStr) {
        const months = {
            января: "01", февраля: "02", марта: "03", апреля: "04",
            мая: "05", июня: "06", июля: "07", августа: "08",
            сентября: "09", октября: "10", ноября: "11", декабря: "12"
        };

        const parts = rawDateStr.split(' ');
        if (parts.length < 3) return null;

        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]];
        const year = parts[2];

        return `${day}.${month}.${year}`;
    }

    function parseDate2(rawDateStr) {
        const match = rawDateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!match) return null;

        const [, dd, mm, yyyy] = match;
        return `${dd}.${mm}.${yyyy}`;
    }

    function convertToDateObject(dateStr) {
        const [day, month, year] = dateStr.split('.');
        return new Date(year, month - 1, day);
    }

    function logDatesAndDifference() {
        if (!date1Element || !date2Element) return;

        const rawDate1 = date1Element.textContent.trim();
        const rawDate2 = date2Element.textContent.trim();

        const formattedDate1 = parseDate1(rawDate1);
        const formattedDate2 = parseDate2(rawDate2);

        if (!formattedDate1 || !formattedDate2) return;

        const dateObj1 = convertToDateObject(formattedDate1);
        const dateObj2 = convertToDateObject(formattedDate2);

        if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) return;

        const diffTime = Math.abs(dateObj2 - dateObj1);
        const totalDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Получаем таблицу с постпечатями
        const currentTable = findTableAfterFormBlock();
        let delayDays = 0;

        if (currentTable) {
            delayDays = calculateDelayFromLongOperations(currentTable);
        }

        const trueDuration = totalDiffDays - delayDays;
    }

    function startWatching(selector, callback) {
        let lastFound = null;

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element && element !== lastFound) {
                lastFound = element;
                callback(element);
            } else if (!element && lastFound) {
                lastFound = null;
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(() => {
            const element = document.querySelector(selector);
            if (element && element !== lastFound) {
                lastFound = element;
                callback(element);
            } else if (!element && lastFound) {
                lastFound = null;
            }
        }, 2000);
    }

    // === Инициализация наблюдений ===

    // Слежка за ProductId
    const productObserver = new MutationObserver(() => {
        handleProductChange();
    });
    productObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    handleProductChange(); // Инициализация

    // Слежка за датами
    startWatching(selectorDate1, (element) => {
        date1Element = element;
        logDatesAndDifference();
    });

    startWatching(selectorDate2, (element) => {
        date2Element = element;
        logDatesAndDifference();
    });
};
turtle ();

function noDelete () {
    'use strict';

    const checkElements = () => {
        const productPostpress = document.querySelector("#ProductPostpress");
        if (!productPostpress) return;

        const postpressList = productPostpress.querySelector("#PostpressList");
        if (!postpressList) return;

        const rows = postpressList.querySelectorAll("tr");
        rows.forEach(row => {
            const firstTd = row.querySelector("td");
            if (firstTd && firstTd.textContent.trim().includes("[Long]")) {
                const deleteButton = row.querySelector("button[onclick*='PostpressDelete']");
                if (deleteButton) {
                    deleteButton.style.display = 'none';
                }
            } else {
                const deleteButton = row.querySelector("button[onclick*='PostpressDelete']");
                if (deleteButton) {
                    deleteButton.style.display = '';
                }
            }
        });
    };

    // Периодическая проверка появления элементов
    setInterval(checkElements, 500);

    // Отслеживание изменений в DOM
    const observer = new MutationObserver(() => {
        checkElements();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};
noDelete ();



function groupZapusk () {
    'use strict';

    const SELECTOR = '#GroupEditor > div:nth-child(3)';
    let isHidden = false;

    // Функция для скрытия элемента
    function hideElement(element) {
        if (!element || isHidden) return;

        element.style.display = 'none';
        isHidden = true;
    }

    // Функция, вызываемая при изменении DOM
    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const targetElement = document.querySelector(SELECTOR);
                if (targetElement) {
                    hideElement(targetElement);
                } else if (isHidden) {
                    // Элемент исчез из DOM
                    isHidden = false;
                }
            }
        }
    }

    // Создаём MutationObserver для отслеживания изменений в DOM
    const observer = new MutationObserver(handleMutations);

    // Начинаем наблюдение за всем документом
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Проверка на случай, если элемент уже присутствует при запуске скрипта
    const initialElement = document.querySelector(SELECTOR);
    if (initialElement) {
        hideElement(initialElement);
    }
};
groupZapusk ();

           function heavyZakazAlpha() {'use strict';

    let lastProcessedMassRow = null;
    const REMINDER_TEXT = " Требуется платная доставка грузовым авто";

    function getMassRowAndValue() {
        const table = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table");
        if (!table) return null;

        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
            const firstCell = row.querySelector('td:first-child');
            if (firstCell && firstCell.textContent.trim() === "Масса тиража:") {
                const secondCell = row.querySelector('td:nth-child(2)');
                if (secondCell) {
                    const massText = secondCell.textContent.trim();
                    const numeric = parseFloat(massText.replace(',', '.').replace(/\s*кг\.?/, ''));
                    if (!isNaN(numeric)) {
                        return { row, mass: numeric, massCell: secondCell, originalText: massText };
                    }
                }
            }
        }
        return null;
    }

    function highlightIfNeeded() {
        const result = getMassRowAndValue();

        // Сброс предыдущей подсветки и текста, если строка исчезла или изменилась
        if (lastProcessedMassRow && (!result || result.row !== lastProcessedMassRow)) {
            lastProcessedMassRow.style.backgroundColor = '';
            lastProcessedMassRow.style.color = '';
            // Восстанавливаем оригинальный текст, если он был изменён
            const massCell = lastProcessedMassRow.querySelector('td:nth-child(2)');
            if (massCell && massCell.textContent.trim().endsWith(REMINDER_TEXT)) {
                massCell.textContent = massCell.textContent.trim().replace(REMINDER_TEXT, '').trim();
            }
            lastProcessedMassRow = null;
        }

        if (!result) return;

        const { row, mass, massCell, originalText } = result;

        if (mass > 200) {
            // Применяем стили
            row.style.backgroundColor = 'red';
            row.style.color = 'white';

            // Добавляем напоминание, только если его ещё нет
            if (!massCell.textContent.includes(REMINDER_TEXT)) {
                massCell.textContent = originalText + REMINDER_TEXT;
            }

            lastProcessedMassRow = row;
        } else {
            // Если масса ≤ 200, но ранее была подсвечена — сбрасываем
            if (lastProcessedMassRow === row) {
                row.style.backgroundColor = '';
                row.style.color = '';
                if (massCell.textContent.includes(REMINDER_TEXT)) {
                    massCell.textContent = originalText;
                }
                lastProcessedMassRow = null;
            }
        }
    }

    // Наблюдатель за изменениями DOM
    const observer = new MutationObserver(() => {
        highlightIfNeeded();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


    // Первый запуск
    highlightIfNeeded();
}
heavyZakazAlpha();

function outsourceCheck () {
    'use strict';

    const TARGET_IMAGE_SRC = 'img/status/status-outsource-calc.png';
    const STATUS_SELECTOR = '#StatusIcon > img';
    const DESCRIPTION_SELECTOR = '#Description';

    // Удаляет "Проверено" или "проверено" (с пробелами, любым регистром)
    function removeCheckedText() {
        const descEl = document.querySelector(DESCRIPTION_SELECTOR);
        if (!descEl) return;

        const originalText = descEl.value || descEl.textContent || '';
        // Удаляем "проверено" в любом регистре и с любыми пробелами вокруг
        const cleanedText = originalText.replace(/\s*проверено\s*/gi, '').trim();

        if (originalText !== cleanedText) {
            if (descEl.tagName === 'TEXTAREA' || descEl.tagName === 'INPUT') {
                descEl.value = cleanedText;
            } else {
                descEl.textContent = cleanedText;
            }

            // Вызываем обработчик onchange или OutsourceSetValue
            if (typeof descEl.onchange === 'function') {
                descEl.onchange();
            } else {
                const onchangeAttr = descEl.getAttribute('onchange');
                const match = onchangeAttr && onchangeAttr.match(/OutsourceSetValue\((\d+),/);
                if (match && match[1] && typeof OutsourceSetValue === 'function') {
                    OutsourceSetValue(match[1], descEl.id, descEl.value);
                }
            }
        }
    }

    // Проверка: нужная иконка + наличие #Description
    function checkConditions() {
        const statusImg = document.querySelector(STATUS_SELECTOR);
        const descriptionEl = document.querySelector(DESCRIPTION_SELECTOR);

        if (statusImg && statusImg.src && statusImg.src.endsWith(TARGET_IMAGE_SRC) && descriptionEl) {
            removeCheckedText();
        }
    }

    // Отслеживание изменений в DOM
    const observer = new MutationObserver(checkConditions);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Первоначальные проверки на случай, если элементы уже загружены
    setTimeout(checkConditions, 100);
    setTimeout(checkConditions, 500);
    setTimeout(checkConditions, 1000);
};
outsourceCheck ();

      function otsrochka () {
    'use strict';

    const SELECTOR = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.PlanReady";
    const TOOLTIP_CLASS = "tamper-tooltip-container";
    const DATA_ATTR = "data-tamper-replaced";

    // Добавляем стили один раз
    function addStyles() {
        if (document.getElementById('tamper-tooltip-styles')) return;

        const style = document.createElement('style');
        style.id = 'tamper-tooltip-styles';
        style.textContent = `
            .${TOOLTIP_CLASS} {
                position: relative;
                display: inline-block;
                cursor: help;
                vertical-align: middle;
            }

            .${TOOLTIP_CLASS} .icon {
                font-size: 18px;
                color: #666;
                font-weight: bold;
                line-height: 1;
                margin-left: 6px;
                margin-right: 6px;
            }

            .${TOOLTIP_CLASS} .tooltip-text {
                visibility: hidden;
                width: 220px;
                background-color: #333;
                color: #fff;
                text-align: center;
                border-radius: 6px;
                padding: 8px;
                position: absolute;
                z-index: 10000;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 14px;
                white-space: pre-line;
            }

            .${TOOLTIP_CLASS}:hover .tooltip-text {
                visibility: visible;
                opacity: 1;
            }

            .${TOOLTIP_CLASS} .tooltip-text::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #333 transparent transparent transparent;
            }
        `;
        document.head.appendChild(style);
    }

    // Создаёт иконку с тултипом
    function createTooltipElement() {
        const container = document.createElement('div');
        container.className = TOOLTIP_CLASS;
        container.setAttribute(DATA_ATTR, 'true');

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = '?'; // Знак вопроса в кружочке (Unicode)

        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-text';
        tooltip.textContent = "Заказы на доставку курьером - ко второй доставке в 15:00\n\nЗаказы на самовывоз - до 19:00";

        container.appendChild(icon);
        container.appendChild(tooltip);
        return container;
    }

    // Обрабатывает текущее состояние DOM
    function handleDOM() {
        const target = document.querySelector(SELECTOR);
        const existingTooltip = document.querySelector(`[${DATA_ATTR}]`);

        if (target) {
            // Если элемент есть, но тултипа нет — добавляем
            if (!existingTooltip) {
                target.style.display = 'none';
                target.parentNode.insertBefore(createTooltipElement(), target.nextSibling);
            }
        } else {
            // Если элемента нет — удаляем тултип
            if (existingTooltip) {
                existingTooltip.remove();
            }
        }
    }

    // Запуск
    addStyles();

    // Немедленная проверка (на случай, если элемент уже загружен)
    handleDOM();

    // Наблюдатель за изменениями DOM
    const observer = new MutationObserver(() => {
        handleDOM();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};
otsrochka ();

      function hideLogs () {
    'use strict';

    // Функция для обработки конкретного выпадающего меню
    function processDropdownMenu(ul) {
        if (!ul || ul.hasAttribute('data-logs-hidden')) return;
        ul.setAttribute('data-logs-hidden', 'true'); // защита от повторной обработки

        const items = ul.querySelectorAll('li > a');
        for (const link of items) {
            if (link.textContent.trim() === "Логи заказа") {
                const li = link.closest('li');
                if (li) li.remove();
                break;
            }
        }
    }

    // Функция для обработки контейнера меню при открытии
    function observeDropdown(container) {
        if (container.hasAttribute('data-observer-attached')) return;
        container.setAttribute('data-observer-attached', 'true');

        const observer = new MutationObserver(() => {
            if (container.classList.contains('open')) {
                const ul = container.querySelector('ul.dropdown-menu');
                if (ul) {
                    requestAnimationFrame(() => processDropdownMenu(ul));
                }
            }
        });

        observer.observe(container, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Также проверим сразу, если уже открыт
        if (container.classList.contains('open')) {
            const ul = container.querySelector('ul.dropdown-menu');
            if (ul) processDropdownMenu(ul);
        }
    }

    // Главный observer: следим за появлением любого подходящего контейнера
    const mainObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Проверяем новые узлы
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // Если сам node — это нужный контейнер
                if (
                    node.matches &&
                    node.matches("#TopButtons > div.btn-group.btn-group-sm.dropdown")
                ) {
                    observeDropdown(node);
                }

                // Или если внутри node есть такие контейнеры
                if (node.querySelectorAll) {
                    const dropdowns = node.querySelectorAll(
                        "#TopButtons > div.btn-group.btn-group-sm.dropdown"
                    );
                    dropdowns.forEach(observeDropdown);
                }
            }
        }
    });

    // Запускаем наблюдение за всем телом
    mainObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Обрабатываем уже существующие элементы (на случай, если скрипт загрузился позже)
    const existingDropdowns = document.querySelectorAll(
        "#TopButtons > div.btn-group.btn-group-sm.dropdown"
    );
    existingDropdowns.forEach(observeDropdown);
};

hideLogs ();


function spisanieBonus () {
    'use strict';

    let bonusValue = null;
    let buttonAdded = false;

    // 🔴 ЗАМЕНИ НА СВОЙ URL!
    const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjiMSlZBCDnOgqj6exEuMH4tjwBJsZcd2bWpUNn5-kXVUMx3q_IuiKmcoj2_Du3IA/exec";

    function extractBonusValue(text) {
        const cleaned = text.replace(/[^0-9,\s.]/g, '').trim();
        if (!cleaned) return null;
        const noSpaces = cleaned.replace(/\s+/g, '');
        const normalized = noSpaces.replace(/,/g, '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    }

    function extractNumericProductId(productId) {
        if (!productId) return null;
        // Извлекаем только числовые символы из productId
        const numericValue = productId.toString().replace(/\D/g, '');
        return numericValue ? numericValue : null;
    }

    function tryToAddButton() {
        if (buttonAdded) return;

        const targetTdSelector = "#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr.bonus-row > td";
        const targetTd = document.querySelector(targetTdSelector);
        const targetTbody = document.querySelector("#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody");

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
        const newCell = document.createElement('td');
        newCell.colSpan = 2;
        newCell.style.textAlign = 'center';
        newCell.style.padding = '10px 0';

        const button = document.createElement('button');
        button.textContent = 'Списать бонусы';
        button.id = 'useBonusBtn';
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
        button.onmouseover = () => button.style.transform = 'scale(1.03)';
        button.onmouseout = () => button.style.transform = 'scale(1)';
        button.onclick = createModal;

        newCell.appendChild(button);
        newRow.appendChild(newCell);
        targetTbody.appendChild(newRow);
    }

    function removeButton() {
        const button = document.getElementById('useBonusBtn');
        if (button && button.parentElement && button.parentElement.parentElement) {
            button.parentElement.parentElement.remove();
        }
        buttonAdded = false;
    }

    async function createModal() {
        const existing = document.getElementById('bonusModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'bonusModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            animation: fadeIn 0.3s ease-out;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(to bottom, #ffffff, #f8f9fa);
            padding: 24px;
            border-radius: 12px;
            width: 360px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            animation: slideIn 0.4s ease-out;
        `;

        content.innerHTML = `
            <div id="loading" style="text-align: center; padding: 20px; color: #007bff;">
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #333; font-weight: 600;">Бонусы клиента</h3>
                <p style="color: #666; margin: 8px 0;">
                    <strong>Баланс:</strong> <span id="modalBalance" style="color: #28a745; font-weight: bold;">${bonusValue}</span>
                </p>
                Проверка существующих данных...
            </div>
            <div id="form" style="display: none;"></div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        if (!document.getElementById('bonusModalStyles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'bonusModalStyles';
            styleEl.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
            `;
            document.head.appendChild(styleEl);
        }

        const loadingDiv = document.getElementById('loading');
        const formDiv = document.getElementById('form');

        const productIdEl = document.querySelector("#ProductId");
        let productId = productIdEl
            ? (productIdEl.value !== undefined ? productIdEl.value : (productIdEl.textContent || productIdEl.innerText).trim())
            : null;

        // Извлекаем только числовое значение из productId
        const numericProductId = extractNumericProductId(productId);
        if (!numericProductId) {
            loadingDiv.innerHTML = `
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #333; font-weight: 600;">Бонусы клиента</h3>
                <p style="color: #666; margin: 8px 0;">
                    <strong>Баланс:</strong> <span id="modalBalance" style="color: #28a745; font-weight: bold;">${bonusValue}</span>
                </p>
                ❌ Не удалось определить числовое значение ProductId
            `;
            formDiv.style.display = 'block';
            return;
        }

// Попытка 1: стандартный путь с <div><a><span>
let summarySpanEl = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span");
let summaryText = summarySpanEl ? (summarySpanEl.textContent || summarySpanEl.innerText).trim() : null;

// Попытка 2: если нет span — ищем упрощённую строку вида <tr><td>Заказчик:</td><td>УПТ</td></tr>
if (!summaryText) {
    const fallbackRow = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2)");
    if (fallbackRow) {
        const tds = fallbackRow.querySelectorAll('td');
        if (tds.length >= 2) {
            // Проверим, что первая ячейка содержит "Заказчик:" (или похожее), чтобы не ошибиться
            const firstCellText = (tds[0].textContent || tds[0].innerText).trim().toLowerCase();
            if (firstCellText.includes('заказчик') || firstCellText === 'клиент') {
                summaryText = (tds[1].textContent || tds[1].innerText).trim();
            }
        }
    }
}

        const checkUrl = `${GOOGLE_SCRIPT_WEB_APP_URL}?action=get&productId=${encodeURIComponent(numericProductId)}`;

        try {
            const response = await fetch(checkUrl, { method: "GET", mode: "cors" });
            const result = await response.json();

            if (result.status !== "success") throw new Error(result.message || "Ошибка проверки");

            loadingDiv.style.display = 'none';
            formDiv.style.display = 'block';

            if (result.found && result.data.inSalary) {
                formDiv.innerHTML = `
                    <h3 style="margin-top: 0; margin-bottom: 12px; color: #333; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007BFF" stroke-width="2">
                            <path d="M3 10h18v4H3z"/>
                            <path d="M6 14h12v-4H6z"/>
                            <path d="M9 14h6v-4H9z"/>
                        </svg>
                        Бонусы клиента
                    </h3>
                    <p style="color: #666; margin: 8px 0;">
                        <strong>Баланс:</strong> <span id="modalBalance" style="color: #28a745; font-weight: bold;">${bonusValue}</span>
                    </p>
                    <div style="text-align: center; padding: 20px; color: #e74c3c; font-weight: bold; background: #fdf2f2; border-radius: 8px; margin-top: 12px; font-size: 14px;">
                        ⚠️Заказ попал в зарплату!⚠️<br>Редактирование невозможно!
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="modalCloseBtn" style="
                            width: 100px;
                            height: 36px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">Закрыть</button>
                    </div>
                `;
                document.getElementById('modalCloseBtn').onclick = () => modal.remove();
                return;
            }

            // === Получаем предложенную сумму из Fin-инпута ===
            const finInput = document.querySelector("#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input");
            let suggestedAmount = 0;
            if (finInput) {
                const rawValue = parseFloat(finInput.value);
                if (!isNaN(rawValue)) {
                    if (rawValue < 0) {
                        suggestedAmount = Math.round(Math.abs(rawValue));
                    } else {
                        suggestedAmount = 0;
                    }
                }
            }

            // === Получаем ClientGettingID из select ИЛИ из скрипта ===
let gettingClientId = "";

// Попытка 1: стандартный select
const clientGettingSelect = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > select");
if (clientGettingSelect && clientGettingSelect.value) {
    gettingClientId = clientGettingSelect.value;
} else {
    // Попытка 2: парсим ClientId из <script>
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        const text = script.textContent || script.innerText || '';
        if (text.includes('Product = {') && text.includes('ClientId:')) {
            const match = text.match(/ClientId:\s*(\d+)/);
            if (match) {
                gettingClientId = match[1]; // строка, как и value у select
                break;
            }
        }
    }
}

            const isEditing = result.found && !result.data.inSalary;
            const title = isEditing ? "Редактирование бонусов" : "Списание бонусов";
            const amountLabel = isEditing
                ? '<span style="font-weight: 500;">Исправьте сумму списанных бонусов на:</span><br>'
                : '<span style="font-weight: 500;">Сколько бонусов списываем:</span><br>';

            let additionalInfo = '';
            if (isEditing && result.data.amount) {
                additionalInfo = `
                    <p style="color: #555; margin: 8px 0; font-size: 13px;">
                        <strong>Бонусов списано:</strong> <span style="color: #28a745; font-weight: bold;">${result.data.amount}</span>
                    </p>
                `;
            }

            formDiv.innerHTML = `
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #333; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    💵 ${title}
                </h3>
                <p style="color: #666; margin: 8px 0;">
                    <strong>Баланс:</strong> <span id="modalBalance" style="color: #28a745; font-weight: bold;">${bonusValue}</span>
                </p>
                ${additionalInfo}
                <label style="display: block; margin: 12px 0;">
                    ${amountLabel}
                    <input type="number" id="bonusAmountInput" min="0" step="1"
                        value="${isEditing ? (result.data.amount || Math.floor(bonusValue)) : suggestedAmount}"
                        style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                </label>
                <div id="errorMessage" style="color: #dc3545; font-size: 13px; min-height: 18px; margin-top: 4px;"></div>

                <label style="display: block; margin: 16px 0 24px 0; cursor: pointer;">
                    <input type="checkbox" id="taxiCheckbox" style="margin-right: 8px;">
                    <span style="font-weight: 500;">Списание на такси</span>
                </label>

                <div style="text-align: center; margin-top: 20px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    <button id="modalCloseBtn" style="
                        width: 130px;
                        height: 36px;
                        padding: 4px 8px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        transition: background 0.2s;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    ">Закрыть</button>
                    <button id="modalDeleteBtn" style="
                        width: 130px;
                        height: 36px;
                        padding: 4px 8px;
                        background: #a94442;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        transition: background 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        gap: 0;
                        line-height: 1.2;
                        text-align: center;
                        white-space: normal;
                        overflow: visible;
                    ">
                        <span>Удалить</span>
                        <span>списание</span>
                    </button>
                    <button id="modalSubmitBtn" style="
                        width: 120px;
                        height: 36px;
                        padding: 4px 8px;
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: bold;
                        box-shadow: 0 1px 3px rgba(40, 167, 69, 0.3);
                        transition: all 0.2s;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">Сохранить</button>
                </div>
            `;

            const input = document.getElementById('bonusAmountInput');
            const errorDiv = document.getElementById('errorMessage');
            const taxiCheckbox = document.getElementById('taxiCheckbox');

            // Запрет на ввод любых символов, кроме цифр и управляющих клавиш
input.addEventListener('keydown', function(e) {
    // Разрешаем: цифры, Backspace, Delete, Tab, Escape, Enter, стрелки, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (
        // Цифры
        (e.key >= '0' && e.key <= '9') ||
        // Служебные клавиши
        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
        // Комбинации с Ctrl (например, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X)
        (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))
    ) {
        return; // разрешаем ввод
    } else {
        // отменяем ввод
        e.preventDefault();
    }
});

// Также добавим обработчик input для дополнительной защиты
input.addEventListener('input', () => {
    let value = input.value;
    let newValue = value.replace(/[^0-9]/g, '');
    if (input.value !== newValue) {
        input.value = newValue;
    }
    // Сброс ошибки при вводе
    if (input.style.borderColor === 'red') {
        input.style.borderColor = '#ddd';
        input.style.animation = 'none';
        errorDiv.textContent = '';
    }
});

            if (result.found) {
                taxiCheckbox.checked = !!result.data.taxi;
                document.getElementById('modalSubmitBtn').textContent = "Обновить";
                document.getElementById('modalDeleteBtn').style.display = 'inline-block';
            } else {
                taxiCheckbox.checked = false;
                document.getElementById('modalSubmitBtn').textContent = "Списать";
                document.getElementById('modalDeleteBtn').style.display = 'none';
            }

            function showError(message) {
                input.style.borderColor = '#dc3545';
                input.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
                errorDiv.textContent = message;
            }

            input.addEventListener('input', () => {
                if (input.style.borderColor === 'red') {
                    input.style.borderColor = '#ddd';
                    input.style.animation = 'none';
                    errorDiv.textContent = '';
                }
            });

            document.getElementById('modalCloseBtn').onclick = () => modal.remove();

            // --- КНОПКА УДАЛЕНИЯ ---
            let deleteConfirmActive = false;
            let deleteTimeout = null;

            document.getElementById('modalDeleteBtn').onclick = async () => {
                const deleteBtn = document.getElementById('modalDeleteBtn');

                if (deleteConfirmActive) {
                    clearTimeout(deleteTimeout);
                    deleteConfirmActive = false;
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 6px; flex-shrink: 0;">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="3" stroke-dasharray="15" stroke-dashoffset="0">
                                <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
                            </circle>
                        </svg>
                        <span style="font-size: 12px; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Удаление…</span>
                    `;
                    deleteBtn.style.opacity = '0.8';
                    deleteBtn.style.cursor = 'not-allowed';

                    const delUrl = `${GOOGLE_SCRIPT_WEB_APP_URL}?action=delete&productId=${encodeURIComponent(numericProductId)}`;
                    try {
                        const res = await fetch(delUrl, { method: "GET", mode: "cors" });
                        const data = await res.json();
                        if (data.status === "success") {
                            deleteBtn.innerHTML = '✅ Успешно!';
                            setTimeout(() => modal.remove(), 2000);
                        } else {
                            deleteBtn.innerHTML = '❌ Ошибка';
                            deleteBtn.disabled = false;
                            setTimeout(() => {
                                deleteBtn.textContent = 'Удалить';
                                deleteBtn.style.backgroundColor = '#a94442';
                                deleteBtn.style.opacity = '1';
                                deleteBtn.style.cursor = 'pointer';
                            }, 2000);
                        }
                    } catch (err) {
                        console.error(err);
                        deleteBtn.innerHTML = '❌ Ошибка';
                        deleteBtn.disabled = false;
                        setTimeout(() => {
                            deleteBtn.textContent = 'Удалить';
                            deleteBtn.style.backgroundColor = '#a94442';
                            deleteBtn.style.opacity = '1';
                            deleteBtn.style.cursor = 'pointer';
                        }, 2000);
                    }

                } else {
                    deleteConfirmActive = true;
                    deleteBtn.textContent = "Точно?";
                    deleteBtn.style.backgroundColor = '#c10020';

                    deleteTimeout = setTimeout(() => {
                        deleteConfirmActive = false;
                        deleteBtn.textContent = "Удалить";
                        deleteBtn.style.backgroundColor = '#a94442';
                    }, 3000);
                }
            };

            document.getElementById('modalSubmitBtn').onclick = async () => {
                const amount = parseFloat(input.value);
                const taxiChecked = taxiCheckbox.checked;

                errorDiv.textContent = '';
                if (isNaN(amount) || amount <= 0) return showError('Введите корректную сумму');
                if (amount > bonusValue) return showError('Нельзя списать больше, чем доступно');

                const submitBtn = document.getElementById('modalSubmitBtn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 6px; flex-shrink: 0;">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="3" stroke-dasharray="15" stroke-dashoffset="0">
                            <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                    <span style="font-size: 12px; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Сохранение…</span>
                `;
                submitBtn.style.opacity = '0.8';
                submitBtn.style.cursor = 'not-allowed';

                // Используем числовое значение productId в URL
                const saveUrl = `${GOOGLE_SCRIPT_WEB_APP_URL}?action=save&productId=${encodeURIComponent(numericProductId)}&taxi=${taxiChecked}&summaryText=${encodeURIComponent(summaryText || "")}&amount=${encodeURIComponent(amount)}&gettingClientId=${encodeURIComponent(gettingClientId)}`;

                try {
                    const res = await fetch(saveUrl, { method: "GET", mode: "cors" });
                    const data = await res.json();
                    if (data.status === "success") {
                        submitBtn.innerHTML = '✅ Успешно!';
                        setTimeout(() => modal.remove(), 2000);
                    } else {
                        throw new Error(data.message || "Ошибка сервера");
                    }
                } catch (err) {
                    console.error(err);
                    submitBtn.innerHTML = '❌ Ошибка';
                    submitBtn.disabled = false;
                    setTimeout(() => {
                        submitBtn.innerHTML = 'Повторить';
                    }, 2000);
                }
            };

        } catch (err) {
            console.error("Ошибка при проверке записи:", err);
            loadingDiv.style.display = 'none';
            formDiv.innerHTML = `
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #333; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007BFF" stroke-width="2">
                        <path d="M3 10h18v4H3z"/>
                        <path d="M6 14h12v-4H6z"/>
                        <path d="M9 14h6v-4H9z"/>
                    </svg>
                    Бонусы клиента
                </h3>
                <p style="color: #666; margin: 8px 0;">
                    <strong>Баланс:</strong> <span id="modalBalance" style="color: #28a745; font-weight: bold;">${bonusValue}</span>
                </p>
                <div style="text-align: center; color: #e74c3c; margin-top: 12px;">⚠️ Не удалось загрузить данные</div>
            `;
            formDiv.style.display = 'block';
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    const observer = new MutationObserver(() => {
        const targetTd = document.querySelector("#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr.bonus-row > td");
        if (targetTd) {
            tryToAddButton();
        } else if (buttonAdded) {
            removeButton();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    tryToAddButton();
};

spisanieBonus ();

      function hideInfoPage() {
    'use strict';

    const inputSelector = 'input[type="text"].need.AddressText';
    const dropdownContainerSelector = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > div';
    const activeClass = 'chosen-container-active';
    const nomenclatureTableSelector = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3)';
    const costTableSelector = 'table.table.table-striped.table-condensed';

    // === 1. Скрытие input ===
    function hideInput(el) {
        if (!el.hasAttribute('data-hidden-by-script')) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el.setAttribute('data-hidden-by-script', 'true');
        }
    }

    // === 2. Скрытие пункта "- Другое -", только если контейнер активен ===
    function hideOtherOption(container) {
        if (!container || !container.classList.contains(activeClass)) {
            return;
        }

        const drop = container.querySelector('.chosen-drop');
        if (!drop) return;

        const otherItem = Array.from(drop.querySelectorAll('li, div, span')).find(el =>
            el.textContent.trim() === '- Другое -'
        );

        if (otherItem && !otherItem.hasAttribute('data-hidden-by-script')) {
            otherItem.style.display = 'none';
            otherItem.setAttribute('data-hidden-by-script', 'true');
        }
    }

    // === 3. Скрытие ТОЛЬКО строк с "Тип номенклатуры" и "Номенклатура" ===
    function hideSpecificNomenclatureRows(container) {
        if (!container) return;

        const rows = container.querySelectorAll('tr');
        rows.forEach(row => {
            const firstTd = row.querySelector('td:first-child');
            if (!firstTd) return;

            const text = firstTd.textContent.trim();
            if (
                text === 'Тип номенклатуры' ||
                text === 'Номенклатура'
            ) {
                if (!row.hasAttribute('data-hidden-by-script')) {
                    row.style.opacity = '0.5';
                    row.style.pointerEvents = 'none';
                    row.setAttribute('data-hidden-by-script', 'true');
                }
            }
        });
    }

    // === 4. Скрытие таблицы, содержащей <td>Себестоимость</td> ===
    function hideCostTable() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const hasCostTd = Array.from(table.querySelectorAll('td')).some(td =>
                td.textContent.trim() === 'Себестоимость'
            );
            if (hasCostTd && table.matches(costTableSelector) && !table.hasAttribute('data-hidden-by-script')) {
                table.style.opacity = '0';
                table.style.pointerEvents = 'none';
                table.setAttribute('data-hidden-by-script', 'true');
            }
        });
    }

    // === 5. Замена "Доставка" на "Упаковка" ===
    function replaceDeliveryWithPacking() {
        // Ищем все ссылки с href="#chat_8" и текстом "Доставка"
        const deliveryLinks = document.querySelectorAll('a[href="#chat_8"]');
        deliveryLinks.forEach(link => {
            if (link.textContent.trim() === 'Доставка' && !link.hasAttribute('data-renamed-by-script')) {
                link.textContent = 'Упаковка';
                link.setAttribute('data-renamed-by-script', 'true');
            }
        });
    }

    // === Инициализация ===
    document.querySelectorAll(inputSelector).forEach(hideInput);

    const initialDropdownContainer = document.querySelector(dropdownContainerSelector);
    if (initialDropdownContainer) {
        hideOtherOption(initialDropdownContainer);
    }

    const initialNomenclatureContainer = document.querySelector(nomenclatureTableSelector);
    if (initialNomenclatureContainer) {
        hideSpecificNomenclatureRows(initialNomenclatureContainer);
    }

    hideCostTable();
    replaceDeliveryWithPacking(); // Применяем замену сразу

    // === Наблюдатель за DOM ===
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(inputSelector)) {
                            hideInput(node);
                        }
                        const inputs = node.querySelectorAll ? node.querySelectorAll(inputSelector) : [];
                        inputs.forEach(hideInput);

                        // Выпадающий список
                        let dropdownContainers = [];
                        if (node.matches && node.matches(dropdownContainerSelector)) {
                            dropdownContainers.push(node);
                        }
                        if (node.querySelectorAll) {
                            dropdownContainers = dropdownContainers.concat(Array.from(node.querySelectorAll(dropdownContainerSelector)));
                        }
                        dropdownContainers.forEach(hideOtherOption);

                        // Таблица номенклатуры
                        if (node.matches && node.matches(nomenclatureTableSelector)) {
                            hideSpecificNomenclatureRows(node);
                        }
                        if (node.querySelectorAll) {
                            const nomenclatureContainers = node.querySelectorAll(nomenclatureTableSelector);
                            nomenclatureContainers.forEach(hideSpecificNomenclatureRows);
                        }

                        // Таблица себестоимости
                        if (node.tagName === 'TABLE') {
                            hideCostTable();
                        } else if (node.querySelectorAll) {
                            const tablesInNode = node.querySelectorAll('table');
                            tablesInNode.forEach(() => hideCostTable());
                        }

                        // Замена "Доставка" → "Упаковка"
                        if (node.tagName === 'A' && node.href && node.href.includes('#chat_8')) {
                            replaceDeliveryWithPacking();
                        } else if (node.querySelectorAll) {
                            const linksInNode = node.querySelectorAll('a[href="#chat_8"]');
                            if (linksInNode.length > 0) {
                                replaceDeliveryWithPacking();
                            }
                        }
                    }
                });

                const target = mutation.target;
                if (target.nodeType === Node.ELEMENT_NODE) {
                    if (target.matches && target.matches(dropdownContainerSelector)) {
                        hideOtherOption(target);
                    }
                    if (target.matches && target.matches(nomenclatureTableSelector)) {
                        hideSpecificNomenclatureRows(target);
                    }
                    if (target.tagName === 'TABLE') {
                        hideCostTable();
                    }
                    if (target.tagName === 'A' && target.href && target.href.includes('#chat_8')) {
                        replaceDeliveryWithPacking();
                    }
                }
            }

            // Отслеживаем активность выпадашки
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.nodeType === Node.ELEMENT_NODE && target.matches && target.matches(dropdownContainerSelector)) {
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

    // Резервная проверка (на случай динамической загрузки)
    document.addEventListener('DOMNodeInserted', () => {
        setTimeout(() => {
            hideCostTable();
            replaceDeliveryWithPacking();
        }, 100);
    }, false);
};
      hideInfoPage ();

function hideSkidkiUpak() {
    'use strict';

    function closestTdWithClass(el, className) {
        while (el && el.tagName !== 'HTML') {
            if (el.tagName === 'TD' && el.classList.contains(className)) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    function updateVisibility() {
        // 1. Условное скрытие ячейки внутри #CalcUt
        const calcUt = document.querySelector('#CalcUt');
        const targetCell = document.querySelector('#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(2)');
        if (calcUt && targetCell) {
            targetCell.style.display = 'none';
        } else if (targetCell) {
            targetCell.style.display = '';
        }

        // 2. Скрыть #PackTypeBlock всегда
        const packTypeBlock = document.getElementById('PackTypeBlock');
        if (packTypeBlock) {
            packTypeBlock.style.display = 'none';
        }

        // 3. Скрыть <td class="nobreak" width="100">, содержащий SummaModifyMin
        const summaModifyMin = document.getElementById('SummaModifyMin');
        if (summaModifyMin) {
            const containerTd = closestTdWithClass(summaModifyMin, 'nobreak');
            if (containerTd && containerTd.getAttribute('width') === '100') {
                containerTd.style.display = 'none';
            }
        }

        // 4. Добавить отступы слева и справа (по 10px) к #TirazhLabel.superhead
        const tirazhLabel = document.getElementById('TirazhLabel');
        if (tirazhLabel && tirazhLabel.classList.contains('superhead')) {
            tirazhLabel.style.paddingLeft = '20px';
            tirazhLabel.style.paddingRight = '20px';
        }
    }

    // Запускаем сразу
    updateVisibility();

    // Наблюдаем за изменениями в DOM
    const observer = new MutationObserver(updateVisibility);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};
      hideSkidkiUpak();

      function checkIzdelia () {
    'use strict';

    let active = false;
    let domObserver = null;
    let radioChangeListener = null;
    let periodicChecker = null;
    let calcButton = null;
    let warningElement = null;
    const HIGHLIGHT_CLASS = 'tm-highlight-missing-row-cell';
    const LABEL_HIGHLIGHT_CLASS = 'tm-ut-label-error';

    function injectStyles() {
        if (document.querySelector(`#${LABEL_HIGHLIGHT_CLASS}-style`)) return;
        const style = document.createElement('style');
        style.id = `${LABEL_HIGHLIGHT_CLASS}-style`;
        style.textContent = `
            .${HIGHLIGHT_CLASS} {

                position: relative;
            }
            .${HIGHLIGHT_CLASS}:not(:first-child) {
                outline-left: none !important;
            }
            .${HIGHLIGHT_CLASS}:not(:last-child) {
                outline-right: none !important;
            }

            /* Полный стиль для ut_label в ошибках */
            td.ut_label.${LABEL_HIGHLIGHT_CLASS} {
                -webkit-text-size-adjust: 100% !important;
                -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
                font-size: 14px !important;
                line-height: 1.42857143 !important;
                border-spacing: 0 !important;
                border-collapse: collapse !important;
                box-sizing: border-box !important;
                background: #ffcccc !important;
                border-color: #880000 !important;
                color: rgb(128, 0, 0) !important;
                background-color: #f0e0e0 !important;
                width: 20% !important;
                min-width: 120px !important;
                padding: 8px 16px !important;

            }
        `;
        document.head.appendChild(style);
    }

    function isInsideDocStyle(element) {
        const docStyle = document.querySelector('#Doc > style');
        return docStyle && docStyle.contains(element);
    }

    function getValidRadioSelectTds() {
        const allTds = document.querySelectorAll('td.a_radioselect');
        return Array.from(allTds).filter(td => !isInsideDocStyle(td));
    }

    function updateHighlights() {
        // Убираем все временные классы
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
        document.querySelectorAll(`.${LABEL_HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(LABEL_HIGHLIGHT_CLASS));

        const tds = getValidRadioSelectTds();
        const rowsToHighlight = new Set();

        for (const td of tds) {
            if (!td.querySelector('input[type=radio]:checked')) {
                const tr = td.closest('tr');
                if (tr) rowsToHighlight.add(tr);
            }
        }

        // Подсвечиваем строки
        rowsToHighlight.forEach(tr => {
            tr.querySelectorAll('td').forEach(td => {
                td.classList.add(HIGHLIGHT_CLASS);
                if (td.classList.contains('ut_label')) {
                    td.classList.add(LABEL_HIGHLIGHT_CLASS);
                }
            });
        });
    }

    function areAllSelected() {
        const tds = getValidRadioSelectTds();
        if (tds.length === 0) return false;
        return tds.every(td => td.querySelector('input[type=radio]:checked'));
    }

    function updateUI() {
        if (!active) return;

        calcButton = calcButton || document.querySelector('button.btn.btn-success');
        if (!calcButton) return;

        const allSelected = areAllSelected();
        updateHighlights();

        calcButton.style.display = allSelected ? '' : 'none';

        if (!allSelected) {
            if (!warningElement) {
                warningElement = document.createElement('div');
                warningElement.textContent = '❌Не все параметры выбраны! Расчёт невозможен!❌';
                warningElement.style.color = 'red';
                warningElement.style.marginTop = '8px';
                warningElement.style.fontSize = '14px';
                calcButton.parentNode.insertBefore(warningElement, calcButton.nextSibling);
            }
        } else {
            if (warningElement && warningElement.parentNode) {
                warningElement.remove();
                warningElement = null;
            }
        }
    }

    function cleanup() {
        if (!active) return;
        active = false;

        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
        document.querySelectorAll(`.${LABEL_HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(LABEL_HIGHLIGHT_CLASS));

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        if (radioChangeListener) {
            document.removeEventListener('change', radioChangeListener);
            radioChangeListener = null;
        }
        if (periodicChecker) {
            clearInterval(periodicChecker);
            periodicChecker = null;
        }

        calcButton = null;
        if (warningElement?.parentNode) warningElement.remove();
        warningElement = null;
    }

    function init() {
        if (active) return;
        active = true;
        injectStyles();

        domObserver = new MutationObserver(updateUI);
        domObserver.observe(document.body, { childList: true, subtree: true });

        radioChangeListener = (e) => {
            if (e.target.matches?.('input[type=radio]')) {
                updateUI();
            }
        };
        document.addEventListener('change', radioChangeListener);

        periodicChecker = setInterval(updateUI, 1000);
        updateUI();
    }

    const presenceObserver = new MutationObserver(() => {
        const calcUtExists = !!document.querySelector('#CalcUt');
        if (calcUtExists && !active) {
            init();
        } else if (!calcUtExists && active) {
            cleanup();
        }
    });

    presenceObserver.observe(document.body, { childList: true, subtree: true });

    if (document.querySelector('#CalcUt')) {
        setTimeout(init, 50);
    }
};

checkIzdelia();

function lockDateBuh () {
    'use strict';

    let isActive = false;
    let targetElement = null;

    function blockElement(element) {
        if (isActive) return;

        element.style.pointerEvents = 'none';
        element.style.opacity = '0.6'; // опционально: визуальный индикатор блокировки
        targetElement = element;
        isActive = true;
    }

    function unblockElement() {
        if (!isActive) return;

        if (targetElement) {
            targetElement.style.pointerEvents = '';
            targetElement.style.opacity = '';
        }
        targetElement = null;
        isActive = false;
    }

    const observer = new MutationObserver(() => {
        const element = document.querySelector("#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(3)");
        if (element) {
            blockElement(element);
        } else {
            unblockElement();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Проверка при старте
    const initialElement = document.querySelector("#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(3)");
    if (initialElement) {
        blockElement(initialElement);
    }
};

lockDateBuh ();



 function newFinStop() {
    'use strict';

    // ====== ВСТАВЬ СЮДА URL СВОЕГО GOOGLE APPS SCRIPT ======
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwxq1vMGRUULtSFXom-GKG5LFfxewFBR1HVMW6NozCp2qG5q_AJiupshXT_W0PjWbQ/exec';
    // ========================================================

    const PAY_ICON_SELECTOR = '#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img';
    const PAY_ICON_SRC = '/axiom/img/payschema/payschema-1.png';
    const SUMMARY_TABLE_SELECTOR = '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button';
    const PRODUCT_ID_SELECTOR = '#ProductId';
    const USERNAME_SELECTOR = 'body > ul > div > li:nth-child(1) > a';
    const WORK_WITH_FILES_BTN_SELECTOR = '#workWithFilesBtn';
    const LOADING_INDICATOR_SELECTOR = '#DocLoadingIndicator';

    let finStopActive = false;
    let finStopContainer = null;
    let shadowRoot = null;
    let modalContainer = null;
    let dismissedProductId = null;
    let observer = null;
    let isPageLoading = false;

    // ─────────────────────────────────────────────
    // Отслеживание состояния загрузки страницы
    // ─────────────────────────────────────────────
    function checkLoadingState() {
        const indicator = document.querySelector(LOADING_INDICATOR_SELECTOR);
        if (!indicator) return false;

        return indicator.classList.contains('is-visible');
    }

    function handleLoadingStateChange() {
        const nowLoading = checkLoadingState();

        if (nowLoading && !isPageLoading) {
            // Начало загрузки
            isPageLoading = true;
            console.log('[FinStop] Страница начала обновляться');
        } else if (!nowLoading && isPageLoading) {
            // Загрузка завершена
            isPageLoading = false;
            console.log('[FinStop] Страница загрузилась, перезапуск проверки');

            // Сбрасываем состояние и перепроверяем
            setTimeout(() => {
                resetFinStopState();
                checkPayIcon();
            }, 300);
        }
    }

    // ─────────────────────────────────────────────
    // Сброс состояния фин.стопа
    // ─────────────────────────────────────────────
    function resetFinStopState() {
        if (finStopContainer && finStopContainer.parentNode) {
            finStopContainer.parentNode.removeChild(finStopContainer);
        }
        const orphan = document.getElementById('finstop-block');
        if (orphan && orphan.parentNode) {
            orphan.parentNode.removeChild(orphan);
        }

        finStopContainer = null;
        finStopActive = false;
    }

    // ─────────────────────────────────────────────
    // Ждём готовности body перед вставкой shadow-host
    // ─────────────────────────────────────────────
    function initShadowHost() {
        if (!document.body) return false;

        const modalHost = document.createElement('div');
        modalHost.id = 'finstop-modal-host';
        document.body.appendChild(modalHost);
        shadowRoot = modalHost.attachShadow({ mode: 'open' });

        const shadowStyles = document.createElement('style');
        shadowStyles.textContent = `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.55);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2147483647;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateY(-30px) scale(0.95); opacity: 0; }
                to   { transform: translateY(0) scale(1); opacity: 1; }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to   { opacity: 0; }
            }

            .modal-overlay.closing {
                animation: fadeOut 0.2s ease forwards;
            }

            .modal-box {
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
                padding: 36px 40px 28px;
                max-width: 480px;
                width: 90%;
                animation: slideIn 0.3s ease;
                position: relative;
            }

            .modal-box.closing {
                animation: fadeOut 0.2s ease forwards;
            }

            .modal-icon {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 28px;
            }

            .modal-icon.warning {
                background: #FFF3E0;
                color: #E65100;
            }

            .modal-icon.error {
                background: #FFEBEE;
                color: #C62828;
            }

            .modal-icon.success {
                background: #E8F5E9;
                color: #2E7D32;
            }

            .modal-icon.loading {
                background: #E3F2FD;
                color: #1565C0;
            }

            .modal-title {
                font-size: 20px;
                font-weight: 700;
                color: #1a1a1a;
                text-align: center;
                margin-bottom: 12px;
            }

            .modal-text {
                font-size: 15px;
                color: #555;
                text-align: center;
                line-height: 1.6;
                margin-bottom: 28px;
            }

            .modal-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .modal-btn {
                padding: 11px 32px;
                border-radius: 10px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s ease;
                min-width: 120px;
            }

            .modal-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .modal-btn:active {
                transform: translateY(0);
            }

            .btn-ok {
                background: linear-gradient(135deg, #1976D2, #1565C0);
                color: #fff;
            }

            .btn-ok:hover {
                background: linear-gradient(135deg, #1565C0, #0D47A1);
            }

            .btn-cancel {
                background: #f5f5f5;
                color: #333;
                border: 1px solid #ddd;
            }

            .btn-cancel:hover {
                background: #eee;
            }

            .btn-danger-ok {
                background: linear-gradient(135deg, #E53935, #C62828);
                color: #fff;
            }

            .btn-success-ok {
                background: linear-gradient(135deg, #43A047, #2E7D32);
                color: #fff;
            }

            .spinner {
                width: 48px;
                height: 48px;
                border: 4px solid #E3F2FD;
                border-top: 4px solid #1976D2;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .progress-bar-container {
                width: 100%;
                height: 6px;
                background: #e0e0e0;
                border-radius: 3px;
                margin-bottom: 20px;
                overflow: hidden;
            }

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #1976D2, #42A5F5);
                border-radius: 3px;
                width: 0%;
                transition: width 0.4s ease;
            }
        `;
        shadowRoot.appendChild(shadowStyles);

        modalContainer = document.createElement('div');
        modalContainer.id = 'finstop-modal-container';
        shadowRoot.appendChild(modalContainer);

        return true;
    }

    if (!initShadowHost()) {
        const bodyWaiter = setInterval(() => {
            if (initShadowHost()) clearInterval(bodyWaiter);
        }, 100);
    }

    // ─────────────────────────────────────────────
    // Утилиты модалки
    // ─────────────────────────────────────────────
    function showModal(content) {
        if (!modalContainer) return;
        modalContainer.innerHTML = '';
        modalContainer.appendChild(content);
    }

    function closeModal() {
        return new Promise((resolve) => {
            if (!modalContainer) {
                resolve();
                return;
            }
            const overlay = modalContainer.querySelector('.modal-overlay');
            if (overlay) {
                overlay.classList.add('closing');
                const box = overlay.querySelector('.modal-box');
                if (box) box.classList.add('closing');
                setTimeout(() => {
                    if (modalContainer) modalContainer.innerHTML = '';
                    resolve();
                }, 200);
            } else {
                modalContainer.innerHTML = '';
                resolve();
            }
        });
    }

    function buildOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const box = document.createElement('div');
        box.className = 'modal-box';
        overlay.appendChild(box);
        return { overlay, box };
    }

    // ─────────────────────────────────────────────
    // Проверка совпадения менеджера с аккаунтом
    // ─────────────────────────────────────────────
    function getManagerLastName() {
        const span = document.querySelector('.chosen-single > span');
        if (!span) return '';
        const fullText = span.textContent.trim();
        if (!fullText) return '';
        const words = fullText.split(/\s+/).filter(w => w.length > 0);
        return words.length > 0 ? words[words.length - 1] : '';
    }

    function getTopMenuFirstWord() {
        const el = document.querySelector(USERNAME_SELECTOR);
        if (!el) return '';
        const fullText = el.textContent.trim();
        if (!fullText) return '';
        const words = fullText.split(/\s+/).filter(w => w.length > 0);
        return words.length > 0 ? words[0] : '';
    }

    function isManagerMatchesAccount() {
        const managerLastName = getManagerLastName();
        const accountFirstWord = getTopMenuFirstWord();

        if (!managerLastName || !accountFirstWord) {
            return true;
        }

        return managerLastName.toLowerCase() === accountFirstWord.toLowerCase();
    }

    // ─────────────────────────────────────────────
    // Модалки
    // ─────────────────────────────────────────────
    function showManagerMismatchModal() {
        const { overlay, box } = buildOverlay();

        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '🚫';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Ошибка!';

        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Имя менеджера не совпадает с аккаунтом!';

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());

        buttons.appendChild(okBtn);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(buttons);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        showModal(overlay);
    }

    function showConfirmModal() {
        if (!isManagerMatchesAccount()) {
            showManagerMismatchModal();
            return;
        }

        const { overlay, box } = buildOverlay();

        const icon = document.createElement('div');
        icon.className = 'modal-icon warning';
        icon.textContent = '⚠️';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Снятие с фин. стопа';

        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Снимая заказ с фин. стопа, Вы подтверждаете, что платёж поступит в течении трёх рабочих дней.';

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn btn-cancel';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.addEventListener('click', () => closeModal());

        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', handleOk);

        buttons.appendChild(cancelBtn);
        buttons.appendChild(okBtn);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(buttons);

        showModal(overlay);
    }

    function showLoadingModal(text) {
        const { overlay, box } = buildOverlay();

        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = text;

        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-bar-container';

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-bar-fill';
        progressFill.id = 'fs-progress';
        progressContainer.appendChild(progressFill);

        const sub = document.createElement('div');
        sub.className = 'modal-text';
        sub.id = 'fs-loading-sub';
        sub.style.cssText = 'margin-bottom:0;color:#888;font-size:13px;';
        sub.textContent = 'Пожалуйста, подождите...';

        box.appendChild(spinner);
        box.appendChild(title);
        box.appendChild(progressContainer);
        box.appendChild(sub);

        showModal(overlay);
    }

    function setProgress(percent, subText) {
        if (!shadowRoot) return;
        const bar = shadowRoot.getElementById('fs-progress');
        const sub = shadowRoot.getElementById('fs-loading-sub');
        if (bar) bar.style.width = percent + '%';
        if (sub && subText) sub.textContent = subText;
    }

    function showSuccessModal() {
        const { overlay, box } = buildOverlay();

        const icon = document.createElement('div');
        icon.className = 'modal-icon success';
        icon.textContent = '✅';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Готово!';

        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Заказ успешно снят с фин. стопа. Данные записаны в таблицу.';

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const doneBtn = document.createElement('button');
        doneBtn.className = 'modal-btn btn-success-ok';
        doneBtn.textContent = 'Ок';
        doneBtn.addEventListener('click', async () => {
            const { productId } = collectData();
            dismissedProductId = productId;

            restoreSummaryTable();

            await closeModal();
        });

        buttons.appendChild(doneBtn);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(buttons);

        showModal(overlay);
    }

    function showErrorModal(message) {
        const { overlay, box } = buildOverlay();

        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '🚫';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Ошибка';

        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = message;

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());

        buttons.appendChild(okBtn);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(buttons);

        showModal(overlay);
    }

    function showBlacklistModal() {
        const { overlay, box } = buildOverlay();

        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '⛔';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Доступ запрещён';

        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Вы в чёрном списке! Для снятия заказа с фин. стопа обратитесь к коммерческому директору!';

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());

        buttons.appendChild(okBtn);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(buttons);

        showModal(overlay);
    }

    // ─────────────────────────────────────────────
    // Сбор данных
    // ─────────────────────────────────────────────
    function collectData() {
        const productIdEl = document.querySelector(PRODUCT_ID_SELECTOR);
        const usernameEl = document.querySelector(USERNAME_SELECTOR);

        const productId = productIdEl ? (productIdEl.value || productIdEl.textContent.trim()) : '';
        let username = '';
        if (usernameEl) {
            const fullText = usernameEl.textContent.trim();
            username = fullText.split(/\s+/)[0];
        }

        return { productId, username };
    }

    function getCurrentProductId() {
        const el = document.querySelector(PRODUCT_ID_SELECTOR);
        return el ? (el.value || el.textContent.trim()) : '';
    }

    // ─────────────────────────────────────────────
    // API запросы
    // ─────────────────────────────────────────────
    function checkBlacklist(username) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: GAS_URL,
                anonymous: true,
                onload: function (response) {
                    try {
                        let names = [];
                        const text = response.responseText.trim();

                        try {
                            const json = JSON.parse(text);
                            if (Array.isArray(json)) {
                                names = json.map(item => {
                                    if (typeof item === 'string') return item.trim().toLowerCase();
                                    if (item && item.name) return item.name.trim().toLowerCase();
                                    return '';
                                });
                            }
                        } catch (_jsonErr) {
                            if (!text) {
                                resolve(false);
                                return;
                            }
                            const rows = text.split('\n');
                            for (const row of rows) {
                                const cols = row.split(',');
                                for (const col of cols) {
                                    const val = col.trim().toLowerCase();
                                    if (val) names.push(val);
                                }
                            }
                        }

                        const found = names.includes(username.toLowerCase());
                        resolve(found);
                    } catch (e) {
                        console.error('FinStop blacklist parse error:', e);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error('FinStop blacklist request error:', err);
                    reject(err);
                }
            });
        });
    }

    function writeToSheet(productId, username) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: GAS_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ productId, username }),
                anonymous: true,
                onload: function (response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.status === 'ok') {
                            resolve();
                        } else {
                            console.warn('FinStop write unexpected response:', result);
                            reject(new Error(result.message || 'Unexpected response'));
                        }
                    } catch (e) {
                        console.error('FinStop write parse error:', e, response.responseText);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error('FinStop write request error:', err);
                    reject(err);
                }
            });
        });
    }

    async function handleOk() {
        const { productId, username } = collectData();

        if (!productId || !username) {
            showErrorModal('Не удалось собрать данные со страницы. Проверьте наличие ProductId и имени пользователя.');
            return;
        }

        showLoadingModal('Проверка доступа...');
        setProgress(20, 'Проверка чёрного списка...');

        try {
            const isBlacklisted = await checkBlacklist(username);
            setProgress(50, 'Проверка завершена');

            if (isBlacklisted) {
                setTimeout(() => showBlacklistModal(), 400);
                return;
            }

            setProgress(60, 'Запись данных в таблицу...');

            await new Promise(r => setTimeout(r, 300));

            showLoadingModal('Сохранение данных...');
            setProgress(30, 'Отправка данных...');

            await writeToSheet(productId, username);

            setProgress(100, 'Готово!');

            await new Promise(r => setTimeout(r, 500));

            showSuccessModal();

        } catch (err) {
            console.error('FinStop error:', err);
            showErrorModal('Произошла ошибка при обработке запроса. Попробуйте позже.');
        }
    }

    // ─────────────────────────────────────────────
    // Фин.Стоп блок
    // ─────────────────────────────────────────────
    function createFinStopBlock() {
        const container = document.createElement('div');
        container.id = 'finstop-block';
        container.style.cssText = `
            background: linear-gradient(135deg, #D32F2F, #B71C1C);
            color: #fff;
            padding: 24px 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        const subtitle = document.createElement('div');
        subtitle.textContent = '🚫 Фин.Стоп 🚫';
        subtitle.style.cssText = `
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 1px;
            text-transform: uppercase;
        `;

        const btn = document.createElement('button');
        btn.textContent = 'Обещанный платеж';
        btn.style.cssText = `
            background: #fff;
            color: #D32F2F;
            border: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('click', showConfirmModal);

        container.appendChild(subtitle);
        container.appendChild(btn);

        return container;
    }

    function activateFinStop() {
        if (finStopActive) return;

        const currentPid = getCurrentProductId();
        if (dismissedProductId && currentPid && dismissedProductId === currentPid) {
            return;
        }

        const parentTable = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table");
        if (!parentTable) return;

        const summaryTable = document.querySelector(SUMMARY_TABLE_SELECTOR);
        if (summaryTable) {
            summaryTable.style.display = 'none';
        }

        const workBtn = document.querySelector(WORK_WITH_FILES_BTN_SELECTOR);
        if (workBtn) {
            workBtn.style.display = 'none';
        }

        finStopContainer = createFinStopBlock();
        parentTable.parentNode.insertBefore(finStopContainer, parentTable.nextSibling);

        finStopActive = true;
    }

    function restoreSummaryTable() {
        const summaryTable = document.querySelector(SUMMARY_TABLE_SELECTOR);
        if (summaryTable) {
            summaryTable.style.display = '';
        }

        const workBtn = document.querySelector(WORK_WITH_FILES_BTN_SELECTOR);
        if (workBtn) {
            workBtn.style.display = '';
        }

        if (finStopContainer && finStopContainer.parentNode) {
            finStopContainer.parentNode.removeChild(finStopContainer);
        }
        const orphan = document.getElementById('finstop-block');
        if (orphan && orphan.parentNode) {
            orphan.parentNode.removeChild(orphan);
        }

        finStopContainer = null;
        finStopActive = false;
    }

    function deactivateFinStop() {
        if (!finStopActive) return;
        dismissedProductId = null;
        restoreSummaryTable();
    }

    function checkPayIcon() {
        // Не проверяем, если страница загружается
        if (isPageLoading) return;

        const img = document.querySelector(PAY_ICON_SELECTOR);
        if (img && img.src && img.src.includes(PAY_ICON_SRC)) {
            activateFinStop();
        } else {
            deactivateFinStop();
        }
    }

    // ─────────────────────────────────────────────
    // Наблюдатель DOM с отслеживанием загрузки
    // ─────────────────────────────────────────────
    function startObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver((mutations) => {
            // Проверяем изменение класса индикатора загрузки
            handleLoadingStateChange();

            // Проверяем иконку оплаты
            checkPayIcon();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'class']
            });
        } else {
            const obsWaiter = setInterval(() => {
                if (document.body) {
                    clearInterval(obsWaiter);
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['src', 'class']
                    });
                    checkPayIcon();
                }
            }, 100);
        }
    }

    // Запуск наблюдателя
    startObserver();

    // Первичная проверка
    checkPayIcon();

    // Подстраховка — периодическая проверка
    setInterval(checkPayIcon, 2000);
}

newFinStop();






    // Функция для отображения обратной связи (изменение кнопки)
    function showFeedback(button) {
        button.innerText = 'Done'; // Меняем текст на "Done"
        button.style.backgroundColor = '#28a745'; // Меняем цвет на зеленый

        // Возвращаем кнопку в исходное состояние через 3 секунды
        setTimeout(() => {
            button.innerText = button === document.getElementById('sumButton') ? 'SUM' : 'Table';
            button.style.backgroundColor = '#007BFF'; // Возвращаем синий цвет
        }, 3000);
    }

    // Проверяем наличие слова каждые 1000 миллисекунд
    setInterval(checkForWord, 1000);
      function clearConsole() {
    'use strict';

    // Задержка для гарантированного перехвата console до других скриптов
    setTimeout(() => {
        const originalConsole = {};
        const methods = ['log', 'warn', 'error', 'info', 'debug', 'table', 'group', 'groupEnd', 'trace', 'dir'];

        // Сохраняем оригинальные методы
        methods.forEach(method => {
            if (typeof console[method] === 'function') {
                originalConsole[method] = console[method];
            }
        });

        // Переопределяем методы: сначала очищаем, потом — ничего не выводим
        methods.forEach(method => {
            if (originalConsole[method]) {
                console[method] = function (...args) {
                    console.clear(); // Очищаем консоль
                    // Не выводим сообщение — полностью подавляем
                    // Если хочешь видеть сообщения кратко — раскомментируй следующую строку:
                    // originalConsole[method].apply(console, args);
                };
            }
        });

        // Блокируем системные ошибки (Uncaught, Violation и т.д.)
        window.addEventListener('error', function (e) {
            e.preventDefault();
            console.clear();
            return true;
        }, true);

        window.addEventListener('unhandledrejection', function (e) {
            e.preventDefault();
            console.clear();
            return true;
        }, true);

        // Перехватываем window.onerror
        const originalOnError = window.onerror;
        window.onerror = function (message, source, lineno, colno, error) {
            console.clear();
            // Можно передать дальше, если нужно
            if (typeof originalOnError === 'function') {
                return originalOnError.apply(window, arguments);
            }
            return true; // предотвращаем стандартный вывод в консоль
        };

        // Также перехватываем console.clear(), чтобы не мешал
        const originalClear = console.clear;
        console.clear = function () {
            // Ничего не делаем — или можно вызвать originalClear()
            // originalClear();
        };

        // Дополнительно: блокируем вывод через Proxy (если используется)
        try {
            const proxyConsole = new Proxy(console, {
                get(target, prop) {
                    if (methods.includes(prop)) {
                        return function (...args) {
                            console.clear();
                            // Не выводим
                        };
                    }
                    return target[prop];
                }
            });
            // Это может не сработать, если console уже был использован — но попробуем
            Object.defineProperty(window, 'console', {
                value: proxyConsole,
                writable: false,
                configurable: false
            });
        } catch (e) {
            // Если не удалось — продолжаем работать без прокси
        }

        // Выводим в консоль, что скрипт активен (только один раз)
        console.log('✅ Auto Clear Console: активирован');
        console.clear();

    }, 500); // небольшая задержка для надёжности

};
      clearConsole();
})();
})();
