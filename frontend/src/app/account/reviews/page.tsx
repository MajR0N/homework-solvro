"use client";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog, EmptyState, Skeleton, Thumb, dangerButton, primaryButton } from "@/components/account/ui";
import { Stars } from "@/components/Badges";
import { useDeleteReview, useMyReviews } from "@/lib/data/account";
import type { MyReview } from "@/lib/data/types";
import { plural } from "@/lib/format";

export default function MyReviewsPage() {
  const reviews = useMyReviews();
  const remove = useDeleteReview();
  const [toDelete, setToDelete] = useState<MyReview | null>(null);
  const [notice, setNotice] = useState("");
  const n = reviews.data?.length ?? 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Moje opinie</h2>
        {reviews.data && (
          <p className="text-foreground/70">
            {n} {plural(n, "opinia", "opinie", "opinii")}
          </p>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-sm">
          {notice}
        </p>
      )}
      {reviews.error ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          Nie udało się pobrać opinii.{" "}
          <button type="button" onClick={() => reviews.refetch()} className="underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            Spróbuj ponownie
          </button>
        </div>
      ) : !reviews.data ? (
        <Skeleton className="h-40" />
      ) : n === 0 ? (
        <EmptyState title="Brak opinii" text="Oceń koktajl na jego stronie, a opinia pojawi się tutaj.">
          <Link href="/" className={`${primaryButton} mt-2`}>
            Przeglądaj koktajle
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {reviews.data.map((r) => (
            <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-foreground/20 p-4">
              <Thumb src={r.cocktail.imageUrl} className="size-12" />
              <div className="min-w-0">
                <Link href={`/cocktails/${r.cocktail.id}`} className="font-semibold hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">
                  {r.cocktail.name}
                </Link>
                <p className="flex flex-wrap items-center gap-x-3 text-sm text-foreground/70">
                  <Stars rating={r.rating} />
                  <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString("pl-PL")}</time>
                </p>
                {r.text && <p className="mt-1 break-words">{r.text}</p>}
              </div>
              <button type="button" onClick={() => setToDelete(r)} aria-label={`Usuń opinię o ${r.cocktail.name}`} className={dangerButton}>
                Usuń
              </button>
            </li>
          ))}
        </ul>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Usunąć opinię?"
          text={`Twoja opinia o „${toDelete.cocktail.name}” zniknie, a średnia ocena koktajlu policzy się na nowo.`}
          confirmLabel="Usuń opinię"
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => setNotice("Usunięto opinię."),
              onError: () => setNotice("Nie udało się usunąć opinii. Spróbuj ponownie."),
            })
          }
        />
      )}
    </div>
  );
}
