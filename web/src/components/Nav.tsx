import { useSubscription } from '@apollo/client'
import { NavLink } from 'react-router-dom'
import { ReviewCountDocument } from '../gql/generated'

const tabs = [
  { to: '/library', label: 'Library' },
  { to: '/add', label: 'Add' },
  { to: '/review', label: 'Review' },
  { to: '/', label: 'Jobs' },
  { to: '/more', label: 'More' },
]

export default function Nav() {
  const { data } = useSubscription(ReviewCountDocument)
  const n = data?.clips_aggregate.aggregate?.count ?? 0
  return (
    <nav className="nav" aria-label="Sections">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.label}{t.to === '/review' && n > 0 && <span className="badge">{n}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
