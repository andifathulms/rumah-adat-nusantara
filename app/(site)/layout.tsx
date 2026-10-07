import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { BASE_PATH, SITE_ORIGIN } from '@/lib/i18n'

/*
 * Only what is genuinely shared. Every route generates its own title,
 * description, canonical and share card from its own on-page copy, so nothing
 * here may restate them — a description written once at the root is a
 * description that describes one page and mislabels the other seven.
 */
export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_ORIGIN}${BASE_PATH}/`),
  title: { default: 'Rumah Adat Nusantara', template: '%s' },
  /*
    Written out with the base path in it. Next applies the base path to the
    icons it generates but not to the manifest link, so the emitted href was
    /manifest.webmanifest — correct in dev and a 404 on Pages, where the site
    lives at a subpath.
  */
  manifest: `${BASE_PATH}/manifest.webmanifest`,
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
 * The localised half of the site.
 *
 * This is a root layout in its own right — one of two — because <html lang>
 * has to be the page's actual language and the locale is only known inside
 * the [locale] segment. A single shared root could only ever hardcode one of
 * them, which is what it did: every English page declared lang="id" and
 * corrected it on an inner div, so the document language was wrong on half
 * the site.
 *
 * The lang attribute is set by the layout directly below this one, where the
 * locale is a parameter.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children
}
