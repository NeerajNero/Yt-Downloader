import { useMutation, useSubscription } from '@apollo/client'
import { useEffect, useState } from 'react'
import { DeleteRecipeDocument, InsertRecipeDocument, RecipesDocument, UpdateRecipeDocument, type VideoDetailSubscription } from '../../../gql/generated'
import { listMusic, listOverlays, uploadMusic, uploadOverlay, type ManualCaptions } from '../../../lib/api'
import { duration } from '../../../lib/format'
import { fromStored, summarize, type RenderSettings, type SfxLayer, type ZoomMarker } from '../../../lib/settings'
import Group from '../../ui/Group'
import CaptionEditor from '../CaptionEditor'
import Montage, { type Plan, type Transition } from '../Montage'

type Video = NonNullable<VideoDetailSubscription['videos_by_pk']>
type Job = Video['jobs'][number]

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
  onRenderSequence: (segments: { start: number; end: number; speed: number; zoom_markers: ZoomMarker[] }[], transition: Transition) => void
  onMontageShots: (shots: { start: number; end: number; active?: boolean }[] | null) => void
  tweakingClip: string | null
}

function TimeInput({ value, onCommit, label }: { value: number; onCommit: (v: number) => void; label: string }) {
  const [text, setText] = useState(duration(value))
  useEffect(() => setText(duration(value)), [value])
  const commit = () => {
    const t = text.trim()
    const secs = /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : t.split(':').reduce((a, n) => a * 60 + Number(n), 0)
    if (!Number.isNaN(secs)) onCommit(secs)
    else setText(duration(value))
  }
  return <input type="text" inputMode="decimal" value={text} aria-label={label} onChange={(e) => setText(e.target.value)}
                onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ width: 64 }} />
}

