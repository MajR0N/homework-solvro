// Strona główna i konto użytkownika: działający prototyp bez backendu (propozycje A, B, C, D i E z profil.html w jednej stronie).
// Stan jest w pamięci i w sessionStorage (zamknięcie karty go kasuje, "Przywróć dane" też).
// Dane są PRZYKŁADOWE: nazwy i zdjęcia koktajli z API Solvro, przepisy kasia_mixuje, opinie i liczby wymyślone.
// Układ zmienia się sam: od 48rem pasek na górze, poniżej dolna szklana nawigacja (propozycja E).
const IMG = "https://cocktails.solvro.pl/images/cocktails/";
const ME = "kasia_mixuje", IMPORT = "Solvro (import)", KEY = "app-proto-v1", SINCE = "2026-09-12";
const CAT = { Cocktail: "Koktajl", "Ordinary Drink": "Zwykły drink", "Punch / Party Drink": "Poncz" };
const SECS = [["przeglad", "squares-four", "Przegląd"], ["przepisy", "martini", "Moje przepisy"], ["ulubione", "heart", "Ulubione"], ["opinie", "chat-circle-text", "Moje opinie"], ["ustawienia", "gear", "Ustawienia"]];
const DAYS30 = [12, 18, 15, 22, 20, 30, 26, 28, 35, 33, 40, 38, 45, 42, 50, 47, 55, 52, 60, 58, 66, 63, 72, 70, 78, 74, 85, 92, 88, 100]; // ponytail: wymyślone, backend liczy tylko sumy

const seed = () => {
  const c = (id, name, slug, author, cat, verified, views, r, n, at = "2024-08-23T16:47:00") => ({ id, name, img: slug ? `${IMG}${slug}.png` : "", author, cat, verified, views, r, n, at });
  const imp = (id, name, slug, cat, v, views, r, n) => c(id, name, slug, IMPORT, cat, v, views, r, n);
  return {
    next: 100,
    favs: [11007, 11003, 11008, 11009, 11005, 11060, 11014],
    cocktails: [
      imp(11007, "Margarita", "margarita", "Ordinary Drink", true, 1204, 4.6, 18), imp(11003, "Negroni", "negroni", "Ordinary Drink", true, 938, 4.2, 9),
      imp(11008, "Manhattan", "manhattan", "Cocktail", true, 861, 4.4, 11), imp(11009, "Moscow Mule", "moscow-mule", "Punch / Party Drink", true, 805, 4.0, 6),
      imp(11005, "Dry Martini", "dry-martini", "Cocktail", true, 742, 3.9, 5), imp(11006, "Daiquiri", "daiquiri", "Ordinary Drink", true, 690, 4.3, 7),
      imp(11004, "Whiskey Sour", "whiskey-sour", "Ordinary Drink", true, 655, 4.5, 8), imp(11002, "Long Island Tea", "long-island-tea", "Ordinary Drink", true, 512, 4.1, 12),
      imp(11014, "Alexander", "alexander", "Ordinary Drink", true, 240, null, 0), imp(11060, "Balmoral", "balmoral", "Ordinary Drink", true, 118, 5.0, 2),
      imp(11010, "After Dinner Cocktail", "after-dinner-cocktail", "Ordinary Drink", true, 96, null, 0), imp(11013, "Alaska Cocktail", "alaska-cocktail", "Ordinary Drink", true, 88, 3.8, 4),
      imp(11020, "Algonquin", "algonquin", "Ordinary Drink", true, 75, null, 0), imp(11026, "Amaretto Mist", "amaretto-mist", "Ordinary Drink", true, 64, 4.0, 2),
      imp(11034, "Angel Face", "angel-face", "Ordinary Drink", false, 29, null, 0), imp(11052, "Archbishop", "archbishop", "Ordinary Drink", false, 33, 3.5, 3),
      c(1, "Wiśniowy Mojito", "moscow-mule", ME, "Cocktail", true, 612, 4.6, 5, "2026-10-30T07:10:00"), c(2, "Negroni z grejpfrutem", "negroni", ME, "Cocktail", false, 301, 4.0, 2, "2026-10-28T18:20:00"),
      c(3, "Domowy Daiquiri", "daiquiri", ME, "Ordinary Drink", false, 274, 4.3, 2, "2026-10-27T12:00:00"), c(4, "Old Fashioned po polsku", "whiskey-sour", ME, "Cocktail", false, 97, null, 0, "2026-10-26T20:45:00"),
    ],
    reviews: [
      { id: 1, cid: 11006, user: ME, rating: 4, text: "Dałam odrobinę mniej cukru i było idealnie.", at: "2026-10-29T16:40:00" },
      { id: 2, cid: 11009, user: ME, rating: 4, text: "Świeży imbir zamiast piwa imbirowego też działa.", at: "2026-10-28T13:30:00" },
      { id: 3, cid: 11007, user: ME, rating: 4, text: "Klasyka, sól na brzegu robi robotę.", at: "2026-10-25T19:03:00" },
      { id: 4, cid: 11008, user: ME, rating: 5, text: "Najlepiej z dobrym bourbonem.", at: "2026-10-20T21:15:00" },
      { id: 5, cid: 11004, user: ME, rating: 3, text: "Za kwaśny jak dla mnie.", at: "2026-10-12T10:10:00" },
      { id: 6, cid: 1, user: "tomek_barman", rating: 5, text: "Wiśnie bardzo dobrze łączą się z miętą.", at: "2026-10-30T08:20:00" },
      { id: 7, cid: 2, user: "ola.shaker", rating: 4, text: "Grejpfrut robi różnicę.", at: "2026-10-29T09:05:00" },
      { id: 8, cid: 3, user: "kuba_p", rating: 4, text: "Prosty i dobry.", at: "2026-10-27T18:00:00" },
    ],
  };
};
let D = JSON.parse(sessionStorage.getItem(KEY) || "null") || seed();
const save = () => sessionStorage.setItem(KEY, JSON.stringify(D));
const U = { q: "", cat: "all", sort: "views" }; // stan widoku, nie jest zapisywany

