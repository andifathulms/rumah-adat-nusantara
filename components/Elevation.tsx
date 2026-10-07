import Link from 'next/link'
import type { Silhouette } from '@/lib/core/silhouette'
import { justifyShelf, packShelf } from '@/lib/draw/shelf'

/*
 * Elevation drawings, from computed silhouettes.
 *
 * The drawing side of lib/core/silhouette.ts: loops in, SVG out, nothing
 * computed here beyond placing houses on a sheet. Everything is in metres —
 * the viewBox is the world — so the scale bar can be honest: its width is a
 * fraction of the same viewBox the houses are drawn in, and both scale
 * together whatever size the sheet renders at.
 */

/** metres of sheet margin around the drawn houses */
const PAD = 1
/** metres between houses standing on the shared ground line */
const GAP = 3
/** metres of sheet below the ground line */
const BELOW = 0.4
/** the scale bar's length, metres — the drawing convention, not a dimension */
const BAR = 5
/**
 * The ground line's weight, in metres of the drawing.
 *
 * It was a non-scaling stroke, which is the right choice for a hairline and
 * the wrong one here: this line also carries `pathLength={1}` and a dashed
 * wipe, and a non-scaling stroke measures its dashes in device pixels rather
 * than in the path's own length. So the finished line sat at one pixel on and
 * one pixel off — a dotted rule that read as a broken one, with the houses'
 * own bright feet standing on it at intervals. Weight in metres and the dash
 * means what the wipe says it means.
 */
const RULE_W = 0.1
/**
 * The widest a gap may grow when a row is spread to the sheet's edges, in
 * metres. Past this a row is centred instead: two houses forty metres apart
 * read as two drawings, not one shelf.
 */
const MAX_GAP = GAP * 4
/**
 * How many metres of sheet one character of a shelf label takes, at the
 * narrowest the shelf renders (`--shelf-min`). The mono micro step advances
 * about 7.7px a character with its tracking, and at the minimum width a metre
 * is about six pixels. An estimate on the safe side: it only decides whether a
 * name near the sheet's edge turns inward.
 */
const LABEL_M_PER_CHAR = 1.3
/** The radius of a metre-grid dot, in metres of the drawing. */
const DOT_R = 0.07

/**
 * The metre grid behind a drawing: one dot at every whole metre.
 *
 * In metres, inside the drawing's own viewBox, so a dot is a metre at every
 * size the sheet renders — the same reasoning that sizes the scale bar as a
 * fraction of the viewBox. It is the scale stated a second time, faintly,
 * everywhere at once, and it is why the grid is not a CSS background: a
 * background in pixels would be a texture, and this is a measurement.
 */
function MetreGrid({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <>
      <defs>
        <pattern id={id} width={1} height={1} patternUnits="userSpaceOnUse">
          <circle cx={0.5} cy={0.5} r={DOT_R} fill="var(--dot)" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={f(w)} height={f(h)} fill={`url(#${id})`} />
    </>
  )
}

const f = (n: number) => (Math.round(n * 100) / 100).toString()

/**
 * A building at glyph size: the silhouette alone, scaled to fit a box on a
 * larger drawing — the site map's marker. Every glyph gets the same box, so
 * every building reads at the same visual size; this is deliberately not the
 * shelf's same-scale claim, which lives where the scale bar is. The nested
 * svg carries its own viewBox, so the silhouette's metres never leak into the
 * host drawing's units.
 */
export function ElevationGlyph({
  s,
  x,
  y,
  w,
  h,
}: {
  s: Silhouette
  x: number
  y: number
  w: number
  h: number
}) {
  const sw = s.max[0] - s.min[0]
  return (
    <svg
      x={f(x)}
      y={f(y)}
      width={f(w)}
      height={f(h)}
      viewBox={`0 0 ${f(sw)} ${f(s.max[1])}`}
      preserveAspectRatio="xMidYMax meet"
    >
      <path d={pathOf(s, 0, s.max[1])} fill="var(--bolu)" fillRule="evenodd" />
    </svg>
  )
}

function pathOf(s: Silhouette, ox: number, baseY: number): string {
  return s.loops
    .map(
      (loop) =>
        'M' + loop.map(([x, y]) => `${f(ox + x - s.min[0])} ${f(baseY - y)}`).join('L') + 'Z',
    )
    .join('')
}

/**
 * The scale bar: alternating metre segments, sized as a fraction of the row
 * it sits in — which must be the full width of the same container the drawing
 * fills, so the two cannot disagree. `viewW` is the drawing's viewBox width
 * in metres. Rendered as siblings, not wrapped: a percentage width has to
 * resolve against the row, not against a shrink-wrapped span.
 */
