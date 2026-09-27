import { useEffect, useState } from 'react'
import { saveCaptions, type ManualCaptions } from '../../lib/api'
import { duration, parseTime } from '../../lib/format'

interface Row { text: string; start: string; duration: string }

interface Props {
  videoId: string
  manual: ManualCaptions | null
  currentTime: () => number
  onSaved: () => void
}

export default function CaptionEditor({ videoId, manual, currentTime, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [speed, setSpeed] = useState('2.5')
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!manual) return
    setSpeed(String(manual.speed))
    setRows(manual.items.map((i) => ({ text: i.text, start: duration(i.start), duration: String(i.duration) })))
  }, [manual])

  const edit = (idx: number, k: keyof Row, v: string) => setRows((r) => r.map((it, i) => (i === idx ? { ...it, [k]: v } : it)))

  const save = async () => {
    setMsg(null)
    const sp = parseFloat(speed)
    if (!(sp >= 0.5 && sp <= 10)) return setMsg('Speed must be between 0.5 and 10 words per second.')
    const items = []
    for (const it of rows) {
      if (!it.text.trim()) continue
      const s = parseTime(it.start)
      const d = parseFloat(it.duration)
      if (s == null || !(d > 0)) return setMsg(`Check the times on "${it.text.slice(0, 30)}" — start like 1:23, duration in seconds.`)
      items.push({ text: it.text.trim(), start: s, duration: d })
    }
    try {
      await saveCaptions(videoId, { speed: sp, items: items.sort((a, b) => a.start - b.start) })
      setMsg(`Saved ${items.length} caption${items.length === 1 ? '' : 's'}.`)
      onSaved()
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <button className="btn small" onClick={() => setOpen(!open)}>
          {open ? 'Hide caption editor' : 'Edit captions manually'}{manual?.items.length ? ' ✓' : ''}
        </button>
        {open && (
          <label className="num"><input type="text" inputMode="decimal" value={speed} onChange={(e) => setSpeed(e.target.value)} aria-label="Words per second" /> words/sec</label>
        )}
      </div>
      {open && (
        <>
          {rows.map((it, idx) => (
            <div key={idx} className="row">
              <input type="text" className="grow" placeholder="Caption text" value={it.text} onChange={(e) => edit(idx, 'text', e.target.value)} />
              <label className="num"><input type="text" value={it.start} onChange={(e) => edit(idx, 'start', e.target.value)} aria-label="Start" /> at</label>
              <label className="num"><input type="text" value={it.duration} onChange={(e) => edit(idx, 'duration', e.target.value)} aria-label="Duration" /> s</label>
              <button className="btn small" onClick={() => setRows((r) => r.filter((_, i) => i !== idx))} aria-label="Remove caption">✕</button>
            </div>
          ))}
          <div className="row">
            <button className="btn small" onClick={() => setRows((r) => [...r, { text: '', start: duration(currentTime()), duration: '3' }])}>Add caption at playhead</button>
            <button className="btn small accent" onClick={() => void save()}>Save captions</button>
          </div>
          {msg && <p className="muted small">{msg}</p>}
        </>
      )}
    </div>
  )
}
