import Image from "next/image";
import Link from "next/link";
import type { Cocktail } from "@/lib/api";
import { pl } from "@/lib/pl";
import Badges from "./Badges";
import FavoriteButton from "./FavoriteButton";

// Zdjęcie na całą kartę, a opis leży na panelu z ciemnego szkła (to samo szkło co pasek u góry).
export default function CocktailCard({ cocktail }: { cocktail: Cocktail }) {
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
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        <div className="glass absolute inset-x-2 bottom-2 rounded-lg p-3">
          <h2 className="font-semibold leading-tight">{cocktail.name}</h2>
          <p className="mt-1 text-sm opacity-90">
            {`${pl(cocktail.category)} · ${cocktail.alcoholic ? "Z alkoholem" : "Bezalkoholowy"}`}
          </p>
          <div className="mt-2 empty:hidden">
            <Badges cocktail={cocktail} />
          </div>
        </div>
      </Link>
      <FavoriteButton id={cocktail.id} name={cocktail.name} className="absolute right-2 top-2" />
    </div>
  );
}
