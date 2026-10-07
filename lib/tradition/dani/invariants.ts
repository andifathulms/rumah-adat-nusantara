/**
 * The checks that are claims about the honai.
 *
 * The generic half comes from the core unchanged for the thirteenth time.
 *
 * The two here that matter are `checkSmallVolume` and `checkNoWindow`, and both
 * come with the same caveat, stated on them rather than left implied: **they
 * test geometry that follows from a thermal argument, and never the argument
 * itself.** This project has no material properties and will not acquire any,
 * so nothing here can say the building stays warm. It can say the building is
 * small, low and closed — which is what a tradition that had to solve cold
 * arrived at, and which is a claim about form that a check can hold.
 *
 * That is the same limit the Nias pack states about its bracing: triangles are
 * testable, strength is not.
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
  partPoints,
} from '@/lib/core/invariants'
import type { CheckResult } from '@/lib/core/invariants'
import { coneRun } from '@/lib/core/cone'
import { DIMS, PACK, bangunanInfo } from './rules'
import { domeProfile, thatchBands } from './roof'
import type { House, Layout } from './types'

export { checkAgainstSurvey, checkJoints, checkMeshes, partBounds, summarise } from '@/lib/core/invariants'
export type { CheckResult, CheckStatus } from '@/lib/core/invariants'

const TOL = 1e-4

/**
 * The building mirrors about z = 0, and the door is what breaks the circle.
 *
 * A round building has no ridge, so the mirror plane is the one the door lies
 * in — the same reading the mbaru niang takes, and for the same reason: the
 * only direction a circle has is the one its opening gives it.
 */
