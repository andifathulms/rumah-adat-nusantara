/**
 * The rule pack for the Dani honai.
 *
 * The thirteenth pack, and the first whose canon rules are about temperature.
 *
 * The Nias pack had to widen this project's premise once already, to admit
 * rules about the earth alongside rules about people; the Arfak pack showed
 * the widening was enough. This one widens it again in a smaller way, and it
 * is worth being precise about how. `smallToKeepWarm` and `noWindow` are canon
 * and they are not about a society or a hazard — they are about a night at
 * sixteen hundred metres. The sources state both plainly, so they are canon by
 * the same test every other rule here passes: a tradition says this about its
 * own building.
 *
 * What the pack cannot do is prove any of it works. There are no material
 * properties in this project and there will not be, so `checkSmallVolume` and
 * `checkNoWindow` test geometry that follows from a thermal argument and never
 * the argument itself — exactly as the Nias bracing check tests triangles and
 * not strength. That limit is stated on the checks rather than left implied.
 *
 * Nothing here is `measured`.
 */

import type { RulePack } from '@/lib/core/kinds'
import type { Split } from '@/lib/core/provenance'
import {
  dimFactory,
  partClass as corePartClass,
  partSplit as corePartSplit,
  provenanceSplit as coreProvenanceSplit,
  worstClass as coreWorstClass,
} from '@/lib/core/provenance'
import { STAGE_ORDER } from './types'
import type {
  Bangunan,
  DaniKinds,
  Dim,
  Layout,
  Part,
  ProvenanceClass,
  Rules,
  Source,
  SourceKey,
  Stage,
  StageInfo,
} from './types'

/* ── The source table ─────────────────────────────────────────────────── */

export const SOURCES: readonly Source[] = [
  {
    key: 'heider-1970',
    citation:
      'Heider, K. G., The Dugum Dani: A Papuan Culture in the Highlands of West New Guinea ' +
      '(Aldine, Chicago, 1970).',
    kind: 'ethnography',
  },
  {
    key: 'depdikbud-papua',
    citation:
      'Departemen Pendidikan dan Kebudayaan, Arsitektur Tradisional Daerah Irian Jaya ' +
      '(Proyek Inventarisasi dan Dokumentasi Kebudayaan Daerah, Jakarta).',
    kind: 'reference',
  },
  {
    key: 'waterson-1990',
    citation:
      'Waterson, R., The Living House: An Anthropology of Architecture in South-East Asia ' +
      '(Oxford University Press, Singapore, 1990).',
    kind: 'ethnography',
  },
  {
    key: 'none',
    citation: 'Tidak ada sumber. Nilai ini ditetapkan penulis untuk menutup celah.',
    kind: 'none',
  },
]

export function sourceFor(key: SourceKey): Source {
  const found = SOURCES.find((s) => s.key === key)
  if (!found) throw new Error(`unknown source key: ${key}`)
  return found
}

/* ── Dimensions ───────────────────────────────────────────────────────── */

const dim = dimFactory<SourceKey>()

