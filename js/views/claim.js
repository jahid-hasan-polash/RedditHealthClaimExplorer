window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  var rangeCache = null;
  function scoreRangeNote() {
    var sc = (EX.data && EX.data.meta && EX.data.meta.scoring) || {};
    if (!rangeCache) {
      var lo = Infinity, hi = -Infinity;
      ((EX.idx && EX.idx.claims) || []).forEach(function (c) {
        if (c.n_compared > 0 && typeof c.confidence === "number") {
          if (c.confidence < lo) lo = c.confidence;
          if (c.confidence > hi) hi = c.confidence;
        }
      });
      rangeCache = lo <= hi ? { lo: lo, hi: hi } : { lo: null, hi: null };
    }
    if (rangeCache.lo === null) return "";
    return "In this data, scores range from about " + EX.fmt.num(rangeCache.lo, 2).replace("-", "\u2212") + " to +" +
      EX.fmt.num(rangeCache.hi, 2) + "; categories are relative (median " + sc.median + ", top quarter \u2265 " + sc.q75 + ").";
  }

  function shortTitle(t) { t = String(t || ""); return t.length > 40 ? t.slice(0, 39) + "…" : t; }
  function find(arr, key) {
    for (var i = 0; i < (arr || []).length; i++) if (arr[i].key === key) return arr[i];
    return null;
  }

  function typePredicateLine(claim) {
    var h = EX.dom.h, bits = [];
    if (claim.claim_type_raw && claim.claim_type_raw !== claim.claim_type) {
      bits.push(h("p", { class: "muted" }, "Claim type as extracted: “" + claim.claim_type_raw + "”, normalized to “" +
        EX.fmt.label("claimType", claim.claim_type) + "”."));
    }
    if (claim.predicate_raw && claim.predicate_raw !== claim.predicate) {
      bits.push(h("p", { class: "muted" }, "Relation as extracted: “" + claim.predicate_raw + "”, normalized to “" +
        EX.fmt.label("predicate", claim.predicate) + "”."));
    }
    return bits;
  }

  function matchRow(m, claim, articles, artClaims) {
    var h = EX.dom.h;
    var art = articles[m.pmid];
    var info = EX.ui.articleInfo(m.pmid, art);
    var agrees = m.raw_score > 0;
    var cands = EX.ui.candidateClaims(art, artClaims, claim.claim_type);
    var candBody;
    if (cands.length) {
      candBody = h("ul", { class: "plain-list" }, cands.map(function (c) {
        return h("li", null, c.claim_text, " ", h("span", { class: "muted" },
          "(" + EX.fmt.label("predicate", c.predicate) + ")"));
      }));
    } else {
      candBody = h("p", { class: "muted" }, "No claims of this type were found in this article.");
    }
    var detail = EX.dom.collapsible("Candidate matching claims (the exact matched claim was not recorded)", candBody, false);
    var tr = h("tr", null,
      h("td", null,
        h("a", { href: "#/article/" + encodeURIComponent(m.pmid) }, info.title), " ",
        EX.dom.extLink(EX.fmt.pubmedUrl(m.pmid), "PubMed ↗"),
        h("div", { class: "muted" }, (info.journal || "") + (info.year ? " · " + info.year : "")),
        detail),
      h("td", null, EX.fmt.studyType(art && art.evidence_strength)),
      h("td", null, EX.fmt.num(m.ev_weight, 2)),
      h("td", null, EX.fmt.num(m.claim_sim, 2)),
      h("td", null, EX.fmt.num(m.context_sim, 2)),
      h("td", null, h("span", { class: agrees ? "ok" : "bad" }, agrees ? "Agrees ✓" : "Disagrees ✗")),
      h("td", null, EX.dom.scoreBar(m.weighted_score), " ", h("span", { class: "muted" }, EX.fmt.num(m.weighted_score, 2))));
    return tr;
  }

  EX.views.claim = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, id = params.id;
    var rec = EX.idx.claimById[id];
    if (!rec) {
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown claim" }]);
      return EX.ui.notFound(mountEl, "Claim", id);
    }
    var meta = EX.data.meta || {};
    var topic = rec.topic, topicLabel = EX.fmt.label("topic", topic);
    return Promise.all([EX.load("topic_" + topic), EX.load("articles")]).then(function (res) {
      if (!ctx.isCurrent()) return;
      var data = res[0], art = res[1] || {};
      var claim = data.claims && data.claims[id];
      if (!claim) {
        ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown claim" }]);
        return EX.ui.notFound(mountEl, "Claim", id);
      }
      var post = data.posts[claim.post_id];
      var postHref = "#/post/" + encodeURIComponent(claim.post_id);
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: topicLabel, href: "#/topic/" + topic },
        { label: shortTitle(post && post.title), href: postHref }, { label: "Claim" }]);
      var s = claim.score || {};
      var cat = find(meta.categories, s.category);

      // 1. claim + triple
      var top = h("div", null,
        h("h1", { class: "page-title claim-title" }, claim.claim_text),
        h("div", { class: "post-meta" }, EX.dom.badge("topic", topic), EX.dom.badge("claimType", claim.claim_type),
          EX.dom.badge("predicate", claim.predicate)),
        EX.ui.tripleStrip(claim.subject, claim.predicate, claim.object, claim.polarity),
        typePredicateLine(claim));

      // 2. support
      var compared = s.n_compared > 0;
      var support = h("div", { class: "section" }, h("h2", null, "How well is this supported?"),
        h("div", { class: "card" },
          h("p", null, EX.dom.badge("category", s.category), " ",
            h("span", { class: "muted" }, cat ? cat.definition : "")),
          h("div", { class: "big-score" }, EX.dom.scoreBar(compared ? s.confidence : null), " ",
            h("strong", null, compared ? EX.fmt.num(s.confidence, 2) : "")),
          h("p", { class: "muted" }, "Confidence runs from -1 (studies say the opposite) to +1 (studies agree). " + scoreRangeNote()),
          h("p", null, compared ? EX.ui.supportSentence(claim, topicLabel) : EX.ui.zeroExplanation(claim))));

      // 3. evidence
      var evidence = h("div", { class: "section" }, h("h2", null, "Closest PubMed evidence"));
      var matches = s.top_matches || [];
      if (!matches.length) {
        evidence.appendChild(EX.dom.empty("No PubMed matches to show for this claim."));
      } else {
        var th = function (t, tip) { return h("th", { title: tip || null }, t); };
        evidence.appendChild(h("p", { class: "muted" }, "The " + matches.length + " most similar PubMed claims. " +
          "Evidence weight reflects study design (1.0 = randomized trial). Similarities range from -1 to 1. " +
          "Weighted score = agreement × evidence weight. " +
          "Evidence is drawn from every PubMed claim found for this topic with the same claim type, not only the articles retrieved for this post."));
        var body = h("tbody");
        matches.forEach(function (m) { body.appendChild(matchRow(m, claim, art.articles || {}, art.claims || {})); });
        evidence.appendChild(h("div", { class: "table-wrap" }, h("table", null,
          h("thead", null, h("tr", null, th("Article"), th("Study type", "Design of the study"),
            th("Evidence weight", "How much this study design is trusted (0.15 to 1.0)"),
            th("Claim similarity", "How close the claim texts are in meaning"),
            th("Context similarity", "How close the surrounding context (population, setting) is"),
            th("Direction", "Do the study and the post point the same way?"),
            th("Weighted score", "Agreement multiplied by evidence weight"))), body)));
      }

      // 4. origin
      var origin = h("div", { class: "section" }, h("h2", null, "Where this claim comes from"));
      if (post) {
        origin.appendChild(h("p", null, "From the post ", h("a", { href: postHref }, post.title), "."));
        var ext = (post.stage1 && post.stage1.extraction) || {};
        var rows = [];
        (meta.elmtex_fields || []).forEach(function (f) {
          if (rows.length < 5 && ext[f.key]) rows.push(h("tr", null, h("th", null, f.label), h("td", null, ext[f.key])));
        });
        if (rows.length) origin.appendChild(h("table", { class: "kv" }, h("tbody", null, rows)));
      }

      mountEl.appendChild(h("div", null, top, support, evidence, origin, EX.dom.rawJson(claim)));
    });
  };
})(window.EX);
