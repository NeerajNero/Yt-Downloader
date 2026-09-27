import { useEffect, useState } from 'react'
import { listMusic, uploadMusic } from '../../lib/api'
import { DEFAULT_SETTINGS, loadPresets, savePresets, type RenderSettings } from '../../lib/settings'

interface Props {
  settings: RenderSettings
  onChange: (s: RenderSettings) => void
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
  onMarkStart: () => void
  onMarkEnd: () => void
  hasTranscript: boolean
  hasManual: boolean
  borders: { trim_x: number; trim_y: number } | null
  onDetectBars: () => void
  detectingBars: boolean
  previewCaps: boolean
  onPreviewCaps: (v: boolean) => void
  onExport: () => void
  disabled: boolean
}

export default function ExportControls(p: Props) {
  const s = p.settings
  const set = <K extends keyof RenderSettings>(k: K, v: RenderSettings[K]) => p.onChange({ ...s, [k]: v })
  const [presets, setPresets] = useState<Record<string, RenderSettings>>({})
  const [presetName, setPresetName] = useState('')
  const [music, setMusic] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setPresets(loadPresets())
    listMusic().then(setMusic).catch(() => setMusic([]))
  }, [])

  const applyPreset = (name: string) => {
    setPresetName(name)
    if (presets[name]) p.onChange({ ...DEFAULT_SETTINGS, ...presets[name] })
  }
  const savePreset = () => {
    const name = window.prompt('Preset name:', presetName || 'My preset')?.trim()
    if (!name) return
    const next = { ...presets, [name]: s }
    setPresets(next); savePresets(next); setPresetName(name)
  }
  const deletePreset = () => {
    if (!presetName) return
    const next = { ...presets }
    delete next[presetName]
    setPresets(next); savePresets(next); setPresetName('')
  }
  const onPickMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const r = await uploadMusic(f)
      setMusic(await listMusic())
      set('music', r.name)
      setMsg(`Added music "${r.name}".`)
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="stack export">
      <div className="row wrap">
        <span className="muted small">Preset</span>
        <select value={presetName} onChange={(e) => applyPreset(e.target.value)} aria-label="Export preset">
          <option value="">— none —</option>
          {Object.keys(presets).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn small" onClick={savePreset}>Save preset</button>
        {presetName && presets[presetName] && <button className="btn small" onClick={deletePreset}>Delete</button>}
      </div>

      <div className="row wrap">
        <span className="muted small">{s.orientation === 'landscape' ? '16:9 clip' : '9:16 clip'}</span>
        <div className="time-field">
          <input type="text" value={p.start} onChange={(e) => p.onStart(e.target.value)} aria-label="Clip start" inputMode="decimal" />
          <button className="btn small" onClick={p.onMarkStart}>Set start</button>
        </div>
        <div className="time-field">
          <input type="text" value={p.end} onChange={(e) => p.onEnd(e.target.value)} aria-label="Clip end" inputMode="decimal" />
          <button className="btn small" onClick={p.onMarkEnd}>Set end</button>
        </div>
      </div>

      <div className="row wrap">
        <select value={s.orientation} onChange={(e) => set('orientation', e.target.value as RenderSettings['orientation'])} aria-label="Orientation">
          <option value="portrait">Portrait 9:16</option>
          <option value="landscape">Landscape 16:9</option>
        </select>
        <select value={s.rotate} onChange={(e) => set('rotate', e.target.value as RenderSettings['rotate'])} aria-label="Rotate video">
          <option value="none">No rotation</option>
          <option value="right">Rotate 90° ↻</option>
          <option value="left">Rotate 90° ↺</option>
          <option value="180">Rotate 180°</option>
        </select>
        <select value={s.style} onChange={(e) => set('style', e.target.value as RenderSettings['style'])} aria-label="Style">
          <option value="blur">Blurred pad</option>
          <option value="crop">Center crop</option>
        </select>
        <select value={s.resolution} onChange={(e) => set('resolution', e.target.value as RenderSettings['resolution'])} aria-label="Resolution">
          <option value="1080">1080p</option>
          <option value="4k">4K</option>
        </select>
        <select value={s.zoom} onChange={(e) => set('zoom', e.target.value as RenderSettings['zoom'])} aria-label="Auto zoom">
          <option value="none">No zoom</option>
          <option value="in">Punch-in ⤢</option>
        </select>
        <select value={s.grade} onChange={(e) => set('grade', e.target.value as RenderSettings['grade'])} aria-label="Colour grade">
          <option value="none">No grade</option>
          <option value="teal_orange">Teal & orange</option>
          <option value="moody">Moody</option>
          <option value="warm">Warm film</option>
          <option value="cool">Cool</option>
          <option value="bw">Black & white</option>
        </select>
      </div>

      <div className="row wrap">
        <label className="check"><input type="checkbox" checked={s.look === 'hdr'} onChange={(e) => set('look', e.target.checked ? 'hdr' : 'none')} /> HDR look</label>
        {s.look === 'hdr' && (
          <label className="slider"><span className="muted small">Sharp</span>
            <input type="range" min={0} max={100} step={5} value={s.look_sharp} onChange={(e) => set('look_sharp', Number(e.target.value))} />
            <span className="mono small">{s.look_sharp}</span></label>
        )}
        <label className="slider"><span className="muted small">Vivid</span>
          <input type="range" min={0} max={100} step={5} value={s.vivid_amount} onChange={(e) => set('vivid_amount', Number(e.target.value))} />
          <span className="mono small">{s.vivid_amount}</span></label>
        <label className="check"><input type="checkbox" checked={s.loudness} onChange={(e) => set('loudness', e.target.checked)} /> Normalize audio</label>
      </div>

      <div className="row wrap">
        <span className="muted small">Trim bars</span>
        <label className="num"><input type="text" inputMode="decimal" value={s.trim_y} onChange={(e) => set('trim_y', num(e.target.value))} aria-label="Trim top and bottom percent" /> % top/bottom</label>
        <label className="num"><input type="text" inputMode="decimal" value={s.trim_x} onChange={(e) => set('trim_x', num(e.target.value))} aria-label="Trim sides percent" /> % sides</label>
        <button className="btn small" onClick={p.onDetectBars} disabled={p.detectingBars}>{p.detectingBars ? 'Measuring…' : 'Auto-detect'}</button>
        {p.borders && (p.borders.trim_x || p.borders.trim_y) ? (
          <button className="btn small" onClick={() => p.onChange({ ...s, trim_x: p.borders!.trim_x, trim_y: p.borders!.trim_y })}>
            Use {p.borders.trim_y}% / {p.borders.trim_x}%
          </button>
        ) : p.borders ? <span className="muted small">no bars found</span> : null}
        {s.style === 'blur' && (
          <label className="num"><input type="text" inputMode="decimal" value={s.fg_crop} onChange={(e) => set('fg_crop', num(e.target.value))} aria-label="Crop video sides percent" /> % crop video</label>
        )}
      </div>

      <div className="row wrap">
        <label className="check" title={p.hasTranscript || p.hasManual ? 'Burn captions into the clip' : 'Run Transcribe or add manual captions first'}>
          <input type="checkbox" checked={s.captions} disabled={!p.hasTranscript && !p.hasManual} onChange={(e) => set('captions', e.target.checked)} /> Captions
        </label>
        {s.captions && (
          <>
            <select value={s.caption_source} onChange={(e) => set('caption_source', e.target.value as RenderSettings['caption_source'])} aria-label="Caption source">
              <option value="auto" disabled={!p.hasTranscript}>Auto (transcript)</option>
              <option value="manual" disabled={!p.hasManual}>Manual</option>
            </select>
            <select value={s.caption_style} onChange={(e) => set('caption_style', e.target.value as RenderSettings['caption_style'])} aria-label="Caption style">
              <option value="karaoke">Karaoke</option>
              <option value="typewriter">Typewriter</option>
              <option value="pop">Pop</option>
              <option value="minimal">Minimal</option>
            </select>
            <select value={s.caption_pos} onChange={(e) => set('caption_pos', e.target.value as RenderSettings['caption_pos'])} aria-label="Caption position">
              <option value="bottom">Bottom</option>
              <option value="middle">Middle</option>
              <option value="top">Top</option>
            </select>
            {s.rotate !== 'none' && (
              <label className="check"><input type="checkbox" checked={s.rotate_captions} onChange={(e) => set('rotate_captions', e.target.checked)} /> Rotate captions too</label>
            )}
            <label className="check"><input type="checkbox" checked={p.previewCaps} onChange={(e) => p.onPreviewCaps(e.target.checked)} /> Preview on video</label>
          </>
        )}
      </div>

      <div className="row wrap">
        <span className="muted small">Music</span>
        <select value={s.music} onChange={(e) => set('music', e.target.value)} aria-label="Background music">
          <option value="">None</option>
          {music.map((m) => <option key={m} value={m}>{m}</option>)}
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
      </div>

      <div className="row">
        <button className="btn accent" onClick={p.onExport} disabled={p.disabled}>Export clip</button>
        {msg && <span className="muted small">{msg}</span>}
      </div>
    </div>
  )
}
