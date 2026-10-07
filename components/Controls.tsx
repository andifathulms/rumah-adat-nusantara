'use client'

import { COPY, pick } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { Tradition } from '@/lib/tradition/registry'
import { formatClock } from '@/lib/solar/presets'
import type { DatePreset } from '@/lib/solar/presets'
import type { Site } from '@/lib/solar/position'
import type { ViewKey } from './viewport/scene'
import { RailSection } from './Sheet'

/**
 * Orientation, stated on screen.
 *
 * Its absence from the controls has to read as a fact about the building
 * rather than as a missing feature, and the only way to achieve that is to
 * say so where the controls are.
 */
export function OrientationNote({
  locale,
  tradition,
}: {
  locale: Locale
  tradition: Tradition
}) {
  return (
    <RailSection title={pick(COPY.orientation.heading, locale)}>
      <p className="text-body text-muted">{tradition.orientation[locale]}</p>
    </RailSection>
  )
}

/**
 * Who builds these, and where.
 *
 * The interface was dense with Toraja vocabulary used confidently as the names
 * of things — tulak somba, a'riri, kale banua, rattiang banua, pa'ssura, ijuk,
 * tangdo', sali, sumbung — and the words Toraja, Sulawesi and Indonesia
 * appeared nowhere a reader could see. Rantepao appeared once, as a pair of
 * coordinates, which tells someone who already knows the place that it is that
 * place and tells everyone else nothing.
 *
 * It sits above the rules rather than on a separate page, because it is the
 * frame for everything below it and a reader should not have to go looking for
 * the answer to "whose house is this".
 */
/**
 * Whose house this is, folded under the rules.
 *
 * It used to open the rail, a long paragraph between the reader and the
 * controls they came to use. A reader on this route has already passed the
 * front door, which leads with the same paragraph and the same caution, and
 * the intro that shows while the model loads states the caution again. So it
 * is one tap away rather than gone, and its summary still names it.
 */
export function PlaceNote({ locale, tradition }: { locale: Locale; tradition: Tradition }) {
  return (
    <section className="border-t border-hairline">
      <details className="group">
        <summary className="micro flex min-h-control cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors duration-state hover:bg-wash hover:text-bolu">
          <span>{pick(COPY.place.heading, locale)}</span>
          <span aria-hidden className="font-mono text-meta group-open:hidden">
            +
          </span>
          <span aria-hidden className="hidden font-mono text-meta group-open:inline">
            −
          </span>
        </summary>
        <div className="px-4 pb-4">
          <p className="text-body">{tradition.about[locale]}</p>
          <p className="mt-3 text-body text-muted">{tradition.caution[locale]}</p>
        </div>
      </details>
    </section>
  )
}

export function SunControls({
  presets,
  presetKey,
  minutes,
  onPreset,
  onMinutes,
  altitude,
  site,
  locale,
}: {
  presets: readonly DatePreset[]
  presetKey: DatePreset['key']
  minutes: number
  onPreset: (key: DatePreset['key']) => void
  onMinutes: (minutes: number) => void
  altitude: number
  /** where the sun is being computed for; named on screen beside the clock */
  site: Site
  locale: Locale
}) {
  const active = presets.find((p) => p.key === presetKey) ?? presets[0]
  return (
    <RailSection title={pick(COPY.controls.sun, locale)}>
      <Choices legend={pick(COPY.controls.date, locale)}>
        <div className="flex flex-col gap-px">
          {presets.map((p) => (
            <Choice
              key={p.key}
              name="tanggal"
              value={p.key}
              checked={p.key === presetKey}
              onSelect={() => onPreset(p.key)}
              face={[
                'block rounded px-2 py-1.5 text-left transition-colors duration-state',
                p.key === presetKey ? 'bg-bolu text-kapur' : 'hover:bg-wash',
              ].join(' ')}
            >
            <span className="flex items-baseline justify-between gap-2 text-body leading-tight">
              {locale === 'id' ? p.labelId : p.labelEn}
              <span className="num text-meta">{p.noonAltitude.toFixed(1)}°</span>
            </span>
            <span
              className={[
                'mt-0.5 block text-meta',
                p.key === presetKey ? 'text-muted-on-ink' : 'text-muted',
              ].join(' ')}
            >
              {locale === 'id' ? p.glossId : p.glossEn}
              </span>
            </Choice>
          ))}
        </div>
      </Choices>

      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between">
          {/*
            A real label rather than an aria-label repeating it: the words are
            already on screen, and pointing at the control is what associates
            them.
          */}
          <label className="micro" htmlFor="waktu">
            {pick(COPY.controls.time, locale)} {site.tzName}
          </label>
          <span className="num text-meta">{formatClock(minutes)}</span>
        </div>
        <input
          id="waktu"
          type="range"
          min={0}
          max={1439}
          step={5}
          value={minutes}
          onChange={(e) => onMinutes(Number(e.target.value))}
          /*
            The clock and the altitude together: the altitude is what the
            control is actually for, and carrying it here is one announcement
            instead of a live region firing after every step.
          */
          aria-valuetext={fill(pick(COPY.controls.timeValue, locale), {
            clock: formatClock(minutes),
            alt: altitude.toFixed(1),
          })}
          className="h-control w-full accent-bolu"
        />
        <div className="mt-1 flex items-baseline justify-between">
          <span className="micro">
            {locale === 'id' ? 'Tinggi matahari' : 'Solar altitude'}
          </span>
          <span className="num text-meta">{altitude.toFixed(1)}°</span>
        </div>
        <p className="mt-2 text-body text-muted">
          {active ? describeTransit(active.noonAltitude, site, locale) : null}
        </p>
      </div>
    </RailSection>
  )
}

