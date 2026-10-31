import { useEffect, useState } from "react";

// Pola, w które się pisze (a więc na telefonie otwiera się klawiatura). Pola wyboru i przyciski nie liczą się.
const TEXT_INPUT = /^(text|search|email|url|tel|password|number)$/i;
const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && TEXT_INPUT.test((el as HTMLInputElement).type)) || (el as HTMLElement).isContentEditable);

/**
 * Czy w tej chwili ktoś pisze w polu tekstowym. Dolne paski (nawigacja, zapis) chowają się wtedy, bo na telefonie wisiałyby
 * nad klawiaturą i zasłaniały pole, w które się pisze (zasada M13 z STEPS.md).
 */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const update = () => setTyping(isTyping(document.activeElement));
    const onOut = () => setTimeout(update, 0); // po focusout activeElement bywa jeszcze starym polem
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onOut);
    update();
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}