export const DIMS = {
  /* the shell */
  radius: dim(2.05, 'm', 'interpolated', 'none', 'Jari-jari dinding honai. Kecil, dan kekecilan itu bukan kekurangan melainkan pokoknya: ruang yang kecil lebih murah dihangatkan. Bandingkan dengan mbaru niang, yang juga bundar dan juga beratap ijuk sampai tanah, dan berdiameter lebih dari sebelas meter.', 'Radius of the honai’s wall. Small, and the smallness is the point rather than a shortcoming: a small volume is cheaper to keep warm. Set it beside the mbaru niang, which is also round and also thatched to the ground, and is over eleven metres across.'),
  wallHeight: dim(1.35, 'm', 'interpolated', 'none', 'Tinggi dinding. Lebih rendah daripada seorang dewasa: panas naik, jadi dinding yang tinggi adalah panas yang hilang.', 'Height of the wall. Lower than a grown person: heat rises, so a tall wall is heat lost.'),
  facets: dim(32, 'count', 'interpolated', 'none', 'Jumlah tiang pada lingkaran dinding. Juga kehalusan gambar lingkarannya — tetapi tiangnya nyata, jadi angka ini keduanya sekaligus.', 'Number of posts in the wall ring. It is also the drawing resolution of the circle — but the posts are real, so this figure is both at once.'),
  postSection: dim(0.13, 'm', 'interpolated', 'none', 'Sisi penampang tiang dinding.', 'Section of a wall post.'),
  wallBoard: dim(0.05, 'm', 'interpolated', 'none', 'Tebal papan dinding yang dipasang rapat di sisi dalam lingkaran tiang. Sumber-sumber menyebut dinding honai dua lapis papan dengan rumput kering di antaranya; di sini satu lapis papan, rapat, tanpa celah kecuali pintu — karena tiang-tiang saja menutup kurang dari sepertiga keliling, dan dinding yang dua pertiganya udara bukan dinding yang menyimpan panas.', 'Thickness of the boards set close against the inside of the post ring. The sources describe a honai wall as two layers of boards with dried grass between; here it is one layer, tight, with no gap but the door — because the posts alone close less than a third of the circumference, and a wall that is two-thirds air keeps no heat.'),
  floorThickness: dim(0.06, 'm', 'interpolated', 'none', 'Tebal lantai papan di atas tanah.', 'Thickness of the board floor laid on the earth.'),

  /* the cap */
  apexRise: dim(1.5, 'm', 'interpolated', 'none', 'Tinggi puncak di atas tepi atap. Rendah — sebuah kubah, bukan kerucut. Mbaru niang naik lima belas meter dari tanah; yang ini berhenti di bawah tiga.', 'Rise of the apex above the eave. Low — a cap rather than a cone. A mbaru niang rises fifteen metres from the ground; this one stops short of three.'),
  eaveOversail: dim(0.35, 'm', 'interpolated', 'none', 'Panjang tritisan di luar dinding.', 'Depth of the overhang outside the wall.'),
  domeSteps: dim(10, 'count', 'interpolated', 'none', 'Jumlah pias yang dipakai untuk mendekati kubahnya. Kehalusan gambar, bukan ukuran bangunan.', 'How many bands are used to approximate the dome. Drawing resolution rather than a dimension of the building.'),
  domeShoulder: dim(0.55, 'ratio', 'interpolated', 'none', 'Seberapa bulat bahu kubahnya. Nol memberi kerucut; angka ini yang membulatkannya.', 'How round the shoulder of the dome is. Zero gives a cone; this figure is what rounds it.'),
  rafterSection: dim(0.05, 'm', 'interpolated', 'none', 'Sisi penampang kasau.', 'Section of a rafter.'),

  /* the blanket */
  thatchCourseDepth: dim(0.17, 'm', 'interpolated', 'none', 'Tinggi tampak satu lapis alang-alang.', 'Exposed depth of one course of thatch.'),
  thatchThickness: dim(0.045, 'm', 'interpolated', 'none', 'Tebal satu lapis yang menonjol dari lapis di bawahnya. Kecil, dan harus kecil: bangunan ini berdiameter empat meter, dan tonjolan sembilan sentimeter yang wajar pada atap dua puluh meter membuat kubahnya terbaca sebagai tumpukan piring.', 'How far a course stands proud of the one below. Small, and it has to be: this building is four metres across, and the nine centimetres that is unremarkable on a twenty-metre roof made the dome read as a stack of plates.'),
  thatchLap: dim(0.5, 'ratio', 'interpolated', 'none', 'Bagian lapis yang tertindih lapis di atasnya.', 'The share of a course the course above laps.'),
  thatchBed: dim(0.04, 'm', 'interpolated', 'none', 'Jarak bebas antara rangka dan lapis pertama.', 'Clearance between the frame and the first course.'),
  layerDepth: dim(0.03, 'm', 'interpolated', 'none', 'Tebal yang ditambahkan tiap lapis tambahan pada selimut atapnya. Aturan lapis mengalikan angka ini — satu-satunya angka dalam projek ini yang seluruhnya soal panas.', 'Thickness each extra layer adds to the roof’s blanket. The layer rule multiplies this figure — the only number in this project that is entirely about heat.'),

  /* the way in */
  doorWidth: dim(0.6, 'm', 'interpolated', 'none', 'Lebar pintu. Sempit, dan itu disengaja: lubang yang besar adalah panas yang keluar.', 'Width of the door. Narrow, and deliberately: a large opening is heat leaving.'),
  doorHeight: dim(0.85, 'm', 'interpolated', 'none', 'Tinggi pintu. Orang harus membungkuk untuk masuk — bukan kelalaian melainkan ukuran yang dipilih, dan satu-satunya pintu dalam projek ini yang tidak bisa dilalui dengan berdiri.', 'Height of the door. A person has to stoop to enter — not an oversight but a chosen dimension, and the only door in this project a person cannot walk through upright.'),
  jambSection: dim(0.09, 'm', 'interpolated', 'none', 'Sisi penampang kusen pintu.', 'Section of a door jamb.'),

  /* inside */
  loftHeight: dim(1.15, 'm', 'interpolated', 'none', 'Tinggi loteng di atas lantai. Orang tidur di atas karena panas naik — jadi lantai ini adalah alasan bangunannya, dinyatakan sebagai sebuah bidang.', 'Height of the loft above the floor. People sleep up there because heat rises — so this floor is the building’s reason, stated as a plane.'),
  hearthRadius: dim(0.36, 'm', 'interpolated', 'none', 'Jari-jari tungku di tengah lantai. Di sinilah seluruh bangunan ini bermula.', 'Radius of the hearth at the centre of the floor. This is where the whole building begins.'),
  hearthDepth: dim(0.12, 'm', 'interpolated', 'none', 'Dalamnya tungku itu.', 'Depth of that hearth.'),

  /* engagements */
  jointEngagement: dim(0.3, 'ratio', 'interpolated', 'none', 'Dalamnya pertautan sambungan yang diuji, sebagai bagian dari ukuran bagian terkecil.', 'Depth of the tested joint engagement, as a share of the smaller member.'),
  ebeiScale: dim(0.92, 'ratio', 'interpolated', 'none', 'Besar ebei dibanding honai.', 'Size of an ebei relative to a honai.'),
  wamaiScale: dim(0.78, 'ratio', 'interpolated', 'none', 'Besar wamai dibanding honai. Rumah babi, dan dihangatkan dengan alasan yang persis sama.', 'Size of a wamai relative to a honai. The pig house, and warmed for exactly the same reason.'),

  /* rules that are structure, not measurement */
  smallToKeepWarm: dim(1, 'count', 'canon', 'heider-1970', 'Bangunannya kecil, bundar dan rendah karena harus menahan panas api sampai pagi. Lembah Baliem berada seribu enam ratus meter di atas laut, tepat di khatulistiwa: siangnya sejuk dan malamnya dingin. Ini satu-satunya bangunan dalam projek ini yang persoalannya suhu — sebelas lainnya menjawab hujan, tanah yang bergerak, lapuk, tikus, atau kedudukan.', 'The building is small, round and low because it has to hold a fire’s heat until morning. The Baliem valley is sixteen hundred metres above the sea and on the equator: the days are mild and the nights are cold. It is the only building in this project whose problem is temperature — the other twelve answer rain, a moving ground, rot, rats, or standing.'),
  noWindow: dim(0, 'count', 'canon', 'depdikbud-papua', 'Nol jendela. Cahaya masuk lewat pintu dan lewat asap yang keluar dari atapnya, dan tidak lewat yang lain — sebuah bukaan adalah panas yang pergi. Tiga belas bangunan dalam projek ini dan hanya yang ini yang tidak punya satu pun.', 'Zero windows. Light comes through the door and through the smoke leaving the roof, and by no other route — an opening is heat going. Thirteen buildings in this project and only this one has none at all.'),
  fireInside: dim(1, 'count', 'canon', 'heider-1970', 'Api menyala di tengah lantai, tanpa cerobong: asapnya menembus atap, mengasapi alang-alangnya dan mengusir serangga sambil lewat. Tungku itulah alasan bangunan ini, dan tahap terakhir yang memasangnya bukan pelengkap melainkan pokoknya.', 'A fire burns at the centre of the floor with no chimney: its smoke works out through the thatch, curing the grass and driving out insects on the way. That hearth is the building’s reason, and the last stage that installs it is not a finishing touch but the point.'),
  sleepAbove: dim(1, 'count', 'canon', 'heider-1970', 'Orang tidur di loteng, di atas api. Panas naik, jadi bidang tidurnya diletakkan di tempat panas itu berada — argumen termal bangunan ini, dinyatakan sebagai sebuah lantai.', 'People sleep in the loft, above the fire. Heat rises, so the sleeping plane is put where the heat is — the building’s thermal argument, stated as a floor.'),
  threeBuildings: dim(3, 'count', 'canon', 'heider-1970', 'Satu pekarangan berisi tiga: honai untuk laki-laki, ebei untuk perempuan dan anak-anak, wamai untuk babi, semuanya di dalam satu pagar. Ketiganya bangunan yang sama dengan ukuran berbeda, dan tak satu pun versi yang lebih rendah dari yang lain — babinya dihangatkan dengan alasan yang sama dengan orangnya.', 'One compound holds three: a honai for the men, an ebei for the women and children, a wamai for the pigs, all inside one fence. The three are the same building at different sizes and none is a lesser version of another — the pigs are kept warm for the same reason the people are.'),

  /* The site: the silimo, which is the unit a honai belongs to. */
  compoundFence: dim(1, 'count', 'canon', 'heider-1970', 'Honai berdiri di dalam silimo: pekarangan berpagar berisi honai laki-laki, ebei perempuan, wamai untuk babi, dan halaman di antaranya. Satu honai adalah satu bangunan dari sebuah kelompok, dan kelompok itulah tempat tinggalnya.', 'A honai stands inside a silimo: a fenced compound holding the men’s honai, the women’s ebei, the wamai for pigs, and the yard between. One honai is one building of a group, and the group is the dwelling.'),
  compoundSide: dim(24, 'm', 'interpolated', 'none', 'Sisi pekarangan berpagar. Bahwa ada pagar adalah kanon; ukurannya penetapan penulis.', 'Side of the fenced compound. That there is a fence is canon; its size is the author’s.'),
  fenceThickness: dim(0.16, 'm', 'interpolated', 'none', 'Tebal pagar silimo.', 'Thickness of the silimo fence.'),
  fenceHeightSite: dim(1.6, 'm', 'interpolated', 'none', 'Tinggi pagar silimo. Pagar Dani adalah galah dan papan yang dipancang rapat; di sini tingginya saja, tanpa cara pancangnya.', 'Height of the silimo fence. A Dani fence is closely set poles and boards; here it is only its height, with none of how it is set.'),
  neighbourOffset: dim(8, 'm', 'interpolated', 'none', 'Jarak ke bangunan lain di dalam pagar. Hanya jejaknya yang digambar; keduanya dibangun oleh aturan yang sama dan dapat dilihat dengan mengganti aturannya.', 'Distance to the other buildings inside the fence. Only their footprints are drawn; both are built by the same rules and can be seen by changing them.'),
} as const

