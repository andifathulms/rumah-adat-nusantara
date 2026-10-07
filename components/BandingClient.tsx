'use client'

import { useEffect, useMemo, useState } from 'react'
import { MakerSignature } from '@/components/MakerSignature'
import Link from 'next/link'
import { ElevationShelf } from './Elevation'
import { LocaleSwitch } from './LocaleSwitch'
import { ClassGlosses, SplitBar, SplitLegend } from './split'
import { groupByIsland } from './islands'
import { silhouette } from '@/lib/core/silhouette'
import { COPY, LOCALES, homeHref, houseHref, pick } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { TRADITIONS } from '@/lib/tradition/registry'
import type { Tradition } from '@/lib/tradition/registry'

/**
 * Two buildings in adjacency.
 *
 * The classroom's natural unit of reading is a pair — "compare the tongkonan
 * and the rumah gadang" — and until now the only way to hold one was two
 * windows arranged by hand. This page draws the pair with the same shelf the
 * landing uses, so the same-scale claim comes with the drawing: one ground
 * line, one viewBox, one scale bar. Beneath it, each building's own figures
 * in its own column, and nothing merged — hard rule 7 forbids the morph, not
 * adjacency, and two provenance bars side by side say "never averaged"
 * louder than either says it alone.
 *
 * The pair is the content, so it rides the query string like every other
 * description here: ?a=…&b=…, always written in full, replace not push. The
 * houses are built in the browser at their default rules — the same build
 * the reading route already does client-side — because exporting every pair
 * of a growing collection is quadratic and a page that computes is the
 * thesis anyway.
 */
export function BandingClient({ locale }: { locale: Locale }) {
  const first = TRADITIONS[0]!
  const second = TRADITIONS[1]!
  const [pair, setPair] = useState({ a: first.slug, b: second.slug })
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const find = (slug: string | null) => TRADITIONS.find((t) => t.slug === slug)?.slug
    setPair((prev) => {
      const a = find(p.get('a')) ?? prev.a
      let b = find(p.get('b')) ?? prev.b
      /*
       * A door arriving with only ?a= gets a partner, not a mirror: the
       * front doors pre-fill one side, and a comparison of a building with
       * itself is an honest drawing of nothing.
       */
      if (a === b) b = TRADITIONS.find((t) => t.slug !== a)!.slug
      return { a, b }
    })
    setSettled(true)
  }, [])

  useEffect(() => {
    if (!settled) return
    const search = `a=${pair.a}&b=${pair.b}`
    if (search === window.location.search.replace(/^\?/, '')) return
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${search}${window.location.hash}`,
    )
  }, [pair, settled])

  const sides = useMemo(
    () =>
      [pair.a, pair.b].map((slug) => {
        const t = TRADITIONS.find((x) => x.slug === slug) ?? first
        const b = t.build(t.defaultQuery)
        return { t, b, s: silhouette(b.house, b.scene.ridgeAxis ?? 0) }
      }),
    [pair.a, pair.b, first],
  )

  const groups = useMemo(() => groupByIsland(TRADITIONS.map((t) => ({ t }))), [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-10">
      <header className="flex items-baseline justify-between gap-3">
        <nav className="micro flex min-w-0 items-baseline gap-2 text-bolu">
          <Link href={`${homeHref(locale)}/`} className="shrink-0 underline underline-offset-4">
            {pick(COPY.appName, locale)}
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="truncate">
            {pick(COPY.banding.title, locale)}
          </span>
        </nav>
        <LocaleSwitch
          locale={locale}
          targets={
            Object.fromEntries(LOCALES.map((l) => [l, `/${l}/banding/`])) as Record<
              typeof locale,
              string
            >
          }
        />
      </header>

      <h1 className="mt-10 max-w-3xl font-display text-display text-bolu">
        {pick(COPY.banding.heading, locale)}
      </h1>
      <p className="mt-4 max-w-2xl text-body text-muted">{pick(COPY.banding.lede, locale)}</p>

      {/*
        The pickers, grouped by island like the index, so the two lists a
        reader chooses houses from cannot disagree about where a house is
        filed. Native selects: thirty-five options is exactly the job the
        control was built for.
      */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(['a', 'b'] as const).map((side) => (
          <div key={side}>
            <label htmlFor={`pilih-${side}`} className="micro">
              {pick(side === 'a' ? COPY.banding.first : COPY.banding.second, locale)}
            </label>
            <select
              id={`pilih-${side}`}
              value={pair[side]}
              onChange={(e) => setPair((prev) => ({ ...prev, [side]: e.target.value }))}
              className="mt-2 w-full rounded border border-hairline bg-sheet px-2 py-2 text-body text-bolu"
            >
              {groups.map((group) => (
                <optgroup key={group.island.id} label={group.island[locale]}>
                  {group.items.map(({ t }) => (
                    <option key={t.key} value={t.slug}>
                      {t.house[locale]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <ElevationShelf
          caption={pick(COPY.landing.shelfCaption, locale)}
          items={sides.map(({ t, s }, i) => ({
            // Both sides may hold the same building; the drawing then shows
            // it twice at one scale, which is at least an honest answer.
            key: `${i}-${t.key}`,
            href: `${houseHref(locale, t.slug)}/`,
            label: t.house[locale],
            s,
          }))}
        />
      </div>

      <div className="mt-6">
        <SplitLegend locale={locale} />
        <ClassGlosses locale={locale} />
      </div>

      {/*
        Each building's own column: name as its door, the generator's own
        figures, and its own provenance bar. Two columns even on a phone —
        side by side is the point, and the figures are short.
      */}
      <div className="mt-4 grid grid-cols-2 gap-4 sheet:gap-8">
        {sides.map(({ t, b }, i) => {
          const split = t.split
          const share =
            split.total === 0 ? 0 : Math.round((split.interpolated / split.total) * 100)
          return (
            <section key={`${i}-${t.key}`} className="flex min-w-0 flex-col">
              <Link
                href={`${houseHref(locale, t.slug)}/`}
                className="font-display text-title text-bolu underline-offset-4 hover:underline"
              >
                {t.house[locale]}
              </Link>
              <p className="micro mt-1">
                {t.people[locale]} · {t.place[locale]}
              </p>
              <dl className="mt-4 flex flex-col gap-1">
                {b.readout.map((row) => (
                  // Wraps rather than crushes: on the narrowest screens the
                  // figure drops under its label and stays whole.
                  <div
                    key={row.label.en}
                    className="flex flex-wrap items-baseline justify-between gap-x-3"
                  >
                    <dt className="text-meta text-muted">{row.label[locale]}</dt>
                    <dd className="num ml-auto whitespace-nowrap text-meta text-bolu">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto pt-4">
                <SplitBar split={split} />
                <p className="mt-2 font-mono text-meta text-muted">
                  {pick(COPY.landing.interpolatedShare, locale).replace('{pct}', String(share))}
                </p>
              </div>
            </section>
          )
        })}
      </div>

      {/*
        One seam at the foot of the page, carrying both things on it: the note
        about the figures on the left, the maker's mark opposite. A second
        rule under the first would read as two footers, and the note is not a
        credit — it is a warning about the numbers above it.
      */}
      <footer className="mt-8 flex flex-col gap-4 border-t border-hairline pt-4 sheet:flex-row sheet:items-start sheet:justify-between">
        <p className="max-w-2xl text-body text-muted">{pick(COPY.tradition.note, locale)}</p>
        <MakerSignature locale={locale} className="shrink-0" />
      </footer>
    </main>
  )
}
