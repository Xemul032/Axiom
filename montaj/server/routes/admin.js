/**
 * Admin API роуты
 * Все роуты требуют Basic Auth: admin / <password из БД>
 *
 * GET    /api/admin/requests          — список заявок (фильтры: date, status, type)
 * GET    /api/admin/requests/:id      — одна заявка с файлами
 * PUT    /api/admin/requests/:id      — изменить статус/данные
 * DELETE /api/admin/requests/:id      — удалить заявку
 * GET    /api/admin/calendar          — данные для календаря (по месяцу)
 *
 * GET    /api/admin/settings          — настройки
 * PUT    /api/admin/settings          — сохранить настройки (tg_bot_token, tg_chat_ids)
 *
 * GET    /api/admin/limits            — лимиты
 * PUT    /api/admin/limits            — сохранить лимиты
 *
 * GET    /api/admin/blocked           — заблокированные дни
 * POST   /api/admin/blocked           — заблокировать день
 * DELETE /api/admin/blocked/:date     — разблокировать день
 *
 * GET    /api/admin/work-types        — виды работ
 * POST   /api/admin/work-types        — добавить вид работ
 * PUT    /api/admin/work-types/:id    — изменить вид работ
 * DELETE /api/admin/work-types/:id    — удалить вид работ
 *
 * POST   /api/admin/login             — проверка логина/пароля
 *
 * GET    /api/admin/stats             — статистика за период (?from=&to=&type=)
 * GET    /api/admin/stats/export      — выгрузка в Excel (?from=&to=&type=)
 *
 * GET    /api/admin/bot-users         — список пользователей бота
 * DELETE /api/admin/bot-users/:id     — удалить пользователя бота
 */
const express = require('express');
const XLSX    = require('xlsx');
const db      = require('../db');
const { notifyNew } = require('../telegram');

const router = express.Router();

// ── Вспомогательная: разбор прав ──────────────────────────────────────────
// permissions хранится как 'all' или JSON-массив: '["calendar","requests",...]'
function parsePermissions(perm) {
  if (!perm || perm === 'all') return 'all';
  try { return JSON.parse(perm); } catch (_) { return 'all'; }
}

function hasPermission(admin, tab) {
  if (admin.is_super) return true;
  const perms = parsePermissions(admin.permissions);
  if (perms === 'all') return true;
  return Array.isArray(perms) && perms.includes(tab);
}

// ── Basic Auth middleware ──────────────────────────────────────────────────
function requireAuth(req, res, next) {
  // Пропускаем логин
  if (req.path === '/login') return next();

  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const colonIdx = decoded.indexOf(':');
  const username = decoded.slice(0, colonIdx);
  const password = decoded.slice(colonIdx + 1);

  const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(username);
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  req.admin = admin;
  next();
}

// Middleware: только суперадмин
function requireSuper(req, res, next) {
  if (!req.admin || !req.admin.is_super) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  next();
}

// Middleware: проверка права на конкретную вкладку
function requireTab(tab) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Требуется авторизация' });
    if (!hasPermission(req.admin, tab)) {
      return res.status(403).json({ error: 'Нет доступа к этому разделу' });
    }
    next();
  };
}

router.use(requireAuth);

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username=? AND password=?').get(username, password);
  if (!admin) return res.status(401).json({ error: 'Неверный логин или пароль' });
  const permissions = parsePermissions(admin.permissions);
  res.json({
    success: true,
    username: admin.username,
    is_super: admin.is_super === 1,
    permissions
  });
});

