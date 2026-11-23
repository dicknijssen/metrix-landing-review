// Icons, mobile menu, active nav link, scroll reveals, the store map, the chart and the lead form.
// The form has no backend yet: it validates, shows the thank-you state and logs the lead.
// When Resend is set up, post the lead to an endpoint here.

lucide.createIcons();

const burger = document.querySelector(".burger");
const links = document.querySelector(".links");
burger.addEventListener("click", () => burger.setAttribute("aria-expanded", links.classList.toggle("open")));
links.addEventListener("click", (e) => { if (e.target.tagName === "A") links.classList.remove("open"); });

// Underline the nav link of the section on screen.
const navLinks = [...links.querySelectorAll("a")];
const navIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("on", a.hash === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("section[id]").forEach((s) => navIO.observe(s));

// Count the big numbers up: the hero on load, the results grid when it scrolls into view.
function countUp(dt, delay) {
  const [, num, suffix] = dt.textContent.match(/^([\d,]+)(.*)$/);
  const end = +num.replace(/,/g, "");
  dt.textContent = "0" + suffix;
  setTimeout(() => {
    const t0 = performance.now(), dur = 1600;
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      dt.textContent = v.toLocaleString("en-US") + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }, delay);
}
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  
  const gridIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll("dt").forEach((dt, i) => countUp(dt, i * 120));
    gridIO.unobserve(e.target);
  }), { threshold: 0.3 });
  document.querySelectorAll(".grid-nums").forEach((g) => gridIO.observe(g));
}

// Fade blocks in as they scroll into view; grow the chart bars once.
const bars = document.querySelector(".bars");
if (bars) bars.classList.add("hide");
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (bars && e.target.contains(bars)) bars.classList.remove("hide");
  io.unobserve(e.target);
}), { threshold: 0.12 });
document.querySelectorAll(".screen:not(.hero) .main > *:not(.split), .split > div > *, .split > figure").forEach((el) => {
  if (el.closest(".fade")) return;
  el.classList.add("fade"); io.observe(el);
});

// Hero logo: cycle the sub-brand under the Metrix logo.
const mlogo = document.querySelector(".mlogo");
const letters = [...mlogo.querySelectorAll(".word tspan")];
const words = ["RETAIL", "BRANDS", "AGENCY"];
let wi = 0;
(function cycle() {
  [...words[wi]].forEach((ch, i) => (letters[i].textContent = ch));
  mlogo.classList.add("on");
  setTimeout(() => mlogo.classList.remove("on"), 3600);
  wi = (wi + 1) % words.length;
  setTimeout(cycle, 4900);
})();

// The connector: rules that draw into a red dot, the elbow from each section number, ledger routes.
document.querySelectorAll(".head").forEach((el) => el.classList.add("rb"));
// Under a section head the head's rule already closes the block, so lists there get no second rule.
document.querySelectorAll(".ledger, .hero-nums, .grid-nums, .q-sheet, .tbl caption").forEach((el) => {
  if (!el.closest(".content")) el.classList.add("rt");
});
document.querySelectorAll(".rail").forEach((r) => r.insertAdjacentHTML("beforeend", '<span class="elbow" aria-hidden="true"><i class="ev"></i><i class="eh"></i><i class="ed"></i></span>'));
const drawIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("drawn");
  drawIO.unobserve(e.target);
}), { threshold: 0.25 });
document.querySelectorAll(".rt, .rb, .ruled, .ledger").forEach((el) => drawIO.observe(el));

// Lead form: cadena or marca.
const form = document.getElementById("lead");
const coLabel = form.querySelector("[data-co]");
const sel = form.elements.interes;
function setType(t, interes) {
  form.elements.tipo.value = t;
  form.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-selected", b.dataset.type === t));
  coLabel.textContent = { cadena: "Cadena", marca: "Marca o empresa", agencia: "Agencia" }[t];
  [...sel.options].forEach((o) => { o.hidden = !!o.dataset.for && o.dataset.for !== t; });
  sel.selectedIndex = interes != null ? +interes : [...sel.options].findIndex((o) => !o.hidden);
}
form.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setType(b.dataset.type)));
document.querySelectorAll("a[data-type]").forEach((a) => a.addEventListener("click", () => setType(a.dataset.type, a.dataset.interes)));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  let ok = true;
  ["nombre", "empresa", "correo"].forEach((n) => {
    const f = form.elements[n];
    const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
    f.classList.toggle("invalid", bad);
    if (bad) ok = false;
  });
  if (!ok) return;
  console.log("lead", Object.fromEntries(new FormData(form)));
  form.querySelector(".sent").hidden = false;
});

// Hero live feed: a new verified installation every few seconds (illustrative).
const ticker = document.querySelector(".ticker");
if (ticker) {
  const FEED = [["Tienda 2417 · Culiacán", "Cabecera · 10:42", true], ["Tienda 0863 · León", "Exhibidor de piso · 10:44", true],
    ["Tienda 3041 · Tijuana", "Material incompleto · 10:45", false], ["Tienda 1128 · Mérida", "Pasillo temático · 10:47", true],
    ["Tienda 2290 · Querétaro", "Anaquel · 10:48", true]];
  let fi = 0;
  setInterval(() => {
    ticker.classList.add("swap");
    setTimeout(() => {
      fi = (fi + 1) % FEED.length;
      const [st, what, ok] = FEED[fi], em = ticker.querySelector("em");
      ticker.querySelector(".tk").innerHTML = `<b>${st}</b> · ${what}`;
      em.textContent = ok ? "✓ Verificada" : "✕ Incidencia"; em.className = ok ? "ok" : "no";
      ticker.classList.remove("swap");
    }, 380);
  }, 3200);
  ticker.querySelector("em").className = "ok";
}
