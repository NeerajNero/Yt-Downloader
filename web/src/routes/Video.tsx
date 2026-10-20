import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Progress from '../components/Progress'
import Segmented from '../components/ui/Segmented'
import { saveMontage, shotsFromSegments, toSegments, type Plan, type Segment, type ShotInfo, type Transition } from '../components/video/Montage'
import Player from '../components/video/Player'
import Timeline from '../components/video/Timeline'
import ClipsSection from '../components/video/sections/ClipsSection'
import EditPanel from '../components/video/sections/EditPanel'
import Prepare from '../components/video/sections/Prepare'
import ToolsSection from '../components/video/sections/ToolsSection'
import { deleteVideo, enqueue, fetchJson, fileUrl, requestPreview, updateVideo, type Dialogue, type ManualCaptions, type Scenes, type Tags, type Transcript } from '../lib/api'
import { bytes, duration, resolution } from '../lib/format'
import { usePoll } from '../lib/poll'
import { peakOut as peakOutOf } from '../lib/captions'
import { DEFAULT_SETTINGS, fromStored, getLivePreview, getSafeArea, setLivePreview, setSafeArea, type RenderSettings } from '../lib/settings'
import { montageLayout, outputToSource, sourceToOutput, type LayoutShot, type TimelineTicks } from '../lib/snap'
import type { Clip, VideoDetail } from '../lib/types'

type Mode = 'prepare' | 'clips' | 'edit' | 'tools'
const ACTIVE = new Set(['queued', 'claimed', 'running', 'cancel_requested'])
const GUIDE_KEY = 'ytstudio.guide.video'

