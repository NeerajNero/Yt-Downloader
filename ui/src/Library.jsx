import React, { useState } from 'react'
import { reveal, startConvert } from './api.js'
import { fmtBytes, fmtDuration, needsConvert } from './util.js'

const ACTIVE = new Set([
  'queued', 'starting', 'downloading', 'merging', 'converting', 'cancelling',
])

export default function Library({ items, jobs, downloadDir, onChanged }) {
  const [errors, setErrors] = useState({})

  const setError = (path, message) =>
    setErrors((prev) => ({ ...prev, [path]: message }))

  const doReveal = (path) =>
    reveal(path).catch((e) => setError(path, e.message))

  const doConvert = (path) =>
    startConvert(path)
      .then(() => setError(path, null))
      .catch((e) => setError(path, e.message))

  const converting = (path) =>
    jobs.some(
      (j) => j.kind === 'convert' && j.src === path && ACTIVE.has(j.status)
    )

  if (items.length === 0) {
    return (
      <section className="panel">
        <h2>Library · 0</h2>
        <p className="muted empty">
          Nothing ingested yet — paste a link above. Files land in{' '}
          <span className="mono">{downloadDir || 'downloads'}</span>.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Library · {items.length}</h2>
      <div className="lib-grid">
        {items.map((item) => (
          <article key={item.path} className="card">
            <div className="card-thumb">
              {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : null}
            </div>
            <div className="card-body">
              <h3 className="card-title" title={item.title}>{item.title}</h3>
              <p className="mono muted card-meta">
                {item.height ? `${item.height}p · ` : ''}
                {fmtBytes(item.size)} · {fmtDuration(item.duration)}
              </p>
              {needsConvert(item) && (
                <span className="badge">VP9/AV1 — convert for editing</span>
              )}
              {errors[item.path] && (
                <p className="error-line">{errors[item.path]}</p>
              )}
              <div className="card-actions">
                <button className="btn ghost" onClick={() => doReveal(item.path)}>
                  Open folder
                </button>
                {item.edit_path ? (
                  <button
                    className="btn ghost ok-text"
                    onClick={() => doReveal(item.edit_path)}
                  >
                    Edit copy ✓
                  </button>
                ) : (
                  <button
                    className="btn ghost"
                    disabled={converting(item.path)}
                    onClick={() => doConvert(item.path)}
                  >
                    {converting(item.path) ? 'Converting…' : 'Convert for editing'}
                  </button>
                )}
                <button
                  className="btn ghost"
                  disabled
                  title="v2 — hands the file to the VOD pipeline"
                >
                  Pipeline
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
