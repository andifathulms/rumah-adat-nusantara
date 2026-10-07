import { ElevationSheet } from './Elevation'
import { COPY, pick } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { Silhouette } from '@/lib/core/silhouette'

/**
 * What a working route shows before its facade arrives.
 *
 * Everything here is computed at export time and travels as props, so this
 * is also the page's static HTML: a reader on a slow connection — or with
 * JavaScript off — gets whose house this is, its caution, and its elevation
 * at scale, not a blank rectangle. The drawing is the same silhouette the
 * landing and the front door draw, so the first thing the route paints is
 * already the building.
 */
export interface ModelIntro {
  readonly house: string
  readonly place: string
  readonly about: string
  readonly caution: string
  readonly s: Silhouette
}

export function ModelLoading({ locale, intro }: { locale: Locale; intro: ModelIntro }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-10">
      <p className="font-display text-title text-bolu">{intro.house}</p>
      <p className="micro mt-1">{intro.place}</p>
      <div className="mt-5">
        <ElevationSheet s={intro.s} caption={pick(COPY.loading, locale)} />
      </div>
      <p className="mt-4 text-body text-bolu">{intro.about}</p>
      <p className="mt-2 text-body text-muted">{intro.caution}</p>
    </div>
  )
}
