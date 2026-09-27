import { useMutation, useSubscription } from '@apollo/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Progress from '../components/Progress'
import Segmented from '../components/ui/Segmented'
import type { Plan } from '../components/video/Montage'
import Player from '../components/video/Player'
import Timeline from '../components/video/Timeline'
import ClipsSection from '../components/video/sections/ClipsSection'
import EditPanel from '../components/video/sections/EditPanel'
import Prepare from '../components/video/sections/Prepare'
import ToolsSection from '../components/video/sections/ToolsSection'
import {
  DeleteVideoDocument, EnqueueDocument, UpdateVideoDocument, VideoDetailDocument,
  type VideoDetailSubscription,
} from '../gql/generated'
import { fetchJson, fileUrl, type ManualCaptions, type Scenes, type Transcript } from '../lib/api'
import { bytes, duration, resolution } from '../lib/format'
import { DEFAULT_SETTINGS, fromStored, type RenderSettings } from '../lib/settings'

type Video = NonNullable<VideoDetailSubscription['videos_by_pk']>
type Clip = Video['clips'][number]
type Mode = 'prepare' | 'clips' | 'edit' | 'tools'
const ACTIVE = new Set(['queued', 'claimed', 'running', 'cancel_requested'])
const GUIDE_KEY = 'ytstudio.guide.video'

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
  const [range, setRange] = useState({ start: 0, end: 15 })
  const [editMode, setEditMode] = useState<'range' | 'montage'>('range')
  const [montageShots, setMontageShots] = useState<{ start: number; end: number; active?: boolean }[] | null>(null)
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [tweakClip, setTweakClip] = useState<string | null>(null)
  const [previewCaps, setPreviewCaps] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [scenes, setScenes] = useState<Scenes | null>(null)
  const [manual, setManual] = useState<ManualCaptions | null>(null)
  const [clipPack, setClipPack] = useState<{ file: string; start: number; end: number }[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [guide, setGuide] = useState(() => { try { return !localStorage.getItem(GUIDE_KEY) } catch { return false } })

  const video = data?.videos_by_pk ?? null
  const asset = (kind: string) => video?.assets.find((a) => a.kind === kind) ?? null
  const transcriptAsset = asset('transcript'); const scenesAsset = asset('scenes'); const captionsAsset = asset('captions')
  const editCopy = asset('edit_copy'); const clipPackAsset = asset('clip_pack'); const planAsset = asset('plan')
  const plan = (planAsset?.data ?? null) as Plan | null
  const borders = (asset('borders')?.data ?? null) as { trim_x: number; trim_y: number } | null

  // Mode lives in the URL so Review → Tweak and back/forward land on the right tab.
  const mode = (params.get('tab') as Mode) || (video && !transcriptAsset && !scenesAsset ? 'prepare' : 'edit')
  const setMode = (m: Mode) => { params.set('tab', m); setParams(params, { replace: true }) }

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

  // Default range: the first 15 s (or the whole thing if shorter) once we know the duration.
  const vidDuration = video?.duration ?? scenes?.duration ?? 0
  useEffect(() => {
    if (vidDuration) setRange((r) => (r.end > vidDuration ? { start: 0, end: Math.min(15, vidDuration) } : r))
  }, [vidDuration])

  // "Tweak" from Review: /video/:id?clip=<id> loads that clip's range + settings into Edit.
  const wantClip = params.get('clip')
  useEffect(() => {
    if (!wantClip || !video) return
    const c = video.clips.find((x) => x.id === wantClip)
    if (!c) return
    setRange({ start: c.start_s, end: c.end_s })
    if (c.render_settings) setSettings(fromStored(c.render_settings))
    setRecipeId((c.render_settings as { recipe_id?: string } | null)?.recipe_id ?? null)
    setTweakClip(c.id); setEditMode('range')
    setMsg(`Tweaking "${c.title ?? 'clip'}" — Render replaces its file.`)
    params.delete('clip'); params.set('tab', 'edit'); setParams(params, { replace: true })
  }, [wantClip, video?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeJobs = useMemo(() => (video?.jobs ?? []).filter((j) => ACTIVE.has(j.status)), [video?.jobs])
  const active = (type: string) => activeJobs.find((j) => j.type === type)
  const lastError = (video?.jobs ?? []).find((j) => j.status === 'error')

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  if (!video) return <p className="muted">Video not found. <Link to="/library">Back to library</Link></p>

  const src = video.storage_path ? (editCopy?.path ? fileUrl(editCopy.path) : `/api/files/${video.id}/source`) : null
  const playhead = () => videoRef.current?.currentTime ?? 0
  const seek = (t: number) => { if (videoRef.current) { videoRef.current.currentTime = t; void videoRef.current.play().catch(() => {}) } }

  const run = async (type: string, payload: Record<string, unknown> = {}, okMsg?: string, clipId?: string) => {
    setErr(null); setMsg(null)
    try {
      await enqueue({ variables: { type, video_id: video.id, clip_id: clipId ?? null, payload } })
      if (okMsg) setMsg(okMsg)
    } catch (e) { setErr((e as Error).message) }
  }
  const basePayload = () => {
    const fg = settings.style === 'blur' ? settings.fg_crop : 0
    const payload: Record<string, unknown> = { ...settings, fg_crop: fg }
    if (!payload.watermark) delete payload.watermark
    if (recipeId) payload.recipe_id = recipeId
    return payload
  }
  const renderRange = (s?: number, e?: number, clipId?: string) => {
    const st = s ?? range.start, en = e ?? range.end
    if (en <= st) return setErr('End must be after start.')
    void run('render', { ...basePayload(), start: st, end: en }, 'Render queued — watch it on the Jobs tab; the clip lands in Clips and Review.', clipId ?? tweakClip ?? undefined)
    if (!clipId) setTweakClip(null)
  }
  const renderSequence = (segments: unknown[], transition: { type: string; duration: number }) =>
    void run('render', { ...basePayload(), segments, transition }, 'Montage queued — watch it on the Jobs tab.')

  const prepareAll = async () => {
    for (const t of ['transcribe', 'scenes', 'borders'] as const) if (!asset(t === 'transcribe' ? 'transcript' : t)) await run(t)
    if (!editCopy) await run('convert')
    setMsg('Preparing — transcript, scene cuts and bars are queued; the post kit follows the transcript.')
  }
  const autoShorts = async () => {
    setErr(null)
    try {
      await updateVideo({ variables: { id: video.id, note: video.note ?? null, pipeline: 'shorts' } })
      if (transcriptAsset && scenesAsset) await run('suggest', { count: 3 }, 'Auto Shorts started — renders land in Review as they finish.')
      else { await prepareAll(); setMsg('Auto Shorts started — preparing first, then picking and rendering.') }
    } catch (e) { setErr((e as Error).message) }
  }
  const useClip = (c: Clip) => { setRange({ start: c.start_s, end: c.end_s }); setEditMode('range'); seek(c.start_s); setMode('edit') }
  const saveNote = async () => { await updateVideo({ variables: { id: video.id, note: noteDraft?.trim() || null, pipeline: video.pipeline } }); setNoteDraft(null) }
  const remove = async () => {
    if (!window.confirm('Remove this video from the library? Files on disk are kept.')) return
    await deleteVideo({ variables: { id: video.id } }); nav('/library')
  }
  const dismissGuide = () => { setGuide(false); try { localStorage.setItem(GUIDE_KEY, '1') } catch { /* */ } }

  const prepCount = ['transcript', 'scenes'].filter((k) => !asset(k)).length
  const tabs: { value: Mode; label: string; badge?: string | number | null }[] = [
    { value: 'prepare', label: 'Prepare', badge: prepCount || null },
    { value: 'clips', label: 'Clips', badge: video.clips.length || null },
    { value: 'edit', label: 'Edit' },
    { value: 'tools', label: 'Tools' },
  ]

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-head">
          <h2 className="video-h">{video.title}</h2>
          <Link to="/library" className="btn small">Library</Link>
        </div>
        <div className="mono muted small">
          {[video.channel, resolution(video.width, video.height), bytes(video.size_bytes), duration(video.duration)].filter(Boolean).join(' · ')}
        </div>
        {video.status !== 'ready' && (
          <div className="stack" style={{ gap: 6 }}>
            <span className={`pill ${video.status === 'failed' ? 'error' : 'running'}`}>{video.status}</span>
            {active('download') && (<><Progress value={active('download')!.progress} active /><span className="muted small">{active('download')!.progress_note}</span></>)}
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

        <Player ref={videoRef} src={src} nowTime={nowTime} onTime={setNowTime} onError={() => setPlayError(true)}
                captions={{ enabled: previewCaps && settings.captions, source: settings.caption_source, pos: settings.caption_pos, style: settings.caption_style }}
                transcript={transcript} manual={manual} />
        {playError && !editCopy && <p className="muted small">This file may not play here — Prepare → Preview copy makes one that does.</p>}
        <Timeline videoDuration={vidDuration} nowTime={nowTime} scenes={scenes?.scenes ?? []}
                  range={mode === 'edit' && editMode === 'range' ? range : null} onRange={setRange}
                  shots={mode === 'edit' && editMode === 'montage' ? montageShots ?? undefined : undefined} onSeek={seek} />

        {guide && (
          <div className="guide">
            <span className="small"><strong>How it works:</strong> 1 Prepare the video → 2 pick Clips (or let AI) → 3 Edit the look and Render → review on the Review tab.</span>
            <button className="btn small" onClick={dismissGuide}>Got it</button>
          </div>
        )}
        <Segmented value={mode} options={tabs} onChange={setMode} />
        {(msg || err || lastError) && (
          <div className="stack" style={{ gap: 4 }}>
            {err && <p className="job-error">{err}</p>}
            {msg && <p className="muted small">{msg}</p>}
            {!err && lastError && !activeJobs.length && <p className="job-error small">Last {lastError.type} failed: {lastError.error}</p>}
          </div>
        )}

        {mode === 'prepare' && <Prepare video={video} active={active} run={(t, pl, ok) => void run(t, pl, ok)} prepareAll={() => void prepareAll()} />}
        {mode === 'clips' && (
          <ClipsSection video={video} plan={plan} active={active} run={(t, pl, ok) => void run(t, pl, ok)} autoShorts={() => void autoShorts()}
                        onUse={useClip} onRender={(c) => renderRange(c.start_s, c.end_s, c.id)}
                        onLoadPlan={() => { setEditMode('montage'); setMode('edit'); setMsg('In Edit → What → Montage, tap "AI plan" to load the shots.') }} />
        )}
        {mode === 'edit' && (
          <EditPanel video={video} settings={settings} onChange={setSettings} range={range} onRange={setRange}
                     mode={editMode} onMode={setEditMode} playhead={playhead} seek={seek} plan={plan}
                     scenes={scenes?.scenes ?? null} clipPack={clipPack} manual={manual} hasTranscript={Boolean(transcriptAsset)}
                     borders={borders} active={active} run={(t, pl, ok) => void run(t, pl, ok)}
                     previewCaps={previewCaps} onPreviewCaps={setPreviewCaps} recipeId={recipeId} onRecipe={setRecipeId}
                     onRender={() => renderRange()} onRenderSequence={renderSequence} onMontageShots={setMontageShots}
                     tweakingClip={tweakClip} />
        )}
        {mode === 'tools' && <ToolsSection video={video} range={range} active={active} run={(t, pl, ok) => void run(t, pl, ok)} onRemove={() => void remove()} />}
      </section>
    </div>
  )
}
