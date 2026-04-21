(function(config, GM, utils) {
    'use strict';

    // ─────────────────────────────────────────────
    // Проверка зависимостей
    // ─────────────────────────────────────────────
    if (!GM || !GM.xmlhttpRequest) {
        console.error('[Montages] ❌ GM API не передан. Модуль не может работать.');
        return;
    }
    console.log('[Montages] 🚀 Модуль запущен');

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzt9bAtaWRRXyAtq6a1J3eFWjWoBPDWrw9s_0MOWnrfSaGRToux4THTN77BAN9aR0lH/exec';
    const TYPES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IPo3ysUMbU0LOVTHKY3PuLW9DRutL_cduurf0Ztt47o/gviz/tq?tqx=out:csv&sheet=types';
    const TELEGRAM_TOKEN = '7859059996:AAHCCslXp3xvZp1iuSNPv6ApJs9-7MUIG7I';
    const TELEGRAM_CHAT_IDS = ['759432344', '577323348', '385756991', '5242608348'];
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`;
    const TELEGRAM_DELAY = 60000;

    const selectors = [
        "#Top > form > div > div > div > input:nth-child(5)",
        "#Top > form > div > div > div > input.ProductName.form-control",
        "#Top > form > div > div > div > div.form-control",
        'div.formblock[class^="Order"] input.OrderName'
    ];
    const UNIQUE_PREFIX = 'montage-script-v2-';
    let buttonAdded = false;
    let createdButton = null;
    let productIdCache = new Map();
    let isProcessing = false;
    let typesCache = [];
    let files = [];
    let dateCache = new Map();
    const DATE_CACHE_TTL = 30000;

    // Инициализация системы отложенной отправки файлов
    initDelayedTelegramSender();
    addIsolatedStyles();

    function initDelayedTelegramSender() {
        checkPendingFiles();
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
                console.error('Ошибка обработки отложенного файла:', e);
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
            }
            
            .${UNIQUE_PREFIX}button-container {
                position: relative;
                display: inline-block;
                margin-left: 8px;
                z-index: 1000;
            }
            
            .${UNIQUE_PREFIX}montage-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                padding: 8px 16px !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4) !important;
                white-space: nowrap !important;
                line-height: 1.4 !important;
            }
            
            .${UNIQUE_PREFIX}montage-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6) !important;
            }
            
            .${UNIQUE_PREFIX}montage-btn:active {
                transform: translateY(0) !important;
            }
            
            .${UNIQUE_PREFIX}montage-btn.disabled {
                opacity: 0.6 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
            }
            
            .${UNIQUE_PREFIX}montage-btn.processing {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function findProductNameInput() {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.value && element.value.trim() !== '') {
                return element;
            }
        }
        return null;
    }

    function extractProductId(productName) {
        const match = productName.match(/заказа\s*[:#]?\s*(\d+)/i);
        if (match) return match[1];
        
        const simpleMatch = productName.match(/^(\d+)/);
        if (simpleMatch) return simpleMatch[1];
        
        return null;
    }

    function getProductId() {
        const input = findProductNameInput();
        if (!input) return null;
        
        const cached = productIdCache.get(input.value);
        if (cached) return cached;
        
        const productId = extractProductId(input.value);
        if (productId) {
            productIdCache.set(input.value, productId);
        }
        return productId;
    }

    function createMontageButton() {
        if (buttonAdded) return;

        const productId = getProductId();
        if (!productId) return;

        let targetElement = null;
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) {
                targetElement = el;
                break;
            }
        }

        if (!targetElement) return;

        const container = document.createElement('div');
        container.className = `${UNIQUE_PREFIX}button-container ${UNIQUE_PREFIX}reset`;
        container.id = `${UNIQUE_PREFIX}button-wrapper`;

        const button = document.createElement('button');
        button.className = `${UNIQUE_PREFIX}montage-btn ${UNIQUE_PREFIX}reset`;
        button.id = `${UNIQUE_PREFIX}montage-btn`;
        button.textContent = '📦 Монтажные работы';
        button.type = 'button';

        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (button.classList.contains('disabled') || button.classList.contains('processing')) {
                return;
            }

            const currentProductId = getProductId();
            if (!currentProductId) {
                alert('Не удалось определить ID заказа');
                return;
            }

            button.classList.add('processing');
            button.disabled = true;
            button.textContent = '⏳ Обработка...';

            try {
                await handleMontageClick(currentProductId);
            } catch (error) {
                console.error('[Montages] Ошибка:', error);
                alert('Произошла ошибка при обработке запроса');
            } finally {
                button.classList.remove('processing');
                button.disabled = false;
                button.textContent = '✅ Готово';
                
                setTimeout(() => {
                    button.textContent = '📦 Монтажные работы';
                }, 2000);
            }
        });

        container.appendChild(button);

        if (targetElement.parentNode) {
            targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
        }

        createdButton = button;
        buttonAdded = true;
        console.log('[Montages] ✅ Кнопка добавлена для заказа:', productId);
    }

    async function handleMontageClick(productId) {
        console.log('[Montages] 🔘 Клик по кнопке для заказа:', productId);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.cdr,.ai,.psd,.eps,.zip,.rar';

        fileInput.addEventListener('change', async (e) => {
            const selectedFiles = Array.from(e.target.files);
            if (selectedFiles.length === 0) return;

            files = selectedFiles;
            console.log('[Montages] 📁 Выбрано файлов:', files.length);

            try {
                await sendFilesToTelegram(productId, files);
                saveFilesForDelayedSending(productId, files);
            } catch (error) {
                console.error('[Montages] Ошибка отправки:', error);
            }
        });

        fileInput.click();
    }

    async function sendFilesToTelegram(productId, files) {
        const caption = `Файлы для заказа ${productId}`;

        for (const file of files) {
            try {
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
                console.log('[Montages] ✅ Файл отправлен:', file.name);
            } catch (err) {
                console.error('[Montages] Ошибка отправки файла:', err);
            }
        }
    }

    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            if (isProcessing) return;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    const productId = getProductId();
                    
                    if (productId && !buttonAdded) {
                        isProcessing = true;
                        setTimeout(() => {
                            createMontageButton();
                            isProcessing = false;
                        }, 100);
                        break;
                    } else if (!productId && buttonAdded) {
                        const wrapper = document.getElementById(`${UNIQUE_PREFIX}button-wrapper`);
                        if (wrapper && wrapper.parentNode) {
                            wrapper.parentNode.removeChild(wrapper);
                        }
                        buttonAdded = false;
                        createdButton = null;
                        productIdCache.clear();
                        console.log('[Montages] 🗑️ Кнопка удалена');
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'class', 'style']
        });

        console.log('[Montages] 👁️ Наблюдатель DOM запущен');
    }

    function initScript() {
        observeDOM();
        setTimeout(() => {
            createMontageButton();
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

})(
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);
