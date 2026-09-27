export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${Math.round(s)}s ago`
  if (s < 5400) return `${Math.round(s / 60)}m ago`
  if (s < 172800) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return '–'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

export function bytes(n: number | null | undefined): string {
  if (n == null) return ''
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n > 1e6) return `${Math.round(n / 1e6)} MB`
  return `${Math.round(n / 1e3)} KB`
}

export function resolution(w: number | null | undefined, h: number | null | undefined): string {
  if (!w || !h) return ''
  const short = Math.min(w, h)
  if (short >= 2160) return '4K'
  if (short >= 1440) return '1440p'
  if (short >= 1080) return '1080p'
  return `${short}p`
}

/** "1:23" / "83" / "1:02:03" -> seconds, or null. */
export function parseTime(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  const parts = t.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

export const secs = (n: number) => duration(n)
