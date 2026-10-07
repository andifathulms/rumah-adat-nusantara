import { describe, expect, it } from 'vitest'
import { buildHouse, buildTimeline } from '@/lib/tradition/atoni/assembly'
import {
  checkLoftBeforeThatch,
  checkLoftInTheSmoke,
  checkNoOtherOpening,
  checkOneLowDoor,
  partBounds,
  runInvariants,
  summarise,
} from '@/lib/tradition/atoni/invariants'
import {
  ALL_DIMS,
  DEFAULT_RULES,
  DIMS,
  DIM_KEYS,
  DINDING,
  MAX_SIMPANAN,
  MIN_SIMPANAN,
  eaveOf,
  normaliseRules,
  partSplit,
  provenanceSplit,
} from '@/lib/tradition/atoni/rules'
import { rulesEqual, rulesFromQuery, rulesToQuery } from '@/lib/tradition/atoni/address'
import { resolveLayout } from '@/lib/tradition/atoni/frame'
import { smokeCounterexample } from '@/lib/tradition/atoni/counterexample'
import { sceneModel } from '@/lib/tradition/atoni/scene'
import { withDimValue } from '@/lib/tradition/atoni/whatif'
import { STAGE_ORDER } from '@/lib/tradition/atoni/types'
import { resolveLayout as daniLayout } from '@/lib/tradition/dani/frame'
import type { Rules } from '@/lib/tradition/atoni/types'

/** Both ends of the store, both feet of the roof, with and without the lopo. */
const COMBOS: readonly Rules[] = [
  DEFAULT_RULES,
  { simpanan: MIN_SIMPANAN, dinding: 'rendah', lopo: false },
  { simpanan: MAX_SIMPANAN, dinding: 'penuh', lopo: true },
  { simpanan: 3, dinding: 'rendah', lopo: true },
  { simpanan: 1, dinding: 'penuh', lopo: false },
]

describe('the invariants gate the build', () => {
  for (const rules of COMBOS) {
    it(`holds for ${rules.simpanan} harvests, ${rules.dinding}, lopo ${rules.lopo}`, () => {
      const { house, layout } = buildHouse(rules)
      const results = runInvariants(house, layout)
      expect(results.filter((r) => r.status === 'fail').map((r) => `${r.key}: ${r.detailEn}`)).toEqual([])
      expect(summarise(results).skipped).toBe(1)
    })
  }
})

describe('a roof with a second job', () => {
  /**
   * The claim this pack exists for. Every other roof here keeps water out;
   * this one also has to keep smoke in, and the seed has to hang in it.
   */
  it('hangs the seed inside the smoke band', () => {
    for (const rules of COMBOS) {
      const layout = resolveLayout(rules)
      expect(checkLoftInTheSmoke(layout).status).toBe('pass')
      expect(layout.loft.y).toBeGreaterThanOrEqual(layout.smoke.from)
      expect(layout.loft.y + layout.loft.depth).toBeLessThanOrEqual(layout.smoke.to)
    }
  })

  /** One opening, and nothing else anywhere. */
  it('cuts one hole in the thatch and no other', () => {
    for (const rules of COMBOS) {
      const { house, layout } = buildHouse(rules)
      expect(checkNoOtherOpening(house, layout).status).toBe('pass')
      expect(house.parts.filter((p) => p.id.startsWith('atap-'))).toHaveLength(DIMS.thatchCourses.value)
      expect(house.parts.filter((p) => p.name === 'kusen')).toHaveLength(2)
    }
  })

  /**
   * The only two-sided check in the project: tall enough to pass, low enough
   * to be worth having.
   */
  it('keeps the door between a stooping body and a standing one', () => {
    for (const rules of COMBOS) {
      const { house, layout } = buildHouse(rules)
      expect(checkOneLowDoor(house, layout).status).toBe('pass')
      expect(layout.door.height).toBeGreaterThan(layout.body.stooping)
      expect(layout.door.height).toBeLessThan(layout.body.standing)
    }
    // And it bites on both sides, which is what makes it two-sided rather
    // than a floor with a comment attached.
    const tall = withDimValue('doorHeight', DIMS.standingHeight.value + 0.2, () => {
      const { house, layout } = buildHouse(DEFAULT_RULES)
      return checkOneLowDoor(house, layout)
    })
    expect(tall.status).toBe('fail')
    const low = withDimValue('doorHeight', DIMS.stoopingHeight.value - 0.2, () => {
      const { house, layout } = buildHouse(DEFAULT_RULES)
      return checkOneLowDoor(house, layout)
    })
    expect(low.status).toBe('fail')
  })

  /** Once the dome is closed there is no way to get a loft in. */
  it('fits the loft before the thatch', () => {
    for (const rules of COMBOS) {
      const { house } = buildHouse(rules)
      expect(checkLoftBeforeThatch(house).status).toBe('pass')
    }
  })
})

