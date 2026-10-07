# DESIGN.md — Tongkonan

## House layer (shared across the portfolio)

Same layer as the sibling apps. Anything below that contradicts this section is a bug in this file, not a licence.

- 4px spacing grid. Hairline borders. 2px radius, and 0 on single-sided rules.
- Motion timings: 150ms for state, 400ms for layout, 1100ms for an orchestrated transition. Nothing else.
- One orchestrated moment per app. Here it is **the frame-raising sequence**. Nothing else may compete with it.
- Legend contract: any encoding shown to the reader is named on screen. No colour or symbol carries meaning that only the code knows.
- Citation line: every screen can state where its numbers came from without the reader asking.
- 16px type floor for body copy. Mono micro-labels may go to 10px because they are labels, not reading.
- Zero runtime network. Vendored fonts served same-origin, vendored three.js, textures generated at runtime. The app works with the wifi off.
- `prefers-reduced-motion` gets a **complete alternative**, not a disabled feature.

## The register

**A physical model under real light.** Not photoreal, not clay.

Photoreal is the wrong target, and not merely an expensive one. Mossy ijuk, dust in a light shaft, a banana tree at the corner — each asserts a specific house on a specific afternoon, and the sources cannot support that claim. Most of the dimensions will be interpolated at launch. A photographic render on top of interpolated numbers is a lie told fluently.

So: full material response and real shadow, but visibly a made object.

- Clean ground plane. No vegetation, no terrain, no scattered props.
- No atmospheric haze, no bloom, no lens dirt, no vignette, no depth of field.
- A 1.68 m figure stands beside the house **on by default**. It is not set dressing, it is the scale bar.
- The sky is a flat colour tracking the computed sun altitude. A light source, not a photograph.

This register is also the differentiator. Almost nobody ships it — the default for 3D architecture on the web is either an ArchViz render or a grey clay turntable, and both are available to anyone.

## Palette — the four pigments

The four traditional pa'ssura colours. The palette is closed: no fifth colour, no tints outside this set for anything that carries meaning.

| Name | Hex | Traditional source | Use |
|---|---|---|---|
| Bolu | `#17150F` | soot | ink, primary buttons, carved ground |
| Rara | `#8E3B25` | red earth | the one accent |
| Riri | `#C8912B` | turmeric / bile | carved highlight, rosette centre |
| Kapur | `#E9E3D2` | slaked lime | reversed text, carved white |

Interface neutrals sit outside the pigment set on purpose, so pigment always reads as *content*: drafting film `#DDD8CA`, sheet `#EFEBE1` (a sheet lying on the film — cards, the rail, drawing frames; a surface step of 1.20:1, not a hue), ground plane `#C3BDA9`, muted ink `#575349`.

The film was `#D8D7CD` and the sheet `#E3E0D1` until the second design pass. Beside the pigments that film read green-grey, and at 1.09:1 a card and the page it lay on were one surface, so nothing on the landing read as an object. The pigments did not move; only the paper did.

**One shadow, and it means "you can pick this up".** `--lift` appears on hover on index cards, route doors and the comparison's houses — never on prose, headings or the rail. Depth is a signal about interaction, not decoration.

**Rara is the only accent and it is expensive.** It marks exactly two things: a number that has no source, and where rainwater lands. Both are arguments. If it starts appearing on hover states, it has been spent.

## The night register

The same four pigments after dark, following `prefers-color-scheme` and nothing else — there is no toggle, because the site keeps no state anywhere and a theme control would be its first. Soot and lime swap roles: soot `#12100A` becomes the ground (vitrine surface `#1F1B12`, 1.11:1), kapur becomes the ink. No token gains a hue — rara is lifted in value for dark ground (`#C76A48`, 5.01:1) exactly the way riri already dropped for light, and riri needs no ink variant at night because the pigment itself clears 6.77:1. Text over a riri fill uses `--on-riri`, which stays near-black in both registers, because riri is the one pigment that never changes value.

