@echo off
chcp 65001 >nul
echo Регистрация задачи "Montaj Server" в Планировщике задач Windows...
powershell -Command "Start-Process powershell -ArgumentList '-Command schtasks /Create /TN \"Montaj Server\" /XML \"%~dp0montaj-task.xml\" /F' -Verb RunAs -Wait"
if %ERRORLEVEL% == 0 (
    echo.
    echo Задача успешно зарегистрирована!
    echo Сервер Montaj будет автоматически запускаться при старте системы.
    echo При сбое — перезапускается автоматически через 1 минуту.
) else (
    echo.
    echo Ошибка при регистрации задачи.
)
pause
