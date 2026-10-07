import { describe, expect, it } from 'vitest'
import { buildHouse, buildTimeline, placedAt } from '@/lib/tradition/dani/assembly'
import { checkNoWindow, checkSmallVolume, runInvariants, summarise } from '@/lib/tradition/dani/invariants'
import {
  ALL_DIMS,
  BANGUNAN,
  DEFAULT_RULES,
  DIMS,
  DIM_KEYS,
  MAX_LAPIS,
  MIN_LAPIS,
  bangunanInfo,
  normaliseRules,
  partSplit,
  provenanceSplit,
} from '@/lib/tradition/dani/rules'
import { rulesEqual, rulesFromQuery, rulesToQuery } from '@/lib/tradition/dani/address'
import { resolveLayout } from '@/lib/tradition/dani/frame'
import { volumeCounterexample } from '@/lib/tradition/dani/counterexample'
import { sceneModel } from '@/lib/tradition/dani/scene'
import { STAGE_ORDER } from '@/lib/tradition/dani/types'
import { buildHouse as buildNiang } from '@/lib/tradition/manggarai/assembly'
import { DEFAULT_RULES as NIANG_RULES } from '@/lib/tradition/manggarai/rules'
import type { Rules } from '@/lib/tradition/dani/types'

/** All three buildings, both ends of the blanket, and a loft withheld. */
const COMBOS: readonly Rules[] = [
  DEFAULT_RULES,
  { bangunan: 'ebei', lapis: MIN_LAPIS, loteng: true },
  { bangunan: 'wamai', lapis: MAX_LAPIS, loteng: false },
  { bangunan: 'honai', lapis: MAX_LAPIS, loteng: false },
  { bangunan: 'ebei', lapis: 5, loteng: true },
]

describe('the invariants gate the build', () => {
  for (const rules of COMBOS) {
    it(`holds for ${rules.bangunan}, ${rules.lapis} layers`, () => {
      const { house, layout } = buildHouse(rules)
      const results = runInvariants(house, layout)
      expect(results.filter((r) => r.status === 'fail').map((r) => `${r.key}: ${r.detailEn}`)).toEqual([])
      expect(summarise(results).skipped).toBe(1)
    })
  }
})

