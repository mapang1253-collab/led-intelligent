# Data Persistence and Lifecycle

**Status: FROZEN — included in Architecture Freeze v1.0 and aligned with no-login and zero-configuration.**

## 1. Persistence principle

Persist only for analytical reuse, reference, historical preservation, reproducibility, source protection or performance, and only when rights permit. Shared analytical facts are separated from anonymous request state.

## 2. Classes

| Class | Examples | Lifecycle |
|---|---|---|
| Reference | geography, units, vocabularies, rule/component definitions | versioned; retain while referenced |
| Source raw | authorized payload and retrieval metadata in Cloudflare R2 | restricted/quarantined; minimum source-specific retention |
| Normalized fact | source record, Observation, coverage | append/supersede; rights-aware |
| Analytical link | identity hypotheses, EvidenceLinks, conflicts | recomputable; pin when a report depends on it |
| Derived cache | features, spatial summaries, parameter candidates | disposable; dependency invalidation |
| Historical event | offering states where permitted | immutable; legal/source retention |
| Ephemeral run | intake, user assertions, concepts, scenarios, result | isolated; bounded viewing/recovery window |
| Operations | job/error/metrics | minimized/redacted; short policy retention |

No investor profile, account, saved personal history or public anonymous share link is in MVP.

## 3. Analysis-run isolation

An opaque run ID identifies work but does not authorize access. A separate unguessable capability can retrieve or mutate the run; only its digest is stored server-side and it is kept out of URLs/logs. The run and capability expire 24 hours after `created_at`; reads do not extend expiry. The server stores only what is needed to finish/recover the run. User assertions never enter the shared evidence corpus. A run may link shared source observations but cannot modify them.

Before expiry the authorized client may view the accepted result on the protected web page. The application provides no PDF/JSON download, other export, saved history or public share link. At expiry, revoke access and automatically purge run-scoped intake, assertions, AI exchanges, analyses, outputs and temporary objects. A durable purge job retries failures; restoration reapplies expiry tombstones before service resumes. Shared source observations remain governed by their own rights/lifecycle.

## 4. Raw and personal data

- capture raw only after SourceProduct storage rights are active;
- separate raw object storage from normalized database records;
- encrypt/restrict raw access; record content hash and retrieval metadata;
- remove personal fields unrelated to analysis before normalization;
- exclude personal names and full request content from logs;
- support legal hold, source purge and rights revocation;
- after required raw deletion, retain only a permitted provenance tombstone and mark replay limits.

LED pages and REIC licensed content remain inactive for systematic ingestion until written rights and privacy handling are confirmed.

## 5. Version and time

Observations append/supersede. Effective time, observation period, publication and retrieval are distinct. Legal rules carry jurisdiction/valid dates; snapshots carry vintage; methods, reference data, rule packs, component packs and parameters have immutable versions.

A cached result is valid only while dependency fingerprints match, the earliest admissibility/freshness deadline has not passed, coverage still applies, rights remain active and no dependency is withdrawn/quarantined.

## 6. Acquisition patterns

| Pattern | Use |
|---|---|
| Scheduled/event driven | official releases, valuation cycles, auction dates, rule reviews |
| Controlled periodic | sources without signals, within provider limits |
| Authorized on demand | provider permits target lookup; identical requests coalesce |
| Operator curated | legal rules/reports requiring professional review |
| Local bulk extract | OSM and reproducible bulk datasets |
| Disabled | undocumented/token/captcha/login path without authorization |

The public path asks the acquisition orchestrator for availability; it never calls external sites directly. Fresh cache returns immediately. Bounded refresh may run in parallel. Slow optional acquisition does not hold the whole analysis indefinitely.

## 7. Freshness states

States: FRESH, STALE_USABLE, STALE_BLOCKED, HISTORICAL, SUPERSEDED, QUARANTINED and PURGED.

- stale is usable only when purpose policy permits and the as-of date is disclosed;
- expired legal rules/assessment cycles cannot represent current status;
- failed refresh retains the prior admissible version;
- parser anomalies quarantine new normalized writes;
- removed source items become historical only where capture rights permit.

## 8. Reproducibility

A report is reproducible when all observations, rule/component/reference versions, methods and parameter values remain available. If rights/retention prevent pinning, mark REPLAY_LIMITED and retain permitted provenance explaining why.

Derived data is disposable and must never be the only surviving fact or assumption basis.

## 9. Anonymous abuse and operations

Coalesce identical evidence requests; apply source/run resource budgets; bound input, AI retries and run lifetime; keep credentials in operator infrastructure; keep operator ingestion outside the public surface; aggregate telemetry where possible.

Specific source rate values require provider rules and measured load. The 24-hour anonymous-run retention is a locked project rule; operational logs and source data use their own minimized, rights-aware policies.

## 10. Purge and rights changes

The inventory maps each class to owner, purpose, jurisdiction, rights grant, retention, purge method and downstream caches. Revocation disables new use, invalidates affected caches and reports impacted artifacts. Audit records retain no prohibited content.
