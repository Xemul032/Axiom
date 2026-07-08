@echo off
chcp 65001 >nul
title Монтаж — Сервер

cd /d "%~dp0"

echo.
echo  Проверка зависимостей...
if not exist "node_modules" (
    echo  node_modules не найден, устанавливаю зависимости...
    npm install
    if errorlevel 1 (
        echo  ОШИБКА: не удалось установить зависимости!
        pause
        exit /b 1
    )
)

echo  Запуск сервера...
echo.
node server/index.js

pause
