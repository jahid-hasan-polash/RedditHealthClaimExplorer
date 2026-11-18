window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};
  var STATUS_LABEL = { valuable: "Kept", rejected: "Filtered out" };

  function extractionSection(post, meta) {
    var h = EX.dom.h, s1 = post.stage1 || {};
    var fields = meta.elmtex_fields || [];
    var table = EX.ui.extractionTable(post, fields, { std: true, hideEmpty: true });
    var emptyRows = table.emptyRows;
    var kept = s1.is_valuable;
    var n = (s1.filled_categories || []).length;
    var summary = h("p", { class: "completeness" },
      n + " of " + fields.length + " categories filled · completeness " + EX.fmt.pct(s1.completeness_score) +
      " (threshold " + EX.fmt.pct(s1.threshold) + ") → ",
      h("strong", { class: kept ? "ok" : "bad" }, kept ? "Kept" : "Filtered out"));
    var toggle = h("label", { class: "toggle" });
    var cb = h("input", { type: "checkbox" });
    cb.addEventListener("change", function () { emptyRows.forEach(function (r) { r.hidden = !cb.checked; }); });
    toggle.appendChild(cb);
    toggle.appendChild(document.createTextNode(" Show empty categories (" + emptyRows.length + ")"));
    return h("div", { class: "section" },
      h("h2", null, "Extracted clinical information"),
      h("p", { class: "muted" }, "A language model read the post and filled in medical categories. " +
        "The completeness score is a weighted share of categories filled; posts below the threshold are filtered out."),
      summary, toggle,
      h("div", { class: "table-wrap" }, table),
      h("p", { class: "muted note" }, "Standardized terms are matched automatically to SNOMED CT medical codes and can be wrong. " +
        "Check the original text before trusting a code. Age, gender, lifestyle, family and social history are not standardized."));
  }

  EX.views.post = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, id = params.id;
    var rec = EX.idx.postById[id];
    if (!rec) {
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown post" }]);
      return EX.ui.notFound(mountEl, "Post", id);
    }
    var meta = EX.data.meta || {};
    var topic = rec.topic;
    var topicLabel = EX.fmt.label("topic", topic);
    return EX.load("topic_" + topic).then(function (data) {
      if (!ctx.isCurrent()) return;
      var post = data.posts && data.posts[id];
      if (!post) {
        ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown post" }]);
        return EX.ui.notFound(mountEl, "Post", id);
      }
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" },
        { label: topicLabel, href: "#/topic/" + topic }, { label: "Post" }]);

      var rejected = post.status === "rejected";
      var enc = encodeURIComponent(id);

      // 1. header
      var header = h("div", null,
        h("h1", { class: "page-title" }, post.title),
        h("div", { class: "post-meta" },
          EX.dom.badge("topic", topic),
          h("span", { class: "badge badge-status" }, STATUS_LABEL[post.status] || post.status),
          h("span", { class: "muted" }, EX.fmt.date(post.created_utc)),
          h("span", { title: "Reddit upvote score" }, "⬆ " + post.score),
          h("span", { title: "Number of comments" }, "💬 " + post.num_comments)),
        h("p", null,
          h("a", { class: "btn", href: EX.fmt.redditUrl(post), target: "_blank", rel: "noopener" }, "Open on Reddit ↗"), " ",
          h("a", { class: "btn btn-primary", href: "#/post/" + enc + "/journey" }, "See pipeline journey")));

      // 2. text
      var textEl = h("div", { class: "post-text" });
      textEl.textContent = post.original_text || post.cleaned_text || "";
      var showingOriginal = true;
      var tbtn = h("button", { class: "btn", type: "button" }, "Show cleaned version");
      var note = h("p", { class: "muted note" }, "Showing the original text as written.");
      tbtn.addEventListener("click", function () {
        showingOriginal = !showingOriginal;
        textEl.textContent = (showingOriginal ? post.original_text : post.cleaned_text) || "";
        tbtn.textContent = showingOriginal ? "Show cleaned version" : "Show original text";
        note.textContent = showingOriginal ? "Showing the original text as written."
          : "Showing the cleaned version (punctuation stripped) that the model actually read.";
      });
      var text = h("div", { class: "section" }, h("h2", null, "What the person wrote"), textEl, tbtn, note);

      // 4. claims
      var claims = ((post.stage5 && post.stage5.claim_ids) || []).map(function (cid) { return data.claims[cid]; })
        .filter(Boolean);
      var claimsSec = h("div", { class: "section" }, h("h2", null, "Claims found in this post (" + claims.length + ")"));
      if (rejected) {
        claimsSec.appendChild(h("p", { class: "card" }, "This post was filtered out at Stage 1, so no claims were extracted. ",
          h("a", { href: "#/post/" + enc + "/journey" }, "See what happened to it in the pipeline journey.")));
      } else if (!claims.length) {
        claimsSec.appendChild(EX.dom.empty("No claims were extracted from this post."));
      } else {
        claimsSec.appendChild(h("div", { class: "claim-list" }, claims.map(EX.ui.claimCard)));
      }

      // 5. articles
      var s4 = post.stage4;
      var artSec = h("div", { class: "section" }, h("h2", null, "PubMed articles retrieved for this post"));
      if (s4 && s4.pmids && s4.pmids.length) {
        artSec.appendChild(h("p", { class: "muted" },
          "PubMed had " + s4.total_count + " matching articles; top " + s4.pmids.length + " kept. " +
          "These articles were found by this post's search. Claims are compared with PubMed claims from all searches on this topic, not just these."));
        var ul = h("ul", { class: "plain-list" });
        s4.pmids.forEach(function (pm) {
          var info = EX.ui.articleInfo(pm);
          ul.appendChild(h("li", null,
            h("a", { href: "#/article/" + encodeURIComponent(pm) }, info.title),
            h("span", { class: "muted" }, (info.journal ? " · " + info.journal : "") + (info.year ? " · " + info.year : "") + " · "),
            EX.dom.extLink(EX.fmt.pubmedUrl(pm), "PubMed ↗")));
        });
        artSec.appendChild(ul);
      } else {
        artSec.appendChild(EX.dom.empty(rejected ? "No PubMed search was run because the post was filtered out."
          : "No PubMed articles were retrieved for this post."));
      }

      mountEl.appendChild(h("div", null, header, text,
        extractionSection(post, meta), claimsSec, artSec, EX.dom.rawJson(post)));
    });
  };
})(window.EX);
