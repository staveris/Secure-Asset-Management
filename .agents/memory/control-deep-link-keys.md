---
name: Control card key / deep-link contract
description: The `?control=<PREFIX>-<responseId>` format is a cross-file contract; prefixes must stay unique per response table
---
Assessment detail merges responses from two tables with independent ID sequences (control-objective responses and atomic-control responses). Card keys and `?control=` deep links use `<PREFIX>-<responseId>` where prefixes are: OBJ = objective responses, NIS2/CIR/DORA = atomic responses.

**Why:** Both kinds once shared the "NIS2" prefix; colliding row IDs produced duplicate React keys (e.g. NIS2-3267) and ambiguous deep links.

**How to apply:** Any change to this key format must update ALL generators and parsers in lockstep: the unified assessment detail page's key helper, the atomic assessment detail page's `?control` parser (keys cards by control.id, so it maps responseId→atomicControlId first), the tasks-API navSource enrichment on the server, the Evidence Vault link builders, and the cross-framework At-risk drift-card links. Never let two response tables share a prefix.
