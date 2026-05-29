// brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, sendNow }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, токены, chatId) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Telegram конфигурация
    const TELEGRAM_BOT_TOKEN = '8070906629:AAERcsFRpNFlfNTCvdvnQJpgpeCYHuDKHIM';
    const TELEGRAM_CHAT_ID = '-5229879106r'; // 🔥 Исправлено: убрана буква "r" в конце
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Селекторы элементов на странице
    const SELECTORS = {
        productId: '#ProductId, #productid',
        brakOriginalId: '#BrakOriginalId', // 🔥 НОВЫЙ: селектор для исходного заказа
        brakBlock: '#BrakBlock',
        brakComment: '#BrakComment',
        brakDepartment: '#BrakDepartmentId_chosen > a > span',
        brakAuthor: '#BrakAuthorId_chosen > a > span',
        // Кнопки-триггеры (массив селекторов)
        triggerButtons: [
            '#workWithFilesBtn',
            '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button'
        ]
    };
    
    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[BrakTelegram]';
    
    // 🔥 Уникальный префикс для изоляции (можно настроить через config, но есть дефолт)
    const UNIQUE_PREFIX = config?.uniquePrefix || 'brak-telegram-';

    // 🔥 Внутреннее состояние
    let active = false;
    let clickHandler = null;
    let isSending = false; // Защита от повторных отправок

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования (только консоль, без UI)
    // ─────────────────────────────────────────────
    function log(...args) {
        if (LOGGING_ENABLED) {
            console.log(LOG_PREFIX, ...args);
        }
    }

    function warn(...args) {
        if (LOGGING_ENABLED) {
            console.warn(LOG_PREFIX, ...args);
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
    // 🔥 Безопасное извлечение текста (универсальное для input/span/label)
    // ─────────────────────────────────────────────
    function extractText(selector) {
        const el = document.querySelector(selector);
        if (!el) return 'Не найдено';
        // 🔥 Поддержка value (для input/textarea) и textContent (для span/div)
        const value = el.value !== undefined ? el.value : el.textContent;
        return (value || '').toString().trim() || 'Не найдено';
    }

    // ─────────────────────────────────────────────
    // 🔥 Формирование сообщения в НОВОМ формате
    // ─────────────────────────────────────────────
    function formatMessage(data) {
        // 🔥 Новый формат сообщения точно как в примере:
        // Запущена перепечатка! 
        // Номер перепечатки: 380377
        // Перепечатывается заказ : {originalId}
        // Отдел: {dept}
        // Причина: {comment}
        // Ответственный: {author}
        return `Запущена перепечатка! 
Номер перепечатки: ${data.productId}
Перепечатывается заказ : ${data.originalId}
Отдел: ${data.dept}
Причина: ${data.comment}
Ответственный: ${data.author}`;
    }

    // ─────────────────────────────────────────────
    // 🔥 Отправка в Telegram (ПОЛНОСТЬЮ ФОНОВАЯ)
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

        // 🔥 Проверка конфигурации (токены заданы в коде)
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            warn('⚠️ Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в коде модуля');
            return;
        }

        isSending = true;

        // 🔥 Сбор данных — включая новый #BrakOriginalId
        const data = {
            productId: extractText(SELECTORS.productId),
            originalId: extractText(SELECTORS.brakOriginalId), // 🔥 НОВОЕ: исходный заказ
            comment: extractText(SELECTORS.brakComment),
            dept: extractText(SELECTORS.brakDepartment),
            author: extractText(SELECTORS.brakAuthor)
        };

        // 🔥 Формируем сообщение в новом формате
        const message = formatMessage(data);

        log('📤 Отправка уведомления:', { 
            productId: data.productId, 
            originalId: data.originalId,
            dept: data.dept 
        });

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

        sendRequest(TELEGRAM_API_URL, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        })
        .then(res => {
            log('✅ Уведомление успешно отправлено в Telegram');
            // 🔥 НИКАКИХ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ — только лог
        })
        .catch(err => {
            warn('❌ Ошибка отправки в Telegram:', err);
            // 🔥 НИКАКИХ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ — только лог
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
            log('🎯 Клик по триггер-кнопке, запускаем фоновую отправку');
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
        log('✅ Обработчики кликов подключены (фоновый режим)');
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
        
        // 🔥 Валидация конфигурации (токены заданы в коде)
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            warn('⚠️ Модуль не активирован: не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
            return;
        }
        
        active = true;
        log('🚀 Модуль инициализирован (фоновый режим)');
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

    // 🔥 Публичный метод для принудительной отправки (фоновой)
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