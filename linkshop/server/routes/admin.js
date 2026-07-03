const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Загрузка изображений ───────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `img_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Только изображения (jpg, png, gif, webp, svg)'));
  }
});

// ── Простая аутентификация (session-based через заголовок X-Admin-Token) ──────
const sessions = new Set();

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  next();
}

// POST /api/admin/upload-image
router.post('/upload-image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Укажите логин и пароль' });

  const admin = db.prepare('SELECT * FROM admins WHERE username=? AND password=?').get(username, password);
  if (!admin) return res.status(401).json({ error: 'Неверные учётные данные' });

  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessions.add(token);
  res.json({ token });
});

// POST /api/admin/logout
router.post('/logout', requireAuth, (req, res) => {
  sessions.delete(req.headers['x-admin-token']);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// ОТДЕЛЫ
// ════════════════════════════════════════════════

// GET /api/admin/departments
router.get('/departments', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM departments ORDER BY id').all();
  res.json(rows);
});

// POST /api/admin/departments
router.post('/departments', requireAuth, (req, res) => {
  const { name, rate } = req.body;
  if (!name) return res.status(400).json({ error: 'Укажите название отдела' });
  const r = parseFloat(rate) || 1.0;
  try {
    const info = db.prepare('INSERT INTO departments (name, rate) VALUES (?,?)').run(name, r);
    res.json({ id: info.lastInsertRowid, name, rate: r });
  } catch (e) {
    res.status(400).json({ error: 'Отдел с таким названием уже существует' });
  }
});

// PUT /api/admin/departments/:id
router.put('/departments/:id', requireAuth, (req, res) => {
  const { name, rate } = req.body;
  const id = Number(req.params.id);
  const r = parseFloat(rate);
  if (isNaN(r) || r <= 0) return res.status(400).json({ error: 'Некорректный курс' });
  db.prepare('UPDATE departments SET name=COALESCE(?,name), rate=? WHERE id=?').run(name || null, r, id);
  res.json({ ok: true });
});

// DELETE /api/admin/departments/:id
router.delete('/departments/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const used = db.prepare('SELECT COUNT(*) as c FROM users WHERE dept_id=?').get(id);
  if (used.c > 0) return res.status(400).json({ error: 'Нельзя удалить отдел — есть пользователи' });
  db.prepare('DELETE FROM departments WHERE id=?').run(id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// ПОЛЬЗОВАТЕЛИ
// ════════════════════════════════════════════════

// GET /api/admin/users
router.get('/users', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, d.name AS dept_name, d.rate AS dept_rate
    FROM users u JOIN departments d ON u.dept_id = d.id
    ORDER BY u.last_name, u.first_name
  `).all();
  res.json(rows);
});

