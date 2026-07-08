/**
 * Telegram-уведомления для системы монтажных заявок
 * + inline-бот: "Требует изменений", "Исключить день", "Выполнено"
 *
 * Команды бота:
 *   /start    — Главное меню (постоянная клавиатура)
 *   /zayavki  — Показать последние 5 заявок
 *   /done     — Отметить заявку выполненной
 *   /change   — Заявка требует изменений
 *   /blockday — Исключить день или диапазон дней из графика
 */
const db = require('./db');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : '';
}

function getChatIds() {
  const raw = getSetting('tg_chat_ids');
  return raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

async function sendToOne(botToken, chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`[TG] chat_id=${chatId} ошибка:`, data.description);
    }
    return data;
  } catch (e) {
    console.error(`[TG] chat_id=${chatId} сетевая ошибка:`, e.message);
  }
}

async function sendTelegram(text, extra = {}) {
  const botToken = getSetting('tg_bot_token');
  const chatIds  = getChatIds();
  if (!botToken || chatIds.length === 0) return;
  await Promise.allSettled(chatIds.map(id => sendToOne(botToken, id, text, extra)));
}

/**
 * Отправить фото/документ во все чаты
 */
async function sendPhotoToAll(filePath, caption) {
  const botToken = getSetting('tg_bot_token');
  const chatIds  = getChatIds();
  if (!botToken || chatIds.length === 0) return;

  const fs       = require('fs');
  const path     = require('path');
  const https    = require('https');
  const FormData = require('form-data');

  if (!fs.existsSync(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
  const fieldName = isImage ? 'photo' : 'document';

  for (const chatId of chatIds) {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption || '');
    form.append('parse_mode', 'HTML');
    form.append(fieldName, fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/octet-stream'
    });

    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${botToken}/${endpoint}`,
        method: 'POST',
        headers: form.getHeaders()
      }, (res) => {
        res.resume();
        res.on('end', resolve);
      });
      req.on('error', (e) => { console.error('[TG] sendFile error:', e.message); resolve(); });
      form.pipe(req);
    });
  }
}

const VISIT_TYPE_LABELS = { montage: 'Монтаж', measurement: 'Замер' };
const WORK_PLACE_LABELS = { indoor: 'В помещении', outdoor: 'На улице' };
const STATUS_LABELS     = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };
const STATUS_ICONS      = { new: '🆕', in_progress: '🔧', done: '✅', cancelled: '❌' };

/**
 * Уведомление о новой заявке — с inline-кнопками
 */
async function notifyNew(req) {
  const text =
    `📋 <b>Новая заявка #${req.id}</b>\n` +
    (req.order_number ? `🔢 Заказ: <b>${req.order_number}</b>\n` : '') +
    `👤 Менеджер: <b>${req.user_name || '—'}</b>\n` +
    `🔧 Вид выезда: <b>${VISIT_TYPE_LABELS[req.visit_type] || req.visit_type}</b>\n` +
    `📅 Дата: <b>${req.visit_date}</b>\n` +
    `📍 Место: <b>${WORK_PLACE_LABELS[req.work_place] || req.work_place}</b>\n` +
    `🛠 Что монтируем: <b>${req.work_type}</b>\n` +
    `🏠 Адрес: ${req.address}\n` +
    `📞 Контакты: ${req.contacts}\n` +
    (req.comment ? `💬 Комментарий: ${req.comment}\n` : '');

  await sendTelegram(text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Выполнено',           callback_data: `done_select:${req.id}` },
          { text: '⚠️ Изменения',           callback_data: `nc_pick:${req.id}` }
        ],
        [
          { text: '🚫 Исключить день',      callback_data: `bd_start:${req.id}` }
        ]
      ]
    }
  });
}

/**
 * Уведомление о выполнении заявки
 */
async function notifyDone(req) {
  const text =
    `✅ <b>Заявка #${req.id} выполнена</b>\n` +
    (req.order_number ? `🔢 Заказ: <b>${req.order_number}</b>\n` : '') +
    `👤 Менеджер: <b>${req.user_name || '—'}</b>\n` +
    `🔧 Вид выезда: <b>${VISIT_TYPE_LABELS[req.visit_type] || req.visit_type}</b>\n` +
    `📅 Дата: <b>${req.visit_date}</b>\n` +
    `🛠 Что монтируем: <b>${req.work_type}</b>\n` +
    `🏠 Адрес: ${req.address}`;
  await sendTelegram(text);
}

/**
 * Уведомление об изменении заявки
 */
