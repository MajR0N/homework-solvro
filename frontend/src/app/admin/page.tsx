"use client";
import Image from "next/image";
import Link from "next/link";
import { EmptyState, Skeleton, ViewsChart, panel } from "@/components/account/ui";
import { useAdminStats } from "@/lib/admin/hooks";
import { fmt, shortDate } from "@/lib/format";
import { ROLE_PL } from "@/lib/roles";

// Pulpit (propozycja C z design-proposals/admin.html): cztery liczby, lista spraw do zrobienia, wyświetlenia z tygodnia,
// najpopularniejszy koktajl i nowi użytkownicy. Wszystko liczone z aktualnych danych (nic na sztywno).
export default function AdminDashboard() {
  const { data: s, error, refetch } = useAdminStats();

  if (error)
    return (
      <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
        Nie udało się pobrać danych pulpitu.{" "}
        <button type="button" onClick={() => refetch()} className="underline underline-offset-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  if (!s)
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Ładowanie">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );

  const todo = [
    { href: "/admin/moderation", label: "Zgłoszone opinie", n: s.reportedReviews },
    { href: "/admin/moderation", label: "Przepisy użytkowników bez znaczka", n: s.pendingRecipes },
    { href: "/admin/cocktails?image=none", label: "Koktajle bez zdjęcia", n: s.withoutImage },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h2 className="sr-only">Pulpit</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [fmt(s.cocktails), "koktajle w bazie"],
          [fmt(s.unverified), "bez znaczka"],
          [fmt(s.views7d), "wyświetleń w ostatnich 7 dniach"],
          [fmt(s.users), "użytkowników"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-b-xl border-t-[3px] border-primary bg-foreground/5 px-4 py-3">
            <dd className="text-3xl font-bold tabular-nums leading-tight">{value}</dd>
            <dt className="text-sm text-foreground/75">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <section className={`${panel} lg:row-span-2`} aria-labelledby="todo-h">
          <h3 id="todo-h" className="mb-2 text-lg font-semibold">
            Do zrobienia
          </h3>
          <ul className="divide-y divide-foreground/15">
            {todo.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-center gap-3 py-3 hover:underline">
                  <span className="flex-1">{t.label}</span>
                  <span className={`text-xl font-bold tabular-nums ${t.n ? "" : "text-foreground/50"}`}>{t.n}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/moderation" className="mt-3 inline-block rounded-full bg-primary px-5 py-2 font-semibold text-on-primary hover:opacity-90">
            Otwórz kolejkę
          </Link>
        </section>

        <section className="rounded-xl bg-primary p-5 text-on-primary lg:col-span-2" aria-labelledby="views-h">
          <h3 id="views-h" className="mb-3 text-lg font-semibold">
            Wyświetlenia, ostatnie 7 dni
          </h3>
          {/* słupki są w kolorze tekstu przycisku, żeby były widoczne na niebieskim tle w obu motywach */}
          <div className="[&_p]:text-on-primary/85 [&_span.bg-primary]:bg-on-primary">
            <ViewsChart days={s.viewsByDay} />
          </div>
        </section>

        {s.top ? (
          <Link href={`/cocktails/${s.top.id}`} className="group relative block min-h-56 overflow-hidden rounded-xl bg-foreground/10">
            {s.top.imageUrl && <Image src={s.top.imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />}
            <div className="glass absolute inset-x-2 bottom-2 rounded-lg px-3.5 py-3">
              <p className="text-sm opacity-90">Najpopularniejszy (30 dni)</p>
              <p className="text-lg font-bold leading-tight">{s.top.name}</p>
              <p className="text-sm tabular-nums">{fmt(s.top.views30d)} wyświetleń</p>
            </div>
          </Link>
        ) : (
          <EmptyState title="Brak koktajli" text="Gdy w bazie pojawią się koktajle, najpopularniejszy zobaczysz tutaj." />
        )}

        <section className={panel} aria-labelledby="new-h">
          <h3 id="new-h" className="mb-2 text-lg font-semibold">
            Nowi użytkownicy
          </h3>
          <ul className="divide-y divide-foreground/15">
            {s.newUsers.map((u) => (
              <li key={u.username} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 truncate font-medium">{u.username}</span>
                <span className="text-foreground/65">{shortDate(u.joined)}</span>
                <span className="rounded-full border border-foreground/35 px-2 py-0.5 text-xs">{ROLE_PL[u.role]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
