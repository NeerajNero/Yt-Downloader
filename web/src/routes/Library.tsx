import { useState } from 'react'
import { Link } from 'react-router-dom'
import { rescanLibrary } from '../lib/api'
import { bytes, duration, resolution } from '../lib/format'
import { usePoll } from '../lib/poll'
import type { LibraryVideo } from '../lib/types'

function has(v: LibraryVideo, kind: string) {
  return v.assets.some((a) => a.kind === kind)
}

function VideoCard({ video }: { video: LibraryVideo }) {
  const job = video.jobs[0]
  const clips = video.clips_count
  const rendered = video.rendered_count
  const notReady = video.status !== 'ready'

  return (
    <Link to={`/video/${video.id}`} className="video-card link-card">
      <div className="thumb">
        {video.thumb_path ? <img src={`/api/files/${video.id}/thumb`} alt="" loading="lazy" /> : <div className="thumb-empty" />}
        <span className="thumb-badge mono">{duration(video.duration)}</span>
      </div>
      <div className="video-body">
        <div className="video-title" title={video.title}>{video.title}</div>
        <div className="mono muted small">
          {[video.channel, resolution(video.width, video.height), bytes(video.size_bytes)].filter(Boolean).join(' · ')}
        </div>
        {video.note && <div className="note small">“{video.note}”</div>}
        <div className="caps">
          {notReady && <span className={`chip ${video.status === 'failed' || video.status === 'missing' ? 'bad' : ''}`}>{video.status === 'missing' ? 'file missing' : video.status}</span>}
          {has(video, 'transcript') && <span className="chip ok">transcript</span>}
          {has(video, 'scenes') && <span className="chip ok">scenes</span>}
          {has(video, 'edit_copy') && <span className="chip ok">edit copy</span>}
          {has(video, 'postkit') && <span className="chip ok">post kit</span>}
          {clips > 0 && <span className="chip ok">{rendered ? `${rendered}/${clips} rendered` : `${clips} clips`}</span>}
          {video.pipeline !== 'none' && !job && video.status === 'ready' && <span className="chip">{video.pipeline}</span>}
          {job && (
            <span className="chip accent">
              {job.type} {job.status === 'queued' ? 'queued' : job.progress != null ? `${Math.round(job.progress)}%` : '…'}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function Library() {
  const { data, loading, error } = usePoll<LibraryVideo[]>('/api/videos', 2000)
  const [msg, setMsg] = useState<string | null>(null)
  if (error && !data) return <p className="error">Can't reach the app: {error}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const videos = data ?? []
  const rescan = async () => {
    try { const r = await rescanLibrary(); setMsg(`${r.videos} videos, ${r.added} new${r.missing ? `, ${r.missing} with missing files` : ''}.`) }
    catch (e) { setMsg((e as Error).message) }
  }
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Library</h2>
        <div className="row">
          <button className="btn small" onClick={() => void rescan()} title="Index folders copied into the library by hand">Rescan</button>
          <Link to="/add" className="btn small accent">Add video</Link>
        </div>
      </div>
      {msg && <p className="muted small">{msg}</p>}
      <div className="stack">
        {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        {!videos.length && <p className="muted small">Empty. Add a link, or drop a folder with a video and its .info.json into the library and tap Rescan.</p>}
      </div>
    </section>
  )
}
