window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};
  var CAP = 50;

  function chips(arr) {
    var h = EX.dom.h;
    return h("span", { class: "chips" }, (arr || []).map(function (t) { return h("span", { class: "chip" }, t); }));
  }

  function picoTable(pico) {
    var h = EX.dom.h;
    if (!pico || !Object.keys(pico).length) {
      return EX.dom.empty("No structured summary (no claims were extracted from this abstract).");
    }
    var defs = [["Population", "population", "Who was studied"], ["Intervention", "intervention", "What was done or given"],
      ["Comparison", "comparison", "What it was compared against"], ["Outcome", "outcome", "What was measured"]];
    var body = h("tbody");
    defs.forEach(function (d) {
      body.appendChild(h("tr", null, h("th", { title: d[2] }, d[0]),
        h("td", null, pico[d[1]] || "—", pico[d[1] + "_terms"] && pico[d[1] + "_terms"].length ? [" ", chips(pico[d[1] + "_terms"])] : null)));
    });
    body.appendChild(h("tr", null, h("th", { title: "Design of the study" }, "Study type"),
      h("td", null, EX.fmt.studyType(pico.study_type))));
    return h("table", { class: "kv" }, body);
  }

  function claimsSection(art, artClaims) {
    var h = EX.dom.h;
    var sec = h("div", { class: "section" }, h("h2", null, "Claims extracted from this abstract"));
    var ids = (art.claim_ids || []).filter(function (id) { return artClaims[id]; });
    if (!ids.length) { sec.appendChild(EX.dom.empty("No claims were extracted from this abstract.")); return sec; }
    var list = h("div", { class: "claim-list" });
    ids.forEach(function (id) {
      var c = artClaims[id];
      list.appendChild(h("div", { class: "card" },
        h("div", { class: "claim-text" }, c.claim_text),
        EX.ui.tripleStrip(c.subject, c.predicate, c.object, c.polarity),
        h("div", { class: "claim-meta" }, EX.dom.badge("claimType", c.claim_type))));
    });
    sec.appendChild(list);
    return sec;
  }

  function postsSection(art) {
    var h = EX.dom.h;
    var sec = h("div", { class: "section" }, h("h2", null, "Retrieved by searches for these posts"));
    var sp = art.source_posts || [];
    if (!sp.length) { sec.appendChild(EX.dom.empty("No post searches recorded for this article.")); return sec; }
    var ul = h("ul", { class: "plain-list" });
    sp.forEach(function (s) {
      var p = EX.idx.postById[s.post_id];
      var q = h("pre", { class: "rawjson" });
      q.textContent = s.query || "";
      ul.appendChild(h("li", null,
        h("a", { href: "#/post/" + encodeURIComponent(s.post_id) }, p ? p.title : "Post " + s.post_id), " ",
        s.topic ? EX.dom.badge("topic", s.topic) : null,
        s.query ? EX.dom.collapsible("PubMed search used", q, false) : null));
    });
    sec.appendChild(ul);
    return sec;
  }

  function usedSection(art) {
    var h = EX.dom.h;
    var sec = h("div", { class: "section" }, h("h2", null, "Used as evidence for these Reddit claims"));
    var ids = (art.derived_matched_by || []).filter(function (id) { return EX.idx.claimById[id]; });
    if (!ids.length) { sec.appendChild(EX.dom.empty("No Reddit claim was matched to this article.")); return sec; }
    var ul = h("ul", { class: "plain-list" });
    function add(id, hidden) {
      var c = EX.idx.claimById[id];
      var li = h("li", { class: hidden ? "extra" : null },
        h("a", { href: "#/claim/" + encodeURIComponent(id) }, c.claim_text), " ",
        EX.dom.badge("category", c.category), " ",
        h("span", { class: "muted" }, EX.fmt.label("topic", c.topic)));
      if (hidden) li.hidden = true;
      ul.appendChild(li);
    }
    ids.forEach(function (id, i) { add(id, i >= CAP); });
    sec.appendChild(h("p", { class: "muted" }, ids.length + " claim" + (ids.length === 1 ? "" : "s") + " where this article was among the 5 closest matches."));
    sec.appendChild(ul);
    if (ids.length > CAP) {
      var open = false;
      var btn = h("a", { class: "toggle", href: "javascript:void(0)", role: "button" }, "Show all " + ids.length);
      btn.onclick = function (ev) {
        ev.preventDefault();
        open = !open;
        Array.prototype.forEach.call(ul.querySelectorAll(".extra"), function (li) { li.hidden = !open; });
        btn.textContent = open ? "Show fewer" : "Show all " + ids.length;
      };
      sec.appendChild(btn);
    }
    return sec;
  }

  EX.views.article = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, pmid = params.pmid;
    ctx.setCrumbs([{ label: "PubMed articles", href: "#/articles" }, { label: "Article " + pmid }]);
    return EX.load("articles").then(function (data) {
      if (!ctx.isCurrent()) return;
      var art = data && data.articles && data.articles[pmid];
      if (!art) {
        ctx.setCrumbs([{ label: "PubMed articles", href: "#/articles" }, { label: "Unknown article" }]);
        return EX.ui.notFound(mountEl, "Article", pmid);
      }
      var short = String(art.title || "").length > 40 ? art.title.slice(0, 39) + "…" : art.title;
      ctx.setCrumbs([{ label: "PubMed articles", href: "#/articles" }, { label: short || "Article " + pmid }]);
      var authors = EX.fmt.authorsLine(art.authors, 6);
      var buttons = h("div", { class: "post-meta" },
        h("a", { class: "btn", href: EX.fmt.pubmedUrl(pmid), target: "_blank", rel: "noopener" }, "Open on PubMed ↗"),
        art.doi ? h("a", { class: "btn", href: EX.fmt.doiUrl(art.doi), target: "_blank", rel: "noopener" }, "DOI ↗") : null);
      var head = h("div", null,
        h("h1", { class: "page-title claim-title" }, art.title || "Article " + pmid),
        h("p", { class: "muted" }, (art.journal || "") + (art.year ? " · " + art.year : "") + " · PMID " + pmid),
        authors ? h("p", null, authors) : null,
        h("div", { class: "post-meta" },
          h("span", { class: "badge badge-status", title: "Design of the study" }, EX.fmt.studyType(art.evidence_strength)),
          h("span", { class: "muted", title: "How much this study design is trusted (0.15 to 1.0)" },
            "Evidence weight " + EX.fmt.num(art.evidence_weight, 2)),
          (art.topics || []).map(function (t) { return EX.dom.badge("topic", t); })),
        buttons);
      var abs = h("div", { class: "section" }, h("h2", null, "Abstract"),
        art.abstract ? h("div", { class: "post-text" }, art.abstract) : EX.dom.empty("No abstract available."));
      var pico = h("div", { class: "section" }, h("h2", null, "Structured summary (PICO)"),
        h("p", { class: "muted note" }, "Population, Intervention, Comparison, Outcome: a standard way to summarise a study."),
        picoTable(art.pico));
      var mesh = (art.mesh_terms || []).length
        ? h("div", { class: "section" }, h("h2", null, "MeSH terms"), chips(art.mesh_terms)) : null;
      mountEl.appendChild(h("div", null, head, abs, pico, mesh, claimsSection(art, data.claims || {}),
        postsSection(art), usedSection(art), EX.dom.rawJson(art)));
    });
  };
})(window.EX);
