import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { COPY, DEFAULT_LOCALE, pick } from '@/lib/i18n'

/**
 * What the app is called when it is not in a browser tab.
 *
 * It is a file under public/ rather than an app/manifest.ts, and generated
 * here rather than written by hand, for two reasons that pull in opposite
 * directions. Next's manifest file convention emits its <link> without the
 * base path — correct in dev, a 404 on Pages, where the site lives at a
 * subpath — so the manifest has to be a static asset the metadata points at.
 * But a static asset cannot read COPY, and a name and a tagline written down
 * twice are a name and a tagline that will disagree.
 *
 * Every URL in it is relative, so it resolves against wherever the manifest
 * itself is served from and the file is the same at any base path. That is
 * the one thing to preserve when editing: an absolute path here is a path
 * that is right on exactly one host.
 *
 * To regenerate after a copy change:
 *   WRITE_MANIFEST=1 pnpm vitest run test/manifest.test.ts
 */
function manifestJson(): string {
  const name = pick(COPY.appName, DEFAULT_LOCALE)
  return (
    JSON.stringify(
      {
        name,
        short_name: name,
        description: pick(COPY.tagline, DEFAULT_LOCALE),
        lang: DEFAULT_LOCALE,
        start_url: `${DEFAULT_LOCALE}/`,
        scope: './',
        display: 'standalone',
        // The film, the colour the browser chrome is asked to take by day.
        background_color: '#DDD8CA',
        theme_color: '#DDD8CA',
        icons: [
          { src: 'brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          // No rounded corners and a 20% safe-area inset, so a launcher may cut
          // it to whatever shape it likes without taking a post off with it.
          {
            src: 'brand/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      null,
      2,
    ) + '\n'
  )
}

test('the committed manifest is what the copy says', () => {
  const json = manifestJson()
  if (process.env.WRITE_MANIFEST) writeFileSync('public/manifest.webmanifest', json)
  expect(readFileSync('public/manifest.webmanifest', 'utf8')).toBe(json)
})

test('every url in the manifest is relative, so the base path cannot be wrong', () => {
  const m = JSON.parse(manifestJson())
  const urls = [m.start_url, m.scope, ...m.icons.map((i: { src: string }) => i.src)]
  for (const u of urls) expect(u.startsWith('/')).toBe(false)
})
