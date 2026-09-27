import { useEffect, useMemo, useState } from 'react'
import type { VideoDetailSubscription } from '../../gql/generated'
import { duration } from '../../lib/format'
import type { ZoomMarker } from '../../lib/settings'

type Video = NonNullable<VideoDetailSubscription['videos_by_pk']>

export interface Shot {
  id: string
  start: number
  end: number
  include: boolean
  speed: number
  punch: boolean          // one punch-in at the shot's start
  label?: string
}

export interface Transition { type: string; duration: number }

export const TRANSITIONS: { value: string; label: string }[] = [
  { value: 'cut', label: 'Hard cut' }, { value: 'fade', label: 'Crossfade' }, { value: 'fadeblack', label: 'Dip to black' },
  { value: 'fadewhite', label: 'Flash white' }, { value: 'dissolve', label: 'Dissolve' }, { value: 'zoomin', label: 'Zoom through' },
  { value: 'slideleft', label: 'Slide left' }, { value: 'slideright', label: 'Slide right' }, { value: 'slideup', label: 'Slide up' },
  { value: 'slidedown', label: 'Slide down' }, { value: 'wipeleft', label: 'Wipe left' }, { value: 'wiperight', label: 'Wipe right' },
  { value: 'smoothleft', label: 'Smooth left' }, { value: 'circleopen', label: 'Circle open' }, { value: 'circleclose', label: 'Circle close' },
  { value: 'radial', label: 'Radial' }, { value: 'pixelize', label: 'Pixelize' }, { value: 'hblur', label: 'Blur' },
  { value: 'squeezeh', label: 'Squeeze' },
]
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const MIN_SHOT = 0.3

export interface Plan {
  title?: string; hook?: string; summary?: string; out_length?: number; model?: string
  shots: { start: number; end: number; speed: number; punch: boolean; why: string }[]
  transition: { type: string; duration: number }
  captions: boolean; caption_style: string; caption_pos: string; grade: string; vivid: number
  music_vibe?: string; sfx_ideas?: string[]; resolve_notes?: string[]
}

interface Props {
  video: Video
  plan: Plan | null
  onApplyPlanLook: (plan: Plan) => void
  scenes: number[] | null
  clipPack: { file: string; start: number; end: number }[] | null
  rangeStart: number | null
  rangeEnd: number | null
  seek: (t: number) => void
  onRender: (segments: { start: number; end: number; speed: number; zoom_markers: ZoomMarker[] }[], transition: Transition) => void
  disabled: boolean
}

const key = (id: string) => `ytstudio.montage.${id}`
let counter = 0
const mk = (start: number, end: number, label?: string): Shot =>
  ({ id: `${Date.now().toString(36)}-${counter++}`, start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, include: true, speed: 1, punch: false, label })