export function SceneToggles({
  figure,
  rain,
  site,
  onFigure,
  onRain,
  onSite,
  locale,
}: {
  figure: boolean
  rain: boolean
  site: boolean
  onFigure: (v: boolean) => void
  onRain: (v: boolean) => void
  onSite: (v: boolean) => void
  locale: Locale
}) {
  return (
    <RailSection>
      <Toggle
        checked={figure}
        onChange={onFigure}
        label={pick(COPY.controls.figure, locale)}
        hint={
          locale === 'id'
            ? 'Sosok ini bukan hiasan; ia adalah tongkat ukur.'
            : 'The figure is not set dressing; it is the scale bar.'
        }
      />
      {/*
        The setting, and a way to be rid of it. Everything around the house is
        the author's arrangement of what the sources describe, and a reader
        comparing two buildings has every reason to want the object on its own
        — which is how these models looked until the ground had anything on it.
      */}
      <Toggle
        checked={site}
        onChange={onSite}
        label={pick(COPY.controls.site, locale)}
        hint={
          locale === 'id'
            ? 'Menggambar tanah tempat rumah berdiri: kisi ukur, arah utara, dan apa yang menurut sumber ada di sekelilingnya. Matikan dan yang tersisa hanya rumahnya.'
            : 'Draws the ground the house stands on: the setting-out grid, the north point, and what the sources say is around it. Turn it off and the house is all that is left.'
        }
      />
      <Toggle
        checked={rain}
        onChange={onRain}
        label={pick(COPY.controls.rain, locale)}
        hint={
          locale === 'id'
            ? 'Menunjukkan air jatuh dari atap dan garis tetesnya di tanah, di luar kaki tiang.'
            : 'Shows water shedding off the roof, and the drip line on the ground clear of the post feet.'
        }
      />
    </RailSection>
  )
}

export function ViewSwitch({
  view,
  onChange,
  locale,
}: {
  view: ViewKey
  onChange: (v: ViewKey) => void
  locale: Locale
}) {
  const views: { key: ViewKey; label: string }[] = [
    { key: 'perspektif', label: pick(COPY.views.perspektif, locale) },
    { key: 'halaman', label: pick(COPY.views.halaman, locale) },
    { key: 'tampak', label: pick(COPY.views.tampak, locale) },
    { key: 'kolong', label: pick(COPY.views.kolong, locale) },
  ]
  return (
    <fieldset className="absolute right-3 top-3 z-10 flex gap-px rounded border border-hairline bg-film p-px">
      <legend className="sr-only">{pick(COPY.views.legend, locale)}</legend>
      {views.map((v) => (
        <Choice
          key={v.key}
          name="tampilan"
          value={v.key}
          checked={v.key === view}
          onSelect={() => onChange(v.key)}
          face={[
            'micro inline-flex min-h-control items-center rounded px-2 transition-colors duration-state',
            v.key === view ? 'bg-bolu text-kapur' : 'text-bolu hover:bg-wash',
          ].join(' ')}
        >
          {v.label}
        </Choice>
      ))}
    </fieldset>
  )
}

/**
 * Where and how high, in one sentence.
 *
 * The site is a parameter because the sun is computed rather than
 * art-directed: move the house and the numbers move with it. Rantepao and
 * Bukittinggi are three degrees and a time zone apart, and the whole reason
 * for a NOAA implementation is that the difference shows.
 */
