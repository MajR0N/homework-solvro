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
| Frontend hosting | **Vercel** (decided in grilling, D20). Netlify and others rejected. |
| Component library (item 6) | **shadcn/ui everywhere** (decided in grilling, D16). Not built yet. |

## 6. Backend (Django) — not started

The design is decided in the grilling session; see section 11. `backend/README.md` currently holds the task text as a placeholder.

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

See section 11 (decisions) and section 12 (order of work).

## 11. Grilling results — decisions D1–D26

A question-by-question interview (one question at a time, each with a recommendation) held on 27 October 2026. "Rec." = what Claude recommended; the user's choice is what counts.

### Architecture
| # | Question | Decision | Notes |
|---|---|---|---|
| D1 | How are frontend and backend connected? | **Switchable frontend**: Solvro API or own Django API, all in one repo | Rec. was "independent"; user chose switchable and will explain it in a Markdown file. |
| D2 | Whose API contract? | **Idiomatic Django** (DRF pagination, `django-filter`, `ordering`) + an **adapter in the frontend** `api.ts` | Detail response still returns `ingredients[]` with `measure`. |
| D8 | How is the source chosen? | **Runtime switch in the UI**, remembered in `localStorage`, **Solvro is the default** | `source` goes into every `queryKey`. Write features only appear on the own-backend source. |
| D18 | How does the browser reach Django? | **Two paths (BFF):** public reads go **directly** to Django; anything that needs a token goes through the Next.js server | User's reasons: cleaner, easier to debug. Needs CORS allowlist on Django (frontend origins only, no cookies). Django must still refuse unauthenticated writes itself. |
| D19 | "My" data (my review, my cocktails) | **Private endpoints** through the secure path (`/me`, "my review", `cocktails?mine=true`); Django decides "mine" from the token | Clean rule: public data direct, token data via Next.js. |
| D20 | Frontend hosting | **Vercel** | Server calls to Django get a timeout and a friendly message (backend may be waking up). |
| D13 | Where do Django + Postgres run? | **Google Cloud Run + Neon (Postgres)** | Free tiers confirmed by the user from AI-overview screenshots; **verify on the official pages**. Cloud Run's attached service account avoids a stored key file. |
| D7 | Is the backend deployed? | **Yes**, part of the main plan | Needs production settings, secrets in env vars, gunicorn, static files. |

### Data model
| # | Question | Decision |
|---|---|---|
| D3 | Amount of an ingredient | **Free text** `measure` on the link table. The **frontend converts units** (oz→ml); unparseable amounts stay unchanged. |
| D4 | Seed data | **Import all Solvro data keeping Solvro ids as primary keys**; idempotent command; reset the id sequence afterwards. Favorites then work on both sources. |
| D9 | Category and glass | **Category is its own table (FK); glass is a plain text field.** Plus indexes: FKs (automatic), B-tree on `Cocktail.name`, `glass`, `Ingredient.name`, unique `(cocktail, ingredient)`, index on `CocktailIngredient.ingredient`. |
| D10 | Fast name search | **Trigram GIN index** (`pg_trgm`) on `Upper(name)`, because Django's `icontains` is `UPPER(name) LIKE …`. Show `EXPLAIN ANALYZE` in the README; at 220 rows it is a demonstration, not a measurable speedup (Postgres may still choose a sequential scan). |
| D14 | Reviews | **One per user per cocktail** (`UniqueConstraint`), rating 1–5 (`CheckConstraint`), optional text. Author can edit/delete own review; admin can delete any. Average rating via `annotate`. |
| D21 | Ingredient permissions | Any logged-in user can create; **author or admin** edits/deletes; imported ones are admin-only; **deleting an ingredient that is in use is refused** (`PROTECT`). |
| D22 | Author label | Every cocktail/review shows its creator (**username only, never email**) linking to a **profile page**; imported ones show "Import z Solvro API". |
| D23 | User deleted | **Really delete the user**; content keeps copies written at creation: `author_user_id` (a number) and `author_name`. Profile URL uses the **number**, never the name (a freed name could be taken by someone else). For a deleted number Django answers "name + account unavailable" from the saved copies. Gain: email and password hash are truly erased. Limit: old username stays public on content. |

### Security
| # | Question | Decision |
|---|---|---|
| D5 | Auth scope | **Full:** JWT (`djangorestframework-simplejwt`), User/Admin roles, author-based permissions, reviews. User's reason: JWT is popular and worth learning. |
| D24 | Token lifetimes | **Access ≈ 10 min, refresh ≈ 7 days with rotation + blacklist**; logout blacklists the refresh token; the secure path refreshes only once when several requests expire together. Numbers live in settings. |
| — | Why not `localStorage` | Any XSS can steal tokens there. Tokens live in **`HttpOnly` cookies set by the Next.js server (BFF)**; `HttpOnly` stops theft but not an attacker acting while the page is open, so XSS is still avoided (React escaping, no `dangerouslySetInnerHTML`, CSP). Cookies need `SameSite` + `Origin` checks against CSRF. |
| D11 | Ingredient image | **File upload to Google Cloud Storage** (free tier; needs a billing account; set a budget alert). |
| D12 | Upload path | **Direct signed-URL upload** (browser → bucket). Signed URL restricts content type and size; Django **confirms** the object (exists, real size, opens as an image, else deletes); unconfirmed uploads expire via a bucket lifecycle rule; bucket CORS allows `PUT` from the frontend origin; random UUID filenames. |

