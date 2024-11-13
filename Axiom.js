// ==UserScript==
// @name         Custom Check Script1
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Проверка в форме заказа. Умеет много чего. Проверяет количество изделий в пробнике (пока только в графе тираж, не общей), вылеты на сквозную резку, раскладку колод карт, лицо мги1+лицо мги1, одиночный оборот мги, надсечку и мги, кбс и двухсторонюю ламинацию, операции где есть ZK (считающиеся от заказа в явном виде).
// @author       Ваше имя
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Создание кнопки
    const button = document.createElement('button');
    button.innerHTML = 'Проверить1';
    button.style.width = '100px';
    button.style.height = '35px';
    button.style.borderRadius = '10%';
    button.style.backgroundColor = 'grey';
    button.style.color = 'white';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '9999';
    button.style.display = 'none'; // Скрываем кнопку по умолчанию

    // Поиск элемента, перед которым нужно вставить кнопку
    const helpLink = document.querySelector('a.topmenu-a[onclick="MenuButton(\'Help\');"]');

    if (helpLink) {
        helpLink.parentNode.insertBefore(button, helpLink); // Вставка кнопки перед ссылкой "Помощь"
    } else {
        console.warn('Элемент помощи не найден!'); // Опционально, если элемент не найден
    }

    button.addEventListener('click', function() {
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
            let foundLicoMgi = false;
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
                    foundLicoMgi = true;
                }
                if (name.includes('ЛИЦО МГИ1')) {
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

            // Проверка условия для карточек
            const cifraLayoutType = document.getElementById('CifraLayoutType');
            if (foundOlod && cifraLayoutType && cifraLayoutType.value !== '2') {
                messages.push('Карты нужно раскладывать каждый вид на отдельный лист');
            }

            // Проверка на софт-тач ламинацию
            if (foundLicoMgi1 && !foundOlod) {
                messages.push('Вы забыли софттач ламинацию для МГИ!');
            }

            // Проверка на ЛИЦО МГИ1.
            if (foundLicoMgi && foundLicoMgi2) {
                messages.push('Нужно указать "ЛИЦО МГИ1 и ЛИЦО МГИ2!"');
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
                messages.push('В заказе посчитана операция, количество которой указывается в явном виде (операция будет сделана на одно изделие). Вы уверены в правильности?');
            }

            // Проверка на ЛИЦО МГИ1 и бумагу с надсечками
            if (foundLicoMgi1) {
                const paperType = document.querySelector('#PaperType_chosen .chosen-single span');
                if (paperType && paperType.innerText.includes("с надсечками")) {
                    messages.push('На MGI используется бумага БЕЗ надсечек!');
                }
            }
        }

        // Если нет сообщений
        if (messages.length === 0) {
            messages.push('Всё в порядке!');
        }

        // Отображение сообщений
        showMessages(messages);
    });

    function showMessages(messages) {
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
        messageContainer.style.borderRadius = '15px'; // Скругленные углы

        let messageHTML = '<b>' + messages.join('</b><br><b>') + '</b><br><br>';
        messageHTML += '<button id="closeMessage" style="margin: 0 auto; display: block;">Ок</button>';

        messageContainer.innerHTML = messageHTML;
        document.body.appendChild(messageContainer);

        document.getElementById('closeMessage').addEventListener('click', function() {
            // Удаляем сообщение и эффект размытия
            document.body.removeChild(messageContainer);
            document.body.removeChild(blurOverlay);
        });
    }

    // Функция для проверки текста
    function checkForText() {
        const searchText = 'Лак для офсета';
        const pageContent = document.body.innerText;

        if (pageContent.includes(searchText)) {
            button.style.display = 'block'; // Показываем кнопку
        } else {
            button.style.display = 'none'; // Скрываем кнопку
        }
    }

    // Проверка наличия текста каждую секунду
    setInterval(checkForText, 1000);
})();
