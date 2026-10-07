import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IndexFilter } from '@/components/IndexFilter'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { MakerSignature } from '@/components/MakerSignature'
import { MapDoors } from '@/components/MapDoors'
import { groupByIsland, searchText } from '@/components/islands'
import { Mark } from '@/components/Mark'
import { ElevationGlyph, ElevationMark, ElevationShelf } from '@/components/Elevation'
import { COASTLINE, FRAME } from '@/lib/geo/nusantara'
import { ClassGlosses, SplitBar, SplitLegend } from '@/components/split'
import { silhouette } from '@/lib/core/silhouette'
import type { Silhouette } from '@/lib/core/silhouette'
import {
  COPY,
  DEFAULT_LOCALE,
  LOCALES,
  homeHref,
  houseHref,
  isLocale,
  landingMetadata,
  pick,
  plateNo,
} from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { TRADITIONS } from '@/lib/tradition/registry'
import type { Tradition } from '@/lib/tradition/registry'

/*
 * The map's glyphs are svg <a> elements, which next/link does not wrap — so
 * the base path Next prepends to every <Link> has to be said here by hand.
 * Empty in dev, the repository's subpath on Pages; forgetting it sent every
 * glyph to the host's root and a 404.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE
  return landingMetadata(locale, TRADITIONS.map((t) => t.house[locale]).join(' · '))
}

/**
 * The collection's front door.
 *
 * While there was one house the site could open inside it; with several, the
 * first page has to be the shelf and not one of the books. Everything here is
 * read from the registry, so a fifth house appears on the shelf, on the map
 * and in the index without this file changing — the copy is written without
 * counts for the same reason.
 *
 * The houses are built here, at export time, because everything honest on
 * this page — the silhouettes on the shelf, the interpolated share on each
 * card — is a property of a built house, not of a description of one. The
 * shelf is the page's largest thing on purpose: the claim is that the model
 * is computed, and the computed model is the only picture that can back it.
 */
