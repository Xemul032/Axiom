const express = require('express');
const router = express.Router();
const db = require('../db');
const { notifyPurchase } = require('../telegram');

// ════════════════════════════════════════════════
// ПУБЛИЧНЫЙ API МАГАЗИНА (для iframe)
// Идентификация пользователя — по имени+фамилии
// ════════════════════════════════════════════════

/**
 * GET /api/shop/me?first_name=Иван&last_name=Иванов
 * GET /api/shop/me?pin=1234
 * Возвращает данные пользователя: баланс, отдел, курс
 */
router.get('/me', (req, res) => {
  const { first_name, last_name, pin } = req.query;

  let user;

  if (pin) {
    user = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.balance, u.salary_folder_url, u.pin_only,
             d.name AS dept_name, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.pin = ?
    `).get(String(pin).trim());
  } else if (first_name && last_name) {
    user = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.balance, u.salary_folder_url, u.pin_only,
             d.name AS dept_name, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.first_name = ? AND u.last_name = ?
    `).get(first_name.trim(), last_name.trim());
  } else {
    return res.status(400).json({ error: 'Укажите pin или first_name + last_name' });
  }

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Если у пользователя включён режим "только по пинкоду" и запрос пришёл по ФИО —
  // возвращаем специальный статус, чтобы витрина показала PIN-экран
  if (user.pin_only && !pin) {
    return res.status(403).json({ error: 'pin_only', pin_only: true });
  }

  res.json(user);
});

/**
 * GET /api/shop/products?first_name=Иван&last_name=Иванов
 * Возвращает список товаров с ценой по курсу отдела пользователя
 */
router.get('/products', (req, res) => {
  const { first_name, last_name } = req.query;

  let rate = 1.0;

  if (first_name && last_name) {
    const user = db.prepare(`
      SELECT d.rate FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.first_name = ? AND u.last_name = ?
    `).get(first_name.trim(), last_name.trim());
    if (user) rate = user.rate;
  }

  const products = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id').all();

  const result = products.map(p => ({
    ...p,
    final_price: Math.round(p.base_price * rate),
    rate
  }));

  res.json(result);
});

/**
 * POST /api/shop/buy
 * Body: { first_name, last_name, product_id, user_text?, pin? }
 * Списывает линки за товар (по курсу отдела)
 */
router.post('/buy', (req, res) => {
  const { first_name, last_name, product_id, user_text, pin } = req.body;

  if ((!first_name || !last_name) && !pin) {
    return res.status(400).json({ error: 'Укажите first_name + last_name или pin, и product_id' });
  }
  if (!product_id) {
    return res.status(400).json({ error: 'Укажите product_id' });
  }

  let user;
  if (pin) {
    user = db.prepare(`
      SELECT u.*, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.pin = ?
    `).get(String(pin).trim());
  } else {
    user = db.prepare(`
      SELECT u.*, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.first_name = ? AND u.last_name = ?
    `).get(first_name.trim(), last_name.trim());
  }

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const product = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(Number(product_id));
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  // Если у товара включено текстовое поле — требуем текст
  if (product.text_field_enabled && (!user_text || !String(user_text).trim())) {
    return res.status(400).json({ error: 'Необходимо заполнить текстовое поле' });
  }

  const finalPrice = Math.round(product.base_price * user.dept_rate);

  if (user.balance < finalPrice) {
    return res.status(400).json({ error: 'Недостаточно линков', balance: user.balance, required: finalPrice });
  }

  const userTextClean = user_text ? String(user_text).trim() : null;

  let newTransactionId;
  const doPurchase = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id=?').run(finalPrice, user.id);
    const txInfo = db.prepare(`
      INSERT INTO transactions (user_id, amount, type, description, product_id)
      VALUES (?, ?, 'purchase', ?, ?)
    `).run(user.id, finalPrice, `Покупка: ${product.name}`, product.id);
    newTransactionId = txInfo.lastInsertRowid;

    // Создаём запись заказа для обработки администратором
    db.prepare(`
      INSERT INTO orders (user_id, product_id, transaction_id, user_text)
      VALUES (?, ?, ?, ?)
    `).run(user.id, product.id, newTransactionId, userTextClean);
  });
  doPurchase();

  const updated = db.prepare('SELECT balance FROM users WHERE id=?').get(user.id);

  // Достаём имя отдела для уведомления
  const userFull = db.prepare('SELECT d.name AS dept_name FROM users u JOIN departments d ON u.dept_id=d.id WHERE u.id=?').get(user.id);

  res.json({ ok: true, product: product.name, spent: finalPrice, new_balance: updated.balance });

  // Telegram уведомление (асинхронно, не блокирует ответ)
  notifyPurchase({
    firstName:   user.first_name,
    lastName:    user.last_name,
    deptName:    userFull ? userFull.dept_name : '—',
    productName: product.name,
    price:       finalPrice,
    newBalance:  updated.balance,
    userText:    userTextClean
  }).catch(e => console.error('[TG notify]', e.message));
});

/**
 * GET /api/shop/orders
 * Возвращает список заказов текущего пользователя
 */
router.get('/orders', (req, res) => {
  const { first_name, last_name, pin } = req.query;

  let user;

  if (pin) {
    user = db.prepare('SELECT id FROM users WHERE pin = ?').get(String(pin).trim());
  } else if (first_name && last_name) {
    user = db.prepare('SELECT id FROM users WHERE first_name = ? AND last_name = ?')
             .get(first_name.trim(), last_name.trim());
  } else {
    return res.status(400).json({ error: 'Укажите pin или first_name + last_name' });
  }

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const orders = db.prepare(`
    SELECT o.id, o.completed, o.created_at, o.completed_at,
           p.name AS product_name, p.image_url
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.completed ASC, o.created_at DESC
  `).all(user.id);

  res.json({ orders });
});

/**
 * GET /api/shop/transactions?user_id=1&offset=0&limit=10
 * Возвращает последние транзакции пользователя с пагинацией
 */
router.get('/transactions', (req, res) => {
  const { first_name, last_name, pin, offset = 0, limit = 10 } = req.query;

  let user;

  if (pin) {
    user = db.prepare(`
      SELECT u.id FROM users u WHERE u.pin = ?
    `).get(String(pin).trim());
  } else if (first_name && last_name) {
    user = db.prepare(`
      SELECT u.id FROM users u
      WHERE u.first_name = ? AND u.last_name = ?
    `).get(first_name.trim(), last_name.trim());
  } else {
    return res.status(400).json({ error: 'Укажите pin или first_name + last_name' });
  }

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  const rows = db.prepare(`
    SELECT t.id, t.amount, t.type, t.description, t.created_at, p.name AS product_name
    FROM transactions t
    LEFT JOIN products p ON t.product_id = p.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(user.id, lim, off);

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM transactions WHERE user_id = ?').get(user.id);

  res.json({ transactions: rows, total, offset: off, limit: lim });
});

module.exports = router;
