// Hook / payoff timing mirrored from studio/core/captions.py (hook_payoff_events).
export const HOOK_MAX_S = 3.0
export const HOOK_GAP_S = 0.5
export const PAYOFF_S = 1.8
export const TWO_LINE_CHARS = 44   // 2 x MAX_LINE_CHARS: past this the font steps down

export interface Window { start: number; end: number }

/** Peak in clip-relative output seconds, or null when unset / outside the range. */
export function peakOut(peakS: number | null | undefined, range: { start: number; end: number }): number | null {
  if (peakS == null || peakS < range.start || peakS > range.end) return null
  return peakS - range.start
}

export function hookWindow(peakOutS: number | null, durationOut: number): Window | null {
  let end = peakOutS == null ? HOOK_MAX_S : Math.min(HOOK_MAX_S, peakOutS - HOOK_GAP_S)
  end = Math.min(end, durationOut)
  return end > 0.1 ? { start: 0, end } : null
}

export function payoffWindow(peakOutS: number | null, durationOut: number): Window | null {
  if (peakOutS == null) return null
  const start = Math.max(0, peakOutS), end = Math.min(start + PAYOFF_S, durationOut)
  return end - start > 0.1 ? { start, end } : null
}

export const fmtWindow = (w: Window | null) => (w ? `${w.start.toFixed(1)} to ${w.end.toFixed(1)} s` : null)
