import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MakerSignature } from '@/components/MakerSignature'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { ElevationSheet } from '@/components/Elevation'
import { RouteIcon } from '@/components/RouteIcon'
import { SplitBar, SplitLegend } from '@/components/split'
import { silhouette } from '@/lib/core/silhouette'
import {
  COPY,
  DEFAULT_LOCALE,
  LOCALES,
  ROUTES,
  homeHref,
  houseHref,
  houseMetadata,
  href,
  isLocale,
  latLabel,
  pick,
  plateNo,
} from '@/lib/i18n'
import { TRADITION_KEYS, isTraditionKey, tradition } from '@/lib/tradition/registry'

export function generateMetadata({
  params,
}: {
  params: { locale: string; tradisi: string }
}): Metadata {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE
  const t = tradition(isTraditionKey(params.tradisi) ? params.tradisi : 'toraja')
  return houseMetadata(locale, {
    slug: t.slug,
    house: t.house[locale],
    place: t.place[locale],
  })
}

/**
 * One house's front door.
 *
 * The four routes open straight onto a working drawing, which is the right
 * place to land from within the site and a poor one to land from outside it:
 * every word saying whose house this is sits down a rail, after the controls.
 * This page is those words first — whose house, where it stands, which way it
 * must face, and how much of it the author invented — with the four routes
 * as described doors rather than four bare nouns.
 *
 * The house is built here, at export time, for the drawing and the figures:
 * the elevation is the default house's own parts projected and traced, and
 * the readouts are the generator's outputs, so neither can drift from the
 * model the routes open onto.
 */
