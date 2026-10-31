"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton, button, primaryButton } from "@/components/account/ui";
import { useAdminAccess, useAdminStats } from "@/lib/admin/hooks";
import { useDemo } from "@/lib/demo/mode";
import { ROLE_PL } from "@/lib/roles";
import { ownAvailable } from "@/lib/source";

// Panel administratora z górnym paskiem nawigacji (wariant "topbar" z design-proposals/admin-topbar.html): szklana pigułka
// z nazwą panelu i czterema ekranami, a pod nią treść. Dostęp: admin, staff i owner. To tylko wygoda interfejsu: o tym, co wolno,
// i tak decyduje backend (401 i 403), a w trybie demo te same reguły odtwarza admin/demo.ts.
const NAV = [
  { href: "/admin", label: "Pulpit" },
  { href: "/admin/cocktails", label: "Koktajle" },
  { href: "/admin/moderation", label: "Moderacja", badge: true },
  { href: "/admin/users", label: "Użytkownicy" },
] as const;

function Gate({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <main id="content" className="mx-auto w-full max-w-md p-4">
      <h1 className="mb-2 mt-8 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-6 text-foreground/75">{text}</p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = useAdminAccess();
  const demo = useDemo();
  const stats = useAdminStats();
  const pathname = usePathname();

  if (access.loading)
    return (
      <main id="content" className="mx-auto w-full max-w-400 p-4" aria-busy="true" aria-label="Ładowanie">
        <Skeleton className="mt-4 h-14" />
      </main>
    );
  if (!access.username)
    return (
      <Gate title="Panel administratora" text={ownAvailable ? "Zaloguj się kontem administratora." : "Panel działa tylko z własnym backendem, ale możesz obejrzeć tryb demo."}>
        {ownAvailable && (
          <Link href="/login" className={primaryButton}>
            Zaloguj się
          </Link>
        )}
        <button type="button" onClick={() => demo.setOn(true)} className={button}>
          Wypróbuj tryb demo
        </button>
      </Gate>
    );
  if (!access.allowed)
    return (
      <Gate title="Brak dostępu" text={access.demo ? "Panel jest dla ról admin, staff i owner. W trybie demo zmień rolę w niebieskim banerze u góry." : "Panel jest tylko dla administratorów (role admin, staff i owner)."}>
        <Link href="/account" className={button}>
          Wróć do konta
        </Link>
      </Gate>
    );

  const queue = (stats.data?.reportedReviews ?? 0) + (stats.data?.pendingRecipes ?? 0);
  return (
    <main id="content" className="mx-auto w-full max-w-400 p-4">
      {/* telefon: napis panelu jest na górnym pasku, a ekrany w dolnej nawigacji (BottomDock), więc ta pigułka jest tylko od 768 px */}
      <h1 className="sr-only md:hidden">Panel administratora</h1>
      <header className="glass mt-2 hidden flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl px-4 py-2 md:flex md:rounded-full md:pr-3">
        <h1 className="text-lg font-bold">Panel administratora</h1>
        <nav aria-label="Panel administratora" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-0.5">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ${active ? "bg-white font-bold text-[#203560]" : "hover:bg-white/15"}`}
              >
                {n.label}
                {"badge" in n && queue > 0 && <span className="rounded-full bg-warm px-1.5 text-xs font-bold text-on-warm" aria-label={`${queue} do zrobienia`}>{queue}</span>}
              </Link>
            );
          })}
        </nav>
        <span className="rounded-full border border-white/55 px-3 py-0.5 text-sm" title={`Zalogowano jako ${access.username}`}>
          {ROLE_PL[access.role]}
        </span>
      </header>
      <div className="mt-4">{children}</div>
    </main>
  );
}
