"use client";
import { useId, useState } from "react";
import type { IngredientOption } from "@/lib/api";
import { useCreateIngredient, useIngredientSearch } from "@/lib/data/recipe";
import type { IngredientRow } from "@/lib/recipe/form";
import { useDebounced } from "@/lib/useDebounced";

// Pole składnika jako "combobox" (wzorzec ARIA): pisanie filtruje podpowiedzi z bazy, strzałki i Enter wybierają, Esc zamyka.
// Wpisana nazwa NIE jest jeszcze składnikiem: trzeba wybrać pozycję z listy albo dodać nowy składnik. Dzięki temu nie ma
// literówek ("lime juise") ani dubli, a przepis zawsze wskazuje prawdziwy składnik (backend łączy je po id).
type Item = { kind: "option"; option: IngredientOption } | { kind: "new"; name: string };

export default function IngredientPicker({
  id, row, taken, invalid, describedBy, onChange,
}: {
  id: string;
  row: IngredientRow;
  taken: Set<number>; // id składników już użytych w innych wierszach (każdy tylko raz)
  invalid: boolean;
  describedBy?: string;
  onChange: (patch: Partial<IngredientRow>) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = row.name.trim();
  // pytamy serwer dopiero po krótkiej przerwie w pisaniu i tylko dla jeszcze niewybranego składnika
  const query = useDebounced(row.ingredientId == null ? typed : "", 250);
  const search = useIngredientSearch(query);
  const create = useCreateIngredient();

  const options = search.data ?? [];
  const settled = row.ingredientId == null && typed !== "" && query === typed && search.isSuccess;
  const exact = options.some((o) => o.name.toLowerCase() === typed.toLowerCase());
  const items: Item[] = settled || options.length ? [...options.map((option): Item => ({ kind: "option", option })), ...(settled && !exact ? [{ kind: "new", name: typed } as Item] : [])] : [];
  const show = open && row.ingredientId == null && typed !== "";

  const choose = (item: Item) => {
    if (item.kind === "option") {
      if (taken.has(item.option.id)) return;
      onChange({ ingredientId: item.option.id, name: item.option.name });
      setOpen(false);
    } else {
      create.mutate(item.name, {
        onSuccess: (o) => {
          onChange({ ingredientId: o.id, name: o.name });
          setOpen(false);
        },
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
    } else if (e.key === "Enter" && show && items[active]) {
      e.preventDefault(); // Enter wybiera podpowiedź, a nie wysyła formularza
      choose(items[active]);
    } else if (e.key === "Escape" && show) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && items[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label="Składnik"
        autoComplete="off"
        placeholder="Szukaj składnika, np. mint"
        value={row.name}
        maxLength={200}
        onChange={(e) => {
          onChange({ name: e.target.value, ingredientId: null }); // zmiana tekstu unieważnia wcześniejszy wybór
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-full border bg-background px-4 py-2 ${invalid ? "border-red-600 ring-1 ring-red-600" : row.ingredientId != null ? "border-primary" : "border-foreground/35"}`}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Podpowiedzi składników"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-2xl border border-foreground/25 bg-background p-1 shadow-lg"
        >
          {search.isFetching && !items.length && <li className="px-3 py-2 text-sm text-foreground/70">Szukam…</li>}
          {search.isError && <li className="px-3 py-2 text-sm">Nie udało się pobrać składników. Spróbuj za chwilę.</li>}
          {items.map((item, i) => {
            const isTaken = item.kind === "option" && taken.has(item.option.id);
            return (
              <li
                key={item.kind === "option" ? item.option.id : "new"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={isTaken || undefined}
                onMouseDown={(e) => e.preventDefault()} // klik nie zabiera fokusu polu, więc lista nie zniknie przed wyborem
                onClick={() => choose(item)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-xl px-3 py-2 text-sm ${i === active ? "bg-primary text-on-primary" : "hover:bg-foreground/10"} ${isTaken ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {item.kind === "option" ? (
                  <>
                    {item.option.name}
                    {isTaken && <span className="ml-2 text-xs">(już dodany)</span>}
                  </>
                ) : (
                  <>+ Dodaj „{item.name}” jako nowy składnik{create.isPending ? "…" : ""}</>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {create.isError && <p className="mt-1 text-sm text-red-700 dark:text-red-300">Nie udało się dodać składnika.</p>}
    </div>
  );
}