export default function Landing({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const built = TRADITIONS.map((t) => {
    const b = t.build(t.defaultQuery)
    return { t, b, s: silhouette(b.house, b.scene.ridgeAxis ?? 0) }
  })
  /*
   * The frame every index card draws inside: the extents of the largest
   * house. One frame keeps the cards at one scale, the same claim the shelf
   * makes — the mbaru niang's card is mostly tower and the joglo's is mostly
   * eave, and that difference is content.
   */
  const frame = {
    w: Math.max(...built.map(({ s }) => s.max[0] - s.min[0])),
    h: Math.max(...built.map(({ s }) => s.max[1])),
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 pb-10">
      {/*
        The title bar, kept while the page scrolls: the wordmark, the three
        section anchors, and the way into the other language. It floats on
        the veil token, the same surface every panel over the model uses, so
        "a bar over content" means one thing across the site.
      */}
      <header className="sticky top-0 z-20 -mx-6 flex min-h-control items-center justify-between gap-3 border-b border-hairline bg-veil px-6 py-2 backdrop-blur-veil">
        <p className="flex items-center gap-2 micro text-bolu">
          <Mark />
          {pick(COPY.appName, locale)}
        </p>
        <nav className="micro hidden items-center gap-5 sm:flex">
          <a href="#cerita" className="transition-colors duration-state hover:text-bolu">
            {pick(COPY.landing.storyHeading, locale)}
          </a>
          <a href="#tapak" className="transition-colors duration-state hover:text-bolu">
            {pick(COPY.landing.sitesHeading, locale)}
          </a>
          <a href="#rumah" className="transition-colors duration-state hover:text-bolu">
            {pick(COPY.landing.housesHeading, locale)}
          </a>
        </nav>
        <LocaleSwitch
          locale={locale}
          targets={
            Object.fromEntries(LOCALES.map((l) => [l, `${homeHref(l)}/`])) as Record<
              typeof locale,
              string
            >
          }
        />
      </header>

      {/*
        The claim before the name, as everywhere else: the tagline leads and
        the wordmark is the smallest thing on the page. The h1 is the tagline
        because that is what this page is about; the name is already in the
        title bar. The drawing under it is the claim made good — the same
        parts the invariants run over, projected and traced.
      */}
      <h1 className="mt-12 max-w-3xl font-display text-display text-bolu">{pick(COPY.tagline, locale)}</h1>
      <p className="mt-5 max-w-2xl text-lead text-muted">{pick(COPY.landing.lede, locale)}</p>

      {/*
        The shelf is the hero picture, not a third copy of the index: labels
        annotate the drawing and the links live in the index below, once.
      */}
      <div className="mt-8">
        <ElevationShelf
          caption={pick(COPY.landing.shelfCaption, locale)}
          items={built.map(({ t, s }) => ({
            key: t.key,
            anchor: cardId(t),
            label: t.house[locale],
            s,
          }))}
        />
      </div>

      {/*
        The figures under the drawing, every one summed from the registry at
        export time — the copy beside them carries no number. The last is
        the argument the project makes: it is set in rara because rara marks
        a number with no source, and this is the count of numbers that have
        one from a survey.
      */}
      <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded border border-hairline bg-sheet sm:grid-cols-4">
        {[
          { label: COPY.landing.figures.buildings, value: TRADITIONS.length, rara: false },
          {
            label: COPY.landing.figures.parts,
            value: built.reduce((n, { b }) => n + b.house.parts.length, 0),
            rara: false,
          },
          {
            label: COPY.landing.figures.joints,
            value: built.reduce((n, { b }) => n + b.house.joints.length, 0),
            rara: false,
          },
          {
            label: COPY.landing.figures.measured,
            value: TRADITIONS.reduce((n, t) => n + t.split.measured, 0),
            rara: true,
          },
        ].map((fig, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 border-hairline px-4 py-3 ${
              i % 2 === 0 ? 'border-r' : 'sm:border-r'
            } ${i < 2 ? 'border-b sm:border-b-0' : ''} last:border-r-0`}
          >
            <dt className="micro">{pick(fig.label, locale)}</dt>
            <dd className={`num text-left font-display text-title ${fig.rara ? 'text-rara' : 'text-bolu'}`}>
              {fig.value.toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB')}
            </dd>
          </div>
        ))}
      </dl>

      <hr className="rule my-10" />

      {/*
        The story runs in two columns above the sheet breakpoint: four beats
        read as a spread, not a scroll, and each paragraph keeps its own
        column so no beat is split mid-sentence.
      */}
      <section id="cerita" className="scroll-mt-16">
        <h2 className="mb-5 font-display text-title text-bolu">{pick(COPY.landing.storyHeading, locale)}</h2>
        <div className="gap-10 sheet:columns-2">
          {COPY.landing.story.map((p, i) => (
            <p key={i} className="reveal mb-4 break-inside-avoid text-body text-bolu">
              {pick(p, locale)}
            </p>
          ))}
        </div>
      </section>

      <hr className="rule my-10" />

      {/*
        The map takes the width of the window and the reading takes the width
        of a column. The archipelago is four thousand kilometres of ocean with
        islands in it: in a prose measure Sumatra is a smudge and three of the
        sites share a marker. The map is its own index now — every glyph is a
        link and names arrive on hover or focus — so only the note stays in
        the prose measure.
      */}
      <section id="tapak" className="reveal scroll-mt-16">
        <h2 className="mb-5 font-display text-title text-bolu">{pick(COPY.landing.sitesHeading, locale)}</h2>
        {/* The map is one link per house; a keyboard reader can decline the
            whole archipelago in one stop. Visible only while focused. */}
        <a
          href="#rumah"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded focus:bg-bolu focus:px-3 focus:py-2 focus:text-body focus:text-kapur"
        >
          {pick(COPY.skipMap, locale)}
        </a>
        <SiteMap locale={locale} items={built.map(({ t, s }) => ({ t, s }))} />
        <p className="mt-3 max-w-3xl text-body text-muted">
          {pick(COPY.landing.sitesNote, locale)}
        </p>
      </section>

      <hr className="rule my-10" />

      <section id="rumah" className="scroll-mt-16">
        <h2 className="mb-5 font-display text-title text-bolu">{pick(COPY.landing.housesHeading, locale)}</h2>
        {/*
          The legend for the card bars, drawn once above the index rather than
          once per card: no colour may carry a meaning only the code knows.
          Beside it, what the plate number is — a stamp of collection history —
          because the index stopped being ordered by it.
        */}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <SplitLegend locale={locale} />
          <p className="max-w-md text-meta text-muted">
            {pick(COPY.landing.plateGloss, locale)}
          </p>
        </div>
        <div className="-mt-2 mb-4">
          <ClassGlosses locale={locale} />
        </div>
        {/*
          One enumeration, findable two ways: grouped by island west to east
          (the axis a reader actually holds — "the house from Kalimantan"),
          and filtered by typing. The islands come off the sites, the order
          off their longitudes, so a thirty-sixth house files itself.
        */}
        <IndexFilter
          label={pick(COPY.landing.filterLabel, locale)}
          empty={pick(COPY.landing.filterEmpty, locale)}
          all={pick(COPY.landing.filterAll, locale)}
          islandsLabel={pick(COPY.landing.filterIslands, locale)}
          islands={groupByIsland(built).map((g) => ({ id: g.island.id, label: g.island[locale] }))}
        >
          {groupByIsland(built).map((group) => (
            <section
              key={group.island.id}
              data-kelompok={group.island.id}
              className="mt-10 first:mt-0"
            >
              {/* The island in the display voice, with its own count beside
                  it — computed, so a new house moves it. */}
              <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-muted pb-2">
                <h3 className="font-display text-title text-bolu">{group.island[locale]}</h3>
                <span className="num text-meta text-muted">{group.items.length}</span>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sheet:grid-cols-3">
                {group.items.map(({ t, b, s, plate }) => (
                  <HouseCard
                    key={t.key}
                    locale={locale}
                    tradition={t}
                    plate={plate}
                    s={s}
                    frame={frame}
                    parts={b.house.parts.length}
                    joints={b.house.joints.length}
                  />
                ))}
              </ul>
            </section>
          ))}
        </IndexFilter>
        <p className="mt-4 max-w-2xl text-body text-muted">{pick(COPY.tradition.note, locale)}</p>
        {/* The pair is a reading the index cannot give: one link, said once. */}
        <p className="mt-3">
          <Link
            href={`/${locale}/banding/`}
            className="text-body text-bolu underline underline-offset-4"
          >
            {pick(COPY.banding.open, locale)} <span aria-hidden>→</span>
          </Link>
        </p>
      </section>

      {/*
        The page's one seam at the foot of it. The landing has no legal or
        data credit on screen — the coastline's is in the file that carries
        it and in the readme — so this bar holds the signature alone, set to
        the right where the eye leaves the page.
      */}
      <footer className="mt-12 flex justify-end border-t border-hairline pt-4">
        <MakerSignature locale={locale} />
      </footer>
    </main>
  )
}

/** The index card's id, which the shelf's silhouettes point at. */
function cardId(t: Tradition): string {
  return `rumah-${t.key}`
}

function HouseCard({
  locale,
  tradition,
  plate,
  s,
  frame,
  parts,
  joints,
}: {
  locale: Locale
  tradition: Tradition
  plate: number
  s: Silhouette
  frame: { w: number; h: number }
  parts: number
  joints: number
}) {
  const split = tradition.split
  const share = split.total === 0 ? 0 : Math.round((split.interpolated / split.total) * 100)
  return (
    <li id={cardId(tradition)} className="reveal h-full scroll-mt-20" data-cari={searchText(tradition)}>
      <Link
        href={`${houseHref(locale, tradition.slug)}/`}
        className="press lift flex h-full flex-col rounded border border-hairline bg-sheet hover:border-muted"
      >
        {/* The plate header: catalogue number left, whose house right. */}
        <span className="flex items-baseline justify-between gap-2 border-b border-hairline px-4 py-2">
          <span className="micro text-bolu">
            {pick(COPY.landing.plate, locale)} {plateNo(plate)}
          </span>
          <span className="micro truncate">{tradition.people[locale]}</span>
        </span>
        <span className="block px-4 pt-4">
          <ElevationMark s={s} frame={frame} />
        </span>
        <span className="flex flex-col gap-1 px-4 pb-4 pt-2">
          <span className="font-display text-title text-bolu">{tradition.house[locale]}</span>
          <span className="micro">{tradition.place[locale]}</span>
          <span className="mt-1 font-mono text-meta text-muted">
            {parts} {pick(COPY.landing.parts, locale)} · {joints}{' '}
            {pick(COPY.landing.joints, locale)}
          </span>
        </span>
        {/* The plate foot: each house's own bar, never a merged one. */}
        <span className="mt-auto flex flex-col gap-2 border-t border-hairline px-4 py-3">
          <SplitBar split={split} />
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-meta text-muted">
              {pick(COPY.landing.interpolatedShare, locale).replace('{pct}', String(share))}
            </span>
            <span className="whitespace-nowrap text-body text-bolu underline underline-offset-4">
              {pick(COPY.landing.enter, locale)} <span aria-hidden className="lift-arrow">→</span>
            </span>
          </span>
        </span>
      </Link>
    </li>
  )
}/**
 * The sites, plotted on the archipelago.
 *
 * This was a bare graticule for a long time, and the note here said why: an
 * outline of Indonesia drawn by hand would be an interpolated drawing shown as
 * a measured one, which is the move this project refuses everywhere else. That
 * objection was to *inventing* a coastline, and it survives — what has changed
 * is that the coastline is now somebody's measurement rather than nobody's.
 * `lib/geo/nusantara.ts` is Natural Earth's `ne_10m_land`, clipped to this
 * frame and simplified, generated by a script that is in the repository and
 * credited in the file it writes. It is a file and not a fetch because hard
 * rule 4 says there is no runtime network.
 *
 * Each site is the building itself and nothing else: its silhouette at glyph
 * size, centred on the true coordinates, linked to its front door. The names
 * came off the map because they were the space problem — with text, a third
 * of the labels hung off leaders in the open sea; without it, nearly every
 * glyph stands on its own ground. The name and the site come back on hover or
 * keyboard focus, as a plaque, and they travel with the link's aria-label, so
 * the map is the index and needs no legend.
 *
 * There are no dots and no leaders either: the building is the marker. In
 * the Bali crowd a solver — crowded sites first, rings outward, south
 * preferred — nudges a few glyphs by up to a degree and a half, which is
 * under the width of the glyph itself; the plaque's site name is the precise
 * answer, and the coordinates' real work happens in the solar arithmetic.
 */
function SiteMap({
  locale,
  items,
}: {
  locale: Locale
  items: readonly { t: Tradition; s: Silhouette }[]
}) {
  /*
   * Degrees of the frame, and viewBox units per degree. The frame is the
   * coastline's own — `FRAME` in the generated file — so the land cannot be
   * clipped to one rectangle and drawn in another, which would show the
   * archipelago ending in a straight line somewhere inside the map.
   */
  const S = 30
  const w = (FRAME.east - FRAME.west) * S
  const h = (FRAME.north - FRAME.south) * S
  const x = (lon: number) => (lon - FRAME.west) * S
  const y = (lat: number) => (FRAME.north - lat) * S
  /** two decimals: the data is rounded to a kilometre, so the path may be too */
  const g = (n: number) => Math.round(n * 100) / 100

  /* Marker and plaque geometry, in viewBox units. */
  const GW = 46 // glyph box
  const GH = 32
  const NAME_FS = 16 // plaque name, sans at text weight
  const SITE_FS = 14 // the site line, italic, a step down
  const MARGIN = 6
  const GAP = 4

  interface Box {
    bx: number
    by: number
    bw: number
    bh: number
  }
  const clearOf = (a: Box, b: Box) =>
    a.bx + a.bw + GAP <= b.bx ||
    b.bx + b.bw + GAP <= a.bx ||
    a.by + a.bh + GAP <= b.by ||
    b.by + b.bh + GAP <= a.by

  const anchors = items.map(({ t }) => ({
    ax: x(t.site.longitude),
    ay: y(t.site.latitude),
  }))

  /* The crowded sites choose first; the sparse ones, which have room by
     definition, adapt. Rings prefer south, where the open water is. */
  const density = anchors.map(
    (a) => anchors.filter((b) => Math.hypot(b.ax - a.ax, b.ay - a.ay) < 3 * S).length,
  )
  const placeOrder = anchors
    .map((_, i) => i)
    .sort((a, b) => density[b]! - density[a]! || a - b)
  const bearings = Array.from({ length: 12 }, (_, k) => (k / 12) * 2 * Math.PI).sort(
    (a, b) => Math.sin(b) - Math.sin(a) || a - b,
  )

  const boxes: Box[] = new Array<Box>(items.length)
  const placed: Box[] = []
  for (const i of placeOrder) {
    const { ax, ay } = anchors[i]!
    const bw = GW
    const bh = GH
    /* Centred on its own site first, then rings outward. Glyph-only boxes
       are small enough that almost everything lands on the first try — the
       simulation over the full registry nudges nine, none past a degree and
       a half. */
    const candidates: Box[] = [{ bx: ax - bw / 2, by: ay - bh / 2, bw, bh }]
    for (const r of [26, 42, 62, 86, 114, 146]) {
      for (const a of bearings) {
        candidates.push({
          bx: ax + r * Math.cos(a) - bw / 2,
          by: ay + r * Math.sin(a) - bh / 2,
          bw,
          bh,
        })
      }
    }
    const box =
      candidates.find(
        (c) =>
          c.bx >= MARGIN &&
          c.by >= MARGIN &&
          c.bx + c.bw <= w - MARGIN &&
          c.by + c.bh <= h - MARGIN &&
          placed.every((p) => clearOf(c, p)),
      ) ?? candidates[0]!
    placed.push(box)
    boxes[i] = box
  }

  /*
   * The plaques, one per site, shown on the glyph's hover or focus. They are
   * their own layer after every glyph so an open plaque always paints over
   * its neighbours — svg stacks by document order and has no other z. The
   * pairing is a stylesheet generated from the registry, which is the same
   * move the rest of the page makes: the list is the input, nothing is
   * hand-kept.
   */
  const labels = items.map(({ t, s }, i) => {
    const name = t.house[locale]
    const site = t.site.name
    const box = boxes[i]!
    /* Sans is not measurable the way mono is; 0.58em per character is the
       face's average advance with headroom, and the padding absorbs the
       rest. */
    const tw = Math.max(name.length * NAME_FS * 0.58, site.length * SITE_FS * 0.58) + 24
    const th = 54
    const tx = Math.min(Math.max(box.bx + box.bw / 2 - tw / 2, MARGIN), w - MARGIN - tw)
    const ty = box.by - th - 8 >= MARGIN ? box.by - th - 8 : box.by + box.bh + 8
    return { t, s, name, site, box, tx, ty, tw, th }
  })
  const tipCss = items
    .map(
      ({ t }) =>
        `#peta-${t.key}:hover ~ #peta-tip-${t.key}, #peta-${t.key}:focus ~ #peta-tip-${t.key} { opacity: 1; }`,
    )
    .join('\n')

  return (
    <div className="bleed px-6">
      <MapDoors>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full rounded border border-hairline bg-sheet"
        >
        <style>{tipCss}</style>
        {/*
          The land first, everything else over it. One path for the whole
          archipelago: the rings are separate loops in one `d`, so the browser
          fills them as one shape and the sea between two islands is the page,
          not a colour.
        */}
        <path
          d={COASTLINE.map(
            (ring) =>
              'M' + ring.map(([lon, lat]) => `${g(x(lon))} ${g(y(lat))}`).join('L') + 'Z',
          ).join('')}
          fill="var(--wash)"
          stroke="var(--hairline)"
          vectorEffect="non-scaling-stroke"
          fillRule="evenodd"
          aria-hidden="true"
        />
        {labels.map(({ t, s, name, site, box }) => (
          <a
            key={t.key}
            id={`peta-${t.key}`}
            href={`${BASE}${houseHref(locale, t.slug)}/`}
            aria-label={`${name} — ${site}`}
          >
            {/* The silhouette's thin members are a mean hover target; the
                invisible rect makes the whole box one, padded past the glyph
                so the target clears the pointer floor at page widths the
                glyph itself cannot. Overlaps between neighbouring pads are
                harmless: a wrong first tap only names the wrong house. */}
            <rect
              x={g(box.bx - 8)}
              y={g(box.by - 8)}
              width={box.bw + 16}
              height={box.bh + 16}
              fill="transparent"
            />
            <ElevationGlyph s={s} x={box.bx} y={box.by} w={box.bw} h={box.bh} />
          </a>
        ))}
        {labels.map(({ t, name, site, tx, ty, tw, th }) => (
          <g
            key={`tip-${t.key}`}
            id={`peta-tip-${t.key}`}
            className="pointer-events-none opacity-0 transition-opacity duration-state"
            aria-hidden="true"
          >
            <rect x={g(tx)} y={g(ty)} width={g(tw)} height={th} rx={2} fill="var(--bolu)" />
            {/* The name plainly, the site set off in italic — two kinds of
                fact, told apart the way a caption tells them apart. */}
            <text
              x={g(tx + 12)}
              y={g(ty + 23)}
              fontSize={NAME_FS}
              fontWeight={600}
              className="font-sans"
              fill="var(--kapur)"
            >
              {name}
            </text>
            <text
              x={g(tx + 12)}
              y={g(ty + 42)}
              fontSize={SITE_FS}
              fontStyle="italic"
              className="font-sans"
              fill="var(--muted-on-ink)"
            >
              {site}
            </text>
          </g>
        ))}
        </svg>
      </MapDoors>
    </div>
  )
}
