window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  EX.views.articles = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var meta = EX.data.meta || {};
    ctx.setCrumbs([{ label: "PubMed articles" }]);
    return EX.load("articles").then(function (data) {
      if (!ctx.isCurrent()) return;
      var arts = (data && data.articles) || {};
      var list = Object.keys(arts).map(function (k) { return arts[k]; });
      var top = EX.fmt.topStudyTypes(list.map(function (a) { return a.evidence_strength; }), 12);
      var topSet = {};
      top.forEach(function (t) { topSet[t] = true; });
      var comboLabels = {};
      var rows = list.map(function (a) {
        var st = EX.fmt.studyType(a.evidence_strength);
        var ts = (a.topics || []).slice().sort();
        var combo = ts.join("|");
        comboLabels[combo] = ts.map(function (t) { return EX.fmt.label("topic", t); }).join(" + ");
        return Object.assign({}, a, {
          study_label: st,
          study_type_group: topSet[st] ? st : "Other",
          topic_combo: combo,
          n_claims: (a.claim_ids || []).length,
          n_posts: (a.source_posts || []).length,
          n_used: (a.derived_matched_by || []).length
        });
      });
      var studyOpts = top.map(function (t) { return { value: t, label: t }; });
      studyOpts.push({ value: "Other", label: "Other" });
      var topicOpts = Object.keys(comboLabels).sort().map(function (k) {
        return { value: k, label: comboLabels[k] || "(none)" };
      });

      var holder = h("div");
      mountEl.appendChild(h("div", null,
        h("h1", { class: "page-title" }, "PubMed articles"),
        h("p", { class: "muted" }, rows.length.toLocaleString("en-US") +
          " research articles found by searching PubMed for the Reddit posts. " +
          "Evidence weight shows how much the study design is trusted (0.15 to 1.0). Click a row to read the article page."),
        holder));

      function link(r) { return "#/article/" + encodeURIComponent(r.pmid); }
      new EX.DataTable(holder, {
        rows: rows,
        searchKeys: ["title", "journal", "pmid"],
        csvName: "articles.csv",
        filters: [
          { key: "topic_combo", label: "Topic", options: topicOpts },
          { key: "study_type_group", label: "Study type", options: studyOpts }
        ],
        columns: [
          { key: "title", label: "Title", render: function (r) {
              return h("a", { href: link(r), title: r.title }, r.title);
            } },
          { key: "year", label: "Year" },
          { key: "journal", label: "Journal" },
          { key: "study_label", label: "Study type" },
          { key: "evidence_weight", label: "Evidence weight", hint: "How much this study design is trusted (0.15 to 1.0).",
            render: function (r) { return EX.fmt.num(r.evidence_weight, 2); },
            csv: function (r) { return r.evidence_weight; } },
          { key: "topic_combo", label: "Topics", render: function (r) {
              return h("span", null, (r.topics || []).map(function (t) { return [EX.dom.badge("topic", t), " "]; }));
            }, csv: function (r) { return (r.topics || []).join("|"); } },
          { key: "n_claims", label: "PubMed claims", hint: "Claims extracted from this abstract." },
          { key: "n_posts", label: "Retrieved for posts", hint: "Number of Reddit posts whose search returned this article." },
          { key: "n_used", label: "Used as evidence", hint: "Number of Reddit claims this article was matched to." }
        ],
        onRowClick: function (r) { EX.router.go(link(r)); }
      });
    });
  };
})(window.EX);
