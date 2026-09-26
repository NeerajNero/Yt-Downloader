import { useMutation, useSubscription } from '@apollo/client'
import { EnqueueJobDocument, LibraryDocument, type LibrarySubscription } from '../gql/generated'
import { bytes, duration, resolution } from '../lib/format'

type Video = LibrarySubscription['videos'][number]

function assetSummary(v: Video, kind: string): Record<string, unknown> | null {
  const a = v.assets.find((x) => x.kind === kind)
  if (!a) return null
  return (a.data as Record<string, unknown> | null) ?? {}
}

function VideoCard({ video }: { video: Video }) {
  const [enqueue, { loading }] = useMutation(EnqueueJobDocument)
  const transcript = assetSummary(video, 'transcript')
  const scenes = assetSummary(video, 'scenes')
  const activeTranscribe = video.jobs.find((j) => j.type === 'transcribe')

  const transcribe = () =>
    void enqueue({ variables: { type: 'transcribe', video_id: video.id, payload: {} } })

  return (
    <article className="video-card">
      <div className="thumb">
        {video.thumb_path ? (
          <img src={`/api/files/${video.id}/thumb`} alt="" loading="lazy" />
        ) : (
          <div className="thumb-empty" />
        )}
        <span className="thumb-badge mono">{duration(video.duration)}</span>
      </div>
      <div className="video-body">
        <div className="video-title" title={video.title}>{video.title}</div>
        <div className="mono muted small">
          {[video.channel, resolution(video.width, video.height), bytes(video.size_bytes)].filter(Boolean).join(' · ')}
        </div>
        <div className="caps">
          {transcript && (
            <span className="chip ok">
              transcript{typeof transcript.words === 'number' ? ` · ${transcript.words} words` : ''}
            </span>
          )}
          {scenes && <span className="chip ok">scenes{typeof scenes.scenes === 'number' ? ` · ${scenes.scenes}` : ''}</span>}
          {!transcript && !scenes && <span className="chip">no sidecars yet</span>}
        </div>
        <div className="job-actions">
          {activeTranscribe ? (
            <button className="btn" disabled>
              {activeTranscribe.status === 'queued'
                ? 'Transcribe queued'
                : `Transcribing${activeTranscribe.progress != null ? ` ${Math.round(activeTranscribe.progress)}%` : '…'}`}
            </button>
          ) : (
            <button className="btn accent" onClick={transcribe} disabled={loading || video.status !== 'ready'}>
              {transcript ? 'Re-transcribe' : 'Transcribe'}
            </button>
          )}
        </div>
      </div>
    </article>
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
        <span className="muted small">{videos.length} videos</span>
      </div>
      <div className="stack">
        {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        {!videos.length && (
          <p className="muted small">Empty. Run scripts/import_v1_library.py on the brain to index the v1 downloads.</p>
        )}
      </div>
    </section>
  )
}
