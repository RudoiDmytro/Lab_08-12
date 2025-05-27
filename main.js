$(document).ready(function () {
  var dp = new DayPilot.Scheduler("dp");

  new DayPilot.Date().firstDayOfMonth(); // Встановлюємо на січень 2017 для відповідності скріншоту
  dp.days = dp.startDate.daysInMonth(); // Кількість днів у поточному місяці
  dp.scale = "Day";
  dp.timeHeaders = [
    { groupBy: "Month", format: "MMMM yyyy" },
    { groupBy: "Day", format: "d" },
  ];

  // Налаштування для відображення
  dp.rowHeaderColumns = [
    { title: "Кімната", width: 120 },
    { title: "Місткість", width: 80 },
    { title: "Статус", width: 100 },
  ];

  dp.rowHeaderWidth = 300;

  dp.rowMinHeight = 40;

  dp.eventHeight = 70;

  var config = {
    urls: {
      rooms: "api/rooms_get.php",
      events: "api/reservations_get.php",
      createReservation: "api/reservation_create.php",
      updateReservation: "api/reservation_update.php",
      deleteReservation: "api/reservation_delete.php",
      createRoom: "api/room_create.php",
    },
  };

  function loadResources(capacity) {
    var url = config.urls.rooms;
    if (capacity && capacity !== "0") {
      url += "?capacity=" + capacity;
    }
    $.ajax({
      url: url,
      method: "GET",
      success: function (data) {
        const mappedResources = data.map((room) => {
          let statusClass = "";
          let statusText = DayPilot.Util.escapeHtml(room.status || "N/A");
          switch (room.status ? room.status.toLowerCase() : "") {
            case "dirty":
              statusClass = "status-dirty";
              break;
            case "cleanup":
              statusClass = "status-cleanup";
              break;
            case "ready":
              statusClass = "status-ready";
              break;
            default:
              statusClass = "status-unknown";
              break;
          }

          // Створюємо єдиний HTML-блок для відображення інформації про кімнату
          let roomHtml = `<div class='room-info-container'>`;
          roomHtml += `<div class='room-name-line'>${DayPilot.Util.escapeHtml(
            room.name || "Кімната " + room.id
          )}</div>`;
          roomHtml += `<div class='room-capacity-line'>Місткість: ${
            room.capacity || "?"
          } місць</div>`;
          roomHtml += `<div class='room-status-line res-status-cell'><span class='res-status-indicator ${statusClass}'></span>${statusText}</div>`;
          roomHtml += `</div>`;

          return {
            id: room.id.toString(),
            name: DayPilot.Util.escapeHtml(room.name || "Кімната " + room.id), // 'name' для сортування/фільтрації
            html: roomHtml, // Головний HTML для відображення в рядку ресурсу

            // Зберігаємо оригінальні дані
            _capacity: parseInt(room.capacity),
            _status: room.status,
          };
        });
        dp.resources = mappedResources;
        dp.update();
        loadEvents();
      },
      error: function (xhr) {
        console.error("Помилка завантаження кімнат:", xhr);
        dp.message("Помилка завантаження кімнат.");
      },
    });
  }

  function loadEvents() {
    var params = {
      start: dp.visibleStart().toString(),
      end: dp.visibleEnd().toString(),
    };
    $.ajax({
      url: config.urls.events,
      data: params,
      method: "GET",
      success: function (data) {
        dp.events.list = data;
        dp.update();
      },
      error: function (xhr) {
        console.error("Помилка завантаження бронювань:", xhr);
        dp.message("Помилка завантаження бронювань.");
      },
    });
    updateCurrentMonthDisplay();
  }

  function updateCurrentMonthDisplay() {
    $("#current-month-year").text(
      dp.startDate.toString("MMMM yyyy", dp.locale || "en-us")
    );
  }

  // --- Обробники подій DayPilot ---
  dp.onTimeRangeSelected = async function (args) {
    const { default: Swal } = await import(
      "https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js"
    );
    const { value: formValues } = await Swal.fire({
      title: "Нове бронювання",
      html:
        `<input id="swal-input-name" class="swal2-input" placeholder="Ім'я гостя" value="Гість">` +
        `<select id="swal-input-status" class="swal2-input">
                    <option value="New" selected>Нове</option>
                    <option value="Confirmed">Підтверджено</option>
                    <option value="Arrived">Прибув</option>
                 </select>` +
        `<input id="swal-input-paid" type="number" class="swal2-input" placeholder="Оплачено %" value="0" min="0" max="100">`,
      focusConfirm: false,
      preConfirm: () => {
        return {
          name: document.getElementById("swal-input-name").value,
          status: document.getElementById("swal-input-status").value,
          paid: parseInt(document.getElementById("swal-input-paid").value),
        };
      },
    });

    if (formValues) {
      const params = {
        start: args.start.toString(),
        end: args.end.toString(),
        room_id: args.resource,
        name: formValues.name, // Ім'я гостя
        status: formValues.status,
        paid: formValues.paid,
      };

      $.ajax({
        url: config.urls.createReservation,
        type: "POST",
        data: JSON.stringify(params),
        contentType: "application/json",
        success: function (response) {
          dp.events.add(
            new DayPilot.Event({
              start: args.start,
              end: args.end,
              id: response.id,
              resource: args.resource,
              text: response.name || params.name,
              name: response.name || params.name,
              status: response.status || params.status,
              paid: response.paid !== undefined ? response.paid : params.paid,
            })
          );
          dp.message(response.message || "Бронювання створено.");
        },
        error: function (xhr) {
          dp.message(
            "Помилка створення: " +
              (xhr.responseJSON ? xhr.responseJSON.error : xhr.responseText)
          );
        },
      });
    }
    dp.clearSelection();
  };

  dp.onEventClick = async function (args) {
    const eventData = args.e.data;
    const { default: Swal } = await import(
      "https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js"
    );
    const { value: formValues, isDenied: isDenied } = await Swal.fire({
      title: "Редагувати бронювання",
      html:
        `<input id="swal-input-name" class="swal2-input" value="${DayPilot.Util.escapeHtml(
          eventData.name || eventData.text || ""
        )}">` +
        `<select id="swal-input-status" class="swal2-input">
                    <option value="New" ${
                      eventData.status === "New" ? "selected" : ""
                    }>Нове</option>
                    <option value="Confirmed" ${
                      eventData.status === "Confirmed" ? "selected" : ""
                    }>Підтверджено</option>
                    <option value="Arrived" ${
                      eventData.status === "Arrived" ? "selected" : ""
                    }>Прибув</option>
                    <option value="CheckedOut" ${
                      eventData.status === "CheckedOut" ? "selected" : ""
                    }>Виїхав</option>
                    <option value="Expired" ${
                      eventData.status === "Expired" ? "selected" : ""
                    }>Прострочено</option>
                 </select>` +
        `<input id="swal-input-paid" type="number" class="swal2-input" value="${
          eventData.paid || 0
        }" min="0" max="100">`,
      focusConfirm: false,
      showDenyButton: true,
      denyButtonText: "Видалити",
      confirmButtonText: "Зберегти",
      preConfirm: () => {
        return {
          name: document.getElementById("swal-input-name").value,
          status: document.getElementById("swal-input-status").value,
          paid: parseInt(document.getElementById("swal-input-paid").value),
        };
      },
    });
    if (formValues) {
      const params = {
        id: eventData.id,
        name: formValues.name,
        status: formValues.status,
        paid: formValues.paid,
        start: args.e.start().toString(),
        end: args.e.end().toString(),
        room_id: args.e.resource(),
      };
      $.ajax({
        url: config.urls.updateReservation,
        type: "POST",
        data: JSON.stringify(params),
        contentType: "application/json",
        success: function (response) {
          args.e.data.name = params.name;
          args.e.data.text = params.name;
          args.e.data.status = params.status;
          args.e.data.paid = params.paid;
          dp.events.update(args.e);
          dp.message(response.message || "Бронювання оновлено.");
        },
        error: function (xhr) {
          dp.message(
            "Помилка оновлення: " +
              (xhr.responseJSON ? xhr.responseJSON.error : xhr.responseText)
          );
        },
      });
    } else if (isDenied) {
      Swal.fire({
        title: "Ви впевнені?",
        text:
          "Видалити бронювання для " +
          DayPilot.Util.escapeHtml(eventData.name || eventData.text) +
          "?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Так, видалити!",
        cancelButtonText: "Ні, скасувати",
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            url: config.urls.deleteReservation,
            type: "POST",
            data: JSON.stringify({ id: eventData.id }),
            contentType: "application/json",
            success: function (response) {
              dp.events.remove(args.e);
              dp.message(response.message || "Бронювання видалено.");
            },
            error: function (xhr) {
              dp.message(
                "Помилка видалення: " +
                  (xhr.responseJSON ? xhr.responseJSON.error : xhr.responseText)
              );
            },
          });
        }
      });
    }
  };

  dp.onEventMoved = function (args) {
    /* ... ваш існуючий код, що передає name/status/paid ... */
    const eventData = args.e.data;
    const params = {
      id: eventData.id,
      start: args.newStart.toString(),
      end: args.newEnd.toString(),
      room_id: args.newResource,
      name: eventData.name || eventData.text,
      status: eventData.status,
      paid: eventData.paid,
    };
    $.ajax({
      url: config.urls.updateReservation,
      type: "POST",
      data: JSON.stringify(params),
      contentType: "application/json",
      success: function (response) {
        dp.message(response.message || "Бронювання переміщено.");
        // Оновлюємо дані на клієнті, якщо сервер повернув їх
        if (response.name) {
          args.e.data.name = response.name;
          args.e.data.text = response.name;
        }
        if (response.status) args.e.data.status = response.status;
        if (response.paid !== undefined) args.e.data.paid = response.paid;
        dp.events.update(args.e);
      },
      error: function (xhr) {
        /* ... ваш код ... */
        dp.message(
          "Помилка переміщення: " +
            (xhr.responseJSON ? xhr.responseJSON.error : xhr.responseText)
        );
        loadEvents();
      },
    });
  };

  dp.onEventResized = function (args) {
    /* ... ваш існуючий код, що передає name/status/paid ... */
    const eventData = args.e.data;
    const params = {
      id: eventData.id,
      start: args.newStart.toString(),
      end: args.newEnd.toString(),
      room_id: args.e.resource(),
      name: eventData.name || eventData.text,
      status: eventData.status,
      paid: eventData.paid,
    };
    $.ajax({
      url: config.urls.updateReservation,
      type: "POST",
      data: JSON.stringify(params),
      contentType: "application/json",
      success: function (response) {
        dp.message(response.message || "Тривалість бронювання змінено.");
        if (response.name) {
          args.e.data.name = response.name;
          args.e.data.text = response.name;
        }
        // ...
        dp.events.update(args.e);
      },
      error: function (xhr) {
        /* ... ваш код ... */
        dp.message(
          "Помилка зміни тривалості: " +
            (xhr.responseJSON ? xhr.responseJSON.error : xhr.responseText)
        );
        loadEvents();
      },
    });
  };

  dp.onBeforeEventRender = function (args) {
    const data = args.data; // {id, text (ім'я гостя), name (ім'я гостя), start, end, resource, status, paid}

    if (data.status) {
      args.data.barColor = getEventColor(data.status);
    }

    const guestName = DayPilot.Util.escapeHtml(
      data.name || data.text || "Інформація відсутня"
    );
    const startDate = new DayPilot.Date(data.start);
    const endDate = new DayPilot.Date(data.end);
    const formattedDates = `(${startDate.toString(
      "M/d/yyyy"
    )} - ${endDate.toString("M/d/yyyy")})`;
    const reservationStatus = DayPilot.Util.escapeHtml(data.status || "N/A");
    const paidPercentage = data.paid !== undefined ? parseInt(data.paid) : 0;

    let eventHtml = `<div class='event-line event-guest-name'>${guestName}</div>`;
    eventHtml += `<div class='event-line event-dates'>${formattedDates}</div>`;
    eventHtml += `<div class='event-line event-res-status'>${reservationStatus}</div>`;

    eventHtml += "<div class='event-paid-container'>";
    eventHtml += `<div class='event-paid-bar' style='width: ${paidPercentage}%;'></div>`;
    eventHtml += "</div>";
    eventHtml += `<div class='event-line event-paid-text'>Оплачено: ${paidPercentage}%</div>`;

    args.data.html = eventHtml;

    if (!args.data.bubbleHtmlCustom) {
      args.data.bubbleHtml =
        `<b>${guestName}</b><br>` +
        `Період: ${formattedDates}<br>` +
        `Статус: ${reservationStatus}<br>` +
        `Оплачено: ${paidPercentage}%`;
    }
  };

  function getEventColor(status) {
    switch (status ? status.toLowerCase() : "") {
      case "new":
        return "#f39c12";
      case "confirmed":
        return "#2ecc71";
      case "arrived":
        return "#3498db";
      case "checkedout":
        return "#777777";
      case "expired":
        return "#e74c3c";
      default:
        return "#bdc3c7";
    }
  }

  $("#capacity-filter").on("change", function () {
    /* ... ваш код ... */ var capacity = $(this).val();
    loadResources(capacity);
  });
  $("#add-room-btn").on("click", async function () {
    /* ... ваш код ... */ const { default: Swal } = await import(
      "https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js"
    );
    const { value: formValues } = await Swal.fire({
      /* ... */ title: "Додати нову кімнату",
      html:
        '<input id="swal-room-name" class="swal2-input" placeholder="Назва кімнати">' +
        '<input id="swal-room-capacity" type="number" class="swal2-input" placeholder="Місткість" min="1">' +
        '<select id="swal-room-status" class="swal2-input">' +
        '  <option value="Ready" selected>Готова</option>' +
        '  <option value="Cleanup">Прибирання</option>' +
        '  <option value="Dirty">Брудна</option>' +
        "</select>",
      focusConfirm: false,
      preConfirm: () => {
        /* ... */
        return {
          name: document.getElementById("swal-room-name").value,
          capacity: parseInt(
            document.getElementById("swal-room-capacity").value
          ),
          status: document.getElementById("swal-room-status").value,
        };
      },
    });

    if (formValues) {
      if (
        !formValues.name ||
        isNaN(formValues.capacity) ||
        formValues.capacity <= 0
      ) {
        Swal.fire(
          "Помилка",
          "Будь ласка, заповніть назву та місткість (більше 0).",
          "error"
        );
        return;
      }

      $.ajax({
        url: config.urls.createRoom,
        type: "POST",
        data: JSON.stringify(formValues),
        contentType: "application/json",
        success: function (response) {
          loadResources($("#capacity-filter").val()); // Перезавантажити ресурси
          dp.message(response.message || "Кімнату додано.");
        },
        error: function (xhr) {
          Swal.fire(
            "Помилка",
            xhr.responseJSON
              ? xhr.responseJSON.error
              : "Не вдалося додати кімнату.",
            "error"
          );
        },
      });
    }
  });
  $("#prev-month-btn").on("click", function () {
    dp.startDate = dp.startDate.addMonths(-1);
    dp.days = dp.startDate.daysInMonth();
    loadEvents();
    updateCurrentMonthDisplay();
  });
  $("#next-month-btn").on("click", function () {
    dp.startDate = dp.startDate.addMonths(1);
    dp.days = dp.startDate.daysInMonth();
    loadEvents();
    updateCurrentMonthDisplay();
  });

  dp.init();
  loadResources($("#capacity-filter").val());
  updateCurrentMonthDisplay();
});
