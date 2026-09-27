import { useSubscription } from '@apollo/client'
import { Link } from 'react-router-dom'
import { LibraryDocument, type LibrarySubscription } from '../gql/generated'
import { bytes, duration, resolution } from '../lib/format'

type Video = LibrarySubscription['videos'][number]

function has(v: Video, kind: string) {
  return v.assets.some((a) => a.kind === kind)
}

function VideoCard({ video }: { video: Video }) {
  const job = video.jobs[0]
  const clips = video.clips_aggregate.aggregate?.count ?? 0
  const rendered = video.rendered.aggregate?.count ?? 0
  const downloading = video.status !== 'ready'

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
          {downloading && <span className={`chip ${video.status === 'failed' ? 'bad' : ''}`}>{video.status}</span>}
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
  const { data, loading, error } = useSubscription(LibraryDocument)
  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const videos = data?.videos ?? []
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Library</h2>
        <Link to="/add" className="btn small accent">Add video</Link>
      </div>
      <div className="stack">
        {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        {!videos.length && <p className="muted small">Empty. Add a link, or run scripts/import_v1_library.py on the brain.</p>}
      </div>
    </section>
  )
}
