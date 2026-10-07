/**
 * The ume kbubu, from the centre post out.
 *
 * The order matters in one place particularly: the loft goes in before the
 * thatch closes over it. That is how it is built and it is also the only way
 * it *can* be built, because once the dome is on there is a door a person has
 * to stoop through and nothing else. The Sumbanese uma made the same point
 * about its tower — the loft before the peak — and the reason there was what
 * the building is for. Here it is that plus simple access.
 *
 * Axes as everywhere else: X runs front to rear, Y is up, Z is transverse. The
 * door faces −X, and the lopo stands off to the side in the same yard.
 */

import { clamp01 } from '@/lib/core/geometry'
import { coneFractionAt, coneSurface } from '@/lib/core/cone'
import { courseBands } from '@/lib/core/courses'
import type { ConePoint } from '@/lib/core/cone'
import { shiftMesh } from '@/lib/core/geometry'
import { partBuilders } from '@/lib/core/parts'
import { DIMS, eaveOf } from './rules'
import type { DimKey } from './rules'
import type { AtoniKinds, Joint, Layout, Part, Rules } from './types'

const builders = partBuilders<AtoniKinds>()
const box = builders.box
const mesh = builders.mesh

/* ── Layout ───────────────────────────────────────────────────────────── */

export function resolveLayout(rules: Rules): Layout {
  const radius = DIMS.radius.value
  const wallY = eaveOf(rules.dinding)
  const apexY = wallY + DIMS.domeRise.value
  const ringRadius = radius * 0.72

  /*
   * The loft: deeper for every harvest kept, and sized off the ring of posts
   * that carries it rather than off the radius of the house. A thing that
   * rests on something takes its size from what carries it — the fault the
   * joglo, the omo and the uma each made once between them.
   */
  const depth = DIMS.loftPerYear.value * rules.simpanan
  const loftY = DIMS.loftBase.value

  return {
    rules,
    radius,
    facets: DIMS.facets.value,
    wallY,
    apexY,
    profile: [
      { r: radius, y: wallY },
      { r: radius * 0.86, y: wallY + DIMS.domeRise.value * 0.42 },
      { r: 0, y: apexY },
    ],
    loft: {
      radius: ringRadius * DIMS.loftShare.value,
      y: loftY,
      depth,
      years: rules.simpanan,
    },
    smoke: { from: DIMS.smokeLow.value, to: DIMS.smokeHigh.value },
    hearth: { radius: DIMS.hearthRadius.value, height: DIMS.hearthHeight.value },
    door: {
      width: DIMS.doorWidth.value,
      height: DIMS.doorHeight.value,
      halfAngle: Math.atan2(DIMS.doorWidth.value / 2 + DIMS.jambSection.value, radius),
    },
    body: { standing: DIMS.standingHeight.value, stooping: DIMS.stoopingHeight.value },
    lopo: {
      present: rules.lopo,
      radius: DIMS.lopoRadius.value,
      floorY: DIMS.lopoFloorY.value,
      apexY: DIMS.lopoFloorY.value + DIMS.lopoRise.value,
    },
    dims: [],
  }
}

/** Where the ring of posts stands, which is what carries the dome and the loft. */
export function ringRadius(layout: Layout): number {
  return layout.radius * 0.72
}

/* ── The build ────────────────────────────────────────────────────────── */

const DOME_DIMS: readonly DimKey[] = ['radius', 'domeRise', 'rafterSection', 'postCount']

