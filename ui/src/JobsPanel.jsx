import React, { useState } from 'react'
import { cancelJob, clearJobs } from './api.js'
import { fmtDuration, fmtSpeed } from './util.js'

const TERMINAL = new Set(['done', 'error', 'cancelled'])

const GLYPHS = {
  download: '↓',
  convert: '⚙',
  export: '✂',
  scenes: '◈',
  pipeline: '→',
  transcribe: '¶',
  suggest: '✦',
  autoshorts: '✦',
  import: '⊕',
}

function readout(job) {
  if (job.percent == null) return 'working…'
  const parts = [`${Math.floor(job.percent)}%`]
  const speed = fmtSpeed(job.speed)
  if (speed) parts.push(speed)
  if (job.eta != null) parts.push(`${fmtDuration(job.eta)} left`)
  return parts.join(' · ')
}

export default function JobsPanel({ jobs }) {
  const [error, setError] = useState(null)
  const hasTerminal = jobs.some((j) => TERMINAL.has(j.status))

  const doCancel = (id) =>
    cancelJob(id).catch((e) => setError(e.message))
  const doClear = () =>
    clearJobs().catch((e) => setError(e.message))

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Jobs</h2>
        {hasTerminal && (
          <button className="btn ghost" onClick={doClear}>Clear finished</button>
        )}
      </div>
      {error && <p className="error-line">{error}</p>}
      <ul className="job-list">
        {jobs.map((job) => {
          const active = !TERMINAL.has(job.status)
          return (
            <li key={job.id} className="job-row">
              <span className="job-glyph mono" aria-hidden="true">
                {GLYPHS[job.kind] || '⚙'}
              </span>
              <div className="job-main">
                <div className="job-top">
                  <span className="job-title">{job.title}</span>
                  <span className={`chip chip-${job.status}`}>{job.status}</span>
                </div>
                <div
                  className="scrubber"
                  role="progressbar"
                  aria-valuenow={job.percent == null ? undefined : Math.floor(job.percent)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className={
                      'scrubber-fill' +
                      (job.status === 'done' ? ' ok' : '') +
                      (job.percent == null && !TERMINAL.has(job.status)
                        ? ' indeterminate' : '')
                    }
                    style={{
                      width: job.percent == null
                        ? '100%'
                        : `${Math.min(job.percent, 100)}%`,
                    }}
                  />
                </div>
                {active && <p className="mono muted readout">{readout(job)}</p>}
                {job.status === 'error' && (
                  <p className="error-line">{job.error || 'Something went wrong.'}</p>
                )}
              </div>
              {active && job.status !== 'cancelling' && (
                <button className="btn ghost" onClick={() => doCancel(job.id)}>
                  Cancel
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
