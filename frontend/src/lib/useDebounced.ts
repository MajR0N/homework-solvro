import { useEffect, useState } from "react";

/** Wartość, która nadąża za `value` dopiero po `ms` milisekundach bez zmian (np. żeby nie pytać serwera o każdą literę). */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
