// ==UserScript==
// @name         Проверка заказа 9.3.3
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description
// @author       Ваше имя
// @match        https://cplink.simprint.pro/*
// @icon         https://cplink.simprint.pro/axiom/img/icon/icon32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      sheets.googleapis.com
// @connect      docs.google.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      raw.githubusercontent.com
// @connect      api.ipify.org
// ==/UserScript==


(function () {
  "use strict";
  let blurOverlay = document.createElement("div");
  blurOverlay.id = "Spinner";
  blurOverlay.style.position = "fixed";
  blurOverlay.style.top = "0";
  blurOverlay.style.left = "0";
  blurOverlay.style.width = "100%";
  blurOverlay.style.height = "100%";
  blurOverlay.style.backgroundColor = "rgba(2, 2, 2, 0.8)";
  blurOverlay.style.backdropFilter = "blur(5px)";
  blurOverlay.style.zIndex = "9998";
  let blur = false;


  const loaderContainer = document.createElement("div");
  loaderContainer.style.position = "fixed";
  loaderContainer.style.top = "50%";
  loaderContainer.style.color = "#fff";
  loaderContainer.style.textAlign = "center";
  loaderContainer.style.textTransform = "uppercase";
  loaderContainer.style.fontWeight = "700";
  loaderContainer.style.left = "50%";
  loaderContainer.style.transform = "translate(-50%, -50%)";
  loaderContainer.style.padding = "15px 40px";
  loaderContainer.style.zIndex = "10000";
  loaderContainer.style.width = "500px";
  loaderContainer.style.height = "500px";

  let messageHTML = `<img src="https://raw.githubusercontent.com/Xemul032/Axiom/refs/heads/main/logo_newyear1.png" width="250px" height="134px"/> <br/> <br/> <h3>Готовим калькулятор...</h3>`;

  loaderContainer.innerHTML = messageHTML;

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

  const choosenCalcParent1 = document.querySelector("#Doc > div.calc_head");
  const raschCifr = document.querySelector('#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(1)');
  const skidki = document.querySelector('#Doc > div.calc_head > div > table > tbody > tr:nth-child(1) > td:nth-child(2)');
      if (choosenCalcParent1){
        raschCifr.style.display = "none"
      }
     if(skidki){
        skidki.style.display = "none"
      }

    let resultCals = document.getElementById("result");

    if (resultCals) {
      let editBtn = resultCals.querySelectorAll(
        "div > table > tbody > tr:nth-child(1) > td.control > div > button:nth-child(2)"
      );
      for (let k = 0; k < editBtn.length; k++) {
        editBtn[k].addEventListener("click", function () {
          choosenCalc = null;
          document.body.appendChild(blurOverlay);
          document.body.appendChild(loaderContainer);

          blur = true;
          if (blur) {
            setTimeout(() => {
              document.body.removeChild(blurOverlay);
              document.body.removeChild(loaderContainer);
              blur = false;
            }, 1000);
          }


          // Получаем индекс элемента, на который нажали

          // Выводим индекс в консоль
          setTimeout(() => {
            choosenCalc = null;
            choosenCalcId = null;
            closeBtnId = null;
            const manyPages = document.getElementById("DoubleBind");
            const listImg = document.querySelector(
              'img[src="img/calc/sheet.png"]'
            );
            const blocknote = document.querySelector(
              'img[src="img/calc/blocknot_blok.png"]'
            );
            const sostav = document.getElementById("CifraLayoutType");
            const convert = document.querySelector(
              'img[src="img/calc/konvert.png"]'
            );
            if (listImg && !sostav) {


              closeBtnId =
                "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalcId =
                "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              choosenCalc = 2;
            } else if (sostav) {
              closeBtnId =
                "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalcId =
                "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              choosenCalc = 0;
            } else if (manyPages) {
              choosenCalcId =
                "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
              closeBtnId =
                "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
              choosenCalc = 1;
            } else if (convert) {
              closeBtnId = null;
              choosenCalcId = null;

            } else {
              closeBtnId = null;
              choosenCalcId = null;
            }
          }, 500);
        });
      }
    }


    if (choosenCalcParent) {
      for (let i = 0; i < 9; i++) {
        choosenCalcParent.children[i].addEventListener("click", function () {
          document.body.appendChild(blurOverlay);
          document.body.appendChild(loaderContainer);
          blur = true;

          if (blur) {
            setTimeout(() => {
              document.body.removeChild(blurOverlay);
              document.body.removeChild(loaderContainer);

              blur = false;
            }, 1500);
          }
          choosenCalc = null;
          choosenCalcId = null;
          closeBtnId = null;
          // Получаем индекс элемента, на который нажали
          choosenCalc = parseInt(i);
          const manyPages = document.getElementById("DoubleBind");
          const listImg = document.querySelector(
            'img[src="img/calc/sheet.png"]'
          );
          const blocknote = document.querySelector(
            'img[src="img/calc/blocknot_blok.png"]'
          );
          const sostav = document.getElementById("CifraLayoutType");
          // Выводим индекс в консоль

          if (choosenCalc === 0) {
            closeBtnId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(6) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            choosenCalc = 0;
          } else if (choosenCalc === 1) {
            choosenCalcId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            closeBtnId =
              "#Doc > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalc = 1;
          } else if (choosenCalc === 2) {


            closeBtnId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-default.btn-lg";
            choosenCalcId =
              "#Doc > div > table:nth-child(7) > tbody > tr > td:nth-child(1) > button.btn.btn-success.btn-lg";
            choosenCalc = 2;
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
    const searchText1 = "Номенклатура по умолчанию";
    const bodyText = document.body.innerText;

    if (bodyText.includes(searchText) && !bodyText.includes(searchText1)) {

      const orderLogs =  document.querySelector("#TopButtons > div.btn-group.btn-group-sm.dropdown.open > ul > li:nth-child(2) > a")
        if (orderLogs){ orderLogs.style.display='none'}
      const input = document.getElementById("DateReady");
      const input2 = document.querySelector(
        "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
      );

      let changeDate = false;
      let changeDate2 = false;

      const dateReadyInput = document.querySelector(
        "input#DateReady.center.datepicker.DateReady.hasDatepicker"
      );
      const DateReady1 = document.querySelector(
        "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
      );
      // Проверка каждую секунду
      if (dateReadyInput) {
        let previousValue = input.value;
        let currentValue = null;
        setInterval(() => {
          currentValue = input.value;
          if (currentValue !== previousValue) {
            changeDate = true;


            previousValue = currentValue;
          }
          if (changeDate == true) {
            showCenterMessage("Дата сдачи заказа изменилась!"); // Показываем сообщение в центре экрана
            if (DateReady1.classList.contains("changed") == true) {
              DateReady1.classList.remove("changed");
            }
            changeDate = false;
          } else {
            changeDate = false;
          }
        }, 1000);
      } else if (input2) {
        let currentValue = null;
        let previousValue2 = input2.innerText;
        setInterval(() => {
          currentValue = input2.innerText;
          if (currentValue !== previousValue2) {
            changeDate = true;


            previousValue2 = currentValue;
          }
          if (changeDate == true) {
            showCenterMessage("Дата сдачи заказа изменилась!"); // Показываем сообщение в центре экрана
            if (DateReady1.classList.contains("changed") == true) {
              DateReady1.classList.remove("changed");
            }
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

  // Обработчик клика для кнопки проверки заказа
  orderCheckButton.addEventListener("click", function () {
    checkButtonClicked = true; // Устанавливаем флаг нажатия кнопки
    let messages = [];

    if (choosenCalc === 0 || choosenCalc === 2) {
      let ordersArray = [];
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
      let tirazhAll = document.getElementById("ProductTirazh");
      if (
        (/робн/.test(prodName) || /браз/.test(prodName)) &&
        tirazhAll.value == 1
      ) {
        messages.push("Пробники оформляем в количестве двух штук!");

        tirazhAll.style.backgroundColor = "#FA8072";
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

        for (let i = 0; i < productZKList.length; i++) {
          if (productZKList[i].innerText.includes("zk")) {
            productZKtr = i;
            productZKValue =
              productZKList[productZKtr].querySelector("#Quantity").value;

          }

          if (productZKValue == 1) {
            let sms2 = productZKList[i].children[0];


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

        let postpressList2 = orderElem.querySelector("#PostpressList");
        let rows = postpressList2.getElementsByTagName("tr");
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
        const trimSizeColor = orderElem.querySelector("#TrimSize");
        trimSize = orderElem.querySelector("#TrimSize")
          ? parseInt(orderElem.querySelector("#TrimSize").value)
          : null;
        const tirazhColor = orderElem.querySelector("#Tirazh");
        const tirazh = orderElem.querySelector("#Tirazh")
          ? parseInt(orderElem.querySelector("#Tirazh").value)
          : 0;

        if (tirazh === 0) {
          messages.push(`Укажите количество в тираже в ${getOrderName(i)}!`);
          tirazhColor.style.backgroundColor = "#FA8072";
        }
        if (foundSkvoznaya) {
          if (trimSize !== 3) {
            messages.push(
              `На сквозную резку в ${getOrderName(i)} вылет ставим 3мм!`
            );
            trimSizeColor.style.backgroundColor = "#FA8072";
          }
        }

        // Проверка условий для карточек и ламинации
        const cifraLayoutType = document.getElementById("CifraLayoutType");
        if (foundOlod && cifraLayoutType && cifraLayoutType.value !== "2") {
          messages.push(
            `СМОТРИ СЮДА Карты нужно раскладывать каждый вид на отдельный лист в ${getOrderName(
              i
            )}`
          );
          cifraLayoutType.style.backgroundColor = "#FA8072";
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
        // Проверка на количество листов для скрепки
        let sumDensity = 0;
        let paperSum = 0;
        let paperType2 = document.querySelectorAll(
          "#PaperType_chosen .chosen-single span"
        );
        let productPostpress = document.querySelector("#ProductPostpress");
        let productZKList = productPostpress
          .querySelector("#PostpressList")
          .getElementsByTagName("tr");
        if (productZKList.length >= 0) {
          for (let j = 0; j < productZKList.length; j++) {
            if (productZKList[j].innerText.includes("Скрепка")) {

              if (paperType2.length === 1) {
                let paperName = paperType2[0].innerText;
                let density = Number(paperName.split(",").pop());
                sumDensity += density;
              } else {
                let paperName = paperType2[1].innerText;
                let density = Number(paperName.split(",").pop());
                sumDensity += density;
              }
            }
          }
        }
        //Проверка на люверс
        function isInteger(num) {
          return num % 1 === 0;
        }
        const postpressList1 = document.querySelector("#PostpressList");
        const ltrs = postpressList1.querySelectorAll("tr");


        ltrs.forEach((elem) => {
          if (elem.innerText.includes("Люверс") === true) {



            let lQuantity = elem.querySelector("#Quantity").value;


            if (!isInteger(lQuantity)) {

              messages.push(
                `В ${getOrderName(
                  i
                )} люверс указан неверно! Перенесите люверс в нижнюю постпечать!`
              );
            } else {

            }
          }
        });

        const trs = productPostpress.querySelectorAll("tr");
        for (let i = 0; i < trs.length; i++) {
          const tdText = trs[i].innerText.toLowerCase();
          if (tdText.includes("листоподбор")) {
            const tds = trs[i].querySelectorAll("td");
            paperSum = Number(tds[1].innerHTML);
            break; // выходим из цикла после нахождения первого совпадения
          }
        }
        if (sumDensity * paperSum > 2400) {
          messages.push(
            `Слишком толстый блок для скрепки! Обратитесь к технологу!`
          );
        }

        // Проверка на операции ZK
        let postpressList = orderElem.querySelector("#PostpressList");
        let ZKList = postpressList.getElementsByTagName("tr");
        let ZKtr = null;
        let ZKValue = 0;

        if (ZKList.length >= 2) {
          for (let i = 0; i < ZKList.length; i++) {
            if (ZKList[i].innerText.includes("zk")) {
              ZKtr = i;
              ZKValue = ZKList[ZKtr].querySelector("#Quantity").value;

              if (ZKValue == 1) {
                let sms = ZKList[0].children[0];
                sms.style.color = "red";
                messages.push(
                  `В операции "${sms.innerText}", Количество не должно быть 1, или подойдите к Щёкину Александру`
                );

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
    } else if (choosenCalc === 1) {
      let Tirazh = document.getElementById("Tirazh");
      if (Tirazh.value == 0) {
        messages.push("Укажите тираж");
        Tirazh.style.backgroundColor = "#FA8072";
        window.scrollTo({
          top: Tirazh.offsetTop,
          behavior: "smooth",
        });
      }

      let ordersArray = [];
      let prevArray = [];
      const currentArray = JSON.stringify(ordersArray);
      if (currentArray !== prevArray) {
        let oblozhkaCheck = document.getElementById("HasCover");
        if (oblozhkaCheck.checked) {
          ordersArray = ["Order0"];
        }
        const children = document.getElementById("Blocks").children;
        for (let i = 0; i < children.length; i++) {
          // Проверка наличия атрибута id у дочернего элемента
          if (children[i].id) {
            ordersArray.push(children[i].id);
          }
        }
      }


      for (let i = 0; i < ordersArray.length; i++) {
        const orderElem = document.getElementById(ordersArray[i]);
        let postpressList3 = orderElem.querySelector("#PostpressList");



        let rows = postpressList3.getElementsByTagName("tr");
        let backLamination = orderElem.querySelector("#pantoneback");


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
        let productPostpress = document.querySelector("#ProductPostpress");
        let productZKList = productPostpress
          .querySelector("#PostpressList")
          .getElementsByTagName("tr");
        let productZKtr = null;
        let productZKValue = 0;
        // Проверка термопереплета
        if (productZKList.length >= 0) {
          for (let j = 0; j < productZKList.length; j++) {
            if (
              productZKList[j].innerText.includes(
                "Термопереплет (кбс), толщина блока от 3 мм - pr @ "
              ) &&
              lamPlot &&
              found1Plus1
            ) {
              productZKtr = j;
              messages.push(
                `Двухстороняя ламинация недоступна при термопереплете в ${getOrderName(
                  i
                )}! Выберите одностороннюю`
              );
            }
          }
        }
        // Проверка софттач+мги
        if (foundLicoMgi && !lamSoft) {
          messages.push(
            `Вы забыли софттач ламинацию для МГИ в ${getOrderName(
              i
            )}! Если Вы действительно собираетесь делать без ламинации - обратитесь к Александру Щёкину.`
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
        // Проверка связки фольгирование + софттач
        if (folgRegular && !lamSoft) {
          messages.push(
            `В ${getOrderName(
              i
            )} делается фольгирование. Оно ложится только на софттач ламинацию!`
          );
        }
      }
      // Проверка на количество листов для скрепки
      let sumDensity = 0;
      let paperSum = 0;
      let paperType2 = document.querySelectorAll(
        "#PaperType_chosen .chosen-single span"
      );
      let productPostpress = document.querySelector("#ProductPostpress");
      let productZKList = productPostpress
        .querySelector("#PostpressList")
        .getElementsByTagName("tr");
      if (productZKList.length >= 0) {
        for (let j = 0; j < productZKList.length; j++) {
          if (productZKList[j].innerText.includes("Скрепка")) {

            if (paperType2.length === 1) {
              let paperName = paperType2[0].innerText;
              let density = Number(paperName.split(",").pop());
              sumDensity += density;
            } else {
              let paperName = paperType2[1].innerText;
              let density = Number(paperName.split(",").pop());
              sumDensity += density;
            }
          }
        }
      }

      //Проверка на люверс
      function isInteger(num) {
        return num % 1 === 0;
      }
      const postpressList1 = document.querySelector("#PostpressList");
      const ltrs = postpressList1.querySelectorAll("tr");


      ltrs.forEach((elem) => {
        if (elem.innerText.includes("Люверс") === true) {



          let lQuantity = elem.querySelector("#Quantity").value;


          if (!isInteger(lQuantity)) {
            messages.push(
              `в ${getOrderName(
                i
              )} не целое число - убирай епрст и перекидывай на общую постпечать !`
            );

          }
        }
      });

      const trs = productPostpress.querySelectorAll("tr");
      for (let i = 0; i < trs.length; i++) {
        const tdText = trs[i].innerText.toLowerCase();
        if (tdText.includes("листоподбор")) {
          const tds = trs[i].querySelectorAll("td");
          paperSum = Number(tds[1].innerHTML);
          break; // выходим из цикла после нахождения первого совпадения
        }
      }
      if (sumDensity * paperSum > 2400) {
        messages.push(
          `Слишком толстый блок для скрепки! Обратитесь к технологу!`
        );
      }
    }

    // Вывод сообщений
    if (messages.length === 0) {
      messages.push("Всё в порядке!");



      let calcButton = document.querySelector(choosenCalcId);


      calcButton.click();
      choosenCalcParent = null;
      choosenCalc = null;
    }

    showMessages(messages);
  });
  let count = 0;
  let userName1 = document.querySelector(
    "body > ul > div > li:nth-child(1) > a.topmenu-a"
  ).textContent;


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
    const manyPages = document.getElementById("DoubleBind");
    const listImg = document.querySelector('img[src="img/calc/sheet.png"]');
    const blocknote = document.querySelector(
      'img[src="img/calc/blocknot_blok.png"]'
    );
    const sostav = document.getElementById("CifraLayoutType");
    const perekid = document.querySelector(
      'img[src="img/calc/calendar_wall.png"]'
    );
    const blokn = document.querySelector(
      'img[src="img/calc/blocknot_top.png"]'
    );

    // Создаем цикл проверки по ордерам

    if (
      pageContent.includes(searchText) &&
      pageContent.includes(searchText2) &&
      pageContent.includes(searchText3)
    ) {
      if ((manyPages && !blocknote) || (listImg && !sostav) || sostav) {
        orderCheckButton.style.display = "block"; // Показываем кнопку
        const new3Style = document.createElement("style");
        new3Style.type = "text/css";
        let new3Styles = `${choosenCalcId} {display: none}`;
        new3Style.appendChild(document.createTextNode(new3Styles));
        document.head.appendChild(new3Style);
      } else {
        orderCheckButton.style.display = "none"; // Показываем кнопку
        const new3Style = document.createElement("style");
        new3Style.type = "text/css";
        let new3Styles = `${choosenCalcId} {display: inline-block}`;
        new3Style.appendChild(document.createTextNode(new3Styles));
        document.head.appendChild(new3Style);
      }
    } else {
      orderCheckButton.style.display = "none"; // Показываем кнопку
      const new3Style = document.createElement("style");
      new3Style.type = "text/css";
      let new3Styles = `${choosenCalcId} {display: inline-block}`;
      new3Style.appendChild(document.createTextNode(new3Styles));
      document.head.appendChild(new3Style);
    }
  }


  // Функция для получения названия заказа по индексу
  function getOrderName(index) {
    return `Ордер №${index + 1}`;
  }
  let counter = 0;

  // Создаем проверку по вопросу "Попасть в цвет"
  const colorCheckBtn = document.createElement("div");
  colorCheckBtn.style.position = "fixed";
  colorCheckBtn.style.top = "55%";
  colorCheckBtn.style.left = "55%";
  colorCheckBtn.style.width = "100vw";
  colorCheckBtn.style.zIndex = "5000";
  colorCheckBtn.style.height = "100vh";
  colorCheckBtn.style.backgroundColor = "transparent";
  colorCheckBtn.style.display = "none";
  document.body.appendChild(colorCheckBtn);
  let colorCheck = false;
  let count1 = 0;
  let count2 = 0;
  let phraseFound1 = false;
  setTimeout(() => {
    colorCheck = false;
  }, 100000);
  let colorBtnClick = false;
  function checkForcolorCheck() {
    const searchText1 = "Менеджер";
    const searchText2 = "Орбита";
    const searchText3 = "Контактное лицо";
    const searchText4 = "Плательщик";
    const searchText5 = "Комментарий для бухгалтерии";
    const searchText6 = "Запустить в работу";
    const searchText7 = "РЕКЛАМА";
    const bodyText = document.body.innerText;
    const header1 = document.querySelectorAll(
      "#Summary > table > tbody > tr > td:nth-child(1) > div.formblock > table:nth-child(1) > tbody > tr > td:nth-child(3) > nobr > h4 > span"
    );



    if (
      bodyText.includes(
        searchText1 &&
          searchText2 &&
          searchText3 &&
          searchText4 &&
          searchText5 &&
          searchText6
      )
    ) {
      colorCheck = true;
      let phraseFound = false;
      if (colorCheck === true && count1 < 1) {
        count1++;
        colorCheckBtn.style.display = "block";

        colorCheckBtn.addEventListener("click", function () {
          colorBtnClick = true;

          colorCheckBtn.style.display = "none";

          // Проверяем наличие фразы "Попасть в цвет"
          header1.forEach((e) => {
            if (
              e.textContent.includes("Попасть в цвет") ||
              e.textContent.includes("РЕКЛАМА")
            ) {
              phraseFound = true;
            }
          });
          if (colorBtnClick === true && phraseFound === false) {
            colorCheck = false;
            phraseFound = true;
            count = 0;
            colorBtnClick = false;

            showCenterMessage(
              'В данном заказе не установлена операция "ПОПАСТЬ В ЦВЕТ", в таком случае - никаких гарантий по цвету - нет!!!'
            );

            // Выполняем действие при наличии фразы
            // if (phraseFound == true) {
            //   // Здесь можно выполнить какое-то действие, например, вывести сообщение или изменить стиль элемента
            //
            // } else {

            //   phraseFound = false;

            //   colorCheck = true;
            // }
          } else {

            phraseFound = false;
          }
        });
      }
    } else {
      count1 = 0;
      colorCheck = false;
      colorBtnClick = false;
      colorCheckBtn.style.display = "none";
    }
  }
  // Проверка юр лиц для клиентов
  const checkingClientsBtn = document.createElement("div");
  checkingClientsBtn.style.position = "fixed";
  checkingClientsBtn.style.bottom = "0";
  checkingClientsBtn.style.width = "100vw";
  checkingClientsBtn.style.zIndex = "5000";
  checkingClientsBtn.style.height = "10%";
  checkingClientsBtn.style.backgroundColor = "transparent";
  checkingClientsBtn.style.display = "none";
  document.body.appendChild(checkingClientsBtn);
  let checkingClientsBtnClick = false;

  function checkingClients() {
    let userName2 = document.querySelector(
      "body > ul > div > li:nth-child(1) > a.topmenu-a"
    ).textContent;

    let user01 = "Кандеев Рустам";
    let user02 = "Щёкин Александр";
    let user03 = "Галимов Адель";
    let user04 = "Козлов Артём";

    // ИСПРАВЛЕНО: двойное использование if
    if (
      userName2 === user01 ||
      userName2 === user02 ||
      userName2 === user03 ||
      userName2 === user04
    ) {
      return;
    }
    const bodyText = document.body.innerText;
    const searchText1 = "Название";
    const searchText2 = "ИНН";
    const searchText3 = "Полное название";
    const searchText4 = "КПП";
    const searchText5 = "БИК";
    const searchText6 = "Банк";
    const clientName = document.querySelector(
      "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > input"
    );
    const clientInn = document.querySelector(
      "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2) > div > input"
    );

    if (
      bodyText.includes(searchText1) &&
      bodyText.includes(searchText2) &&
      bodyText.includes(searchText3) &&
      bodyText.includes(searchText4) &&
      bodyText.includes(searchText5) &&
      bodyText.includes(searchText6)
    ) {
      function checkInputValue() {
        let clientValue = clientName.value.toLowerCase();
        // Проверяем, содержит ли строка "физ" и "лиц"
        if (clientValue.includes("физ") && clientValue.includes("лиц")) {
          checkingClientsBtn.style.display = "block"; // Показать кнопку, если содержит
        } else {
          checkingClientsBtn.style.display = "none"; // Скрыть кнопку, если не содержит
        }
      }
      // Функция для проверки начала строки при нажатии на кнопку
      function handleClick() {
        const clientValue = clientName.value.trim();

        // Проверяем, начинается ли строка с "ОПЛАТА ФИЗЛИЦА - "
        if (clientValue.startsWith("ОПЛАТА ФИЗЛИЦА - ")) {
          checkingClientsBtn.style.display = "none";

        } else {
          navigator.clipboard.writeText("ОПЛАТА ФИЗЛИЦА - ");

          showCenterMessage(
            'в поле Название необходимо прописать большими буквами без кавычек "ОПЛАТА ФИЗЛИЦА - ", данный текст уже скопирован - можете просто вставить'
          );
        }
      }
      clientName.addEventListener("input", checkInputValue);

      // Обработчик нажатия на кнопку
      checkingClientsBtn.addEventListener("click", handleClick);
      const buttonDone = document.querySelector(
        "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > div > button.btn.btn-success"
      );

      // Флаг для отслеживания необходимости проверки видимости #danger
      let dangerVisibilityChecked = false;

      // Функция для проверки ввода на наличие символов, отличных от цифр
      function checkInputForNumbersOnly() {
        const clientInnValue = clientInn.value;

        // Проверяем, содержит ли строка что-то кроме цифр
        const nonDigits = /\D/; // Регулярное выражение, которое ищет все символы, не являющиеся цифрами

        if (nonDigits.test(clientInnValue)) {
          clientInn.value = clientInnValue;
          showCenterMessage("Поле ИНН не поддерживает символы кроме цифр!");
          buttonDone.style.display = "none";
        } else {
          buttonDone.style.display = "block";
        }
        dangerVisibilityChecked = false;
      }

      // Функция для управления видимостью кнопки в зависимости от видимости элемента #danger
      function toggleButtonVisibility() {
        let userName3 = document.querySelector(
          "body > ul > div > li:nth-child(1) > a.topmenu-a"
        ).textContent;

        let user001 = "Кандеев Рустам";
        let user002 = "Щёкин Александр";
        let user003 = "Галимов Адель";
        let user004 = "Козлов Артём";

        // ИСПРАВЛЕНО: двойное использование if
        if (
          userName3 === user001 ||
          userName3 === user002 ||
          userName3 === user003 ||
          userName3 === user004
        ) {
          return;
        }

        const dangerElement = document.querySelector(
          "#vmClientForm > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(3) > td > div"
        ); // получаем элемент #danger

        // Проверяем, виден ли элемент #danger
        if (!dangerVisibilityChecked) {
          if (dangerElement && dangerElement.offsetParent !== null) {
            // showCenterMessage(
            //   "Вы пытаетесь создать ДУБЛЬ - так нельзя! Если прям нужно создать дубль - обращайтесь к Коммерческому директору"
            // );
            buttonDone.style.display = "none"; // скрываем кнопку, если элемент #danger видим
          } else {
            buttonDone.style.display = "block"; // показываем кнопку, если элемент #danger не видим
          }
        }

        // Устанавливаем флаг, чтобы не повторять проверку
        dangerVisibilityChecked = true;
      }

      // Отслеживаем изменения в input.form

      clientInn.addEventListener("input", checkInputForNumbersOnly);

      // Отслеживаем изменения видимости #danger

      new MutationObserver(toggleButtonVisibility).observe(
        document.querySelector("body"),
        {
          childList: true,
          subtree: true,
        }
      );
    } else {
      checkingClientsBtn.style.display = "none";
    }
  }
  let calcCheck = 0;

  // Функция для подсчета нехватки бумаги

   setInterval(() => {
     const statusIconCalc = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-calc.png"]'
     );
     const spinner = document.getElementsByClassName("spinner");
     const statusIcon = document.querySelector(
       "#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon"
     );
     const statusIconCalcWFiles = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-calc-files.png"]'
     );
     const statusIconNoFiles = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-nofiles.png"]'
     );

   const statusNotToCheck1 = document.querySelector(
     '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-files.png"]'
    );
     const statusNotToCheck2 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-prepress-check.png"]'
     );
     const statusNotToCheck3 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-prepress-layout.png"]'
     );
     const statusNotToCheck4 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-print.png"]'
     );
     const statusNotToCheck5 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-postpress-ready.png"]'
     );
     const statusNotToCheck6 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-pack.png"]'
     );
     const statusNotToCheck7 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-pack-onmove.png"]'
     );
     const statusNotToCheck8 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-pack-tomove.png"]'
     );
     const statusNotToCheck9 = document.querySelector(
       '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-close.png"]'
     );

     const btnsgroup1 = document.querySelector(
       "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(1)"
     );
     const btnsgroup2 = document.querySelector(
       "#Summary > table > tbody > tr > td:nth-child(1) > div.right > div > button:nth-child(2)"
     );
     const btnToWorkWFiles = document.querySelector(
       "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button"
     );
     const newFilesGet = document.querySelector(
       "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button"
     );
     const fullWindow = document.querySelector("#Doc");
     let anotherStatus = 0;


     setInterval(() => {
       if (
         statusIconCalc !== null ||
         statusIconCalcWFiles !== null ||
         statusIconNoFiles !== null
       ) {
         if (fullWindow.classList.contains("LoadingContent") === true) {
           calcCheck = 0;
         }
       }
       if (
         document.body.innerText.includes("Сохранить расчет") === true &&
         spinner !== null
       ) {
         calcCheck = 0;
       }
     }, 100);
     let paperList = document.querySelectorAll('table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr')

     if (
       statusIconCalc !== null &&
       calcCheck === 0 &&
       statusNotToCheck1 === null &&
       statusNotToCheck2 === null &&
       statusNotToCheck3 === null &&
       statusNotToCheck4 === null &&
       statusNotToCheck5 === null &&
       statusNotToCheck6 === null &&
       statusNotToCheck7 === null &&
       statusNotToCheck8 === null &&
       statusNotToCheck9 === null
     ) {
       calcCheck = 1;
       let orders = document.querySelectorAll(
         "#Summary > table > tbody > tr > td:nth-child(1) > .formblock"
       );

       orders.forEach((el, index) => {
         let needCount = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(1) > td.right.nobreak"
         );
         let stockRemain = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(3) > td.right.nobreak"
         );

         let needToOther;
         if (paperList.length >=6){
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak"
          );
         } else{
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
          );
         }

         if (paperList.length >=6){
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak"

          );
         }

         let needCountValue = 0;
         let stockRemainValue = 0;
         let needToOtherValue = 0;

         if (needToOther) {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           needToOtherValue = Number(
             needToOther.innerText.replace(/\s|\&nbsp;/g, "")
           );


           if (
             stockRemainValue > 0 &&
             needCountValue + needToOtherValue + 50 <= stockRemainValue
           ) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + needToOtherValue + 50 > stockRemainValue
           ) {

             if (btnsgroup2 !== null) {
               btnsgroup2.style.display = "none";
             }
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
           }
         } else {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           if (stockRemainValue > 0 && needCountValue + 50 <= stockRemainValue) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + 50 > stockRemainValue
           ) {

             if (btnsgroup2 !== null) {
               btnsgroup2.style.display = "none";
             }
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
           }
         }
       });
     } else if (
       statusIconCalcWFiles !== null &&
       calcCheck === 0 &&
       statusNotToCheck1 === null &&
       statusNotToCheck2 === null &&
       statusNotToCheck3 === null &&
       statusNotToCheck4 === null &&
       statusNotToCheck5 === null &&
       statusNotToCheck6 === null &&
       statusNotToCheck7 === null &&
       statusNotToCheck8 === null &&
       statusNotToCheck9 === null
     ) {
       calcCheck = 1;
       let orders = document.querySelectorAll(
         "#Summary > table > tbody > tr > td:nth-child(1) > .formblock"
       );

       orders.forEach((el, index) => {
         let needCount = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(1) > td.right.nobreak"
         );
         let stockRemain = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(3) > td.right.nobreak"
         );
         let needToOther;
         if (paperList.length >=6){
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak"
          );
         } else{
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
          );
         }
         if (paperList.length >=6){
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak"

          );
         }
         let needCountValue = 0;
         let stockRemainValue = 0;
         let needToOtherValue = 0;

         if (needToOther) {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           needToOtherValue = Number(
             needToOther.innerText.replace(/\s|\&nbsp;/g, "")
           );
           if (
             stockRemainValue > 0 &&
             needCountValue + needToOtherValue + 50 <= stockRemainValue
           ) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + needToOtherValue + 50 > stockRemainValue
           ) {

             btnToWorkWFiles.style.display = "none";
             if (btnsgroup1 !== null) {
               btnsgroup1.style.display = "none";
             }
             if (btnsgroup2 !== null) {
               btnsgroup2.style.display = "none";
             }
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
             needCountValue = Number(
               needCount.innerText.replace(/\s|\&nbsp;/g, "")
             );
             stockRemainValue = Number(
               stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
             );
           }
         } else {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           if (stockRemainValue > 0 && needCountValue + 50 <= stockRemainValue) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + 50 > stockRemainValue
           ) {

             btnToWorkWFiles.style.display = "none";
             if (btnsgroup1 !== null) {
               btnsgroup1.style.display = "none";
             }
             if (btnsgroup2 !== null) {
               btnsgroup2.style.display = "none";
             }
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
           }
         }
       });
     } else if (
       statusIconNoFiles !== 0 &&
       calcCheck === 0 &&
       statusNotToCheck1 === null &&
       statusNotToCheck2 === null &&
       statusNotToCheck3 === null &&
       statusNotToCheck4 === null &&
       statusNotToCheck5 === null &&
       statusNotToCheck6 === null &&
       statusNotToCheck7 === null &&
       statusNotToCheck8 === null &&
       statusNotToCheck9 === null
     ) {
       calcCheck = 1;
       let orders = document.querySelectorAll(
         "#Summary > table > tbody > tr > td:nth-child(1) > .formblock"
       );

       orders.forEach((el, index) => {
         let needCount = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(1) > td.right.nobreak"
         );
         let stockRemain = el.querySelector(
           "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(3) > td.right.nobreak"
         );
         let needToOther;
         if (paperList.length >=6){
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(5) > td.right.nobreak"
          );
         } else{
          needToOther = el.querySelector(
            "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
          );
         }
         let needCountValue = 0;
         let stockRemainValue = 0;
         let needToOtherValue = 0;

         if (needToOther) {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           needToOtherValue = Number(
             needToOther.innerText.replace(/\s|\&nbsp;/g, "")
           );
           if (
             stockRemainValue > 0 &&
             needCountValue + needToOtherValue + 50 <= stockRemainValue
           ) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + needToOtherValue + 50 > stockRemainValue
           ) {

             newFilesGet.style.display = "none";
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
           }
         } else {
           needCountValue = Number(
             needCount.innerText.replace(/\s|\&nbsp;/g, "")
           );
           stockRemainValue = Number(
             stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
           );
           if (stockRemainValue > 0 && needCountValue + 50 <= stockRemainValue) {

           } else if (
             stockRemainValue <= 0 ||
             needCountValue + 50 > stockRemainValue
           ) {

             needCountValue = Number(
               needCount.innerText.replace(/\s|\&nbsp;/g, "")
             );
             stockRemainValue = Number(
               stockRemain.innerText.replace(/\s|\&nbsp;/g, "")
             );
             newFilesGet.style.display = "none";
             showCenterMessage(
               `Не хватает бумаги для ордера №${
                 index + 1
               }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
             ); // Показываем сообщение в центре экрана
           }
         }
       });
     } else if (
       statusIconCalc === null &&
       statusIconCalcWFiles === null &&
       statusIconNoFiles === null
     ) {
       calcCheck = 0;
     }
   }, 2000);

  setInterval(() => {
    if (!document.body.innerText.includes("ОТГРУЗКА НА СЛЕДУЮЩИЙ ДЕНЬ!")) {
      counter = 0;
    }
  }, 1000);

  function createPriceBlock() {
    // Проверяем наличие элемента #itog на странице
    if (!document.getElementById('itog')) {
        return;
    }

    // Определяем путь к целевому элементу
    const targetElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(6) > td');

    // Проверяем, существует ли уже блок с ценой
    if (targetElement.querySelector('.urgent-order-price')) {
        return;
    }

    // Создаем новый блок
    const priceBlock = document.createElement('div');
    priceBlock.className = 'urgent-order-price';

    // Добавляем стили для блока
    priceBlock.style.backgroundColor = '#007BFF'; // Синий фон
    priceBlock.style.padding = '15px';
    priceBlock.style.borderRadius = '8px';
    priceBlock.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    priceBlock.style.color = 'white';
    priceBlock.style.textAlign = 'center';

    // Создаем заголовок
    const header = document.createElement('h4');
    header.textContent = 'Цена срочного заказа';
    header.style.color = '#FFFFFF'; // Белый текст
    header.style.margin = '0 0 10px 0';
    header.style.fontSize = '18px';
    priceBlock.appendChild(header);

    // Создаем элемент для отображения суммы
    const sumElement = document.createElement('div');
    sumElement.style.color = '#FFD700'; // Желтый текст
    sumElement.style.fontSize = '24px'; // Большой шрифт
    sumElement.style.fontWeight = 'bold';
    priceBlock.appendChild(sumElement);

    // Создаем кнопку "Скопировать корректировку"
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Скопировать цену';
    copyButton.style.marginTop = '10px';
    copyButton.style.padding = '8px 16px';
    copyButton.style.backgroundColor = '#28a745'; // Зеленый цвет кнопки
    copyButton.style.color = '#FFFFFF'; // Белый текст
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '14px';

    // Переменная для хранения оригинального числа (без пробелов)
    let originalSumValue = '';

    // Функция для форматирования числа с пробелами
    function formatNumberWithSpaces(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // Функция для расчета и обновления суммы
    function updateSum() {
        const itogText = document.getElementById('itog').textContent;
        const itogValue = parseFloat(itogText.replace(/[^0-9.,]/g, '').replace(',', '.'));
        const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');
        let inputValue = parseFloat(inputElement.value);

        if (inputValue < 0) {
            inputValue = Math.abs(inputValue);
            originalSumValue = ((itogValue + inputValue) * 1.4).toFixed(2);
        } else {
            originalSumValue = ((itogValue - inputValue) * 1.4).toFixed(2);
        }

        // Отображаем отформатированное число с пробелами
        sumElement.textContent = formatNumberWithSpaces(originalSumValue);
    }

    // Добавляем обработчик события для кнопки
    copyButton.addEventListener('click', function () {
        // Копируем оригинальное число (без пробелов) в буфер обмена
        navigator.clipboard.writeText(originalSumValue)
            .then(() => {
                // Меняем текст кнопки на "Скопировано!"
                copyButton.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyButton.textContent = 'Скопировать цену';
                }, 2000); // Возвращаем исходный текст через 2 секунды
            })
            .catch((err) => {

            });
    });

    // Добавляем кнопку в блок
    priceBlock.appendChild(copyButton);

    // Инициализация суммы
    updateSum();

    // Добавляем блок в целевой элемент
    targetElement.appendChild(priceBlock);

    // Настройка MutationObserver для отслеживания изменений
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                updateSum();
            }
        });
    });

    // Наблюдаем за изменениями в #itog и в input
    observer.observe(document.getElementById('itog'), {
        characterData: true,
        childList: true,
        subtree: true
    });

    const inputElement = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(5) > td.right > input');
    observer.observe(inputElement, {
        attributes: true,
        attributeFilter: ['value']
    });
}




  // Функция для преобразования строки в дату и изменения её на следующий день
  let datecheck = 0;
  let datecheck1 = 0;
  function addOneDay() {
    const dateInCalc = document.querySelector(
      "#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(11) > td.right > b"
    );
    const dateInProduct = document.querySelector(
      "#UtCalcResult > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)"
    );
    const calcDateLine = document.querySelector('#result > div > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(11)')
    if(calcDateLine){
      calcDateLine.style.display = "none"
    }
    const salePrice = document.querySelector('#CalcUt > table > tbody > tr:nth-child(1) > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > a');
    if (salePrice){
      salePrice.style.display = "none"
    }
    if (
      (document.getElementById("result") !== null && datecheck === 0) ||
      (document.getElementById("UtCalcResult") !== null && datecheck === 0)
    ) {
      function updateDate(dateString) {
        const months = {
          января: 0,
          февраля: 1,
          марта: 2,
          апреля: 3,
          мая: 4,
          июня: 5,
          июля: 6,
          августа: 7,
          сентября: 8,
          октября: 9,
          ноября: 10,
          декабря: 11,
        };

        // Разделяем строку на части
        const [day, monthName] = dateString.split(" ");
        const dayNumber = parseInt(day, 10);
        const monthNumber = months[monthName];

        // Проверяем, что месяц корректный
        if (monthNumber === undefined) {
          throw new Error("Некорректный формат месяца: " + monthName);
        }

        // Создаем объект Date и добавляем один день
        const currentDate = new Date(2025, monthNumber, dayNumber); // Год указан для примера
        currentDate.setDate(currentDate.getDate() + 1);

        // Формируем новую строку с датой
        const newDay = currentDate.getDate();
        const newMonthName = Object.keys(months).find(
          (key) => months[key] === currentDate.getMonth()
        );

        return `${newDay} ${newMonthName}`;
      }
      if (datecheck === 0 && document.getElementById("result") !== null) {
        // const oldDate = dateInCalc.innerHTML.trim();
        // const newDate = updateDate(oldDate);
        // dateInCalc.innerHTML = newDate; // Обновляем текст в блоке
        datecheck = 1;
      } else if (
        datecheck === 0 &&
        document.getElementById("UtCalcResult") !== null
      ) {
        const oldDate = dateInProduct.innerHTML.trim();
        const newDate = updateDate(oldDate);
        dateInProduct.innerHTML = newDate; // Обновляем текст в блоке
        dateInProduct.style.backgroundColor = "yellow"
        dateInProduct.style.padding = "10px"
        datecheck = 1;
      }
      // dateInCalc.innerHTML = "Расчитается после"

      // Создание элемента <div class="prepress">




    } else if (
      document.getElementById("result") == null &&
      document.getElementById("UtCalcResult") == null
    ) {
      datecheck = 0;
    }
    const links = document.body.querySelectorAll("a");
    links.forEach((elem) => {
      elem.addEventListener("click", () => {
        setTimeout(() => {
          datecheck = 0;
        }, 200);
      });
    });

    // Выбираем все дочерние элементы первого уровня у div




    const dateInOrder = document.querySelector(
      "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
    );
    if (dateInOrder) {
      function updateDateInElement(selector) {
        // Находим элемент

        if (!dateInOrder) {

          return;
        }

        // Получаем текст элемента
        const text = dateInOrder.textContent;

        // Регулярное выражение для извлечения даты
        const dateMatch = text.match(
          /(\d{1,2}) (января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря) (\d{4}) (\d{2}):(\d{2})/
        );
        if (!dateMatch) {
          return;
        }

        // Словарь для преобразования названий месяцев в номера
        const months = {
          января: 0,
          февраля: 1,
          марта: 2,
          апреля: 3,
          мая: 4,
          июня: 5,
          июля: 6,
          августа: 7,
          сентября: 8,
          октября: 9,
          ноября: 10,
          декабря: 11,
        };

        // Извлекаем части даты
        const day = parseInt(dateMatch[1], 10);
        const month = months[dateMatch[2]];
        const year = parseInt(dateMatch[3], 10);

        // Создаем объект даты
        const date = new Date(year, month, day);

        // Добавляем 1 день
        date.setDate(date.getDate() + 1);

        // Устанавливаем время на 21:30
        date.setHours(10, 0, 0, 0);

        // Форматируем дату для отображения
        const updatedDate = date.toLocaleString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Обновляем текст в элементе
        dateInOrder.textContent = `Расчетная дата сдачи заказа: ${updatedDate}`;
        dateInOrder.style.background = "yellow"
        dateInOrder.style.padding = "10px"
      }

      // Обновляем дату в элементе с классом .textDate
      updateDateInElement(
        "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
      );
    }

    const dateForWorkOrder = document.querySelector(
      "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
    );

    if (dateForWorkOrder) {
      // Сопоставление дней недели
      const daysOfWeek = [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
      ];

      // Функция для добавления одного дня
      function addOneDayToDate() {
        if (!dateForWorkOrder) {
          return;
        }

        // Извлекаем текст из элемента
        const dateText = dateForWorkOrder.textContent.trim();

        // Разделяем текст для извлечения даты
        const [, datePart] = dateText.split(",").map((part) => part.trim());

        // Преобразуем дату в объект Date
        const [day, month, year] = datePart.split("/").map(Number);
        const currentDate = new Date(year, month - 1, day);

        // Добавляем 1 день
        currentDate.setDate(currentDate.getDate() + 1);

        // Форматируем новую дату
        const newDayOfWeek = daysOfWeek[currentDate.getDay()];
        const newDatePart = `${currentDate
          .getDate()
          .toString()
          .padStart(2, "0")}/${(currentDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${currentDate.getFullYear()}`;
        const newDateText = `${newDayOfWeek}, ${newDatePart}`;

        // Обновляем содержимое элемента

        dateForWorkOrder.textContent = newDateText;
        dateForWorkOrder.style.backgroundColor = "yellow"
        dateForWorkOrder.style.padding = "10px"
      }

      // Запускаем функцию
      if (datecheck1 === 0) {
        addOneDayToDate();
        datecheck1 = 1;
      }
    } else if (dateForWorkOrder == null) {
      datecheck1 = 0;
    }
  }

  let dateListUpdate1 = 0;

  function addDateOnOrderList() {
    const dateColumn = document.querySelector(
      "#ManagerList > div > div.ax-table-body > table > thead > tr:nth-child(1) > th:nth-child(11) > span"
    );
    setInterval(() => {
      const orderListLoading = document.querySelectorAll(
        "#ManagerList > div > div.ax-table-body > table > tbody > tr > td"
      );
      if (orderListLoading && orderListLoading.length <= 1) {
        dateListUpdate1 = 0;
      }
    }, 0);
    if (dateColumn !== null && dateListUpdate1 === 0) {
      function updateDates(selector) {
        dateListUpdate1 = 1;
        const dateBlocks = document.querySelectorAll(selector);

        dateBlocks.forEach((dateBlock) => {
          const dateText = dateBlock.textContent.trim();

          // Регулярное выражение для определения формата даты
          const fullDateRegex = /^\d{4}, \d{2} [а-яё]+ \d{2}:\d{2}$/i;
          const shortDateRegex = /^\d{2} [а-яё]+ \d{2}:\d{2}$/i;

          let newDate;

          if (fullDateRegex.test(dateText)) {
            // Формат: "2024, 30 дек 16:57"
            newDate = parseFullDate(dateText);
          } else if (shortDateRegex.test(dateText)) {
            // Формат: "16 янв 09:35"
            newDate = parseShortDate(dateText);
          } else {

            return;
          }

          // Увеличиваем дату на 1 день и устанавливаем фиксированное время 10:00
          newDate.setDate(newDate.getDate() + 1);
          newDate.setHours(10, 0, 0, 0);

          // Обновляем текст в нужном формате
          const updatedText = formatDate(newDate, dateText.includes(","));
          dateBlock.textContent = updatedText;
          dateBlock.style.backgroundColor = "yellow"
        });
      }

      function parseFullDate(dateText) {
        // "2024, 30 дек 16:57" -> Date
        const [year, rest] = dateText.split(", ");
        const [day, month, time] = rest.split(" ");
        const [hours, minutes] = time.split(":");
        const monthIndex = getMonthIndex(month);

        return new Date(year, monthIndex, day, hours, minutes);
      }

      function parseShortDate(dateText) {
        // "16 янв 09:35" -> Date
        const [day, month, time] = dateText.split(" ");
        const [hours, minutes] = time.split(":");
        const currentYear = new Date().getFullYear();
        const monthIndex = getMonthIndex(month);

        return new Date(currentYear, monthIndex, day, hours, minutes);
      }

      function formatDate(date, includeYear) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = getMonthName(date.getMonth());
        const time = `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes()
        ).padStart(2, "0")}`;

        if (includeYear) {
          return `${date.getFullYear()}, ${day} ${month} ${time}`;
        } else {
          return `${day} ${month} ${time}`;
        }
      }

      function getMonthIndex(monthName) {
        const months = [
          "янв",
          "фев",
          "мар",
          "апр",
          "май",
          "июн",
          "июл",
          "авг",
          "сен",
          "окт",
          "ноя",
          "дек",
        ];
        return months.indexOf(monthName.toLowerCase());
      }

      function getMonthName(monthIndex) {
        const months = [
          "янв",
          "фев",
          "мар",
          "апр",
          "май",
          "июн",
          "июл",
          "авг",
          "сен",
          "окт",
          "ноя",
          "дек",
        ];
        return months[monthIndex];
      }

      // Пример использования:
      updateDates(
        "#ManagerList > div > div.ax-table-body > table > tbody > tr > td.nobreak > span"
      );
    } else if (dateColumn == null) {
      dateListUpdate1 = 0;
    }
  }
  let prepressCheck = 0;
  function hideDropzone() {
    const searchText = "Номенклатура";
    const searchText1 = "Номенклатура по умолчанию";
    const bodyText = document.body.innerText;
    const statusNotToCheck1 = document.querySelector(
      '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-files.png"]'
    );
    const statusNotToCheck2 = document.querySelector(
      '#Top > form > div > div > div > span:nth-child(2) > span.StatusIcon > img[src="img/status/status-prepress-check.png"]'
    );
    const ordersHistory = document.querySelectorAll(".formblock");
    const fullWindow = document.querySelector("#Doc");
    const stop = document.querySelector("#Top > form > div > div > div > span:nth-child(2) > span.StopIcon > img")
    if (fullWindow.classList.contains("LoadingContent") === true) {
      prepressCheck = 0;
    }
    ordersHistory.forEach((elem) => {
      if (
        bodyText.includes(searchText || bodyText.includes(searchText1)) &&
        (statusNotToCheck1 !== null || statusNotToCheck2 !== null) && stop === null
      ) {
        const selector =
          "#History > div > table.table.table-hover.table-condensed.table-bordered > tbody > tr:nth-child(3) > td:nth-child(3)";

        const selector1 =
          "#History > div > table.table.table-hover.table-condensed.table-bordered > tbody > tr:nth-child(2) > td:nth-child(3)";

        // Селекторы элементов для скрытия
        const buttonSelector =
          "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1)";
        const dropzoneSelector = "#Dropzone";
        const newFiles =
          "#Summary > table > tbody > tr > td:nth-child(2) > table > tbody > tr.TimeFilesInfo > td.right > button";

        const element = elem.querySelector(selector);
        const element1 = elem.querySelector(selector1);
        const buttonElement = document.querySelector(buttonSelector);
        const dropzoneElement = document.querySelector(dropzoneSelector);
        const newFilesElem = document.querySelector(newFiles);

        if (
          (element && element.textContent.trim() && prepressCheck === 0 ) ||
          (element1 && element1.textContent.trim() && prepressCheck === 0)
        ) {


          // Создание элемента <div class="prepress">
          const prepressElement = document.createElement("div");
          prepressElement.style.backgroundColor = "orange";
          prepressElement.style.fontSize = "25px";
          prepressElement.style.fontWeight = "700";
          prepressElement.style.color = "#ffffff";
          prepressElement.style.textAlign = "center";
          prepressElement.style.textTransform = "uppercase";
          prepressElement.textContent =
            "Идет препресс - изменение файлов невозможно!";

          // Замена элемента form.dropzone на новый элемент
          dropzoneElement.parentNode.replaceChild(
            prepressElement,
            dropzoneElement
          );
          prepressCheck = 1;

          // Скрываем кнопку и поле dropzone
          buttonElement.style.display = "none";
          // dropzoneElement.style.display = "none";
          newFilesElem.style.display = "none";
        }
      } else {
        prepressCheck = 0;
      }
    });
  }

  // Запускаем проверку при загрузке страницы
  window.addEventListener("load", checkForTextAndDate);
  setInterval(checkForText, 500); // Проверка наличия текста каждую секунду
  setInterval(checkForTextAndDate, 5000); // Проверка даты каждые 2 секунды
  setInterval(checkForcolorCheck, 100);
  setInterval(checkingClients, 100);
  setInterval(addOneDay, 0);
  setInterval(addDateOnOrderList, 0);
  setInterval(hideDropzone, 200);
  setInterval(createPriceBlock, 200);
  setInterval(() => {
    count = 0;

    checkForcolorCheck();
  }, 1000);
  setInterval(() => {
    count1 = 0;
  }, 100000);
  // Сбрасываем значение даты каждые 10 секунд
  setInterval(() => {
    initialDateReadyValue = null;
    checkForText = null;
    colorBtnClick = false;
  }, 1000);


  (function() {
    // Функция для проверки наличия слова на странице
    function checkForWord() {
        const word = "Производительность сотрудников";
        const wordExists = document.body.innerText.includes(word);

        if (wordExists && !document.getElementById('sumButton')) {
            createButtons();
        } else if (!wordExists && document.getElementById('sumButton')) {
            removeButtons();
        }
    }

    // Функция для создания кнопок
    function createButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.right = '20px';
        buttonContainer.style.bottom = '20px';
        buttonContainer.style.zIndex = '1000';

        const sumButton = document.createElement('button');
        sumButton.id = 'sumButton';
        sumButton.innerText = 'SUM';
        sumButton.style.backgroundColor = '#007BFF'; // Синий цвет
        sumButton.style.color = '#FFFFFF'; // Белый текст
        sumButton.style.border = 'none';
        sumButton.style.borderRadius = '5px';
        sumButton.style.padding = '10px 20px';
        sumButton.style.marginRight = '10px';
        sumButton.style.cursor = 'pointer';
        sumButton.style.fontSize = '14px';
        sumButton.style.fontWeight = 'bold';
        sumButton.onclick = () => {
            copySumValue();
            showFeedback(sumButton);
        };

        const tableButton = document.createElement('button');
        tableButton.id = 'tableButton';
        tableButton.innerText = 'Table';
        tableButton.style.backgroundColor = '#007BFF'; // Синий цвет
        tableButton.style.color = '#FFFFFF'; // Белый текст
        tableButton.style.border = 'none';
        tableButton.style.borderRadius = '5px';
        tableButton.style.padding = '10px 20px';
        tableButton.style.cursor = 'pointer';
        tableButton.style.fontSize = '14px';
        tableButton.style.fontWeight = 'bold';
        tableButton.onclick = () => {
            copyTableValues();
            showFeedback(tableButton);
        };

        buttonContainer.appendChild(sumButton);
        buttonContainer.appendChild(tableButton);
        document.body.appendChild(buttonContainer);
    }

    // Функция для удаления кнопок
    function removeButtons() {
        const buttonContainer = document.querySelector('div[style*="right: 20px;"]');
        if (buttonContainer) {
            buttonContainer.remove();
        }
    }

    // Функция для копирования и обработки значения SUM
    function copySumValue() {
        const selector = '#Tabs > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1) > td > div > table > thead > tr.ax-ftable-total > th:nth-child(3)';
        const element = document.querySelector(selector);

        if (element) {
            let value = element.innerText.replace(/\s+/g, ''); // Удаляем пробелы
            value = Math.round(parseFloat(value.replace(',', '.'))); // Округляем до целого числа
            navigator.clipboard.writeText(value.toString());
        }
    }

    // Функция для копирования и обработки значений таблицы
    function copyTableValues() {
        const selector = '#Tabs > div:nth-child(2) > div:nth-child(1) > table > tbody > tr:nth-child(1) > td > div > table > tbody';
        const tableBody = document.querySelector(selector);

        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            let values = [];

            rows.forEach(row => {
                const thirdTd = row.querySelector('td:nth-child(3)');
                if (thirdTd) {
                    let value = thirdTd.innerText.replace(/\s+/g, ''); // Удаляем пробелы
                    value = Math.round(parseFloat(value.replace(',', '.'))); // Округляем до целого числа
                    if (value >= 10000) { // Фильтруем значения меньше 10000
                        values.push(value);
                    }
                }
            });

            const clipboardText = values.join('\n'); // Соединяем значения в одну строку с переносами
            navigator.clipboard.writeText(clipboardText);
        }
    }

    function replaceDropzoneWithDirectUpload() {
  // Проверяем наличие текста "Номенклатура" или "Номенклатура по умолчанию" на странице
  const bodyText = document.body.innerText;
  const hasNomenclature = bodyText.includes("Номенклатура") || bodyText.includes("номенклатура по умолчанию");

  // Проверяем наличие текста "Нет изображений" в указанном элементе
  const previewBlock = document.querySelector("#PreviewBlock > div");
  const hasNoImages = previewBlock && previewBlock.classList.contains("fororama_no_previews") &&
                       previewBlock.textContent.includes("Файловый сервер недоступен");

  // Если оба условия выполняются
  if (hasNomenclature && hasNoImages) {

      // Находим элемент Dropzone
      const dropzoneElement = document.querySelector("#Dropzone");

      if (dropzoneElement) {
          // Создаем новый элемент
          const directUploadElement = document.createElement("div");
          directUploadElement.style.backgroundColor = "#4CAF50"; // Зеленый фон
          directUploadElement.style.fontSize = "25px";
          directUploadElement.style.fontWeight = "700";
          directUploadElement.style.color = "#ffffff";
          directUploadElement.style.textAlign = "center";
          directUploadElement.style.padding = "20px";
          directUploadElement.style.margin = "10px 0";
          directUploadElement.style.borderRadius = "5px";
          directUploadElement.style.cursor = "pointer";
          directUploadElement.textContent = "Загрузите файл через папку или отошлите на почту!";


          // Заменяем Dropzone на новый элемент
          dropzoneElement.parentNode.replaceChild(directUploadElement, dropzoneElement);

      }
  }
}

// Функция для периодической проверки условий (на случай, если элементы загружаются динамически)
function checkAndReplaceDropzone() {
  replaceDropzoneWithDirectUpload();

  // Наблюдатель за изменениями в DOM
  const observer = new MutationObserver(function(mutations) {
      replaceDropzoneWithDirectUpload();
  });

  // Начинаем наблюдение за изменениями в body
  observer.observe(document.body, { childList: true, subtree: true });
}

// Запускаем проверку после полной загрузки страницы
window.addEventListener("load", function() {
    checkAndReplaceDropzone();
});

// Также проверяем сразу, если DOM уже загружен
if (document.readyState === "interactive" || document.readyState === "complete") {
    checkAndReplaceDropzone();
}


const SHEET_ID = '1h4vwAC83sqAnf2ibalKW4qfTSHe0qToPs0-0aSdpdrU';
const SHEET_NAME = 'finder';

// Глобальная переменная для хранения данных таблицы
let sheetData = [];

// Функция для получения данных из Google таблицы
function fetchGoogleSheetData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            if (response.status === 200) {
                sheetData = parseCSV(response.responseText);

            } else {

            }
        },
        onerror: function(error) {

        }
    });
}

// Функция для парсинга CSV данных
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        // Обработка CSV с учетом возможных кавычек
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        for (let j = 0; j < values.length; j++) {
            values[j] = values[j].replace(/^"|"$/g, '').trim();
        }

        result.push(values);
    }

    return result;
}

// Функция для проверки наличия ProductId в данных таблицы
function checkProductIdInData(productId, data) {
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            // Приводим всё к строке и удаляем пробелы для корректного сравнения
            if (data[i][j].toString().trim() === productId.toString().trim()) {
                return true;
            }
        }
    }
    return false;
}

// Функция для обработки элемента ProductId
function processProductId(element) {
    const productId = element.textContent.trim();

    if (checkProductIdInData(productId, sheetData)) {
        if (!element.textContent.includes('⚡️')) {
            element.textContent = element.textContent + '⚡️';
        }

    } else {

    }
}

// Функция для наблюдения за DOM и отслеживания появления #ProductId
function observeDOM() {
    // Настраиваем наблюдатель за DOM
    const observer = new MutationObserver(function(mutations) {
        const productIdElement = document.getElementById('ProductId');
        if (productIdElement) {
            processProductId(productIdElement);
        }
    });

    // Начинаем наблюдение за всем DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Также проверяем существующий DOM на наличие элемента
    const existingProductId = document.getElementById('ProductId');
    if (existingProductId) {
        processProductId(existingProductId);
    }
}

// Запускаем обновление данных каждые 15 секунд
function startPeriodicUpdates() {
    // Первый вызов для немедленной загрузки данных
    fetchGoogleSheetData();

    // Устанавливаем интервал для обновления данных каждые 15 секунд
    setInterval(fetchGoogleSheetData, 15000);
}

// Запускаем наблюдение и обновление данных, когда страница полностью загружена
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        startPeriodicUpdates();
        observeDOM();
    });
} else {
    startPeriodicUpdates();
    observeDOM();
}
  // Добавляем CSS для анимации
  GM_addStyle(`
    /* Анимация для текста "Получаем информацию о бонусах..." */
    @keyframes dots {
        0% { content: "..."; }
        33% { content: "."; }
        66% { content: ".."; }
    }

    .loading-text::after {
        content: "...";
        animation: dots 1s infinite;
    }
`);

// Функция для получения данных из селектора на странице
function getDataFromSelector() {
  const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
  const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';

  let element = document.querySelector(selector1);
  if (element) {
      return element.textContent.trim();
  } else {
      element = document.querySelector(selector2);
      if (element) {
          const spanElement = element.querySelector('div > a > span');
          return spanElement ? spanElement.textContent.trim() : element.textContent.trim();
      }
  }
  return null;
}

// Функция для создания строки с информацией о бонусах
function createBonusRow() {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 2; // Устанавливаем colspan, чтобы ячейка занимала всю ширину строки
  cell.style.textAlign = 'center'; // Центрируем текст
  cell.style.fontWeight = 'bold'; // Делаем текст жирным

  // Создаем текстовое содержимое
  const text = document.createTextNode('Доступно бонусов: ');
  cell.appendChild(text);

  // Создаем кнопку "Узнать"
  const button = document.createElement('button');
  button.textContent = 'Узнать';
  button.style.marginLeft = '10px';
  button.style.padding = '5px 10px';
  button.style.border = 'none';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.cursor = 'pointer';
  button.style.borderRadius = '5px';

   // Добавляем обработчик события для кнопки
   button.addEventListener('click', () => {
    // Отключаем кнопку и показываем спиннер
    button.disabled = true;
    button.textContent = ''; // Очищаем текст кнопки
    button.style.backgroundColor = '#ccc'; // Серый цвет для отключения

    // Добавляем текст "Получаем информацию о бонусах..."
    const loadingText = document.createElement('span');
    loadingText.textContent = 'Загрузка';
    loadingText.classList.add('loading-text'); // Применяем анимацию
    button.appendChild(loadingText);

    // Задержка в 2 секунды перед отправкой запроса
    setTimeout(() => {
        const searchText = getDataFromSelector();
        if (searchText) {
            fetchDataFromGoogleSheets(searchText, (bonusAmount) => {
                if (bonusAmount !== null) {
                    cell.textContent = `Доступно бонусов: ${bonusAmount}`;
                    cell.style.color = 'green';
                } else {
                    cell.textContent = 'Бонусов нет';
                    cell.style.color = 'red';
                }
            });
        } else {
            cell.textContent = 'Ошибка: невозможно получить данные';
            cell.style.color = 'red';
        }
    }, 1000); // Задержка в 2 секунды
});

  // Добавляем кнопку в ячейку
  cell.appendChild(button);

  // Добавляем ячейку в строку
  row.appendChild(cell);
  return row;
}

// Функция для скрытия всех элементов, кроме указанных строк
function removeUnwantedElements(targetTableBody) {
  // Проходим по всем строкам таблицы
  const rows = targetTableBody.querySelectorAll('tr');
  rows.forEach((row, index) => {
      // Проверяем, есть ли у строки класс .bonus-row
      if (!row.classList.contains('bonus-row')) {
          // Оставляем только первую строку (index === 0) и четвертую строку (index === 3)
          if (index !== 0 && index !== 3) {
              row.style.display = 'none'; // Скрываем строку
          }
      }
  });
}

// Функция для добавления строки с бонусами в таблицу
function addBonusRowToTable(targetTable) {
  // Проверяем, существует ли уже строка с бонусами
  const existingBonusRow = targetTable.querySelector('.bonus-row');
  if (existingBonusRow) {
      return; // Если строка уже существует, ничего не делаем
  }

  // Создаем новую строку с бонусами
  const bonusRow = createBonusRow();
  bonusRow.classList.add('bonus-row'); // Добавляем уникальный класс для идентификации

  // Вставляем строку в конец таблицы
  targetTable.querySelector('tbody').appendChild(bonusRow);
}

// Функция для получения данных из Google Sheets
function fetchDataFromGoogleSheets(searchText, callback) {
  const spreadsheetId = '1J-AqPpr5y9HEl0Q0WhSvafZFTjw5DpLi_jWYy0g7KqQ';
  const sheetName = 'ОСТАТОК';
  const apiKey = 'AIzaSyCiGZzZ85qCs-xJmlCbM-bz9IdAQxEq5z0'; // Замените на ваш API ключ Google Sheets

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:B?key=${apiKey}`;

  GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function(response) {
          if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              if (data && data.values && data.values.length > 1) {
                  for (let i = 1; i < data.values.length; i++) {
                      const row = data.values[i];
                      if (row[0] === searchText) {
                          callback(row[1]); // Передаем значение бонусов в callback
                          return;
                      }
                  }
              }
          }
          callback(null); // Если совпадений нет или произошла ошибка
      },
      onerror: function(error) {

          callback(null);
      }
  });
}

