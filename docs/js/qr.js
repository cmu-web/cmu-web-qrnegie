// The builder: the preview follows the form as it changes, and the page's own
// address keeps the form's options (text, style, size, as in an image
// address), so a builder link opens with the same code.
(function () {
  "use strict";
  var byId = function (id) {
    return document.getElementById(id);
  };
  var form = byId("qr-qr-form"),
    status = byId("qr-status"),
    text = byId("qr-qr-text"),
    style = byId("qr-qr-style"),
    size = byId("qr-qr-size"),
    preview = byId("qr-qr-preview"),
    qrUrls,
    latest = 0,
    typing;

  // Each style has its own starting text, on its option (data-text)
  var startingText = function () {
    return style.options[style.selectedIndex].dataset.text || "";
  };

  // Options from the address, where they name an option the form has; with
  // no text there, the style's own
  var start = new URLSearchParams(location.search);
  [style, size].forEach(function (select) {
    var wanted = start.get(select.name);
    if (
      Array.from(select.options).some(function (option) {
        return option.value === wanted;
      })
    )
      select.value = wanted;
  });
  // Blank text means the style's own, shown as the placeholder
  text.value = start.get("text") || "";
  text.placeholder = startingText();
  var encoded = function () {
    return text.value.trim() ? text.value : startingText();
  };

  function describeStyle() {
    var artistic = ["mosaic", "kraus-campo", "wean", "binary-heart", "tilted-square"].includes(
      style.value,
    );
    byId("qr-size-hint").textContent = artistic
      ? "Start with 1024 pixels so the artwork has room. More text can require a larger export."
      : "Choose the size for your layout. More text can require a larger export.";
    size.querySelector('option[value="256"]').disabled = artistic;
    if (artistic && size.value === "256") size.value = "1024";
  }
  // Errors, and a notice when the builder changes a choice; a working
  // preview needs no message
  function message(text, kind) {
    status.className = text ? "cmu-flash cmu-flash--" + (kind || "error") : "";
    status.setAttribute("role", text && kind !== "notice" ? "alert" : "status");
    status.textContent = text || "";
  }
  var notice = "";
  async function download(url, name) {
    var response = await fetch(url);
    if (!response.ok) throw new Error(await response.text());
    var blobUrl = URL.createObjectURL(await response.blob());
    var link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  }
  var escape = function (s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  };
  // The encoded text as plain text that wraps: a long URL has no spaces, so
  // it may break after / ? & = . or -, marked with <wbr>, which isn't copied.
  // Its own line breaks, as in a contact card, stay line breaks.
  function showText(element, value) {
    element.textContent = "";
    value.split(/\r?\n/).forEach(function (line, n) {
      if (n) element.appendChild(document.createElement("br"));
      line.split(/(?<=[/?&=.-])/).forEach(function (part, i) {
        if (i) element.appendChild(document.createElement("wbr"));
        element.appendChild(document.createTextNode(part));
      });
    });
  }
  // What the code holds, for alt text: a contact card by its name
  function describe(value) {
    var card = /^BEGIN:VCARD/i.test(value) && value.match(/^FN:(.*)$/im);
    return card ? "a contact card: " + card[1].trim() : value;
  }
  function show(visible) {
    preview.hidden = !visible;
    byId("qr-qr-preview-label").hidden = !visible;
    byId("qr-qr-actions").hidden = !visible;
    byId("qr-qr-encodes").hidden = !visible;
  }

  async function update() {
    var request = ++latest,
      value = encoded(),
      params = new URLSearchParams({ text: value, style: style.value, size: size.value }),
      // The page's address keeps typed text only; blank stays the style's own
      state = new URLSearchParams({ style: style.value, size: size.value });
    if (text.value.trim()) state.set("text", text.value);
    history.replaceState(null, "", "?" + state);
    var urls = {
      svg: location.origin + "/qr.svg?" + params,
      png: location.origin + "/qr.png?" + params,
    };
    try {
      var response = await fetch(urls.svg);
      if (!response.ok) throw new Error(await response.text());
      var image = await response.blob();
      // A slow response for options that have since changed is dropped
      if (request !== latest) return;
      qrUrls = urls;
      // The fetched image itself, so the server draws each code once
      if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
      preview.src = URL.createObjectURL(image);
      preview.alt = style.options[style.selectedIndex].text + " QR code for " + describe(value);
      showText(byId("qr-qr-destination"), value);
      byId("qr-qr-url").textContent = urls.svg;
      byId("qr-qr-html").textContent =
        '<img src="' +
        escape(urls.svg) +
        '" alt="QR code for ' +
        escape(describe(value)) +
        '" width="' +
        size.value +
        '" height="' +
        size.value +
        '" />';
      show(true);
      message(notice, "notice");
      notice = "";
    } catch (error) {
      if (request !== latest) return;
      // Too small for this text: the smallest size here that fits, if any
      var needed = /Choose a size from (\d+)/.exec(error.message),
        fits =
          needed &&
          Array.from(size.options).find(function (option) {
            return !option.disabled && +option.value >= +needed[1];
          });
      if (fits && fits.value !== size.value) {
        size.value = fits.value;
        notice =
          "Size changed to " + fits.text.toLowerCase() + ", the smallest here that fits this text.";
        update();
        return;
      }
      show(false);
      message(error.message);
    }
  }

  style.addEventListener("change", function () {
    // The style's own text, unless someone has typed theirs; text that's
    // just the last style's own, as from an older link, goes back to blank
    if (text.value === text.placeholder) text.value = "";
    text.placeholder = startingText();
    describeStyle();
    update();
  });
  size.addEventListener("change", update);
  // Typing waits for a pause
  text.addEventListener("input", function () {
    clearTimeout(typing);
    typing = setTimeout(update, 500);
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    update();
  });
  ["png", "svg"].forEach(function (format) {
    byId("qr-qr-" + format).addEventListener("click", function () {
      download(qrUrls[format], "qr-code." + format).catch(function (error) {
        message(error.message);
      });
    });
  });

  describeStyle();
  update();
})();
