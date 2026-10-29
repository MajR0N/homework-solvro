import Image from "next/image";
import Link from "next/link";
import type { Cocktail } from "@/lib/api";
import { pl } from "@/lib/pl";
import FavoriteButton from "./FavoriteButton";

export default function CocktailCard({ cocktail }: { cocktail: Cocktail }) {
  return (
    // przycisk obok linku, nie w środku - interaktywne elementy nie mogą się zagnieżdżać
    <div className="relative">
      <Link
        href={`/cocktails/${cocktail.id}`}
        className="group block overflow-hidden rounded-xl border border-foreground/15 transition hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="relative aspect-square bg-foreground/5">
          {cocktail.imageUrl && (
            <Image
              src={cocktail.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition group-hover:scale-105"
            />
          )}
        </div>
        <div className="p-3">
          <h2 className="font-semibold leading-tight">{cocktail.name}</h2>
          <p className="mt-1 text-sm text-foreground/70">
            {`${pl(cocktail.category)} · ${cocktail.alcoholic ? "Z alkoholem" : "Bezalkoholowy"}`}
          </p>
        </div>
      </Link>
      <FavoriteButton id={cocktail.id} name={cocktail.name} className="absolute right-2 top-2" />
    </div>
  );
}
