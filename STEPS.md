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

## 6. Backend (Django) — done

The design came from the grilling session (section 11) and was extended later (sections 14-17). It is documented in `backend/README.md` (run it, schema diagram, endpoints, roles, tests, known limits). Status: **Django + DRF + PostgreSQL, full CRUD, filters, Swagger, accounts with four roles, CMS, reviews, views and popularity labels, 206 tests.** It runs locally and is **not deployed**; the frontend does not use it yet.

## 7. UI/UX — in progress

**In progress.** Variant 3 (a landing-page design), delivered as HTML in `uiux/`. So far: the colour palette page (`palette.html`, `tokens.css`) and the font choice. Decisions are in section 13; the open items are listed at its end.

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

The remote is `origin` (`github.com/MajR0N/homework-solvro`). Later work (the UI/UX palette, the whole backend, the README changes) is one commit per step: see `git log --oneline`. Whether it has been pushed is not recorded here; check `git status`.

## 10. What's next

See section 17 for what is finished and what remains, section 14 for the frontend restyle, and section 12 for the order of work with its current status.

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

### Still open at the time (resolved later, see section 16)
- Which UI/UX variant (sticker / launch graphic / landing page) — last, as agreed.
- Local development: PostgreSQL is installed locally, so no `docker-compose.yml` unless needed.
- Rate limiting on login/register (DRF throttling) — default: yes, small.
- Hours per day available — not given.

## 12. Order of work (every step leaves something working)

Status as of 29 October 2026 in brackets.

