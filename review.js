// Review mode for the Metrix landing (owner, 2026-11-23): anyone with the link can change any text, no sign-in. Every change
// is saved to the owner's Google Sheet through a small Apps Script web app (SHEET_API), and also kept in this browser as a
// backup. Everyone who opens the link sees the changes already saved. The WhatsApp button stays as a fallback.
(() => {
  const API = window.SHEET_API || "";
  const PICK = "h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,dt,dd,label,button,a,td,th,small,span,strong,em,b,div";
  const SKIP = ".ed-bar,.ed-panel,script,style,svg,noscript,select,option,textarea,input";
  const BLOCKY = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "FIGCAPTION", "BLOCKQUOTE", "DT", "DD", "LABEL", "BUTTON", "A", "TD", "TH"]);
  const own = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const $ = (id) => document.getElementById(id);

  // The hero numbers count up on load; give them their final text before reading the originals.
  const els = [];
  for (const el of document.body.querySelectorAll(PICK)) {
    if (el.closest(SKIP) || !el.textContent.trim()) continue;
    if (els.some((p) => p.contains(el))) continue;
    if (!BLOCKY.has(el.tagName) && !own(el)) continue;
    if ((el.tagName === "DIV" || el.tagName === "SPAN") && el.querySelector("p,h1,h2,h3,h4,li,div")) continue;
    els.push(el);
  }
  const byKey = new Map();
  els.forEach((el, i) => {
    const k = "t" + String(i).padStart(4, "0");
    el.dataset.ek = k;
    el.dataset.orig = norm(el.dataset.final || el.innerText || el.textContent);
    byKey.set(k, el);
  });
  const section = (el) => {
    // The page section (not the section's own title header), named by its number and original title.
    const s = el.closest("section") || el.closest("header,footer");
    if (!s) return "";
    const eye = s.querySelector(".s-eye"), h = s.querySelector("h1,h2");
    const name = eye ? norm(eye.dataset.orig || eye.innerText) : s.id === "inicio" ? "Inicio" : s.tagName === "HEADER" ? "Menú" : s.tagName === "FOOTER" ? "Pie de página" : s.id || "";
    return name + (h ? " · " + (h.dataset.orig || norm(h.innerText)).slice(0, 60) : "");
  };

  const edits = new Map();
  let editing = true, note = "", online = !!API;

  const status = (html) => { $("ed-msg").innerHTML = html; };
  const okMsg = () => status('Toca cualquier texto para cambiarlo. <strong>Los cambios se guardan solos.</strong>');
  const setEditing = (on) => {
    editing = on;
    document.body.classList.toggle("ed-on", on);
    els.forEach((el) => { if (on) el.setAttribute("contenteditable", "plaintext-only"); else el.removeAttribute("contenteditable"); el.spellcheck = on; });
    $("ed-toggle").textContent = on ? "Ver sin edición" : "Volver a editar";
    $("ed-toggle").setAttribute("aria-pressed", String(on));
  };

  const paint = () => {
    $("ed-count").textContent = edits.size;
    const list = [...edits.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    $("ed-items").innerHTML = list.length ? "" : '<li class="ed-empty">Todavía no hay cambios.</li>';
    for (const [k, e] of list) {
      const li = document.createElement("li");
      li.innerHTML = '<span class="ed-sec"></span><del></del><ins></ins><div class="ed-row"><button type="button" data-go>Ver</button><button type="button" data-undo>Deshacer</button></div>';
      li.querySelector(".ed-sec").textContent = e.section || "";
      li.querySelector("del").textContent = e.original;
      li.querySelector("ins").textContent = e.text;
      li.querySelector("[data-go]").onclick = () => { const el = byKey.get(k); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus(); };
      li.querySelector("[data-undo]").onclick = () => { const el = byKey.get(k); if (el) { el.textContent = el.dataset.orig; commit(el); } };
      $("ed-items").appendChild(li);
    }
  };

  // Sheet: a POST per change (text/plain, so no preflight; the response is opaque), a GET for everything saved.
  const send = async (payload) => {
    if (!API) return false;
    try {
      await fetch(API, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      if (!online) { online = true; okMsg(); }
      return true;
    } catch (_) {
      online = false;
      status('Sin conexión: tus cambios quedan en este celular y se guardan al volver la señal. También puedes tocar <strong>Enviar por WhatsApp</strong>.');
      return false;
    }
  };
  const pending = new Map();   // changes not yet confirmed sent, retried on the next change or every 20 s
  const flush = async () => { for (const [k, p] of [...pending]) if (await send(p)) pending.delete(k); };
  setInterval(flush, 20000);

  const keepLocal = () => { try { localStorage.setItem("ed-edits", JSON.stringify([...edits])); localStorage.setItem("ed-note", note); } catch (_) {} };
  const commit = (el) => {
    const k = el.dataset.ek, text = norm(el.innerText || el.textContent);
    const changed = text !== el.dataset.orig;
    el.classList.toggle("ed-changed", changed);
    const prev = edits.get(k);
    if (changed) {
      if (prev && prev.text === text) return;
      const e = { text, original: el.dataset.orig, section: section(el) };
      edits.set(k, e); pending.set(k, { type: "edit", key: k, ...e });
    } else {
      if (!prev) return;
      edits.delete(k); pending.set(k, { type: "delete", key: k });
    }
    paint(); keepLocal(); flush();
  };

  const timers = new Map();
  document.addEventListener("keydown", (ev) => { if (editing && ev.target.dataset?.ek && ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); } });
  document.addEventListener("input", (ev) => {
    const el = ev.target.closest?.("[data-ek]"); if (!el) return;
    clearTimeout(timers.get(el)); timers.set(el, setTimeout(() => commit(el), 900));
  });
  document.addEventListener("focusout", (ev) => { const el = ev.target.closest?.("[data-ek]"); if (el) { clearTimeout(timers.get(el)); commit(el); } });
  document.addEventListener("click", (ev) => { if (editing && ev.target.closest("[data-ek]") && ev.target.closest("a,button") && !ev.target.closest(".ed-bar,.ed-panel")) ev.preventDefault(); }, true);
  document.addEventListener("submit", (ev) => { if (editing) ev.preventDefault(); }, true);

  $("ed-toggle").onclick = () => setEditing(!editing);
  $("ed-list").onclick = () => { const p = $("ed-panel"); p.hidden = !p.hidden; $("ed-list").setAttribute("aria-expanded", String(!p.hidden)); };
  let noteTimer;
  $("ed-note").addEventListener("input", (ev) => {
    note = ev.target.value; keepLocal(); $("ed-note-state").textContent = "Guardando…";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      pending.set("__note", { type: "note", text: note });
      await flush();
      $("ed-note-state").textContent = pending.has("__note") ? "Guardado en este celular" : "Guardado";
    }, 900);
  });
  const allText = () => [...edits.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, e]) => `[${k}] ${e.section}\nANTES: ${e.original}\nDESPUÉS: ${e.text}`).join("\n\n") + (note ? `\n\nCOMENTARIOS:\n${note}` : "");
  $("ed-wa").onclick = () => {
    if (!edits.size && !note.trim()) { alert("Todavía no hay cambios. Toca cualquier texto para cambiarlo, o escribe en Ver cambios → Comentarios generales."); return; }
    const u = "https://wa.me/?text=" + encodeURIComponent("Cambios a la landing de Metrix (" + edits.size + ")\n\n" + allText());
    window.open(u, "_blank") || (location.href = u);
  };
  $("ed-copy").onclick = () => {
    const txt = allText();
    const done = () => { $("ed-copy").textContent = "Copiado"; setTimeout(() => ($("ed-copy").textContent = "Copiar todos los cambios"), 1500); };
    navigator.clipboard?.writeText(txt).then(done, () => { $("ed-note").value = txt; $("ed-note").select(); });
  };

  const apply = (k, e) => {
    const el = byKey.get(k); if (!el || document.activeElement === el) return;
    if (e && e.original === el.dataset.orig) { el.textContent = e.text; el.classList.add("ed-changed"); edits.set(k, { text: e.text, original: e.original, section: e.section || section(el) }); }
    else if (!e) { el.textContent = el.dataset.orig; el.classList.remove("ed-changed"); edits.delete(k); }
  };

  // Start: this browser's backup first, then everything saved in the Sheet (the Sheet wins), refreshed every 30 s.
  try {
    for (const [k, e] of JSON.parse(localStorage.getItem("ed-edits") || "[]")) { apply(k, e); pending.set(k, { type: "edit", key: k, ...e }); }
    note = localStorage.getItem("ed-note") || ""; $("ed-note").value = note;
  } catch (_) {}
  setEditing(true); paint();
  if (!API) { status("Modo edición sin conexión: tus cambios quedan en este navegador. Toca <strong>Enviar por WhatsApp</strong> al terminar."); return; }
  okMsg();
  const load = async () => {
    try {
      const r = await fetch(API + "?action=list&t=" + Date.now()); const d = await r.json();
      const seen = new Set();
      for (const e of d.edits || []) { seen.add(e.key); if (!pending.has(e.key)) apply(e.key, e); }
      for (const k of [...edits.keys()]) if (!seen.has(k) && !pending.has(k)) apply(k, null);
      if (typeof d.note === "string" && document.activeElement !== $("ed-note") && !pending.has("__note")) { note = d.note; $("ed-note").value = note; }
      paint(); keepLocal();
    } catch (_) {}
  };
  load().then(flush);
  setInterval(() => { if (!document.hidden) load(); }, 30000);
})();
