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
  shake_markers: ShakeMarker[]
  playback: Playback
  reverse_speed: number
  crop_x: number      // 0..1 — where the crop window sits horizontally (0.5 = centre)
  crop_y: number      // 0..1 — vertically
  crop_zoom: number   // 1..3 — zoom into the crop window
  effects: Effects
  fx: FxLayer[]
}

export type FxBlend = 'screen' | 'addition' | 'lighten' | 'overlay' | 'softlight'
/** An overlay clip from <library>/.fx (lens flare, light leak, dust) blended over the picture from `at` seconds. */
export interface FxLayer { file: string; at: number; opacity: number; blend: FxBlend; flip: boolean; speed: number }
export const FX_BLENDS: { value: FxBlend; label: string }[] = [
  { value: 'screen', label: 'Screen (light only)' }, { value: 'addition', label: 'Add (hotter)' }, { value: 'lighten', label: 'Lighten' },
  { value: 'overlay', label: 'Overlay (contrast)' }, { value: 'softlight', label: 'Soft light' },
]

export type Letterbox = 'none' | 'thin' | 'cinema' | 'wide'
/** Generated looks (studio/core/render.py effects_filter). 0 / false / none = off. */
export interface Effects { vignette: number; grain: number; glow: number; aberration: number; halation: number; sharpen: number; vhs: boolean; letterbox: Letterbox }
export const DEFAULT_EFFECTS: Effects = { vignette: 0, grain: 0, glow: 0, aberration: 0, halation: 0, sharpen: 0, vhs: false, letterbox: 'none' }
export const EFFECT_SLIDERS: { key: keyof Effects; label: string; hint: string }[] = [
  { key: 'vignette', label: 'Vignette', hint: 'Darkens the corners; pulls the eye to the middle.' },
  { key: 'grain', label: 'Grain', hint: 'Film grain. A little hides compression; a lot is a look.' },
  { key: 'glow', label: 'Glow', hint: 'Bloom: bright parts bleed softly. Trailer / dream look.' },
  { key: 'aberration', label: 'Aberration', hint: 'Red and blue fringes pulled apart at the edges. Gaming-edit staple.' },
  { key: 'halation', label: 'Halation', hint: 'Warm red glow around highlights, like film stock.' },
  { key: 'sharpen', label: 'Sharpen', hint: 'Crisper edges and HUD text.' },
]
export const effectsSummary = (e: Effects | undefined): string => {
  if (!e) return ''
  const on = EFFECT_SLIDERS.filter((x) => (e[x.key] as number) > 0).map((x) => `${x.label.toLowerCase()} ${e[x.key]}`)
  if (e.vhs) on.push('VHS')
  if (e.letterbox !== 'none') on.push(`${e.letterbox} bars`)
  return on.join(' · ')
}

export type Playback = 'forward' | 'reverse' | 'bounce'
export const PLAYBACKS: { value: Playback; label: string; hint: string }[] = [
  { value: 'forward', label: 'Play forward', hint: 'Normal playback.' },
  { value: 'bounce', label: 'Bounce (play, then rewind)', hint: 'Plays forward, then rewinds. A boomerang. Best on a hero moment under 6 s.' },
  { value: 'reverse', label: 'Reverse', hint: 'Plays backwards only.' },
]
export const REVERSE_SPEEDS = [1, 1.5, 2, 3, 4]
/** Output seconds of a shot after speed and playback. */
export const playbackLength = (srcLen: number, speed: number, playback: Playback, reverseSpeed: number) => {
  const fw = srcLen / (speed || 1); const rs = Math.max(1, reverseSpeed || 1)
  return playback === 'reverse' ? fw / rs : playback === 'bounce' ? fw + fw / rs : fw
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
export interface ShakeMarker { at: number; duration: number; intensity: number }

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
  watermark: null, sfx: [], zoom_markers: [], shake_markers: [], playback: 'forward', reverse_speed: 1,
  crop_x: 0.5, crop_y: 0.5, crop_zoom: 1, effects: { ...DEFAULT_EFFECTS }, fx: [],
}

export type EditLayout = 'steps' | 'page'
const LAYOUT_KEY = 'ytstudio.edit.layout'
export const getEditLayout = (): EditLayout => { try { return localStorage.getItem(LAYOUT_KEY) === 'page' ? 'page' : 'steps' } catch { return 'steps' } }
export const setEditLayout = (v: EditLayout) => { try { localStorage.setItem(LAYOUT_KEY, v) } catch { /* */ } }

/** Merge stored settings (recipe / clip.render_settings) over the defaults, dropping start/end and hints. */
export function fromStored(obj: unknown): RenderSettings {
  const o = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in o && o[k] !== undefined) out[k] = o[k]
  if (!out.watermark) out.watermark = null
  out.effects = { ...DEFAULT_EFFECTS, ...((o.effects && typeof o.effects === 'object' ? o.effects : {}) as Partial<Effects>) }
  return out as unknown as RenderSettings
}

export function summarize(s: Partial<RecipeSettings>): string {
  const bits = [
    s.orientation === 'landscape' ? '16:9' : '9:16',
    s.resolution === '4k' ? '4K' : '1080p',
    s.style === 'crop' ? 'crop' : 'blur pad',
    s.crop_zoom && s.crop_zoom > 1 ? `zoom ${s.crop_zoom.toFixed(1)}×` : '',
    (s.crop_x != null && Math.abs(s.crop_x - 0.5) > 0.01) || (s.crop_y != null && Math.abs(s.crop_y - 0.5) > 0.01) ? 'moved crop' : '',
    s.rotate && s.rotate !== 'none' ? `rotate ${s.rotate}` : '',
    s.captions ? `captions ${s.caption_style ?? 'karaoke'}` : 'no captions',
    s.look === 'hdr' ? 'HDR look' : '',
    s.grade && s.grade !== 'none' ? s.grade : '',
    s.vivid_amount ? `vivid ${s.vivid_amount}` : '',
    s.zoom === 'in' ? 'punch-in' : '',
    s.zoom_markers?.length ? `${s.zoom_markers.length} zoom markers` : '',
    s.shake_markers?.length ? `${s.shake_markers.length} shake${s.shake_markers.length > 1 ? 's' : ''}` : '',
    s.playback === 'bounce' ? `bounce ${s.reverse_speed && s.reverse_speed > 1 ? `${s.reverse_speed}× rewind` : ''}`.trim() : s.playback === 'reverse' ? 'reversed' : '',
    effectsSummary(s.effects),
    s.fx?.length ? `${s.fx.length} overlay${s.fx.length > 1 ? 's' : ''}` : '',
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
