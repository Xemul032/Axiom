$action = New-ScheduledTaskAction `
    -Execute "C:\Program Files\nodejs\node.exe" `
    -Argument "C:\Users\LinkADM\Documents\GitHub\Axiom\linkshop\server\index.js" `
    -WorkingDirectory "C:\Users\LinkADM\Documents\GitHub\Axiom\linkshop"

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit 0 `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName "LinkShop Server" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Задача 'LinkShop Server' успешно зарегистрирована в Планировщике задач."
