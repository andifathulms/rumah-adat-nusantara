/**
 * The honai, from the floor to the door.
 *
 * Axes as in the other twelve, though a round building cares less: X runs
 * front to rear, Y is up, and the door is at bearing zero — the one thing that
 * gives a circle a direction, exactly as on the mbaru niang.
 *
 * Nothing here is raised. Twelve buildings in this project stand on posts or a
 * plinth, and this one sits on the ground because the ground is warm: lifting
 * it would put cold air under the floor people sleep above. `underfloorHeight`
 * reports zero for the first time in the collection, and that zero is a
 * decision rather than an absence.
 */

import { computeNormals, emptyMesh } from '@/lib/core/geometry'
import type { MeshData } from '@/lib/core/geometry'
import { partBuilders } from '@/lib/core/parts'
import { coneSurface } from '@/lib/core/cone'
import { DIMS, bangunanInfo } from './rules'
import type { DimKey } from './rules'
import type { DaniKinds, Joint, Layout, Part, Rules } from './types'

const builders = partBuilders<DaniKinds>()
const box = builders.box
export const meshPart = builders.mesh

/* ── Layout ───────────────────────────────────────────────────────────── */

export function resolveLayout(rules: Rules): Layout {
  const info = bangunanInfo(rules.bangunan)
  const s = info.scale

  const radius = DIMS.radius.value * s
  const wallHeight = DIMS.wallHeight.value * s
  const floorY = DIMS.floorThickness.value * s
  const eaveY = floorY + wallHeight
  const apexY = eaveY + DIMS.apexRise.value * s

  /*
   * The blanket, and it is the one thing a household decides.
   *
   * Every extra layer is a course depth more of grass over the whole dome. It
   * changes no dimension of the room below — which is what makes it the only
   * purely thermal rule in the project.
   */
  const thatchDepth = DIMS.layerDepth.value * rules.lapis
  const slope = Math.hypot(radius + DIMS.eaveOversail.value * s, apexY - eaveY)
  const thatchCourses = Math.max(3, Math.round(slope / (DIMS.thatchCourseDepth.value * s)))

  const doorWidth = DIMS.doorWidth.value * s
  const doorHeight = DIMS.doorHeight.value * s

  // The floor area of the room, times the height a person could use — a rough
  // figure and honestly so, but it is the number this building is about.
  const volume = Math.PI * radius * radius * (wallHeight + (apexY - eaveY) / 3)

  return {
    rules,
    radius,
    facets: Math.max(8, Math.round(DIMS.facets.value)),
    wallHeight,
    postSection: DIMS.postSection.value * s,
    floorY,
    eaveY,
    apexY,
    thatchCourses,
    thatchDepth,
    door: {
      width: doorWidth,
      height: doorHeight,
      halfAngle: Math.atan2(doorWidth / 2 + DIMS.jambSection.value * s, radius),
    },
    loft: {
      present: rules.loteng && info.loft,
      y: floorY + DIMS.loftHeight.value * s,
      /*
       * Out to the wall, because the wall carries it.
       *
       * Given a share of the radius at first, which left it a third of a metre
       * short of the ring on every side and bearing on nothing — the same
       * "interpolated where it should be derived" fault this project has now
       * found five times.
       */
      radius,
    },
    hearth: { radius: DIMS.hearthRadius.value * s, depth: DIMS.hearthDepth.value * s },
    volume,
    dims: [],
  }
}

/* ── The build ────────────────────────────────────────────────────────── */

/** A closed disc, for the floor and the loft. */
function discMesh(cy: number, radius: number, thickness: number, facets: number): MeshData {
  const mesh = emptyMesh()
  const n = Math.max(8, Math.round(facets))
  const push = (x: number, y: number, z: number) => {
    mesh.positions.push(x, y, z)
    mesh.normals.push(0, 0, 0)
    mesh.uvs.push(x / (radius * 2) + 0.5, z / (radius * 2) + 0.5)
    return mesh.positions.length / 3 - 1
  }
  const top = cy + thickness / 2
  const bottom = cy - thickness / 2
  const topCentre = push(0, top, 0)
  const bottomCentre = push(0, bottom, 0)
  const rim: { top: number; bottom: number }[] = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const x = Math.cos(a) * radius
    const z = Math.sin(a) * radius
    rim.push({ top: push(x, top, z), bottom: push(x, bottom, z) })
  }
  for (let k = 0; k < n; k++) {
    const a = rim[k]
    const b = rim[(k + 1) % n]
    if (!a || !b) continue
    mesh.indices.push(topCentre, a.top, b.top)
    mesh.indices.push(bottomCentre, b.bottom, a.bottom)
    mesh.indices.push(a.top, a.bottom, b.bottom)
    mesh.indices.push(a.top, b.bottom, b.top)
  }
  computeNormals(mesh)
  return mesh
}

const WALL_DIMS: readonly DimKey[] = [
  'radius',
  'wallHeight',
  'facets',
  'postSection',
  'smallToKeepWarm',
  'ebeiScale',
]

