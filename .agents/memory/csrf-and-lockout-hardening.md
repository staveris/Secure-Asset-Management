---
name: CSRF for session-creating auth flows and atomic lockout counters
description: Why login/register/totp/accept-invite must be CSRF-checked and why failed-login counters must be a single SQL statement, not read-then-write.
---

Any endpoint that calls `session.regenerate()` + sets `session.userId` (login,
register, totp-verify, accept-invite) is a session-creating flow and must be
CSRF-protected like any other state-changing POST — not just "genuinely
public" endpoints like forgot-password/reset-password (which are protected by
a mailed token instead of the session, so they can stay CSRF-exempt).

**Why:** A cross-site auto-submitting form can POST attacker credentials to an
unprotected login endpoint; the victim's browser stores the resulting
Set-Cookie and is now authenticated as the attacker without ever seeing a
password prompt (login-CSRF / session-confusion).

**How to apply:** For the CSRF check to work pre-authentication, the
`/api/auth/csrf-token` endpoint must persist the token on the session even for
anonymous (not-yet-logged-in) visitors — a token that's generated but never
stored can't be validated later. Also audit every frontend call site for these
flows; it's easy for one mutation (e.g. a TOTP-verify or invite-accept form)
to use a raw `fetch()` instead of the shared `apiRequest()` helper and silently
skip the CSRF header — grep for raw `fetch(` calls to `/api/auth/*` POSTs.

Separately: any "failed attempt counter -> lockout" pattern implemented as
SELECT-then-UPDATE in application code is racy under concurrent requests
(parallel requests read the same stale count and overwrite each other,
undercounting attempts and defeating the lockout threshold). Always implement
these as a single SQL UPDATE using the column's current value in the
expression (e.g. `col = col + 1`, with a CASE for any derived field like
`locked_until`), so Postgres computes it under the update's row lock.
