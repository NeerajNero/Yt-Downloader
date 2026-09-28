import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  summary: string          // one line describing the current setting, shown when collapsed
  info?: string            // two sentences on what this group does
  help?: string            // Help page section id — adds a "?" link in the header
  open?: boolean
  children: ReactNode
}

/** Collapsible settings group with a live summary line and an optional link
 *  to the matching Help section. */
export default function Group({ title, summary, info, help, open = false, children }: Props) {
  const [isOpen, setOpen] = useState(open)
  const [showInfo, setInfo] = useState(false)
  return (
    <div className={`group ${isOpen ? 'open' : ''}`}>
      <div className="group-head">
        <button className="group-toggle" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}>
          <span className="group-title">{title}</span>
          <span className="group-summary muted small">{summary}</span>
          <span className="group-chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        </button>
        {help && <Link to={`/help#${help}`} className="group-help" title={`How ${title.toLowerCase()} works (Help)`} aria-label={`Help for ${title}`}>?</Link>}
      </div>
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
