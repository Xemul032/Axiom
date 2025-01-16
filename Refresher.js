// ==UserScript==
// @name         SimPrint Tab Auto Refresh at 22:00
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Автоматическое обновление всех вкладок SimPrint в 22:00
// @author       Your Name
// @match        https://cplink.simprint.pro/*
// ==/UserScript==

(function() {
    'use strict';

    // Создаем уникальный ID для текущей вкладки
    const tabId = Math.random().toString(36).substring(7);

    // Устанавливаем время последней активности для этой вкладки
    function updateLastActive() {
        localStorage.setItem('tab_' + tabId, Date.now().toString());
    }

    // Очищаем старые записи вкладок (старше 1 часа)
    function cleanupOldTabs() {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        keys.forEach(key => {
            if (key.startsWith('tab_')) {
                const lastActive = parseInt(localStorage.getItem(key));
                if (now - lastActive > 3600000) { // 1 час в миллисекундах
                    localStorage.removeItem(key);
                }
            }
        });
    }

    // Проверяем, нужно ли обновить страницу
    function checkRefreshTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        if (hours === 12 && minutes === 29) {
            location.reload();
        }
    }

    // Обновляем время активности каждую минуту
    setInterval(() => {
        updateLastActive();
        cleanupOldTabs();
    }, 60000);

    // Проверяем время для обновления каждую минуту
    setInterval(checkRefreshTime, 60000);

    console.log('Отсчёт пошёл! Обновление в 12:35');

    // Инициализация при запуске
    updateLastActive();
    cleanupOldTabs();
})();
