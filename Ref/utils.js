// Глобальные функции проекта Axiom

function showCenterMessage(message) {
    // ✅ ПРОВЕРКА: Если окно уже открыто, выходим
    if (document.getElementById("messageContainer")) return;

    // Создаем затемнение
    const blurOverlay = document.createElement("div");
    blurOverlay.id = "blueOverlay";
    blurOverlay.style.position = "fixed";
    blurOverlay.style.top = "0";
    blurOverlay.style.left = "0";
    blurOverlay.style.width = "100%";
    blurOverlay.style.height = "100%";
    blurOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    blurOverlay.style.backdropFilter = "blur(5px)";
    blurOverlay.style.zIndex = "9998";

    // Создаем контейнер сообщения
    const messageContainer = document.createElement("div");
    messageContainer.id = "messageContainer";
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "50%";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translate(-50%, -50%)";
    messageContainer.style.backgroundColor = "white";
    messageContainer.style.padding = "20px 30px";
    messageContainer.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.4)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.borderRadius = "12px";
    messageContainer.style.textAlign = "center";
    messageContainer.style.minWidth = "250px";

    // Формируем HTML
    let messageHTML = `<div style="margin-bottom: 15px; font-size: 16px; font-weight: bold; color: #333;">${message}</div>`;
    messageHTML += `<button id="closeMessage" style="padding: 8px 24px; font-size: 14px; cursor: pointer; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; border-radius: 6px;">Ок</button>`;

    messageContainer.innerHTML = messageHTML;

    // Добавляем в DOM
    document.body.appendChild(blurOverlay);
    document.body.appendChild(messageContainer);

    // Обработчик кнопки закрытия
    document.getElementById("closeMessage").addEventListener("click", function () {
        // Удаляем элементы
        if (messageContainer.parentNode) messageContainer.parentNode.removeChild(messageContainer);
        if (blurOverlay.parentNode) blurOverlay.parentNode.removeChild(blurOverlay);
    });
}

// 🔥 ЭКСПОРТ: Возвращаем функции, чтобы они стали доступны через api.showCenterMessage
return {
    showCenterMessage: showCenterMessage
};