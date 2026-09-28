import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { probeUrl, startDownload, uploadVideo, type ProbeResult } from '../lib/api'
import { duration } from '../lib/format'

const ACCEPT = '.mkv,.mp4,.webm,.m4a,.mov,.mp3,.opus,video/*,audio/*'

const PIPELINES = [
  { value: 'none', label: 'Just download', help: 'Nothing else happens until you open the video.' },
  { value: 'prepare', label: 'Prepare for editing', help: 'Transcribe, detect scenes, suggest clips, plan an edit and write a post kit.' },
  { value: 'shorts', label: 'Auto Shorts', help: 'Prepare, then render every suggested clip with each auto-apply recipe.' },
]

export default function Ingest() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<ProbeResult | null>(null)
  const [quality, setQuality] = useState('best')
  const [note, setNote] = useState('')
  const [pipeline, setPipeline] = useState('prepare')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const check = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null); setNotice(null); setInfo(null); setProbing(true)
    try {
      setInfo(await probeUrl(trimmed))
      setQuality('best')
    } catch (e) {
      setError((e as Error).message)
    } finally { setProbing(false) }
  }

  const download = async () => {
    if (!info) return
    setError(null); setStarting(true)
    try {
      const out = await startDownload({
        url: info.webpage_url ?? url.trim(), quality, title: info.title, youtube_id: info.youtube_id,
        note: note.trim() || null, pipeline,
      })
      if (out.existing && !out.job_id) setNotice('Already in the library — opening it.')
      nav(`/video/${out.video_id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setStarting(false) }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || upload) return
    setError(null); setNotice(null)
    setUpload({ name: file.name, pct: 0 })
    try {
      const r = await uploadVideo(file, note.trim(), pipeline, (pct) => setUpload({ name: file.name, pct }))
      nav(`/video/${r.video_id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpload(null)
    }
  }

  return (
    <section className="panel stack">
      <div className="panel-head"><h2>Add a video</h2></div>
      <div className="row">
        <input type="text" className="grow" value={url} placeholder="Paste a YouTube link"
               onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void check()}
               aria-label="Video link" inputMode="url" />
        <button className="btn" onClick={() => void check()} disabled={probing || !url.trim()}>
          {probing ? 'Checking…' : 'Check'}
        </button>
      </div>

      <label className="field">
        <span className="muted small">Note to self (what's the idea?)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder="e.g. the chase at 12:40 → 9:16 with pop captions" />
      </label>

      <div className="field">
        <span className="muted small">After the download</span>
        <div className="choices">
          {PIPELINES.map((p) => (
            <label key={p.value} className={`choice ${pipeline === p.value ? 'active' : ''}`}>
              <input type="radio" name="pipeline" value={p.value} checked={pipeline === p.value}
                     onChange={() => setPipeline(p.value)} />
              <span>
                <strong>{p.label}</strong>
                <span className="muted small">{p.help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {info && (
        <div className="probe-card">
          {info.thumbnail && <img className="probe-thumb" src={info.thumbnail} alt="" />}
          <div className="stack" style={{ gap: 6 }}>
            <strong>{info.title}</strong>
            <span className="mono muted small">{info.uploader ?? 'unknown channel'} · {duration(info.duration)}{info.hdr ? ' · HDR' : ''}</span>
            {info.existing_video_id && <span className="chip ok">already in the library</span>}
            <div className="row">
              <select value={quality} onChange={(e) => setQuality(e.target.value)} aria-label="Quality">
                <option value="best">Best available</option>
                {info.hdr && <option value="hdr">HDR (best available)</option>}
                {info.heights.map((h) => <option key={h} value={String(h)}>{h >= 2160 ? '4K' : `${h}p`}</option>)}
                <option value="audio">Audio only (mp3)</option>
              </select>
              <button className="btn accent" onClick={() => void download()} disabled={starting}>
                {info.existing_video_id ? 'Open' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={Boolean(upload)}>
          {upload ? `Uploading ${Math.floor(upload.pct)}%` : 'Upload a file from this device'}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={(e) => void onPickFile(e)} hidden />
      </div>
      {upload && <div className="bar"><div className="bar-fill" style={{ width: `${upload.pct}%` }} /></div>}
      {error && <p className="job-error">{error}</p>}
      {notice && <p className="muted small">{notice}</p>}
      <p className="muted small">Like someone else's edit? <Link to="/styles">Analyze a Short</Link> and turn it into a recipe.</p>
    </section>
  )
}