export type DimKey = keyof typeof DIMS

export const DIM_KEYS = Object.keys(DIMS) as readonly DimKey[]

export const ALL_DIMS: readonly Dim[] = DIM_KEYS.map((k) => DIMS[k])

/* ── The pack ─────────────────────────────────────────────────────────── */

const STAGE_WEIGHT: Record<Stage, number> = {
  lantai: 0.7,
  dinding: 1.5,
  pintu: 0.5,
  loteng: 0.8,
  rangka: 1.4,
  atap: 2.4,
  tungku: 0.6,
}

export const PACK: RulePack<DaniKinds> = {
  key: 'dani',
  dimKeys: DIM_KEYS,
  dim: (key) => DIMS[key],
  sources: SOURCES,
  sourceFor,
  stageOrder: STAGE_ORDER,
  stageWeight: (stage) => STAGE_WEIGHT[stage],
}

/* ── Provenance, bound to this pack ───────────────────────────────────── */

export function worstClass(keys: readonly DimKey[]): ProvenanceClass {
  return coreWorstClass(PACK, keys)
}

export function partClass(part: Pick<Part, 'dims'>): ProvenanceClass {
  return corePartClass(PACK, part)
}

export function partSplit(parts: readonly Pick<Part, 'dims'>[]): Split {
  return corePartSplit(PACK, parts)
}

