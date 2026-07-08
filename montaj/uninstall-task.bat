@echo off
chcp 65001 >nul
echo Удаление задачи "Montaj Server" из Планировщика задач Windows...
powershell -Command "Start-Process powershell -ArgumentList '-Command schtasks /Delete /TN \"Montaj Server\" /F' -Verb RunAs -Wait"
if %ERRORLEVEL% == 0 (
    echo.
    echo Задача успешно удалена!
) else (
    echo.
    echo Ошибка при удалении задачи (возможно, задача не была зарегистрирована).
)
pause
