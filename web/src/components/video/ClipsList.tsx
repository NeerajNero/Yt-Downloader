import { deleteClip, fileUrl, setClipStatus } from '../../lib/api'
import { duration } from '../../lib/format'
import type { Clip, Job } from '../../lib/types'

interface Props {
  clips: Clip[]
  jobs: Job[]
  onUse: (c: Clip) => void
  onRender: (c: Clip) => void
}

export default function ClipsList({ clips, jobs, onUse, onRender }: Props) {
  if (!clips.length) return null
  const activeFor = (id: string) => jobs.find((j) => j.clip_id === id && ['queued', 'running', 'cancel_requested'].includes(j.status))

  return (
    <div className="stack" style={{ gap: 8 }}>
      {clips.map((c, i) => {
        const job = activeFor(c.id)
        return (
          <div key={c.id} className={`clip-row status-${c.status}`}>
            <div className="clip-main">
              <div className="clip-title">
                {c.origin === 'ai_suggest' ? `${i + 1}. ` : ''}{c.title ?? `${duration(c.start_s)}–${duration(c.end_s)}`}
                <span className={`pill ${c.status}`}>{c.status}</span>
              </div>
              <div className="mono muted small">
                {duration(c.start_s)}–{duration(c.end_s)}{c.hook ? ` · ${c.hook}` : ''}
              </div>
              {job && <div className="muted small">{job.type} {job.status === 'queued' ? 'queued' : `${Math.round(job.progress ?? 0)}%`} {job.progress_note ?? ''}</div>}
            </div>
            <div className="clip-actions">
              <button className="btn small" onClick={() => onUse(c)}>Use</button>
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
