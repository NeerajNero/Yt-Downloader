import React, { useEffect, useRef, useState } from 'react'
import {
  detectBorders, getCaptions, getScenes, getSuggestions, reveal,
  saveCaptions, startAutoShorts, startExport, startScenes, startSuggest,
  startTranscribe,
} from './api.js'
import { fmtDuration, parseTime } from './util.js'

const ACTIVE = new Set([
  'queued', 'starting', 'downloading', 'merging', 'converting',
  'exporting', 'analyzing', 'running', 'cancelling',
  'transcribing', 'suggesting',
])

export default function Player({ item, jobs, config, onClose }) {
  const videoRef = useRef(null)
  const [scenes, setScenes] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [playError, setPlayError] = useState(false)
  const [start, setStart] = useState('0:00')
  const [end, setEnd] = useState('0:15')
  const [style, setStyle] = useState('blur')
  const [vividAmount, setVividAmount] = useState(0)
  const [captions, setCaptions] = useState(false)
  const [captionSource, setCaptionSource] = useState('auto')
  const [captionPos, setCaptionPos] = useState('bottom')
  const [captionStyle, setCaptionStyle] = useState('karaoke')
  const [resolution, setResolution] = useState('1080')
  const [orientation, setOrientation] = useState('portrait')
  const [rotate, setRotate] = useState('none')
  const [rotateCaptions, setRotateCaptions] = useState(false)
  const [capsOpen, setCapsOpen] = useState(false)
  const [capSpeed, setCapSpeed] = useState('2.5')
  const [capItems, setCapItems] = useState([])
  const [hasManualCaps, setHasManualCaps] = useState(false)
  const [trimY, setTrimY] = useState('0')
  const [trimX, setTrimX] = useState('0')
  const [fgCrop, setFgCrop] = useState('0')
  const [detectingBars, setDetectingBars] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const aiEnabled = Boolean(config?.ai_enabled)

  // Prefer the edit copy — mkv/AV1 originals don't play in every browser.
  const src = item.edit_url || item.media_url
  const duration = item.duration || scenes?.duration || 0

  const activeJob = (kind) =>
    jobs.some((j) => j.kind === kind && j.src === item.path && ACTIVE.has(j.status))
  const detecting = activeJob('scenes')
  const transcribing = activeJob('transcribe')
  const suggesting = activeJob('suggest')
  const autoShorting = activeJob('autoshorts')

  useEffect(() => {
    getScenes(item.path).then(setScenes).catch(() => setScenes(null))
    getSuggestions(item.path).then(setSuggestions).catch(() => setSuggestions(null))
    getCaptions(item.path)
      .then((c) => {
        setHasManualCaps(c.items.length > 0)
        setCapSpeed(String(c.speed))
        setCapItems(c.items.map((i) => ({
          text: i.text,
          start: fmtDuration(i.start),
          duration: String(i.duration),
        })))
      })
      .catch(() => setHasManualCaps(false))
  }, [item.path])

  // When background jobs for this file finish, pull their results in.
  useEffect(() => {
    if (!scenes && !detecting) {
      getScenes(item.path).then(setScenes).catch(() => {})
    }
  }, [detecting]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!suggestions && !suggesting && !autoShorting) {
      getSuggestions(item.path).then(setSuggestions).catch(() => {})
    }
  }, [suggesting, autoShorting]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const run = (promise, okNotice) => {
    setError(null)
    setNotice(null)
    promise
      .then(() => okNotice && setNotice(okNotice))
      .catch((e) => setError(e.message))
  }

  const doDetect = () => run(startScenes(item.path))
  const doTranscribe = () =>
    run(startTranscribe(item.path), 'Transcribing — progress shows in Jobs.')
  const doSuggest = () =>
    run(startSuggest(item.path), 'Analyzing with AI — progress shows in Jobs.')
  const doAutoShorts = () =>
    run(
      startAutoShorts(item.path),
      'Auto Shorts started — clips land below when done.'
    )

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

  const exportRange = (s, e) => {
    const ty = parseFloat(trimY) || 0
    const tx = parseFloat(trimX) || 0
    const fc = style === 'blur' ? parseFloat(fgCrop) || 0 : 0
    if (ty < 0 || ty > 40 || tx < 0 || tx > 40 || fc < 0 || fc > 40) {
      setError('Trim and crop must be between 0 and 40 percent.')
      return
    }
    run(
      startExport(item.path, s, e, style, vividAmount, tx, ty, fc,
        captions, captionSource, captionPos, captionStyle, resolution,
        orientation, rotate, rotateCaptions),
      'Export queued — progress shows in Jobs.'
    )
  }

  const addCapItem = () => {
    const t = videoRef.current ? videoRef.current.currentTime : 0
    setCapItems((prev) => [
      ...prev,
      { text: '', start: fmtDuration(t), duration: '3' },
    ])
  }

  const editCapItem = (idx, field, value) =>
    setCapItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    )

  const removeCapItem = (idx) =>
    setCapItems((prev) => prev.filter((_, i) => i !== idx))

  const doSaveCaptions = () => {
    setError(null)
    setNotice(null)
    const speed = parseFloat(capSpeed)
    if (!(speed >= 0.5 && speed <= 10)) {
      setError('Speed must be between 0.5 and 10 words per second.')
      return
    }
    const items = []
    for (const it of capItems) {
      if (!it.text.trim()) continue
      const s = parseTime(it.start)
      const d = parseFloat(it.duration)
      if (s == null || !(d > 0)) {
        setError(`Check the times on "${it.text.slice(0, 30)}" — start like 1:23, duration in seconds.`)
        return
      }
      items.push({ text: it.text.trim(), start: s, duration: d })
    }
    saveCaptions(item.path, speed, items)
      .then((r) => {
        setHasManualCaps(r.saved > 0)
        if (r.saved > 0) setCaptionSource('manual')
        setNotice(`Saved ${r.saved} caption${r.saved === 1 ? '' : 's'}.`)
      })
      .catch((e) => setError(e.message))
  }

  const doExport = () => {
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
    exportRange(s, e)
  }

  const useClip = (clip) => {
    setStart(fmtDuration(clip.start))
    setEnd(fmtDuration(clip.end))
    seek(clip.start)
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
            <span className="meta-sep" aria-hidden="true">·</span>
            {item.has_transcript ? (
              <span className="ok-text">Transcript ✓</span>
            ) : (
              <button
                className="btn ghost"
                onClick={doTranscribe}
                disabled={transcribing}
              >
                {transcribing ? 'Transcribing…' : 'Transcribe'}
              </button>
            )}
          </div>
        </div>

        <div className="ai-row">
          <span className="mono muted">AI</span>
          <button
            className="btn ghost"
            onClick={doSuggest}
            disabled={!aiEnabled || suggesting || autoShorting}
            title={aiEnabled
              ? 'Gemini picks the best clip-worthy moments'
              : 'Set GEMINI_API_KEY in .env to enable'}
          >
            {suggesting ? 'Analyzing…' : 'Suggest clips'}
          </button>
          <button
            className="btn accent"
            onClick={doAutoShorts}
            disabled={!aiEnabled || autoShorting || suggesting}
            title={aiEnabled
              ? 'Transcribe, analyze, and export the top clips automatically'
              : 'Set GEMINI_API_KEY in .env to enable'}
          >
            {autoShorting ? 'Making Shorts…' : 'Auto Shorts'}
          </button>
          {config?.ai_model && (
            <span className="mono muted ai-model">{config.ai_model}</span>
          )}
        </div>

        {suggestions?.clips?.length > 0 && (
          <div className="suggestions">
            {suggestions.clips.map((c, i) => (
              <div key={`${c.start}-${c.end}`} className="suggestion-row">
                <div className="suggestion-main">
                  <span className="suggestion-title">
                    {i + 1}. {c.title}
                  </span>
                  <span className="mono muted">
                    {fmtDuration(c.start)}–{fmtDuration(c.end)} · {c.hook}
                  </span>
                </div>
                <button className="btn ghost" onClick={() => useClip(c)}>
                  Use
                </button>
                <button
                  className="btn ghost"
                  onClick={() => exportRange(c.start, c.end)}
                >
                  Export
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="export-row">
          <span className="mono muted">
            {orientation === 'landscape' ? '16:9 clip' : '9:16 clip'}
          </span>
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
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            aria-label="Orientation"
            title="Portrait 9:16 for Shorts/Reels/TikTok · Landscape 16:9 for YouTube"
          >
            <option value="portrait">Portrait 9:16</option>
            <option value="landscape">Landscape 16:9</option>
          </select>
          <select
            value={rotate}
            onChange={(e) => setRotate(e.target.value)}
            aria-label="Rotate video"
            title="Rotate the footage inside the frame — turn landscape sideways to fill a vertical clip"
          >
            <option value="none">No rotation</option>
            <option value="right">Rotate 90° ↻</option>
            <option value="left">Rotate 90° ↺</option>
            <option value="180">Rotate 180°</option>
          </select>
          <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Style">
            <option value="blur">Blurred pad</option>
            <option value="crop">Center crop</option>
          </select>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            aria-label="Resolution"
            title="4K takes noticeably longer to render"
          >
            <option value="1080">1080p</option>
            <option value="4k">4K</option>
          </select>
          <label className="vivid-slider" title="0 = original colors · 100 = maximum punch">
            <span className="mono muted">Vivid</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={vividAmount}
              onChange={(e) => setVividAmount(Number(e.target.value))}
              aria-label="Vivid color boost amount"
            />
            <span className="mono vivid-val">{vividAmount}</span>
          </label>
          <label
            className="vivid-check"
            title={item.has_transcript || hasManualCaps
              ? 'Burn captions into the clip'
              : 'Run Transcribe or add manual captions first'}
          >
            <input
              type="checkbox"
              checked={captions}
              disabled={!item.has_transcript && !hasManualCaps}
              onChange={(e) => setCaptions(e.target.checked)}
            />
            Captions
          </label>
          {captions && (
            <>
              <select
                value={captionSource}
                onChange={(e) => setCaptionSource(e.target.value)}
                aria-label="Caption source"
              >
                <option value="auto" disabled={!item.has_transcript}>
                  Auto (transcript)
                </option>
                <option value="manual" disabled={!hasManualCaps}>
                  Manual
                </option>
              </select>
              <select
                value={captionStyle}
                onChange={(e) => setCaptionStyle(e.target.value)}
                aria-label="Caption style"
                title="Karaoke: amber word fill · Typewriter: words appear as spoken · Pop: bold chunks bounce in with amber glow · Minimal: small static lines"
              >
                <option value="karaoke">Karaoke</option>
                <option value="typewriter">Typewriter</option>
                <option value="pop">Pop</option>
                <option value="minimal">Minimal</option>
              </select>
              <select
                value={captionPos}
                onChange={(e) => setCaptionPos(e.target.value)}
                aria-label="Caption position"
              >
                <option value="bottom">Bottom</option>
                <option value="middle">Middle</option>
                <option value="top">Top</option>
              </select>
              {rotate !== 'none' && (
                <label
                  className="vivid-check"
                  title="Rotate captions with the video, so they read correctly when the phone is turned"
                >
                  <input
                    type="checkbox"
                    checked={rotateCaptions}
                    onChange={(e) => setRotateCaptions(e.target.checked)}
                  />
                  Rotate captions too
                </label>
              )}
            </>
          )}
          <button className="btn accent" onClick={doExport}>Export clip</button>
        </div>

        <div className="caps-editor">
          <div className="caps-head">
            <button className="btn ghost" onClick={() => setCapsOpen(!capsOpen)}>
              {capsOpen ? 'Hide caption editor' : 'Edit captions manually'}
              {hasManualCaps ? ' ✓' : ''}
            </button>
            {capsOpen && (
              <label className="trim-field mono muted" title="How fast the amber fill sweeps the words">
                <input
                  type="text"
                  value={capSpeed}
                  onChange={(e) => setCapSpeed(e.target.value)}
                  aria-label="Caption fill speed in words per second"
                />
                words/sec
              </label>
            )}
          </div>
          {capsOpen && (
            <>
              {capItems.map((it, idx) => (
                <div key={idx} className="cap-row">
                  <input
                    type="text"
                    className="cap-text"
                    placeholder="Caption text"
                    value={it.text}
                    onChange={(e) => editCapItem(idx, 'text', e.target.value)}
                  />
                  <label className="trim-field mono muted">
                    <input
                      type="text"
                      value={it.start}
                      onChange={(e) => editCapItem(idx, 'start', e.target.value)}
                      aria-label="Caption start time"
                    />
                    at
                  </label>
                  <label className="trim-field mono muted">
                    <input
                      type="text"
                      value={it.duration}
                      onChange={(e) => editCapItem(idx, 'duration', e.target.value)}
                      aria-label="Caption duration in seconds"
                    />
                    sec
                  </label>
                  <button
                    className="btn ghost"
                    onClick={() => removeCapItem(idx)}
                    aria-label="Remove caption"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="cap-actions">
                <button className="btn ghost" onClick={addCapItem}>
                  Add caption at playhead
                </button>
                <button className="btn ghost ok-text" onClick={doSaveCaptions}>
                  Save captions
                </button>
              </div>
            </>
          )}
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
