import type { Clip, Job, VideoDetail as Video } from '../../../lib/types'
import ClipsList from '../ClipsList'
import type { Plan } from '../Montage'

interface Props {
  video: Video
  plan: Plan | null
  active: (type: string) => Job | undefined
  run: (type: string, payload?: Record<string, unknown>, okMsg?: string) => void
  autoShorts: () => void
  onUse: (c: Clip) => void
  onRender: (c: Clip) => void
  onLoadPlan: () => void
}

/** Step 2: what to make from the video — AI picks and the clips list. */
export default function ClipsSection({ video, plan, active, run, autoShorts, onUse, onRender, onLoadPlan }: Props) {
  const has = (k: string) => video.assets.some((a) => a.kind === k)
  const prepared = has('transcript') && has('scenes')
  const ready = video.status === 'ready'
  const rendered = video.clips.filter((c) => c.output_path).length
  const action = (type: string, name: string, what: string, payload: Record<string, unknown> = {}, opts?: { accent?: boolean; disabled?: boolean; note?: string }) => {
    const job = active(type)
    return (
      <div className="step">
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>{name}</strong>
          <span className="muted small">{what}{opts?.note ? ` (${opts.note})` : ''}</span>
          {job && <span className="chip accent" style={{ justifySelf: 'start' }}>{job.status === 'queued' ? 'queued' : `${Math.round(job.progress ?? 0)}% ${job.progress_note ?? ''}`}</span>}
        </div>
        <button className={`btn small ${opts?.accent ? 'accent' : ''}`} disabled={Boolean(job) || !ready || opts?.disabled} onClick={() => run(type, payload)}>
          {job ? 'Running' : 'Go'}
        </button>
      </div>
    )
  }
  return (
    <div className="stack">
      <div className="stack" style={{ gap: 6 }}>
        {action('suggest', 'Pick the best moments', 'AI reads the transcript, scene cuts and frames and proposes 5 clip-worthy ranges with titles and hooks.',
                { count: 5 }, { accent: !video.clips.length, disabled: !prepared, note: prepared ? undefined : 'run Prepare first' })}
        {action('plan', plan ? 'Plan the edit again' : 'Plan a full edit', 'AI lays out a complete Short: shot order with the hook first, speeds, punch-ins, transition, captions and grade. Opens in Edit → Montage.',
                {}, { accent: !plan, disabled: !has('scenes'), note: has('scenes') ? undefined : 'needs scene cuts' })}
        {plan && (
          <div className="step">
            <div className="stack grow" style={{ gap: 2 }}>
              <strong>{plan.title ?? 'AI plan'}</strong>
              <span className="muted small">{plan.shots.length} shots · ~{Math.round(plan.out_length ?? 0)}s · {plan.hook}</span>
            </div>
            <button className="btn small accent" onClick={onLoadPlan}>Open in Montage</button>
          </div>
        )}
        <div className="step">
          <div className="stack grow" style={{ gap: 2 }}>
            <strong>Do everything for me</strong>
            <span className="muted small">Prepare, pick moments, then render each one with every auto-apply recipe. Results land in Review.</span>
          </div>
          <button className="btn small" disabled={Boolean(active('suggest')) || !ready} onClick={autoShorts}>Go</button>
        </div>
      </div>

      <div className="panel-head" style={{ marginTop: 8 }}>
        <h2>Clips</h2>
        <span className="muted small">{video.clips.length ? `${rendered}/${video.clips.length} rendered` : 'none yet'}</span>
      </div>
      {video.clips.length ? (
        <ClipsList clips={video.clips} jobs={video.jobs} onUse={onUse} onRender={onRender} />
      ) : (
        <p className="muted small">No clips yet. Pick moments above, or set a range in Edit and render it.</p>
      )}
      <p className="muted small">"Use" loads a clip's range into Edit. "Render" renders it with the current Edit settings.</p>
    </div>
  )
}
