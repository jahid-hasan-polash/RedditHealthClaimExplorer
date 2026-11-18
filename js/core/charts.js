window.EX = window.EX || {};
(function (EX) {
  // No DOM access at load time; document is touched only inside node-building functions.

  // Pure: counts is an array in meta.categories order or an object keyed by category key.
  // Returns [{key,label,color,n,pct}] (pct is 0..100, one decimal; 0 when total is 0).
  function segments(counts, cats) {
    cats = cats || ((EX.data && EX.data.meta && EX.data.meta.categories) || []);
    var ns = cats.map(function (c, i) {
      var v = Array.isArray(counts) ? counts[i] : (counts || {})[c.key];
      return Number(v) || 0;
    });
    var total = ns.reduce(function (a, b) { return a + b; }, 0);
    return cats.map(function (c, i) {
      return { key: c.key, label: c.label, color: c.color, n: ns[i],
        pct: total ? Math.round(ns[i] / total * 1000) / 10 : 0 };
    });
  }

  function categoryBar(counts, opts) {
    opts = opts || {};
    var h = EX.dom.h;
    var segs = segments(counts, opts.cats);
    var bar = h("div", { class: "stacked-bar" + (opts.small ? " stacked-bar-sm" : "") });
    var total = segs.reduce(function (a, s) { return a + s.n; }, 0);
    if (!total) bar.title = "No claims";
    segs.forEach(function (s) {
      if (!s.n) return;
      bar.appendChild(h("div", { class: "seg cat-" + s.key,
        style: { width: s.pct + "%", backgroundColor: s.color },
        title: s.label + ": " + s.n + " (" + s.pct + "%)" }));
    });
    if (!opts.legend) return bar;
    var legend = h("div", { class: "chart-legend" });
    segs.forEach(function (s) {
      legend.appendChild(h("span", { class: "legend-item" },
        h("span", { class: "legend-dot", style: { backgroundColor: s.color } }),
        s.label + " " + s.n));
    });
    return h("div", { class: "chart-wrap" }, bar, legend);
  }

  // Simple horizontal bar: value relative to max, optional label text after it.
  function hbar(value, max, label) {
    var h = EX.dom.h;
    var w = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    return h("div", { class: "hbar" },
      h("div", { class: "hbar-track" }, h("div", { class: "bar", style: { width: w + "%" } })),
      label === undefined ? null : h("span", { class: "hbar-label" }, label));
  }

  EX.charts = { segments: segments, categoryBar: categoryBar, hbar: hbar };
})(window.EX);
