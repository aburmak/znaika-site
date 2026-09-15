/* ============================================================
   Школа «Знайка» — объединённый сайт поступления в школу
   jQuery + jQuery UI (Практическая работа №1)
   Методы jQuery: .ready() .addClass() .click() .find() .css()
                  .filter() .toggleClass() .attr() .prop()
                  .trigger() .hide() .show() .append() .html()
   Компоненты jQuery UI: Tabs · Accordion · Datepicker ·
                          Tooltip · Dialog · Progressbar
   Отправка анкеты — напрямую в CRM Bitrix24 (crm.site.form.fill)
   ============================================================ */

$(document).ready(function () {

  /* ---------- 1. Шапка: тень при прокрутке (.addClass / .toggleClass) ---------- */
  $(window).on("scroll", function () {
    if ($(this).scrollTop() > 40) {
      $("#siteHeader").addClass("scrolled");
      $(".topbar").hide();
    } else {
      $("#siteHeader").removeClass("scrolled");
      $(".topbar").show();
    }
  });

  /* ---------- 2. Мобильное меню (.click / .toggleClass / .attr) ---------- */
  $("#navToggle").on("click", function () {
    var nav = $("#mainNav");
    nav.toggleClass("open");
    var open = nav.hasClass("open");
    $(this).attr("aria-expanded", open);
    $(this).html(open ? "✕" : "☰");
  });

  /* ---------- 3. jQuery UI Tabs (виджет) ---------- */
  if ($("#postupl-tabs").length) {
    var startTab = 0;
    var hash = window.location.hash;
    if (hash) {
      /* открываем нужную вкладку при переходе по якорю (#stoimost, #docs, #etapy) */
      var link = $("#postupl-tabs ul li a[href='" + hash + "']");
      if (link.length) {
        startTab = link.parent().index();
      }
    }
    $("#postupl-tabs").tabs({
      active: startTab,
      activate: function () { $(window).trigger("scroll"); }
    });
  }

  /* ---------- 4. jQuery UI Accordion (виджет) для FAQ ---------- */
  if ($("#faq-accordion").length) {
    $("#faq-accordion").accordion({
      collapsible: true,
      heightStyle: "content",
      active: false
    });
  }

  /* ---------- 5. jQuery UI Datepicker (виджет) ---------- */
  if ($("#dob").length) {
    $("#dob").datepicker({
      changeYear: true,
      changeMonth: true,
      yearRange: "-18:+0",
      dateFormat: "dd.mm.yy",
      defaultDate: "-10y",
      onSelect: function (dt) { $(this).addClass("filled"); }
    });
    $("#dob").attr("placeholder", "нажмите, чтобы выбрать дату");
  }
  if ($("#cf_date").length) {
    $("#cf_date").datepicker({
      minDate: 0,
      dateFormat: "dd.mm.yy",
      onSelect: function () { $(this).addClass("filled"); }
    });
    $("#cf_date").attr("placeholder", "нажмите, чтобы выбрать дату");
  }

  /* ---------- 6. jQuery UI Tooltip (виджет) ---------- */
  $("[title]").tooltip({
    position: { my: "center bottom-8", at: "center top" }
  });

  /* ---------- 7. Появление блоков при прокрутке ---------- */
  function checkReveal() {
    var winBottom = $(window).scrollTop() + $(window).height();
    $(".reveal").each(function () {
      var top = $(this).offset().top;
      if (top < winBottom - 60) {
        $(this).addClass("show");
      }
    });
  }
  $(window).on("scroll", checkReveal);
  checkReveal();

  /* ---------- 8. Анимация счётчиков и полос статистики (.css / .attr / .find / .html) ---------- */
  function animateStats() {
    $("#stats").find(".num").each(function () {
      var el = $(this);
      var target = parseInt(el.attr("data-count"), 10);
      var height = $(window).scrollTop() + $(window).height();
      if (el.data("done") === true) { return; }
      if (el.offset().top < height - 80) {
        el.data("done", true);
        var start = 0;
        var step = Math.max(1, Math.round(target / 60));
        var timer = setInterval(function () {
          start += step;
          if (start >= target) { start = target; clearInterval(timer); }
          el.html(start.toLocaleString("ru-RU"));
        }, 30);
      }
    });
    $("#stats").find(".fill").each(function () {
      var el = $(this);
      var fill = parseInt(el.attr("data-fill"), 10);
      var height = $(window).scrollTop() + $(window).height();
      if (el.data("done") === true) { return; }
      if (el.offset().top < height - 80) {
        el.data("done", true);
        el.css({ width: fill + "%" });
      }
    });
  }
  $(window).on("scroll", animateStats);
  animateStats();

  /* ---------- 9. Фото-галерея: счётчик и подписи (.prepend / .append / .find / .attr) ---------- */
  if ($("#gallery").length) {
    var count = 0;
    $("#gallery figure").each(function () {
      count++;
      $(this).find("figcaption").prepend("📷 ");
      $(this).append("<span class='g-count'>" + count + "</span>");
    });
  }

  /* ---------- 10. Анкета: прямая отправка в Bitrix24 ---------- */

  /* Проверка обязательных полей (.filter / .prop) */
  function validate(selector) {
    var ok = true;
    $(selector).each(function () {
      var el = $(this);
      if (el.is(":checkbox")) {
        if (!el.prop("checked")) { ok = false; el.addClass("field-error"); }
        else { el.removeClass("field-error"); }
      } else if (el.is("input[type=file]")) {
        if (!el[0].files || !el[0].files[0]) { ok = false; el.addClass("field-error"); }
        else { el.removeClass("field-error"); }
      } else {
        if (!el.val() || el.val().trim() === "") { ok = false; el.addClass("field-error"); }
        else { el.removeClass("field-error"); }
      }
    });
    return ok;
  }

  /* jQuery UI Dialog (виджет) — общее сообщение */
  function showDialog(title, text) {
    $("<div>" + text + "</div>").dialog({
      title: title,
      modal: true,
      resizable: false,
      width: 440,
      dialogClass: "b24-dialog",
      buttons: [
        {
          text: "Закрыть",
          click: function () { $(this).dialog("close"); }
        }
      ]
    });
  }

  /* Константы формы Bitrix24 (id 23) */
  var B24 = {
    address: "https://b24-ll39bk.bitrix24.ru",
    uploadParam: "action=crm.site.fileUploader.upload",
    fillParam: "action=crm.site.form.fill",
    controller: "crm.fileUploader.siteFormFileUploaderController",
    id: "23",
    sec: "eiogx2"
  };

  /* Официальное сообщение успеха Bitrix24 */
  var SUCCESS_MSG = "Спасибо, ваше заявление принято к рассмотрению." +
    "<br>В течение 5 рабочих дней, вам будет отправлена квитанция на оплату на указанный email";

  /* jQuery UI Dialog — сообщение об успехе */
  function successDialog(text) {
    $("<div>" + text + "</div>").dialog({
      title: "Заявление отправлено",
      modal: true,
      resizable: false,
      width: 460,
      dialogClass: "success-dialog",
      close: function () { $(this).dialog("destroy"); },
      buttons: [
        {
          text: "Готово",
          click: function () { $(this).dialog("close"); }
        }
      ]
    });
  }

  /* Загрузка одного файла в хранилище формы → данные.token */
  function b24UploadFile(fieldName, file) {
    var dfd = $.Deferred();
    var opts = JSON.stringify({
      formId: B24.id,
      secCode: B24.sec,
      fieldId: fieldName,
      fieldsSize: (function () { var m = {}; m[fieldName] = file.size; return m; })()
    });
    var url = B24.address + "/bitrix/services/main/ajax.php?" + B24.uploadParam +
      "&controller=" + B24.controller +
      "&token=0&controllerOptions=" + encodeURIComponent(opts);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-Upload-Content-Name", encodeURIComponent(file.name));
    xhr.setRequestHeader("Crm-Webform-Cors", "Y");
    xhr.setRequestHeader("Content-Range", "bytes 0-" + (file.size - 1) + "/" + file.size);
    xhr.onload = function () {
      try {
        var res = JSON.parse(xhr.responseText);
        if (res && res.status === "success" && res.data && res.data.token) {
          dfd.resolve(res.data.token);
        } else {
          var msg = (res.errors && res.errors[0] && res.errors[0].message) || ("Не удалось загрузить файл «" + file.name + "».");
          dfd.reject(msg);
        }
      } catch (e) {
        dfd.reject("Ошибка ответа сервера при загрузке файла «" + file.name + "».");
      }
    };
    xhr.onerror = function () {
      dfd.reject("Ошибка сети при загрузке файла «" + file.name + "» (проверьте интернет или откройте сайт через HTTP, а не file://).");
    };
    xhr.send(file);
    return dfd.promise();
  }

  /* Отправка всей анкеты в CRM: создание лида */
  function b24Fill(values, consents, onProgress) {
    var dfd = $.Deferred();
    var fd = new FormData();
    fd.append("id", B24.id);
    fd.append("sec", B24.sec);
    fd.append("lang", "ru");
    fd.append("trace", "");
    fd.append("entities", "[]");
    fd.append("security_sign", "");
    fd.append("properties", "{}");
    fd.append("consents", JSON.stringify(consents));
    fd.append("recaptcha", "");
    fd.append("yandexSmartCaptcha", "");
    fd.append("timeZoneOffset", new Date().getTimezoneOffset());
    fd.append("values", JSON.stringify(values));
    $.ajax({
      url: B24.address + "/bitrix/services/main/ajax.php?" + B24.fillParam,
      type: "POST",
      data: fd,
      processData: false,
      contentType: false,
      timeout: 60000,
      xhrFields: { withCredentials: true },
      xhr: function () {
        var xhr = $.ajaxSettings.xhr();
        if (onProgress && xhr.upload) {
          xhr.upload.addEventListener("progress", onProgress, false);
        }
        return xhr;
      },
      success: function (res) {
        if (res && res.result && typeof res.result.resultId !== "undefined") {
          dfd.resolve(res.result);
        } else if (res && res.error) {
          dfd.reject(res.error_description || JSON.stringify(res.error));
        } else {
          dfd.reject("Некорректный ответ сервера. Попробуйте ещё раз.");
        }
      },
      error: function (xhr) {
        var detail = "";
        if (xhr.status === 0) {
          detail = "Браузер заблокировал запрос (CORS/сеть). Сайт открыт по file://? Попробуйте открыть его через HTTP.";
        } else {
          try {
            var raw = JSON.parse(xhr.responseText);
            detail = raw && raw.error ? (raw.error_description || JSON.stringify(raw.error)) : ("HTTP " + xhr.status);
          } catch (e) {
            detail = "HTTP " + xhr.status + " (" + xhr.statusText + ")";
          }
        }
        dfd.reject({ status: xhr.status, message: detail });
      }
    });
    return dfd.promise();
  }

  /* Фолбэк: отправка анкеты скрытой HTML-формой (без файлов).
     Кросс-доменная отправка формы не требует CORS, поэтому лид создаётся
     даже если браузер блокирует ответ XHR из file://. */
  function b24FillFallback(values, consents) {
    var url = B24.address + "/bitrix/services/main/ajax.php?" + B24.fillParam;
    $("#b24HiddenFrame").remove();
    $("<iframe>", { id: "b24HiddenFrame", name: "b24HiddenFrame", style: "display:none" }).appendTo("body");
    var $f = $("<form>", {
      method: "post",
      action: url,
      target: "b24HiddenFrame",
      style: "display:none"
    });
    var fields = {
      id: B24.id,
      sec: B24.sec,
      lang: "ru",
      trace: "",
      entities: "[]",
      security_sign: "",
      properties: "{}",
      consents: JSON.stringify(consents),
      recaptcha: "",
      yandexSmartCaptcha: "",
      timeZoneOffset: new Date().getTimezoneOffset(),
      values: JSON.stringify(values)
    };
    for (var k in fields) {
      if (fields.hasOwnProperty(k)) {
        $("<input>", { type: "hidden", name: k, value: fields[k] }).appendTo($f);
      }
    }
    $f.appendTo("body").submit();
    setTimeout(function () { $f.remove(); }, 5000);
  }

  /* Отправка через локальный PHP-прокси b24proxy.php (тот же Origin).
     Сервер сам загружает файлы в Bitrix24 и заполняет форму — CORS не нужен. */
  function b24TryProxy(values, files, consents) {
    var dfd = $.Deferred();
    var fd = new FormData();
    fd.append("id", B24.id);
    fd.append("sec", B24.sec);
    fd.append("lang", "ru");
    fd.append("trace", "");
    fd.append("entities", "[]");
    fd.append("security_sign", "");
    fd.append("properties", "{}");
    fd.append("consents", JSON.stringify(consents));
    fd.append("recaptcha", "");
    fd.append("yandexSmartCaptcha", "");
    fd.append("timeZoneOffset", new Date().getTimezoneOffset());
    fd.append("values", JSON.stringify(values));
    for (var i = 0; i < files.length; i++) {
      fd.append("file_field[]", files[i].field);
      fd.append("file_upload[]", files[i].file, files[i].file.name);
    }
    $.ajax({
      url: "b24proxy.php",
      type: "POST",
      data: fd,
      processData: false,
      contentType: false,
      timeout: 120000,
      success: function (res) {
        if (res && res.result && typeof res.result.resultId !== "undefined") {
          dfd.resolve(res.result);
        } else if (res && res.status === "error" && res.errors && res.errors[0]) {
          dfd.reject({ status: -2, message: res.errors[0].message });
        } else {
          dfd.reject({ status: -2, message: "Некорректный ответ сервера. Попробуйте ещё раз." });
        }
      },
      error: function (xhr) {
        dfd.reject({ status: xhr.status, unavailable: true, message: "HTTP " + xhr.status });
      }
    });
    return dfd.promise();
  }

  /* Прямая отправка через XHR (используется, если прокси недоступен) */
  function b24SubmitDirect(values, files, consents, finishSuccess, $btn) {
    var uploadJob = $.Deferred();
    if (files.length === 0) {
      uploadJob.resolve({});
    } else {
      var tokens = {};
      (function next(i) {
        if (i >= files.length) {
          uploadJob.resolve(tokens);
          return;
        }
        var job = files[i];
        b24UploadFile(job.field, job.file)
          .done(function (token) {
            tokens[job.field] = {
              name: job.file.name,
              size: job.file.size,
              type: job.file.type || "application/octet-stream",
              token: token,
              content: ""
            };
            $("#sendBar").progressbar("option", "value", Math.round((i + 1) / files.length * 60));
            next(i + 1);
          })
          .fail(function (msg) {
            uploadJob.reject(msg);
          });
      })(0);
    }

    uploadJob.done(function (fileVals) {
      for (var field in fileVals) {
        values[field] = [fileVals[field]];
      }
      b24Fill(values, consents, function (ev) {
        if (ev.lengthComputable) {
          $("#sendBar").progressbar("option", "value", 60 + Math.round(ev.loaded / ev.total * 40));
        }
      })
        .done(function (result) {
          finishSuccess(result);
        })
        .fail(function (err) {
          $("#sendProgress").hide();
          $btn.prop("disabled", false);
          var status = typeof err === "object" ? err.status : -1;
          var text = typeof err === "object" ? err.message : err;
          if (status === 0) {
            var consentsNoFile = {};
            if ($("#ankConsent").prop("checked")) { consentsNoFile.AGREEMENT_1 = "Y"; }
            b24FillFallback(values, consentsNoFile);
            successDialog(SUCCESS_MSG +
              "<p style='margin-top:12px; color:#8a93a6; font-size:13px;'>Заявление передано в CRM. Так как браузер не позволил проверить ответ, откройте сайт через HTTP (http://127.0.0.1:8000) и отправьте ещё раз." +
              (files.length ? " При неудаче пришлите скан-копии на school@znaika-school.ru." : "") + "</p>");
            $("#anketaForm")[0].reset();
            $("#anketaForm .file-name").text("Файл не выбран");
          } else {
            showDialog("Ошибка отправки",
              text + "<br><br>Если ошибка повторяется — отправьте заявление без файлов, а скан-копии документов пришлите на <b>school@znaika-school.ru</b>.");
          }
        });
    }).fail(function (msg) {
      $("#sendProgress").hide();
      $btn.prop("disabled", false);
      showDialog("Ошибка загрузки файла",
        msg + "<br><br>Вы можете отправить заявление без файлов и указать ссылку на документы в поле «Ссылка на скачивание документов», либо отправить скан-копии на <b>school@znaika-school.ru</b>.");
    });
  }

  /* Анкета на странице «Заявление» */
  if ($("#anketaForm").length) {
    var $bar = $("#sendBar");
    if ($bar.length) {
      $bar.progressbar({ value: 0 });
    }

    /* подстановка имени выбранного файла рядом с кнопкой (.text) */
    $(document).on("change", ".file-input", function () {
      var name = $(this)[0].files && $(this)[0].files[0] ? $(this)[0].files[0].name : "Файл не выбран";
      $(this).parent().find(".file-name").text(name);
    });

    $("#anketaForm").on("submit", function (e) {
      e.preventDefault();
      if (!validate("#anketaForm input[required], #anketaForm select[required]")) {
        showDialog("Заполните обязательные поля",
          "Заполните, пожалуйста, все обязательные поля, отмеченные <b>*</b>, и приложите обязательные файлы, а также отметьте согласие на обработку персональных данных.");
        return false;
      }

      var $btn = $("#ankSubmit");
      $btn.prop("disabled", true);
      $("#sendProgress").show();
      $("#sendBar").progressbar("option", "value", 0);

      /* текстовые поля и списки: имя поля → массив значений */
      var values = {};
      $("#anketaForm input.text-val, #anketaForm select.text-val").each(function () {
        var el = $(this);
        var val = (el.val() || "").trim();
        values[el.attr("name")] = val ? [val] : [];
      });

      /* файлы */
      var files = [];
      $("#anketaForm input[type=file]").each(function () {
        if (this.files && this.files[0]) {
          files.push({ field: this.name, file: this.files[0] });
        }
      });

      var consents = {};
      if ($("#ankConsent").prop("checked")) {
        consents.AGREEMENT_1 = "Y";
      }

      function finishSuccess(result) {
        $("#sendBar").progressbar("option", "value", 100);
        $("#sendProgress").hide();
        $btn.prop("disabled", false);
        var msg = (result.message || SUCCESS_MSG).replace(/\n/g, "<br>").replace(/^\s+/, "");
        msg += "<p style='margin-top:12px; color:#8a93a6; font-size:13px;'>Номер обращения в CRM: " + result.resultId + ".</p>";
        successDialog(msg);
        $("#anketaForm")[0].reset();
        $("#anketaForm .file-name").text("Файл не выбран");
      }

      /* сначала пробуем локальный PHP-прокси, при его отсутствии — прямая отправка */
      b24TryProxy(values, files, consents)
        .done(function (result) {
          finishSuccess(result);
        })
        .fail(function (err) {
          if (err && err.unavailable) {
            b24SubmitDirect(values, files, consents, finishSuccess, $btn);
          } else {
            $("#sendProgress").hide();
            $btn.prop("disabled", false);
            showDialog("Ошибка отправки",
              (err && err.message ? err.message : "Не удалось отправить заявление.") +
              "<br><br>Если ошибка повторяется — отправьте заявление без файлов, а скан-копии документов пришлите на <b>school@znaika-school.ru</b>.");
          }
        });
      return false;
    });
  }

  /* Предзаполнение анкеты из GET-параметров (?name=&phone=&email=) */
  (function prefillAnketa() {
    if (!$("#anketaForm").length) { return; }
    function getParam(name) {
      var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
      return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
    }
    var fullName = getParam("name");
    if (fullName) {
      var parts = fullName.split(/\s+/);
      if (parts[0]) { $("#anketaForm input[name=CONTACT_LAST_NAME]").val(parts[0]); }
      if (parts[1]) { $("#anketaForm input[name=CONTACT_NAME]").val(parts[1]); }
      if (parts[2]) { $("#anketaForm input[name=CONTACT_SECOND_NAME]").val(parts[2]); }
    }
    var phone = getParam("phone");
    if (phone) { $("#anketaForm input[name=CONTACT_PHONE]").val(phone); }
    var email = getParam("email");
    if (email) { $("#anketaForm input[name=CONTACT_EMAIL]").val(email); }
  })();

  /* Форма на странице «Контакты» — открывает анкету с подставленными данными */
  if ($("#contactForm").length) {
    $("#contactForm").on("submit", function (e) {
      e.preventDefault();
      if (!validate("#contactForm input[required], #contactForm select[required]")) {
        showDialog("Заполните обязательные поля",
          "Пожалуйста, укажите имя, телефон и отметьте согласие на обработку персональных данных.");
        return false;
      }
      var name = ($("#cf_name").val() || "").trim();
      var phone = ($("#cf_phone").val() || "").trim();
      var email = ($("#cf_email").val() || "").trim();
      var url = "zayavlenie.html?name=" + encodeURIComponent(name) + "&phone=" + encodeURIComponent(phone);
      if (email) { url += "&email=" + encodeURIComponent(email); }
      $("#contactNote").show();
      window.location.href = url;
      return false;
    });
  }

  /* Форма в подвале — открывает анкету с подставленными данными */
  if ($("#footerForm").length) {
    $("#footerForm").on("submit", function (e) {
      e.preventDefault();
      if (!validate("#footerForm input[required]")) {
        showDialog("Заполните обязательные поля", "Пожалуйста, укажите имя и телефон, отмеченные <b>*</b>.");
        return false;
      }
      var name = ($("#qf_name").val() || "").trim();
      var phone = ($("#qf_phone").val() || "").trim();
      /* имя из формы может содержать несколько слов → передаём целиком, анкета разобьёт сама */
      window.location.href = "zayavlenie.html?name=" + encodeURIComponent(name) + "&phone=" + encodeURIComponent(phone);
      return false;
    });
  }

  /* ---------- 11. Фоновая ошибка полей: очистка при вводе ---------- */
  $(document).on("keyup change", ".field input, .field select, .field textarea, .fq-form input", function () {
    $(this).removeClass("field-error");
  });

});

/* ---------- Кнопка "Наверх" + копирование телефона ---------- */
$(document).ready(function () {
  var toTop = $("#toTop");
  function onScroll() {
    if ($(window).scrollTop() > 480) {
      toTop.addClass("show");
    } else {
      toTop.removeClass("show");
    }
  }
  $(window).on("scroll", onScroll);
  onScroll();
  toTop.on("click", function () {
    $("html, body").animate({ scrollTop: 0 }, 600);
  });

  $(document).on("click", ".copy-phone", function (e) {
    e.preventDefault();
    var text = $(this).text().trim().replace(/[()\- ]/g, "");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied($(this));
      });
    } else {
      var ta = $("<textarea>").val(text).appendTo("body").select();
      try { document.execCommand("copy"); } catch (err) {}
      ta.remove();
      showCopied($(this));
    }
    function showCopied(self) {
      var t = self.data("origTitle") || self.attr("title");
      if (!self.data("origTitle")) self.data("origTitle", t);
      self.attr("title", "Скопировано!");
      setTimeout(function () { self.attr("title", self.data("origTitle")); }, 1800);
    }
  });
});

