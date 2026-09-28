import { useEffect, useState } from 'react'
import { duration } from '../../lib/format'

/** m:ss(.s) or plain seconds; commits on blur / Enter. */
export default function TimeInput({ value, onCommit, label, width = 64 }: { value: number; onCommit: (v: number) => void; label: string; width?: number }) {
  const [text, setText] = useState(duration(value))
  useEffect(() => setText(duration(value)), [value])
  const commit = () => {
    const t = text.trim()
    const secs = /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : t.split(':').reduce((a, n) => a * 60 + Number(n), 0)
    if (!Number.isNaN(secs)) onCommit(secs)
    else setText(duration(value))
  }
  return <input type="text" inputMode="decimal" value={text} aria-label={label} onChange={(e) => setText(e.target.value)}
                onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ width }} />
}
