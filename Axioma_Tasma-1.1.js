// ==UserScript==
// @name         Axioma_Tasma 2.1
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Функциональная версия без отладочного логирования
// @author       You
// @match        https://cplink.simprint.pro/*
// @match        *://*
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

    let originalTitle = document.title;

    // ========== ФУНКЦИЯ ОБНОВЛЕНИЯ ЗАГОЛОВКА ==========
    function updateTitle(orderId) {
        if (orderId) {
            document.title = `Заказ №${orderId} | ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    // ========== НАБЛЮДЕНИЕ ЗА PRODUCT ID ==========
    function observeProductId() {
        const productIdElement = document.querySelector('#ProductId');
        
        const observer = new MutationObserver(() => {
            const productIdElement = document.querySelector('#ProductId');
            let currentOrderId = productIdElement ? productIdElement.textContent.trim() : null;
            updateTitle(currentOrderId);
        });

        const targetNode = document.body;
        const config = { 
            childList: true, 
            subtree: true, 
            characterData: true, 
            attributes: true 
        };
        
        observer.observe(targetNode, config);
        return observer;
    }

    // ========== ПОДСВЕТКА ПРЕДПЕЧАТИ ==========
    function prepHighlight() {
        let tableObserver;
        let delayedOrdersCount = 0;
        let maxDelayInHours = 0;
        let statsElement;

        // Наблюдение за таблицей
        function observeTable() {
            const targetNode = document.body;
            const config = { childList: true, subtree: true };
            
            tableObserver = new MutationObserver((mutationsList) => {
                const table = document.querySelector("#PrepressListRoot > div > div.ax-table-body > table");
                if (table) {
                    processTable();
                    showStatistics();
                } else {
                    hideStatistics();
                }
            });
            
            tableObserver.observe(targetNode, config);
            
            // Проверка существования таблицы при старте
            const table = document.querySelector("#PrepressListRoot > div > div.ax-table-body > table");
            if (table) {
                processTable();
                showStatistics();
            } else {
                hideStatistics();
            }
        }

        // Расчет времени в таблице
        function calculateTableTime(currentTime) {
            const timeMap = {
                "09:00": { time: "09:00", isNextDay: false },
                "09:15": { time: "09:20", isNextDay: false },
                "09:30": { time: "09:40", isNextDay: false },
                "09:45": { time: "10:00", isNextDay: false },
                "10:00": { time: "10:20", isNextDay: false },
                "10:15": { time: "10:40", isNextDay: false },
                "10:30": { time: "11:00", isNextDay: false },
                "10:45": { time: "11:20", isNextDay: false },
                "11:00": { time: "11:40", isNextDay: false },
                "11:15": { time: "12:00", isNextDay: false },
                "11:30": { time: "12:20", isNextDay: false },
                "11:45": { time: "12:40", isNextDay: false },
                "12:00": { time: "13:00", isNextDay: false },
                "12:15": { time: "13:20", isNextDay: false },
                "12:30": { time: "13:40", isNextDay: false },
                "12:45": { time: "14:00", isNextDay: false },
                "13:00": { time: "14:20", isNextDay: false },
                "13:15": { time: "14:40", isNextDay: false },
                "13:30": { time: "15:00", isNextDay: false },
                "13:45": { time: "15:20", isNextDay: false },
                "14:00": { time: "15:40", isNextDay: false },
                "14:15": { time: "16:00", isNextDay: false },
                "14:30": { time: "16:20", isNextDay: false },
                "14:45": { time: "16:40", isNextDay: false },
                "15:00": { time: "17:00", isNextDay: false },
                "15:15": { time: "17:20", isNextDay: false },
                "15:30": { time: "17:40", isNextDay: false },
                "15:45": { time: "18:00", isNextDay: false },
                "16:00": { time: "18:20", isNextDay: false },
                "16:15": { time: "18:40", isNextDay: false },
                "16:30": { time: "19:00", isNextDay: false },
                "16:45": { time: "07:20", isNextDay: true },
                "17:00": { time: "07:40", isNextDay: true },
                "17:15": { time: "08:00", isNextDay: true },
                "17:30": { time: "08:20", isNextDay: true },
                "17:45": { time: "08:40", isNextDay: true },
                "18:00": { time: "09:00", isNextDay: true }
            };
            
            const times = Object.keys(timeMap).sort();
            let matchedTime = null;
            
            for (let i = times.length - 1; i >= 0; i--) {
                if (currentTime >= times[i]) {
                    matchedTime = timeMap[times[i]];
                    break;
                }
            }
            
            if (!matchedTime) {
                matchedTime = timeMap["09:00"];
            }
            
            return matchedTime;
        }

        // Обработка таблицы
        function processTable() {
            const table = document.querySelector("#PrepressListRoot > div > div.ax-table-body > table");
            if (!table) {
                return;
            }
            
            const rows = table.querySelectorAll("tr");
            delayedOrdersCount = 0;
            maxDelayInHours = 0;
            
            const now = new Date();
            const currentHour = String(now.getHours()).padStart(2, '0');
            const currentMinute = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${currentHour}:${currentMinute}`;
            
            const tableTimeInfo = calculateTableTime(currentTime);
            if (!tableTimeInfo) {
                return;
            }
            
            const matchedTime = tableTimeInfo.time;
            const isNextDay = tableTimeInfo.isNextDay;
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const matchedDateTime = parseDateTime(`${isNextDay ? "завтра" : "сегодня"} ${matchedTime}`);
            if (!matchedDateTime) {
                return;
            }
            
            rows.forEach((row) => {
                // Проверка на изображение стоп
                const hasStopImage = Array.from(row.querySelectorAll("img")).some(img =>
                    img.src.includes("img/stop/1.png")
                );
                
                if (hasStopImage) {
                    return;
                }
                
                // Проверка на "Рулонная"
                const fourthCell = row.querySelector("td:nth-child(4)");
                if (fourthCell && fourthCell.textContent.trim().includes("Рулонная")) {
                    return;
                }
                
                // Проверка на "Сборный тираж"
                const eighthCell = row.querySelector("td:nth-child(8)");
                const isCombinedOrder = eighthCell && eighthCell.textContent.trim().includes("Сборный тираж");
                
                // Получение ячейки времени
                const timeCell = row.querySelector("td:nth-child(13)");
                if (!timeCell) {
                    return;
                }
                
                const dateTimeString = timeCell.textContent.trim();
                const rowDateTime = parseDateTime(dateTimeString);
                
                if (!rowDateTime) {
                    return;
                }
                
                if (rowDateTime < matchedDateTime) {
                    const delayInMinutes = Math.floor((matchedDateTime - rowDateTime) / (1000 * 60));
                    const maxDelayInMinutes = 24 * 60;
                    const alpha = Math.min(1, delayInMinutes / maxDelayInMinutes);
                    
                    timeCell.style.backgroundColor = `rgba(255, 192, 203, ${alpha})`;
                    
                    if (!isCombinedOrder) {
                        delayedOrdersCount++;
                        const delayInHours = Math.round(delayInMinutes / 60);
                        if (delayInHours > maxDelayInHours) {
                            maxDelayInHours = delayInHours;
                        }
                    }
                } else {
                    timeCell.style.backgroundColor = "";
                }
            });
            
            updateStatistics();
        }

        // Парсинг даты
        function parseDateTime(dateTimeString) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const regexToday = /^сегодня (\d{1,2}):(\d{1,2})$/i;
            const regexYesterday = /^вчера (\d{1,2}):(\d{1,2})$/i;
            const regexTomorrow = /^завтра (\d{1,2}):(\d{1,2})$/i;
            const regexDate = /^(\d{1,2})\.(\d{1,2}) (\d{1,2}):(\d{1,2})$/;
            
            let match;
            
            match = dateTimeString.match(regexToday);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexYesterday);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexTomorrow);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexDate);
            if (match) {
                const [_, day, month, hours, minutes] = match.map(Number);
                return new Date(today.getFullYear(), month - 1, day, hours, minutes);
            }
            
            return null;
        }

        // Обновление статистики
        function updateStatistics() {
            const firstListItem = document.querySelector("body > ul > div > li:nth-child(1)");
            if (!firstListItem) {
                return;
            }
            
            if (!statsElement) {
                statsElement = document.createElement("div");
                statsElement.classList.add("stats");
                statsElement.style.display = "inline-block";
                statsElement.style.marginRight = "10px";
                statsElement.style.padding = "5px";
                statsElement.style.backgroundColor = "#f0f0f0";
                statsElement.style.borderRadius = "5px";
                statsElement.style.fontSize = "12px";
                firstListItem.parentNode.insertBefore(statsElement, firstListItem);
            }
            
            statsElement.innerHTML = `
                <p style="margin: 2px 0; font-weight: bold;">Заказов с опозданием: ${delayedOrdersCount}</p>
                <p style="margin: 2px 0; font-weight: bold;">Опоздание в часах: ${maxDelayInHours}</p>
            `;
        }

        // Показ/скрытие статистики
        function showStatistics() {
            if (statsElement) {
                statsElement.style.display = "inline-block";
            }
        }

        function hideStatistics() {
            if (statsElement) {
                statsElement.style.display = "none";
            }
        }

        // Инициализация
        observeTable();
    }

    // ========== ПОДСВЕТКА ЦИФРОВОЙ ПЕЧАТИ ==========
    function cifraHighligh() {
        let smenaControlObserver;
        let tableObserver;
        let delayedOrdersCount = 0;
        let maxDelayInHours = 0;
        let statsElement;

        // Наблюдение за SmenaControl
        function observeSmenaControl() {
            const targetNode = document.body;
            const config = { childList: true, subtree: true };
            
            smenaControlObserver = new MutationObserver(() => {
                if (document.querySelector("#SmenaControl")) {
                    observeTable();
                }
            });
            
            smenaControlObserver.observe(targetNode, config);
        }

        // Наблюдение за таблицей цифровой печати
        function observeTable() {
            const targetNode = document.body;
            const config = { childList: true, subtree: true };
            
            tableObserver = new MutationObserver(() => {
                const table = document.querySelector("#TableCifraList");
                if (table) {
                    processTable();
                    showStatistics();
                } else {
                    hideStatistics();
                }
            });
            
            tableObserver.observe(targetNode, config);
            
            // Проверка при старте
            const table = document.querySelector("#TableCifraList");
            if (table) {
                processTable();
                showStatistics();
            } else {
                hideStatistics();
            }
        }

        // Обработка таблицы цифровой печати
        function processTable() {
            const table = document.querySelector("#TableCifraList");
            if (!table) {
                return;
            }
            
            const rows = table.querySelectorAll("tr");
            delayedOrdersCount = 0;
            maxDelayInHours = 0;
            
            rows.forEach((row) => {
                // Проверка на изображение стоп
                const hasStopImage = Array.from(row.querySelectorAll("img")).some(img =>
                    img.src.includes("img/stop/1.png")
                );
                
                if (hasStopImage) {
                    return;
                }
                
                // Получение ячейки времени
                const timeCell = row.querySelector("td:nth-child(15)");
                if (!timeCell) {
                    return;
                }
                
                const dateTimeString = timeCell.textContent.trim();
                const rowDateTime = parseDateTime(dateTimeString);
                
                if (!rowDateTime) {
                    return;
                }
                
                const currentDateTime = new Date();
                
                if (rowDateTime < currentDateTime) {
                    delayedOrdersCount++;
                    
                    const delayInHours = Math.round((currentDateTime - rowDateTime) / (1000 * 60 * 60));
                    if (delayInHours > maxDelayInHours) {
                        maxDelayInHours = delayInHours;
                    }
                    
                    const maxOpacity = 1;
                    const minOpacity = 0.2;
                    const opacity = minOpacity + (Math.min(delayInHours, 12) / 12) * (maxOpacity - minOpacity);
                    
                    timeCell.style.backgroundColor = `rgba(255, 192, 203, ${opacity})`;
                } else {
                    timeCell.style.backgroundColor = "";
                }
            });
            
            updateStatistics();
        }

        // Парсинг даты
        function parseDateTime(dateTimeString) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const regexToday = /^сегодня (\d{1,2}):(\d{1,2})$/i;
            const regexYesterday = /^вчера (\d{1,2}):(\d{1,2})$/i;
            const regexTomorrow = /^завтра (\d{1,2}):(\d{1,2})$/i;
            const regexDate = /^(\d{1,2})\.(\d{1,2}) (\d{1,2}):(\d{1,2})$/;
            
            let match;
            
            match = dateTimeString.match(regexToday);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexYesterday);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexTomorrow);
            if (match) {
                const [_, hours, minutes] = match.map(Number);
                return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hours, minutes);
            }
            
            match = dateTimeString.match(regexDate);
            if (match) {
                const [_, day, month, hours, minutes] = match.map(Number);
                return new Date(today.getFullYear(), month - 1, day, hours, minutes);
            }
            
            return null;
        }

        // Обновление статистики
        function updateStatistics() {
            const firstListItem = document.querySelector("body > ul > div > li:nth-child(1)");
            if (!firstListItem) {
                return;
            }
            
            if (!statsElement) {
                statsElement = document.createElement("div");
                statsElement.classList.add("stats-cifra");
                statsElement.style.display = "inline-block";
                statsElement.style.marginRight = "10px";
                statsElement.style.padding = "5px";
                statsElement.style.backgroundColor = "#e8f4fc";
                statsElement.style.borderRadius = "5px";
                statsElement.style.fontSize = "12px";
                statsElement.style.marginTop = "5px";
                firstListItem.parentNode.insertBefore(statsElement, firstListItem.nextSibling);
            }
            
            statsElement.innerHTML = `
                <p style="margin: 2px 0; font-weight: bold; color: #0066cc;">Цифра - Заказов с опозданием: ${delayedOrdersCount}</p>
                <p style="margin: 2px 0; font-weight: bold; color: #0066cc;">Цифра - Опоздание в часах: ${maxDelayInHours}</p>
            `;
        }

        // Показ/скрытие статистики
        function showStatistics() {
            if (statsElement) {
                statsElement.style.display = "inline-block";
            }
        }

        function hideStatistics() {
            if (statsElement) {
                statsElement.style.display = "none";
            }
        }

        // Запуск
        observeSmenaControl();
    }

    // ========== ЗАПУСК ВСЕХ ФУНКЦИЙ ==========
    // Запуск наблюдения за номером заказа
    const productIdObserver = observeProductId();
    
    // Запуск подсветки предпечати
    setTimeout(() => {
        prepHighlight();
    }, 1000);
    
    // Запуск подсветки цифровой печати
    setTimeout(() => {
        cifraHighligh();
    }, 2000);

})();
