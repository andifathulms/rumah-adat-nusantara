/**
 * The checks that are claims about the ume kbubu.
 *
 * `checkLoftInTheSmoke` is the one this building exists for, and it is a
 * purpose check rather than a form check — the third in this project after the
 * Sumbanese tower that has to hold something and the Korowai hearth that has
 * to be able to fall. A loft above the smoke is a perfectly sound platform in
 * a perfectly sound house, and the seed in it rots.
 *
 * `checkOneLowDoor` is the only two-sided check here. Everything else in this
 * project is a floor or a ceiling: long enough, thick enough, not too far, not
 * too high. This one has a bound on each side and both of them are the point —
 * a door too low is not a door, and a door too tall lets the smoke out.
 *
 * `checkNoOtherOpening` is a check for an absence, like the Bajau's missing
 * ground and the bade's missing foundation: no window, no gable vent, nothing
 * but the one hole the jambs stand in.
 */

import {
  checkAgainstSurvey,
  checkBuildOrder as coreCheckBuildOrder,
  checkJointStages as coreCheckJointStages,
  checkPartProvenance as coreCheckPartProvenance,
  checkJoints,
  checkMeshes,
  checkSymmetry,
  partBounds,
} from '@/lib/core/invariants'
import type { CheckResult } from '@/lib/core/invariants'
import { DIMS, PACK } from './rules'
import type { House, Layout } from './types'

export { checkAgainstSurvey, checkJoints, checkMeshes, partBounds, summarise } from '@/lib/core/invariants'
export type { CheckResult, CheckStatus } from '@/lib/core/invariants'

const TOL = 1e-4

/**
 * The house is symmetric about the plane its door lies in; the lopo is not
 * part of that claim, because it stands off to one side of the yard.
 */
export function checkFrameSymmetry(house: House): CheckResult {
  return checkSymmetry(house, {
    axis: 2,
    include: (part) => part.stage !== 'lopo',
    labelId: 'Rumahnya simetris terhadap bidang pintunya, z = 0 — lopo di halaman tidak termasuk',
    labelEn: 'The house is symmetric about the plane of its door, z = 0 — the lopo in the yard is not part of the claim',
  })
}

export function checkBuildOrder(house: House): CheckResult {
  return coreCheckBuildOrder(PACK, house)
}

export function checkJointStages(house: House): CheckResult {
  return coreCheckJointStages(PACK, house)
}

export function checkPartProvenance(house: House): CheckResult {
  return coreCheckPartProvenance(PACK, house)
}

/**
 * The seed hangs in the smoke.
 *
 * Two independent numbers: where the loft is, which follows from how the house
 * is framed, and how far up the smoke is still hot and thick enough to cure
 * maize, which is the author's declared band. Nothing relates them, which is
 * what lets the check fail — and what it fails on is not the building but the
 * seed in it.
 */
export function checkLoftInTheSmoke(layout: Layout): CheckResult {
  const faults: string[] = []
  const top = layout.loft.y + layout.loft.depth
  if (layout.loft.y < layout.smoke.from - TOL) {
    faults.push(`the loft is ${layout.loft.y.toFixed(2)} m up and the fire scorches anything below ${layout.smoke.from.toFixed(2)} m`)
  }
  if (top > layout.smoke.to + TOL) {
    faults.push(`the seed reaches ${top.toFixed(2)} m and the smoke is spent by ${layout.smoke.to.toFixed(2)} m`)
  }
  const ok = faults.length === 0
  return {
    key: 'loft-in-the-smoke',
    titleId: 'Benihnya tergantung di dalam asap',
    titleEn: 'The seed hangs in the smoke',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `Para setinggi ${layout.loft.y.toFixed(2)} m dan benih ${layout.loft.years} panen setebal ${layout.loft.depth.toFixed(2)} m mencapai ${top.toFixed(2)} m, di dalam pita ${layout.smoke.from.toFixed(2)}–${layout.smoke.to.toFixed(2)} m. Letak para ditentukan cara rumah dirangka; tinggi asap yang masih berguna adalah batas penulis; tidak ada yang menghubungkan keduanya — dan yang gagal kalau keduanya tidak bertemu bukan bangunannya melainkan benihnya.`
      : faults.join('; '),
    detailEn: ok
      ? `A loft at ${layout.loft.y.toFixed(2)} m with ${layout.loft.years} harvests ${layout.loft.depth.toFixed(2)} m deep reaching ${top.toFixed(2)} m, inside a ${layout.smoke.from.toFixed(2)}–${layout.smoke.to.toFixed(2)} m band. Where the loft sits follows from how the house is framed; how far the smoke stays useful is the author’s limit; nothing relates them — and what fails when they do not meet is not the building but the seed in it.`
      : faults.join('; '),
  }
}

