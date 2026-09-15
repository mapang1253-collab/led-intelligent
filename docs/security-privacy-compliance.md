# Security, Privacy, and Source-Rights Architecture

**Status: FROZEN — included in Architecture Freeze v1.0. Deployment/provider controls are aligned with [technology-stack.md](technology-stack.md); legal advice and production compliance acceptance remain activation requirements.**

## 1. Scope and principles

The MVP has no end-user login, but it processes user-provided property assertions, external-source data, restricted operator functions, provider credentials and temporary analysis results. Controls follow purpose limitation, data minimization, least privilege, explicit retention, traceable provenance and fail-closed activation.

This document specifies architecture controls. It does not assert PDPA, copyright, contract or ODbL compliance for a deployment. Production posture, data flows, source contracts and notices require qualified review for the chosen use.

## 2. Data classes

| Class | Examples | Required treatment |
|---|---|---|
| Public reference | permitted admin codes, published method metadata | integrity/version controls; licence attribution |
| Licensed/restricted source | REIC content, authorized government interfaces, raw documents | source-specific access, storage, display, derivation, retention and AI-transmission rules |
| User-provided property data | address, deed/title/site assertions, acquisition evidence | ephemeral run isolation; purpose-limited use; never promoted to shared official fact |
| Analytical result | concepts, validations, scenarios, report | accessible only through the run capability and expiry policy |
| Credentials/operator secrets | API keys, provider credentials, signing keys | server-side secret management; never in client, logs, prompts or source records |
| Operational metadata | stage timing, reason codes, source health | minimize/redact; no full address, title number, name, prompt or raw payload |

Personal names or contact details from property/auction records are excluded unless an approved analytical purpose requires them. Source-native restricted data remains outside AI context and public output unless both purpose and rights permit transmission/display.

## 3. Anonymous run access

No user account is required. A public opaque `run_id` identifies work but grants no access. Status, result and cancel require an independent high-entropy, expiring capability held in a Secure, HttpOnly, SameSite=Lax cookie for hosted web use. The capability is never stored in browser local/session storage or exposed to frontend JavaScript.

Capability secrets are stored only as server-side digests, revoked 24 hours after run creation, and excluded from URLs, referrers, analytics, logs and contracts. Access never extends expiry. Hosted traffic uses HTTPS. Mutating requests require origin/CSRF protection. Render source/user/AI text as untrusted escaped content; apply a restrictive content policy and avoid arbitrary script/HTML injection. Rate and resource budgets limit anonymous abuse. There is no run-list endpoint, public share link or cross-run search in MVP.

Authorization is checked at every run read/mutation. Shared evidence IDs do not authorize access to another run's assertions or report. Expired, cancelled and purged runs fail closed with a safe status.

## 4. Operator and source interfaces

No-login applies to end users, not operator tools. Source publication requires authenticated, role-limited operator access. Rule, physical/demand method, component and parameter versions additionally require a named review record and may execute in this academic project only as ACADEMIC_REVIEWED. AI/tests cannot grant this state. ACADEMIC_REVIEWED is not professional or production approval.

Source adapters call only operator-configured hosts and paths. User input cannot provide a fetch URL, credential, redirect target or executable expression. Adapters enforce TLS verification, destination allow-lists, redirect policy, response size/time/content-type limits and safe parsing. Archive/decompression and document parsing run with bounded resources. Provider credentials use least-privilege scopes and source-specific rotation/revocation.

CAPTCHA, member-login, session-token and undocumented access-control paths remain disabled unless the source owner explicitly authorizes an integration.

## 5. Privacy and retention

Before production, inventory each processing purpose, data class, legal/contract basis, recipient/provider, retention, deletion path and user notice. Qualified review determines whether the selected deployment is subject to PDPA duties and what rights/request workflow is required.

User assertions and reports stay in isolated ephemeral run storage for 24 hours from run creation. They never enter shared evidence or cross-run AI caches. Purge covers Supabase run rows, R2 temporary objects and Workflow state under project control; logs exclude their content. If immediate deletion from backups is not feasible, restoration procedures must reapply tombstones before service resumes. Provider retention must be compatible with the academic data-handling policy before activation.

Before expiry, the capability-authorized browser displays the accepted result with the required evidence disclosures, versions and [academic output policy](output-policy.md). The application offers no result download/export or anonymous public sharing. Logs and metrics use redacted identifiers and bounded retention.

## 6. Source rights and attribution

Every SourceProduct activation record must state permitted acquisition, storage, normalization, combination/derivation, display, export, redistribution, AI transmission, attribution, geography, purpose, expiry and deletion obligations. A public URL or successful response is not permission.

OSM-derived data preserves source/licence lineage and required attribution. Whether a database or export is a derivative database/collective database and which share-alike duties apply is a release-specific legal determination. LED, REIC, Treasury and other government products remain limited to rights actually verified for the chosen production posture.

Rights expiry or revocation disables new use, invalidates caches, marks impacted runs/replay state and executes the required purge/quarantine workflow. Reports never reproduce restricted raw content merely to prove provenance; they use permitted citations or tombstones.

## 7. AI and untrusted content

The Gemini gateway receives a rights-filtered, minimized evidence projection. Source documents and user text are untrusted data and cannot change system instructions, request tools, reveal secrets, activate definitions or add formulas. Allowed IDs and evidence citations are supplied explicitly and verified after output. User-visible model fields must also pass the `th-TH` contract before presentation.

Google's free Gemini service may use submitted content for provider product improvement. Provider activation therefore records purpose, data region where relevant, retention/training terms, subprocessors, incident path and deletion controls. Personal names/contact details, complete title/deed identifiers, credentials, restricted raw objects and any field without approved third-party AI-transmission rights are excluded. Prompt/model/context caches cannot cross rights scopes or anonymous runs.

## 8. Integrity, availability and failure behavior

Encrypt transport and protected storage using deployment-supported controls. Hash raw objects and pin source, rule, component, parameter, prompt and method versions. Database constraints, atomic publication and immutable lineage protect analytical integrity.

Authentication/authorization failure, contract incompatibility, invalid signatures/hashes, suspected secret exposure and corrupted dependencies fail closed. They never become UNKNOWN evidence or a recommendation. Source and AI outages follow the degraded-analysis rules; core database unavailability returns a retryable run failure unless a complete immutable result can be served from an authorized cache.

Security events expose safe reason codes to users and detailed restricted diagnostics to operators. Incident handling includes credential revocation, source/pack deactivation, dependency impact search, user/provider notification assessment and recovery validation.

## 9. Release acceptance

Before activation, verify:

- cross-run access, expired capability, CSRF/origin, resource-exhaustion and operator-role tests;
- hosted-cookie Secure/HttpOnly/SameSite behavior, no capability in URLs/browser storage, and refresh recovery before expiry;
- escaped rendering and content-policy tests for user, source and AI-controlled text;
- secret scanning and separation of environments/activation manifests;
- adapter destination/redirect/size/parser containment tests;
- log, AI-context and telemetry redaction fixtures;
- retention/purge/backup-restore tombstone drills;
- source licence/contract and attribution review for every active use;
- AI-provider data handling approval;
- tests proving that Gemini receives no personal/restricted fixture fields and that English-only user-facing AI output is rejected;
- tests proving that no secret uses a public `VITE_` environment prefix or reaches the client bundle;
- database backup, restore and integrity validation;
- dependency-impact and rights-revocation exercises.

The anonymous-run retention is fixed at 24 hours. Source rates, operational recovery and cryptographic settings remain configuration values selected through provider rules and benchmark/security evidence.