### Frontend
| # | Question | Decision |
|---|---|---|
| D6 | Frontend UI for new features | **Full UI:** login, register, add/edit cocktail (with ingredient rows), reviews, upload, profile pages. Reason: the task allows any extra features. |
| D16 | Component library | **shadcn/ui everywhere**, first as a small restyle commit of the existing pages. Check Tailwind v4 / Next 16 compatibility on the first install. |
| D17 | Forms | **`react-hook-form` + `zod`**; Django remains the source of truth, field errors are mapped back onto the form. |
| — | Server state | Stay with TanStack Query (not SWR). |

### Testing and process
| # | Question | Decision |
|---|---|---|
| D15 | Backend tests | **`pytest` + `pytest-django`** on real PostgreSQL. First: permission matrix, review constraints, filter/pagination validation, import idempotency, upload confirm rejecting a non-image. |
| D25/D26 | Deadline | **31 October 2026.** Claude warned (once) that the full plan is very large for ~5 days and proposed a cut line; **the user decided to attempt everything.** |

### Still open (defaults will be used unless changed)
- Which UI/UX variant (sticker / launch graphic / landing page) — last, as agreed.
- Local development: PostgreSQL is installed locally, so no `docker-compose.yml` unless needed.
- Rate limiting on login/register (DRF throttling) — default: yes, small.
- Hours per day available — not given.

## 12. Order of work (every step leaves something working)

1. Deploy the frontend to Vercel as it is (Solvro API only).
2. Backend core: Django + DRF + Postgres, models, import command, indexes, read endpoints.
3. CRUD, pagination, validation, filtering/sorting, Swagger, `pytest` tests, README with schema picture.
4. **Check-in at the end of day 2:** review what is done; user decides whether to continue or cut.
5. JWT, roles, permissions, author copies, reviews.
6. **Check-in at the end of day 3.**
7. Deploy the backend (Cloud Run + Neon).
8. Frontend: shadcn restyle, source switch + adapter, secure Next.js path, unit conversion.
9. Frontend: login/register/forms, profile pages.
10. Signed uploads to Google Cloud Storage (riskiest, so late).
11. UI/UX task.

**If time runs short, cut from the bottom:** UI/UX, then uploads, then profile pages and forms, then reviews. The backend core plus JWT is a complete submission on its own.
The check-ins are Claude's proposal for a safety net; the user can ignore them.

## 13. UI/UX — decisions so far (variant 3: landing page)

All deliverables are HTML in `uiux/` (including `uiux/README.html`, still to be written).

| # | Decision |
|---|---|
| U1 | **Variant 3: one-page landing page**, desktop and phone views. |
| U2 | **Concept:** Uber-style minimalism (mostly black/white/gray, big clean type, lots of space). Information on **cards of glass**; the **top bar is glass too**. |
| U3 | **Glass is inverted against the page:** dark glass in light mode, light glass in dark mode, so it always stands out. Panes with text use 85% opacity (worst case tested: 5.2 at 62% was too low). |
| U4 | **Palette** in `uiux/tokens.css`, shown in `uiux/palette.html` with a live contrast check (16/16 pairs pass WCAG AA). Pink is the only action color (a fill and a separate text shade), gold is only for small icons, never text on glass. |
| U5 | **Background color from the drink photos, subtle ("ambient glow"):** the base stays pure black/white; the photo's main color becomes a soft capped glow behind the panes. Top bar, buttons, pink accent and text stay constant. Rule: **all text sits on glass.** Details (strength, picking the color, limits) to be discussed later. Reading colors from photos in the real app needs CORS on Solvro's image host (not checked). |
| U6 | **Font family: Metropolis** (Chris Simpson, SIL Open Font License 1.1; 9 weights + italics; OTF files from 1001fonts, no CDN, so the files must be stored in `uiux/assets/fonts/` together with the license text). All 18 Polish letters are present. **Weights still to be decided** (suggested: Regular 400 for text, Medium 500 for UI labels, Bold 700 for headlines; Regular alone gives weak hierarchy). **Metropolis lacks these characters:** ★ ♥ ♡ ← ✓ ✗, `·`, `•` and the Polish opening quote `„` (it has `”`, dashes, `…`, `×`, digits). So icons must be **inline SVG**, not text characters, and `·` / `„` avoided. Files are not in the repo yet. |
| — | Open: font weights, type scale, components, page layout, accessibility pass, `uiux/README.html`. |
