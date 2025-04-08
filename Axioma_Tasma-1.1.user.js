// ==UserScript==
// @name         Axioma_Tasma
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description
// @author       You
// @match        https://cplink.simprint.pro/*
// @match        :///*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      sheets.googleapis.com
// @connect      docs.google.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      raw.githubusercontent.com
// @connect      api.ipify.org
// ==/UserScript==

(function() {
    'use strict';

    let originalTitle = document.title; // Сохраняем оригинальный заголовок страницы

    // Функция для обновления заголовка страницы
    function updateTitle(orderId) {
        if (orderId) {
            document.title = `Заказ №${orderId} | ${originalTitle}`;
        } else {
            document.title = originalTitle; // Возвращаемся к исходному заголовку
        }
    }



    // Функция для отслеживания элемента
    function observeProductId() {
        const observer = new MutationObserver((mutationsList) => {
            let currentOrderId = null;

            // Проверяем текущее значение ProductId
            const productIdElement = document.querySelector('#ProductId');
            if (productIdElement) {
                currentOrderId = productIdElement.textContent.trim();
            }

            // Обновляем заголовок страницы
            updateTitle(currentOrderId);


        });

        // Начинаем наблюдать за body или определенным контейнером
        const targetNode = document.body;
        const config = { childList: true, subtree: true, characterData: true, attributes: true };
        observer.observe(targetNode, config);
    }

    // Запускаем наблюдение
    observeProductId();

})();