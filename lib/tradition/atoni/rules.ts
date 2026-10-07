/**
 * The rule pack for the Atoni ume kbubu.
 *
 * The twenty-eighth pack, and the first whose building is required to hold
 * something in rather than keep something out.
 *
 * `smokeKeepsTheSeed` is canon and it is the whole entry. The fire on the
 * floor is not only warmth: its smoke cures the maize hanging above it and
 * keeps the weevils out, so the seed is still fit to plant when the rains
 * come. That makes this the one building here whose roof has a second job —
 * every other roof in this project shuts water out, and this one also has to
 * keep smoke in.
 *
 * `oneLowDoor` is the second: one opening, low enough that a person stoops
 * through it, and no window anywhere. The check on it is two-sided, which no
 * other check here is — the door has to be big enough to get through and small
 * enough to be worth having, and both bounds are the point rather than one
 * being a formality.
 *
 * `seedIsMeasuredInYears` is the third, and it is the only size in this
 * project taken from a length of time. How deep the loft is follows from how
 * many harvests a household keeps against a bad year.
 *
 * `lopoIsTheOpposite` is the fourth. In the same yard stands an open pavilion,
 * round, on posts, all air — built by the same people, for the same maize, at
 * the stage where it has to dry rather than keep. Stating it is worth more
 * than modelling it in detail: the two buildings are one argument about what a
 * roof is for.
 *
 * On the honai, which this pack must not be confused with: both are round,
 * both are thatched to the ground, both are dark and both have a fire. A honai
 * is a room with a fire in it against cold nights and its loft is where people
 * sleep. This is a store with a fire under it and people in the gap. Roundness
 * says nothing on its own; the mbaru niang and the honai settled that.
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
  AtoniKinds,
  Dim,
  Dinding,
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
    key: 'schulteNordholt-1971',
    citation: 'Schulte Nordholt, H. G., The Political System of the Atoni of Timor (Nijhoff, The Hague, 1971).',
    kind: 'ethnography',
  },
  {
    key: 'cunningham-1964',
    citation:
      'Cunningham, C. E., “Order in the Atoni House”, Bijdragen tot de Taal-, Land- en Volkenkunde 120, 1964.',
    kind: 'ethnography',
  },
  {
    key: 'depdikbud-1986',
    citation:
      'Arsitektur Tradisional Daerah Nusa Tenggara Timur (Departemen Pendidikan dan Kebudayaan, ' +
      'Jakarta, 1986).',
    kind: 'reference',
  },
  {
    key: 'anthropometry',
    citation:
      'Ukuran tubuh manusia yang ditetapkan penulis, bukan dari sumber tentang Timor. ' +
      'Kunci yang sama dipakai pak Bali, pak Waruga, dan pak Ngada.',
    kind: 'none',
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
  /* the dome */
  radius: dim(2.6, 'm', 'interpolated', 'none', 'Jari-jari rumah di permukaan tanah. Kecil, dan kecilnya disengaja: ruang yang kecil lebih mudah dipenuhi asap dan lebih mudah dijaga hangat.', 'Radius of the house at the ground. Small, and deliberately so: a small volume fills with smoke more readily and is easier to keep warm.'),
  facets: dim(24, 'count', 'interpolated', 'none', 'Banyaknya sisi kerucut yang digambar. Angka tesselasi, bukan ukuran bangunan.', 'How many facets the cone is drawn with. A tessellation count, not a dimension of the building.'),
  wallHeight: dim(1.05, 'm', 'interpolated', 'none', 'Tinggi dinding kayu rendah, pada bentuk yang memakainya.', 'Height of the low timber wall, on the form that has one.'),
  eaveHeight: dim(0.35, 'm', 'interpolated', 'none', 'Tinggi tepi atap di atas tanah pada bentuk yang atapnya turun sampai bawah — hampir menyentuh, dan tidak ada dinding sama sekali.', 'Height of the eave above the ground on the form whose thatch comes down — nearly touching, and there is no wall at all.'),
  wallBoard: dim(0.06, 'm', 'interpolated', 'none', 'Tebal dinding kayu rendah, atau kaki alang-alang yang diteruskan sampai tanah pada bentuk tanpa dinding. Apa pun bentuknya, keliling di bawah tepi atap tertutup kecuali pintu: rumah yang menahan asap tidak boleh punya sabuk terbuka di kakinya.', 'Thickness of the low timber wall, or of the skirt of thatch carried down to the ground on the form with no wall. Either way the circumference under the eave is closed but for the door: a house that holds smoke in may not have an open band round its foot.'),
  domeRise: dim(2.9, 'm', 'interpolated', 'none', 'Tinggi puncak kubah di atas tepi atap.', 'Rise of the dome above the eave.'),
  postSection: dim(0.14, 'm', 'interpolated', 'none', 'Sisi penampang tiang.', 'Section of a post.'),
  postCount: dim(6, 'count', 'interpolated', 'none', 'Banyaknya tiang dalam lingkaran, di luar tiang tengah.', 'How many posts stand in the ring, besides the centre post.'),
  centreSection: dim(0.2, 'm', 'interpolated', 'none', 'Sisi penampang tiang tengah, tempat para digantungkan.', 'Section of the centre post the loft hangs from.'),
  rafterSection: dim(0.07, 'm', 'interpolated', 'none', 'Sisi penampang usuk kubah.', 'Section of a dome rafter.'),
  thatchBed: dim(0.05, 'm', 'interpolated', 'none', 'Jarak lapisan alang-alang dari rangkanya.', 'How far the thatch stands off its frame.'),
  thatchThickness: dim(0.16, 'm', 'interpolated', 'none', 'Tebal lapisan alang-alang.', 'Thickness of the thatch.'),
  thatchCourses: dim(7, 'count', 'interpolated', 'none', 'Banyaknya lapis alang-alang dari bawah ke puncak.', 'How many courses of thatch run from the eave to the apex.'),
  thatchLap: dim(0.5, 'ratio', 'interpolated', 'none', 'Bagian lapis yang tertindih lapis di atasnya. Tanpa tindihan, tiap sambungan antarlapis adalah celah melingkar — dan atap yang harus menahan asap di dalam tidak boleh punya satu pun.', 'The share of a course the course above laps. Without a lap every join between courses is a slot round the whole dome — and a roof that has to keep smoke in may not have one.'),

  /* the loft, which is why the building exists */
  loftBase: dim(1.45, 'm', 'interpolated', 'none', 'Tinggi lantai para di atas tanah untuk simpanan satu panen. Ini angka yang paling penting dalam pak ini: terlalu rendah dan jagungnya hangus, terlalu tinggi dan asapnya sudah dingin sebelum sampai.', 'Height of the loft floor above the ground for one harvest. It is the most consequential figure in this pack: too low and the maize scorches, too high and the smoke is cold before it arrives.'),
  loftPerYear: dim(0.28, 'm', 'interpolated', 'none', 'Tambahan dalam para untuk tiap panen yang disimpan. Satu-satunya ukuran dalam projek ini yang berasal dari lamanya waktu, bukan dari orang, ruang, atau pangkat.', 'How much deeper the loft goes for each further harvest kept. The only dimension in this project taken from a length of time rather than from people, rooms or rank.'),
  loftShare: dim(0.78, 'ratio', 'interpolated', 'none', 'Jari-jari para dibanding jari-jari lingkaran tiang yang memikulnya. Diturunkan dari tiangnya, bukan dari jari-jari rumah: barang yang bertumpu pada sesuatu mengambil ukurannya dari yang memikulnya.', 'Radius of the loft against the ring of posts carrying it. Derived from the posts rather than from the house’s radius: a thing that rests on something takes its size from what carries it.'),
  smokeLow: dim(1.1, 'm', 'interpolated', 'none', 'Batas bawah pita asap yang berguna: di bawah ini apinya terlalu dekat dan jagungnya hangus.', 'The bottom of the useful smoke band: below this the fire is too close and the maize scorches.'),
  smokeHigh: dim(2.85, 'm', 'interpolated', 'none', 'Batas atas pita asap yang berguna, ditetapkan penulis. Di atas ini asapnya sudah terlalu dingin dan terlalu encer untuk mengawetkan benih, dan lumbung yang di luar jangkauan asap adalah lumbung berisi jagung yang membusuk.', 'The top of the useful smoke band, and the author’s figure. Above it the smoke is too cool and too thin to cure the seed, and a store out of its reach is a store of maize that rots.'),
  hearthRadius: dim(0.45, 'm', 'interpolated', 'none', 'Jari-jari perapian batu di tengah lantai, tepat di bawah para.', 'Radius of the stone hearth in the middle of the floor, directly under the loft.'),
  hearthHeight: dim(0.12, 'm', 'interpolated', 'none', 'Tinggi lingkar batu perapian.', 'Height of the ring of hearth stones.'),

  /* the one opening */
  doorWidth: dim(0.62, 'm', 'interpolated', 'none', 'Lebar satu-satunya bukaan.', 'Width of the only opening.'),
  doorHeight: dim(1.15, 'm', 'interpolated', 'none', 'Tinggi satu-satunya bukaan. Rendah dengan sengaja: orang harus membungkuk masuk, dan asap serta panas tidak ikut keluar.', 'Height of the only opening. Low on purpose: a person stoops through it, and the smoke and the heat do not follow them out.'),
  jambSection: dim(0.09, 'm', 'interpolated', 'none', 'Sisi penampang kusen pintu.', 'Section of a door jamb.'),
  standingHeight: dim(1.62, 'm', 'interpolated', 'anthropometry', 'Tinggi orang dewasa berdiri. Bukan dari sumber tentang Timor — kunci sumbernya sendiri supaya terlihat begitu.', 'Standing height of an adult. Not from a source about Timor — its own source key so that this shows.'),
  stoopingHeight: dim(1.05, 'm', 'interpolated', 'anthropometry', 'Tinggi orang dewasa yang membungkuk melewati bukaan rendah. Pintu harus lebih tinggi daripada ini supaya dapat dilewati, dan lebih rendah daripada orang berdiri supaya ada gunanya.', 'Height of an adult stooping through a low opening. The door has to be taller than this to be usable, and lower than a standing person to be worth having.'),

  /* the open pavilion in the same yard */
  lopoRadius: dim(2.1, 'm', 'interpolated', 'none', 'Jari-jari lopo, bangunan terbuka di halaman yang sama.', 'Radius of the lopo, the open building in the same yard.'),
  lopoFloorY: dim(0.9, 'm', 'interpolated', 'none', 'Tinggi lantai lopo di atas tanah.', 'Height of the lopo’s floor above the ground.'),
  lopoRise: dim(2.2, 'm', 'interpolated', 'none', 'Tinggi kerucut lopo di atas lantainya.', 'Rise of the lopo’s cone above its floor.'),
  lopoStand: dim(4.4, 'm', 'interpolated', 'none', 'Jarak lopo dari rumah, di halaman yang sama.', 'Distance of the lopo from the house, in the same yard.'),

  /* the ground */
  yardRadius: dim(9, 'm', 'interpolated', 'none', 'Jari-jari halaman keluarga yang dibersihkan.', 'Radius of the swept family yard.'),

  /* engagements */
  jointEngagement: dim(0.3, 'ratio', 'interpolated', 'none', 'Dalamnya pertautan sambungan yang diuji, sebagai bagian dari ukuran bagian terkecil.', 'Depth of the tested joint engagement, as a share of the smaller member.'),

  /* rules that are structure, not measurement */
  smokeKeepsTheSeed: dim(1, 'count', 'canon', 'schulteNordholt-1971', 'Asap dari api di lantai mengawetkan benih jagung yang digantung di para di atasnya: ia mengeringkan, mengusir hama, dan menjaga benih tetap dapat ditanam sampai musim hujan berikutnya. Karena itu bangunan ini harus menahan asap — satu-satunya atap dalam projek ini yang punya tugas kedua, sebab dua puluh tujuh atap lainnya hanya perlu menahan air di luar.', 'The smoke of the floor fire cures the seed maize hung in the loft above it: it dries it, drives the weevils out, and keeps it fit to plant until the next rains. So this building has to hold smoke in — the only roof in this project with a second job, because the other twenty-seven only have to keep water out.'),
  oneLowDoor: dim(1, 'count', 'canon', 'cunningham-1964', 'Satu bukaan, dan tidak ada jendela sama sekali. Pintunya rendah sehingga orang membungkuk masuk, dan itulah cara panas dan asap tidak ikut keluar bersamanya. Pemeriksaannya berbatas dua arah — cukup tinggi untuk dilewati, cukup rendah untuk ada gunanya — dan itu satu-satunya pemeriksaan berbatas dua arah dalam projek ini.', 'One opening, and no window at all. The door is low enough that a person stoops through it, and that is how the heat and the smoke do not follow them out. Its check is bounded on both sides — tall enough to pass, low enough to be worth having — and it is the only two-sided check in this project.'),
  seedIsMeasuredInYears: dim(1, 'count', 'canon', 'schulteNordholt-1971', 'Dalamnya para ditentukan berapa panen yang disimpan sebuah rumah tangga terhadap tahun yang buruk. Ini satu-satunya ukuran dalam projek ini yang berasal dari lamanya waktu; semua yang lain berasal dari tubuh, ruang, pangkat, rumah tangga, kerumunan, atau apa yang digambarkan sebuah bangunan.', 'How deep the loft goes is set by how many harvests a household keeps against a bad year. It is the only dimension in this project taken from a length of time; every other one comes from a body, a room, a rank, a household, a crowd, or what a building depicts.'),
  lopoIsTheOpposite: dim(1, 'count', 'canon', 'depdikbud-1986', 'Di halaman yang sama berdiri lopo: bangunan bundar terbuka di atas tiang, tanpa dinding, dengan lumbungnya sendiri di bawah atap kerucut. Orang yang sama membangun sesuatu yang tidak boleh berangin dan sesuatu yang seluruhnya angin, berjarak beberapa meter, keduanya bundar dan beratap kerucut. Keduanya adalah satu bantahan terhadap anggapan bahwa bentuk menentukan maksud.', 'In the same yard stands the lopo: a round open building on posts, with no walls and its own store under a conical roof. The same people build a thing that must not ventilate and a thing that is nothing but ventilation, a few metres apart, both round and both under a cone. The two together are one refutation of the idea that a form settles a purpose.'),
} as const

