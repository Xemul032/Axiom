// replaceDropzone.js — модуль замены Dropzone на уведомление о прямой загрузке
// Загружается динамически из config.json через Axiom Status Indicator
// Возвращает API управления: { init, cleanup, toggle, isActive }

(function(config, GM, utils, api) {
    'use strict';

    // 🔥 Конфигурация из config.json
    const UNIQUE_PREFIX = config?.uniquePrefix || 'replace-dropzone-';
    const SELECTORS = {
        productId: config?.selectors?.productId || '#ProductId',
        dropzone: config?.selectors?.dropzone || '#Dropzone',
        previewBlock: config?.selectors?.previewBlock || '#PreviewBlock > div'
    };
    const TEXTS = {
        message: config?.texts?.message || 'Загрузите файл через папку или отошлите на почту!',
        noImagesText: config?.texts?.noImagesText || 'Файловый сервер недоступен'
    };
    const STYLES = {
        notification: config?.styles?.notification || {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '24px 32px',
            margin: '16px 0',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            lineHeight: '1.5',
            position: 'relative',
            overflow: 'hidden'
        },
        notificationHover: config?.styles?.notificationHover || {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 35px rgba(102, 126, 234, 0.6)'
        },
        icon: config?.styles?.icon || {
            fontSize: '28px',
            marginRight: '12px',
            verticalAlign: 'middle'
        }
    };

    // 🔥 Внутреннее состояние
    let active = false;
    let observer = null;
    let replacedElement = null;
    let originalDropzone = null;

    // ─────────────────────────────────────────────
    // 🔥 Создание красивого уведомления
    // ─────────────────────────────────────────────
    function createNotificationElement() {
        const notification = document.createElement('div');
        notification.id = `${UNIQUE_PREFIX}notification`;
        notification.setAttribute(`data-${UNIQUE_PREFIX}replaced`, 'true');
        
        // Применяем базовые стили
        Object.assign(notification.style, STYLES.notification);
        
        // Добавляем иконку и текст
        notification.innerHTML = `
            <span style="${STYLES.icon}">📁</span>
            <span style="vertical-align: middle;">${TEXTS.message}</span>
        `;
        
        // Эффект при наведении
        notification.addEventListener('mouseenter', () => {
            Object.assign(notification.style, STYLES.notificationHover);
        });
        notification.addEventListener('mouseleave', () => {
            Object.assign(notification.style, STYLES.notification);
        });
        
        // Анимация появления
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0.98)';
        requestAnimationFrame(() => {
            notification.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'scale(1)';
        });
        
        return notification;
    }

    // ─────────────────────────────────────────────
    // 🔥 Проверка условий для замены
    // ─────────────────────────────────────────────
    function shouldReplaceDropzone() {
        // 🔥 Проверяем наличие #ProductId в DOM (вместо проверки текста)
        const hasProductId = !!document.querySelector(SELECTORS.productId);
        if (!hasProductId) return false;
        
        // Проверяем наличие текста "Файловый сервер недоступен" в превью
        const previewBlock = document.querySelector(SELECTORS.previewBlock);
        const hasNoImages = previewBlock?.classList?.contains('fororama_no_previews') && 
                           previewBlock?.textContent?.includes(TEXTS.noImagesText);
        
        return hasNoImages;
    }

    // ─────────────────────────────────────────────
    // 🔥 Замена Dropzone на уведомление
    // ─────────────────────────────────────────────
    function replaceDropzone() {
        if (!shouldReplaceDropzone()) return;
        
        const dropzone = document.querySelector(SELECTORS.dropzone);
        if (!dropzone || dropzone.hasAttribute(`data-${UNIQUE_PREFIX}replaced`)) return;
        
        // Сохраняем оригинал для восстановления
        originalDropzone = dropzone.cloneNode(true);
        originalDropzone.removeAttribute(`data-${UNIQUE_PREFIX}replaced`);
        replacedElement = dropzone;
        
        // Создаём и вставляем уведомление
        const notification = createNotificationElement();
        dropzone.parentNode.replaceChild(notification, dropzone);
        
        // Добавляем атрибут для отслеживания
        notification.setAttribute(`data-${UNIQUE_PREFIX}original-display`, dropzone.style.display || '');
    }

    // ─────────────────────────────────────────────
    // 🔥 Восстановление оригинального Dropzone
    // ─────────────────────────────────────────────
    function restoreDropzone() {
        if (!replacedElement?.parentNode || !originalDropzone) return;
        
        const notification = replacedElement.parentNode.querySelector(`[data-${UNIQUE_PREFIX}replaced]`);
        if (notification && notification !== replacedElement) {
            notification.parentNode.replaceChild(originalDropzone.cloneNode(true), notification);
        }
        
        replacedElement = null;
        originalDropzone = null;
    }

    // ─────────────────────────────────────────────
    // 🔥 Обработчик изменений DOM
    // ─────────────────────────────────────────────
    function handleMutations() {
        if (replacedElement) {
            // Если уже заменили — проверяем, не нужно ли восстановить
            if (!shouldReplaceDropzone()) {
                restoreDropzone();
            }
        } else {
            // Если ещё не заменили — проверяем условия
            replaceDropzone();
        }
    }

    // ─────────────────────────────────────────────
    // 🔥 Настройка MutationObserver
    // ─────────────────────────────────────────────
    function setupObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            handleMutations();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────────
    // 🔥 Применение изменений
    // ─────────────────────────────────────────────
    function applyChanges() {
        replaceDropzone();
    }

    // ─────────────────────────────────────────────
    // 🔥 API модуля
    // ─────────────────────────────────────────────
    function init() {
        if (active) return;
        active = true;
        
        setupObserver();
        applyChanges();
    }

    function cleanup() {
        if (!active) return;
        active = false;
        
        // Отключаем observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 🔥 Восстанавливаем оригинальный Dropzone
        restoreDropzone();
    }

    function toggle() {
        active ? cleanup() : init();
    }

    function isActive() {
        return active;
    }

    // 🔥 Публичные методы для внешнего управления
    function refresh() {
        handleMutations();
    }

    function forceReplace() {
        replaceDropzone();
    }

    function forceRestore() {
        restoreDropzone();
    }

    function isReplaced() {
        return !!replacedElement;
    }

    // 🔥 Авто-запуск
    if (config?.autoInit !== false) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }

    // 🔥 Экспорт API
    return {
        init,
        cleanup,
        toggle,
        isActive,
        refresh,
        forceReplace,
        forceRestore,
        isReplaced
    };

})(config, GM, utils, api);