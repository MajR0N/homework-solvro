"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { patchParams } from "@/lib/params";
import SourceSwitch from "./SourceSwitch";

const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

// Wspólny pasek na wszystkich stronach: logo, wyszukiwarka, ulubione i (jeśli włączony) wybór źródła danych.
// To szklany panel: odwrócony względem strony (granatowy w motywie jasnym, jasnoniebieski w ciemnym).
export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const favs = useFavorites();
  const onList = pathname === "/";
  const onlyFav = onList && sp.get("fav") === "1";

  // pole tekstowe ma własny stan (płynne pisanie), do URL-a trafia po 300 ms przerwy
  const [text, setText] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Na liście zmieniamy parametry w miejscu; ze strony szczegółów przechodzimy na listę z nowymi parametrami.
  const go = (patch: Record<string, string>) => {
    const url = patchParams(patch, onList ? window.location.search : "");
    if (onList) router.replace(url, { scroll: false });
    else router.push(url);
  };

  return (
    <header className="glass sticky top-0 z-30 border-b border-current/15">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" aria-label="Solvro, strona główna" className="shrink-0 rounded-md sm:order-1">
          {/* oficjalne logo bez zmian: białe na granatowym szkle, kolorowe na jasnym */}
          <Image src="/solvro/KN_Solvro_White.svg" alt="" width={131} height={28} unoptimized className="block dark:hidden" />
          <Image src="/solvro/KN_Solvro_Color.svg" alt="" width={131} height={28} unoptimized className="hidden dark:block" />
        </Link>

        <button
          type="button"
          onClick={() => go({ fav: onlyFav ? "" : "1" })}
          aria-pressed={onlyFav}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm sm:order-3 sm:ml-0 ${onlyFav ? "border-transparent bg-warm text-on-warm" : "border-current/35"}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill={onlyFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d={HEART} />
          </svg>
          <span className="sr-only sm:not-sr-only">Ulubione</span> ({favs.length})
        </button>

        {/* telefon: druga linia (wyszukiwarka i źródło danych); od sm: wszystko w jednej linii, kolejność z klas order */}
        <div className="order-last flex w-full items-center gap-2 sm:contents">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1 sm:order-2">
          <label htmlFor="top-search" className="sr-only">
            Szukaj koktajlu
          </label>
          <input
            id="top-search"
            type="search"
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              setText(value);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go({ q: value.trim() }), 300);
            }}
            placeholder="Szukaj koktajlu"
            className="w-full rounded-lg border border-current/35 bg-current/10 px-3 py-2 text-sm placeholder:text-current/75"
          />
        </form>

        <SourceSwitch compact className="sm:order-4" />
        </div>
      </div>
    </header>
  );
}
