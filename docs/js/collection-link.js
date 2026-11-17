// ?collection=<key> on any page: remember the collection in this browser (a
// cookie, for a year) and take it out of the address right away, before
// analytics records the page (load this before the Google tag). Several at
// once: ?collection=mjs,ece or ?collection=mjs&collection=ece.
// js/collections.js shows its styles.
(function () {
  "use strict";
  try {
    var url = new URL(location.href),
      keys = url.searchParams
        .getAll("collection")
        .join(",")
        .split(",")
        .filter(function (key) {
          return /^[a-z0-9-]{1,40}$/.test(key);
        });
    if (!url.searchParams.has("collection")) return;
    url.searchParams.delete("collection");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    if (!keys.length) return;
    // A cookie, not localStorage: the template's script clears localStorage
    // on every page
    var saved = /(?:^|; )qrnegie-collections=([^;]*)/.exec(document.cookie),
      list = saved ? decodeURIComponent(saved[1]).split(",").filter(Boolean) : [];
    keys.forEach(function (key) {
      if (list.indexOf(key) < 0) list.push(key);
    });
    document.cookie =
      "qrnegie-collections=" +
      encodeURIComponent(list.join(",")) +
      "; path=/; max-age=31536000; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
  } catch {
    // Storage blocked: the collection just doesn't show
  }
})();