1. Deploy the frontend to Vercel as it is (Solvro API only). **[done: https://homework-solvro.vercel.app/]**
2. Backend core: Django + DRF + Postgres, models, import command, indexes, read endpoints. **[done]**
3. CRUD, pagination, validation, filtering/sorting, Swagger, `pytest` tests, README with schema picture. **[done]**
4. **Check-in at the end of day 2:** review what is done; user decides whether to continue or cut. **[held: decided to finish the whole backend first, then UI/UX]**
5. JWT, roles, permissions, author copies, reviews. **[done, and extended: four roles, the CMS, the verified badge, views counting and popularity labels; sections 15-16]**
6. **Check-in at the end of day 3.** **[skipped]**
7. Deploy the backend (Cloud Run + Neon). **[not done: the user decided not to deploy for now]**
8. Frontend: shadcn restyle, source switch + adapter, secure Next.js path, unit conversion. **[source switch + adapter done (read-only, section 18); the restyle (section 14), the secure Next.js path and the unit conversion are not started]**
9. Frontend: login/register/forms, profile pages. **[not started]**
10. Signed uploads to Google Cloud Storage (riskiest, so late). **[not started]**
11. UI/UX task. **[in progress: palette and font decision; section 13]**

**If time runs short, cut from the bottom:** UI/UX, then uploads, then profile pages and forms, then reviews. The backend core plus JWT is a complete submission on its own. (The user later chose to finish the backend before UI/UX, so the real order differs from this list.)
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

## 14. Frontend UI/UX restyle — decisions (grilling, 29 October 2026)

Separate from the `uiux/` homework (section 13). It is the "shadcn restyle" from D16, now with a defined look.

| # | Question | Decision |
|---|---|---|
| F1 | How close to the `uiux/` design? | **Shared foundation:** colors from `uiux/tokens.css`, Metropolis font, pink accent (buttons, favorited heart). Cards are flat. |
| F2 | Where is glass used? | **Top bar only** (sticky, so the blur is real). Inversion from U3 stays: dark glass in light mode, light glass in dark mode. |
| F3 | What is in the top bar? | Title on the left, search in the middle, "Tylko ulubione (n)" on the right. The category / alcohol / sort dropdowns are a flat row below. No theme toggle (follows the OS). The source switch (D8) gets its slot when the backend exists. |
| F4 | shadcn scope | `Button`, `Input`, `Checkbox`, `Badge`, `Skeleton`. The three dropdowns stay **native `<select>`** styled to match (better on phones, fewer dependencies). This narrows D16 "everywhere". |
| F5 | Font in the app | **Metropolis**, loaded with `next/font/local`, files + license in the repo. Weights are decided in the UI/UX grilling first. Metropolis has no `·`, so the card subtitle separator must change (to `–` or CSS). |
| F6 | Cards | Restyle plus: a solid-background **badge** "Z alkoholem" / "Bezalkoholowy" on the photo (opposite the heart), category as plain text, fixed photo ratio, subtle hover. Caveat: Solvro's alcohol flags are sometimes wrong and the badge makes that more visible. |
| F7 | Detail page | **Two columns on desktop** (photo and tags sticky left; ingredients, then instructions, right), one column on phones. oz to ml conversion (D3) stays its own later step. |
| F8 | When? | **Backend core first**, then the UI/UX font step, then the restyle (about 4 small commits: shadcn + tokens + font, top bar, cards, detail), then JWT and the rest. This moves the restyle ahead of section 12 step 5. |

## 15. Backend step 3 — decisions made while building (29 October 2026)

- **B1. (CLOSED by step 5b: writes now need a login.) Writes were open** (no login) — the user's decision, because nothing is deployed yet. **Must be closed (JWT, step 5) before any deploy.** Also noted in `backend/README.md`.
- **B2. Pagination** is required by the task for cocktails **and ingredients**; categories (9 rows) are not paginated.
- **B3. Filter rules:** bad values return 400 (not silently ignored, unlike Solvro's `sort`); `?id=` (empty) means none; `?ingredient=mint,lime` means contains all; sorting has an `id` tiebreaker so pages are stable.
- **B4. Writes:** category by **name**, ingredients as `{ingredient: id, measure}`, a sent list **replaces** the old one, everything in one transaction.
- Data quirk found: 72 of 885 ingredient entries in the Solvro data have no `measure` field (stored as empty text).

## 16. Accounts, roles, CMS, ratings, views — design (29 October 2026)

Scope the user added after the backend core (step 3) was finished. Order of building: accounts and authors, then roles and CMS, then reviews, then views and trending. If time runs out, cut from the end.

### Decided
| # | Decision |
|---|---|
| A1 | **Four stored roles: user < admin < staff < owner.** "Author" is not a role: it is a per-object rule (the user who created a cocktail, ingredient or review may edit and delete it). A person can only manage accounts **below** their own rank and only hand out roles below their own rank. Admin: reviews and edits all content and ordinary users. Staff: also manages admins. Owner: manages everyone. |
| A2 | **The CMS is Django's built-in admin** (`/admin/`), restricted by role. Ordinary users cannot enter. No custom CMS in Next.js. |
| A3 | **"Verified" is a hand-set badge and filter** (`?verified=true`, a sort option). Nothing is hidden from the public. Admins set it in the CMS. Imported cocktails start verified. |
| A4 | **Popular, trending and top-rated are computed** from views and ratings, on request (no stored scores). Popular = all-time unique visitor-days. Trending = unique visitor-days in the last 7 days. Top rated = weighted average (pulls cocktails with few reviews toward the overall mean). The API exposes the numbers and sorting by each. |
| A5 | **A view is counted by an explicit call** `POST /api/v1/cocktails/{id}/views/` (not inside GET: a GET must not change data, and Next.js prefetching would count views nobody made). |
| A6 | **Views anti-abuse, level 1:** visitor = IP only (never cookies, never user-agent); IPv6 by `/64`; one counted view per visitor per cocktail per day (unique row); the IP is never stored, only a daily-salted HMAC; per-IP throttle on the endpoint; authors' own views are ignored; the answer is always 204; the proxy count (`NUM_PROXIES`) must be configured at deploy. |
| A7 | **Reviews** (D14): rating 1-5, optional text, one per user per cocktail, logged-in only. |

### Known limits (to state in the README)
- Many different IPs (botnet, rotating VPN) still add one view each per day. Real fix: CAPTCHA / proof-of-work (e.g. Cloudflare Turnstile), not planned.
- Shared IPs (school, office) count as one visitor.
- No email verification, so a script can still create accounts slowly (sign-up is throttled).

### Questions that were open here, and how they ended
- Where the role is stored: a custom user model, decision A8.
- Defaults for no email, token lifetimes, throttle and author storage: stood, decision A11 (the author is a link plus a name copy; the copied user number from D23 was not built).
- May authors rate their own cocktail: no (403), built.
- Which roles may the owner hand out: any role below owner, built (an owner can only come from `createsuperuser`).

### Added during the accounts discussion (decided)
| # | Decision |
|---|---|
| A8 | **Role stored in a custom user model** (`accounts.User.role`), chosen over a profile table and over Django groups: one role per user, always set, and the Django flags are derived from it in one place. Requires a fresh local database once. |
| A9 | **Reviews survive user deletion:** the author link is emptied and the review is shown as "deleted user" (rating still counts). So "has an author" is enforced by the API and a test, not by NOT NULL. |
| A10 | **Review moderation:** the review's author edits and deletes their own; admin, staff and owner delete any (they do not edit other people's text). **Any logged-in user can report** a review for an admin to look at. The cocktail's author does **not** delete reviews on their cocktail (they could remove bad ratings), they can only report. |
| A11 | Defaults that stand (no objection): no email field; access 10 min, refresh 7 days with rotation and blacklist; 10 per minute per IP on login and register. |




### Popular, trending, most popular — final definition (decided)
Computed on every request from unique visitor-days (no stored state). Thresholds live in settings so they can be tuned (demo values).

| Label | Rule |
|---|---|
| trending | at least 10 views in the last 14 days **and** the last 7 days have more views than the 7 days before (still rising) |
| popular | not trending, at least 20 views in the last 30 days |
| most popular | at least 100 views in the last 30 days |

One `status` is shown, in order: trending, most popular, popular. Known approximation: no memory of "was trending for 14 days" (an exact clock would need stored state and a daily job).



## 17. Backend — finished (29 October 2026)

Backend core, CRUD, filters, Swagger, accounts and roles, authors and permissions, the CMS, the verified badge, reviews with reports, views counting with anti-abuse rules, the three popularity labels and sorts, the schema diagram (Mermaid, generated from the models) and a final README pass are done. **206 tests pass**; the Swagger schema validates with no warnings. Checked on a real local server for accounts, permissions, reviews, views and the CMS login; **not** checked in a browser (the CMS look, the Swagger page and how GitHub renders the Mermaid diagram are unverified). The backend is **not deployed** and the frontend does not use it yet.

All three README files are now in Polish and the task text was removed from `backend/README.md`.

Still to do: the UI/UX homework, the frontend restyle (F1-F8), the source switch and the adapter that connects the frontend to this backend, and the login screens.

### How section 11 changed in practice

| Decision | What happened |
|---|---|
| D5, D14, D21, D22 (JWT, reviews, ingredient permissions, author label) | built in the backend (sections 15-16, 4 roles instead of 2) |
| D23 (deleted users) | built differently: the author link is emptied and the name copy stays; the copied user number and the profile page were not built; reviews of a deleted user are shown as "deleted user" (A9) |
| D15 (tests) | built: `pytest` + `pytest-django` on real PostgreSQL |
| D18, D19, D24 (HttpOnly cookies and the secure Next.js path) | only the JWT part (lifetimes, rotation, blacklist) is built; the cookies and the Next.js server path are not |
| D1, D2, D8 (switchable frontend, adapter) | built, read-only (section 18) |
| D6, D16, D17 (full frontend UI, shadcn, forms) | not started; the look is decided in section 14 |
| D7, D13 (backend deployment on Cloud Run + Neon) | not done; the user decided not to deploy for now |
| D11, D12 (image upload to Google Cloud Storage) | not started |
| D4, D9, D10 (import with Solvro ids, category table, trigram index) | built |
| D3 (measure as free text, unit conversion in the frontend) | the text is stored; the frontend conversion is not built |

## 18. Backend wiring — source switch and adapter (29 October 2026)

Scope A was chosen (read-only wiring plus the view call). Decisions: the switch only appears when `NEXT_PUBLIC_BACKEND_URL` is set (so the live Vercel site stays on Solvro); images from hosts other than `cocktails.solvro.pl` are dropped for the own backend (placeholder); the source is part of every query key (D8).

**Backend:** `django-cors-headers` (allowed origins from `CORS_ALLOWED_ORIGINS`, only `/api/`, no credentials); sorting by `category`; ties in every sort are now broken by name, then id. 216 tests.

**Frontend:** `lib/source.ts` (store + env), the adapter in `lib/api.ts` (translates `name`/`search`, `perPage`/`page_size`, `sort`/`ordering`, `id[]`/`id=1,2`, the page envelope, `image_url`/`imageUrl`, `alcoholic`/`alcohol`, the categories shape), `SourceSwitch`, and a fire-and-forget view call on the detail page.

**Checked for real:** `tsc`, lint and production build pass. The real adapter code was run against the live Solvro API and the live local backend: 89 comparisons matched (totals, page counts, the same cocktails on every page, all 10 category filters, search, alcohol filter, favorites, combined filters, three full detail pages with every ingredient). Remaining differences, all understood: the own backend has 9 categories (Solvro lists an empty 10th); names with punctuation sort slightly differently (collation); inside one category Solvro's order is undefined and ours is alphabetical. Also checked live: foreign and insecure image hosts are dropped, two view calls from one visitor add exactly one view, and CORS headers are sent only for allowed origins. **Not checked:** the switch in a real browser (look, keyboard use, persistence after reload), and what the user sees when the backend is down (the generic error).

Still to do for the frontend: login and forms (D6, D17), showing ratings, the verified badge and labels, the restyle (section 14), and the unit conversion (D3).

## 19. Security hardening (29 October 2026)

The user asked for: SQL injection, XSS, rate limiting, high-level encryption of user data, authentication and authorization security. An audit on the real code came first (144 injection probes with no 500 and no data change, alg=none and tampered JWTs rejected, no raw SQL, no frontend XSS sinks, `pip-audit` clean; gaps: no general rate limit, writes and `/admin/login/` unthrottled, browsable API on, `http://` and `ftp://` image URLs accepted, no per-account lockout, HTTPS settings off, PBKDF2 only). Approved plan S1-S5, with Argon2 (one new package), limits 120/300/30 per minute, lockout after 5 failed logins per 15 minutes per username, minimum password length 10.

- **S1 rate limiting: done.** Global anon/user limits, a write limit shared by all write endpoints, refresh and logout throttled, `/admin/login/` limited by a small middleware. 224 tests; also checked on a real server (429 after the 120th anonymous request, 429 on the 11th admin login attempt). DRF checks permissions before throttles, so unauthenticated 401s are not counted (nothing is written).
- **S2 input limits and XSS: done** (248 tests; limits on filter text, ids, ingredient terms, field lengths, list rows and request size; JSON-only API; `https`-only image URLs; checked on a real server including a 5 MB request refused with 413). No CSP on the JSON API (documented why).
- **S3 authentication hardening: done** (272 tests; 11 deliberate breaks all caught). Account lockout (5 failures per username in 15 minutes, from any IP, same behaviour for unknown names, case-insensitive, reset by a success), passwords 10-128 characters with the username-similarity check, a separate `JWT_SIGNING_KEY` (at least 32 characters or the server refuses to start) with the algorithm pinned, and a `security` log (failed, blocked and successful logins, 403s and 429s; never passwords or typed names). Checked on a real server.
- **S4 encryption and transport: done** (284 tests; 9 deliberate breaks all caught). Argon2id hashing (one new package, `argon2-cffi`; old PBKDF2 hashes still work and upgrade at login), the `PRODUCTION=true` switch (HTTPS redirect, HSTS for a year, secure cookies, the proxy header trusted only when `NUM_PROXIES` > 0, refuses to start with DEBUG on or with local defaults for `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`), the unused console e-mail setting removed, and Django's own `check --deploy` going from 5 issues to none (the HSTS preload check is silenced on purpose). Checked on real servers (real Argon2 hash, login about 0.1 s; production mode redirects HTTP and sends HSTS). No personal data is stored, so no field-level encryption was built (option A).
- **S5 final pass: done.** The audit was re-run from the beginning on the finished code (144 injection probes: still 0 server errors; 150 anonymous requests: 120 allowed then 429; admin login 10 allowed then 429; writes 30 then 429; 4 bad image schemes rejected; 5 forged tokens refused; lockout identical for real and unknown accounts; check --deploy 0 issues) and `pip-audit` again found no known vulnerabilities. A before/after table, an honest list of what is not covered, and a long-term table are in `backend/README.md`. 284 tests.
- **Follow-up to S5, done:** (1) the database connection now has `DB_SSLMODE` (local default `prefer`, production default `require`, weaker modes stop the server when `PRODUCTION=true`); a real test shows the driver refusing a server without TLS. A successful encrypted connection could not be shown because the local Postgres has TLS off. (2) Argon2 parameters are explicit and tunable (`accounts/hashers.py`, `ARGON2_*`: default 64 MiB, 3 passes, 2 lanes; a floor stops dangerously weak values); hashes with other parameters verify and upgrade at login. 298 tests; 8 deliberate breaks all caught.
- **Point 3 decided: option A.** Keep username + password only; no e-mail, no OAuth. So there is no personal data to encrypt field by field. S4 covers Argon2 hashing, the HTTPS/production settings, a separate JWT signing key, and an honest note that disk encryption is the database host's job. E-mail with field encryption (option B) or OAuth (option C) remain possible later.

## 20. Backend on Vercel — readiness (29 October 2026)

The user imported the repository in Vercel (it detected `backend` as Django on `/api` and `frontend` as Next.js on `/`; we chose two separate projects, not "Services"). The first backend build failed on `KeyError: 'SECRET_KEY'`: Vercel runs `manage.py` while building and the project had no secrets yet, which is the settings' deliberate behaviour.

Code made ready (all tested, 315 tests): `DATABASE_URL` support (encoded passwords, Neon pooler detected and server-side cursors turned off, `sslmode` and `channel_binding` from the URL, production still refuses weak TLS modes, non-PostgreSQL URLs refused), `STATIC_ROOT` so the admin's CSS is collected, a shared `DatabaseCache` for the limit and lockout counters when `PRODUCTION=true` (the in-memory ones would not work across serverless instances), `CSRF_TRUSTED_ORIGINS`, `.python-version` (3.14). A rehearsal copies the backend without `.env` and runs `check --deploy` and `collectstatic` with only Vercel's variables.

Step by step instructions and the exact list of variables are in `backend/README.md` ("Wdrożenie na Vercelu"). Not verifiable from here: the real Vercel build, the Neon connection, cold starts, whether the function has enough memory for Argon2 (fallback: lower `ARGON2_MEMORY_KIB`), and that `NUM_PROXIES=1` matches Vercel's proxy.

## 21. Backend live on Vercel + frontend shows the new data (30 October 2026)

**Deployed and verified from outside:** backend `homework-solvro-backend-fsuaihda.vercel.app` (Django on Vercel, Neon Postgres in London, function region London after the first measurement showed the US default made every request take 1.9 s; now 0.24 s). Neon's Auth and Realtime were turned off (we have our own accounts). Migrations, `createcachetable`, the import and `createsuperuser` were run from the owner's PC against Neon's direct address. The first import was row by row and looked frozen over the network, so it was rewritten with bulk queries (a test guards the query count); a timezone-dependent test was fixed. The CMS login works on the live site; CORS allows only the frontend. Two own errors worth remembering: I said the Swagger page would work without the database (it does not in production, the limiter's cache is in the database), and I had told the owner AWS databases normally need billing details (AWS has a free plan; Neon was still the better choice).

