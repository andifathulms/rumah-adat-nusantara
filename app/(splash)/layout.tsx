import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { fontVariables } from '@/app/fonts'
import { BASE_PATH, COPY, DEFAULT_LOCALE, SITE_ORIGIN, pick } from '@/lib/i18n'

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_ORIGIN}${BASE_PATH}/`),
  // The one place the old name survived the rename.
  title: pick(COPY.appName, DEFAULT_LOCALE),
  /*
    Written out with the base path in it. Next applies the base path to the
    icons it generates but not to the manifest link, so the emitted href was
    /manifest.webmanifest — correct in dev and a 404 on Pages, where the site
    lives at a subpath.
  */
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  /*
    Every other page's share card is a computed drawing of the house it is
    about. This page is about no house — it is the door with both languages
    on it — so it takes the collection's own card instead. It is the only
    picture on the site that is drawn rather than generated, and it is here
    because there is nothing here to generate.
  */
  openGraph: {
    type: 'website',
    title: pick(COPY.appName, DEFAULT_LOCALE),
    description: pick(COPY.tagline, DEFAULT_LOCALE),
    images: [{ url: 'brand/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pick(COPY.appName, DEFAULT_LOCALE),
    description: pick(COPY.tagline, DEFAULT_LOCALE),
    images: [{ url: 'brand/og.png', width: 1200, height: 630 }],
  },
}

export const viewport: Viewport = {
  // The film by day, the soot by night — the browser chrome joins the page.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#DDD8CA' },
    { media: '(prefers-color-scheme: dark)', color: '#12100A' },
  ],
  width: 'device-width',
  initialScale: 1,
}

/**
 * The root splash, which belongs to no locale.
 *
 * A second root layout, so the localised half of the site can declare its own
 * language on <html> rather than inheriting one. This half is Indonesian
 * because the splash leads with Indonesian and offers English beside it.
 */
export default function SplashLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
