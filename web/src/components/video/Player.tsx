import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ManualCaptions, Transcript } from '../../lib/api'

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
  { src, nowTime, onTime, onError, captions, transcript, manual, big, crop }, ref,
) {
  const lines = useMemo(() => buildLines(transcript), [transcript])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const setRefs = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el
  }, [ref])
  const [box, setBox] = useState<{ ew: number; eh: number; vw: number; vh: number } | null>(null)

  // Where the picture actually sits inside the (letterboxed) element.
  useEffect(() => {
    const el = videoRef.current
    if (!el || !crop) return
    const measure = () => setBox({ ew: el.clientWidth, eh: el.clientHeight, vw: el.videoWidth, vh: el.videoHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('loadedmetadata', measure)
    return () => { ro.disconnect(); el.removeEventListener('loadedmetadata', measure) }
  }, [crop != null, src]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className={`player-wrap ${crop ? 'cropping' : ''}`}>
        {src ? (
          <video ref={setRefs} className={`player-video ${big ? 'big' : ''}`} src={src} controls={!crop} playsInline preload="metadata"
                 onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)} onError={onError} />
        ) : (
          <div className="player-video player-empty muted">No file yet</div>
        )}
        {cropBox}
        {overlay && (
          <div className={`cap-preview cap-preview-${captions.pos} capstyle-${captions.style}`}>{overlay}</div>
        )}
      </div>
    </div>
  )
})

export default Player