// Флаг для предотвращения повторной обработки, пока элементы видимы
let isProcessing = false;

// Функция для проверки наличия текста "Номенклатура" или "Номенклатура по умолчанию" на странице
function hasNomenclatureText() {
  const pageText = document.body.textContent || '';
  return pageText.includes('Номенклатура') || pageText.includes('Номенклатура по умолчанию');
}

// Функция проверки наличия и обработки элементов
function checkAndProcessElements() {
  // Проверяем наличие текста "Номенклатура" или "Номенклатура по умолчанию"
  if (!hasNomenclatureText()) {
      isProcessing = false;
      return;
  }

  const targetTable = document.querySelector('#Fin > table > tbody:nth-child(4) > tr > td:nth-child(1) > table');
  if (targetTable) {
      // Получаем тело таблицы
      const targetTableBody = targetTable.querySelector('tbody');
      if (targetTableBody) {
          // Скрываем все элементы, кроме указанных строк
          removeUnwantedElements(targetTableBody);

          // Добавляем строку с бонусами
          addBonusRowToTable(targetTable);
      }
  } else {
      isProcessing = false;
  }
}

// Функция для настройки MutationObserver
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
      if (hasNomenclatureText()) {
          const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
          const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';
          if (document.querySelector(selector1) || document.querySelector(selector2)) {
              checkAndProcessElements();
          } else {
              isProcessing = false;
          }
      }
  });

  observer.observe(document.documentElement, {
      childList: true,
      subtree: true
  });

  // Также проверим сразу, вдруг элементы уже есть на странице
  checkAndProcessElements();

  // Запускаем проверку каждую секунду
  setInterval(checkAndProcessElements, 800);
}

