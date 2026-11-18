window.EX = window.EX || {};
(function (EX) {
  // Shared view helpers. No DOM access at load time; pure helpers are node-testable.

  function polarityHint(p) {
    if (p > 0) return "↑ increases / harms";
    if (p < 0) return "↓ reduces / helps";
    return "↔ related (no direction)";
  }

  // Claims of the same claim_type among an article's claims (candidates for the matched claim).
  function candidateClaims(article, articleClaims, type) {
    var out = [];
    if (!article || !articleClaims) return out;
    (article.claim_ids || []).forEach(function (id) {
      var c = articleClaims[id];
      if (c && c.claim_type === type) out.push(c);
    });
    return out;
  }

  function zeroExplanation(claim) {
    if (claim.predicate === "correlates_with") {
      return "This claim uses the neutral relation “correlates with”, so it was not compared " +
        "and is labeled anecdotal by default.";
    }
    return "No PubMed claims of this type were found for this topic, so this claim could not be " +
      "compared and is labeled anecdotal by default.";
  }

  function supportSentence(claim, topicLabel) {
    var s = claim.score || {};
    return "Compared with " + s.n_compared + " PubMed claims about " + topicLabel + " of type “" +
      EX.fmt.label("claimType", claim.claim_type) + "”. " + s.n_supporting + " agreed strongly, " +
      s.n_contradicting + " disagreed. Weighted average agreement: " + EX.fmt.num(s.confidence, 2) + ".";
  }

  function tripleStrip(subject, predicate, object, polarity) {
    var h = EX.dom.h;
    return h("div", { class: "triple" },
      h("div", { class: "triple-box" }, h("span", { class: "triple-label" }, "Subject"), subject || "—"),
      h("div", { class: "triple-arrow" }, "→"),
      h("div", { class: "triple-box triple-pred" },
        h("span", { class: "triple-label" }, "Relation"),
        h("strong", null, EX.fmt.label("predicate", predicate)),
        h("span", { class: "muted triple-hint" }, polarityHint(polarity))),
      h("div", { class: "triple-arrow" }, "→"),
      h("div", { class: "triple-box" }, h("span", { class: "triple-label" }, "Object"), object || "—"));
  }

  function claimCard(claim) {
    var h = EX.dom.h, s = claim.score || {};
    var compared = s.n_compared > 0;
    return h("a", { class: "card claim-card", href: "#/claim/" + encodeURIComponent(claim.claim_id) },
      h("div", { class: "claim-text" }, claim.claim_text),
      tripleStrip(claim.subject, claim.predicate, claim.object, claim.polarity),
      h("div", { class: "claim-meta" },
        EX.dom.badge("claimType", claim.claim_type),
        EX.dom.badge("category", s.category),
        compared ? EX.dom.scoreBar(s.confidence) : null,
        h("span", { class: "muted" }, compared ? "Compared with " + s.n_compared + " PubMed claims"
          : "Not compared with PubMed (no comparable claims)")));
  }

  // [title, year, journal] for a pmid from the full article record or the small index.
  function articleInfo(pmid, article) {
    var t = (EX.idx && EX.idx.articleTitles && EX.idx.articleTitles[pmid]) || [];
    return { title: (article && article.title) || t[0] || "Article " + pmid,
      year: (article && article.year) || t[1] || "", journal: (article && article.journal) || t[2] || "" };
  }

  // Fields the SNOMED step never annotates (shown as "not standardized", not "no match").
  var NOT_ANNOTATED = ["age", "gender", "life_style", "family_history", "social_history"];

  function asList(x) {
    if (x === null || x === undefined) return [];
    return Array.isArray(x) ? x : [x];
  }

  function snomedChip(entry) {
    var h = EX.dom.h;
    if (!entry) return h("span", { class: "muted" }, "no match");
    return h("span", { class: "chip", title: entry.fsn || entry.preferredTerm },
      entry.preferredTerm + " (", EX.dom.extLink(EX.fmt.snomedUrl(entry.conceptId), entry.conceptId), ")");
  }

  // Normalized terms + SNOMED chips for one field of stage2 ({fields:{key:{normalized,snomed}}}).
  function standardizedCell(key, s2) {
    var h = EX.dom.h;
    var f = s2 && s2.fields && s2.fields[key];
    var terms = f ? asList(f.normalized) : [];
    if (!terms.length) return h("span", { class: "muted" }, "not standardized");
    var skip = NOT_ANNOTATED.indexOf(key) >= 0;
    var wrap = h("div");
    terms.forEach(function (t, i) {
      wrap.appendChild(h("div", { class: "std-term" }, h("span", null, t + " "),
        skip ? h("span", { class: "muted" }, "not standardized") : snomedChip((f.snomed || [])[i])));
    });
    return wrap;
  }

  // 15-field table. opts.std adds the standardized column; opts.hideEmpty hides empty rows
  // (returned on table.emptyRows); otherwise empty rows are greyed.
  function extractionTable(post, fields, opts) {
    var h = EX.dom.h; opts = opts || {};
    var ext = (post.stage1 && post.stage1.extraction) || {};
    var tbody = h("tbody"), emptyRows = [];
    fields.forEach(function (f) {
      var val = ext[f.key];
      var has = val !== null && val !== undefined && val !== "";
      var tr = h("tr", { class: has ? null : "row-empty" },
        h("td", null, h("strong", null, f.label), " ", h("span", { class: "info", title: f.description }, "ⓘ")),
        h("td", null, has ? val : h("span", { class: "muted" }, "empty")),
        opts.std ? h("td", null, has ? standardizedCell(f.key, post.stage2) : h("span", { class: "muted" }, "—")) : null);
      if (!has) { if (opts.hideEmpty) tr.hidden = true; emptyRows.push(tr); }
      tbody.appendChild(tr);
    });
    var table = h("table", null,
      h("thead", null, h("tr", null, h("th", null, "Category"), h("th", null, "Extracted text"),
        opts.std ? h("th", null, "Standardized terms (SNOMED CT)") : null)), tbody);
    table.emptyRows = emptyRows;
    return table;
  }

  // Pure. Funnel rows for one topic meta entry; claims = EX.idx.claims.
  function funnel(topicMeta, claims) {
    var c = topicMeta.counts, key = topicMeta.key, cmp = 0;
    (claims || []).forEach(function (x) { if (x.topic === key && x.n_compared > 0) cmp++; });
    return [
      { label: "Collected", n: c.raw },
      { label: "Kept after filter", n: c.valuable },
      { label: "Had a search query", n: c.with_query },
      { label: "Found PubMed articles", n: c.with_articles },
      { label: "Claims extracted", n: c.claims },
      { label: "Claims compared with evidence", n: cmp }
    ];
  }

  // Pure. Previous/next post (index order) with same topic and status; null at the ends.
  function neighbors(posts, id) {
    var cur = null, i;
    for (i = 0; i < posts.length; i++) if (posts[i].post_id === id) { cur = posts[i]; break; }
    if (!cur) return { prev: null, next: null };
    var same = posts.filter(function (p) { return p.topic === cur.topic && p.status === cur.status; });
    var k = same.indexOf(cur);
    return { prev: k > 0 ? same[k - 1] : null, next: k >= 0 && k < same.length - 1 ? same[k + 1] : null };
  }

  function topicMeta(key) {
    var ts = (EX.data && EX.data.meta && EX.data.meta.topics) || [];
    for (var i = 0; i < ts.length; i++) if (ts[i].key === key) return ts[i];
    return null;
  }

  function notFound(mountEl, what, id) {
    var h = EX.dom.h;
    mountEl.appendChild(h("div", { class: "card error-view" },
      h("h2", { class: "page-title" }, what + " not found"),
      h("p", { class: "muted" }, "There is no " + what.toLowerCase() + " with ID “" + id + "”."),
      h("p", null, h("a", { class: "btn", href: "#/topics" }, "Browse topics"), " ",
        h("a", { class: "btn", href: "#/" }, "Back to home"))));
  }

  EX.ui = { topicMeta: topicMeta, NOT_ANNOTATED: NOT_ANNOTATED, asList: asList, snomedChip: snomedChip,
    standardizedCell: standardizedCell, extractionTable: extractionTable, funnel: funnel, neighbors: neighbors,
    articleInfo: articleInfo, notFound: notFound, polarityHint: polarityHint, candidateClaims: candidateClaims,
    zeroExplanation: zeroExplanation, supportSentence: supportSentence,
    tripleStrip: tripleStrip, claimCard: claimCard };
})(window.EX);
