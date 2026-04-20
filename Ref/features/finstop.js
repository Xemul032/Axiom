(function(config, GM, utils) {
    'use strict';

    // ====== ВСТАВЬ СЮДА URL СВОЕГО GOOGLE APPS SCRIPT ======
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwxq1vMGRUULtSFXom-GKG5LFfxewFBR1HVMW6NozCp2qG5q_AJiupshXT_W0PjWbQ/exec';
    // ========================================================

    const PAY_ICON_SELECTOR = '#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img';
    const PAY_ICON_SRC = '/axiom/img/payschema/payschema-1.png';
    const SUMMARY_TABLE_SELECTOR = '#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button';
    const PRODUCT_ID_SELECTOR = '#ProductId';
    const USERNAME_SELECTOR = 'body > ul > div > li:nth-child(1) > a';
    const WORK_WITH_FILES_BTN_SELECTOR = '#workWithFilesBtn';
    const LOADING_INDICATOR_SELECTOR = '#DocLoadingIndicator';

    let finStopActive = false;
    let finStopContainer = null;
    let shadowRoot = null;
    let modalContainer = null;
    let dismissedProductId = null;
    let observer = null;
    let isPageLoading = false;

    // ─────────────────────────────────────────────
    // Проверка зависимостей (сразу в начале)
    // ─────────────────────────────────────────────
    if (!GM || !GM.xmlhttpRequest) {
        console.error('[FinStop] ❌ GM API не передан. Модуль не может работать.');
        return;
    }
    if (!utils || !utils.$) {
        console.warn('[FinStop] ⚠️ jQuery не передан, некоторые функции могут не работать');
    }
    console.log('[FinStop] 🚀 Модуль запущен, зависимости получены');

    // ─────────────────────────────────────────────
    // Отслеживание состояния загрузки страницы
    // ─────────────────────────────────────────────
    function checkLoadingState() {
        const indicator = document.querySelector(LOADING_INDICATOR_SELECTOR);
        if (!indicator) return false;
        return indicator.classList.contains('is-visible');
    }

    function handleLoadingStateChange() {
        const nowLoading = checkLoadingState();
        if (nowLoading && !isPageLoading) {
            isPageLoading = true;
            console.log('[FinStop] Страница начала обновляться');
        } else if (!nowLoading && isPageLoading) {
            isPageLoading = false;
            console.log('[FinStop] Страница загрузилась, перезапуск проверки');
            setTimeout(() => {
                resetFinStopState();
                checkPayIcon();
            }, 300);
        }
    }

    // ─────────────────────────────────────────────
    // Сброс состояния фин.стопа
    // ─────────────────────────────────────────────
    function resetFinStopState() {
        if (finStopContainer && finStopContainer.parentNode) {
            finStopContainer.parentNode.removeChild(finStopContainer);
        }
        const orphan = document.getElementById('finstop-block');
        if (orphan && orphan.parentNode) {
            orphan.parentNode.removeChild(orphan);
        }
        finStopContainer = null;
        finStopActive = false;
    }

    // ─────────────────────────────────────────────
    // Инициализация Shadow DOM для модалок
    // ─────────────────────────────────────────────
    function initShadowHost() {
        if (!document.body) return false;
        if (document.getElementById('finstop-modal-host')) return true;

        const modalHost = document.createElement('div');
        modalHost.id = 'finstop-modal-host';
        document.body.appendChild(modalHost);
        shadowRoot = modalHost.attachShadow({ mode: 'open' });

        const shadowStyles = document.createElement('style');
        shadowStyles.textContent = `
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.55); display: flex;
                align-items: center; justify-content: center;
                z-index: 2147483647; animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideIn { from { transform: translateY(-30px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            .modal-overlay.closing { animation: fadeOut 0.2s ease forwards; }
            .modal-box {
                background: #ffffff; border-radius: 16px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
                padding: 36px 40px 28px; max-width: 480px; width: 90%;
                animation: slideIn 0.3s ease; position: relative;
            }
            .modal-box.closing { animation: fadeOut 0.2s ease forwards; }
            .modal-icon {
                width: 56px; height: 56px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 20px; font-size: 28px;
            }
            .modal-icon.warning { background: #FFF3E0; color: #E65100; }
            .modal-icon.error { background: #FFEBEE; color: #C62828; }
            .modal-icon.success { background: #E8F5E9; color: #2E7D32; }
            .modal-icon.loading { background: #E3F2FD; color: #1565C0; }
            .modal-title {
                font-size: 20px; font-weight: 700; color: #1a1a1a;
                text-align: center; margin-bottom: 12px;
            }
            .modal-text {
                font-size: 15px; color: #555; text-align: center;
                line-height: 1.6; margin-bottom: 28px;
            }
            .modal-buttons { display: flex; gap: 12px; justify-content: center; }
            .modal-btn {
                padding: 11px 32px; border-radius: 10px; font-size: 15px;
                font-weight: 600; cursor: pointer; border: none;
                transition: all 0.2s ease; min-width: 120px;
            }
            .modal-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .modal-btn:active { transform: translateY(0); }
            .btn-ok { background: linear-gradient(135deg, #1976D2, #1565C0); color: #fff; }
            .btn-ok:hover { background: linear-gradient(135deg, #1565C0, #0D47A1); }
            .btn-cancel { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
            .btn-cancel:hover { background: #eee; }
            .btn-danger-ok { background: linear-gradient(135deg, #E53935, #C62828); color: #fff; }
            .btn-success-ok { background: linear-gradient(135deg, #43A047, #2E7D32); color: #fff; }
            .spinner {
                width: 48px; height: 48px; border: 4px solid #E3F2FD;
                border-top: 4px solid #1976D2; border-radius: 50%;
                animation: spin 0.8s linear infinite; margin: 0 auto 20px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .progress-bar-container {
                width: 100%; height: 6px; background: #e0e0e0;
                border-radius: 3px; margin-bottom: 20px; overflow: hidden;
            }
            .progress-bar-fill {
                height: 100%; background: linear-gradient(90deg, #1976D2, #42A5F5);
                border-radius: 3px; width: 0%; transition: width 0.4s ease;
            }
        `;
        shadowRoot.appendChild(shadowStyles);

        modalContainer = document.createElement('div');
        modalContainer.id = 'finstop-modal-container';
        shadowRoot.appendChild(modalContainer);

        return true;
    }

    if (!initShadowHost()) {
        const bodyWaiter = setInterval(() => {
            if (initShadowHost()) clearInterval(bodyWaiter);
        }, 100);
    }

    // ─────────────────────────────────────────────
    // Утилиты модалок
    // ─────────────────────────────────────────────
    function showModal(content) {
        if (!modalContainer) return;
        modalContainer.innerHTML = '';
        modalContainer.appendChild(content);
    }

    function closeModal() {
        return new Promise((resolve) => {
            if (!modalContainer) { resolve(); return; }
            const overlay = modalContainer.querySelector('.modal-overlay');
            if (overlay) {
                overlay.classList.add('closing');
                const box = overlay.querySelector('.modal-box');
                if (box) box.classList.add('closing');
                setTimeout(() => {
                    if (modalContainer) modalContainer.innerHTML = '';
                    resolve();
                }, 200);
            } else {
                modalContainer.innerHTML = '';
                resolve();
            }
        });
    }

    function buildOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const box = document.createElement('div');
        box.className = 'modal-box';
        overlay.appendChild(box);
        return { overlay, box };
    }

    // ─────────────────────────────────────────────
    // Проверка совпадения менеджера с аккаунтом
    // ─────────────────────────────────────────────
    function getManagerLastName() {
        const brakBlock = document.querySelector('#BrakBlock');
        const selector = brakBlock
            ? '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > div > a > span'
            : '.chosen-single > span';
        const span = document.querySelector(selector);
        if (!span) return '';
        const fullText = span.textContent.trim();
        if (!fullText) return '';
        const words = fullText.split(/\s+/).filter(w => w.length > 0);
        return words.length > 0 ? words[words.length - 1] : '';
    }

    function getTopMenuFirstWord() {
        const el = document.querySelector(USERNAME_SELECTOR);
        if (!el) return '';
        const fullText = el.textContent.trim();
        if (!fullText) return '';
        const words = fullText.split(/\s+/).filter(w => w.length > 0);
        return words.length > 0 ? words[0] : '';
    }

    function isManagerMatchesAccount() {
        const managerLastName = getManagerLastName();
        const accountFirstWord = getTopMenuFirstWord();
        if (!managerLastName || !accountFirstWord) return true;
        return managerLastName.toLowerCase() === accountFirstWord.toLowerCase();
    }

    // ─────────────────────────────────────────────
    // Модалки
    // ─────────────────────────────────────────────
    function showManagerMismatchModal() {
        const { overlay, box } = buildOverlay();
        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '🚫';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Ошибка!';
        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Имя менеджера не совпадает с аккаунтом!';
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());
        buttons.appendChild(okBtn);
        box.appendChild(icon); box.appendChild(title); box.appendChild(text); box.appendChild(buttons);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
        showModal(overlay);
    }

    function showConfirmModal() {
        if (!isManagerMatchesAccount()) { showManagerMismatchModal(); return; }
        const { overlay, box } = buildOverlay();
        const icon = document.createElement('div');
        icon.className = 'modal-icon warning';
        icon.textContent = '⚠️';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Снятие с фин. стопа';
        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Снимая заказ с фин. стопа, Вы подтверждаете, что платёж поступит в течении трёх рабочих дней.';
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn btn-cancel';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.addEventListener('click', () => closeModal());
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', handleOk); // ← handleOk использует замыкание на GM, utils
        buttons.appendChild(cancelBtn); buttons.appendChild(okBtn);
        box.appendChild(icon); box.appendChild(title); box.appendChild(text); box.appendChild(buttons);
        showModal(overlay);
    }

    function showLoadingModal(text) {
        const { overlay, box } = buildOverlay();
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = text;
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-bar-container';
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-bar-fill';
        progressFill.id = 'fs-progress';
        progressContainer.appendChild(progressFill);
        const sub = document.createElement('div');
        sub.className = 'modal-text';
        sub.id = 'fs-loading-sub';
        sub.style.cssText = 'margin-bottom:0;color:#888;font-size:13px;';
        sub.textContent = 'Пожалуйста, подождите...';
        box.appendChild(spinner); box.appendChild(title); box.appendChild(progressContainer); box.appendChild(sub);
        showModal(overlay);
    }

    function setProgress(percent, subText) {
        if (!shadowRoot) return;
        const bar = shadowRoot.getElementById('fs-progress');
        const sub = shadowRoot.getElementById('fs-loading-sub');
        if (bar) bar.style.width = percent + '%';
        if (sub && subText) sub.textContent = subText;
    }

    function showSuccessModal() {
        const { overlay, box } = buildOverlay();
        const icon = document.createElement('div');
        icon.className = 'modal-icon success';
        icon.textContent = '✅';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Готово!';
        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Заказ успешно снят с фин. стопа. Данные записаны в таблицу.';
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        const doneBtn = document.createElement('button');
        doneBtn.className = 'modal-btn btn-success-ok';
        doneBtn.textContent = 'Ок';
        doneBtn.addEventListener('click', async () => {
            const { productId } = collectData();
            dismissedProductId = productId;
            restoreSummaryTable();
            await closeModal();
        });
        buttons.appendChild(doneBtn);
        box.appendChild(icon); box.appendChild(title); box.appendChild(text); box.appendChild(buttons);
        showModal(overlay);
    }

    function showErrorModal(message) {
        const { overlay, box } = buildOverlay();
        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '🚫';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Ошибка';
        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = message;
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());
        buttons.appendChild(okBtn);
        box.appendChild(icon); box.appendChild(title); box.appendChild(text); box.appendChild(buttons);
        showModal(overlay);
    }

    function showBlacklistModal() {
        const { overlay, box } = buildOverlay();
        const icon = document.createElement('div');
        icon.className = 'modal-icon error';
        icon.textContent = '⛔';
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Доступ запрещён';
        const text = document.createElement('div');
        text.className = 'modal-text';
        text.textContent = 'Вы в чёрном списке! Для снятия заказа с фин. стопа обратитесь к коммерческому директору!';
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-danger-ok';
        okBtn.textContent = 'Ок';
        okBtn.addEventListener('click', () => closeModal());
        buttons.appendChild(okBtn);
        box.appendChild(icon); box.appendChild(title); box.appendChild(text); box.appendChild(buttons);
        showModal(overlay);
    }

    // ─────────────────────────────────────────────
    // Сбор данных
    // ─────────────────────────────────────────────
    function collectData() {
        const productIdEl = document.querySelector(PRODUCT_ID_SELECTOR);
        const usernameEl = document.querySelector(USERNAME_SELECTOR);
        const productId = productIdEl ? (productIdEl.value || productIdEl.textContent.trim()) : '';
        let username = '';
        if (usernameEl) {
            const fullText = usernameEl.textContent.trim();
            username = fullText.split(/\s+/)[0];
        }
        return { productId, username };
    }

    function getCurrentProductId() {
        const el = document.querySelector(PRODUCT_ID_SELECTOR);
        return el ? (el.value || el.textContent.trim()) : '';
    }

    // ─────────────────────────────────────────────
    // API запросы (используют переданный GM объект)
    // ─────────────────────────────────────────────
    function checkBlacklist(username) {
        return new Promise((resolve, reject) => {
            GM.xmlhttpRequest({
                method: 'GET',
                url: GAS_URL,
                anonymous: true,
                onload: function (response) {
                    try {
                        let names = [];
                        const text = response.responseText.trim();
                        try {
                            const json = JSON.parse(text);
                            if (Array.isArray(json)) {
                                names = json.map(item => {
                                    if (typeof item === 'string') return item.trim().toLowerCase();
                                    if (item && item.name) return item.name.trim().toLowerCase();
                                    return '';
                                });
                            }
                        } catch (_jsonErr) {
                            if (!text) { resolve(false); return; }
                            const rows = text.split('\n');
                            for (const row of rows) {
                                const cols = row.split(',');
                                for (const col of cols) {
                                    const val = col.trim().toLowerCase();
                                    if (val) names.push(val);
                                }
                            }
                        }
                        const found = names.includes(username.toLowerCase());
                        resolve(found);
                    } catch (e) {
                        console.error('FinStop blacklist parse error:', e);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error('FinStop blacklist request error:', err);
                    reject(err);
                }
            });
        });
    }

    function writeToSheet(productId, username) {
        return new Promise((resolve, reject) => {
            GM.xmlhttpRequest({
                method: 'POST',
                url: GAS_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ productId, username }),
                anonymous: true,
                onload: function (response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.status === 'ok') {
                            resolve();
                        } else {
                            console.warn('FinStop write unexpected response:', result);
                            reject(new Error(result.message || 'Unexpected response'));
                        }
                    } catch (e) {
                        console.error('FinStop write parse error:', e, response.responseText);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error('FinStop write request error:', err);
                    reject(err);
                }
            });
        });
    }

    // ─────────────────────────────────────────────
    // Смена схемы оплаты на "Кредит"
    // ─────────────────────────────────────────────
    function changePaySchemaToCredit() {
        const PAY_SCHEMA_SELECT_SELECTOR = 'select[onchange*="PaySchema"]';
        const select = document.querySelector(PAY_SCHEMA_SELECT_SELECTOR);
        if (select) {
            select.value = "3";
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('[FinStop] Схема оплаты изменена на "Кредит"');
            return true;
        }
        console.warn('[FinStop] Не удалось найти select схемы оплаты');
        return false;
    }

    // ─────────────────────────────────────────────
    // Обработчик кнопки "Ок" (использует замыкание на GM, utils)
    // ─────────────────────────────────────────────
    async function handleOk() {
        const { productId, username } = collectData();
        if (!productId || !username) {
            showErrorModal('Не удалось собрать данные со страницы. Проверьте наличие ProductId и имени пользователя.');
            return;
        }
        showLoadingModal('Проверка доступа...');
        setProgress(20, 'Проверка чёрного списка...');
        try {
            const isBlacklisted = await checkBlacklist(username);
            setProgress(50, 'Проверка завершена');
            if (isBlacklisted) {
                setTimeout(() => showBlacklistModal(), 400);
                return;
            }
            setProgress(60, 'Запись данных в таблицу...');
            await new Promise(r => setTimeout(r, 300));
            showLoadingModal('Сохранение данных...');
            setProgress(30, 'Отправка данных...');
            await writeToSheet(productId, username);
            changePaySchemaToCredit(); // ← utils.$ не нужен, используем нативный JS
            setProgress(100, 'Готово!');
            await new Promise(r => setTimeout(r, 500));
            showSuccessModal();
        } catch (err) {
            console.error('FinStop error:', err);
            showErrorModal('Произошла ошибка при обработке запроса. Попробуйте позже.');
        }
    }

    // ─────────────────────────────────────────────
    // Фин.Стоп блок
    // ─────────────────────────────────────────────
    function createFinStopBlock() {
        const container = document.createElement('div');
        container.id = 'finstop-block';
        container.style.cssText = `
            background: linear-gradient(135deg, #D32F2F, #B71C1C);
            color: #fff; padding: 24px 20px; border-radius: 12px;
            text-align: center; box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        const subtitle = document.createElement('div');
        subtitle.textContent = '🚫 Фин.Стоп 🚫';
        subtitle.style.cssText = `
            font-size: 28px; font-weight: 800; margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;
            text-transform: uppercase;
        `;
        const btn = document.createElement('button');
        btn.textContent = 'Обещанный платеж';
        btn.style.cssText = `
            background: #fff; color: #D32F2F; border: none;
            padding: 12px 28px; border-radius: 8px; font-size: 15px;
            font-weight: 700; cursor: pointer; transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('click', showConfirmModal);
        container.appendChild(subtitle);
        container.appendChild(btn);
        return container;
    }

    function activateFinStop() {
        if (finStopActive) return;
        const currentPid = getCurrentProductId();
        if (dismissedProductId && currentPid && dismissedProductId === currentPid) return;
        const parentTable = document.querySelector("#Summary > table > tbody > tr > td:nth-child(2) > table");
        if (!parentTable) return;
        const summaryTable = document.querySelector(SUMMARY_TABLE_SELECTOR);
        if (summaryTable) summaryTable.style.display = 'none';
        const workBtn = document.querySelector(WORK_WITH_FILES_BTN_SELECTOR);
        if (workBtn) workBtn.style.display = 'none';
        finStopContainer = createFinStopBlock();
        parentTable.parentNode.insertBefore(finStopContainer, parentTable.nextSibling);
        finStopActive = true;
    }

    function restoreSummaryTable() {
        const summaryTable = document.querySelector(SUMMARY_TABLE_SELECTOR);
        if (summaryTable) summaryTable.style.display = '';
        const workBtn = document.querySelector(WORK_WITH_FILES_BTN_SELECTOR);
        if (workBtn) workBtn.style.display = '';
        if (finStopContainer && finStopContainer.parentNode) {
            finStopContainer.parentNode.removeChild(finStopContainer);
        }
        const orphan = document.getElementById('finstop-block');
        if (orphan && orphan.parentNode) orphan.parentNode.removeChild(orphan);
        finStopContainer = null;
        finStopActive = false;
    }

    function deactivateFinStop() {
        if (!finStopActive) return;
        dismissedProductId = null;
        restoreSummaryTable();
    }

    function checkPayIcon() {
        if (isPageLoading) return;
        const img = document.querySelector(PAY_ICON_SELECTOR);
        if (img && img.src && img.src.includes(PAY_ICON_SRC)) {
            activateFinStop();
        } else {
            deactivateFinStop();
        }
    }

    // ─────────────────────────────────────────────
    // Наблюдатель DOM
    // ─────────────────────────────────────────────
    function startObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            handleLoadingStateChange();
            checkPayIcon();
        });
        if (document.body) {
            observer.observe(document.body, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ['src', 'class']
            });
        } else {
            const obsWaiter = setInterval(() => {
                if (document.body) {
                    clearInterval(obsWaiter);
                    observer.observe(document.body, {
                        childList: true, subtree: true,
                        attributes: true, attributeFilter: ['src', 'class']
                    });
                    checkPayIcon();
                }
            }, 100);
        }
    }

    // ─────────────────────────────────────────────
    // 🚀 ЗАПУСК ЛОГИКИ (сразу, без обёртки)
    // ─────────────────────────────────────────────
    startObserver();
    checkPayIcon();
    console.log('[FinStop] ✅ Наблюдатель запущен, проверка иконки выполнена');

})(
    // Эти аргументы подставит загрузчик из основного userscript
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);