/* ---------- pomocnicze ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = new Intl.NumberFormat("pl-PL", { useGrouping: "always" });
const dec = (x) => x.toFixed(1).replace(".", ",");
const day = (iso, o = { dateStyle: "medium" }) => new Date(iso).toLocaleDateString("pl-PL", o);
const byId = (id) => D.cocktails.find((c) => c.id === id);
const mine = () => D.cocktails.filter((c) => c.author === ME);
const myReviews = () => D.reviews.filter((r) => r.user === ME).sort((a, b) => b.at.localeCompare(a.at));
const isFav = (id) => D.favs.includes(id);
const rating = (c) => (c.n ? `${dec(c.r)} (${c.n})` : "");
// ponytail: progi etykiet są wymyślone, w prawdziwej aplikacji etykiety liczy backend
const label = (c) => (c.views >= 600 ? "Popularny" : c.views >= 250 ? "Na topie" : "");
const thumb = (c) => (c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : `<span class="noimg"><i class="ph ph-image-broken" aria-hidden="true"></i><small>Brak zdjęcia</small></span>`);
const vtick = `<span class="vtick" role="img" aria-label="Zweryfikowany"><i class="ph-bold ph-check"></i></span>`;
const route = () => { const [p, s] = location.hash.slice(1).split("/"); return p === "konto" ? ["konto", SECS.some(([k]) => k === s) ? s : "przeglad"] : ["glowna"]; };
addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.outerHTML = thumb({ img: "" }); }, true);

/* ---------- karty ---------- */
const card = (c) => `<article class="card k1"><img src="${esc(c.img)}" alt="" loading="lazy">
  <button class="fav" data-act="fav" data-id="${c.id}" aria-pressed="${isFav(c.id)}" aria-label="Ulubione: ${esc(c.name)}"><i class="${isFav(c.id) ? "ph-fill" : "ph"} ph-heart" aria-hidden="true"></i></button>
  <div class="tag">${label(c) ? `<span class="pill ${label(c) === "Na topie" ? "warm" : "status"}">${label(c)}</span>` : ""}</div>
  <div class="cap glass"><div class="top"><h3 class="name">${esc(c.name)}${c.verified ? vtick : ""}</h3>${c.n ? `<span class="rate" aria-label="Ocena ${rating(c)}"><i class="ph-fill ph-star" aria-hidden="true"></i>${rating(c)}</span>` : ""}</div><p class="meta">${CAT[c.cat] || esc(c.cat)}</p></div></article>`;