async function notifyUpdated(req) {
  const text =
    `✏️ <b>Заявка #${req.id} изменена</b>\n` +
    (req.order_number ? `🔢 Заказ: <b>${req.order_number}</b>\n` : '') +
    `👤 Менеджер: <b>${req.user_name || '—'}</b>\n` +
    `🔧 Вид выезда: <b>${VISIT_TYPE_LABELS[req.visit_type] || req.visit_type}</b>\n` +
    `📅 Дата: <b>${req.visit_date}</b>\n` +
    `📍 Место: <b>${WORK_PLACE_LABELS[req.work_place] || req.work_place}</b>\n` +
    `🛠 Что монтируем: <b>${req.work_type}</b>\n` +
    `🏠 Адрес: ${req.address}\n` +
    `📞 Контакты: ${req.contacts}\n` +
    (req.comment ? `💬 Комментарий: ${req.comment}\n` : '') +
    `📊 Статус: <b>${STATUS_LABELS[req.status] || req.status}</b>`;
  await sendTelegram(text);
}

/**
 * Отправить уведомление "Заявка требует изменений" через второй бот в группу
 */
async function notifyChangeRequest(requestId, productId, description, comment) {
  const botToken = getSetting('tg_notify_bot_token');
  const chatId   = getSetting('tg_notify_chat_id');
  if (!botToken || !chatId) return { ok: false, reason: 'Не настроен бот уведомлений' };

  const text = `Заказ №${productId} ${description} требует изменений! ${comment}`;
  const result = await sendToOne(botToken, chatId.trim(), text);
  return result && result.ok ? { ok: true } : { ok: false, reason: result?.description || 'Ошибка отправки' };
}

// ── Вспомогательные утилиты дат ─────────────────────────────────────────────

const RE_DATE  = /^\d{2}\.\d{2}\.\d{4}$/;
const RE_RANGE = /^\d{2}\.\d{2}\.\d{4}-\d{2}\.\d{2}\.\d{4}$/;

/**
 * Разобрать дд.мм.гггг → объект Date (UTC-полночь)
 */
function parseDateDMY(s) {
  const [d, m, y] = s.split('.');
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

/**
 * Преобразовать дату дд.мм.гггг или диапазон дд.мм.гггг-дд.мм.гггг
 * в массив ISO-строк ['гггг-мм-дд', ...]
 * Возвращает null если формат неверный или диапазон перевёрнут.
 */
function inputToIsoDates(text) {
  if (RE_DATE.test(text)) {
    const [d, m, y] = text.split('.');
    return [`${y}-${m}-${d}`];
  }
  if (RE_RANGE.test(text)) {
    // Формат "дд.мм.гггг-дд.мм.гггг" — дефис ровно один, между двумя датами
    const [fromStr, toStr] = text.split('-');
    const from = parseDateDMY(fromStr);
    const to   = parseDateDMY(toStr);
    if (isNaN(from) || isNaN(to)) return null;
    if (to < from) return null; // перевёрнутый диапазон
    const result = [];
    for (let dt = new Date(from); dt <= to; dt.setUTCDate(dt.getUTCDate() + 1)) {
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dt.getUTCDate()).padStart(2, '0');
      result.push(`${y}-${m}-${d}`);
    }
    return result;
  }
  return null;
}

// ── Вспомогательные функции бота ────────────────────────────────────────────

/**
 * Получить заявки (не отменённые) с поддержкой пагинации
 */
function getLastRequests(limit = 5, offset = 0) {
  return db.prepare(`
    SELECT id, order_number, work_type, visit_date, status
    FROM requests
    WHERE status != 'cancelled'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

/**
 * Получить общее количество активных заявок
 */
function countActiveRequests() {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM requests WHERE status != 'cancelled'`).get();
  return row ? row.cnt : 0;
}

/**
 * Сформировать inline-клавиатуру с заявками для выбора (используется в /change)
 */
function buildRequestsKeyboard(requests, callbackPrefix) {
  return requests.map(r => {
    const label = r.order_number
      ? `Заказ №${r.order_number} — ${r.work_type}`
      : `#${r.id} — ${r.work_type}`;
    const date = r.visit_date ? ` (${r.visit_date.split('-').reverse().join('.')})` : '';
    return [{ text: label + date, callback_data: `${callbackPrefix}:${r.id}` }];
  });
}

/**
 * Сформировать текстовый список заявок для отображения (/zayavki)
 */
function formatRequestsList(reqs) {
  if (reqs.length === 0) return '📋 Активных заявок нет.';
  return reqs.map(r => {
    const icon  = STATUS_ICONS[r.status] || '📋';
    const label = r.order_number ? `Заказ №${r.order_number}` : `Заявка #${r.id}`;
    const date  = r.visit_date ? r.visit_date.split('-').reverse().join('.') : '—';
    return `${icon} <b>${label}</b> — ${r.work_type}\n    📅 ${date}`;
  }).join('\n\n');
}

/**
 * Отправить список заявок с кнопками пагинации.
 * Если передан editMessageId — редактирует существующее сообщение (пагинация).
 */
