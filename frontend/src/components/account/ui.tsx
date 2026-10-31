"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";
import type { MyStats } from "@/lib/data/types";

// Małe, wspólne kawałki stron konta. Kolory i kształty z tokenów aplikacji (globals.css).
export const panel = "rounded-xl border border-foreground/20 bg-foreground/5 p-5";
// Na telefonie (poniżej 768 px) przyciski mają co najmniej 44 px wysokości (zasada M15); inline-flex, bo min-height nie działa na zwykłym <a>.
const phoneTap = "max-md:inline-flex max-md:min-h-11 max-md:items-center max-md:justify-center";
export const button = `${phoneTap} rounded-full border border-foreground/30 px-5 py-2 hover:bg-foreground/10 disabled:opacity-40`;
export const primaryButton = `${phoneTap} rounded-full bg-primary px-5 py-2 font-semibold text-on-primary hover:opacity-90 disabled:opacity-50`;
export const dangerButton = `${phoneTap} rounded-full border border-red-500/60 px-4 py-1.5 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-300`;

export function Thumb({ src, className = "size-12" }: { src: string | null; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden rounded-lg bg-foreground/10 ${className}`}>
      {src && <Image src={src} alt="" fill sizes="64px" className="object-cover" />}
    </span>
  );
}

// Stan pusty z podpowiedzią, co zrobić dalej (zamiast pustego miejsca)
export function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-foreground/35 px-4 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="max-w-md text-foreground/75">{text}</p>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-foreground/10 ${className}`} aria-hidden="true" />;
}

// Wyświetlenia dzień po dniu (30 dni na koncie, 7 na pulpicie administratora). Słupki to zwykłe elementy (bez biblioteki wykresów).
export function ViewsChart({ days }: { days: MyStats["viewsByDay"] }) {
  const max = Math.max(...days.map((d) => d.views), 0);
  const total = days.reduce((s, d) => s + d.views, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={total ? `Wykres słupkowy: wyświetlenia z ostatnich ${days.length} dni, razem ${total}, najwięcej ${max} w jednym dniu` : `Brak wyświetleń w ostatnich ${days.length} dniach`}
        className="flex h-24 items-end gap-[3px]"
      >
        {days.map((d) => (
          <span key={d.day} title={`${d.day}: ${d.views}`} className="min-h-[2px] flex-1 rounded-t-sm bg-primary" style={{ height: `${max ? Math.max(2, (d.views / max) * 100) : 2}%` }} />
        ))}
      </div>
      <p className="mt-1 text-xs text-foreground/70">Razem {fmt(total)} z ostatnich {days.length} dni</p>
    </div>
  );
}

// Okno z potwierdzeniem (natywne <dialog>: fokus zostaje w oknie, Esc zamyka). Rodzic renderuje je tylko, gdy trzeba.
export function ConfirmDialog({ title, text, confirmLabel, onConfirm, onClose }: { title: string; text: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-foreground/20 bg-background p-6 text-foreground backdrop:bg-black/55"
    >
      <h2 id="confirm-title" className="text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-foreground/75">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={() => ref.current?.close()} className={button}>
          Anuluj
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            ref.current?.close();
          }}
          className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