const mineCard = (c) => `<article class="card mine k1">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : `<span class="noimg" style="position:absolute;inset:0"><i class="ph ph-image-broken"></i></span>`}
  <div class="tag"><span class="pill ${c.verified ? "status" : "plain"}">${c.verified ? "Zweryfikowany" : "Bez znaczka"}</span></div>
  <div class="tools"><button data-act="edit" data-id="${c.id}" aria-label="Edytuj ${esc(c.name)}"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button></div>
  <div class="cap glass"><div class="top"><h3 class="name">${esc(c.name)}</h3></div><p class="meta"><span><i class="ph ph-eye" aria-hidden="true"></i> ${num.format(c.views)}</span><span>${c.n ? `<i class="ph-fill ph-star" aria-hidden="true"></i> ${rating(c)}` : "brak opinii"}</span></p></div></article>`;
const empty = (icon, title, text, btn) => `<div class="empty"><i class="ph ph-${icon}" aria-hidden="true"></i><b>${title}</b><span class="muted">${text}</span>${btn || ""}</div>`;
const addBtn = (cls = "btn primary") => `<button class="${cls}" data-act="add"><i class="ph ph-plus" aria-hidden="true"></i>Dodaj przepis</button>`;
const stats = () => {
  const m = mine(), n = m.reduce((s, c) => s + c.n, 0);
  return { recipes: m.length, views: m.reduce((s, c) => s + c.views, 0), avg: n ? dec(m.reduce((s, c) => s + c.r * c.n, 0) / n) : "brak", n };
};

/* ---------- strona główna ---------- */
function list() {
  const q = U.q.trim().toLowerCase();
  return D.cocktails.filter((c) => (U.cat === "all" || c.cat === U.cat) && (!q || c.name.toLowerCase().includes(q)))
    .sort((a, b) => (U.sort === "name" ? a.name.localeCompare(b.name, "pl") : b.views - a.views));
}
function vGlowna() {
  const items = list(), filtered = U.q || U.cat !== "all";
  const chip = (v, t) => `<button class="chip" data-act="cat" data-v="${v}" aria-pressed="${U.cat === v}">${t}</button>`;
  return `<h1 class="ph1" style="margin-top:1rem">Koktajle</h1>
    ${filtered ? "" : `<div class="sec-h" style="margin-top:.75rem"><h2>Na topie teraz</h2></div><div class="tiles">${[...D.cocktails].sort((a, b) => b.views - a.views).slice(0, 4).map((c) => `<article class="card k1">${thumb(c)}<div class="tag"><span class="pill warm">Na topie</span></div><div class="cap glass"><h3 class="name">${esc(c.name)}</h3><p class="meta">${num.format(c.views)} wyświetleń</p></div></article>`).join("")}</div>`}
    <div class="fbar" role="group" aria-label="Filtry"><div class="seg">${chip("all", "Wszystkie")}${Object.entries(CAT).map(([k, t]) => chip(k, t)).join("")}</div>
      <label><span class="sr">Sortuj</span><select class="select" id="sort"><option value="views" ${U.sort === "views" ? "selected" : ""}>Najpopularniejsze</option><option value="name" ${U.sort === "name" ? "selected" : ""}>Alfabetycznie</option></select></label>
      <span class="count num grow" style="text-align:right">${items.length} ${items.length === 1 ? "koktajl" : "koktajli"}</span></div>
    ${items.length ? `<div class="cards">${items.map(card).join("")}</div>` : empty("magnifying-glass", "Brak koktajli", "Zmień wyszukiwanie albo wyczyść filtry.", `<button class="btn" data-act="clear-f">Wyczyść filtry</button>`)}`;
}

