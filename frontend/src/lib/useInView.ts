import { useEffect, useRef, useState } from "react";

/** Czy element choć raz zbliżył się do widoku (z zapasem), np. żeby pobierać dane rzędu dopiero, gdy ktoś do niego dojedzie. */
export function useInView<T extends Element>(rootMargin = "300px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen] as const;
}
