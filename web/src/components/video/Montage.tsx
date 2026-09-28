import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DialogueLine, TaggedShot, TagKind } from '../../lib/api'
import { duration } from '../../lib/format'
import { PLAYBACKS, REVERSE_SPEEDS, playbackLength, type Playback, type ShakeMarker, type ZoomMarker } from '../../lib/settings'
import type { VideoDetail as Video } from '../../lib/types'
import TimeInput from '../ui/TimeInput'

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
  playback: Playback             // forward | reverse | bounce (forward, then rewind)
  reverse_speed: number          // speed of the rewind leg
  label?: string
}

export interface Segment { start: number; end: number; speed: number; zoom_markers: ZoomMarker[]; shake_markers: ShakeMarker[]; transition: Transition | null; playback: Playback; reverse_speed: number }
const MAX_REVERSE = 10  // seconds of shot (after speed) ffmpeg can hold in memory to reverse

/** Which part of the builder to show: one step of the Edit flow, or everything. */
export type MontageView = 'cut' | 'motion' | 'transitions' | 'render' | 'all'

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
  shots: { start: number; end: number; speed: number; punch: boolean; shake?: boolean; playback?: Playback; reverse_speed?: number; transition?: Transition | null; why: string }[]
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
  view?: MontageView
  plan: Plan | null
  onApplyPlanLook: (plan: Plan) => void
  scenes: number[] | null
  dialogue: DialogueLine[] | null
  tags: TaggedShot[] | null
  clipPack: { file: string; start: number; end: number }[] | null
  rangeStart: number | null
  rangeEnd: number | null
  seek: (t: number) => void
  playhead?: () => number
  onRangeChange?: (r: { start: number; end: number }) => void   // moves the timeline's handles
  onRender: (segments: Segment[], transition: Transition) => void
  onShotsChange?: (shots: { start: number; end: number; active?: boolean }[] | null) => void
  disabled: boolean
  revision?: number   // bump to re-read the saved montage (after Tweak wrote one)
}

const key = (id: string) => `ytstudio.montage.${id}`
let counter = 0
const mk = (start: number, end: number, label?: string): Shot =>
  ({ id: `${Date.now().toString(36)}-${counter++}`, start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100,
     include: true, speed: 1, punch: false, shake: false, transition: null, playback: 'forward', reverse_speed: 2, label })
/** Saved shots from before shake / per-shot transitions / playback existed get the defaults. */
const normalise = (s: Partial<Shot>): Shot => ({ ...mk(s.start ?? 0, s.end ?? 0, s.label), ...s, shake: s.shake ?? false, transition: s.transition ?? null,
                                                 playback: s.playback ?? 'forward', reverse_speed: s.reverse_speed ?? 2, id: s.id ?? mk(0, 0).id })
const shotLen = (s: Shot) => playbackLength(s.end - s.start, s.speed, s.playback, s.reverse_speed)
const DEFAULT_TRANSITION: Transition = { type: 'fade', duration: 0.35 }

/** The builder is remounted between Edit steps; its state lives in localStorage per video. */
function load(videoId: string): { shots: Shot[]; transition: Transition } {
  try {
    const raw = localStorage.getItem(key(videoId))
    if (raw) {
      const saved = JSON.parse(raw) as { shots: Partial<Shot>[]; transition: Transition }
      return { shots: (saved.shots ?? []).map(normalise), transition: saved.transition ?? DEFAULT_TRANSITION }
    }
  } catch { /* ignore */ }
  return { shots: [], transition: DEFAULT_TRANSITION }
}

/** Render-payload segments (a rendered clip's `render_settings`) → builder shots. Tweak uses this. */
export function shotsFromSegments(segments: Partial<Segment>[]): Shot[] {
  return segments.map((g) => ({
    ...mk(g.start ?? 0, g.end ?? 0), speed: g.speed ?? 1,
    punch: (g.zoom_markers?.length ?? 0) > 0, shake: (g.shake_markers?.length ?? 0) > 0,
    transition: g.transition ?? null, playback: g.playback ?? 'forward', reverse_speed: g.reverse_speed && g.reverse_speed > 1 ? g.reverse_speed : 2,
  }))
}
export function saveMontage(videoId: string, shots: Shot[], transition: Transition) {
  try { localStorage.setItem(key(videoId), JSON.stringify({ shots, transition })) } catch { /* ignore */ }
}

