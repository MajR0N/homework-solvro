"use client";
import { useEffect, useRef, useState } from "react";
import type { Filters as Query, Status } from "@/lib/api";
import { pl, STATUS_PL } from "@/lib/pl";

// Kto dodał koktajl: wszyscy, import z Solvro, użytkownicy albo ja (tylko po zalogowaniu)
export type By = "" | "import" | "users" | "mine";
const BY: { value: By; label: string }[] = [
  { value: "", label: "Wszyscy" },
  { value: "import", label: "Import Solvro" },
  { value: "users", label: "Użytkownicy" },
  { value: "mine", label: "Moje" },
];

type Props = {
  category: string;
  categories: string[];
  alcoholic: Query["alcoholic"];
  sort: string;
  sorts: { value: string; label: string }[];
  ingredient: string;
  verified: boolean;
  by: By;
  canMine: boolean; // "Moje" ma sens tylko dla zalogowanego (nie w trybie demo, bo jego przepisy nie są w backendzie)
  glass: string;
  glasses: string[];
  status: Status | "";
  total?: number;
  own: boolean; // składnik i "zweryfikowane" istnieją tylko we własnym backendzie
  update: (patch: Record<string, string>) => void;
};

const ALCOHOL = [
  { value: "", label: "Wszystkie" },
  { value: "true", label: "Z alkoholem" },
  { value: "false", label: "Bez" },
];

// Pasek filtrów jest ciemnym szkłem (jak pasek u góry), więc kolory są stałe: biały tekst, a włączony element jest biały z granatowym tekstem.
const btn = "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm";
const off = "border-white/35 bg-white/10 hover:bg-white/20";
const on = "border-transparent bg-white text-[#203560]";
const chip = "rounded-full border px-3.5 py-1 text-sm";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Pole ma własny stan (płynne pisanie), do URL-a trafia po 300 ms przerwy. Stan startuje z adresu przy każdym otwarciu okna,
// więc po "Wyczyść filtry" albo "wstecz" pole nie pokazuje nieaktualnej wartości.
function IngredientField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <label className="block text-sm font-medium">
      Składnik
      <input
        type="search"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onCommit(v.trim()), 300);
        }}
        placeholder="np. mint, lime"
        aria-describedby="ing-hint"
        className="mt-1 w-full rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-normal placeholder:text-white/75"
      />
      <span id="ing-hint" className="mt-1 block px-1 text-xs font-normal text-white/80">
        Nazwy po angielsku; po przecinku: koktajl musi mieć wszystkie.
      </span>
    </label>
  );
}