// Запускаем настройку наблюдателя, когда документ загружен
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupObserver);
} else {
  setupObserver();
}

    //отображение списаных бонусов за заказ

const gs_SHEET_ID = '1VNlFOnfbc_pyCGsRjiV6WD1e6WUrT3UJBDgBkCFl970';
const gs_SHEET_NAME = 'idCheck';

let gs_sheetData = [];
let gs_processedElements = new Set();

// Функция для получения данных из Google таблицы
function gs_fetchGoogleSheetData() {
    const url = `https://docs.google.com/spreadsheets/d/${gs_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${gs_SHEET_NAME}`;

    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            if (response.status === 200) {
                gs_sheetData = gs_parseCSV(response.responseText);
            } else {
                console.error('Ошибка при получении данных из Google таблицы:', response.statusText);
            }
        },
        onerror: function (error) {
            console.error('Ошибка при запросе к Google таблице:', error);
        }
    });
}

// Функция для парсинга CSV данных
function gs_parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        for (let j = 0; j < values.length; j++) {
            values[j] = values[j].replace(/^"|"$/g, '').trim();
        }

        result.push(values);
    }

    return result;
}

// Функция для проверки наличия ProductId в данных таблицы
function gs_checkProductIdInData(productId, data) {
    for (let i = 0; i < data.length; i++) {
        const productCell = data[i][0]; // Столбец A
        const bonusCell = data[i][4];   // Столбец E

        if (productCell.toString().trim() === productId.toString().trim()) {
            return bonusCell; // Возвращаем значение из столбца E
        }
    }
    return null;
}

