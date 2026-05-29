// brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, sendNow }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'brak-telegram-';
    const TELEGRAM = config?.telegram || {
        botToken: '8070906629:AAERcsFRpNFlfNTCvdvnQJpgpeCYHuDKHIM',
        chatId: '-5229879106r',
        apiUrl: 'https://api.telegram.org/bot${botToken}/sendMessage'
    };
    const SELECTORS = config?.selectors || {
        productId: '#ProductId, #productid',
        brakBlock: '#BrakBlock',
        brakComment: '#BrakComment',
        brakDepartment: '#BrakDepartmentId_chosen > a > span',
        brakAuthor: '#BrakAuthorId_chosen > a > span',
        triggerButtons: [
            '#workWithFilesBtn',
            '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button'
        ]
    };
    const MESSAGE_TEMPLATE = config?.messageTemplate || 
        'Запущена перепечатка! \nНомер заказа: {productId}. \nОтдел: {dept}\nПричина: {comment}\nОтветственный: {author}';
    const LOGGING = config?.logging || {
        enabled: false,
        prefix: '[BrakTelegram]'
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let clickHandler = null;
    let isSending = false; // 🔥 Защита от повторных отправок

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования
    // ─────────────────────────────────────────────
    function log(...args) {
        if (LOGGING.enabled) {
            console.log(LOGGING.prefix, ...args);
        }
    }

    function warn(...args) {
        if (LOGGING.enabled) {
            console.warn(LOGGING.prefix, ...args);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка готовности данных
    // ─────────────────────────────────────────────
    function isReady() {
        const prodIdEl = document.querySelector(SELECTORS.productId);
        const brakBlock = document.querySelector(SELECTORS.brakBlock);
        return prodIdEl && brakBlock && prodIdEl.textContent.trim() !== '';
    }

    // ─────────────────────────────────────────────
    // 🔥 Безопасное извлечение текста
    // ─────────────────────────────────────────────
    function extractText(selector) {
        const el = document.querySelector(selector);
        if (!el) return 'Не найдено';
        return (el.value || el.textContent || '').trim();
    }

    // ─────────────────────────────────────────────
    // 🔥 Формирование сообщения из шаблона
    // ─────────────────────────────────────────────
    function formatMessage(template, data) {
        return template
            .replace('{productId}', data.productId)
            .replace('{comment}', data.comment)
            .replace('{dept}', data.dept)
            .replace('{author}', data.author);
    }

    // ─────────────────────────────────────────────
    // 🔥 Отправка в Telegram
    // ─────────────────────────────────────────────
    function sendToTelegram() {
        // 🔥 Защита от повторных отправок
        if (isSending) {
            log('⏳ Отправка уже выполняется, пропуск');
            return;
        }

        if (!isReady()) {
            log('❌ Данные не готовы для отправки');
            return;
        }

        // 🔥 Проверка конфигурации
        if (!TELEGRAM.botToken || !TELEGRAM.chatId) {
            warn('⚠️ Не настроены botToken или chatId в конфиге');
            return;
        }

        isSending = true;

        const data = {
            productId: extractText(SELECTORS.productId),
            comment: extractText(SELECTORS.brakComment),
            dept: extractText(SELECTORS.brakDepartment),
            author: extractText(SELECTORS.brakAuthor)
        };

        const message = formatMessage(MESSAGE_TEMPLATE, data);
        const apiUrl = TELEGRAM.apiUrl || `https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`;

        log('📤 Отправка уведомления:', { productId: data.productId, dept: data.dept });

        // 🔥 Используем GM.xmlhttpRequest если доступен, иначе fetch
        const sendRequest = (url, payload) => {
            if (GM?.xmlhttpRequest) {
                return new Promise((resolve, reject) => {
                    GM.xmlhttpRequest({
                        method: 'POST',
                        url: url,
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify(payload),
                        onload: (res) => res.status >= 200 && res.status < 300 ? resolve(res) : reject(res),
                        onerror: reject,
                        ontimeout: () => reject(new Error('Timeout'))
                    });
                });
            } else {
                return fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
        };

        sendRequest(apiUrl, {
            chat_id: TELEGRAM.chatId,
            text: message,
            parse_mode: 'HTML'
        })
        .then(res => {
            log('✅ Уведомление отправлено');
            if (api?.showCenterMessage) {
                api.showCenterMessage({ message: '📢 Уведомление о перепечатке отправлено', duration: 2000 });
            }
        })
        .catch(err => {
            warn('❌ Ошибка отправки:', err);
            if (api?.showCenterMessage) {
                api.showCenterMessage({ message: '⚠️ Ошибка отправки уведомления', duration: 3000 });
            }
        })
        .finally(() => {
            // 🔥 Сбрасываем флаг отправки с небольшой задержкой
            setTimeout(() => { isSending = false; }, 1000);
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик клика по триггер-кнопкам
    // ─────────────────────────────────────────────
    function handleClick(e) {
        // 🔥 Проверяем, был ли клик по одной из целевых кнопок
        const isTriggerButton = SELECTORS.triggerButtons.some(selector => {
            return e.target.closest(selector);
        });

        if (isTriggerButton) {
            log('🎯 Клик по триггер-кнопке, запускаем отправку');
            sendToTelegram();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Навешивание обработчиков
    // ─────────────────────────────────────────────
    function attachHandlers() {
        if (clickHandler) return;
        
        clickHandler = handleClick;
        document.addEventListener('click', clickHandler, true); // 🔥 Используем capture для надёжности
        log('✅ Обработчики кликов подключены');
    }

    // ─────────────────────────────────────────────
    // 🔥 Отвязывание обработчиков
    // ─────────────────────────────────────────────
    function detachHandlers() {
        if (clickHandler) {
            document.removeEventListener('click', clickHandler, true);
            clickHandler = null;
            log('✅ Обработчики кликов отключены');
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка и применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        if (!active) return;
        attachHandlers();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        
        // 🔥 Валидация конфигурации
        if (!TELEGRAM.botToken || !TELEGRAM.chatId) {
            warn('⚠️ Модуль не активирован: не настроены botToken или chatId');
            return;
        }
        
        active = true;
        log('🚀 Модуль инициализирован');
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        detachHandlers();
        isSending = false;
        log('🧹 Модуль очищен');
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичный метод для принудительной отправки
    function sendNow() {
        if (active) {
            sendToTelegram();
        } else {
            warn('⚠️ Модуль не активен, отправка отменена');
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
        sendNow // Для внешнего вызова отправки
    };

})(config, GM, utils, api);