/* HARSH_OS: boot log, module nav (↑↓ + Enter), a working prompt, and one file per finding. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

// ================================================================ findings (each line checked against its pull request)
const FILES = [
  { id: "kyverno-17608", file: "KYVERNO_17608.pass", project: "Kyverno", pr: "kyverno/kyverno#17608", state: "merged", claimed: "pass",
    title: "A policy check that passed while checking nothing.",
    said: "kyverno apply → clean pass", did: "kinds resolved → 0",
    why: "When the CLI works out which resource kinds to fetch, it reads each policy's match constraints through a chain of type accessors. NamespacedValidatingPolicy and NamespacedImageValidatingPolicy had no branch, so their match constraints stayed nil, no kinds were registered, and no resources were fetched. The policy was then evaluated against an empty set. Nothing errored, so the run read as a clean pass.",
    fix: "Add the two missing branches in extractResourcesFromPolicies, completing the gap an earlier fix closed for the mutating, generating and deleting kinds." },
  { id: "keda-8193", file: "KEDA_8193.pool", project: "KEDA", pr: "kedacore/keda#8193", also: ["kedacore/keda#8213"], state: "merged", claimed: "closed",
    title: "A connection pool that never let go.",
    said: "scaler closed", did: "held connections → 5, 10, 15",
    why: "The external scaler's gRPC pool never released an entry. Its cleanup goroutine waited for the connection to reach Shutdown, but a connection only reaches Shutdown when Close() is called, and the only Close() was inside that goroutine. The scaler's own Close() returned nil. Every scaler address ever configured left a connection, a pool entry and a blocked goroutine behind.",
    fix: "Reference counting at the scaler's lifetime: acquire on construction, release on Close, and close the connection when no scaler is left using it. Measured against the real operator: held connections went 5 → 10 → 15 before, 0 → 0 → 0 after." },
  { id: "pipecd-7412", file: "PIPECD_7412.sync", project: "PipeCD", pr: "pipe-cd/pipecd#7412", state: "merged", claimed: "Synced",
    title: "A rollback reported as synced while still running the old revision.",
    said: "application → Synced", did: "running → previous revision",
    why: "The live-state sync check compares the commit hash tag on the PRIMARY ECS task set with the latest commit. The rollback task set was tagged with the commit that had just been rolled back, so the application showed as Synced while it ran the previous revision.",
    fix: "LoadServiceDefinition takes the deployment source it loads from. The rollback stage passes the running source, so its task set carries the running commit; sync, primary and canary are unchanged." },
  { id: "volcano-6046", file: "VOLCANO_6046.reclaim", project: "Volcano", pr: "volcano-sh/volcano#6046", state: "open", claimed: "reclaiming",
    title: "A reclaim that evicted the same job over and over and never placed the one it was for.",
    said: "gangreclaim → reclaiming", did: "evictions → 157 a minute",
    why: "With the scheduler config from the v1.15.0 release notes, gangreclaim had no plugin that orders queues or reports them overused, so nothing defined a queue's share. It evicted a lower-priority job in another queue, the evicted Pods were recreated and allocated straight back to their own queue, and the next session evicted them again. On a live cluster: 157 evictions in 60 seconds, the victim job repeatedly at 0 running Pods, and the high-priority job never placed.",
    fix: "gangreclaim now skips when no enabled plugin orders queues or reports them overused, which covers proportion, capacity, drf with hierarchy and extender. Verified on a patched v1.15.3 cluster: 0 evictions with the release notes config, unchanged behaviour with capacity." },
  { id: "pipecd-7443", file: "PIPECD_7443.stage", project: "PipeCD", pr: "pipe-cd/pipecd#7443", state: "open", claimed: "resume",
    title: "Restarting piped cancelled the deployment and ran the rollback.",
    said: "piped restarted → resume", did: "deployment → cancelled, rolled back",
    why: "The stop signal cancels a stage's context for a cancel, a timeout and a termination alike, so the error was always context.Canceled and every stage stopped mid-run was reported as STAGE_CANCELLED. After piped restarted, the scheduler found the cancelled stage, marked the deployment cancelled and ran the rollback stages.",
    fix: "Take the stage status from the stop signal: a termination keeps the original status, a timeout fails the stage, and a cancel still cancels it. A test restarts the scheduler mid-stage and checks the stage runs again and the rollback does not." },
  { id: "pipecd-7440", file: "PIPECD_7440.lock", project: "PipeCD", pr: "pipe-cd/pipecd#7440", state: "open", claimed: "cancelled",
    title: "A cancelled Terraform stage that left the state lock held.",
    said: "stage → cancelled", did: "state lock → still held",
    why: "Cancelling a Terraform stage killed terraform apply. On a backend that locks the state remotely, the lock stayed held and resources not yet saved were dropped from the state, so the next plan or apply failed on the held lock.",
    fix: "Interrupt terraform with SIGINT on cancel and kill it only after a one-minute grace period. Run against a real locking backend with terraform 1.16.4: the lock is released, the resource is recorded, and the next plan works." },
  { id: "kubeflow-4155", file: "KUBEFLOW_4155.name", project: "Kubeflow", pr: "kubeflow/trainer#4155", state: "open", claimed: "Created",
    title: "OptimizationJob names the controller accepted and then could not use.",
    said: "job → Created", did: "trials → rejected",
    why: "OptimizationJob had no rule on its name, but the controller copies it into TrainJob, Service and label names that have stricter rules. A leading digit got every trial rejected while the job showed Created, a dot got the Service rejected, a name over 63 characters failed the Deployment's label, and none of them ever set a Failed condition. Two long names sharing their first 46 characters also shared one algorithm Service, and the first job to finish deleted it.",
    fix: "Apply the TrainJob name rules to OptimizationJob, and add a hash of the full name when a long name is cut, so each job gets its own algorithm Service." },
  { id: "kyverno-17831", file: "KYVERNO_17831.scope", project: "Kyverno", pr: "kyverno/kyverno#17831", state: "open", claimed: "fail",
    title: "Namespaced policies judging resources in other namespaces.",
    said: "team-b pod → fail", did: "policy scope → team-a only",
    why: "The CLI evaluated namespaced CEL policies against resources in every namespace. A NamespacedValidatingPolicy in team-a failed Pods in team-b, and the mutating, image validating and deleting kinds did the same. In a cluster a namespaced policy only ever sees its own namespace, so kyverno apply and kyverno test reported results that cannot happen at admission.",
    fix: "Pass the same namespace predicate the admission handlers already use, at all four CLI call sites." },
  { id: "kyverno-17838", file: "KYVERNO_17838.count", project: "Kyverno", pr: "kyverno/kyverno#17838", state: "open", claimed: "pass: 2",
    title: "One mutation counted, printed and written twice.",
    said: "summary → pass: 2", did: "mutations applied → 1",
    why: "kyverno apply counted every MutatingPolicy response twice, once directly and once inside the function that also prints it, so one mutated resource reported pass: 2 and one error reported error: 2. The empty response for a Pod policy's autogen copy also printed the unchanged resource again and appended it to the -o output file.",
    fix: "Count each response once and only print and write responses that carry rules. Tests cover pass, skip and error, and kyverno apply -o end to end." },
  { id: "kgateway-14749", file: "KGATEWAY_14749.ca", project: "kgateway", pr: "kgateway-dev/kgateway#14749", state: "open", claimed: "Accepted",
    title: "A policy that said Accepted while Envoy rejected the backend.",
    said: "policy → Accepted", did: "envoy → cluster rejected",
    why: "A BackendConfigPolicy with tls.secretRef sent the Secret's ca.crt to Envoy without parsing it. If the value was not a PEM certificate, Envoy rejected the cluster, while the policy still reported Accepted: True and Attached: True. Nothing told the user why the backend stopped working.",
    fix: "Validate ca.crt with the same helper BackendTLSPolicy and Gateway listeners already use. An invalid value now reports Accepted: False with reason Invalid and names the Secret." },
  { id: "kgateway-14760", file: "KGATEWAY_14760.san", project: "kgateway", pr: "kgateway-dev/kgateway#14760", state: "open", claimed: "Accepted",
    title: "Backends with SPIFFE or IP certificates that could never pass verification.",
    said: "policy → Accepted", did: "spiffe backend → 503",
    why: "Every verifySubjectAltNames entry was sent to Envoy as a DNS SAN matcher. A typed matcher compares against one SAN type, so a backend whose certificate carries its identity as a URI (a SPIFFE ID), an IP address or an email never matched. Every connection failed with a 503 while the policy reported Accepted.",
    fix: "Pick the SAN type from the value: IP addresses as IP_ADDRESS, values with a scheme as URI, values with an @ as EMAIL, everything else stays DNS. Hostnames produce the same config as before." },
  { id: "kyverno-17620", file: "KYVERNO_17620.patch", project: "Kyverno", pr: "kyverno/kyverno#17620", state: "open", claimed: "accepted",
    title: "One patch value that crashed the whole webhook.",
    said: "patch value → accepted", did: "webhook → panic",
    why: "A MutatingPolicy whose JSONPatch sets a value to a list of Object initializers hit a type mismatch in the value conversion: a *structpb.Struct where a *structpb.Value was expected. The panic was never recovered, so it took down the mutating webhook, and every affected admission request failed with EOF. One policy was enough.",
    fix: "A new patchValueToJSON converts object values through their native map and encodes lists element by element, so the mismatched conversion is never requested. Every other value keeps the existing path." },
  { id: "volcano-6002", file: "VOLCANO_6002.topo", project: "Volcano", pr: "volcano-sh/volcano#6002", state: "open", claimed: "accepted",
    title: "A topology link the scheduler dropped without a word.",
    said: "HyperNode → accepted", did: "parent/child link → dropped",
    why: "A HyperNode member of type HyperNode is only ever resolved by exactMatch, but nothing enforced that. A regexMatch member was admitted, then silently resolved to nothing: no event, nothing logged above V(5), and the topology the scheduler used was not the one written. One exported path also dereferenced the nil.",
    fix: "A CEL rule refuses the combination at the API, and a nil guard keeps the scheduler safe on HyperNodes that already exist." },
  { id: "openkruise-1001", file: "OPENKRUISE_1001.label", project: "OpenKruise", pr: "openkruise/agents#1001", state: "open", claimed: "propagated",
    title: "Claim labels overwriting labels the controller owns.",
    said: "claim labels → propagated", did: "controller labels → overwritten",
    why: "A SandboxClaim's labels were copied onto the Sandbox and its pod template without filtering the controller's reserved prefix. A claim label under that prefix overwrote a label the controller owns, such as sandbox-pool, and was recorded as claim-supplied, so recycling deleted it. The next recycle failed permanently and the Sandbox was deleted.",
    fix: "Filter reserved-prefix labels out of claim propagation, the same way the claim's annotations already are." },
  { id: "kubeedge-7307", file: "KUBEEDGE_7307.token", project: "KubeEdge", pr: "kubeedge/kubeedge#7307", state: "open", claimed: "cached",
    title: "Offline edge nodes that could not start pods.",
    said: "edge node → offline, token cached", did: "pod start → fails",
    why: "A node cut off from the cloud could not start pods that mount a service account token. The cached token was deleted 49 minutes in, with 11 minutes of validity left, before any replacement existed; offline, none ever arrived. The token lookup also had no fallback.",
    fix: "Carries a community commit that stops the early deletion, plus a fallback to the still-valid cached token when a refresh fails." },
];
FILES.forEach((f, i) => { f.i = i; f.n = String(i + 1).padStart(2, "0"); f.num = f.pr.split("#")[1]; f.url = prUrl(f.pr); f.also = f.also || []; });
function prUrl(pr) { return `https://github.com/${pr.replace("#", "/pull/")}`; }
function prLinks(f) { return [f.pr, ...f.also].map((pr) => `<a href="${prUrl(pr)}" target="_blank" rel="noopener">${esc(pr)} ↗</a>`).join(" + "); }
function alsoLinks(f) { return f.also.map((pr) => ` <a class="pr" href="${prUrl(pr)}" target="_blank" rel="noopener">+ #${esc(pr.split("#")[1])}</a>`).join(""); }
const PAGES = ["home", "work", "about", "resume"];

// ================================================================ work table
function stateSpan(s) { return `<span class="st st--${esc(s)}">${esc(s)}</span>`; }
function renderFiles() {
  $("#files").innerHTML = FILES.map((f) => `
    <div class="row" role="row"><button class="fname" type="button" aria-expanded="false" aria-controls="det-${f.id}" data-file="${f.i}">${esc(f.file)}</button><span>${esc(f.project)}</span>${stateSpan(f.state)}<span class="claimed">"${esc(f.claimed)}" ✓</span><span>${esc(f.title)}${alsoLinks(f)}</span></div>
    <dl class="det" id="det-${f.id}" hidden>
      <dt>SAID</dt><dd class="said">${esc(f.said)}</dd>
      <dt>DID</dt><dd class="did">${esc(f.did)}</dd>
      <dt>PR</dt><dd>${prLinks(f)}</dd>
      <dd class="open"><span class="ps">$</span>cat ${esc(f.file)} <button class="open-btn" type="button" data-open="${f.i}">[OPEN]</button></dd>
    </dl>`).join("");
}
$("#files").addEventListener("click", (e) => {
  const b = e.target.closest("[data-file]"), o = e.target.closest("[data-open]");
  if (o) { openCase(+o.dataset.open); return; }
  if (!b) return;
  const d = $("#det-" + FILES[+b.dataset.file].id), open = d.hidden;
  d.hidden = !open; b.setAttribute("aria-expanded", String(open));
});

// ================================================================ case pages
function renderCase(f) {
  const prev = FILES[(f.i + FILES.length - 1) % FILES.length], next = FILES[(f.i + 1) % FILES.length];
  $("#page-case").innerHTML = `
    <p class="cmd"><button class="back" type="button" data-go="work">back</button> <span class="dim">/findings/ /</span> ${esc(f.file)}</p>
    <p class="cmd"><span class="ps">$</span>cat ${esc(f.file)}</p>
    <article class="case">
      <p class="case__n">${f.n} / ${String(FILES.length).padStart(2, "0")}</p>
      <h2 class="case__t">${esc(f.project.toUpperCase())} #${esc(f.num)}</h2>
      <p class="case__s">${esc(f.title)}</p>
      <dl class="kv kv--tight"><div><dt>PROJECT</dt><dd>${esc(f.project)}</dd></div><div><dt>STATE</dt><dd>${stateSpan(f.state)}</dd></div><div><dt>PR</dt><dd>${prLinks(f)}</dd></div></dl>
      <pre class="diff"><span class="c"># what the system reported vs what it did</span>
<span class="m">- ${esc(f.said)}   ✓</span>
<span class="p">+ ${esc(f.did)}</span></pre>
      <h3 class="c">// what was happening</h3>
      <div class="prose"><p>${esc(f.why)}</p></div>
      <h3 class="c">// the fix</h3>
      <div class="prose"><p>${esc(f.fix)}</p></div>
      <p class="case__nav"><button class="back" type="button" data-case="${prev.i}">← ${esc(prev.file)}</button><button class="back" type="button" data-case="${next.i}">${esc(next.file)} →</button></p>
    </article>`;
}
$("#page-case").addEventListener("click", (e) => {
  const c = e.target.closest("[data-case]"); if (c) openCase(+c.dataset.case);
});
function openCase(i) { location.hash = FILES[i].id; }

// ================================================================ routing
let current = "home";
function show(page, caseFile) {
  current = page;
  document.querySelectorAll(".page[data-page]").forEach((p) => p.classList.toggle("is-on", p.dataset.page === page));
  const navKey = page === "case" ? "work" : page;
  document.querySelectorAll(".nav__item").forEach((a) => { const on = a.dataset.go === navKey; a.classList.toggle("is-on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $("#cwd").textContent = page === "home" ? "~" : page === "case" ? "~/findings" : "~/" + page;
  if (caseFile) renderCase(caseFile);
  $("#screen").scrollTop = 0;
  document.title = page === "case" ? `${caseFile.file} // HARSH_RAJ` : "HARSH_RAJ // SYS.PORTFOLIO";
}
function route() {
  const h = location.hash.slice(1);
  const f = FILES.find((x) => x.id === h);
  if (f) show("case", f); else show(PAGES.includes(h) ? h : "home");
}
addEventListener("hashchange", route);
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]"); if (!g) return;
  e.preventDefault(); go(g.dataset.go);
});
function go(page) { if (location.hash.slice(1) === page) route(); else location.hash = page; }

// ↑↓ move between modules (like the reference); Enter opens the highlighted one. Inside the prompt, ↑↓ is history.
let navIdx = 0;
const navItems = [...document.querySelectorAll(".nav__item")];
function highlight(i) { navIdx = (i + navItems.length) % navItems.length; go(PAGES[navIdx]); }
addEventListener("keydown", (e) => {
  if (root.classList.contains("booting")) { finishBoot(); return; }
  const inPrompt = document.activeElement === $("#prompt");
  if (inPrompt || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); highlight(PAGES.indexOf(current === "case" ? "work" : current) + 1); }
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); highlight(PAGES.indexOf(current === "case" ? "work" : current) - 1); }
  else if (e.key === "Escape" && current === "case") go("work");
  else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key) && !e.target.closest("a,button")) $("#prompt").focus();
});

// ================================================================ the prompt
const out = $("#cmd-out");
const hist = []; let hIdx = 0;
function print(html, cls = "") { const p = document.createElement("p"); p.className = "line " + cls; p.innerHTML = html; out.appendChild(p); out.scrollTop = out.scrollHeight; }
const COMMANDS = {
  help: () => print(
`<span class="hl">commands</span>
  ls                  list /findings/
  cat &lt;file&gt;          open a finding (tab completes)
  open &lt;module&gt;       home · work · about · resume
  whoami              who this is
  contact             how to reach me
  github              open github.com/harshrajdebug
  merged              what has landed upstream
  clear               clear this output
<span class="mute">↑↓ outside the prompt switches modules -- Esc leaves a finding</span>`),
  ls: () => print(FILES.map((f) => `<span class="hl">${esc(f.file)}</span>`).join("  ")),
  whoami: () => print("Harsh Raj -- I test whether systems do what they report."),
  contact: () => print(`<a href="mailto:harshrajdebug@gmail.com">harshrajdebug@gmail.com</a> -- <a href="https://www.linkedin.com/in/harsh2789" target="_blank" rel="noopener">linkedin.com/in/harsh2789</a>`),
  github: () => { print(`<a href="https://github.com/harshrajdebug" target="_blank" rel="noopener">github.com/harshrajdebug ↗</a>`); },
  merged: () => print(FILES.filter((f) => f.state === "merged").map((f) => `<span class="hl">${[f.pr, ...f.also].map(esc).join(" + ")}</span>  ${esc(f.title)}`).join("\n") || "none yet"),
  clear: () => { out.innerHTML = ""; },
  sudo: () => print("guest is not in the sudoers file. This incident will be reported.", "err"),
};
function fileFor(arg) { const a = (arg || "").toLowerCase(); return FILES.find((f) => f.file.toLowerCase() === a || f.file.toLowerCase().startsWith(a) || f.id === a || f.num === a); }
function run(raw) {
  const line = raw.trim(); if (!line) return;
  hist.push(line); hIdx = hist.length;
  print(`<span class="ps">$</span>${esc(line)}`, "echo");
  const [cmd, ...rest] = line.split(/\s+/), arg = rest.join(" ");
  const c = cmd.toLowerCase();
  if (COMMANDS[c]) return COMMANDS[c]();
  if (c === "cat" || c === "less" || c === "more") {
    if (!arg) return print("usage: cat &lt;file&gt; -- try ls", "err");
    if (/^(about|about\.md)$/i.test(arg)) return go("about");
    if (/^(resume|resume\.txt)$/i.test(arg)) return go("resume");
    const f = fileFor(arg); if (f) return openCase(f.i);
    return print(`cat: ${esc(arg)}: No such file or directory`, "err");
  }
  if (c === "open" || c === "cd") {
    const p = arg.replace(/^[~/.]+/, "").toLowerCase() || "home";
    if (PAGES.includes(p)) return go(p);
    if (p === "findings" || p === "..") return go("work");
    const f = fileFor(p); if (f) return openCase(f.i);
    return print(`${esc(c)}: ${esc(arg)}: no such module -- try help`, "err");
  }
  if (PAGES.includes(c)) return go(c);
  print(`${esc(cmd)}: command not found -- try <span class="hl">help</span>`, "err");
}
const prompt = $("#prompt");
prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); run(prompt.value); prompt.value = ""; }
  else if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx > 0) prompt.value = hist[--hIdx]; }
  else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.min(hist.length, hIdx + 1); prompt.value = hist[hIdx] || ""; }
  else if (e.key === "Tab") {
    e.preventDefault();
    const m = prompt.value.match(/^(\s*\S+\s+)(\S*)$/); if (!m) return;
    const hits = FILES.map((f) => f.file).filter((n) => n.toLowerCase().startsWith(m[2].toLowerCase()));
    if (hits.length === 1) prompt.value = m[1] + hits[0];
    else if (hits.length > 1) print(hits.map((h) => `<span class="hl">${esc(h)}</span>`).join("  "));
  }
  else if (e.key === "Escape") prompt.blur();
});

// ================================================================ header clock
function tick() {
  try { $("#sys-clock").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()) + " IST"; } catch (e) { /* ignore */ }
}
tick(); setInterval(tick, 20000);

