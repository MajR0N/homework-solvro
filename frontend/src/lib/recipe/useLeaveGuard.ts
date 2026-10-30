import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Ostrzeżenie przed wyjściem z niezapisanego formularza. Next.js nie ma wbudowanego "czy na pewno?" dla przejść w aplikacji, więc:
 * - zamknięcie lub odświeżenie karty łapie `beforeunload` (przeglądarka pokazuje własne okno),
 * - kliknięcie w link do innej strony naszej aplikacji przechwytujemy w fazie przechwytywania (zanim zobaczy je Link z Next.js)
 *   i zamiast przejścia pokazujemy własne okno (`pending` to adres, dokąd użytkownik chciał pójść).
 * Czego to NIE łapie: przycisku "wstecz" przeglądarki i przejść wywołanych kodem (router.push). Przed utratą pracy chroni wtedy szkic.
 */
export function useLeaveGuard(active: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname + url.search === location.pathname + location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);

  return {
    pending,
    stay: () => setPending(null),
    leave: () => {
      const href = pending;
      setPending(null);
      if (href) router.push(href);
    },
  };
}