/** Step 3: the export, as collapsible groups with live summaries and a sticky Render bar. */
export default function EditPanel(p: Props) {
  const s = p.settings
  const set = <K extends keyof RenderSettings>(k: K, v: RenderSettings[K]) => p.onChange({ ...s, [k]: v })
  const { data: recipeData } = useSubscription(RecipesDocument)
  const recipes = recipeData?.recipes ?? []
  const [insertRecipe] = useMutation(InsertRecipeDocument)
  const [updateRecipe] = useMutation(UpdateRecipeDocument)
  const [deleteRecipe] = useMutation(DeleteRecipeDocument)
  const current = recipes.find((r) => r.id === p.recipeId) ?? null
  const [music, setMusic] = useState<string[]>([])
  const [overlays, setOverlays] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const ready = p.video.status === 'ready'
  useEffect(() => {
    listMusic().then(setMusic).catch(() => setMusic([]))
    listOverlays().then(setOverlays).catch(() => setOverlays([]))
  }, [])

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
        await updateRecipe({ variables: { id: existing.id, name, description: existing.description, settings: s, auto_apply: existing.auto_apply } })
        p.onRecipe(existing.id); setMsg(`Updated "${name}".`)
      } else {
        const r = await insertRecipe({ variables: { name, description: null, settings: s, auto_apply: false } })
        p.onRecipe(r.data?.insert_recipes_one?.id ?? null); setMsg(`Saved "${name}". Auto-apply it under More → Recipes.`)
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

  // ---- summaries ----
  const whatSummary = p.mode === 'montage' ? 'montage (several shots)' : `${duration(p.range.start)} → ${duration(p.range.end)} · ${duration(p.range.end - p.range.start)}`
  const formatSummary = [s.orientation === 'landscape' ? '16:9' : '9:16', s.resolution === '4k' ? '4K' : '1080p', s.style === 'blur' ? 'blur pad' : 'crop',
    s.rotate !== 'none' ? `rotate ${s.rotate}` : '', s.trim_x || s.trim_y ? `trim ${s.trim_y}/${s.trim_x}%` : ''].filter(Boolean).join(' · ')
  const lookSummary = [s.grade !== 'none' ? s.grade.replace('_', ' & ') : 'natural', s.vivid_amount ? `vivid ${s.vivid_amount}` : '', s.look === 'hdr' ? 'HDR look' : '',
    s.zoom === 'in' ? 'slow zoom' : '', s.zoom_markers.length ? `${s.zoom_markers.length} punch-in${s.zoom_markers.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  const capSummary = s.captions ? `${s.caption_style} · ${s.caption_pos}${s.caption_source === 'manual' ? ' · manual' : ''}` : 'off'
  const soundSummary = [s.music ? `music ${s.music}${s.duck ? ' (ducked)' : ''}` : 'original audio', s.sfx.length ? `${s.sfx.length} sfx` : '', s.loudness ? '-14 LUFS' : ''].filter(Boolean).join(' · ')
  const brandSummary = wm?.file ? `${wm.file} · ${wm.position.replace('_', ' ')}` : 'no watermark'

  return (
    <div className="stack">
      <div className="row wrap">
        <span className="muted small">Recipe</span>
        <select value={p.recipeId ?? ''} onChange={(e) => applyRecipe(e.target.value)} aria-label="Recipe" className="grow">
          <option value="">— pick a saved look —</option>
          {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.auto_apply ? ' (auto)' : ''}</option>)}
        </select>
        <button className="btn small" onClick={() => void saveRecipe()}>Save look</button>
        {current && <button className="btn small" onClick={() => window.confirm(`Delete recipe "${current.name}"?`) && void deleteRecipe({ variables: { id: current.id } }).then(() => p.onRecipe(null))}>Delete</button>}
      </div>
      {p.tweakingClip && <p className="chip accent" style={{ alignSelf: 'flex-start' }}>Tweaking a clip — Render replaces its file</p>}

      <Group title="What" summary={whatSummary} open
             info="A single range renders one continuous piece. Montage assembles several shots with transitions, speed changes and punch-ins.">
        <div className="row wrap">
          <label className={`choice-pill ${p.mode === 'range' ? 'active' : ''}`}><input type="radio" checked={p.mode === 'range'} onChange={() => p.onMode('range')} /> One range</label>
          <label className={`choice-pill ${p.mode === 'montage' ? 'active' : ''}`}><input type="radio" checked={p.mode === 'montage'} onChange={() => p.onMode('montage')} /> Montage</label>
        </div>
        {p.mode === 'range' ? (
          <div className="row wrap">
            <span className="muted small">from</span>
            <TimeInput value={p.range.start} label="Clip start" onCommit={(v) => p.onRange({ start: v, end: Math.max(p.range.end, v + 0.5) })} />
            <button className="btn small" onClick={() => p.onRange({ start: p.playhead(), end: Math.max(p.range.end, p.playhead() + 0.5) })}>◀ playhead</button>
            <span className="muted small">to</span>
            <TimeInput value={p.range.end} label="Clip end" onCommit={(v) => p.onRange({ start: Math.min(p.range.start, v - 0.5), end: v })} />
            <button className="btn small" onClick={() => p.onRange({ start: Math.min(p.range.start, p.playhead() - 0.5), end: p.playhead() })}>playhead ▶</button>
            <span className="muted small">or drag the handles on the timeline</span>
          </div>
        ) : (
          <Montage video={p.video} plan={p.plan} scenes={p.scenes} clipPack={p.clipPack} rangeStart={p.range.start} rangeEnd={p.range.end}
                   seek={p.seek} onRender={p.onRenderSequence} disabled={!ready} onShotsChange={p.onMontageShots}
                   onApplyPlanLook={(pl) => p.onChange({ ...s, captions: pl.captions, caption_style: pl.caption_style as RenderSettings['caption_style'],
                                                          caption_pos: pl.caption_pos as RenderSettings['caption_pos'], grade: pl.grade as RenderSettings['grade'], vivid_amount: pl.vivid })} />
        )}
      </Group>

      <Group title="Format" summary={formatSummary}
             info="Shape and size of the output. Crop fills the frame with the middle of the picture; blur pad keeps the whole picture over a blurred copy. Trim removes black bars.">
        <div className="row wrap">
          <select value={s.orientation} onChange={(e) => set('orientation', e.target.value as RenderSettings['orientation'])} aria-label="Orientation">
            <option value="portrait">Portrait 9:16 (Shorts)</option><option value="landscape">Landscape 16:9</option>
          </select>
          <select value={s.resolution} onChange={(e) => set('resolution', e.target.value as RenderSettings['resolution'])} aria-label="Resolution">
            <option value="1080">1080p</option><option value="4k">4K (slow)</option>
          </select>
          <select value={s.style} onChange={(e) => set('style', e.target.value as RenderSettings['style'])} aria-label="Framing">
            <option value="crop">Fill (centre crop)</option><option value="blur">Fit on blurred pad</option>
          </select>
          <select value={s.rotate} onChange={(e) => set('rotate', e.target.value as RenderSettings['rotate'])} aria-label="Rotate">
            <option value="none">No rotation</option><option value="right">Rotate 90° ↻</option><option value="left">Rotate 90° ↺</option><option value="180">Rotate 180°</option>
          </select>
          {s.style === 'blur' && <label className="num"><input type="text" inputMode="decimal" value={s.fg_crop} onChange={(e) => set('fg_crop', num(e.target.value))} aria-label="Crop video sides" /> % crop sides</label>}
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
      </Group>

      <Group title="Look" summary={lookSummary}
             info="Colour and motion. Grades are film looks; vivid boosts saturation; HDR look adds crunchy local contrast. Punch-ins are quick zooms at moments you mark.">
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
      </Group>

      <Group title="Captions" summary={capSummary}
             info="Burns word-timed captions from the transcript, or hand-typed ones. Karaoke fills the spoken word amber; pop bounces bold words; typewriter reveals; minimal is small and quiet.">
        <div className="row wrap">
          <label className="check" title={p.hasTranscript || p.manual?.items.length ? '' : 'Run Prepare → Transcript, or type captions below'}>
            <input type="checkbox" checked={s.captions} disabled={!p.hasTranscript && !p.manual?.items.length} onChange={(e) => set('captions', e.target.checked)} /> Burn captions
          </label>
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
      </Group>

      <Group title="Sound" summary={soundSummary}
             info="A looped music bed under the original audio, optionally ducked under speech; one-shot sound effects at moments you mark; loudness normalised to the -14 LUFS platforms expect.">
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
      </Group>

      <Group title="Brand" summary={brandSummary} info="A PNG logo or handle overlaid on every render.">
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
      </Group>

      {msg && <p className="muted small">{msg}</p>}
      {p.mode === 'range' && (
        <div className="render-bar">
          <span className="small grow">{summarize(s)}</span>
          <button className="btn accent" onClick={p.onRender} disabled={!ready}>{p.tweakingClip ? 'Re-render clip' : 'Render'}</button>
        </div>
      )}
    </div>
  )
}
