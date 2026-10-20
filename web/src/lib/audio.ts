// Audio rules mirrored from studio/core/render.py (shot_audio) and core/dialogue.py (audio_for_shots).
export type SourceAudio = 'keep' | 'mute'
export type DuckMode = 'off' | 'light' | 'medium' | 'heavy'
export const DUCK_MODES: { value: DuckMode; label: string; hint: string }[] = [
  { value: 'off', label: 'No ducking', hint: 'Music stays at its level under the voice.' },
  { value: 'light', label: 'Light', hint: 'Gentle dip (ratio 4, slow release).' },
  { value: 'medium', label: 'Medium', hint: 'The usual: clear voice, music still present (ratio 8).' },
  { value: 'heavy', label: 'Heavy', hint: 'Music almost disappears under speech (ratio 16, fast).' },
]
export const ATEMPO_MIN = 0.25, ATEMPO_MAX = 4.0
export const GAIN_MIN = -30, GAIN_MAX = 6

/** Seconds of [a, b] covered by dialogue lines. */
export function overlap(a: number, b: number, lines: { start: number; end: number }[]): number {
  let total = 0
  for (const l of lines) total += Math.max(0, Math.min(b, l.end) - Math.max(a, l.start))
  return total
}

/** 'keep' for shots overlapping a dialogue line, 'mute' for the rest. */
export const audioForShots = (shots: { start: number; end: number }[], lines: { start: number; end: number }[] | null | undefined): SourceAudio[] =>
  shots.map((s) => (lines && overlap(s.start, s.end, lines) > 0 ? 'keep' : 'mute'))

/** Why a shot's own sound will be silent in the render, or null when it plays (user mutes are not a reason). */
export function autoMuteReason(shot: { speed: number; reverse?: boolean; playback?: string }): string | null {
  if (shot.reverse || shot.playback === 'reverse') return 'reversed: audio muted'
  if (shot.speed < ATEMPO_MIN || shot.speed > ATEMPO_MAX) return `${shot.speed}x is outside 0.25–4x: audio muted`
  return null
}

/** The legacy boolean `duck` maps onto the presets. */
export const duckMode = (v: unknown): DuckMode => (v === true ? 'medium' : v === false || v == null ? 'off' : (['off', 'light', 'medium', 'heavy'].includes(v as string) ? v as DuckMode : 'off'))