// POST /api/admin/users
router.post('/users', requireAuth, (req, res) => {
  const { first_name, last_name, dept_id, pin } = req.body;
  if (!first_name || !last_name || !dept_id) {
    return res.status(400).json({ error: 'Укажите имя, фамилию и отдел' });
  }
  const dept = db.prepare('SELECT id FROM departments WHERE id=?').get(Number(dept_id));
  if (!dept) return res.status(400).json({ error: 'Отдел не найден' });

  // Генерируем уникальный 4-значный pin
  let userPin = pin ? String(pin).trim() : null;
  if (!userPin) {
    // Автогенерация: ищем свободный
    let attempts = 0;
    do {
      userPin = String(Math.floor(1000 + Math.random() * 9000));
      attempts++;
    } while (db.prepare('SELECT id FROM users WHERE pin=?').get(userPin) && attempts < 100);
  } else {
    // Проверяем уникальность
    const existing = db.prepare('SELECT id FROM users WHERE pin=?').get(userPin);
    if (existing) return res.status(400).json({ error: `Пин ${userPin} уже используется` });
  }

  const token = `tk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const info = db.prepare(
    'INSERT INTO users (first_name, last_name, dept_id, balance, api_token, pin) VALUES (?,?,?,0,?,?)'
  ).run(first_name.trim(), last_name.trim(), Number(dept_id), token, userPin);

  res.json({ id: info.lastInsertRowid, first_name, last_name, dept_id, balance: 0, api_token: token, pin: userPin });
});

// PUT /api/admin/users/:id
router.put('/users/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { first_name, last_name, dept_id } = req.body;
  db.prepare(
    'UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), dept_id=COALESCE(?,dept_id) WHERE id=?'
  ).run(first_name || null, last_name || null, dept_id ? Number(dept_id) : null, id);
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM transactions WHERE user_id=?').run(id);
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// БАЛАНС — ручные операции
// ════════════════════════════════════════════════

// POST /api/admin/balance/adjust  (одиночная операция, для обратной совместимости)
router.post('/balance/adjust', requireAuth, async (req, res) => {
  const { user_id, amount, description } = req.body;
  const uid = Number(user_id);
  const amt = Math.round(parseFloat(amount));

  if (!uid || isNaN(amt) || amt === 0) {
    return res.status(400).json({ error: 'Укажите user_id и ненулевую сумму' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const type = amt > 0 ? 'credit' : 'debit';

  db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(amt, uid);
    db.prepare(
      'INSERT INTO transactions (user_id, amount, type, description) VALUES (?,?,?,?)'
    ).run(uid, Math.abs(amt), type, description || (amt > 0 ? 'Ручное начисление' : 'Ручное списание'));
  })();

  const updated = db.prepare('SELECT balance FROM users WHERE id=?').get(uid);

  // Уведомляем пользователя в Telegram
  if (user.tg_chat_id) {
    const { notifyUserBalance } = require('../userBot');
    notifyUserBalance(user.tg_chat_id, amt, description).catch(() => {});
  }

  res.json({ ok: true, new_balance: updated.balance });
});

// POST /api/admin/balance/adjust-batch  (одна сумма — всем из списка)
router.post('/balance/adjust-batch', requireAuth, async (req, res) => {
  const { user_ids, amount, description } = req.body;
  const amt = Math.round(parseFloat(amount));

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'Укажите user_ids (массив)' });
  }
  if (isNaN(amt) || amt === 0) {
    return res.status(400).json({ error: 'Укажите ненулевую сумму' });
  }

  const type = amt > 0 ? 'credit' : 'debit';
  const desc = description || (amt > 0 ? 'Ручное начисление' : 'Ручное списание');
  let updated = 0;
  const notifyList = []; // { tg_chat_id }

  db.transaction(() => {
    for (const id of user_ids) {
      const uid = Number(id);
      if (!uid) continue;
      const user = db.prepare('SELECT id, tg_chat_id FROM users WHERE id=?').get(uid);
      if (!user) continue;
      db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(amt, uid);
      db.prepare(
        'INSERT INTO transactions (user_id, amount, type, description) VALUES (?,?,?,?)'
      ).run(uid, Math.abs(amt), type, desc);
      if (user.tg_chat_id) notifyList.push(user.tg_chat_id);
      updated++;
    }
  })();

  // Уведомляем пользователей в Telegram (после транзакции)
  if (notifyList.length > 0) {
    const { notifyUserBalance } = require('../userBot');
    for (const chatId of notifyList) {
      notifyUserBalance(chatId, amt, description).catch(() => {});
    }
  }

  res.json({ ok: true, updated });
});

// POST /api/admin/balance/adjust-multi  (индивидуальные суммы для каждого пользователя)
// Body: { operations: [ { user_id, amount, description }, ... ] }
router.post('/balance/adjust-multi', requireAuth, async (req, res) => {
  const { operations } = req.body;

  if (!Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({ error: 'Укажите массив operations' });
  }

  let updated = 0;
  const notifyList = []; // { tg_chat_id, amt, description }

  db.transaction(() => {
    for (const op of operations) {
      const uid = Number(op.user_id);
      const amt = Math.round(parseFloat(op.amount));
      if (!uid || isNaN(amt) || amt === 0) continue;

      const user = db.prepare('SELECT id, tg_chat_id FROM users WHERE id=?').get(uid);
      if (!user) continue;

      const type = amt > 0 ? 'credit' : 'debit';
      const desc = (op.description || '').trim() || (amt > 0 ? 'Ручное начисление' : 'Ручное списание');

      db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(amt, uid);
      db.prepare(
        'INSERT INTO transactions (user_id, amount, type, description) VALUES (?,?,?,?)'
      ).run(uid, Math.abs(amt), type, desc);
      if (user.tg_chat_id) notifyList.push({ chatId: user.tg_chat_id, amt, desc: op.description });
      updated++;
    }
  })();

  // Уведомляем пользователей в Telegram (после транзакции)
  if (notifyList.length > 0) {
    const { notifyUserBalance } = require('../userBot');
    for (const { chatId, amt, desc } of notifyList) {
      notifyUserBalance(chatId, amt, desc).catch(() => {});
    }
  }

  res.json({ ok: true, updated });
});

// GET /api/admin/products
router.get('/products', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM products ORDER BY id'
  ).all();
  res.json(rows);
});

// POST /api/admin/products
router.post('/products', requireAuth, (req, res) => {
  const { name, description, base_price, image_url, text_field_enabled, text_field_placeholder } = req.body;
  if (!name || base_price == null) return res.status(400).json({ error: 'Укажите название и цену' });
  const price = parseFloat(base_price);
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'Некорректная цена' });

  const tfEnabled = text_field_enabled ? 1 : 0;
  const tfPlaceholder = text_field_placeholder || '';

  const info = db.prepare(
    'INSERT INTO products (name, description, base_price, image_url, text_field_enabled, text_field_placeholder) VALUES (?,?,?,?,?,?)'
  ).run(name.trim(), description || '', price, image_url || '', tfEnabled, tfPlaceholder);

  res.json({ id: info.lastInsertRowid, name, description, base_price: price, image_url: image_url || '', text_field_enabled: tfEnabled, text_field_placeholder: tfPlaceholder });
});

// PUT /api/admin/products/:id
router.put('/products/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { name, description, base_price, image_url, active, text_field_enabled, text_field_placeholder } = req.body;
  const price = base_price != null ? parseFloat(base_price) : null;

  // Для полей description и image_url передаём undefined→COALESCE сохраняет старое,
  // но пустую строку '' разрешаем (пользователь намеренно очищает поле).
  const descVal      = description !== undefined ? description : null;
  const imgVal       = image_url   !== undefined ? image_url   : null;
  const useCoalesceD = description === undefined;
  const useCoalesceI = image_url   === undefined;

  // text_field_enabled: если передан — обновляем, иначе COALESCE
  const tfEnabledVal  = text_field_enabled  !== undefined ? Number(text_field_enabled ? 1 : 0) : null;
  const tfPlaceholderVal = text_field_placeholder !== undefined ? text_field_placeholder : null;
  const useCoalesceTFE = text_field_enabled  === undefined;
  const useCoalesceTFP = text_field_placeholder === undefined;

  db.prepare(`
    UPDATE products SET
      name                    = COALESCE(?, name),
      description             = ${useCoalesceD   ? 'COALESCE(?, description)'             : '?'},
      base_price              = COALESCE(?, base_price),
      image_url               = ${useCoalesceI   ? 'COALESCE(?, image_url)'               : '?'},
      active                  = COALESCE(?, active),
      text_field_enabled      = ${useCoalesceTFE ? 'COALESCE(?, text_field_enabled)'      : '?'},
      text_field_placeholder  = ${useCoalesceTFP ? 'COALESCE(?, text_field_placeholder)'  : '?'}
    WHERE id = ?
  `).run(
    name || null,
    descVal,
    price,
    imgVal,
    active != null ? Number(active) : null,
    tfEnabledVal,
    tfPlaceholderVal,
    id
  );

  res.json({ ok: true });
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE products SET active=0 WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// СТАТИСТИКА
// ════════════════════════════════════════════════

/**
 * Общая функция построения статистики.
 * Принимает { from, to, user_ids[] } — user_ids пустой = все пользователи.
 */
function buildStats(from, to, userIds) {
  const fromDt = `${from} 00:00:00`;
  const toDt   = `${to} 23:59:59`;

  let whereExtra = '';
  const params = [fromDt, toDt];

  if (userIds && userIds.length > 0) {
    const placeholders = userIds.map(() => '?').join(',');
    whereExtra = ` AND t.user_id IN (${placeholders})`;
    params.push(...userIds.map(Number));
  }

  const rows = db.prepare(`
    SELECT
      t.id,
      t.created_at,
      t.type,
      t.amount,
      t.description,
      u.id        AS user_id,
      u.first_name,
      u.last_name,
      d.name      AS dept_name,
      p.name      AS product_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    JOIN departments d ON u.dept_id = d.id
    LEFT JOIN products p ON t.product_id = p.id
    WHERE t.created_at BETWEEN ? AND ?
    ${whereExtra}
    ORDER BY t.created_at DESC
  `).all(...params);

  // Раздельные агрегаты
  const totalBonus    = rows.filter(r => r.type === 'credit' || r.type === 'weekly').reduce((s, r) => s + r.amount, 0);
  const totalFine     = rows.filter(r => r.type === 'debit').reduce((s, r) => s + r.amount, 0);
  const totalPurchase = rows.filter(r => r.type === 'purchase').reduce((s, r) => s + r.amount, 0);

  // Текущий баланс
  let balanceQuery = 'SELECT COALESCE(SUM(balance),0) AS total FROM users';
  const balanceParams = [];
  if (userIds && userIds.length > 0) {
    const ph = userIds.map(() => '?').join(',');
    balanceQuery += ` WHERE id IN (${ph})`;
    balanceParams.push(...userIds.map(Number));
  }
  const { total: currentBalance } = db.prepare(balanceQuery).get(...balanceParams);

  return { rows, totalBonus, totalFine, totalPurchase, currentBalance };
}

/**
 * POST /api/admin/stats
 * Body: { from, to, user_ids: [] }
 * user_ids пустой или отсутствует — все пользователи.
 */
router.post('/stats', requireAuth, (req, res) => {
  const { from, to, user_ids, format } = req.body;

  if (!from || !to) return res.status(400).json({ error: 'Укажите from и to' });

  const userIds = Array.isArray(user_ids) ? user_ids : [];
  const { rows, totalBonus, totalFine, totalPurchase, currentBalance } = buildStats(from, to, userIds);

  if (format === 'csv') {
    const typeLabel = { credit: 'Поощрение', debit: 'Штраф', purchase: 'Покупка', weekly: 'Еженедельный' };
    const header = 'ID,Дата,Тип,Сумма,Описание,Пользователь,Отдел,Товар\n';
    const csvBody = rows.map(r =>
      `${r.id},"${r.created_at}","${typeLabel[r.type] || r.type}",${r.amount},"${(r.description || '').replace(/"/g, '""')}","${r.last_name} ${r.first_name}","${r.dept_name}","${r.product_name || ''}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stats_${from}_${to}.csv"`);
    return res.send('\uFEFF' + header + csvBody);
  }

  res.json({
    period: { from, to },
    total_bonus:    totalBonus,
    total_fine:     totalFine,
    total_purchase: totalPurchase,
    current_balance: currentBalance,
    transactions: rows
  });
});

