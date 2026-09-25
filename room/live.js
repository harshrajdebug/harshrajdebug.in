// Page behaviour that does not need 3D: live PR state from GitHub, the copy
// button, and the plain view. The scene reads the same data-kind attributes.
(function () {
  var entries = document.querySelectorAll(".entry[data-pr]");
  entries.forEach(function (el) {
    var s = el.querySelector("[data-state]");
    s.setAttribute("data-kind", s.textContent.trim());
  });

  var copy = document.getElementById("copy");
  copy.addEventListener("click", function () {
    var mail = document.getElementById("mail");
    var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); };
    var select = function () {
      var r = document.createRange(); r.selectNodeContents(mail);
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(mail.textContent).then(done, select);
    else select();
  });

  var toggle = document.getElementById("plain-toggle");
  toggle.addEventListener("click", function () {
    var on = document.body.classList.toggle("plain");
    toggle.textContent = on ? "3D view" : "Plain view";
    document.dispatchEvent(new CustomEvent("plainview", { detail: on }));
  });

  var url = "https://api.github.com/search/issues?q=" + encodeURIComponent("author:harshrajdebug type:pr") + "&per_page=100";
  fetch(url, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var byKey = {}, repos = {}, merged = 0, total = 0;
      data.items.forEach(function (it) {
        var repo = it.repository_url.replace("https://api.github.com/repos/", "");
        if (repo.indexOf("harshrajdebug/") === 0) return; // own repos are not contributions
        var isMerged = !!(it.pull_request && it.pull_request.merged_at);
        byKey[repo + "#" + it.number] = isMerged ? "merged" : it.state;
        repos[repo] = true;
        total++;
        if (isMerged) merged++;
      });
      entries.forEach(function (el) {
        var kind = byKey[el.getAttribute("data-pr")];
        if (!kind) return;
        var s = el.querySelector("[data-state]");
        s.textContent = kind;
        s.setAttribute("data-kind", kind);
      });
      set("prs", total); set("projects", Object.keys(repos).length); set("merged", merged);
      document.dispatchEvent(new Event("prstates"));
    })
    .catch(function () { /* keep the static values */ });

  function set(name, value) {
    var el = document.querySelector('[data-stat="' + name + '"]');
    if (el && value > 0) el.textContent = value;
  }
})();
