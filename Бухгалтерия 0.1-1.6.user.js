// ==UserScript==
// @name         Бухгалтерия 0.1
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Скрипт для проверки дат и модификации страницы в бухгалтерской системе
// @author       Рустам Кандеев
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Функция для конвертации даты из формата "Пятница, 28 марта 2025" в объект Date
    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }

        const dateParts = dateString.split(', ');
        if (dateParts.length !== 2) {
            return null;
        }

        const dayMonthYear = dateParts[1].split(' ');
        if (dayMonthYear.length !== 3) {
            return null;
        }

        const day = parseInt(dayMonthYear[0], 10);
        const monthName = dayMonthYear[1];
        const year = parseInt(dayMonthYear[2], 10);

        const monthMap = {
            'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
            'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
            'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
        };

        const month = monthMap[monthName.toLowerCase()];
        if (month === undefined) {
            return null;
        }

        return new Date(year, month, day);
    }

    // Функция для получения даты закрытия квартала
    function getQuarterCloseDate(currentDate) {
        const year = currentDate.getFullYear();
        const quarter = Math.ceil((currentDate.getMonth() + 1) / 3); // Определяем текущий квартал

        let closeMonth, closeDay;
        if (quarter === 1) {
            closeMonth = 3; // Апрель
            closeDay = 10;
        } else if (quarter === 2) {
            closeMonth = 6; // Июль
            closeDay = 10;
        } else if (quarter === 3) {
            closeMonth = 9; // Октябрь
            closeDay = 10;
        } else if (quarter === 4) {
            closeMonth = 0; // Январь следующего года
            closeDay = 25;
        }

        if (quarter === 4) {
            return new Date(year + 1, closeMonth, closeDay);
        }
        return new Date(year, closeMonth, closeDay);
    }

    // Функция для изменения страницы
    function modifyPage() {
        // Заменяем содержимое блока #Doc > div.bigform > div:nth-child(1)
        const targetBlock = document.querySelector('#Doc > div.bigform > div:nth-child(1)');
        if (targetBlock) {
            targetBlock.innerHTML = `
                <div id="closedNotice" style="
                    color: red;
                    font-size: 16px;
                    font-weight: bold;
                    text-transform: uppercase;
                    position: relative;
                    cursor: pointer;
                ">
                    ДАТЫ ЗАКРЫТЫ
                    <div id="tooltip" style="
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: black;
                        color: white;
                        padding: 10px;
                        border-radius: 8px;
                        text-align: center;
                        z-index: 10000;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
                        font-size: 12px;
                        width: 310px;
                    ">
                        Период в котором был сформирован документ - закрыт,
                        для внесения правок обратитесь к главному бухгалтеру!
                    </div>
                </div>
            `;

            // Добавляем обработчик событий для показа/скрытия tooltip
            const noticeElement = document.getElementById('closedNotice');
            const tooltipElement = document.getElementById('tooltip');

            noticeElement.addEventListener('mouseenter', () => {
                tooltipElement.style.display = 'block';
            });

            noticeElement.addEventListener('mouseleave', () => {
                tooltipElement.style.display = 'none';
            });
        }

        // Делаем таблицу неактивной
        const tableElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table');
        if (tableElement) {
            tableElement.style.pointerEvents = 'none';
            tableElement.style.opacity = '0.7'; // Добавляем эффект "неактивности"
        }

        // Делаем блок неактивным
        const divElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > div > div');
        if (divElement) {
            divElement.style.pointerEvents = 'none';
            divElement.style.opacity = '0.7';
        }

        // Скрываем кнопки
        const buttonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > button');
        if (buttonElement) buttonElement.style.display = 'none';

        const divButtonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > div:nth-child(3)');
        if (divButtonElement) divButtonElement.style.display = 'none';
    }

    // Функция для проверки условий
    function checkConditions() {
        const summaElement = document.querySelector('#Summa');
        const tabElement = document.querySelector('#FormTabs > li:nth-child(2) > a');

        // Если оба элемента найдены
        if (summaElement && tabElement) {
            const dateElement = document.querySelector('#Date');
            if (!dateElement) {
                setTimeout(checkConditions, 1000);
                return;
            }

            const dateString = dateElement.value.trim();
            const parsedDate = parseDate(dateString);

            if (!parsedDate) {
                setTimeout(checkConditions, 1000);
                return;
            }

            const currentDate = new Date();
            const quarterCloseDate = getQuarterCloseDate(parsedDate);

            // Проверяем, прошла ли дата порог закрытия квартала
            if (currentDate <= quarterCloseDate) {
                setTimeout(checkConditions, 1000);
                return;
            }

            modifyPage();
        } else {
            setTimeout(checkConditions, 1000);
        }
    }

    // Наблюдатель за изменениями DOM
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Проверяем, есть ли элементы #Date и #Summa
                    const dateElement = document.querySelector('#Date');
                    const summaElement = document.querySelector('#Summa');

                    if (!dateElement || !summaElement) {
                        checkConditions();
                    }
                }
            });
        });

        // Начинаем наблюдение за всем DOM
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Запускаем проверку условий и наблюдение за DOM
    checkConditions();
    observeDOM();
})();