(function(config, GM, utils) {
    'use strict';

    // 🔥 Проверка зависимостей (сразу в начале)
    if (!GM || !GM.xmlhttpRequest) {
        console.warn('[ConfidAgree] ⚠️ Запущен без полного GM API (работает в ограниченном режиме)');
    }
    console.log('[ConfidAgree] 🚀 Модуль запущен');

    let warningButton = null;
    let popupElement = null;
    let warningShown = false;
    let warningTimer = null;
    let elementsDetected = false;

    // ─────────────────────────────────────────────
    // Добавление стилей
    // ─────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('confidagree-styles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'confidagree-styles';
        styleElement.innerHTML = `
            /* Стили для кнопки предупреждения */
            .axiom-warning-button {
                position: fixed; bottom: 0; left: 0; right: 0; height: 50vh;
                background-color: transparent !important; color: white !important;
                font-size: 24px; border: none !important; cursor: pointer;
                z-index: 9999; text-align: center; box-shadow: none !important;
                outline: none !important;
            }
            .axiom-warning-button:hover {
                background-color: transparent !important; color: red !important;
                box-shadow: none !important;
            }

            /* Стили для всплывающего окна */
            .axiom-popup {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%); width: 80%; max-width: 600px;
                background-color: white; padding: 20px; border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); z-index: 10000;
            }
            .axiom-popup-header {
                font-size: 24px; font-weight: bold; margin-bottom: 20px;
                color: red; text-align: center;
            }
            .axiom-popup-content {
                font-size: 16px; margin-bottom: 20px; text-align: center;
            }

            /* Стили для чекбокса и текста соглашения */
            .axiom-checkbox-container {
                display: flex !important; align-items: center !important;
                justify-content: center !important; gap: 10px !important;
                margin: 20px 0 !important;
            }
            input[type="checkbox"] {
                width: 13px; height: 13px; accent-color: #aaa; cursor: pointer;
            }
            .axiom-agreement-text {
                font-size: 16px; color: #aaa; white-space: nowrap;
            }
            .axiom-agreement-text.active { color: black; }

            /* Стили для кнопки "Войти" */
            .axiom-enter-button {
                display: block; margin: 0 auto; padding: 10px 20px;
                background-color: #4CAF50; color: white; border: none;
                border-radius: 5px; cursor: pointer; font-size: 16px;
                opacity: 0.5; pointer-events: none;
                transition: opacity 0.3s, background-color 0.3s;
            }
            .axiom-enter-button.visible {
                opacity: 1; pointer-events: auto;
            }
            .axiom-enter-button:hover { background-color: #45a049; }

            /* Стили для ссылки на соглашение */
            .axiom-agreement-link {
                color: blue; text-decoration: underline; cursor: pointer;
            }
        `;
        document.head.appendChild(styleElement);
        console.log('[ConfidAgree] ✅ Стили добавлены');
    }

    // ─────────────────────────────────────────────
    // Создание кнопки предупреждения
    // ─────────────────────────────────────────────
    function createWarningButton() {
        if (warningButton || warningShown) return;

        warningButton = document.createElement('button');
        warningButton.className = 'axiom-warning-button';
        warningButton.textContent = ''; // Пустая кнопка-оверлей
        warningButton.addEventListener('click', showPopup);
        document.body.appendChild(warningButton);
        console.log('[ConfidAgree] ✅ Кнопка предупреждения создана');
    }

    // ─────────────────────────────────────────────
    // Показ всплывающего окна
    // ─────────────────────────────────────────────
    function showPopup() {
        if (popupElement) return;

        popupElement = document.createElement('div');
        popupElement.className = 'axiom-popup';
        popupElement.innerHTML = `
            <div class="axiom-popup-header">Согласие о конфиденциальности</div>
            <p class="axiom-popup-content">
                Вся информация, доступная при входе в систему "Axiom", является конфиденциальной и составляет коммерческую тайну ООО "Линк".
            </p>
            <div class="axiom-checkbox-container">
                <input type="checkbox" id="axiom-agreement-checkbox">
                <label for="axiom-agreement-checkbox" class="axiom-agreement-text">С вышеописанным ознакомлен и согласен</label>
            </div>
            <button id="axiom-enter-button" class="axiom-enter-button">Войти</button>
        `;
        document.body.appendChild(popupElement);

        const checkbox = document.getElementById('axiom-agreement-checkbox');
        const agreementText = document.querySelector('.axiom-agreement-text');
        const enterButton = document.getElementById('axiom-enter-button');

        // Обработка состояния чекбокса
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                agreementText.classList.add('active');
                enterButton.classList.add('visible');
            } else {
                agreementText.classList.remove('active');
                enterButton.classList.remove('visible');
            }
        });

        // Обработка клика по кнопке "Войти"
        enterButton.addEventListener('click', function () {
            if (enterButton.classList.contains('visible')) {
                const loginButton = document.querySelector("body > table > tbody > tr:nth-child(2) > td > div > form > div > div:nth-child(5) > button");
                if (loginButton) {
                    console.log('[ConfidAgree] ✅ Клик по кнопке входа');
                    loginButton.click();
                } else {
                    console.warn('[ConfidAgree] ⚠️ Кнопка входа не найдена');
                }
                document.body.removeChild(popupElement);
                if (warningButton && warningButton.parentNode) {
                    document.body.removeChild(warningButton);
                }
                popupElement = null;
                warningButton = null;
                warningShown = true;
                console.log('[ConfidAgree] ✅ Окно закрыто, предупреждение показано');
            }
        });
        
        console.log('[ConfidAgree] ✅ Popup показан');
    }

    // ─────────────────────────────────────────────
    // Проверить наличие элементов (логотип + текст)
    // ─────────────────────────────────────────────
    function checkElements() {
        if (warningShown) return;

        const logo = document.querySelector('img[src*="img/ax/axlogotrans.png"]');
        const textElement = document.querySelector('body > table > tbody > tr:nth-child(3) > td > p');
        const hasText = textElement && textElement.textContent.includes('Система управления полиграфическим производством');

        // Элементы обнаружены → показываем предупреждение
        if (logo && hasText) {
            if (!elementsDetected) {
                elementsDetected = true;
                console.log('[ConfidAgree] 🔍 Страница входа обнаружена');
                createWarningButton();
            }
        }
        // Элементы исчезли → возможно, пользователь ушёл со страницы входа
        else if (elementsDetected) {
            elementsDetected = false;
            console.log('[ConfidAgree] 🔍 Элементы входа исчезли');

            // Запускаем таймер на удаление кнопки, если она ещё висит
            if (!warningTimer && warningButton && !popupElement) {
                warningTimer = setTimeout(() => {
                    const logoNow = document.querySelector('img[src*="img/ax/axlogotrans.png"]');
                    const textNow = document.querySelector('body > table > tbody > tr:nth-child(3) > td > p');
                    
                    if (!logoNow && !textNow && warningButton && !popupElement) {
                        if (warningButton.parentNode) {
                            document.body.removeChild(warningButton);
                            warningButton = null;
                            console.log('[ConfidAgree] 🗑️ Кнопка предупреждения удалена');
                        }
                    }
                    warningTimer = null;
                }, 10000);
            }
        }
    }

    // ─────────────────────────────────────────────
    // Инициализация скрипта
    // ─────────────────────────────────────────────
    function initScript() {
        injectStyles();

        const observer = new MutationObserver((mutations) => {
            if (document.visibilityState === 'visible') {
                checkElements();
            }
        });

        observer.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['src', 'textContent']
        });

        // Первичная проверка
        checkElements();

        // Проверка при возврате вкладки в фокус
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkElements();
            }
        });
        
        console.log('[ConfidAgree] ✅ Наблюдатель DOM запущен');
    }

    // ─────────────────────────────────────────────
    // 🚀 ЗАПУСК (сразу, без обёртки-функции)
    // ─────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

})(
    // Аргументы подставит загрузчик основного userscript
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);