/**
 * GET /api/admin/stats — старый роут, оставлен для совместимости
 * Поддерживает ?from=&to=&user_id=&dept_id=&format=csv
 */
router.get('/stats', requireAuth, (req, res) => {
  const { from, to, user_id, dept_id, format } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Укажите from и to' });

  let userIds = [];
  if (user_id) {
    userIds = [Number(user_id)];
  } else if (dept_id) {
    const deptUsers = db.prepare('SELECT id FROM users WHERE dept_id=?').all(Number(dept_id));
    userIds = deptUsers.map(u => u.id);
  }

  const { rows, totalBonus, totalFine, totalPurchase, currentBalance } = buildStats(from, to, userIds);

  if (format === 'csv') {
    const typeLabel = { credit: 'Поощрение', debit: 'Штраф', purchase: 'Покупка', weekly: 'Еженедельный' };
    const header = 'ID,Дата,Тип,Сумма,Описание,Пользователь,Отдел,Товар\n';
    const csvBody = rows.map(r =>
      `${r.id},"${r.created_at}","${typeLabel[r.type] || r.type}",${r.amount},"${(r.description || '').replace(/"/g, '""')}","${r.last_name} ${r.first_name}","${r.dept_name}","${r.product_name || ''}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stats_${from}_${to}.csv"`);
    return res.send('\uFEFF' + header + csvBody);
  }

  res.json({
    period: { from, to },
    total_bonus:    totalBonus,
    total_fine:     totalFine,
    total_purchase: totalPurchase,
    current_balance: currentBalance,
    transactions: rows
  });
});