// ================================================================ live pull request states
fetch("https://api.github.com/search/issues?q=" + encodeURIComponent("author:harshrajdebug type:pr") + "&per_page=100")
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((d) => {
    const st = {};
    d.items.forEach((it) => { st[it.repository_url.replace("https://api.github.com/repos/", "") + "#" + it.number] = it.pull_request && it.pull_request.merged_at ? "merged" : it.state; });
    let changed = false;
    FILES.forEach((f) => { if (st[f.pr] && st[f.pr] !== f.state) { f.state = st[f.pr]; changed = true; } });
    if (changed) { const open = [...document.querySelectorAll(".det:not([hidden])")].map((d) => d.id); renderFiles(); open.forEach((id) => { const d = document.getElementById(id); if (d) { d.hidden = false; d.previousElementSibling.querySelector(".fname").setAttribute("aria-expanded", "true"); } }); if (current === "case") route(); }
  })
  .catch(() => {});

// ================================================================ boot
const BOOT = [
  ["HARSH_OS v1.0.0 -- booting...", ""],
  ["Loading kubernetes.pkg", "[OK]"], ["Loading controller_runtime.pkg", "[OK]"], ["Loading envoy_xds.pkg", "[OK]"], ["Loading sigstore.pkg", "[OK]"],
  ...FILES.map((f) => [`Mounting /findings/${f.file}`, f.state === "merged" ? "[MERGED]" : "[IN REVIEW]"]),
  ["Checking what the status said", "[DONE]"],
  ["Checking open_to_work status", "[TRUE]"],
  ["READY.", ""],
];
let bootTimer = null;
function finishBoot() {
  if (!root.classList.contains("booting")) return;
  clearTimeout(bootTimer); root.classList.remove("booting");
  // Remembered across visits, so the boot log plays once per browser, not once per tab.
  try { localStorage.setItem("hr-booted", "1"); } catch (e) { /* ignore */ }
  try { sessionStorage.setItem("hr-booted", "1"); } catch (e) { /* ignore */ }
  route();
}
function boot() {
  let seen = false;
  try { seen = localStorage.getItem("hr-booted") === "1"; } catch (e) { /* ignore */ }
  try { seen = seen || sessionStorage.getItem("hr-booted") === "1"; } catch (e) { /* ignore */ }
  if (seen || reduced || location.hash) { route(); return; }
  root.classList.add("booting");
  const pre = $("#boot"); let i = 0;
  const step = () => {
    if (i >= BOOT.length) { bootTimer = setTimeout(finishBoot, 380); return; }
    const [txt, tag] = BOOT[i++];
    const pad = tag ? " ".repeat(Math.max(2, 44 - txt.length)) : "";
    const cls = tag === "[OK]" || tag === "[TRUE]" || tag === "[DONE]" || tag === "[MERGED]" ? "ok" : "tag";
    pre.innerHTML = pre.innerHTML.replace('<span class="caret"></span>', "") + esc(txt) + pad + (tag ? `<span class="${cls}">${esc(tag)}</span>` : "") + "\n" + '<span class="caret"></span>';
    bootTimer = setTimeout(step, i < 2 ? 260 : 70 + Math.random() * 60);
  };
  step();
  addEventListener("pointerdown", finishBoot, { once: true });
}
renderFiles();
boot();
})();
