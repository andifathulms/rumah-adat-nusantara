'use client'

/**
 * The renderer.
 *
 * It draws what the generator produced and generates nothing itself. If a
 * shape is being computed in here, it is in the wrong file — that split is
 * what makes the geometry testable, and it is not a style preference.
 *
 * The register is a physical model under real light: full material response
 * and real shadow, visibly a made object. No bloom, no vignette, no depth of
 * field, no haze. Effects layered on top of interpolated numbers would be a
 * lie told fluently.
 */

import * as THREE from 'three'
import type { AnyHouse, AnyPart, ProvenanceClass } from '@/lib/core/types'
import type { SceneModel, SiteVolume } from '@/lib/core/scene'
import { captionAt, sectionAxis } from '@/lib/core/scene'
import type { Kinds } from '@/lib/core/kinds'
import type { SolarPosition } from '@/lib/solar/position'
import { sunDirection } from '@/lib/solar/position'
import { createMaterials, TEXTURE_METRES } from '../materials'
import type { MaterialSet } from '../materials'
import type { TraditionKey } from '@/lib/tradition/registry'
import type { Timeline } from '@/lib/core/assembly'
import { progressAt } from '@/lib/core/assembly'

export type ViewKey = 'perspektif' | 'halaman' | 'tampak' | 'kolong' | 'potongan'

export interface CameraState {
  azimuth: number
  polar: number
  distance: number
  target: THREE.Vector3
}

export interface SceneOptions {
  figure: boolean
  rain: boolean
  /**
   * Draw the ground the house stands on: the setting-out grid, the north
   * point, and whatever the tradition says is around it.
   *
   * Off leaves the house and nothing else, which is a real way to look at a
   * building and was the only way to look at these until the setting existed.
   * A reader comparing two houses wants the object; a reader asking what it
   * would be like to be there wants the yard. Both are legitimate and neither
   * is the truthful one.
   */
  site: boolean
  /** null when the house is simply standing there */
  reveal: { timeline: Timeline<Kinds>; t: number } | null
  /** 0 assembled, 1 fully exploded along the build order */
  explode: number
  /** cut the house on the ridge plane to show the three occupancy zones */
  section: boolean
  /**
   * Mark every part by the provenance of the dimensions that produced it,
   * instead of by what it is made of. The bar in the rail says how much of
   * the house is the author's own; this says which of it.
   */
  provenance: boolean
  reducedMotion: boolean
}

const BOLU = 0x17150f
const RARA = 0x8e3b25
const RIRI = 0xc8912b
const KAPUR = 0xe9e3d2
const GROUND = 0xc3bda9

/** The scale figure is 1.68 m and is a scale bar, not set dressing. */
const FIGURE_HEIGHT = 1.68

