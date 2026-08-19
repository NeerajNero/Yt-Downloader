import React, { useEffect, useRef, useState } from 'react'
import { detectBorders, getScenes, reveal, startExport, startScenes } from './api.js'
import { fmtDuration, parseTime } from './util.js'

const ACTIVE = new Set([
  'queued', 'starting', 'downloading', 'merging', 'converting',
  'exporting', 'analyzing', 'running', 'cancelling',
])

export default function Player({ item, jobs, onClose }) {
  const videoRef = useRef(null)
  const [scenes, setScenes] = useState(null)
  const [playError, setPlayError] = useState(false)
  const [start, setStart] = useState('0:00')
  const [end, setEnd] = useState('0:15')
  const [style, setStyle] = useState('blur')
  const [vivid, setVivid] = useState(false)
  const [trimY, setTrimY] = useState('0')
  const [trimX, setTrimX] = useState('0')
  const [fgCrop, setFgCrop] = useState('0')
  const [detectingBars, setDetectingBars] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Prefer the edit copy — mkv/AV1 originals don't play in every browser.
  const src = item.edit_url || item.media_url
  const duration = item.duration || scenes?.duration || 0

  const detecting = jobs.some(
    (j) => j.kind === 'scenes' && j.src === item.path && ACTIVE.has(j.status)
  )

  useEffect(() => {
    getScenes(item.path).then(setScenes).catch(() => setScenes(null))
  }, [item.path])

  // When a detection job for this file finishes, pull its results in.
  useEffect(() => {
    if (!scenes && !detecting) {
      getScenes(item.path).then(setScenes).catch(() => {})
    }
  }, [detecting]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const seek = (t) => {
    if (videoRef.current) videoRef.current.currentTime = t
  }

  const markCurrent = (setter) => {
    const t = videoRef.current ? videoRef.current.currentTime : 0
    setter(fmtDuration(t))
  }

  const doDetect = () =>
    startScenes(item.path).catch((e) => setError(e.message))

  const doDetectBars = () => {
    setError(null)
    setDetectingBars(true)
    detectBorders(item.path)
      .then((b) => {
        setTrimY(String(b.trim_y))
        setTrimX(String(b.trim_x))
        setNotice(
          b.trim_y || b.trim_x
            ? `Found bars — trimming ${b.trim_y}% top/bottom, ${b.trim_x}% sides.`
            : 'No black bars detected.'
        )
      })
      .catch((err) => setError(err.message))
      .finally(() => setDetectingBars(false))
  }

  const doExport = () => {
    setError(null)
    setNotice(null)
    const s = parseTime(start)
    const e = parseTime(end)
    if (s == null || e == null) {
      setError('Times must look like 1:23 or plain seconds.')
      return
    }
    if (e <= s) {
      setError('End time must be after start time.')
      return
    }
    const ty = parseFloat(trimY) || 0
    const tx = parseFloat(trimX) || 0
    const fc = style === 'blur' ? parseFloat(fgCrop) || 0 : 0
    if (ty < 0 || ty > 40 || tx < 0 || tx > 40 || fc < 0 || fc > 40) {
      setError('Trim and crop must be between 0 and 40 percent.')
      return
    }
    startExport(item.path, s, e, style, vivid, tx, ty, fc)
      .then(() => setNotice('Export queued — progress shows in Jobs.'))
      .catch((err) => setError(err.message))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel"
        role="dialog"
        aria-label={item.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 className="modal-title">{item.title}</h2>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>

        <video
          ref={videoRef}
          className="player-video"
          src={src}
          controls
          onError={() => setPlayError(true)}
        />
        {playError && (
          <p className="error-line">
            This file may not play in the browser
            {item.edit_path ? '.' : ' — create an edit copy for a reliable preview.'}
          </p>
        )}

        <div className="marker-strip-wrap">
          <div className="marker-strip" aria-hidden="true">
            {duration > 0 && (scenes?.scenes || []).map((t) => (
              <button
                key={t}
                className="marker"
                style={{ left: `${(t / duration) * 100}%` }}
                title={fmtDuration(t)}
                onClick={() => seek(t)}
              />
            ))}
          </div>
          <div className="marker-meta mono muted">
            {scenes
              ? `${scenes.scenes.length} scene cuts — click a marker to jump`
              : detecting
                ? 'Detecting scenes…'
                : 'No scene data yet'}
            {!scenes && !detecting && (
              <button className="btn ghost" onClick={doDetect}>Detect scenes</button>
            )}
          </div>
        </div>

        <div className="export-row">
          <span className="mono muted">9:16 clip</span>
          <div className="time-field">
            <input
              type="text"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="Clip start"
            />
            <button className="btn ghost" onClick={() => markCurrent(setStart)}>
              Set start
            </button>
          </div>
          <div className="time-field">
            <input
              type="text"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="Clip end"
            />
            <button className="btn ghost" onClick={() => markCurrent(setEnd)}>
              Set end
            </button>
          </div>
          <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style">
            <option value="blur">Blurred pad</option>
            <option value="crop">Center crop</option>
          </select>
          <label className="vivid-check">
            <input
              type="checkbox"
              checked={vivid}
              onChange={(e) => setVivid(e.target.checked)}
            />
            Vivid color boost
          </label>
          <button className="btn accent" onClick={doExport}>Export clip</button>
        </div>

        <div className="trim-row">
          <span className="mono muted">Trim bars</span>
          <label className="trim-field mono muted">
            <input
              type="text"
              value={trimY}
              onChange={(e) => setTrimY(e.target.value)}
              aria-label="Trim percent from top and bottom"
            />
            % top/bottom
          </label>
          <label className="trim-field mono muted">
            <input
              type="text"
              value={trimX}
              onChange={(e) => setTrimX(e.target.value)}
              aria-label="Trim percent from left and right"
            />
            % sides
          </label>
          <button className="btn ghost" onClick={doDetectBars} disabled={detectingBars}>
            {detectingBars ? 'Measuring…' : 'Auto-detect'}
          </button>
          {style === 'blur' && (
            <label className="trim-field mono muted" title="Crops the video's sides so it sits taller over the blur">
              <input
                type="text"
                value={fgCrop}
                onChange={(e) => setFgCrop(e.target.value)}
                aria-label="Crop percent from video sides"
              />
              % crop video
            </label>
          )}
        </div>
        {error && <p className="error-line">{error}</p>}
        {notice && <p className="notice-line mono">{notice}</p>}

        {item.shorts.length > 0 && (
          <div className="shorts-list">
            <h3 className="mono muted">Exported clips</h3>
            {item.shorts.map((s) => (
              <div key={s.path} className="shorts-row">
                <span className="mono shorts-name">{s.name}</span>
                <button className="btn ghost" onClick={() => reveal(s.path)}>
                  Open folder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
