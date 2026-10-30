import type { Cocktail, Status } from "@/lib/api";
import { STATUS_PL } from "@/lib/pl";

const STAR = "M12 17.3l-5.4 3.2 1.4-6.1L3.3 10l6.2-.5L12 3.8l2.5 5.7 6.2.5-4.7 4.4 1.4 6.1z";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d={STAR} />
    </svg>
  );
}

// Pięć gwiazdek (zamalowane = ocena), z opisem dla czytników ekranu
export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`Ocena ${rating} na 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(rating)} />
      ))}
    </span>
  );
}

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";

// "Na topie" w ciepłym akcencie, pozostałe etykiety w kolorze głównym; tekst, więc nie zależy od samego koloru
export function StatusPill({ status }: { status: Status }) {
  return <span className={`${pill} ${status === "trending" ? "bg-warm text-on-warm" : "bg-primary text-on-primary"}`}>{STATUS_PL[status]}</span>;
}

// Mała ikona weryfikacji na ciemnym szkle karty (zawsze biała, więc widoczna w obu motywach); znaczenie niesie opis, nie kolor
export function VerifiedIcon() {
  return (
    <span role="img" aria-label="Zweryfikowany" title="Zweryfikowany" className="inline-grid size-[1.15rem] shrink-0 place-items-center rounded-full bg-white text-[#203560]">
      <svg viewBox="0 0 24 24" className="size-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.5">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

// Ocena w jednej linii: gwiazdka, średnia i liczba opinii
export function RatingInline({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold" role="img" aria-label={`Średnia ocena ${avg} na 5, liczba opinii ${count}`}>
      <Star filled />
      {avg.toFixed(1).replace(".", ",")} ({count})
    </span>
  );
}

// Znaczki z własnego backendu: zweryfikowany, etykieta popularności i ocena. Solvro ich nie zna, więc wtedy nic nie pokazujemy.
export default function Badges({ cocktail }: { cocktail: Cocktail }) {
  const { verified, status, ratingAvg, ratingCount } = cocktail;
  const rated = ratingAvg != null && (ratingCount ?? 0) > 0;
  if (!verified && !status && !rated) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Znaczki">
      {status && (
        <li>
          <StatusPill status={status} />
        </li>
      )}
      {verified && (
        <li className={`${pill} border border-current/40`}>
          <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Zweryfikowany
        </li>
      )}
      {rated && (
        <li className={`${pill} border border-current/40`}>
          <Star filled />
          <span aria-label={`Średnia ocena ${ratingAvg} na 5, liczba opinii ${ratingCount}`}>
            {ratingAvg.toFixed(1).replace(".", ",")} ({ratingCount})
          </span>
        </li>
      )}
    </ul>
  );
}
