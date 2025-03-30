// ==UserScript==
// @name         Google Sheets Integration for DesignBlockSummary
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Скрипт для интеграции с Google Sheets
// @author       YourName
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';



    const API_KEY = 'AIzaSyD-gPXmq0YOL3WXjQ8jub9g5_xyx2PfOZU';
    const SPREADSHEET_ID = '1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY';
    const DESIGN_SHEET_NAME = 'Design';
    const LIST_SHEET_NAME = 'List';


    // Функция для получения productID
    function gs_processProductId() {
        const productIdElement = document.querySelector("#ProductId");
        if (productIdElement) {
            return productIdElement.textContent.trim();
        }
        return null;
    }

    // Функция для получения имени пользователя
    function getUserName() {
        const userNameElement = document.querySelector("body > ul > div > li:nth-child(1) > a.topmenu-a");
        if (userNameElement) {
            return userNameElement.textContent.trim();
        }
        return null;
    }

    // Функция для получения названия продукта
    function getProductName() {
        const productNameElement = document.querySelector("#Top > form > div > div > div > input.ProductName.form-control");
        if (productNameElement) {
            return productNameElement.value.trim();
        }
        return null;
    }

    // Функция для проверки наличия productID в таблице
    async function checkProductInSheet(productId) {
        const range = `Design!A:A`;
        const values = await fetchGoogleSheetData(range);
        return values.some(row => row[0] === productId.toString());
    }

    // Функция для получения данных из Google Sheets
    async function fetchGoogleSheetData(range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.values || [];
    }

// Функция для записи данных в Google Sheets
async function writeDataToSheet(data) {
    const url = "https://script.google.com/macros/s/AKfycbyH_R0_8JIlAq3TW8Fq_hmN6dSJ2c-u7F9lnwTMm8jOzHNnXBw7DjX4uUMRRTNlzxDw/exec";
    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        console.log('Данные успешно отправлены.');
        return true;
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
        alert('Произошла ошибка при отправке данных. Проверьте консоль.');
        return false;
    }
}

    // Функция для получения данных по productID из таблицы
    async function getProductDataFromSheet(productId) {
        const range = `Design!A:E`; // Берем столбцы от A до E (productID, ..., Цена продажи, Дизайнер)
        const values = await fetchGoogleSheetData(range);
        return values.find(row => row[0] === productId.toString()) || null;
    }




function showPopup() {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = '#f9f9f9'; // Более светлый фон
    popup.style.border = '1px solid #ddd'; // Серая рамка
    popup.style.borderRadius = '8px'; // Скругленные углы
    popup.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; // Тень для эффекта глубины
    popup.style.zIndex = '1000';

    const priceLabel = document.createElement('label');
    priceLabel.innerText = 'Сумма дизайнеру:';
    priceLabel.style.display = 'block';
    priceLabel.style.marginBottom = '5px';
    priceLabel.style.fontWeight = 'bold';

    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.placeholder = 'Сколько платим дизайнеру?';
    priceInput.style.width = '100%';
    priceInput.style.padding = '10px';
    priceInput.style.marginTop = '10px';
    priceInput.style.marginBottom = '10px'; // Отступ под полем ввода
    priceInput.style.border = '1px solid #ccc';
    priceInput.style.borderRadius = '4px';
    priceInput.style.boxSizing = 'border-box';

    const dropdownLabel = document.createElement('label');
    dropdownLabel.innerText = 'Дизайнер:';
    dropdownLabel.style.display = 'block';
    dropdownLabel.style.marginBottom = '5px';
    dropdownLabel.style.fontWeight = 'bold';

    const dropdown = document.createElement('select');
    dropdown.style.width = '100%';
    dropdown.style.marginBottom = '10px';
    dropdown.style.padding = '10px';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxSizing = 'border-box';
    fetchGoogleSheetData(`${LIST_SHEET_NAME}!A:A`).then(categories => {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category[0];
            option.text = category[0];
            dropdown.add(option);
        });
    });

    const sendButton = document.createElement('button');
    sendButton.innerText = 'Отправить';
    sendButton.style.width = '100%';
    sendButton.style.padding = '10px';
    sendButton.style.backgroundColor = '#4CAF50'; // Зеленый цвет кнопки
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.fontSize = '16px';
    sendButton.style.transition = 'background-color 0.3s';
    sendButton.addEventListener('click', () => {
        sendButton.style.backgroundColor = '#45a049'; // Изменение цвета при нажатии

        const productId = gs_processProductId();
        const userName = getUserName();
        const productName = getProductName();
        const designerPrice = parseFloat(priceInput.value.replace(',', '.'));
        const category = dropdown.value;

        const axiomPriceElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1)');
        let axiomPriceText = '';
        if (axiomPriceElement) {
            axiomPriceText = axiomPriceElement.textContent.replace(/\s/g, '').match(/(\d+,\d+)/); // Удаляем пробелы
            axiomPriceText = axiomPriceText ? axiomPriceText[0].replace(',', '.') : null; // Заменяем запятую на точку
        }
        const axiomPrice = parseFloat(axiomPriceText);

        if (designerPrice*1.3 <= axiomPrice) {
            const data = [productId, userName, productName, designerPrice, category, axiomPrice]; // Добавляем axiomPrice в данные
            writeDataToSheet(data).then(() => {
                alert('Данные успешно отправлены!');
                popup.remove();
            });
        } else {
            // Проверяем, существует ли уже сообщение об ошибке
            const existingError = popup.querySelector('.error-message');
            if (!existingError) {
                const errorTable = document.createElement('table'); // Создаем таблицу для ошибки
                errorTable.style.width = '100%';
                errorTable.style.borderCollapse = 'collapse';
                errorTable.style.marginTop = '10px';
                errorTable.style.border = '1px solid red';
                errorTable.style.borderRadius = '4px';

                const errorRow = errorTable.insertRow();
                const errorCell = errorRow.insertCell();
                errorCell.colSpan = 2;
                errorCell.style.textAlign = 'center';
                errorCell.style.color = 'red';
                errorCell.style.fontWeight = 'bold';
                errorCell.style.padding = '10px';
                errorCell.className = 'error-message'; // Добавляем класс для идентификации
                errorCell.innerText = 'Сумма некорректна';

                popup.appendChild(errorTable);
            }
        }
    });

    const closeButton = document.createElement('button');
    closeButton.innerText = 'Закрыть';
    closeButton.style.width = '100%';
    closeButton.style.padding = '10px';
    closeButton.style.marginTop = '10px'; // Добавляем отступ сверху для кнопки "Закрыть"
    closeButton.style.backgroundColor = '#f44336'; // Красный цвет кнопки
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.transition = 'background-color 0.3s';
    closeButton.addEventListener('click', () => {
        closeButton.style.backgroundColor = '#d32f2f'; // Изменение цвета при нажатии
        popup.remove();
    });

    popup.appendChild(priceLabel);
    popup.appendChild(priceInput);
    popup.appendChild(dropdownLabel);
    popup.appendChild(dropdown);
    popup.appendChild(sendButton);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);
}