function describeTransit(altitude: number, site: Site, locale: Locale): string {
  const lat = Math.abs(site.latitude).toFixed(2)
  const lon = Math.abs(site.longitude).toFixed(2)
  if (locale === 'id') {
    return `Tengah hari pada tanggal ini: ${altitude.toFixed(1)}° di atas ufuk. ${site.name} ${lat.replace('.', ',')}° ${site.latitude < 0 ? 'LS' : 'LU'}, ${lon.replace('.', ',')}° ${site.longitude < 0 ? 'BB' : 'BT'}.`
  }
  return `Transit on this date: ${altitude.toFixed(1)}° above the horizon. ${site.name} ${lat}° ${site.latitude < 0 ? 'S' : 'N'}, ${lon}° ${site.longitude < 0 ? 'W' : 'E'}.`
}

/** Fill {name} placeholders in a copy string. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)
}

/**
 * One option in a single-choice group.
 *
 * These were `<button aria-pressed>` — valid, but it made each option its own
 * tab stop and announced five unrelated toggles where the reader is choosing
 * one of a set. Fourteen tab stops to cross the rail. A radio group is one
 * stop, arrow keys inside it, and a screen reader says "3 of 4".
 *
 * The input is the control and the span is its face, so the styling is
 * unchanged from the buttons it replaces.
 */
export function Choice({
  name,
  value,
  checked,
  onSelect,
  face,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onSelect: () => void
  /** classes for the visible face, including its selected state */
  face: string
  children: React.ReactNode
}) {
  return (
    <label className="choice cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className={`choice-face ${face}`}>{children}</span>
    </label>
  )
}

/* ── Primitives ───────────────────────────────────────────────────────── */

/**
 * A labelled group of choices.
 *
 * The same look as `Field`, but a real fieldset and legend, because the label
 * of a radio group has to belong to the group rather than sit above it.
 */
export function Choices({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-5 last:mb-0">
      <legend className="micro mb-2">{legend}</legend>
      {children}
    </fieldset>
  )
}

/**
 * A labelled control.
 *
 * `group` makes it a fieldset whose legend is the label you can already see.
 * The alternative — a visible label beside the group and a hidden legend
 * inside it — says the same word twice to anyone listening, which is how a
 * group ends up worse off for having been made accessible.
 */
export function Field({
  label,
  value,
  hint,
  group = false,
  htmlFor,
  children,
}: {
  label: string
  value?: string
  hint?: string
  group?: boolean
  /** id of the single control this labels, when it labels one */
  htmlFor?: string
  children: React.ReactNode
}) {
  const head = (
    <>
      {htmlFor ? (
        <label className="micro" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="micro">{label}</span>
      )}
      {value ? <span className="num text-meta">{value}</span> : null}
    </>
  )
  const body = (
    <>
      {children}
      {hint ? <p className="mt-2 text-body text-muted">{hint}</p> : null}
    </>
  )

  if (group) {
    return (
      <fieldset className="mb-5 last:mb-0">
        <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
          {head}
        </legend>
        {body}
      </fieldset>
    )
  }
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">{head}</div>
      {body}
    </div>
  )
}

export function Stepper({
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  min: number
  max: number
  /**
   * How far apart the offered numbers are.
   *
   * One everywhere until a house counted households in pairs — a Karo hearth
   * is shared by two, so four, six and eight are the numbers that exist and
   * five is not a smaller version of six. The stepper offers what the rule
   * allows rather than every integer between its ends.
   */
  step?: number
  value: number
  onChange: (v: number) => void
}) {
  const options = Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, i) => min + i * step,
  )
  return (
    // No fieldset here: the Field around this one is the group, and its
    // visible label is the legend. A grid of equal columns rather than flex:
    // each option is a <label> around a radio, and `flex-1` on the face inside
    // it never reached the label, so the numbers packed into a 24px clump at
    // the left of the rail with their borders touching. Columns wrap rather
    // than narrow, so a long range — a census of households — takes a second
    // row instead of shrinking under the pointer-target floor.
    <div className="grid grid-cols-steps gap-1">
      {options.map((n) => (
        <Choice
          key={n}
          name="ruang"
          value={String(n)}
          checked={n === value}
          onSelect={() => onChange(n)}
          face={[
            'num flex min-h-control items-center justify-center rounded py-1.5 text-body transition-colors duration-state',
            n === value ? 'bg-bolu text-kapur' : 'border border-hairline hover:bg-wash',
          ].join(' ')}
        >
          {n}
        </Choice>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="mb-4 flex cursor-pointer items-start gap-2 last:mb-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-bolu"
      />
      <span>
        <span className="block text-body leading-tight">{label}</span>
        <span className="mt-1 block text-body text-muted">{hint}</span>
      </span>
    </label>
  )
}
