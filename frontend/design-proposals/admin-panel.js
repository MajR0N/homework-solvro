// Panel administratora: działający prototyp bez backendu. Cały stan jest w pamięci strony i w sessionStorage
// (odświeżenie zachowuje zmiany, zamknięcie karty je kasuje, przycisk "Przywróć dane" też).
// Dane są PRZYKŁADOWE: nazwy i zdjęcia koktajli z API Solvro, konta, liczby i zgłoszenia wymyślone.
// Układ wybiera atrybut <body data-nav="side|top">; cała reszta jest wspólna dla obu wariantów.
const NAV = document.body.dataset.nav;
const IMG = "https://cocktails.solvro.pl/images/cocktails/";
const ROLES = ["user", "admin", "staff", "owner"]; // od najniższej; rolę można nadać tylko niższą od własnej
const ME = "jan_kowalczyk", IMPORT = "Solvro (import)", KEY = "panel-proto-v2";
const CAT = { Cocktail: "Koktajl", "Ordinary Drink": "Zwykły drink", "Punch / Party Drink": "Poncz" };
const PAGES = [["pulpit", "squares-four", "Pulpit"], ["koktajle", "martini", "Koktajle"], ["moderacja", "flag", "Moderacja"], ["uzytkownicy", "users", "Użytkownicy"]];
const WEEK = [["pn", 742], ["wt", 805], ["śr", 861], ["cz", 938], ["pt", 1204], ["sb", 1010], ["nd", 758]]; // ponytail: wymyślone; backend liczy tylko sumy, nie dni
const MATRIX = [["Dodaje przepisy i opinie", 0], ["Edytuje własne przepisy", 0], ["Edytuje cudze przepisy", 1], ["Nadaje znaczek", 1], ["Usuwa cudze opinie", 1], ["Nadaje rolę user", 1], ["Nadaje rolę admin", 2], ["Nadaje rolę staff", 3]]; // minimalna rola

