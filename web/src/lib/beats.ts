// Beat-grid maths mirrored from studio/core/beats.py (nearest_beat, default_range).
// Change both together, like Player.cropWindow() and render._window().
import type { BeatsGrid } from './api'

export const SNAP_KEEP_BEFORE = 1.0   // a snapped start must stay at least this far before the peak ...
export const SNAP_KEEP_AFTER = 1.5    // ... and a snapped end this far after it; otherwise that edge stays unsnapped
const r3 = (x: number) => Math.round(x * 1000) / 1000

/** The beat closest to t; t itself when there are no beats. */
export function nearestBeat(t: number, beats: number[] | null | undefined): number {
  if (!beats || !beats.length) return t
  let best = beats[0]
  for (const b of beats) if (Math.abs(b - t) < Math.abs(best - t)) best = b
  return best
}

/** The beats of a grid only when the grid is current (analysed with the running version). */
export const gridBeats = (grid: BeatsGrid | null | undefined): number[] | null =>
  grid && grid.current && grid.beats.length ? grid.beats : null

export interface RangeOpts { before?: number; after?: number; minLen?: number; maxLen?: number }

/** Playbook default around the peak: peak-2 .. peak+3, each edge snapped to the
 *  nearest beat when a grid is given (unless snapping would push the start past
 *  peak-1.0 or the end before peak+1.5: that edge keeps its unsnapped value),
 *  then widened to minLen / clamped to maxLen and to the source duration. */
export function defaultRange(peakS: number, beats: number[] | null | undefined, duration: number | null | undefined,
                             { before = 2.0, after = 3.0, minLen = 8.0, maxLen = 20.0 }: RangeOpts = {}): { start: number; end: number } {
  const start0 = Math.max(0, peakS - before), end0 = peakS + after
  let start = start0, end = end0
  if (beats && beats.length) {
    const s = nearestBeat(start0, beats), e = nearestBeat(end0, beats)
    start = s <= peakS - SNAP_KEEP_BEFORE ? s : start0
    end = e >= peakS + SNAP_KEEP_AFTER ? e : end0
  }
  if (end <= start) end = start + after
  if (end - start < minLen) {
    const extra = minLen - (end - start)
    start = Math.max(0, start - extra / 2); end = end + extra / 2
    if (end - start < minLen) end = start + minLen
  }
  if (end - start > maxLen) end = start + maxLen
  if (duration) {
    end = Math.min(end, duration)
    start = Math.max(0, Math.min(start, end - Math.min(minLen, duration)))
  }
  return { start: r3(start), end: r3(end) }
}

/** True when a clip's range is exactly what defaultRange would give for its peak
 *  (so a second "Peak at playhead" may move the range again; a hand-edited range is left alone). */
export function isDefaultRange(clip: { start_s: number; end_s: number; peak_s: number | null }, beats: number[] | null | undefined,
                               duration: number | null | undefined): boolean {
  if (clip.peak_s == null) return false
  const d = defaultRange(clip.peak_s, beats, duration)
  return Math.abs(d.start - clip.start_s) < 0.0015 && Math.abs(d.end - clip.end_s) < 0.0015
}