**Frontend, part A (data from the backend):** badges (verified, popularity label, rating) on cards and in the detail page, sorts popular / trending / top rated, filters "only verified" and "ingredient", the reviews list (deleted authors shown as "usunięty użytkownik"), all only for the "Własny backend" source (Solvro has none of this). `tsc`, lint and build pass. The real adapter was run against a local backend with temporary reviews and views (15 checks, including the weighted top-rated order and the null author); nothing in the live database was touched. Not verified: how it looks and works in a browser.

**Demo data:** `seed_demo` (with `--remove`, a confirmation that shows the database host, accounts without passwords, clearly marked names) creates reviews and views so every label shows; unreviewed cocktails now always sort last in `-top_rated` (found while looking at the demo output: they were landing in the middle). 328 backend tests.

**Not done:** part B (restyle with Solvro's identity; needs the owner's permission to read the brand assets), login and write forms, and demo data on the live site (it has no reviews or views, so ratings and labels stay empty until someone adds them).

## 22. Restyle with Solvro's identity — step 1 (30 October 2026)

The owner allowed me to open Solvro's brand files (`assets/` in the Solvro repository: six logo SVGs, `Paleta kolorów.png`) and the UI/UX task brief. Findings: the palette is six colours, all blue (#FFF, #D9E8FF, #80B3FF, #6583C8, #274276, #203560); the brief asks for the official logo unchanged, Solvro colours and character (extra colours only if used consciously), contrast and accessibility, and allows Space Grotesk. Nothing suspicious in the downloaded files (read as data, nothing executed).