// ════════════════════════════════════════════════
// ЗАКАЗЫ
// ════════════════════════════════════════════════

// Папка для хранения сертификатов
const certsDir = path.join(__dirname, '..', '..', 'data', 'certs');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

const certStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, certsDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `cert_order${req.params.id}_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const uploadCert = multer({
  storage: certStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// GET /api/admin/orders
router.get('/orders', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      o.id, o.completed, o.cert_file, o.created_at, o.completed_at,
      o.user_text,
      u.id        AS user_id,
      u.first_name, u.last_name, u.tg_chat_id,
      d.name      AS dept_name,
      p.id        AS product_id,
      p.name      AS product_name,
      p.base_price,
      COALESCE(t.amount, p.base_price) AS paid_price
    FROM orders o
    JOIN users u       ON o.user_id       = u.id
    JOIN departments d ON u.dept_id       = d.id
    JOIN products p    ON o.product_id    = p.id
    LEFT JOIN transactions t ON o.transaction_id = t.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(rows);
});

// PUT /api/admin/orders/:id/complete  — переключить флаг выполнения
router.put('/orders/:id/complete', requireAuth, async (req, res) => {
  const id        = Number(req.params.id);
  const completed = req.body.completed ? 1 : 0;
  const now       = completed ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19) : null;
  db.prepare('UPDATE orders SET completed=?, completed_at=? WHERE id=?').run(completed, now, id);

  // Если заказ подтверждён и у него есть загруженный файл — отправляем в Telegram
  if (completed === 1) {
    const order = db.prepare(`
      SELECT o.cert_file, o.user_id, u.tg_chat_id, p.name AS product_name
      FROM orders o
      JOIN users u    ON o.user_id    = u.id
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `).get(id);

    if (order && order.cert_file && order.tg_chat_id) {
      try {
        const { sendDocumentToUser } = require('../userBot');
        const filePath = path.join(certsDir, order.cert_file);
        if (fs.existsSync(filePath)) {
          const caption = `📦 ${order.product_name}`;
          await sendDocumentToUser(order.tg_chat_id, filePath, caption);
        }
      } catch (e) {
        console.error('[Orders] Ошибка отправки файла в TG при подтверждении:', e.message);
      }
    }
  }

  res.json({ ok: true });
});

// PUT /api/admin/orders/:id/cancel  — отменить заказ, вернуть линки, уведомить в TG
router.put('/orders/:id/cancel', requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  const order = db.prepare(`
    SELECT o.*, u.first_name, u.last_name, u.tg_chat_id,
           p.name AS product_name,
           COALESCE(t.amount, p.base_price) AS paid_price
    FROM orders o
    JOIN users u    ON o.user_id    = u.id
    JOIN products p ON o.product_id = p.id
    LEFT JOIN transactions t ON o.transaction_id = t.id
    WHERE o.id = ?
  `).get(id);

  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  if (order.completed !== 0 && order.completed != null) {
    return res.status(400).json({ error: 'Заказ уже обработан' });
  }

  const refundAmount = Number(order.paid_price) || 0;

  db.transaction(() => {
    // Помечаем заказ как отменённый (completed = 2)
    const now = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('UPDATE orders SET completed=2, completed_at=? WHERE id=?').run(now, id);

    // Возвращаем линки пользователю
    if (refundAmount > 0) {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(refundAmount, order.user_id);
      db.prepare(
        'INSERT INTO transactions (user_id, amount, type, description) VALUES (?,?,?,?)'
      ).run(order.user_id, refundAmount, 'credit', `Возврат за отменённый заказ: ${order.product_name}`);
    }
  })();

  // Уведомление пользователю в Telegram
  if (order.tg_chat_id) {
    try {
      const { getSetting } = require('../telegram');
      const userBotToken = getSetting('tg_user_bot_token');
      if (userBotToken) {
        const url = `https://api.telegram.org/bot${userBotToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.tg_chat_id,
            text: `❌ Ваш заказ отменён!\n\n📦 ${order.product_name}\n💰 Возврат: ${refundAmount} линков`,
            parse_mode: 'HTML'
          })
        });
      }
    } catch (e) {
      console.error('[Orders] Ошибка отправки TG при отмене:', e.message);
    }
  }

  res.json({ ok: true, refunded: refundAmount });
});

