window.EX = window.EX || {};
(function (EX) {
  EX.views = EX.views || {};

  // CONTRACT: views build into a DETACHED mountEl (swapped in after render). Use
  // mountEl.querySelector, never document.getElementById, during render; use ctx.onMounted(fn)
  // (4th arg) for focus/measure and ctx.setCrumbs for async crumbs. See router.js header.
  // pattern -> view name. Each view file defines EX.views.<name>(params, query, mountEl).
  var ROUTES = [
    ["/", "home"],
    ["/topics", "topics"],
    ["/topic/:topic", "topic"],
    ["/post/:id", "post"],
    ["/post/:id/journey", "journey"],
    ["/claim/:id", "claim"],
    ["/categories", "categories"],
    ["/category/:cat", "category"],
    ["/articles", "articles"],
    ["/article/:pmid", "article"],
    ["/pipeline", "pipeline"],
    ["/guide", "guide"],
    ["/search", "search"]
  ];

  function comingSoon(name, mount) {
    mount.appendChild(EX.dom.h("div", { class: "card error-view" },
      EX.dom.h("h2", { class: "page-title" }, "This page is coming soon"),
      EX.dom.h("p", { class: "muted" }, "The “" + name + "” view has not been built yet."),
      EX.dom.h("p", null, EX.dom.h("a", { class: "btn", href: "#/" }, "Back to home"))));
  }

  function buildIndex() {
    var raw = EX.data.index || {};
    var posts = EX.fmt.expandColumnar(raw.posts);
    var claims = EX.fmt.expandColumnar(raw.claims);
    var postById = {}, claimById = {};
    posts.forEach(function (p) { postById[p.post_id] = p; });
    claims.forEach(function (c) { claimById[c.claim_id] = c; });
    EX.idx = { posts: posts, claims: claims, postById: postById, claimById: claimById,
      articleTitles: raw.article_titles || {} };
  }

  function setupShell() {
    var meta = EX.data.meta || {};
    var f = document.getElementById("footer-date");
    if (f && meta.generated_at) f.textContent = " · Generated " + EX.fmt.date(meta.generated_at);
    var form = document.getElementById("search-form");
    if (form) form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = form.elements.q.value.trim();
      window.location.hash = "#/search?q=" + encodeURIComponent(v);
    });
  }

  EX.boot = function () {
    var main = document.getElementById("main");
    try {
      buildIndex();
    } catch (e) {
      if (main) {
        main.innerHTML = "";
        main.appendChild(EX.dom.h("div", { class: "card error-view" },
          EX.dom.h("h2", { class: "page-title" }, "Could not load data"),
          EX.dom.h("p", null, "data/meta.js or data/index.js is missing or invalid: " + e.message)));
      }
      return;
    }
    setupShell();
    ROUTES.forEach(function (r) {
      var name = r[1];
      EX.router.add(r[0], function (params, query, mount, ctx) {
        var v = EX.views[name];
        if (typeof v !== "function") return comingSoon(name, mount);
        return v(params, query, mount, ctx);
      });
    });
    EX.router.start();
  };
})(window.EX);