**Decisions (owner approved 1 yes, 2 yes, 3 yes):** Solvro blues with a deeper navy `#0F1A30` derived for the dark page; **Space Grotesk** replaces Metropolis (U6); the pink/gold palette (U4) is dropped (not Solvro's, and the pink fails 2.5:1 on navy); the inverted glass idea (U2, U3, U5) is kept and mapped onto the brand (navy glass on the light page, pale-blue glass on the dark page); **one warm accent**, used sparingly (favourite heart, "Na topie"), never alone; light and dark follow the system. Every pair was checked against WCAG (numbers are in the comments of `globals.css`).

**Built:** tokens and theme in `globals.css`; Space Grotesk through `next/font`; official logos copied byte for byte (checked by SHA-256); a shared glass top bar with logo, search, favourites and the source selector (search and favourites moved up from the page, F3); skip link; focus ring; heart as an SVG; badge colours. On phones the bar takes two rows instead of three.

**Checked:** `tsc`, lint, build; and **screenshots with headless Edge** of the built app (light and dark, 1280 px desktop, 390 px phone through a frame, the list and a detail page). This found two real problems that I fixed: the bar was three rows tall on phones, and my first fix put the favourites button in the wrong row. Not checked: keyboard-only use, a screen reader, the own-backend badges visually (the screenshots used the Solvro source, so no ratings were shown).

**Deviations from earlier decisions:** shadcn/ui (D16, F4) is not used for now (no new dependencies, little time); the filters stay native selects. **Still to do:** step 2 (cards, filters, detail page restyle), then the UI/UX homework on the same tokens.

## 23. Restyle step 2a — dark glass and cards (30 October 2026)

Owner asked to restyle the cards and the top bar so that dark glass can be used. **Change from section 22:** the glass is no longer inverted; it is dark navy in both themes (white text, one white logo, the colour logo is no longer used in the app). On the dark page the glass is #274276 at 85% so it still stands out; worst-case contrast of white text over it (on a white photo) is 6.5:1, and that value is also the fallback colour for browsers without blur. Cards: the photo fills the card (4:5, same as the loading skeleton) and the name, category and badges sit on a glass panel; hover lifts the card. Outlined badges use `border-current` so they work both on the page and on glass. `.glass` moved into `@layer components` so Tailwind classes can override it.

**Checked:** tsc, lint, build; screenshots in light and dark at 1280 px. **Not checked:** the phone width with real cards (the screenshot only showed loading placeholders), badges on cards with the own backend, keyboard use. **Next:** filters and detail page on the same glass, then the UI/UX homework.

## 24. Restyle step 2b — detail page (30 October 2026)

Used the design-taste skill as a checklist. It targets landing pages, so only the parts that fit a browse/detail UI were applied (shape consistency, contrast, honest empty states, no gimmicks); its palette and font rules were skipped because the Solvro identity is fixed, and its icon-library rule was skipped because CLAUDE.md forbids unrequested dependencies (the three icons stay as small inline SVGs).

**Changed:** the detail page is now as wide as the top bar (`max-w-5xl`), so the logo, content and cards share one left edge. Two columns from 1024 px: the photo (sticky, tinted shadow) on the left, everything else (name, tags, preparation, ingredients, reviews) on the right; one column on phones. An ingredient without a photo shows its first letter instead of an empty square. The empty-favorites message says "serce" instead of the ♡ character. Filters were left as they are: they already follow the same radius and contrast rules and I found nothing worth changing without adding features.

**Checked:** tsc, lint, build; screenshots of the detail page (dark at 1280 px, light at 500 px). **Not checked:** keyboard use, a detail page with reviews and badges (own backend), the sticky photo while scrolling.

**Suggested, not done (new features):** a "clear filters" button on the list. **Next:** the UI/UX homework in `uiux/`.

## 25. Restyle step 2c — pill bar, styled selects, richer detail page (30 October 2026)

Owner feedback after looking at the live app: (1) the bar should be a dark blue glass pill, (3) the selects looked unstyled, (5) the detail page needs better spacing, colour and typography; also asked (2) why the popularity labels do not show, (4) for a way to create an account, (6) whether Space Grotesk is really used.

**Done:** the bar is a floating pill (rounded-full on desktop, rounded-3xl on phones where it has two rows), sticky 12 px from the top, same width as the content. **Shape rule now documented:** controls (inputs, selects, buttons, tags) are pills, containers (cards, panels, ingredient list) are rounded-xl. Selects use `appearance: none` plus our own chevron (SVG data URI, colour per theme, always white on the glass). Detail page: bigger title, three fact boxes (category, glass, alcohol) instead of loose tags, larger readable instructions, ingredient quantities in the primary colour with tabular figures, larger ingredient photos, consistent section headings.

**Answers:** (6) yes, Space Grotesk is shipped (woff2 files and `font-family: Space Grotesk` are in the build). (2) The labels exist in the code but the live database has no views or reviews yet, so only "Zweryfikowany" (set in the CMS) can appear; `seed_demo` has not been run on Neon. (4) Not built yet, waiting for the owner's decision; see below.

**Open decision (accounts):** an `admin` can edit and delete every cocktail, including all imported data. A public one-click admin login would let any visitor wipe the demo database through the API, so the recommendation is a demo account with role `user` (can add cocktails and reviews, can only touch its own), plus a real registration form.

**Checked:** tsc, lint, build, screenshots (dark desktop list and detail, dark phone list). **Not checked:** light theme after this change, keyboard use of the new selects.

## 26. Login form (30 October 2026)

Owner decision: no demo account and no hard-coded credentials. The owner creates the admin account themselves (`createsuperuser` or the CMS) and types the credentials into a login form. Nothing secret is in the frontend bundle.

**Built:** `lib/auth.ts` (session in localStorage with the same `useSyncExternalStore` pattern as favorites; `login` calls `/auth/login/` then `/auth/me/` for name and role; `logout` clears locally first, then invalidates the refresh token on the server), `app/login/page.tsx` (form, Polish error messages for 401/400 and 429 lockout, busy state), and the top bar shows "Zaloguj" or the user name plus "Wyloguj" (only when the own backend is configured). Phones keep two rows: heart and account buttons share the first row.

**Known limits (written in the code as `ponytail:` comments):** access tokens live 10 minutes and there is no refresh call yet because nothing in the UI uses a protected endpoint; tokens in localStorage are readable by an XSS script. Logging in does not unlock any UI feature yet (no review or cocktail forms). The live backend allows CORS only from the deployed frontend, so signing in from `localhost:3000` is blocked by the browser unless that origin is added to `CORS_ALLOWED_ORIGINS` on the backend project.

**Checked:** tsc, lint, build, screenshot of the login page; the live endpoint answers 401 to wrong credentials. **Not checked:** a successful login (no account yet), logout, the logged-in bar.

## 27. Design proposals for the list, detail page and card (30 October 2026)

After using the live app the owner reported: the "Tylko zweryfikowane" checkbox sits alone on its own row and is an unstyled white system checkbox; the list uses about 1000 px of a 1900 px screen; the detail page has bad category positioning and layout; the card's glass panel covers half the photo and its badges wrap into separate lines. The owner asked for **three design ideas per layout in separate files in a new folder with a README for the recruiter, inside `frontend/`** instead of fixing each by hand.

**Built:** `frontend/design-proposals/` with `list.html`, `detail.html`, `card.html` (three variants each, each with pros and cons), `proposals.css` (copy of the app tokens) and a Polish `README.md`. Plain HTML/CSS with a little inline JS to render repeated cards; no build step and no change to `src/`. Data: real cocktail and ingredient names and photos from the Solvro API; badges, ratings and the review are samples. The folder lives under `frontend/`, so it is not part of the Next.js build (the HTML is not imported by the app).

**Found while checking:** a CSS bug in the mocks (the `background` shorthand on the glass reset the select arrow's `no-repeat`, so it tiled across the control); fixed with `background-color`. The app itself was not affected.

**Checked:** screenshots of all three files at 1500 px in the dark theme. **Not checked:** light theme, phone widths, hover and keyboard behaviour of card variant C, any screen reader.

**Waiting for the owner:** which variant to build for the list (A, B, C), the detail page (A, B, C) and the card (A, B, C). The login form from section 26 is already in the app and independent of this.

## 28. Card A, detail page A and a wider layout (30 October 2026)

Owner picked from `design-proposals/`: card **A** (slim glass), detail page **A** (banner), list **C** (featured tiles and a floating filter pill) but "with filters that definitely need changes", so the list itself waits for a decision on three filter proposals (section 29).

**Built:** `CocktailCard` now shows the status pill on the photo, a white verified icon next to the name (role `img`, label "Zweryfikowany"), the rating on the right and only the category below ("Bezalkoholowy" is shown only as the exception). `Badges.tsx` exports `StatusPill`, `VerifiedIcon`, `RatingInline`, shared with the detail page. Detail page: banner (blurred photo under a dark gradient so text is always white, sharp photo, title, badges, facts separated by thin lines), ingredient cards in an auto-fill grid next to the preparation panel, reviews in two columns underneath. The bar and the list are now `max-w-7xl` (was `5xl`) so everything shares one left edge; the list grid has 5 columns from 1280 px.

**Checked:** tsc, lint, build, screenshots (list at 1900 px, detail at 1500 px dark, detail on a 500 px window light). **Not checked:** the own-backend badges on real cards (the local build showed the Solvro source, which has no badges), hover and keyboard use, the blurred banner with a bright photo (the overlay is strong enough that the blur is faint).

## 29. Filter proposals for list layout C (30 October 2026)

The owner chose list layout C but said the filters need changes, and asked for three proposals. Problems with the filter strip in mock C: three drop-downs with long labels squeezed into one pill, no indication of what is active, no way to clear everything, and the verified checkbox homeless. Common requirements for all three: the active value is written in the control (not only a colour), every active filter is a removable chip, "Wyczyść filtry", filters apply instantly (they live in the URL already), and "Składnik" / "Zweryfikowane" only appear for the own backend.

**Proposals** (`design-proposals/filters.html`): **A** buttons with pop-over windows on the glass bar (category window, visible alcohol toggle, "Filtry (n)" for rare ones); **B** categories as their own scrollable chip row, the bar keeps only short/binary filters; **C** a filter drawer with all filters in sections and a live result count. Checked with a 1500 px screenshot only.

**Waiting for the owner:** A, B or C for the filters (my recommendation: **B**, because it needs no pop-ups, no focus handling and no extra clicks, so it is the cheapest to build correctly before tomorrow's deadline). Then the list (featured "Na topie" tiles, which only exist for the own backend, plus the chosen filter bar) is built in one step.

## 30. List layout C with filters A (30 October 2026)

Owner picked filters **A** (buttons with pop-up windows on the glass bar). Built the list as agreed in section 28/29.

**Built:** `components/Filters.tsx` (glass pill: Kategoria button with a chip pop-up, a three-way Alkohol toggle, a Sortuj select, a "Filtry (n)" button with Składnik and Zweryfikowane for the own backend, result count; removable chips for active filters and "Wyczyść filtry"), `components/Featured.tsx` ("Na topie teraz": five trending cocktails as one big and four compact tiles, fewer than five as a normal row, none = no section; own backend only and only on a clean list), `CocktailCard` gets a `size` prop. The old filter form and its state were removed from `page.tsx`. The pop-ups sit next to the pill, not inside it (nested backdrop blur does not work), close on Esc (focus returns to the button) and on a click outside, and use `aria-expanded` / `aria-pressed`; the ingredient field keeps its 300 ms debounce and restarts from the URL value each time the pop-up opens (this also satisfied the `set-state-in-effect` lint rule). On phones the filter pill is not sticky (it would cover half the screen).

**Simplifications against the mock:** Sortuj is a styled native select, not a pop-up button (keeps keyboard and screen-reader behaviour for free).

**Checked:** tsc, lint, build. Driven in headless Edge through the DevTools protocol against the live API via a local pass-through proxy (the live backend does not allow localhost origins): opening the category pop-up, Esc closing it and returning focus, choosing a category and alcohol (URL: `?category=Cocktail&alcohol=true`, chips shown), the Filtry pop-up and the verified checkbox (`verified=1`), "Wyczyść filtry" (URL empty, no chips); screenshots at 1400 px and 390 px (found and fixed: rating cut off on long names, sticky pill too tall on phones). The live data already shows trending tiles, ratings and verified icons, so `seed_demo` has been run. **Not checked:** light theme, the ingredient field typing, keyboard Tab order inside the pop-ups, a screen reader, the Solvro source in a real browser session after these changes.


## 31. Design proposals for the user page, the add-recipe form and the admin panel (30 October 2026)

The owner asked for five concepts each for: the user-specific page (no such page exists yet), the add-recipe form (the app cannot add a cocktail yet), and a frontend admin panel. Everything went into `frontend/design-proposals/` as three new pages (`profile.html`, `recipe.html`, `admin.html`) that reuse `proposals.css` / `proposals.js` (new shared styles for forms, tabs, tables, side menu, phone frame; the top bar can now show a logged-in account). The README in that folder lists the 15 concepts and their trade-offs (Polish).

Design read used: logged-in product UI on the existing Solvro tokens (dark glass, Space Grotesk, pill controls, rounded containers), density low for the user pages and high for the admin. Phosphor icons from a CDN are used for the new icons (no hand-drawn SVG); no em-dashes, no decorative dots. The design skill says dashboards and admin panels are out of its scope, so the admin concepts keep our own identity instead of adopting Fluent/Carbon (that would break the Solvro look the UI/UX task needs); the density rules were applied by hand.

Rules from the backend are baked into the mocks: authors cannot set the verified badge, image URLs must be https, an ingredient appears once per cocktail, the measure is free text, admins delete reviews but never edit them, a role can only be granted below one's own.

Checked: headless Edge screenshots (1500 px, dark theme only) of all three pages, which found and fixed real bugs (doc-nav styles leaking into the side menus, missing select arrows, error text not red, links unreadable in dark mode, a collapsed bar chart). Not checked: light theme (could not be forced), phone, screen reader, keyboard use. The mockups are static; nothing is wired to the app. Next step: the owner picks one concept per page; only then do we build.

**Decision (30 October 2026):** the owner picked concept C for the add-recipe form (`recipe.html`): in-place editor styled like the detail page with a glass save bar. Not built yet; waiting for the go-ahead.

## 32. Working admin panel prototype, two navigation layouts (30 October 2026)

Mixed the five admin concepts into one clickable prototype: dashboard (C), table plus gallery with bulk verify (A and E), moderation queue with J/K (B), users and roles with the permission matrix (D). Two layouts share one script: `admin-sidebar.html` (sidebar) and `admin-topbar.html` (top bar), chosen by `<body data-nav>`. Files: `admin-panel.js`, `admin-panel.css`, the two HTML shells, all in `frontend/design-proposals/`.

Rules from the backend kept: image URL must be https, cocktail names unique, authors cannot verify their own recipe, admins delete reviews but do not edit them, a role can only be granted below one's own, owner and own account are locked. State lives in memory plus `sessionStorage`; there is no backend call. Everything dynamic is HTML-escaped (a cocktail named `<b>x</b>` renders as text).

Simplification: the weekly views chart is invented data (the backend counts totals only); ingredients and categories screens were left out.

Checked: a CDP script in headless Edge (dark theme, 1500 px and 420 px) clicked through search, filters, sorting, paging, bulk verify, add/edit/delete with validation errors, the queue (J/K, delete, dismiss, verify), role changes under admin/staff/owner, reset. No console errors. Not checked: light theme, screen reader, real phone. No app code changed, so tsc/lint/build/pytest were not run.

## 33. Working user page and main page prototype with the phone dock (30 October 2026)

The owner liked concept E of the user page (phone layout with a bottom glass dock) and asked to reuse it for the main page and to mix all five user-page concepts. Built `frontend/design-proposals/app.html` (+ `app.js`, `app.css`): one responsive prototype. Wide: top bar (A, B side menu from 64rem). Narrow: bottom dock on the main page and the account page (E). Account sections: overview with shelves (C) and activity feed, author panel with chart and table (D), favourites, own reviews, settings. Main page: "Na topie teraz" tiles, category chips, sort, favourite hearts.

File naming: the owner asked for English file names, so the new files are `admin-sidebar.html`, `admin-topbar.html`, `admin-panel.js/css`, `app.html/js/css`. The older mockups were renamed too (same day): filtry→filters, karta→card, lista→list, profil→profile, przepis→recipe, szczegoly→detail (all `.html`). README and this file were updated; older sections above may still mention the old names in prose.

Simplifications: add/edit uses a short dialog (name, category, image); the full editor is concept C of `recipe.html`, not built. Popularity labels use invented thresholds; the 30-day chart is invented data. State is in `sessionStorage`, no backend call.

Checked: CDP script in headless Edge at 1500 px and 390 px (search, filters, favourites, add/edit validation, delete down to empty states, review delete, dock navigation, no horizontal scroll on the phone). No console errors. Not checked: light theme, screen reader, real phone. No app code changed, so tsc/lint/build/pytest were not run.

## 34. UI/UX homework skipped, `uiux/` removed (30 October 2026)

The owner decided to skip the separate UI/UX task. `uiux/` (`palette.html`, `tokens.css`: black and white with a pink and gold accent) was deleted with `git rm`; it is still in git history (last commit before this one) if it is ever needed. Sections 13 to 14 and the "Next: the UI/UX homework" remarks above are therefore historical.

"Migrate the tokens and palette to the designs": the pink/gold palette had already been dropped in section 22 (owner approved; pink fails contrast on navy), and the designs and the app use the Solvro blues, so the owner confirmed to keep those. What was saved: `frontend/design-proposals/palette.html`, a palette and token reference for both themes with a live contrast check (18 of 18 pairs pass WCAG AA, computed in the browser from the token values). `CLAUDE.md` and the root `README.md` no longer point to `uiux/`.

**Next (owner's request):** build the accepted prototypes into the Next.js app in phases, each one grilled first: (1) account page, phone dock, richer filters; (2) recipe editor C with real create/edit calls; (3) admin panel with the top bar (needs new backend endpoints: users and roles, report queue, stats).

## 35. Plan: build the accepted prototypes into the app (grilled 30 October 2026)

The owner asked to build every accepted prototype (user page with the phone dock, richer filters, recipe editor C, admin panel with the top bar) into `frontend/`. Each branch was grilled one question at a time; these are the decisions. **No deadline pressure** (the owner said the 31 October date is not a hard stop), so the work is done properly in phases with a stop after each one.

**Correction:** `CLAUDE.md` said the backend is not deployed. It is: Vercel + Neon (see `backend/README.md`). `CLAUDE.md` was fixed.

| # | Topic | Decision |
|---|---|---|
| G1 | Scope | Everything, in phases, no day limit. |
| G2 | My reviews | New backend endpoints for the logged-in user's reviews **and** for recent reviews on my recipes (activity feed). |
| G3, G4, G5 | Demo | The demo profile (made-up recipes, reviews, stats, 30-day chart) lives **in the frontend** as fixtures, switched by a separate **"Tryb demo" toggle** (account menu + a visible banner "Tryb demo: zmiany zapisują się tylko w tej przeglądarce"). Demo = you are `kasia_mixuje`, no login, writes go to localStorage, a demo role can be chosen (user/admin/staff/owner), so the admin panel can be shown without backend. Off = real login and real backend. The source select (Solvro / own backend) stays as it is. Assumption to confirm: real mode also gets a stats endpoint (totals + views per day from `CocktailView`), so the author panel is real there. |
| G6 | Routes | Nested, English: `/account`, `/account/recipes`, `/account/favorites`, `/account/reviews`, `/account/settings` (one layout with banner and section menu); `/recipes/new`, `/recipes/[id]/edit`; `/admin/*`. UI text stays Polish. Dock: `/`, `/account/favorites`, `/recipes/new`, `/account`. |
| G7, G8 | Auth | **httpOnly cookies through a Next.js proxy** (tokens never reach JavaScript). Proxy only for login, refresh, logout and writes; public reads and the view counter stay direct from the browser. The proxy adds `X-Client-IP` plus a shared-secret header, and the backend trusts `X-Client-IP` only when the secret matches (otherwise all users share Vercel's IP: global login lockout, broken view de-duplication). Refresh is done server-side in the proxy, single-flight. |
| G9 | Demo layer | Data-layer adapter: pages use hooks (TanStack Query); each hook's query function picks the demo store or the real calls. No MSW. |
| G10 | Filters | Add: author (all / Solvro / users / mine, `?author=`), glass type (needs a small endpoint listing glasses), popularity label (`?status=`). Not added: minimum rating (no backend support). |
| G11 | Ingredients in the editor | Typeahead over existing ingredients (`/ingredients/?search=`) with an inline "add new ingredient" row (`POST /ingredients/`); measure is free text; each ingredient once. Category must already exist. Image is a URL (https only), no upload. |
| G12 | Unsaved work | Warn on leave (beforeunload + in-app confirm) **and** autosave a draft to localStorage (restore with a notice and a discard button). |
| G13 | Admin API | Real endpoints under `/api/v1/admin/` (users + role change, report queue + dismiss, verify/unverify incl. bulk, dashboard stats). The role rules move into **one shared policy module** used by both the Django CMS and the API, with tests (privilege-escalation cases first). The CMS stays as fallback. |
| G14 | Admin edit | One editor: admin "Edytuj" opens `/recipes/[id]/edit` (concept C) with admin extras (verified switch, author line). |
| G15 | Tests | pytest for every new endpoint and the policy; **Vitest** (one dev dependency) for pure frontend logic (demo store, drafts, role rules mirror, ingredient dedupe); browser behaviour checked with a headless-Edge script, reported honestly, not committed. |
| G16 | Order | **Phase 0 foundation** (backend trusted-IP header, Next proxy routes, cookie session replacing localStorage tokens, "Tryb demo" + demo store, Vitest) then **Phase 1** (account pages, phone dock, filters, new `/auth/me` endpoints) then **Phase 2** (recipe editor with drafts) then **Phase 3** (admin API with shared policy + admin panel with the top bar). Small commits, stop and report after each phase. |

**Known costs the owner accepted:** the cookie proxy is the largest option (more code than localStorage + refresh); the shared policy module touches the existing CMS; two code paths (demo and real) must stay in sync; Solvro's public API has no login, so account, editor and admin only exist with the own backend or in demo mode.

**Not yet decided:** visual details of the dock on tablets, exact demo fixtures, how the deployed frontend gets `BACKEND_URL` and the shared secret (Vercel env, to be done in Phase 0).