export class HouseScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly cam: CameraState

  private materials: MaterialSet
  private houseGroup = new THREE.Group()
  private byPart = new Map<string, THREE.Object3D>()
  /** the pigment material each part is normally drawn in, to go back to */
  private restMaterial = new Map<string, THREE.Material>()
  private provenanceMaterials: Record<ProvenanceClass, THREE.MeshStandardMaterial>
  private provenanceOn = false
  private restPosition = new Map<string, THREE.Vector3>()
  /** Which parts are boxes: only those may be scaled during placement. */
  private boxParts = new Set<string>()
  private orderIndex = new Map<string, number>()
  private sunLight: THREE.DirectionalLight
  private skyLight: THREE.HemisphereLight
  private contact: THREE.Mesh
  private figure: THREE.Group
  private rain: RainRig
  private zones: ZoneRig
  private site: SiteRig
  private clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
  private model: SceneModel | null = null
  private house: AnyHouse | null = null
  /**
   * How a part is classed by provenance, supplied by whoever built the house.
   * The renderer cannot work this out: it would need the rule pack, and the
   * whole point is that it does not have one.
   */
  private classOf: (part: AnyPart) => ProvenanceClass = () => 'interpolated'
  private needsRender = true
  private lastApplied = ''

  /**
   * @param tradition which material set to generate. The renderer knows
   *   nothing else about the tradition — it is here because anisotropy comes
   *   off the renderer's own capabilities, so the textures cannot be built
   *   until it exists.
   */
  constructor(canvas: HTMLCanvasElement, tradition: TraditionKey) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400)
    this.cam = {
      azimuth: -2.25,
      polar: 1.16,
      distance: 26,
      target: new THREE.Vector3(0, 4, 0),
    }

    this.materials = createMaterials(tradition, this.renderer.capabilities.getMaxAnisotropy())
    /*
      Flat, untextured and matte, so the overlay reads as a mark made on the
      model rather than as another material the house could be built from.
      The three colours are the ones the rail already uses for the classes.
    */
    const marked = (color: number) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 })
    this.provenanceMaterials = {
      measured: marked(BOLU),
      canon: marked(RIRI),
      interpolated: marked(RARA),
    }

    // One directional light, shadow-casting, driven by the computed sun.
    this.sunLight = new THREE.DirectionalLight(0xffffff, 3)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.set(2048, 2048)
    this.sunLight.shadow.bias = -0.0006
    this.sunLight.shadow.normalBias = 0.02
    // The sun still sees what the view has set aside: a barn moved off the
    // view's layer because it stood between the reader and the house keeps
    // throwing its shadow across the yard. See SiteRig.clearSightOf.
    this.sunLight.shadow.camera.layers.enable(SET_ASIDE)
    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)

    // One hemisphere light, colour from the sky, intensity tracking altitude.
    this.skyLight = new THREE.HemisphereLight(KAPUR, GROUND, 0.6)
    this.scene.add(this.skyLight)

    // A clean ground plane. No vegetation, no terrain, no scattered props.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    /*
     * Contact darkening under the raised body.
     *
     * A radial-gradient plane, and explicitly a placeholder: real ambient
     * occlusion in the joints and under the floor is the largest remaining
     * quality gain and this is not it. The deep shadow under a pile house —
     * the sulluk banua as a dark void with the whole body floating above it —
     * is the most dramatic thing about the form, so it gets something rather
     * than nothing while the real answer is pending.
     */
    this.contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: contactTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
    )
    this.contact.rotation.x = -Math.PI / 2
    this.contact.position.y = 0.012
    this.scene.add(this.contact)

    this.figure = buildFigure()
    this.scene.add(this.figure)

    this.rain = new RainRig()
    this.scene.add(this.rain.group)

    this.zones = new ZoneRig()
    this.scene.add(this.zones.group)

    this.site = new SiteRig()
    this.scene.add(this.site.group)

    this.scene.add(this.houseGroup)
  }

  /* ── The house ──────────────────────────────────────────────────────── */

  setHouse(
    house: AnyHouse,
    model: SceneModel,
    classOf: (part: AnyPart) => ProvenanceClass,
  ): void {
    this.house = house
    this.model = model
    this.classOf = classOf
    this.clearHouse()

    for (const part of house.parts) {
      const object = this.buildPart(part)
      object.castShadow = true
      object.receiveShadow = true
      object.name = part.id
      this.houseGroup.add(object)
      this.byPart.set(part.id, object)
      this.restMaterial.set(part.id, this.materials.get(part.material))
      this.restPosition.set(part.id, object.position.clone())
      if (part.kind === 'box') this.boxParts.add(part.id)
    }
    house.parts.forEach((part, i) => this.orderIndex.set(part.id, i))

    // The ground is set out for this building before the parts go on it.
    this.site.configure(model)

    // Contact plane sized to the body, not the whole scene.
    const span = Math.max(model.footprint.x, model.footprint.z) * 1.5
    this.contact.scale.set(span, span, 1)

    // Where the tradition says the scale figure belongs: beside the house and
    // clear of the eave, on whichever side that is for this building.
    this.figure.position.set(...model.figureAt)

    /*
     * The section is cut on the axis the ridge does not run along.
     *
     * A cut across the ridge shows one bay of a house; a cut along it shows
     * the whole house in one face. Which of those is the informative one
     * depends on which way the building is long, so the tradition decides and
     * the plane's normal follows.
     */
    const axis = sectionAxis(model)
    this.clip.normal.set(axis === 0 ? -1 : 0, 0, axis === 2 ? -1 : 0)
    this.clip.constant = 0

    // A rebuild replaces every mesh, so a mode that was on has to be put
    // back on the new ones.
    if (this.provenanceOn) this.setProvenanceMarking(true)

    this.frameShadowCamera(house)
    this.rain.configure(model)
    this.zones.configure(model)
    this.fitCamera()
    this.needsRender = true
  }

  private buildPart(part: AnyPart): THREE.Mesh {
    const material = this.materials.get(part.material)
    if (part.kind === 'box') {
      const geometry = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2])
      scaleBoxUVs(geometry, part.size)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(part.center[0], part.center[1], part.center[2])
      if (part.rotation) {
        mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ')
      }
      return mesh
    }
    // Mesh parts arrive in world coordinates, so the object sits at the origin
    // and its geometry carries the position.
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions.slice(), 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normals.slice(), 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs.slice(), 2))
    geometry.setIndex(part.indices.slice())
    return new THREE.Mesh(geometry, material)
  }

  /**
   * Swap every part between what it is made of and where its numbers came
   * from.
   *
   * The honest result at present is a house that is almost entirely rara,
   * because almost every metre in the rule pack is the author's own. That is
   * the point of the mode and it is not softened here — the legend in the
   * rail is what stops it reading as an error.
   */
  private setProvenanceMarking(on: boolean): void {
    if (!this.house) return
    for (const part of this.house.parts) {
      const object = this.byPart.get(part.id)
      if (!(object instanceof THREE.Mesh)) continue
      const rest = this.restMaterial.get(part.id)
      object.material = on ? this.provenanceMaterials[this.classOf(part)] : rest ?? object.material
    }
    this.needsRender = true
  }

  private clearHouse(): void {
    for (const child of [...this.houseGroup.children]) {
      this.houseGroup.remove(child)
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    }
    this.byPart.clear()
    this.restMaterial.clear()
    this.restPosition.clear()
    this.boxParts.clear()
    this.orderIndex.clear()
  }

  /**
   * Fit the shadow camera to the house bounds rather than to the scene.
   * A shadow map stretched over 240 m of ground plane would spend all its
   * resolution on nothing.
   */
  private frameShadowCamera(house: AnyHouse): void {
    const [minX, minY, minZ] = house.bounds.min
    const [maxX, maxY, maxZ] = house.bounds.max
    const radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2
    const cam = this.sunLight.shadow.camera
    cam.left = -radius * 1.25
    cam.right = radius * 1.25
    cam.top = radius * 1.25
    cam.bottom = -radius * 1.25
    cam.near = 0.5
    cam.far = radius * 8
    cam.updateProjectionMatrix()
    this.sunLight.target.position.set(0, (minY + maxY) / 2, 0)
  }

  /* ── Light ──────────────────────────────────────────────────────────── */

  /**
   * The light is computed, not art-directed. Intensity and colour come from
   * the sun's altitude, so the difference between the equinox, the June
   * solstice and the local zenith passage is visible rather than described.
   */
  setSun(sun: SolarPosition, house: AnyHouse): void {
    const [dx, dy, dz] = sunDirection(sun)
    const radius = Math.hypot(...house.bounds.max) + 30
    this.sunLight.position.set(dx * radius, Math.max(dy, -0.2) * radius, dz * radius)

    const alt = sun.altitude
    const day = clamp01(alt / 12) // fades out through twilight
    const high = clamp01(alt / 65)

    this.sunLight.intensity = 3.4 * day
    // Low sun is turmeric, high sun is lime — both from the pigment set.
    this.sunLight.color.set(0xc8912b).lerp(new THREE.Color(0xfff4e0), high)
    this.sunLight.castShadow = alt > 0.5

    this.skyLight.intensity = 0.25 + 0.75 * day
    const sky = skyColour(alt)
    this.skyLight.color.copy(sky)
    this.skyLight.groundColor.set(GROUND)

    // A flat colour tracking the computed altitude. A light source, not a
    // photograph: there is no gradient, no sun disc and no cloud.
    this.scene.background = sky
    this.contact.visible = alt > 0
    ;(this.contact.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.4 * day
    this.site.setDaylight(day)
    this.needsRender = true
  }

  /* ── Per-frame state ────────────────────────────────────────────────── */

  apply(options: SceneOptions, elapsedSeconds: number): void {
    this.figure.visible = options.figure
    this.site.setVisible(options.site)
    this.setSection(options.section)
    this.rain.setActive(options.rain, this.model)
    const raining = options.rain && !options.reducedMotion
    if (raining) {
      this.rain.advance(elapsedSeconds)
      this.needsRender = true
    }

    if (!this.model) return

    // Nothing here is animated by default, so the scene redraws only when
    // something has actually changed. There is no idle motion to keep alive.
    const signature = [
      options.figure,
      options.rain,
      options.explode,
      options.section,
      options.provenance,
      options.reducedMotion,
      options.reveal ? options.reveal.t.toFixed(4) : 'none',
    ].join('|')
    if (signature === this.lastApplied) return
    this.lastApplied = signature

    if (options.provenance !== this.provenanceOn) {
      this.provenanceOn = options.provenance
      this.setProvenanceMarking(options.provenance)
    }

    for (const [id, object] of this.byPart) {
      const rest = this.restPosition.get(id)
      if (!rest) continue

      let y = rest.y
      let scale = 1

      if (options.reveal) {
        const p = options.reducedMotion
          ? // Reduced motion gets the complete alternative: the sequence still
            // runs, as an immediate ordered reveal rather than a drop.
            progressAt(options.reveal.timeline, id, options.reveal.t) > 0
            ? 1
            : 0
          : easeOutCubic(progressAt(options.reveal.timeline, id, options.reveal.t))
        object.visible = p > 0
        if (p < 1) {
          // The drop. No fades — opacity needs transparent materials, and a
          // house is not translucent while it is being built.
          y = rest.y + (1 - p) * 2.6
          // Boxes scale about their own centre, because their object origin
          // is that centre. World-space meshes get the drop only: scaling one
          // would scale it about the scene origin and swing a 14 m roof in
          // from below, which reads as an effect rather than an act of
          // building.
          if (this.boxParts.has(id)) scale = 0.55 + 0.45 * p
        }
      } else {
        object.visible = true
      }

      if (options.explode > 0) {
        const order = this.explodeOffset(id)
        y += order * options.explode
      }

      object.position.set(rest.x, y, rest.z)
      object.scale.setScalar(scale)
    }
    this.needsRender = true
  }

  /**
   * The section cut.
   *
   * A real clipping plane on the ridge plane, not a drawn diagram: the three
   * vertical zones are a spatial fact about the building, and showing them as
   * a flat illustration would be arguing for them rather than showing them.
   */
  private setSection(on: boolean): void {
    if (this.renderer.localClippingEnabled === on) return
    this.renderer.localClippingEnabled = on
    const planes = on ? [this.clip] : []
    this.houseGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material
        if (Array.isArray(material)) material.forEach((m) => (m.clippingPlanes = planes))
        else material.clippingPlanes = planes
      }
    })
    this.zones.group.visible = on
    this.needsRender = true
  }

  /** How far a part lifts in the exploded view: later in the build, higher up. */
  private explodeOffset(id: string): number {
    const house = this.house
    const index = this.orderIndex.get(id)
    if (!house || index === undefined) return 0
    return (index / Math.max(1, house.parts.length - 1)) * 9
  }

  /* ── Camera ─────────────────────────────────────────────────────────── */

  viewPreset(view: ViewKey): CameraState {
    const model = this.model
    const house = this.house
    const target = new THREE.Vector3(0, 4, 0)
    let distance = 26
    if (house && model) {
      target.copy(boundsCentre(house))
      distance = this.fitDistance(house)
    }
    switch (view) {
      case 'tampak':
        // Looking at the front face, from in front of it. X runs front to rear
        // in both houses, so this is one azimuth and not a per-tradition one.
        // Near-horizontal, so it reads as an elevation rather than a
        // three-quarter view.
        //
        // The distance is fitted to the front elevation itself — the house's
        // width across Z and its height — plus half its depth, because the
        // camera aims at the centre and the front face is that much nearer.
        // It was a fixed two-thirds of the three-quarter view's distance,
        // which cropped the top off any house taller than it is wide: the
        // tongkonan's prows went out of the frame.
        return {
          azimuth: Math.PI,
          polar: Math.PI / 2 - 0.03,
          distance: house ? this.fitFront(house) : distance * 0.66,
          target,
        }
      case 'potongan': {
        // Square on to the cut face, whichever axis the tradition cuts on.
        // Near-horizontal, so the zones stack the way they stack in the
        // building rather than being read off a perspective.
        const axis = model ? sectionAxis(model) : 2
        return {
          azimuth: axis === 2 ? Math.PI / 2 : Math.PI,
          polar: Math.PI / 2 - 0.05,
          distance: distance * 0.86,
          target,
        }
      }
      case 'halaman': {
        /*
         * Standing in the yard, at the height of a person, looking at the
         * front of the house.
         *
         * The place is the tradition's, not the renderer's: `approachAt` is
         * where that house is addressed from, which its orientation rule
         * already said and which nothing in the model could show while the
         * yard was empty. Now that the alang stand where the alang stand, the
         * default three-quarter view has them squarely in front of the house —
         * which is what happens if you stand behind a granary, and the answer
         * is to stand somewhere else rather than to move the granary.
         *
         * Eye height is the scale figure's, so the two agree about how tall a
         * person is; the aim is at the middle of the front rather than the
         * centroid, so a tall roof does not pitch the whole frame skyward.
         */
        //
        // The direction is the tradition's; the distance along it is checked.
        // An `approachAt` written as "a few metres in front of the door" put
        // the eye inside the thatch of a mbaru niang, under the eave of a
        // rumah gadang and against the face of a tongkonan — a person stands
        // in the yard, not in the roof. So the eye keeps the bearing the
        // tradition gave and steps back along it until it is clear of the
        // house's plan and the whole front, ridge included, fits the frame.
        const at = model ? model.approachAt : ([-12, 0, 0] as const)
        const aim = new THREE.Vector3(0, house ? house.bounds.max[1] * 0.42 : 3, 0)
        const back = house ? this.yardDistance(house, at[0], at[2], aim.y) : Math.hypot(at[0], at[2])
        const bearing = Math.atan2(at[2], at[0])
        const eye = new THREE.Vector3(
          Math.cos(bearing) * back,
          FIGURE_HEIGHT,
          Math.sin(bearing) * back,
        )
        const away = eye.clone().sub(aim)
        const range = Math.max(4, away.length())
        return {
          azimuth: Math.atan2(away.z, away.x),
          polar: Math.acos(Math.max(-1, Math.min(1, away.y / range))),
          distance: range,
          target: aim,
        }
      }
      case 'kolong':
        // A house that sits on the earth has no under-floor to drop into —
        // the honai and the ume kbubu hold their fire's heat in the ground on
        // purpose, so their underfloor height is zero. Looking up from 55% of
        // nothing put the camera under the ground plane. The view stays at a
        // crouch instead: just off the ground, looking at where the house
        // meets it, which is the answer this view gives for them.
        if (model && model.underfloorHeight < 0.6) {
          return {
            azimuth: -2.5,
            polar: Math.PI / 2 - 0.1,
            // From outside the plan: a round house's ridge reach is a few
            // tens of centimetres, and a multiple of it put the eye in the wall.
            distance: Math.max(model.ridgeReach * 1.6, distance * 0.7),
            target: new THREE.Vector3(0, 0.6, 0),
          }
        }
        // Drops under the floor and looks up.
        return {
          azimuth: -2.5,
          polar: 1.62,
          distance: model ? model.ridgeReach * 1.1 : 8,
          target: new THREE.Vector3(0, model ? model.underfloorHeight * 0.55 : 1.2, 0),
        }
      default:
        return { azimuth: -2.25, polar: 1.13, distance, target }
    }
  }

  /**
   * The distance that frames the whole house, from its bounding sphere and
   * the narrower of the two field-of-view angles. A fixed multiple of the
   * height crops the prow on a tall narrow viewport, and the prow is the
   * thing the reader came to look at.
   */
  private fitDistance(house: AnyHouse): number {
    const centre = boundsCentre(house)
    const [minX, minY, minZ] = house.bounds.min
    const [maxX, maxY, maxZ] = house.bounds.max
    // All eight corners: on a house this asymmetric the far corner is not
    // always one of the two the bounds happen to name.
    let radius = 0
    for (const x of [minX, maxX]) {
      for (const y of [minY, maxY]) {
        for (const z of [minZ, maxZ]) {
          radius = Math.max(radius, Math.hypot(x - centre.x, y - centre.y, z - centre.z))
        }
      }
    }
    const vfov = (this.camera.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    // A little air around the model: this is a drawing on a sheet, not a
    // photograph cropped to its subject.
    return (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.18
  }

  /**
   * How far back from the centre to stand for the front elevation: the
   * larger of what the height and the width need, plus half the depth.
   */
  private fitFront(house: AnyHouse): number {
    const [minX, minY, minZ] = house.bounds.min
    const [maxX, maxY, maxZ] = house.bounds.max
    const vfov = (this.camera.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    const halfH = (maxY - minY) / 2
    const halfW = (maxZ - minZ) / 2
    const fit = Math.max(halfH / Math.tan(vfov / 2), halfW / Math.tan(hfov / 2))
    return fit * 1.15 + (maxX - minX) / 2
  }

  /**
   * How far from the house's centre a person must stand, on a given bearing,
   * to be in the yard and see the whole front.
   *
   * Three conditions, and the answer is the farthest of them: the tradition's
   * own approach distance; clear of the plan by two metres (a box's reach in
   * a direction is |cos|·halfX + |sin|·halfZ); and far enough that the
   * highest point of the house sits inside the upper edge of the frame when
   * the camera, at eye height, aims at `aimY`. The last is solved by walking
   * outward, because the aim and the top move together and a closed form
   * would hide that.
   */
  private yardDistance(house: AnyHouse, atX: number, atZ: number, aimY: number): number {
    const [minX, , minZ] = house.bounds.min
    const [maxX, maxY, maxZ] = house.bounds.max
    const bearing = Math.atan2(atZ, atX)
    const c = Math.abs(Math.cos(bearing))
    const sn = Math.abs(Math.sin(bearing))
    const reach =
      c * Math.max(Math.abs(minX), Math.abs(maxX)) + sn * Math.max(Math.abs(minZ), Math.abs(maxZ))
    const halfAcross =
      sn * Math.max(Math.abs(minX), Math.abs(maxX)) + c * Math.max(Math.abs(minZ), Math.abs(maxZ))
    const vfov = (this.camera.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    let d = Math.max(Math.hypot(atX, atZ), reach + 2)
    for (let i = 0; i < 400; i++) {
      // the nearest face is `reach` closer than the centre
      const face = Math.max(0.5, d - reach)
      const topAngle = Math.atan2(maxY - FIGURE_HEIGHT, face)
      const aimAngle = Math.atan2(aimY - FIGURE_HEIGHT, d)
      const sideAngle = Math.atan2(halfAcross, face)
      if (topAngle - aimAngle <= vfov * 0.46 && sideAngle <= hfov * 0.5) break
      d += 0.5
    }
    return d
  }

  private fitCamera(): void {
    const preset = this.viewPreset('perspektif')
    this.cam.distance = preset.distance
    this.cam.target.copy(preset.target)
  }

  setCamera(state: CameraState): void {
    this.cam.azimuth = state.azimuth
    this.cam.polar = clamp(state.polar, 0.08, Math.PI - 0.08)
    this.cam.distance = clamp(state.distance, 3, 200)
    this.cam.target.copy(state.target)
    this.needsRender = true
  }

  /** Drag-only rotation. There is no idle turntable and there never will be. */
  orbit(deltaX: number, deltaY: number): void {
    this.cam.azimuth -= deltaX * 0.0055
    this.cam.polar = clamp(this.cam.polar - deltaY * 0.0055, 0.08, Math.PI - 0.08)
    this.needsRender = true
  }

  dolly(factor: number): void {
    this.cam.distance = clamp(this.cam.distance * factor, 3, 200)
    this.needsRender = true
  }

  /* ── Frame ──────────────────────────────────────────────────────────── */

  resize(width: number, height: number): void {
    const unframed = this.camera.aspect === 1
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    // The first real measurement is the first one that can frame the house.
    // Before it the aspect is a placeholder and any fit would be wrong.
    if (unframed && this.house) this.fitCamera()
    this.needsRender = true
  }

  render(): void {
    const { azimuth, polar, distance, target } = this.cam
    this.camera.position.set(
      target.x + distance * Math.sin(polar) * Math.cos(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.sin(azimuth),
    )
    this.camera.lookAt(target)
    if (this.house && this.site.group.visible) {
      this.scene.updateMatrixWorld()
      this.site.clearSightOf(this.camera.position, sightPoints(this.house))
    }
    this.renderer.render(this.scene, this.camera)
    this.needsRender = false
  }

  get dirty(): boolean {
    return this.needsRender
  }

  markDirty(): void {
    this.needsRender = true
  }

  /**
   * Where each site mark's caption belongs on screen, in percent of the
   * viewport, or nothing when it is behind the camera.
   *
   * The names are drawn in the interface's own type over the canvas rather
   * than inside the model. A caption laid on the ground would be the first
   * lettering in the scene, and the register here is a physical model under
   * real light — a model with words written on the earth is a diagram.
   */
  siteLabels(): readonly { key: string; left: number; top: number }[] {
    const out: { key: string; left: number; top: number }[] = []
    // Nothing to name when there is nothing drawn.
    if (!this.site.group.visible) return out
    const v = new THREE.Vector3()
    for (const [key, anchor] of this.site.anchors()) {
      v.copy(anchor).project(this.camera)
      // Behind the camera, or far enough outside the frame that a caption
      // would sit against the edge pointing at nothing.
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue
      out.push({ key, left: (v.x * 0.5 + 0.5) * 100, top: (-v.y * 0.5 + 0.5) * 100 })
    }
    return out
  }

  /** Metres per pixel at the target, for the scale bar. */
  metresPerPixel(height: number): number {
    const fov = (this.camera.fov * Math.PI) / 180
    return (2 * Math.tan(fov / 2) * this.cam.distance) / Math.max(1, height)
  }

  dispose(): void {
    this.clearHouse()
    this.materials.dispose()
    this.rain.dispose()
    this.zones.dispose()
    this.site.dispose()
    this.renderer.dispose()
  }
}

/* ── Rain ─────────────────────────────────────────────────────────────── */

/** Write a triple into a flat array with the ridge axis chosen at runtime. */
function alongRidge(
  ridgeAxis: 0 | 2 | null,
  along: number,
  y: number,
  across: number,
): [number, number, number] {
  // A house with no ridge is laid out along Z, which is the same choice
  // `sectionAxis` makes and for the same reason: on a round house every
  // bearing is the same bearing.
  return ridgeAxis === 0 ? [along, y, across] : [across, y, along]
}

/**
 * Water shedding off the pitch, and where it lands.
 *
 * The whole demonstration is the drip line falling clear of the post feet,
 * which is why the overhang is as deep as it is. Both houses make that
 * argument and they make it along different axes, so the rig is written
 * against the ridge axis rather than against X.
 */
class RainRig {
  readonly group = new THREE.Group()
  // One seeded stream, so a reader who leaves and comes back sees the same
  // rain, not a different shower that reads as the scene being alive.
  private random = seeded(48271)
  private streaks: THREE.LineSegments | null = null
  private dripLine: THREE.LineSegments | null = null
  private velocities: number[] = []
  private model: SceneModel | null = null

  constructor() {
    this.group.visible = false
  }

  configure(model: SceneModel): void {
    this.model = model
    this.dispose()

    const count = 420
    const positions = new Float32Array(count * 6)
    this.velocities = []
    for (let i = 0; i < count; i++) {
      this.seed(positions, i, model, this.random())
      this.velocities.push(6 + this.random() * 4)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.streaks = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: KAPUR, transparent: true, opacity: 0.5 }),
    )
    this.group.add(this.streaks)

    // Where the water lands. Two lines on the ground, just outside the eave,
    // running the length of the ridge.
    const across = (model.ridgeAxis === 0 ? model.drip.z : model.drip.x) + 0.18
    const reach = model.ridgeReach
    const drip = new Float32Array([
      ...alongRidge(model.ridgeAxis, -reach, 0.02, across),
      ...alongRidge(model.ridgeAxis, reach, 0.02, across),
      ...alongRidge(model.ridgeAxis, -reach, 0.02, -across),
      ...alongRidge(model.ridgeAxis, reach, 0.02, -across),
    ])
    const dripGeom = new THREE.BufferGeometry()
    dripGeom.setAttribute('position', new THREE.BufferAttribute(drip, 3))
    this.dripLine = new THREE.LineSegments(
      dripGeom,
      new THREE.LineBasicMaterial({ color: RARA, linewidth: 2 }),
    )
    this.group.add(this.dripLine)
  }

  private seed(positions: Float32Array, i: number, model: SceneModel, phase: number): void {
    const along = (this.random() * 2 - 1) * model.ridgeReach
    const spread = (model.ridgeAxis === 0 ? model.drip.z : model.drip.x) + 2.2
    const across = (this.random() * 2 - 1) * spread
    const top = model.weatherTop + 2
    const y = phase * top
    const len = 0.5
    const o = i * 6
    const head = alongRidge(model.ridgeAxis, along, y, across)
    const tail = alongRidge(model.ridgeAxis, along, y - len, across)
    positions[o] = head[0]
    positions[o + 1] = head[1]
    positions[o + 2] = head[2]
    positions[o + 3] = tail[0]
    positions[o + 4] = tail[1]
    positions[o + 5] = tail[2]
  }

  setActive(active: boolean, model: SceneModel | null): void {
    this.group.visible = active
    if (active && model && !this.streaks) this.configure(model)
  }

  advance(seconds: number): void {
    const model = this.model
    const streaks = this.streaks
    if (!model || !streaks) return
    const attribute = streaks.geometry.getAttribute('position')
    const array = attribute.array as Float32Array
    for (let i = 0; i < this.velocities.length; i++) {
      const v = (this.velocities[i] ?? 8) * seconds
      const o = i * 6
      const y = (array[o + 1] ?? 0) - v
      // Water that reaches the ground is reseeded at the top: it does not
      // pass through the roof, it runs off it.
      if (y < 0) {
        this.seed(array, i, model, 1)
      } else {
        array[o + 1] = y
        array[o + 4] = y - 0.5
      }
    }
    attribute.needsUpdate = true
  }

  dispose(): void {
    for (const child of [this.streaks, this.dripLine]) {
      if (!child) continue
      this.group.remove(child)
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
    this.streaks = null
    this.dripLine = null
  }
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * The occupancy zones, drawn on the cut plane.
 *
 * The lines mark where one zone ends and the next begins; the rail names them,
 * because nothing on screen may carry meaning that only the code knows. Which
 * planes are worth a line is the tradition's own answer — the rumah gadang has
 * one the tongkonan does not, and its absence under the other laras is the
 * statement rather than an omission.
 */
class ZoneRig {
  readonly group = new THREE.Group()

  constructor() {
    this.group.visible = false
  }

  configure(model: SceneModel): void {
    this.dispose()
    // Run past the building at both ends, the way extension lines do on a
    // drawing: the boundary is being pointed at, not enclosed.
    const over = 1.6
    const reach = model.ridgeReach + over
    const offset = 0.02
    const points: number[] = []
    for (const y of model.zoneLines) {
      points.push(
        ...alongRidge(model.ridgeAxis, -reach, y, offset),
        ...alongRidge(model.ridgeAxis, reach, y, offset),
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    this.group.add(
      new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: BOLU, transparent: true, opacity: 0.8 }),
      ),
    )
  }

  dispose(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    }
  }
}


/**
 * The ground the house stands on, drawn rather than furnished.
 *
 * The question this answers is "where is this house", and the tempting answer
 * is scenery: palms, a terrace, a hillside, a sky. That answer is refused for
 * the same reason bloom and a HDRI are refused — 85% of the numbers in this
 * model are the author's, and a photographic setting would state, fluently and
 * without provenance, a great deal more that nobody measured. A plausible
 * landscape is an interpolated drawing presented as a photograph.
 *
 * So the setting is a site plan: a metre grid and the north point, drawn on
 * the earth the way a surveyor sets out a building before anything is raised.
 * It asserts two things and both are true — that this is measured ground, and
 * which way is north, which for every house here is −X because orientation is
 * a constraint of the model rather than a property of the view.
 *
 * It cannot block the house: everything in it lies flat on the ground, below
 * the underfloor of every building in the collection.
 *
 * The lines fade toward the ground's own colour with distance, so the grid
 * dissolves rather than ending at a hard edge — a hard edge would read as a
 * platform the house stands on, which is a claim about the site.
 */
class SiteRig {
  readonly group = new THREE.Group()
  private lines: THREE.LineSegments | null = null
  private meshes: THREE.Mesh[] = []
  /** the solids among the meshes: the only things in the setting tall enough to hide anything */
  private solids: THREE.Mesh[] = []
  private readonly ray = ((): THREE.Raycaster => {
    // The rays must see a solid on either layer: a raycaster tests only its
    // own layers, so one already set aside would be missed on the next frame,
    // put back, found again — set aside and restored on alternate frames.
    const r = new THREE.Raycaster()
    r.layers.enableAll()
    return r
  })()

  /**
   * Set aside any solid standing between the eye and the house.
   *
   * The setting was accepted on one condition: nothing in it may hide any
   * part of a house. From the three-quarter view that held by luck; square
   * on to the front, a neighbour's roof across the road, a row of sa'o, a
   * barn in the yard stood in front of the building the page is about. So
   * before each frame a ray goes from the eye to points through the house's
   * volume, and a solid that any of them meets first is moved to a layer the
   * view camera does not draw. The sun's camera does draw it, so its shadow
   * stays where the sun puts it. Drag round and it comes back.
   */
  clearSightOf(eye: THREE.Vector3, targets: readonly THREE.Vector3[]): void {
    if (this.solids.length === 0) return
    const blocked = new Set<THREE.Object3D>()
    // A ray that starts inside a solid never meets its faces, so an eye that
    // has stepped back into a granary would see straight through the check
    // and into the granary's dark. Standing inside a solid is blocking by
    // definition.
    const box = new THREE.Box3()
    for (const mesh of this.solids) {
      if (box.setFromObject(mesh).containsPoint(eye)) blocked.add(mesh)
    }
    const dir = new THREE.Vector3()
    for (const t of targets) {
      dir.subVectors(t, eye)
      const far = dir.length()
      if (far < 1e-6) continue
      this.ray.set(eye, dir.normalize())
      this.ray.far = far - 0.05
      for (const hit of this.ray.intersectObjects(this.solids, false)) blocked.add(hit.object)
    }
    for (const mesh of this.solids) {
      if (blocked.has(mesh)) mesh.layers.set(SET_ASIDE)
      else mesh.layers.set(0)
    }
  }
  /** where each mark's caption is anchored, in world metres */
  private anchorsByKey = new Map<string, THREE.Vector3>()
  /** what the reader asked for, and whether there is light to see it by */
  private wanted = true
  private lit = true

  /** Set out the grid for a particular building, and draw what is around it. */
  configure(model: SceneModel): void {
    this.dispose()

    /*
     * The grid reaches half again past the longest side, and far enough out to
     * hold whatever the tradition put on the ground, rounded up to five
     * metres. A grid smaller than the building would read as a plinth; one
     * that stopped short of the rice barns would draw them off the sheet.
     */
    const longest = Math.max(model.footprint.x, model.footprint.z)
    const reachOut = model.site.flatMap((mark) =>
      mark.lines.flatMap((line) => line.map(([x, z]) => Math.hypot(x, z))),
    )
    const half = Math.max(15, Math.ceil((Math.max(longest * 0.75, ...reachOut, 0) + 3) / 5) * 5)
    const y = 0.006

    const positions: number[] = []
    const colours: number[] = []
    const ground = new THREE.Color(GROUND)
    const ink = new THREE.Color(BOLU)

    /*
     * Five metres, not one.
     *
     * At a metre the grid was a hundred lines under the house and everything
     * drawn on it — the yard, the river, the barns — disappeared into the
     * hatching. Setting-out lines are supposed to be the quietest thing on the
     * ground: what the reader is meant to see is the place.
     */
    const rule = ground.clone().lerp(ink, 0.20)
    const step = 5
    const push = (x: number, z: number) => {
      positions.push(x, y, z)
      const t = clamp01(Math.hypot(x, z) / half)
      const c = rule.clone().lerp(ground, t * t)
      colours.push(c.r, c.g, c.b)
    }
    for (let n = -half; n <= half; n += step) {
      // A line only runs as far as the disc it is fading into, so the corners
      // of the square are never drawn.
      const reach = Math.sqrt(Math.max(0, half * half - n * n))
      if (reach < 0.5) continue
      push(-reach, n)
      push(reach, n)
      push(n, -reach)
      push(n, reach)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
    this.lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 }),
    )
    this.group.add(this.lines)

    /*
     * The north point, at the north edge of the grid.
     *
     * North is −X for every building here, because the axis convention is the
     * model's and not the camera's: what varies between traditions is which
     * end of the house faces which way, never which way north is. Drawn as an
     * arrow and an N in ribbons, like everything else on the ground — a letter
     * from a font would be the first typography inside the model, and the
     * model is not a diagram.
     */
    const tip = -half - 1.5
    const nx = tip + 3.4
    this.ribbon(
      [
        [
          [tip, 0],
          [tip + 2.4, 0],
        ],
        [
          [tip, 0],
          [tip + 0.9, -0.55],
        ],
        [
          [tip, 0],
          [tip + 0.9, 0.55],
        ],
        [
          [nx + 1, -0.45],
          [nx, -0.45],
          [nx + 1, 0.45],
          [nx, 0.45],
        ],
      ],
      0.1,
      ground.clone().lerp(ink, 0.7),
      0.012,
    )

    /*
     * And what the tradition says is on the ground.
     *
     * The first version drew these as hairlines and they could not be found:
     * a metre grid of hairlines with three more hairlines in it is a grid. A
     * mark has to hold its own against the house, so an outline is a ribbon
     * with a width in metres rather than a line with a width in pixels, and a
     * closed figure carries a tone as well.
     *
     * Still flat, all of it, and still only outlines and tones: nothing here
     * can hide any part of the house, and nothing in it is a plant, a hill,
     * water or a sky.
     */
    const edge = ground.clone().lerp(ink, 0.62)
    const tone = ground.clone().lerp(ink, 0.16)
    for (const site of model.site) {
      const closed = site.lines.map((line) => {
        const first = line[0]
        const last = line[line.length - 1]
        if (!site.closed || !first || !last) return line
        // A closed figure that was written open still closes: the drawing says
        // "an outline", so the outline is drawn whatever the list did.
        return first[0] === last[0] && first[1] === last[1] ? line : [...line, first]
      })
      /*
       * A tone goes on the things standing on the ground, not on the ground
       * you are standing on.
       *
       * Toning an enclosure — a walled yard, a compound, a clearing — repaints
       * the floor the house is on, and with a wall around it the whole figure
       * reads as a raised tray with buildings set into it. So a closed figure
       * is toned only when it does not contain the house: a barn's footprint
       * is a thing on the ground and takes a tone, a pekarangan is the ground
       * and is read from its wall.
       */
      if (site.closed) {
        for (const line of closed) if (!containsOrigin(line)) this.fill(line, tone)
      }
      this.ribbon(closed, 0.16, edge, 0.014)
      if (!site.closed) this.ribbon(this.tickMarks(closed), 0.12, edge, 0.014)
      for (const volume of site.volumes) this.solid(volume)
      // Where the caption goes is a fact about the ground plan, so the rule
      // lives in the core and this only puts it into world space.
      const [cx, cz] = captionAt(closed, model.drip)
      this.anchorsByKey.set(site.key, new THREE.Vector3(cx, 0, cz))
    }
  }

  /**
   * One solid in the setting: a grave slab, a barn's massing, a fence, water.
   *
   * Built from primitives here for the same reason the scale figure is: this
   * is scene furniture, not a building. Nothing in it is generated geometry in
   * the sense the split is about — the tradition states a kind, a place and a
   * size in metres, and the renderer stands the corresponding solid there. A
   * shape being *computed* in here would be the violation; a box being made
   * from a stated size is what the house's own parts already do.
   *
   * They cast and receive shadow, because a model of a place where a barn
   * throws a shadow across a yard at four in the afternoon is telling the
   * truth about the sun, which is the one thing in this project that was never
   * interpolated.
   */
  private solid(volume: SiteVolume): void {
    const [w, h, d] = volume.size
    if (h <= 0 || w <= 0 || d <= 0) return
    let geometry: THREE.BufferGeometry
    switch (volume.kind) {
      case 'box':
        geometry = new THREE.BoxGeometry(w, h, d)
        geometry.translate(0, h / 2, 0)
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(w / 2, w / 2, h, 12)
        geometry.translate(0, h / 2, 0)
        break
      case 'cone':
        geometry = new THREE.ConeGeometry(w / 2, h, 16)
        geometry.translate(0, h / 2, 0)
        break
      case 'gable': {
        // A prism: two sloping planes over a rectangle. Written out because
        // three has no gable primitive, and because a cone with four sides is
        // a pyramid and this is not one.
        const hx = w / 2
        const hz = d / 2
        const ridge = volume.ridgeAxis === 2 ? 2 : 0
        const a: [number, number, number][] =
          ridge === 0
            ? [
                [-hx, 0, -hz],
                [hx, 0, -hz],
                [hx, 0, hz],
                [-hx, 0, hz],
                [-hx, h, 0],
                [hx, h, 0],
              ]
            : [
                [-hx, 0, -hz],
                [hx, 0, -hz],
                [hx, 0, hz],
                [-hx, 0, hz],
                [0, h, -hz],
                [0, h, hz],
              ]
        const faces =
          ridge === 0
            ? [
                [0, 1, 5],
                [0, 5, 4],
                [3, 4, 5],
                [3, 5, 2],
                [1, 2, 5],
                [0, 4, 3],
              ]
            : [
                [0, 1, 4],
                [1, 5, 2],
                [1, 4, 5],
                [3, 2, 5],
                [3, 5, 4],
                [0, 4, 3],
              ]
        const points: number[] = []
        for (const [i, j, k] of faces) {
          for (const n of [i, j, k]) {
            const v = a[n ?? 0]
            if (v) points.push(v[0], v[1], v[2])
          }
        }
        geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
        geometry.computeVertexNormals()
        break
      }
    }
    const mesh = new THREE.Mesh(geometry, siteMaterial(volume.material))
    mesh.position.set(volume.at[0], volume.at[1], volume.at[2])
    mesh.castShadow = volume.material !== 'air' && volume.material !== 'tanah'
    mesh.receiveShadow = true
    this.meshes.push(mesh)
    // Water is a sheet the house stands in, not a thing in front of it: the
    // kariwari's posts are below the waterline by design, and setting the bay
    // aside to show them would draw a house in a dry hole.
    if (volume.material !== 'air') this.solids.push(mesh)
    this.group.add(mesh)
  }

  /** Where each mark's caption belongs, keyed the way the scene model keys it. */
  anchors(): ReadonlyMap<string, THREE.Vector3> {
    return this.anchorsByKey
  }

  /**
   * A polyline drawn as a flat ribbon of a stated width in metres.
   *
   * WebGL will not widen a line — `linewidth` is ignored on every platform
   * that matters — so a mark that has to be seen from across a village is
   * geometry rather than a stroke. Two triangles per segment, lying on the
   * ground, mitred at nothing: the corners are left square because a site plan
   * is chalk on earth and not a vector drawing.
   */
  private ribbon(
    lines: readonly (readonly (readonly [number, number])[])[],
    width: number,
    colour: THREE.Color,
    y: number,
  ): void {
    const points: number[] = []
    const half = width / 2
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]
        const b = line[i]
        if (!a || !b) continue
        const dx = b[0] - a[0]
        const dz = b[1] - a[1]
        const run = Math.hypot(dx, dz)
        if (run < 1e-9) continue
        // Run the ends past the joint by half a width, so a corner closes.
        const ex = (dx / run) * half
        const ez = (dz / run) * half
        const ax = a[0] - ex
        const az = a[1] - ez
        const bx = b[0] + ex
        const bz = b[1] + ez
        const nx = (-dz / run) * half
        const nz = (dx / run) * half
        points.push(
          ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz,
          ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz,
        )
      }
    }
    if (points.length === 0) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, side: THREE.DoubleSide }),
    )
    this.meshes.push(mesh)
    this.group.add(mesh)
  }

  /**
   * A tone inside a closed figure — a yard, a footprint, a compound.
   *
   * Lit and shadow-receiving rather than painted on, so the house's own shadow
   * crosses it. A flat unlit patch would sit on top of the shadow and read as
   * a sticker rather than as ground.
   */
  private fill(line: readonly (readonly [number, number])[], colour: THREE.Color): void {
    /*
     * The shape is built with its Z negated, because the mesh is laid down by
     * turning it a quarter about X the same way the ground plane is, and that
     * turn sends the shape's +Y to the world's −Z. Negating here rather than
     * turning the other way keeps the face pointing up: a plane turned the
     * other way is lit from underneath and renders as nothing.
     */
    const shape = new THREE.Shape()
    const first = line[0]
    if (!first) return
    shape.moveTo(first[0], -first[1])
    for (let i = 1; i < line.length; i++) {
      const p = line[i]
      if (p) shape.lineTo(p[0], -p[1])
    }
    shape.closePath()
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({ color: colour, roughness: 1, metalness: 0 }),
    )
    mesh.rotation.x = -Math.PI / 2
    // A millimetre apart, in the order they were declared: a compound wall and
    // the shrine inside it are two figures on one plane, and two coplanar
    // meshes flicker against each other.
    mesh.position.y = 0.004 + this.meshes.length * 0.001
    mesh.receiveShadow = true
    this.meshes.push(mesh)
    this.group.add(mesh)
  }

  /** Ticks on the far side of an open edge, so a bank reads as a bank. */
  private tickMarks(
    lines: readonly (readonly (readonly [number, number])[])[],
  ): readonly (readonly [number, number])[][] {
    const spacing = 2
    const length = 0.8
    const out: [number, number][][] = []
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]
        const b = line[i]
        if (!a || !b) continue
        const dx = b[0] - a[0]
        const dz = b[1] - a[1]
        const run = Math.hypot(dx, dz)
        if (run < 1e-6) continue
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        // The normal points away from the house, which is the side the water
        // or the street is on.
        let nx = -dz / run
        let nz = dx / run
        if (nx * mid[0] + nz * mid[1] < 0) {
          nx = -nx
          nz = -nz
        }
        for (let d = spacing / 2; d < run; d += spacing) {
          const t = d / run
          const x = a[0] + dx * t
          const z = a[1] + dz * t
          out.push([
            [x, z],
            [x + nx * length, z + nz * length],
          ])
        }
      }
    }
    return out
  }

  /**
   * Setting-out lines are chalk and string, not paint: they are legible in
   * daylight and gone at night, so they follow the sun like everything else
   * here rather than glowing through it.
   */
  setVisible(on: boolean): void {
    this.wanted = on
    this.group.visible = on && this.lit
  }

  setDaylight(day: number): void {
    this.lit = day > 0.02
    const opacity = 0.15 + 0.85 * day
    const material = this.lines?.material
    if (material instanceof THREE.LineBasicMaterial) material.opacity = opacity
    for (const mesh of this.meshes) {
      const m = mesh.material
      if (m instanceof THREE.MeshBasicMaterial) m.opacity = opacity
    }
    this.group.visible = this.wanted && this.lit
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.meshes = []
    this.solids = []
    this.anchorsByKey.clear()
    if (!this.lines) return
    this.group.remove(this.lines)
    this.lines.geometry.dispose()
    ;(this.lines.material as THREE.Material).dispose()
    this.lines = null
  }
}

