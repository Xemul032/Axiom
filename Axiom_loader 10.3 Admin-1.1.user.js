// ==UserScript==
// @name         Axiom_loader 10.4 Admin
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
(function () {
    'use strict';

    // ===================== НАСТРОЙКИ =====================
    const scriptUrl = 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Axioma_beta.js';
    const ipGoogleScriptUrl = 'https://script.google.com/macros/s/AKfycbzc6aZX1H1FMtWiBUJrSKNe8gkMq7ABJwBR6KROptoLuRkqhz9UYUq8YPkllAcyzdaT3g/exec';
    const productIdGoogleScriptUrl = 'https://script.google.com/macros/s/AKfycby9IXaH-ZAgKYgOfBEl6o5mgzhAluAdaQ45BFAoRaqPzZur1RLg20P2VWdQAiZ_rKwq/exec';
    const sendIntervalMinutes = 60;

    function hideRepeat() {
    'use strict';

    // Селектор для проверки текста (условие)
    const TARGET_SELECTOR = 'body > ul > div > li:nth-child(1) > a';

    // Селекторы для скрываемых кнопок
    const REPEAT_BUTTON_SELECTOR = '.btn.btn-default.RepeatButton';
    const REG_BUTTON_SELECTOR = 'button.RegButton';

    // 🔽 Новые селекторы
    const DROPDOWN_TOGGLE_SELECTOR = '.btn.btn-default.dropdown-toggle';
    const RECALC_LINK_SELECTOR = 'a.btn.btn-default[onclick^="Recalc("]'; // Ловит onclick="Recalc(..."

    // Разрешённые имена/тексты
    const ALLOWED_NAMES = [
        'тест',
        'Абдрахманова Лейсан',
        'Мухаметшина Раиля'
    ];

    // Проверяем, содержится ли один из разрешённых текстов в целевом элементе
    function shouldHide() {
        const targetElement = document.querySelector(TARGET_SELECTOR);
        if (!targetElement) return false;

        const text = targetElement.textContent.trim();
        return ALLOWED_NAMES.some(name => text.includes(name));
    }

    // Скрываем элемент, если он есть и ещё не скрыт
    function hideElement(selector) {
        const element = document.querySelector(selector);
        if (element && !element.hasAttribute('data-hidden-by-tampermonkey')) {
            element.style.display = 'none';
            element.setAttribute('data-hidden-by-tampermonkey', 'true');
        }
    }

    // Скрываем ВСЕ нужные элементы, если условие выполняется
    function hideButtonsIfAllowed() {
        if (shouldHide()) {
            hideElement(REPEAT_BUTTON_SELECTOR);
            hideElement(REG_BUTTON_SELECTOR);
            hideElement(DROPDOWN_TOGGLE_SELECTOR);
            hideElement(RECALC_LINK_SELECTOR);
        }
    }

    // Запускаем проверку сразу
    hideButtonsIfAllowed();

    // Наблюдаем за ЛЮБЫМИ изменениями в DOM
    const observer = new MutationObserver(function(mutations) {
        let shouldCheck = false;

        mutations.forEach(function(mutation) {
            // Изменение дочерних узлов
            if (mutation.type === 'childList') {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        // Проверяем, добавлен ли целевой элемент или его контейнер
                        if (node === document.querySelector(TARGET_SELECTOR) || node.querySelector(TARGET_SELECTOR)) {
                            shouldCheck = true;
                        }
                        // Проверяем, добавлены ли какие-либо из скрываемых кнопок
                        if (
                            node.matches &&
                            (
                                node.matches(REPEAT_BUTTON_SELECTOR) ||
                                node.matches(REG_BUTTON_SELECTOR) ||
                                node.matches(DROPDOWN_TOGGLE_SELECTOR) ||
                                node.matches(RECALC_LINK_SELECTOR) ||
                                node.querySelector(REPEAT_BUTTON_SELECTOR) ||
                                node.querySelector(REG_BUTTON_SELECTOR) ||
                                node.querySelector(DROPDOWN_TOGGLE_SELECTOR) ||
                                node.querySelector(RECALC_LINK_SELECTOR)
                            )
                        ) {
                            shouldCheck = true;
                        }
                    }
                }
                for (let node of mutation.removedNodes) {
                    if (node.nodeType === 1) {
                        if (node === document.querySelector(TARGET_SELECTOR) || node.querySelector(TARGET_SELECTOR)) {
                            shouldCheck = true;
                        }
                    }
                }
            }

            // Изменение текста
            if (mutation.type === 'characterData') {
                let node = mutation.target;
                let parent = node.parentElement;
                if (parent && parent.matches && parent.matches(TARGET_SELECTOR)) {
                    shouldCheck = true;
                }
            }
        });

        if (shouldCheck) {
            setTimeout(hideButtonsIfAllowed, 50);
        }
    });

    // Подключаем наблюдатель
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // Резервная проверка каждые 500 мс
    setInterval(hideButtonsIfAllowed, 500);
}

