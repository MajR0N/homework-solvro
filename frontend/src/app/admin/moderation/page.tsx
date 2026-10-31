"use client";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Stars } from "@/components/Badges";
import { ConfirmDialog, EmptyState, Skeleton, Thumb, button, dangerButton, panel, primaryButton } from "@/components/account/ui";
import { PENDING_QUERY, useAdminAccess, useAdminCocktails, useDeleteCocktail, useDeleteReportedReview, useDismissReports, useReportedReviews, useVerify } from "@/lib/admin/hooks";
import type { ReportedReview } from "@/lib/admin/types";
import type { Cocktail } from "@/lib/api";
import { isDemoId } from "@/lib/demo/fixtures";
import { decimal, fmt, plural, shortDate } from "@/lib/format";
import { pl } from "@/lib/pl";
import { useReplaceDock } from "@/lib/ui/replaceDock";

// Kolejka moderacji (propozycja B z design-proposals/admin.html): po lewej sprawy do decyzji (zgłoszone opinie i nowe przepisy
// użytkowników bez znaczka), po prawej szczegóły i przyciski. Skróty J i K przechodzą po kolejce jak w skrzynce pocztowej.
// Reguła z backendu: administrator usuwa opinie, ale nie zmienia cudzych słów.
// Telefon (poniżej 768 px, zasada M11): najpierw sama kolejka, a dotknięcie sprawy otwiera ją jako osobny ekran z nagłówkiem
// "‹ Kolejka", krokami "‹ ›" i dolnym paskiem decyzji zamiast nawigacji; po decyzji otwiera się następna sprawa.
type Item = { key: string; kind: "review"; review: ReportedReview } | { key: string; kind: "recipe"; recipe: Cocktail };
type Filter = "all" | "review" | "recipe";
// Przyciski decyzji: na komputerze w rzędzie pod sprawą, na telefonie w szklanym pasku przy dolnej krawędzi (zamiast nawigacji).
// Pasek jest ciemnym szkłem, więc przyciski dostają stałe kolory jak pasek zapisu w edytorze (końcowy "!" = ważniejsze od klas bazowych).
// (.glass nie da się ustawić tylko na telefonie, więc pasek ma obudowę, która od 768 px znika z układu przez display: contents)
const barBox = "glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-3xl p-2 md:contents";
const bar = "flex flex-wrap items-center gap-2 md:gap-3";
const barPlain = "max-md:flex-1 max-md:border-white/55! max-md:px-3!";
const barDanger = "max-md:flex-1 max-md:border-red-300! max-md:px-3! max-md:text-red-100!";
const barPrimary = "max-md:flex-1 max-md:bg-white! max-md:px-3! max-md:text-[#203560]!";
const reasonsWord = (n: number) => `${n} ${plural(n, "zgłoszenie", "zgłoszenia", "zgłoszeń")}`;

