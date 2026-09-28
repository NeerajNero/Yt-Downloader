// Calls to the app's JSON API. Reads go through usePoll (lib/poll.ts); the
// mutations here call invalidate() so every screen refreshes right away.
import { invalidate } from './poll'
import type { Clip, Recipe } from './types'

async function check(r: Response) {
  if (r.ok) return r
  let msg = `${r.status} ${r.statusText}`
  try {
    const j = await r.json()
    msg = j.detail ?? j.message ?? msg
  } catch { /* not json */ }
  throw new Error(msg)
}

const json = { 'content-type': 'application/json' }

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : json, body: body === undefined ? undefined : JSON.stringify(body) })
  await check(r)
  const out = (await r.json()) as T
  invalidate()
  return out
}
export const post = <T,>(url: string, body?: unknown) => send<T>('POST', url, body ?? {})
export const patch = <T,>(url: string, body: unknown) => send<T>('PATCH', url, body)
export const del = <T,>(url: string) => send<T>('DELETE', url)

// ---- ingest ----
export interface ProbeResult {
  title: string | null; uploader: string | null; duration: number | null; thumbnail: string | null
  webpage_url: string | null; youtube_id: string | null; heights: number[]; hdr: boolean; existing_video_id: string | null
}
export const probeUrl = (url: string) => post<ProbeResult>('/api/probe', { url })
export const startDownload = (v: { url: string; quality: string; title?: string | null; youtube_id?: string | null; note?: string | null; pipeline: string }) =>
  post<{ video_id: string; job_id: string | null; existing: boolean }>('/api/download', v)

// ---- jobs ----
export const enqueue = (type: string, video_id: string | null, payload: Record<string, unknown> = {}, clip_id: string | null = null) =>
  post<{ job_id: string; existing: boolean }>('/api/jobs', { type, video_id, clip_id, payload })
export const cancelJob = (id: string) => post(`/api/jobs/${id}/cancel`)
export const retryJob = (id: string) => post(`/api/jobs/${id}/retry`)
export const clearFinishedJobs = () => del('/api/jobs/finished')

// ---- videos / clips ----
export const updateVideo = (id: string, fields: { note?: string | null; pipeline?: string }) => patch(`/api/videos/${id}`, fields)
export const deleteVideo = (id: string) => del(`/api/videos/${id}`)
export const rescanLibrary = () => post<{ added: number; missing: number; videos: number }>('/api/library/rescan')
export const insertClip = (video_id: string, start_s: number, end_s: number, title?: string | null) =>
  post<Clip>('/api/clips', { video_id, start_s, end_s, title: title ?? null })
export const setClipStatus = (id: string, status: string) => patch<Clip>(`/api/clips/${id}`, { status })
export const deleteClip = (id: string) => del(`/api/clips/${id}`)

// ---- recipes ----
export const insertRecipe = (r: { name: string; description: string | null; settings: unknown; auto_apply: boolean }) => post<Recipe>('/api/recipes', r)
export const updateRecipe = (id: string, r: { name?: string; description?: string | null; settings?: unknown; auto_apply?: boolean }) => patch<Recipe>(`/api/recipes/${id}`, r)
export const deleteRecipe = (id: string) => del(`/api/recipes/${id}`)

// ---- styles ----
export const analyzeStyle = (url: string) => post<{ style_id: string; job_id: string | null; existing: boolean }>('/api/styles', { url })
export const deleteStyle = (id: string) => del(`/api/styles/${id}`)

// ---- files ----
export function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { invalidate(); resolve(JSON.parse(xhr.responseText)) }
      else {
        let msg = `${xhr.status}`
        try { msg = JSON.parse(xhr.responseText).detail ?? msg } catch { /* */ }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })
}

export const uploadVideo = (file: File, note: string, pipeline: string, onProgress: (p: number) => void) =>
  uploadWithProgress(
    `/api/upload?filename=${encodeURIComponent(file.name)}&note=${encodeURIComponent(note)}&pipeline=${pipeline}`,
    file, onProgress,
  ) as Promise<{ video_id: string; title: string }>

export const listMusic = () => fetch('/api/music').then(check).then((r) => r.json() as Promise<string[]>)
export const uploadMusic = (file: File) =>
  fetch(`/api/music?filename=${encodeURIComponent(file.name)}`, { method: 'POST', body: file })
    .then(check).then((r) => r.json() as Promise<{ name: string }>)

export const listOverlays = () => fetch('/api/overlays').then(check).then((r) => r.json() as Promise<string[]>)
export const uploadOverlay = (file: File) =>
  fetch(`/api/overlays?filename=${encodeURIComponent(file.name)}`, { method: 'POST', body: file })
    .then(check).then((r) => r.json() as Promise<{ name: string }>)

export const fileUrl = (rel: string) => `/api/files/get?path=${encodeURIComponent(rel)}`
export const fetchJson = <T,>(rel: string) => fetch(fileUrl(rel)).then(check).then((r) => r.json() as Promise<T>)

export const saveCaptions = (videoId: string, data: { speed: number; items: { text: string; start: number; duration: number }[] }) =>
  fetch(`/api/files/${videoId}/assets/captions`, { method: 'POST', headers: json, body: JSON.stringify(data) })
    .then(check).then((r) => { invalidate(); return r.json() })

export interface Transcript {
  segments: { start: number; end: number; text: string; words: { w: string; s: number; e: number }[] }[]
}
export interface Scenes { scenes: number[]; duration: number | null }
export interface ManualCaptions { speed: number; items: { text: string; start: number; duration: number }[] }

export const timelineUrl = (videoId: string, status: 'all' | 'rendered' | 'approved') =>
  `/api/files/${videoId}/timeline.fcpxml?status=${status}`

export interface AiModels {
  configured: string[]; key: boolean; error?: string; missing?: string[]
  available: { name: string; display?: string; input_tokens?: number; output_tokens?: number }[]
}
export const aiModels = () => fetch('/api/ai/models').then(check).then((r) => r.json() as Promise<AiModels>)
