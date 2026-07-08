/**
 * API роуты для работы с заявками (пользовательская часть)
 * POST /api/requests          — создать заявку
 * GET  /api/requests/:id      — получить заявку по id
 * PUT  /api/requests/:id      — обновить заявку
 * GET  /api/available-dates   — получить доступные даты (с учётом лимитов/буфера/блокировок)
 * GET  /api/work-types        — список видов работ
 * GET  /api/files/:filename   — скачать файл
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { notifyNew, notifyUpdated, notifyChangeRequest, sendPhotoToAll } = require('../telegram');

const router = express.Router();

// ── Хранилище файлов ───────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    // Разрешаем изображения, PDF и офисные документы
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|zip|rar)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Неподдерживаемый тип файла'));
  }
});

// ── Хелперы ────────────────────────────────────────────────────────────────

function getLimits() {
  return db.prepare('SELECT * FROM limits WHERE id=1').get();
}

function isBlocked(date) {
  return !!db.prepare('SELECT id FROM blocked_days WHERE date=?').get(date);
}

/**
 * Считаем количество заявок определённого типа на дату
 */
function countOnDate(date, visitType) {
  return db.prepare(
    `SELECT COUNT(*) AS cnt FROM requests
     WHERE visit_date=? AND visit_type=? AND status NOT IN ('cancelled')`
  ).get(date, visitType).cnt;
}

/**
 * Проверяет, можно ли создать заявку на указанную дату + тип
 * Возвращает { ok: bool, reason: string }
 */
function checkDateAvailability(date, visitType) {
  if (isBlocked(date)) {
    return { ok: false, reason: 'День заблокирован администратором' };
  }

  const lim = getLimits();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  // Буфер отсрочки
  const bufferDays = visitType === 'montage'
    ? (lim.buffer_montage_days || 0)
    : (lim.buffer_measure_days || 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + bufferDays);

  if (target < minDate) {
    return {
      ok: false,
      reason: `Минимальная дата для ${visitType === 'montage' ? 'монтажа' : 'замера'}: через ${bufferDays} дн.`
    };
  }

  // Лимит по типу
  const countType = countOnDate(date, visitType);
  const limitType = visitType === 'montage' ? lim.montage_per_day : lim.measurement_per_day;
  if (countType >= limitType) {
    return { ok: false, reason: 'Достигнут лимит заявок на этот день' };
  }

  // Суммарный лимит (монтаж + замер вместе)
  const countAll = countOnDate(date, 'montage') + countOnDate(date, 'measurement');
  if (countAll >= lim.combined_per_day) {
    return { ok: false, reason: 'Достигнут общий лимит заявок на этот день' };
  }

  return { ok: true };
}

// ── GET /api/work-types ────────────────────────────────────────────────────
router.get('/work-types', (req, res) => {
  const types = db.prepare(
    'SELECT id, name FROM work_types WHERE active=1 ORDER BY sort_order, name'
  ).all();
  res.json(types);
});

