"use client";
import { ownAvailable, setSource, type Source, useSource } from "@/lib/source";

// Widoczny tylko wtedy, gdy ustawiono adres własnego backendu (NEXT_PUBLIC_BACKEND_URL)
export default function SourceSwitch() {
  const source = useSource();
  if (!ownAvailable) return null;
  return (
    <label className="block text-sm">
      Źródło danych
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as Source)}
        className="mt-1 block rounded-lg border border-foreground/25 bg-background px-3 py-2"
      >
        <option value="solvro">API Solvro</option>
        <option value="own">Własny backend</option>
      </select>
    </label>
  );
}
