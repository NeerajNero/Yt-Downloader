import { useState } from 'react'
import { beatsUrl, patchClip, setClipPeak, type BeatsGrid } from '../../../lib/api'
import { defaultRange, gridBeats, isDefaultRange } from '../../../lib/beats'
import { duration } from '../../../lib/format'
import { usePoll } from '../../../lib/poll'
import type { Clip, Job, VideoDetail as Video } from '../../../lib/types'
import ClipsList from '../ClipsList'
import type { Plan } from '../Montage'

interface Props {
  video: Video
  plan: Plan | null
  active: (type: string) => Job | undefined
  run: (type: string, payload?: Record<string, unknown>, okMsg?: string) => void
  autoShorts: () => void
  onUse: (c: Clip) => void
  onRender: (c: Clip) => void
  onLoadPlan: () => void
  /** The Sound step's track: its beat grid snaps the default range around a peak. */
  musicName?: string
  nowTime?: number
  playhead?: () => number
  onSeek?: (t: number) => void
  selectedId?: string | null
}

/** Step 2: what to make from the video — AI picks and the clips list. */
export default function ClipsSection({ video, plan, active, run, autoShorts, onUse, onRender, onLoadPlan, musicName, nowTime, playhead, onSeek, selectedId }: Props) {
  const has = (k: string) => video.assets.some((a) => a.kind === k)
  const prepared = has('transcript') && has('scenes')
  const ready = video.status === 'ready'
  const rendered = video.clips.filter((c) => c.output_path).length
  const [peakMsg, setPeakMsg] = useState<string | null>(null)
  // 404 until the track is analysed; polled so the grid appears when the beats job finishes.
  const { data: grid } = usePoll<BeatsGrid>(musicName ? beatsUrl(musicName) : null, 3000)
  const beats = gridBeats(grid)
  const onPeak = async (c: Clip) => {
    if (!playhead) return
    const peak = Math.round(playhead() * 100) / 100
    setPeakMsg(null)
    try {
      // First press, or the range is still the default around the old peak: move both.
      // A range you've edited by hand is left alone; only the peak moves.
      if (c.peak_s == null || isDefaultRange(c, beats, video.duration)) {
        const r = defaultRange(peak, beats, video.duration)
        await patchClip(c.id, { peak_s: peak, start_s: r.start, end_s: r.end })
        setPeakMsg(`Peak at ${duration(peak)}; range ${duration(r.start)} → ${duration(r.end)}${beats ? ` snapped to ${musicName} beats` : ''}.`)
      } else {
        await setClipPeak(c.id, peak)
        setPeakMsg(`Peak moved to ${duration(peak)}; the range you edited is kept.`)
      }
    } catch (e) { setPeakMsg((e as Error).message) }
  }
  const onClearPeak = async (c: Clip) => { try { await setClipPeak(c.id, null); setPeakMsg(null) } catch (e) { setPeakMsg((e as Error).message) } }
  const action = (type: string, name: string, what: string, payload: Record<string, unknown> = {}, opts?: { accent?: boolean; disabled?: boolean; note?: string }) => {
    const job = active(type)
    return (
      <div className="step">
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>{name}</strong>
          <span className="muted small">{what}{opts?.note ? ` (${opts.note})` : ''}</span>
          {job && <span className="chip accent" style={{ justifySelf: 'start' }}>{job.status === 'queued' ? 'queued' : `${Math.round(job.progress ?? 0)}% ${job.progress_note ?? ''}`}</span>}
        </div>
        <button className={`btn small ${opts?.accent ? 'accent' : ''}`} disabled={Boolean(job) || !ready || opts?.disabled} onClick={() => run(type, payload)}>
          {job ? 'Running' : 'Go'}
        </button>
      </div>
    )
  }
  return (
    <div className="stack">
      <div className="stack" style={{ gap: 6 }}>
        {action('suggest', 'Pick the best moments', 'AI reads the transcript, scene cuts and frames and proposes 5 clip-worthy ranges with titles and hooks.',
                { count: 5 }, { accent: !video.clips.length, disabled: !prepared, note: prepared ? undefined : 'run Prepare first' })}
        {action('plan', plan ? 'Plan the edit again' : 'Plan a full edit', 'AI lays out a complete Short: shot order with the hook first, speeds, punch-ins, transition, captions and grade. Opens in Edit → Montage.',
                {}, { accent: !plan, disabled: !has('scenes'), note: has('scenes') ? undefined : 'needs scene cuts' })}
        {plan && (
          <div className="step">
            <div className="stack grow" style={{ gap: 2 }}>
              <strong>{plan.title ?? 'AI plan'}</strong>
              <span className="muted small">{plan.shots.length} shots · ~{Math.round(plan.out_length ?? 0)}s · {plan.hook}</span>
            </div>
            <button className="btn small accent" onClick={onLoadPlan}>Open in Montage</button>
          </div>
        )}
        <div className="step">
          <div className="stack grow" style={{ gap: 2 }}>
            <strong>Do everything for me</strong>
            <span className="muted small">Prepare, pick moments, then render each one with every auto-apply recipe. Results land in Review.</span>
          </div>
          <button className="btn small" disabled={Boolean(active('suggest')) || !ready} onClick={autoShorts}>Go</button>
        </div>
      </div>

      <div className="panel-head" style={{ marginTop: 8 }}>
        <h2>Clips</h2>
        <span className="muted small">{video.clips.length ? `${rendered}/${video.clips.length} rendered` : 'none yet'}</span>
      </div>
      {video.clips.length ? (
        <ClipsList clips={video.clips} jobs={video.jobs} onUse={onUse} onRender={onRender}
                   nowTime={nowTime} onSeek={onSeek} onPeak={playhead ? onPeak : undefined} onClearPeak={onClearPeak} selectedId={selectedId} />
      ) : (
        <p className="muted small">No clips yet. Pick moments above, or set a range in Edit and render it.</p>
      )}
      {peakMsg && <p className="muted small">{peakMsg}</p>}
      <p className="muted small">"Use" loads a clip's range into Edit. "Render" renders it with the current Edit settings. "Peak at playhead" marks the moment and sets the playbook range around it
        ({musicName ? (beats ? `snapped to ${musicName}'s beats` : `${musicName} has no beat grid yet`) : 'pick a track in Edit → Sound to snap it to beats'}).</p>
    </div>
  )
}
