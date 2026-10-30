// Wspólne elementy makiet, które potrzebuje filtry.html: ikony, przykładowe karty (karta A) i pasek aplikacji.
// (lista.html, karta.html i szczegoly.html mają własne kopie, bo powstały wcześniej.)
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l-5.4 3.2 1.4-6.1L3.3 10l6.2-.5L12 3.8l2.5 5.7 6.2.5-4.7 4.4 1.4 6.1z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
};

// nazwy i zdjęcia z API Solvro; znaczki i oceny są PRZYKŁADOWE
const DATA = [
  { name: "Margarita", slug: "margarita", tag: "t", rating: "4,6 (18)" },
  { name: "Black Russian", slug: "black-russian", tag: "p", rating: "4,2 (9)" },
  { name: "Banana Daiquiri", slug: "banana-daiquiri", tag: "v", rating: "3,9 (5)" },
  { name: "Angel Face", slug: "angel-face", tag: "v", rating: "" },
  { name: "Balmoral", slug: "balmoral", tag: "v", rating: "5,0 (2)" },
  { name: "Bloody Maria", slug: "bloody-maria", tag: "p", rating: "4,4 (11)" },
  { name: "Blackthorn", slug: "blackthorn", tag: "v", rating: "" },
  { name: "Archbishop", slug: "archbishop", tag: "v", rating: "3,5 (3)" },
];
const vtick = `<span class="vtick" title="Zweryfikowany" role="img" aria-label="Zweryfikowany">${ICON.check}</span>`;
const card = (c) => {
  const status = { t: '<span class="pill warm">Na topie</span>', p: '<span class="pill status">Popularny</span>' }[c.tag] || "";
  const rate = c.rating ? `<span class="rate" aria-label="Ocena ${c.rating}">${ICON.star}${c.rating}</span>` : "";
  return `<article class="card"><img src="https://cocktails.solvro.pl/images/cocktails/${c.slug}.png" alt="" loading="lazy">
  <button class="fav" aria-label="Ulubione: ${c.name}">${ICON.heart}</button><div class="tag">${status}</div>
  <div class="cap glass"><div class="top"><h3 class="name">${c.name}${c.tag === "v" || c.tag === "t" ? vtick : ""}</h3>${rate}</div><p class="meta">Zwykły drink</p></div></article>`;
};
// data-bar="user": pasek zalogowanego użytkownika (przycisk konta zamiast "Zaloguj"); data-bar="" to pasek gościa
const bar = (user) => `<header class="bar glass"><img src="../public/solvro/KN_Solvro_White.svg" alt="Solvro">
  <div class="search"><input class="field" placeholder="Szukaj koktajlu" aria-label="Szukaj koktajlu"></div>
  <button class="btn"><span class="heart">${ICON.heart}</span>Ulubione (1)</button>
  <select class="select" aria-label="Źródło danych"><option>Własny backend</option></select>
  ${user ? `<button class="btn" aria-label="Konto: kasia_mixuje"><span class="av sm" aria-hidden="true">KM</span>kasia_mixuje</button>` : `<button class="btn">Zaloguj</button>`}</header>`;

document.querySelectorAll("[data-bar]").forEach((el) => (el.innerHTML = bar(el.dataset.bar)));
document.querySelectorAll("[data-cards]").forEach((el) => {
  const [a, b] = el.dataset.cards.split(",").map(Number);
  el.innerHTML = DATA.slice(a, b).map(card).join("");
});
document.querySelectorAll("[data-icon]").forEach((el) => (el.innerHTML = ICON[el.dataset.icon]));