export type DimKey = keyof typeof DIMS

export const DIM_KEYS = Object.keys(DIMS) as readonly DimKey[]

export const ALL_DIMS: readonly Dim[] = DIM_KEYS.map((k) => DIMS[k])

/* ── The pack ─────────────────────────────────────────────────────────── */

const STAGE_WEIGHT: Record<Stage, number> = {
  tiang: 1.6,
  rangka: 1.8,
  para: 1.2,
  atap: 2.4,
  tungku: 0.6,
  lopo: 1.4,
}

export const PACK: RulePack<AtoniKinds> = {
  key: 'atoni',
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

/* ── What the thatch does at the bottom ───────────────────────────────── */

export interface DindingInfo {
  readonly dinding: Dinding
  /** the dimension key, not a copy of its value — the Banjar pack's lesson */
  readonly key: DimKey
  readonly name: string
  readonly glossId: string
  readonly glossEn: string
}

export const DINDING: readonly DindingInfo[] = [
  {
    dinding: 'penuh',
    key: 'eaveHeight',
    name: 'Atap sampai bawah',
    glossId: 'Alang-alang turun hampir menyentuh tanah, jadi tidak ada dinding sama sekali: atapnya seluruh bangunan, dan tidak ada celah di mana pun kecuali pintunya.',
    glossEn: 'The thatch comes down almost to the ground, so there is no wall at all: the roof is the whole building, and there is no gap anywhere except the door.',
  },
  {
    dinding: 'rendah',
    key: 'wallHeight',
    name: 'Dinding rendah',
    glossId: 'Atapnya berdiri di atas dinding kayu rendah. Sedikit lebih lapang di dalam, dan sedikit lebih banyak sambungan yang harus rapat.',
    glossEn: 'The thatch stands on a low timber wall. A little more room inside, and a little more joinery that has to be tight.',
  },
]

export function dindingInfo(dinding: Dinding): DindingInfo {
  const found = DINDING.find((d) => d.dinding === dinding)
  if (!found) throw new Error(`unknown dinding: ${dinding}`)
  return found
}

/** The eave height this rule selects, read live from the pack. */
export function eaveOf(dinding: Dinding): number {
  return DIMS[dindingInfo(dinding).key].value
}

/* ── Stages ───────────────────────────────────────────────────────────── */

export const STAGES: readonly StageInfo[] = [
  {
    stage: 'tiang',
    title: 'Tiang',
    glossId: 'Tiang tengah berdiri lebih dulu, lalu lingkaran tiang di sekelilingnya. Para akan bergantung pada yang di tengah.',
    glossEn: 'The centre post goes up first, then the ring around it. The loft will hang from the one in the middle.',
  },
  {
    stage: 'rangka',
    title: 'Rangka',
    glossId: 'Usuk-usuk dipasang dari lingkaran tiang ke puncak, membentuk kubah.',
    glossEn: 'Rafters run from the ring of posts to the apex, making the dome.',
  },
  {
    stage: 'para',
    title: 'Para',
    glossId: 'Para dipasang sebelum atapnya ditutup, sebab itulah alasan bangunan ini ada — dan setelah atap tertutup tidak ada lagi jalan memasukkannya.',
    glossEn: 'The loft is fitted before the roof closes over it, because it is the reason the building exists — and once the roof is on there is no way to get it in.',
  },
  {
    stage: 'atap',
    title: 'Atap',
    glossId: 'Alang-alang ditutupkan lapis demi lapis sampai ke bawah, dengan satu lubang untuk pintu dan tidak ada lubang lain.',
    glossEn: 'Thatch goes on course by course to the bottom, with one hole for the door and no other hole anywhere.',
  },
  {
    stage: 'tungku',
    title: 'Tungku',
    glossId: 'Batu perapian dilingkarkan di lantai tepat di bawah para. Apinya adalah bagian bangunan yang paling penting dan satu-satunya yang tidak dapat dimodelkan.',
    glossEn: 'The hearth stones are set on the floor directly under the loft. The fire is the most important part of this building and the only one that cannot be modelled.',
  },
  {
    stage: 'lopo',
    title: 'Lopo',
    glossId: 'Lopo didirikan di halaman yang sama: bundar, di atas tiang, tanpa dinding — kebalikan dari rumah yang baru saja ditutup rapat.',
    glossEn: 'The lopo goes up in the same yard: round, on posts, with no walls — the opposite of the house just closed tight.',
  },
]

export function stageInfo(stage: Stage): StageInfo {
  const found = STAGES.find((s) => s.stage === stage)
  if (!found) throw new Error(`unknown stage: ${stage}`)
  return found
}

/* ── Input hygiene ────────────────────────────────────────────────────── */

export const DEFAULT_RULES: Rules = { simpanan: 2, dinding: 'penuh', lopo: true }

export const MIN_SIMPANAN = 1
export const MAX_SIMPANAN = 4

export function normaliseRules(rules: Rules): Rules {
  return {
    simpanan: Math.min(MAX_SIMPANAN, Math.max(MIN_SIMPANAN, Math.round(rules.simpanan))),
    dinding: rules.dinding,
    lopo: rules.lopo,
  }
}

/** Every Dim that fed a given layout. */
export function dimsForLayout(_layout: Pick<Layout, 'rules'>): readonly Dim[] {
  return ALL_DIMS
}
