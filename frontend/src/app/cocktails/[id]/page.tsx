"use client";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Badges, { Stars } from "@/components/Badges";
import FavoriteButton from "@/components/FavoriteButton";
import { countView, getCocktail, HttpError, listReviews } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { isDemoId } from "@/lib/demo/fixtures";
import { pl } from "@/lib/pl";
import { rank } from "@/lib/roles";
import { useSource } from "@/lib/source";

const button = "rounded-full border border-foreground/30 px-5 py-2 hover:bg-foreground/10";
const heading = "text-2xl font-semibold tracking-tight";

// "Wstecz" przywraca listę razem z filtrami z URL-a; po wejściu bezpośrednim (brak historii) idziemy na /
function Back() {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="mb-6 inline-block rounded-full py-1 pr-2 underline underline-offset-4 hover:text-primary"
    >
      ← Wróć do listy
    </button>
  );
}

export default function CocktailPage() {
  const { id } = useParams<{ id: string }>();
  const source = useSource();
  const { session, demo } = useSession();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["cocktail", source, id],
    queryFn: () => getCocktail(id, source),
    // 4xx = błędny adres, ponowne próby nic nie dadzą
    retry: (count, e) => !(e instanceof HttpError && e.status < 500) && count < 2,
  });

  // opinie ma tylko własny backend
  const reviews = useQuery({ queryKey: ["reviews", source, id], queryFn: () => listReviews(id), enabled: source === "own" && !isDemoId(id) && !!data });

  // własny backend liczy wyświetlenia szczegółów; Solvro nie ma takiej funkcji
  useEffect(() => {
    if (source === "own" && !isDemoId(id)) countView(id);
  }, [id, source]);

  if (error) {
    const notFound = error instanceof HttpError && error.status < 500;
    return (
      <main id="content" className="mx-auto w-full max-w-3xl p-4">
        <Back />
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          <p className="mb-3">{notFound ? "Nie znaleziono takiego koktajlu." : "Nie udało się pobrać koktajlu."}</p>
          {!notFound && (
            <button onClick={() => refetch()} className={button}>
              Spróbuj ponownie
            </button>
          )}
        </div>
      </main>
    );
  }

  if (isPending) {
    return (
      <main id="content" className="mx-auto w-full max-w-3xl p-4" aria-busy="true" aria-label="Ładowanie">
        <Back />
        <div className="aspect-square max-w-md animate-pulse rounded-xl bg-foreground/10" />
      </main>
    );
  }

  const facts = [
    ["Kategoria", pl(data.category)],
    ["Naczynie", pl(data.glass)],
    ["Alkohol", data.alcoholic ? "Z alkoholem" : "Bezalkoholowy"],
  ];

  return (
    <main id="content" className="mx-auto w-full max-w-7xl p-4">
      <Back />

      {/* Baner: rozmyte zdjęcie w tle pod ciemną nakładką (dlatego tekst jest zawsze biały, w obu motywach), ostre zdjęcie obok. */}
      <section aria-labelledby="tytul" className="relative isolate overflow-hidden rounded-3xl text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[#203560]">
          {data.imageUrl && <Image src={data.imageUrl} alt="" fill sizes="100vw" className="scale-125 object-cover blur-3xl" />}
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#0f1a30]/90 to-[#0f1a30]/70" />
        <div className="grid items-end gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-8">
          <div className="relative aspect-square max-w-64 overflow-hidden rounded-2xl bg-white/10 shadow-2xl shadow-black/50 md:max-w-none">
            {data.imageUrl && (
              <Image src={data.imageUrl} alt={data.name} fill priority sizes="(min-width: 768px) 17rem, 16rem" className="object-cover" />
            )}
          </div>
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 id="tytul" className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {data.name}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                {/* edytować może autor i administrator wzwyż (backend i tak to sprawdza); przepis demo tylko w trybie demo */}
                {session && (demo ? isDemoId(id) : source === "own") && (data.authorName === session.username || rank(session.role) >= rank("admin")) && (
                  <Link href={`/recipes/${data.id}/edit`} className="rounded-full border border-white/50 px-4 py-2 text-sm hover:bg-white/15">
                    Edytuj
                  </Link>
                )}
                <FavoriteButton id={data.id} name={data.name} />
              </div>
            </div>
            <div className="mt-3 empty:hidden">
              <Badges cocktail={data} />
            </div>
            {/* fakty w jednym rzędzie rozdzielone cienkimi liniami (bez pudełek) */}
            <dl className="mt-6 flex flex-wrap gap-y-3">
              {facts.map(([term, value]) => (
                <div key={term} className="border-l border-white/35 px-6 first:border-l-0 first:pl-0">
                  <dt className="text-sm text-white/80">{term}</dt>
                  <dd className="text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <section aria-labelledby="skladniki">
          <h2 id="skladniki" className={`mb-4 ${heading}`}>
            Składniki
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {data.ingredients.map((ing) => (
              <li key={ing.id} className="rounded-xl border border-foreground/15 bg-foreground/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
                    {ing.imageUrl ? (
                      <Image src={ing.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <span aria-hidden="true" className="grid size-full place-items-center text-xl font-semibold text-foreground/60">
                        {ing.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold leading-tight">{ing.name}</p>
                    {ing.type && <p className="text-sm text-foreground/70">{ing.type}</p>}
                  </div>
                  {/* measure z API ma spację na końcu; null = brak ilości */}
                  <p className="shrink-0 text-right font-semibold tabular-nums text-primary">{ing.measure?.trim() || "do smaku"}</p>
                </div>
                {ing.description && (
                  <details className="mt-2 text-sm text-foreground/80">
                    <summary className="cursor-pointer py-1 hover:text-foreground">O składniku</summary>
                    <p className="mt-2 whitespace-pre-line">{ing.description}</p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="przygotowanie">
          <h2 id="przygotowanie" className={`mb-4 ${heading}`}>
            Przygotowanie
          </h2>
          <div className="rounded-xl border border-foreground/15 bg-foreground/5 p-5">
            <p className="max-w-prose text-lg leading-relaxed">{data.instructions}</p>
          </div>
        </section>
      </div>

      {source === "own" && (
        <section className="mt-10" aria-labelledby="opinie">
          <h2 id="opinie" className={`mb-4 ${heading}`}>
            Opinie{reviews.data ? ` (${reviews.data.total})` : ""}
          </h2>
          {reviews.isError ? (
            <p role="alert">Nie udało się pobrać opinii.</p>
          ) : reviews.isPending ? (
            <p className="text-foreground/70">Ładowanie opinii…</p>
          ) : reviews.data.reviews.length === 0 ? (
            <p className="text-foreground/70">Nikt jeszcze nie ocenił tego koktajlu.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {reviews.data.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-foreground/15 p-3">
                  <div className="flex flex-wrap items-center gap-x-3 text-sm">
                    <Stars rating={r.rating} />
                    {/* author = null: konto zostało usunięte, ale opinia i jej ocena zostają */}
                    <span className={r.author ? "font-medium" : "italic text-foreground/70"}>{r.author ?? "usunięty użytkownik"}</span>
                    <time dateTime={r.createdAt} className="text-foreground/70">
                      {new Date(r.createdAt).toLocaleDateString("pl-PL")}
                    </time>
                  </div>
                  {r.text && <p className="mt-2 whitespace-pre-line">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-foreground/70">
            Opinie dodaje się na razie przez API po zalogowaniu (Swagger); formularza w interfejsie jeszcze nie ma.
          </p>
        </section>
      )}
    </main>
  );
}
