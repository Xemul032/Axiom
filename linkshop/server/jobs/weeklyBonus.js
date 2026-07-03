const cron = require('node-cron');
const db = require('../db');
const { getSetting } = require('../telegram');

let currentTask = null; // текущая cron-задача

const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/**
 * Читает настройки из БД и (пере)запускает cron
 * Вызывается при старте и при изменении настроек через API
 */
function startWeeklyBonus() {
  reschedule();
  console.log('[WeeklyBonus] Планировщик инициализирован');
}

function reschedule() {
  // Останавливаем предыдущую задачу если есть
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  const amount = Math.round(parseFloat(getSetting('bonus_amount')) || 80);
  const day    = parseInt(getSetting('bonus_day'), 10);   // 0=вс, 1=пн ... 6=сб
  const hour   = parseInt(getSetting('bonus_hour'), 10);  // 0-23

  // Валидация
  const safeDay  = (day  >= 0 && day  <= 6) ? day  : 1;
  const safeHour = (hour >= 0 && hour <= 23) ? hour : 9;

  const cronExpr = `0 ${safeHour} * * ${safeDay}`;

  console.log(`[WeeklyBonus] Расписание: "${cronExpr}" (+${amount} линков, ${DAYS[safeDay]})`);

  currentTask = cron.schedule(cronExpr, () => {
    const actualAmount = Math.round(parseFloat(getSetting('bonus_amount')) || 80);
    runBonus(actualAmount);
  }, {
    timezone: 'Europe/Moscow'
  });
}

function runBonus(amount) {
  console.log(`[WeeklyBonus] Начисление ${amount} линков...`);

  const users = db.prepare('SELECT id FROM users').all();

  const addBonus = db.transaction(() => {
    for (const user of users) {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(amount, user.id);
      db.prepare(`
        INSERT INTO transactions (user_id, amount, type, description)
        VALUES (?, ?, 'weekly', 'Еженедельное начисление')
      `).run(user.id, amount);
    }
  });

  addBonus();
  console.log(`[WeeklyBonus] Начислено ${amount} линков ${users.length} пользователям.`);
}

module.exports = { startWeeklyBonus, reschedule };