// Функция для получения данных из селекторов на странице
function gs_getDataFromSelector() {
    const selector1 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a > span';
    const selector2 = '#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)';

    let element = document.querySelector(selector1);
    if (element) {
        return { text: element.textContent.trim(), element };
    } else {
        element = document.querySelector(selector2);
        if (element) {
            const spanElement = element.querySelector('div > a > span');
            return { text: spanElement ? spanElement.textContent.trim() : element.textContent.trim(), element };
        }
    }
    return null;
}

// Функция для обработки элемента chosen-single
function gs_processChosenSingle(productId) {
    // Проверяем, есть ли ProductId в таблице
    const bonuses = gs_checkProductIdInData(productId, gs_sheetData);
    if (!bonuses) {
        return; // Если ProductId нет в таблице, выходим из функции
    }

    const chosenSingleElement = document.querySelector('#Summary > table > tbody > tr > td:nth-child(1) > table.table.table-condensed.table-striped > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div > a');
    if (chosenSingleElement && !gs_processedElements.has(chosenSingleElement)) {
        gs_processedElements.add(chosenSingleElement);

        chosenSingleElement.style.display = 'none';

        const selectorData = gs_getDataFromSelector();
        const newElement = document.createElement('span');
        newElement.classList.add('myelem');

        // Запрещаем все действия с элементом через CSS-свойства
        newElement.style.pointerEvents = 'none'; // Отключает все события мыши (клик, наведение и т.д.)
        newElement.style.userSelect = 'none';    // Запрещает выделение текста
        newElement.style.opacity = '0.5';

        // Формируем текст для нового элемента
        if (bonuses) {
            // Оборачиваем значение bonuses в span с зеленым цветом
            newElement.innerHTML = `${selectorData.text} (Было списано <span style="color: green;">${bonuses}</span> бонусов)`;
        } else {
            newElement.textContent = selectorData.text;
        }

        if (selectorData) {
            const clientSelect = document.querySelector("#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > div");
            clientSelect.style.pointerEvents = 'none';

            chosenSingleElement.parentNode.insertBefore(newElement, chosenSingleElement);
        }
    }
}