// Filtry listy: kategoria i "Filtry" otwierają okna, alkohol i sortowanie są od razu w pasku. Wszystko działa od razu (URL),
// a włączone filtry widać dwa razy: wartość w przycisku i chip z krzyżykiem pod paskiem.
export default function Filters({ category, categories, alcoholic, sort, sorts, ingredient, verified, by, canMine, glass, glasses, status, total, own, update }: Props) {
  const [open, setOpen] = useState<"category" | "more" | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // okno zamyka Esc (fokus wraca na przycisk) i kliknięcie poza paskiem
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      root.current?.querySelector<HTMLElement>(`[data-trigger="${open}"]`)?.focus();
      setOpen(null);
    };
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const moreCount = [verified, ingredient, by, glass, status].filter(Boolean).length;
  const active: { label: string; clear: Record<string, string> }[] = [];
  if (category) active.push({ label: `Kategoria: ${pl(category)}`, clear: { category: "" } });
  if (alcoholic) active.push({ label: alcoholic === "true" ? "Z alkoholem" : "Bezalkoholowe", clear: { alcohol: "" } });
  if (verified) active.push({ label: "Zweryfikowane", clear: { verified: "" } });
  if (ingredient) active.push({ label: `Składnik: ${ingredient}`, clear: { ing: "" } });
  if (by) active.push({ label: `Autor: ${BY.find((o) => o.value === by)?.label}`, clear: { by: "" } });
  if (glass) active.push({ label: `Szklanka: ${pl(glass)}`, clear: { glass: "" } });
  if (status) active.push({ label: `Etykieta: ${STATUS_PL[status]}`, clear: { status: "" } });

  return (
    <div>
      {/* na telefonie pasek ma kilka linii, więc przyklejony zasłaniałby pół ekranu; przykleja się dopiero od sm */}
      <div ref={root} className="relative z-20 mb-3 sm:sticky sm:top-20">
        <div role="search" className="glass flex flex-wrap items-center gap-2 rounded-3xl px-3 py-2 sm:rounded-full">
          <button
            type="button"
            data-trigger="category"
            aria-expanded={open === "category"}
            aria-controls="filter-category"
            onClick={() => setOpen(open === "category" ? null : "category")}
            className={`${btn} ${category ? on : off}`}
          >
            <span className="opacity-80">Kategoria:</span> <b className="font-semibold">{category ? pl(category) : "Wszystkie"}</b>
            <Chevron />
          </button>

          <div role="group" aria-label="Alkohol" className="inline-flex rounded-full border border-white/35 bg-white/10 p-0.5">
            {ALCOHOL.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={alcoholic === o.value}
                onClick={() => update({ alcohol: o.value })}
                className={`rounded-full px-3 py-1 text-sm ${alcoholic === o.value ? "bg-white font-semibold text-[#203560]" : "hover:bg-white/20"}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-1.5 text-sm">
            <span className="opacity-80">Sortuj:</span>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="select rounded-full border border-white/35 bg-white/10 py-1.5 pl-3.5 text-sm font-semibold [&>option]:bg-background [&>option]:text-foreground"
            >
              {sorts.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {own && (
            <button
              type="button"
              data-trigger="more"
              aria-expanded={open === "more"}
              aria-controls="filter-more"
              onClick={() => setOpen(open === "more" ? null : "more")}
              className={`${btn} ${moreCount ? on : off}`}
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="8" cy="17" r="2" />
              </svg>
              Filtry
              {moreCount > 0 && <span className="rounded-full bg-[#203560] px-1.5 text-xs font-bold text-white">{moreCount}</span>}
            </button>
          )}

          <p className="ml-auto pr-2 text-sm text-white/85" aria-live="polite">
            {total != null && `Znaleziono: ${total}`}
          </p>
        </div>

        {/* okna są obok paska, a nie w nim: szkło w szkle nie rozmywa tła tak samo, a tak dostają własne rozmycie */}
        {open === "category" && (
          <div id="filter-category" role="group" aria-label="Kategoria" className="glass absolute left-0 top-full mt-2 max-w-full rounded-2xl p-4">
            <div className="flex max-w-lg flex-wrap gap-2">
              {[{ value: "", label: "Wszystkie" }, ...categories.map((c) => ({ value: c, label: pl(c) }))].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => {
                    update({ category: c.value });
                    setOpen(null);
                  }}
                  className={`${chip} ${category === c.value ? "border-transparent bg-white font-semibold text-[#203560]" : "border-white/35 hover:bg-white/20"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {open === "more" && (
          <div id="filter-more" role="group" aria-label="Więcej filtrów" className="glass absolute right-0 top-full mt-2 w-80 max-w-full space-y-4 rounded-2xl p-4">
            <IngredientField value={ingredient} onCommit={(v) => update({ ing: v })} />
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => update({ verified: e.target.checked ? "1" : "" })}
                className="size-4 accent-[#80b3ff]"
              />
              Tylko zweryfikowane
            </label>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Autor</legend>
              <div className="flex flex-wrap gap-2">
                {BY.filter((o) => o.value !== "mine" || canMine).map((o) => (
                  <button key={o.value} type="button" aria-pressed={by === o.value} onClick={() => update({ by: o.value })} className={`${chip} ${by === o.value ? "border-transparent bg-white font-semibold text-[#203560]" : "border-white/35 hover:bg-white/20"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Etykieta popularności</legend>
              <div className="flex flex-wrap gap-2">
                {([["", "Dowolna"], ...Object.entries(STATUS_PL)] as [Status | "", string][]).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={status === value} onClick={() => update({ status: value })} className={`${chip} ${status === value ? "border-transparent bg-white font-semibold text-[#203560]" : "border-white/35 hover:bg-white/20"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              Rodzaj szklanki
              <select
                value={glass}
                onChange={(e) => update({ glass: e.target.value })}
                className="select mt-1 w-full rounded-full border border-white/35 bg-white/10 py-2 pl-4 text-sm font-normal [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="">Dowolna</option>
                {glasses.map((g) => (
                  <option key={g} value={g}>
                    {pl(g)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Włączone filtry">
          <span className="text-foreground/70">Włączone:</span>
          {active.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => update(a.clear)}
              aria-label={`Wyłącz filtr: ${a.label}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/25 bg-foreground/5 py-1 pl-3 pr-2 hover:bg-foreground/10"
            >
              {a.label}
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ category: "", alcohol: "", verified: "", ing: "", by: "", glass: "", status: "" })}
            className="px-2 py-1 text-foreground/70 underline underline-offset-4 hover:text-foreground"
          >
            Wyczyść filtry
          </button>
        </div>
      )}
    </div>
  );
}