/**
 * One door, and it is low.
 *
 * Bounded on both sides, which nothing else in this project is: tall enough
 * that a stooping adult gets through, and lower than a standing one, because
 * a door you can walk through upright is a door the heat and the smoke walk
 * out of.
 */
export function checkOneLowDoor(house: House, layout: Layout): CheckResult {
  const faults: string[] = []
  if (layout.door.height <= layout.body.stooping + TOL) {
    faults.push(`the door is ${layout.door.height.toFixed(2)} m and a stooping adult needs ${layout.body.stooping.toFixed(2)} m`)
  }
  if (layout.door.height >= layout.body.standing - TOL) {
    faults.push(`the door is ${layout.door.height.toFixed(2)} m and a standing adult is ${layout.body.standing.toFixed(2)} m — nobody has to stoop`)
  }
  const jambs = house.parts.filter((p) => p.name === 'kusen')
  if (jambs.length !== 2) faults.push(`${jambs.length} jambs, expected 2`)
  if (!house.parts.some((p) => p.name === 'ambang')) faults.push('there is no head over the door')
  const ok = faults.length === 0
  return {
    key: 'one-low-door',
    titleId: 'Satu pintu, dan pintunya rendah',
    titleEn: 'One door, and it is low',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `Tinggi bukaan ${layout.door.height.toFixed(2)} m: di atas ${layout.body.stooping.toFixed(2)} m sehingga orang membungkuk dapat lewat, dan di bawah ${layout.body.standing.toFixed(2)} m sehingga ia memang harus membungkuk. Ini satu-satunya pemeriksaan berbatas dua arah dalam projek ini, dan kedua batasnya sama pentingnya — pintu yang terlalu rendah bukan pintu, pintu yang terlalu tinggi melepaskan asapnya.`
      : faults.join('; '),
    detailEn: ok
      ? `An opening ${layout.door.height.toFixed(2)} m high: above ${layout.body.stooping.toFixed(2)} m so a stooping adult gets through, and below ${layout.body.standing.toFixed(2)} m so they have to stoop. It is the only two-sided check in this project, and both bounds matter — a door too low is not a door, and a door too tall lets the smoke out.`
      : faults.join('; '),
  }
}

/**
 * There is no other opening anywhere.
 *
 * A check for an absence. The thatch runs unbroken round every course above
 * the door's head, and the courses the door reaches are interrupted only
 * there — so the only hole in this building is the one a person stoops
 * through.
 */
