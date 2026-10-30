import Link from "next/link";

// Zaślepka: tu będzie edytor przepisu (koncepcja C z design-proposals/recipe.html). Jest, żeby linki "Dodaj przepis"
// z konta i z dolnej nawigacji nie prowadziły w 404, dopóki edytor nie powstanie (faza 2).
export default function NewRecipePage() {
  return (
    <main id="content" className="mx-auto w-full max-w-md p-4">
      <h1 className="mb-2 mt-8 text-3xl font-bold tracking-tight">Dodaj przepis</h1>
      <p className="mb-6 text-foreground/75">Edytor przepisu jest w przygotowaniu. Wkrótce dodasz tu własny koktajl: nazwę, zdjęcie, składniki i instrukcję.</p>
      <Link href="/account" className="rounded-full border border-foreground/30 px-5 py-2 hover:bg-foreground/10">
        Wróć do konta
      </Link>
    </main>
  );
}
