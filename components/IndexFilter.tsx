'use client'

import { useEffect, useRef, useState } from 'react'

/*
 * Type-to-filter over the house index, and a chip per island group.
 *
 * The index is server-rendered — every card, every silhouette — and this
 * component only decides what stays visible: each card carries its search
 * text in `data-cari` and each island group is marked `data-kelompok` with
 * its island's id, so the filtering is an attribute contract with the markup
 * rather than a second copy of the collection. The controls appear only after
 * hydration — a client component still server-renders, so without the gate a
 * reader with JavaScript off would be handed a search box that does nothing.
 * With it, they get the full index and no dead control.
 *
 * The chips are the geography the index is already arranged by, offered as
 * a choice: "the houses of Sulawesi" is the question a reader actually holds,
 * and typing it was the only way to ask it. Text and island combine — a word
 * narrows within the chosen group.
 *
 * The count is computed, never written: copy may not carry a number a
 * thirty-sixth house would falsify, but a live tally of what the reader's
 * own filter matched is data, not a claim.
 */
export function IndexFilter({
  label,
  empty,
  all,
  islandsLabel,
  islands,
  children,
}: {
  label: string
  /** shown when nothing matches; {q} is replaced with the query */
  empty: string
  /** the chip that clears the island choice */
  all: string
  /** the accessible name of the chip group */
  islandsLabel: string
  islands: readonly { id: string; label: string }[]
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')
  const [island, setIsland] = useState<string | null>(null)
  const [shown, setShown] = useState<{ n: number; total: number } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])

  /*
   * The shelf's silhouettes jump to a card by its fragment. If the filter is
   * hiding that card the jump lands on nothing, so arriving at a card clears
   * the filter first — the reader asked for that house, not for the query
   * they typed a minute ago.
   */
  useEffect(() => {
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target && ref.current?.contains(target) && target.hidden) {
        setQ('')
        setIsland(null)
        requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }))
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const needle = q.trim().toLowerCase()
    let n = 0
    let total = 0
    for (const group of root.querySelectorAll<HTMLElement>('[data-kelompok]')) {
      const inIsland = island === null || group.dataset.kelompok === island
      let any = false
      for (const card of group.querySelectorAll<HTMLElement>('[data-cari]')) {
        total++
        const hit = inIsland && (needle === '' || (card.dataset.cari ?? '').includes(needle))
        card.hidden = !hit
        if (hit) {
          n++
          any = true
        }
      }
      group.hidden = !any
    }
    setShown({ n, total })
  }, [q, island])

  const chip = (id: string | null, text: string) => {
    const on = island === id
    return (
      <button
        key={id ?? '*'}
        type="button"
        aria-pressed={on}
        onClick={() => setIsland(id)}
        className={`press min-h-control rounded-full border px-3 font-mono text-meta transition-colors duration-state ${
          on
            ? 'border-bolu bg-bolu text-kapur'
            : 'border-hairline text-bolu hover:border-muted hover:bg-wash'
        }`}
      >
        {text}
      </button>
    )
  }

  return (
    <div>
      {ready ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <label htmlFor="saring" className="micro">
              {label}
            </label>
            {/* The tally, mono like every figure, announced so a screen
                reader hears the filter answer. */}
            <output
              htmlFor="saring"
              aria-live="polite"
              className="num ml-auto text-meta text-muted"
            >
              {shown ? `${shown.n} / ${shown.total}` : ''}
            </output>
          </div>
          <div className="flex items-center gap-3 rounded border border-muted bg-sheet px-4 focus-within:border-bolu focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-bolu">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="shrink-0 text-muted"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="saring"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-3 text-body text-bolu outline-none"
            />
          </div>
          <div role="group" aria-label={islandsLabel} className="flex flex-wrap gap-2">
            {chip(null, all)}
            {islands.map((i) => chip(i.id, i.label))}
          </div>
        </div>
      ) : null}
      <div ref={ref} className="mt-8">
        {children}
        {shown && shown.n === 0 ? (
          <p className="text-body text-muted">{empty.replace('{q}', q.trim())}</p>
        ) : null}
      </div>
    </div>
  )
}