// ── GET /requests ──────────────────────────────────────────────────────────
router.get('/requests', (req, res) => {
  const { date, status, type, search } = req.query;
  let sql = 'SELECT * FROM requests WHERE 1=1';
  const params = [];

  if (date)   { sql += ' AND visit_date = ?';   params.push(date); }
  if (status) { sql += ' AND status = ?';        params.push(status); }
  if (type)   { sql += ' AND visit_type = ?';    params.push(type); }
  if (search) {
    sql += ' AND (order_number LIKE ? OR user_name LIKE ? OR address LIKE ? OR work_type LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  sql += ' ORDER BY visit_date ASC, created_at ASC';
  const requests = db.prepare(sql).all(...params);
  res.json(requests);
});

// ── POST /requests — создать заявку вручную (из админки) ──────────────────
router.post('/requests', async (req, res) => {
  const { order_number, visit_type, visit_date, work_place, work_type,
          address, contacts, comment, user_name, status } = req.body;

  const allowedTypes   = ['montage', 'measurement'];
  const allowedPlaces  = ['indoor', 'outdoor'];
  const allowedStatuses = ['new', 'in_progress'];

  if (!allowedTypes.includes(visit_type))
    return res.status(400).json({ error: 'Недопустимый тип выезда' });
  if (!allowedPlaces.includes(work_place))
    return res.status(400).json({ error: 'Недопустимое место работ' });
  if (!visit_date)
    return res.status(400).json({ error: 'Укажите дату' });
  if (!work_type)
    return res.status(400).json({ error: 'Укажите вид работ' });
  if (!address)
    return res.status(400).json({ error: 'Укажите адрес' });
  if (!contacts)
    return res.status(400).json({ error: 'Укажите контакты' });

  const finalStatus = allowedStatuses.includes(status) ? status : 'new';

  const info = db.prepare(`
    INSERT INTO requests
      (order_number, visit_type, visit_date, work_place, work_type,
       address, contacts, comment, user_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order_number || null,
    visit_type,
    visit_date,
    work_place,
    work_type,
    address,
    contacts,
    comment || null,
    user_name || null,
    finalStatus
  );

  const newRequest = db.prepare('SELECT * FROM requests WHERE id=?').get(info.lastInsertRowid);

  // Отправляем TG-уведомление если статус «Новая»
  if (finalStatus === 'new') {
    notifyNew(newRequest).catch(e => console.error('[TG] notifyNew error:', e.message));
  }

  res.json({ id: info.lastInsertRowid, success: true });
});

// ── GET /requests/:id ──────────────────────────────────────────────────────
router.get('/requests/:id', (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Заявка не найдена' });
  const files = db.prepare('SELECT * FROM request_files WHERE request_id=?').all(request.id);
  res.json({ ...request, files });
});

// ── PUT /requests/:id ──────────────────────────────────────────────────────
router.put('/requests/:id', async (req, res) => {
  const request = db.prepare('SELECT * FROM requests WHERE id=?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

  const allowed = ['new', 'in_progress', 'done', 'cancelled'];
  const { status, visit_type, visit_date, work_place, work_type, address, contacts, comment } = req.body;

  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  // Запоминаем старый статус до обновления
  const prevStatus = request.status;

  db.prepare(`
    UPDATE requests SET
      status     = COALESCE(?, status),
      visit_type = COALESCE(?, visit_type),
      visit_date = COALESCE(?, visit_date),
      work_place = COALESCE(?, work_place),
      work_type  = COALESCE(?, work_type),
      address    = COALESCE(?, address),
      contacts   = COALESCE(?, contacts),
      comment    = COALESCE(?, comment),
      updated_at = datetime('now', '+3 hours')
    WHERE id = ?
  `).run(status || null, visit_type || null, visit_date || null,
         work_place || null, work_type || null, address || null,
         contacts || null, comment || null, request.id);

  // Если статус сменился с 'new' на 'in_progress' — это аппрув ручной заявки,
  // отправляем уведомление о новой заявке в бот
  if (status === 'in_progress' && prevStatus === 'new') {
    const updated = db.prepare('SELECT * FROM requests WHERE id=?').get(request.id);
    notifyNew(updated).catch(e => console.error('[TG] notifyNew error:', e.message));
  }

  res.json({ success: true });
});

// ── DELETE /requests/:id ───────────────────────────────────────────────────
router.delete('/requests/:id', (req, res) => {
  const info = db.prepare('DELETE FROM requests WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ success: true });
});

// ── GET /calendar ──────────────────────────────────────────────────────────
// ?year=2025&month=7  (month: 1-12)
router.get('/calendar', (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const requests = db.prepare(
    `SELECT id, visit_date, visit_type, work_type, status, user_name, order_number
     FROM requests
     WHERE visit_date >= ? AND visit_date <= ?
     ORDER BY visit_date ASC`
  ).all(from, to);

  const blocked = db.prepare(
    'SELECT date, reason FROM blocked_days WHERE date >= ? AND date <= ?'
  ).all(from, to);

  const limits = db.prepare('SELECT * FROM limits WHERE id=1').get();

  res.json({ requests, blocked, limits });
});

// ── GET /settings ──────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

// ── PUT /settings ──────────────────────────────────────────────────────────
router.put('/settings', (req, res) => {
  const allowed = ['tg_bot_token', 'tg_chat_ids', 'tg_notify_bot_token', 'tg_notify_chat_id'];
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updates = db.transaction((data) => {
    for (const key of allowed) {
      if (data[key] !== undefined) upsert.run(key, String(data[key]));
    }
  });
  updates(req.body);
  res.json({ success: true });
});

// ── GET /limits ────────────────────────────────────────────────────────────
router.get('/limits', (req, res) => {
  const lim = db.prepare('SELECT * FROM limits WHERE id=1').get();
  res.json(lim);
});

// ── PUT /limits ────────────────────────────────────────────────────────────
router.put('/limits', (req, res) => {
  const { montage_per_day, measurement_per_day, combined_per_day, buffer_montage_days, buffer_measure_days } = req.body;

  db.prepare(`
    UPDATE limits SET
      montage_per_day     = COALESCE(?, montage_per_day),
      measurement_per_day = COALESCE(?, measurement_per_day),
      combined_per_day    = COALESCE(?, combined_per_day),
      buffer_montage_days = COALESCE(?, buffer_montage_days),
      buffer_measure_days = COALESCE(?, buffer_measure_days),
      updated_at          = datetime('now', '+3 hours')
    WHERE id = 1
  `).run(
    montage_per_day     != null ? +montage_per_day     : null,
    measurement_per_day != null ? +measurement_per_day : null,
    combined_per_day    != null ? +combined_per_day    : null,
    buffer_montage_days != null ? +buffer_montage_days : null,
    buffer_measure_days != null ? +buffer_measure_days : null
  );

  res.json({ success: true });
});

// ── GET /blocked ───────────────────────────────────────────────────────────
router.get('/blocked', (req, res) => {
  const rows = db.prepare('SELECT * FROM blocked_days ORDER BY date').all();
  res.json(rows);
});

// ── POST /blocked ──────────────────────────────────────────────────────────
router.post('/blocked', (req, res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ error: 'Укажите дату' });
  try {
    db.prepare('INSERT INTO blocked_days (date, reason) VALUES (?, ?)').run(date, reason || null);
    res.json({ success: true });
  } catch (e) {
    res.status(409).json({ error: 'Этот день уже заблокирован' });
  }
});

// ── DELETE /blocked/:date ──────────────────────────────────────────────────
router.delete('/blocked/:date', (req, res) => {
  const info = db.prepare('DELETE FROM blocked_days WHERE date=?').run(req.params.date);
  if (info.changes === 0) return res.status(404).json({ error: 'День не найден' });
  res.json({ success: true });
});

// ── GET /work-types ────────────────────────────────────────────────────────
router.get('/work-types', (req, res) => {
  const types = db.prepare('SELECT * FROM work_types ORDER BY sort_order, name').all();
  res.json(types);
});

// ── POST /work-types ───────────────────────────────────────────────────────
router.post('/work-types', (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите название' });
  try {
    const info = db.prepare('INSERT INTO work_types (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (e) {
    res.status(409).json({ error: 'Такой вид работ уже существует' });
  }
});

// ── PUT /work-types/:id ────────────────────────────────────────────────────
router.put('/work-types/:id', (req, res) => {
  const { name, active, sort_order } = req.body;
  db.prepare(`
    UPDATE work_types SET
      name       = COALESCE(?, name),
      active     = COALESCE(?, active),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(name || null, active != null ? +active : null, sort_order != null ? +sort_order : null, req.params.id);
  res.json({ success: true });
});

// ── DELETE /work-types/:id ─────────────────────────────────────────────────
router.delete('/work-types/:id', (req, res) => {
  const info = db.prepare('DELETE FROM work_types WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Вид работ не найден' });
  res.json({ success: true });
});

// ── GET /stats ─────────────────────────────────────────────────────────────
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=montage|measurement (type необязателен)
router.get('/stats', (req, res) => {
  const { from, to, type } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Укажите from и to' });

  let sql = `
    SELECT
      id, order_number, visit_type, visit_date, work_place,
      work_type, address, contacts, comment, user_name, status,
      created_at, updated_at
    FROM requests
    WHERE visit_date >= ? AND visit_date <= ?
  `;
  const params = [from, to];
  if (type && (type === 'montage' || type === 'measurement')) {
    sql += ' AND visit_type = ?';
    params.push(type);
  }
  sql += ' ORDER BY visit_date ASC, id ASC';

  const rows = db.prepare(sql).all(...params);

  // Сводная статистика
  const total       = rows.length;
  const montages    = rows.filter(r => r.visit_type === 'montage').length;
  const measurements = rows.filter(r => r.visit_type === 'measurement').length;
  const byStatus    = {};
  const byWorkType  = {};
  for (const r of rows) {
    byStatus[r.status]       = (byStatus[r.status]       || 0) + 1;
    byWorkType[r.work_type]  = (byWorkType[r.work_type]  || 0) + 1;
  }

  res.json({ total, montages, measurements, byStatus, byWorkType, rows });
});

// ── GET /stats/export ──────────────────────────────────────────────────────
// Возвращает .xlsx файл
router.get('/stats/export', (req, res) => {
  const { from, to, type } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Укажите from и to' });

  let sql = `
    SELECT
      id, order_number, visit_type, visit_date, work_place,
      work_type, address, contacts, comment, user_name, status,
      created_at
    FROM requests
    WHERE visit_date >= ? AND visit_date <= ?
  `;
  const params = [from, to];
  if (type && (type === 'montage' || type === 'measurement')) {
    sql += ' AND visit_type = ?';
    params.push(type);
  }
  sql += ' ORDER BY visit_date ASC, id ASC';

  const rows = db.prepare(sql).all(...params);

  const VISIT_LABELS  = { montage: 'Монтаж', measurement: 'Замер' };
  const PLACE_LABELS  = { indoor: 'В помещении', outdoor: 'На улице' };
  const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };

  const sheetData = rows.map(r => ({
    'ID':            r.id,
    'Номер заказа':  r.order_number || '',
    'Менеджер':      r.user_name    || '',
    'Тип выезда':    VISIT_LABELS[r.visit_type]  || r.visit_type,
    'Дата выезда':   r.visit_date,
    'Место':         PLACE_LABELS[r.work_place]  || r.work_place,
    'Что монтируем': r.work_type,
    'Адрес':         r.address,
    'Контакты':      r.contacts,
    'Комментарий':   r.comment  || '',
    'Статус':        STATUS_LABELS[r.status] || r.status,
    'Создана':       r.created_at
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Ширина колонок
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 30 },
    { wch: 20 }, { wch: 24 }, { wch: 12 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  const typeLabel = type === 'montage' ? 'Монтажи' : type === 'measurement' ? 'Замеры' : 'Все';
  XLSX.utils.book_append_sheet(wb, ws, typeLabel);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `stat_${from}_${to}${type ? '_' + type : ''}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

// ── GET /bot-users ─────────────────────────────────────────────────────────
router.get('/bot-users', (req, res) => {
  const users = db.prepare('SELECT * FROM bot_users ORDER BY created_at DESC').all();
  res.json(users);
});

// ── DELETE /bot-users/:id ──────────────────────────────────────────────────
router.delete('/bot-users/:id', (req, res) => {
  const info = db.prepare('DELETE FROM bot_users WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ АДМИНИСТРАТОРАМИ (только суперадмин)
// ══════════════════════════════════════════════════════════════════════════

// ── GET /admin-users ───────────────────────────────────────────────────────
router.get('/admin-users', requireSuper, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, permissions, is_super FROM admins ORDER BY id'
  ).all();
  // Разбираем permissions перед отдачей
  const result = users.map(u => ({
    ...u,
    permissions: parsePermissions(u.permissions),
    is_super: u.is_super === 1
  }));
  res.json(result);
});

// ── POST /admin-users ──────────────────────────────────────────────────────
router.post('/admin-users', requireSuper, (req, res) => {
  const { username, password, permissions } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  // permissions: массив вкладок или 'all'
  const permStr = (!permissions || permissions === 'all')
    ? 'all'
    : JSON.stringify(permissions);

  try {
    const info = db.prepare(
      'INSERT INTO admins (username, password, permissions, is_super) VALUES (?, ?, ?, 0)'
    ).run(username.trim(), password, permStr);
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (e) {
    res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
  }
});

// ── PUT /admin-users/:id ───────────────────────────────────────────────────
router.put('/admin-users/:id', requireSuper, (req, res) => {
  const target = db.prepare('SELECT * FROM admins WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

  // Нельзя редактировать суперадмина через этот эндпоинт
  if (target.is_super && target.username === 'admin') {
    return res.status(403).json({ error: 'Нельзя изменить встроенного суперадмина' });
  }

  const { password, permissions } = req.body;
  const permStr = (!permissions || permissions === 'all')
    ? 'all'
    : JSON.stringify(permissions);

  db.prepare(`
    UPDATE admins SET
      password    = COALESCE(?, password),
      permissions = ?
    WHERE id = ?
  `).run(password || null, permStr, req.params.id);

  res.json({ success: true });
});

// ── DELETE /admin-users/:id ────────────────────────────────────────────────
router.delete('/admin-users/:id', requireSuper, (req, res) => {
  const target = db.prepare('SELECT * FROM admins WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });
  if (target.is_super) {
    return res.status(403).json({ error: 'Нельзя удалить суперадмина' });
  }
  db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
