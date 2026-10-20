// Beat snapping for the montage (docs/PLAYBOOK.md): pure functions, no React.
// Output-time maths mirror studio/core/render.py (sequence_layout, source_to_output);
// the music grid is anchored the way the renderer anchors it: the track's drop lands on
// the clip's peak, so beat_out = peak_out + (beat - drop).
import type { BeatsGrid } from './api'
import { playbackLength, type Playback } from './settings'

export interface Transition { type: string; duration: number }
export interface SnapShot {
  id?: string
  start: number; end: number; speed: number
  playback: Playback; reverse_speed: number
  transition: Transition | null
  reverse?: boolean           // plays backwards (same output length)
}
export interface LayoutShot { start: number; end: number; speed: number; len: number; offset: number; reverse?: boolean }
export interface Layout { layout: LayoutShot[]; total: number; bounds: { d: number }[] }
export interface BeatsOut { beats: number[]; downbeats: number[] }
export interface TimelineTicks { beats: number[]; downbeats: number[]; peak: number | null; drop: number | null; warning: string | null }

export const SNAP_MAX_DIST = 0.25   // seconds: further than this from a beat = no snap
export const MIN_SHOT_S = 0.4       // a snap never leaves a shot shorter than this
export const ON_BEAT_TOL = 0.05     // "sits on a beat" for the downbeat hint
export const PEAK_OUTSIDE_WARNING = 'peak is not inside any shot, music will loop instead of aligning'
const r2 = (x: number) => Math.round(x * 100) / 100

/** Mirror of render.sequence_layout: each shot's output length and offset, with xfade overlaps. */
export function montageLayout(shots: SnapShot[], fallback: Transition): Layout {
  const lens = shots.map((s) => playbackLength(s.end - s.start, s.speed, s.playback, s.reverse_speed))
  const bounds: { d: number }[] = []
  for (let k = 1; k < shots.length; k++) {
    const t = shots[k - 1].transition ?? fallback
    let d = t && t.type !== 'cut' ? (t.duration || 0.35) : 0
    if (d) d = Math.min(d, lens[k - 1] / 2, lens[k] / 2)
    bounds.push({ d })
  }
  const layout: LayoutShot[] = []
  let offset = 0
  shots.forEach((s, k) => {
    layout.push({ start: s.start, end: s.end, speed: s.speed, len: lens[k], offset, reverse: Boolean(s.reverse) })
    offset += lens[k] - (k < bounds.length ? bounds[k].d : 0)
  })
  const last = layout[layout.length - 1]
  return { layout, total: last ? last.offset + last.len : 0, bounds }
}

/** Mirror of render.source_to_output: the first shot containing t wins; null in a gap. */
export function sourceToOutput(t: number, layout: LayoutShot[]): number | null {
  for (const L of layout) if (L.start <= t && t <= L.end) return L.offset + (L.reverse ? (L.end - t) : (t - L.start)) / (L.speed || 1)
  return null
}

/** Inverse of sourceToOutput: a preview-file time back into source seconds (time runs backwards inside a reversed shot). */
export function outputToSource(tOut: number, layout: LayoutShot[]): number | null {
  for (const L of layout) if (tOut >= L.offset && tOut <= L.offset + L.len) {
    const d = (tOut - L.offset) * (L.speed || 1)
    return L.reverse ? Math.max(L.start, L.end - d) : Math.min(L.end, L.start + d)
  }
  return null
}

export function peakShotIndex(peakS: number | null | undefined, layout: LayoutShot[]): number {
  if (peakS == null) return -1
  return layout.findIndex((L) => L.start <= peakS && peakS <= L.end)
}

/** Output time of cut k: between shot k and k+1 (mid-transition), k = -1 the montage start, k = n-1 its end. */
export function cutOut(lay: Layout, k: number): number {
  if (k < 0) return 0
  if (k >= lay.layout.length - 1) return lay.total
  return lay.layout[k + 1].offset + lay.bounds[k].d / 2
}

/** The track's beats placed in output time, clipped to the montage. Null until a current grid with a drop and a peak inside a shot exist. */
export function beatsInOutputTime(grid: BeatsGrid | null | undefined, dropEffective: number | null | undefined,
                                  peakOutS: number | null | undefined, durationOut: number): BeatsOut | null {
  if (!grid || !grid.current || dropEffective == null || peakOutS == null) return null
  const map = (xs: number[]) => xs.map((b) => peakOutS + (b - dropEffective)).filter((t) => t >= 0 && t <= durationOut)
  return { beats: map(grid.beats), downbeats: map(grid.downbeats) }
}

export function nearestBeatOut(t: number, beatsOut: number[], maxDist = SNAP_MAX_DIST): number | null {
  let best: number | null = null
  for (const b of beatsOut) if (best == null || Math.abs(b - t) < Math.abs(best - t)) best = b
  return best != null && Math.abs(best - t) <= maxDist ? best : null
}

/** A marker time (output seconds) pulled onto the nearest beat when one is close enough. */
export const snapMarker = (t: number, beatsOut: number[], maxDist = SNAP_MAX_DIST) => nearestBeatOut(t, beatsOut, maxDist) ?? t

export interface SnapResult<T> { shots: T[] | null; hint: string | null; beatOut: number | null }

/** Snap cut k onto the nearest beat. After the peak shot (k >= peakIdx, which includes the peak
 *  shot's own end) the preceding shot's source end moves; before it (including the peak shot's own
 *  start) the following shot's source start moves, which shifts the whole beat grid by the same
 *  amount so the cut lands on the beat. Refused (shots: null, hint) when a shot would drop under
 *  MIN_SHOT_S or run outside the source. */
