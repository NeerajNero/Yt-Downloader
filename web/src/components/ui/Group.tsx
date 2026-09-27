import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  summary: string          // one line describing the current setting, shown when collapsed
  info?: string            // two sentences on what this group does
  open?: boolean
  children: ReactNode
}

/** Collapsible settings group with a live summary line. */
export default function Group({ title, summary, info, open = false, children }: Props) {
  const [isOpen, setOpen] = useState(open)
  const [showInfo, setInfo] = useState(false)
  return (
    <div className={`group ${isOpen ? 'open' : ''}`}>
      <button className="group-head" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}>
        <span className="group-title">{title}</span>
        <span className="group-summary muted small">{summary}</span>
        <span className="group-chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && (
        <div className="group-body stack" style={{ gap: 8 }}>
          {info && (
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <button className="info-btn" onClick={() => setInfo(!showInfo)} aria-label="What is this?">ⓘ</button>
              {showInfo && <span className="muted small">{info}</span>}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
