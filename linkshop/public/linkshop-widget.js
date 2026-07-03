/**
 * LinkShop Widget — скрипт интеграции на внешние сайты
 *
 * Использование:
 *   <script src="https://your-server/linkshop-widget.js"></script>
 *   <script>
 *     LinkShopWidget.init({
 *       serverUrl:  'https://your-server',  // URL сервера LinkShop
 *       firstName:  'Иван',                 // Имя текущего пользователя
 *       lastName:   'Иванов',               // Фамилия
 *       buttonText: '🛍 Открыть магазин',   // (опционально)
 *       target:     '#my-container'         // (опционально) CSS-селектор для кнопки
 *     });
 *   </script>
 */

(function (global) {
  'use strict';

  const WIDGET_ID      = 'linkshop-widget';
  const OVERLAY_ID     = 'linkshop-overlay';
  const IFRAME_ID      = 'linkshop-iframe';
  const BTN_ID         = 'linkshop-open-btn';

  const DEFAULT_BTN_TEXT = '🛍 Магазин линков';

  // ── Стили (инлайн, чтобы не зависеть от CSS хоста) ──────────────────────
  const STYLES = `
    #${BTN_ID} {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #0085CA;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Segoe UI', system-ui, sans-serif;
      box-shadow: 0 2px 12px rgba(0,133,202,.35);
      transition: opacity .2s, transform .15s;
      z-index: 9990;
    }
    #${BTN_ID} img {
      height: 18px;
      vertical-align: middle;
      filter: brightness(0) invert(1);
    }
    #${BTN_ID}:hover { opacity: .88; transform: translateY(-1px); }

    #${OVERLAY_ID} {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(13,31,45,.5);
      backdrop-filter: blur(4px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    #${OVERLAY_ID}.open { display: flex; }

    #${WIDGET_ID} {
      position: relative;
      width: min(840px, 95vw);
      height: min(620px, 90vh);
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,133,202,.25);
      display: flex;
      flex-direction: column;
    }

    #linkshop-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #ffffff;
      border-bottom: 1px solid #cce3f2;
      flex-shrink: 0;
    }
    #linkshop-titlebar .ls-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #0085CA;
    }
    #linkshop-titlebar .ls-title img {
      height: 20px;
      filter: invert(34%) sepia(97%) saturate(1200%) hue-rotate(178deg) brightness(96%) contrast(101%);
    }
    #linkshop-close {
      background: none;
      border: none;
      color: #5a7f9a;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      transition: color .15s;
    }
    #linkshop-close:hover { color: #e03e5c; }

    #${IFRAME_ID} {
      flex: 1;
      border: none;
      width: 100%;
    }
  `;

  // ── Public API ────────────────────────────────────────────────────────────

  const LinkShopWidget = {

    _config: null,
    _initialized: false,

    init(config) {
      if (!config.serverUrl) { console.error('[LinkShop] serverUrl обязателен'); return; }
      if (!config.firstName || !config.lastName) { console.error('[LinkShop] firstName и lastName обязательны'); return; }

      this._config = config;

      // Инжектируем стили один раз
      if (!document.getElementById('linkshop-styles')) {
        const style = document.createElement('style');
        style.id = 'linkshop-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
      }

      this._createOverlay();
      this._createButton();
      this._initialized = true;
    },

    _createButton() {
      const cfg = this._config;

      // Удаляем старую кнопку если есть
      const old = document.getElementById(BTN_ID);
      if (old) old.remove();

      const btn = document.createElement('button');
      btn.id = BTN_ID;
      // Если передан кастомный текст — используем как есть, иначе показываем иконку + текст
      if (cfg.buttonText) {
        btn.textContent = cfg.buttonText;
      } else {
        btn.innerHTML = `<img src="https://raw.githubusercontent.com/Xemul032/AmoCRM/refs/heads/main/link_logo_wt.svg" alt=""> Магазин линков`;
      }
      btn.addEventListener('click', () => this.open());

      const target = cfg.target ? document.querySelector(cfg.target) : null;
      (target || document.body).appendChild(btn);
    },

    _createOverlay() {
      // Удаляем старый оверлей
      const old = document.getElementById(OVERLAY_ID);
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;

      // Клик по фону = закрыть
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });

      const widget = document.createElement('div');
      widget.id = WIDGET_ID;

      // Title bar
      const titlebar = document.createElement('div');
      titlebar.id = 'linkshop-titlebar';
      titlebar.innerHTML = `
        <span class="ls-title">
          <img src="https://raw.githubusercontent.com/Xemul032/AmoCRM/refs/heads/main/link_logo_wt.svg" alt="LinkShop">
          LinkShop
        </span>`;

      const closeBtn = document.createElement('button');
      closeBtn.id = 'linkshop-close';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Закрыть';
      closeBtn.addEventListener('click', () => this.close());
      titlebar.appendChild(closeBtn);

      // Iframe (создаётся при открытии)
      const iframe = document.createElement('iframe');
      iframe.id = IFRAME_ID;
      iframe.title = 'LinkShop';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

      widget.appendChild(titlebar);
      widget.appendChild(iframe);
      overlay.appendChild(widget);
      document.body.appendChild(overlay);
    },

    open() {
      const cfg = this._config;
      const overlay = document.getElementById(OVERLAY_ID);
      const iframe  = document.getElementById(IFRAME_ID);

      if (!overlay || !iframe) return;

      // Строим URL магазина
      const shopUrl = `${cfg.serverUrl}/shop?first_name=${encodeURIComponent(cfg.firstName)}&last_name=${encodeURIComponent(cfg.lastName)}`;
      iframe.src = shopUrl;

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Также отправляем postMessage (на случай если iframe уже загружен)
      iframe.addEventListener('load', () => {
        iframe.contentWindow.postMessage({
          type:       'LINKSHOP_USER',
          first_name: cfg.firstName,
          last_name:  cfg.lastName
        }, cfg.serverUrl);
      }, { once: true });
    },

    close() {
      const overlay = document.getElementById(OVERLAY_ID);
      const iframe  = document.getElementById(IFRAME_ID);
      if (overlay) overlay.classList.remove('open');
      if (iframe)  iframe.src = '';
      document.body.style.overflow = '';
    },

    // Обновить пользователя без перезапуска
    setUser(firstName, lastName) {
      if (this._config) {
        this._config.firstName = firstName;
        this._config.lastName  = lastName;
      }
    }
  };

  // Экспортируем
  global.LinkShopWidget = LinkShopWidget;

})(window);