export function checkFrameSymmetry(house: House): CheckResult {
  return checkSymmetry(house, {
    axis: 2,
    include: () => true,
    labelId: 'Simetris terhadap bidang pintu, z = 0 — satu-satunya arah yang dimiliki bangunan bundar',
    labelEn: 'Symmetric about the plane of the door, z = 0 — the only direction a round building has',
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

/* ── The problem is cold ──────────────────────────────────────────────── */

/**
 * Small, and small on purpose.
 *
 * The figure it is measured against is the mbaru niang, which is the other
 * round thatched building here: a comparison rather than a threshold, because
 * "small" means nothing on its own and this project has no way to say "warm
 * enough". What it can say is that two buildings solving different problems
 * with the same geometry are two orders of magnitude apart in the thing the
 * problem is about.
 */
export function checkSmallVolume(layout: Layout): CheckResult {
  // The mbaru niang's living floor is 5.98 m across and its storeys are 2.45 m;
  // one of its five floors alone is around 68 cubic metres.
  const niangFloor = Math.PI * 2.99 * 2.99 * 2.45
  const ratio = niangFloor / layout.volume
  const ok = layout.volume < 25 && ratio > 2
  return {
    key: 'small',
    titleId: 'Ruangnya kecil, dan kecilnya disengaja',
    titleEn: 'The room is small, and the smallness is deliberate',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `Sekitar ${layout.volume.toFixed(1)} m³ — satu lantai mbaru niang saja sekitar ${ratio.toFixed(1)} kali lebih besar, dan mbaru niang punya lima. Keduanya bundar dan keduanya beratap sampai ke tanah; yang satu bundar untuk menumpuk lima simpanan di dalam kerucut, yang lain bundar karena lingkaran adalah dinding termurah untuk dihangatkan. Kebundaran ternyata tidak mengatakan apa-apa dengan sendirinya. Perlu dicatat: yang diuji di sini bentuknya, tidak pernah kehangatannya — projek ini tidak punya sifat bahan, dan tidak akan punya.`
      : `Sekitar ${layout.volume.toFixed(1)} m³.`,
    detailEn: ok
      ? `About ${layout.volume.toFixed(1)} m³ — one floor of a mbaru niang alone is some ${ratio.toFixed(1)} times larger, and a mbaru niang has five. Both are round and both are thatched to the ground; one is round to stack five stores inside a cone, the other because a circle is the cheapest wall to warm. Roundness turns out to say nothing on its own. Note what is tested: the form, and never the warmth — this project has no material properties and will not acquire any.`
      : `About ${layout.volume.toFixed(1)} m³.`,
  }
}

/** No window anywhere: the door is the only opening in the building. */
export function checkNoWindow(house: House, layout: Layout): CheckResult {
  /*
   * Two halves, and the second is the one that was missing.
   *
   * The posts: every one the ring calls for is there, with one gap for the
   * door. That half once stood alone, and it passed on a wall that was two
   * thirds air — thirty-two posts of thirteen centimetres do not close a
   * circle twelve metres round, and counting them cannot see the spaces.
   *
   * The boards: walking the lining's own vertices round the axis, the widest
   * angular gap between neighbours must be the doorway — no wider than the
   * door's arc, centred on its bearing — and every other step must be one
   * facet. A gap anywhere else is a window, whatever the post count says.
   */
  const posts = house.parts.filter((p) => p.stage === 'dinding' && p.id.startsWith('tiang-')).length
  let expected = 0
  for (let k = 0; k < layout.facets; k++) {
    const a = (k / layout.facets) * Math.PI * 2
    const bearing = a > Math.PI ? a - Math.PI * 2 : a
    if (Math.abs(bearing) >= layout.door.halfAngle) expected += 1
  }
  const postsOk = posts === expected && expected > 0 && layout.facets - expected >= 1

  const lining = house.parts.find((p) => p.id === 'papan-dinding')
  let liningOk = false
  let widest = 0
  if (lining && lining.kind === 'mesh') {
    const bearings = new Set<number>()
    const pos = lining.positions
    for (let i = 0; i < pos.length; i += 3) {
      const a = Math.atan2(pos[i + 2] ?? 0, pos[i] ?? 0)
      bearings.add(Math.round(((a + Math.PI * 2) % (Math.PI * 2)) * 1e6) / 1e6)
    }
    const sorted = [...bearings].sort((x, y) => x - y)
    let widestAt = 0
    for (let i = 0; i < sorted.length; i++) {
      const from = sorted[i] ?? 0
      const to = i + 1 < sorted.length ? (sorted[i + 1] ?? 0) : (sorted[0] ?? 0) + Math.PI * 2
      if (to - from > widest) {
        widest = to - from
        widestAt = (from + to) / 2
      }
    }
    const centre = Math.atan2(Math.sin(widestAt), Math.cos(widestAt))
    const step = (Math.PI * 2) / layout.facets
    const others = sorted.every((b, i) => {
      const next = i + 1 < sorted.length ? (sorted[i + 1] ?? 0) : (sorted[0] ?? 0) + Math.PI * 2
      return next - b === widest || next - b <= step * 1.01
    })
    liningOk =
      widest <= layout.door.halfAngle * 2 + 1e-6 && Math.abs(centre) < 1e-3 && others
  }
  const ok = postsOk && liningOk
  return {
    key: 'no-window',
    titleId: 'Nol jendela: pintu adalah satu-satunya bukaan di seluruh bangunan',
    titleEn: 'Zero windows: the door is the only opening in the whole building',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `${posts} tiang dinding dan satu lapis papan menutup lingkarannya, dengan satu celah ${((widest * 180) / Math.PI).toFixed(0)}° untuk pintu dan tidak satu pun celah lain. Cahaya masuk lewat pintu itu dan lewat asap yang keluar dari atapnya. Hanya bangunan ini dalam projek ini yang tanpa jendela sama sekali — sebuah bukaan adalah panas yang pergi.`
      : !postsOk
        ? `${posts} tiang dari ${expected} yang seharusnya.`
        : `Papan dinding meninggalkan celah ${((widest * 180) / Math.PI).toFixed(0)}° yang bukan pintu.`,
    detailEn: ok
      ? `${posts} wall posts and one layer of boards close the ring, with one ${((widest * 180) / Math.PI).toFixed(0)}° gap for the door and no other gap anywhere. Light comes through that door and through the smoke leaving the roof. Only this building in the project has no window at all — an opening is heat going.`
      : !postsOk
        ? `${posts} posts where ${expected} were called for.`
        : `The wall boards leave a ${((widest * 180) / Math.PI).toFixed(0)}° gap that is not the door.`,
  }
}

/** A person has to stoop to get in. */
export function checkLowDoor(layout: Layout): CheckResult {
  const ok = layout.door.height < 1.5
  return {
    key: 'low-door',
    titleId: 'Pintunya terlalu rendah untuk dilalui dengan berdiri',
    titleEn: 'The door is too low to walk through upright',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `Setinggi ${layout.door.height.toFixed(2)} m dan selebar ${layout.door.width.toFixed(2)} m. Orang harus membungkuk, dan itu ukuran yang dipilih, bukan kelalaian: lubang yang besar adalah panas yang keluar. Satu-satunya pintu dalam projek ini yang begitu.`
      : `Setinggi ${layout.door.height.toFixed(2)} m.`,
    detailEn: ok
      ? `${layout.door.height.toFixed(2)} m high and ${layout.door.width.toFixed(2)} m wide. A person has to stoop, and that is a chosen dimension rather than an oversight: a large opening is heat leaving. The only door in this project like it.`
      : `${layout.door.height.toFixed(2)} m high.`,
  }
}

/** It sits on the ground, because the ground is warm. */
export function checkOnTheGround(house: House, layout: Layout): CheckResult {
  const floor = house.parts.find((p) => p.id === 'lantai')
  const low = floor ? partBounds(floor).min[1] : Infinity
  const ok = low <= TOL && layout.floorY < 0.2
  return {
    key: 'on-the-ground',
    titleId: 'Tidak berpanggung: lantainya di atas tanah',
    titleEn: 'Not raised: the floor lies on the earth',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `Lantai pada ${layout.floorY.toFixed(2)} m. Dua belas bangunan lain dalam projek ini berdiri di atas tiang atau pasangan; yang ini duduk di tanah, karena tanah menyimpan panas dan mengangkat rumah akan menaruh udara dingin di bawah orang yang tidur di atasnya. Nolnya sebuah keputusan, bukan ketiadaan.`
      : `Lantai pada ${layout.floorY.toFixed(2)} m.`,
    detailEn: ok
      ? `A floor at ${layout.floorY.toFixed(2)} m. The other twelve buildings in this project stand on posts or masonry; this one sits on the earth, because the ground holds heat and raising the house would put cold air under the people sleeping above it. The zero is a decision rather than an absence.`
      : `A floor at ${layout.floorY.toFixed(2)} m.`,
  }
}

/** People sleep above the fire, where the heat is. */
export function checkSleepAbove(house: House, layout: Layout): CheckResult {
  const info = bangunanInfo(layout.rules.bangunan)
  const loft = house.parts.find((p) => p.id === 'loteng')
  const hearth = house.parts.find((p) => p.id === 'tungku')
  const faults: string[] = []
  if (Boolean(loft) !== layout.loft.present) faults.push('the loft does not follow the rule')
  if (!hearth) faults.push('there is no hearth')
  if (loft && hearth) {
    if (partBounds(loft).min[1] <= partBounds(hearth).max[1]) faults.push('the loft is not above the fire')
  }
  if (!info.loft && loft) faults.push('a wamai has a loft')
  const ok = faults.length === 0
  return {
    key: 'sleep-above',
    titleId: 'Orang tidur di atas api, karena panas naik',
    titleEn: 'People sleep above the fire, because heat rises',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? layout.loft.present
        ? `Loteng pada ${layout.loft.y.toFixed(2)} m, tepat di atas tungku. Argumen termal bangunan ini dinyatakan sebagai sebuah bidang: bukan penjelasan tentang mengapa rumah ini hangat, melainkan lantai yang diletakkan di tempat panasnya berada.`
        : `Tidak ada loteng — ${info.name.toLowerCase()} tidak punya, dan babi tidak memanjat galah.`
      : faults.join('; '),
    detailEn: ok
      ? layout.loft.present
        ? `A loft at ${layout.loft.y.toFixed(2)} m, directly above the hearth. The building’s thermal argument stated as a plane: not an explanation of why the house is warm, but a floor put where the heat is.`
        : `No loft — a ${info.name.toLowerCase()} has none, and pigs do not climb a pole.`
      : faults.join('; '),
  }
}

/** The blanket thickens with the rule and nothing else moves. */
export function checkBlanket(layout: Layout): CheckResult {
  const ok = layout.thatchDepth > 0 && Math.abs(layout.thatchDepth - DIMS.layerDepth.value * layout.rules.lapis) < 1e-9
  return {
    key: 'blanket',
    titleId: 'Tebal selimutnya satu-satunya aturan yang seluruhnya soal panas',
    titleEn: 'The thickness of the blanket is the only rule here that is entirely about heat',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `${layout.rules.lapis} lapis, setebal ${(layout.thatchDepth * 100).toFixed(0)} cm. Ia tidak mengubah siapa yang tinggal di sini, apa yang boleh diakui rumah tangganya, atau bagaimana bangunannya dipakai — hanya berapa lama panas api bertahan, dan berapa banyak rumput yang harus dipotong dan dipikul.`
      : `${layout.rules.lapis} lapis.`,
    detailEn: ok
      ? `${layout.rules.lapis} layers, ${(layout.thatchDepth * 100).toFixed(0)} cm thick. It changes nothing about who lives here, what the household may claim, or how the building is used — only how long the fire’s heat lasts, and how much grass has to be cut and carried.`
      : `${layout.rules.lapis} layers.`,
  }
}

/** Thatch courses lap with no bare ring, from the eave to the point. */
export function checkThatchCoverage(layout: Layout): CheckResult {
  const bands = thatchBands(layout)
  const gaps: string[] = []
  const first = bands[0]
  if (!first || first.foot < 1 - TOL) gaps.push('the lowest course does not reach the eave')
  for (let k = 1; k < bands.length; k++) {
    const below = bands[k - 1]
    const cur = bands[k]
    if (!below || !cur) continue
    if (cur.foot - below.head <= TOL) gaps.push(`course ${k + 1} does not lap course ${k}`)
  }
  const top = bands[bands.length - 1]
  if (!top || top.head > TOL) gaps.push('the top course does not reach the apex')
  const ok = gaps.length === 0
  return {
    key: 'thatch-coverage',
    titleId: 'Lapis alang-alang saling menindih tanpa celah, dari tepi sampai puncak',
    titleEn: 'Thatch courses lap with no bare ring, from the eave to the point',
    status: ok ? 'pass' : 'fail',
    detail: ok ? `${bands.length} lapis menutupi ${coneRun(domeProfile(layout)).toFixed(2)} m garis luar.` : gaps.join('; '),
    detailEn: ok ? `${bands.length} courses over ${coneRun(domeProfile(layout)).toFixed(2)} m of outline.` : gaps.join('; '),
  }
}

/** Nothing of the frame reaches outside the dome at its own height. */
export function checkFrameInsideDome(house: House, layout: Layout): CheckResult {
  const profile = domeProfile(layout)
  const skin = layout.postSection * 2
  let worst = 0
  let worstId = ''
  for (const part of house.parts) {
    if (part.stage !== 'rangka') continue
    for (const [x, y, z] of partPoints(part)) {
      // The dome's radius at this point's own height, walked from the profile.
      let allow = profile[0]?.r ?? 0
      for (let i = 1; i < profile.length; i++) {
        const a = profile[i - 1]
        const b = profile[i]
        if (!a || !b) continue
        if (y >= a.y && y <= b.y) {
          const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y)
          allow = a.r + (b.r - a.r) * t
          break
        }
      }
      const over = Math.hypot(x, z) - (allow + skin)
      if (over > worst) {
        worst = over
        worstId = part.id
      }
    }
  }
  const ok = worst <= 0
  return {
    key: 'frame-inside-dome',
    titleId: 'Setiap kasau berada di dalam kubahnya pada ketinggiannya sendiri',
    titleEn: 'Every rafter lies inside the dome at its own height',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? 'Tidak ada titik rangka yang keluar dari permukaan kubah pada ketinggiannya sendiri. Kasau lurus di bawah permukaan melengkung akan menonjol di tengah bentangnya — kesalahan yang sudah ditemukan projek ini enam kali, dan di sini muncul sebagai lengkung, bukan sebagai garis yang bergeser.'
      : `${worstId} keluar ${(worst * 1000).toFixed(0)} mm dari kubahnya.`,
    detailEn: ok
      ? 'No point of the frame reaches outside the dome at its own height. A straight rafter under a curved surface stands proud over the middle of its span — a fault this project has now found six times, arriving here as a curve rather than as a moved line.'
      : `${worstId} reaches ${(worst * 1000).toFixed(0)} mm outside the dome.`,
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
    checkSmallVolume(layout),
    checkNoWindow(house, layout),
    checkLowDoor(layout),
    checkOnTheGround(house, layout),
    checkSleepAbove(house, layout),
    checkBlanket(layout),
    checkFrameInsideDome(house, layout),
    checkThatchCoverage(layout),
    checkPartProvenance(house),
    checkAgainstSurvey(),
  ]
}