**The model does not go dark.** The renderer carries its own colour constants and its light comes from the solar arithmetic, so the house stays a physical object in computed daylight and the dark chrome meets the viewport like a mat around a print. That is the design: the interface has a night, the building has a sun.

Every dark pair's ratio is stated in `globals.css` beside the token, the same contract as the light set. Text pairs clear 4.5:1 in both registers.

## Typography

No display serif. The register is a measured drawing, so the mono face does the expressive work and the sans stays quiet.

The face is **IBM Plex**, the clause below finally exercised: a technical grotesque drawn for engineering documentation, which is what this site pretends every page is. Vendored into the repo (latin subsets, ~60KB total, OFL licence beside the files), served same-origin via `next/font` — the zero-runtime-network rule holds and the app still works with the wifi off. The system stacks remain as declared fallbacks.

- Sans (IBM Plex Sans, variable): body copy and secondary headings. Body 400, headings 600.
- Condensed (IBM Plex Sans Condensed, 600 only): the display voice — the claim, a building's name on its front door and its index card, island headings. The same family drawn narrower, so the rule below holds; a narrower face carries more size in the same width, which is what a catalogue plate needs. Vendored like the others (~15 KB).
- Mono (IBM Plex Mono, 400/500): every number, every stage name, every control label, every provenance tag. Uppercase with `0.1em` tracking for micro-labels only.
- Numbers are always mono, always right-aligned in a readout, always with their unit.
- The display step is fluid — `clamp(40px … 84px)` — because the claim on a landing and the house name on a front door are headlines, not labels. It is still one step of the six-step scale.

The original rule stands for any future addition: a grotesque or a technical face, never a high-contrast serif.

## Layout

A surveyor's sheet: title block left, drawing right.

```
┌──────────────┬─────────────────────────────────┐
│ Tongkonan    │  [perspektif] [tampak] [kolong] │
│ ──────────── │                                 │
│ Pangkat      │                                 │
│ Ruang        │            the model            │
│ Tanduk       │                                 │
│ Matahari     │                                 │
│ ──────────── │                                 │
│ Terukur      │  ▭▭▭▭ 5 m                       │
│ Sumber ▓▓▒░  │                                 │
└──────────────┴─────────────────────────────────┘
```

Below 860px the rail moves under the viewport and scrolls. The viewport never gets less than half the screen. A scale bar sits bottom-left of the viewport at all times.

### The working routes, after the second pass

- The rail leads with *which house* — breadcrumb, name in the condensed face, the four readings as one tab bar — and then the rules. The claim is the landing's and the front door's; a reader on a working route has passed one of them.
- Over the model: the readout folds (folded by default under 860px), the drag hint is a single chip, and nothing overlaps the scale bar.
- A front door's elevation is a dimensioned drawing: overall length and height measured off the silhouette, drawn in rara because no building here has a survey behind it, and the legend line under the drawing names that and repeats both figures in body type for a phone.

## Motion

**Drag-only rotation. There is no idle turntable, ever.** A spinning model reads as a screensaver and tells the reader the object is decorative. Rotation is something the reader does.

The ban is on *idle* motion, not on choreography:

1. **Frame-raising (the orchestrated moment).** ~15s. Parts arrive in build order: pad stones → a'riri → sills and joists → deck → walls → tulak somba → roof frame → ijuk from the eave upward → horns. Each part drops into place over its own span with an ease-out cubic and settles. **No fades** — opacity needs transparent materials, and a house is not translucent while it is being built. The stage name and gloss appear over the viewport while a stage is active.
2. **View transitions.** 1100ms between three fixed cameras: perspective, elevation, and one that drops under the floor into the kolong. Punctuation, not ambience.
3. **A day of sun.** Shadow sweeping the courtyard as the time control moves.
4. **Rain.** Only while the toggle is on. Streaks shed off the eave; the drip line is drawn on the ground in rara. A demonstration of why the overhang exists, not weather.

