// ==UserScript==
// @name         Refresher
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Автоматическое обновление всех вкладок SimPrint в 22:00
// @author       Your Name
// @match        https://cplink.simprint.pro/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Создаем уникальный ID для текущей вкладки
    const tabId = Math.random().toString(36).substring(7);
    
    // Устанавливаем время последней активности для этой вкладки
    function updateLastActive() {
        GM_setValue('tab_' + tabId, Date.now());
    }

    // Очищаем старые записи вкладок (старше 1 часа)
    function cleanupOldTabs() {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        keys.forEach(key => {
            if (key.startsWith('tab_')) {
                const lastActive = GM_getValue(key);
                if (now - lastActive > 3600000) { // 1 час в миллисекундах
                    GM_setValue(key, null);
                }
            }
        });
    }

    // Функция для проверки времени
    function checkTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Обновляем время последней активности
        updateLastActive();

        // Если время 22:00:00, обновляем страницу
        if (hours === 12 && minutes === 30 && seconds === 0) {
            // Небольшая случайная задержка для предотвращения одновременного обновления всех вкладок
            setTimeout(() => {
                location.reload();
            }, Math.random() * 2000); // Случайная задержка до 2 секунд
        }

        // Периодически очищаем старые записи
        if (minutes === 0 && seconds === 0) {
            cleanupOldTabs();
        }
    }

    // Обработчик видимости страницы
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateLastActive();
        }
    });

    // Проверяем время каждую секунду
    setInterval(checkTime, 1000);

    // Инициализируем вкладку при запуске
    updateLastActive();

    // Выводим сообщение в консоль для подтверждения работы скрипта
    console.log('SimPrint Auto Refresh скрипт активирован (Tab ID: ' + tabId + ')');
})();
