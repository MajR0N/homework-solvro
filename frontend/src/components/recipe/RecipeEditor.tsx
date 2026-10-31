"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useState } from "react";
import { ConfirmDialog, Skeleton, button, panel, primaryButton } from "@/components/account/ui";
import { useVerify } from "@/lib/admin/hooks";
import { HttpError, allowedImage } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useCategories, useGlasses, useRecipeToEdit, useSaveRecipe } from "@/lib/data/recipe";
import { useDemo } from "@/lib/demo/mode";
import { pl } from "@/lib/pl";
import { clearDraft, draftKey, loadDraft, saveDraft } from "@/lib/recipe/draft";
import { type FormErrors, type IngredientRow, type RecipeForm, LIMITS, emptyForm, fromRecipe, hasErrors, isDirty, isEmpty, newRow, serverErrors, validate } from "@/lib/recipe/form";
import { useLeaveGuard } from "@/lib/recipe/useLeaveGuard";
import { isAdminLevel, rank } from "@/lib/roles";
import { useTyping } from "@/lib/useTyping";
import { ownAvailable, setSource } from "@/lib/source";
import IngredientPicker from "./IngredientPicker";

// Edytor przepisu w układzie strony koktajlu (propozycja C): szklany baner ze zdjęciem i podstawami, dwa panele (składniki,
// przygotowanie) i przyklejony szklany pasek zapisu. Ten sam ekran służy do dodawania i edycji.
// Szkic zapisuje się sam w tej przeglądarce, a przed wyjściem z niezapisanymi zmianami pytamy o potwierdzenie.
// Telefon (poniżej 768 px, zasada M7): trzy zwijane sekcje (Podstawy, Składniki, Przygotowanie; pierwsza otwarta, sekcja z błędem
// otwiera się sama) i jeden dolny pasek zapisu zamiast dolnej nawigacji. Od 768 px wszystko jest rozwinięte jak wcześniej.

const glassInput = "w-full rounded-full border border-white/40 bg-white/10 px-4 py-2 text-white placeholder:text-white/75 max-md:min-h-11";
const panelInput = "w-full rounded-full border border-foreground/35 bg-background px-4 py-2 max-md:min-h-11";
const errText = "mt-1 flex items-center gap-1 text-sm font-semibold text-red-700 dark:text-red-300";

type Sec = "basics" | "ings" | "how";

