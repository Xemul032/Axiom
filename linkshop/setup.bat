@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title LinkShop

echo.
echo  ================================================
echo    LinkShop -- Podgotovka servera
echo  ================================================
echo.

cd /d "%~dp0"

:: ── [1/3] Node.js ─────────────────────────────────────────────────────────
echo [1/3] Proverka Node.js...
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo.
    echo  OSHIBKA: Node.js ne naiden!
    echo  Skachayte s https://nodejs.org/  ^(versiya 18 LTS ili novee^)
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
echo  OK: Node.js !NODE_VER! naiden

:: ── [2/3] npm install + prebuilt бинарник ─────────────────────────────────
echo.
echo [2/3] Ustanovka zavisimostey...
echo.
call npm install --ignore-scripts
if !errorlevel! neq 0 (
    echo  OSHIBKA pri npm install!
    pause
    exit /b 1
)
echo  OK: npm-zavisimosti ustanovleny

:: Определяем ABI и версию установленного better-sqlite3
for /f "tokens=*" %%a in ('node -e "process.stdout.write(process.versions.modules)"') do set "NODE_ABI=%%a"
for /f "tokens=*" %%v in ('node -e "process.stdout.write(require('./node_modules/better-sqlite3/package.json').version)"') do set "BS3_VER=%%v"

set "BS3_DIR=node_modules\better-sqlite3\lib\binding\node-v!NODE_ABI!-win32-x64"
set "BS3_BIN=!BS3_DIR!\better_sqlite3.node"

echo  better-sqlite3 v!BS3_VER!, Node ABI !NODE_ABI!

if exist "!BS3_BIN!" (
    echo  OK: Binarnyy modul uzhe est
    goto :init_db
)

echo  Skachivayem prebuilt binarnik...
if not exist "!BS3_DIR!" mkdir "!BS3_DIR!"

set "BS3_URL=https://github.com/WiseLibs/better-sqlite3/releases/download/v!BS3_VER!/better-sqlite3-v!BS3_VER!-node-v!NODE_ABI!-win32-x64.tar.gz"
set "BS3_TMP=%TEMP%\bs3_prebuilt.tar.gz"

echo  Zagruzka s GitHub...
powershell -NoProfile -NonInteractive -Command "Invoke-WebRequest -Uri '!BS3_URL!' -OutFile '!BS3_TMP!' -UseBasicParsing"
if !errorlevel! neq 0 (
    echo.
    echo  OSHIBKA: Ne udalos skachat prebuilt!
    echo  Poprobуyte vruchnuyu: !BS3_URL!
    echo  Raspakuyte better_sqlite3.node v: !BS3_DIR!\
    pause
    exit /b 1
)

tar -xzf "!BS3_TMP!" -C "!BS3_DIR!" >nul 2>nul

if not exist "!BS3_BIN!" (
    if exist "!BS3_DIR!\build\Release\better_sqlite3.node" (
        copy /y "!BS3_DIR!\build\Release\better_sqlite3.node" "!BS3_BIN!" >nul
    )
)
del /f /q "!BS3_TMP!" 2>nul

if exist "!BS3_BIN!" (
    echo  OK: Binarnyy modul ustanovlen
) else (
    echo  OSHIBKA: Binarnyy modul ne udalos ustanovit!
    echo  Ustanovite Visual Studio Build Tools ili skachayte binarnik vruchnuyu.
    pause
    exit /b 1
)

:init_db
:: ── [3/3] Запуск ──────────────────────────────────────────────────────────
echo.

:: Останавливаем предыдущий экземпляр если он занял порт
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Ostanovka starogo processa na portu 3000 ^(PID %%p^)...
    taskkill /f /pid %%p >nul 2>nul
)

echo  ================================================
echo    Zapuskaem server...
echo    Dlya ostanovki: Ctrl+C
echo  ================================================
echo.

node server/index.js
pause
