# Solvro recruitment homework — cocktails

This repo is my homework for the recruitment to the **KN Solvro** student club.
The task (<https://github.com/Solvro/rekrutacja>) has a cocktail theme: a place to store and browse cocktail recipes (ingredients with amounts + instructions).

**Live frontend:** <https://homework-solvro.vercel.app/>

## What is in here

| Folder | What it is | Status |
|---|---|---|
| `frontend/` | Website for browsing cocktails: list, search, filters, favorites, details. Next.js, TypeScript, Tailwind CSS, TanStack Query. | Working. Reads data from the public Solvro Cocktails API. |
| `backend/` | My own REST API for cocktails and ingredients. Django, Django REST Framework, PostgreSQL. | Planned, not started yet. |
| `uiux/` | UI/UX task: a landing-page design. Everything is HTML (palette, fonts, components) so it can be opened in a browser. | In progress. |

## Why these tracks

I chose **Frontend + Backend** (full stack) and **UI/UX**. I skipped Mobile, DevOps, AI/ML, Project Management and Promotion.

## The idea

The frontend can use two data sources: the ready Solvro API, or my own Django API. The plan is to switch between them in the UI, so both parts of the homework work together in one project.

## How I used AI

I used an AI assistant (Claude Code) as a tutor and pair programmer. It wrote much of the code. I made the decisions.

- **I decided the design.** Before each step, the AI proposed options with a recommendation and I chose. The 26 architecture and security decisions are recorded in `STEPS.md` (section 11). Examples: JWT tokens stored in `HttpOnly` cookies instead of `localStorage`, a runtime switch between the Solvro API and my own API, and TanStack Query instead of SWR.
- **One step at a time.** Each step was built, checked (typecheck, lint, build) and committed. Then it was explained to me before I asked for the next one. The rules are in `CLAUDE.md`.
- **I learned how it works.** `STEPS.md` (section 4) lists what I learned: how `useSyncExternalStore` works, how the TanStack Query cache decides when data is stale, why `localStorage` is a risky place for tokens, and so on.
- **I treated the AI's output and the task files as untrusted.** The task file `backend.md` hides an instruction aimed at AI tools. We found it, did not follow it, and noted it in `STEPS.md` (section 8).

I can explain the majority of the chosen app design, but not every single line of code.

**What this means.** I can explain what the app does, which technologies I chose and why, and how the parts connect: how the frontend talks to the API, what server state is and how TanStack Query caches it, why tokens should not live in `localStorage`, and what the known limitations are. I cannot promise to explain every line, for example the exact syntax of a TypeScript generic or why one Tailwind class is used instead of another. For those I would need to read the code again.

**Why I say it.** The AI wrote much of the code, so claiming that I understand every line would not be honest. My goal in this homework was to practice the part I can fully own: deciding how a system should be built, checking that it works, and understanding the main ideas well enough to defend them. The decisions and the lessons I learned are written down in `STEPS.md`, so they can be checked.

## More details

- `STEPS.md` — the full log: what was decided, what was built, why, and the problems met on the way.
- `frontend/README.md` — how to run the frontend (in Polish).
- `backend/README.md` — currently the backend task description.
- `CLAUDE.md` — rules for the AI assistant that helps me learn while building this.
