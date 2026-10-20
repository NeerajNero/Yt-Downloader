import { useEffect, useState } from 'react'
import { patchClip, saveCaptions, type ManualCaptions } from '../../lib/api'
import { TWO_LINE_CHARS, fmtWindow, hookWindow, payoffWindow, peakOut } from '../../lib/captions'
import { duration, parseTime } from '../../lib/format'
import type { Clip } from '../../lib/types'

interface Row { text: string; start: string; duration: string }

interface Props {
  videoId: string
  manual: ManualCaptions | null
  currentTime: () => number
  onSaved: () => void
  /** The clip this edit belongs to (hook / payoff live on the clip record); null = plain range. */
  clip?: Clip | null
  range?: { start: number; end: number }
}

/** One hook / payoff field: typed text saved on blur, Gemini's suggestion only as a placeholder. */
function HookField({ clip, kind, label, placeholder, timing }: {
  clip: Clip; kind: 'hook_text' | 'payoff_text'; label: string; placeholder: string | null; timing: string | null
}) {
  const saved = clip[kind] ?? ''
  const [draft, setDraft] = useState(saved)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { setDraft(clip[kind] ?? '') }, [clip.id, clip[kind]]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = async (value: string) => {
    const v = value.trim()
    if (v === saved) return
    setErr(null)
    try { await patchClip(clip.id, { [kind]: v || null }) } catch (e) { setErr((e as Error).message) }
  }
  const n = draft.length
  return (
    <div className="stack" style={{ gap: 2 }}>
      <div className="row">
        <span className="muted small" style={{ width: 120 }}>{label}</span>
        <input type="text" className="grow" value={draft} placeholder={placeholder ?? ''} aria-label={label} maxLength={160}
               onChange={(e) => setDraft(e.target.value)} onBlur={(e) => void commit(e.target.value)} />
        {placeholder && draft !== placeholder && (
          <button className="btn small" title="Copy the suggestion into the field" onClick={() => { setDraft(placeholder); void commit(placeholder) }}>use</button>
        )}
      </div>
      <div className="row wrap small" style={{ paddingLeft: 120 }}>
        <span className={`mono ${n > TWO_LINE_CHARS ? 'job-error' : 'muted'}`}>{n}/{TWO_LINE_CHARS}{n > TWO_LINE_CHARS ? ' · more than two lines: the font steps down' : ''}</span>
        <span className="mono muted">{timing ?? 'no peak set'}</span>
        {err && <span className="job-error">{err}</span>}
      </div>
    </div>
  )
}

export default function CaptionEditor({ videoId, manual, currentTime, onSaved, clip, range }: Props) {
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

  // Hook / payoff timing from the clip's peak and the current range (studio/core/captions.hook_payoff_events).
  const durOut = range ? Math.max(0, range.end - range.start) : 0
  const pk = clip && range ? peakOut(clip.peak_s, range) : null
  const hookT = range ? fmtWindow(hookWindow(pk, durOut)) : null
  const payoffT = range ? fmtWindow(payoffWindow(pk, durOut)) : null

  return (
    <div className="stack" style={{ gap: 8 }}>
      {clip ? (
        <div className="stack" style={{ gap: 6 }}>
          <HookField clip={clip} kind="hook_text" label="Hook (frame 1)" placeholder={clip.hook} timing={hookT} />
          <HookField clip={clip} kind="payoff_text" label="Payoff (on the peak)" placeholder={clip.title} timing={payoffT} />
          <span className="muted small">Burned in large on frame 1 and on the peak, even with captions off. Only what you type is used: the grey suggestion is never burned.</span>
        </div>
      ) : (
        <span className="muted small">Hook and payoff text belong to a clip: use one from Clips (or Tweak from Review) to set them.</span>
      )}
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
