(function(config, GM, utils) {
    'use strict';

    // ─────────────────────────────────────────────
    // Проверка зависимостей
    // ─────────────────────────────────────────────
    if (!GM || !GM.xmlhttpRequest) {
        console.error('[DynamicTooltip] ❌ GM API не передан. Модуль не может работать.');
        return;
    }
    console.log('[DynamicTooltip] 🚀 Модуль запущен');

    // Функция для создания тултипа
    function createTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Полупрозрачный черный фон
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px'; // Фиксированный отступ в 5 пикселей
        tooltip.style.borderRadius = '5px';
        tooltip.style.zIndex = '10000';
        tooltip.style.opacity = '0'; // Начальная прозрачность
        tooltip.style.transition = 'opacity 0.3s ease'; // Плавное появление
        tooltip.style.maxWidth = `${window.innerWidth * 0.3}px`; // Максимальная ширина - 30% от ширины экрана
        tooltip.style.wordWrap = 'break-word'; // Перенос слов
        tooltip.style.whiteSpace = 'normal'; // Разрешение переноса текста
        tooltip.style.textAlign = 'center'; // Центрирование текста
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // Функция для позиционирования тултипа
    function positionTooltip(tooltip, target) {
        const rect = target.getBoundingClientRect();
        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
        tooltip.style.left = `${rect.left + window.scrollX + (rect.width - tooltip.offsetWidth) / 2}px`;
    }

    // Основная функция для обработки целевого элемента
    function handleImageElement(imgElement) {
        let tooltipMessage = null;

        // Проверка изображений в StopIcon
        if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon')) {
            if (imgElement.src.includes('/img/stop/1.png')) {
                tooltipMessage = 'Заказ остановлен, ответственный менеджер заказа';
            } else if (
                imgElement.src.includes('/img/stop/2.png') ||
                imgElement.src.includes('/img/stop/3.png') ||
                imgElement.src.includes('/img/stop/4.png') ||
                imgElement.src.includes('/img/stop/5.png') ||
                imgElement.src.includes('/img/stop/6.png') ||
                imgElement.src.includes('/img/stop/7.png')
            ) {
                tooltipMessage = 'Заказ остановлен на производстве,\nответственный руководитель участка';
            }
        }

        // Проверка изображений в PaySchemaIcon (закомментировано по оригиналу)
       // if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon')) {
       //     if (imgElement.src.includes('/img/payschema/payschema-2.png')) {
       //         tooltipMessage = 'Заказ в работу запущен,\nдоставка/выдача после оплаты';
       //     } else if (imgElement.src.includes('/img/payschema/payschema-1.png')) {
       //         tooltipMessage = 'Заказ в работу запущен,\nпечать только после оплаты';
       //     }
       // }

        // Проверка изображений в StatusIcon
        if (imgElement.parentElement.matches('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon')) {
            if (imgElement.src.includes('/img/status/lock-print.png')) {
                tooltipMessage = 'Заказ поступил в печать';
            } else if (imgElement.src.includes('/img/status/lock.png')) {
                tooltipMessage = 'С заказом работает препресс,\nпри пересчете согласовывать';
            } else if (imgElement.src.includes('/img/status/status-files.png')) {
                tooltipMessage = 'Принят в работу с макетом';
            } else if (imgElement.src.includes('/img/status/status-nofiles.png')) {
                tooltipMessage = 'Принят в работу без макета';
            } else if (imgElement.src.includes('/img/status/status-pack.png')) {
                tooltipMessage = 'Заказ упакован';
            } else if (imgElement.src.includes('/img/status/status-postpress-ready.png')) {
                tooltipMessage = 'Препресс не требуется';
            } else if (imgElement.src.includes('/img/status/status-prepress-layout.png')) {
                tooltipMessage = 'Препресс выполнен';
            } else if (imgElement.src.includes('/img/status/urgent.png')) {
                tooltipMessage = 'Готовность заказа раньше\nрасчетного срока';
            } else if (imgElement.src.includes('/img/status/status-prepress-ctp.png')) {
                tooltipMessage = 'Формы готовы';
            } else if (imgElement.src.includes('/img/status/status-calc.png')) {
                tooltipMessage = 'Расчёт без макета';
            } else if (imgElement.src.includes('/img/status/status-calc-files.png')) {
                tooltipMessage = 'Расчёт с файлами';
            } else if (imgElement.src.includes('/img/status/status-pack-tomove.png')) {
                tooltipMessage = 'Заказ упакован, не в точке выдачи заказа';
            } else if (imgElement.src.includes('/img/status/status-pack-onmove.png')) {
                tooltipMessage = 'Заказ упакован, в перемещении';
            } else if (imgElement.src.includes('/img/status/status-print.png')) {
                tooltipMessage = 'Заказ отпечатан';
            } else if (imgElement.src.includes('img/status/status-prepress-check.png')) {
                tooltipMessage = 'Проверека препрессом';
            } else if (imgElement.src.includes('img/status/status-print.png')) {
                tooltipMessage = 'Заказ отпечатан';
            } else if (imgElement.src.includes('img/status/status-close.png')) {
                tooltipMessage = 'Заказ выдан';
            }
        }

        if (tooltipMessage) {
            // Создаем тултип
            const tooltip = createTooltip(tooltipMessage);

            // Добавляем обработчики событий для показа/скрытия тултипа
            imgElement.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
                positionTooltip(tooltip, imgElement);
                setTimeout(() => {
                    tooltip.style.opacity = '1'; // Плавное появление
                }, 10); // Небольшая задержка для корректной анимации
            });

            imgElement.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0'; // Плавное исчезновение
                setTimeout(() => {
                    tooltip.style.display = 'none'; // Скрываем тултип после завершения анимации
                }, 300); // Время анимации (0.3s)
            });
        }
    }

    // Функция для проверки существующих элементов
    function checkExistingElements() {
        // Проверяем элементы StatusIcon
        const statusIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img');
        statusIcons.forEach((imgElement) => {
            handleImageElement(imgElement);
        });

        // Проверяем элементы StopIcon
        const stopIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img');
        stopIcons.forEach((imgElement) => {
            handleImageElement(imgElement);
        });

        // Проверяем элементы PaySchemaIcon (закомментировано по оригиналу)
       // const paySchemaIcons = document.querySelectorAll('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img');
       // paySchemaIcons.forEach((imgElement) => {
       //     handleImageElement(imgElement);
       // });
    }

    // Инициализация MutationObserver
    function init() {
        // Проверяем существующие элементы при загрузке страницы
        checkExistingElements();

        // Настройка MutationObserver для отслеживания изменений в DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Проверяем добавленные элементы StatusIcon
                        const statusIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img')
                            ? node
                            : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img');
                        if (statusIconImg) {
                            handleImageElement(statusIconImg);
                        }

                        // Проверяем добавленные элементы StopIcon
                        const stopIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img')
                            ? node
                            : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img');
                        if (stopIconImg) {
                            handleImageElement(stopIconImg);
                        }

                        // Проверяем добавленные элементы PaySchemaIcon (закомментировано по оригиналу)
                        //const paySchemaIconImg = node.matches?.('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img')
                        //    ? node
                        //    : node.querySelector('#Top > form > div > div > div > span:nth-child(2) > span.PaySchemaIcon > img');
                        //if (paySchemaIconImg) {
                        //    handleImageElement(paySchemaIconImg);
                        //}
                    }
                });
            });
        });

        // Начинаем наблюдение за изменениями в DOM
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Запускаем инициализацию
    init();

})(
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {}
);