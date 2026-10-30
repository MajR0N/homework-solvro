import { allowedImage } from "../api";
import type { ActivityEvent, CocktailRef, MyReview, MyStats } from "./types";

// Tłumaczenie odpowiedzi własnego backendu (snake_case) na typy interfejsu (data/types.ts), tak jak adapter w api.ts.
type OwnRef = { id: number; name: string; image_url: string };
type OwnMyReview = { id: number; rating: number; text: string; created_at: string; cocktail: OwnRef };
type OwnActivity = OwnMyReview & { kind: "received" | "given"; author_username: string | null };
type OwnStats = {
  recipes: number;
  views_total: number;
  views_30d: number;
  rating_avg: number | null;
  rating_count: number;
  reviews_written: number;
  views_by_day: { day: string; views: number }[];
};

const refFromOwn = (c: OwnRef): CocktailRef => ({ id: c.id, name: c.name, imageUrl: allowedImage(c.image_url) });

export const reviewFromOwn = (r: OwnMyReview): MyReview => ({ id: r.id, rating: r.rating, text: r.text, createdAt: r.created_at, cocktail: refFromOwn(r.cocktail) });

export const activityFromOwn = (r: OwnActivity): ActivityEvent => ({ ...reviewFromOwn(r), kind: r.kind, author: r.author_username });

export const statsFromOwn = (s: OwnStats): MyStats => ({
  recipes: s.recipes,
  viewsTotal: s.views_total,
  views30d: s.views_30d,
  ratingAvg: s.rating_avg,
  ratingCount: s.rating_count,
  reviewsWritten: s.reviews_written,
  viewsByDay: s.views_by_day,
});
