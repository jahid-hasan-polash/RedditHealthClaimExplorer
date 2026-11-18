window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  function sum(topics, key) {
    return topics.reduce(function (a, t) { return a + ((t.counts && t.counts[key]) || 0); }, 0);
  }

  // Articles can be shared between topics, so prefer the unique count from the index.
  function uniqueArticles(topics) {
    var t = EX.idx && EX.idx.articleTitles;
    return t && Object.keys(t).length ? Object.keys(t).length : sum(topics, "articles");
  }

  EX.views.home = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    ctx.setCrumbs([]);
    var topics = (EX.data.meta && EX.data.meta.topics) || [];

    var random = h("button", { type: "button", class: "btn btn-primary" }, "Random post");
    random.onclick = function () {
      var pool = (EX.idx.posts || []).filter(function (p) { return p.status === "valuable" && p.n_claims >= 1; });
      if (!pool.length) return;
      var p = pool[Math.floor(Math.random() * pool.length)];
      EX.router.go("#/post/" + p.post_id);
    };

    function entry(href, title, text) {
      return h("a", { class: "card entry-card", href: href }, h("h2", null, title), h("p", { class: "muted" }, text));
    }

    mountEl.appendChild(h("div", null,
      h("h1", { class: "page-title" }, "Reddit Health Claims Explorer"),
      h("p", { class: "lead" },
        "This project collected health discussions from three Reddit communities about diabetes and high blood pressure. " +
        "It kept the posts where people shared enough personal detail, then pulled out the specific health claims they make. " +
        "Each claim was checked against published research on PubMed to see how well science supports it."),
      h("div", { class: "stat-row" },
        EX.dom.stat("posts collected", sum(topics, "raw")),
        EX.dom.stat("posts kept", sum(topics, "valuable")),
        EX.dom.stat("claims found", sum(topics, "claims")),
        EX.dom.stat("PubMed articles", uniqueArticles(topics))),
      h("div", { class: "entry-cards" },
        entry("#/topics", "Browse by topic", "See the posts for each community and how well their claims are supported."),
        entry("#/categories", "Browse by evidence category", "Group claims by how much medical research backs them."),
        entry("#/pipeline", "See how the pipeline works", "Follow the steps from a Reddit post to a checked claim.")),
      h("p", null, random, h("span", { class: "muted" }, "  Jump to a surprise post that has at least one claim."))));
  };
})(window.EX);