export function provenanceSplit(dims: readonly Dim[] = ALL_DIMS): Split {
  return coreProvenanceSplit(dims)
}

/* ── The three buildings ──────────────────────────────────────────────── */

export interface BangunanInfo {
  readonly bangunan: Bangunan
  readonly name: string
  readonly scale: number
  readonly loft: boolean
  readonly glossId: string
  readonly glossEn: string
}

export const BANGUNAN: readonly BangunanInfo[] = [
  {
    bangunan: 'honai',
    name: 'Honai',
    scale: 1,
    loft: true,
    glossId: 'Rumah laki-laki: satu ruang bundar dengan api di tengah dan loteng tidur di atasnya.',
    glossEn: 'The men’s house: one round room with a fire at its centre and a sleeping loft above it.',
  },
  {
    bangunan: 'ebei',
    name: 'Ebei',
    scale: DIMS.ebeiScale.value,
    loft: true,
    glossId: 'Rumah perempuan dan anak-anak. Bangunan yang sama, sedikit lebih kecil, di pekarangan yang sama.',
    glossEn: 'The house of the women and children. The same building, a little smaller, in the same compound.',
  },
  {
    bangunan: 'wamai',
    name: 'Wamai',
    scale: DIMS.wamaiScale.value,
    loft: false,
    glossId:
      'Rumah babi. Bangunan yang sama lagi, lebih kecil lagi, tanpa loteng — dan dihangatkan dengan alasan yang persis sama. Dalam projek ini ini satu-satunya kali sebuah bangunan untuk hewan dibuat menurut aturan yang sama dengan bangunan untuk manusia, bukan sebagai versi yang lebih rendah.',
    glossEn:
      'The pig house. The same building again, smaller again, without a loft — and warmed for exactly the same reason. This is the only time in this project that a building for animals is made by the same rules as one for people rather than as a lesser version.',
  },
]

