"use client";
import { ownAvailable, setSource, type Source, useSource } from "@/lib/source";

// Widoczny tylko wtedy, gdy ustawiono adres własnego backendu (NEXT_PUBLIC_BACKEND_URL).
// compact = wersja na szklany pasek: etykieta tylko dla czytników ekranu, kolory dziedziczone ze szkła.
export default function SourceSwitch({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const source = useSource();
  if (!ownAvailable) return null;
  return (
    <label className={`block text-sm ${className}`}>
      <span className={compact ? "sr-only" : ""}>Źródło danych</span>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as Source)}
        className={
          compact
            ? "select rounded-full border border-current/35 bg-current/10 py-2 pl-4 text-sm [&>option]:bg-background [&>option]:text-foreground"
            : "select mt-1 block rounded-full border border-foreground/25 bg-background py-2 pl-4"
        }
      >
        <option value="solvro">API Solvro</option>
        <option value="own">Własny backend</option>
      </select>
    </label>
  );
}
