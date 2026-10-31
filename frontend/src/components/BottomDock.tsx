"use client";
import { GaugeIcon, HeartIcon, HouseIcon, ListBulletsIcon, PlusCircleIcon, ShieldCheckIcon, UserIcon, UsersIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminStats } from "@/lib/admin/hooks";
import { useDockReplaced } from "@/lib/ui/replaceDock";
import { useTyping } from "@/lib/useTyping";

// Dolna szklana nawigacja na telefonie (propozycja E): kciuk sięga do wszystkich czterech miejsc, a "Dodaj" ma stałe
// miejsce. Od md (komputer) jej nie ma: tam są przyciski na górnym pasku. Aktywna pozycja to biała pigułka, a stan niesie
// też aria-current, więc nie zależy od samego koloru. Chowa się, gdy ktoś pisze w polu (klawiatura) albo gdy ekran ma własny
// dolny pasek akcji (useReplaceDock), i omija dolny pas bezpieczny telefonu (zasada M13).
// W panelu administratora (zasada M3) te same cztery miejsca to ekrany panelu.
type Item = { href: string; label: string; Icon: typeof HouseIcon; active: (p: string) => boolean; badge?: number };

const SITE: Item[] = [
  { href: "/", label: "Główna", Icon: HouseIcon, active: (p) => p === "/" || p.startsWith("/cocktails") },
  { href: "/account/favorites", label: "Ulubione", Icon: HeartIcon, active: (p) => p.startsWith("/account/favorites") },
  { href: "/recipes/new", label: "Dodaj", Icon: PlusCircleIcon, active: (p) => p.startsWith("/recipes") },
  { href: "/account", label: "Profil", Icon: UserIcon, active: (p) => p.startsWith("/account") && !p.startsWith("/account/favorites") },
];

const ADMIN: Item[] = [
  { href: "/admin", label: "Pulpit", Icon: GaugeIcon, active: (p) => p === "/admin" },
  { href: "/admin/cocktails", label: "Koktajle", Icon: ListBulletsIcon, active: (p) => p.startsWith("/admin/cocktails") },
  { href: "/admin/moderation", label: "Moderacja", Icon: ShieldCheckIcon, active: (p) => p.startsWith("/admin/moderation") },
  { href: "/admin/users", label: "Konta", Icon: UsersIcon, active: (p) => p.startsWith("/admin/users") },
];

function Dock({ items, label }: { items: Item[]; label: string }) {
  const pathname = usePathname();
  const typing = useTyping();
  const replaced = useDockReplaced();
  return (
    <nav aria-label={label} className={`glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid-cols-4 gap-1 rounded-full p-1.5 md:hidden ${typing || replaced ? "hidden" : "grid"}`}>
      {items.map(({ href, label, Icon, active, badge }) => {
        const current = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`relative grid justify-items-center gap-0.5 rounded-full py-1.5 text-xs ${current ? "bg-white font-bold text-[#203560]" : ""}`}
          >
            <Icon size={24} weight={current ? "fill" : "regular"} aria-hidden="true" />
            {label}
            {badge ? (
              <span className="absolute right-3 top-0.5 rounded-full bg-warm px-1.5 text-xs font-bold text-on-warm" aria-label={`${badge} do zrobienia`}>
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

// Osobny komponent, bo tylko panel pyta o liczbę spraw do zrobienia (znaczek przy Moderacji); reszta strony nie robi tego zapytania.
function AdminDock() {
  const stats = useAdminStats();
  const queue = (stats.data?.reportedReviews ?? 0) + (stats.data?.pendingRecipes ?? 0);
  return <Dock label="Panel administratora" items={ADMIN.map((i) => (i.href === "/admin/moderation" ? { ...i, badge: queue } : i))} />;
}

export default function BottomDock() {
  const pathname = usePathname();
  // w edytorze przepisu dolny pasek ma własny pasek zapisu (zasada M7), więc dok nie jest potrzebny
  if (pathname.startsWith("/recipes")) return null;
  return pathname.startsWith("/admin") ? <AdminDock /> : <Dock label="Główna nawigacja" items={SITE} />;
}
