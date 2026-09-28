// Shapes returned by the app's JSON API (studio/routes/state.py).

export type JobStatus = 'queued' | 'running' | 'cancel_requested' | 'done' | 'error' | 'cancelled'

export interface Job {
  id: string
  type: string
  status: JobStatus
  priority: number
  progress: number | null
  progress_note: string | null
  error: string | null
  attempts: number
  max_attempts: number
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
  video_id: string | null
  clip_id: string | null
  parent_job_id: string | null
  result: Record<string, unknown> | null
}

export interface JobRow extends Job {
  video: { id: string; title: string } | null
  clip: { id: string; title: string | null; start_s: number; end_s: number } | null
}

export interface Asset {
  id: string
  kind: string
  path: string
  data: Record<string, unknown> | null
  created_at: string
}

export type ClipStatus = 'proposed' | 'approved' | 'rendering' | 'rendered' | 'rejected' | 'posted'

export interface Clip {
  id: string
  video_id: string
  recipe_id: string | null
  start_s: number
  end_s: number
  title: string | null
  hook: string | null
  reason: string | null
  origin: 'manual' | 'ai_suggest' | 'recipe'
  status: ClipStatus
  output_path: string | null
  render_settings: Record<string, unknown> | null
  job_id: string | null
  created_at: string
  updated_at: string
}

export type VideoStatus = 'new' | 'downloading' | 'ready' | 'failed' | 'missing'
export type Pipeline = 'none' | 'prepare' | 'shorts'

interface VideoBase {
  id: string
  title: string
  channel: string | null
  duration: number | null
  width: number | null
  height: number | null
  vcodec: string | null
  status: VideoStatus
  pipeline: Pipeline
  note: string | null
  storage_path: string | null
  thumb_path: string | null
  size_bytes: number | null
  created_at: string
}

export interface LibraryVideo extends VideoBase {
  assets: { id: string; kind: string; data: Record<string, unknown> | null }[]
  clips_count: number
  rendered_count: number
  jobs: Job[]
}

export interface VideoDetail extends VideoBase {
  url: string | null
  assets: Asset[]
  clips: Clip[]
  jobs: Job[]
}

export interface Recipe {
  id: string
  name: string
  description: string | null
  settings: Record<string, unknown>
  auto_apply: boolean
  created_at: string
  updated_at: string
  clips_count: number
}

export interface PostKitData { title?: string; description?: string; hashtags?: string[] }

export interface ReviewClip extends Clip {
  recipe: { id: string; name: string } | null
  video: { id: string; title: string; note: string | null; postkit: PostKitData | null }
}

export interface Style {
  id: string
  url: string
  youtube_id: string | null
  title: string | null
  channel: string | null
  duration: number | null
  width: number | null
  height: number | null
  ref_path: string | null
  thumb_path: string | null
  status: 'new' | 'analyzing' | 'ready' | 'failed'
  error: string | null
  measured: Record<string, unknown> | null
  report: Record<string, unknown> | null
  recipe: Record<string, unknown> | null
  resolve_notes: string | null
  created_at: string
  job: { id: string; status: JobStatus; progress: number | null; progress_note: string | null } | null
}

export interface AppConfig {
  gemini: boolean
  library_dir: string
  ffmpeg: string
  encoder: string
  whisper: { model: string; device: string; compute_type: string }
  cookies: boolean
  active_jobs: number
}
