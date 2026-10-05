# Story staging and remaining engagement work

Authorization: user requested the remaining improvements and said “lets get going!!!”. This extends the completed first batch; the studio remains free, deterministic and limited to its six animals.

Newly generated scripts use `presentationVersion: 2`. Version 1 and older scripts retain their existing presentation and pinned audio. Version 2 includes the first batch's hook, listening and environmental clock behavior.

## Staging

Director-authored `scene.staging` contains bounded actor positions/moves and persistent props. Actor identifiers are `character` and `friend`. Prop identifiers are stable across consecutive scenes; each prop has a deterministic SVG/emoji appearance, position/owner and line-indexed events (`show`, `pick-up`, `give`, `drop`). Carried props follow the character rig; reaching targets are expressed in rig coordinates, with a smooth bounded blend. Handovers require the two actors to approach within reach, change ownership once at the end of the transfer, and preserve ownership on subsequent scenes. Unknown props receive a generic illustrated object with a label/emoji. Prop disappearance must be explicit or tied to leaving its location.

Actor travel is an eased path sampled from absolute scene frames. Walking phases derive from traveled distance, and flip/gaze face the destination. Dialogue, prop demonstration, reaction, discovery, celebration and quiet framing use small deterministic shot choices. Captions and questions stay outside camera transforms. New leaf/page/ripple transitions fit forest, story-location and water changes; authored transitions still take precedence.

## Voices

The closed cast uses distinct voices from the installed local Kokoro model. The per-cast map is pinned in synthesis settings for version 2. Planner and TTS resolve role plus the scene's actual animal to the same voice. Identical text spoken by different voices gets different keys; the same animal retains its voice when appearing as a friend. Explicit voice overrides remain available. Older scripts keep their prior voice map and cache behavior.

## Narrative evidence and analytics

An offline story audit reports hook, goal, distinct attempts, meaningful choices, repair and payoff using text/action evidence with scene references. It must expose uncertainty and missing evidence rather than invent a complete arc from scene counts. Duplicate/repetitive dialogue and unearned moral-only endings are surfaced. Existing permanent scripts remain renderable; stronger automatic writing guidance stays within the existing script call. Any enforcement on new annotated inputs is versioned.

Local YouTube Studio CSV/JSON exports produce a readable engagement report: normalize common columns, inspect retention when supplied, mark insufficient samples, and connect observations to episode beat timings. No live API, OAuth or paid analytics is required; no automatic content/canon changes follow weak data.

## Scenery and sound

Backgrounds gain separate distant, middle and foreground motion with bounded parallax. Selected foreground foliage/weather render after actors; windows and scenery architecture remain behind them. Static PNG caching is preserved. Small vector ripples, leaves or sparkles react to relevant events, never cover learning text and stay restrained in thinking/bedtime scenes.

Scene score sections reuse existing procedural music assets, crossfade at story changes and duck under voices. Scene beat animation and score BPM come from the same selection. No extra music model, service or unlicensed recording is added.

## Acceptance

Director is idempotent, authored choices survive, every new frame can render independently, props retain ownership across cuts, voices and planner cache identity agree, quiet scenes remain quiet, whole/chunk renders agree, and all legacy tests/typechecks pass. Produce a new zero-AI preview and a local analytics fixture/report, inspect rendered frames, measure a comparable short workload, and preserve all caches/permanent scripts/user edits. No commit, publish, Telegram message or CI run is requested.
