window.EX = window.EX || {};
(function (EX) {
  EX.data = EX.data || {};
  var pending = {};
  EX.register = function (name, data) {
    EX.data[name] = data;
    if (pending[name]) { pending[name].resolve(data); delete pending[name]; }
  };
  EX.load = function (name) {
    if (EX.data[name] !== undefined) return Promise.resolve(EX.data[name]);
    if (pending[name]) return pending[name].promise;
    var p = {};
    p.promise = new Promise(function (res, rej) { p.resolve = res; p.reject = rej; });
    pending[name] = p;
    var s = document.createElement("script");
    s.src = "data/" + name + ".js";
    s.onerror = function () {
      delete pending[name];
      p.reject(new Error("Could not load data file data/" + name + ".js"));
    };
    document.head.appendChild(s);
    return p.promise;
  };
})(window.EX);
