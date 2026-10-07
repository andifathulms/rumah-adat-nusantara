'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Viewport, usePrefersReducedMotion } from './viewport/Viewport'
import type { ViewKey } from './viewport/scene'
import {
  OrientationNote,
  fill,
  PlaceNote,
  SceneToggles,
  SunControls,
  ViewSwitch,
} from './Controls'
import { RuleControlsFor } from './rules'
import { ProvenanceStrip } from './Provenance'
import dynamic from 'next/dynamic'

/*
 * Both exist for one house and return null for the rest, but their imports —
 * the worked derivation and the whole orthographic drawing layer — shipped
 * with every house's route. Dynamic keeps them server-rendered where they
 * render at all, and out of the thirty-four bundles where they never do.
 */
const Derivation = dynamic(() => import('./Derivation').then((m) => m.Derivation), {
  ssr: true,
})
const DrawingExport = dynamic(
  () => import('./DrawingExport').then((m) => m.DrawingExport),
  { ssr: true },
)
import { RailSection } from './Sheet'
import { COPY, pick } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { Built, Tradition, TraditionKey } from '@/lib/tradition/registry'
import { flag, readChoice, readFlag, readInt, unless } from '@/lib/reader'
import { useReaderState } from './useReaderState'
import { useTradition } from './useTradition'
import { ModelLoading } from './ModelLoading'
import type { ModelIntro } from './ModelLoading'
import { datePresets, presetInstant } from '@/lib/solar/presets'
import type { DatePreset } from '@/lib/solar/presets'
import { solarPosition } from '@/lib/solar/position'

/**
 * The vantage this route offers, and how it is written down.
 *
 * Mid-morning by default: raking enough to read the form, and a short drag of
 * the time control to noon shows the shadow all but disappear.
 */
const VIEWS: readonly ViewKey[] = ['perspektif', 'halaman', 'tampak', 'kolong']

const BANGUN_DEFAULTS = {
  view: 'perspektif' as ViewKey,
  // On by default: it is the scale bar.
  figure: true,
  // On by default too: the ground is where half of these houses' rules point.
  site: true,
  rain: false,
  marking: false,
  presetKey: 'kulminasi' as DatePreset['key'],
  minutes: 9 * 60,
}

type BangunVantage = typeof BANGUN_DEFAULTS

function decodeBangun(p: ReadonlyMap<string, string>): BangunVantage {
  return {
    view: readChoice(p.get('tampilan'), VIEWS, BANGUN_DEFAULTS.view),
    figure: readFlag(p.get('sosok'), BANGUN_DEFAULTS.figure),
    site: readFlag(p.get('tapak'), BANGUN_DEFAULTS.site),
    rain: readFlag(p.get('hujan'), BANGUN_DEFAULTS.rain),
    marking: readFlag(p.get('tanda'), BANGUN_DEFAULTS.marking),
    presetKey: readChoice(
      p.get('tanggal'),
      ['ekuinoks', 'solstis-juni', 'kulminasi'] as const,
      BANGUN_DEFAULTS.presetKey,
    ),
    minutes: readInt(p.get('waktu'), 0, 1439, BANGUN_DEFAULTS.minutes),
  }
}

function encodeBangun(v: BangunVantage): readonly (readonly [string, string | null])[] {
  const d = BANGUN_DEFAULTS
  return [
    ['tampilan', unless(v.view, d.view, String)],
    ['tanggal', unless(v.presetKey, d.presetKey, String)],
    ['waktu', unless(v.minutes, d.minutes, String)],
    ['sosok', unless(v.figure, d.figure, flag)],
    ['tapak', unless(v.site, d.site, flag)],
    ['hujan', unless(v.rain, d.rain, flag)],
    ['tanda', unless(v.marking, d.marking, flag)],
  ]
}

/**
 * The generator.
 *
 * Change a socially meaningful number and the house rebuilds in place. That
 * is the thesis of the whole project, so it is the landing route and it is
 * the only screen where all of a house's rules are on the page at once.
 *
 * Which house is a path segment, and everything below it comes from the
 * registry entry that segment names. Nothing in this file knows what a rank
 * or a laras is: the rules live in the query string, the controls that edit
 * them belong to the tradition, and what arrives back is a built house.
 */
/**
 * The route's shell: load this one house's facade, and until it arrives
 * show the intro the server rendered — whose house, its caution, and its
 * elevation. The intro is also the page's static HTML, so a reader without
 * JavaScript gets the words and the drawing rather than an empty sheet.
 */
export function BangunClient({
  locale,
  tradisi,
  intro,
}: {
  locale: Locale
  tradisi: TraditionKey
  intro: ModelIntro
}) {
  const t = useTradition(tradisi)
  if (!t) return <ModelLoading locale={locale} intro={intro} />
  return <BangunInner locale={locale} t={t} />
}

