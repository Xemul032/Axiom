// brakReprintTelegramNotifier.js — модуль отправки уведомлений о перепечатке в Telegram
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive, sendNow }
// ⚠️ ВСЕ НАСТРОЙКИ (селекторы, токены, chatId) — ВНУТРИ КОДА, не в конфиге!
// 🔥 РАБОТАЕТ ПОЛНОСТЬЮ В ФОНЕ — БЕЗ ВИЗУАЛЬНЫХ УВЕДОМЛЕНИЙ

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 🔥 🔥 ВСЕ НАСТРОЙКИ — ВНУТРИ КОДА (не выносить в config.json!) 🔥 🔥 🔥
    
    // Telegram конфигурация
    const TELEGRAM_BOT_TOKEN = '8070906629:AAEzR7a9k7nxIBTof8lfz7o5cRsMErJ3DEo';
    
    // 🔥 МАССИВ chatId — сообщение отправляется в каждый из них
    const TELEGRAM_CHAT_IDS = [
        '-5229879106',      // Перепечатки Линк
        '-1003524405962'    // Брак
    ];
    
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const TELEGRAM_DELAY_MS = 500; // 🔥 Задержка между отправками в разные чаты (мс)
    
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
    // 🔥 Проверка заполненности ВСЕХ обязательных полей
    // ─────────────────────────────────────────────
    function areAllFieldsFilled() {
        const brakBlock = document.querySelector(SELECTORS.brakBlock);
        if (!brakBlock) {
            log('❌ Не найден brakBlock:', SELECTORS.brakBlock);
            return false;
        }
        
        const requiredFields = [
            { key: 'productId', selector: SELECTORS.productId },
            { key: 'brakOriginalId', selector: SELECTORS.brakOriginalId },
            { key: 'brakComment', selector: SELECTORS.brakComment },
            { key: 'brakDepartment', selector: SELECTORS.brakDepartment },
            { key: 'brakAuthor', selector: SELECTORS.brakAuthor }
        ];
        
        for (const field of requiredFields) {
            const value = extractText(field.selector);
            if (value === null || value === '') {
                log(`❌ Поле ${field.key} пусто или не найдено:`, field.selector);
                return false;
            }
        }
        
        log('✅ Все обязательные поля заполнены');
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
Ответственный: ${data.author}
Сумма перепечатки: ${data.sum} рублей`;
    }

    // ─────────────────────────────────────────────
    // 🔥 Выполнение одного HTTP-запроса к Telegram API
    // ─────────────────────────────────────────────
    function sendRequest(url, payload) {
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
    }

    // ─────────────────────────────────────────────
    // 🔥 Отправка сообщения в ОДИН чат
    // ─────────────────────────────────────────────
    function sendToSingleChat(chatId, message) {
        return sendRequest(TELEGRAM_API_URL, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        })
        .then(() => {
            log(`✅ Уведомление отправлено в чат ${chatId}`);
            return { chatId, success: true };
        })
        .catch(err => {
            warn(`❌ Ошибка отправки в чат ${chatId}:`, err);
            return { chatId, success: false, error: err };
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Отправка в Telegram (ПОЛНОСТЬЮ ФОНОВАЯ)
    // 🔥 Отправляет сообщение ПОСЛЕДОВАТЕЛЬНО во все чаты из массива
    // ─────────────────────────────────────────────
    async function sendToTelegram() {
        if (isSending) {
            log('⏳ Отправка уже выполняется, пропуск');
            return;
        }

        // 🔥 СТРОГАЯ ПРОВЕРКА: все поля должны быть заполнены
        if (!areAllFieldsFilled()) {
            log('❌ Не все поля заполнены, отправка отменена');
            return;
        }

        // 🔥 Проверка конфигурации (массив chatId)
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_IDS || !TELEGRAM_CHAT_IDS.length) {
            warn('⚠️ Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_IDS');
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
            sum: getReprintSum()
        };

        const message = formatMessage(data);

        log('📤 Отправка уведомления:', { 
            productId: data.productId, 
            originalId: data.originalId,
            dept: data.dept,
            sum: data.sum,
            chats: TELEGRAM_CHAT_IDS
        });

        try {
            // 🔥 Последовательная отправка во все чаты с задержкой
            const results = [];
            
            for (let i = 0; i < TELEGRAM_CHAT_IDS.length; i++) {
                const chatId = TELEGRAM_CHAT_IDS[i];
                
                // Задержка между отправками (кроме первой)
                if (i > 0 && TELEGRAM_DELAY_MS > 0) {
                    await new Promise(resolve => setTimeout(resolve, TELEGRAM_DELAY_MS));
                }
                
                const result = await sendToSingleChat(chatId, message);
                results.push(result);
            }
            
            // 🔥 Логируем итог
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            
            if (successCount === results.length) {
                log(`✅ Все уведомления отправлены (${successCount}/${results.length})`);
            } else if (successCount > 0) {
                log(`⚠️ Частичная отправка: ${successCount}/${results.length} успешно, ${failCount} с ошибками`);
            } else {
                warn(`❌ Не удалось отправить ни в один чат (${failCount}/${results.length})`);
            }
        } catch (err) {
            warn('❌ Критическая ошибка отправки:', err);
        } finally {
            setTimeout(() => { isSending = false; }, 1000);
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Функция расчета суммы перепечатки
    // ─────────────────────────────────────────────
    function getReprintSum() {
        const summaBaseEl = document.querySelector('#Summa');
        let baseSum = 0;
        if (summaBaseEl) {
            const baseText = summaBaseEl.textContent.trim().replace(/\s/g, '').replace(',', '.');
            baseSum = parseFloat(baseText) || 0;
        }
        
        const correctionEl = document.querySelector('#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td.right > input');
        let correction = 0;
        if (correctionEl && correctionEl.value) {
            const corrText = correctionEl.value.trim().replace(',', '.');
            correction = parseFloat(corrText) || 0;
        }
        
        let finalSum = baseSum;
        if (correction < 0) {
            finalSum = baseSum + Math.abs(correction);
        } else if (correction > 0) {
            finalSum = baseSum - correction;
        }
        
        return Math.round(finalSum * 100) / 100;
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
        
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_IDS || !TELEGRAM_CHAT_IDS.length) {
            warn('⚠️ Модуль не активирован: не настроены токены или chatId');
            return;
        }
        
        active = true;
        log('🚀 Модуль инициализирован (фоновый режим, чатов:', TELEGRAM_CHAT_IDS.length, ')');
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