/* ---------- konto ---------- */
const sections = {
  przeglad() {
    const s = stats(), m = mine(), favs = D.favs.map(byId).filter(Boolean), rated = [...new Map(myReviews().map((r) => [r.cid, byId(r.cid)])).values()].filter(Boolean);
    const feed = D.reviews.map((r) => ({ r, c: byId(r.cid) })).filter((x) => x.c && (x.r.user === ME || x.c.author === ME)).sort((a, b) => b.r.at.localeCompare(a.r.at)).slice(0, 4);
    const shelf = (t, link, body) => `<section class="shelf"><header><h3>${t}</h3>${link}</header><div class="rail">${body}</div></section>`;
    return `<div class="page-h"><h2 class="ph1 grow">Przegląd</h2>${addBtn()}</div>
      <dl class="stats panel" style="margin:0"><div class="stat"><b>${s.recipes}</b><span>przepisy</span></div><div class="stat"><b>${num.format(s.views)}</b><span>wyświetlenia</span></div><div class="stat"><b>${s.avg}</b><span>średnia ocena</span></div><div class="stat"><b>${myReviews().length}</b><span>wystawione opinie</span></div></dl>
      ${shelf("Moje przepisy", `<a href="#konto/przepisy">Zarządzaj (${m.length})</a>`, `<button class="add-tile" data-act="add"><i class="ph ph-plus-circle" aria-hidden="true"></i>Dodaj przepis</button>${m.map(mineCard).join("")}`)}
      ${shelf("Ulubione", `<a href="#konto/ulubione">Zobacz wszystkie (${favs.length})</a>`, favs.length ? favs.slice(0, 6).map(card).join("") : `<span class="muted">Nic tu jeszcze nie ma.</span>`)}
      ${shelf("Ostatnio oceniłam", `<a href="#konto/opinie">Zobacz wszystkie (${myReviews().length})</a>`, rated.length ? rated.slice(0, 6).map(card).join("") : `<span class="muted">Nic tu jeszcze nie ma.</span>`)}
      <div class="panel"><h3>Ostatnia aktywność</h3>${feed.length ? `<ul class="feed">${feed.map(({ r, c }) => `<li>${thumb(c)}<div class="grow">${r.user === ME ? `Oceniłaś <b>${esc(c.name)}</b>` : `<b>${esc(c.name)}</b> dostał opinię ${r.rating} z 5`}<br><small class="muted">${r.user === ME ? "" : `od ${esc(r.user)}, `}${day(r.at)}</small></div><span class="st"><i class="ph-fill ph-star" aria-hidden="true"></i>${r.rating},0</span></li>`).join("")}</ul>` : `<p class="muted">Brak aktywności.</p>`}</div>`;
  },
  przepisy() {
    const m = mine().sort((a, b) => b.views - a.views), s = stats();
    const status = (c) => `<span class="st ${c.verified ? "ok" : "muted"}"><i class="${c.verified ? "ph-fill ph-seal-check" : "ph ph-seal"}" aria-hidden="true"></i>${c.verified ? "Zweryfikowany" : "Bez znaczka"}</span>`;
    const tools = (c) => `<button class="btn sm" data-act="edit" data-id="${c.id}" aria-label="Edytuj ${esc(c.name)}"><i class="ph ph-pencil-simple" aria-hidden="true"></i><span class="hide-n">Edytuj</span></button> <button class="btn sm danger" data-act="del" data-id="${c.id}" aria-label="Usuń ${esc(c.name)}"><i class="ph ph-trash" aria-hidden="true"></i></button>`;
    if (!m.length) return `<div class="page-h"><h2 class="ph1 grow">Moje przepisy</h2></div>${empty("martini", "Brak przepisów", "Pierwszy przepis może mieć tylko nazwę, składniki i instrukcję. Zdjęcie dodasz później.", addBtn())}`;
    return `<div class="page-h"><h2 class="ph1 grow">Panel autora</h2>${addBtn()}</div>
      <div class="top2"><div class="panel"><h3 style="margin:0">Wyświetlenia z 30 dni</h3><div class="bars" role="img" aria-label="Wykres słupkowy: wyświetlenia dzień po dniu, rosnące, najwięcej w ostatnim tygodniu">${DAYS30.map((h) => `<i style="height:${h}%"></i>`).join("")}</div><span class="muted" style="font-size:.8125rem">Wykres jest przykładowy, backend liczy dziś tylko sumy.</span></div>
        <div class="panel stats" style="align-content:center"><div class="stat"><b>${num.format(s.views)}</b><span>wyświetleń razem</span></div><div class="stat"><b>${s.avg}</b><span>średnia ocena</span></div></div></div>
      <div class="panel scroll-x wide-only" style="padding:.5rem"><table class="tbl"><thead><tr><th>Przepis</th><th>Znaczek</th><th>Etykieta</th><th class="r">Wyświetlenia</th><th class="r">Ocena</th><th class="r">Akcje</th></tr></thead><tbody>${m.map((c) => `<tr><td><span class="t">${thumb(c)}${esc(c.name)}</span></td><td>${status(c)}</td><td>${label(c) || '<span class="muted">brak</span>'}</td><td class="r">${num.format(c.views)}</td><td class="r">${c.n ? rating(c) : '<span class="muted">brak opinii</span>'}</td><td class="r">${tools(c)}</td></tr>`).join("")}</tbody></table></div>
      <div class="narrow-only">${m.map((c) => `<div class="rowc">${thumb(c)}<div class="grow"><b>${esc(c.name)}</b><small>${num.format(c.views)} wyświetleń, ${c.n ? "ocena " + rating(c) : "brak opinii"}</small></div><span class="st ${c.verified ? "ok" : "muted"}"><i class="${c.verified ? "ph-fill ph-seal-check" : "ph ph-seal"}" aria-hidden="true"></i><span class="sr">${c.verified ? "Zweryfikowany" : "Bez znaczka"}</span></span>${tools(c)}</div>`).join("")}</div>`;
  },
  ulubione() {
    const f = D.favs.map(byId).filter(Boolean);
    return `<div class="page-h"><h2 class="ph1 grow">Ulubione</h2><span class="count num">${f.length}</span></div>${f.length ? `<div class="cards">${f.map(card).join("")}</div>` : empty("heart", "Nie masz jeszcze ulubionych", "Kliknij serce na karcie koktajlu, żeby go tu zapisać.", `<a class="btn primary" href="#glowna">Przeglądaj koktajle</a>`)}`;
  },
  opinie() {
    const r = myReviews();
    return `<div class="page-h"><h2 class="ph1 grow">Moje opinie</h2><span class="count num">${r.length}</span></div>${r.length ? `<div class="stack">${r.map((x) => { const c = byId(x.cid); return `<div class="review opinion">${thumb(c)}<div><b>${esc(c.name)}</b><div class="meta"><span class="st"><i class="ph-fill ph-star" aria-hidden="true"></i>${x.rating} z 5</span><span>${day(x.at)}</span></div><p>${esc(x.text)}</p></div><button class="btn sm danger" data-act="rdel" data-id="${x.id}" aria-label="Usuń opinię o ${esc(c.name)}"><i class="ph ph-trash" aria-hidden="true"></i></button></div>`; }).join("")}</div>` : empty("chat-circle-text", "Brak opinii", "Oceń koktajl na jego stronie, a opinia pojawi się tutaj.", `<a class="btn primary" href="#glowna">Przeglądaj koktajle</a>`)}`;
  },
  ustawienia() {
    return `<div class="page-h"><h2 class="ph1 grow">Ustawienia</h2></div><div class="panel"><dl class="facts"><div><dt>Nazwa użytkownika</dt><dd>${ME}</dd></div><div><dt>Rola</dt><dd>Użytkownik</dd></div><div><dt>W Solvro Bar od</dt><dd>${day(SINCE, { dateStyle: "long" })}</dd></div></dl></div>
      <div class="row"><button class="btn" data-act="logout"><i class="ph ph-sign-out" aria-hidden="true"></i>Wyloguj</button><button class="btn" data-act="reset"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>Przywróć dane przykładowe</button></div>
      <p class="muted" style="font-size:.875rem">Zmiana hasła i usuwanie konta wymagają endpointów, których backend jeszcze nie ma, więc ich tu nie ma.</p>`;
  },
};
function vKonto(sec) {
  const s = stats(), cnt = { przepisy: mine().length, ulubione: D.favs.length, opinie: myReviews().length };
  return `<section class="hero glass" aria-label="Profil"><span class="av lg" aria-hidden="true">KM</span><div><h1>${ME}</h1><p class="row" style="margin-top:.4rem"><span class="role"><i class="ph ph-user" aria-hidden="true"></i>Użytkownik</span><span>W Solvro Bar od ${day(SINCE, { dateStyle: "long" })}</span></p></div>
      <dl class="stats"><div class="stat"><b>${s.recipes}</b><span>przepisy</span></div><div class="stat"><b>${num.format(s.views)}</b><span>wyświetlenia przepisów</span></div><div class="stat"><b>${s.avg}</b><span>średnia ocena (${s.n} opinii)</span></div><div class="stat"><b>${D.favs.length}</b><span>ulubionych</span></div></dl></section>
    <div class="acc"><nav class="secnav" aria-label="Konto">${SECS.map(([k, i, t]) => `<a href="#konto/${k}" ${k === sec ? 'aria-current="page"' : ""}><i class="ph ph-${i}" aria-hidden="true"></i>${t}${cnt[k] !== undefined ? `<span class="n">${cnt[k]}</span>` : ""}</a>`).join("")}</nav><div class="pane">${sections[sec]()}</div></div>`;
}

