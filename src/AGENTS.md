# AGENTS.md — `src/`

Context: Remotion React/TypeScript source for the video compositor. Read the root `AGENTS.md` before making changes. These components run inside Chrome Headless Shell on GitHub Actions runners — they must be deterministic, frame-stable, and have zero runtime I/O.

---

## Architecture

```
Root.tsx                     Registers all Remotion compositions
  KidsVideo          (fps=30, 1080×1920 portrait)  ← the actual video
  Thumbnail          (fps=30, 1280×720)
  Bumper             (fps=30, 1280×720)             ← compilation bumper cards
  Bake               (fps=1,  1920×1080)            ← background baking (static PNG export)
  CharacterSheet     (dev only)
  BackgroundSheet    (dev only)
  Cast-Preview       (dev: idle/wave/talking/dance preview)
  Cast-All-Motion    (dev: all 38 characters)
  Sheet-Emotions     (dev: expression grid)
  Sheet-Actions      (dev: action grid)
  Sheet-Species      (dev: species grid)
```

---

## `KidsVideo.tsx` — The Main Composition

The entire video is one `<Sequence>`-driven timeline. The Director-enriched `script.json` is loaded via `staticFile()` and every event (line, callout, question, vox, groove, transition, party, gag, chant) is rendered at the correct frame.

**Key rules:**
- **No `useEffect` with side effects** — Remotion renders each frame independently; side effects that depend on prior frames will break headless rendering
- **No `Date.now()`, `Math.random()`** — use `useCurrentFrame()` + a stable seed for anything time-dependent
- **All assets via `staticFile()`** — never fetch from the network at render time
- **Keep frame math integer** — use `Math.round()` when computing frame offsets from seconds
- The timing formula is mirrored in `scripts/lib/estimate.mjs` — if you change how long a scene takes, update both sides

### Timing constants
Defined in `src/lib/timing.ts` (and mirrored in `scripts/lib/estimate.mjs`):
- `FPS = 30`
- `LINE_FRAMES` — frames per dialogue line (varies by text length)
- `QUESTION_FRAMES` — frames for thinking timer
- `CHANT_FRAMES` — frames per chant line
- `PARTY_FRAMES` — frames for party entrance/exit

---

## `src/components/characters/`

### Character rig system

```
Character.tsx        Public API: <Character kind="bunny" action="wave" emotion="happy" mouth={0} />
  ├── CharacterBody  Applies rig type (biped, bird, fish, star, shell, longNeck, tRex, whale)
  ├── Face.tsx       Renders eyes, eyebrows, mouth by emotion + mouth-open value
  ├── parts.tsx      Ears, tails, features (snout, whiskers, mane, trunk, horns, spikes, antennae…)
  │                  Clothing (scarf, sailor collar, headphones, saddle, striped beanie…)
  ├── MammalDetails  Species markings, fleece, quills, masks, distinctive tails
  └── SpeciesBody    Equines, insects, aquatic, reptiles, frog, star, snowman, giraffe
```

**Character component API:**
```tsx
<Character
  kind="bunny"          // cast id or legacy zoo id
  action="wave"         // idle|wave|jump|dance|walk|nod|shake|think|cheer|sit|bow|point|spin
  emotion="happy"       // happy|sad|surprised|thinking|proud|shy|scared|angry|excited|sleepy
  mouth={0}            // 0–1 speech envelope (pass from TTS phoneme timing)
  actionT={t}          // seconds since current action started
  width={300}          // px
  seed={1}             // stable int — keep same across shots for this character
  flip={false}         // mirror horizontally
  still={false}        // freeze animation for thumbnails
/>
```

Use `characterBox(centerX, groundY, width)` from `src/lib/layout.ts` to position feet on the floor.

**Rules for editing character components:**
- Do not change the `kind` prop values — they are the keys in `library/characters/*.json`
- Keep `seed` stable for a character across all shots in an episode
- Do not add new rig types without implementing all required attachment points
- Preview after any change: `npm run studio` → select `Cast-All-Motion`

### Adding a character appearance change

1. Edit `library/characters/<kind>.json` — change colors, markings, accessories
2. Verify the recipe validates: `node scripts/check-character-designs.mjs`
3. Preview: `npx remotion still Cast-Preview out/characters/preview.png --frame=0`
4. If you need new artwork (new part shape), add it to `parts.tsx` or `SpeciesBody.tsx`

---

## `src/components/backgrounds/`

Background part renderer reads a recipe from `library/backgrounds/<name>.json` and renders the three layer groups:
- `back` layer — always animated (clouds drifting, stars twinkling)
- `static` layer — baked to PNG by `bake-backgrounds.mjs` before render; loaded as `<Img>`
- `front` layer — always animated (grass swaying, ripples)

**Adding a new background part:**
1. Create the React component in `src/components/backgrounds/parts/`
2. Register it in the part lookup table in `src/components/backgrounds/BackgroundRenderer.tsx`
3. Add it to a recipe in `library/backgrounds/<name>.json`
4. Run `npm run bake` to verify it renders

---

## UI Components

| Component | Purpose |
|---|---|
| `Callout.tsx` | Learning callout pop-ups (color splat, number, keyword label) |
| `Cards.tsx` | Scene cards, title card, story/lullaby beat cards, end card, star banner |
| `Karaoke.tsx` | Bouncing-ball sing-along lyric display |
| `MoralChant.tsx` | Moral lesson chant renderer with "say it with me" cue |
| `Particles.tsx` | Confetti, sparkles, star-reward burst |
| `Question.tsx` | Question + thinking timer + answer reveal |
| `StarHud.tsx` | Star jar HUD (jiggles when a star lands) |
| `Transition.tsx` | Scene transition wipes, flashes, zooms |
| `Vox.tsx` | Plays a reaction sound at the correct frame |
| `Sfx.tsx` | Plays a sound effect at the correct frame |

---

## TypeScript Rules

- `tsconfig.json` targets ES2022 with strict mode
- Run `npm run typecheck` to verify before committing
- Do not use `any` — use `unknown` and narrow properly
- Remotion imports: always `import { … } from "remotion"` (never CDN)
- Google Fonts: always `import { … } from "@remotion/google-fonts/<FontName>"` — not `<link>` tags

---

## Performance Guidelines

- **Bake static scenery** — the `static` background layer is pre-rendered to PNG by `bake-backgrounds.mjs`. Never render complex SVG trees on every frame if they don't animate.
- **Chunk rendering** — the CI splits the video into ~3000-frame chunks rendered in parallel. Do not add any state that spans chunks (each chunk renders independently from frame 0 of its range).
- **Font loading** — use `@remotion/google-fonts` preload utilities at the top of `Root.tsx` so fonts are ready before frame 0.
- **Image assets** — use `<Img>` from `remotion` (not `<img>`) for cache-correct rendering.
- **Audio assets** — use `<Audio>` from `remotion` with `staticFile()` paths.

---

## Preview Commands

```bash
npm run studio                    # Live preview in browser

# Still frames
npx remotion still Thumbnail out/thumb-test.png
npx remotion still Cast-Preview out/characters/cast.png --frame=0
npx remotion still Sheet-Emotions out/chars/emotions.png
npx remotion still Sheet-Actions out/chars/actions.png --props='{"kind":"bunny"}'

# Motion previews (dev only)
npx remotion render Cast-Preview out/characters/cast-motion.mp4 --codec=h264
npx remotion render Cast-All-Motion out/characters/all-motion.mp4 --codec=h264
```

---

## `src/generated/`

Auto-generated by `scripts/build-registry.mjs`. **Do not edit manually.** Run `npm run registry` to regenerate after adding/removing assets in `public/`.
