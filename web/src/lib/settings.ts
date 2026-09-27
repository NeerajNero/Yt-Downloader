// Render settings = the `render` job payload (worker/agent/jobs/schemas.py).
// Presets live in localStorage until Phase 3 turns them into `recipes` rows.

export interface RenderSettings {
  style: 'blur' | 'crop'
  vivid_amount: number
  trim_x: number
  trim_y: number
  fg_crop: number
  captions: boolean
  caption_source: 'auto' | 'manual'
  caption_pos: 'bottom' | 'middle' | 'top'
  caption_style: 'karaoke' | 'typewriter' | 'pop' | 'minimal'
  resolution: '1080' | '4k'
  orientation: 'portrait' | 'landscape'
  rotate: 'none' | 'right' | 'left' | '180'
  rotate_captions: boolean
  loudness: boolean
  zoom: 'none' | 'in'
  look: 'none' | 'hdr'
  look_sharp: number
  grade: 'none' | 'teal_orange' | 'moody' | 'warm' | 'cool' | 'bw'
  music: string
  music_gain: number
  duck: boolean
  watermark: Watermark | null
  sfx: SfxLayer[]
  zoom_markers: ZoomMarker[]
}

export interface Watermark {
  file: string
  position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'top_center' | 'bottom_center'
  scale: number
  opacity: number
  margin: number
}
export interface SfxLayer { file: string; at: number; gain: number }
export interface ZoomMarker { at: number; duration: number; zoom: number }

/** Recipe = RenderSettings + auto-apply hints. */
export interface RecipeSettings extends RenderSettings {
  auto_trim?: boolean
  captions_if_speech?: boolean
}

export const DEFAULT_SETTINGS: RenderSettings = {
  style: 'blur', vivid_amount: 0, trim_x: 0, trim_y: 0, fg_crop: 0,
  captions: false, caption_source: 'auto', caption_pos: 'bottom', caption_style: 'karaoke',
  resolution: '1080', orientation: 'portrait', rotate: 'none', rotate_captions: false,
  loudness: false, zoom: 'none', look: 'none', look_sharp: 50, grade: 'none',
  music: '', music_gain: 60, duck: true,
  watermark: null, sfx: [], zoom_markers: [],
}

/** Merge stored settings (recipe / clip.render_settings) over the defaults, dropping start/end and hints. */
export function fromStored(obj: unknown): RenderSettings {
  const o = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in o && o[k] !== undefined) out[k] = o[k]
  if (!out.watermark) out.watermark = null
  return out as unknown as RenderSettings
}

export function summarize(s: Partial<RecipeSettings>): string {
  const bits = [
    s.orientation === 'landscape' ? '16:9' : '9:16',
    s.resolution === '4k' ? '4K' : '1080p',
    s.style === 'crop' ? 'crop' : 'blur pad',
    s.rotate && s.rotate !== 'none' ? `rotate ${s.rotate}` : '',
    s.captions ? `captions ${s.caption_style ?? 'karaoke'}` : 'no captions',
    s.look === 'hdr' ? 'HDR look' : '',
    s.grade && s.grade !== 'none' ? s.grade : '',
    s.vivid_amount ? `vivid ${s.vivid_amount}` : '',
    s.zoom === 'in' ? 'punch-in' : '',
    s.zoom_markers?.length ? `${s.zoom_markers.length} zoom markers` : '',
    s.watermark?.file ? 'watermark' : '',
    s.sfx?.length ? `${s.sfx.length} sfx` : '',
    s.music ? 'music' : '',
    s.loudness ? '-14 LUFS' : '',
    s.auto_trim ? 'auto trim' : '',
  ]
  return bits.filter(Boolean).join(' · ')
}

const KEY = 'ytstudio.presets'

export function loadPresets(): Record<string, RenderSettings> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function savePresets(p: Record<string, RenderSettings>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch { /* private mode etc. */ }
}
