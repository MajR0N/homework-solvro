"use client";
import { CaretDownIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useLogout, useSession } from "@/lib/auth";
import { ROLE_PL, isAdminLevel, isRole } from "@/lib/roles";

// Rozwijane menu profilu na komputerze (zasada M4). Przycisk z nazwą i strzałką otwiera listę: konto, przepisy, ulubione,
// opinie, ustawienia, panel administratora (tylko role administracyjne) i wylogowanie (w demo: wyłączenie demo).
// Zachowuje się jak standardowy "menu button": Enter, spacja i strzałka w dół otwierają, strzałki i Home/End poruszają się
// po pozycjach, Esc zamyka i oddaje fokus przyciskowi, kliknięcie poza menu zamyka.
export default function ProfileMenu() {
  const { session, demo } = useSession();
  const logout = useLogout();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () => [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const focusItem = (i: number) => {
    const list = items();
    list[(i + list.length) % list.length]?.focus();
  };
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) root.current?.querySelector<HTMLElement>("button[aria-haspopup]")?.focus();
  };

  // po otwarciu fokus na pierwszej pozycji; kliknięcie poza menu zamyka
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); // menu jest już w DOM, więc bez czekania na klatkę
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!session) return null;
  const links: [string, string][] = [
    ["/account", "Moje konto"],
    ["/account/recipes", "Moje przepisy"],
    ["/account/favorites", "Ulubione"],
    ["/account/reviews", "Moje opinie"],
    ["/account/settings", "Ustawienia"],
  ];
  if (isAdminLevel(session.role)) links.push(["/admin", "Panel administratora"]);
  const item = "block w-full rounded-xl px-3 py-2 text-left hover:bg-white/15 focus-visible:bg-white/15";

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (!open) return;
        const at = items().indexOf(document.activeElement as HTMLElement);
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          focusItem(at + 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusItem(at - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusItem(0);
        } else if (e.key === "End") {
          e.preventDefault();
          focusItem(-1);
        } else if (e.key === "Tab") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        title={`${session.username} (${session.role})`}
        className={`inline-flex max-w-48 items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${open || pathname.startsWith("/account") ? "border-transparent bg-white font-semibold text-[#203560]" : "border-current/35"}`}
      >
        <span className="truncate">{session.username}</span>
        <CaretDownIcon size={14} weight="bold" aria-hidden="true" className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        // pełny kolor szkła zamiast rozmycia: menu leży wewnątrz szklanego paska, a rozmycie w rozmyciu nie działa
        <div id={menuId} role="menu" aria-label="Menu profilu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-white/25 bg-(--glass-solid) p-2 text-white shadow-xl">
          <div className="px-3 pb-2 pt-1" role="none">
            <p className="truncate font-semibold">{session.username}</p>
            <p className="text-sm text-white/80">{demo ? "Tryb demo, " : ""}{isRole(session.role) ? ROLE_PL[session.role] : session.role}</p>
          </div>
          <div className="border-t border-white/20 py-1" role="none">
            {links.map(([href, label]) => (
              <Link key={href} href={href} role="menuitem" tabIndex={-1} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={`${item} ${pathname === href ? "bg-white/15 font-semibold" : ""}`}>
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t border-white/20 pt-1" role="none">
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setOpen(false); logout(); }} className={item}>
              {demo ? "Wyłącz tryb demo" : "Wyloguj"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
