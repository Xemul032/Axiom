// ==UserScript==
// @name         Проверка Номенклатуры и Даты с Расширенной Проверкой Заказа
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Проверка текста "Номенклатура", вывод значения из "DateReady", уведомления об изменении даты и комплексная проверка заказа.
// @author       Ваше имя
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Переменная для хранения начального значения даты
    let initialDateReadyValue = null;

    // Функция для проверки текста "Номенклатура" и получения значения "DateReady"
    function checkForTextAndDate() {
        const searchText = "Номенклатура";
        const bodyText = document.body.innerText;

        // Проверяем наличие текста "Номенклатура"
        if (bodyText.includes(searchText)) {
            const dateReadyInput = document.querySelector('input#DateReady.center.datepicker.DateReady.hasDatepicker');

            if (dateReadyInput) {
                const dateReadyValue = dateReadyInput.value;

                // Устанавливаем начальное значение только если есть валидные данные
                if (dateReadyValue) {
                    if (initialDateReadyValue === null) {
                        initialDateReadyValue = dateReadyValue;  // Сохраняем текущее значение
                    } else if (initialDateReadyValue !== dateReadyValue) {
                        showCenterMessage('Дата сдачи заказа изменилась!'); // Показываем сообщение в центре экрана
                        initialDateReadyValue = dateReadyValue; // Обновляем значение
                    }
                } else {
                    // Если строка пуста, сообщение о смене даты не показывается
                    initialDateReadyValue = null;
                }
            }
        }
    }

    // Создание кнопки для проверки заказа
    const orderCheckButton = document.createElement('button');
    orderCheckButton.innerHTML = 'Проверить';
    orderCheckButton.style.width = '100px';
    orderCheckButton.style.height = '25px';
    orderCheckButton.style.borderRadius = '10%';
    orderCheckButton.style.backgroundColor = 'green';
    orderCheckButton.style.color = 'white';
    orderCheckButton.style.fontSize = '16px';
    orderCheckButton.style.cursor = 'pointer';
    orderCheckButton.style.zIndex = '9999';
    orderCheckButton.style.display = 'none'; // Скрываем кнопку по умолчанию

    // Поиск элемента, перед которым нужно вставить кнопку
    const helpLink = document.querySelector('a.topmenu-a[onclick="MenuButton(\'Help\');"]');
    if (helpLink) {
        helpLink.parentNode.insertBefore(orderCheckButton, helpLink); // Вставка кнопки перед ссылкой "Помощь"
    } else {
        console.warn('Элемент помощи не найден!');
    }

    // Обработчик клика для кнопки проверки заказа
    orderCheckButton.addEventListener('click', function() {
        let messages = [];

        // Проверка input id="ProdName" по маске
        const prodName = document.getElementById('ProdName') ? document.getElementById('ProdName').value : '';
        const tirazh = document.getElementById('Tirazh') ? parseInt(document.getElementById('Tirazh').value) : 0;

        if ((/робн/.test(prodName) || /браз/.test(prodName)) && tirazh === 1) {
            messages.push('Пробники оформляем в количестве двух штук!');
        }

        // Проверка tbody id="PostpressList"
        const postpressList = document.getElementById('PostpressList');
        if (postpressList) {
            const rows = postpressList.getElementsByTagName('tr');
            let foundSkvoznaya = false;
            let foundOlod = false;
            let foundLicoMgi1 = false;
            let foundLicoMgi2 = false;
            let foundOborotMgi1 = false;
            let found1Plus1 = false;
            let foundZk = false;

            for (let row of rows) {
                const cells = row.getElementsByTagName('td');
                const name = cells[0] ? cells[0].innerText : '';

                if (name.includes('СКВОЗНАЯ')) {
                    foundSkvoznaya = true;
                }
                if (name.includes('олод')) {
                    foundOlod = true;
                }
                if (name.includes('ЦО МГИ1 Ла')) {
                    foundLicoMgi1 = true;
                }
                if (name.includes('ЦО МГИ1 Фо')) {
                    foundLicoMgi2 = true;
                }
                if (name.includes('ОБОРОТ МГИ1')) {
                    foundOborotMgi1 = true;
                }
                if (name.includes('(1+1)')) {
                    found1Plus1 = true;
                }
                if (name.includes('zk')) {
                    foundZk = true;
                }
            }

            // Проверка условия сквозной резки
            const trimSize = document.getElementById('TrimSize') ? parseInt(document.getElementById('TrimSize').value) : null;
            if (foundSkvoznaya) {
                if (trimSize !== 3) {
                    messages.push('На сквозную резку вылет ставим 3мм!');
                }
                if (trimSize === 0) {
                    messages.push('Вы уверены, что вылет ноль?');
                }
            }

            // Проверка условий для карточек
            const cifraLayoutType = document.getElementById('CifraLayoutType');
            if (foundOlod && cifraLayoutType && cifraLayoutType.value !== '2') {
                messages.push('Карты нужно раскладывать каждый вид на отдельный лист');
            }

            // Проверка на софт-тач ламинацию
            if (foundLicoMgi1 && !foundOlod) {
                messages.push('Вы забыли софттач ламинацию для МГИ!');
            }

            // Проверка для ОБОРОТ МГИ1
            if (foundOborotMgi1 && !foundLicoMgi1) {
                messages.push('ОБОРОТ МГИ выбран неверно! Вместо него поставьте "ЛИЦО МГИ"!');
            }

            // Проверка для (1+1)
            if (found1Plus1) {
                const termopereplet = document.body.innerText.includes('Термопереплет (кбс), толщина блока от 3 мм');
                if (termopereplet) {
                    messages.push('Двухстороняя ламинация недоступна при термопереплете! Выберите одностороннюю!');
                }
            }

            // Проверка на zk
            if (foundZk) {
                messages.push('В заказе посчитана операция, количество которой указывается в явном виде. Вы уверены в правильности?');
            }

            // Дополнительная проверка на использование бумаги с надсечками
            if (foundLicoMgi1) {
                const paperType = document.querySelector('#PaperType_chosen .chosen-single span');
                if (paperType && paperType.innerText.includes("с надсечками")) {
                    messages.push('На MGI используется бумага БЕЗ надсечек!');
                }
            }
        }

        // Вывод сообщений
        if (messages.length === 0) {
            messages.push('Всё в порядке!');
        }

        showMessages(messages);
    });

    // Функция для отображения сообщения о смене даты
    function showCenterMessage(message) {
        // Создание эффекта размытия
        const blurOverlay = document.createElement('div');
        blurOverlay.style.position = 'fixed';
        blurOverlay.style.top = '0';
        blurOverlay.style.left = '0';
        blurOverlay.style.width = '100%';
        blurOverlay.style.height = '100%';
        blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Полупрозрачный фон
        blurOverlay.style.backdropFilter = 'blur(5px)'; // Размытие фона
        blurOverlay.style.zIndex = '9998';

        document.body.appendChild(blurOverlay);

        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50%';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translate(-50%, -50%)';
        messageContainer.style.backgroundColor = 'white';
        messageContainer.style.padding = '15px';
        messageContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        messageContainer.style.zIndex = '10000';
        messageContainer.style.borderRadius = '15px';

        let messageHTML = '<b>' + message + '</b><br><br>';
        messageHTML += '<button id="closeMessage" style="margin: 0 auto; display: block;">Ок</button>';

        messageContainer.innerHTML = messageHTML;
        document.body.appendChild(messageContainer);

        document.getElementById('closeMessage').addEventListener('click', function() {
            document.body.removeChild(messageContainer);
            document.body.removeChild(blurOverlay);
        });
    }

    // Функция для отображения сообщений
    function showMessages(messages) {
        const blurOverlay = document.createElement('div');
        blurOverlay.style.position = 'fixed';
        blurOverlay.style.top = '0';
        blurOverlay.style.left = '0';
        blurOverlay.style.width = '100%';
        blurOverlay.style.height = '100%';
        blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        blurOverlay.style.backdropFilter = 'blur(5px)';
        blurOverlay.style.zIndex = '9998';

        document.body.appendChild(blurOverlay);

        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50%';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translate(-50%, -50%)';
        messageContainer.style.backgroundColor = 'white';
        messageContainer.style.padding = '15px';
        messageContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        messageContainer.style.zIndex = '10000';
        messageContainer.style.borderRadius = '15px';

        let messageHTML = '<b>' + messages.join('</b><br><b>') + '</b><br><br>';
        messageHTML += '<button id="closeMessage" style="margin: 0 auto; display: block;">Ок</button>';

        messageContainer.innerHTML = messageHTML;
        document.body.appendChild(messageContainer);

        document.getElementById('closeMessage').addEventListener('click', function() {
            document.body.removeChild(messageContainer);
            document.body.removeChild(blurOverlay);
        });
    }

    // Функция для проверки наличия текста на странице каждые 1 секунду
    function checkForText() {
        const searchText = 'Лак для офсета';
        const pageContent = document.body.innerText;

        if (pageContent.includes(searchText)) {
            orderCheckButton.style.display = 'block'; // Показываем кнопку
        } else {
            orderCheckButton.style.display = 'none'; // Скрываем кнопку
        }
    }

    // Запускаем проверку при загрузке страницы
    window.addEventListener('load', checkForTextAndDate);
    setInterval(checkForText, 1000); // Проверка наличия текста каждую секунду
    setInterval(checkForTextAndDate, 2000); // Проверка даты каждые 2 секунды

    // Сбрасываем значение даты каждые 5 секунд
    setInterval(() => {
        initialDateReadyValue = null;
    }, 5000);
})();
