"use client";
import Image from "next/image";
import Link from "next/link";
import CocktailCard from "@/components/CocktailCard";
import { Stars } from "@/components/Badges";
import { EmptyState, primaryButton, Skeleton, Thumb, panel } from "@/components/account/ui";
import { useFavoriteCocktails, useMyActivity, useMyRecipes, useMyReviews, useMyStats } from "@/lib/data/account";
import { decimal, fmt, shortDate } from "@/lib/format";

// Półka: nagłówek z linkiem i poziomy rząd kart (propozycja C). Kolumny o stałej szerokości, przewijane w poziomie.
function Shelf({ title, href, link, children }: { title: string; href: string; link: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <header className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href={href} className="text-sm underline underline-offset-4 hover:text-primary">
          {link}
        </Link>
      </header>
      <div className="grid auto-cols-[11.5rem] grid-flow-col gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}

export default function AccountOverview() {
  const recipes = useMyRecipes();
  const stats = useMyStats();
  const reviews = useMyReviews();
  const activity = useMyActivity(6);
  const favorites = useFavoriteCocktails();

  // "Ostatnie oceny": każdy koktajl raz, najnowsza ocena pierwsza
  const rated = [...new Map((reviews.data ?? []).map((r) => [r.cocktail.id, r])).values()].slice(0, 6);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Przegląd</h2>
        <Link href="/recipes/new" className={primaryButton}>
          Dodaj przepis
        </Link>
      </div>

      <dl className={`${panel} grid grid-cols-2 gap-4 sm:grid-cols-4`}>
        {[
          [stats.data?.recipes, "przepisy"],
          [stats.data && fmt(stats.data.views30d), "wyświetlenia (30 dni)"],
          [stats.data && (stats.data.ratingAvg != null ? decimal(stats.data.ratingAvg) : "brak"), "średnia ocena"],
          [stats.data?.reviewsWritten, "wystawione opinie"],
        ].map(([value, label]) => (
          <div key={label as string}>
            <dd className="text-2xl font-bold tabular-nums">{value ?? "…"}</dd>
            <dt className="text-sm text-foreground/75">{label}</dt>
          </div>
        ))}
      </dl>

      <Shelf title="Moje przepisy" href="/account/recipes" link={`Zarządzaj (${recipes.data?.length ?? 0})`}>
        <Link href="/recipes/new" className="grid aspect-4/5 place-content-center gap-1 rounded-xl border-2 border-dashed border-foreground/35 p-4 text-center font-semibold hover:bg-foreground/5">
          <span className="text-3xl leading-none" aria-hidden="true">
            +
          </span>
          Dodaj przepis
        </Link>
        {recipes.isPending ? <Skeleton className="aspect-4/5" /> : recipes.data?.map((c) => <CocktailCard key={c.id} cocktail={c} />)}
      </Shelf>

      <Shelf title="Ulubione" href="/account/favorites" link={`Zobacz wszystkie (${favorites.ids.length})`}>
        {favorites.ids.length === 0 ? (
          <p className="self-center text-foreground/70">Kliknij serce na karcie koktajlu, żeby go tu zapisać.</p>
        ) : favorites.isPending ? (
          <Skeleton className="aspect-4/5" />
        ) : (
          favorites.data?.data.slice(0, 6).map((c) => <CocktailCard key={c.id} cocktail={c} />)
        )}
      </Shelf>

      <Shelf title="Ostatnie oceny" href="/account/reviews" link={`Zobacz wszystkie (${reviews.data?.length ?? 0})`}>
        {reviews.isPending ? (
          <Skeleton className="aspect-4/5" />
        ) : rated.length === 0 ? (
          <p className="self-center text-foreground/70">Oceń koktajl na jego stronie, a pojawi się tutaj.</p>
        ) : (
          rated.map((r) => (
            <Link key={r.id} href={`/cocktails/${r.cocktail.id}`} className="group relative block aspect-4/5 overflow-hidden rounded-xl bg-foreground/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              {r.cocktail.imageUrl && <Image src={r.cocktail.imageUrl} alt="" fill sizes="184px" className="object-cover transition duration-300 group-hover:scale-105" />}
              <div className="glass absolute inset-x-2 bottom-2 rounded-lg px-3 py-2.5">
                <p className="font-semibold leading-tight">{r.cocktail.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm">
                  Twoja ocena <Stars rating={r.rating} />
                </p>
              </div>
            </Link>
          ))
        )}
      </Shelf>

      <section className={panel}>
        <h2 className="mb-3 text-xl font-semibold">Ostatnia aktywność</h2>
        {activity.isPending ? (
          <Skeleton className="h-24" />
        ) : activity.data?.length ? (
          <ul className="divide-y divide-foreground/15">
            {activity.data.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 py-3">
                <Thumb src={e.cocktail.imageUrl} className="size-11" />
                <p className="min-w-0 flex-1">
                  {e.kind === "given" ? (
                    <>
                      Twoja opinia o <Link href={`/cocktails/${e.cocktail.id}`} className="font-semibold hover:underline">{e.cocktail.name}</Link>
                    </>
                  ) : (
                    <>
                      <Link href={`/cocktails/${e.cocktail.id}`} className="font-semibold hover:underline">{e.cocktail.name}</Link> dostał opinię {e.rating} z 5
                    </>
                  )}
                  <span className="block text-sm text-foreground/70">
                    {e.kind === "received" && e.author ? `od ${e.author}, ` : ""}
                    {shortDate(e.createdAt)}
                  </span>
                </p>
                <Stars rating={e.rating} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Jeszcze nic się nie wydarzyło" text="Gdy ktoś oceni twój przepis albo ty ocenisz cudzy, zobaczysz to tutaj." />
        )}
      </section>
    </div>
  );
}