describe('a size taken from time', () => {
  it('deepens the loft by one year at a time', () => {
    for (let years = MIN_SIMPANAN; years <= MAX_SIMPANAN; years++) {
      const layout = resolveLayout({ ...DEFAULT_RULES, simpanan: years })
      expect(layout.loft.depth).toBeCloseTo(DIMS.loftPerYear.value * years, 9)
      expect(layout.loft.years).toBe(years)
    }
    // And nothing else about the house moves with it: the store grows, the
    // building does not.
    const one = resolveLayout({ ...DEFAULT_RULES, simpanan: 1 })
    const four = resolveLayout({ ...DEFAULT_RULES, simpanan: 4 })
    expect(one.apexY).toBeCloseTo(four.apexY, 9)
    expect(one.radius).toBeCloseTo(four.radius, 9)
  })

  /**
   * The eave table holds dimension keys rather than copies of their values —
   * the Banjar pack's lesson, checked rather than commented.
   */
  it('reads the foot of the roof from the pack, not from a copy', () => {
    const before = resolveLayout(DEFAULT_RULES).wallY
    const during = withDimValue('eaveHeight', DIMS.eaveHeight.value * 3, () => resolveLayout(DEFAULT_RULES).wallY)
    expect(during).toBeCloseTo(before * 3, 9)
    expect(DINDING.map((d) => eaveOf(d.dinding))).toEqual([DIMS.eaveHeight.value, DIMS.wallHeight.value])
  })
})

describe('not a honai', () => {
  /**
   * Both are round, both thatched to the ground, both dark, both with a fire.
   * What separates them is what is above the fire — people in one, seed in the
   * other — so the test is that the two packs put different things there, not
   * that the shapes differ.
   */
  it('puts seed where the honai puts people', () => {
    const kbubu = resolveLayout(DEFAULT_RULES)
    const honai = daniLayout({ bangunan: 'honai', lapis: 4, loteng: true })
    expect(kbubu.loft.y).toBeGreaterThan(0)
    expect(honai.loft.present).toBe(true)
    // Both sit on the earth: the field reports zero for each, and for the
    // same reason.
    const { house } = buildHouse(DEFAULT_RULES)
    expect(sceneModel(house, kbubu).underfloorHeight).toBe(0)
  })

  /** The lopo is the opposite building, in the same yard, and it is a part. */
  it('builds the open pavilion beside the closed house', () => {
    const { house } = buildHouse({ ...DEFAULT_RULES, lopo: true })
    const lopo = house.parts.filter((p) => p.stage === 'lopo')
    expect(lopo.length).toBeGreaterThan(4)
    // It stands clear of the house rather than inside its footprint.
    const layout = resolveLayout(DEFAULT_RULES)
    for (const part of lopo) {
      expect(partBounds(part).max[2]).toBeGreaterThan(layout.radius)
    }
    const without = buildHouse({ ...DEFAULT_RULES, lopo: false })
    expect(without.house.parts.filter((p) => p.stage === 'lopo')).toEqual([])
  })
})

describe('the counterexample', () => {
  it('raises the loft until the seed is out of the smoke', () => {
    const c = smokeCounterexample()
    expect(c.sound.status).toBe('pass')
    expect(c.broken.status).toBe('fail')
    expect(c.witness.sound.seedTop).toBeLessThanOrEqual(c.witness.sound.smokeTop)
    expect(c.witness.broken.seedTop).toBeGreaterThan(c.witness.broken.smokeTop)
    // The smoke band does not move: the two numbers are independent.
    expect(c.witness.broken.smokeTop).toBeCloseTo(c.witness.sound.smokeTop, 9)
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
    expect(q).toContain('simpanan=')
    expect(q).toContain('dinding=')
    expect(q).toContain('lopo=')
  })

  it('falls back rather than reading an empty value as zero', () => {
    expect(rulesFromQuery('simpanan=&dinding=&lopo=')).toEqual(normaliseRules(DEFAULT_RULES))
  })
})

