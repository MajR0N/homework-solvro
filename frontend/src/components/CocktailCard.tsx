import Image from "next/image";
import Link from "next/link";
import type { Cocktail } from "@/lib/api";
import { pl } from "@/lib/pl";
import { RatingInline, StatusPill, VerifiedIcon } from "./Badges";
import FavoriteButton from "./FavoriteButton";

// Zdjęcie na całą kartę. Status (Na topie, Popularny) leży na zdjęciu, a wąski panel z ciemnego szkła ma stałą wysokość:
// nazwa z ikoną weryfikacji, ocena po prawej, pod spodem kategoria. Pełny zestaw znaczków jest na stronie szczegółów.
export default function CocktailCard({ cocktail }: { cocktail: Cocktail }) {
  const { verified, status, ratingAvg, ratingCount } = cocktail;
  return (
    // przycisk obok linku, nie w środku - interaktywne elementy nie mogą się zagnieżdżać
    <div className="relative">
      <Link
        href={`/cocktails/${cocktail.id}`}
        className="group relative block aspect-4/5 overflow-hidden rounded-xl bg-foreground/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        {cocktail.imageUrl && (
          <Image
            src={cocktail.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {status && (
          <div className="absolute left-2.5 top-2.5 max-w-[calc(100%-4.5rem)]">
            <StatusPill status={status} />
          </div>
        )}
        <div className="glass absolute inset-x-2 bottom-2 rounded-lg px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-semibold leading-tight">
              {cocktail.name}
              {verified && <VerifiedIcon />}
            </h2>
            {ratingAvg != null && (ratingCount ?? 0) > 0 && <RatingInline avg={ratingAvg} count={ratingCount ?? 0} />}
          </div>
          {/* "Z alkoholem" to norma, więc na karcie zaznaczamy tylko wyjątek */}
          <p className="mt-0.5 text-sm opacity-90">{`${pl(cocktail.category)}${cocktail.alcoholic ? "" : " · Bezalkoholowy"}`}</p>
        </div>
      </Link>
      <FavoriteButton id={cocktail.id} name={cocktail.name} className="absolute right-2 top-2" />
    </div>
  );
}
