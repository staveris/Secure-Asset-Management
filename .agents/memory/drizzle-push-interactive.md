---
name: drizzle-kit push blocks automation
description: Schema sync prompts interactively and can silently skip new tables; how to apply schema changes safely here
---

- `npx drizzle-kit push` in this repo always prompts interactively (create-vs-rename questions, and it always proposes dropping the `session` table, which is express-session's store and intentionally outside the Drizzle schema — NEVER accept that drop).
- **Why:** the post-merge setup script runs db:push non-interactively; when a merged task adds new tables, the prompt stalls until timeout and the tables are silently never created. Symptom: app boots but the new module's seed fails (e.g. "relation ... does not exist" or seed file/shape errors).
- **How to apply:** after any task merge that adds tables, verify with `to_regclass('public.<table>')`; if missing, hand-write the DDL from `shared/schema.ts` and apply via psql (Postgres truncates Drizzle's >63-char constraint names identically, so naming stays compatible with future introspection). Then restart the workflow and confirm the startup seed report line.
