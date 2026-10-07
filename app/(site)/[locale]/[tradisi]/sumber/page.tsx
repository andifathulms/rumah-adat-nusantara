import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RailSection, Sheet } from '@/components/Sheet'
import { ProvenanceStrip, ProvenanceTag } from '@/components/Provenance'
import { ClassFilter } from '@/components/ClassFilter'
import { COPY, DEFAULT_LOCALE, isLocale, pick, routeMetadata } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { isTraditionKey, tradition } from '@/lib/tradition/registry'
import type { Readout, Tradition } from '@/lib/tradition/registry'
import { PERTURBATION, sensitivityOf } from '@/lib/core/sensitivity'
import type { Sensitivity } from '@/lib/core/sensitivity'
import { summarise } from '@/lib/core/invariants'
import type { CheckResult } from '@/lib/core/invariants'
import type { Kinds } from '@/lib/core/kinds'
import type { Dim } from '@/lib/core/types'
import { compareDimension } from '@/lib/draw/compare'

export function generateMetadata({
  params,
}: {
  params: { locale: string; tradisi: string }
}): Metadata {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE
  const t = tradition(isTraditionKey(params.tradisi) ? params.tradisi : 'toraja')
  return routeMetadata('sumber', locale, { slug: t.slug, house: t.house[locale] })
}

/**
 * The honesty layer, given its own room.
 *
 * Deliberately a server component with no interactivity: this page is a
 * document, it renders to static HTML at build time, and it can be read with
 * JavaScript switched off. The whole point of it is that the claims are
 * checkable, and a table that needs a runtime to appear is a worse table.
 */
