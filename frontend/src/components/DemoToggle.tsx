"use client";
import { useDemo } from "@/lib/demo/mode";

// Przycisk na szklanym pasku. Włączony = biała pigułka (jak aktywne elementy menu), wyłączony = zwykły obrys.
export default function DemoToggle({ className = "" }: { className?: string }) {
  const demo = useDemo();
  return (
    <button
      type="button"
      onClick={() => demo.setOn(!demo.on)}
      aria-pressed={demo.on}
      className={`rounded-full border px-4 py-2 text-sm ${demo.on ? "border-transparent bg-white font-semibold text-[#203560]" : "border-current/35"} ${className}`}
    >
      Tryb demo
    </button>
  );
}