function ScaleBar({ viewW }: { viewW: number }) {
  return (
    <>
      <span
        className="h-1 shrink-0 border border-bolu"
        style={{
          width: `${(BAR / viewW) * 100}%`,
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--bolu) 0 20%, transparent 20% 40%)',
        }}
        aria-hidden
      />
      <span className="micro whitespace-nowrap">{BAR} m</span>
    </>
  )
}

/**
 * Every house at one scale, on as many ground lines as it takes.
 *
 * It was one ground line while the collection fitted on one. At fourteen it
 * does not: the houses come to two hundred and eighteen metres, and a strip
 * that wide in a page-width container draws a honai thirty pixels tall with
 * its name written across its neighbour's roof. So the shelf wraps, and the
 * packing is in `lib/draw/shelf.ts` with a test on it, because the thing that
 * must survive wrapping is the claim the shelf makes.
 *
 * That claim is one scale, and it survives by every row being drawn in the
 * *same* viewBox width — so a row holding one house is drawn at the scale of a
 * row holding six, and the scale bar at the foot is a fraction of that same
 * width. Rows sized to their own contents would have been the natural way to
 * write this and would have quietly made the small houses large.
 *
 * A new house in the registry is packed by the same arithmetic; if it is the
 * one that overruns the last row, a third row appears and nothing here
 * changes. Nothing counts to fourteen.
 */