export default function Sumber({ params }: { params: { locale: string; tradisi: string } }) {
  if (!isLocale(params.locale) || !isTraditionKey(params.tradisi)) notFound()
  const locale: Locale = params.locale
  const t0: Tradition = tradition(params.tradisi)

  const built = t0.build(t0.defaultQuery)
  const results = built.checks
  const totals = summarise(results)
  // One rebuild per declared dimension, run once at build time. This page is
  // static HTML by the time anyone reads it, so the cost is paid by the build
  // and never by a reader.
  const sensitivity = t0.sensitivity()
  /*
   * The largest shift any one dimension causes when it is out by the probe's
   * share. Each row's bar is a fraction of this, so the bars compare the
   * dimensions of this house with each other — never with another house's.
   */
  const worstShift = Math.max(
    0,
    ...t0.dims.map(({ key }) => sensitivityOf(sensitivity, key)?.worst ?? 0),
  )
  const pct = Math.round(PERTURBATION * 100)
  // Also build time. The broken house exists for the length of one check and
  // is never rendered — this page is the only route that ever sees it, and it
  // sees it as two numbers and a verdict.
  const counter = t0.counterexample()
  /*
    One figure, for the dimension that matters most. The table says what moves
    in metres; this is the only place the reader can see it move.

    Drawn for the tongkonan only: `lib/draw/` reads that house's Layout
    directly, and a comparison sheet is a projection problem rather than a
    threading one. The section is absent for the other house rather than
    wrong, and the gap is recorded.
  */
  const worst = sensitivity.find((x) => x.worst > 0)
  const comparison =
    t0.key === 'toraja' && worst
      ? // Narrowed here rather than in the drawing layer: the key is a plain
        // string by the time it comes back through the registry, and only
        // this branch knows it came out of the Toraja pack.
        compareDimension(worst.dim as Parameters<typeof compareDimension>[0], 1 + PERTURBATION)
      : null

  return (
    <Sheet
      locale={locale}
      route="sumber"
      tradition={t0}
      variant="document"
      rail={
        <>
          <RailSection title={pick(COPY.provenance.heading, locale)}>
            <ProvenanceStrip split={built.split} locale={locale} />
          </RailSection>
          <RailSection title={pick(COPY.checks.heading, locale)}>
            <p className="mb-3 text-body text-muted">
              {pick(COPY.checks.line, locale)}
            </p>
            <dl className="flex flex-col gap-1">
              <Tally label={pick(COPY.checks.pass, locale)} value={totals.passed} />
              <Tally label={pick(COPY.checks.fail, locale)} value={totals.failed} />
              <Tally label={pick(COPY.checks.skip, locale)} value={totals.skipped} />
            </dl>
          </RailSection>
        </>
      }
    >
      <div className="sheet:h-full sheet:overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-8 sheet:px-8">
          {/*
            The route's h1 lives in the sheet, where every route has one. This
            is the same words drawn — a second h1 saying "Sources" underneath
            the first would be the page announcing itself twice.
          */}
          <p className="font-display text-display text-bolu" aria-hidden>
            {pick(COPY.sources.heading, locale)}
          </p>
          <p className="mt-2 max-w-prose text-body">{pick(COPY.sources.intro, locale)}</p>

          {/*
            Order serves the stated first reader: a student comes for the
            citations, so the dimensions and the bibliography stand before
            the sensitivity probes and the counterexample, which are the
            researcher's rooms of this document.
          */}
          <hr className="rule mb-7 mt-12" />

          <h2 className="font-display text-title text-bolu">
            {pick(COPY.sources.tableHeading, locale)}
          </h2>
          <ClassFilter
            labels={{
              measured: pick(COPY.provenance.measured, locale),
              canon: pick(COPY.provenance.canon, locale),
              interpolated: pick(COPY.provenance.interpolated, locale),
            }}
            all={pick(COPY.sources.filterAll, locale)}
            groupLabel={pick(COPY.sources.filterGroup, locale)}
          >
          <div className="reveal mt-4 overflow-x-auto rounded border border-hairline bg-sheet">
            <table className="w-full min-w-table border-collapse text-left">
              <thead>
                <tr className="border-b border-muted">
                  <Th>{pick(COPY.sources.dimension, locale)}</Th>
                  <Th right>{pick(COPY.sources.value, locale)}</Th>
                  <Th>{pick(COPY.sources.klass, locale)}</Th>
                  <Th>{pick(COPY.sources.citation, locale)}</Th>
                </tr>
              </thead>
              <tbody>
                {t0.dims.map(({ key, dim }) => {
                  return (
                    <tr key={key} data-kelas={dim.class} className="border-b border-hairline align-top last:border-b-0">
                      {/*
                        What the number is, in words, leads the row: the
                        stated first reader is a student, and `bayLength`
                        is the repository's name for it, not theirs. The
                        key stays under it, small, for anyone citing the
                        code.
                      */}
                      <td className="py-3 pl-4 pr-4">
                        <span className="block text-meta font-medium leading-snug text-bolu">
                          {locale === 'id' ? dim.note : dim.noteEn}
                        </span>
                        <span className="mt-1 block font-mono text-micro text-muted">{key}</span>
                      </td>
                      <td className="num whitespace-nowrap py-3 pr-4 text-meta">
                        {formatValue(dim)}
                        {/*
                          Kept inside the value cell rather than given a fifth
                          column: the table is already wide enough to scroll on
                          a phone, and this belongs beside the number it is
                          about.
                        */}
                        <IfWrong
                          s={sensitivityOf(sensitivity, key)}
                          label={t0.probeLabel}
                          pct={pct}
                          worst={worstShift}
                          locale={locale}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <ProvenanceTag klass={dim.class} locale={locale} />
                      </td>
                      <td className="py-3 pr-4 text-meta leading-snug text-muted">
                        {dim.source === 'none'
                          ? pick(COPY.sources.none, locale)
                          : (t0.sources.find((x) => x.key === dim.source)?.citation ?? dim.source)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </ClassFilter>

          <hr className="rule mb-7 mt-12" />

          <h2 className="font-display text-title text-bolu">
            {pick(COPY.sources.sourceHeading, locale)}
          </h2>
          <ul className="reveal mt-4 flex flex-col gap-4">
            {t0.sources.filter((s) => s.key !== 'none').map((s) => (
              <li key={s.key}>
                <p className="micro">
                  {s.key} · {s.kind}
                </p>
                <p className="mt-1 max-w-prose text-body leading-snug">{s.citation}</p>
              </li>
            ))}
          </ul>

          <hr className="rule mb-7 mt-12" />

          <h2 className="font-display text-title text-bolu">
            {pick(COPY.sources.sensitivityHeading, locale)}
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            {fill(pick(COPY.sources.sensitivityIntro, locale), { pct })}
          </p>
          <ol className="reveal mt-5 flex flex-col">
            {sensitivity
              .filter((s) => s.worst > 0)
              .slice(0, 8)
              .map((s, i) => (
                <li
                  key={s.dim}
                  className="flex items-baseline gap-x-3 border-t border-hairline py-2.5"
                >
                  {/*
                    The rank is a column of its own, so the wrapped probe label
                    aligns under the dimension by layout rather than by a
                    padding that has to re-derive the column's width.
                  */}
                  <span className="num w-10 shrink-0 text-meta text-muted">{i + 1}</span>
                  <span className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-meta">{s.dim}</span>
                    <span className="num ml-auto whitespace-nowrap text-body">
                      {s.worst.toFixed(2)} m
                    </span>
                    <span className="w-full text-meta text-muted sheet:w-auto">
                      {t0.probeLabel(s.worstProbe)[locale]}
                    </span>
                  </span>
                </li>
              ))}
          </ol>
          <p className="mt-3 max-w-prose text-body text-muted">
            {pick(COPY.sources.measureFirst, locale)}{' '}
            {fill(pick(COPY.sources.sensitivityCaveat, locale), { pct })}
          </p>

          {comparison && worst ? (
            <figure className="reveal mt-6">
              <h3 className="micro">{pick(COPY.sources.compareHeading, locale)}</h3>
              <div
                className="mt-3 rounded border border-hairline p-3"
                /* Built at build time from our own generator; there is no user
                   input anywhere near this string. */
                dangerouslySetInnerHTML={{ __html: comparison.svg }}
              />
              <figcaption className="mt-2 max-w-prose text-body text-muted">
                {fill(pick(COPY.sources.compareCaption, locale), {
                  dim: worst.dim,
                  from: comparison.from.toFixed(2),
                  to: comparison.to.toFixed(2),
                  pct,
                })}
              </figcaption>
            </figure>
          ) : null}

          <hr className="rule mb-7 mt-12" />

          <h2 className="font-display text-title text-bolu">
            {pick(COPY.checks.heading, locale)}
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            {pick(COPY.checks.line, locale)}
          </p>
          <ul className="reveal mt-4 flex flex-col">
            {results.map((r) => (
              /*
                The chip is a column, so the detail line aligns under the title
                whatever the verdict word's width is — the old padding was a
                guess at the widest chip and drifted per locale.
              */
              <li key={r.key} className="flex items-baseline gap-3 border-b border-hairline py-3">
                <CheckChip status={r.status} locale={locale} />
                <div>
                  <span className="text-body leading-snug">
                    {locale === 'id' ? r.titleId : r.titleEn}
                  </span>
                  <p className="mt-1 text-body text-muted">
                    {locale === 'id' ? r.detail : r.detailEn}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <hr className="rule mb-7 mt-12" />

          <h2 className="font-display text-title text-bolu">
            {pick(COPY.checks.counterHeading, locale)}
          </h2>
          <p className="mt-2 max-w-prose text-body text-muted">
            {pick(COPY.checks.counterIntro, locale)}
          </p>
          <p className="mt-3 max-w-prose text-body">{counter.why[locale]}</p>

          <div className="reveal mt-5 grid gap-px overflow-hidden rounded border border-hairline bg-hairline sheet:grid-cols-2">
            <CounterCase
              title={pick(COPY.checks.counterSound, locale)}
              result={counter.sound}
              rows={counter.witness.sound}
              locale={locale}
            />
            <CounterCase
              title={fill(pick(COPY.checks.counterBroken, locale), {
                value: Number(counter.value.toFixed(2)),
              })}
              result={counter.broken}
              rows={counter.witness.broken}
              locale={locale}
            />
          </div>
          <p className="mt-3 max-w-prose text-body text-muted">
            {pick(COPY.checks.counterNote, locale)}
          </p>

          <hr className="rule mb-7 mt-12" />

          <p className="max-w-prose text-body text-muted">
            {pick(COPY.provenance.line, locale)}
          </p>
        </div>
      </div>
    </Sheet>
  )
}

function formatValue(dim: Dim): string {
  if (dim.unit === 'count') return String(dim.value)
  if (dim.unit === 'ratio') return dim.value.toFixed(2)
  if (dim.unit === 'deg') return `${dim.value}°`
  return `${dim.value.toFixed(2)} m`
}

/**
 * A column header.
 *
 * scope is what ties 34 rows of four cells to the words above them. No
 * caption: the h2 directly above the table already names it, and a caption
 * would be the same words announced a second time.
 */
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={`micro pb-2 pr-4 pt-3 font-normal first:pl-4 ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="micro">{label}</dt>
      <dd className="num text-meta">{value}</dd>
    </div>
  )
}

/**
 * A check's verdict, as a chip.
 *
 * One definition rather than two inline copies in raw custom properties: the
 * list of invariants and the counterexample beside it were drifting apart
 * already — the second had no skip case at all. Colours come from the token
 * classes, so the next change to the palette reaches both.
 *
 * Contrast, on the film: kapur on bolu 14.24:1, kapur on rara 5.85:1, on-riri
 * on riri 6.55:1. The skip chip uses --on-riri rather than --bolu because
 * riri is the one pigment that keeps its value after dark — ink that followed
 * --bolu would go light at night and land at 2.3:1 on the same fill.
 */
function CheckChip({ status, locale }: { status: CheckResult['status']; locale: Locale }) {
  const face =
    status === 'fail'
      ? 'bg-rara text-kapur'
      : status === 'skip'
        ? 'bg-riri text-on-riri'
        : 'bg-bolu text-kapur'
  const label =
    status === 'fail'
      ? COPY.checks.fail
      : status === 'skip'
        ? COPY.checks.skip
        : COPY.checks.pass
  return (
    <span className={`micro shrink-0 rounded px-1.5 py-0.5 ${face}`}>
      {pick(label, locale)}
    </span>
  )
}

/** How far the house moves if this one number is out. Computed, not claimed. */
function IfWrong({
  s,
  pct,
  worst,
  locale,
}: {
  s: Sensitivity<Kinds> | undefined
  label: (key: string) => { id: string; en: string }
  pct: number
  /** the largest shift in this house's table, which a full bar stands for */
  worst: number
  locale: Locale
}) {
  if (!s) return null
  return (
    <>
    {/*
      The same figure as a length, so the guesses that matter are visible
      down the column before anyone reads a number. Rara, because every row
      that moves the house is a number the house depends on, and the bar is
      the size of that dependence.
    */}
    {s.worst > 0 && worst > 0 ? (
      <span className="mt-1.5 ml-auto block h-1 rounded bg-hairline" aria-hidden>
        <span
          className="block h-1 rounded bg-rara"
          style={{ width: `${Math.max(4, (s.worst / worst) * 100)}%` }}
        />
      </span>
    ) : null}
    {/*
      `num`, because this is a measurement and DESIGN.md says every number is
      mono. `text-micro` alone carries the size and the tracking but not the
      family, so this was the one figure in the app set in letter-spaced sans,
      directly beneath a tabular one. Not `.micro` either: that uppercases,
      and a unit is not a label — it would render "1.80 M".
    */}
    <span className="num mt-1 block text-micro text-muted">
      {s.worst > 0
        ? `${fill(pick(COPY.sources.ifWrong, locale), { pct })}: ${s.worst.toFixed(2)} m`
        : pick(COPY.sources.sensitivityNone, locale)}
    </span>
    </>
  )
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole))
}

/** One house, one verdict. The status word is the check's, not the page's. */
function CounterCase({
  title,
  result,
  rows,
  locale,
}: {
  title: string
  result: CheckResult
  /**
   * The numbers the check is comparing, already labelled by the tradition.
   * They used to be a prow height and a prow height, which is one house's
   * answer to a question every house has: what two figures is this verdict
   * about.
   */
  rows: readonly Readout[]
  locale: Locale
}) {
  return (
    <div className="bg-film p-4">
      <p className="micro">{title}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <CheckChip status={result.status} locale={locale} />
        <span className="num text-body">{rows.map((r) => r.value).join(' / ')}</span>
        <span className="text-meta text-muted">
          {rows.map((r) => r.label[locale]).join(' · ')}
        </span>
      </div>
      <p className="mt-2 text-meta text-muted">
        {locale === 'id' ? result.detail : result.detailEn}
      </p>
    </div>
  )
}
