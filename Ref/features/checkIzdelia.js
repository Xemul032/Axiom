// checkIzdelia.js — модуль подсветки обязательных параметров
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    let active = false;
    let domObserver = null;
    let radioChangeListener = null;
    let periodicChecker = null;
    let calcButton = null;
    let warningElement = null;
    
    const HIGHLIGHT_CLASS = 'tm-highlight-missing-row-cell';
    const LABEL_HIGHLIGHT_CLASS = 'tm-ut-label-error';
    const TARGET_SELECTOR = config?.targetSelector || '#CalcUt';

    function injectStyles() {
        if (document.querySelector(`#${LABEL_HIGHLIGHT_CLASS}-style`)) return;
        const style = document.createElement('style');
        style.id = `${LABEL_HIGHLIGHT_CLASS}-style`;
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                position: relative;
            }
            .${HIGHLIGHT_CLASS}:not(:first-child) {
                outline-left: none !important;
            }
            .${HIGHLIGHT_CLASS}:not(:last-child) {
                outline-right: none !important;
            }
            td.ut_label.${LABEL_HIGHLIGHT_CLASS} {
                -webkit-text-size-adjust: 100% !important;
                -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
                font-size: 14px !important;
                line-height: 1.42857143 !important;
                border-spacing: 0 !important;
                border-collapse: collapse !important;
                box-sizing: border-box !important;
                background: #ffcccc !important;
                border-color: #880000 !important;
                color: rgb(128, 0, 0) !important;
                background-color: #f0e0e0 !important;
                width: 20% !important;
                min-width: 120px !important;
                padding: 8px 16px !important;
            }
        `;
        document.head.appendChild(style);
    }

    function isInsideDocStyle(element) {
        const docStyle = document.querySelector('#Doc > style');
        return docStyle && docStyle.contains(element);
    }

    function getValidRadioSelectTds() {
        const allTds = document.querySelectorAll('td.a_radioselect');
        return Array.from(allTds).filter(td => !isInsideDocStyle(td));
    }

    function updateHighlights() {
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
        document.querySelectorAll(`.${LABEL_HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(LABEL_HIGHLIGHT_CLASS));

        const tds = getValidRadioSelectTds();
        const rowsToHighlight = new Set();

        for (const td of tds) {
            if (!td.querySelector('input[type=radio]:checked')) {
                const tr = td.closest('tr');
                if (tr) rowsToHighlight.add(tr);
            }
        }

        rowsToHighlight.forEach(tr => {
            tr.querySelectorAll('td').forEach(td => {
                td.classList.add(HIGHLIGHT_CLASS);
                if (td.classList.contains('ut_label')) {
                    td.classList.add(LABEL_HIGHLIGHT_CLASS);
                }
            });
        });
    }

    function areAllSelected() {
        const tds = getValidRadioSelectTds();
        if (tds.length === 0) return false;
        return tds.every(td => td.querySelector('input[type=radio]:checked'));
    }

    function updateUI() {
        if (!active) return;

        calcButton = calcButton || document.querySelector('button.btn.btn-success');
        if (!calcButton) return;

        const allSelected = areAllSelected();
        updateHighlights();

        calcButton.style.display = allSelected ? '' : 'none';

        if (!allSelected) {
            if (!warningElement) {
                warningElement = document.createElement('div');
                warningElement.textContent = '❌Не все параметры выбраны! Расчёт невозможен!❌';
                warningElement.style.color = 'red';
                warningElement.style.marginTop = '8px';
                warningElement.style.fontSize = '14px';
                calcButton.parentNode.insertBefore(warningElement, calcButton.nextSibling);
            }
        } else {
            if (warningElement && warningElement.parentNode) {
                warningElement.remove();
                warningElement = null;
            }
        }
    }

    function cleanup() {
        if (!active) return;
        active = false;

        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
        document.querySelectorAll(`.${LABEL_HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(LABEL_HIGHLIGHT_CLASS));

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        if (radioChangeListener) {
            document.removeEventListener('change', radioChangeListener);
            radioChangeListener = null;
        }
        if (periodicChecker) {
            clearInterval(periodicChecker);
            periodicChecker = null;
        }

        calcButton = null;
        if (warningElement?.parentNode) warningElement.remove();
        warningElement = null;
    }

    function init() {
        if (active) return;
        active = true;
        injectStyles();

        domObserver = new MutationObserver(updateUI);
        domObserver.observe(document.body, { childList: true, subtree: true });

        radioChangeListener = (e) => {
            if (e.target.matches?.('input[type=radio]')) {
                updateUI();
            }
        };
        document.addEventListener('change', radioChangeListener);

        periodicChecker = setInterval(updateUI, config?.checkIntervalMs || 1000);
        updateUI();
    }

    function toggle() {
        if (active) {
            cleanup();
        } else {
            init();
        }
    }

    function isActive() {
        return active;
    }

    // 🔥 Авто-инициализация при наличии целевого элемента
    const presenceObserver = new MutationObserver(() => {
        const targetExists = !!document.querySelector(TARGET_SELECTOR);
        if (targetExists && !active) {
            init();
        } else if (!targetExists && active) {
            cleanup();
        }
    });

    presenceObserver.observe(document.body, { childList: true, subtree: true });

    if (document.querySelector(TARGET_SELECTOR)) {
        setTimeout(init, 50);
    }

    // 🔥 Экспорт API для внешнего управления
    return {
        init,
        cleanup,
        toggle,
        isActive,
        updateUI // на случай ручного триггера
    };

})(config, GM, utils, api);