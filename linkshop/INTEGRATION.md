# LinkShop — Руководство по интеграции

## Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Интеграция с amoCRM](#интеграция-с-amocrm)
3. [Интеграция с Simprint](#интеграция-с-simprint)
4. [Интеграция на произвольный сайт (виджет)](#интеграция-на-произвольный-сайт)
5. [Автоматическое начисление линков](#автоматическое-начисление-линков)
6. [API Reference](#api-reference)

---

## Быстрый старт

### Запуск сервера

```bash
cd linkshop
npm install
node server/index.js
```

Сервер запускается на `http://localhost:3000`  
Админ-панель: `http://localhost:3000/admin`  
Логин: `admin` | Пароль: `admin123`

### Первоначальная настройка (чек-лист)

- [ ] Создать отделы продаж с нужными курсами (Отделы → Добавить)
- [ ] Добавить пользователей (Пользователи → Добавить) — PIN генерируется автоматически
- [ ] Добавить товары (Товары → Добавить)
- [ ] Настроить Telegram-уведомления (Настройки)
- [ ] Установить Tampermonkey-скрипт на нужный сайт

---

## Интеграция с amoCRM

**Файл:** `linkshop-amocrm.user.js`  
**Сайт:** `https://cplink.amocrm.ru/*`

### Установка

1. Установите расширение [Tampermonkey](https://www.tampermonkey.net/) в браузер
2. Откройте Tampermonkey → «Создать новый скрипт»
3. Вставьте содержимое файла `linkshop-amocrm.user.js`
4. Измените строку конфигурации:
   ```js
   const LINKSHOP_URL = 'https://your-linkshop-server.com';
   ```
5. Сохраните скрипт (Ctrl+S)

### Как работает

- **Кнопка магазина** появляется в правом нижнем углу страницы
- На кнопке отображается текущий баланс пользователя (💰 160)
- Имя пользователя определяется автоматически из интерфейса amoCRM по селектору `.nav__top__userbar__userinfo__username`
- Если имя найдено в базе LinkShop → магазин открывается сразу
- Если имя **не найдено** → показывается экран ввода PIN-кода
- При закрытии магазина баланс на кнопке обновляется

### Автоматическое начисление линков

Скрипт отслеживает действия в amoCRM и начисляет линки:

| Действие | Начисление |
|----------|-----------|
| Появилась кнопка «Перейти к сделке» | +5 линков |
| Клик «Принять» | +1 линк |
| Закрытие уведомления «Получить Линки» | +10 линков |

При каждом начислении показывается летящая анимация числа.  
Начисление отправляется на сервер через `POST /api/user/add-links`.

---

## Интеграция с Simprint

**Файл:** `linkshop-simprint.user.js`  
**Сайт:** `https://cplink.simprint.pro/*`

### Установка

1. Установите расширение [Tampermonkey](https://www.tampermonkey.net/) в браузер
2. Откройте Tampermonkey → «Создать новый скрипт»
3. Вставьте содержимое файла `linkshop-simprint.user.js`
4. Измените строку конфигурации:
   ```js
   const LINKSHOP_URL = 'https://your-linkshop-server.com';
   ```
5. Сохраните скрипт

### Как работает

- Скрипт находит навигационное меню `body > ul`
- Клонирует 8-й пункт меню (`li:nth-child(8)`) со всеми его классами и стилями
- Вставляет новый пункт «🛍 Магазин линков» сразу после 8-го
- При клике открывается модальное окно с iframe магазина
- Авторизация — через PIN-код (экран ввода появляется автоматически)

### Отладка

Если кнопка не появляется, откройте консоль браузера (F12) и проверьте:
```js
// Есть ли список?
document.querySelector('body > ul')

// Есть ли 8-й элемент?
document.querySelector('body > ul > li:nth-child(8)')
```

Если структура другая — измените селекторы в скрипте:
```js
const ul      = document.querySelector('body > ul');        // ← селектор списка
const refItem = ul.querySelector('li:nth-child(8)');        // ← эталонный элемент
refItem.insertAdjacentElement('afterend', newLi);           // ← позиция вставки
```

---

## Интеграция на произвольный сайт (виджет)

Используйте готовый виджет `linkshop-widget.js` — он работает на любом сайте без Tampermonkey.

### Подключение через `<script>`

```html
<script src="https://your-linkshop-server.com/linkshop-widget.js"></script>
<script>
  LinkShopWidget.init({
    serverUrl:  'https://your-linkshop-server.com',
    firstName:  'Иван',      // имя пользователя (если известно)
    lastName:   'Иванов',    // фамилия
    buttonText: '🛍 Магазин линков',  // текст кнопки (опционально)
    target:     '#my-container'        // куда вставить кнопку (опционально)
  });
</script>
```

Если `firstName`/`lastName` не известны — при открытии магазина пользователь введёт PIN.

### Открыть магазин программно

```js
LinkShopWidget.open();          // открыть
LinkShopWidget.close();         // закрыть
LinkShopWidget.setUser('Пётр', 'Петров');  // сменить пользователя
```

---

## Автоматическое начисление линков

Любой внешний скрипт может начислять линки через API:

```js
// Начислить 5 линков пользователю "Артём Викторович"
fetch('https://your-linkshop-server.com/api/user/add-links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Артём Викторович',  // или first_name + last_name
    amount:    5,
    reason:    'Принять'
  })
})
.then(r => r.json())
.then(data => {
  if (data.ok) console.log('Новый баланс:', data.new_balance);
});
```

Ответ:
```json
{
  "ok": true,
  "first_name": "Артём",
  "last_name": "Викторович",
  "added": 5,
  "new_balance": 165
}
```

---

## API Reference

### Публичный API (без авторизации)

#### Получить баланс пользователя
```
GET /api/user/balance?first_name=Иван&last_name=Иванов
GET /api/user/balance?token=tk_xxxxxxxx
```

#### Начислить линки
```
POST /api/user/add-links
Body: { "full_name": "...", "amount": 5, "reason": "..." }
```

#### Магазин — данные пользователя
```
GET /api/shop/me?first_name=Иван&last_name=Иванов
GET /api/shop/me?pin=1234
```

#### Магазин — список товаров
```
GET /api/shop/products?first_name=Иван&last_name=Иванов
```

#### Купить товар
```
POST /api/shop/buy
Body: { "first_name": "...", "last_name": "...", "product_id": 1 }
```

### Админ API (требует заголовок `X-Admin-Token`)

Токен получается при логине: `POST /api/admin/login`

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/admin/login | Авторизация |
| GET | /api/admin/departments | Список отделов |
| POST | /api/admin/departments | Создать отдел |
| PUT | /api/admin/departments/:id | Изменить курс отдела |
| GET | /api/admin/users | Список пользователей |
| POST | /api/admin/users | Создать пользователя (PIN генерируется автоматически) |
| DELETE | /api/admin/users/:id | Удалить пользователя |
| GET | /api/admin/products | Список товаров |
| POST | /api/admin/products | Добавить товар |
| PUT | /api/admin/products/:id | Изменить товар |
| POST | /api/admin/balance/adjust | Начислить/списать вручную |
| GET | /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD | Статистика |
| GET | /api/admin/stats?...&format=csv | Скачать CSV |

### Параметры статистики

```
?from=2026-01-01&to=2026-12-31              — за период
&user_id=5                                  — конкретный пользователь
&dept_id=2                                  — конкретный отдел
&format=csv                                 — скачать файл
```

---

## Концепция линков

| Параметр | Значение |
|----------|----------|
| Еженедельный бонус | +80 линков каждый понедельник в 09:00 МСК |
| Курс отдела | умножитель базовой цены (напр. 1.3) |
| Итоговая цена | `round(базовая_цена × курс_отдела)` |
| PIN пользователя | 4 цифры, уникальный, генерируется автоматически |

---

## Переменные окружения

```bash
PORT=3000    # порт сервера (по умолчанию 3000)
```

## Смена пароля администратора

```bash
sqlite3 data/linkshop.db "UPDATE admins SET password='новый_пароль' WHERE username='admin';"
```
