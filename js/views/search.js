window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};
  var CAP = 50;

  function group(title, total, items, makeItem, extra) {
    var h = EX.dom.h;
    var ul = h("ul", { class: "plain-list" });
    items.slice(0, CAP).forEach(function (it) { ul.appendChild(makeItem(it)); });
    var sec = h("div", { class: "section" }, h("h2", null, title + " (" + total.toLocaleString("en-US") + ")"));
    if (!total) { sec.appendChild(EX.dom.empty("No matches.")); return sec; }
    sec.appendChild(ul);
    if (total > CAP) {
      var btn = h("a", { class: "toggle", href: "javascript:void(0)", role: "button" }, "Show all " + total.toLocaleString("en-US"));
      btn.onclick = function (ev) {
        ev.preventDefault();
        if (extra) { extra(sec, ul, btn); return; }
        items.slice(CAP).forEach(function (it) { ul.appendChild(makeItem(it)); });
        btn.remove();
      };
      sec.appendChild(btn);
      sec.appendChild(h("p", { class: "muted note" }, "Showing the first " + CAP + "."));
    }
    return sec;
  }

  EX.views.search = function (params, query, mountEl, ctx) {
    var h = EX.dom.h;
    var q = String((query && query.q) || "").trim();
    ctx.setCrumbs([{ label: "Search" }]);
    var intro = h("h1", { class: "page-title" }, "Search");
    if (!q) {
      mountEl.appendChild(h("div", null, intro,
        h("p", { class: "muted" }, "Type words from a post title, a claim or an article title in the box at the top. " +
          "You can also paste a post ID, claim ID or PubMed ID to jump straight to it.")));
      return;
    }
    // Exact ID -> jump (replace so Back works).
    var target = null;
    if (EX.idx.postById[q]) target = "#/post/" + encodeURIComponent(q);
    else if (EX.idx.claimById[q]) target = "#/claim/" + encodeURIComponent(q);
    else if (EX.idx.articleTitles[q]) target = "#/article/" + encodeURIComponent(q);
    if (target) { window.location.replace(target); return; }

    var posts = EX.idx.posts.filter(function (p) { return EX.fmt.textMatch(p.title, q); });
    var claims = EX.idx.claims.filter(function (c) { return EX.fmt.textMatch(c.claim_text, q); });
    var arts = Object.keys(EX.idx.articleTitles).filter(function (id) {
      return EX.fmt.textMatch(EX.idx.articleTitles[id][0], q);
    });

    var postsSec = group("Posts", posts.length, posts, function (p) {
      return h("li", null, h("a", { href: "#/post/" + encodeURIComponent(p.post_id) }, p.title), " ",
        EX.dom.badge("topic", p.topic));
    });
    var claimsSec = group("Claims", claims.length, claims, function (c) {
      return h("li", null, h("a", { href: "#/claim/" + encodeURIComponent(c.claim_id) }, c.claim_text), " ",
        EX.dom.badge("category", c.category), " ", h("span", { class: "muted" }, EX.fmt.label("topic", c.topic)));
    }, function (sec, ul, btn) {
      // Full table with sorting/filters/CSV; q in the hash pre-fills its search box.
      var holder = h("div");
      ul.remove(); btn.remove();
      Array.prototype.forEach.call(sec.querySelectorAll(".note"), function (n) { n.remove(); });
      sec.appendChild(holder);
      new EX.DataTable(holder, {
        rows: claims, searchKeys: ["claim_text"], csvName: "claims_search.csv",
        columns: [
          { key: "claim_text", label: "Claim", render: function (r) {
              return h("a", { href: "#/claim/" + encodeURIComponent(r.claim_id) }, r.claim_text);
            } },
          { key: "topic", label: "Topic", render: function (r) { return EX.fmt.label("topic", r.topic); },
            csv: function (r) { return EX.fmt.label("topic", r.topic); } },
          { key: "category", label: "Category", render: function (r) { return EX.dom.badge("category", r.category); },
            csv: function (r) { return EX.fmt.label("category", r.category); } },
          { key: "confidence", label: "Confidence", render: function (r) {
              return r.n_compared > 0 ? EX.dom.scoreBar(r.confidence) : EX.dom.scoreBar(null);
            }, csv: function (r) { return r.confidence; } }
        ],
        onRowClick: function (r) { EX.router.go("#/claim/" + encodeURIComponent(r.claim_id)); }
      });
    });
    var artsSec = group("Articles", arts.length, arts, function (id) {
      var t = EX.idx.articleTitles[id];
      return h("li", null, h("a", { href: "#/article/" + encodeURIComponent(id) }, t[0]), " ",
        h("span", { class: "muted" }, (t[2] || "") + (t[1] ? " · " + t[1] : "")));
    });

    mountEl.appendChild(h("div", null, intro,
      h("p", { class: "muted" }, "Results for “" + q + "”. Matching ignores upper/lower case."),
      postsSec, claimsSec, artsSec));
  };
})(window.EX);
