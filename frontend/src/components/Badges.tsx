import type { Cocktail } from "@/lib/api";
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

// Znaczki z własnego backendu: zweryfikowany, etykieta popularności i ocena. Solvro ich nie zna, więc wtedy nic nie pokazujemy.
export default function Badges({ cocktail }: { cocktail: Cocktail }) {
  const { verified, status, ratingAvg, ratingCount } = cocktail;
  const rated = ratingAvg != null && (ratingCount ?? 0) > 0;
  if (!verified && !status && !rated) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Znaczki">
      {status && (
        <li className={`${pill} ${status === "trending" ? "bg-warm text-on-warm" : "bg-primary text-on-primary"}`}>{STATUS_PL[status]}</li>
      )}
      {verified && (
        <li className={`${pill} border border-foreground/40`}>
          <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Zweryfikowany
        </li>
      )}
      {rated && (
        <li className={`${pill} border border-foreground/40`}>
          <Star filled />
          <span aria-label={`Średnia ocena ${ratingAvg} na 5, liczba opinii ${ratingCount}`}>
            {ratingAvg.toFixed(1).replace(".", ",")} ({ratingCount})
          </span>
        </li>
      )}
    </ul>
  );
}