/** Output length: each shot's retimed length minus each boundary's overlap
 *  (the shot's own transition or the default, clamped to half the shorter neighbour). */
export function montageLength(shots: Shot[], fallback: Transition): number {
  const lens = shots.map(shotLen)
  if (!lens.length) return 0
  let total = lens.reduce((a, b) => a + b, 0)
  for (let k = 1; k < lens.length; k++) {
    const t = shots[k - 1].transition ?? fallback
    if (t.type === 'cut') continue
    total -= Math.min(t.duration, lens[k - 1] / 2, lens[k] / 2)
  }
  return total
}

/** What a shot has set beyond time and speed — shown in compact rows. */
const extras = (s: Shot, last: boolean): string[] => {
  const out: string[] = []
  if (s.punch) out.push('punch')
  if (s.shake) out.push('shake')
  if (s.playback === 'bounce') out.push(`⟲ bounce ${s.reverse_speed}×`)
  if (s.playback === 'reverse') out.push(`◀ reverse ${s.reverse_speed}×`)
  if (!last && s.transition) out.push(`→ ${transitionLabel(s.transition.type)}${s.transition.type !== 'cut' ? ` ${s.transition.duration.toFixed(2)}s` : ''}`)
  return out
}

export default function Montage({ video, view = 'all', plan, onApplyPlanLook, scenes, dialogue, tags, clipPack, rangeStart, rangeEnd, seek, playhead, onRangeChange, onRender, onShotsChange, disabled, revision = 0 }: Props) {
  const [shots, setShots] = useState<Shot[]>(() => load(video.id).shots)
  const [transition, setTransition] = useState<Transition>(() => load(video.id).transition)
  const [msg, setMsg] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [loadedFor, setLoadedFor] = useState(video.id)
  const [editingId, setEditingId] = useState<string | null>(null)   // the shot whose in/out the timeline handles are editing

  // Another video while mounted: swap to its saved builder.
  useEffect(() => {
    if (loadedFor === video.id) return
    const saved = load(video.id); setShots(saved.shots); setTransition(saved.transition); setLoadedFor(video.id)
  }, [video.id, loadedFor])
  // Tweak (Review) wrote a rendered clip's shots into storage: pick them up.
  const [seenRevision, setSeenRevision] = useState(revision)
  useEffect(() => {
    if (revision === seenRevision) return
    const saved = load(video.id); setShots(saved.shots); setTransition(saved.transition); setEditingId(null); setSeenRevision(revision)
    setMsg(`${saved.shots.length} shots loaded from the rendered clip.`)
  }, [revision, seenRevision, video.id])
  useEffect(() => {
    if (loadedFor !== video.id) return
    try { localStorage.setItem(key(video.id), JSON.stringify({ shots, transition })) } catch { /* ignore */ }
    onShotsChange?.(shots.length ? shots.filter((x) => x.include).map((x) => ({ start: x.start, end: x.end, active: x.id === editingId })) : null)
  }, [shots, transition, video.id, loadedFor, editingId]) // eslint-disable-line react-hooks/exhaustive-deps
  // While a shot is being trimmed, the timeline's handles (rangeStart/End) drive its in/out.
  useEffect(() => {
    if (!editingId || rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) return
    setShots((list) => list.map((x) => (x.id === editingId && (x.start !== rangeStart || x.end !== rangeEnd)
      ? { ...x, start: Math.round(rangeStart * 100) / 100, end: Math.round(rangeEnd * 100) / 100 } : x)))
  }, [editingId, rangeStart, rangeEnd])
  const startTrim = (s: Shot) => { setEditingId(s.id); onRangeChange?.({ start: s.start, end: s.end }); seek(s.start) }
  const stopTrim = () => setEditingId(null)
  const setRange = (start: number, end: number) => onRangeChange?.({ start: Math.max(0, start), end: Math.max(start + 0.3, end) })

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
    const next = plan.shots.map((sh) => ({ ...mk(sh.start, sh.end, sh.why), speed: sh.speed, punch: sh.punch, shake: Boolean(sh.shake), transition: sh.transition ?? null,
                                             playback: sh.playback ?? 'forward', reverse_speed: sh.reverse_speed ?? 2 }))
    if (shots.length && !window.confirm(`Replace the current ${shots.length} shots with the AI plan?`)) return
    setShots(next)
    setTransition({ type: plan.transition.type, duration: plan.transition.duration })
    onApplyPlanLook(plan)
    const own = next.filter((s) => s.transition).length
    setMsg(`AI plan loaded: ${next.length} shots, ~${Math.round(plan.out_length ?? 0)}s${own ? `, ${own} with their own transition` : ''}. Captions, grade and transition set to match.`)
  }
  const addRange = () => {
    if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) return setMsg('Set a valid start/end first.')
    if (editingId) stopTrim()
    const shot = mk(rangeStart, rangeEnd)
    setShots((s) => [...s, shot])
    setMsg(`Added ${duration(rangeStart)}–${duration(rangeEnd)} as shot ${shots.length + 1}. Tap ✎ on any shot to trim it.`)
  }

  const patch = (id: string, p: Partial<Shot>) => setShots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const move = (i: number, dir: -1 | 1) => setShots((s) => {
    const j = i + dir
    if (j < 0 || j >= s.length) return s
    const next = [...s]; [next[i], next[j]] = [next[j], next[i]]; return next
  })
  const remove = (id: string) => { if (id === editingId) stopTrim(); setShots((s) => s.filter((x) => x.id !== id)) }
  const clearOwn = () => setShots((s) => s.map((x) => ({ ...x, transition: null })))

  const included = shots.filter((s) => s.include && s.end > s.start)
  const total = useMemo(() => montageLength(included, transition), [included, transition])
  const ownCount = included.filter((s) => s.transition).length
  const tagCounts = useMemo(() => tags ? Object.fromEntries(TAG_FILTERS.map((f) => [f.value, tags.filter(f.test).length])) as Record<TagFilter, number> : null, [tags])

  const render = () => {
    if (included.length < 1) return setMsg('Include at least one shot.')
    const tooLong = included.findIndex((s) => s.playback !== 'forward' && (s.end - s.start) / s.speed > MAX_REVERSE)
    if (tooLong >= 0) return setMsg(`Shot ${shots.indexOf(included[tooLong]) + 1}: bounce and reverse need a shot of ${MAX_REVERSE} s or less. Shorten it or raise its speed.`)
    onRender(
      included.map((s, i) => ({
        start: s.start, end: s.end, speed: s.speed,
        zoom_markers: s.punch ? [{ at: 0, duration: Math.min(0.5, (s.end - s.start) / s.speed / 2), zoom: 1.15 }] : [],
        shake_markers: s.shake ? [{ ...SHAKE, duration: Math.min(SHAKE.duration, shotLen(s) / 2) }] : [],
        transition: i < included.length - 1 ? s.transition : null,
        playback: s.playback, reverse_speed: s.playback === 'forward' ? 1 : s.reverse_speed,
      })),
      transition,
    )
    setMsg('Montage render queued — watch it on the Jobs tab.')
  }

  const showCut = view === 'cut' || view === 'all'
  const showMotion = view === 'motion' || view === 'all'
  const showTrans = view === 'transitions' || view === 'all'
  const showRender = view === 'render' || view === 'all'
  const countLine = `${included.length} shot${included.length === 1 ? '' : 's'} · ${duration(total)} out`

  const timeButton = (s: Shot, i: number) => (
    <button className="shot-time mono" onClick={() => seek(s.start)} title="Preview from here">{i + 1}. {duration(s.start)}–{duration(s.end)}</button>
  )
  const labelSpan = (s: Shot, last: boolean, withExtras: boolean) => (
    <span className="muted small grow">
      {s.label ?? ''}{s.speed !== 1 || s.playback !== 'forward' ? ` · ${shotLen(s) < 1 ? shotLen(s).toFixed(1) : Math.round(shotLen(s))}s out` : ''}
      {withExtras && extras(s, last).length > 0 && <span className="shot-extras"> {extras(s, last).join(' · ')}</span>}
    </span>
  )

  return (
    <div className="stack" style={{ gap: 8 }}>
      {showCut && (
        <>
          <div className="row wrap">
            <span className="muted small">Shots from</span>
            <button className="btn small" onClick={fromScenes} disabled={!scenes?.length} title={scenes ? 'One shot per scene cut' : 'Run Detect scenes first'}>Scene cuts{scenes ? ` (${scenes.length + 1})` : ''}</button>
            <button className="btn small" onClick={fromDialogue} disabled={!dialogue?.length} title={dialogue ? 'One shot per spoken line' : 'Run Prepare → Dialogue first'}>Dialogue lines{dialogue ? ` (${dialogue.length})` : ''}</button>
            <button className="btn small" onClick={fromClipPack} disabled={!clipPack?.length} title={clipPack ? 'The shredded clips' : 'Run Shred to clips first'}>Clip pack{clipPack ? ` (${clipPack.length})` : ''}</button>
            <button className="btn small accent" onClick={fromPlan} disabled={!plan} title={plan ? plan.summary : 'Run "Plan an edit" first'}>AI plan{plan ? ` (${plan.shots.length})` : ''}</button>
            <button className="btn small" onClick={fromSuggested} disabled={!video.clips.length}>Suggested clips{video.clips.length ? ` (${video.clips.length})` : ''}</button>
            {shots.length > 0 && <button className="btn small" onClick={() => window.confirm('Clear the montage?') && setShots([])}>Clear</button>}
          </div>
          {rangeStart != null && rangeEnd != null && !editingId && (
            <div className="row wrap add-shot">
              <span className="muted small">Add a shot</span>
              <span className="muted small">from</span>
              <TimeInput value={rangeStart} label="Shot start" onCommit={(v) => setRange(v, Math.max(rangeEnd, v + 0.5))} />
              {playhead && <button className="btn small" onClick={() => setRange(playhead(), Math.max(rangeEnd, playhead() + 0.5))} title="Start at the player's position">◀ playhead</button>}
              <span className="muted small">to</span>
              <TimeInput value={rangeEnd} label="Shot end" onCommit={(v) => setRange(Math.min(rangeStart, v - 0.5), v)} />
              {playhead && <button className="btn small" onClick={() => setRange(Math.min(rangeStart, playhead() - 0.5), playhead())} title="End at the player's position">playhead ▶</button>}
              <span className="mono muted small">{duration(rangeEnd - rangeStart)}</span>
              <button className="btn small accent" onClick={addRange}>Add shot</button>
              <span className="muted small">or drag the amber handles on the timeline</span>
            </div>
          )}
          {shots.length === 0 && (
            <p className="muted small" style={{ margin: 0 }}>Start with a source above — <strong>Scene cuts</strong> gives one shot per scene, <strong>AI plan</strong> a finished edit. Then untick what you don't want and reorder. <Link to="/help#montage">How the montage works →</Link></p>
          )}
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
              <span className="muted small">tick = include · tap a time to preview · ✎ trim · speed per shot · ↑ ↓ reorder</span>
              {shots.map((s, i) => {
                const trimming = s.id === editingId
                return (
                  <div key={s.id} className={`shot-row ${s.include ? '' : 'off'} ${trimming ? 'trimming' : ''}`}>
                    <input type="checkbox" checked={s.include} onChange={(e) => patch(s.id, { include: e.target.checked })} aria-label="Include shot" />
                    {timeButton(s, i)}
                    {labelSpan(s, i === shots.length - 1, view !== 'all')}
                    <select value={s.speed} onChange={(e) => patch(s.id, { speed: Number(e.target.value) })} aria-label="Speed" title="Playback speed of this shot">
                      {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
                    </select>
                    <button className={`btn small ${trimming ? 'accent' : ''}`} onClick={() => (trimming ? stopTrim() : startTrim(s))} aria-label="Trim shot" title="Trim: drag the handles on the timeline or type the times">{trimming ? 'Done' : '✎'}</button>
                    <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="btn small" onClick={() => move(i, 1)} disabled={i === shots.length - 1} aria-label="Move down">↓</button>
                    <button className="btn small" onClick={() => remove(s.id)} aria-label="Remove shot">✕</button>
                    {trimming && (
                      <div className="shot-next">
                        <span className="muted small">trim · from</span>
                        <TimeInput value={s.start} label="Shot start" onCommit={(v) => setRange(v, Math.max(s.end, v + 0.5))} />
                        {playhead && <button className="btn small" onClick={() => setRange(playhead(), Math.max(s.end, playhead() + 0.5))}>◀ playhead</button>}
                        <span className="muted small">to</span>
                        <TimeInput value={s.end} label="Shot end" onCommit={(v) => setRange(Math.min(s.start, v - 0.5), v)} />
                        {playhead && <button className="btn small" onClick={() => setRange(Math.min(s.start, playhead() - 0.5), playhead())}>playhead ▶</button>}
                        <span className="muted small">or drag the amber handles on the timeline</span>
                      </div>
                    )}
                  </div>
                )
              })}
              <span className="mono muted small">{countLine}</span>
            </div>
          )}
        </>
      )}

      {showMotion && shots.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          {view === 'all' && <span className="muted small">Motion per shot</span>}
          {shots.filter((s) => s.include).map((s) => {
            const i = shots.indexOf(s)
            return (
              <div key={s.id} className="shot-row">
                {timeButton(s, i)}
                {labelSpan(s, i === shots.length - 1, false)}
                <label className="check small" title="Punch-in zoom at the start of this shot"><input type="checkbox" checked={s.punch} onChange={(e) => patch(s.id, { punch: e.target.checked })} /> punch</label>
                <label className="check small" title="Camera shake at the start of this shot"><input type="checkbox" checked={s.shake} onChange={(e) => patch(s.id, { shake: e.target.checked })} /> shake</label>
                <select value={s.playback} onChange={(e) => patch(s.id, { playback: e.target.value as Playback })} aria-label="Playback" title={PLAYBACKS.find((x) => x.value === s.playback)?.hint}>
                  <option value="forward">▶ forward</option><option value="bounce">⟲ bounce</option><option value="reverse">◀ reverse</option>
                </select>
                {s.playback !== 'forward' && (
                  <select value={s.reverse_speed} onChange={(e) => patch(s.id, { reverse_speed: Number(e.target.value) })} aria-label="Rewind speed" title="Speed of the rewind leg">
                    {REVERSE_SPEEDS.map((v) => <option key={v} value={v}>rewind {v}×</option>)}
                  </select>
                )}
              </div>
            )
          })}
          <p className="muted small" style={{ margin: 0 }}>Punch = quick zoom at the shot's start. Shake = a jolt. Bounce plays forward then rewinds (10 s or shorter). <Link to="/help#motion">Guide →</Link></p>
        </div>
      )}
      {showMotion && shots.length === 0 && view !== 'all' && <p className="muted small">No shots yet — go back to Cut and load some.</p>}

      {showTrans && (
        <div className="stack" style={{ gap: 6 }}>
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
          </div>
          {included.length > 1 && (
            <div className="stack" style={{ gap: 4 }}>
              <span className="muted small">Between shots — leave on Default unless one boundary needs something else</span>
              {included.slice(0, -1).map((s) => {
                const i = shots.indexOf(s)
                const own = s.transition
                return (
                  <div key={s.id} className="shot-row">
                    {timeButton(s, i)}
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
                )
              })}
            </div>
          )}
          <p className="muted small" style={{ margin: 0 }}>{countLine}. Transitions overlap the shots, so the total shrinks a little with each one. <Link to="/help#transitions">See them animated →</Link></p>
        </div>
      )}

      {showRender && (
        <div className="row wrap">
          <span className="mono muted small">{countLine} · {transitionLabel(transition.type)}{ownCount ? ` (+${ownCount} own)` : ''}</span>
          <button className="btn accent" onClick={render} disabled={disabled || !included.length}>Render montage</button>
        </div>
      )}
      {view === 'all' && <p className="muted small">Format, Look, Captions, Sound and Brand apply to the whole montage. <Link to="/help#montage">Guide →</Link></p>}
      {msg && <p className="muted small">{msg}</p>}
    </div>
  )
}