async function sendRequestsList(botToken, chatId, offset = 0, editMessageId = null) {
  const PAGE  = 5;
  const total = countActiveRequests();
  const reqs  = getLastRequests(PAGE, offset);

  let text;
  if (total === 0 || reqs.length === 0) {
    text = `📋 <b>Заявки</b>\n\nАктивных заявок нет.`;
  } else {
    const from   = offset + 1;
    const to     = offset + reqs.length;
    text = `📋 <b>Заявки</b> (${from}–${to} из ${total}):\n\n` + formatRequestsList(reqs);
  }

  // Кнопки пагинации
  const navRow = [];
  if (offset > 0) {
    navRow.push({ text: '◀️ Предыдущие 5', callback_data: `list_page:${offset - PAGE}` });
  }
  if (offset + PAGE < total) {
    navRow.push({ text: 'Следующие 5 ▶️', callback_data: `list_page:${offset + PAGE}` });
  }
  const reply_markup = { inline_keyboard: navRow.length > 0 ? [navRow] : [] };

  if (editMessageId) {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: editMessageId,
        text,
        parse_mode: 'HTML',
        reply_markup
      })
    });
  } else {
    await sendToOne(botToken, chatId, text, { reply_markup });
  }
}

/**
 * Зарегистрировать команды бота через setMyCommands
 */
async function registerBotCommands(botToken) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start',    description: 'Главное меню' },
          { command: 'zayavki', description: 'Последние заявки' },
          { command: 'done',     description: 'Отметить заявку выполненной' },
          { command: 'change',   description: 'Заявка требует изменений' },
          { command: 'blockday', description: 'Исключить день из графика' },
          { command: 'chatid',   description: 'Показать chat_id этой группы' }
        ]
      })
    });
    console.log('[TG-bot] Команды бота зарегистрированы: /start, /zayavki, /done, /change, /blockday');
  } catch (e) {
    console.error('[TG-bot] Ошибка регистрации команд:', e.message);
  }
}

// ── Вспомогательные функции регистрации ─────────────────────────────────────

/**
 * Проверить, зарегистрирован ли пользователь
 */
function isRegistered(chatId) {
  const row = db.prepare('SELECT id FROM bot_users WHERE chat_id=?').get(String(chatId));
  return !!row;
}

/**
 * Зарегистрировать пользователя
 */
function registerUser(chatId, name) {
  db.prepare('INSERT OR IGNORE INTO bot_users (chat_id, name) VALUES (?, ?)').run(String(chatId), name);
}

// ── Polling-бот ─────────────────────────────────────────────────────────────
// Состояние диалога: chatId → { step, requestId, dateInput }
// Для регистрации используется step: 'reg_name'
const dialogState = {};

let pollingOffset = 0;
let pollingActive = false;
let pollingTimer  = null;

