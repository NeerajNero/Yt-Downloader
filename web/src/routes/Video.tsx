import { useMutation, useSubscription } from '@apollo/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CaptionEditor from '../components/video/CaptionEditor'
import ClipsList from '../components/video/ClipsList'
import ExportControls from '../components/video/ExportControls'
import Player from '../components/video/Player'
import PostKit from '../components/video/PostKit'
import Montage, { type Plan } from '../components/video/Montage'
import RecipeExtras from '../components/video/RecipeExtras'
import Progress from '../components/Progress'
import {
  DeleteVideoDocument, EnqueueDocument, UpdateVideoDocument, VideoDetailDocument,
  type VideoDetailSubscription,
} from '../gql/generated'
import { fetchJson, fileUrl, timelineUrl, type ManualCaptions, type Scenes, type Transcript } from '../lib/api'
import { bytes, duration, parseTime, resolution } from '../lib/format'
import { DEFAULT_SETTINGS, fromStored, type RenderSettings } from '../lib/settings'

type Video = NonNullable<VideoDetailSubscription['videos_by_pk']>
type Clip = Video['clips'][number]
const ACTIVE = new Set(['queued', 'claimed', 'running', 'cancel_requested'])

export default function VideoPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { data, loading, error } = useSubscription(VideoDetailDocument, { variables: { id } })
  const [enqueue] = useMutation(EnqueueDocument)
  const [updateVideo] = useMutation(UpdateVideoDocument)
  const [deleteVideo] = useMutation(DeleteVideoDocument)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [nowTime, setNowTime] = useState(0)
  const [playError, setPlayError] = useState(false)
  const [start, setStart] = useState('0:00')
  const [end, setEnd] = useState('0:15')
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [tweakClip, setTweakClip] = useState<string | null>(null)
  const [previewCaps, setPreviewCaps] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [scenes, setScenes] = useState<Scenes | null>(null)
  const [manual, setManual] = useState<ManualCaptions | null>(null)
  const [clipPack, setClipPack] = useState<{ file: string; start: number; end: number }[] | null>(null)
  const [clipMax, setClipMax] = useState(3)
  const [clipScope, setClipScope] = useState<'whole' | 'range'>('whole')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)

  const video = data?.videos_by_pk ?? null
  const asset = (kind: string) => video?.assets.find((a) => a.kind === kind) ?? null
  const transcriptAsset = asset('transcript')
  const scenesAsset = asset('scenes')
  const captionsAsset = asset('captions')
  const editCopy = asset('edit_copy')
  const postkit = asset('postkit')
  const clipPackAsset = asset('clip_pack')
  const planAsset = asset('plan')
  const plan = (planAsset?.data ?? null) as Plan | null
  const borders = (asset('borders')?.data ?? null) as { trim_x: number; trim_y: number } | null

  // Pull sidecar JSON when the asset row appears or changes.
  useEffect(() => {
    if (transcriptAsset?.path) fetchJson<Transcript>(transcriptAsset.path).then(setTranscript).catch(() => setTranscript(null))
    else setTranscript(null)
  }, [transcriptAsset?.path, transcriptAsset?.created_at])
  useEffect(() => {
    if (scenesAsset?.path) fetchJson<Scenes>(scenesAsset.path).then(setScenes).catch(() => setScenes(null))
    else setScenes(null)
  }, [scenesAsset?.path, scenesAsset?.created_at])
  useEffect(() => {
    if (captionsAsset?.path) fetchJson<ManualCaptions>(captionsAsset.path).then(setManual).catch(() => setManual(null))
    else setManual(null)
  }, [captionsAsset?.path, captionsAsset?.created_at])
  useEffect(() => {
    if (clipPackAsset?.path) fetchJson<{ clips: { file: string; start: number; end: number }[] }>(clipPackAsset.path).then((m) => setClipPack(m.clips)).catch(() => setClipPack(null))
    else setClipPack(null)
  }, [clipPackAsset?.path, clipPackAsset?.created_at])

  // "Tweak" from the review screen: /video/:id?clip=<id> loads that clip's range + settings.
  const wantClip = params.get('clip')
  useEffect(() => {
    if (!wantClip || !video) return
    const c = video.clips.find((x) => x.id === wantClip)
    if (!c) return
    setStart(duration(c.start_s)); setEnd(duration(c.end_s))
    if (c.render_settings) setSettings(fromStored(c.render_settings))
    setRecipeId((c.render_settings as { recipe_id?: string } | null)?.recipe_id ?? null)
    setTweakClip(c.id)
    setMsg(`Tweaking "${c.title ?? 'clip'}" — Export re-renders it.`)
    params.delete('clip'); setParams(params, { replace: true })
  }, [wantClip, video?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeJobs = useMemo(() => (video?.jobs ?? []).filter((j) => ACTIVE.has(j.status)), [video?.jobs])
  const active = (type: string) => activeJobs.find((j) => j.type === type)
  const lastError = (video?.jobs ?? []).find((j) => j.status === 'error')

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  if (!video) return <p className="muted">Video not found. <Link to="/library">Back to library</Link></p>

  const src = video.storage_path
    ? (editCopy?.path ? fileUrl(editCopy.path) : `/api/files/${video.id}/source`)
    : null
  const vidDuration = video.duration ?? scenes?.duration ?? 0
  const words = (transcriptAsset?.data as { words?: number } | null)?.words ?? 0

  const run = async (type: string, payload: Record<string, unknown> = {}, clipId?: string, okMsg?: string) => {
    setErr(null); setMsg(null)
    try {
      await enqueue({ variables: { type, video_id: video.id, clip_id: clipId ?? null, payload } })
      if (okMsg) setMsg(okMsg)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const doExport = (s?: number, e?: number, clipId?: string) => {
    const st = s ?? parseTime(start)
    const en = e ?? parseTime(end)
    if (st == null || en == null) return setErr('Times must look like 1:23 or plain seconds.')
    if (en <= st) return setErr('End time must be after start time.')
    const fg = settings.style === 'blur' ? settings.fg_crop : 0
    const payload: Record<string, unknown> = { ...settings, fg_crop: fg, start: st, end: en }
    if (!payload.watermark) delete payload.watermark
    if (recipeId) payload.recipe_id = recipeId
    void run('render', payload, clipId ?? tweakClip ?? undefined, 'Render queued — progress shows in Jobs.')
    if (!clipId) setTweakClip(null)
  }

  const renderSequence = (segments: { start: number; end: number; speed: number; zoom_markers: unknown[] }[], transition: { type: string; duration: number }) => {
    const fg = settings.style === 'blur' ? settings.fg_crop : 0
    const payload: Record<string, unknown> = { ...settings, fg_crop: fg, segments, transition }
    if (!payload.watermark) delete payload.watermark
    if (recipeId) payload.recipe_id = recipeId
    void run('render', payload, undefined, 'Montage render queued — progress shows in Jobs.')
  }

  const useClip = (c: Clip) => {
    setStart(duration(c.start_s)); setEnd(duration(c.end_s))
    if (videoRef.current) videoRef.current.currentTime = c.start_s
  }

  const autoShorts = async () => {
    setErr(null)
    try {
      await updateVideo({ variables: { id: video.id, note: video.note ?? null, pipeline: 'shorts' } })
      if (transcriptAsset && scenesAsset) await run('suggest', { count: 3 }, undefined, 'Auto Shorts started — clips land below as they render.')
      else {
        if (!transcriptAsset) await run('transcribe')
        if (!scenesAsset) await run('scenes')
        if (!asset('borders')) await run('borders')
        setMsg('Auto Shorts started — transcribing and detecting scenes first.')
      }
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const doClipPack = () => {
    let s = 0, e = 0
    if (clipScope === 'range') {
      const ps = parseTime(start), pe = parseTime(end)
      if (ps == null || pe == null || pe <= ps) return setErr('Set a valid start/end range first, or shred the whole video.')
      s = ps; e = pe
    }
    void run('clippack', { start: s, end: e, max_len: clipMax }, undefined, 'Clip pack queued — shots land in the clips folder.')
  }

  const saveNote = async () => {
    await updateVideo({ variables: { id: video.id, note: noteDraft?.trim() || null, pipeline: video.pipeline } })
    setNoteDraft(null)
  }

  const remove = async () => {
    if (!window.confirm('Remove this video from the library? Files on disk are kept.')) return
    await deleteVideo({ variables: { id: video.id } })
    nav('/library')
  }

  const mark = (setter: (v: string) => void) => setter(duration(videoRef.current?.currentTime ?? 0))
  const rendered = video.clips.filter((c) => c.output_path)
  const btn = (type: string, label: string, busy: string, payload: Record<string, unknown> = {}, extra?: { disabled?: boolean; title?: string; accent?: boolean }) => {
    const j = active(type)
    return (
      <button className={`btn small ${extra?.accent ? 'accent' : ''}`} disabled={Boolean(j) || extra?.disabled || video.status !== 'ready'}
              title={extra?.title} onClick={() => void run(type, payload)}>
        {j ? `${busy}${j.progress != null ? ` ${Math.round(j.progress)}%` : '…'}` : label}
      </button>
    )
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-head">
          <h2 className="video-h">{video.title}</h2>
          <Link to="/library" className="btn small">Library</Link>
        </div>
        <div className="mono muted small">
          {[video.channel, resolution(video.width, video.height), bytes(video.size_bytes), duration(video.duration)].filter(Boolean).join(' · ')}
          {video.pipeline !== 'none' && ` · ${video.pipeline}`}
        </div>

        {video.status !== 'ready' && (
          <div className="stack" style={{ gap: 6 }}>
            <span className={`pill ${video.status === 'failed' ? 'error' : 'running'}`}>{video.status}</span>
            {active('download') && (
              <>
                <Progress value={active('download')!.progress} active />
                <span className="muted small">{active('download')!.progress_note}</span>
              </>
            )}
          </div>
        )}

        {noteDraft === null ? (
          <div className="row">
            <span className="note small grow">{video.note ? `“${video.note}”` : <span className="muted">No note</span>}</span>
            <button className="btn small" onClick={() => setNoteDraft(video.note ?? '')}>Edit note</button>
          </div>
        ) : (
          <div className="row">
            <input type="text" className="grow" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            <button className="btn small accent" onClick={() => void saveNote()}>Save</button>
            <button className="btn small" onClick={() => setNoteDraft(null)}>Cancel</button>
          </div>
        )}

        <Player ref={videoRef} src={src} scenes={scenes?.scenes ?? []} videoDuration={vidDuration} nowTime={nowTime}
                onTime={setNowTime} onError={() => setPlayError(true)}
                captions={{ enabled: previewCaps && settings.captions, source: settings.caption_source, pos: settings.caption_pos, style: settings.caption_style }}
                transcript={transcript} manual={manual} />
        {playError && !editCopy && (
          <p className="muted small">This file may not play in the browser — make an edit copy for a reliable preview.</p>
        )}
        <div className="mono muted small">
          {scenes ? `${scenes.scenes.length} scene cuts — tap a marker to jump` : active('scenes') ? 'Detecting scenes…' : 'No scene data yet'}
          {transcriptAsset && ` · transcript ${words} words`}
        </div>

        <div className="row wrap">
          {!scenesAsset && btn('scenes', 'Detect scenes', 'Detecting')}
          {btn('transcribe', transcriptAsset ? 'Re-transcribe' : 'Transcribe', 'Transcribing')}
          {btn('suggest', 'Suggest clips', 'Analyzing', { count: 5 }, { disabled: !transcriptAsset || !scenesAsset, title: transcriptAsset && scenesAsset ? 'Gemini picks the best moments' : 'Needs transcript + scenes first' })}
          <button className="btn small accent" onClick={() => void autoShorts()} disabled={Boolean(active('suggest')) || video.status !== 'ready'}>Auto Shorts</button>
          {btn('postkit', postkit ? 'Rewrite post kit' : 'Post kit', 'Writing', {}, { disabled: !transcriptAsset })}
          {btn('plan', plan ? 'Re-plan the edit' : 'Plan an edit', 'Planning', {}, { disabled: !scenesAsset, title: scenesAsset ? 'AI picks the shots, order, speed and look — loads into Montage' : 'Needs scene detection first', accent: !plan })}
          {!editCopy && btn('convert', 'Edit copy', 'Converting')}
          {btn('tighten', 'Remove silences', 'Tightening')}
        </div>
        {(msg || err || lastError) && (
          <div className="stack" style={{ gap: 4 }}>
            {err && <p className="job-error">{err}</p>}
            {msg && <p className="muted small">{msg}</p>}
            {!err && lastError && !activeJobs.length && <p className="job-error small">Last {lastError.type} failed: {lastError.error}</p>}
          </div>
        )}
        {postkit?.data ? <PostKit kit={postkit.data as { title?: string; description?: string; hashtags?: string[] }} /> : null}
      </section>

      {video.clips.length > 0 && (
        <section className="panel stack">
          <div className="panel-head"><h2>Clips</h2><span className="muted small">{rendered.length}/{video.clips.length} rendered</span></div>
          <ClipsList clips={video.clips} jobs={video.jobs} onUse={useClip}
                     onRender={(c) => doExport(c.start_s, c.end_s, c.id)} />
        </section>
      )}

      <section className="panel stack">
        <div className="panel-head"><h2>Export</h2></div>
        <ExportControls settings={settings} onChange={setSettings} start={start} end={end} onStart={setStart} onEnd={setEnd}
                        onMarkStart={() => mark(setStart)} onMarkEnd={() => mark(setEnd)}
                        hasTranscript={Boolean(transcriptAsset)} hasManual={Boolean(manual?.items.length)}
                        borders={borders} onDetectBars={() => void run('borders')} detectingBars={Boolean(active('borders'))}
                        previewCaps={previewCaps} onPreviewCaps={setPreviewCaps}
                        onExport={() => doExport()} disabled={video.status !== 'ready'}
                        recipeId={recipeId} onRecipe={setRecipeId} />
        <RecipeExtras settings={settings} onChange={setSettings} currentTime={() => videoRef.current?.currentTime ?? 0}
                      clipStart={parseTime(start) ?? 0} />
        <CaptionEditor videoId={video.id} manual={manual} currentTime={() => videoRef.current?.currentTime ?? 0}
                       onSaved={() => setSettings((s) => ({ ...s, caption_source: 'manual' }))} />
        <div className="row wrap">
          <span className="muted small">Clip pack</span>
          <select value={clipScope} onChange={(e) => setClipScope(e.target.value as 'whole' | 'range')} aria-label="Clip pack scope">
            <option value="whole">Whole video</option>
            <option value="range">Selected range</option>
          </select>
          <label className="slider"><span className="muted small">Max</span>
            <input type="range" min={1} max={5} step={1} value={clipMax} onChange={(e) => setClipMax(Number(e.target.value))} />
            <span className="mono small">{clipMax}s</span></label>
          <button className="btn small" onClick={doClipPack} disabled={Boolean(active('clippack')) || video.status !== 'ready'}>
            {active('clippack') ? `Shredding ${Math.round(active('clippack')!.progress ?? 0)}%` : 'Shred to clips'}
          </button>
          {asset('clip_pack') && <span className="chip ok">{(asset('clip_pack')!.data as { count?: number })?.count ?? ''} clips ready</span>}
        </div>
      </section>

      <section className="panel stack">
        <div className="panel-head"><h2>Montage</h2><span className="muted small">shots → one clip with transitions</span></div>
        <Montage video={video} plan={plan} scenes={scenes?.scenes ?? null} clipPack={clipPack}
                 onApplyPlanLook={(pl) => setSettings((st) => ({ ...st, captions: pl.captions, caption_style: pl.caption_style as RenderSettings['caption_style'],
                                                                   caption_pos: pl.caption_pos as RenderSettings['caption_pos'], grade: pl.grade as RenderSettings['grade'], vivid_amount: pl.vivid }))}
                 rangeStart={parseTime(start)} rangeEnd={parseTime(end)}
                 seek={(t) => { if (videoRef.current) { videoRef.current.currentTime = t; void videoRef.current.play() } }}
                 onRender={renderSequence} disabled={video.status !== 'ready'} />
      </section>

      <section className="panel">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="row wrap">
            {video.url && <a className="muted small" href={video.url} target="_blank" rel="noreferrer">Source page</a>}
            {video.clips.length > 0 && (
              <a className="btn small" href={timelineUrl(video.id, 'all')} download title="FCPXML timeline of the clips for DaVinci Resolve (relink the source on import)">Resolve timeline</a>
            )}
          </div>
          <button className="btn small" onClick={() => void remove()}>Remove from library</button>
        </div>
      </section>
    </div>
  )
}
