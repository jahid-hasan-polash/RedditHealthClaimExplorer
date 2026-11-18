window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  function panel(title, node) {
    var h = EX.dom.h;
    return h("div", { class: "io-panel" }, h("h4", null, title), node);
  }

  // One stepper row. input/output are nodes (or null when disabled).
  function step(n, title, what, input, output, extra, disabled) {
    var h = EX.dom.h;
    var body = h("div", { class: "step-body" }, h("h3", null, title), h("p", { class: "what" },
      h("strong", null, "What happened: "), what));
    if (!disabled) body.appendChild(h("div", { class: "io-grid" }, panel("Input", input), panel("Output", output)));
    if (extra) body.appendChild(extra);
    return h("div", { class: "step" + (disabled ? " disabled" : ""), id: "step-" + n },
      h("div", { class: "step-num" }, String(n)), body);
  }

  function textBox(t) {
    var el = EX.dom.h("div", { class: "post-text post-text-sm" });
    el.textContent = t || "";
    return el;
  }

  function chipList(items, empty) {
    var h = EX.dom.h, list = EX.ui.asList(items).filter(Boolean);
    if (!list.length) return h("span", { class: "muted" }, empty || "none");
    return h("span", { class: "chips" }, list.map(function (t) { return h("span", { class: "chip" }, t); }));
  }

  function labeled(label, node) {
    var h = EX.dom.h;
    return h("div", { class: "io-row" }, h("span", { class: "io-label" }, label), node);
  }

  function gauge(score, threshold, status) {
    var h = EX.dom.h;
    var pct = Math.max(0, Math.min(100, (Number(score) || 0) * 100));
    var thr = Math.max(0, Math.min(100, (Number(threshold) || 0) * 100));
    var known = score !== null && score !== undefined;
    var cls = !known ? "" : (status === "valuable" ? "ok" : "bad");
    return h("div", { class: "gauge", title: "Completeness " + EX.fmt.pct(score) + ", threshold " + EX.fmt.pct(threshold) },
      h("div", { class: "gauge-track" },
        h("div", { class: "gauge-fill " + cls, style: { width: pct + "%" } }),
        h("div", { class: "gauge-mark", style: { left: thr + "%" } })),
      h("div", { class: "muted gauge-caption" }, "Completeness " + EX.fmt.pct(score) +
        " · threshold " + EX.fmt.pct(threshold) + " (marker)"));
  }

  EX.views.journey = function (params, query, mountEl, ctx) {
    var h = EX.dom.h, id = params.id, enc = encodeURIComponent(id);
    var rec = EX.idx.postById[id];
    if (!rec) {
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown post" }]);
      return EX.ui.notFound(mountEl, "Post", id);
    }
    var meta = EX.data.meta || {}, topic = rec.topic, topicLabel = EX.fmt.label("topic", topic);
    return EX.load("topic_" + topic).then(function (data) {
      if (!ctx.isCurrent()) return;
      var post = data.posts && data.posts[id];
      if (!post) {
        ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: "Unknown post" }]);
        return EX.ui.notFound(mountEl, "Post", id);
      }
      ctx.setCrumbs([{ label: "Topics", href: "#/topics" }, { label: topicLabel, href: "#/topic/" + topic },
        { label: "Post", href: "#/post/" + enc }, { label: "Pipeline journey" }]);

      var s1 = post.stage1 || {}, rejected = post.status === "rejected";
      var fields = meta.elmtex_fields || [];
      var stages = meta.stages || [];
      function stg(n) { return stages.filter(function (x) { return x.n === n; })[0] || {}; }
      function what(n) { return stg(n).description || ""; }
      function ttl(n) { return n + ". " + (stg(n).title || "Step"); }
      var skipped = "Skipped: this post was filtered out in step 1, so this step never ran.";
      var steps = [];

      // 0
      steps.push(step(0, ttl(0), what(0),
        h("div", null,
          labeled("Subreddit", h("span", null, (EX.ui.topicMeta(topic) || {}).subreddit || topic)),
          labeled("Posted", h("span", null, EX.fmt.date(post.created_utc))),
          labeled("Upvotes", h("span", null, String(post.score))),
          labeled("Comments", h("span", null, String(post.num_comments))),
          panel("Original text", textBox(post.original_text))),
        panel("Cleaned text (punctuation stripped)", textBox(post.cleaned_text))));

      // 1
      var table = EX.ui.extractionTable(post, fields, { std: false });
      var filled = (s1.filled_categories || []).length;
      var verdict = h("p", null, "Verdict: ", h("strong", { class: rejected ? "bad" : "ok" },
        rejected ? "Filtered out (below threshold)" : "Kept"));
      var stop = rejected ? h("div", { class: "stop-marker" }, "⛔ Stopped here. This post did not pass the filter, so the later steps were not run.") : null;
      steps.push(step(1, ttl(1), what(1),
        textBox(post.cleaned_text),
        h("div", null, h("p", { class: "muted" }, filled + " of " + fields.length + " categories filled. Empty ones are greyed."),
          h("div", { class: "table-wrap" }, table),
          gauge(s1.completeness_score, s1.threshold, post.status), verdict),
        stop));

      // 2..6
      if (rejected) {
        [2, 3, 4, 5, 6].forEach(function (n) { steps.push(step(n, ttl(n), skipped, null, null, null, true)); });
      } else {
        // 2
        var s2 = post.stage2;
        var t2 = EX.ui.extractionTable(post, fields.filter(function (f) { return s1.extraction && s1.extraction[f.key]; }),
          { std: true });
        steps.push(step(2, ttl(2), what(2),
          h("p", { class: "muted" }, "The extracted text of each filled category (left column of the output table)."),
          s2 ? h("div", null, h("div", { class: "table-wrap" }, t2),
            h("p", { class: "muted note" }, "Age, gender, lifestyle, family and social history are never matched to SNOMED. Matches can be wrong."))
            : EX.dom.empty("No standardization data for this post.")));

        // 3
        var s3 = post.stage3;
        var hasQ = s3 && s3.query_string;
        steps.push(step(3, ttl(3), what(3),
          h("div", null, labeled("Diagnosis", chipList(s3 && s3.condition_terms)),
            labeled("Treatment", chipList(s3 && s3.intervention_terms)),
            labeled("Outcome", chipList(s3 && s3.outcome_terms))),
          hasQ ? h("div", null, h("div", { class: "io-label" }, "PubMed query"), h("code", { class: "query" }, s3.query_string))
            : h("p", { class: "muted" }, "No query was built: this post did not have enough diagnosis, treatment or outcome terms to search PubMed.")));

        // 4
        var s4 = post.stage4;
        var out4;
        if (s4 && s4.pmids && s4.pmids.length) {
          var ul = h("ul", { class: "plain-list" });
          s4.pmids.forEach(function (pm) {
            var info = EX.ui.articleInfo(pm);
            ul.appendChild(h("li", null, h("a", { href: "#/article/" + encodeURIComponent(pm) }, info.title),
              h("span", { class: "muted" }, (info.year ? " · " + info.year : "") + " · "),
              EX.dom.extLink(EX.fmt.pubmedUrl(pm), "PubMed ↗")));
          });
          out4 = h("div", null, h("p", null, "PubMed has " + s4.total_count + " matching articles. Top " + s4.pmids.length + " kept:"), ul);
        } else {
          out4 = h("p", { class: "muted" }, hasQ ? "The search returned no usable articles." : "No search was run because there was no query.");
        }
        steps.push(step(4, ttl(4), what(4),
          hasQ ? h("code", { class: "query" }, s3.query_string) : h("p", { class: "muted" }, "No query."), out4));

        // 5, 6
        var claims = ((post.stage5 && post.stage5.claim_ids) || []).map(function (c) { return data.claims[c]; }).filter(Boolean);
        var cl5 = claims.length ? h("div", { class: "claim-list" }, claims.map(function (c) {
          return h("div", { class: "card" }, h("div", { class: "claim-text" }, c.claim_text),
            EX.ui.tripleStrip(c.subject, c.predicate, c.object, c.polarity));
        })) : EX.dom.empty("No claims were extracted from this post.");
        var text5 = String(post.cleaned_text || "");
        var filledList = fields.filter(function (f) { return s1.extraction && s1.extraction[f.key]; }).map(function (f) {
          return h("li", null, h("strong", null, f.label + ": "), String(s1.extraction[f.key]));
        });
        var in5 = h("div", null, h("p", { class: "excerpt" }, text5.length > 300 ? text5.slice(0, 300) + "…" : text5),
          h("ul", { class: "plain-list compact" }, filledList));
        steps.push(step(5, ttl(5), what(5),
          in5, cl5));
        var cl6 = claims.length ? h("ul", { class: "plain-list" }, claims.map(function (c) {
          var s = c.score || {};
          return h("li", { class: "claim-meta" },
            EX.dom.badge("category", s.category),
            s.n_compared > 0 ? EX.dom.scoreBar(s.confidence) : h("span", { class: "muted" }, "not compared"),
            h("a", { href: "#/claim/" + encodeURIComponent(c.claim_id) }, c.claim_text));
        })) : EX.dom.empty("Nothing to score.");
        steps.push(step(6, ttl(6), what(6),
          claims.length ? h("ul", { class: "plain-list compact" }, claims.map(function (c) {
            return h("li", null, c.claim_text, " ", h("span", { class: "muted" }, "(" + EX.fmt.label("claimType", c.claim_type) + ")"));
          })) : h("p", { class: "muted" }, "No claims."), cl6));
      }

      var nb = EX.ui.neighbors(EX.idx.posts, id);
      function navLink(p, text) {
        return p ? h("a", { class: "btn", href: "#/post/" + encodeURIComponent(p.post_id) + "/journey", title: p.title }, text)
          : h("span", { class: "btn disabled-btn muted" }, text);
      }
      var kind = rejected ? "filtered-out" : "kept";
      mountEl.appendChild(h("div", null,
        h("h1", { class: "page-title" }, "Pipeline journey"),
        h("p", { class: "lead" }, post.title),
        h("p", null, h("a", { class: "btn", href: "#/post/" + enc }, "← Back to post"), " ",
          h("a", { class: "btn", href: "#/pipeline" }, "About the pipeline")),
        h("div", { class: "stepper" }, steps),
        h("div", { class: "journey-nav" }, navLink(nb.prev, "← Previous " + kind + " post in " + topicLabel),
          navLink(nb.next, "Next " + kind + " post in " + topicLabel + " →"))));
    });
  };
})(window.EX);