async function pollUpdates() {
  if (!pollingActive) return;

  const botToken = getSetting('tg_bot_token');
  if (!botToken) {
    pollingTimer = setTimeout(pollUpdates, 10000);
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${pollingOffset}&timeout=25&allowed_updates=["callback_query","message","my_chat_member"]`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        pollingOffset = update.update_id + 1;
        await handleUpdate(botToken, update);
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError' && e.name !== 'TimeoutError') {
      console.error('[TG-poll] ошибка:', e.message);
    }
  }

  if (pollingActive) {
    pollingTimer = setTimeout(pollUpdates, 1000);
  }
}

/**
 * Отправить главное меню зарегистрированному пользователю
 */
async function sendMainMenu(botToken, chatId, name) {
  await sendToOne(botToken, chatId,
    `👋 Привет, <b>${name}</b>!\n\n` +
    `Используйте кнопки меню или команды:\n\n` +
    `📋 /zayavki — Последние заявки\n` +
    `✅ /done — Отметить заявку выполненной\n` +
    `⚠️ /change — Заявка требует изменений\n` +
    `🚫 /blockday — Исключить день из графика`,
    {
      reply_markup: {
        keyboard: [
          [{ text: '📋 Заявки' }, { text: '✅ Выполнено' }],
          [{ text: '⚠️ Изменения' }, { text: '🚫 Исключить день' }]
        ],
        resize_keyboard: true,
        persistent: true
      }
    }
  );
}

async function handleUpdate(botToken, update) {

  // ── Callback от inline-кнопок ──────────────────────────────────────────────
  if (update.callback_query) {
    const cq     = update.callback_query;
    const chatId = String(cq.message.chat.id);
    const data   = cq.data;

    // Убираем "часики" у кнопки
    await answerCallback(botToken, cq.id);

    // Для callback тоже проверяем регистрацию
    if (!isRegistered(chatId)) {
      await answerCallback(botToken, cq.id);
      await sendToOne(botToken, chatId,
        `⚠️ Сначала пройдите регистрацию — отправьте команду /start`
      );
      return;
    }

    // ── list_page: — пагинация списка заявок ─────────────────────────────────
    if (data.startsWith('list_page:')) {
      const offset    = parseInt(data.split(':')[1], 10) || 0;
      const messageId = cq.message.message_id;
      await sendRequestsList(botToken, chatId, offset, messageId);
      return;
    }

    // ── nc_pick: — нажата кнопка "Требует изменений" на уведомлении о заявке
    if (data.startsWith('nc_pick:')) {
      const reqs = getLastRequests(5);
      if (reqs.length === 0) {
        await sendToOne(botToken, chatId, '📋 Активных заявок нет.');
        return;
      }
      const keyboard = buildRequestsKeyboard(reqs, 'nc_select');
      keyboard.push([{ text: '❌ Отмена', callback_data: 'nc_cancel' }]);
      dialogState[chatId] = { step: 'nc_picking' };
      await sendToOne(botToken, chatId,
        `⚠️ <b>Заявка требует изменений</b>\n\nВыберите заявку из списка:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
      return;
    }

    // ── nc_select: — монтажник выбрал конкретную заявку из списка
    if (data.startsWith('nc_select:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      if (!req) {
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }
      dialogState[chatId] = { step: 'nc_action', requestId: reqId };
      const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
      const dateFormatted = req.visit_date
        ? req.visit_date.split('-').reverse().join('.')
        : '—';
      await sendToOne(botToken, chatId,
        `⚠️ <b>Требует изменений</b>\n\n` +
        `Выбрано: <b>${label} — ${req.work_type}</b> (${dateFormatted})\n\n` +
        `Что именно требует изменений?`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Изменить даты работы', callback_data: `nc_changedate:${reqId}` }],
              [{ text: '✏️ Другое',               callback_data: `nc_other:${reqId}` }],
              [{ text: '❌ Отмена',               callback_data: 'nc_cancel' }]
            ]
          }
        }
      );
      return;
    }

    // ── nc_other: — пользователь выбрал "Другое", переходим к вводу комментария
    if (data.startsWith('nc_other:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      if (!req) {
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }
      dialogState[chatId] = { step: 'nc_comment', requestId: reqId };
      const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
      const dateFormatted = req.visit_date
        ? req.visit_date.split('-').reverse().join('.')
        : '—';
      await sendToOne(botToken, chatId,
        `✏️ <b>Другое — требует изменений</b>\n\n` +
        `Заявка: <b>${label} — ${req.work_type}</b> (${dateFormatted})\n\n` +
        `Введите комментарий — что нужно изменить:\n` +
        `<i>Для отмены отправьте /cancel</i>`
      );
      return;
    }

    // ── nc_changedate: — пользователь выбрал "Изменить даты работы"
    if (data.startsWith('nc_changedate:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      if (!req) {
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }
      dialogState[chatId] = { step: 'nc_date_input', requestId: reqId };
      const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
      await sendToOne(botToken, chatId,
        `📅 <b>Изменить даты работы</b>\n\n` +
        `Заявка: <b>${label} — ${req.work_type}</b>\n\n` +
        `Укажите новую дату или диапазон дат:\n` +
        `• Одна дата: <code>дд.мм.гггг</code>\n` +
        `• Диапазон: <code>дд.мм.гггг-дд.мм.гггг</code>\n\n` +
        `<i>Для отмены отправьте /cancel</i>`
      );
      return;
    }

    // ── nc_cancel — отмена выбора заявки / типа изменения
    if (data === 'nc_cancel') {
      delete dialogState[chatId];
      await sendToOne(botToken, chatId, '❌ Действие отменено.');
      return;
    }

    // ── done_select: — пользователь выбрал заявку для отметки выполненной
    if (data.startsWith('done_select:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      if (!req) {
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }
      if (req.status === 'done') {
        delete dialogState[chatId];
        const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
        await sendToOne(botToken, chatId, `ℹ️ <b>${label}</b> уже отмечена как выполненная.`);
        return;
      }
      const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
      const dateFormatted = req.visit_date
        ? req.visit_date.split('-').reverse().join('.')
        : '—';
      dialogState[chatId] = { step: 'done_confirm', requestId: reqId };
      await sendToOne(botToken, chatId,
        `✅ <b>Отметить выполненной?</b>\n\n` +
        `<b>${label} — ${req.work_type}</b>\n` +
        `📅 ${dateFormatted}\n` +
        `🏠 ${req.address}\n\n` +
        `Подтвердите выполнение заявки:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Да, выполнена', callback_data: `done_confirm:${reqId}` }],
              [{ text: '❌ Отмена',        callback_data: 'done_cancel' }]
            ]
          }
        }
      );
      return;
    }

    // ── done_confirm: — подтверждение отметки заявки выполненной
    if (data.startsWith('done_confirm:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      if (!req) {
        delete dialogState[chatId];
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }
      if (req.status === 'done') {
        delete dialogState[chatId];
        const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
        await sendToOne(botToken, chatId, `ℹ️ <b>${label}</b> уже отмечена как выполненная.`);
        return;
      }

      // Обновляем статус в БД
      db.prepare(`
        UPDATE requests SET status = 'done', updated_at = datetime('now', '+3 hours') WHERE id = ?
      `).run(reqId);

      const updated = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      delete dialogState[chatId];

      const label = updated.order_number ? `Заказ №${updated.order_number}` : `Заявка #${updated.id}`;
      await sendToOne(botToken, chatId,
        `✅ <b>${label}</b> отмечена как выполненная!\n\n` +
        `🛠 ${updated.work_type}\n` +
        `📅 ${updated.visit_date ? updated.visit_date.split('-').reverse().join('.') : '—'}\n` +
        `🏠 ${updated.address}`
      );

      // Уведомляем все чаты
      notifyDone(updated).catch(e => console.error('[TG] notifyDone error:', e.message));
      return;
    }

    // ── done_cancel — отмена отметки выполненной
    if (data === 'done_cancel') {
      delete dialogState[chatId];
      await sendToOne(botToken, chatId, '❌ Действие отменено.');
      return;
    }

    // ── bd_start: — нажата кнопка "Исключить день" на уведомлении о заявке
    if (data.startsWith('bd_start:')) {
      const reqId = parseInt(data.split(':')[1], 10);
      const req   = db.prepare('SELECT * FROM requests WHERE id=?').get(reqId);
      const suggestedDate = req ? req.visit_date : null;
      dialogState[chatId] = { step: 'bd_date', requestId: reqId, suggestedDate };

      let prompt =
        `🚫 <b>Исключить дни из графика</b>\n\n` +
        `Укажите один день или диапазон:\n` +
        `• Один день: <code>дд.мм.гггг</code>\n` +
        `• Диапазон: <code>дд.мм.гггг-дд.мм.гггг</code>`;
      if (suggestedDate) {
        const [y, m, d] = suggestedDate.split('-');
        prompt += `\n\n💡 Дата из заявки: <code>${d}.${m}.${y}</code>`;
      }
      prompt += `\n\n<i>Для отмены отправьте /cancel</i>`;
      await sendToOne(botToken, chatId, prompt);
      return;
    }

    // Неизвестный callback — игнорируем
    return;
  }

  // ── Бот добавлен в группу/чат ─────────────────────────────────────────────
  if (update.my_chat_member) {
    const mcm      = update.my_chat_member;
    const newStatus = mcm.new_chat_member && mcm.new_chat_member.status;
    const chat     = mcm.chat;

    // Бот стал участником группы (added → member / administrator)
    if (
      chat &&
      (chat.type === 'group' || chat.type === 'supergroup') &&
      (newStatus === 'member' || newStatus === 'administrator')
    ) {
      const groupChatId = String(chat.id);
      const groupTitle  = chat.title || groupChatId;

      // Сохраняем chat_id в настройку tg_notify_chat_id
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('tg_notify_chat_id', ?)`)
        .run(groupChatId);

      console.log(`[TG-bot] Бот добавлен в группу "${groupTitle}" (chat_id=${groupChatId}) — chat_id сохранён в настройки`);

      // Отправляем приветствие в группу
      await sendToOne(botToken, groupChatId,
        `✅ Бот уведомлений подключён!\n\n` +
        `Группа <b>${groupTitle}</b> зарегистрирована для получения уведомлений о заявках, требующих изменений.\n\n` +
        `<code>chat_id: ${groupChatId}</code>`
      );
    }
    return;
  }

  // ── Текстовые сообщения ───────────────────────────────────────────────────
  if (update.message && update.message.text) {
    const msg    = update.message;
    const chatId = String(msg.chat.id);
    const text   = msg.text.trim();
    const state  = dialogState[chatId];

    // ── /chatid — показать chat_id текущего чата ─────────────────────────────
    if (text === '/chatid' || text.startsWith('/chatid@')) {
      await sendToOne(botToken, chatId,
        `🆔 <b>Chat ID этой группы:</b>\n<code>${chatId}</code>`
      );
      return;
    }

    // ── /start — запуск регистрации или показ меню ────────────────────────────
    if (text === '/start' || text.startsWith('/start@')) {
      delete dialogState[chatId]; // сбрасываем любой активный диалог
      if (isRegistered(chatId)) {
        const user = db.prepare('SELECT name FROM bot_users WHERE chat_id=?').get(chatId);
        await sendMainMenu(botToken, chatId, user.name);
      } else {
        dialogState[chatId] = { step: 'reg_name' };
        await sendToOne(botToken, chatId,
          `👋 <b>Добро пожаловать в бот системы монтажных заявок!</b>\n\n` +
          `Для начала работы необходимо зарегистрироваться.\n\n` +
          `Пожалуйста, введите ваше имя:`,
          { reply_markup: { remove_keyboard: true } }
        );
      }
      return;
    }

    // ── Шаг регистрации: ввод имени ──────────────────────────────────────────
    if (state && state.step === 'reg_name') {
      const name = text;
      if (!name || name.startsWith('/')) {
        await sendToOne(botToken, chatId, '⚠️ Пожалуйста, введите ваше имя (не команду):');
        return;
      }
      registerUser(chatId, name);
      delete dialogState[chatId];
      console.log(`[TG-bot] Зарегистрирован новый пользователь: ${name} (chat_id=${chatId})`);
      await sendMainMenu(botToken, chatId, name);
      return;
    }

    // ── Проверка регистрации для всего остального функционала ─────────────────
    if (!isRegistered(chatId)) {
      await sendToOne(botToken, chatId,
        `⚠️ Вы не зарегистрированы.\n\nОтправьте /start для прохождения регистрации.`
      );
      return;
    }

    // ── /zayavki — список последних заявок ───────────────────────────────────
    if (text === '/zayavki' || text.startsWith('/zayavki@') || text === '📋 Заявки') {
      await sendRequestsList(botToken, chatId, 0);
      return;
    }

    // ── /change — запуск сценария "Заявка требует изменений" ─────────────────
    if (text === '/change' || text.startsWith('/change@') || text === '⚠️ Изменения') {
      const reqs = getLastRequests(5);
      if (reqs.length === 0) {
        await sendToOne(botToken, chatId,
          `📋 <b>Активных заявок нет.</b>\n\nКак только появятся новые заявки, они отобразятся здесь.`
        );
        return;
      }
      const keyboard = buildRequestsKeyboard(reqs, 'nc_select');
      keyboard.push([{ text: '❌ Отмена', callback_data: 'nc_cancel' }]);
      dialogState[chatId] = { step: 'nc_picking' };
      await sendToOne(botToken, chatId,
        `⚠️ <b>Заявка требует изменений</b>\n\nВыберите заявку из списка последних 5 активных заявок:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
      return;
    }

    // ── /done — запуск сценария "Отметить выполненной" ───────────────────────
    if (text === '/done' || text.startsWith('/done@') || text === '✅ Выполнено') {
      const reqs = getLastRequests(5);
      if (reqs.length === 0) {
        await sendToOne(botToken, chatId,
          `📋 <b>Активных заявок нет.</b>\n\nКак только появятся новые заявки, они отобразятся здесь.`
        );
        return;
      }
      // Показываем только не-выполненные заявки
      const pendingReqs = reqs.filter(r => r.status !== 'done');
      if (pendingReqs.length === 0) {
        await sendToOne(botToken, chatId,
          `✅ <b>Все последние заявки уже выполнены!</b>`
        );
        return;
      }
      const keyboard = buildRequestsKeyboard(pendingReqs, 'done_select');
      keyboard.push([{ text: '❌ Отмена', callback_data: 'done_cancel' }]);
      dialogState[chatId] = { step: 'done_picking' };
      await sendToOne(botToken, chatId,
        `✅ <b>Отметить заявку выполненной</b>\n\nВыберите заявку из списка:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
      return;
    }

    // ── /blockday — запуск сценария "Исключить день / диапазон" ──────────────
    if (text === '/blockday' || text.startsWith('/blockday@') || text === '🚫 Исключить день') {
      dialogState[chatId] = { step: 'bd_date' };
      await sendToOne(botToken, chatId,
        `🚫 <b>Исключить дни из графика</b>\n\n` +
        `Укажите один день или диапазон:\n` +
        `• Один день: <code>дд.мм.гггг</code>\n` +
        `• Диапазон: <code>дд.мм.гггг-дд.мм.гггг</code>\n\n` +
        `Примеры: <code>15.08.2026</code> или <code>15.08.2026-20.08.2026</code>\n\n` +
        `<i>Для отмены отправьте /cancel</i>`
      );
      return;
    }

    // ── /cancel ───────────────────────────────────────────────────────────────
    if (text === '/cancel' || text.startsWith('/cancel@') || text.toLowerCase() === 'отмена') {
      if (state) {
        delete dialogState[chatId];
        await sendToOne(botToken, chatId, '❌ Действие отменено.');
      }
      return;
    }

    // Нет активного диалога — игнорируем прочие сообщения
    if (!state) return;

    // ── Шаг: ввод даты(диапазона) для "Изменить даты работы" ─────────────────
    if (state.step === 'nc_date_input') {
      // Принимаем одну дату дд.мм.гггг или диапазон дд.мм.гггг-дд.мм.гггг
      const singleDate = /^\d{2}\.\d{2}\.\d{4}$/;
      const rangeDate  = /^\d{2}\.\d{2}\.\d{4}-\d{2}\.\d{2}\.\d{4}$/;

      if (!singleDate.test(text) && !rangeDate.test(text)) {
        await sendToOne(botToken, chatId,
          `⚠️ Неверный формат.\n\n` +
          `Введите одну дату: <code>дд.мм.гггг</code>\n` +
          `или диапазон: <code>дд.мм.гггг-дд.мм.гггг</code>\n\n` +
          `Например: <code>15.08.2026</code> или <code>15.08.2026-20.08.2026</code>`
        );
        return;
      }

      const req = db.prepare('SELECT * FROM requests WHERE id=?').get(state.requestId);
      if (!req) {
        delete dialogState[chatId];
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }

      const label = req.order_number ? `Заказ №${req.order_number}` : `заявка #${req.id}`;
      const isRange = rangeDate.test(text);
      const dateLabel = isRange ? `диапазон дат: ${text}` : `дата: ${text}`;
      const notifyText = isRange
        ? `Заказ №${req.order_number || req.id} ${req.work_type} — требует изменения дат работы. Новый диапазон: ${text}`
        : `Заказ №${req.order_number || req.id} ${req.work_type} — требует изменения даты работы. Новая дата: ${text}`;

      const result = await notifyChangeRequest(
        req.id,
        req.order_number || `заявка #${req.id}`,
        req.work_type,
        isRange ? `Изменить даты работы: ${text}` : `Изменить дату работы: ${text}`
      );

      delete dialogState[chatId];

      if (result.ok) {
        await sendToOne(botToken, chatId,
          `✅ Уведомление отправлено!\n\n` +
          `📋 <b>${label.replace('заявка', 'Заявка')}</b> — ${req.work_type}\n` +
          `📅 Запрошенный ${dateLabel}`
        );
      } else {
        await sendToOne(botToken, chatId, `❌ Ошибка отправки: ${result.reason}`);
      }
      return;
    }

    // ── Шаг: ввод комментария для "Требует изменений" (вариант "Другое") ──────
    if (state.step === 'nc_comment') {
      if (!text) {
        await sendToOne(botToken, chatId, '⚠️ Комментарий не может быть пустым. Введите описание изменений:');
        return;
      }

      const req = db.prepare('SELECT * FROM requests WHERE id=?').get(state.requestId);
      if (!req) {
        delete dialogState[chatId];
        await sendToOne(botToken, chatId, '❌ Заявка не найдена.');
        return;
      }

      const result = await notifyChangeRequest(
        req.id,
        req.order_number || `заявка #${req.id}`,
        req.work_type,
        text
      );

      delete dialogState[chatId];

      if (result.ok) {
        const label = req.order_number ? `Заказ №${req.order_number}` : `Заявка #${req.id}`;
        await sendToOne(botToken, chatId,
          `✅ Уведомление отправлено!\n\n` +
          `📋 <b>${label}</b> — ${req.work_type}\n` +
          `💬 Комментарий: ${text}`
        );
      } else {
        await sendToOne(botToken, chatId, `❌ Ошибка отправки: ${result.reason}`);
      }
      return;
    }

    // ── Шаг: ввод даты или диапазона для "Исключить день" ────────────────────
    if (state.step === 'bd_date') {
      const isoDates = inputToIsoDates(text);

      if (!isoDates) {
        await sendToOne(botToken, chatId,
          `⚠️ Неверный формат.\n\n` +
          `Введите один день: <code>дд.мм.гггг</code>\n` +
          `или диапазон: <code>дд.мм.гггг-дд.мм.гггг</code>\n\n` +
          `Примеры: <code>15.08.2026</code> или <code>15.08.2026-20.08.2026</code>\n\n` +
          `<i>Если указан диапазон — убедитесь, что начальная дата не позже конечной.</i>`
        );
        return;
      }

      const isRange = isoDates.length > 1;
      const label   = isRange
        ? `📅 Диапазон: <b>${text}</b> (${isoDates.length} дн.)`
        : `📅 Дата: <b>${text}</b>`;

      dialogState[chatId] = { ...state, step: 'bd_reason', dateInput: text, isoDates };
      await sendToOne(botToken, chatId,
        `${label}\n\n` +
        `✏️ Введите причину блокировки (обязательно):\n` +
        `<i>Для отмены отправьте /cancel</i>`
      );
      return;
    }

    // ── Шаг: ввод причины для "Исключить день / диапазон" ────────────────────
    if (state.step === 'bd_reason') {
      if (!text) {
        await sendToOne(botToken, chatId, '⚠️ Причина не может быть пустой. Введите причину блокировки:');
        return;
      }

      const isoDates = state.isoDates;
      const isRange  = isoDates.length > 1;

      // Вставляем все даты в одной транзакции
      const insertStmt = db.prepare('INSERT OR IGNORE INTO blocked_days (date, reason) VALUES (?, ?)');
      const insertMany = db.transaction((dates, reason) => {
        let inserted = 0;
        for (const d of dates) {
          const info = insertStmt.run(d, reason);
          if (info.changes > 0) inserted++;
        }
        return inserted;
      });

      const inserted = insertMany(isoDates, text);
      delete dialogState[chatId];

      if (isRange) {
        const skipped = isoDates.length - inserted;
        let msg = `✅ Заблокировано <b>${inserted}</b> из <b>${isoDates.length}</b> дней!\n` +
                  `📅 Диапазон: <b>${state.dateInput}</b>\n` +
                  `📝 Причина: ${text}`;
        if (skipped > 0) {
          msg += `\n\n⚠️ <b>${skipped}</b> дней уже были заблокированы ранее — пропущены.`;
        }
        await sendToOne(botToken, chatId, msg);
      } else {
        if (inserted === 0) {
          await sendToOne(botToken, chatId,
            `⚠️ День <b>${state.dateInput}</b> уже был заблокирован ранее.`
          );
        } else {
          await sendToOne(botToken, chatId,
            `✅ День <b>${state.dateInput}</b> заблокирован!\n📝 Причина: ${text}`
          );
        }
      }
      return;
    }
  }
}