// ── GET /api/available-dates ───────────────────────────────────────────────
// ?type=montage|measurement&months=2
router.get('/available-dates', (req, res) => {
  const visitType = req.query.type === 'measurement' ? 'measurement' : 'montage';
  const months    = Math.min(parseInt(req.query.months) || 2, 6);
  const lim       = getLimits();

  const today  = new Date();
  today.setHours(0, 0, 0, 0);

  // Буфер
  const bufferDays = visitType === 'montage'
    ? (lim.buffer_montage_days || 0)
    : (lim.buffer_measure_days || 0);

  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() + bufferDays);

  const toDate = new Date(today);
  toDate.setMonth(toDate.getMonth() + months);

  // Получаем заблокированные дни
  const blocked = new Set(
    db.prepare('SELECT date FROM blocked_days').all().map(r => r.date)
  );

  // Получаем занятые дни из БД
  const rows = db.prepare(
    `SELECT visit_date, visit_type, COUNT(*) AS cnt
     FROM requests
     WHERE visit_date >= ? AND visit_date <= ? AND status NOT IN ('cancelled')
     GROUP BY visit_date, visit_type`
  ).all(fromDate.toISOString().slice(0, 10), toDate.toISOString().slice(0, 10));

  // Индексируем
  const countMap = {};
  for (const r of rows) {
    if (!countMap[r.visit_date]) countMap[r.visit_date] = { montage: 0, measurement: 0 };
    countMap[r.visit_date][r.visit_type] = r.cnt;
  }

  const available = [];
  const withRequests = []; // даты, на которых есть хотя бы одна заявка (любого пользователя)
  const cur = new Date(fromDate);
  while (cur <= toDate) {
    const dateStr = cur.toISOString().slice(0, 10);

    // Пропускаем выходные (при желании можно убрать)
    // const dayOfWeek = cur.getDay();
    // if (dayOfWeek === 0 || dayOfWeek === 6) { cur.setDate(cur.getDate() + 1); continue; }

    const counts   = countMap[dateStr] || { montage: 0, measurement: 0 };
    const totalAll = counts.montage + counts.measurement;
    const countT   = counts[visitType];

    // Если на эту дату есть хоть одна заявка — добавляем в withRequests
    if (totalAll > 0) {
      withRequests.push(dateStr);
    }

    if (!blocked.has(dateStr)) {
      const limitT = visitType === 'montage' ? lim.montage_per_day : lim.measurement_per_day;

      if (countT < limitT && totalAll < lim.combined_per_day) {
        available.push({
          date:      dateStr,
          remaining: Math.min(limitT - countT, lim.combined_per_day - totalAll)
        });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  res.json({ available, withRequests, limits: lim });
});

// ── POST /api/requests ─────────────────────────────────────────────────────
router.post('/', upload.array('files', 10), async (req, res) => {
  const { order_number, visit_type, visit_date, work_place, work_type, address, contacts, comment, user_name } = req.body;

  // Валидация
  if (!visit_type || !visit_date || !work_place || !work_type || !address || !contacts) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  const check = checkDateAvailability(visit_date, visit_type);
  if (!check.ok) {
    return res.status(409).json({ error: check.reason });
  }

  const insertReq = db.prepare(`
    INSERT INTO requests (order_number, visit_type, visit_date, work_place, work_type, address, contacts, comment, user_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFile = db.prepare(`
    INSERT INTO request_files (request_id, filename, orig_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  let requestId;
  db.transaction(() => {
    const info = insertReq.run(
      order_number || null, visit_type, visit_date, work_place, work_type,
      address, contacts, comment || null, user_name || null
    );
    requestId = info.lastInsertRowid;

    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        insertFile.run(requestId, f.filename, f.originalname, f.mimetype, f.size);
      }
    }
  })();

  const created = db.prepare('SELECT * FROM requests WHERE id=?').get(requestId);

  // Telegram уведомление
  try {
    await notifyNew(created);
    // Отправить файлы
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        await sendPhotoToAll(
          path.join(UPLOADS_DIR, f.filename),
          `📎 Файл к заявке #${requestId}: ${f.originalname}`
        );
      }
    }
  } catch (e) {
    console.error('[TG] ошибка отправки:', e.message);
  }

  res.json({ id: requestId, success: true });
});

// ── GET /api/requests/recent ───────────────────────────────────────────────
// Последние 5 заявок (для выбора в "требует изменений")
// ?user=username  — фильтр по имени пользователя (необязательно)
// ВАЖНО: до /:id
router.get('/recent', (req, res) => {
  const user = req.query.user;
  let rows;
  if (user) {
    rows = db.prepare(
      `SELECT id, order_number, work_type, visit_date, status
       FROM requests WHERE status NOT IN ('cancelled','done') AND user_name = ?
       ORDER BY id DESC LIMIT 5`
    ).all(user);
    // Если нет заявок по пользователю — отдаём общие
    if (!rows.length) {
      rows = db.prepare(
        `SELECT id, order_number, work_type, visit_date, status
         FROM requests WHERE status NOT IN ('cancelled','done')
         ORDER BY id DESC LIMIT 5`
      ).all();
    }
  } else {
    rows = db.prepare(
      `SELECT id, order_number, work_type, visit_date, status
       FROM requests WHERE status NOT IN ('cancelled','done')
       ORDER BY id DESC LIMIT 5`
    ).all();
  }
  res.json(rows);
});