export default function ModerationPage() {
  const access = useAdminAccess();
  const reports = useReportedReviews();
  const pending = useAdminCocktails(PENDING_QUERY);
  const deleteReview = useDeleteReportedReview();
  const dismiss = useDismissReports();
  const verify = useVerify();
  const deleteCocktail = useDeleteCocktail();
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; label: string; run: () => void } | null>(null);
  const [notice, setNotice] = useState("");
  const [caseOpen, setCaseOpen] = useState(false); // tylko telefon: czy widać sprawę (a nie listę)

  const all: Item[] = [
    ...(reports.data ?? []).map((review): Item => ({ key: `r${review.id}`, kind: "review", review })),
    ...(pending.data?.data ?? []).map((recipe): Item => ({ key: `c${recipe.id}`, kind: "recipe", recipe })),
  ];
  const items = all.filter((i) => filter === "all" || i.kind === filter);
  const index = Math.max(0, items.findIndex((i) => i.key === sel));
  const cur = items[index];
  const loading = (reports.isPending && !reports.error) || (pending.isPending && !pending.error);
  const failed = reports.error || pending.error;

  // po decyzji przechodzimy do sąsiedniej sprawy (następnej, a gdy to ostatnia, poprzedniej)
  const advance = () => {
    const next = items[index + 1] ?? items[index - 1];
    setSel(next?.key ?? null);
    if (!next) setCaseOpen(false); // kolejka opróżniona: wracamy do listy
  };
  useReplaceDock(caseOpen && !!cur); // pasek decyzji (telefon) zastępuje dolną nawigację
  const step = (by: number) => items[index + by] && setSel(items[index + by].key);
  const done = (text: string) => () => setNotice(text);
  const fail = () => setNotice("Nie udało się wykonać akcji. Spróbuj ponownie.");

  // J i K, ale nie podczas pisania i nie przy otwartym oknie
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k !== "j" && k !== "k") || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      if ((e.target as Element | null)?.closest?.("input,select,textarea")) return;
      const at = Math.max(0, items.findIndex((i) => i.key === sel));
      const next = items[Math.max(0, Math.min(items.length - 1, at + (k === "j" ? 1 : -1)))];
      if (next) setSel(next.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chip = (value: Filter, label: string) => (
    <button type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-3.5 py-1 text-sm max-md:min-h-11 max-md:text-base ${filter === value ? "border-transparent bg-primary font-semibold text-on-primary" : "border-foreground/30 hover:bg-foreground/10"}`}>
      {label}
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Moderacja</h2>
      {notice && (
        <p role="status" className="rounded-xl border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-sm">
          {notice}
        </p>
      )}
      {failed ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          Nie udało się pobrać kolejki.{" "}
          <button type="button" onClick={() => { reports.refetch(); pending.refetch(); }} className="underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            Spróbuj ponownie
          </button>
        </div>
      ) : loading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <section aria-label="Kolejka" className={`grid gap-2 ${caseOpen && cur ? "max-md:hidden" : ""}`}>
            <div className="flex items-center justify-between gap-2 px-1">
              <b>Do zrobienia ({all.length})</b>
              <span className="hidden text-xs text-foreground/70 lg:block">
                <kbd className="rounded border border-foreground/40 px-1">J</kbd> <kbd className="rounded border border-foreground/40 px-1">K</kbd> przechodzi
              </span>
            </div>
            <div role="group" aria-label="Rodzaj" className="flex gap-1.5">
              {chip("all", "Wszystko")}
              {chip("review", "Opinie")}
              {chip("recipe", "Przepisy")}
            </div>
            <ul className="grid gap-1.5 overflow-y-auto md:max-h-[32rem]">
              {items.map((i) => (
                <li key={i.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSel(i.key);
                      setCaseOpen(true);
                    }}
                    aria-current={i === cur ? "true" : undefined}
                    className={`grid w-full gap-0.5 rounded-xl border px-3.5 py-2.5 text-left ${i === cur ? "border-transparent bg-primary text-on-primary" : "border-foreground/20 hover:bg-foreground/5"}`}
                  >
                    <span className="flex justify-between gap-2 text-xs font-bold">
                      <span>{i.kind === "review" ? "Zgłoszona opinia" : "Bez znaczka, nowy"}</span>
                      {i.kind === "review" && <span>{reasonsWord(i.review.reportCount)}</span>}
                    </span>
                    <span className="font-semibold">{i.kind === "review" ? `Opinia do: ${i.review.cocktail.name}` : i.recipe.name}</span>
                    <span className="text-sm opacity-85">{i.kind === "review" ? `${i.review.author ?? "usunięte konto"}, ${shortDate(i.review.createdAt)}` : i.recipe.authorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className={`grid gap-4 ${!caseOpen && cur ? "max-md:hidden" : ""}`}>
          {caseOpen && cur && (
            <div className="flex items-center gap-1 md:hidden">
              <button type="button" onClick={() => setCaseOpen(false)} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pl-1 pr-3 font-semibold hover:bg-foreground/10">
                <CaretLeftIcon size={22} aria-hidden="true" />
                Kolejka
              </button>
              <span className="flex-1 text-center text-sm tabular-nums text-foreground/75">
                {index + 1} z {items.length}
              </span>
              <button type="button" onClick={() => step(-1)} disabled={index <= 0} aria-label="Poprzednia sprawa" className="grid size-11 place-items-center rounded-full border border-foreground/30 hover:bg-foreground/10 disabled:opacity-40">
                <CaretLeftIcon size={20} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => step(1)} disabled={index >= items.length - 1} aria-label="Następna sprawa" className="grid size-11 place-items-center rounded-full border border-foreground/30 hover:bg-foreground/10 disabled:opacity-40">
                <CaretRightIcon size={20} aria-hidden="true" />
              </button>
            </div>
          )}
          {!cur ? (
            <EmptyState title={all.length ? "Nic w tym filtrze" : "Kolejka jest pusta"} text={all.length ? "Zmień filtr, żeby zobaczyć inne sprawy." : "Brak zgłoszonych opinii i przepisów do sprawdzenia."} />
          ) : cur.kind === "review" ? (
            <article className="grid gap-4" aria-label="Szczegóły sprawy">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-bold tracking-tight">Opinia do: {cur.review.cocktail.name}</h3>
                <span className="font-semibold text-red-700 dark:text-red-300">{reasonsWord(cur.review.reportCount)}</span>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-foreground/75">
                <b className="text-foreground">{cur.review.author ?? "usunięte konto"}</b>
                <Stars rating={cur.review.rating} />
                <span>{new Date(cur.review.createdAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
              <blockquote className="rounded-r-xl border-l-4 border-red-600 bg-foreground/5 px-4 py-3 text-lg [overflow-wrap:anywhere]">{cur.review.text || <i className="text-foreground/75">(bez treści)</i>}</blockquote>
              <section className={panel} aria-labelledby="reasons-h">
                <h4 id="reasons-h" className="mb-2 font-semibold">
                  Powody zgłoszeń
                </h4>
                <ul className="divide-y divide-foreground/15 text-sm">
                  {cur.review.reports.map((r, n) => (
                    <li key={n} className="flex justify-between gap-4 py-1.5">
                      <span>{r.reporter ?? "usunięte konto"}</span>
                      <span>{r.reason ? `„${r.reason}”` : "(bez powodu)"}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <div className={barBox}>
              <div className={bar}>
                <button
                  type="button"
                  className={`${dangerButton} ${barDanger}`}
                  onClick={() =>
                    setConfirm({ title: "Usunąć opinię?", text: `Opinia użytkownika ${cur.review.author ?? "(usunięte konto)"} zniknie na stałe. Administrator opinii nie edytuje, tylko je usuwa.`, label: "Usuń opinię", run: () => { advance(); deleteReview.mutate(cur.review.id, { onSuccess: done("Usunięto opinię."), onError: fail }); } })
                  }
                >
                  Usuń opinię
                </button>
                <button type="button" className={`${button} ${barPlain}`} onClick={() => { advance(); dismiss.mutate(cur.review.id, { onSuccess: done("Odrzucono zgłoszenia, opinia zostaje."), onError: fail }); }}>
                  Odrzuć zgłoszenia
                </button>
                <span className="flex-1 max-md:hidden" />
                <span className="text-sm text-foreground/70 max-md:hidden">Administrator usuwa opinie, ale nie zmienia cudzych słów.</span>
              </div>
              </div>
              <p className="text-sm text-foreground/70 md:hidden">Administrator usuwa opinie, ale nie zmienia cudzych słów.</p>
            </article>
          ) : (
            <article className="grid gap-4" aria-label="Szczegóły sprawy">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-bold tracking-tight">{cur.recipe.name}</h3>
                <span className="text-foreground/75">Bez znaczka</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
                <Thumb src={cur.recipe.imageUrl} className="aspect-square h-auto w-full max-w-56 rounded-xl" />
                <dl className={`${panel} grid gap-2 text-sm`}>
                  {[
                    ["Autor", cur.recipe.authorName || "Import Solvro"],
                    ["Kategoria", pl(cur.recipe.category)],
                    ["Wyświetlenia (30 dni)", fmt(cur.recipe.views30d ?? 0)],
                    ["Ocena", cur.recipe.ratingAvg != null && (cur.recipe.ratingCount ?? 0) > 0 ? `${decimal(cur.recipe.ratingAvg)} (${cur.recipe.ratingCount})` : "brak opinii"],
                    ["Zdjęcie", cur.recipe.hasImage === false ? "brak" : "jest"],
                  ].map(([t, v]) => (
                    <div key={t} className="flex justify-between gap-4 border-t border-foreground/15 pt-2 first:border-0 first:pt-0">
                      <dt className="text-foreground/70">{t}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className={barBox}>
              <div className={bar}>
                <button type="button" className={`${primaryButton} ${barPrimary}`} disabled={verify.isPending} onClick={() => { advance(); verify.mutate({ ids: [cur.recipe.id], verified: true }, { onSuccess: done(`„${cur.recipe.name}” ma teraz znaczek.`), onError: fail }); }}>
                  <span className="md:hidden">Zweryfikuj</span>
                  <span className="max-md:hidden">Oznacz jako zweryfikowane</span>
                </button>
                {(!access.demo || isDemoId(cur.recipe.id)) && (
                  <Link href={`/recipes/${cur.recipe.id}/edit`} className={`${button} ${barPlain}`}>
                    Edytuj
                  </Link>
                )}
                <button type="button" className={`${dangerButton} ${barDanger}`} onClick={() => setConfirm({ title: `Usunąć „${cur.recipe.name}”?`, text: "Razem z opiniami o tym przepisie. Tego nie da się cofnąć.", label: "Usuń przepis", run: () => { advance(); deleteCocktail.mutate(cur.recipe.id, { onSuccess: done(`Usunięto „${cur.recipe.name}”.`), onError: fail }); } })}>
                  <span className="md:hidden">Usuń</span>
                  <span className="max-md:hidden">Usuń przepis</span>
                </button>
                <span className="flex-1 max-md:hidden" />
                <span className="text-sm text-foreground/70 max-md:hidden">Autor nie może sam nadać sobie znaczka.</span>
              </div>
              </div>
              <p className="text-sm text-foreground/70 md:hidden">Autor nie może sam nadać sobie znaczka.</p>
            </article>
          )}
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog title={confirm.title} text={confirm.text} confirmLabel={confirm.label} onClose={() => setConfirm(null)} onConfirm={confirm.run} />}
    </div>
  );
}