function BangunInner({ locale, t }: { locale: Locale; t: Tradition }) {
  const [query, setQuery, addressReady] = useRuleAddress(t.defaultQuery)
  /*
    Everything the reader is doing, in the fragment: which way the camera
    points, what time it is, what is switched on. None of it is a fact about
    the building — the building is the query string — but all of it survives a
    refresh and travels in a link, which is what it means to be able to show
    someone what you were looking at.
  */
  const [vantage, setVantage] = useReaderState(BANGUN_DEFAULTS, decodeBangun, encodeBangun)
  const { view, figure, rain, site, marking, presetKey } = vantage
  const minutes = vantage.minutes

  const presets = useMemo(() => datePresets(t.site), [t])
  const built: Built = useMemo(() => t.build(query), [t, query])
  const rebuild = useRebuildTransition(built.query, usePrefersReducedMotion(), addressReady)

  /*
   * The address, put right on arrival. The query string is a citation and a
   * citation must mean what it says: an address that arrived with rules
   * missing used to keep its truncated form in the bar while the page showed
   * the completed house — two descriptions, one of them silently wrong. Now
   * the bar is completed to the canonical query once, and the filling-in is
   * said in the rail rather than absorbed. The note retires the moment the
   * reader changes a rule, because from then on the address is theirs.
   */
  const [filledIn, setFilledIn] = useState(false)
  const normalised = useRef(false)
  useEffect(() => {
    if (!addressReady || normalised.current) return
    normalised.current = true
    const raw = window.location.search.replace(/^\?/, '')
    if (raw !== '' && raw !== built.query) setFilledIn(true)
    if (built.query !== query) setQuery(built.query)
  }, [addressReady, built.query, query, setQuery])
  const changeRules = (next: string) => {
    setFilledIn(false)
    setQuery(next)
  }

  const sun = useMemo(() => {
    const preset = presets.find((p) => p.key === presetKey) ?? presets[0]
    if (!preset) throw new Error('no date presets')
    return solarPosition(presetInstant(preset, minutes, t.site), t.site)
  }, [presets, presetKey, minutes, t])

  return (
    <Sheet
      locale={locale}
      route="bangun"
      tradition={t}
      rail={
        <>
          {/*
            Order is hierarchy in a rail that scrolls. The rules come first
            because they are what the reader changes, and provenance comes
            second because it is what the house they just changed is worth.
            Everything below is a control or a note, and the export is last
            because taking the drawing away is the last thing anyone does.
          */}
          <RuleControlsFor
            tradition={t.key}
            query={built.query}
            onChange={changeRules}
            locale={locale}
          />
          {/*
            The way back to the described house, and the admission when an
            arriving address had to be completed. The reset appears only once
            there is somewhere to come back from: an always-on reset would
            imply the default is the correct house and the reader's is a
            deviation, which is the opposite of what the controls argue.
          */}
          {filledIn || built.query !== t.defaultQuery ? (
            <RailSection>
              {filledIn ? (
                <p className="mb-3 text-body text-muted">
                  {pick(COPY.address.filled, locale)}
                </p>
              ) : null}
              {built.query !== t.defaultQuery ? (
                <button
                  type="button"
                  onClick={() => changeRules(t.defaultQuery)}
                  className="press w-full rounded border border-hairline bg-sheet px-2 py-2 text-body text-bolu transition-colors duration-state hover:bg-wash"
                >
                  {pick(COPY.controls.reset, locale)}
                </button>
              ) : null}
            </RailSection>
          ) : null}
          {/*
            Directly under the rules, because it explains the rules. Only one
            house has one written: see the note on `Derivation`.
          */}
          <Derivation tradition={t.key} query={built.query} locale={locale} />
          <PlaceNote locale={locale} tradition={t} />
          <RailSection title={pick(COPY.provenance.heading, locale)}>
            <ProvenanceStrip
              split={built.split}
              locale={locale}
              marking={marking}
              onMarking={(v) => setVantage({ marking: v })}
              parts={marking ? built.parts : undefined}
            />
          </RailSection>
          <SunControls
            presets={presets}
            presetKey={presetKey}
            minutes={minutes}
            onPreset={(v) => setVantage({ presetKey: v })}
            onMinutes={(v) => setVantage({ minutes: v })}
            altitude={sun.altitude}
            site={t.site}
            locale={locale}
          />
          <SceneToggles
            figure={figure}
            rain={rain}
            site={site}
            onFigure={(v) => setVantage({ figure: v })}
            onRain={(v) => setVantage({ rain: v })}
            onSite={(v) => setVantage({ site: v })}
            locale={locale}
          />
          <OrientationNote locale={locale} tradition={t} />
          <DrawingExport tradition={t.key} query={built.query} locale={locale} />
        </>
      }
    >
      <Viewport
        locale={locale}
        built={built}
        label={fill(pick(COPY.modelLabel, locale), { house: t.house[locale] })}
        sun={sun}
        view={view}
        figure={figure}
        rain={rain}
        site={site}
        provenance={marking}
        reveal={rebuild < 1 ? { timeline: built.timeline, t: rebuild } : null}
      >
        <ViewSwitch view={view} onChange={(v) => setVantage({ view: v })} locale={locale} />
        <Readout locale={locale} built={built} />
      </Viewport>
    </Sheet>
  )
}

