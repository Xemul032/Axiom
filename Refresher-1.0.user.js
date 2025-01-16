// ==UserScript==
// @name         Refresher
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Автоматическое обновление вкладок SimPrint в 22:00
// @author       Your Name
// @match        https://cplink.simprint.pro/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Функция для проверки времени
    function checkTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Если время 22:00:00, обновляем страницу
        if (hours === 11 && minutes === 35 && seconds === 0) {
            location.reload();
        }
    }

    // Проверяем время каждую секунду
    setInterval(checkTime, 1000);

    // Выводим сообщение в консоль для подтверждения работы скрипта
    console.log('Отсчёт пошёл');
})();