// POST /api/admin/orders/:id/upload-cert
// Загружает файл сертификата и обновляет запись.
// Отправка в Telegram происходит только при подтверждении заказа (зелёная галочка).
router.post('/orders/:id/upload-cert', requireAuth, uploadCert.single('cert'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

  const id    = Number(req.params.id);
  const order = db.prepare(`
    SELECT o.*, u.first_name, u.last_name, u.tg_chat_id, p.name AS product_name
    FROM orders o
    JOIN users u    ON o.user_id    = u.id
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `).get(id);

  if (!order) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Заказ не найден' });
  }

  // Удаляем старый файл если был
  if (order.cert_file) {
    const oldPath = path.join(certsDir, order.cert_file);
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (_) {}
    }
  }

  const certFilename = req.file.filename;
  db.prepare('UPDATE orders SET cert_file=? WHERE id=?').run(certFilename, id);

  // TG не отправляем — файл уйдёт пользователю только после подтверждения заказа галочкой
  res.json({ ok: true, cert_file: certFilename, tg: null });
});

// DELETE /api/admin/orders/:id/cert — удалить прикреплённый файл
router.delete('/orders/:id/cert', requireAuth, (req, res) => {
  const id    = Number(req.params.id);
  const order = db.prepare('SELECT cert_file FROM orders WHERE id=?').get(id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  if (order.cert_file) {
    const filePath = path.join(certsDir, order.cert_file);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    db.prepare('UPDATE orders SET cert_file=NULL WHERE id=?').run(id);
  }
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// ПОЛЬЗОВАТЕЛИ — обновление tg_chat_id
// ════════════════════════════════════════════════

// PUT /api/admin/users/:id/tg-chat-id
router.put('/users/:id/tg-chat-id', requireAuth, (req, res) => {
  const id         = Number(req.params.id);
  const tg_chat_id = req.body.tg_chat_id != null ? String(req.body.tg_chat_id).trim() || null : null;
  db.prepare('UPDATE users SET tg_chat_id=? WHERE id=?').run(tg_chat_id, id);
  res.json({ ok: true });
});

// PUT /api/admin/users/:id/pin-only
router.put('/users/:id/pin-only', requireAuth, (req, res) => {
  const id       = Number(req.params.id);
  const pinOnly  = req.body.pin_only ? 1 : 0;
  db.prepare('UPDATE users SET pin_only=? WHERE id=?').run(pinOnly, id);
  res.json({ ok: true });
});

// PUT /api/admin/users/:id/salary-url
router.put('/users/:id/salary-url', requireAuth, (req, res) => {
  const id  = Number(req.params.id);
  const url = req.body.salary_folder_url != null ? String(req.body.salary_folder_url).trim() || null : null;
  db.prepare('UPDATE users SET salary_folder_url=? WHERE id=?').run(url, id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════
// НАСТРОЙКИ (Telegram и др.)
// ════════════════════════════════════════════════

const { getSetting } = require('../telegram');

// GET /api/admin/settings
router.get('/settings', requireAuth, (req, res) => {
  const keys = ['tg_bot_token', 'tg_chat_id', 'tg_notify_purchase', 'bonus_amount', 'bonus_day', 'bonus_hour', 'tg_user_bot_token'];
  const result = {};
  keys.forEach(k => { result[k] = getSetting(k); });
  res.json(result);
});

// POST /api/admin/settings
router.post('/settings', requireAuth, (req, res) => {
  const allowed = ['tg_bot_token', 'tg_chat_id', 'tg_notify_purchase', 'bonus_amount', 'bonus_day', 'bonus_hour', 'tg_user_bot_token'];
  const db = require('../db');

  let bonusChanged    = false;
  let userBotChanged  = false;

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
    if (['bonus_amount', 'bonus_day', 'bonus_hour'].includes(key)) bonusChanged = true;
    if (key === 'tg_user_bot_token') userBotChanged = true;
  }

  // Перезапускаем cron если изменились настройки бонуса
  if (bonusChanged) {
    try {
      const { reschedule } = require('../jobs/weeklyBonus');
      reschedule();
    } catch (e) {
      console.error('[Settings] Ошибка перезапуска планировщика:', e.message);
    }
  }

  // Перезапускаем пользовательский бот если изменился его токен
  if (userBotChanged) {
    try {
      const { restartBot } = require('../userBot');
      restartBot();
    } catch (e) {
      console.error('[Settings] Ошибка перезапуска пользовательского бота:', e.message);
    }
  }

  res.json({ ok: true });
});

// POST /api/admin/settings/test-telegram — тестовое сообщение
router.post('/settings/test-telegram', requireAuth, async (req, res) => {
  const { sendTelegram } = require('../telegram');
  try {
    await sendTelegram('✅ <b>LinkShop</b>\nТестовое сообщение. Уведомления работают!');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, requireAuth };