Scaling a part during placement must be about the part's own centre. World-space meshes get the drop only — scaling them about the scene origin makes a 14 m roof swing in from below, which reads as an effect rather than an act of building.

**Reduced motion gets the complete alternative:** the frame-raising still runs, as an immediate ordered reveal with the stage list readable. The sequence is content, so it is never removed, only de-animated. View changes cut instantly. Rain does not animate.

## Materials

Every material is generated at runtime onto a canvas. Nothing downloaded, nothing a photograph of someone else's house.

| Material | How it is made | Why not a texture file |
|---|---|---|
| Timber | wavy grain lines, two tones, light noise | grain must rescale when the house does |
| Board | straighter, paler grain | same |
| Bamboo | vertical fibres, node rings at a fixed pitch | node spacing is a property of the pole |
| Ijuk | ~1400 short near-vertical fibre strokes on near-black | fibre direction has to follow the course |
| Carved panel | **constructed**: bands in the four pigments, plus pa'barre allo drawn as a circle divided into eight rays | the motif *is* a construction rule; tracing it throws that away |
| Horn | physical material, clearcoat ~0.5 | horn is waxy, not matte |

UVs on box parts are scaled by the part's largest dimension so grain stays at constant physical size instead of stretching along a beam.

**Carving at texture level is the placeholder.** The target is extruded geometry generated from the same construction rules, so relief casts real shadow. Whatever draws the rosette must draw it, never store it.

The roof reads because the courses are real geometry standing proud of one another, casting their own shadow lines. Do not flatten them to a single surface with a thatch texture — the shadow between courses is most of the material.

## Lighting

The light is computed, not art-directed: NOAA solar position for Rantepao (2.97°S, 119.90°E, WITA).

This matters architecturally. At ~3°S the sun passes within a few degrees of the zenith, the noon shadow nearly vanishes, and the deep overhang is doing real work. Offer three date presets — equinox, June solstice, and the local culmination date — because the difference between them is the point.

- One directional light, shadow-casting, intensity and colour driven by altitude.
- One hemisphere light, colour from the sky, intensity tracking altitude.
- Shadow camera fitted to the house bounds, not the scene.
- Contact darkening under the raised body. A radial-gradient plane is an acceptable placeholder; real ambient occlusion in the joints and under the floor is the largest remaining quality gain.

The deep shadow under a pile house — the sulluk banua as a dark void with the whole body floating above it — is the most dramatic thing about the form. Light it so that reads.

## Provenance — the honesty layer

The rule pack tags every dimension `measured` / `canon` / `interpolated`. The rail shows the split as a bar with a plain-language line beneath, and `/sumber` lists every dimension with its citation.

At launch the bar will be mostly rara. **This is not a defect to hide; it is the most important thing on screen.** A smooth shaded render implies a precision the sources do not have, and the strip is what keeps the two honest. It stays visible in every version. When a survey is wired in, the bar moves — that motion is the project's progress metric.

## Naming and attribution

- Toraja terms are the real names of the parts and are used as such: a'riri, tulak somba, kale banua, rattiang banua, sulluk banua, pa'ssura, ijuk. Vocabulary, not flavour.
- Orientation is stated on screen as a constraint, so its absence from the controls reads as a fact about the building rather than a missing feature.
- There is no single canonical Toraja house. When a survey is wired in, the app names the house and the village. "Rumah adat Sulawesi Selatan" as a label for one form is exactly the flattening this project exists to resist.
- Some motifs and rites are restricted in use. Anything beyond the plainly geometric pa'ssura needs checking before it is rendered.

## Hard rules

1. No idle rotation. Ever.
2. No fifth pigment.
3. No photographic texture, no downloaded asset, no runtime network.
4. Provenance visible on every screen that shows a dimension.
5. Rara marks arguments only.
6. The scale figure is on by default.
7. No post-processing effects — no bloom, vignette, DOF, chromatic aberration, film grain.
8. The generator stays pure. `lib/` runs in Node with no DOM; the renderer never generates geometry.
