// ==UserScript==
// @name Axiom_loader 8.0
// @namespace http://tampermonkey.net/
// @version 1.0
// @description Загружает и выполняет скрипт с GitHub и отправляет IP в Google таблицу каждые 10 минут
// @author Ваше имя
// @match https://cplink.simprint.pro/*
// @icon https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // URL основного скрипта на GitHub
    const scriptUrl = 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Axioma_beta.js';

    // URL для отправки данных в Google таблицу
    // Используем Google Apps Script для обработки запроса и записи в таблицу
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbzc6aZX1H1FMtWiBUJrSKNe8gkMq7ABJwBR6KROptoLuRkqhz9UYUq8YPkllAcyzdaT3g/exec';

    // Интервал отправки IP в минутах
    const sendIntervalMinutes = 60;

    // Переменная для хранения ID интервала
    let sendIntervalId = null;

    // Функция для получения IP-адреса пользователя
    function getIP() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://api.ipify.org?format=json',
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const element = document.querySelector('body > ul > div > li:nth-child(1) > a');
                            const data = element.innerText.trim();;
                            resolve(data.ip);
                        } catch (e) {
                            reject('Ошибка при парсинге ответа IP: ' + e);
                        }
                    } else {
                        reject('Ошибка получения IP: HTTP статус ' + response.status);
                    }
                },
                onerror: function(err) {
                    reject('Ошибка при запросе IP: ' + err);
                }
            });
        });
    }
    const element1 = document.querySelector('body > ul > div > li:nth-child(1) > a');
    const text = element1.innerText;
    // Функция для отправки IP в Google таблицу
    function sendIPToGoogleSheet(ip) {
        const userData = {
            ip: text,
            date: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: googleScriptUrl,
            data: JSON.stringify(userData),
            headers: {
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                if (response.status === 200) {
                    console.log('IP успешно отправлен в Google таблицу');
                } else {
                    console.error('Ошибка отправки IP в Google таблицу: HTTP статус', response.status);
                }
            },
            onerror: function(err) {
                console.error('Ошибка при отправке IP: ', err);
            }
        });
    }

    // Функция для загрузки и исполнения скрипта
    function loadScript(url) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                // Проверяем, успешно ли загружен скрипт
                if (response.status === 200) {
                    try {
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

    // Функция для периодической отправки IP
    async function startPeriodicIPSending() {
        try {
            // Получаем IP-адрес при первом запуске
            const ip = await getIP();

            // Отправляем IP в Google таблицу сразу после инициализации
            sendIPToGoogleSheet(ip);

            // Устанавливаем интервал для периодической отправки IP (каждые 10 минут)
            sendIntervalId = setInterval(async () => {
                try {
                    const newIp = await getIP();
                    sendIPToGoogleSheet(newIp);
                } catch (error) {
                    console.error('Ошибка при периодической отправке IP:', error);
                }
            }, sendIntervalMinutes * 60 * 1000); // Конвертируем минуты в миллисекунды

        } catch (error) {
            console.error('Ошибка при начале отправки IP:', error);
        }
    }

    // Функция для остановки периодической отправки IP (если понадобится)
    function stopPeriodicIPSending() {
        if (sendIntervalId) {
            clearInterval(sendIntervalId);
            sendIntervalId = null;
        }
    }

    // Функция для очистки ресурсов при закрытии страницы
    function cleanup() {
        stopPeriodicIPSending();
    }

    // Инициализация скрипта
    async function init() {
        try {
            // Запускаем периодическую отправку IP
            startPeriodicIPSending();

            // Загружаем и запускаем основной скрипт
            loadScript(scriptUrl);

            // Устанавливаем обработчик для очистки ресурсов при закрытии страницы
            window.addEventListener('beforeunload', cleanup);

        } catch (error) {
            console.error('Ошибка при инициализации:', error);
            // Загружаем скрипт даже при ошибке
            loadScript(scriptUrl);
        }
    }

    // Запускаем инициализацию
    init();
})();