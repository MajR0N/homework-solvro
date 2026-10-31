import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { pageItems } from "@/lib/pager";

// Paginacja z numerami ("1 … 4 5 6 … 19", decyzja U6). Od 640 px numery, na telefonie zwarte "Strona 4 z 19" między strzałkami
// (komplet numerów nie zmieściłby się w 360 px przy celach dotykowych po 44 px). Wspólna dla listy na stronie głównej i galerii w panelu.
const cell = "grid min-h-11 min-w-11 place-items-center rounded-full border px-3 tabular-nums";

export default function Pager({ page, last, onPage, busy }: { page: number; last: number; onPage: (n: number) => void; busy?: boolean }) {
  const arrow = `${cell} border-foreground/30 hover:bg-foreground/10 disabled:opacity-40`;
  return (
    <nav className="flex items-center justify-center gap-1.5 md:gap-2" aria-label="Paginacja">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Poprzednia strona" className={arrow}>
        <CaretLeftIcon size={18} aria-hidden="true" />
      </button>
      <span className="px-2 sm:hidden">
        Strona {page} z {last}
      </span>
      <ul className="hidden items-center gap-1.5 sm:flex md:gap-2">
        {pageItems(page, last).map((n, i) => (
          <li key={n ?? `gap-${i}`}>
            {n === null ? (
              <span aria-hidden="true" className="px-1">
                …
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onPage(n)}
                disabled={busy && n !== page}
                aria-label={`Strona ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={`${cell} ${n === page ? "border-transparent bg-primary font-semibold text-on-primary" : "border-foreground/30 hover:bg-foreground/10 disabled:opacity-40"}`}
              >
                {n}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= last || busy} aria-label="Następna strona" className={arrow}>
        <CaretRightIcon size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
