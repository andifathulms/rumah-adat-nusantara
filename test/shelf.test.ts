import { describe, expect, it } from 'vitest'
import { silhouette } from '@/lib/core/silhouette'
import { ROW_TARGET, justifyShelf, packShelf } from '@/lib/draw/shelf'
import { TRADITIONS } from '@/lib/tradition/registry'

const GAP = 3
const PAD = 1

/** The collection as the landing draws it: every house at its default rules. */
function houses() {
  return TRADITIONS.map((t) => {
    const built = t.build(t.defaultQuery)
    const s = silhouette(built.house, built.scene.ridgeAxis ?? 0)
    return { key: t.key, width: s.max[0] - s.min[0], height: s.max[1] }
  })
}

describe('the shelf', () => {
  /**
   * The claim the hero exists to make. A wrapped shelf could break it silently
   * — each row sized to its own contents would draw a row of small houses
   * large — so every row is laid out in one width and this test says so.
   */
  it('draws every row in one viewBox width, which is one scale', () => {
    const shelf = packShelf(houses(), { gap: GAP, pad: PAD })
    expect(shelf.rows.length).toBeGreaterThan(1)
    for (const row of shelf.rows) expect(row.width).toBeLessThanOrEqual(shelf.width)
  })

  /**
   * And in one height. Rows sized to their own tallest house put the ground
   * lines at uneven intervals down the page, which reads as rows drawn at
   * different scales — the one thing this drawing may not suggest.
   */
  it('draws every row in one height, which is the tallest house on the shelf', () => {
    const items = houses()
    const shelf = packShelf(items, { gap: GAP, pad: PAD })
    expect(shelf.height).toBeCloseTo(Math.max(...items.map((i) => i.height)), 9)
    for (const row of shelf.rows) expect(row.height).toBeLessThanOrEqual(shelf.height)
  })

  it('keeps every house, once, in registry order', () => {
    const items = houses()
    const shelf = packShelf(items, { gap: GAP, pad: PAD })
    expect(shelf.rows.flatMap((r) => r.items).map((i) => i.key)).toEqual(items.map((i) => i.key))
  })

  it('fills a row before starting another', () => {
    const shelf = packShelf(houses(), { gap: GAP, pad: PAD })
    for (const row of shelf.rows) {
      // Either the row is inside the target, or one house alone overruns it —
      // which is allowed, because the alternative is drawing that house small.
      expect(row.width - PAD <= ROW_TARGET || row.items.length === 1).toBe(true)
    }
  })

  /** A house too wide for a row is not squeezed; it takes the row. */
  it('gives a house wider than the target a row of its own', () => {
    const shelf = packShelf(
      [
        { key: 'a', width: 5, height: 3 },
        { key: 'wide', width: 200, height: 4 },
        { key: 'b', width: 5, height: 3 },
      ],
      { target: 50, gap: GAP, pad: PAD },
    )
    expect(shelf.rows.map((r) => r.items.map((i) => i.key))).toEqual([['a'], ['wide'], ['b']])
  })

  /** Nothing counts to fourteen: one house is one row and the arithmetic holds. */
  it('packs a collection of one', () => {
    const shelf = packShelf([{ key: 'only', width: 12, height: 8 }], { gap: GAP, pad: PAD })
    expect(shelf.rows).toHaveLength(1)
    expect(shelf.width).toBeCloseTo(14, 9)
  })

  /*
   * Justifying the rows may move gaps and nothing else: the order is history
   * and the widths are the scale, and both are what the hero claims.
   */
  describe('justified', () => {
    const MAX = GAP * 4
    const items = houses()
    const packed = packShelf(items, { gap: GAP, pad: PAD })
    const shelf = justifyShelf(packed, { gap: GAP, pad: PAD, maxGap: MAX })

    it('keeps the sheet width and height, so the scale is unchanged', () => {
      expect(shelf.width).toBe(packed.width)
      expect(shelf.height).toBe(packed.height)
    })

    it('keeps every house, its width and its row, in registry order', () => {
      expect(shelf.rows.map((r) => r.items.map((i) => i.key))).toEqual(
        packed.rows.map((r) => r.items.map((i) => i.key)),
      )
      shelf.rows.forEach((r, ri) =>
        r.items.forEach((it, ii) => expect(it.width).toBe(packed.rows[ri]!.items[ii]!.width)),
      )
    })

    it('never overlaps two houses and never lets one off the sheet', () => {
      for (const row of shelf.rows) {
        row.items.forEach((it, i) => {
          expect(it.ox).toBeGreaterThanOrEqual(PAD - 1e-9)
          expect(it.ox + it.width).toBeLessThanOrEqual(shelf.width - PAD + 1e-9)
          const next = row.items[i + 1]
          if (next) expect(next.ox - (it.ox + it.width)).toBeGreaterThanOrEqual(GAP - 1e-9)
        })
      }
    })

    it('runs a row to both edges unless that would open a gap past the cap', () => {
      for (const row of shelf.rows) {
        const first = row.items[0]!
        const last = row.items[row.items.length - 1]!
        const gaps = row.items.slice(1).map((it, i) => it.ox - (row.items[i]!.ox + row.items[i]!.width))
        const reachesEdges =
          Math.abs(first.ox - PAD) < 1e-9 && Math.abs(last.ox + last.width - (shelf.width - PAD)) < 1e-9
        expect(reachesEdges || gaps.every((g) => Math.abs(g - GAP) < 1e-9)).toBe(true)
        for (const g of gaps) expect(g).toBeLessThanOrEqual(MAX + 1e-9)
      }
    })
  })
})