/* ---------- szkielet (raz) i odświeżanie ---------- */
const logo = '<img src="../public/solvro/KN_Solvro_White.svg" alt="Solvro">';
$("#app").innerHTML = `<div class="wrap"><header class="bar glass"><a href="#glowna" aria-label="Solvro, strona główna">${logo}</a>
    <div class="search"><input class="field" id="gq" type="search" placeholder="Szukaj koktajlu" aria-label="Szukaj koktajlu" autocomplete="off"></div>
    <a class="btn" id="favbtn" href="#konto/ulubione"><i class="ph ph-heart" aria-hidden="true"></i><span>Ulubione (<span id="favn"></span>)</span></a>
    <button class="btn primary" data-act="add"><i class="ph ph-plus" aria-hidden="true"></i>Dodaj przepis</button>
    <a class="btn" id="accbtn" href="#konto" aria-label="Konto: ${ME}"><span class="av sm" aria-hidden="true">KM</span>${ME}</a></header>
  <main id="main" tabindex="-1"></main></div>
  <nav class="appdock glass" aria-label="Główna nawigacja"><a href="#glowna" id="d-glowna"><i class="ph ph-house" aria-hidden="true"></i>Główna</a><a href="#konto/ulubione" id="d-ulubione"><i class="ph ph-heart" aria-hidden="true"></i>Ulubione</a><button data-act="add"><i class="ph ph-plus-circle" aria-hidden="true"></i>Dodaj</button><a href="#konto" id="d-konto"><i class="ph ph-user" aria-hidden="true"></i>Profil</a></nav>`;

