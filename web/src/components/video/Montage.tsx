import { useEffect, useMemo, useState } from 'react'
import type { DialogueLine, TaggedShot, TagKind } from '../../lib/api'
import { duration } from '../../lib/format'
import type { ShakeMarker, ZoomMarker } from '../../lib/settings'
import type { VideoDetail as Video } from '../../lib/types'

export interface Transition { type: string; duration: number }

export interface Shot {
  id: string
  start: number
  end: number
  include: boolean
  speed: number
  punch: boolean                 // one punch-in at the shot's start
  shake: boolean                 // one camera shake at the shot's start
  transition: Transition | null  // into the NEXT shot; null = the montage default
  label?: string
}

export interface Segment { start: number; end: number; speed: number; zoom_markers: ZoomMarker[]; shake_markers: ShakeMarker[]; transition: Transition | null }

export const TRANSITIONS: { value: string; label: string }[] = [
  { value: 'cut', label: 'Hard cut' }, { value: 'fade', label: 'Crossfade' }, { value: 'fadeblack', label: 'Dip to black' },
  { value: 'fadewhite', label: 'Flash white' }, { value: 'dissolve', label: 'Dissolve' }, { value: 'zoomin', label: 'Zoom through' },
  { value: 'slideleft', label: 'Slide left' }, { value: 'slideright', label: 'Slide right' }, { value: 'slideup', label: 'Slide up' },
  { value: 'slidedown', label: 'Slide down' }, { value: 'wipeleft', label: 'Wipe left' }, { value: 'wiperight', label: 'Wipe right' },
  { value: 'smoothleft', label: 'Smooth left' }, { value: 'circleopen', label: 'Circle open' }, { value: 'circleclose', label: 'Circle close' },
  { value: 'radial', label: 'Radial' }, { value: 'pixelize', label: 'Pixelize' }, { value: 'hblur', label: 'Blur' },
  { value: 'squeezeh', label: 'Squeeze' },
]
export const transitionLabel = (type: string) => TRANSITIONS.find((t) => t.value === type)?.label ?? type
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const MIN_SHOT = 0.3
const SHAKE: ShakeMarker = { at: 0, duration: 0.4, intensity: 60 }

export interface Plan {
  title?: string; hook?: string; summary?: string; out_length?: number; model?: string
  shots: { start: number; end: number; speed: number; punch: boolean; shake?: boolean; transition?: Transition | null; why: string }[]
  transition: { type: string; duration: number }
  captions: boolean; caption_style: string; caption_pos: string; grade: string; vivid: number
  music_vibe?: string; sfx_ideas?: string[]; resolve_notes?: string[]
}

type TagFilter = 'closeup' | 'dialogue' | 'gameplay' | 'cutscene' | 'wide' | 'menu'
const TAG_FILTERS: { value: TagFilter; label: string; test: (s: TaggedShot) => boolean }[] = [
  { value: 'closeup', label: 'Closeups', test: (s) => s.closeup },
  { value: 'dialogue', label: 'With dialogue', test: (s) => s.dialogue },
  { value: 'gameplay', label: 'Gameplay', test: (s) => s.kind === 'gameplay' },
  { value: 'cutscene', label: 'Cutscenes', test: (s) => s.kind === 'cutscene' },
  { value: 'wide', label: 'Wide shots', test: (s) => s.kind === 'wide' },
  { value: 'menu', label: 'Menus', test: (s) => s.kind === 'menu' },
]
const KIND_LABEL: Record<TagKind, string> = { closeup: 'closeup', medium: 'medium', wide: 'wide', gameplay: 'gameplay', cutscene: 'cutscene', menu: 'menu', other: '' }

interface Props {
  video: Video
  plan: Plan | null
  onApplyPlanLook: (plan: Plan) => void
  scenes: number[] | null
  dialogue: DialogueLine[] | null
  tags: TaggedShot[] | null
  clipPack: { file: string; start: number; end: number }[] | null
  rangeStart: number | null
  rangeEnd: number | null
  seek: (t: number) => void
  onRender: (segments: Segment[], transition: Transition) => void
  onShotsChange?: (shots: { start: number; end: number; active?: boolean }[] | null) => void
  disabled: boolean
}

const key = (id: string) => `ytstudio.montage.${id}`
let counter = 0
const mk = (start: number, end: number, label?: string): Shot =>
  ({ id: `${Date.now().toString(36)}-${counter++}`, start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100,
     include: true, speed: 1, punch: false, shake: false, transition: null, label })