// Szczegóły przepisów: dla importu prawdziwe dane z API Solvro (po angielsku), dla przepisów użytkowników wymyślone. ing = [[składnik, miara]]
const DETAILS = {"11007":{"glass":"Cocktail glass","alc":true,"how":"Rub the rim of the glass with the lime slice to make the salt stick to it. Take care to moisten only the outer rim and sprinkle the salt on it. The salt should present to the lips of the imbiber and never mix into the cocktail. Shake the other ingredients with ice, then carefully pour into the glass.","ing":[["Tequila","1 1/2 oz "],["Salt",""],["Triple sec","1/2 oz "],["Lime juice","1 oz "]]},"11003":{"glass":"Old-fashioned glass","alc":true,"how":"Stir into glass over ice, garnish and serve.","ing":[["Gin","1 oz "],["Campari","1 oz "],["Sweet Vermouth","1 oz "]]},"11008":{"glass":"Cocktail glass","alc":true,"how":"Stirred over ice, strained into a chilled glass, garnished, and served up.","ing":[["Bourbon","2 1/2 oz Blended "],["Ice","2 or 3 "],["Sweet Vermouth","3/4 oz "],["Angostura bitters","dash "],["Maraschino cherry","1 "],["Orange peel","1 twist of "]]},"11009":{"glass":"Copper Mug","alc":true,"how":"Combine vodka and ginger beer in a highball glass filled with ice. Add lime juice. Stir gently. Garnish.","ing":[["Vodka","2 oz "],["Lime juice","2 oz "],["Ginger ale","8 oz "]]},"11005":{"glass":"Cocktail glass","alc":true,"how":"Straight: Pour all ingredients into mixing glass with ice cubes. Stir well. Strain in chilled martini cocktail glass. Squeeze oil from lemon peel onto the drink, or garnish with olive.","ing":[["Gin","1 2/3 oz "],["Dry Vermouth","1/3 oz "],["Olive","1 "]]},"11006":{"glass":"Cocktail glass","alc":true,"how":"Pour all ingredients into shaker with ice cubes. Shake well. Strain in chilled cocktail glass.","ing":[["Lime","Juice of 1/2 "],["Light rum","1 1/2 oz "],["Powdered sugar","1 tsp "]]},"11004":{"glass":"Old-fashioned glass","alc":true,"how":"Shake with ice. Strain into chilled glass, garnish and serve. If served 'On the rocks', strain ingredients into old-fashioned glass filled with ice.","ing":[["Cherry","1 "],["Lemon","1/2 slice "],["Blended whiskey","2 oz "],["Powdered sugar","1/2 tsp "]]},"11002":{"glass":"Highball glass","alc":true,"how":"Combine all ingredients (except cola) and pour over ice in a highball glass. Add the splash of cola for color. Decorate with a slice of lemon and serve.","ing":[["Vodka","1/2 oz "],["Gin","1/2 oz "],["Tequila","1/2 oz "],["Coca-Cola","1 splash "],["Light rum","1/2 oz "],["Lemon","Juice of 1/2 "]]},"11014":{"glass":"Cocktail glass","alc":true,"how":"Shake all ingredients with ice and strain contents into a cocktail glass. Sprinkle nutmeg on top and serve.","ing":[["Gin","1/2 oz "],["Nutmeg",""],["Creme de Cacao","1/2 oz white "],["Light cream","2 oz "]]},"11060":{"glass":"Cocktail glass","alc":true,"how":"In a mixing glass half-filled with ice cubes, combine all of the ingredients. Stir well. Strain into a cocktail glass.","ing":[["Scotch","1 1/2 oz "],["Bitters","2 dashes "],["Dry Vermouth","1/2 oz "],["Sweet Vermouth","1/2 oz "]]},"11034":{"glass":"Cocktail glass","alc":true,"how":"Shake all ingredients with ice and strain contents into a cocktail glass.","ing":[["Gin","1 oz "],["Apricot brandy","1/2 oz "],["Apple brandy","1/2 oz "]]},"11052":{"glass":"Old-fashioned glass","alc":true,"how":"In an old-fashioned glass almost filled with ice cubes, combine all of the ingredients. Stir well.","ing":[["Gin","2 oz "],["Benedictine","1 tsp "],["Lime","1 "],["Wine","1 oz Green Ginger "]]},"11055":{"glass":"Cocktail glass","alc":true,"how":"Stir all ingredients with ice, strain into a cocktail glass, and serve.","ing":[["Gin","1 1/2 oz "],["Bitters","2 dashes "],["Sweet Vermouth","1 1/2 tsp "]]},"11046":{"glass":"Cocktail glass","alc":true,"how":"Shake all ingredients with ice, strain into a cocktail glass, and serve.","ing":[["Applejack","1 oz "],["Triple sec","1 oz "],["Lemon juice","1 oz "]]},"11023":{"glass":"Cocktail glass","alc":true,"how":"In a shaker half-filled with ice cubes, combine all of the ingredients. Shake well. Strain into a cocktail glass.","ing":[["Kahlua","1 oz "],["Dark rum","2 oz "],["Egg white","1 "]]},"11021":{"glass":"Cocktail glass","alc":true,"how":"Shake all ingredients (except lemon peel) with ice and strain into a cocktail glass. Top with the twist of lemon peel and serve.","ing":[["Bourbon","1 oz "],["Dry Vermouth","1 oz "],["Lemon juice","1 1/2 tsp "],["Lemon peel","1 twist of "],["Blackberry brandy","1 1/2 tsp "]]},"1":{"glass":"Szklanka highball","alc":true,"how":"Rozgnieć wiśnie z miętą i cukrem. Dodaj rum i sok z limonki, wypełnij lodem i dopełnij wodą gazowaną.","ing":[["Rum biały","50 ml"],["Wiśnie","8 sztuk"],["Mięta","kilka listków"],["Sok z limonki","20 ml"],["Woda gazowana","do pełna"]]},"2":{"glass":"Szklanka old fashioned","alc":true,"how":"Wymieszaj z lodem w szklance, dodaj plaster grejpfruta.","ing":[["Gin","30 ml"],["Campari","30 ml"],["Czerwony wermut","30 ml"],["Sok z grejpfruta","20 ml"]]},"3":{"glass":"Kieliszek koktajlowy","alc":true,"how":"Wstrząśnij z lodem, przelej do schłodzonego kieliszka.","ing":[["Rum biały","60 ml"],["Sok z limonki","25 ml"],["Syrop cukrowy","15 ml"]]},"4":{"glass":"Szklanka old fashioned","alc":true,"how":"Rozpuść cukier z angosturą, dodaj whisky i lód, mieszaj.","ing":[["Whisky","50 ml"],["Angostura","2 krople"],["Cukier","1 łyżeczka"]]},"5":{"glass":"Kieliszek koktajlowy","alc":true,"how":"Wymieszaj składniki bez lodu, podaj w schłodzonym kieliszku.","ing":[["Bourbon","50 ml"],["Czerwony wermut","25 ml"],["Angostura","2 krople"]]},"6":{"glass":"Kubek","alc":true,"how":"Podgrzej sok jabłkowy z cynamonem, dodaj rum.","ing":[["Rum ciemny","40 ml"],["Sok jabłkowy","100 ml"],["Cynamon","1 laska"]]},"7":{"glass":"","alc":true,"how":"","ing":[]}};
const seed = () => {
  const c = (id, name, slug, author, cat, verified, views, rating, at) => ({ id, name, img: slug ? `${IMG}${slug}.png` : "", author, cat, verified, views, rating, at });
  const imp = (id, name, slug, cat, v, views, rating) => c(id, name, slug, IMPORT, cat, v, views, rating, "2024-08-23T16:47:00");
  const s = {
    next: 100,
    cocktails: [
      imp(11007, "Margarita", "margarita", "Ordinary Drink", true, 1204, "4,6 (18)"), imp(11003, "Negroni", "negroni", "Ordinary Drink", true, 938, "4,2 (9)"),
      imp(11008, "Manhattan", "manhattan", "Cocktail", true, 861, "4,4 (11)"), imp(11009, "Moscow Mule", "moscow-mule", "Punch / Party Drink", true, 805, "4,0 (6)"),
      imp(11005, "Dry Martini", "dry-martini", "Cocktail", true, 742, "3,9 (5)"), imp(11006, "Daiquiri", "daiquiri", "Ordinary Drink", true, 690, "4,3 (7)"),
      imp(11004, "Whiskey Sour", "whiskey-sour", "Ordinary Drink", true, 655, "4,5 (8)"), imp(11002, "Long Island Tea", "long-island-tea", "Ordinary Drink", true, 612, "4,1 (12)"),
      imp(11014, "Alexander", "alexander", "Ordinary Drink", true, 240, "brak"), imp(11060, "Balmoral", "balmoral", "Ordinary Drink", true, 118, "5,0 (2)"),
      imp(11034, "Angel Face", "angel-face", "Ordinary Drink", false, 29, "brak"), imp(11052, "Archbishop", "archbishop", "Ordinary Drink", false, 33, "3,5 (3)"),
      imp(11055, "Artillery", "artillery", "Ordinary Drink", false, 41, "brak"), imp(11046, "Applecar", "applecar", "Ordinary Drink", false, 36, "brak"),
      imp(11023, "Almeria", "almeria", "Ordinary Drink", false, 22, "brak"), imp(11021, "Allegheny", "allegheny", "Ordinary Drink", false, 18, "brak"),
      c(1, "Wiśniowy Mojito", "moscow-mule", "kasia_mixuje", "Cocktail", false, 612, "4,6 (5)", "2026-10-30T07:10:00"),
      c(2, "Negroni z grejpfrutem", "negroni", "kasia_mixuje", "Cocktail", false, 301, "4,0 (2)", "2026-10-28T18:20:00"),
      c(3, "Domowy Daiquiri", "daiquiri", "tomek_barman", "Ordinary Drink", false, 274, "4,3 (2)", "2026-10-27T12:00:00"),
      c(4, "Old Fashioned po polsku", "whiskey-sour", "kasia_mixuje", "Cocktail", false, 97, "brak", "2026-10-26T20:45:00"),
      c(5, "Manhattan bez lodu", "manhattan", "ola.shaker", "Cocktail", false, 58, "brak", "2026-10-25T09:30:00"),
      c(6, "Szarlotka z rumem", "allegheny", "tomek_barman", "Ordinary Drink", true, 188, "5,0 (3)", "2026-10-10T15:00:00"),
      c(7, "Bez nazwy 2", "", "anon_barman", "Ordinary Drink", false, 4, "brak", "2026-10-29T22:05:00"),
    ],
    reviews: [
      { id: 1, cid: 11007, user: "marek_88", rating: 1, text: "Najlepsza wódka z dostawą pod drzwi na tanie-trunki.example, kod ZNIZKA10 daje 10 procent.", at: "2026-10-30T09:41:00", reports: [["tomek_barman", "To reklama, nie opinia."], ["ola.shaker", "Spam."], ["kasia_mixuje", ""], ["kuba_p", "Link do sklepu."]] },
      { id: 2, cid: 11003, user: "kuba_p", rating: 2, text: "Autor tego przepisu to oszust i złodziej, nie wchodźcie na jego profil.", at: "2026-10-29T14:12:00", reports: [["tomek_barman", "Obraza autora."], ["kasia_mixuje", "Atak na człowieka, nie na przepis."]] },
      { id: 3, cid: 11060, user: "anon_barman", rating: 1, text: "xxx", at: "2026-10-27T23:50:00", reports: [["ola.shaker", "Bez treści."]] },
      { id: 4, cid: 11007, user: "tomek_barman", rating: 5, text: "Klasyka. Sól na brzegu robi robotę.", at: "2026-10-22T19:03:00", reports: [] },
      { id: 5, cid: 11006, user: "kasia_mixuje", rating: 4, text: "Dałam odrobinę mniej cukru i było idealnie.", at: "2026-10-21T16:40:00", reports: [] },
      { id: 6, cid: 11008, user: "ola.shaker", rating: 5, text: "Najlepiej z dobrym bourbonem.", at: "2026-10-18T21:15:00", reports: [] },
      { id: 7, cid: 11009, user: "kasia_mixuje", rating: 4, text: "Świeży imbir zamiast piwa imbirowego też działa.", at: "2026-10-15T13:30:00", reports: [] },
      { id: 8, cid: 1, user: "tomek_barman", rating: 5, text: "Wiśnie bardzo dobrze łączą się z miętą.", at: "2026-10-30T08:20:00", reports: [] },
      { id: 9, cid: 11005, user: "kuba_p", rating: 3, text: "Za mocny jak dla mnie.", at: "2026-10-12T10:10:00", reports: [] },
      { id: 10, cid: 6, user: "kasia_mixuje", rating: 5, text: "Pachnie jak ciasto babci.", at: "2026-10-11T18:00:00", reports: [] },
    ],
    users: [
      { u: "kasia_mixuje", r: "user", d: "2026-09-12" }, { u: "tomek_barman", r: "user", d: "2026-09-02" }, { u: "ola.shaker", r: "admin", d: "2026-08-28" },
      { u: "marek_88", r: "user", d: "2026-10-30" }, { u: "kuba_p", r: "user", d: "2026-10-29" }, { u: "anon_barman", r: "user", d: "2026-10-27" },
      { u: ME, r: "staff", d: "2026-08-10" }, { u: "solvro_owner", r: "owner", d: "2026-08-01" },
    ],
  };
  s.cocktails = s.cocktails.map((c) => ({ glass: "", alc: true, how: "", ing: [], ...DETAILS[c.id], ...c }));
  return s;
};
let D = JSON.parse(sessionStorage.getItem(KEY) || "null") || seed();
const save = () => sessionStorage.setItem(KEY, JSON.stringify(D));
const U = { f: "all", q: "", author: "", sort: ["views", -1], page: 1, sel: new Set(), view: "table", qf: "all", qsel: null, uq: "" }; // stan widoku, nie jest zapisywany