// Przycisk nagłówka sekcji, tylko na telefonie: tytuł, krótkie podsumowanie, strzałka. "bad" = w sekcji jest błąd (też słowami, nie tylko kolorem).
function FoldToggle({ id, title, note, open, bad, onClick }: { id: string; title: string; note: string; open: boolean; bad: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-controls={id} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left md:hidden">
      <span className="text-lg font-semibold">{title}</span>
      <span className="min-w-0 flex-1 truncate text-right text-sm opacity-80">{bad ? <b className="rounded-full bg-red-700 px-2 py-0.5 text-white opacity-100">Wymaga poprawy</b> : note}</span>
      <CaretDownIcon size={20} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function Gate({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <main id="content" className="mx-auto w-full max-w-md p-4">
      <h1 className="mb-2 mt-8 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-6 text-foreground/75">{text}</p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </main>
  );
}

export default function RecipeEditor({ id }: { id: number | null }) {
  const { session, loading } = useSession();
  const demo = useDemo();
  const recipe = useRecipeToEdit(id);
  // formularz startowy: pusty (z jednym wierszem na składnik) albo wypełniony istniejącym przepisem; tworzony raz na dane
  const initial = useMemo<RecipeForm>(() => (recipe.data ? fromRecipe(recipe.data) : { ...emptyForm(), rows: [newRow()] }), [recipe.data]);

  if (loading)
    return (
      <main id="content" className="mx-auto w-full max-w-5xl p-4" aria-busy="true" aria-label="Ładowanie">
        <Skeleton className="mt-4 h-56" />
      </main>
    );
  if (!session)
    return (
      <Gate title={id == null ? "Dodaj przepis" : "Edytuj przepis"} text={ownAvailable ? "Zaloguj się, żeby dodawać i edytować przepisy." : "Konta działają tylko z własnym backendem, ale możesz obejrzeć tryb demo."}>
        {ownAvailable && (
          <Link href="/login" className={primaryButton}>
            Zaloguj się
          </Link>
        )}
        <button type="button" onClick={() => demo.setOn(true)} className={button}>
          Wypróbuj tryb demo
        </button>
      </Gate>
    );

  if (id != null) {
    if (recipe.error) {
      const gone = recipe.error instanceof HttpError && recipe.error.status < 500;
      return (
        <Gate title={gone ? "Nie znaleziono przepisu" : "Nie udało się pobrać przepisu"} text={gone ? "Ten przepis nie istnieje albo został usunięty." : "Sprawdź połączenie i spróbuj ponownie."}>
          {!gone && (
            <button type="button" onClick={() => recipe.refetch()} className={button}>
              Spróbuj ponownie
            </button>
          )}
          <Link href="/account/recipes" className={button}>
            Wróć do moich przepisów
          </Link>
        </Gate>
      );
    }
    if (!recipe.data)
      return (
        <main id="content" className="mx-auto w-full max-w-5xl p-4" aria-busy="true" aria-label="Ładowanie">
          <Skeleton className="mt-4 h-56" />
        </main>
      );
    // Backend i tak odmówi (403), ale nie pokazujemy formularza, którego nie da się zapisać. Import z Solvro nie ma autora: tylko admin wzwyż.
    const own = recipe.data.authorName === session.username;
    if (!own && rank(session.role) < rank("admin"))
      return (
        <Gate title="Nie możesz edytować tego przepisu" text="Edytować można tylko własne przepisy. Przepisy innych osób i dane z importu zmienia administrator.">
          <Link href={`/cocktails/${id}`} className={button}>
            Zobacz przepis
          </Link>
        </Gate>
      );
  }

  const owner = demo.on ? "demo" : session.username;
  const authorName = id != null && recipe.data?.authorName && recipe.data.authorName !== session.username ? recipe.data.authorName : null;
  // key: po zmianie przepisu albo danych startowych formularz startuje od nowa
  return <EditorForm key={`${owner}:${id}`} id={id} initial={initial} owner={owner} authorName={authorName} demo={demo.on} canVerify={isAdminLevel(session.role)} initialVerified={recipe.data?.verified ?? false} />;
}

function EditorForm({ id, initial, owner, authorName, demo, canVerify, initialVerified }: { id: number | null; initial: RecipeForm; owner: string; authorName: string | null; demo: boolean; canVerify: boolean; initialVerified: boolean }) {
  const router = useRouter();
  const key = draftKey(owner, id);
  const categories = useCategories();
  const glasses = useGlasses();
  // Po utworzeniu przepisu zapamiętujemy jego id: gdyby dalszy krok (znaczek) się nie udał, kolejny zapis zmieni ten przepis,
  // a nie doda drugi taki sam.
  const [createdId, setCreatedId] = useState<number | null>(null);
  const save = useSaveRecipe(id ?? createdId);
  const verify = useVerify();
  const [verified, setVerified] = useState(initialVerified); // tylko dla administratora wzwyż; backend nie przyjmuje znaczka w zwykłym zapisie
  const uid = useId();

  // Szkic z poprzedniej sesji: przywracamy go tylko wtedy, gdy realnie różni się od danych startowych
  const [restored] = useState(() => {
    const d = loadDraft(localStorage, key);
    return d && isDirty(d.form, initial) ? d : null;
  });
  const [form, setForm] = useState<RecipeForm>(() => restored?.form ?? initial);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(restored?.savedAt ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [userOpen, setUserOpen] = useState<Record<Sec, boolean>>({ basics: true, ings: false, how: false });
  const typing = useTyping();

  const dirty = isDirty(form, initial) || (canVerify && verified !== initialVerified);
  const guard = useLeaveGuard(dirty && !saved);
  const clientErrors = useMemo(() => (submitted ? validate(form) : {}), [submitted, form]);
  const errors = hasErrors(clientErrors) ? clientErrors : server;

  // Autozapis szkicu po krótkiej przerwie w pisaniu; brak zmian albo pusty formularz = brak szkicu
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      if (dirty && !isEmpty(form)) {
        saveDraft(localStorage, key, form);
        setDraftSavedAt(new Date().toISOString());
      } else {
        clearDraft(localStorage, key);
        setDraftSavedAt(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, dirty, key, saved]);

  const change = (patch: Partial<RecipeForm>) => {
    setServer({});
    setForm((f) => ({ ...f, ...patch }));
  };
  const patchRow = (rowKey: string, patch: Partial<IngredientRow>) => {
    setServer({});
    setForm((f) => ({ ...f, rows: f.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }));
  };
  const taken = (rowKey: string) => new Set(form.rows.filter((r) => r.key !== rowKey && r.ingredientId != null).map((r) => r.ingredientId as number));

  const focusFirst = (e: FormErrors) => {
    const firstRow = e.row ? form.rows.find((r) => e.row?.[r.key]) : undefined;
    const target = e.name ? `${uid}-name` : e.category ? `${uid}-category` : e.glass ? `${uid}-glass` : e.imageUrl ? `${uid}-image` : firstRow ? `${uid}-ing-${firstRow.key}` : e.instructions ? `${uid}-how` : `${uid}-summary`;
    requestAnimationFrame(() => document.getElementById(target)?.focus());
  };

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    const v = validate(form);
    if (hasErrors(v)) return focusFirst(v);
    try {
      const savedId = await save.mutateAsync(form);
      setCreatedId(savedId);
      // znaczek idzie osobnym, administratorskim wywołaniem i tylko gdy się zmienił
      if (canVerify && verified !== initialVerified) await verify.mutateAsync({ ids: [savedId], verified });
      setSaved(true); // wyłącza ostrzeżenie o wyjściu
      clearDraft(localStorage, key);
      if (!demo) setSource("own"); // strona szczegółów ma pokazać przepis z własnego backendu, nie z API Solvro
      router.push(`/cocktails/${savedId}`);
    } catch (err) {
      const e = err instanceof HttpError ? serverErrors(err.status, err.body) : { general: "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie." };
      if (createdId != null || save.isSuccess) e.general = "Przepis zapisano, ale nie udało się zmienić znaczka. Spróbuj jeszcze raz.";
      setServer(e);
      focusFirst(e);
    }
  }

  const discardDraft = () => {
    clearDraft(localStorage, key);
    setDraftSavedAt(null);
    setForm(initial);
    setSubmitted(false);
    setServer({});
  };

  const preview = allowedImage(form.imageUrl.trim());
  const foreignImage = !preview && !errors.imageUrl && form.imageUrl.trim() !== "";
  const err = (text?: string, fid?: string) =>
    text ? (
      <p id={fid} className={errText}>
        {text}
      </p>
    ) : null;
  const summary = errors.general ?? (hasErrors(errors) ? "Popraw zaznaczone pola i spróbuj ponownie." : null);
  // sekcja z błędem jest zawsze otwarta (też gdy ktoś ją zwinął), żeby błąd i pole były widoczne
  const secError: Record<Sec, boolean> = {
    basics: !!(errors.name || errors.category || errors.glass || errors.imageUrl),
    ings: !!errors.rows || Object.keys(errors.row ?? {}).length > 0,
    how: !!errors.instructions,
  };
  const isOpen = (k: Sec) => userOpen[k] || secError[k];
  const toggle = (k: Sec) => setUserOpen((o) => ({ ...o, [k]: !isOpen(k) }));
  const hidden = (k: Sec) => (isOpen(k) ? "" : "max-md:hidden");
  const named = form.rows.filter((r) => r.name.trim()).length;

  return (
    <main id="content" className="mx-auto w-full max-w-5xl p-4">
      <nav aria-label="Ścieżka" className="mt-2 text-sm text-foreground/70">
        <Link href="/account/recipes" className="inline-flex underline underline-offset-4 hover:text-primary max-md:min-h-11 max-md:items-center">
          Moje przepisy
        </Link>{" "}
        / {id == null ? "Nowy przepis" : "Edycja"}
      </nav>
      <h1 className="mb-3 mt-1 text-2xl font-bold tracking-tight md:mb-4 md:text-3xl">{id == null ? "Dodaj przepis" : "Edytuj przepis"}</h1>

      {restored && draftSavedAt && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-sm">
          <span className="flex-1">Przywrócono szkic z {new Date(restored.savedAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}.</span>
          <button type="button" onClick={discardDraft} className="underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            Odrzuć szkic
          </button>
        </p>
      )}
      {authorName && <p className="mb-4 text-sm text-foreground/75">Autor przepisu: <strong>{authorName}</strong> (edytujesz jako administrator).</p>}

      <form onSubmit={submit} noValidate>
        {summary && (
          <p id={`${uid}-summary`} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-semibold">
            {summary}
          </p>
        )}

        <section aria-label="Podstawowe informacje" className="glass rounded-3xl p-1.5 md:p-5">
          <FoldToggle id={`${uid}-basics`} title="Podstawy" note={form.name.trim() || "Bez nazwy"} open={isOpen("basics")} bad={secError.basics} onClick={() => toggle("basics")} />
          <div id={`${uid}-basics`} className={`grid gap-5 max-md:p-2 md:grid-cols-[17rem_minmax(0,1fr)] ${hidden("basics")}`}>
          <div className="relative grid min-h-48 content-center justify-items-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-white/60 p-3 text-center md:min-h-full">
            {preview ? (
              <Image src={preview} alt="Podgląd zdjęcia przepisu" fill sizes="272px" className="rounded-2xl object-cover" />
            ) : (
              <>
                <b>Zdjęcie</b>
                <span className="text-sm text-white/85">{foreignImage ? "Podgląd i zdjęcie w aplikacji działają tylko dla adresów z cocktails.solvro.pl." : "Wklej adres zdjęcia obok."}</span>
              </>
            )}
          </div>

          <div className="grid content-start gap-4">
            <div>
              <label htmlFor={`${uid}-name`} className="mb-1 block text-sm font-semibold">
                Nazwa (wymagana)
              </label>
              <input
                id={`${uid}-name`}
                value={form.name}
                maxLength={LIMITS.name}
                aria-invalid={!!errors.name || undefined}
                aria-describedby={errors.name ? `${uid}-name-e` : undefined}
                onChange={(e) => change({ name: e.target.value })}
                className={`${glassInput} text-2xl font-bold tracking-tight`}
              />
              {err(errors.name, `${uid}-name-e`)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-category`} className="mb-1 block text-sm font-semibold">
                  Kategoria (wymagana)
                </label>
                <select
                  id={`${uid}-category`}
                  value={form.category}
                  aria-invalid={!!errors.category || undefined}
                  aria-describedby={errors.category ? `${uid}-category-e` : undefined}
                  onChange={(e) => change({ category: e.target.value })}
                  className={`select ${glassInput} [&>option]:bg-background [&>option]:text-foreground`}
                >
                  <option value="">Wybierz kategorię</option>
                  {categories.data?.map((c) => (
                    <option key={c} value={c}>
                      {pl(c)}
                    </option>
                  ))}
                </select>
                {err(errors.category, `${uid}-category-e`)}
                {categories.isError && <p className={errText}>Nie udało się pobrać kategorii. Odśwież stronę.</p>}
              </div>
              <div>
                <label htmlFor={`${uid}-glass`} className="mb-1 block text-sm font-semibold">
                  Rodzaj szklanki
                </label>
                <input id={`${uid}-glass`} list={`${uid}-glasses`} value={form.glass} maxLength={LIMITS.glass} onChange={(e) => change({ glass: e.target.value })} className={glassInput} />
                <datalist id={`${uid}-glasses`}>
                  {glasses.data?.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                {err(errors.glass)}
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-image`} className="mb-1 block text-sm font-semibold">
                Adres zdjęcia (https)
              </label>
              <input
                id={`${uid}-image`}
                type="url"
                inputMode="url"
                value={form.imageUrl}
                placeholder="https://cocktails.solvro.pl/images/cocktails/..."
                aria-invalid={!!errors.imageUrl || undefined}
                aria-describedby={errors.imageUrl ? `${uid}-image-e` : `${uid}-image-h`}
                onChange={(e) => change({ imageUrl: e.target.value })}
                className={glassInput}
              />
              {errors.imageUrl ? err(errors.imageUrl, `${uid}-image-e`) : <p id={`${uid}-image-h`} className="mt-1 text-sm text-white/85">Może być pusty, zdjęcie dodasz później.</p>}
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium max-md:min-h-11 max-md:text-base">
              <input type="checkbox" checked={form.alcoholic} onChange={(e) => change({ alcoholic: e.target.checked })} className="size-4 accent-[#80b3ff] max-md:size-6" />
              Zawiera alkohol
            </label>
            {canVerify && (
              <label className="flex items-center gap-2.5 text-sm font-medium max-md:min-h-11 max-md:text-base">
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="size-4 accent-[#80b3ff] max-md:size-6" />
                Znaczek „zweryfikowany” (tylko administrator)
              </label>
            )}
          </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 md:mt-6 md:gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <section className={`${panel} max-md:p-1.5`} aria-labelledby={`${uid}-ings`}>
            <FoldToggle id={`${uid}-ings-body`} title="Składniki" note={`${named}`} open={isOpen("ings")} bad={secError.ings} onClick={() => toggle("ings")} />
            <h2 id={`${uid}-ings`} className="mb-3 text-xl font-semibold max-md:sr-only">
              Składniki
            </h2>
            <div id={`${uid}-ings-body`} className={`max-md:p-2 ${hidden("ings")}`}>
            <ul className="grid gap-3">
              {form.rows.map((r, i) => {
                const e = errors.row?.[r.key];
                return (
                  <li key={r.key}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 md:grid-cols-[minmax(0,1fr)_10rem_auto]">
                      <IngredientPicker id={`${uid}-ing-${r.key}`} row={r} taken={taken(r.key)} invalid={!!e} describedBy={e ? `${uid}-ing-${r.key}-e` : undefined} onChange={(p) => patchRow(r.key, p)} />
                      <input aria-label={`Miara składnika ${i + 1}`} placeholder="Miara, np. 50 ml" maxLength={LIMITS.measure} value={r.measure} onChange={(ev) => patchRow(r.key, { measure: ev.target.value })} className={panelInput} />
                      <button
                        type="button"
                        aria-label={`Usuń składnik ${r.name || i + 1}`}
                        onClick={() => setForm((f) => ({ ...f, rows: f.rows.filter((x) => x.key !== r.key) }))}
                        className="grid size-11 place-items-center rounded-full border border-foreground/30 hover:bg-foreground/10 max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:self-center md:size-10"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    {err(e, `${uid}-ing-${r.key}-e`)}
                  </li>
                );
              })}
            </ul>
            {err(errors.rows)}
            {form.rows.length === 0 && <p className="text-foreground/70">Nie dodano jeszcze składników.</p>}
            <button type="button" onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, newRow()] }))} disabled={form.rows.length >= LIMITS.rows} className={`${button} mt-4`}>
              + Dodaj składnik
            </button>
            <p className="mt-3 text-sm text-foreground/70">Wybierz składnik z podpowiedzi albo dodaj nowy. Każdy składnik tylko raz; miara to dowolny tekst.</p>
            </div>
          </section>

          <section className={`${panel} max-md:p-1.5`} aria-labelledby={`${uid}-how-h`}>
            <FoldToggle id={`${uid}-how-body`} title="Przygotowanie" note={form.instructions.trim() ? `${form.instructions.length} znaków` : "puste"} open={isOpen("how")} bad={secError.how} onClick={() => toggle("how")} />
            <h2 id={`${uid}-how-h`} className="mb-3 text-xl font-semibold max-md:sr-only">
              Przygotowanie
            </h2>
            <div id={`${uid}-how-body`} className={`max-md:p-2 ${hidden("how")}`}>
            <label htmlFor={`${uid}-how`} className="sr-only">
              Instrukcja
            </label>
            <textarea
              id={`${uid}-how`}
              value={form.instructions}
              maxLength={LIMITS.instructions}
              rows={10}
              aria-invalid={!!errors.instructions || undefined}
              placeholder="Opisz krok po kroku, jak przygotować drink."
              onChange={(e) => change({ instructions: e.target.value })}
              className="w-full rounded-2xl border border-foreground/35 bg-background px-4 py-3 leading-relaxed"
            />
            {err(errors.instructions)}
            <p className="mt-1 text-right text-xs text-foreground/60">
              {form.instructions.length} / {LIMITS.instructions}
            </p>
            </div>
          </section>
        </div>

        {/* telefon: jedyny dolny pasek (bez nawigacji), nad dolnym pasem bezpiecznym, chowa się, gdy ktoś pisze (klawiatura) */}
        <div className={`glass sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mt-3 flex items-center gap-x-3 rounded-full px-4 py-1.5 md:bottom-3 md:mt-6 md:gap-x-4 md:py-3 ${typing ? "max-md:hidden" : ""}`}>
          <p className="min-w-0 flex-1 text-xs leading-tight md:text-sm" aria-live="polite">
            <span className="md:hidden">{dirty ? "Niezapisane zmiany" : "Brak zmian"}</span>
            <span className="max-md:hidden">
              {dirty ? (draftSavedAt ? "Niezapisane zmiany. Szkic jest zapisany w tej przeglądarce." : "Niezapisane zmiany.") : "Brak zmian."}
              <span className="hidden sm:inline"> Znaczek „zweryfikowany” nadaje administrator.</span>
            </span>
          </p>
          <button type="button" onClick={() => (dirty ? setConfirmCancel(true) : router.push("/account/recipes"))} className="rounded-full border border-white/55 px-5 py-2 hover:bg-white/15 max-md:min-h-11">
            Anuluj
          </button>
          <button type="submit" disabled={save.isPending || verify.isPending} className="rounded-full bg-white px-5 py-2 font-bold text-[#203560] hover:opacity-90 disabled:opacity-60 max-md:min-h-11">
            {save.isPending || verify.isPending ? "Zapisywanie…" : id == null && createdId == null ? "Opublikuj" : "Zapisz zmiany"}
          </button>
        </div>
      </form>

      {guard.pending && (
        <ConfirmDialog
          title="Wyjść bez zapisywania?"
          text="Masz niezapisane zmiany. Szkic zostaje w tej przeglądarce, więc wrócisz do niego, gdy znów otworzysz edytor."
          confirmLabel="Wyjdź"
          onClose={guard.stay}
          onConfirm={() => {
            saveDraft(localStorage, key, form); // ostatnie znaki sprzed 400 ms też trafiają do szkicu
            guard.leave();
          }}
        />
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Odrzucić zmiany?"
          text="Wszystko, co wpisano w tym formularzu, zostanie utracone razem ze szkicem."
          confirmLabel="Odrzuć zmiany"
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            clearDraft(localStorage, key);
            setSaved(true); // formularz jest odrzucony, więc ostrzeżenie o wyjściu nie ma już sensu
            router.push("/account/recipes");
          }}
        />
      )}
    </main>
  );
}