// Функция для обработки ProductId
function gs_processProductId() {
    const productIdElement = document.querySelector("#ProductId");
    if (productIdElement) {
        const productId = productIdElement.textContent.trim();

        // Проверяем, есть ли ProductId в таблице
        const bonuses = gs_checkProductIdInData(productId, gs_sheetData);
        if (!bonuses) {
            return; // Если ProductId нет в таблице, выходим из функции
        }

        gs_processChosenSingle(productId); // Обрабатываем элемент chosen-single
    }
}

// MutationObserver для отслеживания изменений DOM
const gs_observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.querySelector("#ProductId")) {
                    gs_processProductId();
                }
                if (node.querySelector('a.chosen-single')) {
                    const productIdElement = document.querySelector("#ProductId");
                    if (productIdElement) {
                        const productId = productIdElement.textContent.trim();
                        gs_processChosenSingle(productId);
                    }
                }
            }
        });
    });
});

gs_observer.observe(document.body, { childList: true, subtree: true });

gs_fetchGoogleSheetData();

      function closeOldBill()  {

  // Функция для конвертации даты из формата "Пятница, 28 марта 2025" в объект Date
  function parseDate(dateString) {
      if (!dateString || typeof dateString !== 'string') {
          return null;
      }

      const dateParts = dateString.split(', ');
      if (dateParts.length !== 2) {
          return null;
      }

      const dayMonthYear = dateParts[1].split(' ');
      if (dayMonthYear.length !== 3) {
          return null;
      }

      const day = parseInt(dayMonthYear[0], 10);
      const monthName = dayMonthYear[1];
      const year = parseInt(dayMonthYear[2], 10);

      const monthMap = {
          'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
          'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
          'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
      };

      const month = monthMap[monthName.toLowerCase()];
      if (month === undefined) {
          return null;
      }

      return new Date(year, month, day);
  }

  // Функция для получения даты закрытия квартала
  function getQuarterCloseDate(currentDate) {
      const year = currentDate.getFullYear();
      const quarter = Math.ceil((currentDate.getMonth() + 1) / 3); // Определяем текущий квартал

      let closeMonth, closeDay;
      if (quarter === 1) {
          closeMonth = 3; // Апрель
          closeDay = 10;
      } else if (quarter === 2) {
          closeMonth = 6; // Июль
          closeDay = 10;
      } else if (quarter === 3) {
          closeMonth = 9; // Октябрь
          closeDay = 10;
      } else if (quarter === 4) {
          closeMonth = 0; // Январь следующего года
          closeDay = 25;
      }

      if (quarter === 4) {
          return new Date(year + 1, closeMonth, closeDay);
      }
      return new Date(year, closeMonth, closeDay);
  }

  // Функция для изменения страницы
  function modifyPage() {
      // Заменяем содержимое блока #Doc > div.bigform > div:nth-child(1)
      const targetBlock = document.querySelector('#Doc > div.bigform > div:nth-child(1)');
      if (targetBlock) {
          targetBlock.innerHTML = `
              <div id="closedNotice" style="
                  color: red;
                  font-size: 16px;
                  font-weight: bold;
                  text-transform: uppercase;
                  position: relative;
                  cursor: pointer;
              ">
                  ДАТЫ ЗАКРЫТЫ
                  <div id="tooltip" style="
                      display: none;
                      position: absolute;
                      top: 100%;
                      left: 50%;
                      transform: translateX(-50%);
                      background-color: black;
                      color: white;
                      padding: 10px;
                      border-radius: 8px;
                      text-align: center;
                      z-index: 10000;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
                      font-size: 12px;
                      width: 310px;
                  ">
                      Период в котором был сформирован документ - закрыт,
                      для внесения правок обратитесь к главному бухгалтеру!
                  </div>
              </div>
          `;

          // Добавляем обработчик событий для показа/скрытия tooltip
          const noticeElement = document.getElementById('closedNotice');
          const tooltipElement = document.getElementById('tooltip');

          noticeElement.addEventListener('mouseenter', () => {
              tooltipElement.style.display = 'block';
          });

          noticeElement.addEventListener('mouseleave', () => {
              tooltipElement.style.display = 'none';
          });
      }

      // Делаем таблицу неактивной
      const tableElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > table');
      if (tableElement) {
          tableElement.style.pointerEvents = 'none';
          tableElement.style.opacity = '0.7'; // Добавляем эффект "неактивности"
      }

      // Делаем блок неактивным
      const divElement = document.querySelector('#Doc > div.bigform > table > tbody > tr > td:nth-child(1) > div > div');
      if (divElement) {
          divElement.style.pointerEvents = 'none';
          divElement.style.opacity = '0.7';
      }

      // Скрываем кнопки
      const buttonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > button');
      if (buttonElement) buttonElement.style.display = 'none';

      const divButtonElement = document.querySelector('#Doc > div.bigform > div:nth-child(2) > div:nth-child(3)');
      if (divButtonElement) divButtonElement.style.display = 'none';
  }

  // Функция для проверки условий
  function checkConditions() {
      const summaElement = document.querySelector('#Summa');
      const tabElement = document.querySelector('#FormTabs > li:nth-child(2) > a');

      // Если оба элемента найдены
      if (summaElement && tabElement) {
          const dateElement = document.querySelector('#Date');
          if (!dateElement) {
              setTimeout(checkConditions, 1000);
              return;
          }

          const dateString = dateElement.value.trim();
          const parsedDate = parseDate(dateString);

          if (!parsedDate) {
              setTimeout(checkConditions, 1000);
              return;
          }

          const currentDate = new Date();
          const quarterCloseDate = getQuarterCloseDate(parsedDate);

          // Проверяем, прошла ли дата порог закрытия квартала
          if (currentDate <= quarterCloseDate) {
              setTimeout(checkConditions, 1000);
              return;
          }

          modifyPage();
      } else {
          setTimeout(checkConditions, 1000);
      }
  }

  // Наблюдатель за изменениями DOM
  function observeDOM() {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                  // Проверяем, есть ли элементы #Date и #Summa
                  const dateElement = document.querySelector('#Date');
                  const summaElement = document.querySelector('#Summa');

                  if (!dateElement || !summaElement) {
                      checkConditions();
                  }
              }
          });
      });

      // Начинаем наблюдение за всем DOM
      observer.observe(document.body, { childList: true, subtree: true });
  }

  // Запускаем проверку условий и наблюдение за DOM
  checkConditions();
  observeDOM();
}
closeOldBill();
    
