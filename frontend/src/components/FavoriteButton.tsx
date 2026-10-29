"use client";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

export default function FavoriteButton({ id, name, className = "" }: { id: number; name: string; className?: string }) {
  const active = useFavorites().includes(id);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={active}
      aria-label={`Ulubione: ${name}`}
      className={`grid size-10 place-items-center rounded-full bg-background/85 backdrop-blur hover:bg-background ${active ? "text-warm" : "text-foreground"} ${className}`}
    >
      {/* ikona SVG (nie znak tekstowy), a stan jest też w aria-pressed, więc nie zależy od samego koloru */}
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d={HEART} />
      </svg>
    </button>
  );
}