export function checkNoOtherOpening(house: House, layout: Layout): CheckResult {
  const faults: string[] = []
  const courses = house.parts.filter((p) => p.stage === 'atap' && p.id.startsWith('atap-'))
  /*
   * The foot: closed from the ground up into the lowest course, all the way
   * round but for the door. Neither form had one built, and this check passed
   * both — a band of air round the house is not a part, so nothing named it.
   */
  const foot = house.parts.find((p) => p.id === 'kaki-dinding')
  const lowestCourse = Math.min(...courses.map((p) => partBounds(p).min[1]))
  if (!foot) faults.push('nothing closes the circumference under the eave')
  else {
    const fb = partBounds(foot)
    if (fb.min[1] > TOL) faults.push('the foot of the house stops above the ground')
    if (fb.max[1] < lowestCourse + TOL) faults.push('the foot of the house does not reach up under the thatch')
    if (foot.kind === 'mesh') {
      const bearings = new Set<number>()
      for (let i = 0; i < foot.positions.length; i += 3) {
        const a = Math.atan2(foot.positions[i + 2] ?? 0, foot.positions[i] ?? 0)
        bearings.add(Math.round(((a + Math.PI * 2) % (Math.PI * 2)) * 1e6) / 1e6)
      }
      const sorted = [...bearings].sort((x, y) => x - y)
      const step = (Math.PI * 2) / layout.facets
      let others = 0
      for (let i = 0; i < sorted.length; i++) {
        const from = sorted[i] ?? 0
        const to = i + 1 < sorted.length ? (sorted[i + 1] ?? 0) : (sorted[0] ?? 0) + Math.PI * 2
        const gap = to - from
        if (gap > step * 1.01) {
          const mid = (from + to) / 2
          const isDoor = gap <= layout.door.halfAngle * 2 + 1e-6 && Math.abs(Math.cos(mid) + 1) < 1e-3
          if (!isDoor) others++
        }
      }
      if (others > 0) faults.push(`${others} gaps round the foot of the house that are not the door`)
    }
  }
  if (courses.length !== DIMS.thatchCourses.value) {
    faults.push(`${courses.length} courses of thatch, expected ${DIMS.thatchCourses.value}`)
  }
  const named = house.parts.filter((p) => p.name === 'jendela' || p.name === 'lubang')
  if (named.length > 0) faults.push(`${named.length} openings that are not the door`)
  // The thatch has to reach the ground (or its low wall) all the way round.
  /*
   * Down to the eave, within the depth of the thatch itself — the courses
   * stand off their frame, so the lowest vertex sits a little above the line
   * the profile starts on and comparing against the bare figure would fail a
   * roof that is doing exactly what it should.
   */
  /*
   * And every course laps the one below it: its lowest edge sits below the
   * highest edge of the course it covers. Without that, each join is a ring
   * of open air — a slot this check once passed seven times over, because
   * counting courses and finding no part called a window cannot see a gap
   * between two parts.
   */
  const byOrder = [...courses].sort((a, b) => a.order - b.order)
  for (let i = 1; i < byOrder.length; i++) {
    const below = byOrder[i - 1]
    const above = byOrder[i]
    if (!below || !above) continue
    if (partBounds(above).min[1] >= partBounds(below).max[1] - TOL) {
      faults.push(`${above.id} starts above the head of ${below.id}, leaving a slot round the dome`)
    }
  }
  const lowest = Math.min(...courses.map((p) => partBounds(p).min[1]))
  const allowance = DIMS.thatchBed.value + DIMS.thatchThickness.value
  if (lowest > layout.wallY + allowance + TOL) faults.push('the thatch stops above the wall it should meet')
  const ok = faults.length === 0
  return {
    key: 'no-other-opening',
    titleId: 'Tidak ada bukaan lain di mana pun',
    titleEn: 'There is no other opening anywhere',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `${courses.length} lapis alang-alang, hanya yang terbawah yang dipotong untuk pintu, dan tidak ada jendela sama sekali. Dua puluh tujuh atap lain dalam projek ini hanya perlu menahan air di luar; yang ini juga harus menahan asap di dalam, dan tiap lubang tambahan akan membatalkan alasan bangunannya ada.`
      : faults.join('; '),
    detailEn: ok
      ? `${courses.length} courses of thatch, only the lowest of them cut for the door, and no window at all. The other twenty-seven roofs in this project only have to keep water out; this one also has to keep smoke in, and any further hole would cancel the reason the building exists.`
      : faults.join('; '),
  }
}

/**
 * The loft goes in before the thatch closes over it.
 *
 * Reverse it and the model is byte-identical; what changes is whether the
 * building could have been made at all, since afterwards the only way in is a
 * door a person has to stoop through. The Sumbanese uma's `checkLoftBeforeTower`
 * asserts an order for a different reason — there it says what the building is
 * for — and this is the plainer one: access.
 */
export function checkLoftBeforeThatch(house: House): CheckResult {
  const loft = house.parts.findIndex((p) => p.stage === 'para')
  const thatch = house.parts.findIndex((p) => p.stage === 'atap')
  const ok = loft >= 0 && thatch > loft
  return {
    key: 'loft-before-thatch',
    titleId: 'Para dipasang sebelum atapnya menutup',
    titleEn: 'The loft goes in before the thatch closes over it',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? 'Setelah kubahnya tertutup, satu-satunya jalan masuk adalah pintu yang harus dilewati sambil membungkuk. Urutan ini bukan kerapian: ia satu-satunya urutan yang mungkin.'
      : 'the thatch closes before the loft is in, and after that there is no way to get it in',
    detailEn: ok
      ? 'Once the dome is closed the only way in is a door a person stoops through. This order is not tidiness: it is the only order that is possible.'
      : 'the thatch closes before the loft is in, and after that there is no way to get it in',
  }
}

/* ── The suite ────────────────────────────────────────────────────────── */

export function runInvariants(house: House, layout: Layout): readonly CheckResult[] {
  return [
    checkFrameSymmetry(house),
    checkJoints(house),
    checkJointStages(house),
    checkBuildOrder(house),
    checkMeshes(house),
    checkLoftInTheSmoke(layout),
    checkOneLowDoor(house, layout),
    checkNoOtherOpening(house, layout),
    checkLoftBeforeThatch(house),
    checkPartProvenance(house),
    checkAgainstSurvey(),
  ]
}