/**
 * The substances a setting is made of, as materials.
 *
 * Five, flat and matte, and shared by every tradition — unlike the house's own
 * material set, which is generated per tradition because the species and the
 * working are stated by a builder. Nobody stated the stone of a grave whose
 * size this model invented, so these are plain colours under the same sun.
 *
 * Water is the one with any sheen, and only a little: a model's water is a
 * poured surface, not a river. There is no ripple, no reflection and no sound,
 * because those would be the first things in this scene pretending to be
 * observed rather than made.
 */
/** The layer a site solid is moved to when it would hide the house. */
const SET_ASIDE = 1

/**
 * Points through the house's volume that the eye must be able to reach: a
 * three-by-three-by-three lattice inset from the bounds, so a corner of empty
 * air beside a prow does not count as a part of the house a barn may not hide.
 */
function sightPoints(house: AnyHouse): THREE.Vector3[] {
  const [x0, y0, z0] = house.bounds.min
  const [x1, y1, z1] = house.bounds.max
  const at = [0.15, 0.5, 0.85]
  const out: THREE.Vector3[] = []
  for (const fx of at) {
    for (const fy of at) {
      for (const fz of at) {
        out.push(new THREE.Vector3(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy, z0 + (z1 - z0) * fz))
      }
    }
  }
  return out
}

