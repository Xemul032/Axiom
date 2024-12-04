// ==UserScript==
// @name         Проверка заказа 5.0
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description
// @author       Ваше имя
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  //
  // Переменная для хранения начального значения даты
  let initialDateReadyValue = null;
  let checkButtonClicked = false; // Переменная для отслеживания нажатия кнопки "Проверить"
  let choosenCalcId = "";
  let closeBtnId = "";
  // всекм привет
  // Функция для проверки текста "Номенклатура" и получения значения "DateReady"

  let choosenCalcParent = null;
  let choosenCalc = null;
  setInterval(() => {
    choosenCalcParent = document.querySelector("#Doc > div.TemplateChooser");

    if (choosenCalcParent) {
      for (let i = 0; i < 9; i++) {
        choosenCalcParent.children[i].addEventListener("click", function () {
          choosenCalc = null;
          choosenCalcId = null;
          closeBtnId = null;
          // Получаем индекс элемента, на который нажали
          choosenCalc = parseInt(i);

          // Выводим индекс в консоль

          if (choosenCalc === 0) {
            closeBtnId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
          } else if (choosenCalc === 1) {
            choosenCalcId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            closeBtnId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
          } else if (choosenCalc === 2) {
            closeBtnId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
          } else if (
            choosenCalc === 3 ||
            choosenCalc === 4 ||
            choosenCalc === 5 ||
            choosenCalc === 6 ||
            choosenCalc === 8
          ) {
            closeBtnId = null;
            choosenCalcId = null;
          } else if (choosenCalc === 7) {
            closeBtnId = null;
            choosenCalcId = null;
            setTimeout(() => {
                document.querySelector(
                  `#CheckAllTech > div:nth-child(1) > label > input[type=checkbox]`
                ).checked = false;
                document.querySelector(
                  `#CheckAllTech > div:nth-child(2) > label > input[type=checkbox]`
                ).checked = false;
                document.querySelector(
                  `#CheckAllTech > div:nth-child(3) > label > input[type=checkbox]`
                ).checked = false;
                document.querySelector(
                  `#CheckAllTech > div:nth-child(4) > label > input[type=checkbox]`
                ).checked = false;
                document.querySelector(
                  `#CheckAllTech > div:nth-child(5) > label > input[type=checkbox]`
                ).checked = false;
                document.querySelector(
                  `#CheckAllTech > div:nth-child(12) > label > input[type=checkbox]`
                ).checked = true;
              }, 500);
          }
          
        });
      }
    }

    const new4Style = document.createElement("style");
    new4Style.type = "text/css";
    let new4Styles = `${closeBtnId} {margin-left: 500px;}`;
    new4Style.appendChild(document.createTextNode(new4Styles));
    document.head.appendChild(new4Style);
  }, 100);

  function checkForTextAndDate() {
    const searchText = "Номенклатура";
    const bodyText = document.body.innerText;

    if (bodyText.includes(searchText)) {
      // if (dateReadyInput) {
      //     const dateReadyValue = dateReadyInput.value;

      //     // Устанавливаем начальное значение только если есть валидные данные
      //     if (dateReadyValue) {
      //         if (initialDateReadyValue === null) {
      //             initialDateReadyValue = dateReadyValue;  // Сохраняем текущее значение
      //         } else if (initialDateReadyValue !== dateReadyValue) {
      //             showCenterMessage('Дата сдачи заказа изменилась!'); // Показываем сообщение в центре экрана
      //             initialDateReadyValue = dateReadyValue; // Обновляем значение
      //         }
      //     } else {
      //         initialDateReadyValue = null; // Сбрасываем начальное значение, если поле пустое
      //     }
      // }
      const input = document.getElementById("DateReady");
      let previousValue = input.value;
      let changeDate = false;

      const dateReadyInput = document.querySelector(
        "input#DateReady.center.datepicker.DateReady.hasDatepicker"
      );
      // Проверка каждую секунду
      if (dateReadyInput) {
        let currentValue = null;
        setInterval(() => {
          currentValue = input.value;
          if (currentValue !== previousValue) {
            changeDate = true;
            console.log(changeDate);

            previousValue = currentValue;
          }
          if (changeDate == true) {
            showCenterMessage("Дата сдачи заказа изменилась!"); // Показываем сообщение в центре экрана
            changeDate = false;
          } else {
            changeDate = false;
          }
        }, 1000);
      }
    }
  }

  // Создание кнопки для проверки заказа
  const orderCheckButton = document.createElement("button");
  orderCheckButton.style.display = "none";
  orderCheckButton.innerHTML = "Рассчитать";
  orderCheckButton.style.width = "130px";
  orderCheckButton.style.height = "45px";
  orderCheckButton.style.borderRadius = "5px";
  orderCheckButton.style.backgroundImage =
    "linear-gradient(to bottom, #5BB75B, #429742)";
  orderCheckButton.style.color = "white";
  orderCheckButton.style.fontSize = "18px";
  orderCheckButton.style.cursor = "pointer";
  orderCheckButton.style.position = "fixed"; // Фиксированное позиционирование
  orderCheckButton.style.bottom = "25px"; // Отступ от нижнего края
  orderCheckButton.style.left = "25px"; // Отступ от левого края
  orderCheckButton.style.zIndex = "9998";

  // Убираем обводку
  orderCheckButton.style.border = "none"; // Нет обводки
  orderCheckButton.style.outline = "none"; // Нет фокусной обводки

  document.body.appendChild(orderCheckButton); // Добавляем кнопку на страницу

  // Настройка стилей фокуса (для лучшего UX)
  orderCheckButton.addEventListener("focus", () => {
    orderCheckButton.style.outline = "none"; // Убираем обводку при фокусе
  });

  orderCheckButton.addEventListener("mousedown", () => {
    orderCheckButton.style.border = "2px solid black"; // Устанавливаем черную рамку при нажатии
  });

  orderCheckButton.addEventListener("mouseup", () => {
    orderCheckButton.style.border = "none"; // Убираем рамку при отпускании
  });

  orderCheckButton.addEventListener("blur", () => {
    orderCheckButton.style.border = "none"; // Убираем рамку при уходе из фокуса
  });

  let ordersArray = [];

  // Обработчик клика для кнопки проверки заказа
  orderCheckButton.addEventListener("click", function () {
    checkButtonClicked = true; // Устанавливаем флаг нажатия кнопки
    let messages = [];

    if (choosenCalc === 0 || choosenCalc === 2){
    let prevArray = [];
    const currentArray = JSON.stringify(ordersArray);
    if (currentArray !== prevArray) {
      ordersArray = [];
      const children = document.getElementById("Orders").children;
      for (let i = 0; i < children.length; i++) {
        // Проверка наличия атрибута id у дочернего элемента
        if (children[i].id) {
          ordersArray.push(children[i].id);
        }
      }
    }

    // Проверка значения в input id="ProdName" и "Tirazh"
    const prodName = document.getElementById("ProdName")
      ? document.getElementById("ProdName").value
      : "";
    // const tirazh = document.getElementById('Tirazh') ? parseInt(document.getElementById('Tirazh').value) : 0;
    let tirazhAll = document.getElementById("ProductTirazh").value;
    if ((/робн/.test(prodName) || /браз/.test(prodName)) && tirazhAll == 1) {
      messages.push("Пробники оформляем в количестве двух штук!");
    }

    //   if (tirazh === 0) {
    //     messages.push('Укажите количество в тираже!');
    // }

    // Проверяем элементы в заказах Order0 до Order7
    let productPostpress = document.querySelector("#ProductPostpress");
    let productZKList = productPostpress
      .querySelector("#PostpressList")
      .getElementsByTagName("tr");
    let productZKtr = null;
    let productZKValue = 0;
    if (productZKList.length >= 1) {
      console.log(productZKList);
      for (let i = 0; i < productZKList.length; i++) {
        if (productZKList[i].innerText.includes("zk")) {
          productZKtr = i;
          productZKValue =
            productZKList[productZKtr].querySelector("#Quantity").value;
          console.log(productZKValue);
        }

        if (productZKValue == 1) {
          let sms2 = productZKList[i].children[0];
          console.log(sms2);

          sms2.style.color = "red";
          messages.push(
            `В операции "${sms2.innerText}", Количество не должно быть 1, или подойдите к Щёкину Александру`
          );
          productZKValue = 0;
        }
      }
    }

    for (let i = 0; i < ordersArray.length; i++) {
      const orderElem = document.getElementById(ordersArray[i]);
      console.log(orderElem);
      let rows = orderElem.getElementsByTagName("tr");
      let foundSkvoznaya = false;
      let foundOlod = false;
      let foundLicoMgi = false;
      let foundLicoMgi1 = false;
      let foundLicoMgi2 = false;
      let foundOborotMgi1 = false;
      let found1Plus1 = false;
      let foundPerf = false;
      let foundZk = false;
      let lamPlot = false;
      let kontRezka = false;
      let kashirSam = false;
      let lamSoft = false;
      let vyrTigel = false;
      let plotLam = false;
      let folgRegular = false;

      for (let row of rows) {
        let cells = row.getElementsByTagName("td");
        let name = cells[0] ? cells[0].innerText : "";

        foundSkvoznaya = foundSkvoznaya || name.includes("СКВОЗНАЯ");
        foundOlod = foundOlod || name.includes("олод");
        foundLicoMgi = foundLicoMgi || name.includes("ЛИЦО МГИ");
        foundLicoMgi1 = foundLicoMgi1 || name.includes("ЦО МГИ1 Ла");
        foundLicoMgi2 = foundLicoMgi2 || name.includes("ЦО МГИ1 Фо");
        foundOborotMgi1 = foundOborotMgi1 || name.includes("ОБОРОТ МГИ1");
        found1Plus1 = found1Plus1 || name.includes("(1+1)");
        foundPerf = foundPerf || name.includes("ерфорация");
        foundZk = foundZk || name.includes("zk");
        lamPlot = lamPlot || name.includes("минация");
        kashirSam = kashirSam || name.includes("ашировка");
        lamSoft = lamSoft || name.includes("софттач");
        vyrTigel = vyrTigel || name.includes("тигеле");
        plotLam = plotLam || name.includes("пакетная");
        kontRezka = kontRezka || name.includes("онтурная");
        folgRegular = folgRegular || name.includes("ольгирование");
      }

      // Проверка условий 3 мм сквозная
      let trimSize = null;

      trimSize = orderElem.querySelector("#TrimSize")
        ? parseInt(orderElem.querySelector("#TrimSize").value)
        : null;

      const tirazh = orderElem.querySelector("#Tirazh")
        ? parseInt(orderElem.querySelector("#Tirazh").value)
        : 0;

      if (tirazh === 0) {
        messages.push(`Укажите количество в тираже в ${getOrderName(i)}!`);
      }
      if (foundSkvoznaya) {
        if (trimSize !== 3) {
          messages.push(
            `На сквозную резку в ${getOrderName(i)} вылет ставим 3мм!`
          );
        }
      }

      // Проверка условий для карточек и ламинации
      const cifraLayoutType = document.getElementById("CifraLayoutType");
      if (foundOlod && cifraLayoutType && cifraLayoutType.value !== "2") {
        messages.push(
          `Карты нужно раскладывать каждый вид на отдельный лист в ${getOrderName(
            i
          )}`
        );
      }
      // Проверка софттач+мги
      if (foundLicoMgi && !lamSoft) {
        messages.push(
          `Вы забыли софттач ламинацию для МГИ в ${getOrderName(
            i
          )}! Если Вы действительно собираетесь делать без ламинации - обратитесь к Александру Щ.`
        );
      }
      // Проверка на ЛИЦО МГИ1+ЛИЦО МГИ1
      if (foundLicoMgi1 && foundLicoMgi2) {
        messages.push(
          `Нужно указать "ЛИЦО МГИ1 и ЛИЦО МГИ2 в ${getOrderName(i)}!`
        );
      }
      // Проверка на пустой оборот мги
      if (foundOborotMgi1 && !foundLicoMgi) {
        messages.push(
          `ОБОРОТ МГИ выбран неверно в ${getOrderName(
            i
          )}! Вместо него поставьте "ЛИЦО МГИ"!`
        );
      }
      // Проверка на термопереплет и двухсторонюю ламинацию
      if (found1Plus1) {
        const termopereplet = document.body.innerText.includes(
          "Термопереплет (кбс), толщина блока от 3 мм"
        );
        if (termopereplet) {
          messages.push(
            `Двухстороняя ламинация недоступна при термопереплете в ${getOrderName(
              i
            )}! Выберите одностороннюю!`
          );
        }
      }

      // Проверка связки тигель + отверстие
      if (vyrTigel) {
        const sverlOtverst = orderElem.innerText.includes("Отверстие");
        if (sverlOtverst) {
          messages.push(
            `Сверление отверстий после вырубки в ${getOrderName(
              i
            )} невозможно после вырубки на тигеле! Если сверление отверстий необходимо и возможно - обратитесь за помощью к Александру Щ.`
          );
        }
      }

      // Проверка связки пакетная ламинация + биговка
      if (plotLam) {
        const bigovka = orderElem.innerText.includes("Биговка");
        if (bigovka) {
          messages.push(
            `Биговку в ${getOrderName(
              i
            )} можно выполнить только по тонкой ламинации!`
          );
        }
      }

      // Проверка связки фольгирование + софттач
      if (folgRegular && !lamSoft) {
        messages.push(
          `В ${getOrderName(
            i
          )} делается фольгирование. Оно ложится только на софттач ламинацию!`
        );
      }

      // Проверка на операции ZK
      let postpressList = orderElem.querySelector("#PostpressList");
      let ZKList = postpressList.getElementsByTagName("tr");
      let ZKtr = null;
      let ZKValue = 0;
      console.log(ZKList);
      if (ZKList.length >= 2) {
        for (let i = 0; i < ZKList.length; i++) {
          if (ZKList[i].innerText.includes("zk")) {
            ZKtr = i;
            ZKValue = ZKList[ZKtr].querySelector("#Quantity").value;
            console.log(ZKValue);
            if (ZKValue == 1) {
              let sms = ZKList[0].children[0];
              sms.style.color = "red";
              messages.push(
                `В операции "${sms.innerText}", Количество не должно быть 1, или подойдите к Щёкину Александру`
              );
              console.log(ZKList[i]);
              ZKValue = 0;
            }
          }
        }
      }

      // Проверка связки ламинация+контурная резка
      if (lamPlot) {
        const konturRezka = orderElem.innerText.includes(
          "резка наклеек ПРОСТАЯ - ПОЛИГРАФИЯ"
        );
        if (konturRezka) {
          messages.push(
            `Контурная резка с ламинацией в ${getOrderName(
              i
            )}! Выберите операцию "Плоттерная (контурная) резка ламинированных наклеек ПРОСТАЯ - ПОЛИГРАФИЯ"!`
          );
        }
      }

      // Проверка на использование бумаги с надсечками
      if (foundLicoMgi1) {
        const paperType = orderElem.querySelector(
          "#PaperType_chosen .chosen-single span"
        );
        if (paperType && paperType.innerText.includes("с надсечками")) {
          messages.push(
            `На MGI используется бумага БЕЗ надсечек в ${getOrderName(i)}!`
          );
        }
      }
      // Проверка на надсечку с кашировкой
      if (kashirSam) {
        const paperType = orderElem.querySelector(
          "#PaperType_chosen .chosen-single span"
        );
        if (paperType && paperType.innerText.includes("с надсечками")) {
          messages.push(
            `Для кашировки используется бумага без надсечки в ${getOrderName(
              i
            )}!`
          );
        }
      }

      // Проверка на надсечку с контурной резкй
      if (kontRezka) {
        const paperType = orderElem.querySelector(
          "#PaperType_chosen .chosen-single span"
        );
        if (paperType && paperType.innerText.includes("с надсечками")) {
          messages.push(
            `Для контурной резки бумага без надсечки в ${getOrderName(i)}!`
          );
        }
      }
      // Проверка на контурную резку и материал
      if (kontRezka) {
        const paperType = orderElem.querySelector(
          "#PaperType_chosen .chosen-single span"
        );
        if (paperType && !paperType.innerText.includes("амокле")) {
          messages.push(
            `В ${getOrderName(
              i
            )} используется неподходящий материал для контурной резки! Укажите сквозную резку!`
          );
        }
      }

      //  Проверка условий 0 мм
      let useMargins = orderElem.querySelector("#UseMargins");
      const paperType1 = orderElem.querySelector(
        "#PaperType_chosen .chosen-single span"
      );
      if (
        paperType1 &&
        paperType1.innerText.includes("СНЕГУРОЧКА") &&
        trimSize !== 0
      ) {
        messages.push(
          `В ${getOrderName(
            i
          )} указана офстека в пачках! Не забудьте указать вылет ноль!`
        );
      } else if (
        paperType1 &&
        paperType1.innerText.includes("СНЕГУРОЧКА") &&
        !useMargins.checked
      ) {
        messages.push(
          `в ${getOrderName(
            i
          )} Необходимо поставить галочку напротив "Использовать поля (цифр. печ.)"!`
        );
      }
      // Проверка на бумагу
      if (paperType1.innerText.includes("-- Другая --")) {
        messages.push(`Не указана Бумага`);
      }
    }
    } else if (choosenCalc === 1){
        
        let Tirazh = document.getElementById("Tirazh");
        if (Tirazh.value == 0){
            messages.push("Укажите тираж");
            Tirazh.style.color = 'red';
        }
    }

    

    
    // Вывод сообщений
    if (messages.length === 0) {
      messages.push("Всё в порядке!");
      // const new2Style = document.createElement('style');
      // new2Style.type = "text/css"
      // let new2Styles = `#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg {display: inline-block}`;
      // new2Style.appendChild(document.createTextNode(new2Styles));
      // document.head.appendChild(new2Style);
      console.log(choosenCalcId);

      let calcButton = document.querySelector(choosenCalcId);
      console.log(calcButton);

      calcButton.click();
    }

    showMessages(messages);
  });
  let count = 0;
  let userName1 = document.querySelector(
    "body > ul > div > li:nth-child(1) > a.topmenu-a"
  ).textContent;
  console.log(userName1);

  let user1 = "Кандеев Рустам";
  let user2 = "Щёкин Александр";
  let user3 = "Галимов Адель";
  let user4 = "Козлов Артём";

  document.addEventListener("keydown", function (event) {
    if (event.getModifierState("CapsLock")) {
      count++;
      if (count === 2) {
        if (
          userName1 === user1 ||
          userName1 === user2 ||
          userName1 === user3 ||
          userName1 === user4
        ) {
          const new2Style = document.createElement("style");
          new2Style.type = "text/css";
          let new2Styles = `${choosenCalcId} {display: inline-block!important}`;
          new2Style.appendChild(document.createTextNode(new2Styles));
          document.head.appendChild(new2Style);
          count = 0;
        }
      }
    }
  });

  // const newStyle = document.createElement('style');
  // newStyle.type = "text/css"
  // let newStyles = `#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg {display: none}`;
  // newStyle.appendChild(document.createTextNode(newStyles));
  // document.head.appendChild(newStyle);

  // Функция для отображения сообщения о смене даты

  function showCenterMessage(message) {
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

    const messageContainer = document.createElement("div");
    messageContainer.id = "messageContainer";
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "50%";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translate(-50%, -50%)";
    messageContainer.style.backgroundColor = "white";
    messageContainer.style.padding = "15px";
    messageContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.borderRadius = "10px";

    let message1 = document.getElementById("messageContainer");
    if (!message1) {
      document.body.appendChild(blurOverlay);
      let messageHTML = "<b>" + message + "</b><br><br>";
      messageHTML +=
        '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

      messageContainer.innerHTML = messageHTML;
      document.body.appendChild(messageContainer);
      document
        .getElementById("closeMessage")
        .addEventListener("click", function () {
          document.body.removeChild(messageContainer);
          document.body.removeChild(blurOverlay);
        });
    }
  }

  // Функция для отображения сообщений
  function showMessages(messages) {
    const blurOverlay = document.createElement("div");
    blurOverlay.style.position = "fixed";
    blurOverlay.style.top = "0";
    blurOverlay.style.left = "0";
    blurOverlay.style.width = "100%";
    blurOverlay.style.height = "100%";
    blurOverlay.style.backgroundColor = "rgba(2, 2, 2, 0.5)";
    blurOverlay.style.backdropFilter = "blur(5px)";
    blurOverlay.style.zIndex = "9998";
    document.body.appendChild(blurOverlay);

    const messageContainer = document.createElement("div");
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "50%";
    messageContainer.style.left = "50%";
    messageContainer.style.transform = "translate(-50%, -50%)";
    messageContainer.style.backgroundColor = "white";
    messageContainer.style.padding = "15px 40px";
    messageContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.borderRadius = "10px";

    let messageHTML = "<b>" + messages.join("</b><br><b>") + "</b><br><br>";
    messageHTML +=
      '<button id="closeMessage" style="width: 80px; height: 30px; margin: 0 auto; display: block; background: linear-gradient(to bottom, #5BB75B, #429742); border: none; color: white; cursor: pointer; border-radius: 5px;">Ок</button>';

    messageContainer.innerHTML = messageHTML;
    document.body.appendChild(messageContainer);

    document
      .getElementById("closeMessage")
      .addEventListener("click", function () {
        document.body.removeChild(messageContainer);
        document.body.removeChild(blurOverlay);
        initialDateReadyValue = null;
      });
  }

  // Функция для проверки наличия текста на странице каждые 1 секунду
  function checkForText() {
    const searchText = "Лак для офсета";
    const searchText2 = "Тираж:";
    const searchText3 = "Размер";
    const pageContent = document.body.innerText;
    // Создаем цикл проверки по ордерам

    if (
      pageContent.includes(searchText) &&
      pageContent.includes(searchText2) &&
      pageContent.includes(searchText3) &&
      choosenCalcId
    ) {
      orderCheckButton.style.display = "block"; // Показываем кнопку
      const new3Style = document.createElement("style");
      new3Style.type = "text/css";
      let new3Styles = `${choosenCalcId} {display: none}`;
      new3Style.appendChild(document.createTextNode(new3Styles));
      document.head.appendChild(new3Style);
    } else {
      orderCheckButton.style.display = "none"; // Скрываем кнопку
    }
  }

  // Функция для получения названия заказа по индексу
  function getOrderName(index) {
    return `Ордер №${index + 1}`;
  }

  // Запускаем проверку при загрузке страницы
  window.addEventListener("load", checkForTextAndDate);
  setInterval(checkForText, 500); // Проверка наличия текста каждую секунду
  setInterval(checkForTextAndDate, 1000); // Проверка даты каждые 2 секунды

  // Сбрасываем значение даты каждые 10 секунд
  setInterval(() => {
    initialDateReadyValue = null;
    checkForText = null;
  }, 10000);
})();