// ── Polling бота уведомлений (tg_notify_bot_token) ──────────────────────────

let notifyPollingOffset = 0;
let notifyPollingActive = false;
let notifyPollingTimer  = null;

/**
 * Зарегистрировать команды бота уведомлений
 */
async function registerNotifyBotCommands(botToken) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'chatid', description: 'Показать chat_id этой группы' }
        ]
      })
    });
    console.log('[TG-notify] Команды бота уведомлений зарегистрированы: /chatid');
  } catch (e) {
    console.error('[TG-notify] Ошибка регистрации команд:', e.message);
  }
}

/**
 * Обработать одно обновление бота уведомлений
 */
async function handleNotifyUpdate(botToken, update) {
  // ── Бот уведомлений добавлен в группу ──────────────────────────────────────
  if (update.my_chat_member) {
    const mcm       = update.my_chat_member;
    const newStatus = mcm.new_chat_member && mcm.new_chat_member.status;
    const chat      = mcm.chat;

    if (
      chat &&
      (chat.type === 'group' || chat.type === 'supergroup') &&
      (newStatus === 'member' || newStatus === 'administrator')
    ) {
      const groupChatId = String(chat.id);
      const groupTitle  = chat.title || groupChatId;

      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('tg_notify_chat_id', ?)`)
        .run(groupChatId);

      console.log(`[TG-notify] Бот уведомлений добавлен в группу "${groupTitle}" (chat_id=${groupChatId}) — сохранено в настройки`);

      await sendToOne(botToken, groupChatId,
        `✅ Бот уведомлений об изменениях подключён!\n\n` +
        `Группа <b>${groupTitle}</b> зарегистрирована — сюда будут приходить уведомления о заявках, требующих изменений.\n\n` +
        `<code>chat_id: ${groupChatId}</code>`
      );
    }
    return;
  }

  // ── /chatid — показать chat_id текущей группы ──────────────────────────────
  if (update.message && update.message.text) {
    const msg    = update.message;
    const chatId = String(msg.chat.id);
    const text   = msg.text.trim();

    if (text === '/chatid' || text.startsWith('/chatid@')) {
      await sendToOne(botToken, chatId,
        `🆔 <b>Chat ID этой группы:</b>\n<code>${chatId}</code>`
      );
    }
  }
}

async function pollNotifyUpdates() {
  if (!notifyPollingActive) return;

  const botToken = getSetting('tg_notify_bot_token');
  if (!botToken) {
    notifyPollingTimer = setTimeout(pollNotifyUpdates, 10000);
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${notifyPollingOffset}&timeout=25&allowed_updates=["message","my_chat_member"]`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        notifyPollingOffset = update.update_id + 1;
        await handleNotifyUpdate(botToken, update);
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError' && e.name !== 'TimeoutError') {
      console.error('[TG-notify-poll] ошибка:', e.message);
    }
  }

  if (notifyPollingActive) {
    notifyPollingTimer = setTimeout(pollNotifyUpdates, 1000);
  }
}