export function ElevationShelf({
  items,
  caption,
}: {
  /**
   * `href` makes a label a link. The 404 passes it — there the shelf is the
   * wayfinding. The landing does not: its index is directly below, and a
   * hero that repeats all of the index's links at label size is the same
   * decision offered twice, the second time at eleven pixels.
   */
  /**
   * `anchor` makes the silhouette itself a pointer to somewhere on the same
   * page — the landing's index card for that house. It is an in-page jump,
   * not a second set of doors: the index stays the one enumeration, and the
   * drawing just says "that one" and scrolls there. Pointer-only (the shelf
   * is aria-hidden and the anchors are out of the tab order), because a
   * keyboard reader already has the index a few stops below.
   */
  items: readonly { key: string; href?: string; anchor?: string; label: string; s: Silhouette }[]
  caption: string
}) {
  const shelf = justifyShelf(
    packShelf(
      items.map((i) => ({ ...i, width: i.s.max[0] - i.s.min[0], height: i.s.max[1] })),
      { gap: GAP, pad: PAD },
    ),
    { gap: GAP, pad: PAD, maxGap: MAX_GAP },
  )
  const W = shelf.width

  return (
    <div className="shelf overflow-x-auto rounded border border-hairline bg-sheet">
      <div className="min-w-shelf px-4 pt-5">
        {shelf.rows.map((row, r) => {
          // Every row in the shelf's height, not its own: see the note on
          // `Shelf.height`. Uneven ground lines read as uneven scales.
          const baseY = shelf.height + PAD
          const H = baseY + BELOW
          return (
            <div key={r} className={r > 0 ? 'mt-2' : undefined}>
              <svg viewBox={`0 0 ${f(W)} ${f(H)}`} className="w-full" aria-hidden="true">
                <MetreGrid id={`rak-meter-${r}`} w={W} h={baseY} />
                <line
                  x1={0}
                  y1={f(baseY)}
                  x2={f(W)}
                  y2={f(baseY)}
                  stroke="var(--muted)"
                  strokeWidth={RULE_W}
                  pathLength={1}
                  className="rule-draw"
                />
                {/*
                  Each row rises as one beat once the ground line has drawn,
                  a state-timing after the row above — the landing's echo of
                  the frame-raising, run once on arrival. The stagger used to
                  count houses rather than rows, which at thirty-five meant
                  the last silhouette landed five and a half seconds in,
                  popping up behind a reader who had already scrolled past
                  it: a queue, not a gesture. Per row the whole entrance
                  finishes inside a couple of beats of the layout timing.
                  Reduced motion gets the finished drawing.
                */}
                {row.items.map((p) => {
                  const house = (
                    <path
                      d={pathOf(p.s, p.ox, baseY)}
                      fill="var(--bolu)"
                      fillRule="evenodd"
                      className="house-raise shelf-house"
                      style={{
                        animationDelay: `calc(var(--t-layout) + ${r} * var(--t-state))`,
                      }}
                    />
                  )
                  return p.anchor ? (
                    <a key={p.key} href={`#${p.anchor}`} tabIndex={-1} className="shelf-door">
                      <title>{p.label}</title>
                      {house}
                    </a>
                  ) : (
                    <g key={p.key}>{house}</g>
                  )
                })}
              </svg>
              {/*
                Each name sits over its own house and is allowed the width of
                its own slot — the house plus the gap either side of it. They
                were nowrap and centred on a point, which at fourteen houses
                meant "rumah bubungan tinggi" written straight through
                "lumbung" and "honai". A name that wraps onto two lines is
                legible; two names sharing one line are not.
              */}
              {/*
                Two lines of the micro step on the 4px scale: the tall names
                need the second line and the strip has to reserve it, because
                the labels are positioned and would otherwise hang over the
                next row's ground line.
              */}
              <div className="relative h-10">
                {row.items.map((p) => {
                  /*
                   * A justified row puts its first and last houses on the
                   * sheet's edges, and a name wider than a small house —
                   * "waruga" under a stone box — centred on it hangs off the
                   * sheet. A name that would overrun is set flush to the edge
                   * it would cross, the way a drawing's labels turn inward at
                   * a margin; every other name stays centred on its house.
                   */
                  const half = (p.label.length * LABEL_M_PER_CHAR) / 2
                  const end =
                    p.centre - half < 0 ? 'left' : p.centre + half > W ? 'right' : 'centre'
                  const slot = `${((p.width + GAP) / W) * 100}%`
                  const place =
                    end === 'left'
                      ? { left: `${(p.ox / W) * 100}%`, minWidth: slot }
                      : end === 'right'
                        ? { right: `${((W - (p.ox + p.width)) / W) * 100}%`, minWidth: slot }
                        : { left: `${(p.centre / W) * 100}%`, width: slot }
                  const align =
                    end === 'left'
                      ? 'text-left'
                      : end === 'right'
                        ? 'text-right'
                        : '-translate-x-1/2 text-center'
                  const face = `micro absolute top-1 ${align} leading-tight text-bolu`
                  return p.href ? (
                    <Link
                      key={p.key}
                      href={p.href}
                      className={`${face} underline-offset-4 hover:underline`}
                      style={place}
                    >
                      {p.label}
                    </Link>
                  ) : (
                    <span key={p.key} className={face} style={place}>
                      {p.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-hairline py-3">
          <ScaleBar viewW={W} />
          <p className="micro ml-auto text-muted">{caption}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * One house on its own sheet, with the scale bar that makes it a drawing
 * rather than a picture.
 */
export function ElevationSheet({
  s,
  caption,
  frameless = false,
}: {
  s: Silhouette
  caption: string
  /** true when the caller draws its own sheet frame around this drawing */
  frameless?: boolean
}) {
  const W = s.max[0] - s.min[0] + PAD * 2
  const baseY = s.max[1] + PAD
  const H = baseY + BELOW
  return (
    <div className={frameless ? 'px-4 pt-5' : 'rounded border border-hairline px-4 pt-5'}>
      <svg viewBox={`0 0 ${f(W)} ${f(H)}`} className="w-full" aria-hidden="true">
        <line
          x1={0}
          y1={f(baseY)}
          x2={f(W)}
          y2={f(baseY)}
          stroke="var(--muted)"
          strokeWidth={RULE_W}
          pathLength={1}
          className="rule-draw"
        />
        <path
          d={pathOf(s, PAD, baseY)}
          fill="var(--bolu)"
          fillRule="evenodd"
          className="house-raise"
          style={{ animationDelay: 'var(--t-layout)' }}
        />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-hairline py-3">
        <ScaleBar viewW={W} />
        <p className="micro ml-auto text-muted">{caption}</p>
      </div>
    </div>
  )
}

/**
 * A small elevation in a shared frame, for the index cards.
 *
 * Every card passes the same frame — the extents of the largest house in the
 * registry — so the cards stay at one scale too: the mbaru niang's card is
 * mostly tower and the joglo's is mostly eave, which is true.
 */
export function ElevationMark({
  s,
  frame,
}: {
  s: Silhouette
  frame: { w: number; h: number }
}) {
  const W = frame.w + PAD * 2
  const baseY = frame.h + PAD
  const H = baseY + BELOW
  const ox = PAD + (frame.w - (s.max[0] - s.min[0])) / 2
  return (
    <svg viewBox={`0 0 ${f(W)} ${f(H)}`} className="w-full" aria-hidden="true">
      <line
        x1={0}
        y1={f(baseY)}
        x2={f(W)}
        y2={f(baseY)}
        stroke="var(--hairline)"
        vectorEffect="non-scaling-stroke"
      />
      <path d={pathOf(s, ox, baseY)} fill="var(--bolu)" fillRule="evenodd" />
    </svg>
  )
}