const sig = (el) => el?.id ? "#" + el.id : el?.dataset?.act ? `[data-act="${el.dataset.act}"]` + ["v", "id"].map((k) => (el.dataset[k] !== undefined ? `[data-${k}="${CSS.escape(el.dataset[k])}"]` : "")).join("") : null;
function paint() {
  const a = document.activeElement, s = sig(a), pos = a?.selectionStart, [p, sec] = route();
  $("#main").innerHTML = p === "glowna" ? vGlowna() : vKonto(sec);
  $("#favn").textContent = D.favs.length;
  const cur = (el, on) => (on ? el.setAttribute("aria-current", "page") : el.removeAttribute("aria-current"));
  cur($("#d-glowna"), p === "glowna"); cur($("#d-ulubione"), sec === "ulubione"); cur($("#d-konto"), p === "konto" && sec !== "ulubione");
  $("#favbtn").classList.toggle("cur", sec === "ulubione"); $("#accbtn").classList.toggle("cur", p === "konto" && sec !== "ulubione");
  document.title = p === "glowna" ? "Koktajle (prototyp)" : `${SECS.find(([k]) => k === sec)[2]} | Konto (prototyp)`;
  const el = s && document.querySelector(s);
  if (el && !el.disabled) { el.focus(); if (pos != null) try { el.setSelectionRange(pos, pos); } catch {} }
}
const commit = (msg) => { save(); if (msg) toast(msg); paint(); };

