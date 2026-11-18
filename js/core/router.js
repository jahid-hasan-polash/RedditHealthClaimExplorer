window.EX = window.EX || {};
(function (EX) {
  // No DOM access at load time; document/window touched only inside functions.
  //
  // VIEW CONTRACT: view(params, query, mountEl, ctx). mountEl is a DETACHED div that is swapped
  // into #main once the view (and its Promise, if any) settles. During render use
  // mountEl.querySelector(...), NEVER document.getElementById/querySelector. For focus or layout
  // measurement use ctx.onMounted(fn) (alias EX.router.onMounted), which runs after the swap.
  // Breadcrumbs are buffered per render and applied at swap time. Async views should call
  // ctx.setCrumbs(items) (token-bound: ignored if the render was superseded). EX.setCrumbs is
  // also safe during the synchronous part of the view; called later from async code it applies
  // to whichever render is current.
  var routes = [];

  function dec(s, plus) {
    try { return decodeURIComponent(plus ? s.replace(/\+/g, " ") : s); } catch (e) { return s; }
  }

  function parse(hash) {
    var s = String(hash || "").replace(/^#/, "");
    var q = s.indexOf("?");
    var pathStr = q >= 0 ? s.slice(0, q) : s;
    var qs = q >= 0 ? s.slice(q + 1) : "";
    var path = pathStr.split("/").filter(function (x) { return x !== ""; }).map(dec);
    var query = {};
    if (qs) {
      qs.split("&").forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf("=");
        var k = dec(i >= 0 ? pair.slice(0, i) : pair, true);
        query[k] = i >= 0 ? dec(pair.slice(i + 1), true) : "";
      });
    }
    return { path: path, query: query };
  }

  function add(pattern, viewFn) {
    var segs = pattern.split("/").filter(function (x) { return x !== ""; });
    routes.push({ segs: segs, viewFn: viewFn });
  }

  function match(path) {
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      if (r.segs.length !== path.length) continue;
      var params = {}, ok = true;
      for (var j = 0; j < r.segs.length; j++) {
        if (r.segs[j].charAt(0) === ":") params[r.segs[j].slice(1)] = path[j];
        else if (r.segs[j] !== path[j]) { ok = false; break; }
      }
      if (ok) return { viewFn: r.viewFn, params: params };
    }
    return null;
  }

  function go(hashPath) {
    var h = String(hashPath || "");
    if (h.charAt(0) !== "#") h = "#" + h;
    window.location.hash = h;
  }

  var token = 0, swapped = false, pendingCrumbs = null, mountedCbs = [], syncToken = null;

  function setCrumbsFor(t, items) {
    if (t !== token) return;           // superseded render: drop
    if (swapped) applyCrumbs(items); else pendingCrumbs = items;
  }
  function setCrumbs(items) { setCrumbsFor(syncToken !== null ? syncToken : token, items); }
  function onMounted(fn) {
    if (swapped) fn(); else mountedCbs.push(fn);
  }

  function applyCrumbs(items) {
    var el = document.getElementById("crumbs");
    if (!el) return;
    el.innerHTML = "";
    (items || []).forEach(function (it, i) {
      if (i > 0) {
        var sep = document.createElement("span");
        sep.className = "crumb-sep";
        sep.textContent = "›";
        el.appendChild(sep);
      }
      var node;
      if (it.href) {
        node = document.createElement("a");
        node.href = it.href;
      } else {
        node = document.createElement("span");
        node.className = "crumb-current";
      }
      node.textContent = it.label;
      el.appendChild(node);
    });
  }

  function errorView(mount, title, msg) {
    mount.innerHTML = "";
    var box = EX.dom.h("div", { class: "card error-view" },
      EX.dom.h("h2", { class: "page-title" }, title),
      EX.dom.h("p", null, msg),
      EX.dom.h("p", null, EX.dom.h("a", { class: "btn", href: "#/" }, "Back to home")));
    mount.appendChild(box);
  }

  function highlightNav(path) {
    var first = path[0] || "";
    var map = { topic: "topics", post: "topics", claim: "topics", category: "categories",
      article: "articles" };
    var key = map[first] || first;
    var links = document.querySelectorAll("#nav a[data-nav]");
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute("data-nav") === key;
      links[i].classList.toggle("active", on);
      if (on) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  }

  function render() {
    var mount = document.getElementById("main");
    if (!mount) return;
    var my = ++token;
    swapped = false; pendingCrumbs = null; mountedCbs = [];
    var p = parse(window.location.hash);
    highlightNav(p.path);
    applyCrumbs([]);
    mount.innerHTML = "";
    window.scrollTo(0, 0);
    var m = match(p.path);
    if (!m) {
      errorView(mount, "Page not found", "There is no page at " + (window.location.hash || "#/") + ".");
      return;
    }
    var loadEl = EX.dom.loading();
    mount.appendChild(loadEl);
    var pane = document.createElement("div");
    var res;
    var ctx = { setCrumbs: function (items) { setCrumbsFor(my, items); },
      onMounted: function (fn) { if (my === token) onMounted(fn); },
      isCurrent: function () { return my === token; } };
    syncToken = my;
    try { res = m.viewFn(m.params, p.query, pane, ctx); }
    catch (e) { syncToken = null; errorView(mount, "Something went wrong", e && e.message ? e.message : String(e)); return; }
    syncToken = null;
    function done() {
      if (my !== token) return;
      mount.innerHTML = "";
      mount.appendChild(pane);
      swapped = true;
      if (pendingCrumbs) applyCrumbs(pendingCrumbs);
      pendingCrumbs = null;
      var cbs = mountedCbs; mountedCbs = [];
      cbs.forEach(function (fn) { fn(); });
    }
    if (res && typeof res.then === "function") {
      res.then(done, function (e) {
        if (my !== token) return;
        errorView(mount, "Something went wrong", e && e.message ? e.message : String(e));
      });
    } else done();
  }

  function start() {
    window.addEventListener("hashchange", render);
    render();
  }

  EX.router = { parse: parse, add: add, match: match, go: go, start: start, render: render, onMounted: onMounted };
  EX.setCrumbs = setCrumbs;
})(window.EX);
