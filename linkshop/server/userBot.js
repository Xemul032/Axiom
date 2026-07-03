/**
 * Telegram-бот для пользователей LinkShop
 *
 * Функции:
 *  - /start → приветствие + кнопка «Зарегистрироваться»
 *  - Регистрация: бот просит ввести имя и фамилию, ищет совпадение в БД,
 *    сохраняет tg_chat_id в запись пользователя
 *  - Кнопка «Список покупок» → незавершённые и завершённые заказы
 *
 * Токен хранится в таблице settings под ключом tg_user_bot_token
 * Название системы: Линк Маркет
 */

const https = require('https');
const db    = require('./db');

// ── Инициализация настройки ────────────────────────────────────────────────
db.exec(`
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_user_bot_token', '');
`);

// ── Вспомогательные функции ────────────────────────────────────────────────

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : '';
}

/**
 * Делает запрос к Telegram Bot API
 * @param {string} token
 * @param {string} method
 * @param {object} body
 * @returns {Promise<object>}
 */
function apiCall(token, method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${token}/${method}`,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Не удалось разобрать ответ: ' + data)); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Отправляет текстовое сообщение с опциональной клавиатурой
 */
async function sendMessage(token, chatId, text, replyMarkup) {
  const body = {
    chat_id:    chatId,
    text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await apiCall(token, 'sendMessage', body);
  if (!res.ok) {
    console.error('[UserBot] sendMessage error:', res.description);
  }
  return res;
}

// ── Главное меню (ReplyKeyboard) ────────────────────────────────────────────

function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '🛒 Список покупок' }],
      [{ text: '🔑 Получить PIN код' }],
      [{ text: '📝 Зарегистрироваться' }]
    ],
    resize_keyboard:   true,
    one_time_keyboard: false
  };
}

// ── Состояния диалога (in-memory) ──────────────────────────────────────────
// Для production можно перенести в БД, но для простоты — Map
const userStates = new Map();
// Формат записи: { step: 'await_name' | 'await_lastname', firstName: string }

// ── Обработка обновлений ───────────────────────────────────────────────────

async function handleUpdate(token, update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  const text   = msg.text.trim();

  // ── /start ─────────────────────────────────────────────────────────────
  if (text === '/start') {
    userStates.delete(chatId); // сбрасываем возможный прерванный диалог

    const user = db.prepare('SELECT id, first_name, last_name FROM users WHERE tg_chat_id=?').get(chatId);

    if (user) {
      await sendMessage(token, chatId,
        `👋 С возвращением, <b>${user.first_name} ${user.last_name}</b>!\n` +
        `Используйте меню ниже для навигации.`,
        mainMenuKeyboard()
      );
    } else {
      await sendMessage(token, chatId,
        `👋 Добро пожаловать в <b>Линк Маркет</b>!\n\n` +
        `Это ваш личный бот для просмотра покупок и уведомлений.\n\n` +
        `Чтобы начать — нажмите кнопку <b>«📝 Зарегистрироваться»</b> или введите /register`,
        mainMenuKeyboard()
      );
    }
    return;
  }

  // ── /register или кнопка «Зарегистрироваться» ──────────────────────────
  if (text === '/register' || text === '📝 Зарегистрироваться') {
    const user = db.prepare('SELECT id, first_name, last_name FROM users WHERE tg_chat_id=?').get(chatId);
    if (user) {
      await sendMessage(token, chatId,
        `✅ Вы уже зарегистрированы как <b>${user.first_name} ${user.last_name}</b>.`,
        mainMenuKeyboard()
      );
      return;
    }

    userStates.set(chatId, { step: 'await_fullname' });
    await sendMessage(token, chatId,
      `📝 <b>Регистрация</b>\n\n` +
      `Введите ваше <b>имя и фамилию</b> через пробел, как они записаны в системе.\n` +
      `Например: <code>Иван Иванов</code>`,
      { remove_keyboard: true }
    );
    return;
  }

  // ── Кнопка «Список покупок» ─────────────────────────────────────────────
  if (text === '🛒 Список покупок') {
    const user = db.prepare('SELECT id, first_name, last_name FROM users WHERE tg_chat_id=?').get(chatId);
    if (!user) {
      await sendMessage(token, chatId,
        `⚠️ Вы ещё не зарегистрированы.\nНажмите <b>«📝 Зарегистрироваться»</b>.`,
        mainMenuKeyboard()
      );
      return;
    }

    await sendOrdersList(token, chatId, user.id);
    return;
  }

  // ── Кнопка «Получить PIN код» ───────────────────────────────────────────
  if (text === '🔑 Получить PIN код') {
    const user = db.prepare('SELECT id, first_name, last_name, pin FROM users WHERE tg_chat_id=?').get(chatId);
    if (!user) {
      await sendMessage(token, chatId,
        `⚠️ Вы ещё не зарегистрированы.\nНажмите <b>«📝 Зарегистрироваться»</b>.`,
        mainMenuKeyboard()
      );
      return;
    }

    if (!user.pin) {
      await sendMessage(token, chatId,
        `ℹ️ Для вашего аккаунта PIN-код ещё не установлен.\nОбратитесь к администратору.`,
        mainMenuKeyboard()
      );
      return;
    }

    await sendMessage(token, chatId,
      `🔑 <b>Ваш PIN-код:</b> <code>${user.pin}</code>\n\n` +
      `Используйте его для входа в систему Линк Маркет.`,
      mainMenuKeyboard()
    );
    return;
  }

  // ── Шаг регистрации: ввод имени и фамилии ─────────────────────────────
  const state = userStates.get(chatId);
  if (state && state.step === 'await_fullname') {
    await handleFullnameInput(token, chatId, text);
    return;
  }

  // ── Неизвестная команда ────────────────────────────────────────────────
  await sendMessage(token, chatId,
    `Используйте кнопки меню или /start для начала.`,
    mainMenuKeyboard()
  );
}

/**
 * Обрабатывает ввод «Имя Фамилия» и регистрирует пользователя
 */
async function handleFullnameInput(token, chatId, text) {
  const parts = text.trim().split(/\s+/);

  if (parts.length < 2) {
    await sendMessage(token, chatId,
      `⚠️ Введите <b>имя и фамилию</b> через пробел.\nНапример: <code>Иван Иванов</code>`
    );
    return;
  }

  // Поиск по первым двум словам (имя + фамилия в любом порядке)
  const [word1, word2] = parts;

  // Ищем совпадение: (first_name=word1 AND last_name=word2) OR (first_name=word2 AND last_name=word1)
  // Регистронезависимо
  const user = db.prepare(`
    SELECT id, first_name, last_name FROM users
    WHERE (LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?))
       OR (LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?))
    LIMIT 1
  `).get(word1, word2, word2, word1);

  if (!user) {
    await sendMessage(token, chatId,
      `❌ Пользователь с именем <b>${text}</b> не найден в системе.\n\n` +
      `Убедитесь, что вы ввели имя и фамилию точно так, как они записаны у администратора.\n` +
      `Попробуйте ещё раз или обратитесь к администратору.`
    );
    return;
  }

  // Проверяем: не привязан ли этот аккаунт уже к другому chat_id
  if (user.tg_chat_id && user.tg_chat_id !== chatId) {
    // Перезаписываем — новая привязка
  }

  // Сохраняем chat_id
  db.prepare('UPDATE users SET tg_chat_id=? WHERE id=?').run(chatId, user.id);
  userStates.delete(chatId);

  await sendMessage(token, chatId,
    `✅ <b>Регистрация завершена!</b>\n\n` +
    `Добро пожаловать, <b>${user.first_name} ${user.last_name}</b>!\n` +
    `Теперь вы будете получать уведомления о заказах здесь.`,
    mainMenuKeyboard()
  );
}

/**
 * Отправляет список заказов пользователя (незавершённые + завершённые)
 */
async function sendOrdersList(token, chatId, userId) {
  const orders = db.prepare(`
    SELECT
      o.id,
      o.completed,
      o.created_at,
      o.completed_at,
      p.name AS product_name,
      p.base_price,
      ABS(t.amount) AS paid_price
    FROM orders o
    JOIN products p ON o.product_id = p.id
    LEFT JOIN transactions t ON o.transaction_id = t.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    LIMIT 50
  `).all(userId);

  if (orders.length === 0) {
    await sendMessage(token, chatId,
      `🛒 У вас пока нет покупок.`,
      mainMenuKeyboard()
    );
    return;
  }

  const pending   = orders.filter(o => !o.completed);
  const completed = orders.filter(o =>  o.completed);

  let msg = `🛒 <b>Ваши покупки</b>\n`;

  if (pending.length > 0) {
    msg += `\n⏳ <b>В обработке (${pending.length}):</b>\n`;
    for (const o of pending) {
      const date  = formatDate(o.created_at);
      const price = o.paid_price != null ? o.paid_price : o.base_price;
      msg += `  • ${o.product_name} — <b>${price}</b> линков (${date})\n`;
    }
  }

  if (completed.length > 0) {
    msg += `\n✅ <b>Выполненные (${completed.length}):</b>\n`;
    for (const o of completed) {
      const date  = formatDate(o.completed_at || o.created_at);
      const price = o.paid_price != null ? o.paid_price : o.base_price;
      msg += `  • ${o.product_name} — <b>${price}</b> линков (${date})\n`;
    }
  }

  await sendMessage(token, chatId, msg, mainMenuKeyboard());
}

/**
 * Форматирует ISO-дату в читаемый вид
 */
function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' });
  } catch (_) {
    return isoStr.slice(0, 10);
  }
}

// ── Long Polling ───────────────────────────────────────────────────────────

let pollingActive = false;
let pollingOffset = 0;
let pollingTimeout = null;

async function pollOnce(token) {
  try {
    const res = await apiCall(token, 'getUpdates', {
      offset:          pollingOffset,
      timeout:         25,
      allowed_updates: ['message']
    });

    if (!res.ok) {
      console.error('[UserBot] getUpdates error:', res.description);
      return;
    }

    for (const update of res.result) {
      pollingOffset = update.update_id + 1;
      try {
        await handleUpdate(token, update);
      } catch (e) {
        console.error('[UserBot] Ошибка обработки обновления:', e.message);
      }
    }
  } catch (e) {
    console.error('[UserBot] Сетевая ошибка polling:', e.message);
  }
}

async function startPolling() {
  const token = getSetting('tg_user_bot_token');
  if (!token) {
    console.log('[UserBot] Токен не настроен — бот не запущен. Задайте tg_user_bot_token в настройках.');
    return;
  }

  // Проверяем токен
  try {
    const me = await apiCall(token, 'getMe', {});
    if (!me.ok) {
      console.error('[UserBot] Неверный токен:', me.description);
      return;
    }
    console.log(`[UserBot] Запущен бот @${me.result.username}`);
  } catch (e) {
    console.error('[UserBot] Не удалось подключиться к Telegram:', e.message);
    return;
  }

  pollingActive = true;
  pollingOffset = 0;

  const loop = async () => {
    if (!pollingActive) return;
    const currentToken = getSetting('tg_user_bot_token');
    if (currentToken) await pollOnce(currentToken);
    if (pollingActive) pollingTimeout = setTimeout(loop, 1000);
  };

  loop();
}

function stopPolling() {
  pollingActive = false;
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }
  console.log('[UserBot] Polling остановлен');
}

/**
 * Перезапускает бота (например, после смены токена)
 */
function restartBot() {
  stopPolling();
  pollingOffset = 0;
  userStates.clear();
  setTimeout(startPolling, 500);
}

/**
 * Отправляет документ (файл сертификата) пользователю через пользовательский бот
 * @param {string} userChatId  — chat_id пользователя в Telegram
 * @param {string} filePath    — абсолютный путь к файлу на диске
 * @param {string} caption     — подпись к файлу (HTML)
 */
async function sendDocumentToUser(userChatId, filePath, caption) {
  const token = getSetting('tg_user_bot_token');
  if (!token || !userChatId) {
    throw new Error('Не настроен tg_user_bot_token или не указан Chat ID пользователя');
  }

  const fs       = require('fs');
  const pathMod  = require('path');
  const httpsLib = require('https');
  const FormData = require('form-data');

  if (!fs.existsSync(filePath)) {
    throw new Error('Файл не найден: ' + filePath);
  }

  const form = new FormData();
  form.append('chat_id',    String(userChatId));
  form.append('caption',    caption || '');
  form.append('parse_mode', 'HTML');
  form.append('document',   fs.createReadStream(filePath), {
    filename:    pathMod.basename(filePath),
    contentType: 'application/octet-stream'
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${token}/sendDocument`,
      method:   'POST',
      headers:  form.getHeaders()
    };

    const req = httpsLib.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.ok) {
            reject(new Error(`Telegram API error: ${data.description}`));
          } else {
            resolve(data);
          }
        } catch (e) {
          reject(new Error('Telegram: не удалось разобрать ответ: ' + body));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Отправляет пользователю уведомление об изменении статуса заказа
 * (вызывается из routes/admin.js)
 */
async function notifyUserOrderReady(tgChatId, productName) {
  const token = getSetting('tg_user_bot_token');
  if (!token || !tgChatId) return;
  try {
    await sendMessage(token, tgChatId,
      `✅ <b>Ваш заказ готов!</b>\n📦 ${productName}\n\nСертификат отправлен отдельным сообщением.`
    );
  } catch (e) {
    console.error('[UserBot] Ошибка уведомления пользователя:', e.message);
  }
}

/**
 * Склоняет слово «линк» по количеству
 * 1 → линк, 2-4 → линка, 5+ → линков
 */
function pluralLinks(n) {
  const abs = Math.abs(n);
  const mod10  = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'линков';
  if (mod10 === 1)                   return 'линк';
  if (mod10 >= 2 && mod10 <= 4)     return 'линка';
  return 'линков';
}

/**
 * Отправляет уведомление о поощрении или штрафе
 * @param {string|number} tgChatId  — chat_id пользователя в Telegram
 * @param {number}        amount    — сумма (положительная = поощрение, отрицательная = штраф)
 * @param {string}        [comment] — необязательный комментарий
 */
async function notifyUserBalance(tgChatId, amount, comment) {
  const token = getSetting('tg_user_bot_token');
  if (!token || !tgChatId) return;

  const abs  = Math.abs(amount);
  const word = pluralLinks(abs);

  let text;
  if (amount > 0) {
    text = `🎉 Поздравляю! Вам начислено <b>${abs} ${word}</b>`;
  } else {
    text = `⚠️ Вы оштрафованы на <b>${abs} ${word}</b>`;
  }

  if (comment && comment.trim()) {
    text += `\n<i>${comment.trim()}</i>`;
  }

  try {
    await sendMessage(token, tgChatId, text);
  } catch (e) {
    console.error('[UserBot] Ошибка уведомления о балансе:', e.message);
  }
}

module.exports = { startPolling, stopPolling, restartBot, notifyUserOrderReady, notifyUserBalance, sendDocumentToUser, getSetting };