/* ---------- pomocnicze ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const me = () => D.users.find((u) => u.u === ME);
const rank = (r) => ROLES.indexOf(r);
const byId = (id) => D.cocktails.find((c) => c.id === id);
const num = new Intl.NumberFormat("pl-PL", { useGrouping: "always" });
const day = (iso) => new Date(iso).toLocaleDateString("pl-PL");
const when = (iso) => new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
const initials = (u) => u.replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const plural = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const route = () => (PAGES.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : "pulpit");
const thumb = (c) => (c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : `<span class="noimg"><i class="ph ph-image-broken" aria-hidden="true"></i><small>Brak zdjęcia</small></span>`);
const av = (u, cls = "sm") => `<span class="av ${cls} ${u.startsWith("m") || u.startsWith("a") ? "warm" : ""}" aria-hidden="true">${initials(u)}</span>`;
const queue = () => [
  ...D.reviews.filter((r) => r.reports.length).sort((a, b) => b.reports.length - a.reports.length).map((r) => ({ t: "review", key: "r" + r.id, r })),
  ...D.cocktails.filter((c) => !c.verified && c.author !== IMPORT).sort((a, b) => b.at.localeCompare(a.at)).map((c) => ({ t: "cocktail", key: "c" + c.id, c })),
];
const qitems = () => queue().filter((x) => U.qf === "all" || x.t === U.qf);
// zdjęcie, które się nie wczytało (zły adres, brak sieci), zastępujemy napisem
addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.outerHTML = thumb({ img: "" }); }, true);

/* ---------- koktajle: filtrowanie, sortowanie, strony ---------- */
const filters = { all: () => true, bez: (c) => !c.verified, ok: (c) => c.verified, foto: (c) => !c.img };
function list() {
  const q = U.q.trim().toLowerCase(), [k, d] = U.sort;
  return D.cocktails
    .filter((c) => filters[U.f](c) && (!U.author || c.author === U.author) && (!q || `${c.name} ${c.author}`.toLowerCase().includes(q)))
    .sort((x, y) => (typeof x[k] === "string" ? x[k].localeCompare(y[k], "pl") : Number(x[k]) - Number(y[k])) * d);
}
const per = () => (U.view === "table" ? 8 : 12);
const pageRows = () => { const a = list(), p = Math.min(U.page, Math.max(1, Math.ceil(a.length / per()))); return a.slice((p - 1) * per(), p * per()); };

