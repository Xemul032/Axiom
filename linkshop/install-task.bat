@echo off
echo Регистрация задачи в Планировщике задач Windows...
powershell -Command "Start-Process powershell -ArgumentList '-Command schtasks /Create /TN \"LinkShop Server\" /XML \"%~dp0linkshop-task.xml\" /F' -Verb RunAs -Wait"
if %ERRORLEVEL% == 0 (
    echo.
    echo Задача успешно зарегистрирована!
    echo Сервер LinkShop будет автоматически запускаться при старте системы.
) else (
    echo.
    echo Ошибка при регистрации задачи.
)
pause
