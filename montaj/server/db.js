const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'montaj.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Миграция: добавить колонки если не существуют (для уже работающих БД) ──
// Запускаем ДО основного exec, чтобы INSERT OR IGNORE работал корректно
try {
  db.exec(`ALTER TABLE admins ADD COLUMN permissions TEXT NOT NULL DEFAULT 'all'`);
} catch (_) { /* уже есть */ }
try {
  db.exec(`ALTER TABLE admins ADD COLUMN is_super INTEGER NOT NULL DEFAULT 0`);
} catch (_) { /* уже есть */ }

// ── Основная схема ─────────────────────────────────────────────────────────
db.exec(`
  -- Администраторы
  CREATE TABLE IF NOT EXISTS admins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT 'all',
    is_super    INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO admins (username, password, permissions, is_super) VALUES ('admin', 'admin123', 'all', 1);

  -- Настройки приложения (key/value)
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_bot_token', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_chat_ids', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_notify_bot_token', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('tg_notify_chat_id', '');

  -- Виды работ (справочник, настраивается администратором)
  CREATE TABLE IF NOT EXISTS work_types (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    active     INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );
  INSERT OR IGNORE INTO work_types (name, sort_order) VALUES ('Баннер', 1);
  INSERT OR IGNORE INTO work_types (name, sort_order) VALUES ('Вывеска', 2);
  INSERT OR IGNORE INTO work_types (name, sort_order) VALUES ('Пленка на стекло', 3);
  INSERT OR IGNORE INTO work_types (name, sort_order) VALUES ('Световой короб', 4);
  INSERT OR IGNORE INTO work_types (name, sort_order) VALUES ('Объемные буквы', 5);

  -- Лимиты по дням (глобальные настройки)
  CREATE TABLE IF NOT EXISTS limits (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    montage_per_day      INTEGER NOT NULL DEFAULT 3,
    measurement_per_day  INTEGER NOT NULL DEFAULT 5,
    combined_per_day     INTEGER NOT NULL DEFAULT 6,
    buffer_montage_days  INTEGER NOT NULL DEFAULT 2,
    buffer_measure_days  INTEGER NOT NULL DEFAULT 1,
    updated_at           TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );
  INSERT OR IGNORE INTO limits (id) VALUES (1);

  -- Заблокированные дни
  CREATE TABLE IF NOT EXISTS blocked_days (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL UNIQUE,
    reason     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  -- Заявки на монтаж
  CREATE TABLE IF NOT EXISTS requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT,
    visit_type   TEXT NOT NULL CHECK(visit_type IN ('montage','measurement')),
    visit_date   TEXT NOT NULL,
    work_place   TEXT NOT NULL CHECK(work_place IN ('indoor','outdoor')),
    work_type    TEXT NOT NULL,
    address      TEXT NOT NULL,
    contacts     TEXT NOT NULL,
    comment      TEXT,
    user_name    TEXT,
    status       TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','done','cancelled')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  -- Прикреплённые файлы к заявкам
  CREATE TABLE IF NOT EXISTS request_files (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    orig_name  TEXT NOT NULL,
    mime_type  TEXT,
    size       INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );

  -- Пользователи бота (монтажники, прошедшие регистрацию)
  CREATE TABLE IF NOT EXISTS bot_users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
  );
`);

// ── Миграция: добавить колонки если не существуют (для уже работающих БД) ──
try {
  db.exec(`ALTER TABLE admins ADD COLUMN permissions TEXT NOT NULL DEFAULT 'all'`);
} catch (_) { /* уже есть */ }
try {
  db.exec(`ALTER TABLE admins ADD COLUMN is_super INTEGER NOT NULL DEFAULT 0`);
} catch (_) { /* уже есть */ }
// Убедимся что admin — суперадмин
db.prepare(`UPDATE admins SET is_super=1, permissions='all' WHERE username='admin'`).run();

module.exports = db;
