import { useMutation, useSubscription } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PostKit from '../components/video/PostKit'
import { ReviewClipsDocument, SetClipStatusDocument, type ReviewClipsSubscription } from '../gql/generated'
import { fileUrl } from '../lib/api'
import { duration, timeAgo } from '../lib/format'
import { summarize, type RecipeSettings } from '../lib/settings'

type Clip = ReviewClipsSubscription['clips'][number]

function Card({ c }: { c: Clip }) {
  const [setStatus, { loading }] = useMutation(SetClipStatusDocument)
  const [showKit, setShowKit] = useState(c.status === 'approved')
  const kit = c.video.assets[0]?.data as { title?: string; description?: string; hashtags?: string[] } | undefined
  const set = (status: string) => void setStatus({ variables: { id: c.id, status } })
  const s = (c.render_settings ?? {}) as RecipeSettings
  const landscape = s.orientation === 'landscape'

  return (
    <article className={`review-card ${landscape ? 'landscape' : ''}`}>
      <video className="review-video" src={fileUrl(c.output_path!)} controls playsInline preload="metadata" />
      <div className="stack" style={{ gap: 6 }}>
        <div className="clip-title">{c.title ?? `${duration(c.start_s)}–${duration(c.end_s)}`}<span className={`pill ${c.status}`}>{c.status}</span></div>
        <Link to={`/video/${c.video.id}?clip=${c.id}`} className="muted small">{c.video.title}</Link>
        {c.video.note && <div className="note small">“{c.video.note}”</div>}
        {c.hook && <div className="small">{c.hook}</div>}
        <div className="mono muted small">{duration(c.start_s)}–{duration(c.end_s)} · {c.recipe?.name ?? summarize(s)} · {timeAgo(c.updated_at)}</div>
        <div className="job-actions">
          {c.status === 'rendered' && <button className="btn small accent" disabled={loading} onClick={() => { set('approved'); setShowKit(true) }}>Approve</button>}
          {c.status === 'approved' && <button className="btn small" disabled={loading} onClick={() => set('posted')}>Mark posted</button>}
          <button className="btn small" disabled={loading} onClick={() => set('rejected')}>Reject</button>
          <Link to={`/video/${c.video.id}?clip=${c.id}`} className="btn small">Tweak</Link>
          <a className="btn small" href={fileUrl(c.output_path!)} download>Download</a>
          {kit && <button className="btn small" onClick={() => setShowKit(!showKit)}>{showKit ? 'Hide post kit' : 'Post kit'}</button>}
        </div>
        {showKit && kit && <PostKit kit={kit} />}
      </div>
    </article>
  )
}

export default function Review() {
  const { data, loading, error } = useSubscription(ReviewClipsDocument)
  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const clips = data?.clips ?? []
  const waiting = clips.filter((c) => c.status === 'rendered')
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Review</h2>
        <span className="muted small">{waiting.length ? `${waiting.length} to review` : 'all caught up'}</span>
      </div>
      {!clips.length && <p className="muted small">Rendered clips show up here. Swipe sideways to go through them.</p>}
      <div className="review-strip">
        {clips.map((c) => <Card key={c.id} c={c} />)}
      </div>
    </section>
  )
}
