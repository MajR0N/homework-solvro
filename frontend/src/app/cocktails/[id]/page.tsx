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

const button = "rounded-lg border px-4 py-2 hover:bg-foreground/10";

// "Wstecz" przywraca listę razem z filtrami z URL-a; po wejściu bezpośrednim (brak historii) idziemy na /
function Back() {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="mb-6 inline-block underline underline-offset-4"
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
    <main id="content" className="mx-auto w-full max-w-3xl p-4">
      <Back />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-foreground/5">
          {data.imageUrl && (
            <Image src={data.imageUrl} alt={data.name} fill priority sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">{data.name}</h1>
            <FavoriteButton id={data.id} name={data.name} className="shrink-0 border" />
          </div>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {[pl(data.category), pl(data.glass), data.alcoholic ? "Z alkoholem" : "Bezalkoholowy"].map((tag) => (
              <li key={tag} className="rounded-full border border-foreground/25 px-3 py-1">
                {tag}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Badges cocktail={data} />
          </div>

          <h2 className="mt-6 text-xl font-semibold">Przygotowanie</h2>
          <p className="mt-2 leading-relaxed">{data.instructions}</p>
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-xl font-semibold">Składniki</h2>
      <ul className="divide-y divide-foreground/15 rounded-xl border border-foreground/15">
        {data.ingredients.map((ing) => (
          <li key={ing.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-foreground/5">
                {ing.imageUrl && <Image src={ing.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ing.name}</p>
                {ing.type && <p className="text-sm text-foreground/70">{ing.type}</p>}
              </div>
              {/* measure z API ma spację na końcu; null = brak ilości */}
              <p className="shrink-0 text-right">{ing.measure?.trim() || "do smaku"}</p>
            </div>
            {ing.description && (
              <details className="mt-2 text-sm text-foreground/80">
                <summary className="cursor-pointer">O składniku</summary>
                <p className="mt-2 whitespace-pre-line">{ing.description}</p>
              </details>
            )}
          </li>
        ))}
      </ul>

      {source === "own" && (
        <section className="mt-10" aria-labelledby="opinie">
          <h2 id="opinie" className="mb-3 text-xl font-semibold">
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
    </main>
  );
}