export function bangunanInfo(bangunan: Bangunan): BangunanInfo {
  const found = BANGUNAN.find((b) => b.bangunan === bangunan)
  if (!found) throw new Error(`unknown bangunan: ${bangunan}`)
  return found
}

/* ── Stages ───────────────────────────────────────────────────────────── */

export const STAGES: readonly StageInfo[] = [
  {
    stage: 'lantai',
    title: 'Lantai',
    glossId: 'Lantai papan diletakkan di atas tanah. Tidak ada panggung: tanah di bawahnya menyimpan panas, dan mengangkat rumah akan membuangnya.',
    glossEn: 'A board floor is laid on the earth. There is no platform: the ground beneath holds heat, and raising the house would throw that away.',
  },
  {
    stage: 'pintu',
    title: 'Pintu',
    glossId: 'Satu bukaan kecil, cukup rendah sehingga orang harus membungkuk. Ini satu-satunya lubang di seluruh bangunan.',
    glossEn: 'One small opening, low enough that a person has to stoop. It is the only hole in the whole building.',
  },
  {
    stage: 'dinding',
    title: 'Dinding',
    glossId: 'Lingkaran tiang rapat berdiri setinggi kurang dari seorang dewasa. Panas naik, jadi dinding yang tinggi adalah panas yang hilang.',
    glossEn: 'A close ring of posts goes up, lower than a grown person. Heat rises, so a tall wall is heat lost.',
  },
  {
    stage: 'rangka',
    title: 'Rangka',
    glossId: 'Kasau melengkung dari lingkaran dinding ke satu titik di atas — kubah rendah, bukan kerucut.',
    glossEn: 'Rafters curve from the wall ring to a point above — a low cap rather than a cone.',
  },
  {
    stage: 'atap',
    title: 'Atap',
    glossId: 'Alang-alang dipasang tebal, dan ketebalan itulah satu-satunya hal yang bisa diputuskan sebuah rumah tangga di sini. Lebih banyak lapis berarti panas bertahan lebih lama, dan berarti lebih banyak rumput yang harus dipotong dan dipikul.',
    glossEn: 'The thatch goes on thick, and that thickness is the one thing a household decides here. More layers means the heat lasts longer, and it means more grass to cut and carry.',
  },
  {
    stage: 'loteng',
    title: 'Loteng',
    glossId: 'Bidang tidur dipasang di atas api. Panas naik; orang tidur di tempat panas itu berada.',
    glossEn: 'The sleeping plane goes in above the fire. Heat rises; people sleep where the heat is.',
  },
  {
    stage: 'tungku',
    title: 'Tungku',
    glossId: 'Batu tungku diletakkan terakhir, di tengah lantai. Ini bukan pelengkap — seluruh bangunan di atasnya ada untuk menahan panas yang keluar dari sini.',
    glossEn: 'The hearth stones go down last, at the centre of the floor. This is not a finishing touch — everything above it exists to hold in the heat that comes off it.',
  },
]

export function stageInfo(stage: Stage): StageInfo {
  const found = STAGES.find((s) => s.stage === stage)
  if (!found) throw new Error(`unknown stage: ${stage}`)
  return found
}

/* ── Input hygiene ────────────────────────────────────────────────────── */

export const DEFAULT_RULES: Rules = { bangunan: 'honai', lapis: 4, loteng: true }

export const MIN_LAPIS = 2
export const MAX_LAPIS = 8

export function normaliseRules(rules: Rules): Rules {
  const info = bangunanInfo(rules.bangunan)
  return {
    bangunan: rules.bangunan,
    lapis: Math.min(MAX_LAPIS, Math.max(MIN_LAPIS, Math.round(rules.lapis))),
    // A wamai has no loft whatever is asked for: pigs do not climb a pole.
    loteng: info.loft ? rules.loteng : false,
  }
}

/** Every Dim that fed a given layout. */
export function dimsForLayout(_layout: Pick<Layout, 'rules'>): readonly Dim[] {
  return ALL_DIMS
}