let buttonAdded = false;

function observeDOMChanges() {
    const observer = new MutationObserver(async (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Проверяем наличие нужных элементов
                const designerElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b');
                const textarea = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea');

                if (designerElement && designerElement.textContent.includes('Дизайнеры на удаленке')) {
                    const productId = gs_processProductId();
                    const existsInSheet = await checkProductInSheet(productId);

                    if (existsInSheet) {
                        if (!buttonAdded) {
                            createCheckButton(textarea);
                            buttonAdded = true;
                        }
                    } else {
                        if (!buttonAdded) {
                            createFillButton(textarea);
                            buttonAdded = true;
                        }
                    }
                }

                // Проверяем, существует ли элемент с productid
                const productIdElement = document.querySelector('[data-product-id]');
                if (!productIdElement) {
                    // Если элемент исчез, сбрасываем флаг
                    buttonAdded = false;
                }
            }
        }
    });

    // Наблюдаем за всеми изменениями в DOM
    observer.observe(document.body, { childList: true, subtree: true });
}

// Функция для создания кнопки "Проверить данные"
function createCheckButton(textarea) {
    const checkButton = document.createElement('button');
    checkButton.innerText = 'Проверить данные';
    checkButton.style.marginLeft = '10px';
    textarea.parentElement.appendChild(checkButton);

    let infoDivCreated = false;

    checkButton.addEventListener('click', async () => {
        const productId = gs_processProductId();
        const productData = await getProductDataFromSheet(productId);
        if (productData) {
            if (!infoDivCreated) {
                const infoDiv = document.createElement('div');
                infoDiv.style.color = 'green';
                infoDiv.style.marginTop = '10px';
                infoDiv.style.border = '1px solid green';
                infoDiv.style.padding = '10px';
                infoDiv.style.borderRadius = '5px';

                const table = document.createElement('table');
                table.style.width = '50%';
                table.style.borderCollapse = 'collapse';

                const priceRow = table.insertRow();
                const priceLabelCell = priceRow.insertCell();
                priceLabelCell.style.fontWeight = 'bold';
                priceLabelCell.innerText = 'Оплата дизайнеру:';
                const priceValueCell = priceRow.insertCell();
                priceValueCell.innerText = `${productData[3]} руб.`;

                const designerRow = table.insertRow();
                const designerLabelCell = designerRow.insertCell();
                designerLabelCell.style.fontWeight = 'bold';
                designerLabelCell.innerText = 'Дизайнер:';
                const designerValueCell = designerRow.insertCell();
                designerValueCell.innerText = productData[4];

                infoDiv.appendChild(table);
                checkButton.parentElement.appendChild(infoDiv);
                infoDivCreated = true;
            }
        } else {
            const errorSpan = document.createElement('span');
            errorSpan.innerText = 'Информация о продукте не найдена.';
            errorSpan.style.color = 'red';
            checkButton.parentElement.appendChild(errorSpan);
        }
    });
}

// Функция для создания кнопки "Заполнить"
function createFillButton(textarea) {
    const fillButton = document.createElement('button');
    fillButton.innerText = 'Заполнить';
    fillButton.style.marginLeft = '10px';
    textarea.parentElement.appendChild(fillButton);

    fillButton.addEventListener('click', () => {
        showPopup();
    });
}

observeDOMChanges();
})();