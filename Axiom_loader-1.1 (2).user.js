// ==UserScript==
// @name Axiom_loader
// @namespace http://tampermonkey.net/
// @version 1.1
// @description Загружает и выполняет скрипт с GitHub с автоматическим обновлением
// @author Ваше имя
// @match https://cplink.simprint.pro/*
// @icon https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // URL основного скрипта на GitHub
    const scriptUrl = 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Axioma_beta.js';

    // Функция для загрузки и исполнения скрипта
    function loadScript(url) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                // Проверяем, успешно ли загружен скрипт
                if (response.status === 200) {
                    try {
                        // Очищаем предыдущий скрипт (если есть)
                        if (window.axiomCleanup && typeof window.axiomCleanup === 'function') {
                            window.axiomCleanup();
                        }
                        // Выполняем загруженный скрипт
                        eval(response.responseText);
                    } catch (e) {
                        console.error('Ошибка при выполнении скрипта:', e);
                    }
                } else {
                    console.error('Ошибка загрузки скрипта: HTTP статус', response.status);
                }
            },
            onerror: function(err) {
                console.error('Ошибка при запросе:', err);
            }
        });
    }

    // Функция для периодической перезагрузки скрипта
    function startAutoReload() {
        // Загружаем скрипт сразу при запуске
        loadScript(scriptUrl);

        // Устанавливаем интервал перезагрузки (30 минут = 1800000 миллисекунд)
        setInterval(() => {
            console.log('Перезагрузка скрипта...');
            loadScript(scriptUrl);
        }, 1000);
    }

    // Запускаем автоматическую перезагрузку
    startAutoReload();

})();