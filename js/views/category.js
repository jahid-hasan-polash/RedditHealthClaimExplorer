window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  function opts(arr, kind, rows, field) {
    var seen = {};
    rows.forEach(function (r) { seen[r[field]] = true; });
    var out = (arr || []).filter(function (x) { return seen[x.key]; })
      .map(function (x) { return { value: x.key, label: x.label }; });
    Object.keys(seen).forEach(function (k) {
      if (!out.some(function (o) { return o.value === k; })) out.push({ value: k, label: EX.fmt.label(kind, k) });
    });
    return out;
  }

  EX.views.category = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var meta = EX.data.meta || {};
    var key = params.cat;
    var cat = null;
    (meta.categories || []).forEach(function (c) { if (c.key === key) cat = c; });
    if (!cat) {
      ctx.setCrumbs([{ label: "Evidence categories", href: "#/categories" }, { label: "Unknown category" }]);
      mountEl.appendChild(h("div", { class: "card error-view" },
        h("h2", { class: "page-title" }, "Category not found"),
        h("p", { class: "muted" }, "There is no evidence category called “" + key + "”."),
        h("p", null, h("a", { class: "btn", href: "#/categories" }, "See all categories"))));
      return;
    }
    ctx.setCrumbs([{ label: "Evidence categories", href: "#/categories" }, { label: cat.label }]);

    var rows = EX.idx.claims.filter(function (c) { return c.category === key; });
    var holder = h("div");
    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, cat.label),
      h("div", { class: "cat-bar cat-bar-page", style: { backgroundColor: cat.color } }),
      h("p", { class: "lead" }, cat.definition),
      h("p", { class: "muted note" }, "Technical rule: " + cat.rule),
      h("p", { class: "muted" }, rows.length.toLocaleString("en-US") +
        " Reddit claims. Click a row to see the claim and its PubMed evidence."),
      holder));

    function link(r) { return "#/claim/" + encodeURIComponent(r.claim_id); }
    new EX.DataTable(holder, {
      rows: rows,
      searchKeys: ["claim_text"],
      csvName: "claims_" + key + ".csv",
      filters: [
        { key: "topic", label: "Topic", options: opts(meta.topics, "topic", rows, "topic") },
        { key: "claim_type", label: "Type", options: opts(meta.claim_types, "claimType", rows, "claim_type") },
        { key: "predicate", label: "Relation", options: opts(meta.predicates, "predicate", rows, "predicate") }
      ],
      columns: [
        { key: "claim_text", label: "Claim", render: function (r) {
            return h("a", { href: link(r), title: r.claim_text }, r.claim_text);
          } },
        { key: "topic", label: "Topic", render: function (r) { return EX.fmt.label("topic", r.topic); },
          csv: function (r) { return EX.fmt.label("topic", r.topic); } },
        { key: "claim_type", label: "Type", render: function (r) { return EX.fmt.label("claimType", r.claim_type); },
          csv: function (r) { return EX.fmt.label("claimType", r.claim_type); } },
        { key: "predicate", label: "Relation", render: function (r) { return EX.fmt.label("predicate", r.predicate); },
          csv: function (r) { return EX.fmt.label("predicate", r.predicate); } },
        { key: "confidence", label: "Confidence", hint: "-1 = studies say the opposite, +1 = studies agree.",
          render: function (r) { return r.n_compared > 0 ? EX.dom.scoreBar(r.confidence) : EX.dom.scoreBar(null); },
          csv: function (r) { return r.confidence; } },
        { key: "n_compared", label: "Compared", hint: "PubMed claims this claim was compared with." },
        { key: "n_supporting", label: "Supporting", hint: "Compared claims that agreed strongly." },
        { key: "n_contradicting", label: "Contradicting", hint: "Compared claims that disagreed." }
      ],
      onRowClick: function (r) { EX.router.go(link(r)); }
    });
  };
})(window.EX);
