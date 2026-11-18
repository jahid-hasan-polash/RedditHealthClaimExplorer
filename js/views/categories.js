window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  EX.views.categories = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var meta = EX.data.meta || {};
    var cats = meta.categories || [];
    var topics = meta.topics || [];
    ctx.setCrumbs([{ label: "Evidence categories" }]);

    var cards = h("div", { class: "cat-cards" });
    cats.forEach(function (c) {
      var by = c.by_topic || {};
      var max = 0;
      topics.forEach(function (t) { max = Math.max(max, by[t.key] || 0); });
      var rows = h("div", { class: "cat-topics" });
      topics.forEach(function (t) {
        var n = by[t.key] || 0;
        rows.appendChild(h("div", { class: "cat-topic-row" },
          h("span", { class: "cat-topic-name" }, t.label),
          EX.charts.hbar(n, max, n.toLocaleString("en-US"))));
      });
      cards.appendChild(h("a", { class: "card cat-card", href: "#/category/" + encodeURIComponent(c.key) },
        h("div", { class: "cat-bar", style: { backgroundColor: c.color } }),
        h("h2", null, c.label),
        h("div", { class: "cat-count" }, h("strong", null, (c.count || 0).toLocaleString("en-US")),
          h("span", { class: "muted" }, " Reddit claims")),
        h("p", null, c.definition),
        h("p", { class: "muted note" }, "Technical rule: " + c.rule),
        rows));
    });

    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, "Evidence categories"),
      h("p", { class: "lead muted" },
        "Every claim from a Reddit post is compared with similar claims found in PubMed abstracts. " +
        "The confidence score runs from -1 (studies say the opposite) to +1 (studies agree), " +
        "weighted by how reliable each study design is. The score decides which of the five categories a claim falls into. ",
        h("a", { href: "#/guide" }, "Read more in the Guide"), "."),
      cards));
  };
})(window.EX);
