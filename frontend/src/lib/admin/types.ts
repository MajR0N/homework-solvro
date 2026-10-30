import type { CocktailRef } from "../data/types";
import type { Role } from "../roles";

// Kształty danych panelu administratora, wspólne dla trybu demo i prawdziwego backendu (/api/v1/admin/...).
export type AdminUser = {
  id: number;
  username: string;
  role: Role;
  joined: string;
  recipes: number;
  reviews: number;
  reports: number; // ile zgłoszeń dotyczy opinii tego konta
  canEdit: boolean; // czy ja mogę zmieniać to konto (tylko niższe od mojego)
  assignableRoles: Role[]; // role, które mogę temu kontu nadać
};

export type ReportedReview = {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  author: string | null;
  cocktail: CocktailRef;
  reportCount: number;
  reports: { reporter: string | null; reason: string }[];
};

export type AdminStats = {
  cocktails: number;
  unverified: number;
  pendingRecipes: number; // przepisy użytkowników bez znaczka: to czeka na decyzję
  withoutImage: number;
  users: number;
  reportedReviews: number;
  views7d: number;
  viewsByDay: { day: string; views: number }[]; // 7 dni od najstarszego
  top: { id: number; name: string; imageUrl: string | null; views30d: number } | null;
  newUsers: { username: string; role: Role; joined: string }[];
};

/** Parametry listy koktajli w panelu (tabela i galeria). */
export type AdminCocktailQuery = {
  search: string;
  verified: "" | "true" | "false";
  hasImage: "" | "false";
  origin: "" | "import" | "users";
  ordering: string; // jak w backendzie: name, -popular, verified (minus = malejąco)
  page: number;
};
