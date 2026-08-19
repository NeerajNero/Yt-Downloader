export function fmtDuration(sec) {
  if (sec == null) return '—'
  sec = Math.round(sec)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export function fmtBytes(n) {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`
  return `${n} B`
}

export function fmtSpeed(bps) {
  if (bps == null) return null
  return `${fmtBytes(bps)}/s`
}

export function qualityLabel(h) {
  if (h >= 4320) return `${h}p · 8K`
  if (h >= 2160) return `${h}p · 4K`
  return `${h}p`
}

export function parseTime(text) {
  // "83", "1:23", "1:02:03" → seconds, or null if unreadable.
  const parts = String(text).trim().split(':')
  if (parts.some((p) => p === '' || isNaN(p))) return null
  return parts.reduce((acc, p) => acc * 60 + parseFloat(p), 0)
}

export function needsConvert(item) {
  const v = (item.vcodec || '').toLowerCase()
  const isVp9Av1 =
    v.startsWith('vp9') || v.startsWith('vp09') || v.startsWith('av01')
  return isVp9Av1 && !item.edit_path
}
