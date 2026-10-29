"use client";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Badges, { Stars } from "@/components/Badges";
import FavoriteButton from "@/components/FavoriteButton";
import { countView, getCocktail, HttpError, listReviews } from "@/lib/api";
import { pl } from "@/lib/pl";
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
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["cocktail", source, id],
    queryFn: () => getCocktail(id, source),
    // 4xx = błędny adres, ponowne próby nic nie dadzą
    retry: (count, e) => !(e instanceof HttpError && e.status < 500) && count < 2,
  });

  // opinie ma tylko własny backend
  const reviews = useQuery({ queryKey: ["reviews", source, id], queryFn: () => listReviews(id), enabled: source === "own" && !!data });

  // własny backend liczy wyświetlenia szczegółów; Solvro nie ma takiej funkcji
  useEffect(() => {
    if (source === "own") countView(id);
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

  return (
    <main id="content" className="mx-auto w-full max-w-5xl p-4">
      <Back />

      {/* zdjęcie po lewej i przyklejone przy przewijaniu, cała treść po prawej; na telefonie jedna kolumna */}
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div className="relative aspect-square self-start overflow-hidden rounded-xl bg-foreground/5 shadow-lg shadow-primary/20 lg:sticky lg:top-24">
          {data.imageUrl && (
            <Image src={data.imageUrl} alt={data.name} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">{data.name}</h1>
            <FavoriteButton id={data.id} name={data.name} className="shrink-0 border" />
          </div>
          <div className="mt-3 empty:hidden">
            <Badges cocktail={data} />
          </div>

          {/* podstawowe fakty w jednym rzędzie; wartości dłuższe niż kolumna zawijają się do kolejnej linii */}
          <dl className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
            {[
              ["Kategoria", pl(data.category)],
              ["Naczynie", pl(data.glass)],
              ["Alkohol", data.alcoholic ? "Z alkoholem" : "Bezalkoholowy"],
            ].map(([term, value]) => (
              <div key={term} className="rounded-xl border border-foreground/15 bg-foreground/5 px-4 py-3">
                <dt className="text-sm text-foreground/70">{term}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <h2 className={`mt-10 ${heading}`}>Przygotowanie</h2>
          <p className="mt-3 max-w-prose text-lg leading-relaxed">{data.instructions}</p>

      <h2 className={`mt-10 mb-4 ${heading}`}>Składniki</h2>
          <ul className="divide-y divide-foreground/15 rounded-xl border border-foreground/15 bg-foreground/5">
            {data.ingredients.map((ing) => (
              <li key={ing.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
                    {ing.imageUrl ? (
                    <Image src={ing.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid size-full place-items-center text-lg font-semibold text-foreground/60">
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
                <ul className="space-y-3">
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
        </div>
      </div>
    </main>
  );
}
