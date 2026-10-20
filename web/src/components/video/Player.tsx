import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ManualCaptions, Transcript } from '../../lib/api'
import { CANVAS, SAFE_AREA, fitFor, hookWindow, hpStroke, payoffWindow } from '../../lib/captions'

export interface CropProps {
  style: 'crop' | 'blur'
  orientation: 'portrait' | 'landscape'
  fg_crop: number
  trim_x: number
  trim_y: number
  x: number       // 0..1 window position
  y: number
  zoom: number    // 1..3
  onChange: (c: { x: number; y: number; zoom: number }) => void
}

/** The framing that decides where the output frame sits on the picture (CropProps without the drag callback). */
export type FrameProps = Omit<CropProps, 'onChange'>

/** Hook / payoff as they will be burned: texts, where the player is in output time, and the timing inputs. */
export interface CaptionPreviewProps {
  hook: string | null
  payoff: string | null
  outTime: number | null       // the player's position in output seconds; null = outside the clip
  durationOut: number
  peakOut: number | null
  style: string                // caption preset
  orientation: string          // the canvas captions are built on
}

interface Props {
  src: string | null
  nowTime: number
  onTime: (t: number) => void
  onError: () => void
  captions: { enabled: boolean; source: 'auto' | 'manual'; pos: string; style: string }
  transcript: Transcript | null
  manual: ManualCaptions | null
  big?: boolean            // taller player (the Frame step)
  crop?: CropProps | null  // draggable crop window over the picture
  frame?: FrameProps | null          // output frame for the overlays below (Edit)
  safeArea?: boolean                 // shade the off-limits bands + subject zone (docs/PLAYBOOK.md)
  captionPreview?: CaptionPreviewProps | null
  /** Draft preview (540 px render of the current settings): when `mode` is 'preview' the player plays
   *  `url` instead of the source and every overlay is hidden (they are burned in). Time is reported
   *  through `toSource` so the timeline and markers stay in source seconds. */
  preview?: { url: string | null; mode: 'source' | 'preview'; onMode: (m: 'source' | 'preview') => void; pending: boolean; stale: boolean
              toSource: (t: number) => number; onLoaded?: () => void; message?: string | null } | null
}

/** The off-limits bands and the subject zone, in percent of whatever box they sit in. */
export function SafeBands() {
  const t = SAFE_AREA.top * 100, b = SAFE_AREA.bottom * 100, l = SAFE_AREA.left * 100, r = SAFE_AREA.right * 100
  return (
    <>
      <div className="safe-band" style={{ left: 0, right: 0, top: 0, height: `${t}%` }} />
      <div className="safe-band" style={{ left: 0, right: 0, bottom: 0, height: `${b}%` }} />
      <div className="safe-band" style={{ left: 0, width: `${l}%`, top: `${t}%`, bottom: `${b}%` }} />
      <div className="safe-band" style={{ right: 0, width: `${r}%`, top: `${t}%`, bottom: `${b}%` }} />
      <div className="safe-zone" style={{ left: '20%', top: '20%', width: '60%', height: '60%' }} title="keep the subject inside" />
    </>
  )
}

/** The output frame on the element: the crop window (Fill), or the target-aspect canvas that
 *  contains the fitted picture (Fit on blurred pad), scaled into element pixels. */
export function outputRect(f: FrameProps, vw: number, vh: number, scale: number, ox: number, oy: number) {
  const win = cropWindow({ ...f, onChange: () => {} }, vw, vh)
  const ar = f.orientation === 'portrait' ? 9 / 16 : 16 / 9
  let { x, y, w, h } = win
  if (f.style === 'blur') {
    if (w / h > ar) { const ch = w / ar; y -= (ch - h) / 2; h = ch } else { const cw = h * ar; x -= (cw - w) / 2; w = cw }
  }
  return { left: ox + x * scale, top: oy + y * scale, width: w * scale, height: h * scale }
}

/** Hook / payoff drawn like their ASS events: Hook top-centre at the top safe edge, Payoff centred,
 *  the fit mirror's font size scaled by preview px / PlayRes px, stroke and shadow in CSS. */
