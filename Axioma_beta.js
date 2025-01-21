// ==UserScript==
// @name         Проверка заказа 7.0
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
  console.log(`Всё работает как надо! `);

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
          console.log(`Нажали на кнопку ${k}`);

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
              console.log("hello");

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
              // setTimeout(() => {
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(1) > label > input[type=checkbox]`
              //   ).checked = false;
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(2) > label > input[type=checkbox]`
              //   ).checked = false;
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(3) > label > input[type=checkbox]`
              //   ).checked = false;
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(4) > label > input[type=checkbox]`
              //   ).checked = false;
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(5) > label > input[type=checkbox]`
              //   ).checked = false;
              //   document.querySelector(
              //     `#CheckAllTech > div:nth-child(12) > label > input[type=checkbox]`
              //   ).checked = true;

              // }, 500);
            } else {
              closeBtnId = null;
              choosenCalcId = null;
            }
          }, 500);
        });
      }
    }
    // if(resultCals){
    //   let resultCalsCount = [];
    // const children1 = resultCals.children;
    // for (let i = 0; i < children1.length; i++) {
    //   if (children1[i]) {
    //     resultCalsCount.push(children1[i]);
    //   }
    // }
    // }

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
            console.log("hello");

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
            // setTimeout(() => {
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(1) > label > input[type=checkbox]`
            //   ).checked = false;
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(2) > label > input[type=checkbox]`
            //   ).checked = false;
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(3) > label > input[type=checkbox]`
            //   ).checked = false;
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(4) > label > input[type=checkbox]`
            //   ).checked = false;
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(5) > label > input[type=checkbox]`
            //   ).checked = false;
            //   document.querySelector(
            //     `#CheckAllTech > div:nth-child(12) > label > input[type=checkbox]`
            //   ).checked = true;
            // }, 500);
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
            console.log(changeDate);

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
            console.log(changeDate);

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
            `Карты нужно раскладывать каждый вид на отдельный лист в ${getOrderName(
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
              console.log(paperType2);
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
        console.log(ltrs);

        ltrs.forEach((elem) => {
          if (elem.innerText.includes("Люверс") === true) {
            console.log("я нашел люверс в ордере");

            console.log(elem);
            let lQuantity = elem.querySelector("#Quantity").value;
            console.log(lQuantity);

            if (!isInteger(lQuantity)) {
              console.log("Сюда ннна");
              messages.push(
                `в ${getOrderName(
                  i
                )} не целое число - убирай епрст и перекидывай на общую постпечать !`
              );
            } else {
              console.log("Число целое - от*ебись");
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
            `Слишком толстый блок для скрепки! Обратитесь к технологу!`
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
      console.log(ordersArray);

      for (let i = 0; i < ordersArray.length; i++) {
        const orderElem = document.getElementById(ordersArray[i]);

        let rows = orderElem.getElementsByTagName("tr");
        let backLamination = orderElem.querySelector("#pantoneback");
        console.log(backLamination.value);

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
            console.log(paperType2);
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
      console.log(ltrs);

      ltrs.forEach((elem) => {
        if (elem.innerText.includes("Люверс") === true) {
          console.log("я нашел люверс в ордере");

          console.log(elem);
          let lQuantity = elem.querySelector("#Quantity").value;
          console.log(lQuantity);

          if (!isInteger(lQuantity)) {
            messages.push(
              `в ${getOrderName(
                i
              )} не целое число - убирай епрст и перекидывай на общую постпечать !`
            );
          } else {
            console.log("Число целое - от*ебись");
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
          `Слишком толстый блок для скрепки! Обратитесь к технологу!`
        );
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
      choosenCalcParent = null;
      choosenCalc = null;
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
  // function parseCustomDate(dateString) {
  //   const months = {
  //     января: 0,
  //     февраля: 1,
  //     марта: 2,
  //     апреля: 3,
  //     мая: 4,
  //     июня: 5,
  //     июля: 6,
  //     августа: 7,
  //     сентября: 8,
  //     октября: 9,
  //     ноября: 10,
  //     декабря: 11,
  //   };
  //   const regex = /(\d{2}) (\w+) (\d{4}) (\d{2}):(\d{2})/;
  //   const match = dateString.match(regex);
  //   if (!match) {
  //     return new Date("Invalid Date"); // Если формат не подходит
  //   }

  //   const [_, day, month, year, hours, minutes] = match;

  //   const monthIndex = months[month.toLowerCase()];
  //   if (monthIndex === undefined) {
  //     return new Date("Invalid Date"); // Если месяц не распознан
  //   }
  //   return new Date(year, monthIndex, day, hours, minutes);
  // }

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

    // if (
    //   DateReady &&
    //   bodyText.includes(searchText5) &&
    //   DateReady.classList.contains("changed") == false
    // ) {
    //   DateReady.classList.add("changed");
    //   let DateReady1 = DateReady.innerText;

    //   // function addOneDay(dateString) {
    //   //   const daysOfWeek = [
    //   //     "Воскресенье",
    //   //     "Понедельник",
    //   //     "Вторник",
    //   //     "Среда",
    //   //     "Четверг",
    //   //     "Пятница",
    //   //     "Суббота",
    //   //   ];
    //   //   const months = [
    //   //     "января",
    //   //     "февраля",
    //   //     "марта",
    //   //     "апреля",
    //   //     "мая",
    //   //     "июня",
    //   //     "июля",
    //   //     "августа",
    //   //     "сентября",
    //   //     "октября",
    //   //     "ноября",
    //   //     "декабря",
    //   //   ];

    //   //   let date;

    //   //   // Определяем формат даты и парсим
    //   //   if (/\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
    //   //     // Формат: "Суббота, 21/12/2024"
    //   //     const [, day, month, year] = dateString.match(
    //   //       /(\d{2})\/(\d{2})\/(\d{4})/
    //   //     );
    //   //     date = new Date(`${year}-${month}-${day}`);
    //   //   } else {
    //   //     // Формат: "Суббота, 21 декабря 2024"
    //   //     const [, day, monthName, year] = dateString.match(
    //   //       /(\d{1,2})\s([а-яё]+)\s(\d{4})/i
    //   //     );
    //   //     const monthIndex = months.indexOf(monthName);
    //   //     if (monthIndex === -1) {
    //   //       throw new Error("Неверный формат даты");
    //   //     }
    //   //     date = new Date(year, monthIndex, day);
    //   //   }

    //   //   // Добавляем 1 день
    //   //   date.setDate(date.getDate() + 1);

    //   //   // Формируем обновленный день недели
    //   //   const dayOfWeek = daysOfWeek[date.getDay()];

    //   //   // Формируем выходные строки для двух форматов
    //   //   const formattedDate1 = `${dayOfWeek}, ${String(date.getDate()).padStart(
    //   //     2,
    //   //     "0"
    //   //   )}/${String(date.getMonth() + 1).padStart(
    //   //     2,
    //   //     "0"
    //   //   )}/${date.getFullYear()}`;
    //   //   const formattedDate2 = `${dayOfWeek}, ${date.getDate()} ${
    //   //     months[date.getMonth()]
    //   //   } ${date.getFullYear()}`;

    //   //   return { formattedDate1, formattedDate2 };
    //   // }

    //   // DateReady.innerText = addOneDay(DateReady1).formattedDate1;

    //   // Пример использования

    //   // const observer = new MutationObserver((mutationsList, observer) => {
    //   //   for (let mutation of mutationsList) {
    //   //     if (
    //   //       mutation.type === "attributes" &&
    //   //       !loadingDate.classList.contains("LoadingContent")
    //   //     ) {
    //   //       DateReady.innerText = addOneDay(DateReady1).formattedDate1;

    //   //       // observer.disconnect(); // Прекращаем наблюдение после изменения
    //   //       break;
    //   //     }
    //   //   }
    //   // });

    //   // Настроим наблюдатель за кнопкой
    //   observer.observe(loadingDate, { attributes: true });
    // }

    // const currentDate = new Date();

    // let text;
    // if (timeToReady && timeReserve) {
    //   timeReserve.style.fontWeight = "700";
    //   timeReserve.style.color = "red";
    //   if (
    //     timeReserve.innerHTML.includes("Расчетная дата сдачи заказа") === false
    //   ) {
    //     // timeToReady.value = "21:30";
    //     timeReserve.innerHTML = "ОТГРУЗКА НА СЛЕДУЮЩИЙ ДЕНЬ!";
    //   } else if (
    //     timeReserve.innerHTML.includes("Расчетная дата сдачи заказа") ===
    //       true &&
    //     counter === 0
    //   ) {
    //     // Получаем текст

    //     text = timeReserve.innerText;
    //     let calcDateText = calcDate.innerText;
    //     // Исходная строка с датой

    //     // Разделение строки на массив подстрок
    //     const parts = calcDateText.split(" ");

    //     // Извлечение дня, месяца и года из массива
    //     const day = parts[0];
    //     const monthString = parts[1];
    //     const year = parts[2];
    //     const months = {
    //       января: 1,
    //       февраля: 2,
    //       марта: 3,
    //       апреля: 4,
    //       мая: 5,
    //       июня: 6,
    //       июля: 7,
    //       августа: 8,
    //       сентября: 9,
    //       октября: 10,
    //       ноября: 11,
    //       декабря: 12,
    //     };
    //     const month = months[monthString.toLowerCase()];
    //     // Создание новой даты
    //     const newDate = `${year}/${month < 10 ? `0${month}` : month}/${day}`;
    //     var nowDate = new Date();
    //     var date1 =
    //       nowDate.getFullYear() +
    //       "/" +
    //       (nowDate.getMonth() + 1) +
    //       "/" +
    //       nowDate.getDate();
    //     console.log(date1);

    //     // Вывод новой даты в нужном формате
    //     console.log(newDate);
    //     if (newDate === date1) {
    //       console.log("Даты совпали");
    //       text = text.substring(0, text.length - 7);
    //       console.log(text);
    //       timeReserve.innerText = `${text}  -  ОТГРУЗКА НА СЛЕДУЮЩИЙ ДЕНЬ!`;
    //     } else {
    //       console.log("Даты не совпали");
    //       timeReserve.innerText =
    //         "Расчетная дата сдачи заказа НЕИЗВЕСТНА - пересчитайте заказ";
    //     }

    //     counter = 1;

    //   }
    // } else {
    //   counter = 0;
    // }

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
            console.log("Фраза не найдена.");
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
            console.log("Фраза найдена!");
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
          console.log("Все ок");
        } else {
          navigator.clipboard.writeText("ОПЛАТА ФИЗЛИЦА - ");
          console.log("Неверно");
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
        let needToOther = el.querySelector(
          "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
        );
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
          console.log(stockRemainValue);

          if (
            stockRemainValue > 0 &&
            needCountValue + needToOtherValue + 50 <= stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + needToOtherValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
            if (btnsgroup2 !== null) {
              btnsgroup2.style.display = "none";
            }
            showCenterMessage(
              `Не хватает бумаги для ордера №${
                index + 1
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
            if (btnsgroup2 !== null) {
              btnsgroup2.style.display = "none";
            }
            showCenterMessage(
              `Не хватает бумаги для ордера №${
                index + 1
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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
        let needToOther = el.querySelector(
          "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
        );
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
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + needToOtherValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
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
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
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
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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
        let needToOther = el.querySelector(
          "table.inner > tbody > tr > td > table > tbody > tr > td.SkladBlock > table > tbody > tr:nth-child(4) > td.right.nobreak"
        );
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
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + needToOtherValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
            newFilesGet.style.display = "none";
            showCenterMessage(
              `Не хватает бумаги для ордера №${
                index + 1
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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
            console.log(`в ордере № ${index + 1} Бумаги хватает`);
          } else if (
            stockRemainValue <= 0 ||
            needCountValue + 50 > stockRemainValue
          ) {
            console.log(`в ордере № ${index + 1} Бумаги нет блэт`);
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
              }. Замените бумагу или свяжитесь с ответственным за остатки бумаги для запуска заказа в работу`
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

  // const DateReady = document.querySelector(
  //   "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
  // );
  // const DateReady1 = document.querySelector(
  //   "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > span.DateReady"
  // );
  // const calcDate = document.querySelector(
  //   "#History > table:nth-child(1) > tbody > tr:nth-child(2) > td.right.bold > nobr"
  // );
  // const reCalcDate = document.querySelector(
  //   "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock > button"
  // );
  // const loadingDate = document.querySelector(
  //   "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
  // );

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
        const oldDate = dateInCalc.innerHTML.trim();
        const newDate = updateDate(oldDate);
        dateInCalc.innerHTML = newDate; // Обновляем текст в блоке
        datecheck = 1;
      } else if (
        datecheck === 0 &&
        document.getElementById("UtCalcResult") !== null
      ) {
        const oldDate = dateInProduct.innerHTML.trim();
        const newDate = updateDate(oldDate);
        dateInProduct.innerHTML = newDate; // Обновляем текст в блоке
        datecheck = 1;
      }
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

    const dateInOrder = document.querySelector(
      "#Summary > table > tbody > tr > td:nth-child(1) > table > tbody:nth-child(3) > tr:nth-child(9) > td.PlanBlock"
    );
    if (dateInOrder) {
      function updateDateInElement(selector) {
        // Находим элемент

        if (!dateInOrder) {
          console.error("Элемент не найден");
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
            // console.error("Неверный формат даты:", dateText);
            return;
          }

          // Увеличиваем дату на 1 день и устанавливаем фиксированное время 10:00
          newDate.setDate(newDate.getDate() + 1);
          newDate.setHours(10, 0, 0, 0);

          // Обновляем текст в нужном формате
          const updatedText = formatDate(newDate, dateText.includes(","));
          dateBlock.textContent = updatedText;
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
    const ordersHistory = document.querySelectorAll('.formblock')
    const fullWindow = document.querySelector("#Doc");
    if(fullWindow.classList.contains("LoadingContent") === true) {
      prepressCheck = 0;
    }
    ordersHistory.forEach((elem)=>{
      if (
        bodyText.includes(searchText || bodyText.includes(searchText1)) &&
        (statusNotToCheck1 !== null || statusNotToCheck2 !== null)
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
          (element && element.textContent.trim()) && prepressCheck === 0 ||
          (element1 && element1.textContent.trim() && prepressCheck === 0)
        ) {
          console.log("Проверил:", element1.textContent.trim());
          console.log("Смонтировал:", element.textContent.trim());

          // Создание элемента <div class="prepress">
          const prepressElement = document.createElement("div");
          prepressElement.style.backgroundColor = "orange"
          prepressElement.style.fontSize = "25px"
          prepressElement.style.fontWeight = "700"
          prepressElement.style.color = "#ffffff"
          prepressElement.style.textAlign = "center"
          prepressElement.style.textTransform = "uppercase"
          prepressElement.textContent = "Идет препресс - изменение файлов невозможно!";


            // Замена элемента form.dropzone на новый элемент
          dropzoneElement.parentNode.replaceChild(prepressElement, dropzoneElement);
          prepressCheck = 1;





          // Скрываем кнопку и поле dropzone
          buttonElement.style.display = "none";
          // dropzoneElement.style.display = "none";
          newFilesElem.style.display = "none";
        }
      }else {
        prepressCheck = 0;
      }
    })

  }

  // Запускаем проверку при загрузке страницы
  window.addEventListener("load", checkForTextAndDate);
  setInterval(checkForText, 500); // Проверка наличия текста каждую секунду
  setInterval(checkForTextAndDate, 1000); // Проверка даты каждые 2 секунды
  setInterval(checkForcolorCheck, 100);
  setInterval(checkingClients, 100);
  setInterval(addOneDay, 0);
  setInterval(addDateOnOrderList, 0);
  setInterval(hideDropzone, 200);
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
})();
