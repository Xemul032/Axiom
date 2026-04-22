
(function(config, GM, utils) {
    'use strict';

    if (!config || !config.enabled) return;

    // --- НАСТРОЙКИ ---
    const JSON_URL = 'https://raw.githubusercontent.com/Xemul032/Axiom_calcs/refs/heads/main/calcs.json';
    const TARGET_SELECTOR = '#CalcUt > table > tbody > tr:nth-child(2) > td.ut_td_half.ut_info_part';
    const OBSERVE_ROOT = '#CalcUt';
    const HEADER_SELECTOR = '#CalcUt > h4';
    const POLL_INTERVAL = 800;

    // Селекторы для автозаполнения и радиокнопок
    const WIDTH_INPUT_SELECTOR = '#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(1) > table > tbody > tr:nth-child(2) > td:nth-child(2) > input';
    const HEIGHT_INPUT_SELECTOR = '#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(1) > table > tbody > tr:nth-child(3) > td:nth-child(2) > input';
    const PRINT_RADIO_CONTAINER = '#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(1) > table > tbody > tr:nth-child(5) > td.a_radioselect';
    const PRODUCTION_RADIO_CONTAINER = '#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(1) > table > tbody > tr:nth-child(7) > td.a_radioselect';

    let formulasData = null;
    let currentType = null;
    let lastHeaderContent = null;
    let observer = null;
    let pollIntervalId = null;

    // 1. Загрузка JSON
    function fetchFormulas() {
        return new Promise((resolve, reject) => {
            if (formulasData) {
                resolve(formulasData);
                return;
            }
            GM.xmlHttpRequest({
                method: "GET",
                url: JSON_URL,
                timeout: 10000,
                onload: function(response) {
                    try {
                        formulasData = JSON.parse(response.responseText);
                        resolve(formulasData);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(error);
                },
                ontimeout: function() {
                    reject(new Error('Timeout'));
                }
            });
        });
    }

    // 2. Получение изображения
    function getImageForType(formulaType) {
        if (!formulasData) return null;
        const typeData = formulasData[formulaType];
        if (typeData?.image) return typeData.image;
        if (formulasData._meta?.defaultImage) return formulasData._meta.defaultImage;
        return 'https://via.placeholder.com/300x200?text=No+Image';
    }

    // 3. Получение имени типа (расшифровки)
    function getTypeName(formulaType) {
        if (!formulasData) return formulaType;
        const typeData = formulasData[formulaType];
        return typeData?.name || formulaType;
    }

    // 4. Поиск типа в заголовке
    function findMatchingType() {
        if (!formulasData) return null;
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header) return null;

        const headerText = header.textContent.toLowerCase().trim();

        // Сортируем ключи по длине (убывание) чтобы сначала проверять более длинные ключи
        const sortedKeys = Object.keys(formulasData)
            .filter(k => k !== '_meta')
            .sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            if (headerText.includes(key.toLowerCase())) {
                return key;
            }
        }
        return null;
    }

    // 5. Автозаполнение полей ширины и высоты
    function fillDimensions(width, height) {
        const widthInput = document.querySelector(WIDTH_INPUT_SELECTOR);
        const heightInput = document.querySelector(HEIGHT_INPUT_SELECTOR);

        if (widthInput) {
            widthInput.value = width;
            widthInput.dispatchEvent(new Event('input', { bubbles: true }));
            widthInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (heightInput) {
            heightInput.value = height;
            heightInput.dispatchEvent(new Event('input', { bubbles: true }));
            heightInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // 6. Блокировка полей ширины и высоты
    function lockDimensionFields() {
        const widthInput = document.querySelector(WIDTH_INPUT_SELECTOR);
        const heightInput = document.querySelector(HEIGHT_INPUT_SELECTOR);

        if (widthInput) {
            widthInput.readOnly = true;
            widthInput.style.backgroundColor = '#f5f5f5';
            widthInput.style.cursor = 'not-allowed';
            widthInput.title = 'Значение рассчитывается автоматически';
        }

        if (heightInput) {
            heightInput.readOnly = true;
            heightInput.style.backgroundColor = '#f5f5f5';
            heightInput.style.cursor = 'not-allowed';
            heightInput.title = 'Значение рассчитывается автоматически';
        }
    }

    // 7. Управление видимостью радиокнопок печати
    function updatePrintRadioButtons(digitalAvailable, offsetAvailable) {
        const container = document.querySelector(PRINT_RADIO_CONTAINER);
        if (!container) return;

        const radioSpans = container.querySelectorAll('span');

        radioSpans.forEach(span => {
            const radio = span.querySelector('input[type="radio"]');
            const label = span.querySelector('label');

            if (radio && label) {
                const labelText = label.textContent.trim().toLowerCase();

                if (labelText.includes('цифра')) {
                    span.style.display = digitalAvailable ? '' : 'none';
                } else if (labelText.includes('офсет')) {
                    span.style.display = offsetAvailable ? '' : 'none';
                }
            }
        });

        const visibleSpans = Array.from(radioSpans).filter(span => span.style.display !== 'none');
        container.style.display = visibleSpans.length > 0 ? '' : 'none';
    }

    // 8. Управление видимостью радиокнопок изготовления
    function updateProductionRadioButtons(tigelAvailable, digitalPlotterAvailable, offsetPlotterAvailable) {
        const container = document.querySelector(PRODUCTION_RADIO_CONTAINER);
        if (!container) return;

        const radioSpans = container.querySelectorAll('span');

        radioSpans.forEach(span => {
            const radio = span.querySelector('input[type="radio"]');
            const label = span.querySelector('label');

            if (radio && label) {
                const labelText = label.textContent.trim().toLowerCase();

                if (labelText.includes('тигель')) {
                    span.style.display = tigelAvailable ? '' : 'none';
                } else if (labelText.includes('плоттер') && labelText.includes('цифра')) {
                    span.style.display = digitalPlotterAvailable ? '' : 'none';
                } else if (labelText.includes('плоттер') && labelText.includes('офсет')) {
                    span.style.display = offsetPlotterAvailable ? '' : 'none';
                }
            }
        });

        const visibleSpans = Array.from(radioSpans).filter(span => span.style.display !== 'none');
        container.style.display = visibleSpans.length > 0 ? '' : 'none';
    }

    // 9. Создание калькулятора
    function injectCalculator(targetElement, formulaType) {
        if (targetElement.querySelector('.tm-custom-calculator')) return;

        const imageUrl = getImageForType(formulaType);
        const typeName = getTypeName(formulaType);

        const container = document.createElement('div');
        container.className = 'tm-custom-calculator';
        container.style.marginTop = '20px';
        container.style.padding = '15px';
        container.style.border = '1px solid #ddd';
        container.style.borderRadius = '8px';
        container.style.backgroundColor = '#f9f9f9';
        container.style.boxSizing = 'border-box';

        // Заголовок типа
        const typeInfo = document.createElement('div');
        typeInfo.style.marginBottom = '15px';
        typeInfo.style.fontWeight = 'bold';
        typeInfo.style.color = '#333';
        typeInfo.style.fontSize = '14px';
        typeInfo.textContent = `📊 Тип: ${typeName}`;
        container.appendChild(typeInfo);

        // Основной контейнер (инпуты слева, картинка+размеры справа)
        const mainContent = document.createElement('div');
        mainContent.style.display = 'flex';
        mainContent.style.gap = '20px';
        mainContent.style.alignItems = 'flex-start';
        mainContent.style.flexWrap = 'nowrap';

        // Левая колонка - инпуты
        const inputsColumn = document.createElement('div');
        inputsColumn.style.flex = '0 0 180px';
        inputsColumn.style.minWidth = '180px';

        inputsColumn.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label style="display:block; font-weight:600; font-size:13px; color:#444; margin-bottom:4px; white-space:nowrap;">
                    Ширина L, мм
                </label>
                <input type="number" id="tm-input-l" style="width:100%; padding:6px 8px; box-sizing:border-box; border:1px solid #ccc; border-radius:3px; font-size:13px;" placeholder="0" min="1" step="1">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display:block; font-weight:600; font-size:13px; color:#444; margin-bottom:4px; white-space:nowrap;">
                    Глубина W, мм
                </label>
                <input type="number" id="tm-input-w" style="width:100%; padding:6px 8px; box-sizing:border-box; border:1px solid #ccc; border-radius:3px; font-size:13px;" placeholder="0" min="1" step="1">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display:block; font-weight:600; font-size:13px; color:#444; margin-bottom:4px; white-space:nowrap;">
                    Высота H, мм
                </label>
                <input type="number" id="tm-input-h" style="width:100%; padding:6px 8px; box-sizing:border-box; border:1px solid #ccc; border-radius:3px; font-size:13px;" placeholder="0" min="1" step="1">
            </div>
        `;

        // Правая колонка - картинка + результаты
        const rightColumn = document.createElement('div');
        rightColumn.style.flex = '1';
        rightColumn.style.minWidth = '280px';
        rightColumn.style.display = 'flex';
        rightColumn.style.flexDirection = 'column';
        rightColumn.style.alignItems = 'center';
        rightColumn.style.gap = '10px';

        // Изображение
        const imgContainer = document.createElement('div');
        imgContainer.style.width = '100%';
        imgContainer.style.textAlign = 'center';
        imgContainer.innerHTML = `
            <img src="${imageUrl}" alt="Scheme" style="max-width:100%; height:auto; max-height:200px;" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
        `;

        // Блок результатов
        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'tm-results';
        resultsDiv.style.display = 'none';
        resultsDiv.style.width = '50%';
        resultsDiv.style.padding = '8px 12px';
        resultsDiv.style.background = '#e8f5e9';
        resultsDiv.style.border = '2px solid #4CAF50';
        resultsDiv.style.borderRadius = '6px';
        resultsDiv.style.boxSizing = 'border-box';

        resultsDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:15px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; color:#2e7d32; font-weight:600; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        📐 Ширина:
                    </div>
                    <div style="font-size:15px; color:#1b5e20; font-weight:bold; white-space:nowrap;">
                        <span id="tm-result-width">0</span> <span style="font-size:12px; font-weight:normal;">мм</span>
                    </div>
                </div>
                <div style="width:1px; background:#81c784;"></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; color:#2e7d32; font-weight:600; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        📏 Высота:
                    </div>
                    <div style="font-size:15px; color:#1b5e20; font-weight:bold; white-space:nowrap;">
                        <span id="tm-result-height">0</span> <span style="font-size:12px; font-weight:normal;">мм</span>
                    </div>
                </div>
            </div>
        `;

        rightColumn.appendChild(imgContainer);
        rightColumn.appendChild(resultsDiv);

        mainContent.appendChild(inputsColumn);
        mainContent.appendChild(rightColumn);
        container.appendChild(mainContent);

        // Блок доступности
        const availabilityDiv = document.createElement('div');
        availabilityDiv.id = 'tm-availability';
        availabilityDiv.style.display = 'none';
        availabilityDiv.style.marginTop = '15px';
        availabilityDiv.style.padding = '12px 15px';
        availabilityDiv.style.background = '#fff3e0';
        availabilityDiv.style.border = '2px solid #ff9800';
        availabilityDiv.style.borderRadius = '6px';
        availabilityDiv.style.boxSizing = 'border-box';
        availabilityDiv.style.fontSize = '13px';

        availabilityDiv.innerHTML = `
            <div style="display:flex; gap:30px; margin-bottom:8px;">
                <div style="flex:1; min-width:200px;">
                    <div style="font-weight:700; color:#e65100; font-size:13px; display:flex; align-items:center; gap:6px;">
                        🖨️ Доступно для печати:
                    </div>
                </div>
                <div style="flex:1; min-width:200px;">
                    <div style="font-weight:700; color:#e65100; font-size:13px; display:flex; align-items:center; gap:6px;">
                        ✂️ Доступно для изготовления на:
                    </div>
                </div>
            </div>

            <div style="display:flex; gap:30px; margin-bottom:12px;">
                <div style="flex:1; min-width:200px;">
                    <div id="tm-print-methods" style="color:#bf360c; line-height:1.8;"></div>
                </div>
                <div style="flex:1; min-width:200px;">
                    <div id="tm-production-methods" style="color:#bf360c; line-height:1.8;"></div>
                </div>
            </div>

            <div id="tm-unavailable-message" style="display:none; color:#c62828; font-weight:600; font-size:14px; padding:10px 0; border-top:1px solid #ffe0b2; margin-top:8px;">
                ✗ Недоступно для изготовления. Можете сделать рассчёт в калькуляторе гофрокоробок.
            </div>

            <div id="tm-max-sizes-inline" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid #ffe0b2;">
                <div style="font-weight:700; color:#f57f17; margin-bottom:10px; font-size:12px; display:flex; align-items:center; gap:6px;">
                    ⚠️ Максимально доступные размеры:
                </div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                    <div style="padding:10px; background:#fff; border:1px solid #ffe0b2; border-radius:4px;">
                        <div style="color:#f57f17; margin-bottom:5px; font-weight:600; font-size:11px;">L и W неизменны:</div>
                        <div style="color:#e65100; font-weight:bold; font-size:13px;">
                            <span id="tm-size-l-1">0</span> × <span id="tm-size-w-1">0</span> × <span id="tm-size-h-1">0</span> <span style="font-size:11px; font-weight:normal;">мм</span>
                        </div>
                    </div>
                    <div style="padding:10px; background:#fff; border:1px solid #ffe0b2; border-radius:4px;">
                        <div style="color:#f57f17; margin-bottom:5px; font-weight:600; font-size:11px;">L и H неизменны:</div>
                        <div style="color:#e65100; font-weight:bold; font-size:13px;">
                            <span id="tm-size-l-2">0</span> × <span id="tm-size-w-2">0</span> × <span id="tm-size-h-2">0</span> <span style="font-size:11px; font-weight:normal;">мм</span>
                        </div>
                    </div>
                    <div style="padding:10px; background:#fff; border:1px solid #ffe0b2; border-radius:4px;">
                        <div style="color:#f57f17; margin-bottom:5px; font-weight:600; font-size:11px;">W и H неизменны:</div>
                        <div style="color:#e65100; font-weight:bold; font-size:13px;">
                            <span id="tm-size-l-3">0</span> × <span id="tm-size-w-3">0</span> × <span id="tm-size-h-3">0</span> <span style="font-size:11px; font-weight:normal;">мм</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(availabilityDiv);

        // Блок MGI
        const mgiDiv = document.createElement('div');
        mgiDiv.id = 'tm-mgi';
        mgiDiv.style.display = 'none';
        mgiDiv.style.marginTop = '15px';
        mgiDiv.style.padding = '10px 15px';
        mgiDiv.style.background = '#f3e5f5';
        mgiDiv.style.border = '2px solid #9c27b0';
        mgiDiv.style.borderRadius = '6px';
        mgiDiv.style.boxSizing = 'border-box';
        mgiDiv.style.fontSize = '13px';

        mgiDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:700; color:#6a1b9a; font-size:13px;">
                    ✨ Доступность для нанесения MGI:
                </span>
                <span id="tm-mgi-status" style="font-weight:600; font-size:14px;"></span>
            </div>
        `;

        container.appendChild(mgiDiv);

        // Блок стоимости
        const costDiv = document.createElement('div');
        costDiv.id = 'tm-cost';
        costDiv.style.display = 'none';
        costDiv.style.marginTop = '15px';
        costDiv.style.padding = '12px 15px';
        costDiv.style.background = '#e3f2fd';
        costDiv.style.border = '2px solid #2196f3';
        costDiv.style.borderRadius = '6px';
        costDiv.style.boxSizing = 'border-box';
        costDiv.style.fontSize = '13px';

        costDiv.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px;">
                <div>
                    <div style="font-weight:700; color:#1565c0; margin-bottom:6px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        📝 Стоимость разработки штампа:
                    </div>
                    <div style="color:#0d47a1; font-size:16px; font-weight:bold;">
                        500 ₽
                    </div>
                </div>
                <div>
                    <div style="font-weight:700; color:#1565c0; margin-bottom:6px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        🔧 Стоимость изготовления штанцформы (1 коробка):
                    </div>
                    <div id="tm-die-cost" style="color:#0d47a1; font-size:16px; font-weight:bold;">
                        —
                    </div>
                </div>
                <div>
                    <div style="font-weight:700; color:#1565c0; margin-bottom:6px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        🎨 Адаптация дизайна клиента:
                    </div>
                    <div style="color:#0d47a1; font-size:14px; font-style:italic;">
                        по прайсу дизайнеров
                    </div>
                </div>
            </div>
        `;

        container.appendChild(costDiv);

        // Кнопка
        const calcBtn = document.createElement('button');
        calcBtn.id = 'tm-calc-btn';
        calcBtn.textContent = 'Рассчитать';
        calcBtn.style.width = '100%';
        calcBtn.style.marginTop = '15px';
        calcBtn.style.padding = '10px 15px';
        calcBtn.style.fontSize = '14px';
        calcBtn.style.fontWeight = 'bold';
        calcBtn.style.cursor = 'pointer';
        calcBtn.style.background = '#4CAF50';
        calcBtn.style.color = 'white';
        calcBtn.style.border = 'none';
        calcBtn.style.borderRadius = '4px';
        calcBtn.style.boxSizing = 'border-box';
        calcBtn.style.transition = 'background 0.2s';

        calcBtn.onmouseover = () => calcBtn.style.background = '#43a047';
        calcBtn.onmouseout = () => calcBtn.style.background = '#4CAF50';

        container.appendChild(calcBtn);
        targetElement.prepend(container);

        // Блокируем поля ширины и высоты
        lockDimensionFields();

        // ОГРАНИЧЕНИЕ ВВОДА: Только положительные целые числа
        ['tm-input-l', 'tm-input-w', 'tm-input-h'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            input.inputMode = 'numeric';
            input.pattern = '\\d*';

            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^\d]/g, '').replace(/^0+/, '');
            });

            input.addEventListener('keydown', function(e) {
                if ([8, 9, 13, 27, 46, 37, 38, 39, 40].includes(e.keyCode)) return;
                if (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) return;
                if (['-', '.', ',', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                    return;
                }
                if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });

            input.addEventListener('paste', function(e) {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text');
                this.value = pasted.replace(/[^\d]/g, '').replace(/^0+/, '');
                this.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        // Функция проверки вписывания с поворотом
        function fitsWithRotation(rectWidth, rectHeight, maxWidth, maxHeight) {
            const fitsNormal = rectWidth <= maxWidth && rectHeight <= maxHeight;
            const fitsRotated = rectWidth <= maxHeight && rectHeight <= maxWidth;
            return fitsNormal || fitsRotated;
        }

        // Функция вычисления максимального значения
        function findMaxValueForPrint(fixedL, fixedW, fixedH, variableType, formulas) {
            const step = 1;
            const maxIterations = 2000;
            let maxValue = 0;

            const digitalMaxW = 318, digitalMaxH = 476;
            const offsetMaxW = 690, offsetMaxH = 478;

            for (let i = step; i <= maxIterations; i += step) {
                let L, W, H;

                if (variableType === 'L') { L = i; W = fixedW; H = fixedH; }
                else if (variableType === 'W') { L = fixedL; W = i; H = fixedH; }
                else if (variableType === 'H') { L = fixedL; W = fixedW; H = i; }

                let widthResult = 0, heightResult = 0;

                if (formulas.formula1) {
                    try {
                        const expr1 = formulas.formula1.replace(/\bL\b/g, L).replace(/\bW\b/g, W).replace(/\bH\b/g, H);
                        heightResult = eval(expr1);
                    } catch (e) {
                        continue;
                    }
                }
                if (formulas.formula2) {
                    try {
                        const expr2 = formulas.formula2.replace(/\bL\b/g, L).replace(/\bW\b/g, W).replace(/\bH\b/g, H);
                        widthResult = eval(expr2);
                    } catch (e) {
                        continue;
                    }
                }

                const fitsDigital = fitsWithRotation(widthResult, heightResult, digitalMaxW, digitalMaxH);
                const fitsOffset = fitsWithRotation(widthResult, heightResult, offsetMaxW, offsetMaxH);

                if (fitsDigital || fitsOffset) {
                    maxValue = i;
                } else {
                    break;
                }
            }

            return maxValue > 0 ? Math.round(maxValue * 100) / 100 : 0;
        }

        // Функция расчёта стоимости штанцформы
        function calculateDieCost(width, height, formulas) {
            if (!formulas.dieCost1000) return null;

            const layoutArea = width * height;
            const baseArea = 1000 * 1000;
            const areaCoefficient = layoutArea / baseArea;
            const baseCost = formulas.dieCost1000;
            const calculatedCost = baseCost * areaCoefficient;
            const finalCost = (calculatedCost + 1500) * 1.5;
            const costInThousands = Math.ceil(finalCost / 1000);

            return costInThousands;
        }

        // Функция склонения числительных
        function declension(number, titles) {
            const cases = [2, 0, 1, 1, 1, 2];
            return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
        }

        // Обработчик кнопки
        calcBtn.addEventListener('click', () => {
            const L = parseFloat(document.getElementById('tm-input-l').value) || 0;
            const W = parseFloat(document.getElementById('tm-input-w').value) || 0;
            const H = parseFloat(document.getElementById('tm-input-h').value) || 0;
            const formulas = formulasData[formulaType];

            if (!formulas) return;

            const resultWidth = document.getElementById('tm-result-width');
            const resultHeight = document.getElementById('tm-result-height');
            const printMethods = document.getElementById('tm-print-methods');
            const productionMethods = document.getElementById('tm-production-methods');
            const mgiStatus = document.getElementById('tm-mgi-status');
            const resultsDiv = document.getElementById('tm-results');
            const availabilityDiv = document.getElementById('tm-availability');
            const mgiDiv = document.getElementById('tm-mgi');
            const costDiv = document.getElementById('tm-cost');
            const maxSizesInline = document.getElementById('tm-max-sizes-inline');
            const unavailableMessage = document.getElementById('tm-unavailable-message');
            const dieCostElement = document.getElementById('tm-die-cost');

            let widthResult = 0;
            let heightResult = 0;

            if (formulas.formula1) {
                try {
                    const expr1 = formulas.formula1.replace(/\bL\b/g, L).replace(/\bW\b/g, W).replace(/\bH\b/g, H);
                    heightResult = eval(expr1);
                } catch (e) {}
            }
            if (formulas.formula2) {
                try {
                    const expr2 = formulas.formula2.replace(/\bL\b/g, L).replace(/\bW\b/g, W).replace(/\bH\b/g, H);
                    widthResult = eval(expr2);
                } catch (e) {}
            }

            widthResult = Math.ceil(widthResult);
            heightResult = Math.ceil(heightResult);

            resultWidth.textContent = widthResult;
            resultHeight.textContent = heightResult;
            resultsDiv.style.display = 'block';

            fillDimensions(widthResult, heightResult);

            const dieCost = calculateDieCost(widthResult, heightResult, formulas);
            if (dieCost !== null) {
                const dieCostWord = declension(dieCost, ['тысяча', 'тысячи', 'тысяч']);
                dieCostElement.textContent = `≈ ${dieCost} ${dieCostWord} рублей`;
                dieCostElement.style.color = '#0d47a1';
            } else {
                dieCostElement.textContent = '—';
                dieCostElement.style.color = '#90a4ae';
            }

            const printOptions = [];
            const productionOptions = [];

            const digitalAvailable = fitsWithRotation(widthResult, heightResult, 318, 476);
            const offsetAvailable = fitsWithRotation(widthResult, heightResult, 690, 478);

            if (digitalAvailable) {
                printOptions.push('<span style="color:#2e7d32; font-weight:600;">✓ Цифра</span>');
            }
            if (offsetAvailable) {
                printOptions.push('<span style="color:#2e7d32; font-weight:600;">✓ Офсет</span>');
            }

            const tigelAvailable = fitsWithRotation(widthResult, heightResult, 495, 730);
            if (tigelAvailable) {
                productionOptions.push('<span style="color:#2e7d32; font-weight:600;">✓ Тигель</span>');
            }

            const digitalPlotterAvailable = digitalAvailable && fitsWithRotation(widthResult, heightResult, 290, 448);
            if (digitalPlotterAvailable) {
                productionOptions.push('<span style="color:#2e7d32; font-weight:600;">✓ Плоттер (цифра)</span>');
            }

            const offsetPlotterAvailable = offsetAvailable && fitsWithRotation(widthResult, heightResult, 660, 460);
            if (offsetPlotterAvailable) {
                productionOptions.push('<span style="color:#2e7d32; font-weight:600;">✓ Плоттер (офсет)</span>');
            }

            updatePrintRadioButtons(digitalAvailable, offsetAvailable);
            updateProductionRadioButtons(tigelAvailable, digitalPlotterAvailable, offsetPlotterAvailable);

            const isPrintAvailable = printOptions.length > 0;

            if (!isPrintAvailable) {
                printMethods.innerHTML = '';
                productionMethods.innerHTML = '';
                unavailableMessage.style.display = 'block';
                mgiDiv.style.display = 'none';
                costDiv.style.display = 'none';
            } else {
                printMethods.innerHTML = printOptions.join(' &nbsp;|&nbsp; ');
                productionMethods.innerHTML = productionOptions.length > 0 ? productionOptions.join(' &nbsp;|&nbsp; ') : '<span style="color:#c62828; font-weight:600;">✗ Недоступно</span>';
                unavailableMessage.style.display = 'none';
                mgiDiv.style.display = 'block';
                costDiv.style.display = 'block';

                const mgiAvailable = fitsWithRotation(widthResult, heightResult, 297, 730);
                if (mgiAvailable) {
                    mgiStatus.innerHTML = '<span style="color:#2e7d32; font-weight:700;">✓ Доступно для нанесения MGI</span>';
                    mgiDiv.style.background = '#f3e5f5';
                    mgiDiv.style.borderColor = '#9c27b0';
                } else {
                    mgiStatus.innerHTML = '<span style="color:#c62828; font-weight:700;">✗ Недоступно для нанесения MGI</span>';
                    mgiDiv.style.background = '#ffebee';
                    mgiDiv.style.borderColor = '#f44336';
                }
            }

            if (!isPrintAvailable && L > 0 && W > 0 && H > 0) {
                const maxHValue = findMaxValueForPrint(L, W, H, 'H', formulas);
                const maxWValue = findMaxValueForPrint(L, W, H, 'W', formulas);
                const maxLValue = findMaxValueForPrint(L, W, H, 'L', formulas);

                document.getElementById('tm-size-l-1').textContent = L;
                document.getElementById('tm-size-w-1').textContent = W;
                document.getElementById('tm-size-h-1').textContent = maxHValue > 0 ? Math.ceil(maxHValue) : '—';

                document.getElementById('tm-size-l-2').textContent = L;
                document.getElementById('tm-size-w-2').textContent = maxWValue > 0 ? Math.ceil(maxWValue) : '—';
                document.getElementById('tm-size-h-2').textContent = H;

                document.getElementById('tm-size-l-3').textContent = maxLValue > 0 ? Math.ceil(maxLValue) : '—';
                document.getElementById('tm-size-w-3').textContent = W;
                document.getElementById('tm-size-h-3').textContent = H;

                maxSizesInline.style.display = 'block';
            } else {
                maxSizesInline.style.display = 'none';
            }

            availabilityDiv.style.display = 'block';
        });
    }

    // 10. Удаление калькулятора
    function removeCalculator() {
        const target = document.querySelector(TARGET_SELECTOR);
        if (target?.querySelector('.tm-custom-calculator')) {
            target.querySelector('.tm-custom-calculator').remove();
        }
        currentType = null;
    }

    // 11. Главная функция проверки
    function checkAndInject() {
        const header = document.querySelector(HEADER_SELECTOR);
        const target = document.querySelector(TARGET_SELECTOR);

        if (!header || !target) {
            if (currentType) removeCalculator();
            lastHeaderContent = null;
            return;
        }

        const currentHeaderContent = header.textContent.trim();

        if (currentHeaderContent === lastHeaderContent && currentType) {
            return;
        }

        lastHeaderContent = currentHeaderContent;
        const matchedType = findMatchingType();

        if (matchedType) {
            if (currentType !== matchedType) {
                removeCalculator();
                currentType = matchedType;
                injectCalculator(target, matchedType);
            }
        } else {
            if (currentType) {
                removeCalculator();
            }
        }
    }

    // 12. Инициализация
    function init() {
        fetchFormulas().then(() => {
            checkAndInject();
        }).catch(() => {});

        const setupObserver = () => {
            const rootElement = document.querySelector(OBSERVE_ROOT);
            if (!rootElement) return false;

            if (observer) observer.disconnect();

            observer = new MutationObserver(() => {
                checkAndInject();
            });

            observer.observe(rootElement, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });

            return true;
        };

        if (!setupObserver()) {
            const retryObserver = setInterval(() => {
                if (setupObserver()) {
                    clearInterval(retryObserver);
                }
            }, 1000);
        }

        pollIntervalId = setInterval(() => {
            if (formulasData) {
                checkAndInject();
            }
        }, POLL_INTERVAL);

        checkAndInject();
    }

    // 13. Очистка
    function cleanup() {
        if (observer) observer.disconnect();
        if (pollIntervalId) clearInterval(pollIntervalId);
        removeCalculator();
    }

    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__tmCleanup = cleanup;
    window.__tmCheck = checkAndInject;

})(typeof config !== 'undefined' ? config.easyPackMaker : {}, typeof GM !== 'undefined' ? GM : {}, typeof utils !== 'undefined' ? utils : {});