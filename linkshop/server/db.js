const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'linkshop.db');

// Убедимся что папка data существует
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Включаем WAL режим для производительности
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Инициализация схемы ---
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL UNIQUE,
    rate      REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    dept_id     INTEGER NOT NULL REFERENCES departments(id),
    balance     REAL NOT NULL DEFAULT 0,
    api_token   TEXT UNIQUE,
    pin         TEXT UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    base_price  REAL NOT NULL,
    image_url   TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    amount      REAL NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('credit','debit','purchase','weekly')),
    description TEXT,
    product_id  INTEGER REFERENCES products(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  -- Дефолтный админ: admin / admin123
  INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', 'admin123');
`);

// --- Миграции (безопасное добавление новых колонок) ---
// ALTER TABLE нельзя выполнять внутри транзакции SQLite — запускаем напрямую
try {
  db.exec('ALTER TABLE users ADD COLUMN pin TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pin ON users(pin) WHERE pin IS NOT NULL');
  console.log('[DB] Миграция: добавлена колонка users.pin');
} catch (e) {
  // Колонка уже существует — ок
}

try {
  db.exec('ALTER TABLE users ADD COLUMN tg_chat_id TEXT');
  console.log('[DB] Миграция: добавлена колонка users.tg_chat_id');
} catch (e) {
  // Колонка уже существует — ок
}

try {
  db.exec('ALTER TABLE users ADD COLUMN salary_folder_url TEXT');
  console.log('[DB] Миграция: добавлена колонка users.salary_folder_url');
} catch (e) {
  // Колонка уже существует — ок
}

try {
  db.exec('ALTER TABLE users ADD COLUMN pin_only INTEGER NOT NULL DEFAULT 0');
  console.log('[DB] Миграция: добавлена колонка users.pin_only');
} catch (e) {
  // Колонка уже существует — ок
}

// Таблица заказов
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    product_id   INTEGER NOT NULL REFERENCES products(id),
    transaction_id INTEGER REFERENCES transactions(id),
    completed    INTEGER NOT NULL DEFAULT 0,
    cert_file    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
    completed_at TEXT
  );
`);

// Миграция: текстовое поле в товарах
try {
  db.exec('ALTER TABLE products ADD COLUMN text_field_enabled INTEGER NOT NULL DEFAULT 0');
  console.log('[DB] Миграция: добавлена колонка products.text_field_enabled');
} catch (e) {}

try {
  db.exec('ALTER TABLE products ADD COLUMN text_field_placeholder TEXT NOT NULL DEFAULT ""');
  console.log('[DB] Миграция: добавлена колонка products.text_field_placeholder');
} catch (e) {}

// Миграция: текст пользователя в заказах
try {
  db.exec('ALTER TABLE orders ADD COLUMN user_text TEXT');
  console.log('[DB] Миграция: добавлена колонка orders.user_text');
} catch (e) {}

module.exports = db;