export default function House({ params }: { params: { locale: string; tradisi: string } }) {
  if (!isLocale(params.locale) || !isTraditionKey(params.tradisi)) notFound()
  const locale = params.locale
  const t = tradition(params.tradisi)
  const b = t.build(t.defaultQuery)
  const s = silhouette(b.house, b.scene.ridgeAxis ?? 0)
  const plate = TRADITION_KEYS.indexOf(t.key) + 1

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10">
      <header className="flex items-baseline justify-between gap-3">
        <nav className="micro flex min-w-0 items-baseline gap-2 text-bolu">
          <Link href={`${homeHref(locale)}/`} className="shrink-0 underline underline-offset-4">
            {pick(COPY.appName, locale)}
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="truncate">
            {t.house[locale]}
          </span>
        </nav>
        <LocaleSwitch
          locale={locale}
          targets={
            Object.fromEntries(
              LOCALES.map((l) => [l, `${houseHref(l, t.slug)}/`]),
            ) as Record<typeof locale, string>
          }
        />
      </header>

      <h1 className="mt-8 font-display text-display text-bolu">{t.house[locale]}</h1>
      <p className="micro mt-3">
        {t.people[locale]} · {t.place[locale]}
      </p>

      {/*
        The house's sheet, framed the way a working drawing is framed: a
        title-block band of stamps, the elevation, and the generator's own
        readouts as the sheet's foot. Everything inside the frame is computed
        from the same build — the drawing cannot disagree with the figures.
      */}
      <figure className="mt-6 rounded border border-muted bg-sheet">
        <div className="grid grid-cols-2 divide-x divide-hairline border-b border-hairline sm:grid-cols-4">
          <p className="micro px-4 py-2 text-bolu">
            {pick(COPY.landing.plate, locale)} {plateNo(plate)}
          </p>
          <p className="micro truncate px-4 py-2">{t.people[locale]}</p>
          <p className="micro truncate border-t border-hairline px-4 py-2 sm:border-t-0">
            {t.site.name} · {latLabel(t.site.latitude, locale)}
          </p>
          <p className="micro truncate border-t border-hairline px-4 py-2 sm:border-t-0">
            {pick(COPY.computed, locale)}
          </p>
        </div>
        <ElevationSheet
          s={s}
          caption={pick(COPY.landing.elevationCaption, locale)}
          frameless
          dimensions={{
            format: (m) =>
              `${m.toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} m`,
            legend: pick(COPY.landing.dimensionLegend, locale),
          }}
        />
        {/*
          The generator's own figures for the default house. Mono,
          right-aligned, with their units — outputs of the same run the
          drawing above traces.
        */}
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1 border-t border-hairline px-4 py-3 sm:grid-cols-2">
          {b.readout.map((r) => (
            <div key={r.label.en} className="flex items-baseline justify-between gap-4">
              <dt className="micro">{r.label[locale]}</dt>
              <dd className="num text-meta text-bolu">{r.value}</dd>
            </div>
          ))}
        </dl>
      </figure>

      <p className="mt-6 max-w-2xl text-body text-bolu">{t.about[locale]}</p>
      <p className="mt-3 max-w-2xl text-body text-muted">{t.caution[locale]}</p>

      <hr className="rule my-8" />

      <section>
        <h2 className="mb-3 font-display text-title text-bolu">{pick(COPY.orientation.heading, locale)}</h2>
        <p className="text-body text-bolu">{t.orientation[locale]}</p>
      </section>

      <hr className="rule my-8" />

      <section>
        <h2 className="mb-3 font-display text-title text-bolu">{pick(COPY.provenance.heading, locale)}</h2>
        <SplitBar split={t.split} className="h-2" />
        <div className="mt-3">
          <SplitLegend locale={locale} split={t.split} />
        </div>
        <p className="mt-3 text-body text-muted">{pick(COPY.provenance.line, locale)}</p>
      </section>

      <hr className="rule my-8" />

      <section>
        <h2 className="mb-4 font-display text-title text-bolu">{pick(COPY.landing.doorsHeading, locale)}</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/*
            The first door is the one the whole project is for — change a
            rule, watch the house answer — so it is drawn as the primary
            control, in soot, and spans the row. The others are equal
            readings of the same house.
          */}
          {ROUTES.map((r, i) => (
            <li key={r} className={i === 0 ? 'h-full sm:col-span-2' : 'h-full'}>
              <Link
                href={`${href(locale, t.slug, r)}/`}
                className={[
                  'press lift flex h-full items-center gap-4 rounded border px-4 py-4',
                  i === 0
                    ? 'border-bolu bg-bolu text-kapur'
                    : 'border-hairline bg-sheet text-bolu hover:border-muted',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-12 w-12 shrink-0 place-items-center rounded border',
                    i === 0 ? 'border-muted-on-ink' : 'border-hairline bg-film',
                  ].join(' ')}
                >
                  <RouteIcon route={r} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-title leading-tight">{pick(COPY.nav[r], locale)}</span>
                  <span className={i === 0 ? 'text-body text-muted-on-ink' : 'text-body text-muted'}>
                    {pick(COPY.navGloss[r], locale)}
                  </span>
                </span>
                <span aria-hidden className="lift-arrow text-lead">→</span>
              </Link>
            </li>
          ))}
          {/*
            The fifth door, and the one that leads out of the house: the
            comparison, pre-filled with this building on the left. It sits
            with the doors because comparing is a way of reading this house,
            even though the page it opens holds two.
          */}
          <li className="h-full">
            <Link
              href={`/${locale}/banding/?a=${t.slug}`}
              className="press lift flex h-full items-center gap-4 rounded border border-dashed border-muted px-4 py-4 text-bolu"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded border border-hairline bg-film">
                <RouteIcon route="banding" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-title leading-tight">{pick(COPY.banding.title, locale)}</span>
                <span className="text-body text-muted">{pick(COPY.banding.doorGloss, locale)}</span>
              </span>
              <span aria-hidden className="lift-arrow text-lead">→</span>
            </Link>
          </li>
        </ul>
      </section>

      {/*
        One seam, two things on it: the way back up on the left, the maker's
        mark opposite. They stack on a phone, in that order — the navigation
        is what somebody came to the bottom of the page for.
      */}
      <footer className="mt-8 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`${homeHref(locale)}/`} className="micro text-bolu underline underline-offset-4">
          <span aria-hidden>← </span>
          {pick(COPY.tradition.all, locale)}
        </Link>
        <MakerSignature locale={locale} />
      </footer>
    </main>
  )
}