//Связка аксиомы и таблицы дизайнеров
    function newDesign() {
    'use strict';
    const API_KEY = 'AIzaSyD-gPXmq0YOL3WXjQ8jub9g5_xyx2PfOZU';
    const SPREADSHEET_ID = '1Luf6pGAkIRBZ46HNa95NvoqkffKEZAiFuxBKUwlMSHY';
    const DESIGN_SHEET_NAME = 'Design';
    const LIST_SHEET_NAME = 'List';

    // Добавляем CSS для анимации загрузки
    GM_addStyle(`
        .loading-animation {
            position: relative;
            display: inline-block;
        }
        .loading-animation::after {
            content: '';
            display: inline-block;
            animation: dots 2s infinite;
        }
        @keyframes dots {
            0% { content: '.'; }
            33% { content: '..'; }
            66% { content: '...'; }
            100% { content: ''; }
        }
    `);

    // Функция для получения productID
    function gs_processProductId() {
        const productIdElement = document.querySelector("#ProductId");
        if (productIdElement) {
            return productIdElement.textContent.trim();
        }
        return null;
    }

    // Функция для получения имени пользователя
    function getUserName() {
        const userNameElement = document.querySelector("body > ul > div > li:nth-child(1) > a.topmenu-a");
        if (userNameElement) {
            return userNameElement.textContent.trim();
        }
        return null;
    }

    // Функция для получения названия продукта
    function getProductName() {
        const productNameElement = document.querySelector("#Top > form > div > div > div > input.ProductName.form-control");
        if (productNameElement) {
            return productNameElement.value.trim();
        }
        return null;
    }

    // Функция для проверки наличия productID в таблице
    async function checkProductInSheet(productId) {
        const range = `Design!A:A`;
        const values = await fetchGoogleSheetData(range);
        return values.some(row => row[0] === productId.toString());
    }



    // Функция для получения данных из Google Sheets
    async function fetchGoogleSheetData(range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.values || [];
    }

    // Функция для записи данных в Google Sheets
    async function writeDataToSheet(data) {
        const url = "https://script.google.com/macros/s/AKfycbyH_R0_8JIlAq3TW8Fq_hmN6dSJ2c-u7F9lnwTMm8jOzHNnXBw7DjX4uUMRRTNlzxDw/exec";
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('Данные успешно отправлены.');
            return true;
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            alert('Произошла ошибка при отправке данных. Проверьте консоль.');
            return false;
        }
    }

    // Функция для получения данных по productID из таблицы
    async function getProductDataFromSheet(productId) {
        const range = `Design!A:E`; // Берем столбцы от A до E (productID, ..., Цена продажи, Дизайнер)
        const values = await fetchGoogleSheetData(range);
        return values.find(row => row[0] === productId.toString()) || null;
    }

    // Функция для показа попапа
    function showPopup() {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = '#f9f9f9'; // Более светлый фон
    popup.style.border = '1px solid #ddd'; // Серая рамка
    popup.style.borderRadius = '8px'; // Скругленные углы
    popup.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; // Тень для эффекта глубины
    popup.style.zIndex = '1000';

    const priceLabel = document.createElement('label');
    priceLabel.innerText = 'Сумма дизайнеру:';
    priceLabel.style.display = 'block';
    priceLabel.style.marginBottom = '5px';
    priceLabel.style.fontWeight = 'bold';

    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.placeholder = 'Сколько платим дизайнеру?';
    priceInput.style.width = '100%';
    priceInput.style.padding = '10px';
    priceInput.style.marginTop = '10px';
    priceInput.style.marginBottom = '10px';
    priceInput.style.border = '1px solid #ccc';
    priceInput.style.borderRadius = '4px';
    priceInput.style.boxSizing = 'border-box';

    // Добавляем обработчик для удаления сообщения об ошибке при изменении суммы
    priceInput.addEventListener('input', () => {
        const errorMessage = popup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.parentElement.removeChild(errorMessage); // Удаляем таблицу с ошибкой
        }
    });

    const dropdownLabel = document.createElement('label');
    dropdownLabel.innerText = 'Дизайнер:';
    dropdownLabel.style.display = 'block';
    dropdownLabel.style.marginBottom = '5px';
    dropdownLabel.style.fontWeight = 'bold';

    const dropdown = document.createElement('select');
    dropdown.style.width = '100%';
    dropdown.style.marginBottom = '10px';
    dropdown.style.padding = '10px';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxSizing = 'border-box';

    fetchGoogleSheetData(`${LIST_SHEET_NAME}!A:A`).then(categories => {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category[0];
            option.text = category[0];
            dropdown.add(option);
        });
    });

    const sendButton = document.createElement('button');
    sendButton.innerText = 'Отправить';
    sendButton.style.width = '100%';
    sendButton.style.padding = '10px';
    sendButton.style.backgroundColor = '#4CAF50'; // Зеленый цвет кнопки
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.fontSize = '16px';
    sendButton.style.transition = 'background-color 0.3s';