hideRepeat();

    // ===================== ПРОВЕРКА УСЛОВИЙ =====================
    function shouldExecuteScript() {
        const element = document.querySelector("body > ul > div > li:nth-child(1) > a");
        let blockElement = false;

        if (!element) {
            return { execute: true, blockElement: false };
        }

        const text = element.innerText.trim();
        if (["тест", "Абдрахманова Лейсан", "Мухаметшина Раиля"].includes(text)) {
            blockElement = true;
            return { execute: false, blockElement };
        }

        return { execute: true, blockElement: false };
    }

    // ===================== БЛОКИРОВКА ЭЛЕМЕНТА =====================
    function blockSpecificElement() {
        const targetSelector = "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > div";

        const tryBlockElement = () => {
            const element = document.querySelector(targetSelector);
            if (element) {
                element.style.pointerEvents = 'none';
                element.style.opacity = '0.5';
            }
        };

        // Проверяем сразу
        tryBlockElement();

        // Используем MutationObserver для отслеживания появления элемента в DOM
        const observer = new MutationObserver(() => {
            tryBlockElement();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ===================== МОДУЛЬ РАБОТЫ С IP =====================
    let sendIntervalId = null;

    function getIP() {
        return new Promise((resolve, reject) => {
            try {
                const element = document.querySelector('body > ul > div > li:nth-child(1) > a');
                if (element && element.innerText) {
                    const text = element.innerText.trim();
                    resolve(text);
                } else {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: 'https://api.ipify.org?format=json',
                        onload: function (response) {
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
                        onerror: function (err) {
                            reject('Ошибка при запросе IP: ' + err);
                        }
                    });
                }
            } catch (error) {
                reject('Ошибка при получении IP: ' + error);
            }
        });
    }

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
            onload: function (response) {
                if (response.status === 200) {}
            },
            onerror: function (err) {}
        });
    }

    function loadScript(url) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        eval(response.responseText);
                    } catch (e) {}
                }
            },
            onerror: function (err) {}
        });
    }

    async function startPeriodicIPSending() {
        try {
            const ip = await getIP();
            sendIPToGoogleSheet(ip);
            sendIntervalId = setInterval(async () => {
                try {
                    const newIp = await getIP();
                    sendIPToGoogleSheet(newIp);
                } catch (error) {}
            }, sendIntervalMinutes * 60 * 1000);
        } catch (error) {}
    }

    function stopPeriodicIPSending() {
        if (sendIntervalId) {
            clearInterval(sendIntervalId);
            sendIntervalId = null;
        }
    }

    // ===================== РАБОТА С КНОПКАМИ =====================
    const processedButtons = new Set();

    function extractProductId(clickEvent) {
        try {
            const button = clickEvent.target.closest('.RegButton') || clickEvent.target;
            if (!button.classList.contains('RegButton')) {
                return;
            }
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/ProductId:\s*(\d+)/);
                if (match && match[1]) {
                    const productId = match[1];
                    sendProductIdToGoogleSheets(productId);
                    return;
                }
            }
        } catch (error) {}
    }

    function sendProductIdToGoogleSheets(productId) {
        try {
            const pageUrl = window.location.href;
            const timestamp = new Date().toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', '');
            const data = {
                productId: productId,
                timestamp: timestamp,
            };
            GM_xmlhttpRequest({
                method: 'POST',
                url: productIdGoogleScriptUrl,
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                onload: function (response) {},
                onerror: function (error) {}
            });
        } catch (error) {}
    }

    function addButtonListeners() {
        let newButtonsFound = 0;
        const regButtons = document.querySelectorAll('.RegButton');
        const button1 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)");
        const button2 = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)");

        if (regButtons.length > 0) {
            regButtons.forEach(button => {
                if (!processedButtons.has(button)) {
                    button.addEventListener('click', extractProductId);
                    processedButtons.add(button);
                    newButtonsFound++;
                }
            });
        }

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

        return newButtonsFound;
    }

    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldCheckButtons = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheckButtons = true;
                    break;
                }
            }
            if (shouldCheckButtons) {
                addButtonListeners();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ===================== ИНИЦИАЛИЗАЦИЯ =====================
    function cleanup() {
        stopPeriodicIPSending();
    }

    function initializeButtonExtractor() {
        addButtonListeners();
        setupMutationObserver();
        setInterval(addButtonListeners, 2000);
    }

    async function initialize() {
        try {
            const result = shouldExecuteScript();

            if (!result.execute) {
                if (result.blockElement) {
                    blockSpecificElement(); // блокируем элемент
                }
                return;
            }

            if (window.location.href.includes('cplink.simprint.pro')) {
                startPeriodicIPSending();
                loadScript(scriptUrl);
            }

            initializeButtonExtractor();
            window.addEventListener('beforeunload', cleanup);
        } catch (error) {
            if (window.location.href.includes('cplink.simprint.pro') && shouldExecuteScript().execute) {
                loadScript(scriptUrl);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
