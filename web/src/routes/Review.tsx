import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SafeBands } from '../components/video/Player'
import PostKit from '../components/video/PostKit'
import { fileUrl, setClipStatus } from '../lib/api'
import { duration, timeAgo } from '../lib/format'
import { usePoll } from '../lib/poll'
import { getReviewSafeArea, setReviewSafeArea, summarize, type RecipeSettings } from '../lib/settings'
import type { ReviewClip } from '../lib/types'

function Card({ c, safe }: { c: ReviewClip; safe: boolean }) {
  const [busy, setBusy] = useState(false)
  const [showKit, setShowKit] = useState(c.status === 'approved')
  const kit = c.video.postkit ?? undefined
  const set = async (status: string) => { setBusy(true); try { await setClipStatus(c.id, status) } finally { setBusy(false) } }
  const s = (c.render_settings ?? {}) as unknown as RecipeSettings
  const landscape = s.orientation === 'landscape'

  return (
    <article className={`review-card ${landscape ? 'landscape' : ''}`}>
      <div className="review-wrap">
        <video className="review-video" src={fileUrl(c.output_path!)} controls playsInline preload="metadata" />
        {safe && <div className="frame-layer" aria-hidden="true"><SafeBands /></div>}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div className="clip-title">{c.title ?? `${duration(c.start_s)}–${duration(c.end_s)}`}<span className={`pill ${c.status}`}>{c.status}</span></div>
        <Link to={`/video/${c.video.id}?clip=${c.id}`} className="muted small">{c.video.title}</Link>
        {c.video.note && <div className="note small">“{c.video.note}”</div>}
        {c.hook && <div className="small">{c.hook}</div>}
        <div className="mono muted small">{duration(c.start_s)}–{duration(c.end_s)} · {c.recipe?.name ?? summarize(s)} · {timeAgo(c.updated_at)}</div>
        <div className="job-actions">
          {c.status === 'rendered' && <button className="btn small accent" disabled={busy} onClick={() => { void set('approved'); setShowKit(true) }}>Approve</button>}
          {c.status === 'approved' && <button className="btn small" disabled={busy} onClick={() => void set('posted')}>Mark posted</button>}
          <button className="btn small" disabled={busy} onClick={() => void set('rejected')}>Reject</button>
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
  const { data, loading, error } = usePoll<ReviewClip[]>('/api/review', 2000)
  const [safe, setSafeState] = useState(getReviewSafeArea)
  const setSafe = (v: boolean) => { setSafeState(v); setReviewSafeArea(v) }
  if (error && !data) return <p className="error">Can't reach the app: {error}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const clips = data ?? []
  const waiting = clips.filter((c) => c.status === 'rendered')
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Review</h2>
        <span className="muted small">{waiting.length ? `${waiting.length} to review` : 'all caught up'}</span>
        <label className="check small" title="Shade the caption-free bands and the subject zone over each render"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> Safe area</label>
      </div>
      {!clips.length && <p className="muted small">Rendered clips show up here. Swipe sideways to go through them.</p>}
      <div className="review-strip">
        {clips.map((c) => <Card key={c.id} c={c} safe={safe} />)}
      </div>
    </section>
  )
}
