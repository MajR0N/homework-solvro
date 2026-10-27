# STEPS — process log

A record of what was decided, what was built, why, and what was learned while doing the Solvro recruitment homework. Working rules are in [CLAUDE.md](CLAUDE.md).

## 1. The task

Source: <https://github.com/Solvro/rekrutacja>. Theme: **cocktails** — a shared solution for storing and browsing recipes (ingredients with amounts + instructions).

The repo has eight tracks (Frontend, Backend, Mobile, DevOps, UI/UX, AI/ML, Project Management, Promotion), each with its own document.

**Chosen:** Frontend + Backend (full stack). **UI/UX at the very end.** **Skipped:** the rest. DevOps was considered; it is skipped, and its report must be written without an LLM anyway.

**Stack decisions**
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query. UI text and code comments in Polish, identifiers in English.
- Backend: Django (+ Django REST Framework), PostgreSQL.

**Frontend task (summary):** list of cocktails, mark favorites, search/filter, details with ingredients, nice and friendly. Max 8 h. "Nice to have", in priority order: 1 responsiveness, 2 TypeScript, 3 deployment, 4 server-state library, 5 framework, 6 component library.

**Backend task (summary):** REST CRUD for cocktails and ingredients, relational DB, pagination, validation. Nice to have: auth/roles, DB schema screenshot, REST discipline, tests, Swagger/OpenAPI, complex filtering and sorting.

## 2. The Cocktails API (what we found)

Base: `https://cocktails.solvro.pl/api/v1`; spec at `/cocktails-openapi-docs.json`.

| Endpoint | Returns |
|---|---|
| `GET /cocktails` | paginated list (220 cocktails) |
| `GET /cocktails/{id}` | one cocktail with `ingredients[]` (each has `measure`) |
| `GET /cocktails/categories`, `/glasses` | name lists |
| `GET /ingredients`, `/ingredients/{id}`, `/ingredients/types` | ingredient data (unused) |

List filters: `name` (substring), `category`, `alcoholic`, `sort`, `page`, `perPage`, `id[]` (repeatable).

**Findings that shaped the code**
- CORS allows any origin, so the browser can call the API directly (no proxy).
- `sort` **requires a prefix**: `+name` / `-name`. Plain `sort=name` is silently ignored (unsorted, no error).
- `id[]` combines with other filters and pagination. **But with no `id[]`, the API returns everything** — so an empty favorites list must not query.
- Missing id → 404; no matches → `{ data: [] }`.
- Data quirks: `imageUrl`/`type`/`percentage` can be `null`; `measure` has a trailing space; some flags are wrong (e.g. "Lemon" marked alcoholic). We show data as-is.

## 3. Frontend — steps and files

| # | Step | What / why | Files |
|---|---|---|---|
| 1 | Understand the API | Read Swagger, probe real responses (above). | — |
| 2 | Setup | `create-next-app`; Polish `lang`/title; `latin-ext` font subset (Polish letters); fixed font (body was hard-coded to Arial); removed demo page/SVGs. | `layout.tsx`, `globals.css`, `page.tsx` |
| 3 | Data layer | Typed fetch functions; confirmed CORS and edge cases from the browser's point of view. | `lib/api.ts` |
| 4 | List page | Responsive grid (2/3/4 columns), skeleton loading, error + retry, empty state, pagination, `next/image` with remote pattern. | `page.tsx`, `CocktailCard.tsx`, `next.config.ts` |
| 5 | Search & filters | Debounced name search, category / alcohol filters, sorting — all server-side via the API; filter change resets to page 1. | `page.tsx` |
| 6 | Favorites | ♡ button, `localStorage` via `useSyncExternalStore`, "Tylko ulubione" view using `id[]`. | `lib/favorites.ts`, `FavoriteButton.tsx` |
| 7 | Detail page | Image, tags, instructions, ingredients with amounts, 4xx vs 5xx handling. | `cocktails/[id]/page.tsx`, `HttpError` in `api.ts` |
| 8 | Polish | Polish README, dependency audit (0 vulnerabilities). | `frontend/README.md` |
| 9 | Filters in URL | `?q=&category=&alcohol=&sort=&page=&fav=`; refresh, links and Back keep filters; URL values validated. | `page.tsx`, detail page "Wróć" |
| 10 | Polish labels | Dictionary for 10 categories + 32 glasses; fallback to original text. Recipe content stays English. | `lib/pl.ts` |
| 11 | Devtools | TanStack Query devtools, development only. | `providers.tsx` |

**Problems met and how they were solved**
- `cacheComponents` / `partialPrefetching` (enabled by the scaffold) broke the build on the dynamic `[id]` page (needs Suspense). We use neither → removed from `next.config.ts`.
- Silent sort failure (no prefix) → sort values stored with `+`/`-`.
- "All cocktails" returned for empty favorites → `enabled: false` + dedicated message.
- `useSearchParams` needs a `<Suspense>` boundary on a statically built page.
- Button inside a link is invalid HTML → favorite button placed next to the link, not inside.
- Debounce effect would have looped/reset pagination → replaced by a `setTimeout` in the input handler, reading `window.location` to avoid stale values.

