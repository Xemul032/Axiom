// 12brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
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
        // 🔥 НОВЫЕ: для расчета суммы
        summaBase: '#Summa',
        summaCorrection: '#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input',
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
        if (!el) return null;
        const value = el.value !== undefined ? el.value : el.textContent;
        const trimmed = (value || '').toString().trim();
        return trimmed || null;
    }

    // ─────────────────────────────────────────────
    // 🔥 🔥 НОВАЯ ФУНКЦИЯ: получение суммы перепечатки
    // ─────────────────────────────────────────────
    function getReprintSum() {
        // Получаем базовую сумму из #Summa
        const summaBaseEl = document.querySelector(SELECTORS.summaBase);
        let baseSum = 0;
        if (summaBaseEl) {
            const baseText = summaBaseEl.textContent.trim().replace(/\s/g, '').replace(',', '.');
            baseSum = parseFloat(baseText) || 0;
        }
        
        // Получаем коррекцию из input.SummaCorrection
        const correctionEl = document.querySelector(SELECTORS.summaCorrection);
        let correction = 0;
        if (correctionEl && correctionEl.value) {
            const corrText = correctionEl.value.trim().replace(',', '.');
            correction = parseFloat(corrText) || 0;
        }
        
        // 🔥 Логика: если коррекция отрицательная — берём модуль и ПРИБАВЛЯЕМ к базе
        // Если положительная — ВЫЧИТАЕМ из базы (или можно просто прибавлять с учётом знака)
        let finalSum = baseSum;
        if (correction < 0) {
            finalSum = baseSum + Math.abs(correction);
        } else if (correction > 0) {
            finalSum = baseSum - correction;
        }
        
        // Округляем до 2 знаков и возвращаем
        return Math.round(finalSum * 100) / 100;
    }

    // ─────────────────────────────────────────────
    // 🔥 Формирование сообщения в НОВОМ формате
    // ─────────────────────────────────────────────
    function formatMessage(data) {
        // 🔥 Новый формат сообщения:
        // Запущена перепечатка! 
        // Номер перепечатки: 380377
        // Перепечатывается заказ : {originalId}
        // Отдел: {dept}
        // Причина: {comment}
        // Ответственный: {author}
        // Сумма перепечатки: {sum} рублей
        return `Запущена перепечатка! 
Номер перепечатки: ${data.productId}
Перепечатывается заказ : ${data.originalId}
Отдел: ${data.dept}
Причина: ${data.comment}
Ответственный: ${data.author}
Сумма перепечатки: ${data.sum} рублей`;
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

        // 🔥 Сбор данных — включая сумму
        const data = {
            productId: extractText(SELECTORS.productId),
            originalId: extractText(SELECTORS.brakOriginalId),
            comment: extractText(SELECTORS.brakComment),
            dept: extractText(SELECTORS.brakDepartment),
            author: extractText(SELECTORS.brakAuthor),
            sum: getReprintSum() // 🔥 НОВОЕ: сумма перепечатки
        };

        // 🔥 Формируем сообщение с суммой
        const message = formatMessage(data);

        log('📤 Отправка уведомления:', { 
            productId: data.productId, 
            originalId: data.originalId,
            dept: data.dept,
            sum: data.sum
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
            warn('⚠️ Модуль не активирован: не настроены токены');
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