/* ---------- okna dialogowe i komunikat ---------- */
const dlg = $("#dlg");
let onOk, tt;
const open = (html) => { dlg.innerHTML = html; dlg.showModal(); };
const ask = (title, text, okLabel, fn) => { onOk = fn; open(`<h2 id="dt">${title}</h2><p class="muted">${text}</p><div class="row end"><button class="btn" data-act="close">Anuluj</button><button class="btn bad" data-act="ok">${okLabel}</button></div>`); };
const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 3500); };
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

// ponytail: to jest szybki formularz (nazwa, kategoria, zdjęcie). Pełny edytor ze składnikami i instrukcją to propozycja C z przepis.html, jeszcze niezbudowana.
function openEdit(id) {
  const c = id ? byId(id) : { name: "", cat: "Cocktail", img: "" };
  open(`<form data-form="${id || "new"}" novalidate><h2 id="dt">${id ? "Edytuj przepis" : "Dodaj przepis"}</h2><div class="stack">
    <label class="f"><span class="l">Nazwa</span><input class="in" name="name" value="${esc(c.name)}" maxlength="100" autocomplete="off"></label>
    <label class="f"><span class="l">Kategoria</span><select class="in" name="cat">${Object.entries(CAT).map(([k, t]) => `<option value="${k}" ${k === c.cat ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="f"><span class="l">Link do zdjęcia</span><input class="in" name="img" value="${esc(c.img)}" inputmode="url" placeholder="https://..." autocomplete="off"><span class="h">Adres musi zaczynać się od https://. Może być pusty, zdjęcie dodasz później.</span></label>
    <p class="h" style="margin:0">Znaczek "zweryfikowany" nadaje administrator. Składniki i instrukcję dodasz w pełnym formularzu przepisu.</p></div>
    <div class="row end"><button type="button" class="btn" data-act="close">Anuluj</button><button class="btn primary">Zapisz</button></div></form>`);
}
function saveEdit(f) {
  const v = Object.fromEntries(new FormData(f)), name = (v.name || "").trim(), img = (v.img || "").trim(), id = f.dataset.form === "new" ? null : Number(f.dataset.form), err = {};
  if (!name) err.name = "Podaj nazwę przepisu.";
  else if (D.cocktails.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) err.name = "Koktajl o tej nazwie już istnieje.";
  try { if (img && new URL(img).protocol !== "https:") throw 0; } catch { err.img = "Adres zdjęcia musi zaczynać się od https://."; }
  f.querySelectorAll(".e").forEach((e) => e.remove());
  f.querySelectorAll(".f.err").forEach((e) => e.classList.remove("err"));
  const bad = Object.keys(err);
  bad.forEach((k) => { const l = f.elements[k].closest(".f"); l.classList.add("err"); l.insertAdjacentHTML("beforeend", `<span class="e" role="alert"><i class="ph-fill ph-warning-circle" aria-hidden="true"></i>${err[k]}</span>`); });
  if (bad.length) return f.elements[bad[0]].focus();
  if (id) Object.assign(byId(id), { name, img, cat: v.cat });
  else D.cocktails.push({ id: D.next++, name, img, cat: v.cat, author: ME, verified: false, views: 0, r: null, n: 0, at: new Date().toISOString() });
  dlg.close();
  commit(id ? `Zapisano zmiany w „${name}".` : `Dodano przepis „${name}". Czeka na znaczek administratora.`);
}

/* ---------- akcje ---------- */
const ACT = {
  fav: (b) => { const id = Number(b.dataset.id); D.favs = isFav(id) ? D.favs.filter((x) => x !== id) : [...D.favs, id]; commit(); },
  cat: (b) => { U.cat = b.dataset.v; paint(); },
  "clear-f": () => { Object.assign(U, { q: "", cat: "all" }); $("#gq").value = ""; paint(); },
  add: () => openEdit(),
  edit: (b) => openEdit(Number(b.dataset.id)),
  del: (b) => { const c = byId(Number(b.dataset.id)); ask(`Usunąć „${esc(c.name)}"?`, "Razem z opiniami o tym przepisie. Tego nie da się cofnąć (poza przyciskiem „Przywróć dane” w ustawieniach).", "Usuń przepis", () => { D.cocktails = D.cocktails.filter((x) => x !== c); D.reviews = D.reviews.filter((r) => r.cid !== c.id); D.favs = D.favs.filter((x) => x !== c.id); commit(`Usunięto „${c.name}".`); }); },
  rdel: (b) => {
    const r = D.reviews.find((x) => x.id === Number(b.dataset.id)), c = byId(r.cid);
    ask("Usunąć opinię?", `Twoja opinia o „${esc(c.name)}" zniknie.`, "Usuń opinię", () => {
      D.reviews = D.reviews.filter((x) => x !== r);
      c.r = c.n > 1 ? (c.r * c.n - r.rating) / (c.n - 1) : null; c.n = Math.max(0, c.n - 1); // średnia ocena koktajlu liczy się na nowo
      commit("Usunięto opinię.");
    });
  },
  logout: () => toast("To tylko makieta: prawdziwe logowanie i wylogowanie są w aplikacji."),
  reset: () => { sessionStorage.removeItem(KEY); D = seed(); Object.assign(U, { q: "", cat: "all", sort: "views" }); $("#gq").value = ""; commit("Przywrócono dane przykładowe."); },
  close: () => dlg.close(),
  ok: () => { dlg.close(); onOk(); },
};
document.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) ACT[b.dataset.act]?.(b); });
document.addEventListener("submit", (e) => { e.preventDefault(); if (e.target.dataset.form) saveEdit(e.target); });
document.addEventListener("input", (e) => { if (e.target.id === "gq") { U.q = e.target.value; route()[0] === "glowna" ? paint() : (location.hash = "glowna"); } });
document.addEventListener("change", (e) => { if (e.target.id === "sort") { U.sort = e.target.value; paint(); } });
addEventListener("hashchange", () => { paint(); scrollTo(0, 0); });
paint();
