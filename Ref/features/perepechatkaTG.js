// 11brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, sendNow }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, токены, chatId) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Telegram конфигурация
    const TELEGRAM_BOT_TOKEN = '8070906629:AAH0fTlPbHsOUO20f6zdHw7eozcSq8qgUDA';
    const TELEGRAM_CHAT_ID = '-5229879106';
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Селекторы элементов на странице
    const SELECTORS = {
        productId: '#ProductId, #productid',
        brakOriginalId: '#BrakOriginalId',
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
    
    // 🔥 Селекторы, которые ОБЯЗАТЕЛЬНО должны быть заполнены для отправки
    // (brakBlock проверяется только на наличие, так как это контейнер)
    const REQUIRED_SELECTORS = [
        'productId',
        'brakOriginalId',
        'brakComment',
        'brakDepartment',
        'brakAuthor'
    ];
    
    // Настройки логгирования
    const LOGGING_ENABLED = false;
    const LOG_PREFIX = '[BrakTelegram]';
    
    // 🔥 Уникальный префикс для изоляции
    const UNIQUE_PREFIX = config?.uniquePrefix || 'brak-telegram-';

    // 🔥 Внутреннее состояние
    let active = false;
    let clickHandler = null;
    let isSending = false;

    // ─────────────────────────────────────────────
    // 🔥 Утилиты логгирования
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
    // 🔥 Безопасное извлечение текста
    // ─────────────────────────────────────────────
    function extractText(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const value = el.value !== undefined ? el.value : el.textContent;
        const trimmed = (value || '').toString().trim();
        return trimmed || null;
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 НОВАЯ ФУНКЦИЯ: проверка наличия и заполненности ВСЕХ обязательных полей
    // ─────────────────────────────────────────────
    function isAllDataReady() {
        // 1. Проверяем brakBlock (должен просто существовать в DOM)
        const brakBlock = document.querySelector(SELECTORS.brakBlock);
        if (!brakBlock) {
            log('❌ Не найден brakBlock:', SELECTORS.brakBlock);
            return false;
        }
        
        // 2. Проверяем ВСЕ обязательные селекторы на наличие И заполненность
        for (const key of REQUIRED_SELECTORS) {
            const selector = SELECTORS[key];
            const value = extractText(selector);
            
            if (value === null) {
                log(`❌ Не найден или пустой ${key}:`, selector);
                return false;
            }
        }
        
        log('✅ Все обязательные поля найдены и заполнены');
        return true;
    }

    // ─────────────────────────────────────────────
    // 🔥 Формирование сообщения
    // ─────────────────────────────────────────────
    function formatMessage(data) {
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
        if (isSending) {
            log('⏳ Отправка уже выполняется, пропуск');
            return;
        }

        // 🔥 🔥 🔥 СТРОГАЯ ПРОВЕРКА: все поля должны быть в DOM и заполнены
        if (!isAllDataReady()) {
            log('❌ Данные не готовы: не все обязательные поля заполнены');
            return;
        }

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            warn('⚠️ Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
            return;
        }

        isSending = true;

        // 🔥 Сбор данных (теперь гарантированно не будет null)
        const data = {
            productId: extractText(SELECTORS.productId),
            originalId: extractText(SELECTORS.brakOriginalId),
            comment: extractText(SELECTORS.brakComment),
            dept: extractText(SELECTORS.brakDepartment),
            author: extractText(SELECTORS.brakAuthor)
        };

        const message = formatMessage(data);

        log('📤 Отправка уведомления:', { 
            productId: data.productId, 
            originalId: data.originalId,
            dept: data.dept 
        });

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
        })
        .catch(err => {
            warn('❌ Ошибка отправки в Telegram:', err);
        })
        .finally(() => {
            setTimeout(() => { isSending = false; }, 1000);
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик клика по триггер-кнопкам
    // ─────────────────────────────────────────────
    function handleClick(e) {
        const isTriggerButton = SELECTORS.triggerButtons.some(selector => {
            return e.target.closest(selector);
        });

        if (isTriggerButton) {
            log('🎯 Клик по триггер-кнопке, проверяем данные...');
            // 🔥 Отправка ТОЛЬКО если все данные готовы
            sendToTelegram();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Навешивание обработчиков
    // ─────────────────────────────────────────────
    function attachHandlers() {
        if (clickHandler) return;
        
        clickHandler = handleClick;
        document.addEventListener('click', clickHandler, true);
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
        sendNow
    };

})(config, GM, utils, api);