export default function VideoPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { data, loading, error } = usePoll<VideoDetail>(id ? `/api/videos/${id}` : null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [nowTime, setNowTime] = useState(0)
  const [playError, setPlayError] = useState(false)
  const [range, setRange] = useState({ start: 0, end: 15 })
  const [editMode, setEditMode] = useState<'range' | 'montage'>('range')
  const [montageShots, setMontageShots] = useState<ShotInfo[] | null>(null)
  const [montageTransition, setMontageTransition] = useState<Transition>({ type: 'fade', duration: 0.35 })
  const [beatTicks, setBeatTicks] = useState<TimelineTicks | null>(null)
  const [safeArea, setSafeAreaState] = useState(getSafeArea)
  const setSafe = (v: boolean) => { setSafeAreaState(v); setSafeArea(v) }
  const [capDraft, setCapDraft] = useState<{ clipId: string | null; hook_text?: string; payoff_text?: string }>({ clipId: null })
  // Draft preview: the 540 px render of the current settings (work/preview), and which file the player plays.
  const [pv, setPv] = useState<{ status: 'idle' | 'pending' | 'ready' | 'error'; jobId: string | null; url: string | null; key: string | null; layout: LayoutShot[]; msg: string | null }>(
    { status: 'idle', jobId: null, url: null, key: null, layout: [], msg: null })
  const [playSource, setPlaySource] = useState<'source' | 'preview'>('source')
  const [livePreview, setLivePreviewState] = useState(getLivePreview)
  const setLive = (v: boolean) => { setLivePreviewState(v); setLivePreview(v) }
  const pendingSeek = useRef<number | null>(null)
  const [editStep, setEditStep] = useState<string>('cut')
  const [montageRevision, setMontageRevision] = useState(0)
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [tweakClip, setTweakClip] = useState<string | null>(null)
  const [previewCaps, setPreviewCaps] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [scenes, setScenes] = useState<Scenes | null>(null)
  const [dialogue, setDialogue] = useState<Dialogue | null>(null)
  const [tags, setTags] = useState<Tags | null>(null)
  const [manual, setManual] = useState<ManualCaptions | null>(null)
  const [clipPack, setClipPack] = useState<{ file: string; start: number; end: number }[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [guide, setGuide] = useState(() => { try { return !localStorage.getItem(GUIDE_KEY) } catch { return false } })

  const video = data ?? null
  const asset = (kind: string) => video?.assets.find((a) => a.kind === kind) ?? null
  const transcriptAsset = asset('transcript'); const scenesAsset = asset('scenes'); const captionsAsset = asset('captions')
  const editCopy = asset('edit_copy'); const clipPackAsset = asset('clip_pack'); const planAsset = asset('plan')
  const dialogueAsset = asset('dialogue'); const tagsAsset = asset('tags')
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
    if (dialogueAsset?.path) fetchJson<Dialogue>(dialogueAsset.path).then(setDialogue).catch(() => setDialogue(null))
    else setDialogue(null)
  }, [dialogueAsset?.path, dialogueAsset?.created_at])
  useEffect(() => {
    if (tagsAsset?.path) fetchJson<Tags>(tagsAsset.path).then(setTags).catch(() => setTags(null))
    else setTags(null)
  }, [tagsAsset?.path, tagsAsset?.created_at])
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
    setTweakClip(c.id)
    const rs = c.render_settings as { segments?: Partial<Segment>[]; transition?: Transition } | null
    if (rs?.segments?.length) {
      // A montage: put its shots back into the builder and open it.
      saveMontage(video.id, shotsFromSegments(rs.segments), rs.transition ?? { type: 'fade', duration: 0.35 })
      setMontageRevision((n) => n + 1)
      setEditMode('montage')
      setMsg(`Tweaking the montage "${c.title ?? 'clip'}" — its ${rs.segments.length} shots are loaded; Render montage replaces its file.`)
    } else {
      setEditMode('range')
      setMsg(`Tweaking "${c.title ?? 'clip'}" — Render replaces its file.`)
    }
    params.delete('clip'); params.set('tab', 'edit'); setParams(params, { replace: true })
  }, [wantClip, video?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeJobs = useMemo(() => (video?.jobs ?? []).filter((j) => ACTIVE.has(j.status)), [video?.jobs])
  const active = (type: string) => activeJobs.find((j) => j.type === type)
  const lastError = (video?.jobs ?? []).find((j) => j.status === 'error')

  if (error && !data) return <p className="error">{error.startsWith('Video not found') ? <>Video not found. <Link to="/library">Back to library</Link></> : `Can't reach the app: ${error}`}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  if (!video) return <p className="muted">Video not found. <Link to="/library">Back to library</Link></p>

  const src = video.storage_path ? (editCopy?.path ? fileUrl(editCopy.path) : `/api/files/${video.id}/source`) : null
  // In preview mode the element plays the draft file: map between source and output seconds (lib/snap).
  const inPreview = playSource === 'preview' && pv.status === 'ready' && Boolean(pv.url)
  const toOut = (t: number) => (inPreview ? sourceToOutput(t, pv.layout) ?? 0 : t)
  const toSrc = (t: number) => (inPreview ? outputToSource(t, pv.layout) ?? nowTime : t)
  const playhead = () => toSrc(videoRef.current?.currentTime ?? 0)
  const seek = (t: number) => { if (videoRef.current) { videoRef.current.currentTime = toOut(t); void videoRef.current.play().catch(() => {}) } }
  const pauseAt = (t: number) => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = toOut(t); setNowTime(t) } }
  const switchPlayer = (m: 'source' | 'preview') => { pendingSeek.current = nowTime; setPlaySource(m) }

  const run = async (type: string, payload: Record<string, unknown> = {}, okMsg?: string, clipId?: string) => {
    setErr(null); setMsg(null)
    try {
      await enqueue(type, video.id, payload, clipId ?? null)
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
  // The clip an edit belongs to (the one being tweaked, else the one whose range is loaded):
  // its peak, hook and payoff ride on the render payload.
  const clipFor = (target: string | null, st: number, en: number): Clip | null =>
    (target ? video.clips.find((c) => c.id === target) : null)
      ?? video.clips.find((c) => Math.abs(c.start_s - st) < 0.01 && Math.abs(c.end_s - en) < 0.01) ?? null
  const clipExtras = (clip: Clip | null, inside?: (peak: number) => boolean) => {
    const extras: Record<string, unknown> = {}
    if (clip?.peak_s != null && (!inside || inside(clip.peak_s))) extras.peak_s = clip.peak_s
    if (clip?.hook_text) extras.hook_text = clip.hook_text
    if (clip?.payoff_text) extras.payoff_text = clip.payoff_text
    return extras
  }
  const renderRange = (s?: number, e?: number, clipId?: string) => {
    const st = s ?? range.start, en = e ?? range.end
    if (en <= st) return setErr('End must be after start.')
    const target = clipId ?? tweakClip
    const extras = clipExtras(clipFor(target ?? null, st, en), (peak) => peak >= st && peak <= en)
    void run('render', { ...basePayload(), start: st, end: en, ...extras },
             'Render queued — watch it on the Jobs tab; the clip lands in Clips and Review.', target ?? undefined)
    if (!clipId) setTweakClip(null)
  }
  // The payload a Preview sends: exactly what Render would, from the current draft settings.
  const draftPayload = (): Record<string, unknown> | null => {
    if (editMode === 'montage') {
      if (!montageShots?.length) return null
      return { ...basePayload(), segments: toSegments(montageShots), transition: montageTransition, ...clipExtras(clipFor(tweakClip, range.start, range.end)) }
    }
    if (range.end <= range.start) return null
    return { ...basePayload(), start: range.start, end: range.end, ...clipExtras(clipFor(tweakClip, range.start, range.end), (peak) => peak >= range.start && peak <= range.end) }
  }
  const draftKey = mode === 'edit' ? JSON.stringify(draftPayload()) : null
  const previewStale = pv.status === 'ready' && pv.key !== draftKey
  const requestPreviewNow = async () => {
    const payload = draftPayload()
    if (!payload) return setErr(editMode === 'montage' ? 'Load some shots first.' : 'End must be after start.')
    const key = JSON.stringify(payload)
    const layout = editMode === 'montage' && montageShots?.length ? montageLayout(montageShots, montageTransition).layout
      : [{ start: range.start, end: range.end, speed: 1, len: range.end - range.start, offset: 0 }]
    setErr(null)
    try {
      const r = await requestPreview(video.id, payload)
      setPv({ status: r.cached ? 'ready' : 'pending', jobId: r.job_id, url: r.url, key, layout, msg: null })
      if (r.cached) switchPlayer('preview')
    } catch (e) { setPv((s) => ({ ...s, status: 'error', msg: (e as Error).message })) }
  }
  // Follow the preview job through the per-second poll; switch the player when the file lands.
  useEffect(() => {
    if (pv.status !== 'pending' || !pv.jobId) return
    const j = video.jobs.find((x) => x.id === pv.jobId)
    if (!j) return
    if (j.status === 'done') { setPv((s) => ({ ...s, status: 'ready', msg: null })); pendingSeek.current = nowTime; setPlaySource('preview') }
    else if (j.status === 'error') setPv((s) => ({ ...s, status: 'error', msg: `Preview failed: ${j.error ?? 'unknown error'}` }))
    else if (j.status === 'cancelled') setPv((s) => ({ ...s, status: s.url ? 'ready' : 'idle' }))
  }, [video.jobs, pv.status, pv.jobId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Live: re-preview 800 ms after the last change.
  useEffect(() => {
    if (!livePreview || mode !== 'edit' || !draftKey || draftKey === pv.key || draftKey === 'null') return
    const t = window.setTimeout(() => { void requestPreviewNow() }, 800)
    return () => window.clearTimeout(t)
  }, [draftKey, livePreview, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the position when switching between source and preview (the element reloads its src).
  const onPreviewLoaded = () => {
    if (pendingSeek.current != null && videoRef.current) { videoRef.current.currentTime = toOut(pendingSeek.current); pendingSeek.current = null }
  }
  useEffect(() => {
    if (playSource === 'source' && pendingSeek.current != null && videoRef.current) {
      const t = pendingSeek.current; pendingSeek.current = null
      const el = videoRef.current
      const apply = () => { el.currentTime = t; el.removeEventListener('loadedmetadata', apply) }
      if (el.readyState >= 1) apply(); else el.addEventListener('loadedmetadata', apply)
    }
  }, [playSource])
  // Leaving Edit: back to the source.
  useEffect(() => { if (mode !== 'edit' && playSource === 'preview') setPlaySource('source') }, [mode, playSource])

  const renderSequence = (segments: unknown[], transition: { type: string; duration: number }) => {
    // The peak may sit outside every shot: the backend then skips the music alignment and says so in the job result.
    const extras = clipExtras(clipFor(tweakClip, range.start, range.end))
    void run('render', { ...basePayload(), segments, transition, ...extras },
             tweakClip ? 'Montage re-render queued — it replaces the clip\'s file.' : 'Montage queued — watch it on the Jobs tab.', tweakClip ?? undefined)
    setTweakClip(null)
  }

  const prepareAll = async () => {
    // "prepare" lets the pipeline chain the rest (dialogue after the transcript, tags after scenes, post kit, AI picks + plan).
    if (video.pipeline === 'none') { try { await updateVideo(video.id, { pipeline: 'prepare' }) } catch (e) { setErr((e as Error).message) } }
    for (const t of ['transcribe', 'scenes', 'borders'] as const) if (!asset(t === 'transcribe' ? 'transcript' : t)) await run(t)
    if (transcriptAsset && !dialogueAsset) await run('dialogue')
    if (scenesAsset && !tagsAsset) await run('tags')
    if (!editCopy) await run('convert')
    setMsg('Preparing — transcript, scene cuts and bars are queued; dialogue lines, shot tags, the post kit and AI picks follow.')
  }
  const autoShorts = async () => {
    setErr(null)
    try {
      await updateVideo(video.id, { pipeline: 'shorts' })
      if (transcriptAsset && scenesAsset) await run('suggest', { count: 3 }, 'Auto Shorts started — renders land in Review as they finish.')
      else { await prepareAll(); setMsg('Auto Shorts started — preparing first, then picking and rendering.') }
    } catch (e) { setErr((e as Error).message) }
  }
  const useClip = (c: Clip) => { setRange({ start: c.start_s, end: c.end_s }); setEditMode('range'); seek(c.start_s); setMode('edit') }
  const saveNote = async () => { await updateVideo(video.id, { note: noteDraft?.trim() || null }); setNoteDraft(null) }
  const remove = async () => {
    if (!window.confirm('Remove this video from the library? Files on disk are kept.')) return
    await deleteVideo(video.id); nav('/library')
  }
  const dismissGuide = () => { setGuide(false); try { localStorage.setItem(GUIDE_KEY, '1') } catch { /* */ } }

  // Hook / payoff preview on the player: the active clip's texts (live drafts win), the player's
  // position in output time, and the timing inputs — single range or montage (lib/snap).
  const previewClip = mode === 'edit' ? clipFor(tweakClip, range.start, range.end) : null
  const draftFor = (kind: 'hook_text' | 'payoff_text') => (previewClip && capDraft.clipId === previewClip.id && capDraft[kind] !== undefined ? capDraft[kind]! : previewClip?.[kind] ?? null)
  let captionPreview = null
  if (previewClip && (draftFor('hook_text') || draftFor('payoff_text'))) {
    let outTime: number | null, durationOut: number, peakOutS: number | null
    if (editMode === 'montage' && montageShots?.length) {
      const lay = montageLayout(montageShots, montageTransition)
      outTime = sourceToOutput(nowTime, lay.layout); durationOut = lay.total
      peakOutS = previewClip.peak_s != null ? sourceToOutput(previewClip.peak_s, lay.layout) : null
    } else {
      outTime = nowTime >= range.start && nowTime <= range.end ? nowTime - range.start : null
      durationOut = Math.max(0, range.end - range.start); peakOutS = peakOutOf(previewClip.peak_s, range)
    }
    const capOrient = settings.rotate_captions && (settings.rotate === 'right' || settings.rotate === 'left') ? (settings.orientation === 'portrait' ? 'landscape' : 'portrait') : settings.orientation
    captionPreview = { hook: draftFor('hook_text'), payoff: draftFor('payoff_text'), outTime, durationOut, peakOut: peakOutS, style: settings.caption_style, orientation: capOrient }
  }
  const frameProps = { style: settings.style, orientation: settings.orientation, fg_crop: settings.fg_crop, trim_x: settings.trim_x, trim_y: settings.trim_y,
                       x: settings.crop_x, y: settings.crop_y, zoom: settings.crop_zoom }

  const prepCount = ['transcript', 'scenes', 'dialogue', 'tags'].filter((k) => !asset(k)).length
  const tabs: { value: Mode; label: string; badge?: string | number | null }[] = [
    { value: 'prepare', label: 'Prepare', badge: prepCount || null },
    { value: 'clips', label: 'Clips', badge: video.clips.length || null },
    { value: 'edit', label: 'Edit' },
    { value: 'tools', label: 'Tools' },
  ]

  return (
    <div className="stack">
      <section className="panel video-layout">
       <div className="video-main stack">
        <div className="panel-head">
          <h2 className="video-h">{video.title}</h2>
          <Link to="/library" className="btn small">Library</Link>
        </div>
        <div className="mono muted small">
          {[video.channel, resolution(video.width, video.height), bytes(video.size_bytes), duration(video.duration)].filter(Boolean).join(' · ')}
        </div>
        {video.status !== 'ready' && (
          <div className="stack" style={{ gap: 6 }}>
            <span className={`pill ${video.status === 'failed' || video.status === 'missing' ? 'error' : 'running'}`}>{video.status === 'missing' ? 'file missing on disk' : video.status}</span>
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
                transcript={transcript} manual={manual} big={mode === 'edit' && editStep === 'frame'}
                crop={mode === 'edit' && editStep === 'frame' ? { ...frameProps, onChange: (c) => setSettings((s) => ({ ...s, crop_x: c.x, crop_y: c.y, crop_zoom: c.zoom })) } : null}
                frame={mode === 'edit' ? frameProps : null} safeArea={mode === 'edit' && safeArea} captionPreview={captionPreview}
                preview={mode === 'edit' && (pv.url || pv.status === 'pending' || pv.status === 'error') ? {
                  url: pv.status === 'ready' || pv.status === 'pending' ? pv.url : null, mode: playSource, onMode: switchPlayer, pending: pv.status === 'pending',
                  stale: previewStale, toSource: (t) => outputToSource(t, pv.layout) ?? t, onLoaded: onPreviewLoaded, message: pv.status === 'error' ? pv.msg : null } : null} />
        {playError && !editCopy && <p className="muted small">This file may not play here — Prepare → Preview copy makes one that does.</p>}
        <Timeline videoDuration={vidDuration} nowTime={nowTime} scenes={scenes?.scenes ?? []}
                  dialogue={dialogue?.lines ?? []} closeups={tags?.shots.filter((s) => s.closeup) ?? []}
                  range={mode === 'edit' ? range : null} onRange={setRange}
                  shots={mode === 'edit' && editMode === 'montage' ? montageShots ?? undefined : undefined} onSeek={seek}
                  ticks={mode === 'edit' && editMode === 'montage' ? beatTicks : null}
                  peak={mode === 'edit' && editMode === 'montage' ? beatTicks?.peak ?? null : null}
                  drop={mode === 'edit' && editMode === 'montage' && beatTicks?.beats.length ? beatTicks.drop : null} />

       </div>
       <div className="video-side stack">
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
                        musicName={settings.music} nowTime={nowTime} playhead={playhead} onSeek={seek} selectedId={tweakClip}
                        onLoadPlan={() => { setEditMode('montage'); setMode('edit'); setMsg('In Edit → What → Montage, tap "AI plan" to load the shots.') }} />
        )}
        {mode === 'edit' && (
          <EditPanel video={video} settings={settings} onChange={setSettings} range={range} onRange={setRange}
                     mode={editMode} onMode={setEditMode} playhead={playhead} seek={seek} plan={plan}
                     scenes={scenes?.scenes ?? null} dialogue={dialogue?.lines ?? null} tags={tags?.shots ?? null} clipPack={clipPack} manual={manual} hasTranscript={Boolean(transcriptAsset)}
                     borders={borders} active={active} run={(t, pl, ok) => void run(t, pl, ok)}
                     previewCaps={previewCaps} onPreviewCaps={setPreviewCaps} recipeId={recipeId} onRecipe={setRecipeId}
                     onRender={() => renderRange()} onRenderSequence={renderSequence} onBeatTicks={setBeatTicks}
                     onMontageShots={(shots, tr) => { setMontageShots(shots); if (tr) setMontageTransition(tr) }}
                     safeArea={safeArea} onSafeArea={setSafe} pauseAt={pauseAt} montageStart={montageShots?.[0]?.start ?? null}
                     onPreview={() => void requestPreviewNow()} previewPending={pv.status === 'pending'} livePreview={livePreview} onLivePreview={setLive}
                     onCaptionDraft={(kind, value) => setCapDraft((d) => ({ ...(d.clipId === previewClip?.id ? d : { clipId: previewClip?.id ?? null }), clipId: previewClip?.id ?? null, [kind]: value }))}
                     tweakingClip={tweakClip} onStep={setEditStep} shotCount={montageShots?.length ?? 0} montageRevision={montageRevision} />
        )}
        {mode === 'tools' && <ToolsSection video={video} range={range} active={active} run={(t, pl, ok) => void run(t, pl, ok)} onRemove={() => void remove()} />}
       </div>
      </section>
    </div>
  )
}
