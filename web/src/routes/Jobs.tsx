import { useMutation, useSubscription } from '@apollo/client'
import { Link } from 'react-router-dom'
import Progress from '../components/Progress'
import {
  ClearFinishedJobsDocument,
  JobsDocument,
  RetryJobDocument,
  SetJobStatusDocument,
  type JobsSubscription,
} from '../gql/generated'
import { timeAgo } from '../lib/format'

type Job = JobsSubscription['jobs'][number]

const ACTIVE = new Set(['queued', 'claimed', 'running', 'cancel_requested'])
const FINISHED = new Set(['done', 'error', 'cancelled'])

function JobCard({ job }: { job: Job }) {
  const [setStatus, { loading: cancelling }] = useMutation(SetJobStatusDocument)
  const [retry, { loading: retrying }] = useMutation(RetryJobDocument)

  const active = ACTIVE.has(job.status)
  const cancel = () => {
    // Nobody is running a queued job, so it can be cancelled outright;
    // a claimed/running job is asked to stop and the worker confirms.
    const status = job.status === 'queued' ? 'cancelled' : 'cancel_requested'
    void setStatus({ variables: { id: job.id, status } })
  }

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
      <Progress value={job.progress} active={job.status === 'running' || job.status === 'claimed'} />
      <div className="job-meta mono muted small">
        <span>{job.progress != null ? `${Math.round(job.progress)}%` : ''} {job.progress_note ?? ''}</span>
        <span>
          {job.machine?.name ?? 'unassigned'} · {timeAgo(when)}
          {job.attempts > 1 ? ` · attempt ${job.attempts}` : ''}
        </span>
      </div>
      {job.error && <div className="job-error">{job.error}</div>}
      <div className="job-actions">
        {active && job.status !== 'cancel_requested' && (
          <button className="btn" onClick={cancel} disabled={cancelling}>Cancel</button>
        )}
        {(job.status === 'error' || job.status === 'cancelled') && (
          <button className="btn" onClick={() => void retry({ variables: { id: job.id } })} disabled={retrying}>
            Retry
          </button>
        )}
      </div>
    </article>
  )
}

export default function Jobs() {
  const { data, loading, error } = useSubscription(JobsDocument)
  const [clear, { loading: clearing }] = useMutation(ClearFinishedJobsDocument)

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>

  const jobs = data?.jobs ?? []
  const activeJobs = jobs.filter((j) => ACTIVE.has(j.status))
  const finished = jobs.filter((j) => FINISHED.has(j.status))

  return (
    <>
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
          {finished.length > 0 && (
            <button className="btn small" onClick={() => void clear()} disabled={clearing}>Clear finished</button>
          )}
        </div>
        <div className="stack">
          {finished.map((j) => <JobCard key={j.id} job={j} />)}
          {!finished.length && <p className="muted small">No finished jobs yet.</p>}
        </div>
      </section>
    </>
  )
}
