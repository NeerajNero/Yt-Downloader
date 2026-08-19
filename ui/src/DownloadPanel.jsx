import React, { useRef, useState } from 'react'
import { probe, startDownload, startImport, uploadFile } from './api.js'
import { fmtBytes, fmtDuration, qualityLabel } from './util.js'

const ACCEPT = '.mkv,.mp4,.webm,.m4a,.mov,.mp3,.opus,video/*,audio/*'

export default function DownloadPanel({ onImported }) {
  const [url, setUrl] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [quality, setQuality] = useState('best')
  const [upload, setUpload] = useState(null) // {name, pct}
  const [notice, setNotice] = useState(null)
  const fileRef = useRef(null)

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

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file || upload) return
    setError(null)
    setNotice(null)
    setUpload({ name: file.name, pct: 0 })
    try {
      const result = await uploadFile(file, (pct) =>
        setUpload({ name: file.name, pct })
      )
      setNotice(`Added "${result.title}" to the library.`)
      if (onImported) onImported()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpload(null)
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
        <button
          className="btn add-file"
          onClick={() => fileRef.current?.click()}
          disabled={Boolean(upload)}
          title="Add a local video file to the library"
          aria-label="Add a local video file"
        >
          +
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={onPickFile}
          hidden
        />
      </div>
      {upload && (
        <div className="upload-progress">
          <div className="scrubber" role="progressbar"
            aria-valuenow={Math.floor(upload.pct)} aria-valuemin="0" aria-valuemax="100">
            <div className="scrubber-fill" style={{ width: `${upload.pct}%` }} />
          </div>
          <p className="mono muted readout">
            Uploading {upload.name} — {Math.floor(upload.pct)}%
          </p>
        </div>
      )}
      {error && <p className="error-line">{error}</p>}
      {notice && <p className="notice-line mono">{notice}</p>}

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