const siteMaterials = new Map<string, THREE.MeshStandardMaterial>()

function siteMaterial(key: SiteVolume['material']): THREE.MeshStandardMaterial {
  const found = siteMaterials.get(key)
  if (found) return found
  const made = ((): THREE.MeshStandardMaterial => {
    switch (key) {
      /*
       * Kept in the same value range as the house's own materials. The first
       * set was two stops lighter and the barns read as furniture standing
       * beside a building — a toy next to a model, which is worse than a
       * hairline, because a hairline at least knows it is a drawing.
       */
      case 'batu':
        return new THREE.MeshStandardMaterial({ color: 0x807c72, roughness: 0.96, metalness: 0 })
      case 'kayu':
        return new THREE.MeshStandardMaterial({ color: 0x4a3f31, roughness: 0.88, metalness: 0 })
      case 'atap':
        return new THREE.MeshStandardMaterial({ color: 0x2f2a22, roughness: 0.95, metalness: 0 })
      case 'air':
        // The one surface with any sheen, and only a little: a model's water
        // is poured, not flowing. Nothing moves on it and nothing is in it.
        return new THREE.MeshStandardMaterial({ color: 0x5c6b70, roughness: 0.25, metalness: 0 })
      case 'tanah':
        return new THREE.MeshStandardMaterial({ color: 0xb0a48e, roughness: 1, metalness: 0 })
    }
  })()
  siteMaterials.set(key, made)
  return made
}

