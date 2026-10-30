"use client";
import { useParams } from "next/navigation";
import RecipeEditor from "@/components/recipe/RecipeEditor";

// Edycja przepisu: ten sam edytor co przy dodawaniu, wypełniony istniejącymi danymi
export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? <RecipeEditor id={n} /> : <RecipeEditor id={-1} />;
}