export function buildFrame(layout: Layout): { parts: readonly Part[]; joints: readonly Joint[] } {
  const parts: Part[] = []
  const joints: Joint[] = []
  const s = bangunanInfo(layout.rules.bangunan).scale
  const sec = layout.postSection

  parts.push(
    meshPart(
      'lantai',
      { name: 'lantai', nameId: 'Lantai', nameEn: 'Floor' },
      'lantai',
      0,
      'papan',
      ['floorThickness', 'radius', 'facets', 'smallToKeepWarm'],
      discMesh(layout.floorY / 2, layout.radius, layout.floorY, layout.facets),
    ),
  )

  /*
   * The wall: a close ring of posts, with a gap at bearing zero for the door.
   *
   * The gap is where the door is and there is no other opening anywhere — see
   * `checkNoWindow`. On a round building the door is also the only thing that
   * gives it a direction, which the mbaru niang says at greater length.
   */
  const half = layout.door.halfAngle
  for (let k = 0; k < layout.facets; k++) {
    const a = (k / layout.facets) * Math.PI * 2
    const bearing = a > Math.PI ? a - Math.PI * 2 : a
    if (Math.abs(bearing) < half) continue
    parts.push(
      box(
        `tiang-${k}`,
        { name: 'tiang dinding', nameId: 'Tiang dinding', nameEn: 'Wall post' },
        'dinding',
        k,
        'kayu',
        WALL_DIMS,
        [Math.cos(a) * layout.radius, layout.floorY + layout.wallHeight / 2, Math.sin(a) * layout.radius],
        [sec, layout.wallHeight, sec],
      ),
    )
  }

  /*
   * The boards, set tight inside the posts and stopping only at the door.
   *
   * Thirty-two posts of thirteen centimetres round a circle twelve metres
   * long close about a third of it; the rest was air, and the model drew a
   * picket fence round the one building here whose whole problem is keeping
   * heat in. The boards are a surface of revolution of the wall's own
   * section — up the outside face, across the top, down the inside — cut by
   * the same doorway the thatch is cut by, so the door is the opening and
   * nothing else is.
   */
  {
    const board = DIMS.wallBoard.value * s
    const rOut = layout.radius - sec / 2
    const rIn = rOut - board
    const y0 = layout.floorY
    const y1 = layout.floorY + layout.wallHeight
    parts.push(
      meshPart(
        'papan-dinding',
        { name: 'papan dinding', nameId: 'Papan dinding', nameEn: 'Wall boards' },
        'dinding',
        layout.facets,
        'papan',
        [...WALL_DIMS, 'wallBoard', 'noWindow'],
        coneSurface(
          [
            { r: rOut, y: y0 },
            { r: rOut, y: y1 },
            { r: rIn, y: y1 },
            { r: rIn, y: y0 },
          ],
          {
            facets: layout.facets,
            uvScale: 0.4,
            gap: { from: -layout.door.halfAngle, to: layout.door.halfAngle },
          },
        ),
      ),
    )
  }

  /* The door: two jambs and a lintel, in the gap. */
  const jamb = DIMS.jambSection.value * s
  const doorDims: readonly DimKey[] = ['doorWidth', 'doorHeight', 'jambSection', 'noWindow']
  for (const sz of [-1, 1] as const) {
    parts.push(
      box(
        `pintu-tiang-${sz > 0 ? 'a' : 'b'}`,
        { name: 'kusen', nameId: 'Tiang pintu', nameEn: 'Door jamb' },
        'pintu',
        sz > 0 ? 1 : 0,
        'kayu',
        doorDims,
        [layout.radius, layout.floorY + layout.door.height / 2, sz * (layout.door.width / 2 + jamb / 2)],
        [jamb, layout.door.height, jamb],
      ),
    )
  }
  parts.push(
    box(
      'pintu-ambang',
      { name: 'ambang', nameId: 'Ambang pintu', nameEn: 'Door lintel' },
      'pintu',
      2,
      'kayu',
      doorDims,
      [layout.radius, layout.floorY + layout.door.height + jamb / 2, 0],
      [jamb, jamb, layout.door.width + jamb * 2],
    ),
  )
  // The wall carries on above the lintel: the opening is a door, not a slot up
  // to the eave, and the difference matters for a building trying to keep heat.
  parts.push(
    box(
      'pintu-atas',
      { name: 'dinding', nameId: 'Dinding di atas pintu', nameEn: 'Wall above the door' },
      'pintu',
      3,
      'papan',
      doorDims,
      [
        layout.radius,
        layout.floorY + layout.door.height + jamb + (layout.wallHeight - layout.door.height - jamb) / 2,
        0,
      ],
      [sec, Math.max(1e-3, layout.wallHeight - layout.door.height - jamb), layout.door.width + jamb * 2],
    ),
  )

  /* The sleeping plane, above the fire. */
  if (layout.loft.present) {
    parts.push(
      meshPart(
        'loteng',
        { name: 'loteng', nameId: 'Loteng', nameEn: 'Sleeping loft' },
        'loteng',
        0,
        'papan',
        ['loftHeight', 'radius', 'floorThickness', 'sleepAbove'],
        discMesh(layout.loft.y, layout.loft.radius, DIMS.floorThickness.value * s, layout.facets),
      ),
    )
  }

  /* The hearth, last, because it is the reason for all of it. */
  parts.push(
    meshPart(
      'tungku',
      { name: 'tungku', nameId: 'Tungku', nameEn: 'Hearth' },
      'tungku',
      0,
      'batu',
      ['hearthRadius', 'hearthDepth', 'fireInside', 'smallToKeepWarm'],
      discMesh(layout.floorY + layout.hearth.depth / 2, layout.hearth.radius, layout.hearth.depth, layout.facets),
    ),
  )

  return { parts, joints }
}
