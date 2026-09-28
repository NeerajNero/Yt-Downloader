import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteRecipe, insertRecipe, listMusic, listOverlays, updateRecipe, uploadMusic, uploadOverlay, type DialogueLine, type ManualCaptions, type TaggedShot } from '../../../lib/api'
import { duration } from '../../../lib/format'
import { usePoll } from '../../../lib/poll'
import { DEFAULT_SETTINGS, PLAYBACKS, REVERSE_SPEEDS, fromStored, getEditLayout, playbackLength, summarize, type RenderSettings, type SfxLayer, type ShakeMarker, type ZoomMarker } from '../../../lib/settings'
import type { Job, Recipe, VideoDetail as Video } from '../../../lib/types'
import Group from '../../ui/Group'
import TimeInput from '../../ui/TimeInput'
import CaptionEditor from '../CaptionEditor'
import Montage, { type MontageView, type Plan, type Segment, type Transition } from '../Montage'

export type EditStep = 'cut' | 'frame' | 'motion' | 'transitions' | 'look' | 'captions' | 'sound' | 'brand' | 'render'

interface Props {
  video: Video
  settings: RenderSettings
  onChange: (s: RenderSettings) => void
  range: { start: number; end: number }
  onRange: (r: { start: number; end: number }) => void
  mode: 'range' | 'montage'
  onMode: (m: 'range' | 'montage') => void
  playhead: () => number
  seek: (t: number) => void
  plan: Plan | null
  scenes: number[] | null
  dialogue: DialogueLine[] | null
  tags: TaggedShot[] | null
  clipPack: { file: string; start: number; end: number }[] | null
  manual: ManualCaptions | null
  hasTranscript: boolean
  borders: { trim_x: number; trim_y: number } | null
  active: (type: string) => Job | undefined
  run: (type: string, payload?: Record<string, unknown>, okMsg?: string) => void
  previewCaps: boolean
  onPreviewCaps: (v: boolean) => void
  recipeId: string | null
  onRecipe: (id: string | null) => void
  onRender: () => void
  onRenderSequence: (segments: Segment[], transition: Transition) => void
  onMontageShots: (shots: { start: number; end: number; active?: boolean }[] | null) => void
  tweakingClip: string | null
  onStep?: (step: EditStep) => void
  shotCount?: number
  montageRevision?: number
}

const STEPS: { id: EditStep; title: string; blurb: string; help: string; montageOnly?: boolean }[] = [
  { id: 'cut', title: 'Cut', blurb: 'Which seconds to keep: one range, or several shots in order.', help: 'montage' },
  { id: 'frame', title: 'Frame', blurb: 'Shape of the output and which part of the picture fills it. Drag the box on the player.', help: 'framing' },
  { id: 'motion', title: 'Motion', blurb: 'Speed tricks: punch-ins, shakes, a bounce, a slow zoom.', help: 'motion' },
  { id: 'transitions', title: 'Transitions', blurb: 'How one shot becomes the next, and how long that takes.', help: 'transitions', montageOnly: true },
  { id: 'look', title: 'Look', blurb: 'Colour: a grade, extra punch, the HDR look.', help: 'motion' },
  { id: 'captions', title: 'Captions', blurb: 'Word-timed text from the transcript, or your own lines.', help: 'captions' },
  { id: 'sound', title: 'Sound', blurb: 'A music bed, sound effects, loudness.', help: 'sound' },
  { id: 'brand', title: 'Brand', blurb: 'Your logo or handle on top.', help: 'ai' },
  { id: 'render', title: 'Render', blurb: 'Check the summary, save the look if you like it, render.', help: 'review' },
]
const stepKey = (id: string) => `ytstudio.edit.step.${id}`

const EDIT_GUIDE_KEY = 'ytstudio.guide.edit'

/** Step 3: the export. Default layout is one step at a time (Cut → Frame → … → Render);
 *  "Everything on one page" (More) shows the old collapsible groups. */
