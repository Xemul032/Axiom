// brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
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
        // 🔥 НОВЫЕ: для сбора суммы заказа
        summaElement: '.summa.Summa#Summa, .Summa',
        correctionInput: 'input.SummaCorrection',
        // Кнопки-триггеры (массив селекторов)
        triggerButtons: [
            '#workWithFilesBtn',
            '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button'
        ]
    };
    
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
    // 🔥 Парсинг числа из строки (убираем пробелы, заменяем запятую)
    // ─────────────────────────────────────────────
    function parseNum(str) {
        if (!str) return 0;
        const cleaned = str.toString().replace(/\s/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    // ─────────────────────────────────────────────
    // 🔥 Форматирование числа с пробелами (12345.67 → "12 345,67")
    // ─────────────────────────────────────────────
    function formatMoney(amount) {
        const [intPart, decPart] = amount.toFixed(2).split('.');
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return decPart ? `${formattedInt},${decPart}` : formattedInt;
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 НОВАЯ ФУНКЦИЯ: сбор суммы заказа
    // ─────────────────────────────────────────────
    function parseProductSumma() {
        let s = 0, c = 0;
        
        // Сумма заказа
        const se = document.querySelector(SELECTORS.summaElement);
        if (se) {
            const text = se.textContent || se.value || '';
            s = parseNum(text);
        }
        
        // Корректировка суммы (если есть)
        const ce = document.querySelector(SELECTORS.correctionInput);
        if (ce && ce.value) {
            c = parseNum(ce.value);
        }
        
        // Итоговая сумма (с учётом корректировки)
        const total = s - c;
        
        return {
            rawSumma: s,
            rawCorrection: c,
            total: total.toFixed(2),
            formatted: formatMoney(total)
        };
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
        const value = el.value !== undefined ? el.value : el.textContent;
        return (value || '').toString().trim() || 'Не найдено';
    }

    // ─────────────────────────────────────────────
    // 🔥 Формирование сообщения (с суммой в конце)
    // ─────────────────────────────────────────────
    function formatMessage(data) {
        // 🔥 Формируем основную часть сообщения
        let message = `Запущена перепечатка! 
Номер перепечатки: ${data.productId}
Перепечатывается заказ : ${data.originalId}
Отдел: ${data.dept}
Причина: ${data.comment}
Ответственный: ${data.author}`;
        
        // 🔥 Добавляем сумму заказа последней строкой
        if (data.summa && data.summa.total) {
            message += `
Сумма перепечатки: ${data.summa.formatted} рублей`;
        }
        
        return message;
    }

    // ─────────────────────────────────────────────
    // 🔥 Отправка в Telegram (ПОЛНОСТЬЮ ФОНОВАЯ)
    // ─────────────────────────────────────────────
    function sendToTelegram() {
        if (isSending) {
            log('⏳ Отправка уже выполняется, пропуск');
            return;
        }

        if (!isReady()) {
            log('❌ Данные не готовы для отправки');
            return;
        }

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            warn('⚠️ Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
            return;
        }

        isSending = true;

        // 🔥 Сбор данных
        const data = {
            productId: extractText(SELECTORS.productId),
            originalId: extractText(SELECTORS.brakOriginalId),
            comment: extractText(SELECTORS.brakComment),
            dept: extractText(SELECTORS.brakDepartment),
            author: extractText(SELECTORS.brakAuthor),
            // 🔥 Собираем сумму заказа
            summa: parseProductSumma()
        };

        // 🔥 Формируем сообщение (с суммой)
        const message = formatMessage(data);

        log('📤 Отправка уведомления:', { 
            productId: data.productId, 
            originalId: data.originalId,
            dept: data.dept,
            summa: data.summa?.formatted || 'N/A'
        });

        // 🔥 Отправка запроса
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