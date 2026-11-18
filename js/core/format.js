window.EX = window.EX || {};
(function (EX) {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var META_KEY = { topic: "topics", category: "categories", field: "elmtex_fields",
    claimType: "claim_types", predicate: "predicates" };

  function isNil(x) { return x === null || x === undefined || (typeof x === "number" && isNaN(x)); }

  EX.fmt = {
    expandColumnar: function (t) {
      var cols = t.columns;
      return t.rows.map(function (r) {
        var o = {};
        for (var i = 0; i < cols.length; i++) o[cols[i]] = r[i];
        return o;
      });
    },
    num: function (x, digits) {
      if (isNil(x)) return "—";
      return Number(x).toFixed(digits === undefined ? 2 : digits);
    },
    pct: function (x) {
      if (isNil(x)) return "—";
      return Math.round(Number(x) * 100) + "%";
    },
    date: function (s) {
      if (!s) return "—";
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
      if (!m) return String(s);
      var mon = MONTHS[parseInt(m[2], 10) - 1];
      if (!mon) return String(s);
      return parseInt(m[3], 10) + " " + mon + " " + m[1];
    },
    redditUrl: function (post) {
      return post.reddit_url || "https://www.reddit.com/comments/" + post.post_id;
    },
    pubmedUrl: function (pmid) { return "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"; },
    doiUrl: function (doi) { return "https://doi.org/" + doi; },
    snomedUrl: function (id) {
      return "https://browser.ihtsdotools.org/?perspective=full&conceptId1=" + id;
    },
    label: function (kind, key) {
      var meta = EX.data && EX.data.meta;
      var arr = meta && meta[META_KEY[kind]];
      if (arr) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].key === key) return arr[i].label;
        }
      }
      return String(key).replace(/_/g, " ");
    },
    // Plain-language study design label: "cross-sectional_study" -> "Cross-sectional study".
    studyType: function (raw) {
      var s = isNil(raw) ? "" : String(raw).replace(/_/g, " ").replace(/\s+/g, " ").trim();
      if (!s) return "Unknown";
      s = s.replace(/\b(rcts?)\b/gi, function (m) { return m.toLowerCase() === "rct" ? "RCT" : "RCTs"; });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    // First `max` (default 6) authors, then "et al."; "" when none.
    authorsLine: function (authors, max) {
      var a = (authors || []).filter(Boolean), n = max || 6;
      if (!a.length) return "";
      return a.slice(0, n).join(", ") + (a.length > n ? " et al." : "");
    },
    // Most common prettified study types (ties alphabetical), at most n.
    topStudyTypes: function (rawList, n) {
      var counts = {};
      rawList.forEach(function (r) { var k = EX.fmt.studyType(r); counts[k] = (counts[k] || 0) + 1; });
      return Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
      }).slice(0, n);
    },
    // Case-insensitive substring test; empty query never matches.
    textMatch: function (text, q) {
      q = String(q || "").trim().toLowerCase();
      return q !== "" && String(text || "").toLowerCase().indexOf(q) >= 0;
    },
    topicOf: function (id) {
      var idx = EX.idx;
      if (!idx) return null;
      var rec = (idx.postById && idx.postById[id]) || (idx.claimById && idx.claimById[id]);
      return rec && rec.topic ? rec.topic : null;
    }
  };
})(window.EX);
