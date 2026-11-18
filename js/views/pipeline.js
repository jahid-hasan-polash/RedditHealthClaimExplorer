window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  function stageStrip(stages) {
    var h = EX.dom.h;
    return h("div", { class: "stage-strip" }, stages.map(function (s) {
      return h("div", { class: "card stage-card" },
        h("div", { class: "stage-n" }, "Step " + s.n),
        h("h3", null, s.title), h("p", null, s.description),
        h("p", { class: "muted note" }, h("strong", null, "In: "), s.input),
        h("p", { class: "muted note" }, h("strong", null, "Out: "), s.output));
    }));
  }

  function funnelTable(meta) {
    var h = EX.dom.h;
    var body = h("tbody");
    (meta.topics || []).forEach(function (t) {
      var rows = EX.ui.funnel(t, EX.idx.claims), max = rows[0].n;
      body.appendChild(h("tr", { class: "funnel-topic" }, h("th", { colspan: 3 }, t.label)));
      rows.forEach(function (r, i) {
        var prev = i > 0 ? rows[i - 1].n : null;
        body.appendChild(h("tr", null, h("td", null, r.label),
          h("td", { class: "num" }, r.n.toLocaleString("en-US")),
          h("td", { class: "funnel-bar" }, EX.charts.hbar(r.n, max,
            i === 0 ? "start" : r.label === "Claims extracted"
              ? "≈ " + (rows[1].n ? (r.n / rows[1].n).toFixed(1) : "0.0") + " claims per kept post"
              : (prev ? EX.fmt.pct(r.n / prev) + " of previous" : "—")))));
      });
    });
    return h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Stage"), h("th", null, "Count"), h("th", null, "Share"))), body));
  }

  function policy(meta) {
    var h = EX.dom.h, fp = meta.filter_policy || {}, w = fp.weights || {};
    var keys = Object.keys(w).sort(function (a, b) { return w[b] - w[a] || a.localeCompare(b); });
    var max = keys.length ? w[keys[0]] : 1;
    return h("div", null,
      h("p", null, "Each of the 15 medical fields has a weight. A post's completeness score is the weight of the fields it filled divided by the total weight. Posts scoring below " +
        EX.fmt.pct(fp.threshold) + " are filtered out."),
      h("div", { class: "weight-list" }, keys.map(function (k) {
        return h("div", { class: "weight-row" }, h("span", null, EX.fmt.label("field", k)),
          EX.charts.hbar(w[k], max, String(w[k])));
      })));
  }

  function scoring(meta) {
    var h = EX.dom.h, s = meta.scoring || {};
    var a = Math.round((s.alpha || 0) * 100), b = 100 - a;
    var tiers = h("div", { class: "table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Study design"), h("th", null, "Evidence weight"))),
      h("tbody", null, (s.evidence_tiers || []).map(function (t) {
        return h("tr", null, h("td", null, t.label), h("td", { class: "num" }, EX.fmt.num(t.weight, 2)));
      }))));
    return h("div", null,
      h("ol", { class: "recipe" },
        h("li", null, "Compare meaning: each Reddit claim is compared with PubMed claims of the same topic and type, using the language model " + s.model +
          ". Similarity combines " + a + "% claim-text and " + b + "% context similarity."),
        h("li", null, "Weight by study quality: each PubMed claim counts according to its study design (table below)."),
        h("li", null, "Average: a match counts as supporting when its weighted score (similarity × direction × evidence weight) is above " + s.support_threshold +
          ". The result is an evidence-weighted average, the confidence score from -1 to +1."),
        h("li", null, "Label, checked in this order: not compared with PubMed, or a score within ±" + s.anecdotal_abs + " of zero, is anecdotal; " +
          "below " + s.rarely_threshold + " is rarely reported; at or above " + s.q75 + " (the top quarter) with at least 3 supporting matches is common knowledge; " +
          "at or above the median (" + s.median + ") is well supported; " + s.anecdotal_abs + " or more but below the median is moderately supported; " +
          "any other negative score (" + s.rarely_threshold + " to -" + s.anecdotal_abs + ") is rarely reported.")),
      h("h3", null, "Evidence tiers"), tiers);
  }

  EX.views.pipeline = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, meta = EX.data.meta || {};
    ctx.setCrumbs([{ label: "Pipeline" }]);
    var btn = h("button", { class: "btn btn-primary", type: "button" }, "Follow one post through the pipeline");
    btn.addEventListener("click", function () {
      var pool = EX.idx.posts.filter(function (p) { return p.status === "valuable" && p.n_claims >= 3; });
      if (!pool.length) return;
      var p = pool[Math.floor(Math.random() * pool.length)];
      window.location.hash = "#/post/" + encodeURIComponent(p.post_id) + "/journey";
    });
    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, "How the data was made"),
      h("p", { class: "lead" }, "Seven steps turned raw Reddit posts into scored health claims."),
      h("p", null, btn),
      stageStrip(meta.stages || []),
      h("div", { class: "section" }, h("h2", null, "How many posts survive each step"), funnelTable(meta)),
      h("div", { class: "section" }, h("h2", null, "The filter policy"), policy(meta)),
      h("div", { class: "section" }, h("h2", null, "The scoring recipe"), scoring(meta))));
  };
})(window.EX);
