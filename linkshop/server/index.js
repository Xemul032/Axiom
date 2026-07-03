const express = require('express');
const cors    = require('cors');
const path    = require('path');
const os      = require('os');

const { router: adminRouter } = require('./routes/admin');
const shopRouter  = require('./routes/shop');
const apiRouter   = require('./routes/api');
const { startWeeklyBonus } = require('./jobs/weeklyBonus');
const { startPolling: startUserBot } = require('./userBot');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (admin + shop frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Загружаемые изображения товаров
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// ── API роуты ──────────────────────────────────────────────────────────────
app.use('/api/admin', adminRouter);
app.use('/api/shop',  shopRouter);
app.use('/api/user',  apiRouter);

// ── SPA fallback ───────────────────────────────────────────────────────────
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});
app.get('/shop*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'shop', 'index.html'));
});
app.get('/', (req, res) => { res.redirect('/admin'); });

// ── Получить IP-адреса в локальной сети ───────────────────────────────────
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

// ── Запуск ─────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  const w = 52;
  const line  = '═'.repeat(w);
  const pad   = (str) => str + ' '.repeat(Math.max(0, w - str.length - 2));

  console.log(`\n╔${line}╗`);
  console.log(`║  ✅ Сервер запущен!${' '.repeat(w - 19)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  ${pad('🖥  Локально:   http://localhost:' + PORT)}║`);

  if (localIPs.length > 0) {
    for (const ip of localIPs) {
      console.log(`║  ${pad('🌐 В сети:     http://' + ip + ':' + PORT)}║`);
    }
  } else {
    console.log(`║  ${pad('🌐 В сети:     (адрес не определён)')}║`);
  }

  console.log(`╠${line}╣`);
  console.log(`║  ${pad('📋 Админ-панель: http://localhost:' + PORT + '/admin')}║`);
  console.log(`║  ${pad('🔑 Логин: admin  |  Пароль: admin123')}║`);
  console.log(`╚${line}╝\n`);
});

// Запускаем планировщик еженедельных бонусов
startWeeklyBonus();

// Запускаем пользовательский Telegram-бот (long polling)
startUserBot();
