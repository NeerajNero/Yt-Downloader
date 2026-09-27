import { forwardRef, useMemo } from 'react'
import type { ManualCaptions, Transcript } from '../../lib/api'
import { duration } from '../../lib/format'

interface Props {
  src: string | null
  scenes: number[]
  videoDuration: number
  nowTime: number
  onTime: (t: number) => void
  onError: () => void
  captions: { enabled: boolean; source: 'auto' | 'manual'; pos: string; style: string }
  transcript: Transcript | null
  manual: ManualCaptions | null
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

const Player = forwardRef<HTMLVideoElement, Props>(function Player(
  { src, scenes, videoDuration, nowTime, onTime, onError, captions, transcript, manual }, ref,
) {
  const lines = useMemo(() => buildLines(transcript), [transcript])
  const seek = (t: number) => {
    const el = (ref as React.RefObject<HTMLVideoElement>).current
    if (el) el.currentTime = t
  }

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

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="player-wrap">
        {src ? (
          <video ref={ref} className="player-video" src={src} controls playsInline preload="metadata"
                 onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)} onError={onError} />
        ) : (
          <div className="player-video player-empty muted">No file yet</div>
        )}
        {overlay && (
          <div className={`cap-preview cap-preview-${captions.pos} capstyle-${captions.style}`}>{overlay}</div>
        )}
      </div>
      <div className="marker-strip" aria-hidden="true" onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        if (videoDuration) seek(((e.clientX - r.left) / r.width) * videoDuration)
      }}>
        {videoDuration > 0 && (
          <div className="marker-head" style={{ left: `${Math.min(100, (nowTime / videoDuration) * 100)}%` }} />
        )}
        {videoDuration > 0 && scenes.map((t) => (
          <button key={t} type="button" className="marker" style={{ left: `${(t / videoDuration) * 100}%` }}
                  title={duration(t)} onClick={(e) => { e.stopPropagation(); seek(t) }} />
        ))}
      </div>
    </div>
  )
})

export default Player
