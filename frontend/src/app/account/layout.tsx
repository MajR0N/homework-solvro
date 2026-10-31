"use client";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryButton, Skeleton, button } from "@/components/account/ui";
import { useMyStats } from "@/lib/data/account";
import { useDemo } from "@/lib/demo/mode";
import { useSession } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { decimal, fmt, initials } from "@/lib/format";
import { ownAvailable } from "@/lib/source";
import { ROLE_PL, isAdminLevel, isRole } from "@/lib/roles";

// Wspólny układ konta: baner z liczbami (propozycja A), a pod nim sekcje jako zakładki albo menu boczne (propozycja B).
// Każda sekcja ma własny adres, więc można do niej linkować, a "wstecz" działa.
// Telefon (poniżej 768 px, zasada M9): /account to "centrum": zwarty nagłówek z cienkim rzędem liczb i lista sekcji z licznikami;
// każda sekcja to osobna strona z nagłówkiem "‹ Profil" zamiast banera i zakładek.
const SECTIONS = [
  { href: "/account", label: "Przegląd" },
  { href: "/account/recipes", label: "Moje przepisy", count: "recipes" },
  { href: "/account/favorites", label: "Ulubione", count: "favorites" },
  { href: "/account/reviews", label: "Moje opinie", count: "reviews" },
  { href: "/account/settings", label: "Ustawienia" },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const demo = useDemo();
  const pathname = usePathname();
  const stats = useMyStats();
  const favorites = useFavorites();
  const hub = pathname === "/account";

  if (loading) {
    return (
      <main id="content" className="mx-auto w-full max-w-7xl p-4" aria-busy="true" aria-label="Ładowanie">
        <Skeleton className="mt-4 h-44" />
      </main>
    );
  }

  // Strona jest tylko dla zalogowanych (a dane i tak chroni backend: bez tokenu odpowiada 401)
  if (!session) {
    return (
      <main id="content" className="mx-auto w-full max-w-md p-4">
        <h1 className="mb-2 mt-8 text-3xl font-bold tracking-tight">Konto</h1>
        <p className="mb-6 text-foreground/75">
          {ownAvailable ? "Zaloguj się, żeby zobaczyć swoje przepisy, opinie i statystyki." : "Konta działają tylko z własnym backendem, ale możesz obejrzeć tryb demo."}
        </p>
        <div className="flex flex-wrap gap-3">
          {ownAvailable && (
            <Link href="/login" className={primaryButton}>
              Zaloguj się
            </Link>
          )}
          <button type="button" onClick={() => demo.setOn(true)} className={button}>
            Wypróbuj tryb demo
          </button>
        </div>
      </main>
    );
  }

  const counts = { recipes: stats.data?.recipes, favorites: favorites.length, reviews: stats.data?.reviewsWritten };
  const figures = [
    [stats.data?.recipes, "przepisy", "przepisy"],
    [stats.data && fmt(stats.data.viewsTotal), "wyświetlenia przepisów", "wyświetleń"],
    [stats.data && (stats.data.ratingAvg != null ? decimal(stats.data.ratingAvg) : "brak"), `średnia ocena${stats.data?.ratingCount ? ` (${stats.data.ratingCount} opinii)` : ""}`, "ocena"],
    [favorites.length, "ulubionych", "ulubione"],
  ] as const;

  return (
    <main id="content" className="mx-auto w-full max-w-7xl p-4">
      {!hub && (
        <Link href="/account" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pl-1 pr-3 font-semibold hover:bg-foreground/10 md:hidden">
          <CaretLeftIcon size={22} aria-hidden="true" />
          Profil
        </Link>
      )}
      <section aria-label="Profil" className={`glass mt-2 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-3xl p-4 md:mt-4 md:gap-x-5 md:gap-y-4 md:p-6 ${hub ? "" : "max-md:hidden"}`}>
        <span className="grid size-12 place-items-center rounded-full bg-white/20 text-xl font-bold md:size-20 md:text-3xl" aria-hidden="true">
          {initials(session.username)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-3xl">{session.username}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/60 px-2.5 py-0.5 text-sm">{isRole(session.role) ? ROLE_PL[session.role] : session.role}</span>
            {isAdminLevel(session.role) && (
              <Link href="/admin" className="rounded-full bg-white px-3 py-0.5 text-sm font-semibold text-[#203560] hover:opacity-90 max-md:hidden">
                Panel administratora
              </Link>
            )}
          </p>
        </div>
        <dl className="col-span-2 grid grid-cols-4 gap-2 border-t border-white/20 pt-3 md:gap-4 md:pt-4">
          {figures.map(([value, label, short]) => (
            <div key={label}>
              <dd className="text-lg font-bold tabular-nums md:text-2xl">{value ?? "…"}</dd>
              <dt className="text-xs text-white/85 md:text-sm">
                <span className="max-md:hidden">{label}</span>
                <span className="md:hidden">{short}</span>
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* telefon, tylko centrum: lista sekcji z licznikami (zamiast zakładek) */}
      {hub && (
        <nav aria-label="Sekcje konta" className="mt-3 md:hidden">
          <ul className="divide-y divide-foreground/15 overflow-hidden rounded-2xl border border-foreground/20 bg-foreground/5">
            {[...SECTIONS.slice(1), ...(isAdminLevel(session.role) ? [{ href: "/admin", label: "Panel administratora" }] : [])].map((s) => {
              const n = "count" in s ? counts[s.count] : undefined;
              return (
                <li key={s.href}>
                  <Link href={s.href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-foreground/10">
                    <span className="flex-1 font-semibold">{s.label}</span>
                    {n !== undefined && <span className="rounded-full bg-foreground/10 px-2.5 text-sm tabular-nums">{n}</span>}
                    <CaretRightIcon size={18} aria-hidden="true" className="text-foreground/60" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6">
        <nav aria-label="Sekcje konta" className="flex max-md:hidden gap-1 overflow-x-auto border-b border-foreground/15 lg:sticky lg:top-24 lg:grid lg:content-start lg:self-start lg:overflow-visible lg:border-0">
          {SECTIONS.map((s) => {
            const active = pathname === s.href;
            const n = "count" in s ? counts[s.count] : undefined;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 py-3 lg:rounded-xl lg:border-0 lg:px-3.5 lg:py-2.5 ${
                  active ? "border-primary font-bold lg:bg-primary lg:text-on-primary" : "border-transparent text-foreground/75 hover:text-foreground lg:text-foreground lg:hover:bg-foreground/10"
                }`}
              >
                {s.label}
                {n !== undefined && <span className={`rounded-full px-2 text-xs tabular-nums ${active ? "bg-foreground/10 lg:bg-on-primary/20" : "bg-foreground/10"}`}>{n}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