describe('the build sequence', () => {
  it('raises the stages in order and times every part', () => {
    for (const rules of COMBOS) {
      const { house } = buildHouse(rules)
      const timeline = buildTimeline(house)
      expect(timeline.entries.length).toBe(house.parts.length)
      let seen = -1
      for (const part of house.parts) {
        const rank = STAGE_ORDER.indexOf(part.stage)
        expect(rank).toBeGreaterThanOrEqual(seen)
        seen = rank
      }
      expect(house.parts[0]?.stage).toBe('tiang')
    }
  })
})

describe('the scene model', () => {
  /** The only bands in the collection that are a process rather than rooms. */
  it('reads its zones as fire, smoke and seed', () => {
    const { house, layout } = buildHouse(DEFAULT_RULES)
    const scene = sceneModel(house, layout)
    expect(scene.zones).toHaveLength(4)
    expect(scene.zones.map((z) => z.key)).toEqual(['api', 'asap', 'benih', 'kubah'])
    expect(scene.underfloorHeight).toBe(0)
    expect(scene.site).toHaveLength(1)
  })
})

describe('provenance', () => {
  it('reports the interpolated share', () => {
    const split = provenanceSplit(ALL_DIMS)
    // eslint-disable-next-line no-console
    console.log(
      `atoni provenance: ${split.measured} measured (${Math.round((split.measured / split.total) * 100)}%), ` +
        `${split.canon} canon (${Math.round((split.canon / split.total) * 100)}%), ` +
        `${split.interpolated} interpolated (${Math.round((split.interpolated / split.total) * 100)}%)`,
    )
    expect(split.measured).toBe(0)
    expect(split.total).toBe(DIM_KEYS.length)
  })

  /**
   * The smoke band is the figure the whole pack turns on and it is the one no
   * survey could settle: what decides it is not a dimension of the building
   * but what happens to the seed after a season.
   */
  it('keeps every metre unsourced, body figures separately so', () => {
    for (const d of ALL_DIMS.filter((x) => x.unit === 'm')) {
      expect(d.class).toBe('interpolated')
      expect(['none', 'anthropometry']).toContain(d.source)
    }
    expect(ALL_DIMS.filter((d) => d.source === 'anthropometry')).toHaveLength(2)
    expect(DIMS.smokeHigh.class).toBe('interpolated')
    expect(DIMS.smokeHigh.source).toBe('none')
    for (const d of ALL_DIMS.filter((x) => x.class === 'canon')) expect(d.unit).not.toBe('m')
  })

  it('every part cites only declared dimensions', () => {
    for (const rules of COMBOS) {
      const { house } = buildHouse(rules)
      for (const part of house.parts) {
        expect(part.dims.length).toBeGreaterThan(0)
        for (const key of part.dims) expect(DIM_KEYS).toContain(key)
      }
    }
    const { house } = buildHouse(DEFAULT_RULES)
    const split = partSplit(house.parts)
    expect(split.measured).toBe(0)
    expect(split.interpolated).toBe(split.total)
  })
})

/*
 * The lap is what makes the courses one roof. Take it away and every join is
 * a ring of air round the dome — the state this house shipped in, which the
 * check passed because it counted courses and looked for parts named window.
 * It must refuse that now, with nothing else about the building changed.
 */
describe('a thatch that keeps smoke in', () => {
  it('refuses courses laid edge to edge with no lap', () => {
    const lapped = buildHouse(DEFAULT_RULES)
    expect(checkNoOtherOpening(lapped.house, lapped.layout).status).toBe('pass')
    withDimValue('thatchLap', -0.5, () => {
      const bare = buildHouse(DEFAULT_RULES)
      expect(checkNoOtherOpening(bare.house, bare.layout).status).toBe('fail')
    })
  })
})

/*
 * Both forms named a perimeter and neither built one: a band of air round
 * the foot of a house whose purpose is holding smoke. Take the foot away and
 * the check must say so, on either form.
 */
describe('the foot of the house', () => {
  it('is closed but for the door on both forms, and refused when it is missing', () => {
    for (const dinding of ['penuh', 'rendah'] as const) {
      const { house, layout } = buildHouse({ ...DEFAULT_RULES, dinding })
      expect(checkNoOtherOpening(house, layout).status).toBe('pass')
      const open = { ...house, parts: house.parts.filter((p) => p.id !== 'kaki-dinding') }
      expect(checkNoOtherOpening(open, layout).status).toBe('fail')
    }
  })
})