/** Saved shots from before shake / per-shot transitions existed get the defaults. */
const normalise = (s: Partial<Shot>): Shot => ({ ...mk(s.start ?? 0, s.end ?? 0, s.label), ...s, shake: s.shake ?? false, transition: s.transition ?? null, id: s.id ?? mk(0, 0).id })

/** Output length: each shot's retimed length minus each boundary's overlap
 *  (the shot's own transition or the default, clamped to half the shorter neighbour). */
export function montageLength(shots: Shot[], fallback: Transition): number {
  const lens = shots.map((s) => (s.end - s.start) / s.speed)
  if (!lens.length) return 0
  let total = lens.reduce((a, b) => a + b, 0)
  for (let k = 1; k < lens.length; k++) {
    const t = shots[k - 1].transition ?? fallback
    if (t.type === 'cut') continue
    total -= Math.min(t.duration, lens[k - 1] / 2, lens[k] / 2)
  }
  return total
}

export default function Montage({ video, plan, onApplyPlanLook, scenes, dialogue, tags, clipPack, rangeStart, rangeEnd, seek, onRender, onShotsChange, disabled }: Props) {
  const [shots, setShots] = useState<Shot[]>([])
  const [transition, setTransition] = useState<Transition>({ type: 'fade', duration: 0.35 })
  const [msg, setMsg] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)

  // Keep the builder across navigation (phone tabs) — per video, in this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(video.id))
      if (raw) {
        const saved = JSON.parse(raw) as { shots: Partial<Shot>[]; transition: Transition }
        setShots((saved.shots ?? []).map(normalise)); setTransition(saved.transition ?? { type: 'fade', duration: 0.35 })
      }
    } catch { /* ignore */ }
  }, [video.id])
  useEffect(() => {
    try { localStorage.setItem(key(video.id), JSON.stringify({ shots, transition })) } catch { /* ignore */ }
    onShotsChange?.(shots.length ? shots.filter((x) => x.include).map((x) => ({ start: x.start, end: x.end })) : null)
  }, [shots, transition, video.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const replace = (next: Shot[], what: string) => {
    if (!next.length) return setMsg(`Nothing matched ${what}.`)
    if (shots.length && !window.confirm(`Replace the current ${shots.length} shots with ${what}?`)) return
    setShots(next)
    setMsg(`${next.length} shots from ${what}.`)
  }
  const fromScenes = () => {
    if (!scenes || !video.duration) return
    const bounds = [0, ...scenes.filter((t) => t > 0 && t < video.duration!), video.duration]
    const next = bounds.slice(1).map((b, i) => mk(bounds[i], b)).filter((s) => s.end - s.start >= MIN_SHOT)
    replace(next, 'scene cuts')
  }
  const fromDialogue = () => {
    if (!dialogue) return
    const pad = 0.15
    const next = dialogue.map((l) => mk(Math.max(0, l.start - pad), Math.min(video.duration ?? l.end + pad, l.end + pad), l.text ? `“${l.text.slice(0, 60)}${l.text.length > 60 ? '…' : ''}”` : 'sound'))
      .filter((s) => s.end - s.start >= MIN_SHOT)
    replace(next, 'dialogue lines')
  }
  const fromTagged = (f: TagFilter) => {
    if (!tags) return
    const rule = TAG_FILTERS.find((x) => x.value === f)!
    const next = tags.filter(rule.test).map((s) => mk(s.start, s.end, [KIND_LABEL[s.kind], s.subject].filter(Boolean).join(' · ')))
      .filter((s) => s.end - s.start >= MIN_SHOT)
    replace(next, rule.label.toLowerCase())
  }
  const fromClipPack = () => clipPack && replace(clipPack.map((c) => mk(c.start, c.end, c.file)), 'the clip pack')
  const fromSuggested = () => replace(video.clips.filter((c) => c.status !== 'rejected').map((c) => mk(c.start_s, c.end_s, c.title ?? undefined)), 'suggested clips')
  const fromPlan = () => {
    if (!plan) return
    const next = plan.shots.map((sh) => ({ ...mk(sh.start, sh.end, sh.why), speed: sh.speed, punch: sh.punch, shake: Boolean(sh.shake), transition: sh.transition ?? null }))
    if (shots.length && !window.confirm(`Replace the current ${shots.length} shots with the AI plan?`)) return
    setShots(next)
    setTransition({ type: plan.transition.type, duration: plan.transition.duration })
    onApplyPlanLook(plan)
    const own = next.filter((s) => s.transition).length
    setMsg(`AI plan loaded: ${next.length} shots, ~${Math.round(plan.out_length ?? 0)}s${own ? `, ${own} with their own transition` : ''}. Captions, grade and transition set to match.`)
  }
  const addRange = () => {
    if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) return setMsg('Set a valid start/end in Export first.')
    setShots((s) => [...s, mk(rangeStart, rangeEnd)])
  }

  const patch = (id: string, p: Partial<Shot>) => setShots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const move = (i: number, dir: -1 | 1) => setShots((s) => {
    const j = i + dir
    if (j < 0 || j >= s.length) return s
    const next = [...s]; [next[i], next[j]] = [next[j], next[i]]; return next
  })
  const remove = (id: string) => setShots((s) => s.filter((x) => x.id !== id))
  const clearOwn = () => setShots((s) => s.map((x) => ({ ...x, transition: null })))

  const included = shots.filter((s) => s.include && s.end > s.start)
  const total = useMemo(() => montageLength(included, transition), [included, transition])
  const ownCount = included.filter((s) => s.transition).length
  const tagCounts = useMemo(() => tags ? Object.fromEntries(TAG_FILTERS.map((f) => [f.value, tags.filter(f.test).length])) as Record<TagFilter, number> : null, [tags])

  const render = () => {
    if (included.length < 1) return setMsg('Include at least one shot.')
    onRender(
      included.map((s, i) => ({
        start: s.start, end: s.end, speed: s.speed,
        zoom_markers: s.punch ? [{ at: 0, duration: Math.min(0.5, (s.end - s.start) / s.speed / 2), zoom: 1.15 }] : [],
        shake_markers: s.shake ? [{ ...SHAKE, duration: Math.min(SHAKE.duration, (s.end - s.start) / s.speed / 2) }] : [],
        transition: i < included.length - 1 ? s.transition : null,
      })),
      transition,
    )
    setMsg('Montage render queued — it lands in Clips and Review.')
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        <span className="muted small">Shots from</span>
        <button className="btn small" onClick={fromScenes} disabled={!scenes?.length} title={scenes ? 'One shot per scene cut' : 'Run Detect scenes first'}>Scene cuts{scenes ? ` (${scenes.length + 1})` : ''}</button>
        <button className="btn small" onClick={fromDialogue} disabled={!dialogue?.length} title={dialogue ? 'One shot per spoken line' : 'Run Prepare → Dialogue first'}>Dialogue lines{dialogue ? ` (${dialogue.length})` : ''}</button>
        <button className="btn small" onClick={fromClipPack} disabled={!clipPack?.length} title={clipPack ? 'The shredded clips' : 'Run Shred to clips first'}>Clip pack{clipPack ? ` (${clipPack.length})` : ''}</button>
        <button className="btn small accent" onClick={fromPlan} disabled={!plan} title={plan ? plan.summary : 'Run "Plan an edit" first'}>AI plan{plan ? ` (${plan.shots.length})` : ''}</button>
        <button className="btn small" onClick={fromSuggested} disabled={!video.clips.length}>Suggested clips{video.clips.length ? ` (${video.clips.length})` : ''}</button>
        <button className="btn small" onClick={addRange}>Add current range</button>
        {shots.length > 0 && <button className="btn small" onClick={() => window.confirm('Clear the montage?') && setShots([])}>Clear</button>}
      </div>
      <div className="row wrap">
        <span className="muted small">Tagged shots</span>
        {tagCounts ? TAG_FILTERS.map((f) => (
          <button key={f.value} className="btn small" onClick={() => fromTagged(f.value)} disabled={!tagCounts[f.value]} title={`Only the scenes tagged ${f.label.toLowerCase()}`}>
            {f.label} ({tagCounts[f.value]})
          </button>
        )) : <span className="muted small">run Prepare → Shot tags to filter by closeups, dialogue, gameplay or cutscenes</span>}
      </div>

      {plan && (
        <div className="stack" style={{ gap: 4 }}>
          <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowPlan(!showPlan)}>
            {showPlan ? 'Hide plan notes' : `Plan: ${plan.title ?? 'untitled'}`}
          </button>
          {showPlan && (
            <div className="stack small" style={{ gap: 4 }}>
              {plan.hook && <p><strong>Hook.</strong> {plan.hook}</p>}
              {plan.summary && <p>{plan.summary}</p>}
              {plan.music_vibe && <p><strong>Music.</strong> {plan.music_vibe}</p>}
              {plan.sfx_ideas && plan.sfx_ideas.length > 0 && <p><strong>SFX.</strong> {plan.sfx_ideas.join(' · ')}</p>}
              {plan.resolve_notes && plan.resolve_notes.length > 0 && <p><strong>In Resolve.</strong> {plan.resolve_notes.join(' · ')}</p>}
              {plan.model && <p className="muted">by {plan.model}</p>}
            </div>
          )}
        </div>
      )}

      {shots.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          {shots.map((s, i) => {
            const last = i === shots.length - 1
            const own = s.transition
            return (
              <div key={s.id} className={`shot-row ${s.include ? '' : 'off'}`}>
                <input type="checkbox" checked={s.include} onChange={(e) => patch(s.id, { include: e.target.checked })} aria-label="Include shot" />
                <button className="shot-time mono" onClick={() => seek(s.start)} title="Preview from here">
                  {i + 1}. {duration(s.start)}–{duration(s.end)}
                </button>
                <span className="muted small grow">{s.label ?? ''}{s.speed !== 1 ? ` · ${(s.end - s.start) / s.speed < 1 ? ((s.end - s.start) / s.speed).toFixed(1) : Math.round((s.end - s.start) / s.speed)}s out` : ''}</span>
                <select value={s.speed} onChange={(e) => patch(s.id, { speed: Number(e.target.value) })} aria-label="Speed">
                  {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
                </select>
                <label className="check small" title="Punch-in zoom at the start of this shot"><input type="checkbox" checked={s.punch} onChange={(e) => patch(s.id, { punch: e.target.checked })} /> punch</label>
                <label className="check small" title="Camera shake at the start of this shot"><input type="checkbox" checked={s.shake} onChange={(e) => patch(s.id, { shake: e.target.checked })} /> shake</label>
                <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="btn small" onClick={() => move(i, 1)} disabled={last} aria-label="Move down">↓</button>
                <button className="btn small" onClick={() => remove(s.id)} aria-label="Remove shot">✕</button>
                {!last && (
                  <div className="shot-next">
                    <span className="muted small">→ next</span>
                    <select value={own ? own.type : ''} aria-label="Transition into the next shot"
                            onChange={(e) => patch(s.id, { transition: e.target.value ? { type: e.target.value, duration: own?.duration ?? transition.duration } : null })}>
                      <option value="">Default ({transitionLabel(transition.type)})</option>
                      {TRANSITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {own && own.type !== 'cut' && (
                      <label className="slider"><span className="muted small">length</span>
                        <input type="range" min={10} max={150} step={5} value={Math.round(own.duration * 100)} onChange={(e) => patch(s.id, { transition: { ...own, duration: Number(e.target.value) / 100 } })} />
                        <span className="mono small">{own.duration.toFixed(2)}s</span></label>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="row wrap">
        <span className="muted small">Default transition</span>
        <select value={transition.type} onChange={(e) => setTransition({ ...transition, type: e.target.value })} aria-label="Transition">
          {TRANSITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {transition.type !== 'cut' && (
          <label className="slider"><span className="muted small">length</span>
            <input type="range" min={10} max={150} step={5} value={Math.round(transition.duration * 100)} onChange={(e) => setTransition({ ...transition, duration: Number(e.target.value) / 100 })} />
            <span className="mono small">{transition.duration.toFixed(2)}s</span></label>
        )}
        {ownCount > 0 && <button className="btn small" onClick={clearOwn} title="Every shot uses the default transition again">Reset {ownCount} own</button>}
        <span className="mono muted small">{included.length} shots · {duration(total)} out</span>
        <button className="btn accent" onClick={render} disabled={disabled || !included.length}>Render montage</button>
      </div>
      <p className="muted small">Each shot's "→ next" picks the transition into the following shot and its length; "Default" uses the montage transition. Format, Look, Captions, Sound and Brand below apply to the whole montage. Tap a shot's time to preview it.</p>
      {msg && <p className="muted small">{msg}</p>}
    </div>
  )
}
