window.EX = window.EX || {};
(function (EX) {
  // No DOM access at load time; document is touched only inside functions.
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") {
          Object.keys(v).forEach(function (p) { el.style[p] = v[p]; });
        } else if (k === "dataset") {
          Object.keys(v).forEach(function (p) { el.dataset[p] = v[p]; });
        } else if (k.indexOf("on") === 0 && typeof v === "function") el[k] = v;
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }

  function badge(kind, key) {
    var attrs = { class: "badge badge-" + kind };
    if (kind === "category") {
      var meta = EX.data && EX.data.meta;
      var cats = (meta && meta.categories) || [];
      for (var i = 0; i < cats.length; i++) {
        if (cats[i].key === key && cats[i].color) {
          attrs.style = { backgroundColor: cats[i].color };
          break;
        }
      }
    }
    return h("span", attrs, EX.fmt.label(kind, key));
  }

  function scoreBar(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return h("span", { class: "muted" }, "not compared");
    }
    var v = Math.max(-1, Math.min(1, Number(value)));
    var left = v >= 0 ? 50 : 50 + v * 50;
    var fill = h("div", { class: "scorebar-fill " + (v > 0 ? "pos" : "neg"),
      style: { left: left + "%", width: Math.abs(v) * 50 + "%",
               backgroundColor: v > 0 ? "#2e9e5b" : "#d64545" } });
    var zero = h("div", { class: "scorebar-zero" });
    var track = h("div", { class: "scorebar-track" }, fill, zero);
    return h("span", { class: "scorebar", title: String(value) }, track);
  }

  function extLink(url, text) {
    return h("a", { href: url, target: "_blank", rel: "noopener" }, text === undefined ? url : text);
  }

  function collapsible(title, contentNode, open) {
    var d = h("details", { class: "collapsible" }, h("summary", null, title), contentNode);
    if (open) d.open = true;
    return d;
  }

  function rawJson(obj) {
    var pre = h("pre", { class: "rawjson" });
    pre.textContent = JSON.stringify(obj, null, 2);
    return collapsible("Raw data (JSON)", pre, false);
  }

  function loading(msg) { return h("div", { class: "loading" }, msg || "Loading…"); }
  function empty(msg) { return h("div", { class: "empty muted" }, msg || "Nothing to show."); }

  function stat(label, value, hint) {
    var shown = typeof value === "number" ? value.toLocaleString("en-US") : value;
    return h("div", { class: "stat", title: hint || null },
      h("strong", null, shown), h("span", { class: "stat-label" }, label));
  }

  EX.dom = { stat: stat, h: h, badge: badge, scoreBar: scoreBar, extLink: extLink,
    collapsible: collapsible, rawJson: rawJson, loading: loading, empty: empty };
})(window.EX);
