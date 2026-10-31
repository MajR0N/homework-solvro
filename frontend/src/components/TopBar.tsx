"use client";
import { CaretLeftIcon, GearSixIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { patchParams } from "@/lib/params";
import { ownAvailable } from "@/lib/source";
import { openSettings } from "@/lib/ui/settingsSheet";
import DemoToggle from "./DemoToggle";
import ProfileMenu from "./ProfileMenu";
import SourceSwitch from "./SourceSwitch";

const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

// Pole wyszukiwania ma własny stan (płynne pisanie), do URL-a trafia po 300 ms przerwy. Wspólne dla paska telefonu i komputera.
function useSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const onList = pathname === "/";
  // Pole pokazuje frazę z adresu. Szkic (draft) istnieje tylko podczas pisania: dzięki temu link z ?q=... (np. "Zobacz wszystkie"
  // w rzędzie tematycznym) albo logo pokazuje i czyści frazę, a pisanie nie jest nadpisywane przez wolniejszy adres.
  const urlQ = sp.get("q") ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? urlQ;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Na liście zmieniamy parametry w miejscu; ze strony szczegółów przechodzimy na listę z nowymi parametrami.
  const go = (patch: Record<string, string>) => {
    const url = patchParams(patch, onList ? window.location.search : "");
    if (onList) router.replace(url, { scroll: false });
    else router.push(url);
  };
  const change = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: value.trim() }), 300);
  };
  // wyjście z pola (albo zwinięcie go): zatwierdź to, co wpisano, i wróć do pokazywania adresu
  const settle = () => {
    clearTimeout(timer.current);
    if (draft !== null && draft.trim() !== urlQ) go({ q: draft.trim() });
    setDraft(null);
  };
  return { text, change, settle, go, onlyFav: onList && sp.get("fav") === "1" };
}
type Search = ReturnType<typeof useSearch>;

const Logo = () => (
  // oficjalne logo bez zmian: białe na ciemnym szkle
  <Image src="/solvro/KN_Solvro_White.svg" alt="" width={131} height={28} unoptimized className="block" />
);

// Telefon (poniżej 768 px, zasada M1): jeden wąski rząd z logo i dwiema ikonami. Wyszukiwanie rozwija się po dotknięciu lupy,
// a źródło danych, tryb demo i wylogowanie są w arkuszu ustawień pod zębatką. Cele dotyku mają po 44 px.
function PhoneBar({ search }: { search: Search }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  const icon = "grid size-11 shrink-0 place-items-center rounded-full";

  // Panel administratora (zasada M3): zamiast logo i wyszukiwarki napis panelu i droga powrotna do konta; ekrany panelu są w dolnej nawigacji
  if (pathname.startsWith("/admin"))
    return (
      <div className="glass flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-1.5 md:hidden">
        <Link href="/account" className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full pl-2 pr-3 hover:bg-white/15">
          <CaretLeftIcon size={20} aria-hidden="true" />
          Konto
        </Link>
        <span className="min-w-0 flex-1 truncate text-center font-bold">Panel administratora</span>
        <button type="button" onClick={openSettings} aria-label="Ustawienia" className={`${icon} hover:bg-white/15`}>
          <GearSixIcon size={22} aria-hidden="true" />
        </button>
      </div>
    );

  return (
    <div className="glass flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 md:hidden">
      {expanded ? (
        <>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1">
            <label htmlFor="top-search-phone" className="sr-only">
              Szukaj koktajlu
            </label>
            <input
              id="top-search-phone"
              ref={input}
              type="search"
              value={search.text}
              onChange={(e) => search.change(e.target.value)}
              onBlur={search.settle}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                search.settle();
                setExpanded(false);
              }}
              placeholder="Szukaj koktajlu"
              className="h-11 w-full rounded-full border border-current/35 bg-current/10 px-4 text-base placeholder:text-current/75"
            />
          </form>
          <button
            type="button"
            onClick={() => {
              search.settle();
              setExpanded(false);
            }}
            aria-label="Zamknij wyszukiwanie" className={`${icon} hover:bg-white/15`}>
            <XIcon size={22} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <Link href="/" aria-label="Solvro, strona główna" className="flex h-11 items-center rounded-md">
            <Logo />
          </Link>
          <span className="flex-1" />
          {/* aktywne wyszukiwanie widać po białej pigułce, także gdy pole jest zwinięte */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-label={search.text ? `Szukaj koktajlu, aktywne wyszukiwanie: ${search.text}` : "Szukaj koktajlu"}
            className={`${icon} ${search.text ? "bg-white text-[#203560]" : "hover:bg-white/15"}`}
          >
            <MagnifyingGlassIcon size={22} weight={search.text ? "bold" : "regular"} aria-hidden="true" />
          </button>
          <button type="button" onClick={openSettings} aria-label="Ustawienia" className={`${icon} hover:bg-white/15`}>
            <GearSixIcon size={22} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

// Komputer i tablet (od 768 px): jeden rząd z logo, wyszukiwarką, ulubionymi, źródłem danych, trybem demo i menu profilu.
function DesktopBar({ search }: { search: Search }) {
  const { session, loading, demo } = useSession();
  const favs = useFavorites();
  return (
    <div className="glass hidden items-center gap-3 rounded-full py-2 pl-4 pr-3 md:flex">
      <Link href="/" aria-label="Solvro, strona główna" className="shrink-0 rounded-md">
        <Logo />
      </Link>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1">
        <label htmlFor="top-search" className="sr-only">
          Szukaj koktajlu
        </label>
        <input
          id="top-search"
          type="search"
          value={search.text}
          onChange={(e) => search.change(e.target.value)}
          onBlur={search.settle}
          placeholder="Szukaj koktajlu"
          className="w-full rounded-full border border-current/35 bg-current/10 px-4 py-2 text-sm placeholder:text-current/75"
        />
      </form>
      <button
        type="button"
        onClick={() => search.go({ fav: search.onlyFav ? "" : "1" })}
        aria-pressed={search.onlyFav}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${search.onlyFav ? "border-transparent bg-warm text-on-warm" : "border-current/35"}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill={search.onlyFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d={HEART} />
        </svg>
        Ulubione ({favs.length})
      </button>
      <SourceSwitch compact />
      <DemoToggle />
      {/* konto istnieje tylko we własnym backendzie (albo w trybie demo) */}
      {(ownAvailable || demo) &&
        !loading &&
        (session ? (
          <ProfileMenu />
        ) : (
          <Link href="/login" className="rounded-full border border-current/35 px-4 py-2 text-sm">
            Zaloguj
          </Link>
        ))}
    </div>
  );
}

// Wspólny pasek na wszystkich stronach. Zewnętrzny element jest przezroczysty i trzyma pigułkę w tej samej szerokości co treść.
export default function TopBar() {
  const search = useSearch();
  return (
    <header className="bar-sticky top-3 z-30 mx-auto mt-3 w-full max-w-7xl px-4">
      <PhoneBar search={search} />
      <DesktopBar search={search} />
    </header>
  );
}
