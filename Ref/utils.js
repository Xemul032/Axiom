// Глобальные функции проекта Axiom

function showCenterMessage(input) {
    // Поддержка двух форматов вызова
    const opts = typeof input === "string" ? { message: input } : (input || {});
    
    const {
        message = "",
        buttonText = "Ок",
        onClose = null,
        duration = 0
    } = opts;

    // Если окно уже открыто — выходим
    if (document.getElementById("messageContainer")) return { close: () => {} };

    // Создаём затемнение
    const blurOverlay = document.createElement("div");
    blurOverlay.id = "blueOverlay";
    Object.assign(blurOverlay.style, {
        position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)", zIndex: "9998"
    });

    // Создаём контейнер
    const messageContainer = document.createElement("div");
    messageContainer.id = "messageContainer";
    Object.assign(messageContainer.style, {
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        backgroundColor: "#ffffff", padding: "24px 28px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: "10000",
        borderRadius: "12px", minWidth: "320px", maxWidth: "90vw",
        textAlign: "center", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        boxSizing: "border-box"
    });

    // Формируем HTML
    let messageHTML = `<div style="margin-bottom: 20px; font-size: 16px; font-weight: 600; color: #333; line-height: 1.5;">${message}</div>`;
    messageHTML += `<button id="closeMessage" style="padding: 10px 32px; font-size: 14px; font-weight: 500; cursor: pointer; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; border-radius: 6px; transition: all 0.2s;">${buttonText}</button>`;

    messageContainer.innerHTML = messageHTML;

    // 🔥 ВАЖНО: Сначала добавляем элементы в DOM
    document.body.appendChild(blurOverlay);
    document.body.appendChild(messageContainer);

    // Логика закрытия
    const close = () => {
        if (messageContainer.parentNode) messageContainer.parentNode.removeChild(messageContainer);
        if (blurOverlay.parentNode) blurOverlay.parentNode.removeChild(blurOverlay);
        if (typeof onClose === "function") onClose();
    };

    // 🔥 ТЕПЕРЬ элемент существует в DOM, getElementById найдёт его
    const closeBtn = document.getElementById("closeMessage");
    if (closeBtn) {
        closeBtn.addEventListener("click", close);
    }
    
    blurOverlay.addEventListener("click", close);

    // Автозакрытие
    if (duration > 0) setTimeout(close, duration);

    // Возвращаем объект управления
    return { close };
}

// 🔥 ЭКСПОРТ
return {
    showCenterMessage: showCenterMessage
};