function startNotifyBotPolling() {
  if (notifyPollingActive) return;
  notifyPollingActive = true;
  console.log('[TG-notify] Polling бота уведомлений запущен');

  const botToken = getSetting('tg_notify_bot_token');
  if (botToken) {
    registerNotifyBotCommands(botToken).catch(() => {});
  }

  pollNotifyUpdates();
}

function stopNotifyBotPolling() {
  notifyPollingActive = false;
  if (notifyPollingTimer) clearTimeout(notifyPollingTimer);
  console.log('[TG-notify] Polling бота уведомлений остановлен');
}

async function answerCallback(botToken, callbackQueryId) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId })
    });
  } catch (e) { /* игнорируем */ }
}

/**
 * Запустить polling бота
 */
function startBotPolling() {
  if (pollingActive) return;
  pollingActive = true;
  console.log('[TG-bot] Polling запущен');

  const botToken = getSetting('tg_bot_token');
  if (botToken) {
    registerBotCommands(botToken).catch(() => {});
  }

  pollUpdates();
  startNotifyBotPolling();
}

/**
 * Остановить polling
 */
function stopBotPolling() {
  pollingActive = false;
  if (pollingTimer) clearTimeout(pollingTimer);
  console.log('[TG-bot] Polling остановлен');
  stopNotifyBotPolling();
}

module.exports = {
  sendTelegram,
  notifyNew,
  notifyDone,
  notifyUpdated,
  notifyChangeRequest,
  getSetting,
  getChatIds,
  sendPhotoToAll,
  startBotPolling,
  stopBotPolling
};
