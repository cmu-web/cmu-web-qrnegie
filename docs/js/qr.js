// The builder: the preview follows the form as it changes, and the page's own
// address keeps the form's options (its content type and fields, style
// and width), so a builder link opens with the same code.
(function () {
  "use strict";
  var byId = function (id) {
    return document.getElementById(id);
  };
  var form = byId("qr-qr-form"),
    status = byId("qr-status"),
    kind = byId("qr-kind"),
    text = byId("qr-qr-text"),
    style = byId("qr-qr-style"),
    width = byId("qr-qr-width"),
    wifi = byId("qr-wifi-network"),
    above = byId("qr-above"),
    below = byId("qr-below"),
    icon = byId("qr-icon"),
    preview = byId("qr-qr-preview"),
    qrUrls,
    latest = 0,
    lastValue = "",
    typing;

  // The fields of one kind, in its group (data-kind); Link or Text's text box
  // is handled on its own
  var fieldsOf = function (name) {
    var group = form.querySelector('[data-kind="' + name + '"]');
    return name === "text" ? [] : Array.from(group.querySelectorAll("input, select, textarea"));
  };
  var allFields = Array.from(kind.options).flatMap(function (option) {
    return fieldsOf(option.value);
  });
  // A field's value, or with every field of its kind blank, its placeholder,
  // so an empty form still shows a working example
  var value = function (name) {
    var field = form.elements[name],
      blank = fieldsOf(kind.value).every(function (other) {
        return other.tagName === "SELECT" || !other.value.trim();
      });
    return field.value.trim() || (blank ? field.placeholder || "" : "");
  };

  // Each style has its own starting text, on its option (data-text)
  var startingText = function () {
    return style.options[style.selectedIndex].dataset.text || "";
  };
  // Center Icon's icon, when left blank: one for the content type
  var kindIcons = {
    text: "link-45deg",
    contact: "person-vcard",
    event: "calendar-event",
    email: "envelope",
    phone: "telephone",
    map: "geo-alt",
    wifi: "wifi",
  };
  var iconNames = [],
    loadingIcons;
  function describeIcon() {
    byId("qr-icon-field").hidden = style.value !== "icon";
    icon.placeholder = kindIcons[kind.value];
    // The names to choose from, the first time they're wanted
    if (style.value === "icon" && !loadingIcons)
      loadingIcons = fetch("icons.json")
        .then(function (response) {
          return response.json();
        })
        .then(function (names) {
          iconNames = names;
        })
        .catch(function () {
          loadingIcons = undefined;
        });
  }
  // Up to eight names with the typed text, those that start with it first,
  // in the kit's suggestion list (cmu-suggest)
  function suggestIcons() {
    var typed = icon.value.trim().toLowerCase(),
      matches = typed
        ? iconNames.filter(function (name) {
            return name.includes(typed) && name !== typed;
          })
        : [];
    matches.sort(function (a, b) {
      return (b.startsWith(typed) ? 1 : 0) - (a.startsWith(typed) ? 1 : 0);
    });
    byId("qr-icon-names").replaceChildren.apply(
      byId("qr-icon-names"),
      matches.slice(0, 8).map(function (name) {
        // The icon, then its name with the typed part in bold (the kit
        // bolds plain options only)
        var option = document.createElement("li"),
          at = name.indexOf(typed),
          strong = document.createElement("strong");
        strong.textContent = name.slice(at, at + typed.length);
        option.dataset.value = name;
        option.append(glyph(name), " " + name.slice(0, at), strong, name.slice(at + typed.length));
        return option;
      }),
    );
  }
  // A Bootstrap Icons glyph from the font, for the suggestions and the picker
  function glyph(name) {
    var i = document.createElement("i");
    i.className = "bi bi-" + name;
    i.setAttribute("aria-hidden", "true");
    return i;
  }
  // The names that match the search, those that start with it first
  function iconMatches(typed) {
    var matches = typed
      ? iconNames.filter(function (name) {
          return name.includes(typed);
        })
      : iconNames.slice();
    if (typed)
      matches.sort(function (a, b) {
        return (b.startsWith(typed) ? 1 : 0) - (a.startsWith(typed) ? 1 : 0);
      });
    return matches;
  }

  // Browse Icons: a dialog with a search field and a grid of icons (the
  // kit's choice grid). It opens on a starter set; a search covers them all,
  // showing the first 120 matches.
  var STARTER_ICONS = [
    "link-45deg",
    "globe2",
    "person-vcard",
    "calendar-event",
    "envelope",
    "telephone",
    "geo-alt",
    "wifi",
    "building",
    "mortarboard",
    "book",
    "journal-text",
    "megaphone",
    "music-note-beamed",
    "palette",
    "trophy",
    "heart",
    "star",
    "camera",
    "film",
    "mic",
    "cup-hot",
    "bicycle",
    "bus-front",
    "info-circle",
    "question-circle",
    "clipboard-check",
    "ticket-perforated",
  ];
  var iconDialog = byId("qr-icon-dialog"),
    iconSearch = byId("qr-icon-search"),
    iconGrid = byId("qr-icon-grid"),
    iconPicked = "",
    ICON_LIMIT = 120;
  function showIcons() {
    var typed = iconSearch.value.trim().toLowerCase(),
      matches = typed ? iconMatches(typed) : STARTER_ICONS,
      shown = matches.slice(0, ICON_LIMIT);
    // The current icon stays in view: first in the starter set, or in place
    // of the last match
    if (iconNames.includes(iconPicked) && !shown.includes(iconPicked)) {
      if (!typed) shown = [iconPicked].concat(shown);
      else if (matches.includes(iconPicked)) shown[shown.length - 1] = iconPicked;
    }
    iconGrid.replaceChildren.apply(
      iconGrid,
      shown.map(function (name) {
        var li = document.createElement("li"),
          label = document.createElement("label"),
          input = document.createElement("input");
        input.type = "radio";
        input.name = "qr-icon-choice";
        input.value = name;
        input.checked = name === iconPicked;
        label.append(input, glyph(name), name);
        li.append(label);
        return li;
      }),
    );
    var count = matches.length.toLocaleString("en-US");
    byId("qr-icon-count").textContent = !typed
      ? "A few to start. Search all " + iconNames.length.toLocaleString("en-US") + " icons."
      : !matches.length
        ? "No icons match \u201c" + typed + ".\u201d"
        : matches.length > ICON_LIMIT
          ? "The first " + ICON_LIMIT + " of " + count + " icons. Search to narrow them."
          : matches.length === 1
            ? "1 icon"
            : count + " icons";
  }
  iconGrid.addEventListener("change", function (e) {
    iconPicked = e.target.value;
  });
  // Double-click a tile to use it right away
  iconGrid.addEventListener("dblclick", function (e) {
    if (e.target.closest("label")) byId("qr-icon-form").requestSubmit();
  });
  iconSearch.addEventListener("input", showIcons);
  byId("qr-icon-browse").addEventListener("click", function () {
    iconPicked = icon.value.trim() || icon.placeholder;
    iconSearch.value = "";
    (loadingIcons || Promise.resolve()).then(function () {
      showIcons();
      iconDialog.showModal();
      var picked = iconGrid.querySelector(":checked");
      if (picked) picked.closest("li").scrollIntoView({ block: "nearest" });
      iconSearch.focus();
    });
  });
  byId("qr-icon-form").addEventListener("submit", function (e) {
    var use = !e.submitter || e.submitter.value !== "cancel";
    if (use && iconPicked && iconPicked !== (icon.value.trim() || icon.placeholder)) {
      icon.value = iconPicked;
      icon.dispatchEvent(new Event("input", { bubbles: true }));
      icon.dispatchEvent(new Event("change", { bubbles: true }));
    }
    byId("qr-icon-names").hidden = true;
  });

  // Contact cards and events escape \ , ; and line breaks
  var card = function (s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/([,;])/g, "\\$1");
  };
  // datetime-local's 2026-12-01T14:00 as an event's 20261201T140000
  var stamp = function (local) {
    return local.replace(/[-:]/g, "") + "00";
  };
  var localTime = function (date) {
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  };
  // CMU's networks: what each one's QR code holds, and its callout, in
  // pieces of text and links ([words, address]); the network's own name
  // links to Computing Services' instructions for it
  var networks = {
    // Phones can't count on joining an enterprise network from Wi-Fi
    // settings in a QR code, so CMU-SECURE's and eduroam's codes open
    // Computing Services' steps, under a warning
    "CMU-SECURE": {
      code: "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/connect.html",
      warning: true,
      describe: "Computing Services' steps for connecting to CMU-SECURE",
      callout: [
        "Phones can't reliably join an enterprise network from a QR code, so this code opens Computing Services' steps for connecting to ",
        [
          "CMU-SECURE",
          "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/connect.html",
        ],
        ".",
      ],
    },
    eduroam: {
      code: "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/eduroam.html",
      warning: true,
      describe: "Computing Services' steps for connecting to eduroam",
      callout: [
        "Phones can't reliably join an enterprise network from a QR code, so this code opens Computing Services' steps for connecting to ",
        [
          "eduroam",
          "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/eduroam.html",
        ],
        ", including how visitors sign in.",
      ],
    },
    "CMU-DEVICE": {
      code: "WIFI:T:nopass;S:CMU-DEVICE;;",
      callout: [
        [
          "CMU-DEVICE",
          "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/cmudevice.html",
        ],
        " isn't for phones or computers. Register each smart TV, game console or other device with CMU's Device Registration tool first. The network is unencrypted.",
      ],
    },
    "CMU-GUEST": {
      code: "WIFI:T:nopass;S:CMU-GUEST;;",
      callout: [
        "After joining ",
        [
          "CMU-GUEST",
          "https://www.cmu.edu/computing/services/endpoint/network-access/wireless/how-to/guest.html",
        ],
        ", guests open a browser and sign in with a non-CMU email address and an access code, which faculty and staff create in ",
        ["Event Manager", "https://guest.wireless.cmu.edu/login?event_manager"],
        ".",
      ],
    },
  };
  // What each kind encodes, built from its fields
  var builders = {
    text: function () {
      return text.value.trim() ? text.value : startingText();
    },
    contact: function () {
      var first = value("contact-first"),
        last = value("contact-last"),
        org = value("contact-org"),
        street = value("contact-street"),
        city = value("contact-city"),
        state = value("contact-state"),
        zip = value("contact-zip"),
        lines = ["BEGIN:VCARD", "VERSION:3.0", "N:" + card(last) + ";" + card(first) + ";;;"];
      lines.push("FN:" + card([first, last].filter(Boolean).join(" ") || org));
      if (org) lines.push("ORG:" + card(org));
      if (value("contact-title")) lines.push("TITLE:" + card(value("contact-title")));
      if (value("contact-phone")) lines.push("TEL;TYPE=WORK,VOICE:" + value("contact-phone"));
      if (value("contact-email")) lines.push("EMAIL;TYPE=WORK:" + value("contact-email"));
      if (street || city || state || zip)
        lines.push("ADR;TYPE=WORK:;;" + [street, city, state, zip, "USA"].map(card).join(";"));
      if (value("contact-url")) lines.push("URL:" + value("contact-url"));
      lines.push("END:VCARD");
      return lines.join("\n");
    },
    event: function () {
      // With no start, tomorrow at 2 p.m. for the example; an hour long
      // unless it says when it ends
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      var start = form.elements["event-start"].value || localTime(tomorrow),
        end = form.elements["event-end"].value;
      if (!end) {
        var later = new Date(start);
        later.setHours(later.getHours() + 1);
        end = localTime(later);
      }
      var lines = ["BEGIN:VEVENT", "SUMMARY:" + card(value("event-title") || "Event")];
      if (value("event-place")) lines.push("LOCATION:" + card(value("event-place")));
      lines.push("DTSTART:" + stamp(start), "DTEND:" + stamp(end));
      if (value("event-details")) lines.push("DESCRIPTION:" + card(value("event-details")));
      lines.push("END:VEVENT");
      return lines.join("\n");
    },
    email: function () {
      var query = [];
      if (value("email-subject"))
        query.push("subject=" + encodeURIComponent(value("email-subject")));
      if (value("email-body")) query.push("body=" + encodeURIComponent(value("email-body")));
      return "mailto:" + value("email-to") + (query.length ? "?" + query.join("&") : "");
    },
    phone: function () {
      return "tel:" + value("phone-number").replace(/[\s()]/g, "");
    },
    // Google Maps opens its app or site on any phone; Apple Maps opens its app
    // on an iPhone and its web map elsewhere; OpenStreetMap opens its site
    map: function () {
      var where = encodeURIComponent(value("map-place"));
      return {
        google: "https://www.google.com/maps/search/?api=1&query=" + where,
        apple: "https://maps.apple.com/?q=" + where,
        osm: "https://www.openstreetmap.org/search?query=" + where,
      }[form.elements["map-app"].value];
    },
    wifi: function () {
      return networks[wifi.value].code;
    },
  };
  var encoded = function () {
    return builders[kind.value]();
  };
  // What the code holds, for alt text
  function describe(content) {
    var name;
    switch (kind.value) {
      case "contact":
        name = content.match(/^FN:(.*)$/m);
        return "a contact card: " + (name ? name[1].replace(/\\/g, "") : "");
      case "event":
        return "an event: " + value("event-title");
      case "email":
        return "an email to " + value("email-to");
      case "phone":
        return "a call to " + value("phone-number");
      case "map":
        return "a map of " + value("map-place");
      case "wifi":
        return networks[wifi.value].describe || "the " + wifi.value + " Wi-Fi network";
    }
    // Link or Text: a contact card pasted as text, by its name
    var pasted = /^BEGIN:VCARD/i.test(content) && content.match(/^FN:(.*)$/im);
    return pasted ? "a contact card: " + pasted[1].trim() : content;
  }

  // Show the chosen kind's fields
  function showKind() {
    form.querySelectorAll("[data-kind]").forEach(function (group) {
      group.hidden = group.dataset.kind !== kind.value;
    });
    // What a phone does with this kind, under Content Type
    byId("qr-kind-hint").textContent = kind.selectedOptions[0].dataset.hint;
    var network = networks[wifi.value],
      callout = byId("qr-wifi-callout");
    // A blue note, or a gold warning (cmu-callout colors)
    callout.className = "cmu-callout cmu-callout--" + (network.warning ? "gold" : "blue");
    byId("qr-wifi-callout-label").textContent = network.warning ? "Warning" : "Note";
    byId("qr-wifi-tip").replaceChildren.apply(
      byId("qr-wifi-tip"),
      network.callout.map(function (piece) {
        if (typeof piece === "string") return piece;
        var link = document.createElement("a");
        link.className = "external";
        link.textContent = piece[0];
        link.href = piece[1];
        return link;
      }),
    );
  }

  // Options from the address, where they name an option the form has; with
  // no text there, the style's own
  var start = new URLSearchParams(location.search);
  [kind, style, width, wifi, form.elements["map-app"]].forEach(function (select) {
    var wanted = start.get(select.name);
    if (
      Array.from(select.options).some(function (option) {
        return option.value === wanted;
      })
    )
      select.value = wanted;
  });
  allFields.forEach(function (field) {
    if (field.tagName !== "SELECT" && start.has(field.name)) field.value = start.get(field.name);
  });
  above.value = start.get("above") || "";
  icon.value = start.get("icon") || "";
  below.value = start.get("below") || "";
  // Blank text means the style's own, shown as the placeholder
  text.value = start.get("text") || "";
  text.placeholder = startingText();

  function describeStyle() {
    var artistic = ["mosaic", "kraus-campo", "wean", "binary-heart", "tilted-square"].includes(
      style.value,
    );
    byId("qr-width-hint").textContent = artistic
      ? "Start with 1024 pixels so the artwork has room. More text can require a larger export."
      : "Choose the width for your layout. More text can require a larger export.";
    width.querySelector('option[value="256"]').disabled = artistic;
    if (artistic && width.value === "256") width.value = "1024";
  }
  // Errors, and a notice when the builder changes a choice; a working
  // preview needs no message
  function message(words, type) {
    status.className = words ? "cmu-flash cmu-flash--" + (type || "error") : "";
    status.setAttribute("role", words && type !== "notice" ? "alert" : "status");
    status.textContent = words || "";
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
  function showText(element, content) {
    element.textContent = "";
    content.split(/\r?\n/).forEach(function (line, n) {
      if (n) element.appendChild(document.createElement("br"));
      line.split(/(?<=[/?&=.-])/).forEach(function (part, i) {
        if (i) element.appendChild(document.createElement("wbr"));
        element.appendChild(document.createTextNode(part));
      });
    });
  }
  function show(visible) {
    preview.hidden = !visible;
    byId("qr-qr-preview-label").hidden = !visible;
    byId("qr-qr-actions").hidden = !visible;
    byId("qr-qr-downloads").hidden = !visible;
    byId("qr-qr-encodes").hidden = !visible;
  }

  async function update() {
    var request = ++latest,
      content = encoded(),
      params = new URLSearchParams({ text: content, style: style.value, width: width.value }),
      // The page's address keeps what was typed or chosen; blank stays the
      // example
      state = new URLSearchParams({ style: style.value, width: width.value });
    if (kind.value === "text") {
      if (text.value.trim()) state.set("text", text.value);
    } else {
      state.set("kind", kind.value);
      fieldsOf(kind.value).forEach(function (field) {
        // Menus at their first choice stay out of the address
        if (field.tagName === "SELECT" && field.selectedIndex === 0) return;
        if (field.value.trim()) state.set(field.name, field.value);
      });
    }
    if (style.value === "icon") {
      params.set("icon", icon.value.trim() || icon.placeholder);
      if (icon.value.trim()) state.set("icon", icon.value.trim());
    }
    // Text above and below, when there's more than space
    [above, below].forEach(function (field) {
      if (field.value.trim()) {
        params.set(field.name, field.value.trim());
        state.set(field.name, field.value);
      }
    });
    history.replaceState(null, "", "?" + state);
    lastValue = content;
    var urls = {
      svg: location.origin + "/qr.svg?" + params,
      png: location.origin + "/qr.png?" + params,
    };
    try {
      var response = await fetch(urls.svg);
      if (!response.ok) throw new Error(await response.text());
      var image = await response.blob();
      // Text above or below makes the image taller than it is wide
      var drawn = /^<svg[^>]*?height="(\d+)"/.exec(await image.text()),
        height = drawn ? drawn[1] : width.value;
      // A slow response for options that have since changed is dropped
      if (request !== latest) return;
      qrUrls = urls;
      // The fetched image itself, so the server draws each code once
      if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
      preview.src = URL.createObjectURL(image);
      preview.alt = style.options[style.selectedIndex].text + " QR code for " + describe(content);
      showText(byId("qr-qr-destination"), content);
      byId("qr-qr-url").textContent = urls.svg;
      byId("qr-qr-html").textContent =
        '<img src="' +
        escape(urls.svg) +
        '" alt="QR code for ' +
        escape(describe(content)) +
        '" width="' +
        width.value +
        '" height="' +
        height +
        '" />';
      show(true);
      message(notice, "notice");
      notice = "";
    } catch (error) {
      if (request !== latest) return;
      // Too small for this text: the smallest width here that fits, if any
      var needed = /Choose a width from (\d+)/.exec(error.message),
        fits =
          needed &&
          Array.from(width.options).find(function (option) {
            return !option.disabled && +option.value >= +needed[1];
          });
      if (fits && fits.value !== width.value) {
        width.value = fits.value;
        notice =
          "Width changed to " +
          fits.text.toLowerCase() +
          ", the smallest here that fits this text.";
        update();
        return;
      }
      show(false);
      message(error.message);
    }
  }

  // CMU-GUEST asks for an access code after joining: the text below starts one,
  // and an untouched start goes when the network or content type changes
  var accessCode = "Access Code: ";
  function startAccessCode() {
    var guest = kind.value === "wifi" && wifi.value === "CMU-GUEST";
    if (guest && !below.value.trim()) below.value = accessCode;
    else if (!guest && below.value === accessCode) below.value = "";
  }
  // The kind before a change, to tell typed content from an example
  var shownKind = kind.value;
  kind.addEventListener("change", function () {
    // Back to Link or Text, with an empty box: what the other kind made, to
    // edit by hand, but only if something was typed there; an example (all
    // placeholders) leaves the box empty
    var typed = fieldsOf(shownKind).some(function (field) {
      return field.tagName !== "SELECT" && field.value.trim();
    });
    if (kind.value === "text" && !text.value.trim() && typed) text.value = lastValue;
    shownKind = kind.value;
    startAccessCode();
    showKind();
    describeIcon();
    update();
  });
  style.addEventListener("change", function () {
    // The style's own text, unless someone has typed theirs; text that's
    // just the last style's own, as from an older link, goes back to blank
    if (text.value === text.placeholder) text.value = "";
    text.placeholder = startingText();
    describeStyle();
    describeIcon();
    update();
  });
  width.addEventListener("change", update);
  form.elements["map-app"].addEventListener("change", update);
  wifi.addEventListener("change", function () {
    startAccessCode();
    showKind();
    update();
  });
  // Typing waits for a pause
  [text, above, below, icon].concat(allFields).forEach(function (field) {
    if (field.tagName === "SELECT") return;
    field.addEventListener("input", function () {
      clearTimeout(typing);
      typing = setTimeout(update, 500);
    });
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

  // The map picker: Leaflet (BSD-2), loaded from cdnjs the first time it's
  // opened, over OpenStreetMap tiles. A pin fills the place with its
  // coordinates, which Google Maps shows as that exact spot.
  var place = byId("qr-map-place"),
    mapDialog = byId("qr-map-dialog"),
    use = byId("qr-map-use"),
    coordinates = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
    campus = [40.4433, -79.9436],
    leaflet,
    map,
    pin;
  function loadLeaflet() {
    if (!leaflet)
      leaflet = new Promise(function (resolve, reject) {
        var base = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/",
          css = document.createElement("link"),
          script = document.createElement("script");
        css.rel = "stylesheet";
        css.href = base + "leaflet.min.css";
        css.integrity = "sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb";
        css.crossOrigin = "anonymous";
        script.src = base + "leaflet.min.js";
        script.integrity =
          "sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO";
        script.crossOrigin = "anonymous";
        script.onload = function () {
          resolve(window.L);
        };
        script.onerror = function () {
          leaflet = undefined;
          reject(new Error("Leaflet didn't load"));
        };
        document.head.append(css, script);
      });
    return leaflet;
  }
  // Suggestions as people type a place: Photon (komoot's search over
  // OpenStreetMap), favoring places near campus. A chosen suggestion fills
  // in its name and address, which the QR code searches for in Google Maps;
  // its coordinates only center the map picker. Scanning never uses Photon.
  var suggestions = byId("qr-map-suggestions"),
    found = {},
    searching,
    waiting;
  function suggest() {
    var query = place.value.trim();
    clearTimeout(waiting);
    // Too short, coordinates or a place just chosen: no suggestions
    if (query.length < 3 || coordinates.test(query) || found[query]) {
      if (searching) searching.abort();
      suggestions.replaceChildren();
      return;
    }
    waiting = setTimeout(function () {
      if (searching) searching.abort();
      searching = new AbortController();
      var address =
        "https://photon.komoot.io/api/?" +
        new URLSearchParams({
          q: query,
          limit: "6",
          lat: String(campus[0]),
          lon: String(campus[1]),
          zoom: "12",
          location_bias_scale: "0.1",
          lang: "en",
        });
      fetch(address, { signal: searching.signal })
        .then(function (response) {
          return response.json();
        })
        .then(function (results) {
          var labels = [],
            // A house number typed first ("105 Main Street"): OpenStreetMap
            // often has the street but not its numbers, so a street keeps it
            number = /^(\d+[a-z]?)\s/i.exec(query);
          results.features.forEach(function (feature) {
            var p = feature.properties,
              street = [p.housenumber, p.street].filter(Boolean).join(" "),
              name =
                p.type === "street" && !p.housenumber && number ? number[1] + " " + p.name : p.name,
              label = [name, street, p.city, p.state]
                .filter(function (part, i, parts) {
                  return part && parts.indexOf(part) === i;
                })
                .join(", ");
            if (!labels.includes(label)) labels.push(label);
            found[label] = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
          });
          suggestions.replaceChildren.apply(
            suggestions,
            // The kit's suggestion list (cmu-suggest) shows them
            labels.map(function (label) {
              var option = document.createElement("li");
              option.textContent = label;
              return option;
            }),
          );
        })
        .catch(function () {
          // No suggestions, offline or on error; typing still works
        });
    }, 300);
  }
  place.addEventListener("input", suggest);
  icon.addEventListener("input", suggestIcons);

  function drop(L, spot) {
    if (pin) pin.setLatLng(spot);
    else
      pin = L.circleMarker(spot, {
        radius: 8,
        color: "#c41230",
        fillColor: "#c41230",
        fillOpacity: 0.8,
      }).addTo(map);
    use.disabled = false;
  }
  // A place typed but not picked from the suggestions: its spot, from one
  // Photon search, so the map opens there; nothing (campus) if not found
  function locate(text) {
    var query = text.trim();
    if (!query || coordinates.test(query) || found[query]) return Promise.resolve(null);
    return fetch(
      "https://photon.komoot.io/api/?" +
        new URLSearchParams({
          q: query,
          limit: "1",
          lat: String(campus[0]),
          lon: String(campus[1]),
          zoom: "12",
          location_bias_scale: "0.1",
          lang: "en",
        }),
    )
      .then(function (response) {
        return response.json();
      })
      .then(function (results) {
        var hit = results.features[0];
        return hit ? [hit.geometry.coordinates[1], hit.geometry.coordinates[0]] : null;
      })
      .catch(function () {
        return null;
      });
  }
  byId("qr-map-open").addEventListener("click", function () {
    mapDialog.showModal();
    Promise.all([loadLeaflet(), locate(place.value)])
      .then(function (both) {
        var L = both[0],
          typed = coordinates.exec(place.value),
          chosen = found[place.value.trim()] || both[1],
          spot = typed ? [+typed[1], +typed[2]] : chosen || campus;
        typed = typed || chosen;
        if (!map) {
          map = L.map("qr-map").setView(spot, typed ? 17 : 16);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);
          map.on("click", function (event) {
            drop(L, event.latlng);
          });
        } else {
          map.invalidateSize();
          map.setView(spot, typed ? 17 : map.getZoom());
        }
        if (typed) drop(L, spot);
        else if (pin) {
          pin.remove();
          pin = undefined;
          use.disabled = true;
        }
      })
      .catch(function () {
        mapDialog.close();
        message("The map didn't load. Type a place or address instead.");
      });
  });
  mapDialog.addEventListener("close", function () {
    if (mapDialog.returnValue !== "use" || !pin) return;
    var spot = pin.getLatLng();
    place.value = spot.lat.toFixed(5) + "," + spot.lng.toFixed(5);
    update();
  });

  showKind();
  describeStyle();
  describeIcon();
  update();
})();