// Функция для получения даты запуска заказа
function getLaunchDate() {
    const launchDateElement = document.querySelector("#History > table:nth-child(1) > tbody > tr:nth-child(3) > td.right.bold");
    if (launchDateElement && launchDateElement.textContent.trim()) {
        return launchDateElement.textContent.trim()
            .replace(/,/g, '')
            .replace(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье/g, '')
            .trim();
    }
    return null;
}

sendButton.addEventListener('click', async () => {
    if (sendButton.disabled) return; // Проверяем, не заблокирована ли уже кнопка

    sendButton.style.backgroundColor = '#45a049'; // Изменение цвета при нажатии
    sendButton.disabled = true; // Блокируем кнопку для предотвращения двойного нажатия

    try {
        const productId = gs_processProductId();
        const userName = getUserName();
        const productName = getProductName();
        const designerPrice = parseFloat(priceInput.value.replace(',', '.'));
        const category = dropdown.value;
        const axiomPriceElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1)');
        let axiomPriceText = '';
        if (axiomPriceElement) {
            axiomPriceText = axiomPriceElement.textContent.replace(/\s/g, '').match(/(\d+,\d+)/); // Удаляем пробелы
            axiomPriceText = axiomPriceText ? axiomPriceText[0].replace(',', '.') : null; // Заменяем запятую на точку
        }
        const axiomPrice = parseFloat(axiomPriceText);
        const launchDate = getLaunchDate();

        if (!launchDate) {
            const existingError = popup.querySelector('.error-message');
            if (!existingError) {
                const errorTable = document.createElement('table'); 
                errorTable.style.width = '100%';
                errorTable.style.borderCollapse = 'collapse';
                errorTable.style.marginTop = '10px';
                errorTable.style.border = '1px solid red';
                errorTable.style.borderRadius = '4px';
                const errorRow = errorTable.insertRow();
                const errorCell = errorRow.insertCell();
                errorCell.colSpan = 2;
                errorCell.style.textAlign = 'center';
                errorCell.style.color = 'red';
                errorCell.style.fontWeight = 'bold';
                errorCell.style.padding = '10px';
                errorCell.className = 'error-message'; 
                errorCell.innerText = 'Отправка данных только по запущенным заказам.';
                popup.appendChild(errorTable);
            }
            sendButton.disabled = false; // Разблокируем кнопку при ошибке
            return;
        }

        if (designerPrice * 1.3 <= axiomPrice) {
            const data = [
                productId,
                userName,
                productName,
                designerPrice,
                category,
                axiomPrice,
                launchDate
            ];

            const success = await writeDataToSheet(data);
            if (success) {
                const successMessage = document.createElement('p');
                successMessage.style.marginTop = '10px';
                successMessage.style.color = 'green';
                successMessage.style.fontWeight = 'bold';
                successMessage.style.textAlign = 'center';
                successMessage.innerText = 'Данные успешно загружены!';
                popup.appendChild(successMessage);

                setTimeout(() => {
                    popup.remove();
                }, 3000);

                const textarea = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea');
                if (textarea) {
                    const existingButtons = textarea.parentElement.querySelectorAll('button');
                    existingButtons.forEach(button => button.remove());
                    createCheckButton(textarea);
                }
            } else {
                sendButton.disabled = false; // Разблокируем кнопку при ошибке
            }
        } else {
            const existingError = popup.querySelector('.error-message');
            if (!existingError) {
                const errorTable = document.createElement('table'); 
                errorTable.style.width = '100%';
                errorTable.style.borderCollapse = 'collapse';
                errorTable.style.marginTop = '10px';
                errorTable.style.border = '1px solid red';
                errorTable.style.borderRadius = '4px';
                const errorRow = errorTable.insertRow();
                const errorCell = errorRow.insertCell();
                errorCell.colSpan = 2;
                errorCell.style.textAlign = 'center';
                errorCell.style.color = 'red';
                errorCell.style.fontWeight = 'bold';
                errorCell.style.padding = '10px';
                errorCell.className = 'error-message'; 
                errorCell.innerText = 'Сумма некорректна';
                popup.appendChild(errorTable);
            }
            sendButton.disabled = false; // Разблокируем кнопку при ошибке
        }
    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
        alert('Произошла ошибка при отправке данных.');
        sendButton.disabled = false; // Разблокируем кнопку при ошибке
    }
});
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Закрыть';
    closeButton.style.width = '100%';
    closeButton.style.padding = '10px';
    closeButton.style.marginTop = '10px';
    closeButton.style.backgroundColor = '#f44336'; // Красный цвет кнопки
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.transition = 'background-color 0.3s';

    closeButton.addEventListener('click', () => {
        closeButton.style.backgroundColor = '#d32f2f'; // Изменение цвета при нажатии
        popup.remove();
    });

    popup.appendChild(priceLabel);
    popup.appendChild(priceInput);
    popup.appendChild(dropdownLabel);
    popup.appendChild(dropdown);
    popup.appendChild(sendButton);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);
}

    // Функция для создания кнопки "Удалённый дизайн"
    function createRemoteDesignButton(textarea) {
        const remoteDesignButton = document.createElement('button');
        remoteDesignButton.innerText = 'Удалённый дизайн';
        textarea.parentElement.appendChild(remoteDesignButton);

        remoteDesignButton.addEventListener('click', async () => {
            const productId = gs_processProductId();
            if (!productId) {
                alert('Product ID не найден.');
                return;
            }

            // Добавляем класс для анимации загрузки
            remoteDesignButton.classList.add('loading-animation');
            remoteDesignButton.disabled = true;

            // Добавляем задержку в 2 секунды перед проверкой данных
            setTimeout(async () => {
                try {
                    // Проверяем, существует ли productID в таблице
                    const existsInSheet = await checkProductInSheet(productId);

                    // Удаляем все предыдущие кнопки, если они есть
                    const existingButtons = textarea.parentElement.querySelectorAll('button:not(:first-child)');
                    existingButtons.forEach(button => button.remove());

                    // Если продукт найден, создаем кнопку "Проверить данные"
                    if (existsInSheet) {
                        createCheckButton(textarea);
                    }
                    // Если продукт не найден, создаем кнопку "Заполнить"
                    else {
                        createFillButton(textarea);
                    }
                } catch (error) {
                    console.error('Ошибка при проверке productID:', error);
                    alert('Произошла ошибка при проверке данных.');
                } finally {
                    // Убираем анимацию и включаем кнопку обратно
                    remoteDesignButton.classList.remove('loading-animation');
                    remoteDesignButton.disabled = false;
                }
            }, 2000); // Задержка в 2000 миллисекунд (2 секунды)
        });
    }

    // Функция для создания кнопки "Проверить данные"
    function createCheckButton(textarea) {
        const checkButton = document.createElement('button');
        checkButton.innerText = 'Проверить данные';
        textarea.parentElement.appendChild(checkButton);

        let infoDivCreated = false;
        checkButton.addEventListener('click', async () => {
            const productId = gs_processProductId();
            const productData = await getProductDataFromSheet(productId);
            if (productData) {
                if (!infoDivCreated) {
                    const infoDiv = document.createElement('div');
                    infoDiv.style.color = 'green';
                    infoDiv.style.marginTop = '10px';
                    infoDiv.style.border = '1px solid green';
                    infoDiv.style.padding = '10px';
                    infoDiv.style.borderRadius = '5px';
                    const table = document.createElement('table');
                    table.style.width = '50%';
                    table.style.borderCollapse = 'collapse';
                    const priceRow = table.insertRow();
                    const priceLabelCell = priceRow.insertCell();
                    priceLabelCell.style.fontWeight = 'bold';
                    priceLabelCell.innerText = 'Оплата дизайнеру:';
                    const priceValueCell = priceRow.insertCell();
                    priceValueCell.innerText = `${productData[3]} руб.`;
                    const designerRow = table.insertRow();
                    const designerLabelCell = designerRow.insertCell();
                    designerLabelCell.style.fontWeight = 'bold';
                    designerLabelCell.innerText = 'Дизайнер:';
                    const designerValueCell = designerRow.insertCell();
                    designerValueCell.innerText = productData[4];
                    infoDiv.appendChild(table);
                    checkButton.parentElement.appendChild(infoDiv);
                    infoDivCreated = true;
                }
            } else {
                const errorSpan = document.createElement('span');
                errorSpan.innerText = 'Информация о продукте не найдена.';
                errorSpan.style.color = 'red';
                checkButton.parentElement.appendChild(errorSpan);
            }
        });
    }

    // Функция для создания кнопки "Заполнить"
    function createFillButton(textarea) {
        const fillButton = document.createElement('button');
        fillButton.innerText = 'Заполнить';
        textarea.parentElement.appendChild(fillButton);
        fillButton.addEventListener('click', () => {
            showPopup();
        });
    }

    let buttonAdded = false;

