"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SlidersHorizontalIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Filters as Query, Status } from "@/lib/api";
import { pl, STATUS_PL } from "@/lib/pl";
import { useDebounced } from "@/lib/useDebounced";

// Filtry na telefonie (zasada M5): jeden wąski rząd [Filtry (n)] [Sortuj] [liczba wyników], a wszystkie filtry w arkuszu od dołu.
// Arkusz pracuje na KOPII ustawień ("szkicu"): nic nie zmienia listy w trakcie wybierania, dopiero "Pokaż N wyników" stosuje całość
// naraz (jedna zmiana adresu), a N liczy się na żywo z backendu dla wybranego zestawu. Zamknięcie bez przycisku odrzuca zmiany.
export type By = "" | "import" | "users" | "mine";
export type Draft = { category: string; alcohol: "" | "true" | "false"; verified: boolean; ing: string; by: By; glass: string; status: Status | "" };

export type PhoneFilterProps = {
  category: string;
  categories: string[];
  alcoholic: Query["alcoholic"];
  sort: string;
  sorts: { value: string; label: string }[];
  ingredient: string;
  verified: boolean;
  by: By;
  canMine: boolean;
  glass: string;
  glasses: string[];
  status: Status | "";
  total?: number;
  own: boolean;
  update: (patch: Record<string, string>) => void;
  /** Ile koktajli pasuje do takiego zestawu filtrów (strona zamienia szkic na zapytanie do API). */
  countFor: (draft: Draft) => Promise<number>;
};

export const BY: { value: By; label: string }[] = [
  { value: "", label: "Wszyscy" },
  { value: "import", label: "Import Solvro" },
  { value: "users", label: "Użytkownicy" },
  { value: "mine", label: "Moje" },
];
const ALCOHOL: { value: Draft["alcohol"]; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "true", label: "Z alkoholem" },
  { value: "false", label: "Bez alkoholu" },
];

const chip = "inline-flex min-h-11 items-center rounded-full border px-4 text-base";
const chipOn = "border-transparent bg-primary font-semibold text-on-primary";
const chipOff = "border-foreground/30 hover:bg-foreground/10";

export default function PhoneFilters(props: PhoneFilterProps) {
  const [open, setOpen] = useState(false);
  const { category, alcoholic, verified, ingredient, by, glass, status, sort, sorts, total, update } = props;
  const count = [category, alcoholic, verified, ingredient, by, glass, status].filter(Boolean).length;

  return (
    <div className="mb-3 md:hidden">
      <div className="glass flex items-center gap-2 rounded-full p-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-base ${count ? "border-transparent bg-white font-semibold text-[#203560]" : "border-white/35 bg-white/10"}`}
        >
          <SlidersHorizontalIcon size={20} aria-hidden="true" />
          Filtry{count > 0 && ` (${count})`}
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Sortuj</span>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="select min-h-11 w-full rounded-full border border-white/35 bg-white/10 py-2 pl-4 text-base font-semibold [&>option]:bg-background [&>option]:text-foreground"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <p className="shrink-0 pr-3 text-sm tabular-nums" aria-live="polite">
          {total != null && (
            <>
              {total}
              <span className="sr-only"> wyników</span>
            </>
          )}
        </p>
      </div>
      {open && <FilterSheet {...props} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FilterSheet({ onClose, ...p }: PhoneFilterProps & { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>({ category: p.category, alcohol: p.alcoholic, verified: p.verified, ing: p.ingredient, by: p.by, glass: p.glass, status: p.status });
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // liczba wyników dla szkicu; zapytanie wychodzi po krótkiej przerwie, a poprzednia liczba zostaje, gdy ładuje się nowa
  const settled = useDebounced(d, 300);
  const found = useQuery({ queryKey: ["filter-count", settled], queryFn: () => p.countFor(settled), placeholderData: keepPreviousData, staleTime: 30_000 });

  const apply = () => {
    p.update({ category: d.category, alcohol: d.alcohol, verified: d.verified ? "1" : "", ing: d.ing.trim(), by: d.by, glass: d.glass, status: d.status });
    onClose();
  };
  const clear = () => setD({ category: "", alcohol: "", verified: false, ing: "", by: "", glass: "", status: "" });
  const group = (label: string, children: React.ReactNode) => (
    <fieldset className="grid gap-2">
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
  const pick = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" aria-pressed={on} onClick={onClick} className={`${chip} ${on ? chipOn : chipOff}`}>
      {label}
    </button>
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="filter-title"
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 flex max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border border-foreground/20 bg-background p-0 text-foreground backdrop:bg-black/55"
    >
      <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-4">
        <h2 id="filter-title" className="text-xl font-bold">
          Filtry
        </h2>
        <button type="button" onClick={onClose} aria-label="Zamknij filtry bez zmian" className="grid size-11 place-items-center rounded-full hover:bg-foreground/10">
          <XIcon size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-5 overflow-y-auto px-5 pb-4 pt-1">
        {group("Kategoria", [{ value: "", label: "Wszystkie" }, ...p.categories.map((c) => ({ value: c, label: pl(c) }))].map((c) => pick(d.category === c.value, c.label, () => set({ category: c.value }))))}
        {group("Alkohol", ALCOHOL.map((a) => pick(d.alcohol === a.value, a.label, () => set({ alcohol: a.value }))))}
        {p.own && (
          <>
            <label className="flex min-h-11 items-center justify-between gap-4">
              <span className="font-semibold">Tylko zweryfikowane</span>
              <input type="checkbox" checked={d.verified} onChange={(e) => set({ verified: e.target.checked })} className="size-6 accent-[#80b3ff]" />
            </label>
            {group("Autor", BY.filter((b) => b.value !== "mine" || p.canMine).map((b) => pick(d.by === b.value, b.label, () => set({ by: b.value }))))}
            {group("Etykieta popularności", ([["", "Dowolna"], ...Object.entries(STATUS_PL)] as [Status | "", string][]).map(([value, label]) => pick(d.status === value, label, () => set({ status: value }))))}
            <label className="grid gap-1">
              <span className="font-semibold">Rodzaj szklanki</span>
              <select value={d.glass} onChange={(e) => set({ glass: e.target.value })} className="select min-h-11 w-full rounded-full border border-foreground/35 bg-background py-2 pl-4 text-base">
                <option value="">Dowolna</option>
                {p.glasses.map((g) => (
                  <option key={g} value={g}>
                    {pl(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold">Składnik</span>
              <input type="search" value={d.ing} onChange={(e) => set({ ing: e.target.value })} placeholder="np. mint, lime" className="min-h-11 w-full rounded-full border border-foreground/35 bg-background px-4 py-2 text-base" />
              <span className="px-1 text-sm text-foreground/70">Nazwy po angielsku; po przecinku: koktajl musi mieć wszystkie.</span>
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-foreground/15 bg-background px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={clear} className="min-h-11 rounded-full border border-foreground/30 px-5 text-base hover:bg-foreground/10">
          Wyczyść
        </button>
        <button type="button" onClick={apply} className="min-h-11 flex-1 rounded-full bg-primary px-5 text-base font-bold text-on-primary hover:opacity-90" aria-live="polite">
          {found.data == null ? "Pokaż wyniki" : `Pokaż ${found.data} ${found.data === 1 ? "wynik" : "wyników"}`}
        </button>
      </div>
    </dialog>
  );
}
