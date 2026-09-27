import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/library', label: 'Library' },
  { to: '/add', label: 'Add' },
  { to: '/', label: 'Jobs' },
  { to: '/machines', label: 'Machines' },
]

export default function Nav() {
  return (
    <nav className="nav" aria-label="Sections">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