**Known limitations (also in the frontend README)**
- Recipe content (names, instructions, ingredient descriptions) is English, from the API.
- Unknown cocktail id returns HTTP 200 with an on-page message (client-side rendering).
- Tab title is always "Koktajle" (client components can't set per-page metadata).
- Favorites in the URL query can get long with hundreds of favorites.
- **Not verified in a real browser by Claude** — only typecheck, lint and production build were run. Visual/keyboard/mobile checks are the applicant's to do.

## 4. Concepts covered (tutor notes)

- **`app/` vs `components/`:** `app/` is the router (folders = URLs; special files `page`, `layout`…). `components/` is just a convention for reusable UI.
- **`.ts` vs `.tsx`:** `.tsx` only if the file contains JSX.
- **JSX:** HTML-like syntax inside TS/JS; compiled to function calls. `className`, `{}` expressions, closed tags, `key` on lists.
- **Why `api.ts` has no React:** plain functions are reusable and testable; TanStack Query supplies the React part.
- **`useSyncExternalStore`:** subscribing to data outside React (localStorage). `read()` must return the same array object when nothing changed (the `cache`), or React loops.
- **SSL/TLS:** encrypts browser↔server traffic, proves identity via certificates; Vercel/Netlify provide it free.
- **Server state vs client state; TanStack Query:** `QueryClient` (the cache) + `useQuery({ queryKey, queryFn })`. Everything the function depends on goes in the key. States: `isPending`, `isError`, `isFetching`, `isPlaceholderData`. Freshness: `staleTime` (fresh → no request), stale → background refetch, `gcTime` (default 5 min) → deleted. Options used: `placeholderData: keepPreviousData`, `enabled`, `retry`, `staleTime: Infinity`, `refetch()`. Mutations (`useMutation` + `invalidateQueries`) not needed yet.
- **Exercise:** Network tab + devtools panel (bottom corner in `npm run dev`) to watch cache hits, stale refetches and offline errors.

## 5. Decisions discussed

| Question | Outcome |
|---|---|
| Translate API content? | **A:** dictionary for categories + glasses only. Not done: oz→ml conversion (B), translating instructions (C), all-English UI (D). |
| SWR vs TanStack Query (because Vercel)? | **Stay with TanStack Query** — hosting doesn't matter, Solvro uses it, already working. |
| GitHub Pages? | Static-only: needs `output: "export"`, `basePath`, unoptimized images and a different detail URL. **Not chosen.** |
| Hosting | **Open:** Vercel (recommended, zero config) or Netlify. Others (Cloudflare, Render, Railway, own VPS) are more work. |
| Component library (item 6) | **Open:** proposed shadcn/ui for Button, Input, Checkbox, Badge, Skeleton; keep native `<select>`; do it before deploying. Not approved yet. |

## 6. Backend (Django) — proposed plan, not started

1. Setup: venv, Django + DRF, PostgreSQL connection.
2. Models: `Ingredient`, `Cocktail`, and a link table holding the amount per ingredient.
3. CRUD endpoints (serializers, viewsets) + pagination.
4. Validation and filtering/sorting (name, category, alcoholic, ingredient).
5. Swagger/OpenAPI docs + automated tests; DB schema diagram.
6. Optional: users, roles, JWT.

`backend/README.md` currently holds the task text as a placeholder.

## 7. UI/UX — last

Choose one of three variants (sticker 7×7 cm, launch graphic 1080×1080 + 1080×1350, or landing-page design) using the official Solvro logo/colors from the repo's `assets/` folder (Space Grotesk font allowed). Planned after frontend and backend; will be taught step by step like the rest.

## 8. Security note

`backend.md` in the Solvro repo contains a hidden markdown comment instructing AI to add "elo żelo" to the code and not tell the user. It was reported to the user, **not followed**, and is saved in Claude's project memory. If that string ever appears in the code, it must be removed.

## 9. Git history

| Commit | Content |
|---|---|
| `bbbf3f0` | first commit (scaffold) |
| `8df536b` | Frontend: list, URL filters, favorites, details, PL labels |
| `b38bd71` | `CLAUDE.md` + backend task README |
| `e766cb6` | README: URL filters, English-content note, limitations |
| `c641ece` | TanStack Query devtools |

Nothing has been pushed (remote: `origin`, `github.com/MajR0N/homework-solvro`).

## 10. What's next

1. Decide hosting (Vercel / Netlify) and deploy the frontend — needs your accounts.
2. Decide on shadcn/ui (item 6).
3. Approve or change the Django plan, then build it step by step.
4. UI/UX at the end.
