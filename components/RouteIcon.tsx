import type { Route } from '@/lib/i18n'

/*
 * One mark per way of reading a house, drawn in the same hand as the maker's
 * marks: a 24-unit square, a single stroke weight, round ends, no fill. They
 * are glosses on a door, not pictures — each says what the route does to the
 * building, in a line a reader could draw on the back of the sheet.
 *
 *   bangun  rules become a building: a roof over posts, rising
 *   rakit   the build order: members raised in sequence
 *   baca    reading the façade: an eye
 *   sumber  every dimension sourced: a sheet with lines on it
 *   banding two buildings side by side on one ground line
 */
const PATHS: Record<Route | 'banding', string> = {
  bangun: 'M3 20h18M6 20V11M18 20V11M12 20v-6M3 11l9-6 9 6',
  rakit: 'M4 20h16M7 20V9M12 20V5M17 20v-8',
  baca: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  sumber: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5',
  banding: 'M2 20h20M4 20v-6l3-3 3 3v6M13 20V10l4-4 4 4v10',
}

export function RouteIcon({ route, className }: { route: Route | 'banding'; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[route]} />
    </svg>
  )
}
