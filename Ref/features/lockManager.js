(function(config, GM, utils) {
    'use strict';

    // 🔥 Проверка зависимостей
    if (!GM || !GM.xmlhttpRequest) {
        console.warn('[LockManager] ⚠️ Запущен без полного GM API (работает в ограниченном режиме)');
    }
    console.log('[LockManager] 🚀 Модуль запущен');

    // Селекторы для блокировки элементов
    const selector1 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > div";
    const contractInputSelector = "#Top > form > div > div > div > input.ProductName.form-control";
    const selector2 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div";
    const selector3 = "#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(3) > tr:nth-child(4) > td:nth-child(2) > table > tbody > tr > td:nth-child(1) > div";

    // Другие селекторы
    const buttonToRemove = "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)";
    const timeFilesRow = "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo";
    const paySchemaImage = "#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img[src*='payschema-4.png']";
    const hiddenButtonInRow = "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button";
    const triggerButtonSelector = "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button";
    const rightContainerSelector = "#Summary > table > tbody > tr > td:nth-child(1) > div.right";
    const regButtonSelector = "#RegButton";
    const hideConditionSelector = "#History > table:nth-child(1) > tbody > tr:nth-child(4) > td.right.bold";

    let isChecking = false;

    // ─────────────────────────────────────────────
    // Функция блокировки элемента
    // ─────────────────────────────────────────────
    function blockElement(element) {
        if (!element || element.blocked) return;
        element.blocked = true;
        element.style.pointerEvents = 'none';
        element.style.userSelect = 'none';
        element.style.opacity = '0.6';
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            child.style.pointerEvents = 'none';
            child.style.userSelect = 'none';
        });
    }

    // ─────────────────────────────────────────────
    // Функция разблокировки элемента
    // ─────────────────────────────────────────────
    function unblockElement(element) {
        if (!element || !element.blocked) return;
        element.blocked = false;
        element.style.pointerEvents = '';
        element.style.userSelect = '';
        element.style.opacity = '';
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            child.style.pointerEvents = '';
            child.style.userSelect = '';
        });
    }

    // ─────────────────────────────────────────────
    // Основная функция проверки и блокировки
    // ─────────────────────────────────────────────
    function checkAndBlockElements() {
        if (isChecking) return;
        isChecking = true;
        try {
            // Проверяем наличие "Договор №" в поле ввода
            const contractInput = document.querySelector(contractInputSelector);
            const hasContractNumber = contractInput && contractInput.value.includes("Договор №");

            // Получаем целевые элементы
            const target1 = document.querySelector(selector1);
            const target2 = document.querySelector(selector2);
            const target3 = document.querySelector(selector3);

            if (hasContractNumber) {
                // === Если есть "Договор №" — блокируем ВСЕ три селектора ===
                if (target1 && !target1.blocked) blockElement(target1);
                if (target2 && !target2.blocked) blockElement(target2);
                if (target3 && !target3.blocked) blockElement(target3);
            } else {
                // === Если "Договор №" отсутствует — применяем логику со статусом ===
                const statusImage = document.querySelector("#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img");
                const isCalcStatus = statusImage && statusImage.src && statusImage.src.includes('status-calc.png');

                if (target1) {
                    if (!isCalcStatus) {
                        if (!target1.blocked) blockElement(target1);
                    } else {
                        if (target1.blocked) unblockElement(target1);
                    }
                }

                // selector2 и selector3 разблокируются, если нет "Договор №"
                if (target2 && target2.blocked) unblockElement(target2);
                if (target3 && target3.blocked) unblockElement(target3);
            }

            // Удаляем лишнюю кнопку
            const btnToRemove = document.querySelector(buttonToRemove);
            if (btnToRemove) {
                btnToRemove.remove();
            }

            // === Скрытие строки по заданному селектору ===
            const rowToHide = document.querySelector(
                "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(5)"
            );
            if (rowToHide) {
                rowToHide.style.display = 'none';
            }

            // === Скрытие строки с td.BuhComment ===
            const buhCommentRow = document.querySelector("td.BuhComment")?.closest("tr");
            if (buhCommentRow) {
                buhCommentRow.style.display = 'none';
            }

            // Логика работы с PaySchemaIcon и фин.стопом
            const image = document.querySelector(paySchemaImage);
            const container = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table > tbody");

            if (image) {
                const oldWorkBtn = document.getElementById('workWithFilesBtn');
                if (oldWorkBtn) oldWorkBtn.remove();

                if (!document.getElementById('financialStopBtn')) {
                    const financialStopBtn = document.createElement('tr');
                    financialStopBtn.id = 'financialStopBtn';
                    financialStopBtn.innerHTML = `<td colspan="2">
                        <button style="
                            -webkit-text-size-adjust: 100%;
                            -webkit-tap-highlight-color: rgba(0,0,0,0);
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            line-height: 1.42857143;
                            font-size: 14px;
                            border-spacing: 0;
                            border-collapse: collapse;
                            box-sizing: border-box;
                            border: solid 1px #a90000;
                            background-color: #ff0000;
                            color: #ffffff;
                            text-align: center;
                            padding: 6px 12px;
                            margin: 10px 0;
                            width: 100%;
                            display: block;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">Фин.стоп</button>
                    </td>`;
                    container.appendChild(financialStopBtn);
                }
            } else {
                const oldFinBtn = document.getElementById('financialStopBtn');
                if (oldFinBtn) oldFinBtn.remove();

                const regButton = document.querySelector(regButtonSelector);
                const rightDiv = document.querySelector(rightContainerSelector);
                const hideConditionEl = document.querySelector(hideConditionSelector);
                const hideCondition = hideConditionEl && hideConditionEl.querySelector('nobr')?.textContent.trim() !== '';
                const shouldShowWorkButton = regButton && !hideCondition;

                if (shouldShowWorkButton && !document.getElementById('workWithFilesBtn') && rightDiv) {
                    const workBtn = document.createElement('button');
                    workBtn.id = 'workWithFilesBtn';
                    workBtn.textContent = 'Файлы получены';
                    Object.assign(workBtn.style, {
                        '-webkit-text-size-adjust': '100%',
                        '-webkit-tap-highlight-color': 'rgba(0,0,0,0)',
                        'box-sizing': 'border-box',
                        'font': 'inherit',
                        'text-transform': 'none',
                        'font-family': 'inherit',
                        'display': 'inline-block',
                        'font-weight': '400',
                        'textAlign': 'center',
                        'white-space': 'nowrap',
                        'vertical-align': 'middle',
                        'touch-action': 'manipulation',
                        'cursor': 'pointer',
                        'user-select': 'none',
                        'border': '1px solid transparent',
                        'color': '#fff',
                        'background-color': '#5cb85c',
                        'padding': '10px 16px',
                        'font-size': '18px',
                        'line-height': '1.3333333',
                        'border-radius': '6px',
                        'text-shadow': '0 -1px 0 rgba(0,0,0,.2)',
                        'boxShadow': 'inset 0 1px 0 rgba(255,255,255,.15), 0 1px 1px rgba(0,0,0,.075)',
                        'background-image': 'linear-gradient(to bottom,#5cb85c 0,#419641 100%)',
                        'background-repeat': 'repeat-x',
                        'border-color': '#3e8f3e',
                        'position': 'relative',
                        'margin-left': '10px'
                    });

                    workBtn.addEventListener('click', () => {
                        const hiddenBtn = document.querySelector(hiddenButtonInRow);
                        if (hiddenBtn) hiddenBtn.click();
                    });

                    const existingButton = document.querySelector(triggerButtonSelector);
                    if (existingButton) {
                        existingButton.parentNode.insertBefore(workBtn, existingButton.nextSibling);
                    } else if (rightDiv) {
                        rightDiv.appendChild(workBtn);
                    }
                }
            }

            // Логика отображения/скрытия TimeFilesInfo
            const rowToShow = document.querySelector(timeFilesRow);
            if (rowToShow) {
                const hasWorkButton = !!document.querySelector("#workWithFilesBtn");
                const paySchemaExists = !!document.querySelector(paySchemaImage);
                const historyConditionEl = document.querySelector("#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold");
                const hasHistoryText = historyConditionEl && historyConditionEl.querySelector('nobr')?.textContent.trim() !== '';
                rowToShow.style.display = hasWorkButton || (!paySchemaExists && hasHistoryText) ? '' : 'none';
            }

        } catch (e) {
            console.warn('[LockManager] Ошибка в checkAndBlockElements:', e);
        } finally {
            isChecking = false;
        }
    }

    // ─────────────────────────────────────────────
    // Инициализация скрипта
    // ─────────────────────────────────────────────
    function initScript() {
        // Наблюдатель за изменениями DOM
        const observer = new MutationObserver(checkAndBlockElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Первичная проверка
        checkAndBlockElements();
        
        console.log('[LockManager] ✅ Наблюдатель DOM запущен');
    }

    // ─────────────────────────────────────────────
    // 🚀 ЗАПУСК
    // ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

})(
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);
