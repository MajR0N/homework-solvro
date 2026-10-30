import { allowedImage } from "../api";
import { type Role, isRole } from "../roles";
import type { AdminStats, AdminUser, ReportedReview } from "./types";

// Odpowiedzi API panelu (snake_case) na typy interfejsu (camelCase). Nieznana rola z backendu nie psuje strony: trafia jako "user".
const role = (r: string): Role => (isRole(r) ? r : "user");

export type OwnAdminUser = {
  id: number; username: string; role: string; date_joined: string;
  recipes: number; reviews: number; reports: number; can_edit: boolean; assignable_roles: string[];
};
export type OwnReported = {
  id: number; rating: number; text: string; created_at: string; author_username: string | null;
  cocktail: { id: number; name: string; image_url: string }; report_count: number; reports: { reporter: string | null; reason: string }[];
};
export type OwnAdminStats = {
  cocktails: number; unverified: number; pending_recipes: number; without_image: number; users: number; reported_reviews: number; views_7d: number;
  views_by_day: { day: string; views: number }[];
  top_cocktail: { id: number; name: string; image_url: string; views_30d: number } | null;
  new_users: { username: string; role: string; date_joined: string }[];
};

export const userFromAdmin = (u: OwnAdminUser): AdminUser => ({
  id: u.id, username: u.username, role: role(u.role), joined: u.date_joined, recipes: u.recipes, reviews: u.reviews, reports: u.reports,
  canEdit: u.can_edit, assignableRoles: u.assignable_roles.filter(isRole),
});

export const reportedFromAdmin = (r: OwnReported): ReportedReview => ({
  id: r.id, rating: r.rating, text: r.text, createdAt: r.created_at, author: r.author_username,
  cocktail: { id: r.cocktail.id, name: r.cocktail.name, imageUrl: allowedImage(r.cocktail.image_url) },
  reportCount: r.report_count, reports: r.reports.map((x) => ({ reporter: x.reporter, reason: x.reason })),
});

export const statsFromAdmin = (s: OwnAdminStats): AdminStats => ({
  cocktails: s.cocktails, unverified: s.unverified, pendingRecipes: s.pending_recipes, withoutImage: s.without_image, users: s.users,
  reportedReviews: s.reported_reviews, views7d: s.views_7d, viewsByDay: s.views_by_day,
  top: s.top_cocktail && { id: s.top_cocktail.id, name: s.top_cocktail.name, imageUrl: allowedImage(s.top_cocktail.image_url), views30d: s.top_cocktail.views_30d },
  newUsers: s.new_users.map((u) => ({ username: u.username, role: role(u.role), joined: u.date_joined })),
});