describe('the problem is cold', () => {
  /**
   * The comparison this building exists to make. Both are round, both are
   * thatched to the ground, both use the same core primitive — and they are two
   * orders of magnitude apart in the thing their problems are about.
   */
  it('is a fraction of the mbaru niang, which is also round and also thatched', () => {
    const { layout } = buildHouse(DEFAULT_RULES)
    const niang = buildNiang(NIANG_RULES)
    expect(layout.volume).toBeLessThan(25)
    // The niang's base is over five times this one's radius.
    expect(niang.layout.baseRadius).toBeGreaterThan(layout.radius * 2)
    expect(niang.layout.apexY).toBeGreaterThan(layout.apexY * 4)
    expect(checkSmallVolume(layout).status).toBe('pass')
  })

  it('has no window anywhere, and only a gap for the door', () => {
    for (const rules of COMBOS) {
      const { house, layout } = buildHouse(rules)
      expect(checkNoWindow(house, layout).status).toBe('pass')
      const posts = house.parts.filter((p) => p.id.startsWith('tiang-')).length
      // One gap, and exactly one: fewer posts than facets, but only just.
      expect(posts).toBeLessThan(layout.facets)
      expect(layout.facets - posts).toBeLessThanOrEqual(3)
    }
  })

  /*
   * The check's second half has to be able to fail, or it is the first half
   * again. Counting posts passed on a wall that was two-thirds air; so cut a
   * window in the boards — drop one facet's worth of vertices on the far side
   * — and the check must refuse the house, with every post still standing.
   */
  it('refuses a wall with a window in it, though every post is there', () => {
    const { house, layout } = buildHouse(DEFAULT_RULES)
    const lining = house.parts.find((p) => p.id === 'papan-dinding')
    if (!lining || lining.kind !== 'mesh') throw new Error('no wall boards')
    const keep: number[] = []
    for (let i = 0; i < lining.positions.length; i += 3) {
      const a = Math.atan2(lining.positions[i + 2] ?? 0, lining.positions[i] ?? 0)
      // a window a little wider than one facet, opposite the door
      if (Math.abs(Math.abs(a) - Math.PI) < (Math.PI * 2) / layout.facets) continue
      keep.push(lining.positions[i] ?? 0, lining.positions[i + 1] ?? 0, lining.positions[i + 2] ?? 0)
    }
    const holed = {
      ...house,
      parts: house.parts.map((p) => (p.id === 'papan-dinding' ? { ...lining, positions: keep } : p)),
    }
    expect(checkNoWindow(holed, layout).status).toBe('fail')
    // and without any boards at all, the posts alone are not a wall
    const bare = { ...house, parts: house.parts.filter((p) => p.id !== 'papan-dinding') }
    expect(checkNoWindow(bare, layout).status).toBe('fail')
  })

  it('makes a person stoop to get in', () => {
    for (const rules of COMBOS) {
      const layout = resolveLayout(rules)
      expect(layout.door.height).toBeLessThan(1.2)
    }
  })

  /**
   * The first zero `underfloorHeight` in the collection, and it is a decision:
   * the ground holds heat, so raising the house would put cold air under the
   * people sleeping above the fire.
   */
  it('sits on the earth rather than on posts', () => {
    const { house, layout } = buildHouse(DEFAULT_RULES)
    expect(sceneModel(house, layout).underfloorHeight).toBe(0)
    expect(layout.floorY).toBeLessThan(0.2)
  })

  it('puts the sleeping plane above the fire', () => {
    const { house, layout } = buildHouse(DEFAULT_RULES)
    const loft = house.parts.find((p) => p.id === 'loteng')
    const hearth = house.parts.find((p) => p.id === 'tungku')
    expect(loft).toBeDefined()
    expect(hearth).toBeDefined()
    expect(layout.loft.y).toBeGreaterThan(layout.hearth.depth)
  })

  /**
   * The only rule in the project that is entirely thermal: it moves the outside
   * and nothing at all inside.
   */
  it('thickens the blanket without changing the room', () => {
    const thin = resolveLayout({ ...DEFAULT_RULES, lapis: MIN_LAPIS })
    const thick = resolveLayout({ ...DEFAULT_RULES, lapis: MAX_LAPIS })
    expect(thick.thatchDepth).toBeGreaterThan(thin.thatchDepth)
    expect(thick.volume).toBeCloseTo(thin.volume, 9)
    expect(thick.radius).toBeCloseTo(thin.radius, 9)
    expect(thick.apexY).toBeCloseTo(thin.apexY, 9)
    expect(thick.door.height).toBeCloseTo(thin.door.height, 9)
  })
})

describe('three buildings, one fence', () => {
  it('builds all three from the same rules at three sizes', () => {
    expect(BANGUNAN).toHaveLength(3)
    const sizes = BANGUNAN.map((b) => resolveLayout({ ...DEFAULT_RULES, bangunan: b.bangunan }).radius)
    expect(new Set(sizes).size).toBe(3)
  })

  /** A wamai has no loft whatever the address asks for. */
  it('refuses a pig house a loft', () => {
    expect(normaliseRules({ bangunan: 'wamai', lapis: 4, loteng: true }).loteng).toBe(false)
    const { house } = buildHouse({ bangunan: 'wamai', lapis: 4, loteng: true })
    expect(house.parts.some((p) => p.id === 'loteng')).toBe(false)
    expect(bangunanInfo('wamai').loft).toBe(false)
  })

  it('keeps the pig house on the same rules rather than as a lesser version', () => {
    const honai = resolveLayout({ ...DEFAULT_RULES, bangunan: 'honai' })
    const wamai = resolveLayout({ ...DEFAULT_RULES, bangunan: 'wamai' })
    // Same shape, same blanket, same door proportions — only smaller.
    expect(wamai.thatchDepth).toBeCloseTo(honai.thatchDepth, 9)
    expect(wamai.door.height / wamai.radius).toBeCloseTo(honai.door.height / honai.radius, 6)
  })
})

