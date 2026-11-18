window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};


  EX.views.topics = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var meta = EX.data.meta || {};
    ctx.setCrumbs([{ label: "Topics" }]);
    var cats = meta.categories || [];
    var grid = h("div", { class: "grid" });
    (meta.topics || []).forEach(function (t) {
      var by = {};
      cats.forEach(function (c) { by[c.key] = ((c.by_topic || {})[t.key]) || 0; });
      grid.appendChild(h("a", { class: "card topic-card", href: "#/topic/" + encodeURIComponent(t.key) },
        h("h2", null, t.label),
        h("div", { class: "muted" }, t.subreddit),
        h("div", { class: "stat-row" },
          EX.dom.stat("collected", t.counts.raw),
          EX.dom.stat("kept", t.counts.valuable),
          EX.dom.stat("claims", t.counts.claims)),
        h("div", { class: "muted" }, "Claims by evidence category"),
        EX.charts.categoryBar(by, { legend: true })));
    });
    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, "Topics"),
      h("p", { class: "muted" }, "Each topic is one Reddit community. Pick one to browse its posts."),
      grid));
  };
})(window.EX);
