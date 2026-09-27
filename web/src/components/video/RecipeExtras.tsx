import { useEffect, useState } from 'react'
import { listMusic, listOverlays, uploadOverlay } from '../../lib/api'
import type { RenderSettings, SfxLayer, ZoomMarker } from '../../lib/settings'
import { duration } from '../../lib/format'

interface Props {
  settings: RenderSettings
  onChange: (s: RenderSettings) => void
  currentTime: () => number   // playhead, absolute seconds
  clipStart: number           // markers/sfx are relative to the clip start
}

/** Phase 3 recipe extras: watermark, SFX layers, punch-in zoom markers. */
export default function RecipeExtras({ settings: s, onChange, currentTime, clipStart }: Props) {
  const [overlays, setOverlays] = useState<string[]>([])
  const [music, setMusic] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    listOverlays().then(setOverlays).catch(() => setOverlays([]))
    listMusic().then(setMusic).catch(() => setMusic([]))
  }, [])

  const rel = () => Math.max(0, Math.round((currentTime() - clipStart) * 10) / 10)
  const wm = s.watermark
  const setWm = (patch: Partial<NonNullable<RenderSettings['watermark']>> | null) =>
    onChange({ ...s, watermark: patch === null ? null : { file: '', position: 'top_right', scale: 0.15, opacity: 0.85, margin: 0.03, ...(wm ?? {}), ...patch } })
  const setSfx = (list: SfxLayer[]) => onChange({ ...s, sfx: list })
  const setMarkers = (list: ZoomMarker[]) => onChange({ ...s, zoom_markers: list })
  const onPickOverlay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const r = await uploadOverlay(f)
      setOverlays(await listOverlays())
      setWm({ file: r.name })
      setMsg(`Added overlay "${r.name}".`)
    } catch (err) { setMsg((err as Error).message) }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        <span className="muted small">Watermark</span>
        <select value={wm?.file ?? ''} onChange={(e) => (e.target.value ? setWm({ file: e.target.value }) : setWm(null))} aria-label="Watermark image">
          <option value="">None</option>
          {overlays.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label className="btn small">Add PNG<input type="file" accept=".png,.webp,image/png,image/webp" onChange={(e) => void onPickOverlay(e)} hidden /></label>
        {wm?.file && (
          <>
            <select value={wm.position} onChange={(e) => setWm({ position: e.target.value as NonNullable<RenderSettings['watermark']>['position'] })} aria-label="Watermark position">
              <option value="top_left">Top left</option>
              <option value="top_center">Top centre</option>
              <option value="top_right">Top right</option>
              <option value="bottom_left">Bottom left</option>
              <option value="bottom_center">Bottom centre</option>
              <option value="bottom_right">Bottom right</option>
            </select>
            <label className="slider"><span className="muted small">Size</span>
              <input type="range" min={3} max={60} step={1} value={Math.round(wm.scale * 100)} onChange={(e) => setWm({ scale: Number(e.target.value) / 100 })} />
              <span className="mono small">{Math.round(wm.scale * 100)}%</span></label>
            <label className="slider"><span className="muted small">Opacity</span>
              <input type="range" min={5} max={100} step={5} value={Math.round(wm.opacity * 100)} onChange={(e) => setWm({ opacity: Number(e.target.value) / 100 })} />
              <span className="mono small">{Math.round(wm.opacity * 100)}</span></label>
          </>
        )}
      </div>

      <div className="row wrap">
        <span className="muted small">Punch-in zooms</span>
        <button className="btn small" onClick={() => setMarkers([...s.zoom_markers, { at: rel(), duration: 0.5, zoom: 1.15 }].sort((a, b) => a.at - b.at))}>Add at playhead</button>
        {s.zoom_markers.length > 0 && <button className="btn small" onClick={() => setMarkers([])}>Clear</button>}
      </div>
      {s.zoom_markers.length > 0 && (
        <div className="marker-list">
          {s.zoom_markers.map((m, i) => (
            <div key={i} className="row wrap small">
              <span className="mono muted">{duration(clipStart + m.at)}</span>
              <label className="num"><input type="text" inputMode="decimal" value={m.at} onChange={(e) => setMarkers(s.zoom_markers.map((x, j) => (j === i ? { ...x, at: Number(e.target.value) || 0 } : x)))} aria-label="Seconds from clip start" /> s in</label>
              <label className="num"><input type="text" inputMode="decimal" value={m.duration} onChange={(e) => setMarkers(s.zoom_markers.map((x, j) => (j === i ? { ...x, duration: Number(e.target.value) || 0.5 } : x)))} aria-label="Duration" /> s long</label>
              <label className="slider"><span className="muted small">zoom</span>
                <input type="range" min={105} max={200} step={5} value={Math.round(m.zoom * 100)} onChange={(e) => setMarkers(s.zoom_markers.map((x, j) => (j === i ? { ...x, zoom: Number(e.target.value) / 100 } : x)))} />
                <span className="mono small">{m.zoom.toFixed(2)}×</span></label>
              <button className="btn small" onClick={() => setMarkers(s.zoom_markers.filter((_, j) => j !== i))} aria-label="Remove marker">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="row wrap">
        <span className="muted small">Sound effects</span>
        <button className="btn small" disabled={!music.length} title={music.length ? 'Drop a sound at the playhead' : 'Upload audio under Music first'}
                onClick={() => setSfx([...s.sfx, { file: music[0], at: rel(), gain: 80 }])}>Add at playhead</button>
        {s.sfx.length > 0 && <button className="btn small" onClick={() => setSfx([])}>Clear</button>}
      </div>
      {s.sfx.length > 0 && (
        <div className="marker-list">
          {s.sfx.map((l, i) => (
            <div key={i} className="row wrap small">
              <select value={l.file} onChange={(e) => setSfx(s.sfx.map((x, j) => (j === i ? { ...x, file: e.target.value } : x)))} aria-label="Sound file">
                {music.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <label className="num"><input type="text" inputMode="decimal" value={l.at} onChange={(e) => setSfx(s.sfx.map((x, j) => (j === i ? { ...x, at: Number(e.target.value) || 0 } : x)))} aria-label="Seconds from clip start" /> s in</label>
              <label className="slider"><span className="muted small">vol</span>
                <input type="range" min={0} max={100} step={5} value={l.gain} onChange={(e) => setSfx(s.sfx.map((x, j) => (j === i ? { ...x, gain: Number(e.target.value) } : x)))} />
                <span className="mono small">{l.gain}</span></label>
              <button className="btn small" onClick={() => setSfx(s.sfx.filter((_, j) => j !== i))} aria-label="Remove sound">✕</button>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="muted small">{msg}</p>}
    </div>
  )
}
