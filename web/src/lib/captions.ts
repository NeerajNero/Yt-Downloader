// Hook / payoff timing and sizing mirrored from studio/core/captions.py
// (hook_payoff_events, fit_font_size). Change both together.
export const HOOK_MAX_S = 3.0
export const HOOK_GAP_S = 0.5
export const PAYOFF_S = 1.8

export const CAP_SIZES: Record<string, number> = { karaoke: 88, typewriter: 88, pop: 96, minimal: 64 }
export const CAP_STROKE: Record<string, { outline: number; shadow: number }> = { karaoke: { outline: 6, shadow: 2 }, typewriter: { outline: 6, shadow: 2 }, pop: { outline: 8, shadow: 9 }, minimal: { outline: 3, shadow: 2 } }
/** Hook / payoff stroke (PlayRes px): outline max(1.5x, 6), shadow min(1.5x, 6) — studio/core/captions.hp_sizes. */
export function hpStroke(style: string) {
  const s = CAP_STROKE[style] ?? CAP_STROKE.karaoke
  return { outline: Math.max(s.outline * 1.5, 6), shadow: Math.min(s.shadow * 1.5, 6) }
}
export const SAFE_AREA = { top: 0.10, bottom: 0.20, left: 0.05, right: 0.15 }
export const CANVAS: Record<string, [number, number]> = { portrait: [1080, 1920], landscape: [1920, 1080] }
export const HOOK_CEIL = 1.6, HOOK_FLOOR = 0.9, PAYOFF_CEIL = 1.3, PAYOFF_FLOOR = 0.8
export const AVG_GLYPH_EM = 0.55
export const FIT_STEP = 4

export interface Window { start: number; end: number }
export interface Fit { size: number; lines: string[]; fits: boolean }

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

// ---- sizing ----

/** Width a caption line may use: PlayRes width minus the left and right safe margins (864 / 1536). */
export function maxTextPx(orientation: string): number {
  const [w] = CANVAS[orientation] ?? CANVAS.portrait
  return w - Math.round(w * SAFE_AREA.left) - Math.round(w * SAFE_AREA.right)
}

export const textPx = (text: string, size: number, avg = AVG_GLYPH_EM) => text.length * size * avg

/** Ceiling and floor sizes for the hook and payoff of a caption preset. */
export function hpBounds(style: string) {
  const cap = CAP_SIZES[style] ?? CAP_SIZES.karaoke
  return { hookCeil: Math.round(cap * HOOK_CEIL), hookFloor: Math.round(cap * HOOK_FLOOR),
           payoffCeil: Math.round(cap * PAYOFF_CEIL), payoffFloor: Math.round(cap * PAYOFF_FLOOR) }
}

function balanced(words: string[], n: number): string[] {
  if (n <= 1 || words.length < n) return [words.join(' ')]
  let best: { m: number; lines: string[] } | null = null
  const cuts: number[][] = []
  if (n === 2) for (let i = 1; i < words.length; i++) cuts.push([i])
  else for (let i = 1; i < words.length - 1; i++) for (let j = i + 1; j < words.length; j++) cuts.push([i, j])
  for (const cut of cuts) {
    const bounds = [0, ...cut, words.length]
    const lines = bounds.slice(1).map((b, k) => words.slice(bounds[k], b).join(' '))
    const m = Math.max(...lines.map((l) => l.length))
    if (!best || m < best.m) best = { m, lines }
  }
  return best ? best.lines : [words.join(' ')]
}

function greedy(words: string[], size: number, maxPx: number, avg: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const cand = `${cur} ${w}`.trim()
    if (cur && textPx(cand, size, avg) > maxPx) { lines.push(cur); cur = w } else cur = cand
  }
  if (cur) lines.push(cur)
  return lines
}

/** The largest size in [floor, ceiling] (FIT_STEP apart) at which the text wraps into at most
 *  two lines inside maxPx; otherwise three balanced lines at the floor (fits = false). */
export function fitFontSize(text: string, maxPx: number, ceiling: number, floor: number, avg = AVG_GLYPH_EM): Fit {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return { size: ceiling, lines: [], fits: true }
  const sizes: number[] = []
  for (let s = ceiling; s > floor; s -= FIT_STEP) sizes.push(s)
  sizes.push(floor)
  for (const size of sizes) {
    for (const n of [1, 2]) {
      const lines = balanced(words, n)
      if (lines.length === n && Math.max(...lines.map((l) => textPx(l, size, avg))) <= maxPx) return { size, lines, fits: true }
    }
  }
  const three = balanced(words, 3)
  if (three.length === 3 && Math.max(...three.map((l) => textPx(l, floor, avg))) <= maxPx) return { size: floor, lines: three, fits: false }
  return { size: floor, lines: greedy(words, floor, maxPx, avg), fits: false }
}

/** How a hook or payoff would be burned: chosen size, line count, and whether it needed a third line. */
export function fitFor(text: string, kind: 'hook' | 'payoff', style: string, orientation: string): Fit {
  const b = hpBounds(style)
  return kind === 'hook' ? fitFontSize(text, maxTextPx(orientation), b.hookCeil, b.hookFloor)
    : fitFontSize(text, maxTextPx(orientation), b.payoffCeil, b.payoffFloor)
}
