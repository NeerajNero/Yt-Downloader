import { useState } from 'react'
import type { VideoDetailSubscription } from '../../../gql/generated'
import { timelineUrl } from '../../../lib/api'

type Video = NonNullable<VideoDetailSubscription['videos_by_pk']>
type Job = Video['jobs'][number]

interface Props {
  video: Video
  range: { start: number; end: number }
  active: (type: string) => Job | undefined
  run: (type: string, payload?: Record<string, unknown>, okMsg?: string) => void
  onRemove: () => void
}

/** Rarely used: shredding, silence removal, Resolve hand-off, removal. */
export default function ToolsSection({ video, range, active, run, onRemove }: Props) {
  const [clipMax, setClipMax] = useState(3)
  const [scope, setScope] = useState<'whole' | 'range'>('whole')
  const ready = video.status === 'ready'
  const pack = video.assets.find((a) => a.kind === 'clip_pack')
  const tight = video.assets.find((a) => a.kind === 'tight')
  const packing = active('clippack'); const tightening = active('tighten')
  return (
    <div className="stack">
      <div className="step">
        <div className="stack grow" style={{ gap: 4 }}>
          <strong>Cut into shots</strong>
          <span className="muted small">Shreds the video into short clips along scene cuts (for hand editing, or the montage builder). Lands in the video's clips folder.</span>
          <div className="row wrap">
            <select value={scope} onChange={(e) => setScope(e.target.value as 'whole' | 'range')} aria-label="Scope">
              <option value="whole">Whole video</option>
              <option value="range">Selected range</option>
            </select>
            <label className="slider"><span className="muted small">max</span>
              <input type="range" min={1} max={5} step={1} value={clipMax} onChange={(e) => setClipMax(Number(e.target.value))} />
              <span className="mono small">{clipMax}s</span></label>
            {pack && <span className="chip ok">{(pack.data as { count?: number })?.count ?? ''} shots ready</span>}
          </div>
        </div>
        <button className="btn small" disabled={Boolean(packing) || !ready}
                onClick={() => run('clippack', scope === 'range' ? { start: range.start, end: range.end, max_len: clipMax } : { max_len: clipMax }, 'Cutting into shots — see Jobs.')}>
          {packing ? `${Math.round(packing.progress ?? 0)}%` : 'Go'}
        </button>
      </div>
      <div className="step">
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>Remove silences</strong>
          <span className="muted small">Cuts silent gaps out of the whole video for a tighter, faster-paced version saved next to the source.{tight ? ' Done once already.' : ''}</span>
        </div>
        <button className="btn small" disabled={Boolean(tightening) || !ready} onClick={() => run('tighten', {}, 'Removing silences — see Jobs.')}>
          {tightening ? `${Math.round(tightening.progress ?? 0)}%` : 'Go'}
        </button>
      </div>
      <div className="step">
        <div className="stack grow" style={{ gap: 2 }}>
          <strong>DaVinci Resolve timeline</strong>
          <span className="muted small">An FCPXML with every clip of this video as a cut on one timeline. Import it in Resolve and relink the source file.</span>
        </div>
        {video.clips.length ? <a className="btn small" href={timelineUrl(video.id, 'all')} download>Download</a> : <span className="muted small">no clips</span>}
      </div>
      <div className="row wrap" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        {video.url ? <a className="muted small" href={video.url} target="_blank" rel="noreferrer">Open on YouTube</a> : <span />}
        <button className="btn small" onClick={onRemove}>Remove from library</button>
      </div>
    </div>
  )
}
