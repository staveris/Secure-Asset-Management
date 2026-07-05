---
name: Testing & TS baseline quirks
description: Vitest setup pitfalls and the pre-existing TypeScript error baseline in this repo
---

- `npm run check` does NOT pass at baseline: ~141 pre-existing TS errors, all the same zod/drizzle-zod TS2344 mismatch pattern on `createInsertSchema`-derived `z.infer` types in `shared/schema.ts`. New modules that copy the existing schema pattern add one identical-class error each — this is expected, not a regression. Judge new code by LSP diagnostics on the new files instead.
- Running bare `npx vitest` picks up `vite.config.ts` (root=client) and finds no server tests. A root `vitest.config.ts` exists for server-side suites; it must keep excluding the three legacy standalone tsx harness files (`cyber-risks-seed.test.ts`, `dora-applicability.test.ts`, `evidence-storage.test.ts`) which are run via `npx tsx <file>` and contain no Vitest suites.
- **Why:** both issues look like new breakage during verification but are long-standing repo characteristics.
- **How to apply:** at any verification gate, compare TS error counts against baseline rather than expecting zero; run unit tests via `npx vitest run` from repo root.
