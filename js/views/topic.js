window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  var STATUS_LABEL = { valuable: "Kept", rejected: "Filtered out" };
  var STATUS_TIP = "Posts are kept only if they contain enough personal and health detail " +
    "(the Stage 1 completeness filter). Filtered-out posts did not pass it.";

  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  EX.views.topic = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var meta = EX.data.meta || {};
    var key = params.topic;
    var topic = null;
    (meta.topics || []).forEach(function (t) { if (t.key === key) topic = t; });
    if (!topic) {
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown topic" }]);
      mountEl.appendChild(h("div", { class: "card error-view" },
        h("h2", { class: "page-title" }, "Topic not found"),
        h("p", { class: "muted" }, "There is no topic called “" + key + "”."),
        h("p", null, h("a", { class: "btn", href: "#/topics" }, "See all topics"))));
      return;
    }
    ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: topic.label }]);

    var cats = meta.categories || [];
    var rows = EX.idx.posts.filter(function (p) { return p.topic === key; }).map(function (p) {
      return Object.assign({}, p, {
        has_claims: p.n_claims > 0 ? "yes" : "no",
        completeness_pct: Math.round((p.completeness || 0) * 100),
        status_label: STATUS_LABEL[p.status] || p.status
      });
    });

    var holder = h("div");
    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, topic.label + " posts"),
      h("p", { class: "muted" },
        "Posts from " + topic.subreddit + ". By default only kept posts are shown; switch Status to see posts that were filtered out. " +
        "Click a row to open the post."),
      holder));

    new EX.DataTable(holder, {
      rows: rows,
      searchKeys: ["title"],
      csvName: "posts_" + key + ".csv",
      initial: { filters: { status: "valuable" } },
      filters: [
        { key: "status", label: "Status", options: [{ value: "valuable", label: "Kept" }, { value: "rejected", label: "Filtered out" }] },
        { key: "has_claims", label: "Has claims", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }
      ],
      ranges: [{ key: "completeness_pct", label: "Completeness % between", min: 0, max: 100, step: 5 }],
      columns: [
        { key: "title", label: "Title", render: function (r) {
            return h("a", { href: "#/post/" + encodeURIComponent(r.post_id), title: r.title }, truncate(r.title, 90));
          }, csv: function (r) { return r.title; } },
        { key: "created", label: "Date", render: function (r) { return EX.fmt.date(r.created); }, csv: function (r) { return r.created; } },
        { key: "status", label: "Status", render: function (r) {
            return h("span", { class: "badge badge-status", title: STATUS_TIP }, r.status_label);
          }, csv: function (r) { return r.status_label; } },
        { key: "completeness_pct", label: "Completeness", hint: "How much of the key personal and health detail the post contains (0-100%).", render: function (r) { return r.completeness_pct + "%"; },
          csv: function (r) { return r.completeness_pct; } },
        { key: "n_filled", label: "Info fields filled", hint: "Number of detail fields (age, medication, condition, etc.) found in the post." },
        { key: "n_claims", label: "Claims" },
        { key: "n_articles", label: "Articles" },
        { key: "derived_avg_confidence", label: "Avg confidence", render: function (r) {
            return EX.dom.scoreBar(r.derived_avg_confidence);
          }, csv: function (r) { return r.derived_avg_confidence === null || r.derived_avg_confidence === undefined ? "" : r.derived_avg_confidence; } },
        { key: "cat_total", label: "Evidence mix", sortable: false, render: function (r) {
            return EX.charts.categoryBar(r.cat_counts, { small: true, cats: cats });
          }, csv: function (r) {
            return cats.map(function (c, i) { return c.key + ":" + ((r.cat_counts || [])[i] || 0); }).join("|");
          } }
      ],
      onRowClick: function (r) { EX.router.go("#/post/" + encodeURIComponent(r.post_id)); }
    });
  };
})(window.EX);
