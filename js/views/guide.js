window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};
  EX.views.guide = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, meta = EX.data.meta || {};
    ctx.setCrumbs([{ label: "Guide" }]);
    var rows = (meta.guide || []).map(function (g) {
      var w = String(g.where || "");
      return h("tr", null, h("td", null, h("strong", null, g.term)), h("td", null, g.definition),
        h("td", null, /^#\//.test(w) ? h("a", { href: w }, w) : w));
    });
    var gloss = h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Term"), h("th", null, "What it means"), h("th", null, "Where you see it"))),
      h("tbody", null, rows)));
    var faq = h("div", null, (meta.faq || []).map(function (f, i) {
      return EX.dom.collapsible(f.q, h("p", null, f.a), i === 0);
    }));
    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, "Guide"),
      h("p", { class: "lead" }, "Plain-language help for the terms and numbers used in this explorer."),
      h("div", { class: "section" }, h("h2", null, "Frequently asked questions"), faq),
      h("div", { class: "section" }, h("h2", null, "Glossary"), gloss)));
  };
})(window.EX);
