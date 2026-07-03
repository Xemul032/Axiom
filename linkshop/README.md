# 🔗 LinkShop — Корпоративный магазин на линках

Веб-сервис внутреннего магазина с валютой «Линки». Включает:
- Полную админ-панель (отделы, пользователи, товары, баланс, статистика)
- Iframe-магазин с ценами по курсу отдела
- Виджет для встройки на любой внешний сайт
- REST API для внешних скриптов
- Автоматическое еженедельное начисление 80 линков (каждый понедельник в 09:00 МСК)

---

## Быстрый старт

```bash
cd linkshop
npm install
npm start
```

Открыть: **http://localhost:3000**  
Логин: `admin` | Пароль: `admin123`

---

## Структура проекта

```
linkshop/
├── server/
│   ├── index.js              # Точка входа Express
│   ├── db.js                 # SQLite + схема БД
│   ├── routes/
│   │   ├── admin.js          # API админ-панели
│   │   ├── shop.js           # API магазина
│   │   └── api.js            # Внешний API (баланс)
│   └── jobs/
│       └── weeklyBonus.js    # Cron еженедельных начислений
├── public/
│   ├── admin/                # Админ-панель (SPA)
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   ├── shop/                 # Магазин (iframe)
│   │   ├── index.html
│   │   ├── shop.css
│   │   └── shop.js
│   └── linkshop-widget.js    # Виджет для внешних сайтов
├── data/                     # SQLite БД (создаётся автоматически)
└── package.json
```

---

## API Reference

### Внешний API (публичный)

#### Получить баланс пользователя
```
GET /api/user/balance?first_name=Иван&last_name=Иванов
GET /api/user/balance?token=tk_xxxxxxxx
```

Ответ:
```json
{
  "first_name": "Иван",
  "last_name":  "Иванов",
  "balance":    160,
  "dept_name":  "Отдел B2B",
  "dept_rate":  1.3
}
```

### API магазина

#### Получить информацию о пользователе
```
GET /api/shop/me?first_name=Иван&last_name=Иванов
```

#### Получить товары (с ценой по курсу отдела)
```
GET /api/shop/products?first_name=Иван&last_name=Иванов
```

#### Купить товар
```
POST /api/shop/buy
Body: { "first_name": "Иван", "last_name": "Иванов", "product_id": 1 }
```

### Админ API (требует X-Admin-Token заголовок)

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/admin/login | Авторизация |
| GET  | /api/admin/departments | Список отделов |
| POST | /api/admin/departments | Создать отдел |
| PUT  | /api/admin/departments/:id | Изменить отдел/курс |
| DELETE | /api/admin/departments/:id | Удалить отдел |
| GET  | /api/admin/users | Список пользователей |
| POST | /api/admin/users | Создать пользователя |
| DELETE | /api/admin/users/:id | Удалить пользователя |
| GET  | /api/admin/products | Список товаров |
| POST | /api/admin/products | Создать товар |
| PUT  | /api/admin/products/:id | Изменить товар |
| POST | /api/admin/balance/adjust | Начислить/списать линки |
| GET  | /api/admin/stats | Статистика (JSON) |
| GET  | /api/admin/stats?format=csv | Статистика (CSV) |

#### Параметры статистики
```
GET /api/admin/stats?from=2026-01-01&to=2026-12-31
GET /api/admin/stats?from=2026-01-01&to=2026-12-31&user_id=5
GET /api/admin/stats?from=2026-01-01&to=2026-12-31&dept_id=2
GET /api/admin/stats?from=2026-01-01&to=2026-12-31&format=csv
```

---

## Встройка виджета на внешний сайт

```html
<!-- Подключить скрипт виджета -->
<script src="https://your-linkshop-server/linkshop-widget.js"></script>

<script>
  LinkShopWidget.init({
    serverUrl:  'https://your-linkshop-server',
    firstName:  'Иван',     // Имя авторизованного пользователя
    lastName:   'Иванов',   // Фамилия
    buttonText: '🛍 Мой магазин',  // Опционально
    target:     '#shop-btn-container'  // Опционально, куда вставить кнопку
  });
</script>
```

При клике на кнопку откроется модальное окно с iframe магазина.  
Магазин автоматически покажет цены по курсу отдела пользователя.

### Открыть магазин программно
```js
LinkShopWidget.open();
LinkShopWidget.close();
LinkShopWidget.setUser('Пётр', 'Петров'); // Сменить пользователя
```

---

## Концепция линков

- **Линки** — внутренняя валюта компании
- Каждый **понедельник в 09:00** всем пользователям начисляется **80 линков**
- У каждого отдела свой **курс** (коэффициент цены)
- Итоговая цена = `базовая_цена × курс_отдела`
- Администратор может **вручную** начислить или списать любую сумму

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| PORT | 3000 | Порт сервера |

```bash
PORT=8080 npm start
```

---

## Смена пароля администратора

После первого запуска выполните SQL:
```sql
UPDATE admins SET password='новый_пароль' WHERE username='admin';
```

Или через SQLite CLI:
```bash
sqlite3 data/linkshop.db "UPDATE admins SET password='secret' WHERE username='admin';"
```
