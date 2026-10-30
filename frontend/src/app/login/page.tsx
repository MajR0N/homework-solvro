"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HttpError } from "@/lib/api";
import { useLogin } from "@/lib/auth";
import { ownAvailable } from "@/lib/source";

const field = "mt-1 w-full rounded-full border border-foreground/25 bg-foreground/5 px-4 py-2 hover:bg-foreground/10";

function message(e: unknown): string {
  if (e instanceof HttpError && e.status === 429) return "Za dużo nieudanych prób. Spróbuj ponownie za kilka minut.";
  if (e instanceof HttpError && (e.status === 400 || e.status === 401)) return "Nieprawidłowa nazwa użytkownika lub hasło.";
  return "Nie udało się zalogować. Sprawdź połączenie i spróbuj ponownie.";
}

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(String(data.get("username")).trim(), String(data.get("password")));
      router.push("/");
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <main id="content" className="mx-auto w-full max-w-md p-4">
      <h1 className="mb-2 mt-8 text-3xl font-bold tracking-tight">Logowanie</h1>
      {!ownAvailable ? (
        <p className="text-foreground/70">Logowanie działa tylko z własnym backendem, a ta wersja aplikacji go nie używa.</p>
      ) : (
        <>
          <p className="mb-6 text-foreground/70">Konto w własnym backendzie (nie w API Solvro).</p>
          <form onSubmit={submit} method="post" className="space-y-4">
            <label className="block text-sm font-medium">
              Nazwa użytkownika
              <input name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={field} />
            </label>
            <label className="block text-sm font-medium">
              Hasło
              <input name="password" type="password" required autoComplete="current-password" className={field} />
            </label>
            {error && (
              <p role="alert" className="rounded-xl border border-red-500/40 px-4 py-3 text-sm">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