/**
 * The house rebuilding in place when a rule changes.
 *
 * Short — a fifth of the frame-raising — because it is punctuation on the
 * reader's own action, not the orchestrated moment. It exists so that
 * changing a socially meaningful number reads as the building answering,
 * rather than as one picture being swapped for another.
 *
 * It runs the same build-order timeline the assembly sequence uses, so the
 * house always reassembles in the order it would actually be built.
 */
const REBUILD_MS = 850

/**
 * @param settled false while the rules are still being read off the address.
 *   Whatever the address turns out to say is this reader's starting house,
 *   not a change they made, so it arrives built rather than being raised in
 *   front of them.
 */
function useRebuildTransition(signature: string, reducedMotion: boolean, settled: boolean): number {
  const [t, setT] = useState(1)
  const shown = useRef<string | null>(null)

  useEffect(() => {
    if (!settled) return
    if (shown.current === signature) return
    const isFirst = shown.current === null
    shown.current = signature
    if (isFirst || reducedMotion) {
      // The alternative is the finished house, immediately. Nothing is lost:
      // the house is the content, and the drop was only ever punctuation.
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / REBUILD_MS)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    setT(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [signature, reducedMotion, settled])

  return t
}

/**
 * Rules held in the address bar, as the query string itself.
 *
 * The query string is already the canonical description of a house, so it is
 * the state rather than a serialisation of the state — which means this hook
 * does not need to know what a rank or a laras is, and there is one
 * representation instead of two that can disagree.
 *
 * The page is prerendered with the defaults, so the address is read after
 * mount rather than during render — a client that read it during render would
 * disagree with the HTML it is hydrating. `settled` is how the rest of the
 * screen knows the difference between the house the address asked for and a
 * house the reader has since built.
 *
 * Changes replace the entry rather than pushing one. A rule is a description
 * being edited, not a place being visited, and thirty pushes would make Back
 * useless for leaving the page.
 */
function useRuleAddress(fallback: string): [string, (next: string) => void, boolean] {
  const [query, setQuery] = useState(fallback)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    setQuery(window.location.search.replace(/^\?/, '') || fallback)
    setSettled(true)
  }, [fallback])

  useEffect(() => {
    if (!settled) return
    if (query === window.location.search.replace(/^\?/, '')) return
    // Preserves the fragment: the two halves of the address are owned by
    // different hooks and neither may clobber the other.
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}${window.location.hash}`,
    )
  }, [query, settled])

  return [query, setQuery, settled]
}

/**
 * The computed dimensions, over the viewport.
 *
 * Numbers are mono, right-aligned, and carry their unit. These are outputs of
 * the rule pack, not inputs: there is nothing here to drag. Which figures are
 * worth showing is the tradition's own answer — a rumah gadang has no prow
 * and a tongkonan has no anjuang — so the rows arrive already chosen.
 */
function Readout({ locale, built }: { locale: Locale; built: Built }) {
  /*
   * Folded on a phone, open beside a rail. On a 390px screen the panel
   * covered half the house it was describing; the figures are one tap away
   * and the headline — which house these rules made — stays in view either
   * way. Decided after mount, so the exported HTML is the open panel and
   * nothing hydrates differently from what was sent.
   */
  const [open, setOpen] = useState(true)
  useEffect(() => {
    if (window.matchMedia('(max-width: 859px)').matches) setOpen(false)
  }, [])
  const id = useId()
  return (
    <div className="absolute left-3 top-14 z-10 max-w-readout rounded border border-hairline bg-veil px-3 py-2.5 backdrop-blur-veil sheet:top-3">
      {/*
        Without this line the figures read as the specifications of a real
        building. They are outputs of the rules in the rail, and saying so is
        what connects the controls to the model.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="micro">{pick(COPY.computed, locale)}</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={pick(open ? COPY.readoutHide : COPY.readoutShow, locale)}
          onClick={() => setOpen((o) => !o)}
          className="press -my-1 -mr-1 inline-flex min-h-control min-w-control items-center justify-center rounded font-mono text-meta text-bolu hover:bg-wash"
        >
          <span aria-hidden>{open ? '−' : '+'}</span>
        </button>
      </div>
      <p className="mt-1 font-display text-lead leading-tight">{built.headline[locale]}</p>
      {/*
        Announced when it changes, because it is the answer to every rule the
        reader sets. A sighted reader watches the house rebuild and the figures
        follow; without this a screen reader user presses a control and is told
        nothing at all. polite and not atomic on purpose: only the figures that
        moved are read, rather than every row each time a slider steps. Folded
        is sr-only rather than hidden, so folding the panel on a phone never
        silences it.
      */}
      <div id={id} aria-live="polite" className={open ? undefined : 'sr-only'}>
        <p className="mt-0.5 text-meta text-muted">{built.subhead[locale]}</p>
        <hr className="rule my-2" />
        <dl className="flex flex-col gap-0.5">
          {built.readout.map((row) => (
            <div key={row.label.en} className="flex items-baseline justify-between gap-3">
              <dt className="text-meta text-muted">{row.label[locale]}</dt>
              <dd className="num text-meta">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
