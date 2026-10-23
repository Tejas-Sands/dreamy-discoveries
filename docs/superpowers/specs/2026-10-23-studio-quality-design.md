# Studio quality implementation

The user explicitly requested an in-depth improvement audit followed by
implementation. Implement all 18 findings in `docs/studio-quality-audit-2026-10-23.md`.
Use the existing deterministic Director, shared components, cached assets and
local tools. This is an authorized correctness/quality pass on the approved
production style, not a new visual redesign.

Preserve all permanent script text, recipes, recordings, caches and slug reruns.
New metadata for selected reactions may enrich newly planned derived scripts,
but planning must know exact durations before emitting chunk ranges. No extra AI
calls, services, dependencies, increased workflow timeouts or external publishing.

Story ownership: Director, Callout, MoralChant and Cards. Audio ownership: common
premix wrapper, reaction catalog/pinning/timing, music/effects/reactions/brand,
voice validation and timeline-estimator parity. Pipeline ownership: immutable
artifact transfer, release script filenames, compilation publishing/downloads,
queue completion and literal titles. Root owns question layout, local lossless
mastering and explicit encoding, integration, review and rendered evidence.

Alternatives considered: a broad redesign would duplicate current functionality;
new AI/audio services violate constraints; patching individual episodes would
corrupt the permanent library. Fix shared paths and add regressions instead.

Success means all 18 findings have concrete changes, focused reproductions and
passing checks; a research report maps each result to evidence; representative
real production scenes and audio/export fixtures validate end-to-end behavior.