/** Whether a closed figure has the house inside it, by even–odd crossing. */
function containsOrigin(line: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = line.length - 1; i < line.length; j = i++) {
    const a = line[i]
    const b = line[j]
    if (!a || !b) continue
    if (a[1] > 0 !== b[1] > 0 && 0 < ((b[0] - a[0]) * (0 - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside
    }
  }
  return inside
}


/* ── Pieces ───────────────────────────────────────────────────────────── */

/**
 * The scale figure: 1.68 m, on by default.
 *
 * A plain dark silhouette. It is the scale bar, so it must be unmistakably a
 * person and must not read as a character in a scene.
 */
function buildFigure(): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: BOLU, roughness: 0.95 })
  const headR = 0.105
  const bodyH = FIGURE_HEIGHT - headR * 2
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, bodyH - 0.3, 4, 12), material)
  body.position.y = bodyH / 2
  body.castShadow = true
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 16, 12), material)
  head.position.y = bodyH + headR
  head.castShadow = true
  group.add(body, head)
  return group
}

function contactTexture(): THREE.Texture {
  const size = 256
  const el = document.createElement('canvas')
  el.width = size
  el.height = size
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(23,21,15,0.85)')
  g.addColorStop(0.45, 'rgba(23,21,15,0.4)')
  g.addColorStop(1, 'rgba(23,21,15,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(el)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * UVs scaled by the part's physical size, so grain stays at a constant
 * physical size instead of stretching along a beam.
 */
function scaleBoxUVs(geometry: THREE.BoxGeometry, size: readonly [number, number, number]): void {
  const uv = geometry.getAttribute('uv')
  const [sx, sy, sz] = size
  // BoxGeometry lays faces out +X, -X, +Y, -Y, +Z, -Z, four vertices each.
  const spans: [number, number][] = [
    [sz, sy],
    [sz, sy],
    [sx, sz],
    [sx, sz],
    [sx, sy],
    [sx, sy],
  ]
  for (let face = 0; face < 6; face++) {
    const span = spans[face] ?? [1, 1]
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v
      uv.setXY(i, uv.getX(i) * (span[0] / TEXTURE_METRES), uv.getY(i) * (span[1] / TEXTURE_METRES))
    }
  }
  uv.needsUpdate = true
}

/** A flat sky colour tracking the computed altitude. */
function skyColour(altitude: number): THREE.Color {
  const night = new THREE.Color(0x121319)
  const dusk = new THREE.Color(0x6b675c)
  const day = new THREE.Color(0xbdc9d4)
  if (altitude <= -6) return night
  if (altitude < 6) return night.clone().lerp(dusk, (altitude + 6) / 12)
  return dusk.clone().lerp(day, clamp01((altitude - 6) / 40))
}

function boundsCentre(house: AnyHouse): THREE.Vector3 {
  const [minX, minY, minZ] = house.bounds.min
  const [maxX, maxY, maxZ] = house.bounds.max
  return new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clamp01 = (v: number) => clamp(v, 0, 1)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