export function buildHouseParts(layout: Layout): { parts: readonly Part[]; joints: readonly Joint[] } {
  const parts: Part[] = []
  const joints: Joint[] = []
  const engage = DIMS.jointEngagement.value
  const post = DIMS.postSection.value
  const centre = DIMS.centreSection.value
  const ring = ringRadius(layout)
  const wallKey: DimKey = layout.rules.dinding === 'penuh' ? 'eaveHeight' : 'wallHeight'

  /*
   * The centre post, and the loft hangs from it. Its head is well above the
   * loft, because what holds a platform up has to reach past it.
   */
  // Up to the apex: a king post that stopped short would leave the top courses
  // of thatch resting on nothing, which is what the build-order check said the
  // first time this was written.
  const centreTop = layout.apexY
  parts.push(
    box(
      'tiang-tengah',
      { name: 'tiang', nameId: 'Tiang tengah', nameEn: 'Centre post' },
      'tiang',
      0,
      'kayu',
      ['centreSection', 'domeRise', 'loftBase'],
      [0, centreTop / 2, 0],
      [centre, centreTop, centre],
    ),
  )
  const count = DIMS.postCount.value
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    parts.push(
      box(
        `tiang-${i}`,
        { name: 'tiang', nameId: `Tiang ${i + 1}`, nameEn: `Post ${i + 1}` },
        'tiang',
        1 + i,
        'kayu',
        ['postSection', 'postCount', wallKey],
        [Math.cos(a) * ring, layout.wallY / 2 + layout.wallY * 0.25, Math.sin(a) * ring],
        [post, layout.wallY * 1.5, post],
      ),
    )
  }

  /* The dome's rafters, from the ring to the head of the centre post. */
  const rafter = DIMS.rafterSection.value
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const x = Math.cos(a) * ring
    const z = Math.sin(a) * ring
    const id = `usuk-${i}`
    const run = Math.hypot(ring, centreTop - layout.wallY)
    parts.push(
      box(
        id,
        { name: 'usuk', nameId: `Usuk ${i + 1}`, nameEn: `Rafter ${i + 1}` },
        'rangka',
        i,
        'bambu',
        DOME_DIMS,
        [x / 2, (layout.wallY + centreTop) / 2, z / 2],
        [rafter, run, rafter],
        // Leaning in to the head of the centre post: the angle is whatever the
        // ring and that head make between them, which is the one description.
        [Math.atan2(z, centreTop - layout.wallY), 0, -Math.atan2(x, centreTop - layout.wallY)],
      ),
    )
    if (i === 0) {
      joints.push({
        id: 'cabang-usuk',
        kind: 'cabang',
        mortise: 'tiang-tengah',
        tenon: id,
          // Inboard of the head rather than on its centre line: a rafter whose
        // top end is exactly the joint plane engages nothing.
        at: [rafter, centreTop - rafter, 0],
        halfExtents: [(centre * engage) / 2, (rafter * engage) / 2, (centre * engage) / 2],
      })
    }
  }

  /* The cord the loft hangs on, down the centre post. */
  parts.push(
    box(
      'gantungan',
      { name: 'gantungan', nameId: 'Tali penggantung para', nameEn: 'The cord the loft hangs on' },
      'rangka',
      200,
      'bambu',
      ['loftBase', 'rafterSection'],
      [0, (layout.loft.y + centreTop) / 2, 0],
      [
        DIMS.rafterSection.value,
        centreTop - layout.loft.y + DIMS.rafterSection.value,
        DIMS.rafterSection.value,
      ],
    ),
  )

  /*
   * The loft, before the roof. Its floor, and the seed hanging in it as one
   * declared depth rather than as modelled cobs — this project draws what it
   * can state, and a maize cob is not a dimension.
   */
  parts.push(
    box(
      'para',
      { name: 'para', nameId: 'Para', nameEn: 'The loft' },
      'para',
      0,
      'bambu',
      ['loftBase', 'loftShare', 'loftPerYear', 'seedIsMeasuredInYears', 'smokeKeepsTheSeed'],
      [0, layout.loft.y, 0],
      [layout.loft.radius * 2, DIMS.rafterSection.value, layout.loft.radius * 2],
    ),
  )
  parts.push(
    box(
      'benih',
      { name: 'benih', nameId: `Benih ${layout.loft.years} panen`, nameEn: `Seed for ${layout.loft.years} harvests` },
      'para',
      1,
      'bambu',
      ['loftPerYear', 'loftShare', 'seedIsMeasuredInYears'],
      [0, layout.loft.y + layout.loft.depth / 2, 0],
      [layout.loft.radius * 1.7, layout.loft.depth, layout.loft.radius * 1.7],
    ),
  )
  /*
   * The loft hangs on a pair of cords from the frame, and they are emitted in
   * the framing stage so that the joint between them and the loft is between
   * two consecutive stages. A joint that skips one is a joint between two
   * things that were never on site together.
   */
  joints.push({
    id: 'tali-para',
    kind: 'tali',
    mortise: 'gantungan',
    tenon: 'para',
    at: [0, layout.loft.y, 0],
    halfExtents: [
      (DIMS.rafterSection.value * engage) / 2,
      (DIMS.rafterSection.value * engage) / 2,
      (DIMS.rafterSection.value * engage) / 2,
    ],
  })

  /* The door frame, standing in the thatch rather than under it. */
  const jamb = DIMS.jambSection.value
  const set = (DIMS.thatchBed.value + DIMS.thatchThickness.value) / 2
  for (const sz of [-1, 1] as const) {
    parts.push(
      box(
        `kusen-${sz > 0 ? 'a' : 'b'}`,
        { name: 'kusen', nameId: 'Kusen pintu', nameEn: 'Door jamb' },
        'rangka',
        100 + (sz > 0 ? 0 : 1),
        'kayu',
        ['doorWidth', 'doorHeight', 'jambSection', 'oneLowDoor'],
        [
          -(layout.radius + set - jamb),
          layout.door.height / 2,
          (sz * (layout.door.width + jamb)) / 2,
        ],
        [jamb, layout.door.height, jamb],
      ),
    )
  }
  parts.push(
    box(
      'ambang',
      { name: 'ambang', nameId: 'Ambang pintu', nameEn: 'Door head' },
      'rangka',
      102,
      'kayu',
      ['doorWidth', 'doorHeight', 'jambSection', 'oneLowDoor'],
      [-(layout.radius + set - jamb), layout.door.height + jamb / 2, 0],
      [jamb, jamb, layout.door.width + jamb * 2],
    ),
  )

  /*
   * The thatch, course by course, with one hole in it.
   *
   * `coneSurface` takes a gap because a surface of revolution has no other way
   * to be interrupted, and a door is exactly an interruption — the lesson the
   * mbaru niang's buried door taught. The opening is cut from the same numbers
   * the jambs stand on.
   */
  const courses = DIMS.thatchCourses.value
  const bed = DIMS.thatchBed.value
  const thickness = DIMS.thatchThickness.value
  const fDoor = coneFractionAt(layout.profile, layout.door.height + jamb)
  /*
   * The foot of the house, closed all round but for the door.
   *
   * Both forms named a perimeter and neither built one. On the default the
   * thatch was said to come down nearly to the ground with no gap anywhere
   * but the door, and it stopped thirty-five centimetres up with nothing
   * under it; on the low-wall form the wall was a dimension in the table and
   * a metre of open air in the model. So it is built now, of the material
   * the form says — thatch carried down to the ground, or timber — tucked
   * under the lowest course by the depth of a course of thatch, and cut by
   * the same doorway as the courses above it.
   */
  {
    const wall = DIMS.wallBoard.value
    const rOut = layout.radius + bed
    const rIn = rOut - wall
    const top = layout.wallY + thickness
    const penuh = layout.rules.dinding === 'penuh'
    parts.push(
      mesh(
        'kaki-dinding',
        penuh
          ? { name: 'alang-alang', nameId: 'Kaki alang-alang', nameEn: 'Thatch skirt to the ground' }
          : { name: 'dinding', nameId: 'Dinding kayu rendah', nameEn: 'Low timber wall' },
        'atap',
        0,
        penuh ? 'alang' : 'kayu',
        ['wallBoard', penuh ? 'eaveHeight' : 'wallHeight', 'thatchThickness', 'oneLowDoor'],
        coneSurface(
          [
            { r: rOut, y: 0 },
            { r: rOut, y: top },
            { r: rIn, y: top },
            { r: rIn, y: 0 },
          ],
          {
            facets: layout.facets,
            uvScale: 0.4,
            gap: { from: Math.PI - layout.door.halfAngle, to: Math.PI + layout.door.halfAngle },
          },
        ),
      ),
    )
  }

  /*
   * Lapped, through the same arithmetic every other thatched roof here uses:
   * each course's foot reaches down past the head of the one below. These
   * courses were once cut edge to edge, each standing off its frame further
   * at its foot than at its head, so at every join the course above began a
   * hand's breadth outside the one below — a slot round the whole dome at
   * every course, on the one roof here whose job is to keep smoke in.
   */
  for (const band of courseBands(courses, DIMS.thatchLap.value)) {
    const c = band.course
    const from = 1 - band.foot
    const to = 1 - band.head
    const span = Math.max(1e-6, to - from)
    const cut = from < fDoor
    parts.push(
      mesh(
        `atap-${c}`,
        { name: 'alang-alang', nameId: `Lapis alang-alang ${c + 1}`, nameEn: `Thatch course ${c + 1}` },
        'atap',
        c + 1,
        'alang',
        ['thatchBed', 'thatchThickness', 'thatchCourses', 'thatchLap', 'domeRise', 'oneLowDoor'],
        coneSurface(layout.profile, {
          facets: layout.facets,
          uvScale: 0.4,
          fFrom: from,
          fTo: to,
          offsetAt: (f) => bed + thickness * (1 - clamp01((f - from) / span)),
          // Only the courses the door reaches are interrupted; above its head
          // the thatch goes round unbroken, which is the whole point of a
          // building with one opening.
          ...(cut ? { gap: { from: Math.PI - layout.door.halfAngle, to: Math.PI + layout.door.halfAngle } } : {}),
        }),
      ),
    )
  }

  /* The hearth, under the loft, and the fire itself is what cannot be drawn. */
  parts.push(
    box(
      'tungku',
      { name: 'tungku', nameId: 'Tungku', nameEn: 'The hearth' },
      'tungku',
      0,
      'batu',
      ['hearthRadius', 'hearthHeight', 'smokeKeepsTheSeed'],
      [0, layout.hearth.height / 2, 0],
      [layout.hearth.radius * 2, layout.hearth.height, layout.hearth.radius * 2],
    ),
  )

  /* The lopo: round, open, on posts — the opposite building, in the same yard. */
  if (layout.lopo.present) {
    const stand = DIMS.lopoStand.value
    const lopoPost = post
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      parts.push(
        box(
          `lopo-tiang-${i}`,
          { name: 'tiang', nameId: `Tiang lopo ${i + 1}`, nameEn: `Lopo post ${i + 1}` },
          'lopo',
          i,
          'kayu',
          ['lopoRadius', 'lopoFloorY', 'lopoStand', 'postSection'],
          [
            Math.cos(a) * layout.lopo.radius * 0.7,
            layout.lopo.floorY / 2,
            stand + Math.sin(a) * layout.lopo.radius * 0.7,
          ],
          [lopoPost, layout.lopo.floorY, lopoPost],
        ),
      )
    }
    parts.push(
      box(
        'lopo-lantai',
        { name: 'lantai', nameId: 'Lantai lopo', nameEn: 'Lopo floor' },
        'lopo',
        4,
        'bambu',
        ['lopoRadius', 'lopoFloorY', 'lopoIsTheOpposite'],
        [0, layout.lopo.floorY + DIMS.rafterSection.value / 2, stand],
        [layout.lopo.radius * 2, DIMS.rafterSection.value, layout.lopo.radius * 2],
      ),
    )
    const lopoProfile: readonly ConePoint[] = [
      { r: layout.lopo.radius, y: layout.lopo.floorY + 0.35 },
      { r: layout.lopo.radius * 0.6, y: layout.lopo.floorY + DIMS.lopoRise.value * 0.55 },
      { r: 0, y: layout.lopo.apexY },
    ]
    parts.push(
      mesh(
        'lopo-atap',
        { name: 'atap', nameId: 'Atap lopo', nameEn: 'Lopo roof' },
        'lopo',
        5,
        'alang',
        ['lopoRise', 'lopoRadius', 'lopoIsTheOpposite'],
        shiftMesh(coneSurface(lopoProfile, { facets: layout.facets, uvScale: 0.4 }), 0, 0, stand),
      ),
    )
  }

  return { parts, joints }
}