export function snapCut<T extends SnapShot>(shots: T[], fallback: Transition, k: number, beatsOut: number[], peakIdx: number,
                                            sourceDuration?: number | null): SnapResult<T> {
  const lay = montageLayout(shots, fallback)
  if (!lay.layout.length || k < -1 || k > lay.layout.length - 1) return { shots: null, hint: null, beatOut: null }
  const cut = cutOut(lay, k)
  const beat = nearestBeatOut(cut, beatsOut)
  if (beat == null) return { shots: null, hint: `no beat within ${SNAP_MAX_DIST} s of that cut`, beatOut: null }
  const delta = beat - cut
  if (Math.abs(delta) < 0.005) return { shots: null, hint: null, beatOut: beat }
  const next = shots.map((s) => ({ ...s }))
  if (k >= 0 && k >= peakIdx) {
    const s = next[k]
    const end = r2(s.end + delta * s.speed)
    if (end - s.start < MIN_SHOT_S) return { shots: null, hint: `snap refused: shot ${k + 1} would be shorter than ${MIN_SHOT_S} s`, beatOut: beat }
    if (sourceDuration != null && end > sourceDuration) return { shots: null, hint: `snap refused: shot ${k + 1} would run past the end of the source`, beatOut: beat }
    s.end = end
  } else {
    const s = next[k + 1]
    const start = r2(s.start + delta * s.speed)
    if (s.end - start < MIN_SHOT_S) return { shots: null, hint: `snap refused: shot ${k + 2} would be shorter than ${MIN_SHOT_S} s`, beatOut: beat }
    if (start < 0) return { shots: null, hint: `snap refused: shot ${k + 2} would start before the source`, beatOut: beat }
    s.start = start
  }
  return { shots: next, hint: null, beatOut: beat }
}

/** Everything the montage needs from the grid for the current shots. */
export function gridState(shots: SnapShot[], fallback: Transition, grid: BeatsGrid | null | undefined,
                          peakS: number | null | undefined): { lay: Layout; peakIdx: number; peakOut: number | null; beatsOut: BeatsOut | null } {
  const lay = montageLayout(shots, fallback)
  const peakIdx = peakShotIndex(peakS, lay.layout)
  const peakOut = peakIdx >= 0 && peakS != null ? sourceToOutput(peakS, lay.layout) : null
  const beatsOut = beatsInOutputTime(grid, grid?.drop_effective, peakOut, lay.total)
  return { lay, peakIdx, peakOut, beatsOut }
}

/** Snap every cut in one pass: cuts after the peak shot left to right (each moves later cuts
 *  along with it), cuts before it right to left (each shifts the grid for the ones before it),
 *  recomputing the grid after every change. */
export function snapAll<T extends SnapShot>(shots: T[], fallback: Transition, grid: BeatsGrid | null | undefined, peakS: number | null | undefined,
                                            sourceDuration?: number | null): { shots: T[]; snapped: number; refused: string[]; skipped: number } {
  let cur = shots
  let snapped = 0, skipped = 0
  const refused: string[] = []
  const first = gridState(cur, fallback, grid, peakS)
  if (!first.beatsOut || first.peakIdx < 0) return { shots, snapped: 0, refused: [], skipped: 0 }
  const n = cur.length
  const order = [...Array.from({ length: n - first.peakIdx }, (_, i) => first.peakIdx + i), ...Array.from({ length: first.peakIdx + 1 }, (_, i) => first.peakIdx - 1 - i)]
  for (const k of order) {
    const st = gridState(cur, fallback, grid, peakS)
    if (!st.beatsOut) break
    const r = snapCut(cur, fallback, k, st.beatsOut.beats, st.peakIdx, sourceDuration)
    if (r.shots) { cur = r.shots; snapped++ } else if (r.hint && r.hint.startsWith('snap refused')) { refused.push(r.hint) } else { skipped++ }
  }
  return { shots: cur, snapped, refused, skipped }
}

/** Beats drawn on the source timeline: each output beat mapped back into the shot it falls in. */
export function ticksForTimeline(shots: SnapShot[], fallback: Transition, grid: BeatsGrid | null | undefined,
                                 peakS: number | null | undefined): TimelineTicks | null {
  const st = gridState(shots, fallback, grid, peakS)
  const warning = peakS != null && shots.length && st.peakIdx < 0 ? PEAK_OUTSIDE_WARNING : null
  if (!st.beatsOut) return warning ? { beats: [], downbeats: [], peak: peakS ?? null, drop: null, warning } : null
  const toSource = (outs: number[]) => {
    const out: number[] = []
    for (const L of st.lay.layout) for (const b of outs) if (b >= L.offset && b <= L.offset + L.len) out.push(r2(L.start + (b - L.offset) * L.speed))
    return Array.from(new Set(out)).sort((a, b) => a - b)
  }
  return { beats: toSource(st.beatsOut.beats), downbeats: toSource(st.beatsOut.downbeats), peak: peakS ?? null, drop: peakS ?? null, warning }
}

/** 'strong' when a shot's output start sits on a downbeat, 'beat' on any beat, else null. */
export function shotStartBeat(shotIndex: number, lay: Layout, beatsOut: BeatsOut | null): 'strong' | 'beat' | null {
  if (!beatsOut || !lay.layout[shotIndex]) return null
  const t = lay.layout[shotIndex].offset
  if (beatsOut.downbeats.some((b) => Math.abs(b - t) <= ON_BEAT_TOL)) return 'strong'
  if (beatsOut.beats.some((b) => Math.abs(b - t) <= ON_BEAT_TOL)) return 'beat'
  return null
}