describe('the counterexample', () => {
  it('widens the room until it is no longer what it was for', () => {
    const c = volumeCounterexample()
    expect(c.sound.status).toBe('pass')
    expect(c.broken.status).toBe('fail')
    expect(c.value).toBeGreaterThan(c.actual)
    expect(c.witness.broken.volume).toBeGreaterThan(c.witness.sound.volume)
  })
})

describe('the address', () => {
  it('round-trips every rule, defaults included', () => {
    for (const rules of COMBOS) {
      expect(rulesEqual(rulesFromQuery(rulesToQuery(rules)), normaliseRules(rules))).toBe(true)
    }
  })

  it('writes all three rules even at their defaults', () => {
    const q = rulesToQuery(DEFAULT_RULES)
    expect(q).toContain('bangunan=')
    expect(q).toContain('lapis=')
    expect(q).toContain('loteng=')
  })

  it('falls back rather than reading an empty value as zero', () => {
    expect(rulesFromQuery('bangunan=&lapis=&loteng=')).toEqual(normaliseRules(DEFAULT_RULES))
  })
})

describe('provenance', () => {
  it('reports the interpolated share', () => {
    const split = provenanceSplit(ALL_DIMS)
    // eslint-disable-next-line no-console
    console.log(
      `dani provenance: ${split.measured} measured (${Math.round((split.measured / split.total) * 100)}%), ` +
        `${split.canon} canon (${Math.round((split.canon / split.total) * 100)}%), ` +
        `${split.interpolated} interpolated (${Math.round((split.interpolated / split.total) * 100)}%)`,
    )
    expect(split.measured).toBe(0)
    expect(split.total).toBe(DIM_KEYS.length)
  })

  /**
   * Nothing here can be shown to work. The checks test form that follows from
   * a thermal argument and never the argument, exactly as the Nias pack tests
   * triangles and not strength — so every metric figure stays the author's.
   */
  it('leaves every metric figure unsourced, as the caution states', () => {
    const metric = ALL_DIMS.filter((d) => d.unit === 'm')
    expect(metric.length).toBeGreaterThan(8)
    for (const d of metric) {
      expect(d.class).toBe('interpolated')
      expect(d.source).toBe('none')
    }
  })

  it('every part cites only declared dimensions', () => {
    const { house } = buildHouse(DEFAULT_RULES)
    for (const part of house.parts) {
      expect(part.dims.length).toBeGreaterThan(0)
      for (const key of part.dims) expect(DIM_KEYS).toContain(key)
    }
    const split = partSplit(house.parts)
    // eslint-disable-next-line no-console
    console.log(`dani parts: ${split.interpolated} interpolated of ${split.total}`)
    expect(split.total).toBe(house.parts.length)
  })
})

describe('the build sequence', () => {
  /** The hearth goes in last, and it is the reason for everything above it. */
  it('lays the fire last', () => {
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe('tungku')
    expect(DIMS.fireInside.class).toBe('canon')
  })

  it('walks every stage in order and places every part', () => {
    const { house } = buildHouse(DEFAULT_RULES)
    const timeline = buildTimeline(house)
    expect(timeline.stages.map((s) => s.stage)).toEqual(
      STAGE_ORDER.filter((s) => house.parts.some((p) => p.stage === s)),
    )
    expect(placedAt(timeline, 1).size).toBe(house.parts.length)
    expect(placedAt(timeline, 0).size).toBe(0)
  })
})
