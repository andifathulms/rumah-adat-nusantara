import type { Config } from 'tailwindcss'

/*
 * Tokens come from DESIGN.md, are written down in app/globals.css, and are
 * mapped onto utility names here. This file declares no values of its own —
 * every entry below points at a custom property, so there is exactly one
 * place a colour or a size is decided and the renderer can read the same one.
 *
 * The pigment set is closed: four traditional pa'ssura colours, plus
 * interface neutrals that deliberately sit outside the set so pigment always
 * reads as content.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Below this the rail moves under the viewport and scrolls. The
        // viewport never gets less than half the screen.
        sheet: '860px',
      },
      colors: {
        bolu: 'var(--bolu)', // soot
        rara: 'var(--rara)', // red earth — the one accent
        riri: 'var(--riri)', // turmeric, as a fill
        'riri-ink': 'var(--riri-ink)', // turmeric dropped in value, for strokes and labels
        'on-riri': 'var(--on-riri)', // ink over a turmeric fill, dark in both registers
        'on-model': 'var(--on-model)', // ink over the daylight model, dark in both registers
        'chip-model': 'var(--chip-model)', // the chip a caption over the model sits on
        kapur: 'var(--kapur)', // slaked lime
        film: 'var(--film)', // drafting film
        sheet: 'var(--sheet)', // a sheet lying on the film: cards, the rail
        ground: 'var(--ground)', // ground plane
        muted: 'var(--muted)', // muted ink
        'muted-on-ink': 'var(--muted-on-ink)', // muted ink, over a soot field
        hairline: 'var(--hairline)',
        wash: 'var(--wash)', // hover
        veil: 'var(--veil)', // panels floating over the model
      },
      fontFamily: {
        // Two families and no more: vendored IBM Plex, system stacks behind it.
        // Sans reads; mono measures. The variables come from app/fonts.ts.
        sans: [
          'var(--font-sans)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        // The condensed cut: headlines and building names, nothing else.
        display: [
          'var(--font-display)',
          'Arial Narrow',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'var(--font-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      height: {
        // The minimum pointer target, from the tokens.
        control: 'var(--control-target)',
        // On a phone the drawing keeps over half the screen.
        viewport: 'var(--viewport-h)',
      },
      minHeight: {
        control: 'var(--control-target)',
        masthead: 'var(--masthead-h)',
      },
      minWidth: {
        // The same-scale elevation shelf pans below this rather than shrinking.
        shelf: 'var(--shelf-min)',
        // The source table pans below this rather than reflowing.
        table: 'var(--table-min)',
      },
      maxWidth: {
        readout: 'var(--readout-max)',
        caption: 'var(--caption-max)',
      },
      boxShadow: {
        // The one shadow: a surface a reader can pick up.
        lift: 'var(--lift)',
      },
      backdropBlur: {
        veil: 'var(--veil-blur)',
      },
      spacing: {
        // 4px grid. Tailwind's default scale is already on it; this is the
        // rail width the surveyor's-sheet layout needs.
        rail: '320px',
        // Clearance above the masthead band, for overlays floated over it.
        'masthead-clear': 'var(--masthead-clear)',
      },
      borderRadius: {
        DEFAULT: '2px',
        none: '0',
      },
      transitionDuration: {
        // The only three timings in the app.
        state: '150ms',
        layout: '400ms',
        orchestrated: '1100ms',
      },
      fontSize: {
        // The one type scale. A bracketed pixel size in a component is a bug.
        micro: ['var(--fs-micro)', { lineHeight: 'var(--lh-snug)', letterSpacing: '0.1em' }],
        meta: ['var(--fs-meta)', { lineHeight: 'var(--lh-snug)' }],
        body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
        lead: ['var(--fs-lead)', { lineHeight: 'var(--lh-snug)' }],
        title: ['var(--fs-title)', { lineHeight: 'var(--lh-tight)' }],
        display: [
          'var(--fs-display)',
          {
            lineHeight: 'var(--lh-display)',
            letterSpacing: 'var(--ls-display)',
            fontWeight: '600',
          },
        ],
      },
    },
  },
  plugins: [],
}

export default config
