// ==UserScript==
// @name         Axiom_loader_2.0
// @namespace    http://tampermonkey.net/
<<<<<<< Updated upstream
// @version      4.5
=======
// @version      4.2
>>>>>>> Stashed changes
// @updateURL    https://github.com/Xemul032/Axiom/raw/refs/heads/main/Ref/Axiom_loader_2.0.user.js
// @downloadURL  https://github.com/Xemul032/Axiom/raw/refs/heads/main/Ref/Axiom_loader_2.0.user.js
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @connect      script.google.com
// @connect      api.telegram.org
// @connect      *
// @connect      sheets.googleapis.com
// @connect      docs.google.com
// @connect      script.googleusercontent.com
// @connect      api.ipify.org
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 🔇 Полное подавление вывода в консоль (глобально для страницы)
    (function() {
        var noop = function() {};
        var methods = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count', 'assert', 'clear'];
        if (typeof window.console === 'object') {
            for (var i = 0; i < methods.length; i++) {
                try { window.console[methods[i]] = noop; } catch(e) {}
            }
        }
    })();

    var CONFIG_URL = 'https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/Ref/config.json';
    var CACHE_KEY  = 'axiom_status_config_v3';
    var CONFIG_HASH_KEY = 'axiom_config_hash_v3';
    var TARGET_SEL = 'body > ul > div > li:nth-child(2)';
    var TABLE_SEL = 'body > table';
    var DEFAULT_STATE = { enabled: true, checkIntervalSec: 1800 };

    var GLOBAL_API = {};
    var updateAvailable = false;
    var isLoadingModules = false;

    // ─────────────────────────────────────────────
    // СТИЛИ: Анимации и оверлей
    // ─────────────────────────────────────────────
    if (!document.getElementById('ax-status-anim')) {
        var style = document.createElement('style');
        style.id = 'ax-status-anim';
        style.textContent = `
            @keyframes ax-blink-green { 0%,100% { opacity:1; box-shadow:0 0 4px #2ecc71; } 50% { opacity:0.3; box-shadow:none; } }
            @keyframes ax-blink-red { 0%,100% { opacity:1; box-shadow:0 0 4px #e74c3c; } 50% { opacity:0.3; box-shadow:none; } }
            @keyframes ax-blink-orange { 0%,100% { opacity:1; box-shadow:0 0 4px #f39c12; } 50% { opacity:0.3; box-shadow:none; } }
            @keyframes ax-spin { to { transform: rotate(360deg); } }
            @keyframes ax-overlay-pulse {
                0%, 100% { background-color: rgba(15, 23, 42, 0.75); }
                50% { background-color: rgba(15, 23, 42, 0.85); }
            }
            @keyframes ax-fade-out {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }

            .ax-loading-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                animation: ax-overlay-pulse 2s ease-in-out infinite;
            }
            .ax-loading-card {
                background: linear-gradient(145deg, #1e293b, #0f172a);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 16px;
                padding: 24px 32px;
                text-align: center;
                box-shadow:
                    0 25px 50px -12px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(148, 163, 184, 0.1),
                    0 0 40px rgba(59, 130, 246, 0.15);
                max-width: 320px;
                width: 90%;
            }
            .ax-spinner {
                width: 48px;
                height: 48px;
                border: 3px solid rgba(148, 163, 184, 0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: ax-spin 0.9s linear infinite;
                margin: 0 auto 16px;
                position: relative;
            }
            .ax-spinner::after {
                content: '';
                position: absolute;
                top: 4px; left: 4px; right: 4px; bottom: 4px;
                border: 2px solid transparent;
                border-top-color: #60a5fa;
                border-radius: 50%;
                animation: ax-spin 0.6s linear infinite reverse;
            }
            .ax-loading-text {
                color: #f1f5f9;
                font-size: 15px;
                font-weight: 500;
                margin-bottom: 8px;
                letter-spacing: 0.2px;
            }
            .ax-loading-subtext {
                color: #94a3b8;
                font-size: 12px;
                opacity: 0.9;
            }
            .ax-indicator-loading .topmenu-a {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                font-weight: 500 !important;
                font-size: 11px !important;
                color: #60a5fa !important;
                pointer-events: none !important;
            }
            .ax-indicator-loading .ax-mini-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(96, 165, 250, 0.3);
                border-top-color: #60a5fa;
                border-radius: 50%;
                animation: ax-spin 0.8s linear infinite;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // Оверлей загрузки
    // ────────────────────────────────────────────
    function showLoadingOverlay() {
        if (document.getElementById('ax-loading-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'ax-loading-overlay';
        overlay.className = 'ax-loading-overlay';
        overlay.innerHTML = `
            <div class="ax-loading-card">
                <div class="ax-spinner"></div>
                <div class="ax-loading-text">Пожалуйста, подождите</div>
                <div class="ax-loading-subtext">Загружаются модули...</div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.body.style.overflow = 'hidden';
    }

    function hideLoadingOverlay() {
        var overlay = document.getElementById('ax-loading-overlay');
        if (overlay) {
            overlay.style.animation = 'ax-fade-out 0.3s ease-out forwards';
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                document.body.style.overflow = '';
            }, 300);
        }
    }

    // ─────────────────────────────────────────────
    // Индикатор в режиме загрузки
    // ─────────────────────────────────────────────
    function createLoadingIndicator(target) {
        const clone = target.cloneNode(true);
        clone.classList.add('ax-status-indicator', 'ax-indicator-loading');
        clone.id = '';
        clone.style.display = 'flex';
        clone.style.alignItems = 'center';
        clone.style.justifyContent = 'center';
        clone.style.height = '100%';
        clone.style.cursor = 'default';
        clone.style.pointerEvents = 'none';

        const link = clone.querySelector('a.topmenu-a') || clone;
        link.innerHTML = '';
        link.removeAttribute('onclick');
        link.href = '#';
        link.style.pointerEvents = 'none';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
        link.style.height = '100%';
        link.style.gap = '8px';
        link.style.flexDirection = 'row';
        link.style.flexWrap = 'nowrap';

        const spinner = document.createElement('span');
        spinner.className = 'ax-mini-spinner';

        const txt = document.createElement('span');
        txt.textContent = 'Идёт загрузка';
        txt.style.cssText = `
            line-height: 1.1;
            vertical-align: middle;
            text-align: left;
            font-size: 11px;
            white-space: nowrap;
            color: #60a5fa;
        `;

        link.appendChild(spinner);
        link.appendChild(txt);
        return clone;
    }

    // ─────────────────────────────────────────────
    // Создание индикатора (основной)
    // ─────────────────────────────────────────────
    function createIndicator(target, state) {
        const clone = target.cloneNode(true);
        clone.classList.add('ax-status-indicator');
        clone.classList.add(state === 'ok' ? 'ax-status-ok' : state === 'error' ? 'ax-status-error' : 'ax-status-update');
        clone.id = '';
        clone.style.display = 'flex';
        clone.style.alignItems = 'center';
        clone.style.justifyContent = 'center';
        clone.style.height = '100%';
        clone.style.cursor = 'default';
        clone.style.pointerEvents = 'none';

        const link = clone.querySelector('a.topmenu-a') || clone;
        link.innerHTML = '';
        link.removeAttribute('onclick');
        link.href = '#';
        link.style.pointerEvents = 'none';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
        link.style.height = '100%';
        link.style.gap = '6px';
        link.style.fontWeight = '500';
        link.style.color = '';
        link.style.flexDirection = 'row';
        link.style.flexWrap = 'nowrap';

        const colors = { ok: '#2ecc71', error: '#e74c3c', update: '#f39c12' };
        const anims = { ok: 'ax-blink-green 1.4s ease-in-out infinite', error: 'ax-blink-red 1.4s ease-in-out infinite', update: 'ax-blink-orange 1.4s ease-in-out infinite' };
        const texts = {
            ok: 'ОК',
            error: 'Ошибка',
            update: 'Требуется<br>обновление!'
        };

        const color = colors[state] || colors.error;
        const anim = anims[state] || anims.error;
        const text = texts[state] || texts.error;

        const dot = document.createElement('span');
        dot.style.cssText = `
            width: 8px; height: 8px; background: ${color}; border-radius: 50%;
            display: inline-block; animation: ${anim}; flex-shrink: 0;
            box-shadow: 0 0 5px ${color};
        `;
        const txt = document.createElement('span');
        txt.innerHTML = text;
        txt.style.cssText = `
            line-height: 1.1;
            vertical-align: middle;
            text-align: left;
            font-size: 11px;
            white-space: normal;
            word-break: normal;
        `;

        link.appendChild(dot);
        link.appendChild(txt);
        return clone;
    }

    function applyIndicator(enabled, configLoaded, showUpdate, forceLoading) {
        var target = document.querySelector(TARGET_SEL);
        if (!target || !target.parentNode) return;

        var existing = target.querySelector('.ax-status-indicator');
        if (existing) {
            if (configLoaded && !enabled && target.dataset.originalHtml) {
                target.innerHTML = target.dataset.originalHtml;
                target.classList.remove('ax-status-indicator', 'ax-status-ok', 'ax-status-error', 'ax-status-update', 'ax-indicator-loading');
                target.style.pointerEvents = '';
            }
            return;
        }

        if (configLoaded && !enabled) return;
        if (!target.dataset.originalHtml) target.dataset.originalHtml = target.innerHTML;

        var state;
        if (forceLoading) {
            var indicator = createLoadingIndicator(target);
            target.innerHTML = indicator.innerHTML;
            target.classList.add('ax-status-indicator', 'ax-indicator-loading');
            target.style.pointerEvents = 'none';
            var newTarget = target.cloneNode(true);
            target.parentNode.replaceChild(newTarget, target);
            return;
        }

        if (showUpdate) {
            state = 'update';
        } else if (configLoaded && enabled) {
            state = 'ok';
        } else {
            state = 'error';
        }
        var indicator = createIndicator(target, state);

        target.innerHTML = indicator.innerHTML;
        target.classList.add('ax-status-indicator');
        if (state === 'ok') {
            target.classList.add('ax-status-ok');
        } else if (state === 'error') {
            target.classList.add('ax-status-error');
        } else {
            target.classList.add('ax-status-update');
        }
        target.style.pointerEvents = 'none';

        var newTarget = target.cloneNode(true);
        target.parentNode.replaceChild(newTarget, target);
    }

    // ─────────────────────────────────────────────
    // Загрузка конфига (с поддержкой ETag)
    // ─────────────────────────────────────────────
    function fetchConfig(callback) {
        var cached = GM_getValue(CACHE_KEY, null);
        var headers = {};
        if (cached && cached.etag) {
            headers['If-None-Match'] = cached.etag;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: CONFIG_URL,
            headers: headers,
            onload: function(res) {
                if (res.status === 200) {
                    try {
                        var data = JSON.parse(res.responseText);
                        var etagMatch = res.responseHeaders.match(/etag:\s*"?(.+?)"?\s*$/im);
                        var etag = etagMatch ? etagMatch[1] : '';
                        GM_setValue(CACHE_KEY, { data: data, etag: etag, ts: Date.now() });
                        callback({ data: data, loaded: true, etag: etag, fresh: true });
                    } catch (e) {
                        var fallbackData = (cached && cached.data) ? cached.data : DEFAULT_STATE;
                        var fallbackEtag = (cached && cached.etag) ? cached.etag : '';
                        callback({ data: fallbackData, loaded: false, etag: fallbackEtag, fresh: false });
                    }
                } else if (res.status === 304 && cached) {
                    callback({ data: cached.data, loaded: true, etag: cached.etag, fresh: false });
                } else {
                    var fallbackData = (cached && cached.data) ? cached.data : DEFAULT_STATE;
                    var fallbackEtag = (cached && cached.etag) ? cached.etag : '';
                    callback({ data: fallbackData, loaded: false, etag: fallbackEtag, fresh: false });
                }
            },
            onerror: function() {
                var fallbackData = (cached && cached.data) ? cached.data : DEFAULT_STATE;
                var fallbackEtag = GM_getValue(CONFIG_HASH_KEY, '');
                callback({ data: fallbackData, loaded: false, etag: fallbackEtag, fresh: false });
            }
        });
    }

    // ─────────────────────────────────────────────
    // Вычисление хэша конфига
    // ─────────────────────────────────────────────
    function getConfigHash(config) {
        try {
            var coreUrl = config.coreUrl || '';
            var featuresArr = [];
            if (config.features) {
                for (var name in config.features) {
                    var f = config.features[name];
                    if (f && f.enabled) {
                        featuresArr.push(name + ':' + f.url);
                    }
                }
            }
            featuresArr.sort();
            var features = featuresArr.join('|');
            var interval = config.checkIntervalSec || 1800;
            var enabled = config.enabled;
            return btoa(enabled + '|' + interval + '|' + coreUrl + '|' + features).slice(0, 20);
        } catch (e) {
            return 'hash_error_' + Date.now();
        }
    }

    // ─────────────────────────────────────────────
    // ЗАГРУЗЧИК ЯДРА (utils.js)
    // ─────────────────────────────────────────────
    function loadCore(coreUrl, callback) {
        if (!coreUrl) {
            if (callback) callback();
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: coreUrl,
            onload: function(res) {
                if (res.status === 200) {
                    try {
                        var factory = new Function('GM', 'window', 'document', res.responseText);
                        GLOBAL_API = factory(GM, window, document) || {};
                    } catch (e) {
                        GLOBAL_API = {};
                    }
                } else {
                    GLOBAL_API = {};
                }
                if (callback) callback();
            },
            onerror: function(err) {
                GLOBAL_API = {};
                if (callback) callback();
            }
        });
    }

    // ─────────────────────────────────────────────
    // ЗАГРУЗЧИК МОДУЛЕЙ
    // ─────────────────────────────────────────────
    function loadModule(feature, callback) {
        if (!feature || !feature.enabled || !feature.url) {
            if (callback) callback();
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: feature.url,
            onload: function(res) {
                if (res.status === 200) {
                    try {
                        var moduleFn = new Function('config', 'GM', 'utils', 'api', res.responseText);
                        moduleFn(
                            feature.config || {},
                            {
                                xmlhttpRequest: GM_xmlhttpRequest,
                                setValue: GM_setValue,
                                getValue: GM_getValue,
                                addStyle: (typeof GM_addStyle !== 'undefined') ? GM_addStyle : null
                            },
                            {
                                $: (window.jQuery) ? window.jQuery : null,
                                console: console,
                                document: document,
                                window: window
                            },
                            GLOBAL_API
                        );
                    } catch (e) {
                        // silent fail
                    }
                } else {
                    // silent fail
                }
                if (callback) callback();
            },
            onerror: function(err) {
                if (callback) callback();
            }
        });
    }

    // ────────────────────────────────────────────
    // Загрузка ядра + модулей с визуализацией
    // ─────────────────────────────────────────────
    function loadFeatures(config, callback) {
        isLoadingModules = true;
        waitForElement(function() {
            applyIndicator(true, true, false, true);
            showLoadingOverlay();
        });

        var loadNext = function(index, keys) {
            if (index >= keys.length) {
                isLoadingModules = false;
                hideLoadingOverlay();
                waitForElement(function() {
                    applyIndicator(true, true, updateAvailable, false);
                });
                if (callback) callback();
                return;
            }
            var name = keys[index];
            var feature = config.features[name];
            if (feature && feature.enabled) {
                loadModule({ name: name, url: feature.url, config: feature.config, enabled: feature.enabled }, function() {
                    loadNext(index + 1, keys);
                });
            } else {
                loadNext(index + 1, keys);
            }
        };

        var afterCore = function() {
            if (config.features) {
                var keys = Object.keys(config.features);
                loadNext(0, keys);
            } else {
                isLoadingModules = false;
                hideLoadingOverlay();
                waitForElement(function() {
                    applyIndicator(true, true, updateAvailable, false);
                });
                if (callback) callback();
            }
        };

        if (config.coreUrl) {
            loadCore(config.coreUrl, afterCore);
        } else {
            afterCore();
        }
    }

    // ─────────────────────────────────────────────
    // Ожидание элемента
    // ─────────────────────────────────────────────
    function waitForElement(callback, timeout) {
        if (!timeout) timeout = 6000;
        if (document.querySelector(TARGET_SEL)) return callback();
        var start = Date.now();
        var obs = new MutationObserver(function() {
            if (document.querySelector(TARGET_SEL) || Date.now() - start > timeout) {
                obs.disconnect();
                callback();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ─────────────────────────────────────────────
    // 🚀 Инициализация
    // ─────────────────────────────────────────────
    function init(isPageLoad) {
        if (typeof isPageLoad === 'undefined') isPageLoad = false;

        fetchConfig(function(result) {
            var config = result.data;
            var configLoaded = result.loaded;
            var fresh = result.fresh;
            var enabled = !!config.enabled;
            var configHash = getConfigHash(config);

            var savedHash = GM_getValue(CONFIG_HASH_KEY, null);
            var configChanged = fresh && (savedHash !== null) && (savedHash !== configHash);

            if (configChanged) {
                updateAvailable = true;
            }

            waitForElement(function() {
                if (!isLoadingModules) {
                    applyIndicator(enabled, configLoaded, updateAvailable);
                }
            });

            if (isPageLoad && enabled && configLoaded) {
                loadFeatures(config, function() {
                    GM_setValue(CONFIG_HASH_KEY, configHash);
                    updateAvailable = false;
                });
            }

            var interval = (config.checkIntervalSec || DEFAULT_STATE.checkIntervalSec) * 1000;
            setTimeout(function() { init(false); }, interval);
        });
    }

    init(true);
})();