export default function EditPanel(p: Props) {
  const s = p.settings
  const set = <K extends keyof RenderSettings>(k: K, v: RenderSettings[K]) => p.onChange({ ...s, [k]: v })
  const { data: recipeData } = usePoll<Recipe[]>('/api/recipes', 3000)
  const recipes = recipeData ?? []
  const current = recipes.find((r) => r.id === p.recipeId) ?? null
  const [music, setMusic] = useState<string[]>([])
  const [overlays, setOverlays] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [layout] = useState(getEditLayout)
  const [step, setStepState] = useState<EditStep>(() => { try { return (localStorage.getItem(stepKey(p.video.id)) as EditStep) || 'cut' } catch { return 'cut' } })
  const [showHelp, setShowHelp] = useState(() => { try { return !localStorage.getItem(EDIT_GUIDE_KEY) } catch { return true } })
  const closeHelp = () => { setShowHelp(false); try { localStorage.setItem(EDIT_GUIDE_KEY, '1') } catch { /* */ } }
  const ready = p.video.status === 'ready'
  useEffect(() => {
    listMusic().then(setMusic).catch(() => setMusic([]))
    listOverlays().then(setOverlays).catch(() => setOverlays([]))
  }, [])
  const steps = STEPS.filter((st) => !st.montageOnly || p.mode === 'montage')
  const effectiveStep: EditStep = layout === 'page' ? 'cut' : (steps.some((st) => st.id === step) ? step : 'cut')
  const setStep = (id: EditStep) => { setStepState(id); try { localStorage.setItem(stepKey(p.video.id), id) } catch { /* */ } }
  useEffect(() => { p.onStep?.(effectiveStep) }, [effectiveStep]) // eslint-disable-line react-hooks/exhaustive-deps
  const idx = steps.findIndex((st) => st.id === effectiveStep)
  const go = (d: -1 | 1) => { const n = steps[idx + d]; if (n) { setStep(n.id); window.scrollTo({ top: 0, behavior: 'smooth' }) } }

  // ---- recipes ----
  const applyRecipe = (id: string) => {
    p.onRecipe(id || null)
    const r = recipes.find((x) => x.id === id)
    if (r) { p.onChange(fromStored(r.settings)); setMsg(`Applied "${r.name}".`) }
  }
  const saveRecipe = async () => {
    const name = window.prompt('Save these settings as a recipe. Name:', current?.name ?? 'My look')?.trim()
    if (!name) return
    try {
      const existing = recipes.find((r) => r.name === name)
      if (existing) {
        await updateRecipe(existing.id, { settings: s })
        p.onRecipe(existing.id); setMsg(`Updated "${name}".`)
      } else {
        const r = await insertRecipe({ name, description: null, settings: s, auto_apply: false })
        p.onRecipe(r.id); setMsg(`Saved "${name}". Auto-apply it under More → Recipes.`)
      }
    } catch (e) { setMsg((e as Error).message) }
  }

  // ---- helpers ----
  const rel = () => Math.max(0, Math.round((p.playhead() - p.range.start) * 10) / 10)
  const wm = s.watermark
  const setWm = (patch: Partial<NonNullable<RenderSettings['watermark']>> | null) =>
    p.onChange({ ...s, watermark: patch === null ? null : { file: '', position: 'top_right', scale: 0.15, opacity: 0.85, margin: 0.03, ...(wm ?? {}), ...patch } })
  const setSfx = (list: SfxLayer[]) => set('sfx', list)
  const setMarkers = (list: ZoomMarker[]) => set('zoom_markers', list)
  const setShakes = (list: ShakeMarker[]) => set('shake_markers', list)
  const onPickMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { const r = await uploadMusic(f); setMusic(await listMusic()); set('music', r.name) } catch (err) { setMsg((err as Error).message) }
  }
  const onPickOverlay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { const r = await uploadOverlay(f); setOverlays(await listOverlays()); setWm({ file: r.name }) } catch (err) { setMsg((err as Error).message) }
  }
  const num = (v: string) => (v === '' ? 0 : Number(v))
  const D = DEFAULT_SETTINGS

  // ---- summaries (one line per step; also the Render summary) ----
  const rangeOut = playbackLength(p.range.end - p.range.start, 1, s.playback, s.reverse_speed)
  const cutSummary = p.mode === 'montage' ? `montage · ${p.shotCount ?? 0} shot${p.shotCount === 1 ? '' : 's'}` : `${duration(p.range.start)} → ${duration(p.range.end)} · ${duration(p.range.end - p.range.start)}`
  const moved = Math.abs(s.crop_x - 0.5) > 0.01 || Math.abs(s.crop_y - 0.5) > 0.01
  const frameSummary = [s.orientation === 'landscape' ? '16:9' : '9:16', s.resolution === '4k' ? '4K' : '1080p', s.style === 'blur' ? 'blur pad' : 'crop',
    s.crop_zoom > 1 ? `zoom ${s.crop_zoom.toFixed(2)}×` : '', moved ? 'moved' : '', s.rotate !== 'none' ? `rotate ${s.rotate}` : '', s.trim_x || s.trim_y ? `trim ${s.trim_y}/${s.trim_x}%` : ''].filter(Boolean).join(' · ')
  const motionSummary = p.mode === 'montage' ? 'per shot' : [s.playback !== 'forward' ? `${s.playback}${s.reverse_speed > 1 ? ` ${s.reverse_speed}×` : ''} → ${duration(rangeOut)} out` : '', s.zoom === 'in' ? 'slow zoom' : '',
    s.zoom_markers.length ? `${s.zoom_markers.length} punch-in${s.zoom_markers.length > 1 ? 's' : ''}` : '', s.shake_markers.length ? `${s.shake_markers.length} shake${s.shake_markers.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || 'none'
  const lookSummary = [s.grade !== 'none' ? s.grade.replace('_', ' & ') : 'natural', s.vivid_amount ? `vivid ${s.vivid_amount}` : '', s.look === 'hdr' ? 'HDR look' : ''].filter(Boolean).join(' · ')
  const capSummary = s.captions ? `${s.caption_style} · ${s.caption_pos}${s.caption_source === 'manual' ? ' · manual' : ''}` : 'off'
  const soundSummary = [s.music ? `music ${s.music}${s.duck ? ' (ducked)' : ''}` : 'original audio', s.sfx.length ? `${s.sfx.length} sfx` : '', s.loudness ? '-14 LUFS' : ''].filter(Boolean).join(' · ')
  const brandSummary = wm?.file ? `${wm.file} · ${wm.position.replace('_', ' ')}` : 'no watermark'
  const tooLongToReverse = p.mode === 'range' && s.playback !== 'forward' && p.range.end - p.range.start > 10
  const summaries: Record<EditStep, string> = { cut: cutSummary, frame: frameSummary, motion: motionSummary, transitions: 'see step', look: lookSummary, captions: capSummary, sound: soundSummary, brand: brandSummary, render: '' }
  const done: Partial<Record<EditStep, boolean>> = {
    cut: p.mode === 'montage' ? (p.shotCount ?? 0) > 0 : p.range.end > p.range.start,
    frame: s.orientation !== D.orientation || s.resolution !== D.resolution || s.style !== D.style || s.rotate !== 'none' || Boolean(s.trim_x || s.trim_y || s.fg_crop) || s.crop_zoom > 1 || moved,
    motion: p.mode === 'range' ? (s.zoom !== 'none' || s.zoom_markers.length > 0 || s.shake_markers.length > 0 || s.playback !== 'forward') : undefined,
    look: s.grade !== 'none' || s.vivid_amount > 0 || s.look !== 'none',
    captions: s.captions, sound: Boolean(s.music || s.sfx.length || s.loudness), brand: Boolean(wm?.file),
  }

  const montage = (view: MontageView) => (
    <Montage video={p.video} view={view} plan={p.plan} scenes={p.scenes} dialogue={p.dialogue} tags={p.tags} clipPack={p.clipPack} rangeStart={p.range.start} rangeEnd={p.range.end}
             seek={p.seek} playhead={p.playhead} onRangeChange={p.onRange} onRender={p.onRenderSequence} disabled={!ready} onShotsChange={p.onMontageShots} revision={p.montageRevision}
             onApplyPlanLook={(pl) => p.onChange({ ...s, captions: pl.captions, caption_style: pl.caption_style as RenderSettings['caption_style'],
                                                    caption_pos: pl.caption_pos as RenderSettings['caption_pos'], grade: pl.grade as RenderSettings['grade'], vivid_amount: pl.vivid })} />
  )

  // ---- sections (shared by the step flow and the one-page layout) ----
  const recipeRow = (
    <div className="row wrap">
      <span className="muted small">Recipe</span>
      <select value={p.recipeId ?? ''} onChange={(e) => applyRecipe(e.target.value)} aria-label="Recipe" className="grow">
        <option value="">— pick a saved look —</option>
        {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.auto_apply ? ' (auto)' : ''}</option>)}
      </select>
      <button className="btn small" onClick={() => void saveRecipe()}>Save look</button>
      {current && <button className="btn small" onClick={() => window.confirm(`Delete recipe "${current.name}"?`) && void deleteRecipe(current.id).then(() => p.onRecipe(null))}>Delete</button>}
    </div>
  )
  const modeRow = (
    <div className="row wrap">
      <label className={`choice-pill ${p.mode === 'range' ? 'active' : ''}`}><input type="radio" checked={p.mode === 'range'} onChange={() => p.onMode('range')} /> One range</label>
      <label className={`choice-pill ${p.mode === 'montage' ? 'active' : ''}`}><input type="radio" checked={p.mode === 'montage'} onChange={() => p.onMode('montage')} /> Montage</label>
      <span className="muted small">{p.mode === 'range' ? 'one continuous piece' : 'several shots joined with transitions'}</span>
    </div>
  )
  const rangeRow = (
    <div className="row wrap">
      <span className="muted small">from</span>
      <TimeInput value={p.range.start} label="Clip start" onCommit={(v) => p.onRange({ start: v, end: Math.max(p.range.end, v + 0.5) })} />
      <button className="btn small" onClick={() => p.onRange({ start: p.playhead(), end: Math.max(p.range.end, p.playhead() + 0.5) })}>◀ playhead</button>
      <span className="muted small">to</span>
      <TimeInput value={p.range.end} label="Clip end" onCommit={(v) => p.onRange({ start: Math.min(p.range.start, v - 0.5), end: v })} />
      <button className="btn small" onClick={() => p.onRange({ start: Math.min(p.range.start, p.playhead() - 0.5), end: p.playhead() })}>playhead ▶</button>
      <span className="muted small">or drag the handles on the timeline</span>
    </div>
  )
  const playbackRow = (
    <div className="row wrap">
      <span className="muted small">Playback</span>
      <select value={s.playback} onChange={(e) => set('playback', e.target.value as RenderSettings['playback'])} aria-label="Playback">
        {PLAYBACKS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {s.playback !== 'forward' && (
        <select value={s.reverse_speed} onChange={(e) => set('reverse_speed', Number(e.target.value))} aria-label="Rewind speed">
          {REVERSE_SPEEDS.map((v) => <option key={v} value={v}>rewind {v}×</option>)}
        </select>
      )}
      <span className={`small ${tooLongToReverse ? 'job-error' : 'muted'}`}>
        {tooLongToReverse ? 'Bounce and reverse need a range of 10 s or less.' : PLAYBACKS.find((o) => o.value === s.playback)?.hint}
      </span>
    </div>
  )
  const formatSection = (
    <>
      <div className="row wrap">
        <select value={s.orientation} onChange={(e) => set('orientation', e.target.value as RenderSettings['orientation'])} aria-label="Orientation">
          <option value="portrait">Portrait 9:16 (Shorts)</option><option value="landscape">Landscape 16:9</option>
        </select>
        <select value={s.resolution} onChange={(e) => set('resolution', e.target.value as RenderSettings['resolution'])} aria-label="Resolution">
          <option value="1080">1080p</option><option value="4k">4K (slow)</option>
        </select>
        <select value={s.style} onChange={(e) => set('style', e.target.value as RenderSettings['style'])} aria-label="Framing">
          <option value="crop">Fill (crop into the picture)</option><option value="blur">Fit on blurred pad</option>
        </select>
        <select value={s.rotate} onChange={(e) => set('rotate', e.target.value as RenderSettings['rotate'])} aria-label="Rotate">
          <option value="none">No rotation</option><option value="right">Rotate 90° ↻</option><option value="left">Rotate 90° ↺</option><option value="180">Rotate 180°</option>
        </select>
        {s.style === 'blur' && <label className="num"><input type="text" inputMode="decimal" value={s.fg_crop} onChange={(e) => set('fg_crop', num(e.target.value))} aria-label="Crop video sides" /> % crop sides</label>}
      </div>
      <div className="row wrap">
        <span className="muted small">Crop window</span>
        <label className="slider"><span className="muted small">zoom</span>
          <input type="range" min={100} max={300} step={5} value={Math.round(s.crop_zoom * 100)} onChange={(e) => set('crop_zoom', Number(e.target.value) / 100)} />
          <span className="mono small">{s.crop_zoom.toFixed(2)}×</span></label>
        {(s.crop_zoom > 1 || moved) && <button className="btn small" onClick={() => p.onChange({ ...s, crop_x: 0.5, crop_y: 0.5, crop_zoom: 1 })}>Centre, no zoom</button>}
        <span className="muted small">
          {effectiveStep === 'frame' || layout === 'page'
            ? (s.style === 'crop' ? 'drag the amber box on the player to choose what fills the frame; scroll on it to zoom' : s.crop_zoom > 1 ? 'drag the amber box on the player to choose the part to show' : 'zoom in to show only part of the picture on the pad')
            : 'set on the Frame step'}
        </span>
      </div>
      <div className="row wrap">
        <span className="muted small">Trim bars</span>
        <label className="num"><input type="text" inputMode="decimal" value={s.trim_y} onChange={(e) => set('trim_y', num(e.target.value))} aria-label="Trim top/bottom" /> % top/bottom</label>
        <label className="num"><input type="text" inputMode="decimal" value={s.trim_x} onChange={(e) => set('trim_x', num(e.target.value))} aria-label="Trim sides" /> % sides</label>
        {p.borders ? (
          (p.borders.trim_x || p.borders.trim_y)
            ? <button className="btn small" onClick={() => p.onChange({ ...s, trim_x: p.borders!.trim_x, trim_y: p.borders!.trim_y })}>Use measured {p.borders.trim_y}% / {p.borders.trim_x}%</button>
            : <span className="muted small">measured: no bars</span>
        ) : <button className="btn small" disabled={Boolean(p.active('borders'))} onClick={() => p.run('borders')}>{p.active('borders') ? 'Measuring…' : 'Measure bars'}</button>}
      </div>
    </>
  )
  const markersSection = (
    <>
      <div className="row wrap">
        <label className="check"><input type="checkbox" checked={s.zoom === 'in'} onChange={(e) => set('zoom', e.target.checked ? 'in' : 'none')} /> Slow zoom in</label>
      </div>
      <div className="row wrap">
        <span className="muted small">Punch-ins</span>
        <button className="btn small" onClick={() => setMarkers([...s.zoom_markers, { at: rel(), duration: 0.5, zoom: 1.15 }].sort((a, b) => a.at - b.at))}>Add at playhead</button>
        {s.zoom_markers.length > 0 && <button className="btn small" onClick={() => setMarkers([])}>Clear</button>}
      </div>
      {s.zoom_markers.map((m, i) => (
        <div key={i} className="row wrap small">
          <span className="mono muted">{duration(p.range.start + m.at)}</span>
          <label className="num"><input type="text" inputMode="decimal" value={m.duration} onChange={(e) => setMarkers(s.zoom_markers.map((x, j) => (j === i ? { ...x, duration: Number(e.target.value) || 0.5 } : x)))} aria-label="Duration" /> s</label>
          <label className="slider"><span className="muted small">zoom</span>
            <input type="range" min={105} max={200} step={5} value={Math.round(m.zoom * 100)} onChange={(e) => setMarkers(s.zoom_markers.map((x, j) => (j === i ? { ...x, zoom: Number(e.target.value) / 100 } : x)))} />
            <span className="mono small">{m.zoom.toFixed(2)}×</span></label>
          <button className="btn small" onClick={() => setMarkers(s.zoom_markers.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <div className="row wrap">
        <span className="muted small">Shakes</span>
        <button className="btn small" onClick={() => setShakes([...s.shake_markers, { at: rel(), duration: 0.4, intensity: 60 }].sort((a, b) => a.at - b.at))}>Add at playhead</button>
        {s.shake_markers.length > 0 && <button className="btn small" onClick={() => setShakes([])}>Clear</button>}
      </div>
      {s.shake_markers.map((m, i) => (
        <div key={i} className="row wrap small">
          <span className="mono muted">{duration(p.range.start + m.at)}</span>
          <label className="num"><input type="text" inputMode="decimal" value={m.duration} onChange={(e) => setShakes(s.shake_markers.map((x, j) => (j === i ? { ...x, duration: Number(e.target.value) || 0.4 } : x)))} aria-label="Duration" /> s</label>
          <label className="slider"><span className="muted small">strength</span>
            <input type="range" min={5} max={100} step={5} value={m.intensity} onChange={(e) => setShakes(s.shake_markers.map((x, j) => (j === i ? { ...x, intensity: Number(e.target.value) } : x)))} />
            <span className="mono small">{m.intensity}</span></label>
          <button className="btn small" onClick={() => setShakes(s.shake_markers.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
    </>
  )
  const lookSection = (
    <div className="row wrap">
      <select value={s.grade} onChange={(e) => set('grade', e.target.value as RenderSettings['grade'])} aria-label="Colour grade">
        <option value="none">Natural colour</option><option value="teal_orange">Teal & orange</option><option value="moody">Moody</option>
        <option value="warm">Warm film</option><option value="cool">Cool</option><option value="bw">Black & white</option>
      </select>
      <label className="slider"><span className="muted small">Vivid</span>
        <input type="range" min={0} max={100} step={5} value={s.vivid_amount} onChange={(e) => set('vivid_amount', Number(e.target.value))} />
        <span className="mono small">{s.vivid_amount}</span></label>
      <label className="check"><input type="checkbox" checked={s.look === 'hdr'} onChange={(e) => set('look', e.target.checked ? 'hdr' : 'none')} /> HDR look</label>
      {s.look === 'hdr' && (
        <label className="slider"><span className="muted small">Sharp</span>
          <input type="range" min={0} max={100} step={5} value={s.look_sharp} onChange={(e) => set('look_sharp', Number(e.target.value))} />
          <span className="mono small">{s.look_sharp}</span></label>
      )}
    </div>
  )
  const captionsSection = (
    <>
      <div className="row wrap">
        <label className="check" title={p.hasTranscript || p.manual?.items.length ? '' : 'Run Prepare → Transcript, or type captions below'}>
          <input type="checkbox" checked={s.captions} disabled={!p.hasTranscript && !p.manual?.items.length} onChange={(e) => set('captions', e.target.checked)} /> Burn captions
        </label>
        {!p.hasTranscript && !p.manual?.items.length && <span className="muted small">needs a transcript (Prepare) or hand-typed lines below</span>}
        {s.captions && (
          <>
            <select value={s.caption_source} onChange={(e) => set('caption_source', e.target.value as RenderSettings['caption_source'])} aria-label="Caption source">
              <option value="auto" disabled={!p.hasTranscript}>From transcript</option><option value="manual" disabled={!p.manual?.items.length}>Hand-typed</option>
            </select>
            <select value={s.caption_style} onChange={(e) => set('caption_style', e.target.value as RenderSettings['caption_style'])} aria-label="Caption style">
              <option value="karaoke">Karaoke</option><option value="typewriter">Typewriter</option><option value="pop">Pop</option><option value="minimal">Minimal</option>
            </select>
            <select value={s.caption_pos} onChange={(e) => set('caption_pos', e.target.value as RenderSettings['caption_pos'])} aria-label="Caption position">
              <option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option>
            </select>
            {s.rotate !== 'none' && <label className="check"><input type="checkbox" checked={s.rotate_captions} onChange={(e) => set('rotate_captions', e.target.checked)} /> Rotate with video</label>}
            <label className="check"><input type="checkbox" checked={p.previewCaps} onChange={(e) => p.onPreviewCaps(e.target.checked)} /> Preview on player</label>
          </>
        )}
      </div>
      <CaptionEditor videoId={p.video.id} manual={p.manual} currentTime={p.playhead} onSaved={() => p.onChange({ ...s, captions: true, caption_source: 'manual' })} />
    </>
  )
  const soundSection = (
    <>
      <div className="row wrap">
        <select value={s.music} onChange={(e) => set('music', e.target.value)} aria-label="Music">
          <option value="">No music</option>{music.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label className="btn small">Add track<input type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,audio/*" onChange={(e) => void onPickMusic(e)} hidden /></label>
        {s.music && (
          <>
            <label className="slider"><span className="muted small">Vol</span>
              <input type="range" min={0} max={100} step={5} value={s.music_gain} onChange={(e) => set('music_gain', Number(e.target.value))} />
              <span className="mono small">{s.music_gain}</span></label>
            <label className="check"><input type="checkbox" checked={s.duck} onChange={(e) => set('duck', e.target.checked)} /> Duck under speech</label>
          </>
        )}
        <label className="check"><input type="checkbox" checked={s.loudness} onChange={(e) => set('loudness', e.target.checked)} /> Normalise loudness</label>
      </div>
      <div className="row wrap">
        <span className="muted small">Sound effects</span>
        <button className="btn small" disabled={!music.length} title={music.length ? '' : 'Add an audio file first'} onClick={() => setSfx([...s.sfx, { file: music[0], at: rel(), gain: 80 }])}>Add at playhead</button>
        {s.sfx.length > 0 && <button className="btn small" onClick={() => setSfx([])}>Clear</button>}
      </div>
      {s.sfx.map((l, i) => (
        <div key={i} className="row wrap small">
          <select value={l.file} onChange={(e) => setSfx(s.sfx.map((x, j) => (j === i ? { ...x, file: e.target.value } : x)))} aria-label="Sound file">
            {music.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="mono muted">at {duration(p.range.start + l.at)}</span>
          <label className="slider"><span className="muted small">vol</span>
            <input type="range" min={0} max={100} step={5} value={l.gain} onChange={(e) => setSfx(s.sfx.map((x, j) => (j === i ? { ...x, gain: Number(e.target.value) } : x)))} />
            <span className="mono small">{l.gain}</span></label>
          <button className="btn small" onClick={() => setSfx(s.sfx.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
    </>
  )
  const brandSection = (
    <div className="row wrap">
      <select value={wm?.file ?? ''} onChange={(e) => (e.target.value ? setWm({ file: e.target.value }) : setWm(null))} aria-label="Watermark">
        <option value="">No watermark</option>{overlays.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <label className="btn small">Add PNG<input type="file" accept=".png,.webp,image/png,image/webp" onChange={(e) => void onPickOverlay(e)} hidden /></label>
      {wm?.file && (
        <>
          <select value={wm.position} onChange={(e) => setWm({ position: e.target.value as NonNullable<RenderSettings['watermark']>['position'] })} aria-label="Position">
            <option value="top_left">Top left</option><option value="top_center">Top centre</option><option value="top_right">Top right</option>
            <option value="bottom_left">Bottom left</option><option value="bottom_center">Bottom centre</option><option value="bottom_right">Bottom right</option>
          </select>
          <label className="slider"><span className="muted small">Size</span>
            <input type="range" min={3} max={60} value={Math.round(wm.scale * 100)} onChange={(e) => setWm({ scale: Number(e.target.value) / 100 })} />
            <span className="mono small">{Math.round(wm.scale * 100)}%</span></label>
          <label className="slider"><span className="muted small">Opacity</span>
            <input type="range" min={5} max={100} step={5} value={Math.round(wm.opacity * 100)} onChange={(e) => setWm({ opacity: Number(e.target.value) / 100 })} />
            <span className="mono small">{Math.round(wm.opacity * 100)}</span></label>
        </>
      )}
    </div>
  )
  const renderBar = (
    <div className="render-bar">
      <span className="small grow">{summarize(s)}</span>
      <button className="btn accent" onClick={p.onRender} disabled={!ready || tooLongToReverse}>{p.tweakingClip ? 'Re-render clip' : 'Render'}</button>
    </div>
  )

  // ================= one-page layout (More → "Everything on one page") =================
  if (layout === 'page') {
    return (
      <div className="stack">
        {recipeRow}
        {p.tweakingClip && <p className="chip accent" style={{ alignSelf: 'flex-start' }}>Tweaking a clip — Render replaces its file</p>}
        <Group title="What" summary={cutSummary} open help="montage" info="A single range renders one continuous piece. Montage assembles several shots with transitions, speed changes and punch-ins.">
          {modeRow}{p.mode === 'range' ? <>{rangeRow}{playbackRow}</> : montage('all')}
        </Group>
        <Group title="Format" summary={frameSummary} help="framing" info="Shape and size of the output. Fill crops into the picture (drag the box on the player); fit keeps the whole picture over a blurred copy. Trim removes black bars.">{formatSection}</Group>
        <Group title="Look" summary={`${lookSummary}${p.mode === 'range' && motionSummary !== 'none' ? ` · ${motionSummary}` : ''}`} help="motion" info="Colour and motion. Grades are film looks; vivid boosts saturation; HDR look adds crunchy local contrast. Punch-ins are quick zooms and shakes are camera jolts at moments you mark.">
          {lookSection}{p.mode === 'range' && markersSection}
        </Group>
        <Group title="Captions" summary={capSummary} help="captions" info="Burns word-timed captions from the transcript, or hand-typed ones.">{captionsSection}</Group>
        <Group title="Sound" summary={soundSummary} help="sound" info="A looped music bed under the original audio, optionally ducked under speech; one-shot sound effects; loudness normalised to -14 LUFS.">{soundSection}</Group>
        <Group title="Brand" summary={brandSummary} help="ai" info="A PNG logo or handle overlaid on every render.">{brandSection}</Group>
        {msg && <p className="muted small">{msg}</p>}
        {p.mode === 'range' && renderBar}
        <p className="muted small">Prefer one thing at a time? More → Edit tab → Step by step.</p>
      </div>
    )
  }

  // ================= step flow =================
  const st = steps[idx]
  return (
    <div className="stack">
      <div className="stepper" role="tablist" aria-label="Edit steps">
        {steps.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={x.id === effectiveStep} className={`step-btn ${x.id === effectiveStep ? 'active' : ''} ${done[x.id] ? 'done' : ''}`} onClick={() => setStep(x.id)} title={x.blurb}>
            <span className="step-n">{done[x.id] ? '✓' : i + 1}</span><span className="step-t">{x.title}</span>
          </button>
        ))}
      </div>
      <div className="step-head">
        <h3>{idx + 1}. {st.title}</h3>
        <span className="muted small grow">{st.blurb}</span>
        <Link to={`/help#${st.help}`} className="btn small" title="Open the guide for this step">? guide</Link>
      </div>
      {p.tweakingClip && <p className="chip accent" style={{ alignSelf: 'flex-start' }}>Tweaking a clip — Render replaces its file</p>}

      {effectiveStep === 'cut' && (
        <div className="stack" style={{ gap: 8 }}>
          {showHelp && (
            <div className="edit-help row" style={{ justifyContent: 'space-between' }}>
              <span className="small">Pick what to keep here, then <strong>Next</strong>. Every later step is optional — skip straight to <strong>Render</strong> if the defaults are fine. A recipe fills every step at once.</span>
              <button className="btn small" onClick={closeHelp}>Got it</button>
            </div>
          )}
          {modeRow}
          {p.mode === 'range' ? rangeRow : montage('cut')}
          <div className="row wrap">
            <span className="muted small">Have a saved look?</span>
            <select value={p.recipeId ?? ''} onChange={(e) => applyRecipe(e.target.value)} aria-label="Recipe">
              <option value="">— pick a recipe —</option>
              {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.auto_apply ? ' (auto)' : ''}</option>)}
            </select>
            <button className="btn small" onClick={() => setStep('render')}>Skip to Render</button>
          </div>
        </div>
      )}
      {effectiveStep === 'frame' && <div className="stack" style={{ gap: 8 }}>{formatSection}</div>}
      {effectiveStep === 'motion' && <div className="stack" style={{ gap: 8 }}>{p.mode === 'range' ? <>{playbackRow}{markersSection}</> : montage('motion')}</div>}
      {effectiveStep === 'transitions' && montage('transitions')}
      {effectiveStep === 'look' && <div className="stack" style={{ gap: 8 }}>{lookSection}</div>}
      {effectiveStep === 'captions' && <div className="stack" style={{ gap: 8 }}>{captionsSection}</div>}
      {effectiveStep === 'sound' && <div className="stack" style={{ gap: 8 }}>{soundSection}</div>}
      {effectiveStep === 'brand' && <div className="stack" style={{ gap: 8 }}>{brandSection}</div>}
      {effectiveStep === 'render' && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="render-summary">
            {steps.filter((x) => x.id !== 'render').map((x) => (
              <div key={x.id} className="row">
                <strong style={{ width: 90 }}>{x.title}</strong>
                <span className="muted small grow">{summaries[x.id]}</span>
                <button className="btn small" onClick={() => setStep(x.id)}>Edit</button>
              </div>
            ))}
          </div>
          {recipeRow}
          {p.mode === 'range' ? renderBar : montage('render')}
        </div>
      )}

      {msg && <p className="muted small">{msg}</p>}
      <div className="step-nav">
        <button className="btn" onClick={() => go(-1)} disabled={idx === 0}>← {idx > 0 ? steps[idx - 1].title : 'Back'}</button>
        {idx < steps.length - 1
          ? <button className="btn accent" onClick={() => go(1)}>{steps[idx + 1].title} →</button>
          : <span className="muted small">last step</span>}
      </div>
    </div>
  )
}
