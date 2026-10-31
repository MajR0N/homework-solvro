import Image from "next/image";
import Link from "next/link";
import type { Cocktail } from "@/lib/api";
import { pl } from "@/lib/pl";
import { RatingInline, StatusPill, VerifiedIcon } from "./Badges";
import FavoriteButton from "./FavoriteButton";

// Zdjęcie na całą kartę. Status (Na topie, Popularny) leży na zdjęciu, a wąski panel z ciemnego szkła ma stałą wysokość:
// nazwa z ikoną weryfikacji, ocena po prawej, pod spodem kategoria. Pełny zestaw znaczków jest na stronie szczegółów.
// Na telefonie (2 kolumny) panel jest węższy, a linia z kategorią znika (kategoria jest w filtrach i na stronie szczegółów).
// size: normal = karta 4:5; big i compact wypełniają komórkę siatki (kafelki "Na topie"), compact bez linii z kategorią
export default function CocktailCard({ cocktail, size = "normal" }: { cocktail: Cocktail; size?: "normal" | "compact" | "big" }) {
  const { verified, status, ratingAvg, ratingCount } = cocktail;
  const fill = size !== "normal";
  return (
    // przycisk obok linku, nie w środku - interaktywne elementy nie mogą się zagnieżdżać
    <div className={`relative ${fill ? "h-full" : ""}`}>
      <Link
        href={`/cocktails/${cocktail.id}`}
        className={`group relative block ${fill ? "h-full" : "aspect-4/5"} overflow-hidden rounded-xl bg-foreground/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
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
        <div className={`glass absolute inset-x-2 bottom-2 rounded-lg ${size === "big" ? "px-3 py-2.5 md:px-4 md:py-3.5" : "px-2.5 py-2 md:px-3 md:py-2.5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <h2 className={`flex items-center gap-1.5 font-semibold leading-tight ${size === "big" ? "md:text-2xl" : ""}`}>
              {cocktail.name}
              {verified && <VerifiedIcon />}
            </h2>
            {ratingAvg != null && (ratingCount ?? 0) > 0 && <RatingInline avg={ratingAvg} count={ratingCount ?? 0} />}
          </div>
          {/* "Z alkoholem" to norma, więc na karcie zaznaczamy tylko wyjątek */}
          <p className={`mt-0.5 text-sm opacity-90 ${size === "compact" ? "hidden" : size === "big" ? "max-md:hidden" : "max-sm:hidden"}`}>{`${pl(cocktail.category)}${cocktail.alcoholic ? "" : " · Bezalkoholowy"}`}</p>
        </div>
      </Link>
      <FavoriteButton id={cocktail.id} name={cocktail.name} className="absolute right-2 top-2" />
    </div>
  );
}
