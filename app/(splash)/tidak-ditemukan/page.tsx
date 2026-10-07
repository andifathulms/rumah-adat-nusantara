import type { Metadata } from 'next'
import Link from 'next/link'
import { ElevationShelf } from '@/components/Elevation'
import { silhouette } from '@/lib/core/silhouette'
import { COPY, LOCALES, LOCALE_NAMES, homeHref, houseHref, pick } from '@/lib/i18n'
import { TRADITIONS } from '@/lib/tradition/registry'
import { MakerSignature } from '@/components/MakerSignature'

export const metadata: Metadata = {
  title: `404 — ${pick(COPY.appName, 'id')}`,
  robots: { index: false },
}

/**
 * The 404, built as a real page.
 *
 * A static export has no runtime router: a wrong address never reaches the
 * app, it reaches the host, and the host serves one file. Next cannot build
 * that file from a root not-found here — the two root layouts exist so each
 * half of the site can declare its own language, and a not-found above them
 * would have neither — so this is an ordinary page in the splash half, and
 * the build script copies its output over 404.html.
 *
 * Like the splash it belongs to no locale and says everything twice. The
 * shelf is the wayfinding: every house, drawn, each a door.
 */
export default function NotFound() {
  const built = TRADITIONS.map((t) => {
    const b = t.build(t.defaultQuery)
    return { t, s: silhouette(b.house, b.scene.ridgeAxis ?? 0) }
  })
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="micro text-bolu">{pick(COPY.appName, 'id')}</p>
      <div>
        <p className="font-mono text-display text-bolu" aria-hidden>
          404
        </p>
        <h1 lang="id" className="mt-2 font-display text-title text-bolu">
          {pick(COPY.notFound.heading, 'id')}
        </h1>
        <p lang="en" className="mt-1 text-body text-muted">
          {pick(COPY.notFound.heading, 'en')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p lang="id" className="text-body text-bolu">
          {pick(COPY.notFound.line, 'id')}
        </p>
        <p lang="en" className="text-body text-muted">
          {pick(COPY.notFound.line, 'en')}
        </p>
      </div>
      <nav className="flex flex-col gap-2">
        {LOCALES.map((l) => (
          <Link
            key={l}
            lang={l}
            hrefLang={l}
            href={`${homeHref(l)}/`}
            className="text-body text-bolu underline underline-offset-4"
          >
            {pick(COPY.openIn, l)} <span aria-hidden>→</span>
            <span className="sr-only"> — {LOCALE_NAMES[l]}</span>
          </Link>
        ))}
      </nav>
      <ElevationShelf
        caption={pick(COPY.landing.shelfCaption, 'id')}
        items={built.map(({ t, s }) => ({
          key: t.key,
          href: `${houseHref('id', t.slug)}/`,
          label: t.house.id,
          s,
        }))}
      />
      <footer className="mt-2 border-t border-hairline pt-4">
        <MakerSignature locale="id" />
      </footer>
    </main>
  )
}