//function hideTopButtonIfRemoteDesigners() {
    // Проверяем наличие элемента с текстом "Дизайнеры на удаленке"
  //  const designerElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b');
    //if (designerElement && designerElement.textContent.includes('Дизайнеры на удаленке')) {
        // Находим элемент #TopButtons > a:nth-child(6)
      //  const topButtonToRemove = document.querySelector('#TopButtons > a:nth-child(6)');
        //if (topButtonToRemove) {
          //  topButtonToRemove.remove(); // Скрываем элемент
        //}
    //}
//}


    function observeDOMChanges() {
        const observer = new MutationObserver(async (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Проверяем наличие нужных элементов
                    const designerElement = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(1) > b');
                    const textarea = document.querySelector('#DesignBlockSummary > div > table > tbody > tr > td:nth-child(2) > textarea');
                    const refreshWindow = document.querySelector("#Doc");

                    // Если появился класс LoadingContent, сбрасываем флаг buttonAdded
                    if (refreshWindow && refreshWindow.classList.contains("LoadingContent")) {
                        buttonAdded = false;
                        continue; // Пропускаем остальную логику, пока идет загрузка
                    }
                       // Вызываем функцию для скрытия кнопки при необходимости
                         // hideTopButtonIfRemoteDesigners();

                    // Если элементы существуют и текст содержит "Дизайнеры на удаленке"
                    if (designerElement && designerElement.textContent.includes('Дизайнеры на удаленке')) {
                        if (!buttonAdded) {
                            createRemoteDesignButton(textarea); // Добавляем кнопку "Удалённый дизайн"
                            buttonAdded = true;
                        }
                    } else {
                        // Если элементы исчезли, сбрасываем флаг
                        buttonAdded = false;
                    }
                }
            }
        });

        // Наблюдаем за всеми изменениями в DOM
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    observeDOMChanges();
};
newDesign();
    
    // Функция для отображения обратной связи (изменение кнопки)
    function showFeedback(button) {
        button.innerText = 'Done'; // Меняем текст на "Done"
        button.style.backgroundColor = '#28a745'; // Меняем цвет на зеленый

        // Возвращаем кнопку в исходное состояние через 3 секунды
        setTimeout(() => {
            button.innerText = button === document.getElementById('sumButton') ? 'SUM' : 'Table';
            button.style.backgroundColor = '#007BFF'; // Возвращаем синий цвет
        }, 3000);
    }

    // Проверяем наличие слова каждые 1000 миллисекунд
    setInterval(checkForWord, 1000);
})();
})();
