import type { Job, VideoDetail as Video } from '../../../lib/types'
import PostKit from '../PostKit'

interface Props {
  video: Video
  active: (type: string) => Job | undefined
  run: (type: string, payload?: Record<string, unknown>, okMsg?: string) => void
  prepareAll: () => void
}

/** Step 1: the checklist that gets a video ready for clips, captions and AI. */
export default function Prepare({ video, active, run, prepareAll }: Props) {
  const asset = (kind: string) => video.assets.find((a) => a.kind === kind) ?? null
  const transcript = asset('transcript'); const scenes = asset('scenes'); const borders = asset('borders')
  const editCopy = asset('edit_copy'); const postkit = asset('postkit')
  const words = (transcript?.data as { words?: number } | null)?.words
  const cuts = (scenes?.data as { scenes?: number } | null)?.scenes
  const trim = borders?.data as { trim_x?: number; trim_y?: number } | null
  const ready = video.status === 'ready'

  const steps = [
    { type: 'transcribe', name: 'Transcript', what: 'Speech to text with word timing. Needed for captions, clip suggestions and the edit plan.',
      done: Boolean(transcript), status: transcript ? `${words ?? 0} words` : null, redo: 'Re-transcribe' },
    { type: 'scenes', name: 'Scene cuts', what: 'Finds where the picture changes. Needed for the montage builder, clip pack and AI.',
      done: Boolean(scenes), status: scenes ? `${cuts ?? 0} cuts` : null, redo: 'Detect again' },
    { type: 'borders', name: 'Black bars', what: 'Measures letterbox bars so renders can trim them automatically.',
      done: Boolean(borders), status: trim ? (trim.trim_x || trim.trim_y ? `${trim.trim_y}% top/bottom, ${trim.trim_x}% sides` : 'none found') : null, redo: 'Measure again' },
    { type: 'convert', name: 'Preview copy', what: 'A browser-friendly copy so the player above works for mkv / AV1 sources. Also handy for Resolve.',
      done: Boolean(editCopy), status: editCopy ? 'ready' : null, redo: 'Make again' },
    { type: 'postkit', name: 'Post kit', what: 'Title, description and hashtags written from the transcript.',
      done: Boolean(postkit), status: postkit ? 'ready' : null, redo: 'Rewrite', needs: transcript ? null : 'needs the transcript' },
  ]
  const missing = steps.filter((s) => !s.done && !s.needs).length

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted small">{missing ? `${missing} step${missing === 1 ? '' : 's'} to go` : 'All prepared'}</span>
        {missing > 0 && <button className="btn small accent" onClick={prepareAll} disabled={!ready}>Prepare everything</button>}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        {steps.map((s) => {
          const job = active(s.type)
          return (
            <div key={s.type} className={`step ${s.done ? 'done' : ''}`}>
              <span className="step-mark" aria-hidden="true">{s.done ? '✓' : job ? '…' : '○'}</span>
              <div className="stack grow" style={{ gap: 2 }}>
                <div className="row" style={{ gap: 6 }}>
                  <strong>{s.name}</strong>
                  {s.status && <span className="chip ok">{s.status}</span>}
                  {job && <span className="chip accent">{job.status === 'queued' ? 'queued' : `${Math.round(job.progress ?? 0)}% ${job.progress_note ?? ''}`}</span>}
                </div>
                <span className="muted small">{s.what}{s.needs ? ` (${s.needs})` : ''}</span>
              </div>
              <button className={`btn small ${!s.done && !s.needs ? 'accent' : ''}`} disabled={Boolean(job) || !ready || Boolean(s.needs)}
                      onClick={() => run(s.type)}>
                {job ? 'Running' : s.done ? s.redo : 'Run'}
              </button>
            </div>
          )
        })}
      </div>
      {postkit?.data ? <PostKit kit={postkit.data as { title?: string; description?: string; hashtags?: string[] }} /> : null}
    </div>
  )
}
