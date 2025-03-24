// ==UserScript==
// @name         Axiom_loader 10.0
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description
// @author       You
// @match        https://cplink.simprint.pro/*
// @match        :///*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        GM_xmlhttpRequest
// @connect      sheets.googleapis.com
// @connect      docs.google.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      raw.githubusercontent.com
// @connect      api.ipify.org
// ==/UserScript==

(function() {
    'use strict';

    // ===================== КОНФИГУРАЦИЯ =====================

    // URL основного скрипта на GitHub
    const scriptUrl = 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Axioma_beta.js';

    // URL для отправки данных IP в Google таблицу
    const ipGoogleScriptUrl = 'https://script.google.com/macros/s/AKfycbzc6aZX1H1FMtWiBUJrSKNe8gkMq7ABJwBR6KROptoLuRkqhz9UYUq8YPkllAcyzdaT3g/exec';

    // URL для отправки ProductId в Google таблицу
    const productIdGoogleScriptUrl = 'https://script.google.com/macros/s/AKfycby9IXaH-ZAgKYgOfBEl6o5mgzhAluAdaQ45BFAoRaqPzZur1RLg20P2VWdQAiZ_rKwq/exec';

    // Интервал отправки IP в минутах
    const sendIntervalMinutes = 60;

    // ===================== МОДУЛЬ ДЛЯ РАБОТЫ С IP =====================

    // Переменная для хранения ID интервала
    let sendIntervalId = null;

    // Функция для получения IP-адреса пользователя
    function getIP() {
        return new Promise((resolve, reject) => {
            try {
                const element = document.querySelector('body > ul > div > li:nth-child(1) > a');
                if (element && element.innerText) {
                    const text = element.innerText.trim();
                    resolve(text);
                } else {
                    // Если не удалось получить IP из элемента страницы, пытаемся получить через API
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: 'https://api.ipify.org?format=json',
                        onload: function(response) {
                            if (response.status === 200) {
                                try {
                                    const data = JSON.parse(response.responseText);
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
                }
            } catch (error) {
                reject('Ошибка при получении IP: ' + error);
            }
        });
    }

    // Функция для отправки IP в Google таблицу
    function sendIPToGoogleSheet(ip) {
        const userData = {
            ip: ip,
            date: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: ipGoogleScriptUrl,
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
                        console.log('Скрипт успешно загружен и выполнен');
                    } catch (e) {
                        console.error('Ошибка при выполнении скрипта:', e);
                    }
                } else {
                    console.error('Ошибка загрузки скрипта: HTTP статус', response.status);
                }
            },
            onerror: function(err) {
                console.error('Ошибка при запросе скрипта:', err);
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

            // Устанавливаем интервал для периодической отправки IP
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

    // Функция для остановки периодической отправки IP
    function stopPeriodicIPSending() {
        if (sendIntervalId) {
            clearInterval(sendIntervalId);
            sendIntervalId = null;
        }
    }

    // ===================== МОДУЛЬ ДЛЯ РАБОТЫ С КНОПКАМИ =====================

    // Set для хранения кнопок, к которым уже добавлены обработчики
    const processedButtons = new Set();

    // Функция для извлечения ProductId из onclick атрибута
    function extractProductId(clickEvent) {
        try {
            const button = clickEvent.target.closest('.RegButton') || clickEvent.target;

            // Проверяем, что это нужная нам кнопка (по классу)
            if (!button.classList.contains('RegButton')) {
                return;
            }

            // Получаем атрибут onclick
            const onclickAttr = button.getAttribute('onclick');

            // Если атрибут существует, извлекаем ProductId
            if (onclickAttr) {
                // Используем регулярное выражение для извлечения ProductId
                const match = onclickAttr.match(/ProductId:\s*(\d+)/);
                if (match && match[1]) {
                    const productId = match[1];
                    console.log('ProductId:', productId);

                    // Отправляем ProductId в Google Таблицы
                    sendProductIdToGoogleSheets(productId);
                    return;
                }
            }

            // Если не смогли найти по атрибуту onclick, пробуем другие методы
            console.log('Could not extract ProductId from button');
        } catch (error) {
            console.error('Error extracting ProductId:', error);
        }
    }

    // Функция для отправки ProductId в Google Таблицы
    function sendProductIdToGoogleSheets(productId) {
        try {
            // Получаем URL текущей страницы
            const pageUrl = window.location.href;

            // Получаем текущую дату и время
            const timestamp = new Date().toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
                }).replace(',', '');

            // Подготовка данных для отправки
            const data = {
                productId: productId,
                timestamp: timestamp,
                };

            // Отправка данных в Google Таблицы через Apps Script Web App
            GM_xmlhttpRequest({
                method: 'POST',
                url: productIdGoogleScriptUrl,
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                onload: function(response) {
                    console.log('ProductId отправлен в Google Sheets:', response.responseText);
                },
                onerror: function(error) {
                    console.error('Ошибка отправки ProductId в Google Sheets:', error);
                }
            });
        } catch (error) {
            console.error('Ошибка отправки данных в Google Sheets:', error);
        }
    }

    // Функция для добавления обработчиков событий к кнопкам
    function addButtonListeners() {
        let newButtonsFound = 0;

        // Находим все кнопки с классом RegButton
        const regButtons = document.querySelectorAll('.RegButton');

        // Находим кнопки по селекторам
        const button1 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)");
        const button2 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)");

        // Добавляем обработчики событий для кнопок по классу
        if (regButtons.length > 0) {
            regButtons.forEach(button => {
                // Проверяем, не обработана ли уже эта кнопка
                if (!processedButtons.has(button)) {
                    button.addEventListener('click', extractProductId);
                    processedButtons.add(button);
                    newButtonsFound++;
                }
            });
        }

        // Добавляем обработчики событий для кнопок по селекторам
        if (button1 && !processedButtons.has(button1)) {
            button1.addEventListener('click', extractProductId);
            processedButtons.add(button1);
            newButtonsFound++;
        }

        if (button2 && !processedButtons.has(button2)) {
            button2.addEventListener('click', extractProductId);
            processedButtons.add(button2);
            newButtonsFound++;
        }

        if (newButtonsFound > 0) {
            console.log(`Добавлены обработчики к ${newButtonsFound} новым кнопкам`);
        }

        return newButtonsFound;
    }

    // Функция для наблюдения за изменениями DOM
    function setupMutationObserver() {
        // Создаем экземпляр MutationObserver
        const observer = new MutationObserver((mutations) => {
            let shouldCheckButtons = false;

            // Проверяем, были ли изменения, которые могут содержать новые кнопки
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheckButtons = true;
                    break;
                }
            }

            // Если были добавлены новые элементы, проверяем наличие новых кнопок
            if (shouldCheckButtons) {
                addButtonListeners();
            }
        });

        // Начинаем наблюдение за всем документом
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('Установлен MutationObserver для отслеживания новых кнопок');
    }

    // ===================== ИНИЦИАЛИЗАЦИЯ СКРИПТА =====================

    // Функция очистки ресурсов при закрытии страницы
    function cleanup() {
        stopPeriodicIPSending();
    }

    // Функция инициализации скрипта для работы с кнопками
    function initializeButtonExtractor() {
        console.log('Инициализация скрипта извлечения ProductId...');

        // Сначала ищем существующие кнопки
        addButtonListeners();

        // Устанавливаем наблюдатель за изменениями DOM
        setupMutationObserver();

        // Также продолжаем периодически проверять наличие новых кнопок
        setInterval(addButtonListeners, 2000);
    }

    // Основная функция инициализации
    async function initialize() {
        console.log('Инициализация объединенного скрипта...');

        try {
            // Инициализируем отправку IP (только для соответствующего домена)
            if (window.location.href.includes('cplink.simprint.pro')) {
                // Запускаем периодическую отправку IP
                startPeriodicIPSending();

                // Загружаем и запускаем основной скрипт
                loadScript(scriptUrl);
            }

            // Инициализируем отслеживание кнопок и отправку ProductId (для всех доменов)
            initializeButtonExtractor();

            // Устанавливаем обработчик для очистки ресурсов при закрытии страницы
            window.addEventListener('beforeunload', cleanup);

        } catch (error) {
            console.error('Ошибка при инициализации:', error);

            // В случае ошибки всё равно пытаемся загрузить основной скрипт (если на нужном домене)
            if (window.location.href.includes('cplink.simprint.pro')) {
                loadScript(scriptUrl);
            }
        }
    }

    // Запускаем инициализацию при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
