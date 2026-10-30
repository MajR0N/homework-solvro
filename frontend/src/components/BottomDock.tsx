"use client";
import { HeartIcon, HouseIcon, PlusCircleIcon, UserIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Dolna szklana nawigacja na telefonie (propozycja E): kciuk sięga do wszystkich czterech miejsc, a "Dodaj" ma stałe
// miejsce. Od md (komputer) jej nie ma: tam są przyciski na górnym pasku. Aktywna pozycja to biała pigułka, a stan niesie
// też aria-current, więc nie zależy od samego koloru.
const ITEMS = [
  { href: "/", label: "Główna", Icon: HouseIcon, active: (p: string) => p === "/" || p.startsWith("/cocktails") },
  { href: "/account/favorites", label: "Ulubione", Icon: HeartIcon, active: (p: string) => p.startsWith("/account/favorites") },
  { href: "/recipes/new", label: "Dodaj", Icon: PlusCircleIcon, active: (p: string) => p.startsWith("/recipes") },
  { href: "/account", label: "Profil", Icon: UserIcon, active: (p: string) => p.startsWith("/account") && !p.startsWith("/account/favorites") },
];

export default function BottomDock() {
  const pathname = usePathname();
  return (
    <nav aria-label="Główna nawigacja" className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-full p-1.5 md:hidden">
      {ITEMS.map(({ href, label, Icon, active }) => {
        const current = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`grid justify-items-center gap-0.5 rounded-full py-1.5 text-[0.6875rem] ${current ? "bg-white font-bold text-[#203560]" : ""}`}
          >
            <Icon size={24} weight={current ? "fill" : "regular"} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
