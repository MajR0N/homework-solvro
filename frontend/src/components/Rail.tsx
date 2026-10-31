"use client";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Children, useEffect, useId, useRef, useState } from "react";

// Poziomy rząd kart ("rail", decyzja U1): przewija się palcem (telefon) albo strzałkami (od 768 px), a karty przyciągają się
// do krawędzi (scroll-snap). Strzałka znika, gdy nie ma dokąd przewijać, więc przy kilku kartach nie ma pustych przycisków.
// Wspólny dla "Na topie" i (w kolejnych krokach) rzędów tematycznych. Wjazd z lekkim zanikaniem wyłącza reguła ograniczonych animacji.
export default function Rail({ title, note, href, linkLabel, children }: { title: string; note?: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  const headingId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  // Czy jest co przewijać w lewo i w prawo. Obserwator wywołuje się też przy starcie i przy zmianie rozmiaru, a scroll przy każdym ruchu.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft < 4;
      const end = el.scrollLeft + el.clientWidth > el.scrollWidth - 4;
      setEdge((e) => (e.start === start && e.end === end ? e : { start, end })); // bez zmiany nie ma ponownego renderu
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [children]);

  // Strzałka przewija o prawie cały widok; przy ograniczonych animacjach bez płynnego przewijania
  const go = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: smooth ? "smooth" : "auto" });
  };
  const arrow = "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-foreground/25 bg-background/95 shadow-md hover:bg-background md:grid";

  return (
    <section aria-labelledby={headingId} className="rail-in mb-8">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 md:mb-4">
        <h2 id={headingId} className="text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h2>
        {note && <p className="text-foreground/75">{note}</p>}
        {href && (
          <Link href={href} className="ml-auto inline-flex text-sm underline underline-offset-4 hover:text-primary max-md:min-h-11 max-md:items-center">
            {linkLabel ?? "Zobacz wszystkie"}
          </Link>
        )}
      </div>
      <div className="relative">
        <ul
          ref={list}
          tabIndex={0}
          aria-label={`${title}, przewiń w bok`}
          className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:scroll-pl-0 md:gap-4 md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {Children.map(children, (child) => (
            <li className="w-[58%] shrink-0 snap-start sm:w-[42%] md:w-56 xl:w-64">{child}</li>
          ))}
        </ul>
        {!edge.start && (
          <button type="button" onClick={() => go(-1)} aria-label={`${title}: przewiń w lewo`} className={`${arrow} left-2`}>
            <CaretLeftIcon size={22} aria-hidden="true" />
          </button>
        )}
        {!edge.end && (
          <button type="button" onClick={() => go(1)} aria-label={`${title}: przewiń w prawo`} className={`${arrow} right-2`}>
            <CaretRightIcon size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
