window.EX = window.EX || {};
(function (EX) {
  // Pure helpers have no DOM access; document/window are touched only inside EX.DataTable.
  function isNull(v) { return v === null || v === undefined || v === ""; }

  function filterRows(rows, opts) {
    opts = opts || {};
    var text = String(opts.text || "").trim().toLowerCase();
    var keys = opts.textKeys || [];
    var filters = [], ranges = [];
    Object.keys(opts.filters || {}).forEach(function (k) {
      var v = opts.filters[k];
      if (v !== "" && v !== null && v !== undefined) filters.push([k, String(v)]);
    });
    Object.keys(opts.ranges || {}).forEach(function (k) {
      var r = opts.ranges[k] || [];
      var lo = isNull(r[0]) ? null : Number(r[0]);
      var hi = isNull(r[1]) ? null : Number(r[1]);
      if (lo !== null && isNaN(lo)) lo = null;
      if (hi !== null && isNaN(hi)) hi = null;
      if (lo !== null || hi !== null) ranges.push([k, lo, hi]);
    });
    return rows.filter(function (row) {
      if (text) {
        var hit = false;
        for (var i = 0; i < keys.length && !hit; i++) {
          var v = row[keys[i]];
          if (!isNull(v) && String(v).toLowerCase().indexOf(text) >= 0) hit = true;
        }
        if (!hit) return false;
      }
      for (var f = 0; f < filters.length; f++) {
        if (String(row[filters[f][0]]) !== filters[f][1]) return false;
      }
      for (var r = 0; r < ranges.length; r++) {
        var x = row[ranges[r][0]];
        if (isNull(x) || isNaN(Number(x))) return false;
        x = Number(x);
        if (ranges[r][1] !== null && x < ranges[r][1]) return false;
        if (ranges[r][2] !== null && x > ranges[r][2]) return false;
      }
      return true;
    });
  }

  function sortRows(rows, key, dir) {
    var sign = dir === "desc" ? -1 : 1;
    return rows.map(function (r, i) { return [r, i]; }).sort(function (A, B) {
      var a = A[0][key], b = B[0][key];
      var an = isNull(a), bn = isNull(b);
      if (an || bn) return an && bn ? A[1] - B[1] : an ? 1 : -1;
      var c;
      if (typeof a === "number" && typeof b === "number") c = a - b;
      else c = String(a).localeCompare(String(b));
      return c ? c * sign : A[1] - B[1];
    }).map(function (p) { return p[0]; });
  }

  function paginate(rows, page, size) {
    size = size > 0 ? size : 50;
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total / size));
    page = Math.max(1, Math.min(pages, Math.floor(Number(page)) || 1));
    return { rows: rows.slice((page - 1) * size, page * size), page: page, pages: pages, total: total };
  }

  function csvCell(v) {
    if (isNull(v)) return "";
    var s = String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows, columns) {
    var out = ["﻿" + columns.map(function (c) { return csvCell(c.label); }).join(",") + "\r\n"];
    rows.forEach(function (row) {
      out.push(columns.map(function (c) {
        return csvCell(typeof c.csv === "function" ? c.csv(row) : row[c.key]);
      }).join(",") + "\r\n");
    });
    return out.join("");
  }

  // ---- UI (DOM touched only when called) ----
  function DataTable(mountEl, cfg) {
    var h = EX.dom.h;
    var columns = cfg.columns, allRows = cfg.rows || [];
    var pageSize = cfg.pageSize || 50;
    var filterDefs = cfg.filters || [], rangeDefs = cfg.ranges || [];
    var initial = cfg.initial || {};

    var path = window.location.hash.replace(/^#/, "").split("?")[0];
    var q = EX.router.parse(window.location.hash).query;
    var st = { text: q.q || "", sort: q.sort || initial.sort || "", dir: q.dir || initial.dir || "asc",
      page: parseInt(q.page, 10) || 1, filters: {}, ranges: {} };
    filterDefs.forEach(function (f) {
      var v = q["f_" + f.key];
      if (v === undefined) v = (initial.filters || {})[f.key];
      st.filters[f.key] = v === undefined || v === null ? "" : String(v);
    });
    rangeDefs.forEach(function (r) {
      var s = q["r_" + r.key], lo = "", hi = "";
      if (s) { var i = s.indexOf(".."); if (i >= 0) { lo = s.slice(0, i); hi = s.slice(i + 2); } }
      st.ranges[r.key] = [lo, hi];
    });

    function writeState() {
      var parts = [];
      function add(k, v) { parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); }
      if (st.text) add("q", st.text);
      if (st.sort) { add("sort", st.sort); add("dir", st.dir); }
      if (st.page > 1) add("page", st.page);
      filterDefs.forEach(function (f) { if (st.filters[f.key] !== "") add("f_" + f.key, st.filters[f.key]); });
      rangeDefs.forEach(function (r) {
        var v = st.ranges[r.key];
        if (v[0] !== "" || v[1] !== "") add("r_" + r.key, v[0] + ".." + v[1]);
      });
      try { history.replaceState(null, "", "#" + path + (parts.length ? "?" + parts.join("&") : "")); } catch (e) {}
    }

    var searchInput = h("input", { type: "search", class: "dt-search", placeholder: "Search…",
      "aria-label": "Search table", value: st.text });
    var countEl = h("span", { class: "dt-count muted", "aria-live": "polite" });
    var csvBtn = h("button", { type: "button", class: "btn" }, "Download CSV");
    var toolbar = h("div", { class: "dt-toolbar" }, searchInput);
    filterDefs.forEach(function (f) {
      var sel = h("select", { "aria-label": f.label },
        h("option", { value: "" }, "Any"));
      f.options.forEach(function (o) {
        var op = h("option", { value: o.value }, o.label);
        if (String(o.value) === st.filters[f.key]) op.selected = true;
        sel.appendChild(op);
      });
      sel.value = st.filters[f.key];
      sel.onchange = function () { st.filters[f.key] = sel.value; st.page = 1; update(); };
      toolbar.appendChild(h("label", { class: "dt-field" }, f.label + " ", sel));
    });
    rangeDefs.forEach(function (r) {
      var cur = st.ranges[r.key];
      var attrs = function (v, ph) { return { type: "number", step: r.step || "any", placeholder: ph,
        value: v, class: "dt-range", "aria-label": r.label + " " + ph }; };
      var lo = h("input", attrs(cur[0], "min")), hi = h("input", attrs(cur[1], "max"));
      function chg() { st.ranges[r.key] = [lo.value, hi.value]; st.page = 1; update(); }
      lo.oninput = chg; hi.oninput = chg;
      toolbar.appendChild(h("label", { class: "dt-field" }, r.label + " ", lo, " – ", hi));
    });
    toolbar.appendChild(countEl);
    toolbar.appendChild(csvBtn);

    var thead = h("thead"), tbody = h("tbody");
    var headRow = h("tr");
    var ths = {};
    columns.forEach(function (c) {
      var sortable = c.sortable !== false;
      var th = h("th", { scope: "col", class: sortable ? "sortable" : null,
        title: c.hint || null, style: c.width ? { width: c.width } : null, tabindex: sortable ? "0" : null });
      var ind = h("span", { class: "dt-ind" });
      th.appendChild(document.createTextNode(c.label + " "));
      th.appendChild(ind);
      if (sortable) {
        var toggle = function () {
          if (st.sort === c.key) st.dir = st.dir === "asc" ? "desc" : "asc";
          else { st.sort = c.key; st.dir = "asc"; }
          st.page = 1; update();
        };
        th.onclick = toggle;
        th.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
      }
      ths[c.key] = { th: th, ind: ind };
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    var table = h("table", { class: "dt" }, thead, tbody);
    var wrap = h("div", { class: "table-wrap" }, table);

    var prevBtn = h("button", { type: "button", class: "btn" }, "‹ Prev");
    var nextBtn = h("button", { type: "button", class: "btn" }, "Next ›");
    var pageEl = h("span", { class: "dt-page" });
    var pager = h("div", { class: "dt-pager" }, prevBtn, pageEl, nextBtn);
    prevBtn.onclick = function () { st.page--; update(true); };
    nextBtn.onclick = function () { st.page++; update(true); };

    var root = h("div", { class: "datatable" }, toolbar, wrap, pager);
    mountEl.appendChild(root);

    var filtered = [];
    function recompute() {
      var r = {};
      rangeDefs.forEach(function (d) { r[d.key] = st.ranges[d.key]; });
      var rs = filterRows(allRows, { text: st.text, textKeys: cfg.searchKeys || [], filters: st.filters, ranges: r });
      filtered = st.sort ? sortRows(rs, st.sort, st.dir) : rs;
    }

    function cell(c, row) {
      var td = h("td");
      var v = c.render ? c.render(row) : row[c.key];
      if (v === null || v === undefined) v = "";
      if (typeof v === "object" && v.nodeType) td.appendChild(v);
      else td.appendChild(document.createTextNode(String(v)));
      return td;
    }

    function draw(scrollTop) {
      var p = paginate(filtered, st.page, pageSize);
      st.page = p.page;
      tbody.innerHTML = "";
      var frag = document.createDocumentFragment();
      p.rows.forEach(function (row) {
        var tr = h("tr");
        columns.forEach(function (c) { tr.appendChild(cell(c, row)); });
        if (cfg.onRowClick) {
          tr.className = "clickable";
          tr.tabIndex = 0;
          tr.onclick = function (e) {
            if (e.target && e.target.closest && e.target.closest("a,button,input,select")) return;
            cfg.onRowClick(row);
          };
          tr.onkeydown = function (e) { if (e.key === "Enter" && e.target === tr) cfg.onRowClick(row); };
        }
        frag.appendChild(tr);
      });
      tbody.appendChild(frag);
      columns.forEach(function (c) {
        var t = ths[c.key], on = st.sort === c.key;
        t.ind.textContent = on ? (st.dir === "desc" ? "▼" : "▲") : "";
        if (c.sortable !== false) t.th.setAttribute("aria-sort", on ? (st.dir === "desc" ? "descending" : "ascending") : "none");
      });
      countEl.textContent = p.total + (p.total === 1 ? " result" : " results");
      pageEl.textContent = "Page " + p.page + " of " + p.pages;
      prevBtn.disabled = p.page <= 1;
      nextBtn.disabled = p.page >= p.pages;
      pager.hidden = p.pages <= 1;
      if (scrollTop) wrap.scrollTop = 0;
      writeState();
    }

    function update(pageOnly) {
      if (!pageOnly) recompute();
      draw(pageOnly);
    }

    var timer = null;
    searchInput.oninput = function () {
      clearTimeout(timer);
      timer = setTimeout(function () { st.text = searchInput.value.trim(); st.page = 1; update(); }, 200);
    };

    csvBtn.onclick = function () {
      var csv = toCSV(filtered, columns);
      var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url; a.download = cfg.csvName || "table.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    update();
    return { el: root, getRows: function () { return filtered; }, refresh: update };
  }

  EX.table = { filterRows: filterRows, sortRows: sortRows, paginate: paginate, toCSV: toCSV };
  EX.DataTable = DataTable;
})(window.EX);