// ── POST /api/requests/notify-change ──────────────────────────────────────
// Монтажник сообщает, что заявка требует изменений
// Body: { request_id, comment }
// ВАЖНО: до /:id
router.post('/notify-change', async (req, res) => {
  const { request_id, comment } = req.body;
  if (!request_id) return res.status(400).json({ error: 'Укажите номер заявки' });
  if (!comment || !comment.trim()) return res.status(400).json({ error: 'Введите комментарий' });

  const request = db.prepare('SELECT * FROM requests WHERE id=?').get(request_id);
  if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

  try {
    const result = await notifyChangeRequest(
      request.id,
      request.order_number || `заявка #${request.id}`,
      request.work_type,
      comment.trim()
    );
    if (!result.ok) {
      return res.status(500).json({ error: result.reason || 'Ошибка отправки уведомления' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[TG] notify-change error:', e.message);
    res.status(500).json({ error: 'Ошибка отправки уведомления' });
  }
});

// ── POST /api/requests/block-day ───────────────────────────────────────────
// Монтажник блокирует день в графике
// Body: { date, reason }  date формат: дд.мм.гггг или yyyy-mm-dd
// ВАЖНО: до /:id
router.post('/block-day', (req, res) => {
  let { date, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Укажите дату' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'Введите причину блокировки' });

  // Конвертация дд.мм.гггг → yyyy-mm-dd
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
    const [d, m, y] = date.split('.');
    date = `${y}-${m}-${d}`;
  }

  // Валидация формата даты
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Неверный формат даты. Используйте дд.мм.гггг' });
  }

  try {
    db.prepare('INSERT INTO blocked_days (date, reason) VALUES (?, ?)').run(date, reason.trim());
    res.json({ success: true });
  } catch (e) {
    res.status(409).json({ error: 'Этот день уже заблокирован' });
  }
});

// ── GET /api/requests/my-dates?user=...&months=2 ──────────────────────────
// Возвращает даты, на которых у данного пользователя есть активные заявки
// ВАЖНО: до /:id
router.get('/my-dates', (req, res) => {
  const user   = (req.query.user || '').trim();
  const months = Math.min(parseInt(req.query.months) || 3, 6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(today);
  toDate.setMonth(toDate.getMonth() + months);

  let rows;
  if (user) {
    rows = db.prepare(
      `SELECT DISTINCT visit_date FROM requests
       WHERE user_name = ? AND status NOT IN ('cancelled')
         AND visit_date >= ? AND visit_date <= ?`
    ).all(user, today.toISOString().slice(0, 10), toDate.toISOString().slice(0, 10));
  } else {
    rows = [];
  }

  res.json({ dates: rows.map(r => r.visit_date) });
});

// ── GET /api/requests/check-order?order=... ───────────────────────────────
// ВАЖНО: должен быть ДО /:id, иначе Express матчит 'check-order' как id
// Возвращает все активные заявки с данным order_number (не отменённые)
router.get('/check-order', (req, res) => {
  const orderNumber = (req.query.order || '').trim();
  if (!orderNumber) return res.json({ found: false, requests: [] });

  const requests = db.prepare(
    `SELECT id, order_number, visit_type, visit_date, work_place, work_type,
            address, contacts, comment, user_name, status, created_at
     FROM requests
     WHERE order_number = ? AND status NOT IN ('cancelled')
     ORDER BY id DESC`
  ).all(orderNumber);

  if (!requests.length) return res.json({ found: false, requests: [] });
  // request (единственное) — для обратной совместимости с фреймом
  res.json({ found: true, request: requests[0], requests });
});

// ── GET /api/files/:filename ───────────────────────────────────────────────
// ВАЖНО: должен быть ДО /:id, иначе Express матчит 'files' как id
router.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // защита от path traversal
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });
  res.sendFile(filePath);
});

// ── GET /api/requests/:id ──────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный id' });

  const request = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
  if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

  const files = db.prepare('SELECT * FROM request_files WHERE request_id=?').all(request.id);
  res.json({ ...request, files });
});

// ── PUT /api/requests/:id ──────────────────────────────────────────────────
router.put('/:id', upload.array('files', 10), async (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

  // Нельзя редактировать выполненные/отменённые
  if (['done', 'cancelled'].includes(request.status)) {
    return res.status(403).json({ error: 'Заявка завершена и не может быть изменена' });
  }

  const { visit_type, visit_date, work_place, work_type, address, contacts, comment } = req.body;

  // Если меняется дата или тип — проверяем лимиты
  if (visit_date !== request.visit_date || visit_type !== request.visit_type) {
    const check = checkDateAvailability(visit_date || request.visit_date, visit_type || request.visit_type);
    if (!check.ok) {
      return res.status(409).json({ error: check.reason });
    }
  }

  db.prepare(`
    UPDATE requests SET
      visit_type  = COALESCE(?, visit_type),
      visit_date  = COALESCE(?, visit_date),
      work_place  = COALESCE(?, work_place),
      work_type   = COALESCE(?, work_type),
      address     = COALESCE(?, address),
      contacts    = COALESCE(?, contacts),
      comment     = ?,
      updated_at  = datetime('now', '+3 hours')
    WHERE id = ?
  `).run(visit_type || null, visit_date || null, work_place || null,
         work_type || null, address || null, contacts || null,
         comment !== undefined ? comment : request.comment,
         request.id);

  // Добавляем новые файлы если есть
  const insertFile = db.prepare(
    'INSERT INTO request_files (request_id, filename, orig_name, mime_type, size) VALUES (?,?,?,?,?)'
  );
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      insertFile.run(request.id, f.filename, f.originalname, f.mimetype, f.size);
    }
  }

  const updated = db.prepare('SELECT * FROM requests WHERE id=?').get(request.id);

  // Telegram
  try {
    await notifyUpdated(updated);
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        await sendPhotoToAll(
          path.join(UPLOADS_DIR, f.filename),
          `📎 Файл к заявке #${request.id} (изменение): ${f.originalname}`
        );
      }
    }
  } catch (e) {
    console.error('[TG] ошибка отправки:', e.message);
  }

  res.json({ success: true });
});

module.exports = router;
