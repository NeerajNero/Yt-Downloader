import React, { useState } from 'react'
import Player from './Player.jsx'
import { reveal, startConvert, startPipeline } from './api.js'
import { fmtBytes, fmtDuration, needsConvert } from './util.js'

const ACTIVE = new Set([
  'queued', 'starting', 'downloading', 'merging', 'converting',
  'exporting', 'analyzing', 'running', 'cancelling',
  'transcribing', 'suggesting', 'shredding', 'writing', 'tightening',
])

export default function Library({ items, jobs, config, onChanged }) {
  const [errors, setErrors] = useState({})
  const [openPath, setOpenPath] = useState(null)

  const openItem = items.find((i) => i.path === openPath)
  const pipelineEnabled = Boolean(config?.pipeline_enabled)

  const setError = (path, message) =>
    setErrors((prev) => ({ ...prev, [path]: message }))

  const doReveal = (path) =>
    reveal(path).catch((e) => setError(path, e.message))

  const doConvert = (path) =>
    startConvert(path)
      .then(() => setError(path, null))
      .catch((e) => setError(path, e.message))

  const doPipeline = (path) =>
    startPipeline(path)
      .then(() => setError(path, null))
      .catch((e) => setError(path, e.message))

  const activeJob = (kind, path) =>
    jobs.some((j) => j.kind === kind && j.src === path && ACTIVE.has(j.status))

  if (items.length === 0) {
    return (
      <section className="panel">
        <h2>Library · 0</h2>
        <p className="muted empty">
          Nothing ingested yet — paste a link above. Files land in{' '}
          <span className="mono">{config?.download_dir || 'downloads'}</span>.
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
            <button
              className="card-thumb"
              onClick={() => setOpenPath(item.path)}
              aria-label={`Preview ${item.title}`}
            >
              {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : null}
              <span className="play-glyph" aria-hidden="true">▶</span>
            </button>
            <div className="card-body">
              <h3 className="card-title" title={item.title}>{item.title}</h3>
              <p className="mono muted card-meta">
                {item.height ? `${item.height}p · ` : ''}
                {fmtBytes(item.size)} · {fmtDuration(item.duration)}
                {item.shorts.length > 0 && ` · ${item.shorts.length} clip${item.shorts.length > 1 ? 's' : ''}`}
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
                    disabled={activeJob('convert', item.path)}
                    onClick={() => doConvert(item.path)}
                  >
                    {activeJob('convert', item.path)
                      ? 'Converting…' : 'Convert for editing'}
                  </button>
                )}
                <button
                  className="btn ghost"
                  disabled={!pipelineEnabled || activeJob('pipeline', item.path)}
                  title={pipelineEnabled
                    ? 'Hand this file to the VOD pipeline'
                    : 'Set PIPELINE_CMD in .env to enable'}
                  onClick={() => doPipeline(item.path)}
                >
                  {activeJob('pipeline', item.path) ? 'In pipeline…' : 'Pipeline'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {openItem && (
        <Player
          item={openItem}
          jobs={jobs}
          config={config}
          onClose={() => setOpenPath(null)}
        />
      )}
    </section>
  )
}
