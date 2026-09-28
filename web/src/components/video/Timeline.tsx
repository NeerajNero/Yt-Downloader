import { useRef } from 'react'
import { duration } from '../../lib/format'

interface Props {
  videoDuration: number
  nowTime: number
  scenes: number[]
  dialogue?: { start: number; end: number; text?: string }[]
  closeups?: { start: number; end: number; subject?: string }[]
  range: { start: number; end: number } | null
  onRange: (r: { start: number; end: number }) => void
  shots?: { start: number; end: number; active?: boolean }[]
  onSeek: (t: number) => void
}

/** Scrub strip: scene ticks, dialogue lines (bottom) and closeups (top) as
 *  thin bars, the selected range as a band with draggable in/out handles,
 *  montage shots as bars, and the playhead. */
export default function Timeline({ videoDuration, nowTime, scenes, dialogue, closeups, range, onRange, shots, onSeek }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const pct = (t: number) => (videoDuration ? Math.max(0, Math.min(100, (t / videoDuration) * 100)) : 0)
  const timeAt = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || !videoDuration) return 0
    return Math.max(0, Math.min(videoDuration, ((clientX - r.left) / r.width) * videoDuration))
  }

  const drag = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!range) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const t = Math.round(timeAt(ev.clientX) * 10) / 10
      if (which === 'start') onRange({ start: Math.min(t, range.end - 0.5), end: range.end })
      else onRange({ start: range.start, end: Math.max(t, range.start + 0.5) })
    }
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up) }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  return (
    <div className="stack" style={{ gap: 4 }}>
      <div ref={ref} className="timeline" onClick={(e) => onSeek(timeAt(e.clientX))} role="slider" aria-label="Timeline"
           aria-valuemin={0} aria-valuemax={videoDuration} aria-valuenow={nowTime}>
        {closeups?.map((c, i) => (
          <div key={`c${i}`} className="tl-closeup" style={{ left: `${pct(c.start)}%`, width: `${pct(c.end) - pct(c.start)}%` }} title={c.subject ? `closeup: ${c.subject}` : 'closeup'} />
        ))}
        {dialogue?.map((d, i) => (
          <div key={`d${i}`} className="tl-dialogue" style={{ left: `${pct(d.start)}%`, width: `${pct(d.end) - pct(d.start)}%` }} title={d.text || 'dialogue'} />
        ))}
        {shots?.map((s, i) => (
          <div key={i} className={`tl-shot ${s.active ? 'active' : ''}`} style={{ left: `${pct(s.start)}%`, width: `${pct(s.end) - pct(s.start)}%` }} />
        ))}
        {range && (
          <div className="tl-range" style={{ left: `${pct(range.start)}%`, width: `${pct(range.end) - pct(range.start)}%` }}>
            <div className="tl-handle left" onPointerDown={drag('start')} aria-label="Clip start" />
            <div className="tl-handle right" onPointerDown={drag('end')} aria-label="Clip end" />
          </div>
        )}
        {scenes.map((t) => <div key={t} className="tl-tick" style={{ left: `${pct(t)}%` }} title={duration(t)} />)}
        <div className="tl-head" style={{ left: `${pct(nowTime)}%` }} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="mono muted small">{duration(nowTime)}</span>
        {range && <span className="mono small accent-text">{duration(range.start)} → {duration(range.end)} · {duration(range.end - range.start)}</span>}
        <span className="mono muted small">{duration(videoDuration)}</span>
      </div>
      {((dialogue && dialogue.length > 0) || (closeups && closeups.length > 0)) && (
        <div className="row wrap muted small" style={{ gap: 12 }}>
          {closeups && closeups.length > 0 && <span><span className="tl-key closeup" /> closeups</span>}
          {dialogue && dialogue.length > 0 && <span><span className="tl-key dialogue" /> dialogue</span>}
        </div>
      )}
    </div>
  )
}
