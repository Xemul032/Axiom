/**
 * Telegram Bot уведомления
 * Настройки хранятся в таблице settings (key/value)
 * tg_chat_id хранит несколько ID через запятую: "-100123,456789"
 */
const db = require('./db');

// Убедимся что таблица settings существует
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_bot_token', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_chat_id', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_notify_purchase', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bonus_amount', '80');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bonus_day', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('bonus_hour', '9');
`);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : '';
}

/**
 * Возвращает массив chat_id из строки (разделитель — запятая или пробел)
 */
function getChatIds() {
  const raw = getSetting('tg_chat_id');
  return raw
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Отправляет сообщение в один chat_id
 */
async function sendToOne(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`[Telegram] chat_id=${chatId} ошибка:`, data.description);
  }
  return data;
}

/**
 * Отправляет сообщение во все настроенные chat_id
 * @param {string} text
 */
async function sendTelegram(text) {
  const botToken = getSetting('tg_bot_token');
  const enabled  = getSetting('tg_notify_purchase');
  const chatIds  = getChatIds();

  if (!botToken || chatIds.length === 0 || enabled !== '1') return;

  const results = await Promise.allSettled(
    chatIds.map(id => sendToOne(botToken, id, text))
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Telegram] chat_id=${chatIds[i]} сетевая ошибка:`, r.reason?.message);
    }
  });
}

/**
 * Отправляет документ (файл) конкретному пользователю по его tg_chat_id
 * Использует нативный https модуль Node.js для корректной передачи multipart/form-data
 * @param {string} userChatId  — chat_id пользователя в Telegram
 * @param {string} filePath    — абсолютный путь к файлу на диске
 * @param {string} caption     — подпись к файлу (HTML)
 */
async function sendDocumentToUser(userChatId, filePath, caption) {
  const botToken = getSetting('tg_bot_token');
  if (!botToken || !userChatId) {
    throw new Error('Не настроен Bot Token или не указан Chat ID пользователя');
  }

  const fs       = require('fs');
  const path     = require('path');
  const https    = require('https');
  const FormData = require('form-data');

  if (!fs.existsSync(filePath)) {
    throw new Error('Файл не найден: ' + filePath);
  }

  const form = new FormData();
  form.append('chat_id',    String(userChatId));
  form.append('caption',    caption || '');
  form.append('parse_mode', 'HTML');
  form.append('document',   fs.createReadStream(filePath), {
    filename:    path.basename(filePath),
    contentType: 'application/octet-stream'
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${botToken}/sendDocument`,
      method:   'POST',
      headers:  form.getHeaders()
    };

    const req = https.request(options, (res) => {
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
 * Уведомление о покупке
 */
async function notifyPurchase({ firstName, lastName, deptName, productName, price, newBalance, userText }) {
  let text =
    `🛍 <b>Новая покупка</b>\n` +
    `👤 ${lastName} ${firstName} (${deptName})\n` +
    `📦 ${productName}\n` +
    `💰 Списано: <b>${price}</b> линков\n` +
    `💳 Остаток: <b>${newBalance}</b> линков`;

  if (userText) {
    text += `\n✏️ <b>Текст от пользователя:</b> ${userText}`;
  }

  await sendTelegram(text);
}

module.exports = { sendTelegram, notifyPurchase, getSetting, getChatIds, sendDocumentToUser };
