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
}

export const DEFAULT_SETTINGS: RenderSettings = {
  style: 'blur', vivid_amount: 0, trim_x: 0, trim_y: 0, fg_crop: 0,
  captions: false, caption_source: 'auto', caption_pos: 'bottom', caption_style: 'karaoke',
  resolution: '1080', orientation: 'portrait', rotate: 'none', rotate_captions: false,
  loudness: false, zoom: 'none', look: 'none', look_sharp: 50, grade: 'none',
  music: '', music_gain: 60, duck: true,
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
