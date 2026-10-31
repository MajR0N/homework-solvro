"use client";
import { HeartIcon, HouseIcon, PlusCircleIcon, UserIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTyping } from "@/lib/useTyping";

// Dolna szklana nawigacja na telefonie (propozycja E): kciuk sięga do wszystkich czterech miejsc, a "Dodaj" ma stałe
// miejsce. Od md (komputer) jej nie ma: tam są przyciski na górnym pasku. Aktywna pozycja to biała pigułka, a stan niesie
// też aria-current, więc nie zależy od samego koloru. Chowa się, gdy ktoś pisze w polu (klawiatura), i omija dolny pas
// bezpieczny telefonu (zasada M13).
const ITEMS = [
  { href: "/", label: "Główna", Icon: HouseIcon, active: (p: string) => p === "/" || p.startsWith("/cocktails") },
  { href: "/account/favorites", label: "Ulubione", Icon: HeartIcon, active: (p: string) => p.startsWith("/account/favorites") },
  { href: "/recipes/new", label: "Dodaj", Icon: PlusCircleIcon, active: (p: string) => p.startsWith("/recipes") },
  { href: "/account", label: "Profil", Icon: UserIcon, active: (p: string) => p.startsWith("/account") && !p.startsWith("/account/favorites") },
];

export default function BottomDock() {
  const pathname = usePathname();
  const typing = useTyping();
  // w edytorze przepisu dolny pasek ma własny pasek zapisu (zasada M7), więc dok nie jest potrzebny
  if (pathname.startsWith("/recipes")) return null;
  return (
    <nav aria-label="Główna nawigacja" className={`glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid-cols-4 gap-1 rounded-full p-1.5 md:hidden ${typing ? "hidden" : "grid"}`}>
      {ITEMS.map(({ href, label, Icon, active }) => {
        const current = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`grid justify-items-center gap-0.5 rounded-full py-1.5 text-xs ${current ? "bg-white font-bold text-[#203560]" : ""}`}
          >
            <Icon size={24} weight={current ? "fill" : "regular"} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