export default function Montage({ video, plan, onApplyPlanLook, scenes, clipPack, rangeStart, rangeEnd, seek, onRender, disabled }: Props) {
  const [shots, setShots] = useState<Shot[]>([])
  const [transition, setTransition] = useState<Transition>({ type: 'fade', duration: 0.35 })
  const [msg, setMsg] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)

  // Keep the builder across navigation (phone tabs) — per video, in this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(video.id))
      if (raw) {
        const saved = JSON.parse(raw) as { shots: Shot[]; transition: Transition }
        setShots(saved.shots ?? []); setTransition(saved.transition ?? { type: 'fade', duration: 0.35 })
      }
    } catch { /* ignore */ }
  }, [video.id])
  useEffect(() => {
    try { localStorage.setItem(key(video.id), JSON.stringify({ shots, transition })) } catch { /* ignore */ }
  }, [shots, transition, video.id])

  const replace = (next: Shot[], what: string) => {
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
  const fromClipPack = () => clipPack && replace(clipPack.map((c) => mk(c.start, c.end, c.file)), 'the clip pack')
  const fromSuggested = () => replace(video.clips.filter((c) => c.status !== 'rejected').map((c) => mk(c.start_s, c.end_s, c.title ?? undefined)), 'suggested clips')
  const fromPlan = () => {
    if (!plan) return
    const next = plan.shots.map((sh) => ({ ...mk(sh.start, sh.end, sh.why), speed: sh.speed, punch: sh.punch }))
    if (shots.length && !window.confirm(`Replace the current ${shots.length} shots with the AI plan?`)) return
    setShots(next)
    setTransition({ type: plan.transition.type, duration: plan.transition.duration })
    onApplyPlanLook(plan)
    setMsg(`AI plan loaded: ${next.length} shots, ~${Math.round(plan.out_length ?? 0)}s. Captions, grade and transition set to match.`)
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

  const included = shots.filter((s) => s.include && s.end > s.start)
  const total = useMemo(() => {
    const lens = included.map((s) => (s.end - s.start) / s.speed)
    if (!lens.length) return 0
    const d = transition.type === 'cut' ? 0 : Math.min(transition.duration, Math.min(...lens) / 2)
    return lens.reduce((a, b) => a + b, 0) - d * (lens.length - 1)
  }, [included, transition])

  const render = () => {
    if (included.length < 1) return setMsg('Include at least one shot.')
    onRender(
      included.map((s) => ({ start: s.start, end: s.end, speed: s.speed,
                             zoom_markers: s.punch ? [{ at: 0, duration: Math.min(0.5, (s.end - s.start) / s.speed / 2), zoom: 1.15 }] : [] })),
      transition,
    )
    setMsg('Montage render queued — it lands in Clips and Review.')
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        <span className="muted small">Shots from</span>
        <button className="btn small" onClick={fromScenes} disabled={!scenes?.length} title={scenes ? 'One shot per scene cut' : 'Run Detect scenes first'}>Scene cuts{scenes ? ` (${scenes.length + 1})` : ''}</button>
        <button className="btn small" onClick={fromClipPack} disabled={!clipPack?.length} title={clipPack ? 'The shredded clips' : 'Run Shred to clips first'}>Clip pack{clipPack ? ` (${clipPack.length})` : ''}</button>
        <button className="btn small accent" onClick={fromPlan} disabled={!plan} title={plan ? plan.summary : 'Run "Plan an edit" first'}>AI plan{plan ? ` (${plan.shots.length})` : ''}</button>
        <button className="btn small" onClick={fromSuggested} disabled={!video.clips.length}>Suggested clips{video.clips.length ? ` (${video.clips.length})` : ''}</button>
        <button className="btn small" onClick={addRange}>Add current range</button>
        {shots.length > 0 && <button className="btn small" onClick={() => window.confirm('Clear the montage?') && setShots([])}>Clear</button>}
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
          {shots.map((s, i) => (
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
              <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="btn small" onClick={() => move(i, 1)} disabled={i === shots.length - 1} aria-label="Move down">↓</button>
              <button className="btn small" onClick={() => remove(s.id)} aria-label="Remove shot">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="row wrap">
        <span className="muted small">Transition</span>
        <select value={transition.type} onChange={(e) => setTransition({ ...transition, type: e.target.value })} aria-label="Transition">
          {TRANSITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {transition.type !== 'cut' && (
          <label className="slider"><span className="muted small">length</span>
            <input type="range" min={10} max={150} step={5} value={Math.round(transition.duration * 100)} onChange={(e) => setTransition({ ...transition, duration: Number(e.target.value) / 100 })} />
            <span className="mono small">{transition.duration.toFixed(2)}s</span></label>
        )}
        <span className="mono muted small">{included.length} shots · {duration(total)} out</span>
        <button className="btn accent" onClick={render} disabled={disabled || !included.length}>Render montage</button>
      </div>
      <p className="muted small">Uses the Export settings above (style, captions, grade, music, watermark). Tap a shot's time to preview it in the player.</p>
      {msg && <p className="muted small">{msg}</p>}
    </div>
  )
}
