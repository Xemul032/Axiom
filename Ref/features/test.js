(function(config, GM, utils, api) {
    'use strict';

    console.log('[TestModule]  Загружен');

    // Проверка наличия глобального API
    if (!api || typeof api.showCenterMessage !== 'function') {
        console.error('[TestModule] ❌ Глобальная функция showCenterMessage не найдена в api');
        return;
    }

    let pressCount = 0;
    let resetTimer = null;
    const TRIPLE_PRESS_DELAY = 600; // Максимальная пауза между нажатиями (мс)

    function handleTilde(e) {
        // Игнорируем нажатия, если фокус в поле ввода/текстовом блоке
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
            return;
        }

        // Ловим физическую клавишу `~` (Backquote)
        if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
            e.preventDefault(); // Предотвращаем печать символа в адресную строку и т.д.
            clearTimeout(resetTimer);

            pressCount++;

            if (pressCount === 3) {
                // ✅ Тройное нажатие зафиксировано!
                pressCount = 0;
                console.log('[TestModule] 🎉 Сработало тройное нажатие!');

                // Вызов глобальной функции
                api.showCenterMessage({
                    message: "Всё работает, братан!",
                    buttonText: "Закрыть, нах!",
                    duration: 0,
                    onClose: () => console.log('[TestModule] 🚪 Окно закрыто')
                });
                return;
            }

            // Если нажатий < 3, запускаем таймер сброса
            resetTimer = setTimeout(() => {
                pressCount = 0;
            }, TRIPLE_PRESS_DELAY);
        }
    }

    // Вешаем слушатель на весь документ
    document.addEventListener('keydown', handleTilde);
    console.log('[TestModule] 👂 Ожидание тройного нажатия тильды (`)');

})(
    typeof config !== 'undefined' ? config : {},
    typeof GM !== 'undefined' ? GM : {},
    typeof utils !== 'undefined' ? utils : {},
    typeof api !== 'undefined' ? api : {}
);
