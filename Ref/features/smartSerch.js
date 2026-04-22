
(function(config, GM, utils) {
    'use strict';

    if (!config || !config.enabled) return;

    // Допуски по типу изделия
    const TOLERANCES = {
        BOX: { MINUS: 10, PLUS: 20 },
        PACKAGE: { MINUS: 10, PLUS: 40 },
        KONVERT: { MINUS: 10, PLUS: 15 },
        PAPKA: { MINUS: 10, PLUS: 40 }
    };

    // ID Google Sheets и листы
    const SHEET_ID = "1Of-dn4FcXTga_a3-9dJfBd5IrQ2pES6GAhpbVHYrAhI";
    const SHEETS = {
        BOX: {
            name: "Korobka",
            title: "коробки",
            icon: "📦",
            image: "https://raw.githubusercontent.com/Xemul032/Axiom_calcs/refs/heads/main/lmages/Smart_search/boxes.png",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Korobka`
        },
        PACKAGE: {
            name: "Paket",
            title: "пакеты",
            icon: "🛍️",
            image: "https://raw.githubusercontent.com/Xemul032/Axiom_calcs/refs/heads/main/lmages/Smart_search/bags.png",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Paket`
        },
        KONVERT: {
            name: "Konvert",
            title: "конверты",
            icon: "✉️",
            image: "https://raw.githubusercontent.com/Xemul032/Axiom_calcs/refs/heads/main/lmages/Smart_search/letters.png",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Konvert`
        },
        PAPKA: {
            name: "Papka",
            title: "папки",
            icon: "📁",
            image: "https://raw.githubusercontent.com/Xemul032/Axiom_calcs/refs/heads/main/lmages/Smart_search/folders.png",
            url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Papka`
        }
    };

    // Стили модального окна
    function addStyles() {
        const style = document.createElement("style");
        style.innerHTML = `
            .box-picker-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .box-picker-content {
                background: #fafafa;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                padding: 0;
                width: 500px;
                max-width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                scroll-behavior: smooth;
            }
            .box-picker-content::-webkit-scrollbar {
                width: 8px;
            }
            .box-picker-content::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
                margin: 12px 0;
            }
            .box-picker-content::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
                border-radius: 10px;
                transition: all 0.3s ease;
            }
            .box-picker-content::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #007bb8 0%, #004373 100%);
                box-shadow: 0 2px 8px rgba(0, 145, 211, 0.3);
            }
            .box-picker-content::-webkit-scrollbar-thumb:active {
                background: linear-gradient(135deg, #00659d 0%, #003a5e 100%);
            }
            .box-picker-content {
                scrollbar-width: thin;
                scrollbar-color: #0091D3 #f1f1f1;
            }
            .box-picker-header {
                background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
                color: white;
                padding: 20px 30px;
                border-radius: 12px 12px 0 0;
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                text-align: center;
            }
            .product-selector {
                padding: 30px;
                text-align: center;
            }
            .selector-title {
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin-bottom: 30px;
            }
            .product-options {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }
            .product-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 30px 20px;
                border: 3px solid #e0e0e0;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #fafafa;
                text-decoration: none;
                color: #333;
            }
            .product-option:hover {
                border-color: #0091D3;
                background: #f0f8ff;
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0, 145, 211, 0.15);
            }
            .product-option-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            .product-option-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }
            .product-option-description {
                font-size: 14px;
                color: #666;
                text-align: center;
                line-height: 1.4;
            }
            .box-picker-form {
                padding: 30px;
            }
            .form-section {
                margin-bottom: 30px;
            }
            .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #e0e0e0;
            }
            .back-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                color: #666;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 20px;
            }
            .back-btn:hover {
                background: #ebebeb;
                border-color: #ccc;
            }
            .product-image-container {
                margin-bottom: 25px;
                padding: 0;
                border-radius: 8px;
                overflow: hidden;
                text-align: center;
            }
            .product-image {
                max-width: 100%;
                height: auto;
                max-height: 200px;
                object-fit: contain;
            }
            .form-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 15px;
            }
            .form-group {
                display: flex;
                flex-direction: column;
            }
            .form-label {
                font-size: 14px;
                font-weight: 600;
                color: #555;
                margin-bottom: 8px;
            }
            .form-input {
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 16px;
                transition: all 0.3s ease;
            }
            .form-input:focus {
                outline: none;
                border-color: #0091D3;
                box-shadow: 0 0 0 3px rgba(0, 145, 211, 0.1);
            }
            .submit-btn {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-top: 10px;
            }
            .submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 145, 211, 0.3);
            }
            .submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .result-section {
                padding: 30px;
                border-top: 1px solid #e0e0e0;
            }
            .result-item {
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #fafafa;
            }
            .result-item:hover {
                border-color: #0091D3;
                background: #f0f8ff;
                transform: translateX(5px);
            }
            .result-number {
                font-size: 20px;
                font-weight: 700;
                color: #0091D3;
                margin-bottom: 5px;
            }
            .result-sizes {
                font-size: 14px;
                color: #666;
                line-height: 1.6;
            }
            .loading {
                text-align: center;
                padding: 40px 20px;
                color: #666;
                font-size: 16px;
            }
            .no-results {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            .close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 28px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }
            .success-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                z-index: 100000;
                box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
                animation: slideInRight 0.5s ease-out;
                font-weight: 600;
                font-size: 14px;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .depth-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
                padding: 12px;
                background: #f5f5f5;
                border-radius: 8px;
            }
            .depth-toggle input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            .depth-toggle label {
                font-size: 14px;
                font-weight: 600;
                color: #555;
                cursor: pointer;
                user-select: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Создание модального окна
    function createModal() {
        const modal = document.createElement("div");
        modal.className = "box-picker-modal";
        modal.innerHTML = `
            <div class="box-picker-content">
                <button class="close-btn">&times;</button>
                <div class="box-picker-header">🔍 Умный подбор изделий</div>
                <div class="product-selector">
                    <div class="selector-title">Выберите тип изделия:</div>
                    <div class="product-options">
                        <div class="product-option" data-type="BOX">
                            <div class="product-option-icon">📦</div>
                            <div class="product-option-title">Коробки</div>
                            <div class="product-option-description">Гофрокоробки всех типов</div>
                        </div>
                        <div class="product-option" data-type="PACKAGE">
                            <div class="product-option-icon">🛍️</div>
                            <div class="product-option-title">Пакеты</div>
                            <div class="product-option-description">Пакеты с вырубными ручками</div>
                        </div>
                        <div class="product-option" data-type="KONVERT">
                            <div class="product-option-icon">✉️</div>
                            <div class="product-option-title">Конверты</div>
                            <div class="product-option-description">Почтовые конверты</div>
                        </div>
                        <div class="product-option" data-type="PAPKA">
                            <div class="product-option-icon">📁</div>
                            <div class="product-option-title">Папки</div>
                            <div class="product-option-description">Папки-регистраторы</div>
                        </div>
                    </div>
                </div>
                <div class="box-picker-form" style="display: none;">
                    <button class="back-btn">← Назад к выбору</button>
                    <div class="product-image-container">
                        <img class="product-image" src="" alt="Схема изделия">
                    </div>
                    <div class="form-section">
                        <div class="section-title">Введите размеры (мм):</div>
                        <div class="depth-toggle">
                            <input type="checkbox" id="use-depth">
                            <label for="use-depth">Учитывать глубину/ширину дна</label>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Длина</label>
                                <input type="number" id="length" class="form-input" placeholder="0" min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Ширина</label>
                                <input type="number" id="width" class="form-input" placeholder="0" min="1">
                            </div>
                            <div class="form-group" id="depth-group" style="display: none;">
                                <label class="form-label">Глубина</label>
                                <input type="number" id="depth" class="form-input" placeholder="0" min="1">
                            </div>
                        </div>
                        <button class="submit-btn" id="submit-btn">Найти подходящие изделия</button>
                    </div>
                </div>
                <div class="result-section" style="display: none;">
                    <div class="section-title">Результаты поиска:</div>
                    <div id="result"></div>
                </div>
            </div>
        `;
        return modal;
    }

    // Показ уведомления об успехе
    function showSuccessNotification(message) {
        const existing = document.querySelector('.success-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = `✅ ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    // Загрузка данных из Google Sheets
    function loadSheetData(url) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    try {
                        const text = response.responseText;
                        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
                        const data = JSON.parse(jsonText);
                        const rows = data.table.rows.map(row => {
                            const cells = row.c || [];
                            return cells.map(cell => cell ? (cell.v !== null ? cell.v : '') : '');
                        });
                        resolve(rows);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    // Проверка соответствия размеров с допусками
    function checkDimensions(itemLength, itemWidth, itemDepth, targetLength, targetWidth, targetDepth, tolerances, usesDepth) {
        const lengthDiff = Math.abs(itemLength - targetLength);
        const widthDiff = Math.abs(itemWidth - targetWidth);

        if (usesDepth && targetDepth > 0) {
            const depthDiff = Math.abs(itemDepth - targetDepth);
            return depthDiff <= tolerances.PLUS;
        } else {
            return lengthDiff <= tolerances.PLUS && widthDiff <= tolerances.PLUS;
        }
    }

    // Инициализация
    function init() {
        addStyles();

        const modal = createModal();
        let currentType = null;
        let sheetData = null;

        // Обработчики событий
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Выбор типа изделия
        modal.querySelectorAll('.product-option').forEach(option => {
            option.addEventListener('click', async () => {
                currentType = option.dataset.type;
                const sheet = SHEETS[currentType];

                // Переключение видимости
                modal.querySelector('.product-selector').style.display = 'none';
                modal.querySelector('.box-picker-form').style.display = 'block';
                modal.querySelector('.result-section').style.display = 'none';

                // Установка изображения
                modal.querySelector('.product-image').src = sheet.image;

                // Сброс формы
                modal.querySelector('#length').value = '';
                modal.querySelector('#width').value = '';
                modal.querySelector('#depth').value = '';
                modal.querySelector('#use-depth').checked = false;
                modal.querySelector('#depth-group').style.display = 'none';

                // Загрузка данных
                const submitBtn = modal.querySelector('#submit-btn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Загрузка данных...';

                try {
                    sheetData = await loadSheetData(sheet.url);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Найти подходящие изделия';
                } catch (e) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Ошибка загрузки';
                    console.error('SmartSearch: Ошибка загрузки данных:', e);
                }
            });
        });

        // Кнопка назад
        modal.querySelector('.back-btn').addEventListener('click', () => {
            modal.querySelector('.product-selector').style.display = 'block';
            modal.querySelector('.box-picker-form').style.display = 'none';
            modal.querySelector('.result-section').style.display = 'none';
            currentType = null;
            sheetData = null;
        });

        // Чекбокс глубины
        modal.querySelector('#use-depth').addEventListener('change', (e) => {
            modal.querySelector('#depth-group').style.display = e.target.checked ? 'flex' : 'none';
        });

        // Кнопка поиска
        modal.querySelector('#submit-btn').addEventListener('click', () => {
            if (!currentType || !sheetData) return;

            const resultDiv = modal.querySelector('#result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div class="loading">🔍 Поиск подходящих ' + SHEETS[currentType].title + '...</div>';

            setTimeout(() => {
                const length = parseFloat(modal.querySelector('#length').value) || 0;
                const width = parseFloat(modal.querySelector('#width').value) || 0;
                const usesDepth = modal.querySelector('#use-depth').checked;
                const depth = usesDepth ? (parseFloat(modal.querySelector('#depth').value) || 0) : 0;

                if (length <= 0 || width <= 0 || (usesDepth && depth <= 0)) {
                    resultDiv.innerHTML = `
                        <div class="no-results">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Некорректные размеры</div>
                            <div>Пожалуйста, введите положительные значения для всех размеров</div>
                        </div>
                    `;
                    return;
                }

                const tolerances = TOLERANCES[currentType];
                const results = [];

                // Пропускаем заголовок (первая строка)
                for (let i = 1; i < sheetData.length; i++) {
                    const row = sheetData[i];
                    if (row.length < 3) continue;

                    const itemLength = parseFloat(row[0]) || 0;
                    const itemWidth = parseFloat(row[1]) || 0;
                    const itemDepth = parseFloat(row[2]) || 0;
                    const number = row[3] || i;

                    if (itemLength <= 0 || itemWidth <= 0) continue;

                    if (checkDimensions(itemLength, itemWidth, itemDepth, length, width, depth, tolerances, usesDepth)) {
                        results.push({
                            number: number,
                            length: itemLength,
                            width: itemWidth,
                            depth: itemDepth
                        });
                    }
                }

                if (results.length === 0) {
                    resultDiv.innerHTML = `
                        <div class="no-results">
                            <div style="font-size: 48px; margin-bottom: 20px;">😔</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Ничего не найдено</div>
                            <div>По вашим параметрам не найдено подходящих изделий</div>
                        </div>
                    `;
                    return;
                }

                // Сортировка результатов
                results.sort((a, b) => {
                    const diffA = Math.abs(a.length - length) + Math.abs(a.width - width);
                    const diffB = Math.abs(b.length - length) + Math.abs(b.width - width);
                    return diffA - diffB;
                });

                // Отображение результатов
                resultDiv.innerHTML = '';
                results.slice(0, 20).forEach(item => {
                    const resultElement = document.createElement('div');
                    resultElement.className = 'result-item';
                    resultElement.innerHTML = `
                        <div class="result-number">Штамп №${item.number}</div>
                        <div class="result-sizes">
                            <div>📐 Размеры: ${item.length} × ${item.width}${item.depth ? ' × ' + item.depth : ''} мм</div>
                        </div>
                    `;

                    resultElement.addEventListener('click', () => {
                        const inputField = document.querySelector("#UtList > div.input-group.inputcontainer > input");
                        if (inputField) {
                            inputField.focus();
                            inputField.value = '';
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            setTimeout(() => {
                                const stampText = `Штамп №${item.number}`;
                                inputField.value = stampText;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                const lastChar = String(item.number).slice(-1);
                                inputField.dispatchEvent(new KeyboardEvent('keyup', {
                                    key: lastChar,
                                    code: `Digit${lastChar}`,
                                    bubbles: true
                                }));
                                setTimeout(() => inputField.blur(), 100);
                                showSuccessNotification(stampText);
                                setTimeout(() => modal.remove(), 500);
                            }, 100);
                        }
                    });

                    resultDiv.appendChild(resultElement);
                });

                modal.querySelector('.result-section').scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        // Добавление кнопки вызова
        function addButton() {
            const topButtons = document.querySelector("#TopButtons");
            if (!topButtons) {
                setTimeout(addButton, 500);
                return;
            }

            if (document.querySelector('.tm-smart-search-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'tm-smart-search-btn';
            btn.textContent = '🔍 Умный поиск';
            btn.style.cssText = `
                margin-left: 10px;
                padding: 5px 10px;
                background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            btn.addEventListener('click', () => document.body.appendChild(modal));
            topButtons.appendChild(btn);
        }

        addButton();
    }

    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof config !== 'undefined' ? config.smartSerch : {}, typeof GM !== 'undefined' ? GM : {}, typeof utils !== 'undefined' ? utils : {});