function CaptionOverlay({ p, k }: { p: CaptionPreviewProps; k: number }) {
  if (p.outTime == null) return null
  const stroke = hpStroke(p.style)
  const block = (kind: 'hook' | 'payoff', text: string | null, win: { start: number; end: number } | null) => {
    const t = (text ?? '').trim()
    if (!t || !win || p.outTime! < win.start || p.outTime! >= win.end) return null
    const fit = fitFor(t, kind, p.style, p.orientation)
    const px = fit.size * k
    return (
      <div className={`cap-hp ${kind}`} style={{ fontSize: `${px.toFixed(1)}px`, WebkitTextStroke: `${(stroke.outline * k).toFixed(2)}px #101317`,
                                                textShadow: `${(stroke.shadow * k).toFixed(2)}px ${(stroke.shadow * k).toFixed(2)}px 0 rgba(16,19,23,0.6)` }}>
        {fit.lines.map((l, i) => <div key={i}>{l}</div>)}
        {!fit.fits && <span className="cap-badge" style={{ fontSize: `${Math.max(9, 11 * k * 3).toFixed(1)}px` }}>{fit.lines.length} lines</span>}
      </div>
    )
  }
  return (
    <>
      {block('hook', p.hook, hookWindow(p.peakOut, p.durationOut))}
      {block('payoff', p.payoff, payoffWindow(p.peakOut, p.durationOut))}
    </>
  )
}

/** Group transcript words into ~4-word lines, matching the server's ASS writer. */
function buildLines(transcript: Transcript | null) {
  if (!transcript) return []
  const words = transcript.segments.flatMap((s) => s.words)
  const lines: { start: number; end: number; words: typeof words }[] = []
  let g: typeof words = []
  for (const w of words) {
    if (g.length && (g.length >= 4 || w.s - g[g.length - 1].e > 0.8)) {
      lines.push({ start: g[0].s, end: g[g.length - 1].e, words: g })
      g = []
    }
    g.push(w)
  }
  if (g.length) lines.push({ start: g[0].s, end: g[g.length - 1].e, words: g })
  return lines
}

/** The crop window in source pixels, mirroring studio/core/render.py: trim the
 *  bars, then a window of the target aspect (crop style) or the whole trimmed
 *  picture (blur style), divided by zoom and placed at (x, y). */
export function cropWindow(c: CropProps, W: number, H: number) {
  const tx = W * c.trim_x / 100, ty = H * c.trim_y / 100
  const Wt = W - 2 * tx, Ht = H - 2 * ty
  const ar = c.orientation === 'portrait' ? 9 / 16 : 16 / 9
  let w: number, h: number, x: number, y: number
  if (c.style === 'crop') {
    w = Math.min(Wt, Ht * ar) / c.zoom; h = Math.min(Ht, Wt / ar) / c.zoom
    x = tx + (Wt - w) * c.x; y = ty + (Ht - h) * c.y
  } else {
    // pad: a window of the picture's own aspect (zoom), then fg_crop trims its sides
    const wz = Wt / c.zoom, hz = Ht / c.zoom
    const xz = tx + (Wt - wz) * c.x, yz = ty + (Ht - hz) * c.y
    w = wz * (100 - 2 * c.fg_crop) / 100; h = hz
    x = xz + wz * c.fg_crop / 100; y = yz
  }
  return { x, y, w, h, Wt, Ht, tx, ty }
}

