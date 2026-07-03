const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Внешний API для получения информации о пользователе.
 * Используется внешними скриптами.
 *
 * GET /api/user/balance?first_name=Иван&last_name=Иванов
 *   - Публичный поиск по ФИО
 *
 * GET /api/user/balance?token=tk_xxxx
 *   - Аутентифицированный запрос по api_token пользователя
 */
router.get('/balance', (req, res) => {
  const { first_name, last_name, token } = req.query;

  let user;

  if (token) {
    user = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.balance, d.name AS dept_name, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.api_token = ?
    `).get(token);
  } else if (first_name && last_name) {
    user = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.balance, d.name AS dept_name, d.rate AS dept_rate
      FROM users u JOIN departments d ON u.dept_id = d.id
      WHERE u.first_name = ? AND u.last_name = ?
    `).get(first_name.trim(), last_name.trim());
  } else {
    return res.status(400).json({ error: 'Укажите token или first_name + last_name' });
  }

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  res.json({
    first_name: user.first_name,
    last_name:  user.last_name,
    balance:    user.balance,
    dept_name:  user.dept_name,
    dept_rate:  user.dept_rate
  });
});

/**
 * POST /api/user/add-links
 * Начисляет линки пользователю — вызывается из внешних скриптов (Tampermonkey).
 *
 * Body (JSON):
 *   { "full_name": "Артем Викторович", "amount": 5, "reason": "Принять" }
 *   или
 *   { "first_name": "Артем", "last_name": "Викторович", "amount": 5, "reason": "Принять" }
 *
 * Безопасность: принимает только положительные суммы, только кредит.
 * При желании можно добавить api_key для защиты (пока открытый, т.к. работает во внутренней сети).
 */
router.post('/add-links', (req, res) => {
  let { full_name, first_name, last_name, amount, reason } = req.body;

  // Разбираем full_name если переданы не раздельно
  if (full_name && (!first_name || !last_name)) {
    const parts = String(full_name).trim().split(/\s+/);
    first_name = parts[0] || '';
    last_name  = parts.slice(1).join(' ') || parts[0] || '';
  }

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'Укажите full_name или first_name + last_name' });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'amount должен быть положительным числом' });
  }

  const user = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.balance
    FROM users u
    WHERE u.first_name = ? AND u.last_name = ?
  `).get(first_name.trim(), last_name.trim());

  if (!user) {
    return res.status(404).json({ error: `Пользователь "${first_name} ${last_name}" не найден` });
  }

  const desc = reason ? `Начисление: ${reason}` : 'Начисление через API';

  const doCredit = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amt, user.id);
    db.prepare(`
      INSERT INTO transactions (user_id, amount, type, description)
      VALUES (?, ?, 'credit', ?)
    `).run(user.id, amt, desc);
  });
  doCredit();

  const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);

  res.json({
    ok:          true,
    first_name:  user.first_name,
    last_name:   user.last_name,
    added:       amt,
    new_balance: updated.balance
  });
});

module.exports = router;
