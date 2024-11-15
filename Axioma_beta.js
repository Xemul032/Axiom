// ==UserScript==
// @name         Проверка заказа
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  
// @author       Ваше имя
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

  // Переменная для хранения начального значения даты
    let initialDateReadyValue = null;
    let checkButtonClicked = false; // Переменная для отслеживания нажатия кнопки "Проверить"


    // Функция для проверки текста "Номенклатура" и получения значения "DateReady"
    function checkForTextAndDate() {
        const searchText = "Номенклатура";
        const bodyText = document.body.innerText;

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
                    initialDateReadyValue = null; // Сбрасываем начальное значение, если поле пустое
                }
            }
        }
    }

    // Создание кнопки для проверки заказа
    const orderCheckButton = document.createElement('button');
    orderCheckButton.innerHTML = 'Проверить';
    orderCheckButton.style.width = '130px';
    orderCheckButton.style.height = '45px';
    orderCheckButton.style.borderRadius = '5px';
    orderCheckButton.style.backgroundImage = 'linear-gradient(to bottom, #5BB75B, #429742)';
    orderCheckButton.style.color = 'white';
    orderCheckButton.style.fontSize = '18px';
    orderCheckButton.style.cursor = 'pointer';
    orderCheckButton.style.position = 'fixed'; // Фиксированное позиционирование
    orderCheckButton.style.bottom = '25px'; // Отступ от нижнего края
    orderCheckButton.style.left = '25px'; // Отступ от левого края
    orderCheckButton.style.zIndex = '9998';

    // Убираем обводку
    orderCheckButton.style.border = 'none'; // Нет обводки
    orderCheckButton.style.outline = 'none'; // Нет фокусной обводки

    document.body.appendChild(orderCheckButton); // Добавляем кнопку на страницу

    // Настройка стилей фокуса (для лучшего UX)
    orderCheckButton.addEventListener('focus', () => {
        orderCheckButton.style.outline = 'none'; // Убираем обводку при фокусе
    });

    orderCheckButton.addEventListener('mousedown', () => {
        orderCheckButton.style.border = '2px solid black'; // Устанавливаем черную рамку при нажатии
    });

    orderCheckButton.addEventListener('mouseup', () => {
        orderCheckButton.style.border = 'none'; // Убираем рамку при отпускании
    });

    orderCheckButton.addEventListener('blur', () => {
        orderCheckButton.style.border = 'none'; // Убираем рамку при уходе из фокуса
    });

    // Обработчик клика для кнопки проверки заказа
    orderCheckButton.addEventListener('click', function() {
        checkButtonClicked = true; // Устанавливаем флаг нажатия кнопки



        let messages = [];

        // Проверка значения в input id="ProdName" и "Tirazh"
        const prodName = document.getElementById('ProdName') ? document.getElementById('ProdName').value : '';
        const tirazh = document.getElementById('Tirazh') ? parseInt(document.getElementById('Tirazh').value) : 0;

        if ((/робн/.test(prodName) || /браз/.test(prodName)) && tirazh === 1) {
            messages.push('Пробники оформляем в количестве двух штук!');
        }

        // Проверяем элементы в заказах Order0 до Order7
        for (let i = 0; i < 8; i++) {
            const orderList = document.getElementById(`Order${i}`);
            if (orderList) {
                const rows = orderList.getElementsByTagName('tr');
                let foundSkvoznaya = false;
                let foundOlod = false;
                let foundLicoMgi = false;
                let foundLicoMgi1 = false;
                let foundLicoMgi2 = false;
                let foundOborotMgi1 = false;
                let found1Plus1 = false;
                let foundPerf = false;
                let foundZk = false;

                for (let row of rows) {
                    const cells = row.getElementsByTagName('td');
                    const name = cells[0] ? cells[0].innerText : '';

                    foundSkvoznaya = foundSkvoznaya || name.includes('СКВОЗНАЯ');
                    foundOlod = foundOlod || name.includes('олод');
                    foundLicoMgi = foundLicoMgi || name.includes('ЛИЦО МГИ1');
                    foundLicoMgi1 = foundLicoMgi1 || name.includes('ЦО МГИ1 Ла');
                    foundLicoMgi2 = foundLicoMgi2 || name.includes('ЦО МГИ1 Фо');
                    foundOborotMgi1 = foundOborotMgi1 || name.includes('ОБОРОТ МГИ1');
                    found1Plus1 = found1Plus1 || name.includes('(1+1)');
                    foundPerf = foundPerf || name.includes('ерфорация');
                    foundZk = foundZk || name.includes('zk');
                }

                // Проверка условий
                const trimSize = document.getElementById('TrimSize') ? parseInt(document.getElementById('TrimSize').value) : null;
                if (trimSize === 0) {
                    messages.push(`Вы уверены, что вылет в ${getOrderName(i)} ноль?`);
                }
                if (foundSkvoznaya) {
                    if (trimSize !== 3) {
                        messages.push(`На сквозную резку в ${getOrderName(i)} вылет ставим 3мм!`);
                    }
                }

                // Проверка условий для карточек и ламинации
                const cifraLayoutType = document.getElementById('CifraLayoutType');
                if (foundOlod && cifraLayoutType && cifraLayoutType.value !== '2') {
                    messages.push(`Карты нужно раскладывать каждый вид на отдельный лист в ${getOrderName(i)}`);
                }
                if (foundLicoMgi1 && !foundOlod) {
                    messages.push(`Вы забыли софттач ламинацию для МГИ в ${getOrderName(i)}!`);
                }
                // Проверка на ЛИЦО МГИ1.
                if (foundLicoMgi && foundLicoMgi2) {
                    messages.push(`Нужно указать "ЛИЦО МГИ1 и ЛИЦО МГИ2 в ${getOrderName(i)}!`);
                }
                if (foundOborotMgi1 && !foundLicoMgi1) {
                    messages.push(`ОБОРОТ МГИ выбран неверно в ${getOrderName(i)}! Вместо него поставьте "ЛИЦО МГИ"!`);
                }
                if (found1Plus1) {
                    const termopereplet = document.body.innerText.includes('Термопереплет (кбс), толщина блока от 3 мм');
                    if (termopereplet) {
                        messages.push(`Двухстороняя ламинация недоступна при термопереплете в ${getOrderName(i)}! Выберите одностороннюю!`);
                    }
                }
                if (foundZk) {
                    messages.push(`В заказе в ${getOrderName(i)} посчитана операция, количество которой указывается в явном виде. Вы уверены в правильности?`);
                }

                // Проверка на использование бумаги с надсечками
                if (foundLicoMgi1) {
                    const paperType = document.querySelector('#PaperType_chosen .chosen-single span');
                    if (paperType && paperType.innerText.includes("с надсечками")) {
                        messages.push(`На MGI используется бумага БЕЗ надсечек в ${getOrderName(i)}!`);
                    }
                }
                if (foundPerf) {
                    const pruzhina = document.body.innerText.includes('Металлическая пружина ');
                    if (pruzhina) {
                        messages.push(`Убедитесь в правильности расчёта длины прижины!`);
                    }
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
        messageContainer.style.borderRadius = '10px';

        let messageHTML = '<b>' + message + '</b><br><br>';
        messageHTML += '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

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
        blurOverlay.style.backgroundColor = 'rgba(2, 2, 2, 0.5)';
        blurOverlay.style.backdropFilter = 'blur(5px)';
        blurOverlay.style.zIndex = '9998';
        document.body.appendChild(blurOverlay);

        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50%';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translate(-50%, -50%)';
        messageContainer.style.backgroundColor = 'white';
        messageContainer.style.padding = '15px 40px';
        messageContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        messageContainer.style.zIndex = '10000';
        messageContainer.style.borderRadius = '10px';

        let messageHTML = '<b>' + messages.join('</b><br><b>') + '</b><br><br>';
        messageHTML += '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

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

    // Функция для получения названия заказа по индексу
    function getOrderName(index) {
        return `Ордер №${index + 1}`;
    }

    // Запускаем проверку при загрузке страницы
    window.addEventListener('load', checkForTextAndDate);
    setInterval(checkForText, 1000); // Проверка наличия текста каждую секунду
    setInterval(checkForTextAndDate, 2000); // Проверка даты каждые 2 секунды

    // Сбрасываем значение даты каждые 5 секунд
    setInterval(() => {
        initialDateReadyValue = null;
    }, 10000);
})();
