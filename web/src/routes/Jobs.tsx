import { useState } from 'react'
import { Link } from 'react-router-dom'
import Progress from '../components/Progress'
import { cancelJob, clearFinishedJobs, retryJob } from '../lib/api'
import { timeAgo } from '../lib/format'
import { usePoll } from '../lib/poll'
import type { JobRow } from '../lib/types'

const ACTIVE = new Set(['queued', 'running', 'cancel_requested'])
const FINISHED = new Set(['done', 'error', 'cancelled'])

function JobCard({ job }: { job: JobRow }) {
  const [busy, setBusy] = useState(false)
  const active = ACTIVE.has(job.status)
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  const when = job.status === 'done' || job.status === 'error' ? job.updated_at : job.created_at

  return (
    <article className={`job-card status-${job.status}`}>
      <div className="job-head">
        <span className="job-type mono">{job.type}</span>
        <span className={`pill ${job.status}`}>{job.status.replace('_', ' ')}</span>
      </div>
      <div className="job-title">
        {job.video ? <Link to={`/video/${job.video.id}`}>{job.video.title}</Link> : 'no video'}
        {job.clip && <span className="muted small"> · {job.clip.title ?? `${Math.round(job.clip.start_s)}s–${Math.round(job.clip.end_s)}s`}</span>}
      </div>
      <Progress value={job.progress} active={job.status === 'running'} />
      <div className="job-meta mono muted small">
        <span>{job.progress != null ? `${Math.round(job.progress)}%` : ''} {job.progress_note ?? ''}</span>
        <span>{timeAgo(when)}{job.attempts > 1 ? ` · attempt ${job.attempts}` : ''}</span>
      </div>
      {job.error && <div className="job-error">{job.error}</div>}
      <div className="job-actions">
        {active && job.status !== 'cancel_requested' && (
          <button className="btn" onClick={() => void act(() => cancelJob(job.id))} disabled={busy}>Cancel</button>
        )}
        {(job.status === 'error' || job.status === 'cancelled') && (
          <button className="btn" onClick={() => void act(() => retryJob(job.id))} disabled={busy}>Retry</button>
        )}
      </div>
    </article>
  )
}

export default function Jobs() {
  const { data, loading, error } = usePoll<JobRow[]>('/api/jobs')
  const [clearing, setClearing] = useState(false)

  if (error && !data) return <p className="error">Can't reach the app: {error}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>

  const jobs = data ?? []
  const activeJobs = jobs.filter((j) => ACTIVE.has(j.status))
  const finished = jobs.filter((j) => FINISHED.has(j.status))
  const clear = async () => { setClearing(true); try { await clearFinishedJobs() } finally { setClearing(false) } }

  return (
    <>
      {error && <p className="job-error small">Lost contact with the app: {error}</p>}
      <section className="panel">
        <div className="panel-head">
          <h2>Active</h2>
          <span className="muted small">{activeJobs.length ? `${activeJobs.length} running or waiting` : 'nothing queued'}</span>
        </div>
        <div className="stack">
          {activeJobs.map((j) => <JobCard key={j.id} job={j} />)}
          {!activeJobs.length && <p className="muted small">Queue a job from the library.</p>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Finished</h2>
          {finished.length > 0 && <button className="btn small" onClick={() => void clear()} disabled={clearing}>Clear finished</button>}
        </div>
        <div className="stack">
          {finished.map((j) => <JobCard key={j.id} job={j} />)}
          {!finished.length && <p className="muted small">No finished jobs yet. Jobs are forgotten when the app closes.</p>}
        </div>
      </section>
    </>
  )
}
