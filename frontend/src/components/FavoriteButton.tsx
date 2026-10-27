"use client";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

export default function FavoriteButton({ id, name, className = "" }: { id: number; name: string; className?: string }) {
  const active = useFavorites().includes(id);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={active}
      aria-label={`Ulubione: ${name}`}
      className={`grid size-10 place-items-center rounded-full bg-background/80 text-xl backdrop-blur hover:bg-background ${active ? "text-red-500" : ""} ${className}`}
    >
      <span aria-hidden>{active ? "♥" : "♡"}</span>
    </button>
  );
}