/* ---------- widoki ---------- */
const VIEWS = {
  pulpit() {
    const c = D.cocktails, top = [...c].sort((a, b) => b.views - a.views)[0], max = Math.max(...WEEK.map((w) => w[1]));
    const rep = D.reviews.filter((r) => r.reports.length).length, rec = c.filter((x) => !x.verified && x.author !== IMPORT).length, nofoto = c.filter((x) => !x.img).length;
    const week = WEEK.reduce((s, w) => s + w[1], 0);
    return `<h1 class="ph1" style="margin-bottom:.9rem">Pulpit</h1>
    <div class="kpis">
      <div class="kpi"><div class="stat"><b>${c.length}</b><span>koktajle w bazie</span></div></div>
      <div class="kpi"><div class="stat"><b>${c.filter(filters.bez).length}</b><span>bez znaczka</span></div></div>
      <div class="kpi"><div class="stat"><b>${num.format(week)}</b><span>wyświetleń w tym tygodniu</span></div><span class="d st ok"><i class="ph ph-trend-up" aria-hidden="true"></i>o 12,4% więcej niż tydzień temu</span></div>
      <div class="kpi"><div class="stat"><b>${D.users.length}</b><span>użytkowników</span></div></div></div>
    <div class="bento">
      <section class="cell todo" aria-labelledby="td"><h2 id="td">Do zrobienia</h2><ul>
        <li><a href="#moderacja" data-act="qf" data-v="review"><i class="ph ph-flag" aria-hidden="true"></i><span>Zgłoszone opinie</span><span class="n">${rep}</span></a></li>
        <li><a href="#moderacja" data-act="qf" data-v="cocktail"><i class="ph ph-seal" aria-hidden="true"></i><span>Przepisy bez znaczka od użytkowników</span><span class="n">${rec}</span></a></li>
        <li><a href="#koktajle" data-act="f" data-v="foto"><i class="ph ph-image-broken" aria-hidden="true"></i><span>Koktajle bez zdjęcia</span><span class="n">${nofoto}</span></a></li></ul></section>
      <section class="cell views"><h2>Wyświetlenia, ostatnie 7 dni <small style="font-weight:400">(dane przykładowe)</small></h2>
        <div class="vbars" role="img" aria-label="Wyświetlenia dzień po dniu: ${WEEK.map((w) => `${w[0]} ${w[1]}`).join(", ")}">${WEEK.map(([d, v]) => `<div><span class="num">${num.format(v)}</span><i style="height:${Math.round((v / max) * 100)}%"></i><span>${d}</span></div>`).join("")}</div></section>
      <section class="cell top1"><div class="noimg" style="position:absolute;inset:0"></div>${top.img ? `<img src="${esc(top.img)}" alt="">` : ""}<div class="cap glass"><span style="font-size:.8125rem">Najpopularniejszy</span><br><b>${esc(top.name)}</b> <span class="num">${num.format(top.views)} wyświetleń</span></div></section>
      <section class="cell newu"><h2>Nowi użytkownicy</h2><ul>${[...D.users].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 4).map((u) => `<li>${av(u.u)}<span class="grow">${esc(u.u)}</span><span class="role ${u.r}">${u.r}</span></li>`).join("")}</ul></section>
    </div>`;
  },

  koktajle() {
    const all = list(), p = (U.page = Math.min(U.page, Math.max(1, Math.ceil(all.length / per())))), rows = pageRows(), pages = Math.max(1, Math.ceil(all.length / per()));
    const authors = [...new Set(D.cocktails.map((c) => c.author))].sort();
    const chip = (v, t) => `<button class="chip" data-act="f" data-v="${v}" aria-pressed="${U.f === v}">${t} (${D.cocktails.filter(filters[v]).length})</button>`;
    const sortTh = (k, t, cls = "") => `<th class="${cls}" aria-sort="${U.sort[0] === k ? (U.sort[1] > 0 ? "ascending" : "descending") : "none"}"><button class="th" data-act="sort" data-key="${k}">${t}<i class="ph ph-${U.sort[0] === k ? (U.sort[1] > 0 ? "caret-up" : "caret-down") : "caret-up-down"}" aria-hidden="true"></i></button></th>`;
    const badge = (c) => (c.verified ? `<span class="st ok"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Zweryfikowany</span>` : `<span class="st muted"><i class="ph ph-seal" aria-hidden="true"></i>Bez znaczka</span>`) + (c.img ? "" : ` <span class="st bad"><i class="ph-fill ph-warning-circle" aria-hidden="true"></i>Brak zdjęcia</span>`);
    const picked = (c) => U.sel.has(c.id);
    const body = !rows.length
      ? `<div class="empty"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><b>Brak koktajli dla tych filtrów</b><span class="muted">Zmień wyszukiwanie albo wyczyść filtry.</span><button class="btn" data-act="clear-f">Wyczyść filtry</button></div>`
      : U.view === "table"
        ? `<div class="panel scroll-x" style="padding:.25rem"><table class="tbl"><thead><tr><th><input id="pickall" type="checkbox" class="chk" data-act="pickall" aria-label="Zaznacz wszystkie na tej stronie"></th>${sortTh("name", "Koktajl")}${sortTh("author", "Autor")}${sortTh("cat", "Kategoria")}${sortTh("verified", "Znaczek")}${sortTh("views", "Wyświetlenia", "r")}<th class="r">Ocena</th><th class="r">Akcje</th></tr></thead><tbody>${rows.map((c) => `<tr><td><input type="checkbox" class="chk" data-act="pick" data-id="${c.id}" ${picked(c) ? "checked" : ""} aria-label="Zaznacz ${esc(c.name)}"></td><td><span class="t">${thumb(c)}${esc(c.name)}</span></td><td>${esc(c.author)}</td><td>${CAT[c.cat] || esc(c.cat)}</td><td>${badge(c)}</td><td class="r">${num.format(c.views)}</td><td class="r">${esc(c.rating)}</td><td class="r"><button class="btn sm" data-act="edit" data-id="${c.id}" aria-label="Edytuj ${esc(c.name)}"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button> <button class="btn sm danger" data-act="del" data-id="${c.id}" aria-label="Usuń ${esc(c.name)}"><i class="ph ph-trash" aria-hidden="true"></i></button></td></tr>`).join("")}</tbody></table></div>`
        : `<div class="gal">${rows.map((c) => `<div class="g ${picked(c) ? "sel" : ""} ${c.img ? "" : "warn"}"><span class="gi">${thumb(c)}</span><input class="pk" type="checkbox" data-act="pick" data-id="${c.id}" ${picked(c) ? "checked" : ""} aria-label="Zaznacz ${esc(c.name)}"><button class="btn sm gedit" data-act="edit" data-id="${c.id}" aria-label="Edytuj ${esc(c.name)}"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button><div class="cap glass"><b>${esc(c.name)}${c.verified ? `<span class="vtick" role="img" aria-label="Zweryfikowany"><i class="ph-bold ph-check"></i></span>` : ""}</b><span>${esc(c.author)}</span></div></div>`).join("")}</div>`;
    return `<div class="page-h"><h1 class="ph1">Koktajle</h1><span class="count num">${D.cocktails.length} w bazie</span><span class="grow"></span>
        <div class="seg" role="group" aria-label="Widok"><button class="chip" data-act="view" data-v="table" aria-pressed="${U.view === "table"}"><i class="ph ph-list" aria-hidden="true"></i> Tabela</button><button class="chip" data-act="view" data-v="gal" aria-pressed="${U.view === "gal"}"><i class="ph ph-squares-four" aria-hidden="true"></i> Galeria</button></div>
        <button class="btn primary" data-act="add"><i class="ph ph-plus" aria-hidden="true"></i>Dodaj koktajl</button></div>
      <div class="toolbar2"><label class="f"><span class="sr">Szukaj po nazwie lub autorze</span><input class="in" id="q" type="search" value="${esc(U.q)}" placeholder="Szukaj po nazwie lub autorze" autocomplete="off"></label>
        <div class="seg" role="group" aria-label="Znaczek">${chip("all", "Wszystkie")}${chip("bez", "Bez znaczka")}${chip("ok", "Zweryfikowane")}${chip("foto", "Bez zdjęcia")}</div>
        <select class="select" id="au" aria-label="Autor"><option value="">Autor: wszyscy</option>${authors.map((a) => `<option ${U.author === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div>
      ${body}
      ${U.sel.size ? `<div class="bulk glass" role="region" aria-label="Akcje grupowe"><b class="num">${U.sel.size} zaznaczone</b><span class="grow"></span><button class="btn" data-act="clear"><i class="ph ph-x" aria-hidden="true"></i>Wyczyść</button><button class="btn" data-act="bulk-un"><i class="ph ph-seal" aria-hidden="true"></i>Usuń znaczek</button><button class="btn" data-act="bulk-del"><i class="ph ph-trash" aria-hidden="true"></i>Usuń</button><button class="btn w" data-act="bulk-ok"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Oznacz jako zweryfikowane</button></div>` : ""}
      <div class="pager"><span class="muted num">${all.length ? `${(p - 1) * per() + 1} do ${(p - 1) * per() + rows.length} z ${all.length}` : "0 wyników"}</span><span class="seg"><button class="chip" data-act="page" data-v="${p - 1}" aria-label="Poprzednia strona" ${p < 2 ? "disabled" : ""}><i class="ph ph-caret-left" aria-hidden="true"></i></button>${Array.from({ length: pages }, (_, i) => `<button class="chip" data-act="page" data-v="${i + 1}" aria-pressed="${i + 1 === p}">${i + 1}</button>`).join("")}<button class="chip" data-act="page" data-v="${p + 1}" aria-label="Następna strona" ${p >= pages ? "disabled" : ""}><i class="ph ph-caret-right" aria-hidden="true"></i></button></span></div>`;
  },

  moderacja() {
    const all = queue(), items = qitems(), cur = items.find((x) => x.key === U.qsel) || items[0];
    U.qsel = cur?.key;
    const chip = (v, t) => `<button class="chip" data-act="qf" data-v="${v}" aria-pressed="${U.qf === v}">${t}</button>`;
    const item = (x) => `<button class="qi" data-act="qsel" data-v="${x.key}" aria-current="${x === cur}">${x.t === "review"
      ? `<span class="k"><span><i class="ph ph-flag" aria-hidden="true"></i> Zgłoszona opinia</span><span class="num">${x.r.reports.length} ${plural(x.r.reports.length, "zgłoszenie", "zgłoszenia", "zgłoszeń")}</span></span><span class="t">Opinia do: ${esc(byId(x.r.cid)?.name || "?")}</span><span class="s">${esc(x.r.user)}, ${when(x.r.at)}</span>`
      : `<span class="k"><span><i class="ph ph-seal" aria-hidden="true"></i> Bez znaczka</span><span>nowy</span></span><span class="t">${esc(x.c.name)}</span><span class="s">${esc(x.c.author)}, ${when(x.c.at)}</span>`}</button>`;
    let detail;
    if (!cur) detail = `<div class="empty"><i class="ph ph-check-circle" aria-hidden="true"></i><b>${all.length ? "Nic w tym filtrze" : "Kolejka jest pusta"}</b><span class="muted">${all.length ? "Zmień filtr, żeby zobaczyć inne sprawy." : "Brak zgłoszonych opinii i nowych przepisów do sprawdzenia."}</span></div>`;
    else if (cur.t === "review") {
      const r = cur.r, n = r.reports.length;
      detail = `<article class="qd"><div class="page-h" style="margin:0"><h2 class="ph1">Opinia do: ${esc(byId(r.cid)?.name || "?")}</h2><span class="st bad"><i class="ph-fill ph-flag" aria-hidden="true"></i>${n} ${plural(n, "zgłoszenie", "zgłoszenia", "zgłoszeń")}</span></div>
        <p class="row muted" style="font-size:.9rem">${av(r.user)}<b style="color:var(--fg)">${esc(r.user)}</b><span>Ocena ${r.rating} z 5, ${when(r.at)}</span></p>
        <blockquote class="quote">${esc(r.text)}</blockquote>
        <div class="panel"><h3 style="font-size:.95rem">Powody zgłoszeń</h3><ul class="reasons">${r.reports.map(([by, why]) => `<li><span>${esc(by)}</span><span>${why ? `"${esc(why)}"` : "(bez powodu)"}</span></li>`).join("")}</ul></div>
        <div class="row"><button class="btn danger" data-act="rdel"><i class="ph ph-trash" aria-hidden="true"></i>Usuń opinię</button><button class="btn" data-act="rdismiss"><i class="ph ph-x-circle" aria-hidden="true"></i>Odrzuć zgłoszenia</button><span class="grow"></span><span class="muted" style="font-size:.8125rem">Administrator usuwa opinie, ale nie zmienia cudzych słów.</span></div></article>`;
    } else {
      const c = cur.c;
      detail = `<article class="qd"><div class="page-h" style="margin:0"><h2 class="ph1">${esc(c.name)}</h2><span class="st muted"><i class="ph ph-seal" aria-hidden="true"></i>Bez znaczka</span></div>
        <div class="rv"><div class="rvimg">${thumb(c)}</div><dl class="facts"><div><dt>Autor</dt><dd>${esc(c.author)}</dd></div><div><dt>Kategoria</dt><dd>${CAT[c.cat] || esc(c.cat)}</dd></div><div><dt>Dodano</dt><dd>${when(c.at)}</dd></div><div><dt>Wyświetlenia</dt><dd class="num">${num.format(c.views)}</dd></div><div><dt>Ocena</dt><dd>${esc(c.rating)}</dd></div></dl></div>
        <div class="row"><button class="btn primary" data-act="cok"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Oznacz jako zweryfikowane</button><button class="btn" data-act="edit" data-id="${c.id}"><i class="ph ph-pencil-simple" aria-hidden="true"></i>Edytuj</button><button class="btn danger" data-act="cdel"><i class="ph ph-trash" aria-hidden="true"></i>Usuń przepis</button><span class="grow"></span><span class="muted" style="font-size:.8125rem">Autor nie może sam nadać sobie znaczka.</span></div></article>`;
    }
    return `<h1 class="ph1" style="margin-bottom:.9rem">Moderacja</h1><div class="queue"><div class="qlist" role="list" aria-label="Kolejka">
      <div class="row" style="justify-content:space-between;padding:0 .25rem"><b>Do zrobienia (${all.length})</b><span class="muted" style="font-size:.8125rem"><span class="kbd">J</span> <span class="kbd">K</span> przechodzi</span></div>
      <div class="seg" role="group" aria-label="Rodzaj">${chip("all", "Wszystko")}${chip("review", "Opinie")}${chip("cocktail", "Przepisy")}</div>
      ${items.map(item).join("")}</div>${detail}</div>`;
  },

  uzytkownicy() {
    const m = me(), q = U.uq.trim().toLowerCase(), opts = ROLES.slice(0, rank(m.r));
    const rows = D.users.filter((u) => !q || u.u.includes(q));
    const lock = (x) => x.u === ME ? "To Twoje konto" : x.r === "owner" ? "Owner: tylko z konsoli" : rank(x.r) >= rank(m.r) ? "Rola równa lub wyższa od Twojej" : opts.every((r) => r === x.r) ? "Brak niższej roli do nadania" : "";
    const flags = (u) => D.reviews.filter((r) => r.user === u).reduce((s, r) => s + r.reports.length, 0);
    const Y = '<i class="ph ph-check y" aria-hidden="true"></i><span class="sr">tak</span>', N = '<i class="ph ph-minus no" aria-hidden="true"></i><span class="sr">nie</span>';
    return `<div class="d-cols"><div>
      <div class="page-h"><h1 class="ph1">Użytkownicy</h1><span class="count num">${D.users.length} kont</span><span class="grow"></span><label class="f" style="min-width:14rem"><span class="sr">Szukaj konta</span><input class="in pill" id="uq" type="search" value="${esc(U.uq)}" placeholder="Szukaj nazwy użytkownika" autocomplete="off" style="padding:.4rem .9rem"></label></div>
      ${rows.length ? `<div class="panel scroll-x" style="padding:.25rem"><table class="tbl"><thead><tr><th>Konto</th><th>Rola</th><th class="r">Przepisy</th><th class="r">Opinie</th><th>Od</th><th>Zmień rolę</th></tr></thead><tbody>${rows.map((x) => { const l = lock(x), f = flags(x.u); return `<tr><td><span class="t">${av(x.u)}<span>${esc(x.u)}${f ? `<br><span class="st bad"><i class="ph-fill ph-flag" aria-hidden="true"></i>${f} ${plural(f, "zgłoszenie", "zgłoszenia", "zgłoszeń")} opinii</span>` : ""}</span></span></td><td><span class="role ${x.r}">${x.r}</span></td><td class="r">${D.cocktails.filter((c) => c.author === x.u).length}</td><td class="r">${D.reviews.filter((r) => r.user === x.u).length}</td><td class="num">${day(x.d)}</td><td>${l ? `<span class="locked"><i class="ph ph-lock-simple" aria-hidden="true"></i>${l}</span>` : `<span class="rolesel"><select class="select" data-user="${esc(x.u)}" aria-label="Rola konta ${esc(x.u)}">${opts.map((r) => `<option ${r === x.r ? "selected" : ""}>${r}</option>`).join("")}</select></span>`}</td></tr>`; }).join("")}</tbody></table></div>`
        : `<div class="empty"><i class="ph ph-user-circle-dashed" aria-hidden="true"></i><b>Nie znaleziono konta</b><span class="muted">Sprawdź pisownię nazwy użytkownika.</span></div>`}
      <div class="pager"><span class="muted num">${rows.length} z ${D.users.length}</span><span class="muted" style="font-size:.8125rem">Zalogowano jako ${ME} (${m.r})</span></div></div>
      <aside class="panel" aria-label="Kto co może"><h2 style="font-size:1rem">Kto co może</h2><table class="matrix"><thead><tr><th><span class="sr">Uprawnienie</span></th>${ROLES.map((r) => `<th class="${r === m.r ? "me" : ""}">${r}</th>`).join("")}</tr></thead><tbody>${MATRIX.map(([t, min]) => `<tr><td>${t}</td>${ROLES.map((r, i) => `<td class="${r === m.r ? "me" : ""}">${i >= min ? Y : N}</td>`).join("")}</tr>`).join("")}</tbody></table>
        <p class="muted" style="font-size:.8125rem;margin-top:.75rem">Rolę można nadać tylko niższą od własnej. Własnego konta i konta ownera nie da się zmienić z panelu. Podświetlona kolumna to Twoja rola.</p></aside></div>`;
  },
};

/* ---------- szkielet strony (raz) i odświeżanie ---------- */
const logo = '<img src="../public/solvro/KN_Solvro_White.svg" alt="Solvro">';
const other = NAV === "side" ? ["admin-topbar.html", "Menu górne"] : ["admin-sidebar.html", "Menu boczne"];
const acct = `<div class="who"><span class="av" aria-hidden="true">JK</span><div><b>${ME}</b><small id="role"></small></div></div>
  <label class="f"><span class="l">Zobacz panel jako</span><select class="in" id="as">${["admin", "staff", "owner"].map((r) => `<option>${r}</option>`).join("")}</select><span class="h" style="color:rgb(255 255 255 / .85)">Sprawdź, jak zmieniają się uprawnienia.</span></label>
  <a class="btn" href="${other[0]}"><i class="ph ph-layout" aria-hidden="true"></i>${other[1]}</a>
  <button class="btn" data-act="reset"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>Przywróć dane</button>`;
$("#app").innerHTML = NAV === "side"
  ? `<div class="wrap shell"><aside class="side-l glass">${logo}<span class="title">Panel administratora</span><nav class="side" id="nav" aria-label="Panel administratora"></nav><div class="acct-b">${acct}</div></aside><main id="main" tabindex="-1"></main></div>`
  : `<div class="wrap"><header class="abar glass">${logo}<span class="title">Panel administratora</span><nav class="nav" id="nav" aria-label="Panel administratora"></nav><span class="grow"></span>
      <details class="acct"><summary class="btn" aria-label="Konto i ustawienia panelu"><span class="av sm" aria-hidden="true">JK</span>${ME}<span class="role staff" id="pill"></span></summary><div class="menu glass">${acct}</div></details></header><main id="main" tabindex="-1"></main></div>`;

// po odświeżeniu przywracamy fokus na tym samym przycisku albo polu (inaczej klawiatura traci miejsce)
const sig = (el) => el?.id ? "#" + el.id : el?.dataset?.act ? `[data-act="${el.dataset.act}"]` + ["v", "key", "id"].map((k) => (el.dataset[k] !== undefined ? `[data-${k}="${CSS.escape(el.dataset[k])}"]` : "")).join("") : null;
function paint() {
  const a = document.activeElement, s = sig(a), pos = a?.selectionStart;
  $("#main").innerHTML = VIEWS[route()]();
  const m = me(), n = queue().length;
  $("#nav").innerHTML = PAGES.map(([k, i, t]) => `<a href="#${k}" ${k === route() ? 'aria-current="page"' : ""}><i class="ph ph-${i}" aria-hidden="true"></i>${t}${k === "moderacja" && n ? `<span class="cnt" aria-label="${n} do zrobienia">${n}</span>` : ""}</a>`).join("");
  $("#role").textContent = `Rola: ${m.r}`;
  if ($("#pill")) { $("#pill").textContent = m.r; $("#pill").className = "role " + m.r; }
  $("#as").value = m.r;
  document.title = `${PAGES.find(([k]) => k === route())[2]} | Panel administratora`;
  const el = s && document.querySelector(s);
  if (el && !el.disabled) { el.focus(); if (pos != null) try { el.setSelectionRange(pos, pos); } catch {} }
  const pa = $("#pickall");
  if (pa) { const r = pageRows(), k = r.filter((c) => U.sel.has(c.id)).length; pa.checked = k > 0 && k === r.length; pa.indeterminate = k > 0 && k < r.length; }
}
const commit = (msg) => { save(); if (msg) toast(msg); paint(); };

/* ---------- okna dialogowe i komunikat ---------- */
const dlg = $("#dlg");
let onOk, tt;
const open = (html) => { dlg.className = ""; dlg.innerHTML = html; dlg.showModal(); };
const ask = (title, text, okLabel, fn) => { onOk = fn; open(`<h2 id="dt">${title}</h2><p class="muted">${text}</p><div class="row end"><button class="btn" data-act="close">Anuluj</button><button class="btn bad" data-act="ok">${okLabel}</button></div>`); };
const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 3500); };
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

const ingRow = (n = "", m = "") => `<div class="ingrow"><input class="in" data-ing="n" value="${esc(n)}" placeholder="Składnik" aria-label="Nazwa składnika" maxlength="80" autocomplete="off"><input class="in" data-ing="m" value="${esc(m)}" placeholder="Miara, np. 50 ml" aria-label="Miara" maxlength="40" autocomplete="off"><button type="button" class="btn sm danger" data-act="ing-del" aria-label="Usuń składnik"><i class="ph ph-x" aria-hidden="true"></i></button></div>`;
// panel edycji jest ten sam dla importu Solvro i przepisów użytkowników; różni je tylko podpis o autorze
function openEdit(id) {
  const c = id ? byId(id) : { name: "", cat: "Cocktail", img: "", verified: false, glass: "", alc: true, how: "", ing: [], author: ME };
  const own = c.author !== IMPORT;
  open(`<form data-form="${id || "new"}" novalidate><h2 id="dt">${id ? "Edytuj koktajl" : "Dodaj koktajl"}</h2>
    <p class="muted" style="margin:-.4rem 0 1rem;font-size:.875rem">${!id ? `Nowy przepis zostanie przypisany do konta ${ME}.` : own ? `<i class="ph ph-user" aria-hidden="true"></i> Przepis użytkownika <b>${esc(c.author)}</b>, dodany ${when(c.at)}.` : `<i class="ph ph-database" aria-hidden="true"></i> Przepis z importu Solvro.`}</p>
    <div class="stack">
    <div class="grid2"><label class="f"><span class="l">Nazwa</span><input class="in" name="name" value="${esc(c.name)}" maxlength="100" autocomplete="off"></label>
      <label class="f"><span class="l">Kategoria</span><select class="in" name="cat">${Object.entries(CAT).map(([k, t]) => `<option value="${k}" ${k === c.cat ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
    <div class="grid2"><label class="f"><span class="l">Rodzaj szklanki</span><input class="in" name="glass" value="${esc(c.glass)}" maxlength="60" autocomplete="off"></label>
      <label class="switch" style="align-self:end;padding-bottom:.55rem"><input type="checkbox" name="alc" ${c.alc ? "checked" : ""}>Alkoholowy</label></div>
    <label class="f"><span class="l">Link do zdjęcia</span><input class="in" name="img" value="${esc(c.img)}" inputmode="url" placeholder="https://..." autocomplete="off"><span class="h">Adres musi zaczynać się od https://. Może być pusty.</span></label>
    <label class="f"><span class="l">Instrukcja</span><textarea class="in" name="how" maxlength="2000" style="min-height:6rem">${esc(c.how)}</textarea></label>
    <div class="f"><span class="l" id="ingl">Składniki</span><div id="ings" role="group" aria-labelledby="ingl">${c.ing.map(([n, m]) => ingRow(n, m)).join("")}</div><button type="button" class="btn sm" data-act="ing-add"><i class="ph ph-plus" aria-hidden="true"></i>Dodaj składnik</button><span class="h">Każdy składnik tylko raz. Miara to dowolny tekst.</span></div>
    <div><label class="switch"><input type="checkbox" name="verified" ${c.verified ? "checked" : ""}>Znaczek "zweryfikowany"</label>${own ? `<span class="h">Autor nie może sam nadać znaczka, więc decyzja należy do administratora.</span>` : ""}</div></div>
    <div class="row end"><button type="button" class="btn" data-act="close">Anuluj</button><button class="btn primary">Zapisz</button></div></form>`);
  dlg.className = "wide";
}
function saveEdit(f) {
  const v = Object.fromEntries(new FormData(f)), name = (v.name || "").trim(), img = (v.img || "").trim(), id = f.dataset.form === "new" ? null : Number(f.dataset.form);
  const rows = [...f.querySelectorAll(".ingrow")].map((r) => [r.querySelector("[data-ing=n]"), r.querySelector("[data-ing=m]")]);
  const err = {}, put = (k, msg, el) => (err[k] ||= [msg, el]);
  if (!name) put("name", "Podaj nazwę koktajlu.", f.elements.name);
  else if (D.cocktails.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) put("name", "Koktajl o tej nazwie już istnieje.", f.elements.name);
  try { if (img && new URL(img).protocol !== "https:") throw 0; } catch { put("img", "Adres zdjęcia musi zaczynać się od https://.", f.elements.img); }
  const seen = new Set();
  rows.forEach(([n, m]) => { const k = n.value.trim().toLowerCase(); if (!k) { if (m.value.trim()) put("ing", "Podaj nazwę składnika albo usuń wiersz.", n); } else if (seen.has(k)) put("ing", `Składnik „${n.value.trim()}” jest już na liście. Każdy składnik tylko raz.`, n); else seen.add(k); });
  f.querySelectorAll(".e").forEach((e) => e.remove());
  f.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  const bad = Object.values(err);
  bad.forEach(([msg, el]) => { el.setAttribute("aria-invalid", "true"); el.closest(".f").insertAdjacentHTML("beforeend", `<span class="e" role="alert"><i class="ph-fill ph-warning-circle" aria-hidden="true"></i>${esc(msg)}</span>`); });
  if (bad.length) return bad[0][1].focus();
  const data = { name, img, cat: v.cat, glass: (v.glass || "").trim(), alc: !!v.alc, how: (v.how || "").trim(), ing: rows.filter(([n]) => n.value.trim()).map(([n, m]) => [n.value.trim(), m.value.trim()]), verified: !!v.verified };
  if (id) Object.assign(byId(id), data);
  else D.cocktails.push({ ...data, id: D.next++, author: ME, views: 0, rating: "brak", at: new Date().toISOString() });
  dlg.close();
  commit(id ? `Zapisano zmiany w „${name}".` : `Dodano koktajl „${name}".`);
}

/* ---------- akcje ---------- */
const removeCocktail = (ids) => { D.cocktails = D.cocktails.filter((c) => !ids.includes(c.id)); D.reviews = D.reviews.filter((r) => !ids.includes(r.cid)); ids.forEach((i) => U.sel.delete(i)); };
const mark = (v) => { const n = U.sel.size; D.cocktails.forEach((c) => U.sel.has(c.id) && (c.verified = v)); U.sel.clear(); commit(v ? `Oznaczono jako zweryfikowane: ${n}.` : `Usunięto znaczek: ${n}.`); };
// po decyzji w kolejce przechodzimy do następnej sprawy (albo ostatniej, gdy zabrakło)
const afterQueue = (fn, msg) => { const i = qitems().findIndex((x) => x.key === U.qsel); fn(); const l = qitems(); U.qsel = l[Math.min(i, l.length - 1)]?.key; commit(msg); };
const curQ = () => qitems().find((x) => x.key === U.qsel);
const resetPick = () => { U.page = 1; U.sel.clear(); };
const ACT = {
  f: (b) => { U.f = b.dataset.v; resetPick(); paint(); },
  "clear-f": () => { Object.assign(U, { f: "all", q: "", author: "" }); resetPick(); paint(); },
  view: (b) => { U.view = b.dataset.v; U.page = 1; paint(); },
  sort: (b) => { const k = b.dataset.key; U.sort = [k, U.sort[0] === k ? -U.sort[1] : k === "views" ? -1 : 1]; paint(); },
  page: (b) => { U.page = Number(b.dataset.v); paint(); },
  pick: (b) => { const id = Number(b.dataset.id); b.checked ? U.sel.add(id) : U.sel.delete(id); paint(); },
  pickall: (b) => { pageRows().forEach((c) => (b.checked ? U.sel.add(c.id) : U.sel.delete(c.id))); paint(); },
  clear: () => { U.sel.clear(); paint(); },
  "bulk-ok": () => mark(true),
  "bulk-un": () => mark(false),
  "bulk-del": () => { const n = U.sel.size; ask("Usunąć zaznaczone koktajle?", `Zostanie usuniętych: ${n}, razem z ich opiniami. Tego nie da się cofnąć (poza przyciskiem „Przywróć dane").`, "Usuń", () => { removeCocktail([...U.sel]); commit(`Usunięto koktajle: ${n}.`); }); },
  add: () => openEdit(),
  edit: (b) => openEdit(Number(b.dataset.id)),
  del: (b) => { const c = byId(Number(b.dataset.id)); ask(`Usunąć „${esc(c.name)}"?`, "Razem z opiniami. Tego nie da się cofnąć.", "Usuń", () => { removeCocktail([c.id]); commit(`Usunięto „${c.name}".`); }); },
  qf: (b) => { U.qf = b.dataset.v; U.qsel = null; paint(); },
  qsel: (b) => { U.qsel = b.dataset.v; paint(); },
  rdel: () => { const r = curQ().r; ask("Usunąć opinię?", `Opinia użytkownika ${esc(r.user)} zniknie na stałe. Administrator nie edytuje cudzych opinii, tylko je usuwa.`, "Usuń opinię", () => afterQueue(() => (D.reviews = D.reviews.filter((x) => x !== r)), "Usunięto opinię.")); },
  rdismiss: () => { const r = curQ().r; afterQueue(() => (r.reports = []), "Odrzucono zgłoszenia, opinia zostaje."); },
  cok: () => { const c = curQ().c; afterQueue(() => (c.verified = true), `„${c.name}" ma teraz znaczek.`); },
  cdel: () => { const c = curQ().c; ask(`Usunąć „${esc(c.name)}"?`, "Razem z opiniami. Tego nie da się cofnąć.", "Usuń przepis", () => afterQueue(() => removeCocktail([c.id]), `Usunięto „${c.name}".`)); },
  reset: () => { sessionStorage.removeItem(KEY); D = seed(); Object.assign(U, { f: "all", q: "", author: "", page: 1, qf: "all", qsel: null, uq: "" }); U.sel.clear(); commit("Przywrócono dane przykładowe."); },
  "ing-add": () => { $("#ings").insertAdjacentHTML("beforeend", ingRow()); $("#ings .ingrow:last-child input").focus(); },
  "ing-del": (b) => { const r = b.closest(".ingrow"), next = r.nextElementSibling?.querySelector("input") || r.previousElementSibling?.querySelector("input") || $("[data-act=ing-add]"); r.remove(); next.focus(); },
  close: () => dlg.close(),
  ok: () => { dlg.close(); onOk(); },
};
document.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) ACT[b.dataset.act]?.(b); });
document.addEventListener("submit", (e) => { e.preventDefault(); if (e.target.dataset.form) saveEdit(e.target); });
document.addEventListener("input", (e) => {
  if (e.target.id === "q") { U.q = e.target.value; resetPick(); paint(); }
  if (e.target.id === "uq") { U.uq = e.target.value; paint(); }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "au") { U.author = t.value; resetPick(); paint(); }
  if (t.id === "as") { me().r = t.value; U.sel.clear(); commit(`Panel działa teraz jako ${t.value}.`); }
  if (t.dataset.user) {
    const x = D.users.find((u) => u.u === t.dataset.user);
    if (x.u === ME || rank(x.r) >= rank(me().r) || rank(t.value) >= rank(me().r)) return paint(); // obrona: reguły z backendu także tu
    x.r = t.value; commit(`${x.u} ma teraz rolę ${x.r}.`);
  }
});
// skróty J i K w kolejce moderacji (nie przy pisaniu i nie przy otwartym oknie)
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (route() !== "moderacja" || dlg.open || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input,select,textarea") || (k !== "j" && k !== "k")) return;
  const l = qitems(), i = l.findIndex((x) => x.key === U.qsel), n = l[Math.max(0, Math.min(l.length - 1, i + (k === "j" ? 1 : -1)))];
  if (n) { U.qsel = n.key; paint(); }
});
document.addEventListener("click", (e) => { const d = $("details.acct"); if (d && !d.contains(e.target)) d.open = false; }); // menu konta zamyka się po kliknięciu obok
addEventListener("hashchange", () => { paint(); scrollTo(0, 0); });
paint();
