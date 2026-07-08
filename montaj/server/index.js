const express = require('express');
const cors    = require('cors');
const path    = require('path');
const os      = require('os');

const adminRouter    = require('./routes/admin');
const requestsRouter = require('./routes/requests');
const { startBotPolling } = require('./telegram');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, '..', 'public')));

// Загруженные файлы заявок
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// API роуты
app.use('/api/admin',    adminRouter);
app.use('/api/requests', requestsRouter);

// SPA fallback
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});
app.get('/frame*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'frame', 'index.html'));
});
app.get('/', (req, res) => res.redirect('/admin'));

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  const w = 56;
  const line = '═'.repeat(w);
  const pad  = (str) => str + ' '.repeat(Math.max(0, w - str.length - 2));

  console.log(`\n╔${line}╗`);
  console.log(`║  ✅ Монтаж-сервер запущен!${' '.repeat(w - 27)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  ${pad('🖥  Локально:   http://localhost:' + PORT)}║`);
  for (const ip of localIPs) {
    console.log(`║  ${pad('🌐 В сети:     http://' + ip + ':' + PORT)}║`);
  }
  console.log(`╠${line}╣`);
  console.log(`║  ${pad('📋 Админ-панель: http://localhost:' + PORT + '/admin')}║`);
  console.log(`║  ${pad('🖼  Фрейм:       http://localhost:' + PORT + '/frame')}║`);
  console.log(`║  ${pad('🔑 Логин: admin  |  Пароль: admin123')}║`);
  console.log(`╚${line}╝\n`);

  // Запускаем polling inline-бота
  startBotPolling();
});
