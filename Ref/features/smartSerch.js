(function(config, GM, utils) {
    'use strict';

    // 🔥 Проверка зависимостей (сразу в начале)
    if (!GM || !GM.xmlhttpRequest) {
        console.error('[SmartSearch] ❌ GM API не передан. Модуль не может работать.');
        return;
    }
    console.log('[SmartSearch] 🚀 Модуль запущен');

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
    const style = document.createElement("style");
    style.innerHTML = `
        .box-picker-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.6); display: flex;
            justify-content: center; align-items: center; z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .box-picker-content {
            background: #fafafa; border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); padding: 0;
            width: 500px; max-width: 90%; max-height: 90vh;
            overflow-y: auto; position: relative; scroll-behavior: smooth;
        }
        .box-picker-content::-webkit-scrollbar { width: 8px; }
        .box-picker-content::-webkit-scrollbar-track {
            background: #f1f1f1; border-radius: 10px; margin: 12px 0;
        }
        .box-picker-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            border-radius: 10px; transition: all 0.3s ease;
        }
        .box-picker-content::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #007bb8 0%, #004373 100%);
            box-shadow: 0 2px 8px rgba(0, 145, 211, 0.3);
        }
        .box-picker-content { scrollbar-width: thin; scrollbar-color: #0091D3 #f1f1f1; }
        .box-picker-header {
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white; padding: 20px 30px; border-radius: 12px 12px 0 0;
            margin: 0; font-size: 24px; font-weight: 600; text-align: center;
        }
        .product-selector { padding: 30px; text-align: center; }
        .selector-title {
            font-size: 20px; font-weight: 600; color: #333; margin-bottom: 30px;
        }
        .product-options {
            display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 20px; margin-bottom: 20px;
        }
        .product-option {
            display: flex; flex-direction: column; align-items: center;
            padding: 30px 20px; border: 3px solid #e0e0e0; border-radius: 12px;
            cursor: pointer; transition: all 0.3s ease; background: #fafafa;
            text-decoration: none; color: #333;
        }
        .product-option:hover {
            border-color: #0091D3; background: #f0f8ff;
            transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 145, 211, 0.15);
        }
        .product-option-icon { font-size: 48px; margin-bottom: 15px; }
        .product-option-title {
            font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px;
        }
        .product-option-description {
            font-size: 14px; color: #666; text-align: center; line-height: 1.4;
        }
        .box-picker-form { padding: 30px; }
        .form-section { margin-bottom: 30px; }
        .section-title {
            font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px;
            padding-bottom: 5px; border-bottom: 2px solid #e0e0e0;
        }
        .back-btn {
            display: inline-flex; align-items: center; gap: 8px;
            background: #f5f5f5; border: 1px solid #ddd; color: #666;
            padding: 8px 16px; border-radius: 6px; font-size: 14px;
            cursor: pointer; transition: all 0.2s ease; margin-bottom: 20px;
        }
        .back-btn:hover { background: #ebebeb; border-color: #ccc; }
        .product-image-container {
            margin-bottom: 25px; padding: 0; border-radius: 8px;
            overflow: hidden; text-align: center;
        }
        .product-image {
            width: 100%; height: auto; max-height: 300px;
            object-fit: contain; display: inline-block;
        }
        .filter-spoiler { margin-bottom: 20px; }
        .filter-toggle-btn {
            width: 100%; display: flex; align-items: center;
            justify-content: space-between; padding: 12px 16px;
            background: #f5f5f5; border: 2px solid #e0e0e0; border-radius: 8px;
            font-size: 14px; font-weight: 600; color: #333; cursor: pointer;
            transition: all 0.3s ease; text-align: left; margin-bottom: 0;
        }
        .filter-toggle-btn:hover { background: #ebebeb; border-color: #0091D3; }
        .filter-toggle-btn.active {
            background: #e3f2fd; border-color: #0091D3; color: #0091D3;
            border-bottom-left-radius: 0; border-bottom-right-radius: 0;
            margin-bottom: -2px; z-index: 2; position: relative;
        }
        .filter-toggle-icon {
            font-size: 16px; transition: transform 0.3s ease; margin-left: 10px;
        }
        .filter-toggle-btn.active .filter-toggle-icon { transform: rotate(180deg); }
        .filter-content {
            max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out;
            border: 2px solid #e0e0e0; border-top: none;
            border-radius: 0 0 8px 8px; background: #fafafa;
        }
        .filter-content.expanded {
            max-height: 300px; overflow-y: auto; border-color: #0091D3;
            border-top: 1px solid #0091D3;
        }
        .filter-content.expanded::-webkit-scrollbar { width: 6px; }
        .filter-content.expanded::-webkit-scrollbar-track {
            background: #f1f1f1; border-radius: 3px;
        }
        .filter-content.expanded::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            border-radius: 3px;
        }
        .filter-content.expanded { scrollbar-width: thin; scrollbar-color: #0091D3 #f1f1f1; }
        .filter-content-inner { padding: 15px; }
        .dimension-row {
            display: flex; align-items: center; margin-bottom: 15px; gap: 15px;
        }
        .dimension-label {
            font-weight: 500; color: #555; width: 130px;
            font-size: 14px; flex-shrink: 0;
        }
        .param-input {
            flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0;
            border-radius: 8px; font-size: 14px; transition: border-color 0.3s ease;
        }
        .param-input:focus {
            outline: none; border-color: #0091D3;
            box-shadow: 0 0 0 3px rgba(0, 145, 211, 0.1);
        }
        .types-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .type-checkbox {
            display: flex; align-items: center; padding: 10px 12px;
            border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer;
            transition: all 0.3s ease; background: #fff; min-height: 40px;
        }
        .type-checkbox:hover { border-color: #0091D3; background: #f0f8ff; }
        .type-checkbox input[type="checkbox"] {
            margin-right: 10px; width: 16px; height: 16px;
            accent-color: #0091D3; flex-shrink: 0;
        }
        .type-checkbox label {
            font-size: 13px; font-weight: 500; color: #333;
            cursor: pointer; flex: 1; line-height: 1.2;
        }
        .submit-btn {
            width: 100%; padding: 16px 20px;
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white; border: none; border-radius: 8px; font-size: 16px;
            font-weight: 600; cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease; margin-top: 10px;
        }
        .submit-btn:hover {
            transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 145, 211, 0.3);
        }
        .submit-btn:active { transform: translateY(0); }
        .result-section {
            margin-top: 25px; padding-top: 20px; border-top: 2px solid #e0e0e0;
        }
        .results-group { margin-bottom: 25px; }
        .results-group-title {
            font-size: 16px; font-weight: 600; margin-bottom: 15px;
            padding: 10px 15px; border-radius: 6px; display: flex;
            align-items: center; gap: 8px;
        }
        .results-group-title.exact-match {
            background: #e8f5e8; color: #2e7d2e; border-left: 4px solid #4CAF50;
        }
        .results-group-title.other-types {
            background: #fff3e0; color: #e65100; border-left: 4px solid #ff9800;
        }
        .result-item {
            background: #f8f9ff; border: 1px solid #e0e6ff; border-radius: 8px;
            padding: 15px; margin-bottom: 12px; border-left: 4px solid #0091D3;
            cursor: pointer; transition: all 0.2s ease;
        }
        .result-item:hover {
            transform: scale(1.02); box-shadow: 0 8px 25px rgba(0, 145, 211, 0.15);
        }
        .result-item.other-type {
            background: #fef9f3; border: 1px solid #ffd4a3; border-left: 4px solid #ff9800;
        }
        .result-header {
            font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;
        }
        .result-details {
            color: #666; font-size: 14px; line-height: 1.5;
        }
        .result-description {
            color: #888; font-style: italic; margin-top: 5px; font-size: 13px;
        }
        .type-mismatch-notice {
            background: #fff3e0; color: #e65100; padding: 6px 12px;
            border-radius: 4px; font-size: 12px; font-weight: 600;
            margin-top: 8px; display: inline-block;
        }
        .click-hint {
            margin-top: 10px; font-size: 12px; color: #0091D3; font-weight: 500;
        }
        .no-results {
            text-align: center; padding: 40px; color: #666; font-size: 16px;
        }
        .loading {
            text-align: center; padding: 20px; color: #0091D3; font-style: italic;
        }
        .close-btn {
            position: absolute; top: 15px; right: 20px;
            background: rgba(255, 255, 255, 0.2); border: none; color: white;
            font-size: 24px; width: 32px; height: 32px; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center;
            justify-content: center; transition: background 0.3s ease;
        }
        .close-btn:hover { background: rgba(255, 255, 255, 0.3); }
        .box-picker-inline-btn {
            display: inline-block; padding: 8px 16px;
            background: linear-gradient(135deg, #0091D3 0%, #005189 100%);
            color: white; border: none; border-radius: 4px; cursor: pointer;
            font-weight: 600; font-size: 16px; margin-left: 10px;
            text-decoration: none; transition: transform 0.2s ease, box-shadow 0.2s ease;
            vertical-align: middle;
        }
        .box-picker-inline-btn:hover {
            transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 145, 211, 0.3);
        }
        .results-container { animation: fadeInUp 0.5s ease-out; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .box-picker-content { width: 95%; margin: 10px; }
            .box-picker-content::-webkit-scrollbar { width: 6px; }
            .product-options { grid-template-columns: 1fr; }
            .dimension-row { flex-wrap: wrap; gap: 10px; }
            .dimension-label { width: 100%; margin-bottom: 5px; }
            .param-input { max-width: none; min-width: 120px; }
            .types-container { grid-template-columns: 1fr; }
            .box-picker-form { padding: 20px; }
            .product-selector { padding: 20px; }
        }
    `;
    document.head.appendChild(style);
    console.log('[SmartSearch] ✅ Стили добавлены');

    let allData = [];
    let currentProductType = null;

    function getCellValue(cell, defaultValue = "") {
        return cell && cell.v !== null && cell.v !== undefined ? cell.v : defaultValue;
    }

    function parseFloatSafe(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    function showSuccessNotification(stampText) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white; padding: 15px 20px; border-radius: 8px;
            font-family: sans-serif; font-weight: 600; z-index: 100000;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transform: translateX(100%); transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">✅</span>
                <span>Выбран: ${stampText}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 50);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showPreviewModal(imageUrl) {
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7); display: flex;
            justify-content: center; align-items: center; z-index: 999999;
            cursor: zoom-out;
        `;
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 90%; max-height: 90vh; border-radius: 12px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        `;
        modal.appendChild(img);
        modal.addEventListener("click", () => modal.remove());
        document.body.appendChild(modal);
    }

    function checkAndAddButton() {
        const utList = document.querySelector("#UtList");
        const tagsH4 = document.querySelector("#UtList > div.tags > h4");
        if (utList && tagsH4 && !tagsH4.querySelector('.box-picker-inline-btn')) {
            const button = document.createElement("button");
            button.innerText = "Умный поиск";
            button.className = "box-picker-inline-btn";
            button.addEventListener("click", (e) => {
                e.preventDefault();
                openProductSelector();
            });
            tagsH4.appendChild(button);
            console.log('[SmartSearch] ✅ Кнопка "Умный поиск" добавлена');
        }
    }

    function initRubricatorPreviewCache() {
        if (sessionStorage.getItem('stampPreviews')) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                const rubricator = document.querySelector("#UtList > div.rubricator");
                if (rubricator) {
                    observer.disconnect();
                    const links = Array.from(rubricator.querySelectorAll("a"));
                    const previewMap = [];

                    links.forEach(link => {
                        const textDiv = link.querySelector("div");
                        if (textDiv && textDiv.textContent) {
                            const match = textDiv.textContent.match(/штамп №(\d+)/i);
                            if (match && match[1]) {
                                const stampNumber = match[1];
                                const backgroundImage = window.getComputedStyle(link).backgroundImage;
                                const imageUrl = backgroundImage
                                    .replace(/^url\(['"]?/, '')
                                    .replace(/['"]?\)$/, '');
                                previewMap.push({ number: stampNumber, url: imageUrl });
                            }
                        }
                    });

                    sessionStorage.setItem('stampPreviews', JSON.stringify(previewMap));
                    console.log('[SmartSearch] ✅ Кэш превью сохранён:', previewMap.length, 'штук');
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function openProductSelector() {
        const modal = document.createElement("div");
        modal.className = "box-picker-modal";
        const content = document.createElement("div");
        content.className = "box-picker-content";
        content.innerHTML = `
            <div class="box-picker-header">
                Выбор типа изделия
                <button class="close-btn">&times;</button>
            </div>
            <div class="product-selector">
                <div class="selector-title">Что вы хотите подобрать?</div>
                <div class="product-options">
                    <div class="product-option" data-type="BOX">
                        <div class="product-option-icon">📦</div>
                        <div class="product-option-title">Коробки</div>
                        <div class="product-option-description">Поиск коробок по размерам</div>
                    </div>
                    <div class="product-option" data-type="PACKAGE">
                        <div class="product-option-icon">🛍️</div>
                        <div class="product-option-title">Пакеты</div>
                        <div class="product-option-description">Поиск пакетов по размерам</div>
                    </div>
                    <div class="product-option" data-type="KONVERT">
                        <div class="product-option-icon">✉️</div>
                        <div class="product-option-title">Конверты</div>
                        <div class="product-option-description">Поиск конвертов по длине и ширине</div>
                    </div>
                    <div class="product-option" data-type="PAPKA">
                        <div class="product-option-icon">📁</div>
                        <div class="product-option-title">Папки</div>
                        <div class="product-option-description">Поиск папок по длине и ширине</div>
                    </div>
                </div>
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);

        content.querySelectorAll('.product-option').forEach(option => {
            option.addEventListener('click', () => {
                const productType = option.getAttribute('data-type');
                currentProductType = productType;
                modal.remove();
                fetchData(productType);
            });
        });

        const closeModal = () => modal.remove();
        content.querySelector(".close-btn").addEventListener("click", closeModal);
        modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                closeModal();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    }

    function fetchData(productType) {
        const sheet = SHEETS[productType];
        console.log('[SmartSearch] 📡 Загрузка данных:', sheet.title);
        
        // 🔥 Используем GM.xmlhttpRequest вместо глобального GM_xmlhttpRequest
        GM.xmlhttpRequest({
            method: "GET",
            url: sheet.url,
            onload: function (response) {
                try {
                    let json;
                    try {
                        json = JSON.parse(response.responseText);
                    } catch (e) {
                        const match = response.responseText.match(/.*?({.*}).*/);
                        if (!match || !match[1]) throw new Error("Не удалось найти JSON в ответе");
                        json = JSON.parse(match[1]);
                    }
                    if (!json || !json.table || !json.table.rows || json.table.rows.length < 2) {
                        throw new Error("Нет данных в таблице или неправильная структура");
                    }
                    const rows = json.table.rows;
                    allData = rows.slice(1).map(row => {
                        if (!row || !row.c || !Array.isArray(row.c)) return null;
                        const number = getCellValue(row.c[0], "");
                        const length = parseFloatSafe(getCellValue(row.c[1], 0));
                        const width = parseFloatSafe(getCellValue(row.c[2], 0));
                        if (productType === 'KONVERT' || productType === 'PAPKA') {
                            if (!number || length <= 0 || width <= 0) return null;
                            return {
                                number: number,
                                length: length,
                                width: width,
                                type: getCellValue(row.c[3] || row.c[4], "")
                            };
                        } else {
                            const depth = parseFloatSafe(getCellValue(row.c[3], 0));
                            const type = getCellValue(row.c[4], "");
                            if (!number || length <= 0 || width <= 0 || depth <= 0) return null;
                            return {
                                number: number,
                                length: length,
                                width: width,
                                depth: depth,
                                type: type
                            };
                        }
                    }).filter(item => item !== null);
                    
                    if (allData.length === 0) {
                        alert(`В таблице ${sheet.title} нет корректных данных`);
                        return;
                    }
                    console.log('[SmartSearch] ✅ Данные загружены:', allData.length, 'записей');
                    openModal(productType);
                } catch (error) {
                    console.error("[SmartSearch] ❌ Ошибка при получении данных:", error);
                    alert(
                        `Ошибка при получении данных для "${sheet.title}": ${error.message}
Проверьте:
1. Доступность таблицы
2. Корректность ссылки
3. Опубликована ли таблица в формате JSON
4. Структура листа соответствует ожиданиям скрипта`
                    );
                }
            },
            onerror: function (error) {
                console.error("[SmartSearch] ❌ Ошибка сети:", error);
                alert(`Ошибка сети при получении данных для ${sheet.title}`);
            }
        });
    }

    function openModal(productType) {
        const sheet = SHEETS[productType];
        const usesDepth = ['BOX', 'PACKAGE'].includes(currentProductType);
        const modal = document.createElement("div");
        modal.className = "box-picker-modal";
        const content = document.createElement("div");
        content.className = "box-picker-content";

        const DIM_LABELS = {
            BOX: { l: 'Высота (H)', w: 'Ширина (L)', h: 'Глубина (W)', pl: 'Введите длину', pw: 'Введите ширину', ph: 'Введите глубину' },
            PACKAGE: { l: 'Длина пакета (L)', w: 'Высота пакета (H)', h: 'Глубина по дну (W)', pl: 'Введите длину', pw: 'Введите высоту', ph: 'Введите глубину дна' },
            KONVERT: { l: 'Длина (L)', w: 'Ширина (W)', pl: 'Введите длину', pw: 'Введите ширину' },
            PAPKA: { l: 'Длина (L)', w: 'Ширина (W)', pl: 'Введите длину', pw: 'Введите ширину' }
        };
        const lbl = DIM_LABELS[productType];
        const imageHtml = sheet.image ? `<img src="${sheet.image}" alt="${sheet.title}" class="product-image" onerror="this.style.display='none'">` : '';

        content.innerHTML = `
            <div class="box-picker-header">
                ${sheet.icon} Подбор ${sheet.title}
                <button class="close-btn">&times;</button>
            </div>
            <div class="box-picker-form">
                <button class="back-btn">← Назад к выбору типа</button>
                ${imageHtml ? `<div class="product-image-container">${imageHtml}</div>` : ''}
                <div class="form-section">
                    <div class="section-title">Габариты изделия</div>
                    <div id="dimensions-container">
                        <div class="dimension-row">
                            <span class="dimension-label">${lbl.l} (мм)</span>
                            <input type="number" id="length" class="param-input" placeholder="${lbl.pl}">
                        </div>
                        <div class="dimension-row">
                            <span class="dimension-label">${lbl.w} (мм)</span>
                            <input type="number" id="width" class="param-input" placeholder="${lbl.pw}">
                        </div>
                        ${usesDepth ? `<div class="dimension-row">
                            <span class="dimension-label">${lbl.h} (мм)</span>
                            <input type="number" id="depth" class="param-input" placeholder="${lbl.ph}">
                        </div>` : ''}
                    </div>
                </div>
                <div class="form-section filter-spoiler">
                    <div class="section-title">Тип ${sheet.title}</div>
                    <button class="filter-toggle-btn" id="filter-toggle">
                        <span>🔍 Фильтр по типам</span>
                        <span class="filter-toggle-icon">▼</span>
                    </button>
                    <div class="filter-content" id="filter-content">
                        <div class="filter-content-inner">
                            <div id="types-container" class="types-container"></div>
                            <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                                <button type="button" id="select-all-types" style="background: none; border: none; color: #0091D3; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0 5px;">Выбрать все</button>
                                <span style="color: #ccc; margin: 0 5px;">|</span>
                                <button type="button" id="deselect-all-types" style="background: none; border: none; color: #0091D3; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0 5px;">Снять выделение</button>
                            </div>
                        </div>
                    </div>
                </div>
                <button id="submit-btn" class="submit-btn">Найти подходящие ${sheet.title}</button>
                <div id="result" class="result-section" style="display: none;"></div>
            </div>
        `;
        modal.appendChild(content);
        document.body.appendChild(modal);

        content.querySelector('.back-btn').addEventListener('click', () => { modal.remove(); openProductSelector(); });

        const types = [...new Set(allData.map(d => d.type))].filter(Boolean);
        const typesContainer = content.querySelector("#types-container");
        types.forEach(type => {
            const div = document.createElement("div");
            div.className = "type-checkbox";
            const safeId = `type-${type.replace(/\s+/g, '-')}`;
            div.innerHTML = `<input type="checkbox" name="type" value="${type}" id="${safeId}"><label for="${safeId}">${type}</label>`;
            const checkbox = div.querySelector("input");
            if (checkbox.checked) div.classList.add("checked");
            div.addEventListener("click", (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    div.classList.toggle("checked", checkbox.checked);
                }
            });
            checkbox.addEventListener("change", () => div.classList.toggle("checked", checkbox.checked));
            typesContainer.appendChild(div);
        });

        const filterToggle = content.querySelector("#filter-toggle");
        const filterContent = content.querySelector("#filter-content");
        const selectAllBtn = content.querySelector("#select-all-types");
        const deselectAllBtn = content.querySelector("#deselect-all-types");
        const typeCheckboxes = content.querySelectorAll("input[name=type]");

        if (filterToggle && filterContent) {
            filterToggle.addEventListener("click", () => {
                filterToggle.classList.toggle("active");
                filterContent.classList.toggle("expanded");
            });
        }
        if (selectAllBtn) selectAllBtn.addEventListener("click", (e) => {
            e.preventDefault();
            typeCheckboxes.forEach(cb => { cb.checked = true; cb.closest(".type-checkbox")?.classList.add("checked"); });
        });
        if (deselectAllBtn) deselectAllBtn.addEventListener("click", (e) => {
            e.preventDefault();
            typeCheckboxes.forEach(cb => { cb.checked = false; cb.closest(".type-checkbox")?.classList.remove("checked"); });
        });
        typeCheckboxes.forEach(cb => {
            cb.addEventListener("change", () => {
                if (filterContent && !filterContent.classList.contains("expanded")) {
                    filterToggle?.classList.add("active");
                    filterContent?.classList.add("expanded");
                }
            });
        });

        const createResultItem = (item, index, isOtherType = false) => {
            const lengthInputEl = document.getElementById("length");
            const widthInputEl = document.getElementById("width");
            const depthInputEl = document.getElementById("depth");
            const length = lengthInputEl ? parseFloat(lengthInputEl.value) || 0 : 0;
            const width = widthInputEl ? parseFloat(widthInputEl.value) || 0 : 0;
            const depth = depthInputEl ? parseFloat(depthInputEl.value) || 0 : 0;
            const lengthDiff = length - item.length;
            const widthDiff = width - item.width;
            let description = "", statusIcon = "✅";
            if (lengthDiff === 0 && widthDiff === 0) { description = "Размеры полностью совпадают"; statusIcon = "🎯"; }
            else {
                const differences = [];
                if (lengthDiff !== 0) differences.push(`длина ${lengthDiff > 0 ? "меньше" : "больше"} на ${Math.abs(lengthDiff)} мм`);
                if (widthDiff !== 0) differences.push(`ширина ${widthDiff > 0 ? "меньше" : "больше"} на ${Math.abs(widthDiff)} мм`);
                description = differences.join(", ");
            }
            const bestBadge = index === 0 ? '<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">ЛУЧШИЙ</span>' : '';
            const typeMismatchNotice = isOtherType ? '<div class="type-mismatch-notice">⚠️ Другой тип</div>' : '';
            const usesDepth = ['BOX', 'PACKAGE'].includes(currentProductType);
            let dimensionsHtml = `<strong>Размеры:</strong> ${item.length} × ${item.width} мм`;
            if (usesDepth) dimensionsHtml += ` × ${item.depth} мм`;

            const resultElement = document.createElement('div');
            resultElement.className = `result-item ${isOtherType ? 'other-type' : ''}`;
            resultElement.innerHTML = `
                <div class="result-header">${statusIcon} Штамп №${item.number} ${bestBadge}</div>
                <div class="result-details">${dimensionsHtml}<br><strong>Тип:</strong> ${item.type}</div>
                <div class="result-description">${description}</div>
                ${typeMismatchNotice}
                <div class="click-hint">💡 Нажмите, чтобы выбрать этот штамп</div>
                <button class="preview-btn" style="margin-top: 10px; background: none; color: #0091D3; border: none; padding: 0; font-size: 14px; cursor: pointer;">📷 <strong>Просмотр превью</strong> 📷</button>
            `;

            const previewBtn = resultElement.querySelector('.preview-btn');
            if (previewBtn) {
                previewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const stampNumber = item.number;
                    const cachedPreviews = JSON.parse(sessionStorage.getItem('stampPreviews') || '[]');
                    const preview = cachedPreviews.find(p => p.number === stampNumber);
                    if (preview) showPreviewModal(preview.url);
                    else alert("Превью не найдено");
                });
            }

            resultElement.addEventListener('click', () => {
                const inputField = document.querySelector("#UtList > div.input-group.inputcontainer > input");
                if (inputField) {
                    inputField.focus(); inputField.value = '';
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(() => {
                        const stampText = `Штамп №${item.number}`;
                        inputField.value = stampText;
                        inputField.dispatchEvent(new Event('input', { bubbles: true }));
                        inputField.dispatchEvent(new Event('change', { bubbles: true }));
                        const lastChar = String(item.number).slice(-1);
                        inputField.dispatchEvent(new KeyboardEvent('keyup', { key: lastChar, code: `Digit${lastChar}`, bubbles: true }));
                        setTimeout(() => inputField.blur(), 100);
                        showSuccessNotification(stampText);
                        setTimeout(() => modal.remove(), 500);
                    }, 100);
                }
            });
            return resultElement;
        };

        content.querySelector("#submit-btn").addEventListener("click", () => {
            const resultDiv = content.querySelector("#result");
            resultDiv.style.display = "block";
            resultDiv.innerHTML = `<div class="loading">🔍 Поиск подходящих ${sheet.title}...</div>`;
            setTimeout(() => {
                const length = parseFloat(document.getElementById("length").value) || 0;
                const width = parseFloat(document.getElementById("width").value) || 0;
                const depth = usesDepth ? parseFloat(document.getElementById("depth").value) || 0 : 0;
                if (length <= 0 || width <= 0 || (usesDepth && depth <= 0)) {
                    resultDiv.innerHTML = `<div class="no-results"><div style="font-size: 48px; margin-bottom: 20px;">⚠️</div><div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Некорректные размеры</div><div>Пожалуйста, введите положительные значения для всех размеров</div></div>`;
                    return;
                }
                const selectedTypes = Array.from(document.querySelectorAll("input[name=type]:checked")).map(cb => cb.value);
                const currentTolerances = TOLERANCES[productType];
                const exactMatches = allData.filter(item => {
                    if (selectedTypes.length && !selectedTypes.includes(item.type)) return false;
                    if (usesDepth) {
                        return (item.length >= length - currentTolerances.MINUS && item.length <= length + currentTolerances.PLUS &&
                                item.width >= width - currentTolerances.MINUS && item.width <= width + currentTolerances.PLUS &&
                                item.depth >= depth - currentTolerances.MINUS && item.depth <= depth + currentTolerances.PLUS);
                    } else {
                        return (item.length >= length - currentTolerances.MINUS && item.length <= length + currentTolerances.PLUS &&
                                item.width >= width - currentTolerances.MINUS && item.width <= width + currentTolerances.PLUS);
                    }
                });
                const otherMatches = selectedTypes.length > 0 ? allData.filter(item => {
                    if (selectedTypes.includes(item.type)) return false;
                    if (usesDepth) {
                        return (item.length >= length - currentTolerances.MINUS && item.length <= length + currentTolerances.PLUS &&
                                item.width >= width - currentTolerances.MINUS && item.width <= width + currentTolerances.PLUS &&
                                item.depth >= depth - currentTolerances.MINUS && item.depth <= depth + currentTolerances.PLUS);
                    } else {
                        return (item.length >= length - currentTolerances.MINUS && item.length <= length + currentTolerances.PLUS &&
                                item.width >= width - currentTolerances.MINUS && item.width <= width + currentTolerances.PLUS);
                    }
                }) : [];
                if (exactMatches.length === 0 && otherMatches.length === 0) {
                    resultDiv.innerHTML = `<div class="no-results"><div style="font-size: 48px; margin-bottom: 20px;">${sheet.icon}</div><div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Подходящие ${sheet.title} не найдены</div><div>Попробуйте изменить параметры поиска или выбрать другие типы</div></div>`;
                    return;
                }
                const sortByCloseness = (items) => items.sort((a, b) => {
                    const diffA = Math.abs(a.length - length) + Math.abs(a.width - width) + (usesDepth ? Math.abs(a.depth - depth) : 0);
                    const diffB = Math.abs(b.length - length) + Math.abs(b.width - width) + (usesDepth ? Math.abs(b.depth - depth) : 0);
                    return diffA - diffB;
                });
                const sortedExactMatches = sortByCloseness([...exactMatches]);
                const sortedOtherMatches = sortByCloseness([...otherMatches]);
                resultDiv.innerHTML = '';
                const resultsContainer = document.createElement('div');
                resultsContainer.className = 'results-container';
                if (sortedExactMatches.length > 0) {
                    const exactGroup = document.createElement('div');
                    exactGroup.className = 'results-group';
                    const typeText = selectedTypes.length > 0 ? `по выбранным типам (${selectedTypes.join(', ')})` : 'по всем типам';
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'results-group-title exact-match';
                    titleDiv.innerHTML = `✅ Найдено ${typeText}: ${sortedExactMatches.length}`;
                    exactGroup.appendChild(titleDiv);
                    sortedExactMatches.forEach((item, index) => exactGroup.appendChild(createResultItem(item, index, false)));
                    resultsContainer.appendChild(exactGroup);
                }
                if (sortedOtherMatches.length > 0) {
                    const otherGroup = document.createElement('div');
                    otherGroup.className = 'results-group';
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'results-group-title other-types';
                    titleDiv.innerHTML = `🔄 Подходящие ${sheet.title} других типов: ${sortedOtherMatches.length}`;
                    otherGroup.appendChild(titleDiv);
                    sortedOtherMatches.forEach((item, index) => otherGroup.appendChild(createResultItem(item, index, true)));
                    resultsContainer.appendChild(otherGroup);
                }
                resultDiv.appendChild(resultsContainer);
            }, 500);
        });

        const closeModal = () => modal.remove();
        content.querySelector(".close-btn").addEventListener("click", closeModal);
        modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
        const handleEscape = (e) => {
            if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", handleEscape); }
        };
        document.addEventListener("keydown", handleEscape);
    }

    function init() {
        console.log('[SmartSearch] 🔍 Инициализация модуля...');
        checkAndAddButton();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') checkAndAddButton();
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        initRubricatorPreviewCache();
        console.log('[SmartSearch] ✅ Модуль инициализирован, наблюдатель запущен');
    }

    // ─────────────────────────────────────────────
    // 🚀 ЗАПУСК (сразу, без обёртки-функции)
    // ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(
    // Аргументы подставит загрузчик основного userscript
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);