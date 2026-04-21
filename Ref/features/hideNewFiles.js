(function(config, GM, utils) {
    'use strict';

    // 🔥 Проверка зависимостей
    if (!GM || !GM.xmlhttpRequest) {
        console.warn('[HideNewFiles] ⚠️ Запущен без полного GM API (работает в ограниченном режиме)');
    }
    console.log('[HideNewFiles] 🚀 Модуль запущен');

    const HISTORY_SELECTOR = '#History';
    const TIME_FILES_SELECTOR = 'tr.TimeFilesInfo';

    let observer = null;           // За изменениями в #History
    let mainObserver = null;       // За появлением/исчезновением #History
    let pollingInterval = null;    // Периодическая проверка
    let recheckInterval = null;    // Доп. проверка видимости tr.TimeFilesInfo
    let isMonitoring = false;

    // ─────────────────────────────────────────────
    // Основная проверка: нужно ли скрывать?
    // ─────────────────────────────────────────────
    function checkAndHide() {
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (!historyEl) return;

        const timeFilesRow = document.querySelector(TIME_FILES_SELECTOR);
        if (!timeFilesRow) return;

        // Проверяем наличие дат у двух операций
        const rows = historyEl.querySelectorAll('tbody tr');
        let prepressCheck = false;
        let prepressMount = false;

        for (const row of rows) {
            const opCell = row.querySelector('td');
            if (!opCell) continue;

            const opText = opCell.textContent.trim();
            const nobr = row.querySelector('td.right nobr');
            const dateText = nobr ? nobr.textContent.trim() : '';

            if (opText === 'Препресс проверка') {
                prepressCheck = !!dateText;
            }
            if (opText === 'Препресс монтаж') {
                prepressMount = !!dateText;
            }
        }

        // Если оба этапа завершены — скрываем
        if (prepressCheck && prepressMount) {
            if (timeFilesRow.style.display !== 'none') {
                timeFilesRow.style.display = 'none';
            }
        } else {
            // Если условия не выполнены — возвращаем
            if (timeFilesRow.style.display === 'none') {
                timeFilesRow.style.display = '';
            }
        }
    }

    // ─────────────────────────────────────────────
    // Запуск мониторинга при появлении #History
    // ─────────────────────────────────────────────
    function startMonitoring() {
        if (isMonitoring) return;
        isMonitoring = true;

        // Проверяем сразу
        checkAndHide();

        // Наблюдаем за изменениями в #History
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (historyEl && !observer) {
            observer = new MutationObserver(checkAndHide);
            observer.observe(historyEl, { childList: true, subtree: true });
        }

        // Запускаем дополнительную проверку каждые 500 мс
        // Это нужно, если tr.TimeFilesInfo был пересоздан или стили сброшены
        if (!recheckInterval) {
            recheckInterval = setInterval(checkAndHide, 100);
        }
    }

    // ─────────────────────────────────────────────
    // Остановка мониторинга
    // ─────────────────────────────────────────────
    function stopMonitoring() {
        if (!isMonitoring) return;

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        // Восстанавливаем элемент, если он был скрыт
        const timeFilesRow = document.querySelector(TIME_FILES_SELECTOR);
        if (timeFilesRow && timeFilesRow.style.display === 'none') {
            timeFilesRow.style.display = '';
        }

        isMonitoring = false;
    }

    // ─────────────────────────────────────────────
    // Проверка наличия #History
    // ─────────────────────────────────────────────
    function detectAndHandleHistory() {
        const historyEl = document.querySelector(HISTORY_SELECTOR);
        if (historyEl && !isMonitoring) {
            startMonitoring();
        } else if (!historyEl && isMonitoring) {
            stopMonitoring();
        }
    }

    // ─────────────────────────────────────────────
    // Поллинг для обнаружения #History
    // ─────────────────────────────────────────────
    function startPolling() {
        pollingInterval = setInterval(detectAndHandleHistory, 500);
    }

    // ─────────────────────────────────────────────
    // Инициализация скрипта
    // ─────────────────────────────────────────────
    function initScript() {
        // Основной observer за DOM
        mainObserver = new MutationObserver(() => {
            setTimeout(detectAndHandleHistory, 100);
        });

        mainObserver.observe(document.body, { childList: true, subtree: true });

        // Первоначальная проверка
        detectAndHandleHistory();

        // Если не нашли — запускаем поллинг
        if (!isMonitoring) {
            startPolling();
        }

        // Очистка при завершении
        window.addEventListener('beforeunload', () => {
            if (mainObserver) mainObserver.disconnect();
            if (pollingInterval) clearInterval(pollingInterval);
            if (recheckInterval) clearInterval(recheckInterval);
            stopMonitoring();
        });
        
        console.log('[HideNewFiles] ✅ Наблюдатель DOM запущен');
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
