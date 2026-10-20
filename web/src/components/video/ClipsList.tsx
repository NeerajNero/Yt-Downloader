import { deleteClip, fileUrl, setClipStatus } from '../../lib/api'
import { duration } from '../../lib/format'
import type { Clip, Job } from '../../lib/types'

interface Props {
  clips: Clip[]
  jobs: Job[]
  onUse: (c: Clip) => void
  onRender: (c: Clip) => void
  /** Peak controls (docs/PLAYBOOK.md): set the moment at the playhead, clear it, seek on the strip. */
  nowTime?: number
  onSeek?: (t: number) => void
  onPeak?: (c: Clip) => void
  onClearPeak?: (c: Clip) => void
  selectedId?: string | null
}

/** A clip's own scrub bar: its range end to end, the peak as an amber mark, the playhead when inside. */
function PeakStrip({ c, nowTime, onSeek }: { c: Clip; nowTime?: number; onSeek?: (t: number) => void }) {
  const len = Math.max(c.end_s - c.start_s, 0.001)
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - c.start_s) / len) * 100))
  const inside = nowTime != null && nowTime >= c.start_s && nowTime <= c.end_s
  return (
    <div className="peak-strip" role="slider" aria-label="Clip range" aria-valuemin={c.start_s} aria-valuemax={c.end_s} aria-valuenow={c.peak_s ?? c.start_s}
         title={c.peak_s != null ? `peak at ${duration(c.peak_s)}` : 'no peak set'}
         onClick={(e) => { if (!onSeek) return; const r = e.currentTarget.getBoundingClientRect(); onSeek(c.start_s + ((e.clientX - r.left) / r.width) * len) }}>
      {c.peak_s != null && <div className="peak-mark" style={{ left: `${pct(c.peak_s)}%` }} />}
      {inside && <div className="peak-head" style={{ left: `${pct(nowTime!)}%` }} />}
    </div>
  )
}

export default function ClipsList({ clips, jobs, onUse, onRender, nowTime, onSeek, onPeak, onClearPeak, selectedId }: Props) {
  if (!clips.length) return null
  const activeFor = (id: string) => jobs.find((j) => j.clip_id === id && ['queued', 'running', 'cancel_requested'].includes(j.status))

  return (
    <div className="stack" style={{ gap: 8 }}>
      {clips.map((c, i) => {
        const job = activeFor(c.id)
        return (
          <div key={c.id} className={`clip-row status-${c.status} ${selectedId === c.id ? 'selected' : ''}`}>
            <div className="clip-main">
              <div className="clip-title">
                {c.origin === 'ai_suggest' ? `${i + 1}. ` : ''}{c.title ?? `${duration(c.start_s)}–${duration(c.end_s)}`}
                <span className={`pill ${c.status}`}>{c.status}</span>
              </div>
              <div className="mono muted small">
                {duration(c.start_s)}–{duration(c.end_s)}{c.peak_s != null ? ` · peak ${duration(c.peak_s)}` : ''}{c.hook ? ` · ${c.hook}` : ''}
                {c.peak_s != null && onClearPeak && <button className="link-btn small" onClick={() => onClearPeak(c)} title="Clear the peak" aria-label="Clear peak"> ✕ peak</button>}
              </div>
              <PeakStrip c={c} nowTime={nowTime} onSeek={onSeek} />
              {job && <div className="muted small">{job.type} {job.status === 'queued' ? 'queued' : `${Math.round(job.progress ?? 0)}%`} {job.progress_note ?? ''}</div>}
            </div>
            <div className="clip-actions">
              <button className="btn small" onClick={() => onUse(c)}>Use</button>
              {onPeak && <button className="btn small" onClick={() => onPeak(c)} title="Set the peak at the player's position; sets the playbook range around it unless you've edited the range">Peak at playhead</button>}
              {!job && <button className="btn small" onClick={() => onRender(c)}>{c.output_path ? 'Re-render' : 'Render'}</button>}
              {c.output_path && <a className="btn small accent" href={fileUrl(c.output_path)} target="_blank" rel="noreferrer">Play</a>}
              {c.output_path && c.status === 'rendered' && (
                <button className="btn small" onClick={() => void setClipStatus(c.id, 'approved')}>Approve</button>
              )}
              {c.status !== 'rejected' && c.status !== 'posted' && (
                <button className="btn small" onClick={() => void setClipStatus(c.id, 'rejected')}>Reject</button>
              )}
              {c.status === 'rejected' && (
                <button className="btn small" onClick={() => void deleteClip(c.id)}>Delete</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