const Player = forwardRef<HTMLVideoElement, Props>(function Player(
  { src, nowTime, onTime, onError, captions, transcript, manual, big, crop, frame, safeArea, captionPreview, preview }, ref,
) {
  const inPreview = Boolean(preview && preview.mode === 'preview' && preview.url)
  const playSrc = inPreview ? preview!.url : src
  if (inPreview) { crop = null; frame = null; safeArea = false; captionPreview = null; captions = { ...captions, enabled: false } }
  const lines = useMemo(() => buildLines(transcript), [transcript])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const setRefs = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el
  }, [ref])
  const [box, setBox] = useState<{ ew: number; eh: number; vw: number; vh: number } | null>(null)

  // Where the picture actually sits inside the (letterboxed) element.
  const needBox = crop != null || (frame != null && (safeArea || captionPreview != null))
  useEffect(() => {
    const el = videoRef.current
    if (!el || !needBox) return
    const measure = () => setBox({ ew: el.clientWidth, eh: el.clientHeight, vw: el.videoWidth, vh: el.videoHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('loadedmetadata', measure)
    return () => { ro.disconnect(); el.removeEventListener('loadedmetadata', measure) }
  }, [needBox, src]) // eslint-disable-line react-hooks/exhaustive-deps

  let overlay: React.ReactNode = null
  if (captions.enabled) {
    if (captions.source === 'manual' && manual) {
      const item = manual.items.find((i) => nowTime >= i.start && nowTime < i.start + i.duration)
      if (item) overlay = item.text
    } else {
      const line = lines.find((l) => nowTime >= l.start && nowTime < l.end)
      if (line) {
        overlay = line.words.map((w, i) => {
          const spoken = nowTime >= w.s
          const cur = spoken && nowTime < w.e
          const amber = captions.style === 'karaoke' ? spoken : cur
          return <span key={i} className={amber ? 'cap-w amber' : 'cap-w'}>{w.w} </span>
        })
      }
    }
  }

  // Crop window in element pixels.
  let cropBox: React.ReactNode = null
  if (crop && box && box.vw && box.vh) {
    const scale = Math.min(box.ew / box.vw, box.eh / box.vh)
    const pw = box.vw * scale, ph = box.vh * scale
    const ox = (box.ew - pw) / 2, oy = (box.eh - ph) / 2
    const win = cropWindow(crop, box.vw, box.vh)
    const left = ox + win.x * scale, top = oy + win.y * scale, width = win.w * scale, height = win.h * scale
    const movable = win.Wt - win.w > 1 || win.Ht - win.h > 1
    const drag = (e: React.PointerEvent) => {
      if (!movable) return
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const sx = e.clientX, sy = e.clientY, x0 = crop.x, y0 = crop.y
      const freeX = (win.Wt - win.w) * scale, freeY = (win.Ht - win.h) * scale
      const move = (ev: PointerEvent) => {
        const nx = freeX > 1 ? Math.max(0, Math.min(1, x0 + (ev.clientX - sx) / freeX)) : crop.x
        const ny = freeY > 1 ? Math.max(0, Math.min(1, y0 + (ev.clientY - sy) / freeY)) : crop.y
        crop.onChange({ x: Math.round(nx * 1000) / 1000, y: Math.round(ny * 1000) / 1000, zoom: crop.zoom })
      }
      const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up) }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', up)
    }
    const wheel = (e: React.WheelEvent) => {
      const z = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.05 : 1 / 1.05)))
      crop.onChange({ x: crop.x, y: crop.y, zoom: Math.round(z * 100) / 100 })
    }
    cropBox = (
      <div className="crop-layer" aria-hidden="true">
        <div className={`crop-box ${movable ? 'movable' : ''}`} style={{ left, top, width, height }} onPointerDown={drag} onWheel={wheel}>
          <span className="crop-tag">{crop.style === 'crop' ? (crop.orientation === 'portrait' ? '9:16' : '16:9') : 'picture'}{crop.zoom > 1 ? ` · ${crop.zoom.toFixed(2)}×` : ''}{movable ? ' · drag' : ''}</span>
        </div>
      </div>
    )
  }

  // Safe area + hook/payoff preview in output-frame coordinates.
  let frameLayer: React.ReactNode = null
  if (frame && (safeArea || captionPreview) && box && box.vw && box.vh) {
    const scale = Math.min(box.ew / box.vw, box.eh / box.vh)
    const pw = box.vw * scale, ph = box.vh * scale
    const rect = outputRect(frame, box.vw, box.vh, scale, (box.ew - pw) / 2, (box.eh - ph) / 2)
    const k = rect.width / CANVAS[frame.orientation][0]   // preview px per PlayRes px
    frameLayer = (
      <div className="frame-layer" aria-hidden="true">
        <div className="frame-box" style={rect}>
          {safeArea && <SafeBands />}
          {captionPreview && <CaptionOverlay p={captionPreview} k={k} />}
        </div>
      </div>
    )
  }

  const switcher = preview && (preview.url || preview.pending) ? (
    <div className="pv-bar">
      <div className="pv-switch" role="tablist" aria-label="Player source">
        <button role="tab" aria-selected={!inPreview} className={!inPreview ? 'active' : ''} onClick={() => preview.onMode('source')}>Source</button>
        <button role="tab" aria-selected={inPreview} className={inPreview ? 'active' : ''} disabled={!preview.url} onClick={() => preview.onMode('preview')}>Preview</button>
      </div>
      {preview.pending && <span className="pv-spinner" aria-label="Rendering preview" />}
      {inPreview && preview.stale && !preview.pending && <span className="pv-badge">preview out of date</span>}
      {preview.message && <span className="pv-badge error">{preview.message}</span>}
    </div>
  ) : null

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className={`player-wrap ${crop ? 'cropping' : ''}`}>
        {playSrc ? (
          <video ref={setRefs} className={`player-video ${big ? 'big' : ''}`} src={playSrc} controls={!crop} playsInline preload="metadata"
                 onTimeUpdate={(e) => onTime(inPreview ? preview!.toSource(e.currentTarget.currentTime) : e.currentTarget.currentTime)}
                 onLoadedMetadata={() => { if (inPreview) preview!.onLoaded?.() }} onError={onError} />
        ) : (
          <div className="player-video player-empty muted">No file yet</div>
        )}
        {switcher}
        {frameLayer}
        {cropBox}
        {overlay && (
          <div className={`cap-preview cap-preview-${captions.pos} capstyle-${captions.style}`}>{overlay}</div>
        )}
      </div>
    </div>
  )
})

export default Player
