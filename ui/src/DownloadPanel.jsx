import React, { useState } from 'react'
import { probe, startDownload, startImport } from './api.js'
import { fmtBytes, fmtDuration, qualityLabel } from './util.js'

export default function DownloadPanel() {
  const [url, setUrl] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [quality, setQuality] = useState('best')

  const check = async () => {
    const trimmed = url.trim()
    if (!trimmed || checking) return
    setChecking(true)
    setError(null)
    setInfo(null)
    try {
      const result = await probe(trimmed)
      setInfo(result)
      setQuality('best')
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  const download = async () => {
    setError(null)
    try {
      await startDownload(info.webpage_url || url.trim(), quality, info.title)
      setInfo(null)
      setUrl('')
    } catch (e) {
      setError(e.message)
    }
  }

  const doImport = async () => {
    setError(null)
    try {
      await startImport(info.path)
      setInfo(null)
      setUrl('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="panel ingest">
      <div className="ingest-row">
        <input
          type="text"
          value={url}
          placeholder="Paste a video link — or a local file path to import"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          aria-label="Video link"
        />
        <button className="btn" onClick={check} disabled={checking || !url.trim()}>
          {checking ? 'Checking…' : 'Check'}
        </button>
      </div>
      {error && <p className="error-line">{error}</p>}

      {info && (
        <div className="probe-card">
          {info.thumbnail && (
            <img className="probe-thumb" src={info.thumbnail} alt="" />
          )}
          <div className="probe-body">
            <h2 className="probe-title">{info.title}</h2>
            <p className="mono muted">
              {info.local
                ? `Local file · ${info.height ? `${info.height}p · ` : ''}${fmtBytes(info.size)} · ${fmtDuration(info.duration)}`
                : `${info.uploader || 'unknown channel'} · ${fmtDuration(info.duration)}`}
            </p>
            <div className="probe-actions">
              {info.local ? (
                <button className="btn accent" onClick={doImport}>
                  Import to library
                </button>
              ) : (
                <>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    aria-label="Quality"
                  >
                    <option value="best">Best available</option>
                    {info.heights.map((h) => (
                      <option key={h} value={String(h)}>{qualityLabel(h)}</option>
                    ))}
                    <option value="audio">Audio only (mp3)</option>
                  </select>
                  <button className="btn accent" onClick={download}>Download</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
