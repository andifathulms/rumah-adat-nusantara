'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProvenanceClass } from '@/lib/core/types'

/*
 * Narrow the dimension table to one provenance class.
 *
 * The same attribute contract as the landing's index filter: the table is
 * server-rendered whole, every row carries its class in `data-kelas`, and
 * this only decides which rows stay visible. It appears after hydration, so
 * without JavaScript the reader has the full table and no dead control.
 *
 * Each chip carries its live count — computed from the rows, never written —
 * so "canon · 4" is the table answering before the reader presses anything,
 * and a class with no rows says 0 rather than disappearing. That zero is the
 * point of the page: the measured chip reads 0 for every house here.
 */
export function ClassFilter({
  labels,
  all,
  groupLabel,
  children,
}: {
  labels: Record<ProvenanceClass, string>
  all: string
  groupLabel: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [klass, setKlass] = useState<ProvenanceClass | null>(null)
  const [counts, setCounts] = useState<Record<ProvenanceClass, number> | null>(null)

  useEffect(() => {
    const rows = ref.current?.querySelectorAll<HTMLElement>('[data-kelas]') ?? []
    const c: Record<ProvenanceClass, number> = { measured: 0, canon: 0, interpolated: 0 }
    for (const row of rows) {
      const k = row.dataset.kelas as ProvenanceClass
      if (k in c) c[k]++
      row.hidden = klass !== null && k !== klass
    }
    setCounts(c)
  }, [klass])

  const total = counts ? counts.measured + counts.canon + counts.interpolated : 0
  const chip = (k: ProvenanceClass | null, text: string, n: number) => (
    <button
      key={k ?? '*'}
      type="button"
      aria-pressed={klass === k}
      onClick={() => setKlass(k)}
      className={`press min-h-control rounded border px-3 font-mono text-meta transition-colors duration-state ${
        klass === k
          ? 'border-bolu bg-bolu text-kapur'
          : 'border-hairline text-bolu hover:border-muted hover:bg-wash'
      }`}
    >
      {text} <span className="num opacity-80">· {n}</span>
    </button>
  )

  return (
    <div>
      {counts ? (
        <div role="group" aria-label={groupLabel} className="mt-4 flex flex-wrap gap-2">
          {chip(null, all, total)}
          {(['measured', 'canon', 'interpolated'] as const).map((k) => chip(k, labels[k], counts[k]))}
        </div>
      ) : null}
      <div ref={ref}>{children}</div>
    </div>
  )
}
